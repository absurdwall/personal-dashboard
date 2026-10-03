# Spec #43 review fixes

Date: 2026-10-03 (America/New_York). These changes address the concrete Standards/Spec findings against `10d441c`. They do not establish complete Spec #43 acceptance or human speech quality.

## Correctness changes

- Cancellation stops a pending native start again after its IPC response settles, including rejection. This covers native stop winning the mutex before native start. Pending starts also register an input-scoped cancellation handle outside the runtime mutex, so cancel can terminate that input's blocked sideband immediately. Local CLI version/schema probes check the same cancellation every 10 ms and have a five-second cold-probe bound. Input cancellation never permanently shuts down the reusable dictation manager; app exit additionally cancels pending starts.
- Sideband stop and unsubscribe share a 500 ms absolute deadline, including asynchronous notification traffic. An input-scoped deadline watchdog also terminates the child if a stdio write blocks. Dropping the dedicated client then terminates and reaps its child. The recording duration remains unlimited; the existing four-second bound applies only after manual stop.
- The diagnostic candidate passes its isolated app-data directory to dictation. Only the existing Dashboard-owned Codex profile is redirected by the explicit diagnostic gate. The working directory and permission/schema probes remain isolated.
- Send is disabled while dictation is active. Submit acknowledgements clear only their submitted snapshot, and failures preserve the latest memory draft. Native submit also compares the stored draft with the exact untrimmed input snapshot before clearing it. A newer saved draft survives native queuing and relaunch; newer memory-only text is saved through the existing draft queue and remains editable if that save fails.
- Cleanup no longer assigns an error callback immediately before removing it.

## Unresolved protocol boundary

Inspected matching CLI v3 source exposes `input_transcript.added.item.id` and `turn.done.turn.id` in distinct namespaces, with no verified relation. A delayed final for turn A cannot safely seal previews already received for turn B. The implementation therefore retains every identified preview independently of corrected/deduplicated authoritative finals. It recovers previews in an explicitly labeled unconfirmed section of the same original-target editable, persisted draft, and marks the result incomplete. The localized status explains possible overlap and asks the user to remove overlaps before sending.

Every preview-bearing input can consequently be incomplete, and its recovered preview can repeat words in the final transcript. This is intentional conservative recovery, **not complete final-correction/no-repeat acceptance**. No text-equality deduplication, invented identity, or assumption that any final acknowledges all earlier previews is used. Raw finals still replace their own turn ID exactly once; equal text in different turn IDs survives. A new final after stop also cannot prove the whole unheard audio tail was flushed.

## Validation

- Frontend build and full frontend suite pass (225 tests); 36 focused dictation tests cover delayed A final after B preview, duplicate/corrected finals, distinct equal finals, pending native start resolution/rejection after cancellation, two-minute simulated capture, partial recovery, manual-send success/failure races, navigation, close/reopen and failed draft persistence.
- Seven native dictation transport tests pass, including actual owned-process cancellation during blocked initialization, a hung sideband sharing the cleanup deadline, and cancellation of a cold local probe followed by a fresh probe.
- Sixteen native Collaboration workflow tests pass, including submission of an older snapshot after newer dictation was saved, preservation across reopening, and clearing an exactly matching whitespace-containing submitted draft.

The broad transport trait and duplicated JSON/CLI security flags are optional design improvements, not proven policy violations. They are deferred to keep this repair focused on the concrete behavioral failures; existing isolation checks still enforce both paths. Human language quality, two-minute microphone capture, real last words and final packaged acceptance remain pending #49.

## Refresh and navigation follow-up

A final review found that ordinary workspace refresh and session reselection still replaced failed-save memory drafts with older stored text. Local keyboard/debounced and voice draft writes now protect their original session/date cache entry until the exact current snapshot is acknowledged. An older queued acknowledgement cannot unprotect a newer edit. All cache paths respect that protection; manual send releases only its cleared target. The existing failed voice-save status remains visible when returning to the original target.

Two frontend regressions execute the production composer delivery, IPC-save queue, workspace refresh, session selection, target-date failure and editor/status rendering functions, with synthetic IPC and unrelated pane rendering. Both fail against the previous `be30477` source and pass after this change. They cover failed voice persistence followed by refresh and navigation/return, independent second-target text, and an older acknowledgement while a newer save is still pending. Frontend build and all 229 frontend tests pass. This follow-up changes no native source; the earlier native evidence remains applicable.
