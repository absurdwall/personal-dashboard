# Spec #43 lifecycle checkpoint

Date: 2026-10-03 (America/New_York). Scope: [ticket #47](https://github.com/absurdwall/personal-dashboard/issues/47), based on integration commit `966e0fdeecb7fe9cc1195355001e6567b13ffdfe`. Implementation and automated evidence only; packaged human acceptance remains pending.

## Behavior

Explicit cancel discards the current input in permission, connection, recording and finalization phases. Late permission, offer, native start, SDP, transcript, poll and finalization callbacks cannot restart capture, write text or replace the ended input's status. Cleanup ends tracks and peer immediately, removes channel callbacks, connection waits and poll timers, and requests temporary-thread cleanup even when a pending native start subsequently rejects. No automatic retry or provider fallback is added.

Navigation cancels permission/connection startup or stops capture and finalizes the recording without awaiting navigation. The input copies its starting session/date, including across a 04:00 lived-day transition. Its aggregate appends once to the latest original-target draft through the existing draft queue. Another target never displays the old preview or receives that input's text. Save failure retains the editable memory draft and displays the existing explicit unsaved status.

Login, quota/rate limit, service, connection and capture failures have bounded product categories; raw error messages are never displayed or retained in evidence. Partial text receives both a concrete failure status and the incomplete notice. Service closure is a failure. Native realtime error notifications and startup errors preserve sanitized known login/quota categories. Unrecognized errors remain generic service/recognition failures.

macOS window close hides the app, so its native CloseRequested callback now dispatches a scoped dictation close event. The frontend immediately releases capture and snapshots received text once; hiding does not permanently shut down the reusable dictation manager. Reopening permits a new manual input. Actual app exit uses the same snapshot and lets its existing draft queue settle through an acknowledgement, with a one-second bounded background receive before native subprocess shutdown. The window/event loop is not blocked. A missing/hung frontend or a slower write still exits: persistence on close is best effort, and unreceived tail words cannot be recovered. Unload has the same snapshot fallback.

## Automated checks

- `npm run build`: passed.
- `npm run test:frontend`: 221/221 passed, including 32 public dictation controller/runtime cases.
- Production browser runtime with fake microphone, peer and clock: pending permission/offer/native/remote cancellation, late rejection and poll failures, explicit cancel during recording/finalization, service close with received text, immediate resource release, repeat close and fresh input after reopen.
- Original-target draft boundary: navigation/lived-date mutation plus latest edits route one aggregate to the copied start target; failed persistence retains the aggregate in memory.
- `cargo check --manifest-path src-tauri/Cargo.toml --target-dir <canonical native target>`: passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --target-dir <canonical native target> dictation_transport_tests`: 4/4 passed. Terminal notifications return only sanitized known categories, with no raw error/transcript payload.
- `git diff --check`: passed.

## Remaining packaged checks

Ticket #49 must verify actual WKWebView microphone cessation after session/date/Today navigation, permission/connection cancel, window hide, Cmd-Q and reopen; original-target persisted drafts after relaunch; real network/service/account failures; and visible incomplete plus specific failure/unsaved copy. No personal Vault, transcript, audio or credentials were used for this checkpoint.

The [streaming aggregation checkpoint](spec43-streaming-aggregation.md) still applies: raw preview-to-final identity is unavailable; every received preview is conservatively preserved in a labeled unconfirmed section, and may overlap final text, and v3 has no verified whole-input flush acknowledgement. The four-second drain limits post-stop waiting, not recording duration. Human Chinese, English, mixed-language/proper-name quality, >2-minute capture, and actual last-word retention remain separate human checks.
