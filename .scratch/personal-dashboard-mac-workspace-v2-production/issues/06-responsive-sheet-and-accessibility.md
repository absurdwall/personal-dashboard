# 06 — Match the responsive temporary sheet and keyboard behavior

Type: task
Status: claimed
Blocked by: 02, 03, 04, 05

## Goal

Make the production app behave like the approved temporary-sheet prototype at desktop, intermediate, and compact sizes, including semantic navigation, focus management, and active-surface scrolling.

## Production surface

Primary targets are frontend/index.html, frontend/main.ts, frontend/styles.css, and scripts/acceptance/ where the existing Mac UI driver needs a production assertion.

## Required work

- [ ] Verify the desktop reference layout: agenda remains list-first and detail is a temporary sheet with backdrop/close behavior.
- [ ] Verify the intermediate layout keeps the compact navigation mode and usable detail width without losing the selected row.
- [ ] Verify the compact layout uses the approved destination switcher, full-width detail sheet, and Back-to-agenda behavior.
- [ ] Keep body/page scrolling disabled while the active agenda/detail surface scrolls naturally.
- [ ] Preserve aria-current, aria-pressed, labels, dialog semantics, and an understandable focus order.
- [ ] Restore focus to the triggering/selected agenda row after close, record, change-time, skip, undo, and conflict confirmation.
- [ ] Ensure resize and navigation do not erase an open draft or silently select a different occurrence.

## Acceptance

- [ ] The production app passes keyboard-only navigation at all three viewport classes.
- [ ] Every temporary-sheet action has a visible and keyboard-accessible return path.
- [ ] Focus returns to a stable agenda element after each mutation; no focus is lost to the document body.
- [ ] The real packaged acceptance driver proves the viewport, scroll, navigation, and focus assertions.
- [ ] No fixture-only CSS or JavaScript is used as the production implementation.

## Boundaries

Keep History and Settings reachable but within their existing scope. Do not add a UI framework, new dependency, or mobile product surface.

## Comments

### Implementation

- Added the approved compact `Destination` switcher while retaining the readable desktop navigation and intermediate icon rail.
- Made compact detail a true one-surface drill-in: the agenda becomes `inert` and is removed from layout, the detail sheet fills the surface, and Back returns to the selected row.
- Added dialog semantics, dynamic compact `aria-modal`, `aria-current`/`aria-pressed`/`aria-expanded` relationships, stable labels, scrollbar ownership, and explicit Escape/Close return behavior.
- Restored focus after close, record completion, change-time, Skip, Undo, and conflict confirmation; recording stages now focus the next click-only choice automatically.
- Extended the packaged Accessibility workflow for compact selected values, active scrolling, Escape, focus restoration, and preserving exception/recording drafts through destination navigation and resize.

### Verification

Passed:

- `npm run check`
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `cargo test --manifest-path src-tauri/Cargo.toml` — 73 tests passed.
- `bash -n scripts/acceptance/macos-ipc-workflow.sh`
- Swift Accessibility driver compilation.
- `npm run build:mac`
- `npm run accept:mac`

Blocked evidence:

- `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=responsive scripts/acceptance/macos-ipc-workflow.sh` could not reach the rendered UI because macOS reported that the screen was locked and automatic unlock was unavailable. The source-level acceptance assertions are present, but the final Accessibility run is not claimed as passed.
- Ticket remains `claimed` until the user unlocks the Mac and the packaged responsive/keyboard scenarios complete.
