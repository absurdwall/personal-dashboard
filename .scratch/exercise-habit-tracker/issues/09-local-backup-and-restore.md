# 09 — Back up and restore the complete local state

**What to build:** Let the user protect the complete exercise plan and history with one local backup file and recover the same user-visible state without an account, cloud service, or synchronization.

**Blocked by:** 07 — Adjust this week without accidentally changing the routine; 08 — Review and correct workout history.

**Status:** resolved

- [x] The user can export the complete local product state into one user-controlled backup file.
- [x] The backup includes the repeating routine, current-week exceptions, planned and fallback slots, reminder responses, reschedules, skips and reasons, missed-no-response outcomes, workout records, and record corrections or deletions.
- [x] The user can select a previously exported file and restore its complete state locally.
- [x] After restore, the dashboard, current-week progress, next departure, fallback availability, repeating routine, and chronological history match the exported state.
- [x] A backup-and-restore round trip preserves qualifying versus short-effort semantics and all preset values.
- [x] Export and restore require no account, network connection, cloud storage, external service, or synchronization.
- [x] Personal data remains local unless the user explicitly chooses where to save the exported file.
- [x] The application-workflow test creates representative multi-week state, exports it, restores it into an isolated local state, and compares all user-visible results at the same external seam.

## Answer

Added `export-backup` and `restore-backup` CLI operations with an explicit user-selected `--backup-file`. Export writes the complete local product state into one atomic JSON file; restore validates that complete document and atomically replaces the selected local state. README instructions cover both operations and make clear that neither requires an account, network, cloud service, external service, or synchronization.

Restore validates the supported schema and nested routine, weeks, slots, timestamps, reminder responses, moves/skips and reasons, workout records, preset values, qualification semantics, drafts, decisions, identifiers, references, and derived weekly counts before writing. Malformed JSON, invalid structure, and timezone-naive operational timestamps produce a controlled failure while leaving valid local state untouched.

The application workflow builds representative state across two weeks with a current-week exception, repeating-routine change, move and skip reasons, reminders and follow-up silence, missed outcomes, corrected and deleted history, and qualifying and short records. It exports one file, restores into an isolated local state, compares normalized user-visible dashboard content, and verifies matching reminder output. All 20 workflow tests pass, source and tests compile, and both Standards and Spec reviews are clean.
