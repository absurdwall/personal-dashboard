# Independent review repairs — 2026-10-11

Review range: `8960c80...c63c805`. Worker: `codex/pdex-review-repairs`, based on `c63c805`. This implementer repaired both independent findings sequentially at the already approved public workflow/rendered UI seams. The local tracker remains authoritative; parent spec stays open and PDEX-09/PDEX-11 acceptance remains blocked. Historical frozen candidate/source/binary evidence is preserved. These repairs do not constitute new packaged, IME, authenticated runtime or release acceptance.

## Manual Task update retry identity

Finding: a renamed interval Task updated with omitted `executionEnd` accepted a repeat change ID carrying an explicit object with the same resulting end; a point Task similarly accepted omission replaced with explicit null. This violated the original-payload and tri-state contracts in `docs/tasks-v1.md`.

Red: public `TaskApplication` regression failed with “omitted cannot retry as object”; `/tmp/pdex-review-manual-red.log`. New changed manual updates retain a `manualUpdate` payload with normalized original fields, the original list patch and omitted/null/object end patch. Retry compares that retained payload before deriving a desired end from current Task state. Genuine retries return current saved state without replay after intervening end/time edits; conflicting reuse fails without writes. New retained daily-flow payload IDs cannot fall through to manual-update legacy matching. Legacy history without retained operations keeps its prior result-based compatibility; retries recheck the selected Vault before returning.

Public workflow coverage includes all distinct tri-state substitutions, a point Task's omitted→null case, genuine retries after end changes and a later clear/start change, malformed retained metadata, legacy parsing/fallback, persisted camelCase `listId`, no-write collision with a retained daily-flow operation ID, and a selected-Vault change immediately after receipt load. Focused Task workflow suites passed before broad verification; final broad results below cover all added cases.

Commits: `4379593` behavior/contract/regressions and `361d315` frontend history payload type alignment. The type-only follow-up adds `manualUpdate` and optional reschedule end fields to the existing union; its frontend build passed.

## Evening interface-language metadata

Red: real production WebKit UI, with `renderInterfaceLanguage` switching the catalog, rendered “Review today” instead of “Review 2026-09-20”; `/tmp/pdex-review-language-red.log`. The selected past date still governed the actual opened session, so the visible label was misleading.

The entry now uses the shared `setInterfaceCopy`/`setInterfaceError` through its existing controller callbacks. Date variables, pending/ready/preserved status keys and the raw diagnostic survive language refresh; the fixed error catalog interpolates the retained diagnostic. Source-owned drafts and diagnostic paths remain untouched. Regression exercises both languages during an actual pending entry, successful preparation, existing draft continuation and draft-save failure; opened target remains 2026-09-20 and no submit command occurs. All 6 Evening rendered tests passed. Commit: `e7823ec`.

## Native-suite fixture cleanup diagnosis

The first broad serialized native run (`/tmp/pdex-review-full-native.log`) failed one existing library test after all intended assertions passed: `history_failure_after_canonical_save_keeps_receipt_and_returns_tool_reply`, `collaboration_history_tests.rs:551`, `fs::remove_dir_all(root)` returned DirectoryNotEmpty (OS 66). Library result: 101 passed, 1 failed, 6 existing ignores; Cargo stopped before integration suites. This failed run is retained, not reported as a full pass.

The exact filtered test reran once and passed (`/tmp/pdex-review-history-cleanup-rerun.log`). Base comparison confirmed the fixture, `await_end` and worker lifecycle were unchanged from `c63c805`. `await_end` observes terminal run state; that state precedes removal of the Vault from `active_vault_workers`, so cleanup could delete the worker's synthetic persistence directory during a final replacement. A synchronized focused run concretely observed `active before=true` after business assertions, before worker teardown; before/after history revision was `4a74a25d470d1c6a` and canonical Task bytes remained identical (`/tmp/pdex-review-history-synchronized.log`).

Commit `4a0c272` adds only a bounded wait for the actual worker ownership to end before removing this fixture's root. It retains the original injected history-save failure and every receipt/source assertion, additionally asserting canonical bytes unchanged through teardown. No production lifecycle behavior changed. Final library and remaining integration suites were then run serially with `--no-fail-fast --test-threads=1` so every remaining suite is observed.

## Final verification

Source frozen for behavior checks: `4a0c272dea10f01e2ef99b16c25e1b341837d02b` (later evidence/integration merges are documentation only). Integration `ba62564` was merged without squashing as `1ff2387f2d1a718aca0151ca5119cb14961cdadf`; its product tree is identical to the frozen source.

- Frontend build passed; full frontend suite: **432 passed, 0 failed**, log `/tmp/pdex-review-full-frontend.log`.
- Type-only frontend build passed, log `/tmp/pdex-review-type-build.log`.
- Final serialized native command exited **0**: **523 passed, 0 failed, 6 existing ignored**, across 26 result sections including zero doc-tests. Log `/tmp/pdex-review-full-native-synchronized.log`.
- Root-owned browser suite at the same frozen source: **23 passed, 0 failed**, log `/tmp/pdex-review-repair-browser.log`.
- Whitespace check passed. No new dependencies, remote operations, App installation, OS input changes or real-data writes. Canonical debug Cargo lease was exclusive for these checks and released after Cargo exited successfully; no package build or native UI acceptance was attempted.

The adjacent log manifest records local artifact paths and SHA-256 digests. Raw logs remain outside Git; the manifest contains no user data.

## Evening guard-copy follow-up

Independent follow-up range `c63c805...720a28f` found one P3: the three Evening protection checks rendered `today.reviewOpenFailed` without its required error variable, then the controller wrapped the resulting text again. The actual production guard regression failed with `Could not open the review. Your draft is retained; please retry. Error: 未能进入复盘。已有草稿保留，请重试。{error}` (`/tmp/pdex-review-evening-guard-red.log`).

Source `ff913083940ad27314373dc20ea376cb9c79e7c0` replaces these three throws with a typed guard carrying a catalog key. The controller retains guard copy through the existing shared copy callback; arbitrary backend errors still use the retained diagnostic setter. Busy and Vault-change causes each have concrete zh/en copy. Protection conditions, source dates, draft saving and navigation remain unchanged.

Actual production WebKit regression exercises busy entry, a Vault revision change after draft flush and a Vault revision change after preparation, with zh → en → zh refresh. Each shows the localized cause and one failure wrapper, without a placeholder or `Error:` prefix. The existing CJK draft/path and original session date remain intact. Busy entry performs no Collaboration call; the post-flush guard performs no review preparation; the post-preparation guard does not adopt or refresh the returned session. All paths perform no submit. The single regression passed (`/tmp/pdex-review-evening-guard-green.log`); build exited 0 (`/tmp/pdex-review-evening-guard-build.log`); the focused Evening/interface-language command exited 0 with **21 passed, 0 failed** (`/tmp/pdex-review-evening-guard-focused.log`).

This follow-up changes frontend copy/controller code only. The 523 native passes above remain an unchanged Rust-source checkpoint. The earlier 432 frontend / 23 browser totals remain historical results before this follow-up, not new full-suite claims. No Cargo, full-suite repeat, package build or native acceptance was attempted. Integration `720a28ffe7e5b4c589c5439ceaea9b7b245f26b5` was merged before edits; PDEX-09/PDEX-11 acceptance and historical packaged evidence keep their prior status.
