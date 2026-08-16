# 01 — Reconcile schedule reminders after interruption

**Type:** task

**What to build:** Make one-week and repeating-routine schedule changes converge on exactly the reminders implied by persisted exercise state, even when persistence or native reminder effects fail partway through.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Changing an upcoming departure or the repeating routine persists semantic reminder intent and a recoverable incomplete-transition marker before the app claims reminder readiness.
- [x] Relaunch or ordinary refresh reconciles an incomplete transition to the exact reminder set implied by the persisted active profile.
- [x] Failure injection before, during, and after cancellation, scheduling, and persistence demonstrates recovery without stale or duplicate reminders.
- [x] Repeating reconciliation after success is idempotent and leaves the transition complete.
- [x] Inactive profiles never schedule exercise reminders during reconciliation.
- [x] Established schedule eligibility, fallback ordering, reminder timing, and exercise behavior remain unchanged.

## Answer

Implemented the recoverable reminder transition in the Rust exercise application.

- Exercise state schema 9 persists semantic desired reminder IDs and a durable pending reconciliation marker; older exercise state migrates forward.
- One-week and repeating schedule changes persist the marker before native cancellation or scheduling. Relaunch and refresh retry cancellation/scheduling and clear the marker only after final persistence succeeds.
- Reconciliation is idempotent, handles partial native effects, preserves completed-workout validation, and never schedules for inactive profiles.
- Added application-workflow failure-injection coverage for persistence-before-effects, cancellation, partial cancellation, partial scheduling, final persistence, repeating idempotence, and inactive profiles.

Verification: `cargo test --manifest-path src-tauri/Cargo.toml`, `npm run check`, `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`, and `git diff --check` all pass.
