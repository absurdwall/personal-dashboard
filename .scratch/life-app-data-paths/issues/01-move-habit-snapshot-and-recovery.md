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

- The installed 4.0.3 bundle has no embedded source commit/build receipt. The candidate source was captured from the existing dirty 4.0.3 worktree without changing that worktree: base `aaf1981`, tracked patch SHA-256 `f75928927dd6c9a1b9346e662f0972aedfe91229336b0bdcf623a8554685a760`, and local `Entitlements.plist` SHA-256 `289696af9834a7ee41aca4c1cd3aa95fc38f9ae2e83655b1d4b86c1ccab771ee`. The snapshot commit is `c25abb9`; implementation commit is `c81a861`.
- Built and installed Personal Dashboard 4.0.4. Executable SHA-256: `3528def9c439dbc95bcfa711dcde1401a9b5b60f9370cd1b9ad6bf6a0ab33981`. Candidate `.app.zip` SHA-256: `9d6b0e7c7fc9a79904826260b3a95106e36a3a0565ecd2c6a09723e78c72622e`.
- The real Habit snapshot moved byte-for-byte to `life/.personal-dashboard/derived/habits-v1.json` (SHA-256 `efeeddc8c8d9064a11fe0858bbf27c9186e664694c97aeef05868da0320a6754`). All 13 recovery snapshots (18,949 logical bytes) moved byte-for-byte to `life/.personal-dashboard/recovery/today/`. The two old root directories are absent. Local rollback copies remain outside Git; no user snapshot or backup was committed.
- Isolated packaged UI verification read the legacy snapshot as a fallback, preferred a valid canonical snapshot over a malformed legacy one, saved and edited a synthetic task and Daily Record, verified recovery links under the new path, and confirmed persistence after relaunch. All synthetic writes stayed under `/tmp`.
- Read-only installed-app acceptance loaded the selected Tortilla Flat Vault, Tasks, and the migrated Habit snapshot. The app reports the snapshot as valid but stale (generated 2026-09-10); bytes were intentionally preserved and not regenerated. The 2026-09-28 Daily Record remained absent.
- Full Rust suite passed with a fixed UTC clock matching the integration fixture; targeted package-version test, macOS bundle build, Rust formatting, Life Daily Loop dry-run, and skill validator passed. The frontend suite retains one unrelated failure: the copied 4.0.3 working source lacks `selectedCollaborationExternalAppIds` expected by its external-app test. The existing `today-write` IPC script also times out on its stale `Log workout now` startup marker; the requested packaged write/recovery path was verified directly through the candidate app UI and disk.
- No PR was opened or pushed. The Life Daily Loop path/dry-run update is commit `9356cf0` in the Tortilla Flat root repository; unrelated dirty files there were left untouched.
