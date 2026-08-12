# 04 — Recover or skip a planned workout

**What to build:** Complete the departure decision with deterministic weekend recovery and explicit skipping, using only preset reasons and the same end-to-end reminder and recording path as a primary workout.

**Type:** task

**Blocked by:** 03 — Record a workout in four taps.

**Status:** resolved

- [x] The departure prompt offers exactly `Leaving for gym`, `Move to fallback`, and `Skip`.
- [x] `Move to fallback` requires one preset reason and assigns the next available fallback, choosing Saturday at 4:00 PM before Sunday at 4:00 PM.
- [x] `Skip` requires one preset reason and closes the planned slot as deliberately skipped.
- [x] The shared reason choices are exactly Work ran late, Too tired, Sick or injured, Another commitment, and Other.
- [x] Choosing Other never opens or requires a text field.
- [x] The dashboard updates fallback availability immediately and truthfully indicates when no fallback remains.
- [x] A moved workout produces its departure reminder at the fallback time and can be completed through the same four-tap workout flow.
- [x] A qualifying fallback workout contributes to the same weekly progress as a qualifying primary workout.
- [x] The application-workflow test covers both fallback assignments, fallback exhaustion, every preset reason, deliberate skip, and completion from a fallback slot.

## Answer

Implemented persisted departure decisions with the exact three actions and five
shared click-only reasons. Moving selects the next future fallback in weekend
order, updates availability immediately, and rejects recovery when no valid
fallback remains. Skipping records an explicit reason and closes the slot
without generating a follow-up.

Assigned fallback slots now use the same departure, follow-up, ninety-minute
recording reminder, and four-selection workout flow as primary slots. A
qualifying fallback record increments the same weekly progress count. Stale or
expired in-progress Move decisions unwind safely so they cannot trap the user
on an unusable reason screen.

Verification passed with all six application-workflow tests, syntax
compilation, whitespace validation, and clean Standards and Spec review axes.
