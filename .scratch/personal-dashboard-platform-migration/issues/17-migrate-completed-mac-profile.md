# 17 — Automatically migrate the completed Mac profile

**What to build:** Adopt the completed Python tracker's existing Mac data automatically on first Personal Dashboard launch, preserving the original as rollback evidence and proving that the complete user-visible profile survives conversion exactly once.

**Blocked by:** 16 — Move the authoritative profile safely.

**Status:** ready-for-agent

- [ ] First launch detects existing completed tracker state at its established local location without requiring manual file selection.
- [ ] The complete old document is validated before any new active state is written.
- [ ] The original completed state remains byte-for-byte unchanged as the rollback source.
- [ ] New app-owned state is written atomically and becomes active only after successful conversion.
- [ ] Successful migration records completion so later launches neither repeat conversion nor duplicate records.
- [ ] Migrated schedule, current week, progress, fallback availability, departure outcomes, reminder intent, history, and backup output match the baseline behavior.
- [ ] Authority metadata is initialized coherently without introducing an account or sync identity.
- [ ] Malformed, unsupported, interrupted, or partially written input produces a controlled visible result and leaves both the baseline and any valid new state safe.
- [ ] No dual-write path updates both Python and Tauri state.
- [ ] The primary application seam launches against representative completed baseline state and verifies success, idempotence, rollback safety, and failure behavior through visible outcomes.
