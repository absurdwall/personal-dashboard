# PDCR-04 implementation evidence

Date: 2026-10-09. Branch: `codex/pdcr-04`, based on integration `a1df0e2`.
Business data used here are isolated synthetic Vaults; no personal Vault, app
installation, connected-source write, GitHub operation or main merge occurred.

## Canonical behavior and bounded read

- Existing TaskApplication, FileTaskStore and Collaboration adapter remain the
  mutation source. Task/list CRUD, schedule, actual completion, lifecycle,
  revision conflicts, idempotent results and user-requested proposal use the
  existing operations; no second Task store or intent classifier was added.
- One manual capability `dashboard_read_history` accepts an actual available
  domain and inclusive ordered valid fromDate/toDate, maximum 366 dates. Initially
  only `tasks` is executable. It checks captured selected-Vault identity before
  and after reading and compares actual adapter Vault path to the host-selected
  root when available. Automatic registration is unchanged.
- The typed Task projection preserves source availability/error, targetBinding,
  canonical revision, stable IDs, current Task/list states and retained changes.
  Scheduled date, actual completion date/time, and original local change date
  are distinct. Change timestamps use their original local wall clock and the
  04:00 lived-day boundary, not UTC date substrings.
- Relevant Tasks include schedule/completion witnesses in the period and dated
  creation/change activity. A reopened Task retains earlier completion witnesses;
  current state is explicitly distinguished from historical evidence. The source
  coverage note keeps unavailable earlier history and actual activity unknown.
- Saved dynamic receipts now include the existing operation and typed baseline
  beside resultSnapshot/resultRevision, without another evidence store.

## Frontend outcomes, navigation and effect refresh

The actual production outcome renderer supplements saved Task results with
observed schedule, actual completion and list names. Task/list outcome buttons
open existing Tasks views with stable identity and source-session return pointer;
deleted Task results open the deleted scope. Existing Markdown source links
continue to use the actual Task/list lookup path.

The single existing session watch stays alive when navigating out of Collaboration.
A newly confirmed Task/list receipt re-reads Tasks and the visible Today/Calendar
source date while a turn remains active. It does not change the original request
or repeat a mutation. Vault reset and terminal state retain their existing stop
boundaries. Independent Daily Record receipts, source-save status and page refresh
remain separate results.

## Verification and commit receipts

- TDD red: the new bounded-history public application test initially failed to
  compile because the capability did not exist; the new production Task-summary
  test failed because actual completion/schedule were omitted. Production watch
  tests failed because other destinations were skipped. Green checks followed
  the corresponding implementation slices.
- `cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_task_operations`:
  **92 passed**. New coverage verifies completion-after-reopen without schedule
  rewriting, a real Collaboration period query with no business receipt/write,
  empty source, damaged source preservation and inclusive 366-date validation.
  Existing cases verify stable list/Task lifecycle, mixed-intent independent
  outcomes, interleaved user note preservation, revision conflict refresh,
  historical completion correction and requested review before save.
- `cargo test --manifest-path src-tauri/Cargo.toml --test today_shared_tasks_workflow`:
  **3 passed**, using actual Task and Today applications with shared file-backed
  identity, archive, schedule and completion behavior.
- `npm run build`: passed. `npm run test:frontend`: **342 passed**. Production
  renderer/handler tests include saved schedule versus actual completion,
  stable deleted-Task/list navigation, early Today/Calendar reads while the final
  reply is pending, and navigation without stopping the active source observer.
- `git diff --check`: passed.
- Shared history API/guidance commit: `62f10ea`.
- Frontend/evidence commit: the commit carrying this record (recorded by local
  tracker closeout/integration receipt).

## Acceptance limits

The five PDCR-04 criteria are supported at the spec-confirmed file-backed
Collaboration/business-adapter and production frontend seams. This record does
not establish live model intent quality, native packaged acceptance or live Dida
success. Those requirements remain PDCR-11/12; no fixture substitutes for them,
and this child closeout does not close the parent specification or authorize
release/main merge.
