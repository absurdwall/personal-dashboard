# 01 — Preserve the completed baseline

**What to build:** Preserve a recoverable, verified reference to the completed Python exercise tracker before any Tauri platform work begins, so later migration and parity work has a trustworthy behavioral and data oracle.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] A durable Git reference identifies the completed Python application before any Tauri implementation is introduced.
- [x] Creating the reference preserves existing repository history and does not include unrelated working-tree changes.
- [x] The completed high-level application-workflow suite passes at the referenced baseline.
- [x] The baseline's product behavior, schema version, local data location, and launch/reminder mechanics are recorded as migration evidence.
- [x] Representative valid completed state is available for later migration and parity checks without including personal data.
- [x] Recovery instructions explain how to inspect or run the baseline without establishing a separately maintained product edition.
- [x] No application behavior, exercise rule, dependency, or runtime is changed by this ticket.

## Answer

Created the annotated tag `python-exercise-tracker-complete` at the clean,
pre-migration commit `7856f5019f69a62fbb168e38a03f328c8d0cb983` after all 20
high-level application-workflow tests passed, then published and verified the
tag on `origin`. Recorded the baseline behavior, schema-v5 data contract, local
storage, launch/reminder mechanics, and detached worktree recovery procedure in
`docs/migration/completed-python-baseline.md`.

Added `tests/fixtures/completed-python-baseline-state.json`, a synthetic valid
profile spanning representative completed behavior without personal data. The
fixture restores through the baseline CLI and emits the expected adjusted
departure reminder. This ticket changes only preservation evidence, tracker
status, and a README pointer; application source, behavior, dependencies,
exercise rules, and runtime remain unchanged.
