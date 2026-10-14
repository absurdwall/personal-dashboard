# PDEX-24 integration sync and verification — 2026-10-14

**Status:** local ticket branch synced with the latest integration tip; PDEX-24 remains in progress pending independent final review and packaged acceptance under PDEX-26.

## Git lineage

- Clean reimplementation source checkpoint: `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- Initial exact integration base for PDEX-24: `8275615a3f3cad2a783d74561472c78c4bbeb493` on `codex/dashboard-experience-refinement-restart-20261014`.
- Ticket branch/worktree: `codex/pdex-24-restart` at `/private/tmp/pdex-restart-20261014.noindex/pdex-24`.
- First no-fast-forward sync: `1dee0c89dd26631fa28d6d035e307f223d2b6da5` merged integration tip `ebd4354e2e179ab695450a4e1eaf196dc4730062`.
- Second no-fast-forward sync: `a3667100f9a51ab6153277d02255b7279ddef16f` merged integration tip `2a233c3e4a21d9eaff06b62f1770c86e7671d082`.
- Post-sync verification merge commit: `a3667100f9a51ab6153277d02255b7279ddef16f`; latest merged integration identity: `2a233c3e4a21d9eaff06b62f1770c86e7671d082`. This documentation-only tracking record follows the verification commit on the same ticket branch.
- Both merges preserve commit history. PDEX-24 has not been merged back into integration, and no remote, `main`, installed App, or personal Vault was touched.

## Integration test-key follow-up

After the first sync, `tests/frontend/interface-language.test.ts` failed because its bilingual copy assertion still used PDEX-22's removed `calendar.taskCreateDefault` key. The same failure was reproduced against the exact first integration tip `ebd4354e2e179ab695450a4e1eaf196dc4730062`, establishing it was present on that integration state. Integration commit `13c9bc2c45fdbd67f340d982a660a39d2e3120d9` updates the assertion to `calendar.addTask`; integration tip `2a233c3e4a21d9eaff06b62f1770c86e7671d082` contains the correction and follow-up evidence. PDEX-24 did not modify that test independently.

## Post-sync verification

All commands below ran after the second merge, on `a3667100f9a51ab6153277d02255b7279ddef16f`:

- `cargo test --manifest-path src-tauri/Cargo.toml --test habit_definition_workflow --test historical_correction_workflow` — **23 passed** (15 + 8).
- `cargo check --manifest-path src-tauri/Cargo.toml` — passed.
- `node --test tests/frontend/habit-completion.test.ts tests/frontend/habit-canonical-navigation.test.ts tests/frontend/habit-localized-names.test.ts tests/frontend/interface-language.test.ts` — **30 passed**, including all of `interface-language.test.ts`.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/index.mjs node --test tests/browser/habit-definition-workflow.mjs` — **4 passed**.
- `npm run build` — passed.
- `git diff --check` — passed.

The Rust workflows use temporary Vault read/write/readback. The browser suite uses the existing local IPC fixture and real DOM. These focused checks do not constitute packaged-App acceptance. The ticket remains open for independent final review and PDEX-26 owns packaged acceptance.
