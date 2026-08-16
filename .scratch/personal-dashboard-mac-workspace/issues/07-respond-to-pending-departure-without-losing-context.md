# 07 — Respond to a pending departure without losing context

**Type:** task

**What to build:** Let the user complete or recover a due departure response inside the contextual pane while the weekly agenda and unfinished domain action remain visible and intact.

**Blocked by:** 06 — Present This Week as a chronological agenda.

**Status:** resolved

- [x] A due departure response opens automatically in detail while its agenda row and weekly context remain visible.
- [x] The exact actions Leaving for gym, Move to fallback, and Skip retain their established meanings and ordering.
- [x] Move to fallback and Skip expose the complete established preset-reason sets and require no typing.
- [x] Inspecting another departure preserves the pending domain action and exposes a prominent, keyboard-operable Needs attention return control.
- [x] Returning to the pending action takes one clear interaction and cannot silently discard or replace it.
- [x] Completing the response returns selection to the affected row and immediately shows its updated truthful status.
- [x] Ordinary departure responses stay inside the detail pane rather than obscuring the agenda with a modal.
- [x] Packaged acceptance covers automatic presentation, browsing away, Needs attention recovery, one completed response, and relaunch persistence.

## Answer

- Moved the existing departure prompt, preset-reason response, and confirmation surfaces into the contextual detail pane while keeping the chronological agenda visible.
- Added automatic due-response presentation independent of the native reminder marker, preserving response access when notifications are unavailable.
- Added a prominent Needs attention recovery control. Browsing to another agenda row keeps that selection and explicitly names the still-pending departure; one activation returns to the pending response and focuses its first action.
- Preserved the established IPC commands, action ordering, five click-only reasons, and affected-row status update after completion.
- Extended the packaged macOS accessibility acceptance to cover due presentation, browsing away, recovery, all preset reasons, Skip completion, and persisted status after relaunch.
- Verification: `npm run build`, `cargo test --manifest-path src-tauri/Cargo.toml`, `npm run build:mac`, and `./scripts/acceptance/macos-ipc-workflow.sh` all pass.
