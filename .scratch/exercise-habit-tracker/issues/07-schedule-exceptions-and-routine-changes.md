# 07 — Adjust this week without accidentally changing the routine

**What to build:** Let the user move an upcoming departure to a different day or time for the current week while reserving permanent routine changes for a separate deliberate settings action.

**Blocked by:** 02 — Complete departure response and one follow-up.

**Status:** resolved

- [x] The user can change both the day and departure time of an upcoming primary slot using click-only controls.
- [x] A slot edit applies to the current week by default.
- [x] Editing one slot leaves every other slot unchanged.
- [x] The dashboard immediately shows the adjusted next departure and resulting fallback availability.
- [x] Departure and follow-up reminders occur at the adjusted time and do not also occur at the superseded time.
- [x] A separate deliberate settings operation can change the repeating primary routine for future weeks.
- [x] A permanent routine change does not rewrite historical schedules or workout records.
- [x] Silence or failure to open schedule settings preserves the existing repeating routine.
- [x] The application-workflow test verifies a one-week day/time exception, unchanged sibling slots, reminder timing, and a deliberate future-routine change through observable behavior.

## Answer

Added click-only day and departure-time selectors to each upcoming primary slot. Saving through “Adjust this week” changes only that generated week's slot, immediately recalculates the next departure, and reserves a same-day fallback from the available count. The reminder runner reads the adjusted persisted departure, so it stays silent at the superseded time and emits the initial and single follow-up reminders at the new time.

Added a separate “Change repeating routine” settings disclosure. Its explicit save updates only the repeating primary template used when future weeks are generated; current and historical week copies and workout records remain unchanged. Merely viewing or ignoring settings leaves the routine untouched.

The application workflow now verifies the one-week exception, unchanged sibling slots, fallback capacity, adjusted reminder timing, restoration of the original routine in the following week, deliberate future-routine changes, historical preservation, and no-save behavior. All 16 workflow tests pass, source and tests compile, and both Standards and Spec reviews are clean.
