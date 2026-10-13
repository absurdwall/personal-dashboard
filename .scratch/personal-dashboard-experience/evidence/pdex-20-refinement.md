# PDEX-20 implementation evidence — 2026-10-13

Owner: Codex implementer PDEX-20
Branch: `codex/pdex-20-refinement`
Initial integration ancestor: `b96b77d` (verified before edits)
Authorized prerequisites: `dc5b09c` / specification snapshot `918e7e0`
Local Git only. No dependencies, main merge, installation or remote access.

## Application/controller increment (UI still in progress)

Schema 3 is extended compatibly; no competing version bump. Ordinary Task
parent identity has omission-preserving/null-clearing updates, exact operation
receipts and retained before/after relation history. Back-end validation rejects
self/cycles/missing/foreign parents before persistence; deleted parent identities
can remain for historical explanation, but cannot be newly associated.
Deleting/restoring the parent does not mutate descendants; reparenting or detach
performed while it is deleted is retained after restoration. State/date/list and
PDEX-19 priority/tags/end remain independent.

One-level folders have stable identities, CRUD receipts and list move receipts.
Inbox cannot be grouped. Deleting a folder only unassigns its lists (including
archived lists); restoring a list keeps an available grouping or remains top
level after the folder was removed. Reads validate graph/folder structure before
any writes and old documents default to no relationships/folders.

Confirmed real application seam uses synthetic Vaults and new application
instances/readback. Parent and folder tracers each ran red on the missing
contracts, then green. Deleted-parent swap/detach/restore, legacy field update,
self/missing/cross-Vault refusal and exact retries pass. Full `task_workflow`
passes 38 tests. Public controller projection and parent-aware confirmation
tracers ran red, then both pass.

Production WebKit UI tracer `scripts/acceptance/task-organization-dom.mjs` is
currently red on the absent hierarchy/relationship/grouping UI; UI work continues.
This increment does not claim full implementation or acceptance.

## Separate PDEX-19 diagnosis interruption

PDEX-20 dirty work was preserved in this worktree while the original PDEX-19
branch received the native Save-chain repair `7e96b08`. That repair will be
merged here before final UI checks; it is not mixed into this increment.


## Completed implementation increment

- Application commit: `4537ee2`; retained PDEX-19 native-save repair by merge
  `89ab14f` (original repair `7e96b08`). The later PDEX-19 More-control repair is
  retained separately before final integration.
- Ordinary parent controls and direct-child section are in the shared refined
  `taskEditor`/`appendTaskRelations`. Menus delegate to those same controls.
  Child creation keeps the parent's default active list but gets only the entry's
  date context; date/time/end/content/priority/tags are independent.
- Default hierarchy is iterative with no graph-depth limit and visually bounded
  indentation. Priority sort retains the previously sorted date/stable order.
  Explicitly opening a child clears only incompatible view filters so the same
  identity is actually revealed across lists. This filter tracer ran red before
  that bounded correction.
- Folder arrow and name actions are separate. Name aggregation uses original
  list groups and existing lifecycle/history paging. Quick-add has explicit
  active in-folder targets, and empty folders cannot silently target Inbox.
  Folder CRUD and list moves have real commands and result confirmation; Task
  drafts are rebased only from their exact previous revision after these
  unrelated organization writes.
- Strict repeated list creation now also compares its folder identity. A public
  application test ran red when a different group could falsely confirm the
  same list; green after this atomic identity check. Failure, stale/foreign
  binding and missing-folder tests retain the full previous read result.

## Reproducible checks and results

Run from this worktree with existing dependencies; no dependency installation.
The real application tests use synthetic Vaults/FileTaskStore, reopen with a new
application instance, and do not replace persistence with a browser mock.

```sh
npm run build
node --test tests/frontend/task-presentation.test.ts tests/frontend/task-refinement.test.ts tests/frontend/task-history-editing.test.ts tests/frontend/task-history-render.test.ts tests/frontend/task-organization.test.ts
CARGO_TARGET_DIR=/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/src-tauri/target cargo test --manifest-path src-tauri/Cargo.toml --test task_workflow --test today_shared_tasks_workflow --test calendar_workflow --test task_adapter_workflow --test collaboration_task_operations
node scripts/acceptance/task-organization-dom.mjs
node scripts/acceptance/task-tag-save-dom.mjs
node scripts/acceptance/task-refinement-dom.mjs
```

Build passes. Behavioral frontend: 36/36. Application: Task 40/40, Today 8/8,
Calendar 8/8, adapter 14/14, Collaboration Task 105/105.
Organization production WebKit tracer began red on absent hierarchy then passes
at 1280 and 680: hierarchy/direct children, candidate exclusion, Cancel restore,
new-child independence, arrow/name separation, grouped originals, archived
exclusion, explicit target/empty folder, folder create/rename/move/delete control
chain and parent clear through actual Save. It emits exactly
`manage_task_folder`, `manage_task_folder`, `move_task_list_to_folder`,
`manage_task_folder`, `update_task`. Browser IPC is an explicit synthetic boundary;
these checks prove DOM wiring, not disk persistence. Both retained Task WebKit
suites pass at both widths, including stale-draft refusal and five cancel/tag/end
submission cases. Native operation/restart acceptance remains a separate gate.

An additional legacy `task-surface.test.ts` source-regex assertion expects an
obsolete CSS column string and fails identically on PDEX-19 `162067f` (10/11
pass). PDEX-20 retains that baseline failure; actual Task geometry/control checks
remain authoritative at the agreed DOM seam. No unrelated CSS or fixture rewrite
was made to hide it.

## Pending acceptance

Independent standards/spec review, combined packaged synthetic-Vault controls,
restart readback and same-window baseline comparisons remain with integration
PDEX-26. No normal installation, native completion or user acceptance is claimed.
The issue Lifecycle remains in progress and all acceptance checkboxes stay open.


## Final local integration lineage and rerun

Implementation UI/tests/docs: `3540cfa`. Original PDEX-19 branch merged at
`387c92f`, retaining `162067f` plus PDEX-20 parent applicability/actions.
Integration `490eddb` merged at `127d920`; the only remaining conflict was
append-only Task/Calendar CSS and both scoped additions were retained.
The latest `92b9652` integration receipt is also an ancestor (documentation only).

Post-source-merge checks passed: build, 70 behavioral frontend tests including
Calendar, all three production WebKit scripts at 1280/680 and real application
Task 40, Today 8, Calendar 9, adapter 14, Collaboration Task 105. The geometry
tracer also confirms nested rows remain within their compact list bounds without
horizontal content clipping. [Machine-readable result](pdex-20-focused-checks-2026-10-13.json)
binds these results to the source commit and full lineage. The final documentation
merge changes no tested product source. Worktree is clean after evidence commit;
independent review/native acceptance remain pending.
