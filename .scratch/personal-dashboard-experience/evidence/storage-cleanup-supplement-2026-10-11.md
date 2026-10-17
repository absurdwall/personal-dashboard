# Dashboard storage cleanup supplement — 2026-10-11

The user reported that the earlier accepted-delivery cleanup omitted large
Dashboard storage outside the canonical repository. The referenced conversation
was `01a1285e-cf6b-7b83-8951-d090109a807d` (清理 Ollama 并排查 worktree).

The earlier branch/worktree cleanup remains valid, but its storage inventory was
incomplete. A fresh inventory found these unused generated directories:

- `~/Library/Caches/personal-dashboard/review-target`
- `~/Library/Caches/personal-dashboard/tauri-target`
- `~/Library/Caches/personal-dashboard/issue-07-ios`
- `~/Library/Caches/personal-dashboard/issue-07-android`
- `~/Documents/Codex/personal-dashboard-release-2026-10-11.noindex/vault/tortilla-flat/personal-dashboard/src-tauri/target`

The first four totaled about 14.9 GiB; the last was about 44.5 GiB of compiler
output copied into an earlier release-protection backup. No corresponding build
process was running. All five directories were removed on the user's existing
cleanup authorization. No enclosing backup folder was removed.

At 18:14:58 America/New_York, directory measurements totaled 59.410 GiB and
available space rose from 13.790 to 71.176 GiB, an observed increase of 57.386
GiB. APFS shared blocks, snapshots and concurrent workloads can affect the
relationship between directory totals and recovered capacity.

The installed App remains source `d518332`. App/profile/Vault recovery data,
the backup's authority material, Git history, the WebKit cache and all Bridge
work were preserved. Product code, acceptance state and outstanding design
feedback were not changed. This operation did not build, test, review or launch
the App.

The private structured receipt is retained at
`~/Library/Application Support/Personal Dashboard Backups.noindex/closeout-20261011-173514/storage-cleanup-supplement.json`.
The canonical checkout remains the only active Git worktree; `main` and
`codex/dashboard-experience-integration` remain the two local branches.
