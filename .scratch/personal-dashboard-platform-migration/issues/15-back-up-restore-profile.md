# 15 — Back up and restore the complete profile

**What to build:** Let the user protect and recover the complete Personal Dashboard profile through native file interactions, preserving every established exercise state without an account, network service, cloud store, or synchronization.

**Blocked by:** 12 — Close the week and repeat the routine; 13 — Adjust this week or deliberately change the routine; 14 — Review, correct, and delete workout history.

**Status:** ready-for-agent

- [ ] Profile backup exports the complete active profile through a native save interaction.
- [ ] Creating a profile backup leaves the source profile active and does not change reminder authority.
- [ ] The backup includes the repeating routine, week exceptions, slot outcomes, reminder responses, decisions, workout records, history changes, and current derived state.
- [ ] Restore selects a local file through a native open interaction and validates the entire document before replacement.
- [ ] Restore requires explicit confirmation before replacing a valid active profile.
- [ ] A successful restore reproduces the backed-up dashboard, routine, history, progress, and reminder intent.
- [ ] Invalid, unsupported, or cancelled restore leaves the active profile unchanged.
- [ ] Backup and restore work fully offline and introduce no account, synchronization, cloud storage, or external service.
- [ ] The primary application seam verifies representative multi-week backup and restore, while acceptance mode verifies real native file interactions.
