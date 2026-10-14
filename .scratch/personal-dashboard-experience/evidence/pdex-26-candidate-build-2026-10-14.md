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
  It was unchanged by this build. The running process observed during the
  check was `/Applications/Personal Dashboard.app/Contents/MacOS/personal-dashboard`;
  no candidate process was running.
- The candidate has not been launched. The provided
  `Open Candidate.command` passed `bash -n` and sets
  `PERSONAL_DASHBOARD_DATA_DIR` and `PERSONAL_DASHBOARD_BASELINE_FILE` under
  `/private/tmp/pdex-restart-20261014.noindex/candidate/pdex-spec-02-2026-10-14/isolated-profile`.
  The folder is empty and no synthetic Vault is selected.
- Since the candidate was not started, this evidence does not cover actual
  Tauri IPC, persisted save/readback, relaunch, legacy migration, revision
  conflicts, alternate Vaults, failures/retry, pointer behavior, responsive
  cross-feature scenarios, IME, microphone, or human acceptance. PDEX-26 stays
  open/in-progress. No install, app replacement, remote Git operation, main
  merge, or PR was performed.
