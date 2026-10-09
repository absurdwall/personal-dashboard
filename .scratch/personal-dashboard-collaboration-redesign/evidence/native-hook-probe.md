# Native PreToolUse probe — CLI 0.160.0

Date: 2026-10-09. Result: **exact native MCP object/date veto is available, but hook failure is permissive. Hook alone is insufficient for fail-closed enforcement.** No production source or user data was changed.

## Actual runtime and isolation

Ran actual `codex app-server --stdio -c bypass_hook_trust=true`, installed `codex-cli 0.160.0`, observed model `gpt-6.1-sol`, reasoning `low`, approvalPolicy `never`, read-only seatbelt sandbox, plugins/apps disabled. Two independently owned profiles/workdirs are under `/tmp/pdcr-native-hook-probe.noindex` and `/tmp/pdcr-native-hook-probe-v2.noindex` (roots/profile/workdirs0700; principal raw files0600). Each copied only the authorized prerequisite auth.json, chmod0600; both owned copies were deleted after completion, confirmed absent. No installed/user profile, real Vault or Dida was accessed. Python stdlib stdio MCP is an acceptance fixture, not a proposed Dashboard MCP/service.

Actual model-native MCP calls came through code mode; `appserver.jsonl` preserves model tool items and hook events; fixture dispatch `_meta.x-codex-turn-metadata` records0.160.0/model/turn/sandbox and stable call IDs. No direct host `mcpServer/tool/call` RPC was used for these verdicts.

V1 thread: `01a1224e-ecc2-7e52-8665-0e4ad4e9966a`, two completed actual turns. V2 clean-contract thread: `01a1224f-e649-74c1-8500-e6112648e81c`, one completed actual turn. Their identity.json, original fixtures/hooks, inputs/outputs, appserver JSONL, fixture dispatch JSONL, and SHA256 evidence-manifest.json are retained. Runners: `/tmp/pdcr-exploration/native_hook_runner.py`, `native_hook_runner_v2.py`.

## Clean supported contract and dispatch proof

V2 produced six synchronous hooks: two `blocked`, four `completed`; four fixture dispatches. Exact denied objects never reached fixture:

| Native call | Hook | Fixture dispatch |
| --- | --- | --- |
| update_task unknown-task | deny | absent |
| update_task unrelated-task | `{}` / exit0 | present |
| get_task unknown-task | `{}` / exit0 | present |
| upsert_habit_checkins unknown-habit /2026-10-09 | deny | absent |
| same Habit /2026-10-08 | `{}` / exit0 | present |
| unrelated-habit /2026-10-09 | `{}` / exit0 | present |

Input is one JSON object on stdin: `session_id`, `turn_id`, `transcript_path`, `cwd`, `hook_event_name:"PreToolUse"`, `model`, `permission_mode`, `tool_name:"mcp__synthetic__update_task"` (or exact other canonical name), `tool_input` with actual arguments, `tool_use_id`. `tool_use_id` equals dispatch `_meta.callId` for allowed calls. Veto output (exit0):

```json
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Original synthetic object/date has unknown effect; read back before retry."}}
```

Normal continue on this installed version: `{}` / exit0. V1 `permissionDecision:"allow"` is reported **unsupported**, marks hook failed and continues; it must not be used as successful allow evidence. Official documentation currently describes broader allow support, so installed evidence takes precedence.

## Failure semantics — actual native dispatch

V1 second turn attempted four synthetic writes exactly once. `exit1`, invalid JSON with exit0, and hook timeout1s all produced `hook/completed.status:"failed"` **and dispatched the write**. Exit2 with stderr reason produced `blocked` and no dispatch. A trusted executable wrapper can translate expected validation/storage errors to deny/exit2, but cannot guarantee veto on its own timeout, crash, launch failure, skip or unexpected invalid output. No safe failure guarantee was proven. Keep the existing native capability mask pending a bounded policy/architecture decision.

## Hook loading and trust scope

The launch-level `-c bypass_hook_trust=true` is recognized and emits the bypass warning. Putting that key into `thread/start.config` produced an unrecognized session-setting warning; the invocation override is what enabled execution. The flag bypasses trust for **all enabled discovered hooks**, not a single named hook.

Concrete `hooks/list` inventory after V2 (`hooks-list.json`, `inventory.jsonl`) returns exactly one hook, source `user`, sourcePath `/private/tmp/pdcr-native-hook-probe-v2.noindex/profile/hooks.json`, matcher `^mcp__synthetic__.*$`, asyncfalse, timeout1, isManagedfalse, trustStatusuntrusted, hash `sha256:7991df3cdd12c184d1726d7a930869627c89238484e1f2376503cd785f02e90f`; no warnings/errors. All actual hook events cite that same source. Owned empty cwd has no project `.codex` layer; plugins are disabled; CODEX_HOME points to the owned profile. Thus this probe executed only the vetted owned hook. This is not authorization to bypass trust in a profile/cwd that can discover Vault/user/plugin hooks. Production would need exact trust/loading/source ownership verification rather than assuming the bypass is selectively scoped.

## Remaining mechanical caveats

A hook can bind exact source/tool/object/date plus immutable session/turn/call identity to a host-owned unknown-effect ledger without judging conversational intent. This experiment used a static exact-ID/date predicate; it did not prove production ledger integration, concurrent atomic claims or target normalization. A real implementation must atomically reserve an in-flight mutation before allowing it, serialize competing claims for the same scope, persist unknown results before restart, and reconcile without replay. Read-only hooks can remain allowed. Current `unknown-task` must cover all relevant mutation tools on that Task, not just the single probed method.

Unknown creates may lack a stable source ID: an input fingerprint is not semantic object identity. No safe blanket assumption that a differently worded create is unrelated was proven. Family-level restrictions for unresolved creates, missing identities, malformed arguments or unsupported batch shapes may remain necessary; record that partial scope honestly. Hook result cannot undo an already dispatched write. Hosted/specialized tool paths may not pass this hook; source RPC/other tool paths require separate coverage.

Source context: [official Hooks documentation](https://learn.chatgpt.com/docs/hooks), fetched into `/tmp/pdcr-exploration/hooks-official.md`; installed generated event schema under `/tmp/pdcr-exploration/codex-0.160.0-schema/v2`. Official docs describe hook trust, tool coverage and deny/exit2 contract; measured0.160.0 results above establish actual support and failure behavior.
