# 17 — Automatically migrate the completed Mac profile

**What to build:** Adopt the completed Python tracker's existing Mac data automatically on first Personal Dashboard launch, preserving the original as rollback evidence and proving that the complete user-visible profile survives conversion exactly once.

**Blocked by:** 16 — Move the authoritative profile safely.

**Status:** resolved

- [x] First launch detects existing completed tracker state at its established local location without requiring manual file selection.
- [x] The complete old document is validated before any new active state is written.
- [x] The original completed state remains byte-for-byte unchanged as the rollback source.
- [x] New app-owned state is written atomically and becomes active only after successful conversion.
- [x] Successful migration records completion so later launches neither repeat conversion nor duplicate records.
- [x] Migrated schedule, current week, progress, fallback availability, departure outcomes, reminder intent, history, and backup output match the baseline behavior.
- [x] Authority metadata is initialized coherently without introducing an account or sync identity.
- [x] Malformed, unsupported, interrupted, or partially written input produces a controlled visible result and leaves both the baseline and any valid new state safe.
- [x] No dual-write path updates both Python and Tauri state.
- [x] The primary application seam launches against representative completed baseline state and verifies success, idempotence, rollback safety, and failure behavior through visible outcomes.

## Comments

Migration converts the schema-v5 source through an exercise-owned typed seam,
then atomically adopts the paired profile and exercise documents. The profile
records the validated source schema version, so it wins on later launches even
when the old source is missing, changed, or malformed. Python reminder-delivery
markers and in-progress decisions or workout drafts are preserved without a
dual-write path.

## Answer

Implemented automatic, first-launch migration from the completed Mac exercise
profile. Deterministic workflow tests cover visible parity, source integrity,
semantic validation, atomic interruption recovery, pre-migration Tauri state,
reminder deduplication, in-progress UI state, backup parity, and exactly-once
relaunch behavior. On 2026-08-14 the isolated packaged arm64 app passed valid,
idempotent, and controlled-invalid native acceptance; the source checksum was
unchanged and all temporary data was removed.
