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
