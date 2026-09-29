# 01: Move Habit snapshot and recovery storage under life/

**What to build:** Move Dashboard's canonical Habit snapshot and atomic-write recovery path under `life/.personal-dashboard/`, update the Life Daily Loop producer and current path documentation/tests, then migrate and package only after isolated acceptance.

**Blocked by:** None

**Status:** resolved

Type: task

- [x] Preserve the existing 4.0.3 working source state without changing its original worktree; record the packaged source and candidate hashes.
- [x] Read the canonical Habit snapshot under `life/`; retain read-only fallback to the former root snapshot only when the canonical file is missing.
- [x] Move all Dashboard recovery hard links to `life/.personal-dashboard/recovery/today/`; keep recovery manual and never replay it automatically.
- [x] Update the Life Daily Loop producer, dry-run fixture, current documentation, package acceptance script, and Rust tests.
- [x] Verify snapshot compatibility, task/diary writes, and recovery behavior on isolated fixtures.
- [x] Back up the installed app and exact real data, stop the app, migrate file bytes, install 4.0.4, and perform read-only real-Vault acceptance.
- [x] Remove the two root data directories only after matching checksums and packaged acceptance; preserve local rollback material outside Git.

## Comments

## Answer

- The original installed 4.0.3 bundle had no source receipt. The review branch is based on verified `origin/main` commit `21628a6` and contains only the Vault-path migration; an earlier local candidate snapshot commit with unrelated collaboration removals was excluded from this branch.
- Built and installed Personal Dashboard 4.0.4 from the clean review branch. Executable SHA-256: `57a2b2b843ccc74813d84916739de9dee44759231426c6c75657aa6a513b53a7`. Candidate `.app.zip` SHA-256: `d293e563c001e3463f98287360951db3c674a54dcd3d4354074c2f4fb24f7e1b`.
- The real Habit snapshot is byte-identical at `life/.personal-dashboard/derived/habits-v1.json` (SHA-256 `efeeddc8c8d9064a11fe0858bbf27c9186e664694c97aeef05868da0320a6754`). All 13 recovery snapshots remain byte-identical under `life/.personal-dashboard/recovery/today/`. Both old root directories are absent. Rollback bundles and old data copies remain in the local Application Support backup; none are in Git.
- Isolated packaged acceptance passed for Habit snapshot reads, local Habit writes across relaunch, task create/edit/complete/reopen/reschedule, a Daily Record note write, and a hard-link recovery snapshot under the new path. The fixture also confirmed neither legacy root directory was recreated. All synthetic writes stayed under `/tmp`.
- The complete frontend suite passed (156 tests), the full Rust suite passed with the integration fixture clock, `cargo fmt --check`, macOS bundle build, shell syntax/diff checks, and the Life Daily Loop dry-run passed.
- Read-only acceptance of the installed app confirmed the selected Tortilla Flat Vault and Tasks loaded, the current Daily Record was still absent, and no synthetic entry was written to the real Vault. The migrated Habit snapshot remains unchanged and was not regenerated.
- The Life Daily Loop producer change is commit `9356cf0` in the Tortilla Flat root repository. That local `main` is 41 commits ahead of its remote, so it was not pushed with unrelated history. No Portfolio Registry or unrelated dirty file was changed.

### Earlier migration candidate (separate from the clean-review candidate above)

- The first 4.0.4 migration candidate was captured from the existing 4.0.3 working source without changing its original worktree. Its recorded source provenance was base `aaf1981`, tracked patch SHA-256 `f75928927dd6c9a1b9346e662f0972aedfe91229336b0bdcf623a8554685a760`, and local `Entitlements.plist` SHA-256 `289696af9834a7ee41aca4c1cd3aa95fc38f9ae2e83655b1d4b86c1ccab771ee`; source snapshot `c25abb9`, migration implementation `c81a861`.
- That candidate record lists executable SHA-256 `3528def9c439dbc95bcfa711dcde1401a9b5b60f9370cd1b9ad6bf6a0ab33981` and candidate `.app.zip` SHA-256 `9d6b0e7c7fc9a79904826260b3a95106e36a3a0565ecd2c6a09723e78c72622e`. A later read-only check found the same SHA-256 for the installed executable. Matching the executable hash identifies those executable bytes; it does not establish that the complete signed app bundles, signatures, or packages were identical. The `.app.zip` hash identifies the recorded candidate archive only.
- The first migration acceptance record covered 13 recovery snapshots (18,949 logical bytes) and legacy-snapshot fallback behavior. Its candidate hashes and acceptance evidence are historical and distinct from the clean-review candidate hashes and acceptance summary above.
