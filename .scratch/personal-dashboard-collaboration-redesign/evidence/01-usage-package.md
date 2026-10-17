# PDCR-01 — usage package and daytime record evidence

Date: 2026-10-09
Implementation commit: `1d656cb`
Branch: `codex/pdcr-01`
Integration baseline: `caae20b` (product base `9939c23`)
Scope: local implementation/application checks; no installed app or live Dida acceptance

## Contract and behavior

- The existing `personal-dashboard-collaboration` package is embedded at build
  time. Manifest contract 1 records skill `1.0.0` and tool set `1.0.0`.
- Its entrypoint links the document, Dida and mapped-Habit references plus the
  restricted automatic round. Tool descriptions use semantic keys in one JSON
  resource; the host retains schemas, mechanical guards and business adapters.
  Automatic request prose also resides in the package. Current context and
  connection status remain per-turn facts supplied by the host.
- Before model input, Collaboration saves an execution-keyed `usageBindings`
  entry with versions, content fingerprint, registered tools/operation names,
  external-capability fingerprint and automatic scope. It survives reopen.
  Old sessions without the new field deserialize with empty historical bindings;
  earlier unknown versions are not backfilled. Package changes participate in
  thread rotation through the existing history/receipt restoration path.
- Human guidance preserves conversation-based intent, direct execute,
  user-requested proposal, stable identities, factual daytime writes and
  independent source/projection/history outcomes. No new semantic authorizer,
  dependencies, service or personal-data store was introduced.
- The automatic schema now offers only saveDailyPlan / initialPlan, matching its
  existing handler restriction. Task/Habit/background/file mutations remain
  outside the automatic round.
- Existing deterministic snapshot, Daily Record and receipt adapters remain
  authoritative. No extra synonymous wrapper or model-built full-history
  producer was added.

## Red → green evidence at confirmed seams

All checks use CollaborationApplication with a replaceable runtime boundary,
real FileCollaborationStore, Task/Today application adapters, isolated synthetic
Vaults and existing readback interfaces. These verify host execution/persistence
behavior; the scripted runtime does not establish real model interpretation.

1. `daytime_save_records_the_loaded_usage_and_actual_capabilities_across_reopen`
   initially failed with `skillName: null` instead of
   `personal-dashboard-collaboration`. After package binding, it passes: the
   exact daytime fact reads back for 2026-09-27, unknown sleeping time remains
   unknown, baseline remains intact, unavailable memory is absent from the
   registered-tool list and usage metadata survives application reopen.
2. `automatic_usage_advertises_only_the_existing_initial_plan_capability`
   initially found five advertised operations: plan, evening review, short
   record create/correct and Habit completion. After narrowing only the
   automatic schema, it passes with exactly saveDailyPlan and initialPlan.
3. Extended
   `automatic_session_human_continuation_saves_tasks_records_habits_and_memory_then_reopens`
   initially failed because the memory tool's single-schema operation was
   absent from usage metadata. It now passes with proposeLongTermUpdate recorded
   and all five automatic/human execution bindings preserved across reopen,
   alongside canonical Task, record, Habit and Self.md readback.

The initial test compile required a temporary symlink to the existing built
frontend dist (Tauri build macro requirement); this was not a product change and
was removed after verification. No installation or dependency download was used.

## Final verification

At implementation commit `1d656cb`:

```sh
CARGO_TARGET_DIR=<existing canonical src-tauri/target> cargo test \
  --manifest-path src-tauri/Cargo.toml --lib \
  --test collaboration_task_operations --test collaboration_workflow \
  --test collaboration_evening_review --test daily_plan_workflow \
  --test habit_completion_workflow --test habit_snapshot_workflow
```

224 passed, 0 failed; 6 explicit native/live gates ignored. Suite counts:
lib 77, task operations 89, Collaboration workflow 19, evening review 4,
daily plan 8, Habit completion 12, Habit snapshot 15. `git diff --check` passed.
Full local synthetic check output: `/tmp/pdcr-01-checks.log` (ephemeral evidence).

Relevant retained behavioral regressions include:

- `explicit_daytime_save_with_prior_content_reaches_the_real_vault_writer`:
  discussion before save, explicit continuation, baseline/current arrangement
  and unrelated content preservation; duplicate request retains exact bytes.
- `approved_daytime_event_is_recorded_under_daytime_without_changing_the_plan`
  and `conversational_confirmation_executes_selected_review_without_authorization_words_and_preserves_revision`:
  requested review stays unsaved; confirmation uses the retained proposal and
  rejects changed payload/date/identity/revision.
- `daily_plan_receipt_reconciles_after_restart_when_collaboration_history_save_fails`:
  file-backed business save survives failed conversation history persistence;
  readback reconciliation retains bytes and one operation receipt.
- `failed_native_startup_has_one_same_config_recovery_before_current_turn_and_never_replays_local_success`:
  unavailable optional native source permits supported local save while previous
  receipts remain and old effects are not replayed.
- Legacy session upgrade, memory direct/review writes, Tasks/lists lifecycle,
  mapped/local Habit endpoints, snapshot failures and automatic scope regressions.

## Acceptance distinction

PDCR-01's application/file-backed-adapter criteria are satisfied. Native model
and app interaction remain PDCR-11 work; live Dida remains PDCR-12, with its
explicit isolated-object prerequisite. No real personal Vault data, installed
app, external mutation, GitHub operation, main merge or release is claimed.
