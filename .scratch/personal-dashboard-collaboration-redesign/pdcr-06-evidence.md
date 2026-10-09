# PDCR-06 implementation evidence

Date: 2026-10-09. Branch: `codex/pdcr-06`, initial integration `6070afa`,
updated to `6b620bf` before work. Implementation `76ef192`; latest integration
`a87945f` merged in `773e7c0`; production receipt/link fix `957a701`.
Only isolated synthetic Vaults and the confirmed real application/file-backed
adapters and production frontend seams were used. No personal-data mutation,
external mutation, installation, GitHub operation or main merge occurred.

## Bounded canonical history

The same `dashboard_read_history` capability now advertises `habits` only when
the real adapter implements it. `CollaborationHistoryRequest::dates()` retains
inclusive valid ordered YYYY-MM-DD with at most 366 dates. TodayApplication
also validates its supplied consecutive dates. The captured selected Vault is
checked before/after reads and against the actual adapter source path.
Automatic initial-plan-only registration remains unchanged.

Canonical history reads the existing guarded local completion parser directly,
independent of the snapshot and display window. It returns exact habitKey and
livedDate, explicit completed/withdrawn state, original change IDs/timestamps,
accepted no-op receipt IDs, source binding and revision. `recordedCompletedAt`
and `changedAt` are save timestamps; they do not assert activity time.
Requested dates without a record are unknown. Missing, damaged and unavailable
canonical sources retain explicit state; damaged bytes are not overwritten.
The query makes no writes and creates no overlapping store or mutation tool.

Published snapshot evidence is separate: state/freshness, generated time,
source revision, coverage, requested dated cells, relevant dated goal context,
source observations and actual-time versus threshold details. Canonical local
completion and dated notes are not merged into this published source response.
No today/recent cells or aggregate counts outside the requested period are
returned. An absent snapshot does not suppress a saved canonical local fact.

## Save, display and receipt independence

Existing local-only write routing, stable key/date/change identity, guarded
revision, requested-proposal behavior, correction trace and retry/no-op logic
remain the writer. Local-only scenarios record zero external mutations.
Existing tests retain ordinary/exercise note context without completion,
threshold evidence without invented actual minutes, and separate external
state after withdrawal.

A fault test reproduced the original post-save bug: the real canonical write
succeeded, then a failed snapshot read caused approval to return an error.
The local receipt now obtains completion state/revision from the actual saved
Today canonical correction view. Snapshot read failure is retained separately
as error/message in the typed result snapshot. The production receipt card
shows canonical completion/revision and failed snapshot independently, with
unconfirmed external evidence unknown when the snapshot is unavailable.
Read-only saved-result reconciliation verifies the canonical exact receipt
before projection-only checks; reconcile and repeated approval leave completion
bytes unchanged. Unsaved proposal/precondition guards remain in place.

## Exact Habit/date navigation

Habit links reuse the existing Habits destination and exact key/date selection.
Every selected key now reads the existing `read_daily_view` date source. An old
delayed response cannot replace a newer selected date. When the snapshot does
not cover the selected date, a read-only detail shows its canonical local state
and correction history, stable key/date and save timestamps, while external
completion and goals remain unknown. It adds no catalog, mapping or write
control and is removed on Vault reset. Covered dates keep the existing detail.

## Verification

TDD red/green evidence:

- A canonical local completion beyond missing snapshot coverage initially failed
  because the `habits` domain was unavailable, then passed via the actual
  Collaboration/Today adapters. Stable effect ID, range and unchanged bytes
  were checked.
- The production selected-date reader initially ignored non-exercise keys;
  the delayed-response test then passed for every exact key/date.
- A real file adapter with only a post-save projection-read fault initially
  returned an error after saving; it now preserves applied canonical effect and
  revision, reports the snapshot error and does not replay on reconciliation.
- The bilingual production receipt renderer initially labeled unavailable
  external evidence as none; it now keeps that evidence unknown.

Commands/results after merging latest integration:

- `cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_task_operations`:
  **100 passed**. New tests cover bounded canonical fact independent of missing
  snapshot, withdrawal/no-op receipts and untouched other dates, registered
  read-only dynamic query with no business write, missing/damaged source plus
  preserved published actual-time/threshold evidence, and post-save projection
  failure with byte-identical repeated reconciliation/approval. Existing tests
  cover direct/requested proposal paths, revision conflicts, local-only external
  read-only routing, short-record boundaries, source refresh/publication failures,
  restart receipt recovery, captured historical dates and 04:00 behavior.
- `cargo test --manifest-path src-tauri/Cargo.toml --test habit_completion_workflow --test habit_snapshot_workflow`:
  **12 completion and 15 snapshot tests passed** at the existing actual file
  adapters, including canonical preservation, note/completion distinction,
  threshold/actual-time separation, stale/missing snapshot and historical names.
- `npm run build`: passed. `npm run test:frontend`: **361 passed**, including
  production exact Habit link navigation, all-key delayed date reads, completed/
  withdrawn/unknown fallback detail and bilingual independent canonical revision/
  failed snapshot receipt display. Existing refresh tests distinguish saved source
  outcome from page refresh and retain per-request independent results.
- `git diff --check`: passed. Latest integration is an ancestor of this branch.

All five child criteria are supported at the confirmed seams. Native/package
and live connected-source acceptance remain PDCR-11/12. No isolated live Dida
object has been authorized; this ticket does not claim live Dida success or
close the parent spec. Parent owns map/execution and Management reconciliation.
