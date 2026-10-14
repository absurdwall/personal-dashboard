# PDEX-19 reimplementation evidence — 2026-10-13

## Source and history

- Working branch: `codex/pdex-19-refinement-reimplementation`.
- Implementation base: `b7dcd71b50b42de4a706d460d635f99bf059770d`.
- Implementation commits, in order:
  - `2b321c881e5db8c2161ca86f2fb2dcc9a1e5e528` — Task schema, persistence,
    property APIs, compatibility behavior, workflow tests, and storage docs.
  - `8ad5ba279911a8cecd23ac1f01a5b8b667824e04` — compact Task UI, property
    controls, filters/sorting/context actions, localization, and UI tests.
- The feature branch was integrated into
  `codex/dashboard-experience-refinement-reimplementation` with `--no-ff` by
  merge commit `5603d7ced3fa7325f1ea7c2bc83f9c475de938eb`. Its parents are
  `b7dcd71b50b42de4a706d460d635f99bf059770d` and
  `60fc6d93d2a1cc556e1b259f6bef1e4c5ddfcdf2`; the complete feature commit set
  above is preserved in order.
- The rejected implementation branch was not used. Local Git only; no
  package installation, remote operation, main merge, deployment, or packaged
  app installation.

## Implemented behavior

- Schema 3 stores optional priority and Vault-wide stable tags while schema 1
  and 2 records read with empty property defaults. Existing create/update
  commands remain available. New property commands preserve omitted update
  fields, clear priority with explicit `null`, and replace tags only when the
  tag array is provided.
- Priority and tags are included in task change history. Tag rename preserves
  its stable identity; deletion unlinks tasks without deleting them. Priority
  sort is stable within a tier, and priority/tag filters compose.
- Tasks retains the compact list, shared typography/color tokens and
  navigation, with one editable title, focused Content editor, compact
  expandable properties/schedule, same-row Save/Cancel, and one-line quick
  creation. Context actions stay available from the row and More menu. Clearing
  a timed schedule retains its date; long tag labels stay scrollable without
  pushing Save below the normal viewport.
- At 830px and 680px, the filter row wraps within the Tasks list column. The
  production-DOM checks confirmed that every filter and selected detail remains
  inside the viewport. Visual captures were inspected at
  `/tmp/pdex19-browser/tasks-narrow.png` and `/tmp/pdex19-browser/tasks-680.png`;
  both retain the existing compact typography and row density.
- Today and Calendar entry points were not migrated as part of this ticket.

## Observed checks

- `npm run build` — passed, using the already available
  `/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/node_modules/.bin`
  on `PATH`; no dependency was installed.
- `node --test tests/frontend/task-presentation.test.ts` — 23 passed, 0 failed.
- `PLAYWRIGHT_MODULE_PATH=... node --test tests/browser/task-list-details.mjs`
  — 14 passed, 0 failed. This exercises the production frontend DOM through a
  synthetic Tauri IPC fixture, including 830px/680px bounds, Save/readback,
  long tag labels, tag lifecycle, combined filters, context actions, and
  clearing time while preserving date.
- `PLAYWRIGHT_MODULE_PATH=... node --test tests/browser/task-quick-create.mjs`
  — 24 passed, 0 failed. This covers create drafts, pending/failed writes,
  readback and guarded retry without duplicate creation.
- `cargo test --manifest-path src-tauri/Cargo.toml --test task_workflow` — 33
  passed, 0 failed. These workflow tests use the Task application and the
  synthetic file-backed Task store; they verify persisted property round-trip,
  partial update semantics, explicit clears, tag identity, and unlink-only
  deletion.
- `rustfmt --check --edition 2021 src-tauri/src/tasks.rs
  src-tauri/tests/task_workflow.rs` — passed.
- `git diff --check` — passed on the final ticket/evidence diff before its
  commit.
- The same failed-quick-save browser test and fixture were run against clean
  `b7dcd71` and the repaired implementation; both passed. This check caught
  and fixed a compatibility regression: a plain create now keeps using the
  existing `create_task` command, while a create with selected properties uses
  the additive property command.

`cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check` exits nonzero
because it reports formatting differences across numerous untouched Rust
modules and tests in the base repository. The scoped Task source and workflow
test format check above passes; no repository-wide formatting was applied.

## Integration checkout verification — 2026-10-13

Reran focused checks on integration merge commit
`5603d7ced3fa7325f1ea7c2bc83f9c475de938eb`:

- `npm run build` — passed.
- `node --test tests/frontend/task-presentation.test.ts` — 23 passed, 0 failed.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs node --test tests/browser/task-list-details.mjs tests/browser/task-quick-create.mjs` — 38 passed, 0 failed, using the existing Playwright module and synthetic Tauri IPC fixtures.
- `cargo test --manifest-path src-tauri/Cargo.toml --test task_workflow` — 33 passed, 0 failed.
- `rustfmt --check --edition 2021 src-tauri/src/tasks.rs src-tauri/tests/task_workflow.rs` — passed.

## Acceptance boundary

The browser checks use synthetic IPC and do not establish packaged-app
acceptance. File-backed workflow tests are synthetic local persistence tests,
not a normal app installation or user-vault test. Packaged save/readback and
human acceptance remain PDEX-26; this ticket remains claimed and is not marked
resolved.
