# 02 — Make confirmed profile restore recoverable

**Type:** task

**What to build:** Make profile restore safe before confirmation and recoverable afterward, so replacing a profile cannot leave persisted exercise state and delivered reminders disagreeing indefinitely.

**Blocked by:** 01 — Reconcile schedule reminders after interruption.

**Status:** resolved

- [x] A selected restore is completely parsed and validated before any active profile, exercise state, or native reminder is changed.
- [x] Invalid, incomplete, unsupported, or cancelled restore input leaves the active profile and reminder set unchanged.
- [x] The confirmation preview exposes the validated replacement meaning needed for a deliberate decision.
- [x] Confirming restore atomically commits the replacement profile, its desired reminder state, and a durable reconciliation marker before native reminder effects are applied.
- [x] Failure injection after validation, after commit, during native reminder effects, and before completion demonstrates safe relaunch recovery.
- [x] Repeating recovery after success schedules no duplicate reminders and leaves no incomplete transition.
- [x] Existing backup, restore, profile-authority, and exercise behavior remain intact.

## Answer

Implemented recoverable profile restore across the Rust application boundary and the confirmation UI. Valid restore selection now exposes the effective profile authority, current-week meaning, history count, and desired reminder rebuild count. Pre-commit failures preserve the pending validated restore; confirmation persists the replacement exercise state with a durable reminder reconciliation marker before native cancellation or scheduling. Relaunch retries cancellation and scheduling safely, including inactive profiles, and repeated recovery is idempotent.

Added failure-injection coverage for validation/pre-commit reads, post-commit cancellation failure, partial scheduling failure, durable marker recovery, and duplicate-free relaunch. Existing backup, profile-authority, migration, move, and exercise workflows remain covered by the full suite.
