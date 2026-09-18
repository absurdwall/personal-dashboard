# Personal Dashboard Working Agreements

This project is a private, cross-device habit-tracking web app.

- Follow the parent vault instructions in `../AGENTS.md`.
- Keep personal data, credentials, and secrets out of version control.
- Do not add dependencies, external services, or deployment configuration without explicit approval.

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
