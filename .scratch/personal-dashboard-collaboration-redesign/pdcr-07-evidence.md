# PDCR-07 implementation evidence

Date: 2026-10-09. Branch `codex/pdcr-07`, initial integration `760e85f`.
Implementation `3e75957`; personal-retro integration `ea88a9e` merged in
`1d1ba87`; shared-evidence integration `d2170ba` merged in `1aec5cb`. This record covers only isolated synthetic Vaults, the approved
actual Collaboration/Today/file adapters, actual native JSONL/RPC shapes and
production frontend checks. No personal data, external mutation, new dependency,
service, installation, GitHub operation or main merge was used.

## Confirmed identities and independent outcomes

Existing dual-Habit operations remain the business writer: exact stable key,
confirmed unique counterpart ID, dated requested state, actual native readback,
separate local/external results and original-source withdrawal scope. Existing
local-only behavior performs zero external mutations. Ambiguous scope or lost
native identity remains unknown and cannot be guessed from a name or cause a
local success to replay. The registered automatic initial-plan-only tool set
and direct-versus-requested-proposal boundaries are unchanged.

The actual application regressions include
`dual_habit_natural_history_completion_repeat_restart_and_default_withdrawal_count_once`,
`dual_habit_single_end_withdrawal_preserves_other_end_or_and_legacy_local_scope`,
`dual_habit_external_failure_projection_failure_and_lost_receipt_keep_local_success`,
`dual_habit_local_storage_failure_preserves_external_success_and_original_0400_target`,
`dual_habit_mixed_local_task_and_other_local_habit_do_not_narrow_default_dual_exercise`
and `same_date_ambiguous_habit_scope_cannot_be_overridden_by_a_shorter_local_quote`.
The actual native workflow fixtures continue to distinguish confirmed saved,
failed, unavailable and unconfirmed effects and verified historical readback.
These are deterministic adapter results, not live Dida acceptance.

## Native producer owns the simple refresh

Human `dashboard_refresh_habits` now requires only `executionMode=execute`.
The existing Habit snapshot provides only explicit unique stable key/ID
associations; display names establish no mapping. Optional explicit mappings
retain confirmed-identity/conflict guards. The host captures publication dates
from actual natural/lived-date context and validates them before planning any
read. Current native `dida365` schemas must actually support the exact planned
arguments; missing tools, unsupported required parameters, ambiguous identities
or excessive scope stop with old publication retained.

The existing native adapter obtains each exact object through `get_habit` and
all requested counterpart check-ins through `get_habit_checkins`, with the
complete publication window plus its strict adjacent-date envelope. The model
does not construct or supply whole-window source evidence. Actual native
responses pass the existing payload, partial/pagination/error, coverage,
identity, status, parser, canonical-local and publication-race guards in the
existing producer. Old publication bytes remain unchanged on insufficient
coverage, failed query, generation or publication failure. No parallel store,
write wrapper or source service was added.

Host queries persist directly in shared WorkHistory as `hostSourceRead`, with
stable `refresh:<original-call>:read:<ordinal>` identity, actual native tool,
exact argument `inputFingerprint`, allowlisted source/ID/date scope, observed
host times, independent status and filtered diagnostics. Native runtime times
are not fabricated. Raw source results live only in bounded current-turn
producer memory. Scope display truncation has an explicit diagnostic gap;
evidence-cache/refresh-attempt capacity means unknown coverage and cannot
silently publish dropped evidence.

Duplicate delivery of the same call reuses the exact prepared reads and existing
publication receipt; it neither rereads the complete window nor republishes.
The current-turn attempt cache is bounded and different inputs cannot reuse a
call identity. Independent refresh is read-only with respect to completion and
retains the original failed request/history; canonical save, external outcome,
publication and page refresh remain independent.

The combined embedded usage package is skill **1.5.0**, tool set **1.4.0**. It
retains the personal-retro reference, resource fingerprint and captured
`dates.defaultPersonalRetroPeriod`; no new intent classifier or automatic tool
was introduced.

## Red/green at the actual seams

- `simple_refresh_queries_native_full_window_without_model_mappings_or_evidence_assembly`
  first failed to publish without model-provided mappings/evidence. It now
  publishes through the real Today/file adapter after exactly two actual
  RPC-shaped native reads, with only `executionMode` in the model call. The
  returned object deliberately has an unrelated display name; its exact ID is
  the witness. The public developer reader also exports both actual host
  attempts/signatures and every reference resolves into saved history. No
  business operations or external mutations occur.
- `partial_native_producer_query_retains_snapshot_then_independent_refresh_keeps_failed_history`
  uses a partial native response: the first request remains not published with
  byte-identical old snapshot and failed source attempt; a new independent
  refresh succeeds while both histories remain and completion is never replayed.
- `duplicate_refresh_delivery_reuses_source_query_attempts_and_publication_identity`
  first made four native reads for a repeated call, then passed with exactly two
  reads and a single stable source-attempt/publication identity.
- `saturated_native_evidence_cache_reports_unknown_coverage_and_retains_snapshot_bytes`
  first silently dropped excess actual native evidence and published an older
  candidate. It now records unknown capacity, retains byte-identical old
  snapshot and exposes the failed refresh diagnostic through shared history.

## Verification and observed limits

After shared-evidence integration `d2170ba`, commands passed:

- `cargo test --lib -- --test-threads=1`: **99 passed, 6 ignored**, also passed in default parallel mode.
- `cargo test --test collaboration_task_operations --test habit_completion_workflow --test habit_snapshot_workflow`:
  **102 / 12 / 15 passed**.
- `npm run build`: passed; `npm run test:frontend`: **362 passed**.
- `python3 tests/developer/workflow_retro_reader_test.py`: **4 passed**.
- The extended actual minimal producer/public reader case: **1 passed**.
- `git diff --check`: passed.

Original parallel failures are retained in `/tmp/pdcr-07-merged-rust-final.log`:
`today::tests::atomic_exchange_detects_an_external_save_after_candidate_sync`
observed dashboard candidate bytes instead of external-editor bytes;
`today::tests::recovery_tracks_the_same_byte_inode_actually_displaced_by_activation`
found the canonical record missing. Both passed in serial. Their isolated
fixture identities used process ID plus clock nanoseconds; no shared failpoint
was found in those tests. A root-run isolated clock probe observed 1,751 duplicate
clock timestamps in 16,000 simultaneous samples on this Mac
(`/tmp/pdcr-exploration/clock-uniqueness.rs`). A process-local atomic counter
now guarantees those test-only directory identities are unique (`a7aac3c`). Both Today
tests passed in default parallel mode after that fix. Collision attribution
remains an inference because original paths were not logged; the original cause
remains unconfirmed. No production Today writer was changed.

The serial rerun and an individual repeat reproduced the existing
`managed_source_conflict_or_later_edit_keeps_observed_revision_and_original_outcome_separate`
teardown `DirectoryNotEmpty` after all business/source assertions passed.
The application exposes completion before its background final history flush.
Only that owned synthetic-fixture teardown now retries NotEmpty for at most one
second; it leaves outcome assertions and production behavior unchanged. The
subsequent full serial library run passed. Logs:
`/tmp/pdcr-07-merged-rust-serial.log`,
`/tmp/pdcr-07-managed-cleanup-rerun.log`,
`/tmp/pdcr-07-final-lib-serial.log`, `/tmp/pdcr-07-final-targets.log`,
`/tmp/pdcr-07-merged-frontend.log`. Combined final logs:
`/tmp/pdcr-07-combined-final-rust.log`,
`/tmp/pdcr-07-combined-final-frontend.log`,
`/tmp/pdcr-07-combined-reader.log`, `/tmp/pdcr-07-host-reader-final.log`,
`/tmp/pdcr-07-today-parallel-final.log`,
`/tmp/pdcr-07-combined-default-lib-final.log`.

All five child criteria are supported at the confirmed deterministic seams.
Native/package acceptance and actual live connected Dida supplement/readback/
withdrawal remain PDCR-11/12. The user has no prepared authorized isolated Dida
object, so this record does not claim live external success or close the parent
specification. Parent owns map/execution and Management reconciliation.
