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

Issues and specs are tracked as local Markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the default five-role triage vocabulary. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context domain documentation layout. See `docs/agents/domain.md`.

## Shared management connection

- Project id: `product-personal-dashboard`; canonical working directory:
  `personal-dashboard` inside the Tortilla Flat workspace;
  repository: `absurdwall/personal-dashboard`; source id:
  `source-personal-dashboard-3`.
- After actual publication, native claim, completion/blockage, or an explicit
  reconcile request, use the user-local `tortilla-flat-management` skill and
  its installed helper. If its install, version, or workspace binding is
  missing, report setup required; do not infer identity from chat or create a
  Registry. Preserve this repository's local issue workflow and approval
  boundaries.
