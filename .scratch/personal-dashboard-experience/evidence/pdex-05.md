# PDEX-05 implementation evidence

## Identity and scope

- Synthetic data only; no personal Vault or installed App changed.
- Worktree `/tmp/pdex-05`; branch `codex/pdex-05`; implementation base `768c68d`.
- Retained commits `7b242c9` (compact rows/selected details), `6880893` (history, deep links, in-flight draft protection), integration merge `4093ee1` includes latest `393d7ea`.
- No dependency, remote, main, App installation or parallel Task store changes. No Task backend contract changes.

## Result

Task list sidebar, scope navigation and state filters remain. Rows present a 22px accessible completion checkbox, Task name and saved schedule; full content and secondary operations are in one selected detail panel. Clicking the title or non-control row space selects the Task without completing it. Enter selects, Space on the checkbox completes/reopens, and closing detail returns focus to the title. Selected Task identity survives save, completion and its transition into folded history.

The panel uses the original shared name/content/list/date/time/execution-end editor, saved-readback and revision checks. Provenance, Collaboration entry, abandon/delete/restore, actual completion correction and Task change history remain accessible. History is still grouped and paged by thirty. Task links select the target's actual owning list before opening detail, including from Today. Selection changes and failed writes preserve drafts; refresh does not replay. List and clear-end controls now freeze with the rest of the submitted editor while a write is pending.

Details sit beside the list at wide sizes and below it under 1100px. The 830px interaction check measures the actual rendered panel below the list and within the window, edits through it, switches selections and returns focus. At 620px the existing scope/sidebar and detail use one content column.

## TDD and checks

Agreed seams: actual production-page Task DOM interactions with only external Tauri IPC replaced; existing public Task/Today/Calendar application workflows over real synthetic file storage. No new private-helper/source-string tests added. Existing source-extraction history harness received only the newly required UI-state bindings.

Observed red → green:

1. Production row initially exposed long content/secondary management controls. Compact rows + selected canonical detail fixed the observable layout.
2. Completing the selected Task initially hid its identity in folded history. Including the selected identity and opening its history retains the selection.
3. Abandoned Task's new disabled checkbox was re-enabled by generic busy-state restoration. Its inert checkbox no longer has mutation action attributes.
4. A Today Task deep link after selecting a different list scope initially could not reveal its detail. Selecting the target's actual list fixes the cross-page link.
5. List and execution-end-clear controls initially remained editable during a pending save. Both now follow the shared editor write lock.

Final checks after integration `393d7ea`:

- `npm run build` — passed.
- `npm run test:frontend` — 424 passed, 0 failed.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs node --test tests/browser/task-list-details.mjs` — 7 passed. Real Chrome mouse/keyboard on built production HTML/CSS/main.ts; only the external Tauri IPC boundary uses independent synthetic responses. Covers compact rendering, independent selection/completion/reopen, same identity/state/end preservation, date/time/end/content/list edits with one submit, narrow layout and focus return, protected selection drafts, failed save/read/retry identity, abandon/restore/delete, history pagination, Today deep link and pending-write locks.
- `CARGO_TARGET_DIR=/tmp/pdex-06/src-tauri/target CARGO_BUILD_JOBS=2 cargo test --manifest-path src-tauri/Cargo.toml --test task_workflow --test today_shared_tasks_workflow --test calendar_workflow` — 43 passed (Task 28, Today shared 7, Calendar 8). Real synthetic Vault storage/readback/restart; creation, interval edits/clear/omission, identity, completion/reopen/history, stale revisions, source binding/corruption and shared date placement. Isolated target; no canonical-target access.
- `git diff --check` — passed.

Visual inspection: synthetic production screenshots `/tmp/pdex-05-synthetic.noindex/tasks-wide.png` (1280×758) and `tasks-narrow.png` (830×758) inspected. Screenshot capture is optional via `PDEX_SCREENSHOT_DIR`; these are temporary supporting observations, not installed-App evidence.

## Acceptance boundary

Implementation is complete; lifecycle remains in-progress and acceptance partial. Browser IPC responses do not prove native packaged writes. Independent public Rust workflows prove real Task persistence but do not replace packaged interaction acceptance. PDEX-11 must verify the native checkbox/detail flow, restart and related Today/Calendar pages, existing Collaboration-return context, and user acceptance on the combined candidate. No packaged UI, installation or user acceptance is claimed here.
