# 05 — Replace the scrolling document with Mac workspace navigation

**Type:** task

**What to build:** Replace the long opening document with the approved three-region Mac workspace while keeping every established capability reachable through This Week, History, or Settings.

**Blocked by:** 01 — Reconcile schedule reminders after interruption; 02 — Make confirmed profile restore recoverable; 03 — Preserve profile meaning across time zones; 04 — Drive the packaged Mac app through real Tauri IPC.

**Status:** resolved

- [x] Personal Dashboard opens in This Week with persistent destinations for This Week, History, and Settings and a visibly current destination.
- [x] The desktop surface provides destination navigation, destination information, and contextual action or detail regions.
- [x] The webview body remains fixed at `960x720`; ordinary overflow belongs only to the information or detail region that owns it.
- [x] Switching destinations never relies on placeholder future features or introduces a generic dashboard taxonomy.
- [x] Existing exercise, history, routine, profile, file, authority, and notification capabilities remain reachable during the transition.
- [x] Application identity and quiet offline/private reassurance remain visible without the former marketing-style hero or long explanatory boundary copy.
- [x] Destination and region relationships use semantic navigation and main-content structures and are keyboard reachable.
- [x] Packaged acceptance verifies destination switching and body scroll ownership through real IPC-backed application state.

## Answer

- Replaced the long opening document with a fixed Mac workspace shell: persistent This Week, History, and Settings navigation; a destination information pane; and a contextual detail pane.
- Moved existing history, routine, profile, file, authority, notification, and privacy controls under their destinations without changing their established DOM identifiers or IPC actions.
- Locked document/body overflow and added pane-local scrolling, including the 640x520 compact layout. The detail pane reports the live fixed-window/pane-overflow state.
- Extended packaged acceptance to switch destinations and verify the rendered overflow state before continuing the real IPC workout/persistence workflow.
- Verification: `npm run check`, `npm run build:mac`, `scripts/acceptance/macos-ipc-workflow.sh`, and visual checks at 960x720 and 640x520 all pass.
