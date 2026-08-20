# 01 — Freeze the production gap matrix and cutover contract

Type: task  
Status: resolved
Blocked by: none

## Goal

Create one verified baseline for the real production app before implementation begins. Compare the approved v2 contract and A prototype against frontend/, src-tauri/, and scripts/acceptance/; distinguish existing production behavior from fixture-only behavior and record the remaining gaps.

## Required work

- [x] Inspect the actual production entry points in frontend/index.html, frontend/main.ts, frontend/styles.css, src-tauri/src/, src-tauri/tests/, and scripts/acceptance/.
- [x] Build a requirement matrix covering default This Week, temporary-sheet detail, direct recording, unscheduled workout, change-time, conflict confirmation, skip/undo, moved occurrences, progress, history, settings, persistence, responsive behavior, focus, and packaged acceptance.
- [x] For every requirement, record whether production already satisfies it, needs a code change, or needs only stronger acceptance evidence.
- [x] Identify the exact production file/function and verification command for every remaining gap.
- [x] Confirm that the implementation tickets 02–08 cover every gap without depending on fixture edits.
- [x] Record the matrix and any corrected assumptions in this ticket’s Answer when resolving the ticket.

## Acceptance

- [x] The matrix cites the approved v2 spec and prototype as the only design references.
- [x] The matrix names production files and does not treat .scratch prototype changes as implementation.
- [x] A fresh baseline passes the relevant existing checks, or failures are recorded with their exact cause.
- [x] No implementation ticket remains with an unspecified production target or an unstated acceptance condition.

## Boundaries

Do not redesign the product in this ticket, add dependencies, or change the fixture. This ticket exists to prevent implementation sessions from rebuilding behavior that already exists or claiming fixture work as production delivery.

## Answer

### Design and evidence boundary

The only design references used for this matrix are:

- `.scratch/personal-dashboard-mac-workspace-v2/spec.md`, the approved v2 production contract.
- `.scratch/personal-dashboard-mac-workspace/prototype/ticket-08-week-flow/`, the A — List + temporary sheet visual/interaction reference.

The prototype is fixture-only. It has no Tauri IPC, persistence, notifications, or production authority. Every target below is under `frontend/`, `src-tauri/`, or `scripts/acceptance/`; no prototype change is counted as implementation.

Disposition meanings: `production satisfies` means the inspected production seam matches the contract; `code change required` means a production mismatch or a reproducible packaged failure is known; `stronger acceptance evidence` means the seam is present but the real packaged workflow is not yet proven.

### Fresh baseline

All commands were run against the current checkout on 2026-08-20.

| Command | Result | What it proves |
|---|---|---|
| `npm run check` | PASS | Frontend build and `cargo check` pass. |
| `cargo test --manifest-path src-tauri/Cargo.toml --test application_workflow` | PASS, 44/44 | The existing Rust application seam covers records, drafts, progress, exceptions, history, persistence, and reminders. Some tests intentionally exercise the legacy departure-response path; they are not packaged v2 release proof. |
| `npm run build:mac` | PASS | Bundle built at `src-tauri/target/release/bundle/macos/Personal Dashboard.app`. |
| `npm run accept:cutover` | PASS | Tauri-only source and isolated packaged launch pass. This command does not run the v2 IPC workflow gate. |
| `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=direct scripts/acceptance/macos-ipc-workflow.sh` | PASS | Direct scheduled recording, click-only choices, progress, relaunch, and visible persistence pass in the packaged app. |
| `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=list-first scripts/acceptance/macos-ipc-workflow.sh` | FAIL | At the default 960x720 semantic check, the driver timed out waiting for `semantic workspace roles`. The rendered text and window size were present. |
| `...=workouts scripts/acceptance/macos-ipc-workflow.sh` | FAIL after partial progress | Draft relaunch and scheduled Under 20 behavior ran, then focus restoration timed out waiting for focused `Monday`. |
| `...=exceptions scripts/acceptance/macos-ipc-workflow.sh` | FAIL after partial progress | Skip and Undo rendered, then focus restoration timed out waiting for focused `Monday`. |
| `...=responsive scripts/acceptance/macos-ipc-workflow.sh` | FAIL after partial progress | The 960x720 path ran; after the 800x640 transition, focus restoration timed out waiting for focused `Close`. |
| `...=keyboard scripts/acceptance/macos-ipc-workflow.sh` | FAIL at initial semantic check | The same `semantic workspace roles` timeout occurs before keyboard workflow assertions. |
| `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=gate scripts/acceptance/macos-ipc-workflow.sh` | NOT releasable | The aggregate gate includes the failures above; no packaged v2 parity claim is made. |

### Production gap matrix

| Requirement | Current production baseline | Disposition | Exact remaining target and verification | Owner |
|---|---|---|---|---|
| Default destination is This Week, list-first, and does not auto-open detail | `frontend/index.html:14-82`; `frontend/main.ts:1366-1396,2376-2378` render and select This Week without an automatic detail selection. | stronger acceptance evidence | Re-run `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=list-first scripts/acceptance/macos-ipc-workflow.sh` after the semantic gate is repaired; the current packaged run fails before this contract is release-proven. | 02, 08 |
| Desktop shell hierarchy: full-width primary agenda with subordinate Open capacity | `frontend/index.html:84-141` has the right content, but `frontend/styles.css:1462-1466` currently makes primary departures and Open capacity side-by-side. | code change required | Change `.agenda-layout` in `frontend/styles.css` (and only adjust `frontend/index.html` if the semantic order requires it). Verify the 960x720 list-first scenario and its no-body-overflow assertions. | 02 |
| Temporary detail sheet is selection-driven, bounded, closeable, and compact-window Back is available | `frontend/main.ts:1051-1107,1210-1364`; `frontend/styles.css:1088-1121,1760-1874` implement the selected-row sheet, bounded desktop layer, and compact full-window surface. | stronger acceptance evidence | Run `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=responsive scripts/acceptance/macos-ipc-workflow.sh`; the current run reaches the sheet but fails on focus after resize. | 06, 08 |
| Future, due/past unrecorded, recorded, moved, skipped, and available states are visibly distinct | Rust status/exception views are in `src-tauri/src/exercise.rs:3032-3113,3173-3198,3611-3695`; TypeScript row rendering is in `frontend/main.ts:601-704`. | stronger acceptance evidence | Verify future no-record action, due direct Record, recorded result, moved source/destination, skipped Undo, and available fallback through `list-first`, `direct`, and `exceptions` scenarios. | 03, 05, 08 |
| Week-close keeps due/past no-record rows unrecorded and distinguishes unresolved from completed history | `src-tauri/src/exercise.rs:744-899,2731-2793,3611-3658` has rollover/reconciliation, dashboard status, and `Unresolved`/`Missed` variants, but the current packaged scenarios do not prove the v2 week-close boundary. | stronger acceptance evidence | Add/verify the week-close case at the Rust application seam and a named week-close/History branch in `scripts/acceptance/macos-ipc-workflow.sh`; target rollover/reconciliation, `departure_status_kind`, `departure_status`, and History. Run `cargo test --manifest-path src-tauri/Cargo.toml --test application_workflow` plus `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=gate scripts/acceptance/macos-ipc-workflow.sh`. | 03, 07, 08 |
| Due/past scheduled workout can be recorded directly without a Leaving/departure-response gate | `src-tauri/src/exercise.rs:1331-1368,3353-3387`; `frontend/main.ts:1761-1829`; the packaged `direct` scenario passes. Legacy departure fields/commands remain in Rust but are not consumed by the normal frontend route. | production satisfies | Preserve the direct path; use `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=direct scripts/acceptance/macos-ipc-workflow.sh` as the regression command. | 03 |
| Click-only activity, duration, and effort choices; Under 20 records but does not count toward progress | Choice and qualification logic is in `src-tauri/src/exercise.rs:1370-1480`; Rust coverage is green and the packaged workout scenario reaches the Under 20 path. | stronger acceptance evidence | Complete the packaged workout scenario and verify both the Under 20 no-progress result and a qualifying result in `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=workouts scripts/acceptance/macos-ipc-workflow.sh`. | 03, 04, 08 |
| Unscheduled workout is independent, click-only, draft-safe, and persists through relaunch | `frontend/main.ts:1761-1829,2467-2576`; `src-tauri/src/exercise.rs:1354-1368,1406-1480`; Rust tests cover it, but the packaged scenario stops at scheduled-record focus restoration before completing the later unscheduled assertions. | stronger acceptance evidence | Finish `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=workouts scripts/acceptance/macos-ipc-workflow.sh`; do not edit the fixture to stand in for this proof. | 04, 07, 08 |
| Progress reflects real qualifying completion rather than a fixed visual value | `src-tauri/src/exercise.rs:2731-2793` derives the view from week state; direct packaged recording shows `1 of 3` and survives relaunch. Full zero/partial/complete coverage is not yet packaged. | stronger acceptance evidence | Extend/finish the workout gate at `scripts/acceptance/macos-ipc-workflow.sh:275-357` and verify scheduled, unscheduled, Under 20, and qualifying cases against the rendered progress. | 02, 04, 08 |
| Change time offers only future eligible slots, with Saturday/Sunday suggestions and no fallback terminology | `src-tauri/src/exercise.rs:3000-3030` generates future choices and weekend suggestions; `frontend/main.ts:1125-1190` renders them. Rust coverage exists, but the packaged exception run stops before this assertion. | stronger acceptance evidence | Run `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=exceptions scripts/acceptance/macos-ipc-workflow.sh` after focus repair and verify the all-future choice set. | 05, 08 |
| Conflicts cover every occupied target slot and require explicit confirmation | `src-tauri/src/exercise.rs:1041-1114,3338-3351` checks conflicts and requires `confirm_conflict`; `frontend/main.ts:1148-1190` exposes the warning/confirmation. Rust coverage passes; packaged coverage is blocked downstream. | stronger acceptance evidence | Verify the conflict branch in `scripts/acceptance/macos-ipc-workflow.sh` and the keyboard equivalent; no conflict may be silently accepted. | 05, 08 |
| Skip is direct, has no reason/confirmation, closes detail, and Undo restores the occurrence | `src-tauri/src/exercise.rs:1116-1176`; `frontend/main.ts:1584-1745`; the packaged exception run rendered Skip and Undo before failing on restored focus. | stronger acceptance evidence | Complete `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=exceptions scripts/acceptance/macos-ipc-workflow.sh`; focus repair is tracked separately under 06. | 05, 06, 08 |
| Moved original is no longer recordable/adjustable; destination is an independent occurrence | `src-tauri/src/exercise.rs:1041-1114,3032-3113`; destination materialization and source status are covered by Rust tests and the row view. The packaged moved-source/destination path has not completed. | stronger acceptance evidence | Verify the move/conflict/relaunch section of the exceptions gate; target `change_current_week_departure`, `departure_exception_view`, and `planned_departure_views`. | 03, 05, 07, 08 |
| History is reachable and reflects persisted corrections and unscheduled records | `frontend/index.html:143-158`; `frontend/main.ts:1366-1506,1902-1915`; Rust history view and correction tests pass. No complete packaged v2 history run exists yet. | stronger acceptance evidence | Finish the workout/relaunch gate and verify History after scheduled, unscheduled, skip, move, and correction flows. | 04, 07, 08 |
| Settings/Profile and existing notification/routine surfaces remain reachable without redesign | `frontend/index.html:160-190` exposes the navigation controls; `frontend/main.ts:1366-1506,1942-1997` renders the destinations and profile/settings surface. Tauri commands are supporting seams, not reachability evidence. | stronger acceptance evidence | Add/finish packaged navigation assertions in the final gate; verify `History` and `Settings` from the real app, not a fixture. | 07, 08 |
| Local persistence and relaunch preserve state; no cloud/mobile/dependency expansion | File-backed Tauri setup is in `src-tauri/src/lib.rs:394-577`; open/rollover/reconciliation is in `src-tauri/src/exercise.rs:744-899`; direct relaunch passes. Remaining drafts, unscheduled records, and exceptions are not all packaged-proven. | stronger acceptance evidence | Run direct, workouts, exceptions, and `npm run accept:cutover`; confirm the isolated app profile and no Python/TCP runtime in the launch check. | 07, 08 |
| 960x720, intermediate, and 640x520 layouts preserve local scroll, selection, draft, destination, and the full click-only workflow | `frontend/main.ts:500-536`; `frontend/styles.css:1689-1874` implement the viewport classes and local overflow. The responsive run fails at the intermediate focus assertion after resize, and the current matrix did not yet require compact recording, change-time, Skip/Undo, unscheduled logging, or pending-exception preservation. | code change required | Repair `syncWorkspaceViewportMode`, `restoreSelectedAgendaFocus`, and/or the corresponding sheet focus path in `frontend/main.ts:1051-1107,1621-1652,1782-1818`; extend `scripts/acceptance/macos-ipc-workflow.sh` so the 640x520 branch verifies Record, Change time, Skip, Undo, unscheduled logging, and pending exception/draft preservation. Verify with `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=responsive scripts/acceptance/macos-ipc-workflow.sh` and the aggregate packaged gate. | 03, 04, 05, 06, 08 |
| Semantic roles, keyboard navigation, visible focus, live results, and status text work in the packaged Mac UI | `frontend/index.html:418-461` has an `aside` sheet but no dialog/modal semantics; `frontend/styles.css:1511-1517` removes list markers; `scripts/acceptance/macos-ui-driver.swift:346-402` requires AXList and other roles. Packaged list-first/keyboard fail at `semantic workspace roles`; workouts/exceptions/responsive fail focus restoration. | code change required | Repair the production sheet/list semantics and focus lifecycle in `frontend/index.html`, `frontend/main.ts:1051-1107,1782-1818`, and `frontend/styles.css:1511-1517`; re-run `list-first`, `keyboard`, `workouts`, `exceptions`, and `responsive`. | 06 |
| Final packaged parity gate is the release decision | `npm run build:mac` and `npm run accept:cutover` pass, but neither is the v2 IPC gate. The aggregate `scripts/acceptance/macos-ipc-workflow.sh` is not green. | stronger acceptance evidence | Ticket 08 must run `npm run build:mac` plus `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=gate scripts/acceptance/macos-ipc-workflow.sh` against the built `.app`, record driver output, and resolve only on direct packaged evidence. | 08 |

### Ticket coverage and cutover contract

The gap-to-ticket mapping is complete and every remaining item has a production target:

| Gap | Ticket coverage | Production/evidence boundary |
|---|---|---|
| Shell order, full-width agenda, default This Week | 02 | `frontend/index.html`, `frontend/main.ts`, `frontend/styles.css`; 960x720, intermediate, compact list-first acceptance. |
| Direct record, occurrence state, and week-close/unresolved classification | 03 | `frontend/main.ts`, `src-tauri/src/exercise.rs`, `src-tauri/src/lib.rs`, Rust workflow tests, packaged direct/future/moved/week-close assertions. |
| Unscheduled records, drafts, progress | 04 | `frontend/main.ts`, `src-tauri/src/exercise.rs`, History view, packaged workouts/relaunch assertions. |
| Change time, conflicts, skip/undo, moved source/destination | 05 | `frontend/main.ts`, `src-tauri/src/exercise.rs`, packaged exceptions and keyboard assertions. |
| Sheet behavior, responsive layout, compact full-workflow coverage, semantic roles, focus restoration | 06 | `frontend/index.html`, `frontend/main.ts`, `frontend/styles.css`, `scripts/acceptance/macos-ui-driver.swift`, and the scenario branches in `scripts/acceptance/macos-ipc-workflow.sh`; responsive and keyboard scenarios. |
| Relaunch persistence, History, Settings, notifications/routine boundaries | 07 | `src-tauri/src/lib.rs`, `src-tauri/src/exercise.rs`, `frontend/main.ts`; real packaged relaunch and secondary-surface assertions. |
| Release parity and no-fixture cutover | 08 | `package.json`, `scripts/acceptance/macos-ipc-workflow.sh`, `scripts/acceptance/macos-ui-driver.swift`, `scripts/acceptance/macos-packaged-launch.sh`, and the built `.app`. |

The cutover contract is therefore: implementation tickets may change only the production targets above and their tests/acceptance drivers; the `.scratch` prototype remains read-only reference material. Ticket 08 is not allowed to conclude from fixture tests, Rust tests, `npm run accept:cutover`, or a successful build alone. It must pass the packaged v2 IPC gate at all required viewport classes and after the specified relaunches.

### Corrected assumptions

- The current branch already contains partial v2 production behavior. The existence of a matching Rust seam or a green fixture/Rust test is not evidence that the packaged Mac product is complete.
- `npm run accept:cutover` verifies source ownership and packaged launch only. The v2 product gate is the scenario-driven `scripts/acceptance/macos-ipc-workflow.sh` command.
- The legacy `departure_prompt`, `departure_reason_prompt`, `departure_confirmation`, and related Tauri commands remain in the Rust compatibility surface. They are not rendered or required by the normal TypeScript direct-record route; removing them is not part of this gap-freeze ticket.
- The side-by-side Open capacity layout and the packaged semantic/focus failures are production gaps, not reasons to promote or edit the fixture.
