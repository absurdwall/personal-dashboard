# 13 — Adjust this week or deliberately change the routine

**What to build:** Preserve the distinction between a current-week exception and a repeating-routine change in Personal Dashboard so the user can accommodate real conflicts without accidentally rewriting future exercise weeks.

**Blocked by:** 07 — Show the persistent exercise week and first departure reminder.

**Status:** ready-for-agent

- [ ] An upcoming primary slot can change its day, departure time, or both through preset controls.
- [ ] The default edit affects only the current week.
- [ ] Editing one slot leaves every unrelated slot unchanged.
- [ ] Past, already-reminded, or otherwise ineligible slots cannot be rewritten as upcoming exceptions.
- [ ] A separate deliberate settings action changes the repeating routine for future weeks.
- [ ] A deliberate routine change does not rewrite an already materialized current week.
- [ ] Both current-week exceptions and the repeating routine persist across relaunch.
- [ ] Updated upcoming departures schedule correct native reminder intent without leaving stale duplicates.
- [ ] The primary application seam verifies current-week isolation, future-week repetition, visible schedule state, and reminder rescheduling.
