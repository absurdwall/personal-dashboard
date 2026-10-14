# PDEX-20 implementation and verification — 2026-10-14

**Status:** code implementation committed; lifecycle remains `in-progress` pending local integration and packaged acceptance under PDEX-26.

## Git lineage

- Requested clean restart baseline: `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- Integration branch at claim: `codex/dashboard-experience-refinement-restart-20261014`.
- Exact ticket start: `e1b28504e62d28ecbb05c5fa3f499204d7abefe1`.
- Ticket branch: `codex/pdex-20-restart`.
- Ticket worktree: `/private/tmp/pdex-restart-20261014.noindex/pdex-20`.
- Implementation history, kept unsquashed:
  - `d7ecfda0c1b4590405dbb29da52a8bd7fc9abe0c` — schema 3 parent/list-folder persistence, validation, migration and workflow tests; update `docs/tasks-v1.md`.
  - `c0b7aa969196208acc6f73d37d15c8ee09c06c4b` — compact nested Task and folder navigation/detail UI, quick-add context and focused browser/unit coverage.
  - `f1f9c5c7ee6067c67bbe12efb6fbc0d070402ec0` — update the lifecycle history document's current schema note.
- No source was copied from or merged with the rejected post-`918e7e0` implementation. No remote Git operation, push, installation or integration merge was performed.

## Implemented behavior

- Tasks persist an optional parent ID in the same Task document/identity; parent and child properties and lifecycle remain independent. Parent assignment rejects self-links, cycles, missing/inactive targets and invalid Vault-local references atomically. Deleted parent tombstones remain interpretable, and restoring an old parent does not overwrite a child’s newer relation.
- Schema 3 persists folders and optional list membership. Schema 1/2 read with empty/null defaults and upgrade on the next successful write. Inbox cannot join a folder; archive/restore preserves membership; deleting a folder ungroups lists without deleting tasks.
- The Tasks rail retains a one-level folder structure. Folder expansion is separate from folder selection; the selected folder aggregates tasks by original list without copies. Empty folders require creating a list, and quick-add uses a concrete list target. Direct child controls live in the existing detail pane and More shortcut; quick-add children get a distinct Task ID and independent schedule/list.
- Existing typography, toolbar, row density, detail placement, and compact controls are retained. The production-page browser harness captured wide and 830px layout screenshots in `/tmp/pdex20-visual` for this run; those generated files are not checked into the repository.

## Verification

- `npm run build` — passed.
- `node --test tests/frontend/task-presentation.test.ts` — 23/23 passed, including folder-scope identity and stable combined priority/tag view filtering.
- `PDEX_SCREENSHOT_DIR=/tmp/pdex20-visual PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs node --test tests/browser/task-list-details.mjs` — 23/23 passed against the built production page. Covers compact rows/one title/Content focus, parent association and detach, adding a separately scheduled child, ending an uncertain child attempt before a normal quick-add, empty folder/list creation and explicit target, folder aggregation/deletion without Task copies, PDEX-19 priority/tag readback and combined view-only filtering, More/right-click action parity including the parent shortcut, save/retry/lifecycle controls, and narrow detail placement at 830px.
- `cargo test --manifest-path src-tauri/Cargo.toml --test task_workflow` — 36/36 passed using temporary Vault fixtures and the real Rust task workflow. Includes schema 2→3 read/write preservation of PDEX-19 priority/tags, cycle/invalid-parent atomic rejection, Task identity/lifecycle readback, folder create/rename/move/archive/restore/delete and membership retention.
- `rustfmt --check --edition 2021 src-tauri/src/tasks.rs src-tauri/tests/task_workflow.rs` — passed.
- `git diff --check` — passed before implementation commits.
- TDD regression for ending an unconfirmed subtask attempt failed first because the next quick-add retained its parent context; after clearing only that matching context in the end-attempt path, the focused test passed and the full 23-case browser file passed.

## Remaining acceptance boundary

- No packaged macOS App, real WebKit/Tauri IPC, installed-app restart, or native save/readback acceptance was performed. PDEX-26 owns that combination gate.
- Browser behavior tests replace Tauri IPC with a fixture; actual persistence/readback and atomicity are covered by Rust workflow tests against temporary Vault files. Folder rename/move/archive management is verified at the Rust workflow boundary, while browser coverage directly exercises folder create/delete and the aggregate/add-target path.
- The complete frontend suite was not run; verification is the focused production-page Tasks suite, its presentation unit tests, the frontend build, and the Rust task workflow suite.
- All PDEX-20 acceptance boxes remain unchecked pending cross-ticket and packaged acceptance. The branch is intentionally unmerged and unpushed.
