# Automatic morning plan timeout repair — 2026-10-06

Status: native delayed-save acceptance passed; signed 4.0.7 installed locally. GitHub publication/merge is pending while the account is suspended; main is unchanged.

## Observed failure

The October 5 automatic plan has an applied InitialPlan receipt and a saved morning baseline. The October 6 runtime turn started at 06:30:07 local time. Dashboard stopped consuming it after 90 seconds, despite successful external reads. The model called the controlled InitialPlan tool at 06:32:22, after the consumer had exited; that call received no Dashboard response. The model eventually ended at 06:37:19 with an explicitly unconfirmed save. The canonical record has an evening review and no morning baseline; it must not be backfilled as a contemporaneous morning plan.

The fixed 90-second whole-turn deadline is also present in the pre-repair `a4594a1` source. It was not introduced by the 4.0.5/4.0.6 intent changes. Previous acceptance did not cover a slower automatic turn that exceeded that limit. Successful tool registration and completed source queries rule out an authorization rejection or unavailable InitialPlan tool as the cause of this particular failure.

## Change

- Keep the 90-second JSON-RPC response budget separate from model-turn lifetime.
- A turn may run for up to 15 minutes, with a five-minute inactivity budget refreshed by its own progress, tool events and handled tool responses. Other-turn activity does not renew it.
- On a real timeout, request interruption within a bounded cleanup budget and dispose of the transport if waiting fails. Do not leave an unconsumed live model issuing calls. Saved history and source receipts remain available for reconciliation; no original request is replayed.
- Preserve the automatic InitialPlan-only capability, existing source checks, selected Vault, and all manual intent/UI repairs.

## Verification

The real stdio event-consumption loop failed with the original fixed deadline, producing `Codex App Server did not confirm the turn before its timeout.` before the delayed InitialPlan handler ran. After the repair, continuing activity allows the handler to run and the turn to complete. Regressions also cover silent-turn interruption, other-turn activity, an absolute execution limit, and asynchronous JSON-RPC notifications.

191 targeted Rust tests passed, covering library tests, automatic scheduling, InitialPlan persistence, duplicate prevention, interruption/recovery, Task and Daily Record flows. Package version validation, TypeScript compilation, Cargo checking, signed Mac build, strict signature verification and relocated packaged launch passed. Six explicitly gated native/external library tests are ignored by the ordinary suite; this does not establish new Dida write acceptance.

The old production request was checked through Dashboard's existing saved-result control: its final reply was restored, the queue pause cleared, and no source mutation was replayed. The restored reply's completed conversation state is separate from the missing InitialPlan receipt.

Native delayed-save acceptance uses a signed isolated Mac app, synthetic Vault, the real selected Codex runtime/model, and an InitialPlan request held at the stdio boundary for 100 seconds. Evidence and installation receipts are retained outside the repository in `~/.codex/artifacts/20261006-morning-timeout.noindex/`. Production credentials and personal message content are excluded from this document.

The scheduled 06:30 run passed with the existing `gpt-6-luna` / medium model setting: its first save call reached the boundary approximately 44 seconds after server startup, was held for another 100 seconds, and then received an applied InitialPlan receipt. The conversation and automation both completed. The synthetic Daily Record's morning baseline and current arrangement were read back, exactly one operation was applied, and no Task document was created. This crosses the old 90-second deadline using the signed Mac application and real Codex, rather than only a shortened timer fixture. The next real scheduled production morning remains a separate observation.

Installed bundle: `/Applications/Personal Dashboard.app`, 4.0.7. Binary SHA-256: `788ac04ca2ee5b8ec62d9cfe4cc9773fd323c736c1a954c46e0285cdf5ed7fc3`, identical to the signed build. The app relaunched with its existing selected Vault and enabled 06:30 schedule. All 44 inventoried production Markdown/managed JSON source files stayed byte-identical, including the October 6 evening review. The prior 4.0.6 bundle is archived in `~/.codex/backups/personal-dashboard/20261006-morning-timeout.noindex/`; test/build/backup bundles were unregistered from Launch Services, and the copied isolated-test authentication was removed.

Management reconciliation inspected the existing registered project and sources. It reports the existing summary reconciliation gap, malformed Collaboration source, and unavailable GitHub source. No alternate Registry, tracker, source or claimed GitHub publication was created.
