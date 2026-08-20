# 04 — Complete unscheduled workout, derived progress, and history evidence

Type: task
Status: claimed
Blocked by: 01, 02, 03

## Goal

Finish the independent Log workout path and make progress a trustworthy product signal. An unscheduled workout must not be disguised as a scheduled occurrence, and the visible progress must be computed from the real qualifying records.

## Production surface

Primary targets are frontend/main.ts, frontend/index.html, frontend/styles.css, src-tauri/src/exercise.rs, and the production workflow tests.

## Required work

- [x] Keep Log workout independent from the scheduled occurrence list and make its click-only choices match the approved v2 flow.
- [x] Preserve a draft when the workflow requires a relaunch or continuation; do not create a completed record before completion.
- [x] Make the progress count/indicator derive from the current week’s qualifying completed records, including the unscheduled case exactly as the v2 contract defines.
- [x] Ensure scheduled, moved-destination, skipped, and unscheduled records contribute to the correct product surfaces without double-counting.
- [x] Show the resulting record in the approved History/current-week evidence surface while keeping source identity clear.
- [x] Verify the visual progress treatment from ticket 02 with zero, partial, and complete states rather than one fixed fixture value.

## Acceptance

- [ ] Log workout works without selecting or mutating a scheduled occurrence.
- [ ] An incomplete draft is not counted as completed; a completed unscheduled workout is counted exactly once.
- [ ] Progress remains correct after completion, navigation, and relaunch.
- [ ] History and the current-week summary agree about the record and its source type.
- [ ] Production tests and a real-app acceptance scenario cover the zero/partial/complete progress states.

## Boundaries

Do not introduce a new progress service, database, dependency, or typed data-entry surface. Preserve the local-first persistence model.

## Comments

### Implementation

- Kept the existing production unscheduled seam: `start_unscheduled_workout_record` persists the independent `unscheduled` draft, the staged activity/duration/effort choices remain click-only, and completion stores `Unscheduled workout` with no source occurrence binding.
- Added `unscheduled_draft_and_progress_states_survive_relaunch_without_a_schedule_binding` at the Rust application seam. It covers no record before completion, draft continuation after relaunch, Under 20 at `0 of 3`, qualifying progress at `1 of 3`, `2 of 3`, and `3 of 3`, goal completion, unique unscheduled records, source identity, and relaunch equality.
- Added a named `progress` branch to `scripts/acceptance/macos-ipc-workflow.sh`. It exercises the same 0-to-3 path through the packaged UI/Tauri IPC, checks current-week History source/outcome text, and verifies complete progress after relaunch. The existing `workouts` branch remains the scheduled Under 20 plus unscheduled source comparison.

### Verification

Passed:

- `npm run check`
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `bash -n scripts/acceptance/macos-ipc-workflow.sh`
- Focused Rust tests for unscheduled recording, draft relaunch, rollover cleanup, and the new integrated progress test.
- `npm run build:mac` — rebuilt `src-tauri/target/release/bundle/macos/Personal Dashboard.app`.

The packaged attempt was made with:

`PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=progress scripts/acceptance/macos-ipc-workflow.sh`

It was blocked by the current macOS desktop environment: the Accessibility driver timed out waiting for `Log workout now` while the packaged app was not visible on the locked screen. The ticket therefore remains `claimed`; the packaged acceptance checkboxes remain open and no release-parity claim is made from Rust or build results alone.
