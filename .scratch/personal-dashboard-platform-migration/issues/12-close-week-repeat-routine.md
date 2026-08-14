# 12 — Close the week and repeat the routine

**What to build:** Preserve truthful week closure and automatic repetition in Personal Dashboard so unresolved departures close without invented intent while completed outcomes remain intact and the next week follows the repeating routine.

**Blocked by:** 11 — Complete the weekly goal with any qualifying workout.

**Status:** resolved

- [x] Crossing the week boundary closes unanswered eligible slots as the established missed-no-response outcome.
- [x] Slots suppressed after weekly success do not become missed during rollover.
- [x] Completed, short, moved, skipped, and already missed outcomes remain unchanged during rollover.
- [x] Abandoned transient decisions or workout drafts do not block creation of the next week.
- [x] The next week is generated from the repeating routine without a confirmation ritual.
- [x] Silence about the routine leaves it unchanged.
- [x] Historical weeks and their workout records remain available after rollover and relaunch.
- [x] The primary application seam advances a controllable clock across week boundaries and verifies visible history, new-week state, and reminder intent.

## Answer

Personal Dashboard now closes each expired exercise week automatically when the
app next opens. Any still-scheduled primary or assigned-fallback departure is
persisted as `Missed — no response`, without a fabricated skip or reason.
Completed, short, moved, skipped, previously missed, and goal-suppressed states
remain unchanged.

The next week is generated immediately from the unchanged repeating Monday,
Wednesday, Friday, Saturday, and Sunday routine with fresh `0 of 3 completed`
progress and its next departure reminder. A workout draft abandoned in the
expired week is discarded; transient reason selection was already non-persistent
and cannot block rollover. No weekly confirmation is introduced.

Schema version 6 persists the missed outcome. The dashboard exposes previous
weeks in reverse chronological order with their departure outcomes, progress,
and workout records, and the plain TypeScript interface renders that history.
The controllable-clock application seam covers multiple rollovers, relaunch,
assigned-fallback misses, preserved mixed outcomes, success suppression,
abandoned drafts, repeated routine state, and new-week reminder scheduling.
Both review axes report no remaining findings. TypeScript/Rust checks, all 24
Rust tests, all 20 preserved Python workflow tests, Clippy with warnings denied,
formatting, and diff checks pass.
