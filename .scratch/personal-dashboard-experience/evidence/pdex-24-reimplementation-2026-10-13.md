# PDEX-24 reimplementation integration evidence

Ticket: [PDEX-24](../issues/24-habit-create-edit-goal-cycles.md)

Integration branch: `codex/dashboard-experience-refinement-reimplementation`

Worker branch: `codex/pdex-24-refinement-reimplementation`

## Retained local Git history

- The clean integration branch was at
  `14bd7629f8961516eab7b534703d52f0e9622ae8` before merge.
- The clean worker branch was at
  `fdc401c58e1ba094dca5b47721ef74333dd34613` and includes the original PDEX-24
  commits:
  - `b7fc4f3e118f17fc47f34fdee3be16474108a2a9` — local Habit catalog,
    persistence/readback, and goal cycles.
  - `38214160d23b70f57b68c79363839816ad9758cb` — compact create/edit form and
    UI contract checks.
  - `5b436f5539995a025046a72d702a71bb63ed50d4` — definition contract and
    evidence record.
  - `8ff52054948897b03f737bb7cc3ed36ae87049ba` — final worker verification
    record.
- The worker branch retains its PDEX-19 dependency merge
  `befded5be81bca8aabf698c80051da98dfe3b9f0` and integration fix
  `6b6edd485a7c73021fc588198351b1ed3ab7f24e`, which reports Habit save and
  refresh outcomes to the existing Vault-switch pending-write barrier.
- The integration branch merged the worker tip with `--no-ff` as
  `36a13077a3d58dbe90bcf38a0c9230d0b27d6efb`; parents are the prior integration
  tip `14bd7629f8961516eab7b534703d52f0e9622ae8` and worker tip
  `fdc401c58e1ba094dca5b47721ef74333dd34613`. This merge completed without
  conflicts. No history was rewritten, and no remote, `main`, or installed App
  operation was performed.

## Integrated source checks

Run in the canonical integration checkout after the merge:

| Command | Result |
| --- | --- |
| `npm run build` | Passed, exit 0. |
| `node --test tests/frontend/habit-definition-ui.test.ts tests/frontend/habit-localized-names.test.ts` | 8 passed, 0 failed. |
| `cargo test --manifest-path src-tauri/Cargo.toml --test habit_definition_workflow` | 8 passed, 0 failed. |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Exit 0; all unit, integration, and doc-test groups passed; 6 environment-gated tests were ignored. |

## Preserved limits

- The worker's isolated pre-integration `npm run test:frontend` attempt remains
  nonzero because its checkout lacked `node_modules/.bin/tsc`; it also reported
  checks outside PDEX-24. It was not rerun on the integration checkout. The
  focused frontend checks and production build passed with the integration
  checkout's existing toolchain.
- The worker's local Chrome smoke used only its synthetic IPC fixtures
  `synthetic-habit-target` and `synthetic-completions`; it is supporting
  interaction evidence, not packaged-App or real Vault acceptance.
- No packaged save/readback acceptance is claimed. PDEX-26 owns that gate, so
  PDEX-24 remains claimed and `in-progress`.
