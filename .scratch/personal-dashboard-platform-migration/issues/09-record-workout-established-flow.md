# 09 — Record a workout through the established flow

**What to build:** Preserve the low-friction workout-recording workflow in Personal Dashboard, from confirmed departure and record reminder through a persisted qualifying or short-effort record and updated weekly progress.

**Blocked by:** 08 — Respond to departure or receive one follow-up.

**Status:** resolved

- [x] The record-workout prompt becomes actionable only for an eligible confirmed departure.
- [x] Recording uses exactly the established four selections in the established order without any required or optional text field.
- [x] Activity, duration, and perceived-effort choices and wording remain unchanged.
- [x] Perceived effort remains descriptive and does not imply that harder is better.
- [x] A completed qualifying workout increments weekly progress exactly once.
- [x] An under-threshold workout is retained as a short effort without incrementing qualifying progress.
- [x] An in-progress recording flow survives relaunch without losing or duplicating state.
- [x] The shared Rust core owns eligibility, validation, qualification, draft state, and completion.
- [x] The primary application seam verifies the complete visible flow, reminder intent, persistence, and progress result.

## Answer

Personal Dashboard now makes `Done` actionable only after an eligible confirmed
departure has an OS-owned `Record workout.` reminder scheduled and its
established 90-minute delay has elapsed. The click-only interface then preserves
the exact four-selection flow: `Done`, activity, duration, and perceived effort.
The established labels and order remain unchanged, including `Harder is not
better.` guidance and no workout text field.

The shared Rust core persists the draft after every selection, validates typed
activity, duration, and perceived-effort choices, derives qualification from
duration, rejects inconsistent saved workout state, and prevents a source slot
from being recorded twice. Qualifying workouts increment the weekly result once;
`Under 20` remains visible and persisted as `Short effort — does not count toward
weekly progress` without changing the qualifying count.

The controllable-clock application seam covers the scheduled reminder boundary,
exact visible choices, invalid and out-of-order selections, qualifying and short
outcomes, duplicate prevention, corrupted-state rejection, and draft/record
persistence across relaunch. The two-axis Standards and Spec review is clean.
TypeScript/Rust builds, all Rust tests, Clippy, all 20 preserved Python workflow
tests, npm audit, formatting/diff checks, and ARM64 iOS/Android Rust checks pass.
