# 09 — Record a workout through the established flow

**What to build:** Preserve the low-friction workout-recording workflow in Personal Dashboard, from confirmed departure and record reminder through a persisted qualifying or short-effort record and updated weekly progress.

**Blocked by:** 08 — Respond to departure or receive one follow-up.

**Status:** ready-for-agent

- [ ] The record-workout prompt becomes actionable only for an eligible confirmed departure.
- [ ] Recording uses exactly the established four selections in the established order without any required or optional text field.
- [ ] Activity, duration, and perceived-effort choices and wording remain unchanged.
- [ ] Perceived effort remains descriptive and does not imply that harder is better.
- [ ] A completed qualifying workout increments weekly progress exactly once.
- [ ] An under-threshold workout is retained as a short effort without incrementing qualifying progress.
- [ ] An in-progress recording flow survives relaunch without losing or duplicating state.
- [ ] The shared Rust core owns eligibility, validation, qualification, draft state, and completion.
- [ ] The primary application seam verifies the complete visible flow, reminder intent, persistence, and progress result.
