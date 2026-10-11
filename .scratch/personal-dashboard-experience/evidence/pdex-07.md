# PDEX-07 — Task selection and movement on the shared axis

Date: 2026-10-10
Branch: `codex/pdex-07`; worktree `/tmp/pdex-07`
Authorized integration base: `72f0e33`
Implementation increments: `11ecb10` blank selection/editor; `6be7eac` Task
movement/projection/recovery; `1491c57` integrates `6bd91ad` with full history.
No personal data, remote/main operation, dependency addition or installation.

## Public behavior and pointer ownership

`frontend/today-axis-gestures.ts` attaches one pointer owner to the existing
plot and inner scroll surface. It captures a TodayView/source context before
editing. Blank ranges create editable Task drafts; task targets move from
actual Task endpoints, preserving optionality and duration. End dates remain
explicit, start snapping is 15 minutes, and illegal boundaries fail without
truncation or reversal. Completed Tasks remain completed; abandoned/deleted
Tasks are not draggable. Facts do not become editable targets.

Task intervals project through the shared Task source; clipping at the lived
window retains actual source dates and continuation flags. Displayed range
labels read the real endpoints. Clicking a card still opens its existing
reading details; its edit action opens the stable Task identity. No second
axis or Task/Diary copy is created.

A failed movement retains the saved projection and intended endpoints.
Rereading either confirms an already saved effect or exposes an explicit
retry; retry uses current content/list/state and changes timing only. Failed
creation retains editable fields and one stable Task ID. No automatic replay.

The PDEX-04 implementer has the callback seam pointer: main
`resolveTodayAxisGestureTarget` / `commitTodayAxisGesture`, with shared target
`kind`, `key`, saved `startMinute`, `endMinute`, and optional `mode` move or
resize-end. Button handles opt in with `data-axis-resize`; ordinary buttons
remain untouched. No separate plan pointer controller is needed.

## TDD and actual DOM evidence

Q4 confirmed public Task application/persistence and actual pointer seams.
Read `tdd` SKILL.md, tests.md and mocking.md. Browser skill used with an
already available Playwright module and installed Chrome; nothing installed.

`tests/browser/today-axis-task-gestures.mjs` serves the original built
`dist/index.html`, styles and production `main.ts`. Real Chromium mouse and
keyboard events drive real DOM elements. Tauri IPC is the mocked system
boundary; these tests are not packaged native IPC evidence or user acceptance.

Red → green:

- Blank pointer range initially opened no editor. The production creation
  dialog then passed exact editable start/end and create payload assertions.
- Task pointer movement initially emitted no update. Point/range movement
  then passed identity, duration and completion-state checks.
- Immediate pointer capture broke ordinary card clicks. A real click test
  failed; capture now starts only beyond the drag threshold and click passed.
- Unsupported movement feedback was absent beside the axis. A real DOM
  assertion failed; visible near-axis error feedback now passes.

Eight actual browser scenarios passed on the merged shared layout:
selection/create, point/range move, revision conflict and explicit retry,
failed creation/editable retry/stable identity, ordinary click, midnight date
and snapping, held inner-edge scroll/Escape cancellation, unsupported bounds
without writes. Preview never becomes completion or observed activity.

Reproducible browser command after `npm run build`:

```sh
PLAYWRIGHT_MODULE_PATH=/path/to/already-installed/playwright/index.mjs node --test tests/browser/today-axis-task-gestures.mjs
```

## Persistence and integration checks

A new public shared-task workflow uses a real synthetic Vault and FileTaskStore
for `23:45–00:15`, movement to natural next-date `01:15–01:45`, duplicate
prevention, a new application instance, Calendar's actual scheduled date,
stale-revision rejection, and unchanged Daily Record baseline/time axis/state.
Its pre-merge isolated run passed; final merged scoped results are added below.
The existing Task persistence, failure and migration suites remain in use.

Merged build and full frontend suite initially passed (411 tests). Cargo uses
`CARGO_TARGET_DIR=/tmp/pdex-06/src-tauri/target`, `CARGO_BUILD_JOBS=2`,
sequentially; the canonical shared target is untouched.

The two merge conflicts were additive. Resolved with
`resolving-merge-conflicts`: retain Task editing alongside PDEX-02's broad-plan
editor guard, and retain both Task gesture styles and PDEX-03 Morning styles.
The controller bootstrap belongs before workspace navigation initialization;
this also preserves the existing focus/resume regression boundary.

## Remaining acceptance

Native WKWebView / packaged IPC drag, same candidate restart and direct human
usability acceptance remain PDEX-11 gates. Browser automation plus separate
real application persistence does not assert native end-to-end acceptance,
installation or release. Ticket lifecycle remains distinct from implemented
behavior and these automated checks.

Final checks before the last integration synchronization:

- `npm run build`: passed.
- Full frontend suite: 411 passed.
- Real Chrome pointer suite: 8 passed on the merged own-scroll/collision layout.
- Scoped real Rust application/adapter/Calendar suites: 53 passed (Calendar 6,
  adapter 12, Task workflow 28, Today shared Tasks 7).
- Cargo runs completed sequentially in the isolated reused target; no process
  remains running against it.
