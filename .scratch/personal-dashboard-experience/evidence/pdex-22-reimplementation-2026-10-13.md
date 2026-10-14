# PDEX-22 reimplementation evidence — 2026-10-13

## Scope and branch history

- Worktree start/base: `ad697e01cf5a51a619fb97bbad174ebb50161d91`.
- Ticket branch: `codex/pdex-22-refinement-reimplementation`.
- Implementation commit: `16a0b4592f307b94f21c1a38dbac850f5df2b97d` (`PDEX-22: refine Calendar task and holiday interactions`).
- Earlier integration tip merged without conflicts: `cac527d8f12c1fdb1ad8576022bc80edf75e59d1`, in merge `f6c319d77d5239bac9c30767ee4157239f569e1b`.
- PDEX-22 changes stay on the local ticket branch. No remote push, main merge, app installation, or deployment change was made.

## Implemented behavior

- Preserved the existing Calendar shell, month grid, selected-date recap, and daily Task region. Replaced the large Calendar creation form with one compact top-level create dialog that defaults to the selected day, allows date editing, focuses the name field, and uses the existing Task creation business action.
- Calendar Task previews open a compact editor without selecting a different day. Existing Task properties and the surrounding Calendar context remain intact after edit or close.
- Added lightweight, locally persisted China/U.S. holiday display preferences. Task previews retain priority in date cells; holiday labels are omitted when the cell cannot fit them and remain available in the date's accessible label/summary where applicable. Holiday data does not create or mutate business records, trigger reminders, or classify workdays.
- Calendar create/edit drafts follow the target binding/date during workspace reset, while unrelated Task editor drafts keep their existing reset behavior.

## Official holiday data and coverage boundary

- U.S. federal holiday dates for 2026 and 2027 were checked against the Office of Personnel Management schedule: <https://piv.opm.gov/policy-data-oversight/pay-leave/federal-holidays/>. The data uses the published observed dates, including the official weekend observance rule.
- China 2026 leave spans were checked against the State Council annual notice: <https://big5.www.gov.cn/gate/big5/www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm>. The local list covers the published holiday/leave spans and adjacent included weekends, but not make-up working days.
- No official China 2027 annual schedule was available in the verified source set. China data therefore ends at 2026; no previous-year dates, lunar-calendar calculation, or unofficial schedule is extrapolated. Acceptance requiring official China coverage through 2027 remains unmet until an authoritative 2027 schedule can be verified.
- Holiday labels are informational only and are not workday, make-up-day, or reminder logic. There is no runtime service or new dependency.

## Verification

- `node --test tests/frontend/calendar-holidays.test.ts tests/frontend/compact-calendar.test.ts` — 23 passed, 0 failed. Includes the rendered WebKit DOM/pointer scenarios at the listed compact, wide, short, and responsive viewports; date selection/create/editor interaction; holiday visibility/settings; and no write commands on holiday-only interactions. The preference test explicitly enables the U.S. region before the assertion so its starting state is deterministic across persistent WebKit local storage.
- `/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/node_modules/.bin/tsc -p tsconfig.json` — passed, using the existing canonical checkout binary; no dependencies were installed.
- `cargo test --manifest-path src-tauri/Cargo.toml --test calendar_workflow` — 8 passed. Includes real application Task readback after a new Calendar/Today application instance is opened, preserving task identity and the cross-midnight interval without creating a Daily Record.
- `cargo test --manifest-path src-tauri/Cargo.toml --test task_workflow empty_read_is_non_destructive_and_a_manual_inbox_task_survives_relaunch` — passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --test task_workflow task_schedule_allows_future_dates_but_never_orphans_a_time` — passed.
- `git diff --check` — passed.
- WebKit checks use synthetic fixture records and stub only the native IPC boundary; native workflow tests exercise real application persistence/reopen. A packaged UI-to-persistence readback and normal installed-app acceptance were not performed here; packaged acceptance remains with PDEX-26.

## Evidence commit follow-up

The code commit and earlier merge are listed above. The deterministic preference-test adjustment, the evidence commit itself, and the required merge of the next integration tip will be added below after those commits are created.
