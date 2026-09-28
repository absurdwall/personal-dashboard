# 01: Move Habit snapshot and recovery storage under life/

**What to build:** Move Dashboard's canonical Habit snapshot and atomic-write recovery path under `life/.personal-dashboard/`, update the Life Daily Loop producer and current path documentation/tests, then migrate and package only after isolated acceptance.

**Blocked by:** None

**Status:** claimed

Type: task

- [ ] Preserve the existing 4.0.3 working source state without changing its original worktree; record the packaged source and candidate hashes.
- [ ] Read the canonical Habit snapshot under `life/`; retain read-only fallback to the former root snapshot only when the canonical file is missing.
- [ ] Move all Dashboard recovery hard links to `life/.personal-dashboard/recovery/today/`; keep recovery manual and never replay it automatically.
- [ ] Update the Life Daily Loop producer, dry-run fixture, current documentation, package acceptance script, and Rust tests.
- [ ] Verify snapshot compatibility, task/diary writes, and recovery behavior on isolated fixtures.
- [ ] Back up the installed app and exact real data, stop the app, migrate file bytes, install 4.0.4, and perform read-only real-Vault acceptance.
- [ ] Remove the two root data directories only after matching checksums and packaged acceptance; preserve local rollback material outside Git.

## Comments

