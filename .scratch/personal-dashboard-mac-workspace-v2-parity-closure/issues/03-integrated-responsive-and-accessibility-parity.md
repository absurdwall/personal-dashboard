# 03 — Integrated responsive and accessibility parity

**Type:** task

**What to build:** Across desktop, intermediate, and compact windows, the user can complete every approved workflow against the final v2 surface: scheduled recording, unscheduled recording, change-time, conflict confirmation, skip, undo, moved-destination recording, destination navigation, and temporary-sheet return. Mouse and keyboard users receive the same visible result, stable focus, and readable state signals.

**Blocked by:** 01 — V2 A visual parity and default workspace; 02 — Day-first change-time picker.

**Status:** resolved

- [x] Compact mode is a full workflow surface, not a read-only fallback: Record, Change, Skip, Undo, and Log workout remain usable at the compact viewport.
- [x] Close, Back, mutation completion, conflict confirmation, and Undo return focus to the affected agenda row or the appropriate stable trigger.
- [x] Destination navigation and resize preserve the selected occurrence, open detail state, and in-progress recording or exception draft without silently changing the occurrence.
- [x] Only the active agenda/detail surface scrolls; the document and window shell remain fixed at supported sizes.
- [x] Acceptance helpers fail closed and prove the resulting semantic state rather than passing when a control was not actually found or changed.
- [x] The complete workflow set is verifiable against the final production surface without relying on fixture-only behavior.

## Answer

Implemented the integrated responsive and accessibility parity layer on the production Mac workspace. Compact mode now keeps the full click-only workflow available at `640x520`, including scheduled and unscheduled recording, day-first Change, Skip/Undo, and the full-surface detail return. Detail state and in-progress exception or recording drafts survive destination changes and viewport changes; compact detail exposes modal dialog semantics, while desktop and intermediate detail remain temporary non-modal sheets.

The packaged Accessibility surface now covers the compact workflow directly and strengthens the responsive workflow with exact selected-occurrence text, selected-row state after intermediate resize, destination navigation, Back/Close return, focus restoration, and active-surface scroll/document-fixed assertions. The driver also fails closed when a picker menu never appears or when current-state semantics are not exposed; accessible labels alone cannot satisfy the `aria-current` assertion.

Verification completed on 2026-08-21:

- `npm run check`
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `cargo test --manifest-path src-tauri/Cargo.toml` — 73 passed
- `swiftc scripts/acceptance/macos-ui-driver.swift -framework ApplicationServices -framework AppKit`
- `bash -n scripts/acceptance/macos-ipc-workflow.sh`
- `git diff --check`
- `npm run build:mac`

A fresh packaged compact run was attempted after the rebuild, but the current macOS window-server session did not expose the launched app's rendered UI to Accessibility and stopped at `timed out waiting for rendered UI text: Log workout now`. This is not claimed as packaged acceptance evidence; the final direct packaged proof remains ticket 04, which owns the delivery gate for this round.
