# 06 — Present This Week as a chronological agenda

**Type:** task

**What to build:** Make This Week an action-first chronological agenda whose essential weekly state and next useful detail are visible together at the default Mac window size.

**Blocked by:** 05 — Replace the scrolling document with Mac workspace navigation.

**Status:** resolved

- [x] The current week, progress toward three qualifying workouts, and the next departure or required action are visible at `960x720` without body scrolling.
- [x] All primary departures appear as compact chronological rows with stable identity, day, time, truthful text status, and a non-color status signal.
- [x] Recorded-workout evidence remains associated with its source departure.
- [x] Fallback departures form a subordinate group whose availability is summarized without scrolling and whose unavailable choices are not presented as available.
- [x] Selecting a row visibly relates it to contextual detail; when no action is pending, detail defaults to the next departure.
- [x] Exceptional inactive-profile, reminder, or permission warnings appear only when relevant.
- [x] Schema numbers, file operations, long privacy explanations, and capability diagnostics do not compete with the agenda.
- [x] Rust supplies stable semantic values, timestamps, eligibility, and available actions; the frontend owns labels, formatting, hierarchy, guidance, and temporary selection state without parsing display prose.
- [x] Packaged acceptance verifies the required default-window visibility and row selection through rendered controls.

## Answer

- Added semantic Rust agenda data: departure timestamps, status/availability kinds, next-departure slot identity, and source-departure workout evidence.
- Replaced the This Week schedule cards with a dense chronological agenda. Primary rows are keyboard-activated buttons with stable slot identity, visible text statuses, symbol markers, and selected-state styling; fallback rows remain subordinate and show truthful availability.
- Added temporary frontend selection state. This Week defaults to the next departure, keeps the selected row visibly pressed, and mirrors its day/time/status/evidence in the contextual pane.
- Extended packaged acceptance to verify Monday, Wednesday, and Friday rows, fallback availability, default selection, and rendered Wednesday selection before the existing IPC workout/persistence flow.
- Verification: `npm run check`, `npm run build:mac`, `cargo fmt --manifest-path src-tauri/Cargo.toml --check`, packaged acceptance, and visual checks at 960x720 and 640x520 all pass.
