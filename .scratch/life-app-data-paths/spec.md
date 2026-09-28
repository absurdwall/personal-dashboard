# Life application data paths

Personal Dashboard's canonical Vault data belongs under `life/`, alongside the
life records it serves. The Habit snapshot is a rebuildable projection produced
by Life Daily Loop; Dashboard reads it. Dashboard-owned recovery files are
manual recovery material, not canonical state or an automatic fallback source.

## Required paths

- Habit snapshot: `life/.personal-dashboard/derived/habits-v1.json`.
- Atomic-write recovery: `life/.personal-dashboard/recovery/today/`.

The Dashboard may read the former root Habit snapshot path only when the new
canonical file is absent. The new file wins when both exist, and invalid new
data must not be masked by old data. Neither the Dashboard nor Life Daily Loop
may create the old root paths. Recovery snapshots are never auto-read or
replayed. The recovery path stays under `life/` so hard links share a volume
with canonical Vault records.

## Acceptance

- Isolated Vault tests cover current-path reading, read-only legacy fallback,
  no old-path recreation, task and Daily Record saves, and hard-link recovery.
- Life Daily Loop dry-run writes only the new snapshot path.
- Packaged macOS acceptance uses synthetic Vaults and isolated app data.
- Before real migration, preserve the installed bundle and exact original
  snapshot/recovery files outside every Git repository. Migrate without changing
  file contents, install only after isolated acceptance, and retain rollback
  material locally.
