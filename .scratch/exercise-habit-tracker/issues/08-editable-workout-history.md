# 08 — Review and correct workout history

**What to build:** Give the user a plain, trustworthy chronological record of exercise and a click-only way to correct or remove accidental entries while keeping weekly results consistent.

**Blocked by:** 06 — Close unresolved slots and roll into the next week.

**Status:** resolved

- [x] The user can open a reverse-chronological list of saved workout records across weeks.
- [x] Each record shows its activity, duration, perceived effort, and enough timing context to identify the workout.
- [x] Qualifying workouts, short efforts, fallback workouts, unscheduled workouts, and optional extra workouts appear without generated interpretation.
- [x] The history view contains no charts, trend analysis, coaching, or daily streak.
- [x] The user can change activity, duration, and perceived effort using the same preset choices as initial recording.
- [x] No history correction requires or offers free-text input.
- [x] Deleting a record requires explicit confirmation before removal.
- [x] Editing or deleting a record recomputes the affected week’s qualifying count and success state.
- [x] The corrected history and derived weekly state survive closing and reopening the application.
- [x] The application-workflow test verifies ordering, preset correction, confirmed deletion, state recomputation, and persistence across more than one week.

## Answer

Expanded the plain reverse-chronological workout history so every entry shows activity, duration, perceived effort, source type, and recorded date/time. The same list includes primary, fallback, unscheduled, short, qualifying, and optional-extra workouts without charts, streaks, coaching, or generated analysis.

Each record now has click-only edit controls using the original activity, duration, and effort presets, plus a separate deletion disclosure with an explicit “Confirm delete” action. Records use durable UUID-backed identifiers so deletion cannot cause a later workout to reuse an old identity.

Corrections and confirmed deletions recompute the owning week rather than assuming the displayed week. For historical weeks this also reconciles the visible weekly count, success state, and missed/not-needed slot outcomes. Workflow coverage verifies reverse ordering and context across source types, current- and prior-week corrections, confirmed deletion, derived-state recomputation, and persistence after restart. All 18 application-workflow tests pass, source and tests compile, and both Standards and Spec reviews are clean.
