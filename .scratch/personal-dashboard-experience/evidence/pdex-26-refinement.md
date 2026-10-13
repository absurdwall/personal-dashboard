# PDEX-26 combined verification — 2026-10-13

Working branch: `codex/pdex-26-refinement`; isolated worktree
`/private/tmp/pdex26-refinement.noindex`. Start `115a912b76c823b36aeef6ad03a3145a8eceac94`,
claim `e7a947abb0bb4c3ad9f2904524ae2a652d6b762d` retained by merge `a923800`.
Local Git only; no normal installation, main/remote operations, dependency
installation, desktop input or service calls by this verifier.

## Confirmed sourced-Habit completion regression and bounded repair

Initial `npm run build` passed. Full Cargo run with `-- --test-threads=1`
stopped at `collaboration_task_operations`: 88/105 passed, 17 failed. All
failures involved explicit local Habit completion being refused or absent;
preceding unit/other workflows were green. The initial full run is retained,
not described as a pass. Diagnostic isolated command:

```sh
CARGO_TARGET_DIR=/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/src-tauri/target cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_task_operations local_habit_completion_add_and_withdraw_refresh_today_calendar_and_habits_only -- --exact --test-threads=1
```

It failed independently in 0.13s (local state None rather than Completed),
ruling out the initial order-contamination hypothesis. A narrower real
`TodayApplication::set_historical_habit_completion` regression using the unchanged
legacy sourced fixture failed in 0.02s with "该习惯不是 completion 型". This uses
actual File stores and fresh-instance readback; no IPC mock substitutes for data.

Cause: PDEX-25 correctly bounded sourced historical goal knowledge to its
coverage, but the new historical completion guard required an applicable
historical goal even for a sourced, unchanged completion-type Habit. A stale
snapshot ending September8 does not prohibit an explicit canonical completion
on September27. Typed current WeeklyDays also made the former Unconfigured
fallback unavailable. This broke retained Collaboration's historical-write path.

The bounded guard now permits the existing source completion capability only
when no dated goal applies and there is no local definition overriding it.
Canonical configured/date-specific goals keep precedence. Legacy weekly
Unconfigured handling and withdrawal behavior remain. This does not infer targets
or attainment over a history gap. The new test confirms fresh-instance local
Completed readback, unchanged source bytes, unknown total/highest coverage and
refusal of a clock Habit beyond its source coverage.

Focused green run: Collaboration Task 105/105, Habit details 12/12 (including
new regression), Today shared Task 9/9 (including new combined relation/group/
priority/tag/date-view regression). Logs: `/private/tmp/pdex26-habit-gap-red.log`,
`/private/tmp/pdex26-habit-gap-green.log`, `/private/tmp/pdex26-collaboration-isolated.log`.
The regression initially had an unsupported equality assertion in its fixture;
that compile error was corrected before the actual behavioral red above.

## Combined cross-feature checks in progress

The new real Task/Today/Calendar case retains a grouped child with its own date,
parent in another list/date, priority/tag/end, cancellation, parent delete/restore,
folder deletion and original cancellation receipt retry. Fresh application reads
retain identities/metadata; both Calendar dates remain correct and Daily Record,
Morning baseline and Current arrangement remain unchanged. The production Today
nearby-editor scenario now saves Content with those combined Task properties.
These tests extend existing agreed application and actual-DOM seams.

Full Rust/Frontend, four-size actual production DOM/pointer preservation and
source-qualified failure comparison continue. Root owns all private packaged
native pointer/profile/restart artifacts and hardware/service acceptance.
No complete PDEX-26/native acceptance is claimed by this increment.


## Confirmed Today reading-state preservation repair

The initial full frontend sweep completed 509/537 passing, 28 failing. A new
actual production `docked-sidebars` failure reported scroll80→29 after resize.
A diagnostic rerun found initial plot1920/maxscroll1578 before fitting, versus
final overview plot211.8/maxscroll29, so the pixel assertion reflects the newly
specified adaptive overview. It also revealed a real independent issue: expanded
untimed arrangement/fact reading details were replaced and folded on resize.

Minimization used the full production browser/main renderer, allowed its fit to
settle, opened both untimed reading details, and dispatched resize at the same
viewport. Both identities/open states disappeared (writes0) in about1s. This
separates the product bug from scale/clamp assumptions and old extraction probes.
The narrowly scoped renderer now retains unchanged immutable unlocated source
arrays' DOM nodes across layout/clock redraws, and resets them on day/Vault target
change or changed source arrays. A fresh authoritative source replaces the old
reading content. Timed card geometry/recalculation and write paths are untouched.

The regression ran red then green. Post-repair build plus production Today,
plan-time-editor and Calendar suites passed62/62. The new test runs zoom/resize
at1280×800,1280×720,830×758,680×560 without writes, then proves a refreshed source
replaces the preserved content. Logs: `/private/tmp/pdex26-untimed-reading-red.log`,
`/private/tmp/pdex26-untimed-reading-green.log`,
`/private/tmp/pdex26-followup-source-dom.log`.

Before this second source repair, the repaired full Rust suite passed564 tests,
0 failed, 6 existing native gates ignored (28 result suites). The three existing
production Task WebKit scripts passed at all four requested dimensions with an
explicit `TASK_DOM_VIEWPORTS` matrix; their default two-width behavior remains.
A full exploratory browser run passed44/55, failed11. Its failed old selectors
expect permanently exposed properties/actions, a removed pre-round Calendar
control, lower Today detail panels and fixed old axis geometry; exact results and
source qualification are retained in the final comparison record. These failures
are not silently counted as passes. Root-owned native matrix must use both
confirmed source repairs. Full current frontend comparison and final handoff
remain in progress.


## Final source verification and handoff

Confirmed source repairs: `159741b` (canonical sourced completion beyond bounded
coverage), `b89a216` (untimed reading nodes during presentation-only redraws).
Test-only cross-feature and four-size checks: `ac8b291`. No further product
changes were made. Latest integration `e7a947a` is retained and verified as an
ancestor; all PDEX-19–25 worker branch tips are also reachable without squash or
amend. Complete branch/source identities are in the machine result below.

Final commands and recorded results:

```sh
npm run build
CARGO_TARGET_DIR=/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/src-tauri/target cargo test --manifest-path src-tauri/Cargo.toml --no-fail-fast -- --test-threads=1
PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node --test --test-concurrency=1 tests/frontend/*.test.ts
PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node --test --test-concurrency=1 tests/frontend/today-refinement.test.ts tests/frontend/plan-time-editor.test.ts tests/frontend/compact-calendar.test.ts
TASK_DOM_VIEWPORTS='[[1280,800],[1280,720],[830,758],[680,560]]' node scripts/acceptance/task-organization-dom.mjs
TASK_DOM_VIEWPORTS='[[1280,800],[1280,720],[830,758],[680,560]]' node scripts/acceptance/task-tag-save-dom.mjs
TASK_DOM_VIEWPORTS='[[1280,800],[1280,720],[830,758],[680,560]]' node scripts/acceptance/task-refinement-dom.mjs
```

- Build passes; full Rust:564 pass,0 fail,6 existing native ignores. All current
  Rust product/test files match that run; the subsequent product change affects
  only frontend reading-node preservation.
- Final full frontend:510/538 pass,28 fail,0 skip. Exactly15 failure names match
  the39-failure pre-change receipt, and24 baseline failures now pass. The13
  additional names are qualified in the exact comparison, including the old
  adaptive-overview pixel assertion and extraction/DOM/source-signature failures.
  No whole-suite green result is claimed.
- Post-reading-fix focused production Today/plan/Calendar:62/62 pass, including
  real Chrome broad/exact/Task pointers, end-only editing, blank creation,
  edge-scroll/Escape, failure recovery, four-size bounded WK cards and nearby
  shared metadata-preserving Task dialogs. Full final frontend also includes
  the retained passing Collaboration context/voice-preview/slash fixtures.
- All three Task matrices were rerun after the final stable frontend build and
  pass at1280×800,1280×720,830×758,680×560. They verify hierarchy/folders, actual
  tag/cancel-time/end Save events, filters/menus and staged drafts. Browser IPC
  remains a synthetic boundary; disk persistence is proven by real application
  tests, not these browser fixtures.
- Exploratory all-browser sweep:44/55 pass,11 fail. Exact names/classification
  and its build-span qualification stay recorded. The detached-marker failure
  reproduces on isolated rerun while the automation is starting a second move
  during post-save fit redraw. It is retained as a failed probe; separate current
  production range/pointer tests and pending root native matrix retain the real
  behavior obligation. No broad selector/fixture/product rewrite was made.
- `git diff --check` passes. No debug instrumentation or unrelated dirty work
  remains after the evidence commit. Existing dependencies/Cargo target were
  reused; no install, main, remote, desktop input or live-service action occurred.

[Machine source/results/log hashes](pdex-26-source-verification-2026-10-13.json)
and [exact frontend/browser failure comparison](pdex-26-frontend-comparison-2026-10-13.md)
retain source identity, each failed name, baseline match and limitations. Local
raw logs remain at their listed private temporary paths with SHA256 fingerprints.
The rebuilt frontend main/index/style fingerprints are included; they are not
an executable/package identity.

## Acceptance still pending

Root must merge the source repairs, freeze/build a new package and provide
source/binary/profile identity plus real Tauri write/readback/restart and
four-window pointer/background comparisons. Whole PDEX-26, hardware IME and
microphone, genuine runtime/service/queued model behavior, normal installation
and final user acceptance remain separate. No old waiver is reused. All acceptance
checkboxes stay open until those actual results and independent review exist.
The local tracker retains Status implementation-complete/acceptance-pending and
Lifecycle in-progress; this is source verification delivery, not whole-ticket
closure or a substitute for root-owned native evidence.
