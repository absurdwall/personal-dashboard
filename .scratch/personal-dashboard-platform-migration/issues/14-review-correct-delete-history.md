# 14 — Review, correct, and delete workout history

**What to build:** Preserve trustworthy workout history in Personal Dashboard so the user can review saved exercise, correct mistaken preset selections, and deliberately delete a record while all derived weekly progress stays consistent.

**Blocked by:** 11 — Complete the weekly goal with any qualifying workout.

**Status:** resolved

- [x] History presents workout records in reverse chronological order.
- [x] History remains a plain record without charts, generated insights, coaching, or new exercise semantics.
- [x] A record can be corrected using only the established activity, duration, and effort choices.
- [x] Correcting duration recomputes qualification and the corresponding week's progress.
- [x] Deletion requires an explicit confirmation step.
- [x] Cancelling deletion leaves the record and derived state unchanged.
- [x] Confirmed deletion removes the record and recomputes the corresponding week's progress and success state.
- [x] Corrections and deletions persist across relaunch and remain correct across historical weeks.
- [x] The primary application seam verifies visible order, correction, confirmation, deletion, and derived weekly state.

## Answer

Personal Dashboard now presents current and prior-week workout records newest
first with their activity, duration, effort, source, qualification outcome, and
local recorded time. History remains a plain list without charts, generated
insights, coaching, streaks, or new exercise semantics.

Every record has a click-only `Edit record` disclosure using the established
activity, duration, and perceived-effort presets. `Save correction` updates the
owning week and recomputes its qualifying count, goal state, and historical
missed/not-needed outcomes. A separate `Delete record` disclosure explains that
deletion cannot be undone; `Cancel` closes it without changing state, while
`Confirm delete` removes the record and performs the same owning-week
recomputation.

When a current-week correction or deletion drops progress below the goal,
future primary departures and unassigned fallbacks are restored, stale native
reminder markers are cleared, and the next departure reminder is scheduled
again. Corrections and deletions across historical weeks persist through
relaunch. The controllable-clock application seam verifies visible ordering,
preset controls, current and historical correction, explicit deletion,
cancellation, relaunch persistence, derived departure state, and reminder
restoration. Both review axes report no remaining findings. TypeScript/Rust
checks, all 31 Rust tests, all 20 preserved Python workflow tests, Clippy with
warnings denied, formatting, and diff checks pass.
