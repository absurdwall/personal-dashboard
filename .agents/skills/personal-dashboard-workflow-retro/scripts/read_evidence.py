#!/usr/bin/env python3
"""Read one explicitly selected immutable history snapshot. Standard library only."""
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import stat
import sys
from urllib.parse import quote
from stream_history import indexed, read_selected

MAX_TEXT = 64 * 1024
# Structural keys are explicit: adding a source field never silently exports it.
FIELDS = set("""items id role text messageDate targetDate createdAt executionId runtimeTurnId
 deliveryState resultChecked automaticPlan status sourceState pageState historySequence inputFingerprint itemId callId kind phase summary tool
 firstSequence lastSequence observedAtMs updatedAtMs runtimeStartedAtMs runtimeCompletedAtMs
 runtimeEmittedAtMs authoritative parameters name value diagnostic diagnosticOrigin diagnosticGap changes
 changeGap source objectId path operation receiptId beforeRevision afterRevision diff
 verification gaps movePath evidenceVersion threadId turnId sequence updatedAt tokenUsage
 total last modelContextWindow totalTokens inputTokens cachedInputTokens cacheWriteInputTokens
 outputTokens reasoningOutputTokens skillName skillVersion toolSetVersion packageFingerprint
 registeredTools registeredOperations externalCapabilityFingerprint automaticMorning configuration
 runtimeExecutable runtimeVersion appVersion appBuildRevision requestedModel requestedReasoningEffort effectiveModel
 effectiveReasoningEffort modelProvider configurationSource capturedAt toolSchemaFingerprint
 executionAttempted executeAttempted operationId toolCallKey runtimeThreadId vaultKey targetBinding
 expectedRevision baseline resultSnapshot resultRevision effectFingerprint observedInExecutions
 taskId listId resultMessage change replaces sourceRevision expectedDocumentFingerprint
 changeEvidence basis date time completedOn completedTime state listName archived deletedAt
 content transition arrangement event evidence reason changeReason account additions corrections
 shortRecords revision category changeCount key canRecordCompletion localState externalCompletion
 sourceEvidence sourceSnapshotAt sourceSnapshotState sourceSnapshotMessage completionRevision
 destinationScope externalHabitId scope completed mode actualOccurredTime occurredOn occurredAt
 actionId toolId sourceId sourceName targetScope inputSummary resultSummary report result
 stages stage publication display coverage reasonCode success requestFingerprint refreshes
 target observedAt outcome warning reason trigger sourceState snapshotState historyGap
 terminalStatus queuedAt startedAt completedAt durationMs historyCoverage omissions terminalGap
 payloadOmissions originalBytes retainedBytes retainedFromPriorObservation reasonCode reconciliationStatus runtimeThreadsByExecution sourceRefreshReceiptId dashboard_task_operation dashboard_daily_record dashboard_memory_update dashboard_refresh_habits dashboard_read_history
""".split())
SECRET_MARKERS = ("bearer ", "authorization:", "api_key", "api-key", "apikey", "access_token",
                  "refresh_token", "password", "secret", "token=", "sk-", "eyj")


def selection_info(selectors):
    return {"session":selectors.session,"execution":selectors.execution,"vault":selectors.vault,
        "from":selectors.date_from,"to":selectors.date_to,"periodBasis":"captured request messageDate (local lived date)"}


def selected_export(source, selectors, source_info):
    references, gaps, executions = {}, [], []

    def project(value, pointer, depth=0):
        if depth > 20:
            gaps.append({"pointer": pointer, "reason": "nested evidence exceeds depth bound"})
            return None
        if isinstance(value, dict):
            return {key: project(item, pointer + "/" + key.replace("~", "~0").replace("/", "~1"), depth+1)
                    for key, item in value.items() if key in FIELDS
                    and not (key == "content" and "/workHistory/" in pointer)}
        if isinstance(value, list):
            return [project(item, pointer + f"/{index}", depth+1) for index, item in enumerate(value)]
        if isinstance(value, str):
            if any(marker in value.lower() for marker in SECRET_MARKERS):
                gaps.append({"pointer": pointer, "reason": "text withheld for credential-like content"})
                return None
            if len(value.encode("utf-8")) > MAX_TEXT:
                gaps.append({"pointer": pointer, "reason": "text omitted above 64 KiB bound"})
                return None
        return value if value is None or isinstance(value, (str, int, float, bool)) else None

    def reference(ref, pointer):
        if ref in references and references[ref]["pointer"] != pointer:
            ref += ":" + hashlib.sha256(pointer.encode()).hexdigest()[:12]
        references[ref] = {"pointer": pointer, "sourceSha256": source_info["sha256"]}
        return ref

    def records(values, pointer, category, execution_id):
        result = []
        for index, value in indexed(values):
            if not isinstance(value, dict):
                continue
            if value.get("executionId") != execution_id and execution_id not in value.get("observedInExecutions", []):
                continue
            item_pointer = pointer + f"/{index}"
            item = project(value, item_pointer)
            identity = quote(str(value.get("id", index)), safe=":-_")
            item["ref"] = reference(f"execution:{execution_id}/{category}:{identity}", item_pointer)
            result.append(item)
        return result

    for si, session in indexed(source.get("sessions", [])):
        if not isinstance(session, dict):
            continue
        if selectors.session and session.get("id") != selectors.session:
            continue
        if selectors.vault and session.get("vaultKey") != selectors.vault:
            continue
        sp = f"/sessions/{si}"
        for mi, message in indexed(session.get("messages", [])):
            if not isinstance(message, dict) or message.get("role") != "user":
                continue
            execution_id = message.get("executionId")
            if not execution_id or (selectors.execution and execution_id != selectors.execution):
                continue
            # Inclusive captured request lived-date, independent of browsing/target date.
            date = message.get("messageDate")
            if selectors.date_from or selectors.date_to:
                if not isinstance(date, str) or (selectors.date_from and date < selectors.date_from) or (selectors.date_to and date > selectors.date_to):
                    continue
            eid = quote(execution_id, safe=":-_")
            mp = sp + f"/messages/{mi}"
            execution = {"ref": reference(f"execution:{eid}", mp), "executionId": execution_id,
                         "sessionId": session.get("id"), "vaultKey": session.get("vaultKey"),
                         "request": project(message, mp), "gaps": []}
            execution["terminal"] = {"status": message.get("deliveryState"),
                                     "ref": reference(f"execution:{eid}/delivery", mp + "/deliveryState") if "deliveryState" in message else None}
            if session.get("runId") == execution_id:
                execution["terminal"].update(status=session.get("runState"),
                    diagnostic=project(session.get("progress"), sp + "/progress"),
                    ref=reference(f"execution:{eid}/terminal", sp + "/runState"),
                    diagnosticRef=reference(f"execution:{eid}/terminal-diagnostic", sp + "/progress"))
            elif message.get("deliveryState") == "error":
                execution["gaps"].append("Original terminal diagnostic unavailable; a newer session progress is not substituted.")
            matching = [(i, h) for i, h in indexed(session.get("workHistory", [])) if isinstance(h, dict) and h.get("executionId") == execution_id]
            if matching:
                hi, history = matching[-1]
                hp = sp + f"/workHistory/{hi}"
                export_history = project(history, hp)
                export_history["ref"] = reference(f"execution:{eid}/history", hp)
                for ii, item in enumerate(export_history.get("items", [])):
                    ip = hp + f"/items/{ii}"
                    item["ref"] = reference(f"execution:{eid}/item:{quote(str(item.get('itemId', ii)), safe=':-_')}", ip)
                    for ci, change in enumerate(item.get("changes", [])):
                        change["ref"] = reference(f"execution:{eid}/change:{quote(str(change.get('id', ci)), safe=':-_')}", ip + f"/changes/{ci}")
                for fi, refresh in enumerate(export_history.get("refreshes", [])):
                    refresh["ref"] = reference(f"execution:{eid}/page-refresh:{quote(str(refresh.get('id', fi)), safe=':-_')}", hp + f"/refreshes/{fi}")
                execution["history"] = export_history
                if not history.get("tokenUsage"):
                    execution["gaps"].append("Runtime token usage unavailable; elapsed time/calls are not token cost.")
                if not history.get("refreshes"):
                    execution["gaps"].append("Page refresh observations unavailable; save status does not establish fresh display.")
            else:
                execution["history"] = None
                execution["gaps"].append("Visible work history unavailable in this source snapshot.")
                execution["gaps"].append("Runtime usage and page refresh observations unavailable.")
            bindings = records(session.get("usageBindings"), sp + "/usageBindings", "configuration", execution_id)
            execution["configuration"] = bindings
            thread_map = source.get("runtimeThreadsByExecution", {})
            if isinstance(thread_map, dict) and execution_id in thread_map:
                tp = "/runtimeThreadsByExecution/" + execution_id.replace("~", "~0").replace("/", "~1")
                execution["runtimeThread"] = {"value": project(thread_map[execution_id], tp), "ref":reference(f"execution:{eid}/runtime-thread", tp)}
            else:
                execution["gaps"].append("Per-execution runtime thread binding unavailable; session's current thread is not substituted.")
            if not bindings or not bindings[-1].get("configuration"):
                execution["gaps"].append("Captured execution runtime/model configuration unavailable; current settings are not historical evidence.")
            execution["effects"] = records(session.get("taskOperations"), sp + "/taskOperations", "effect", execution_id)
            execution["memoryEffects"] = records(session.get("memoryProposals"), sp + "/memoryProposals", "memory", execution_id)
            execution["refreshReceipts"] = records(session.get("habitRefreshReceipts"), sp + "/habitRefreshReceipts", "snapshot", execution_id)
            replies = []
            for ri, reply in indexed(session.get("messages", [])):
                if reply.get("role") == "assistant" and reply.get("executionId") == execution_id:
                    rp = sp + f"/messages/{ri}"
                    entry = project(reply, rp)
                    entry["ref"] = reference(f"execution:{eid}/reply:{ri}", rp)
                    replies.append(entry)
            execution["replies"] = replies
            # Source/attempt scope stays exact. External summaries are not audit bytes.
            external = []
            for action_index, action in enumerate(message.get("externalActions", [])):
                ap = mp + f"/externalActions/{action_index}"
                item = project(action, ap)
                item["ref"] = reference(f"execution:{eid}/external:{action_index}", ap)
                external.append(item)
            execution["externalActions"] = external
            if len(external) >= 64:
                execution["gaps"].append("External receipt bound reached (64); additional actions may be omitted; visible work items remain separate.")
            executions.append(execution)
    return {"exportVersion": 1, "source": source_info,
            "selection": selection_info(selectors),
            "coverage": "selected-snapshot", "executions": executions, "references": references, "omissions": gaps,
            "usageScope": "runtime total is thread aggregate; last is runtime-reported-last aggregate; allocation to the complete app execution/per-tool is unavailable; no prices"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--history", required=True, type=Path, help="Explicit absolute existing collaboration-v1.json path")
    parser.add_argument("--session")
    parser.add_argument("--execution")
    parser.add_argument("--vault")
    parser.add_argument("--from", dest="date_from")
    parser.add_argument("--to", dest="date_to")
    parser.add_argument("--max-export-bytes", type=int, default=8*1024*1024)
    args = parser.parse_args()
    if not args.history.is_absolute():
        parser.error("--history must be absolute; no profile discovery is performed")
    if not any([args.session, args.execution, args.date_from, args.date_to]):
        parser.error("select --session, --execution or an inclusive --from/--to period")
    for date in [args.date_from, args.date_to]:
        try:
            invalid = date and dt.date.fromisoformat(date).isoformat() != date
        except ValueError:
            invalid = True
        if invalid:
            parser.error("period bounds must be exact YYYY-MM-DD dates")
    if args.date_from and args.date_to and args.date_from > args.date_to:
        parser.error("period bounds are reversed")
    if args.max_export_bytes < 1024:
        parser.error("export byte bound must be at least 1024")
    try:
        with os.fdopen(os.open(args.history, os.O_RDONLY | os.O_NONBLOCK), "rb") as stream:
            metadata = os.fstat(stream.fileno())
            if not stat.S_ISREG(metadata.st_mode):
                raise ValueError("source is not a regular file")
            source, (digest, size), stream_omissions, selection_overflow, selected_count = read_selected(stream, args, FIELDS)
            current = args.history.stat()
            if (current.st_dev,current.st_ino,current.st_size,current.st_mtime_ns,current.st_ctime_ns) != (metadata.st_dev,metadata.st_ino,metadata.st_size,metadata.st_mtime_ns,metadata.st_ctime_ns):
                raise ValueError("source path changed during evidence traversal")
        info = {"path": str(args.history), "sha256": digest, "schemaVersion": 1, "bytes": size}
        if selection_overflow:
            print(json.dumps({"exportVersion":1,"source":info,"selection":selection_info(args),"coverage":"unavailable-selection-bound","selectedExecutions":selected_count,"executions":[],"references":{},
                "omissions":["Selected evidence exceeds the 8 MiB retained working bound; no failure/receipt/terminal facts silently dropped. Select a narrower scope."]}))
            return 0
        exported = selected_export(source, args, info)
        exported["omissions"].extend(stream_omissions)
        output = json.dumps(exported, ensure_ascii=False, allow_nan=False, indent=2)
        if len(output.encode()) > args.max_export_bytes:
            output = json.dumps({"exportVersion": 1, "source": info, "selection": exported["selection"], "coverage": "unavailable-export-bound",
                                 "selectedExecutions": len(exported["executions"]), "executions": [], "references": {},
                                 "omissions": ["Selected export exceeds byte bound; no failure/receipt/terminal facts silently dropped. Select a narrower scope or explicit larger bound."]}, indent=2)
        print(output)
    except (OSError, ValueError, TypeError, KeyError, AttributeError, IndexError) as error:
        print(json.dumps({"error": "evidence-source-unavailable", "detail": str(error)}), file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
