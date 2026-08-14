# 10 — Recover or skip a planned workout

**What to build:** Preserve deterministic recovery and explicit skipping in Personal Dashboard so a disrupted primary workout can move to the next usable fallback or close with a preset reason without introducing typing or open-ended rescheduling.

**Blocked by:** 09 — Record a workout through the established flow.

**Status:** resolved

- [x] Move and skip present the complete established preset-reason set without text entry.
- [x] Moving chooses the next available future fallback in the established order.
- [x] The interface accurately reports when no fallback remains available.
- [x] Move and skip persist distinct outcomes and their selected reasons.
- [x] An assigned fallback uses the same departure reminder, follow-up, confirmation, record reminder, and workout-recording behavior as a primary slot.
- [x] A qualifying fallback workout contributes to the same weekly progress as a qualifying primary workout.
- [x] Abandoning a reason-selection flow does not corrupt later weeks or permanently block the app.
- [x] The primary application seam verifies ordered assignment, expired fallbacks, visible status, reminder intent, recording, and relaunch persistence.

## Answer

Personal Dashboard now presents `Move to fallback` and `Skip` as click-only
reason flows with the complete established five-reason set. Reason selection is
transient: only a confirmed decision is persisted, so Cancel, window close, or
relaunch cannot strand the current or a later week. Confirmed moves and skips
retain distinct typed outcomes and their preset reason in schema version 4.

Moving assigns the next still-future fallback in established order, reports the
source day on the fallback, marks expired slots unavailable, and returns a clear
error when no fallback remains. Assigned fallbacks participate in the same
departure reminder, follow-up, confirmation, record reminder, four-selection
workout flow, qualification rule, and weekly progress calculation as primary
departures.

The controllable-clock application seam covers both reason sets, Saturday then
Sunday assignment, exhausted and expired fallbacks, visible move/skip status,
exact reminder intents, fallback recording and progress, abandoned selection,
and relaunch persistence. The two-axis review found no spec gaps or hard
standards violations; its frontend duplication and typing suggestions were
addressed. TypeScript/Rust checks, all 16 Rust tests, all 20 preserved Python
workflow tests, Clippy with warnings denied, formatting, and diff checks pass.
