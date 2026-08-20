# 08 — Run and close the packaged v2 parity gate

Type: task  
Status: ready-for-agent  
Blocked by: 01, 02, 03, 04, 05, 06, 07

## Goal

Perform the final product acceptance on the real packaged Mac application. The final conclusion must be that launching the app produces the approved v2 product, not merely that implementation tickets or fixture tests are green.

## Required work

- [ ] Build the production frontend and Tauri app using the repository’s existing build path.
- [ ] Launch the packaged app from an isolated test profile and run the existing Mac acceptance gate, including the direct-record, unscheduled, workout, exception, responsive, keyboard, and relaunch scenarios.
- [ ] Add and run a named packaged week-close/History assertion: a due or past no-record row remains unrecorded before close, week close distinguishes unfinished from qualifying recorded work, and moved/skipped/recorded/unresolved states retain readable non-color signals in This Week and History.
- [ ] Exercise the app at the desktop reference, intermediate, and compact viewport classes defined by the v2 contract.
- [ ] Compare the visible hierarchy and interaction outcomes against the A prototype: default list-first This Week, temporary detail sheet, direct record, open-capacity/Log workout entry, History/Settings reachability, and focus/scroll behavior.
- [ ] Confirm that all seven review-comment areas in map.md have production evidence.
- [ ] Record the exact commands, app/build artifact, environment, screenshots or driver output, and any failed scenario in the ticket Answer.

## Required verification

- [ ] npm run check
- [ ] npm run build:mac
- [ ] npm run accept:cutover, or the repository’s documented equivalent if the environment requires a bounded alternative
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
