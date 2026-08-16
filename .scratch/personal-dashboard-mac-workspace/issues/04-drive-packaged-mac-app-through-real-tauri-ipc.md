# 04 — Drive the packaged Mac app through real Tauri IPC

**Type:** task

**What to build:** Establish a bounded acceptance seam that launches an isolated packaged Personal Dashboard, operates its rendered controls, crosses real Tauri IPC, and observes user-visible persisted results.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] Acceptance launches the packaged Mac application rather than a browser fixture, development-only page, or direct Rust application object.
- [x] Each run uses isolated profile storage and controlled time without touching the user's real Personal Dashboard data.
- [x] At least one existing exercise workflow is completed through rendered controls and verified through visible state after real IPC.
- [x] A persistence assertion closes and relaunches the packaged app before observing the saved result.
- [x] Failures identify the user-visible step or boundary that failed and clean up the isolated application state.
- [x] The seam can be extended incrementally by later workspace tickets without adding an unapproved frontend framework, service, or product dependency.
- [x] Existing fast Rust workflow and packaged-launch acceptance remain in force.

## Answer

Implemented the bounded packaged UI/IPC acceptance seam at `scripts/acceptance/macos-ipc-workflow.sh`. Each run copies the arm64 bundle to a temporary location, supplies isolated profile/baseline paths and a fixed clock, compiles a temporary macOS accessibility driver from system frameworks, and launches the copied app through Launch Services.

The acceptance driver completes the existing click-only unscheduled-workout flow through rendered controls—**Log workout now**, **Elliptical**, **30**, and **Moderate**—then verifies the visible qualifying result. It terminates and relaunches the packaged app and verifies the same visible result through the accessibility tree. Failures name the current user-visible step, and cleanup removes only the temporary app/process/data.

The fixed-clock environment hooks are documented in `docs/acceptance/macos-ipc-workflow.md`. The existing Rust workflow suite and `scripts/acceptance/macos-packaged-launch.sh` acceptance remain unchanged and passing.
