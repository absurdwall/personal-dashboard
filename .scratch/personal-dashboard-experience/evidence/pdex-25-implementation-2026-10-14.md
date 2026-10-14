# PDEX-25 isolated implementation — 2026-10-14

## Lineage and scope

- Worker branch: `codex/pdex-25-restart`
- Worktree: `/private/tmp/pdex-restart-20261014.noindex/pdex-25`
- Exact base: `206c98aa11371b8b8f044871baac3de0f9ecde87` (PDEX-24-integrated checkpoint)
- Claim commit: `76652cd9e2765b2926b19496006581ada1d42c3b`
- Implementation commit: `768c101d5373bcf0efd7426ee1c6a430a84ff4cc`
- Only PDEX-25 application code, tests and local evidence were changed. The parent spec and other tickets were left intact. The branch is separate from integration; it has not been synced, merged, installed or pushed.

## Implementation

- Kept the weekly summary and Today Habit list as the default view. A deliberate Habit-name click opens one detail pane; Back returns to the same list and preserves its existing inline recent-history disclosure. The right-click edit entry and PDEX-24 definition editor remain available.
- Added detail metrics, bounded history pagination, an existing local completion control, inactive-Habit disclosure and restore action. Styling uses current Dashboard typography, palette, spacing and compact secondary controls; the Habits shell is unchanged.
- Added a strict catalog schema v2 for lifecycle events at the existing path. V1 remains strictly readable and rejects lifecycle fields; its first lifecycle write atomically upgrades that same file, keeps existing definition/goal-revision data, and verifies readback. Later definition edits preserve lifecycle data. This migration retains pending goal state and does not alter completion records. Older binaries reject v2 instead of silently dropping fields.
- Added a read-only bounded history seam (1–366 consecutive dates per request) that combines canonical local completion state with only the matching saved projection cells and provenance. The UI reads multiple pages and checks revision/binding identity before combining them; it does not expand the main 12-week snapshot.
- Historical calculations use lived dates, de-duplicate completion days, apply historical goals/lifecycle intervals, keep source freshness separate from canonical local facts, distinguish threshold-met from actual-time evidence, and keep an unmet current day open. Known results are marked confirmed or at-least; unsupported coverage stays unknown. A moved-later start date cannot hide retained earlier completions, though that makes lifetime coverage incomplete.

## Verification

- `node --test tests/frontend/habit-history-stats.test.ts tests/frontend/interface-language.test.ts` — 23 passed. Includes current-day open periods for daily-count and daily-time goals, earlier completions after moving the start date, historical weekly goals, missing coverage, actual-time evidence and deactivate/restore streak boundaries.
- `cargo test --manifest-path src-tauri/Cargo.toml --test habit_definition_workflow` — 18 passed. Exercises strict v1 validation, same-path v1-to-v2 lifecycle migration, pending goal and completion preservation, later v2 edits, deactivate/restore, a new application instance, canonical history readback and the 366-date limit, using synthetic temporary Vaults.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs PDEX25_SCREENSHOT_DIR=/private/tmp/pdex-restart-20261014.noindex/pdex-25/.scratch/personal-dashboard-experience/evidence/pdex-25-visual-2026-10-14 node --test tests/browser/habit-detail-lifecycle.mjs` — 2 passed against the built production Habits page with synthetic Tauri IPC. Covers default/list/detail/back behavior, inline disclosure retention, local check-in, shared edit form, lifecycle write/readback, inactive restore, multi-page history and the requested viewport matrix.
- `node --test tests/frontend/habit-details-webkit.test.ts` — 1 passed in macOS WKWebView using built production HTML/CSS. It checks rendered layout without starting production JavaScript or Tauri IPC.
- `npm run build` — passed. `git diff --check` — passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check` and standalone `rustfmt --check` reported broad formatting diffs in inherited source, including untouched collaboration modules and unchanged portions of edited Rust files. No repository-wide reformat was applied; compilation and Rust workflow tests pass.

## Visual evidence

Rendered screenshot captures are synthetic, not personal data:

- [1280×800](pdex-25-visual-2026-10-14/pdex-25-habits-1280x800.png) and [1280×720](pdex-25-visual-2026-10-14/pdex-25-habits-1280x720.png): the summary stays in the left column, the selected Habit detail on the right; action controls remain compact, and the status/coverage text and history remain subordinate to the Habit name.
- [830×758](pdex-25-visual-2026-10-14/pdex-25-habits-830x758.png): summary stacks above detail and the detail content remains reachable by page scroll, with no horizontal overflow.
- [680×560](pdex-25-visual-2026-10-14/pdex-25-habits-680x560.png) and [680×560 history scroll](pdex-25-visual-2026-10-14/pdex-25-habits-680x560-history.png): detail stats use two columns; history and lifecycle controls remain reachable by vertical scrolling, with no horizontal overflow.

The Playwright assertions check each exact viewport, no horizontal document overflow, visible summary/detail state and lifecycle button width below 100px. The static WKWebView check uses the same four viewport sizes and additionally verifies the detail/summary have rendered bounds and stats use two columns at 680px.

## Corrective review update

- Corrective commit: `12ab7e1e784f7abefeae39ac37d467f2eccaf265`, parent `4f6fe39034b3c57cf13a14d1b8a024513795d0f8`, worker branch remains `codex/pdex-25-restart`; claim/base and both earlier commits are preserved.
- Moved historical outcomes, period grouping, streak continuity, coverage precision and goal-segment construction from `frontend/habit-history-stats.ts` into `src-tauri/src/habit_history.rs`, reached through `TodayApplication::read_habit_history_statistics` and a read-only Tauri command. The frontend receives display metrics and dated goal segments; it still renders record rows from the existing bounded history read.
- Daily and weekly maxima are retained separately across frequency changes. Historical periods use their applicable goals; weekly lifecycle transitions and a midweek start interrupt streak continuity without erasing attained lived-date counts. A first local restore preserves positive pre-restore source facts while leaving unsupported dates unknown. If canonical completion read fails, projected negative/coverage-only markers do not establish failure for count or daily-time goals; independent positive threshold/completion evidence may remain a lower bound. Start-date edits do not retroactively hide a saved completion.
- The detail now renders its historical goal segments under the existing current/pending goal metadata. Typography, colors, compact action sizing and the surrounding Habits shell remain the production Dashboard styles. Where history spans both units, the highest-streak readout shows day and week maxima separately.

### Corrective validation

- `cargo test --test habit_definition_workflow` — 26 passed. Added application-path cases for canonical read errors, source completion before first restore, start-date moved later, long canonical history beyond the 12-week projection, same-week deactivate/restore, midweek weekly start, both daily-to-weekly and weekly-to-daily transitions, and returned historical goal segments. The older catalog/lifecycle/new-instance persistence cases remain in the same target.
- `cargo check --manifest-path src-tauri/Cargo.toml` — passed, including the Tauri command and Rust application boundary.
- `PATH=/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/node_modules/.bin:$PATH npm run build` — passed using the already present project TypeScript compiler; no dependency was installed.
- `node --test tests/frontend/habit-details-webkit.test.ts tests/frontend/interface-language.test.ts tests/frontend/habit-localized-names.test.ts tests/frontend/habit-completion.test.ts tests/frontend/historical-correction.test.ts` — 28 passed, including four-size macOS WKWebView HTML/CSS rendering.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs PDEX25_SCREENSHOT_DIR=.scratch/personal-dashboard-experience/evidence/pdex-25-correction-2026-10-14 node --test tests/browser/habit-detail-lifecycle.mjs` — 2 passed. The synthetic IPC browser check asserts that stats come from `read_habit_history_statistics`, the default Today list and inline disclosure survive, and current/pending/detail/history/lifecycle flows remain reachable.
- `rustfmt --edition 2021 --check src-tauri/src/habit_history.rs` and `git diff --check` — passed. A full frontend wildcard attempt was stopped after the isolated worktree exposed its missing `node_modules/.bin/tsc` path to unrelated harness tests; the worktree has no installed dependencies. Focused checks above used only the existing compiler and browser cache. No package was installed.

### Corrective visual evidence

The browser rendered and checked 1280×800, 1280×720, 830×758 and 680×560; all checks report no horizontal viewport overflow and a compact lifecycle action. Screenshots use synthetic Habit facts and the production Dashboard HTML/CSS:

- [1280×800](pdex-25-correction-2026-10-14/pdex-25-habits-1280x800.png) and [1280×720](pdex-25-correction-2026-10-14/pdex-25-habits-1280x720.png): existing summary/list remains beside the selected detail; the added goal history is subordinate and compact.
- [830×758](pdex-25-correction-2026-10-14/pdex-25-habits-830x758.png): the summary and detail stack within the existing shell; heading and actions are visible at the selected detail position.
- [680×560](pdex-25-correction-2026-10-14/pdex-25-habits-680x560.png) and [680×560 history](pdex-25-correction-2026-10-14/pdex-25-habits-680x560-history.png): statistics remain two columns and records remain reachable by vertical scrolling.

Packaged acceptance remains partial/open. Rust checks use synthetic temporary Vaults and persisted readback; browser checks use synthetic IPC; WKWebView checks render production HTML/CSS without app JavaScript or Tauri IPC. There was no installed-App acceptance and no real Vault write. PDEX-25 stays open/in-progress for independent review and later integration.

## Coverage limits and remaining acceptance

- Canonical local completion records are the only all-history local facts. The main source projection is the saved, bounded 12-week window. For source-owned evidence outside that projection, no older source fact is inferred. Missing coverage, missing canonical store, stale/error projection or conflicting evidence yields unknown or an at-least result rather than fabricated zero/failure/confirmed maximum.
- The bounded read API returns stable Habit identity, current/start/base goals, source goal history, local goal revisions, lifecycle events, earliest local lived-date boundary, canonical local completion changes, and in-range projection provenance. It is read-only; lifecycle mutation uses the existing local business/persistence path.
- Browser interaction tests use synthetic IPC. Rust persistence tests use synthetic temporary Vaults and new-instance readback. WKWebView verification covers production HTML/CSS only. No installed-App workflow or real Vault write/readback was performed, and no packaged-app acceptance is claimed; PDEX-25 remains in-progress/open for integration review and PDEX-26 acceptance.
