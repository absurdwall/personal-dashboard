# 02 — Align the production shell and default This Week workspace

Type: task  
Status: claimed  
Blocked by: 01

## Goal

Make the real packaged app’s default route match the v2 A prototype at the workspace level: This Week opens first, the agenda is list-first, and detail is a temporary sheet opened only by an explicit row action.

## Production surface

Primary targets are frontend/index.html, frontend/main.ts, and frontend/styles.css. Reuse the existing Rust view contract unless ticket 01 proves a production domain gap.

## Required work

- [x] Make the default launch state This Week with no auto-opened detail, prompt, or departure-decision gate.
- [x] Match the A layout hierarchy: compact workspace header, week context, real progress presentation, next-departure context, primary agenda, and subordinate open-capacity/unscheduled entry point.
- [x] Make the agenda a full-width list-first surface at the desktop reference size; remove accidental permanent two-pane/detail treatment from the default route.
- [x] Keep History and Settings reachable as secondary destinations without changing their approved scope.
- [x] Ensure row labels, status signals, and actions expose the v2 semantic states rather than internal schema vocabulary.
- [x] Keep the app click-only for the approved workflows; do not add free-form typing or a new navigation dependency.
- [x] Verify the shell at the desktop, intermediate, and compact viewport sizes before handing off to ticket 03.

## Acceptance

- [x] A fresh launch visibly matches the v2 default workspace and does not open a detail sheet.
- [ ] Selecting a row opens the temporary detail surface; closing it returns to the agenda without losing the selected context. The final packaged re-run is pending an unlocked desktop.
- [x] The real progress value is bound to production state and is not hard-coded; the visual treatment matches the approved reference.
- [x] The default route has no visible legacy “Leaving?” response flow.
- [ ] Existing build/type checks pass and the relevant production acceptance scenario proves the default route. Static checks pass and the shell scenario reached all viewport assertions, but the final packaged run was interrupted by the locked desktop.

## Boundaries

Do not edit the fixture to make this pass. Do not redesign History or Settings, add dependencies, or change the Tauri/persistence contract without evidence from ticket 01.

## Comments

- 2026-08-20: Implemented the production shell in `frontend/index.html`, `frontend/main.ts`, and `frontend/styles.css`. The desktop agenda is now one full-width list-first surface with subordinate Open capacity styling; the workspace header is compact; the agenda lists expose explicit list semantics; and the default copy no longer presents a departure-response workflow.
- 2026-08-20: Added `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=shell scripts/acceptance/macos-ipc-workflow.sh` for this ticket’s desktop/intermediate/compact shell boundary, and strengthened the existing list-first checks. After the bundle rebuild, the packaged driver passed the default 960x720 shell assertions, intermediate 800x640 assertions, compact 640x520 assertions, semantic list roles, document-fixed checks, real `0 of 3 completed` progress, Open capacity, and absence of the legacy Leaving flow. The composite `list-first` scenario then reached its existing Settings scroll assertion owned by ticket 07.
- 2026-08-20: `npm run check`, `npm run build:mac`, and `bash -n scripts/acceptance/macos-ipc-workflow.sh` pass. The targeted shell scenario was re-run after making Close matching robust to the visible control’s `aria-label`, but the macOS session entered the lock screen before the final row-selection/Close assertions; the packaged driver then saw no rendered UI. Leave this ticket claimed for a human re-run from an unlocked desktop rather than claiming the final packaged Close proof.
- 2026-08-20: The targeted shell scenario intentionally proves shell structure, destination labels, and fixed document boundaries; compact Record, Change time, Skip/Undo, and unscheduled workflows remain the downstream 03–06 acceptance surface, while full Settings scroll/reachability evidence remains ticket 07’s scope.
