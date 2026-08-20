# 07 — Prove persistence, History/Settings, and production boundaries

Type: task
Status: claimed
Blocked by: 03, 04, 05, 06

## Goal

Prove that the real app remains coherent after relaunch and that the existing secondary surfaces are reachable without being mistaken for the v2 workspace. This is the pre-gate evidence pass for local-first behavior.

## Production surface

Primary targets are frontend/main.ts, frontend/index.html, src-tauri/src/exercise.rs, src-tauri/src/lib.rs, src-tauri/tests/, and scripts/acceptance/.

## Required work

- [ ] Exercise relaunch persistence for scheduled completion, unscheduled completion, draft state, change-time, moved source/destination, skip, undo, progress, and source binding.
- [ ] Verify History and Settings remain reachable from the workspace and render persisted state consistently; do not redesign them as part of this ticket.
- [ ] Confirm the default launch still returns to the approved This Week list-first state and does not auto-open stale detail.
- [x] Verify local-first/offline behavior and that no fixture store, temporary server, or hidden cloud dependency is needed by the production path.
- [x] Reconcile production status evidence with the new effort map; do not mark historical fixture tickets as production delivery.
- [ ] Record exact commands, environment assumptions, and any human-only packaged-run blocker in the ticket Answer.

## Acceptance

- [ ] All required state survives relaunch in the real app, or a deliberate non-persistence rule is documented from the v2 contract.
- [ ] History/Settings navigation works with mouse and keyboard and does not corrupt the active This Week state.
- [x] The production path uses the intended Rust/persistence boundary and passes the relevant build/test checks.
- [x] No ticket is declared delivered solely because a fixture or unit test passed.

## Boundaries

Do not broaden the product into mobile, cloud sync, deployment, or a new settings design. Preserve personal data and existing local storage.

## Comments

### Implementation

- The existing Rust application boundary already owns file-backed exercise persistence, relaunch recovery, rollover, History state, and profile/routine/settings data; no new domain or storage service was needed for this evidence ticket.
- Added `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=week-close scripts/acceptance/macos-ipc-workflow.sh`. It keeps an unresolved planned occurrence and a qualifying unscheduled record in one isolated profile, relaunches in the following week, checks the fresh list-first This Week state, and checks the historical week label, `Missed — no response`, `1 of 3 completed`, source identity, and qualifying outcome in History. The aggregate `gate` now includes this scenario.
- Strengthened `scripts/acceptance/tauri-only-source.sh` so the production frontend/Rust sources fail if they introduce network clients, localhost/loopback dependencies, or `.scratch` fixture references. The check stays limited to production frontend/Rust sources and does not remove the historical prototype.
- Ticket 06 remains `claimed`; its Accessibility evidence is still a prerequisite and is not silently promoted by this ticket.

### Verification

Passed:

- `npm run check`
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `cargo test --manifest-path src-tauri/Cargo.toml` — 73 tests passed across the unit, application workflow, migration, profile backup, and profile move suites.
- Focused `week_rollover`, `relaunch`, and `moved_destination` application-workflow filters.
- `bash -n scripts/acceptance/macos-ipc-workflow.sh scripts/acceptance/macos-packaged-launch.sh scripts/acceptance/tauri-only-source.sh`
- Swift Accessibility driver compilation with ApplicationServices and AppKit.
- `npm run build:mac` — bundle at `src-tauri/target/release/bundle/macos/Personal Dashboard.app`.
- `npm run accept:cutover` — Tauri-only source boundary and isolated packaged launch passed; the relocated arm64 app opened without Python or a listening TCP socket.
- `git diff --check` for the scoped implementation files.

Blocked packaged evidence:

- `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=list-first scripts/acceptance/macos-ipc-workflow.sh` timed out before rendered `Log workout now`.
- `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=week-close scripts/acceptance/macos-ipc-workflow.sh` timed out before rendered `Log workout now`.
- Computer Use reported: `The Mac is locked and automatic unlock could not unlock it. Ask the user to unlock the Mac manually before continuing.` The responsive and keyboard scenarios therefore remain pending the same unlocked desktop run.

The ticket remains `Status: claimed` until an unlocked Mac supplies direct packaged History/Settings, relaunch, responsive, and keyboard evidence. No `## Answer` is declared while that human-only gate is incomplete.
