# 08 — Run and close the packaged v2 parity gate

Type: task  
Status: claimed
Blocked by: 01, 02, 03, 04, 05, 06, 07

## Goal

Perform the final product acceptance on the real packaged Mac application. The final conclusion must be that launching the app produces the approved v2 product, not merely that implementation tickets or fixture tests are green.

## Required work

- [x] Build the production frontend and Tauri app using the repository’s existing build path.
- [ ] Launch the packaged app from an isolated test profile and run the existing Mac acceptance gate, including the direct-record, unscheduled, workout, exception, responsive, keyboard, and relaunch scenarios.
- [ ] Add and run a named packaged week-close/History assertion: a due or past no-record row remains unrecorded before close, week close distinguishes unfinished from qualifying recorded work, and moved/skipped/recorded/unresolved states retain readable non-color signals in This Week and History.
- [ ] Exercise the app at the desktop reference, intermediate, and compact viewport classes defined by the v2 contract.
- [ ] Compare the visible hierarchy and interaction outcomes against the A prototype: default list-first This Week, temporary detail sheet, direct record, open-capacity/Log workout entry, History/Settings reachability, and focus/scroll behavior.
- [ ] Confirm that all seven review-comment areas in map.md have production evidence.
- [ ] Record the exact commands, app/build artifact, environment, screenshots or driver output, and any failed scenario in the ticket Answer.

## Required verification

- [x] npm run check
- [x] npm run build:mac
- [x] npm run accept:cutover, or the repository’s documented equivalent if the environment requires a bounded alternative
- [ ] A packaged-app gate result, not only npm/cargo/fixture results
- [ ] The packaged gate includes the named week-close/History assertion and records its direct driver output.

## Production/evidence surface

This ticket owns the final packaged evidence boundary, not fixture promotion. Its production and acceptance targets are `package.json`, `scripts/acceptance/macos-ipc-workflow.sh`, `scripts/acceptance/macos-ui-driver.swift`, `scripts/acceptance/macos-packaged-launch.sh`, and the built `src-tauri/target/release/bundle/macos/Personal Dashboard.app`. The `.scratch` prototype is read-only reference material.

The required v2 gate command is:

`npm run build:mac && PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=gate scripts/acceptance/macos-ipc-workflow.sh`

## Acceptance

- [ ] A fresh launch of the packaged app matches the v2 product goal at the required viewport sizes.
- [ ] The end-to-end workflows pass after relaunch where specified.
- [ ] Week-close preserves no-record/unresolved semantics and History distinguishes unfinished from qualifying recorded work.
- [ ] No old fixture route, temporary prototype server, or “Leaving?” gate is required for the result.
- [ ] The ticket is marked resolved only with direct packaged evidence. If the desktop is locked or the driver cannot run, record the exact environment blocker and leave the ticket for human follow-up rather than claiming delivery.

## Boundaries

This is an acceptance gate, not permission for an unrelated cleanup or redesign. Keep the v2 spec as the sole design reference and do not add dependencies or deployment configuration.

## Comments

### Implementation

- The existing production acceptance surface contains the named `week-close` scenario. The aggregate `gate` is wired to run `list-first`, `direct`, `state-semantics`, `progress`, `workouts`, `exceptions`, `responsive`, `keyboard`, and `week-close`; this is script coverage only, because the locked desktop stopped the current run at `list-first`. No unrelated production behavior or dependency change was needed for this final gate ticket.
- The `week-close` branch is defined to check an unresolved scheduled occurrence before close, record a qualifying unscheduled workout, relaunch in the following week, and assert History shows `Missed — no response`, `1 of 3 completed`, the unscheduled workout, its source identity, and `Counts toward weekly progress`; it also asserts the fresh This Week view is list-first without stale detail. The branch was not reached in this locked run.

### Verification

Passed:

- `npm run check`
- `npm run build:mac`
- `npm run accept:cutover` — Tauri-only source boundary and isolated packaged launch passed; the relocated arm64 app opened without Python or a listening TCP socket.
- `cargo test --manifest-path src-tauri/Cargo.toml` — 73 tests passed across the unit, application workflow, migration, profile backup, and profile move suites.
- `bash -n scripts/acceptance/macos-ipc-workflow.sh scripts/acceptance/macos-packaged-launch.sh scripts/acceptance/tauri-only-source.sh`
- `swiftc scripts/acceptance/macos-ui-driver.swift -framework ApplicationServices -framework AppKit -o /tmp/personal-dashboard-macos-ui-driver-ticket08`
- `git diff --check`

Build artifact and environment:

- `/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/src-tauri/target/release/bundle/macos/Personal Dashboard.app`
- macOS `26.5.1`, `arm64`; the cutover check used a relocated app and an isolated temporary app-owned profile.

Blocked packaged evidence:

- Required command: `npm run build:mac && PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=gate scripts/acceptance/macos-ipc-workflow.sh`
- The build succeeded, but the packaged gate failed at its first `list-first` scenario: `Packaged IPC acceptance failed at launching isolated packaged app: timed out waiting for rendered UI text: Log workout now`, followed by `Packaged IPC acceptance failed at running packaged list-first acceptance: packaged list-first acceptance did not pass`.
- Read-only Computer Use state check reported: `The Mac is locked and automatic unlock could not unlock it. Ask the user to unlock the Mac manually before continuing.` Therefore no packaged scenario, viewport comparison, direct driver output, week-close pass, or full moved/skipped/recorded/unresolved non-color state comparison is claimed from this run.

The ticket remains `Status: claimed` and has no `## Answer` until a human unlocks the Mac and the direct packaged gate supplies the required UI evidence. Ticket 06 and ticket 07 remain claimed for the same unresolved packaged Accessibility boundary.
