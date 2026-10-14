# PDEX-26 candidate package — 2026-10-14

## Source identity

- Ticket branch: `codex/pdex-26-restart`
- Ticket claim/base: `147750868d2030f1a604d3d1e0ee7e6278fbad5c` /
  `fe14333c8e1269c4c5b14faf89f2d802dd351487`
- Product source is the reviewed PDEX-25 integration at `fe14333`; the claim
  commit changes only local tracker records.
- Build command:
  `PATH=/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/node_modules/.bin:$PATH npm run build:mac`
- Build result: successful.

## Candidate identity

- Bundle:
  `/private/tmp/pdex-restart-20261014.noindex/candidate/pdex-spec-02-2026-10-14/Personal Dashboard.app`
- Bundle ID: `com.tortillaflat.personal-dashboard`
- Version: `4.0.7`
- Architecture: `arm64`
- Bundle size: 17 MB
- Executable:
  `Contents/MacOS/personal-dashboard`
- Executable SHA-256:
  `fe9dbbc6933a7778ab90712f6b90623efa172387397c37e54efed9a893d0a30c`
- Signature check: `codesign --verify --deep --strict` passed. This is an
  ad-hoc local signature; notarization was not performed.

## Separation and limits

- Installed app executable SHA-256:
  `8e43beff6cffa2dde5a664eb4ba0182181d81e7746d8eb3c96846f43c87a0ba2`.
  It remained unchanged through packaging and the packaged attempts. The
  installed process was not stopped or replaced.
- `Open Candidate.command` passed `bash -n` and sets
  `PERSONAL_DASHBOARD_DATA_DIR` and `PERSONAL_DASHBOARD_BASELINE_FILE` under
  `/private/tmp/pdex-restart-20261014.noindex/candidate/pdex-spec-02-2026-10-14/isolated-profile`.
  That optional profile remains empty. The acceptance harness instead copied
  the candidate to separate temporary bundles and used synthetic profile/Vault
  paths; no personal Vault was selected.

## Packaged acceptance attempt — 2026-10-14

- Command:
  `PERSONAL_DASHBOARD_APP_BUNDLE='/private/tmp/pdex-restart-20261014.noindex/candidate/pdex-spec-02-2026-10-14/Personal Dashboard.app' PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=gate scripts/acceptance/macos-ipc-workflow.sh`
- The first `settings-vault-colors` scenario launched its isolated package,
  selected a synthetic Vault, saved the blue accent through the app, and passed
  Today and Calendar rendered-color checks. It then stopped at the Habit
  refresh-control color assertion with `#ffffff vs #597897`. The assertion
  compares the refresh control's dominant rendered color to the toolbar accent
  sample, but both baseline `918e7e0` and the candidate style that control with
  the surface color. This is a pre-existing harness expectation inconsistent
  with the preserved app style. The scenario stopped before file readback,
  restart and Vault-switch checks. No product or acceptance-script change was
  made to bypass it.
- A separate `dashboard-4` packaged attempt stopped because its initial
  assertion expected `Dashboard 4 synthetic morning baseline` to be visible
  immediately. Its synthetic clock is 14:10 EDT, so the app opened on the
  `当日` tab and reported that it had read the independent Morning baseline and
  current arrangement. Selecting `早间` exposed the expected synthetic
  baseline. The rest of that scenario did not run.
- Manual Accessibility inspection of that isolated package showed the Today
  Day/Morning states, the seven-item Tasks fixture, the Habit summary and a
  Habit detail with three history records. This was a visual/semantic spot
  check, not full PDEX-26 acceptance. A relocated synthetic-data copy is left
  open for review at
  `/private/tmp/personal-dashboard-ipc.pdex26-dashboard4-20261014/`.
- The gate is incomplete: no successful packaged save/readback/restart cycle,
  migration, revision-conflict or write-failure recovery, full pointer
  cross-feature matrix, real IME/microphone use, or human acceptance is claimed.
  PDEX-26 remains open/in-progress. The installed app was not replaced; no
  remote Git operation, `main` merge, or PR was performed.
