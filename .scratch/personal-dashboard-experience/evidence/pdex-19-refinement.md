# PDEX-19 implementation evidence — 2026-10-13

Owner: Codex implementer PDEX-19
Branch: `codex/pdex-19-refinement`
Integration: `codex/dashboard-experience-refinement-integration`
Implementation base: `1906b87` (integration ancestor verified before edits)
Authorized specification/ticket snapshot: `918e7e0d9c4b2c524c429bfd309482e328bc4c91`
Mode: local Git only; full history; no installation, remote access, main merge or dependencies.

## Delivered behavior

- Tasks selected detail uses one editable title, Content-first focus and 180px minimum Content height, compact list/schedule/priority/tag panels, and same-row Save/Cancel. Collapse retains draft; Cancel drops it.
- Start/end remain together, with explicit cross-date end labels and no persistent clear-end button without an end. Cancel time arrangement stages removal of start time/end while preserving the date; final Save commits it.
- One-line quick creation includes target-list and date selection. New Task modal accepts priority and existing multi-tags. The existing request-identity/recheck/retry creation path is retained, including metadata readback confirmation.
- Shared Task application now reads/writes priority and tag identities. Omitted update fields preserve metadata; `none` and `[]` clear it. Exact update receipts include property patch optionality; legacy callers remain compatible.
- Schema 3 accepts schemas 1/2 with defaults in memory; only a successful validated write upgrades the file. Damaged/unknown structures remain errors and are preserved.
- Shared tag definitions support trimmed-name creation/reuse, multiple associations, inline rename and deletion. Equality is case-sensitive after trimming. Rename retains IDs; deletion removes associations while retaining Tasks/history. Stable tag-operation receipts keep uncertain retries idempotent.
- View-only single-priority and single-tag filtering combine with list/lifecycle filters; priority ordering retains stable date ties. Default ordering is unchanged. Historical completed/abandoned/deleted discovery remains in the existing paths.
- Row contextmenu and details More share schedule/move/complete/reopen/abandon/delete/restore/discuss controls. Parent actions remain for PDEX-20; no fake parent controls are added.
- Retained Task drafts preserve the revision from their initial edit, so a refresh with an external revision cannot silently authorize overwriting it. Conflict leaves the draft and reports failure.

## Reuse and bounded visual scope

`frontend/main.ts` keeps `taskEditor(task, writable, view, surface, expanded, refined)`.
The sixth parameter defaults to Tasks-only refinement. Today/Calendar legacy inline
markup remains until their own tickets explicitly opt in. `.task-refined-editor`
contains the new local styling. `readTaskDraft`, `updateTask`, `taskSurfaceView`,
`stashTaskSurfaceDraft` and `renderTaskSurface` remain the shared hooks. Property
controls expose `data-task-priority`, `data-task-tags`, `data-task-tag-id`, and
`data-task-schedule-panel`; cancel-time is `data-task-cancel-time`.

Rust literal callers/tests received mechanical compatibility defaults only.
Global navigation, fonts, colors and compact Task rows retain baseline rules.

## Red → green and checks

Confirmed seams: real Task/Today application with synthetic Vault and fresh
application readback; actual WebKit DOM/controller from compiled production
HTML/JS/CSS. No mock/object mutation is claimed as persistence evidence.

- Priority application tracer failed because serialized priority was absent, then passed creation, legacy title-only preservation, explicit clearing and fresh readback.
- Tag application tracer failed because the tag API did not exist, then passed stable identity reuse, rename, deletion, retained Task identity and exact retry.
- Legacy migration tracer failed on schema 2, then passed schema 3 in-memory defaults, no read-time overwrite and corrupted-priority refusal.
- Frontend property projection failed on missing capability, then passed priority/tag combinations and stable order.
- Save-confirmation tracer failed because stale properties were accepted as saved, then passed property-aware identity/readback confirmation.
- Actual WebKit DOM tracer failed first on Content focus, then on create-priority availability and retained-draft revision; the final production DOM passes at 1280×560 and 680×560.
- Additional actual DOM checks: unique editable title, larger Content, same footer, Cancel discard, compact schedule/no implicit write, date-preserving cancel-time, hidden clear-end without interval, shared rightclick/More, quick target list and viewport fit. A deliberately rejecting IPC boundary checks draft retention/false success; real conflict/storage behavior is independently covered by application tests.

Commands:

```sh
npm run build
node --test tests/frontend/task-refinement.test.ts tests/frontend/task-presentation.test.ts tests/frontend/task-history-render.test.ts tests/frontend/task-history-editing.test.ts
node scripts/acceptance/task-refinement-dom.mjs
CARGO_TARGET_DIR=<canonical existing target> cargo test --manifest-path src-tauri/Cargo.toml --test task_workflow --test task_adapter_workflow --test today_shared_tasks_workflow --test calendar_workflow --test collaboration_task_operations
```

Results: build passes; 33 focused frontend tests pass; actual WebKit passes both
widths; Rust Task 35, adapter 14, Today 8, Calendar 8, Collaboration Task 105 pass.
The existing lived-day source-slice suite retains five unrelated timeline fixture
failures (`HTMLAnchorElement`, document event harness, empty WebKit stack anchor);
its three Task note-refresh/editor preservation cases pass after scoped gating.

## Acceptance distinction

Implementation and focused application/DOM verification are complete. Packaged
native pointer checks, screenshots against the fixed installed baseline, wider
integration/review and the user's required preserved-surface acceptance belong
to PDEX-26 and remain pending. This record does not close PDEX-19 or the spec and
does not claim installed-build acceptance. No normal App/Vault/profile was changed.

## Local Git lineage and post-integration verification

- Implementation commit: `cfd5a77` (`Implement PDEX-19 Task editor priority tags and action menus`).
- Worker merge `c1ae182` retained integration `c3de40d` and both appended CSS blocks from PDEX-19/PDEX-23. The only conflict was append-only; both scoped intents were preserved.
- Worker merge `741c54f` retained latest integration `71471a3` (documentation/native acceptance lineage only).
- After the source merge: `npm run build`, the 33 focused frontend tests and production WebKit checks at both widths pass again. The later merge changes evidence/ticket documents only.
- No squash, amend or rebase was used. Branch commits remain available for the integration merger; no worker worktree cleanup was attempted by the implementer.
