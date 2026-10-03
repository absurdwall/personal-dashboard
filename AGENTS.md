# Personal Dashboard Working Agreements

This project is a private, cross-device habit-tracking web app.

- Follow the parent vault instructions in `../AGENTS.md`.
- Keep personal data, credentials, and secrets out of version control.
- Do not add dependencies, external services, or deployment configuration without explicit approval.

## Git and local releases

- `main` is protected: create changes on a `codex/` branch and merge through a GitHub PR. Do not commit on `main` or push directly to it, including as an administrator.
- Enable the checked-in commit/push guards in each clone with `git config --local core.hooksPath .githooks`.
- After merge, verify reachability and preserve unique files before removing feature branches and worktrees. Keep only `main` locally and remotely between tasks.
- Keep `/Applications/Personal Dashboard.app` as the sole searchable installation. Archive obsolete App bundles and unregister test/build copies from Launch Services; keep temporary bundles outside Spotlight indexing. Preserve personal Vault and profile data.

## Agent skills

### Issue tracker

Before publishing or fetching specs and implementation tickets, read `docs/agents/issue-tracker.md`. The canonical tracker is GitHub Issues in `absurdwall/personal-dashboard`; `.scratch/` holds supporting records.

### Triage labels

Use the default five-role GitHub label vocabulary in `docs/agents/triage-labels.md`.

### Domain docs

Before exploring or changing the project, read `docs/agents/domain.md` for the single-context layout and domain documentation rules.

## Shared management connection

- Management project id: `product-personal-dashboard`.
- Use the user-local `tortilla-flat-management` skill only when the user
  explicitly requests Management connection or reconciliation.
- Preserve this repository's GitHub issue workflow and approval boundaries.
