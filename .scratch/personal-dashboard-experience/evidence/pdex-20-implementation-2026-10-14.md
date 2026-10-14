# PDEX-20 implementation and verification — 2026-10-14

**Status:** code implementation committed and locally integrated; lifecycle remains `in-progress` pending independent review and packaged acceptance under PDEX-26.

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
- No source was copied from or merged with the rejected post-`918e7e0` implementation. The branch's later local merge into integration is recorded under Merged-tree verification. No remote Git operation, push, installation or normal Vault write was performed.

## Integration history on the ticket branch

- `86e0c4cf2855db6afadf647ef7f872e8a66a26ae` is a non-fast-forward merge with parents PDEX-20 tip `c235c0ecc0cdd029a61b92a9893c6003609d4b2d` and integration tip `ebd4354e2e179ab695450a4e1eaf196dc4730062`. It retains PDEX-22 merge `071202fb61781436b834bcbdeaac2bce88cbd69c` and the integrated PDEX-23 history. The `frontend/main.ts` conflict was resolved by retaining Calendar's shared Task creation flow and PDEX-20's folder target restriction, parent-aware quick creation, parent identity check on readback, and quick-parent cleanup.
- `89ab2ca6ae319e9feefcb76fd72da1625d3ba4be` is a second non-fast-forward merge with parents `86e0c4cf2855db6afadf647ef7f872e8a66a26ae` and latest integration tip `2a233c3e4a21d9eaff06b62f1770c86e7671d082`. Integration follow-ups `13c9bc2c45fdbd67f340d982a660a39d2e3120d9` and `2a233c3e4a21d9eaff06b62f1770c86e7671d082` remain reachable ancestors; their changes were not separately re-committed.
- The legacy `tests/browser/task-quick-create.mjs` fixture initially failed before a test flow began because PDEX-20's schema-3 Tasks view requires folder/tag/parent fields. The fixture was updated to schema 3 with empty folder/tag collections and null/empty Task properties in merge commit `86e0c4cf2855db6afadf647ef7f872e8a66a26ae`; the five selected Today-create regressions then passed.

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

## Latest integration verification — 2026-10-14

Commands run against the tree including merge `89ab2ca6ae319e9feefcb76fd72da1625d3ba4be`:

- `npm run build` — passed.
- `node --test tests/frontend/interface-language.test.ts` — 14/14 passed.
- `node --test tests/frontend/task-presentation.test.ts` — 23/23 passed.
- `PDEX_SCREENSHOT_DIR=/tmp/pdex20-visual PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs node --test tests/browser/task-list-details.mjs` — 23/23 passed.
- `node --test --test-name-pattern='Calendar|calendar|holiday|packaged task creation fields' tests/frontend/compact-calendar.test.ts tests/frontend/calendar-holidays.test.ts tests/frontend/task-surface.test.ts tests/frontend/docked-sidebars.test.ts tests/frontend/packaged-acceptance.test.ts` — 16/16 passed, including opening the shared Calendar Task modal with the selected date and verifying the updated localized create-copy assertion.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs node --test --test-name-pattern='Today compact entry|Today saved response loss|Today blank|historical Today compact create|Today explicit no-date' tests/browser/task-quick-create.mjs` — 5/5 passed after updating its view fixture to schema 3.
- `cargo test --manifest-path src-tauri/Cargo.toml --test task_workflow` — 36/36 passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --test calendar_holiday_preferences_workflow` — 2/2 passed; `cargo test --manifest-path src-tauri/Cargo.toml calendar_holiday -- --nocapture` — 1/1 app-local save/read test passed.
- `rustfmt --check --edition 2021 src-tauri/src/tasks.rs src-tauri/tests/task_workflow.rs` and `git diff --check` — passed.

## Merged-tree verification — 2026-10-14

The complete ticket branch `codex/pdex-20-restart` was merged without conflicts
into `codex/dashboard-experience-refinement-restart-20261014` as
`2c0fe5e21bc1fbe7b5f7667e35dd589ab7ccdd16` using `git merge --no-ff`.

- `npm run build` — passed.
- `node --test tests/frontend/interface-language.test.ts tests/frontend/task-presentation.test.ts` — **37/37 passed**.
- `PDEX_SCREENSHOT_DIR=/tmp/pdex20-visual PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/6bcb61ec6d5aea22/node_modules/playwright/index.mjs node --test tests/browser/task-list-details.mjs` — **23/23 passed**.
- `cargo test --manifest-path src-tauri/Cargo.toml --test task_workflow` — **36/36 passed**.
- Calendar frontend regression command from the preceding section — **16/16 passed**.
- `cargo test --manifest-path src-tauri/Cargo.toml --test calendar_holiday_preferences_workflow` — **2/2 passed**.
- `cargo test --manifest-path src-tauri/Cargo.toml calendar_holiday -- --nocapture` — **1/1 passed** for app-local save/read.
- `git diff --check` — passed after the merge.

## Remaining acceptance boundary

- No packaged macOS App, real WebKit/Tauri IPC, installed-app restart, or native save/readback acceptance was performed. PDEX-26 owns that combination gate.
- Browser behavior tests replace Tauri IPC with a fixture; actual persistence/readback and atomicity are covered by Rust workflow tests against temporary Vault files. Folder rename/move/archive management is verified at the Rust workflow boundary, while browser coverage directly exercises folder create/delete and the aggregate/add-target path.
- The complete frontend suite was not run; verification is the focused production-page Tasks suite, its presentation unit tests, the frontend build, and the Rust task workflow suite.
- All PDEX-20 acceptance boxes remain unchecked pending independent review, cross-ticket and packaged acceptance. The ticket branch remains unpushed.
