# 14 — Review, correct, and delete workout history

**What to build:** Preserve trustworthy workout history in Personal Dashboard so the user can review saved exercise, correct mistaken preset selections, and deliberately delete a record while all derived weekly progress stays consistent.

**Blocked by:** 11 — Complete the weekly goal with any qualifying workout.

**Status:** ready-for-agent

- [ ] History presents workout records in reverse chronological order.
- [ ] History remains a plain record without charts, generated insights, coaching, or new exercise semantics.
- [ ] A record can be corrected using only the established activity, duration, and effort choices.
- [ ] Correcting duration recomputes qualification and the corresponding week's progress.
- [ ] Deletion requires an explicit confirmation step.
- [ ] Cancelling deletion leaves the record and derived state unchanged.
- [ ] Confirmed deletion removes the record and recomputes the corresponding week's progress and success state.
- [ ] Corrections and deletions persist across relaunch and remain correct across historical weeks.
- [ ] The primary application seam verifies visible order, correction, confirmation, deletion, and derived weekly state.
