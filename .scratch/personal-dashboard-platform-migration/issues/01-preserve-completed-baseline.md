# 01 — Preserve the completed baseline

**What to build:** Preserve a recoverable, verified reference to the completed Python exercise tracker before any Tauri platform work begins, so later migration and parity work has a trustworthy behavioral and data oracle.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A durable Git reference identifies the completed Python application before any Tauri implementation is introduced.
- [ ] Creating the reference preserves existing repository history and does not include unrelated working-tree changes.
- [ ] The completed high-level application-workflow suite passes at the referenced baseline.
- [ ] The baseline's product behavior, schema version, local data location, and launch/reminder mechanics are recorded as migration evidence.
- [ ] Representative valid completed state is available for later migration and parity checks without including personal data.
- [ ] Recovery instructions explain how to inspect or run the baseline without establishing a separately maintained product edition.
- [ ] No application behavior, exercise rule, dependency, or runtime is changed by this ticket.
