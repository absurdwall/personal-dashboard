# PDEX-08 — Compact Calendar and true record state

Date: 2026-10-10
Implementation: `codex/pdex-08`, worktree `/tmp/pdex-08`.
Verified starting integration `22d313a`; code `5f7f1f6`.
Integration `e7c9af1` merged in `1e20cd9`. The sole conflict was unrelated CSS appended at the same file boundary: both compact Calendar rules and PDEX-07’s axis error-status rule were retained. Build and behavior suites below ran on the merged result.

## Delivered behavior

- The public Calendar month projection reads complete Sunday-to-Saturday weeks for the actual month: five rows for compact months (minimum five, including four-week February), six when needed. September 2026 reads 2026-08-30 through 2026-10-03; May 2026 reads 2026-04-26 through 2026-06-06.
- Existing Task source/projection now supplies up to four dated, non-deleted title previews and the real remaining count. State, archived-list eligibility, undated placement and late-completion semantics remain intact. No separate history store exists.
- Shipped Calendar rows use one bounded viewport-based height per month, independent of each date’s task count. Four 12px single-line preview rows fit even in a six-week month. Long titles use ellipsis; full identities/titles/states remain available through date details and accessible labels.
- The date header contains the small source-derived `记`/`复` marker and `+N` count. Error is a separate `!` marker plus the existing read-error accessible label/status; missing records have no marker. Markers do not consume a preview row. A completed Task does not produce review state.
- The header is compact and the month has priority. At narrow widths the existing date detail panel follows the whole month. Clicking a date/overflow area still reads `TodayApplication::read_date` and displays the same Daily Record and full shared Tasks, including the persisted cross-midnight execution interval. Existing shared editing/mutation controls remain.

## Confirmed seams and RED → GREEN

Q4’s existing application/persistence and actual production DOM/geometry seams are used; no source-string presence check is acceptance evidence.

- Public month boundary tracer: RED was 42 returned cells instead of the literal September five-week expectation (35). GREEN covers September five rows, May six, and minimum-five February with exact first/last date literals.
- Existing real Task/Calendar workflow: RED returned `alpha,beta` instead of the requested `alpha,beta,gamma,late`. GREEN returns four and reduces the true overflow from four to two while retaining all six dated Tasks in the shared source.
- Full compiled production application and imported modules execute against shipped HTML/CSS in macOS WebKit; unrelated bootstrap is isolated and native IPC is the substituted system boundary. Actual Calendar rendering, cell-click handlers, selected-date read/render, Task detail/interval rendering and accessibility metadata execute unchanged.
- Layout tracer: original five-week grid ended at **846px** in a real 720px viewport. Intermediate compact rules still let the six-week grid end at **721px**. The final scoped styles pass actual viewport/cell/preview rectangles in both approved frames.
- A new native workflow creates a real isolated synthetic Vault, writes unreviewed/reviewed/damaged Daily Records, creates seven Tasks (one completed, one planned 23:30→next-day00:45), closes the Task application, then reads Calendar and date details from a new application. It proves four previews/+3, distinct record states, full seven-Task identity/revision/interval readback, unchanged Markdown bytes and no missing-record creation.
- That native case can regenerate `tests/frontend/fixtures/compact-calendar-view.json` using `PDEX_CALENDAR_FIXTURE`. Its public native projections feed the WebKit marker/overflow and date-detail tests. Only synthetic opaque Vault paths/names/target bindings are normalized for a stable fixture; domain projections, identity, state, interval and revision are preserved.

## Verification after latest integration

- `npm run build`: passed.
- `npm run test:frontend`: **424 passed, 0 failed, 0 skipped**.
- Eight new real WebKit Calendar cases include actual **1280×720** and **830×758** dimensions, five/six week counts, equal cell heights, whole-grid viewport bounds, all four previews unclipped, one-line truncation, marker/overflow date-line rectangles and real source states.
- Date/overflow click reads the authoritative native-generated view, renders all seven Tasks and the Daily Record arrangement, and shows 23:30 / 2026-09-10 / 00:45 through the existing shared interval controls and visible schedule text. Only read commands reach the IPC boundary.
- Serialized native command:
  `CARGO_TARGET_DIR=/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/src-tauri/target CARGO_BUILD_JOBS=2 cargo test --manifest-path src-tauri/Cargo.toml --test calendar_workflow --test day_task_planning_workflow --test collaboration_task_operations --test today_shared_tasks_workflow`
  **8 + 7 + 105 + 7 = 127 passed**, no failures/ignored tests.
- Native suites additionally retain Calendar damaged-source handling, archived history, real Evening review state, missing-record behavior, pending-planning-input boundaries and shared Task interval/restart semantics.
- `git diff --check`: passed.

The canonical native cache lease was explicitly announced, exclusively used with two build jobs, and released after final integrated tests finished. No owned Cargo/rustc/linker remains. Subsequent canonical builds belong to the parent’s serialized checks.

## Acceptance boundary

Implementation and automated persistence/production WebKit seams pass. These are actual WebKit layout/input checks with a native IPC fixture boundary and native application tests against synthetic Vault/Profile sources. Installed/packaged Tauri UI, physical-device input and human acceptance have not been claimed. PDEX-11 retains that acceptance; PDEX-08 lifecycle remains in-progress. No dependencies, remote/main changes, App installation or user Vault mutations occurred.
