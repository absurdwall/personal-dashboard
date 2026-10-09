# PDCR-03 queue, stop and scoped recovery evidence

Date: 2026-10-09. Branch: `codex/pdcr-03`, initially clean at integration
`a1df0e2`. Uses the user-selected local tracker and normal Git commits. No
GitHub, dependency install, real Vault writes, model request or app installation.

## Behavior

- Stop preserves completed effects and persists pending older messages as
  `paused`. A fresh correction is a new request, with its own captured dates;
  it runs before messages which remain paused. Continue/remove are explicit
  per-message controls. Removed text stays in history, without execution.
- A stop signal reaches the runtime even if the first history save fails. One
  bounded retry occurs under the existing history lock. If both saves fail,
  the stop is reported as requested, and an in-memory identity guard keeps old
  pending requests from dispatching. Terminal persistence records their pause;
  reopening still turns unexecuted legacy queued messages into `not-started`.
- Actual stdio dynamic tool dispatch and the application callback both check
  cancellation before starting an action. A matching late tool request returns
  a failed result and appears in the same work history; it cannot create a Task.
  New approval prompts after cancellation are not started.
- An unchecked older outcome is a recovery reminder, not a Vault-wide send
  prohibition. Fresh work reads current facts and starts a new runtime thread
  when that chat has an uncertain older turn. The original execution/thread
  binding is saved before dispatch; explicit no-dispatch bindings survive a
  newer thread. `serde(default)` keeps older stored sessions readable.
- App Server readback targets the original execution/thread, updates only that
  message's result and work-history terminal status, and retains old work items,
  errors, sequences, usage and timestamps. It does not rewrite a newer run owner,
  replay a turn, or append duplicate recovered finals. A completed turn without
  final text is still terminal, without an invented assistant answer.
- Exact uncertain local operation/date identities in another chat are read back
  at the canonical source before any new write. The new proposal is marked a
  conflict and no duplicate source object is created. Review-only proposals do
  not authorize a write. Existing stable operation IDs and canonical receipts
  remain the effect authority; no semantic classifier was added.
- Native external receipts are collected and read back across chats in the same
  Vault. A new chat cannot bypass the existing external write-capability bound
  while a source result remains unresolved. Readback changes only the original
  external effect and retains its original target date and interrupted turn.
- Frontend pending/recovery/Stop responses retain their originating Vault and
  execution guards. Newer execution owners, draft text and dictation survive
  late responses. The correction composer remains usable during recovery.

## Red/green and verification

Failures were observed before the corresponding changes: queued messages kept
running after Stop; missing remove API/controls; a canceled late stdio tool call
returned success and created a Task; unknown older turn blocked unrelated submit;
stop history save failure never signaled cancellation; late pending response
replaced a newer execution; a never-dispatched old request could not be checked
after a newer thread; another chat's exact uncertain create wrote a duplicate.

Application/file-backed store/actual stdio checks:

- `stopping_pauses_older_requests_and_fresh_correction_runs_first`.
- `paused_requests_reopen_and_can_be_explicitly_removed_or_resumed_at_the_original_date`.
- `cancel_received_before_dynamic_action_keeps_canonical_tasks_unchanged`.
- `failed_stop_history_save_still_cancels_the_running_turn` (one and two failures).
- `failed_history_save_of_queued_stop_never_dispatches_that_request`.
- `old_result_check_uses_its_original_thread_and_preserves_newer_execution_and_prior_history`.
- `never_dispatched_older_request_can_be_reviewed_after_newer_thread_starts`.
- `an_uncertain_exact_effect_in_another_session_is_read_back_before_any_new_write`.
- `another_chat_reads_the_original_unknown_external_receipt_without_replaying_it`.
- Existing FIFO, busy-runtime readback, shutdown/reopen, fresh-fact/Vault checks,
  lost source receipt/later edit, queued 04:00 date capture, stable Task identity,
  completion versus schedule dates, delayed-save inactivity and total timeout
  tests remain covered by the collaboration suites.

Production frontend handlers execute through the existing VM seams. Added
continue/remove clicks, late Vault/new execution responses, and recovery composer
availability to the existing keyboard/draft/voice/Vault regressions.

Before integration merge: `tsc --noEmit` passed; all 338 frontend tests passed;
Rust library 82 passed/6 ignored, evening-review 4 passed, Task operations 90
passed, workflow 24 passed. Subsequent queued-stop save-failure checks: 2 passed.
The final 25 workflow tests passed, including repeated stop-save failure and
unknown owner isolation. The 30 changed production frontend handler tests
passed. Old unconfirmed turns no longer occupy `activeRun`; recovery remains
visible while a newer current owner gets presentation priority.
Integration validation and commit receipt recorded below.

## Limits and independent gates

Native MCP tool notifications arrive after native dispatch; the protocol does
not provide a Dashboard per-object interception point. This work does not claim
that unrelated native writes can bypass an unresolved source-capability bound,
nor that Stop can undo an already dispatched native effect. Such an effect stays
unknown until its actual receipt/source readback confirms it. Unrelated reads
and local objects remain available. Actual packaged/live acceptance stays with
PDCR-11/12; synthetic fixtures are not language-interpretation or live-source
acceptance. No personal profile or production data was touched.
