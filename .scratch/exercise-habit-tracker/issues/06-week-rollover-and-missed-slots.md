# 06 — Close unresolved slots and roll into the next week

**What to build:** Give every workout week an honest ending, distinguish unanswered reminders from deliberate skips, and carry the repeating plan into the next Monday without requiring weekly confirmation.

**Blocked by:** 05 — Complete the weekly goal with any qualifying workout.

**Status:** resolved

- [x] A planned slot that receives neither a departure response nor a later resolution remains unresolved until the current week ends.
- [x] At the end of Sunday, every still-unresolved slot closes as `Missed — no response`.
- [x] `Missed — no response` remains distinct from Skip and has no invented preset reason.
- [x] Completed, short-effort, rescheduled, skipped, and missed outcomes remain preserved after the week closes.
- [x] The next Monday begins a new `0 of 3 completed` week using the repeating primary and fallback schedule.
- [x] No Sunday confirmation or other weekly acknowledgement is required to preserve the plan.
- [x] Finishing one week does not erase prior local records or change the future repeating schedule.
- [x] The controlled-clock application-workflow test crosses the Sunday-to-Monday boundary and verifies closure states, retained history, reset weekly progress, and automatic schedule repetition.

## Answer

Added automatic week closure during state loading. Scheduled slots remain
unresolved through Sunday and close as `Missed — no response` only after the
week ends, with no fabricated reason. Departures occurring after the third
qualifying workout close separately as `Weekly goal met — no workout needed`,
so reminder suppression never rewrites an earlier ignored departure.

The next Monday is created automatically from the repeating primary and
fallback routine with fresh `0 of 3 completed` progress. The dashboard retains
a reverse-chronological workout history and shows the previous week’s primary
and fallback outcomes, including completed, short-effort, moved, skipped,
missed, and no-longer-needed states.

Verification passed with thirteen application-workflow tests, syntax
compilation, whitespace validation, and clean Standards and Spec review axes.
