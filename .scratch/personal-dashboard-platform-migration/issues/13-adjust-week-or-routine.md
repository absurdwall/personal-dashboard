# 13 — Adjust this week or deliberately change the routine

**What to build:** Preserve the distinction between a current-week exception and a repeating-routine change in Personal Dashboard so the user can accommodate real conflicts without accidentally rewriting future exercise weeks.

**Blocked by:** 07 — Show the persistent exercise week and first departure reminder.

**Status:** resolved

- [x] An upcoming primary slot can change its day, departure time, or both through preset controls.
- [x] The default edit affects only the current week.
- [x] Editing one slot leaves every unrelated slot unchanged.
- [x] Past, already-reminded, or otherwise ineligible slots cannot be rewritten as upcoming exceptions.
- [x] A separate deliberate settings action changes the repeating routine for future weeks.
- [x] A deliberate routine change does not rewrite an already materialized current week.
- [x] Both current-week exceptions and the repeating routine persist across relaunch.
- [x] Updated upcoming departures schedule correct native reminder intent without leaving stale duplicates.
- [x] The primary application seam verifies current-week isolation, future-week repetition, visible schedule state, and reminder rescheduling.

## Answer

Personal Dashboard now exposes an `Adjust this week` editor only for upcoming
primary departures. Seven weekday choices and 48 half-hour departure-time
presets keep the flow click-only. Saving updates just that materialized slot,
reserves a same-day fallback when necessary, cancels its prior native reminder
intents, and schedules replacements at the adjusted time. Past or otherwise
ineligible departures and invalid or no-longer-upcoming presets are rejected.

A separate `Change repeating routine` section makes its future-only scope
explicit. Saving a routine departure persists the new weekday and time without
rewriting the current or historical weeks; the next generated week uses the
changed routine. Current-week exceptions likewise persist across relaunch but
expire with their materialized week.

The Rust application core owns validated schedule values, persistence,
week-boundary behavior, and reminder orchestration. The plain TypeScript UI
shares one preset payload across both editors and uses explicit save handlers
for their distinct scopes. The controllable-clock application seam covers
isolation, persistence, fallback reservation, future repetition, invalid edits,
and cancellation plus replacement of native reminders. Both review axes report
no remaining findings. TypeScript/Rust checks, all 27 Rust tests, all 20
preserved Python workflow tests, Clippy with warnings denied, formatting, and
diff checks pass.
