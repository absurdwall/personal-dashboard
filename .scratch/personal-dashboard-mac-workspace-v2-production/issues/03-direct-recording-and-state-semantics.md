# 03 — Close and prove direct recording and occurrence state semantics

Type: task
Status: resolved
Blocked by: 01, 02

## Goal

Make the production UI and domain view expose the v2 click-only recording path and the correct meaning of each occurrence. A due or past recordable occurrence should be directly recordable; a future occurrence should not be; an occurrence that was moved, skipped, recorded, or left unresolved must not be presented as a different state.

## Production surface

Primary targets are frontend/main.ts, frontend/index.html, src-tauri/src/exercise.rs, src-tauri/src/lib.rs, and src-tauri/tests/application_workflow.rs. Change Rust only where the production contract is incomplete.

## Required work

- [x] Verify the direct Record action for a due or past recordable scheduled occurrence, with no mandatory departure-response screen.
- [x] Verify that exact click-only choices and the under-20-minute path remain available where the v2 contract requires them.
- [x] Hide Record for future occurrences and show the correct non-recordable state/action.
- [x] Bind a completed workout to the selected source occurrence or the explicit unscheduled path; prevent duplicate records.
- [x] Ensure dashboard progress and selected-row state update after recording without a stale detail view.
- [x] Preserve distinct future, due, recorded, unresolved, skipped, moved-source, moved-destination, and available states in the production view.
- [x] Verify that a moved original cannot be recorded or changed through the source row; the independent moved destination owns the record action. The full exception mutation is ticket 05, but this state invariant must be tested here.

## Acceptance

- [x] The production UI never routes the normal due-record flow through a “Leaving?” gate.
- [x] Future rows cannot be recorded, due rows can be recorded directly, and recorded rows cannot be recorded twice.
- [x] A relaunch or fresh dashboard read shows the same source binding and state; the full persistence matrix is ticket 07.
- [x] Rust/application tests and the relevant real-app acceptance scenario cover the state distinctions above.

## Boundaries

Reuse the existing Rust semantics when they already satisfy the contract. Do not copy fixture-only helpers into production and do not add typing, cloud state, or a new service.

## Comments

### Implementation

- Kept the existing production direct-record seam: due or past scheduled/assigned occurrences expose `Record workout` without requiring a departure response, and the existing click-only activity, duration, effort, Under 20, source binding, progress, and duplicate protections remain authoritative in Rust.
- Updated `frontend/main.ts` so the visible primary-row state is keyed by `statusKind`; an unresolved occurrence now remains visibly `Unresolved — no response` even when its direct Record action is still available.
- Added Rust application assertions for unresolved state/action semantics and for a moved original having no Record, Change, or Skip operation and rejecting both record and change commands.
- Strengthened `scripts/acceptance/macos-ipc-workflow.sh` with a named `state-semantics` scenario plus future `Scheduled`, available `Available`, recorded no-Record, post-record closed-detail/selected-row, and moved-original no-action assertions.

### Verification

Passed:

- `npm run check`
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `cargo test --manifest-path src-tauri/Cargo.toml` — 70 tests passed across the Rust unit, application workflow, migration, profile backup, and profile move suites.
- `bash -n scripts/acceptance/macos-ipc-workflow.sh`
- `npm run build:mac` — rebuilt `src-tauri/target/release/bundle/macos/Personal Dashboard.app`.

The packaged state-semantics attempt was made with:

`PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=state-semantics scripts/acceptance/macos-ipc-workflow.sh`

It was initially blocked by the macOS lock screen. The unlocked rerun passed after the acceptance flow was corrected to select Monday before asserting the detail-only `Unresolved — no response` text. The direct-record rerun also passed after pinning its clock to 16:05, before the follow-up becomes due, so the packaged scenario proves the due/unrecorded state rather than conflating it with unresolved.

- 2026-08-20: Unlocked packaged evidence passed:
  - `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=state-semantics scripts/acceptance/macos-ipc-workflow.sh`
  - `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=direct scripts/acceptance/macos-ipc-workflow.sh`
  - The existing shell/list-first surface covers future-row detail; Rust application tests cover future, recorded, moved-source, moved-destination, skipped, unresolved, available, and duplicate protections. The unrelated list-first Settings-scroll assertion remains ticket 07 scope.

## Answer

Resolved with direct recording, unresolved-state, future-row, recorded-row, and relaunch evidence complete. The packaged UI crosses real Tauri IPC without a `Leaving for gym` gate; due rows expose `Record workout`, completed rows remove it, and source binding persists after relaunch. `npm run check`, the full Rust suite (71 tests), formatting, build, and shell syntax checks pass.
