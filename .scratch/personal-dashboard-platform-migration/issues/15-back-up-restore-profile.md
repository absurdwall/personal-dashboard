# 15 — Back up and restore the complete profile

**What to build:** Let the user protect and recover the complete Personal Dashboard profile through native file interactions, preserving every established exercise state without an account, network service, cloud store, or synchronization.

**Blocked by:** 12 — Close the week and repeat the routine; 13 — Adjust this week or deliberately change the routine; 14 — Review, correct, and delete workout history.

**Status:** resolved

- [x] Profile backup exports the complete active profile through a native save interaction.
- [x] Creating a profile backup leaves the source profile active and does not change reminder authority.
- [x] The backup includes the repeating routine, week exceptions, slot outcomes, reminder responses, decisions, workout records, history changes, and current derived state.
- [x] Restore selects a local file through a native open interaction and validates the entire document before replacement.
- [x] Restore requires explicit confirmation before replacing a valid active profile.
- [x] A successful restore reproduces the backed-up dashboard, routine, history, progress, and reminder intent.
- [x] Invalid, unsupported, or cancelled restore leaves the active profile unchanged.
- [x] Backup and restore work fully offline and introduce no account, synchronization, cloud storage, or external service.
- [x] The primary application seam verifies representative multi-week backup and restore, while acceptance mode verifies real native file interactions.

## Comments

Native acceptance initially exposed that synchronous Tauri commands blocked the
application event loop while a macOS file panel was open. The backup and restore
selection commands now run asynchronously, keeping both native panels and the
source dashboard interactive.

## Answer

Implemented complete offline profile backup and restore through native macOS
save/open interactions, whole-document validation, explicit replacement
confirmation, and crash-recoverable profile replacement. The application seam
covers representative multi-week state and failure recovery. On 2026-08-14 the
packaged arm64 app completed the recorded native acceptance flow, including
save, source continuity, cancel, confirmed restore, restored reminder intent,
and invalid-file rejection without changing the active profile.
