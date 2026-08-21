# 04 — Final packaged v2 parity gate

**What to build:** Close the parity-closure round only when a fresh isolated launch of the real packaged Mac application matches prototype A and completes the approved workflows with the required persistence, responsive, accessibility, History, and Settings evidence.

**Blocked by:** 01 — V2 A visual parity and default workspace; 02 — Day-first change-time picker; 03 — Integrated responsive and accessibility parity.

**Status:** resolved

- [x] The fresh packaged app opens list-first on This Week with the prototype-matching palette, hierarchy, agenda, temporary detail behavior, and compact navigation.
- [x] The packaged app proves scheduled recording, unscheduled recording, day-first change-time, conflict confirmation, skip/undo, moved-source/destination semantics, and relaunch persistence.
- [x] Desktop, intermediate, and compact viewport evidence proves readable layout, active-surface scrolling, complete compact interactions, semantic navigation, and focus restoration.
- [x] History and Settings remain reachable and coherent without becoming a second This Week design.
- [x] The Answer records exact build, launch, environment, and direct packaged-app evidence; fixture, unit-test, or source-inspection results alone cannot resolve this ticket.

## Answer

Resolved from the fresh packaged Mac application. The direct gate passed with exit code 0:

```text
npm run build:mac
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=gate scripts/acceptance/macos-ipc-workflow.sh
```

The build produced:

`src-tauri/target/release/bundle/macos/Personal Dashboard.app`

The acceptance script copied that bundle to a fresh `/tmp/personal-dashboard-ipc.*` directory for each run, launched it with `open -n`, compiled the Swift `ApplicationServices`/`AppKit` Accessibility driver, and used isolated local profile/baseline paths. The gate used the deterministic local clock (`now=1786406400000`, UTC offset `-240`, with scenario-specific rollover/conflict clocks) and no network or fixture data.

Direct packaged evidence covered:

- list-first This Week at 960×720, 800×640, and 640×520, including palette/hierarchy, temporary detail, compact Back, internal agenda scrolling, and no document scroll;
- scheduled and unscheduled records, 0→3 progress, short-effort non-qualifying behavior, conflict preview/confirmation, day/date-first change time, the Saturday suggested choice and Sunday option availability, skip/undo, moved source/destination semantics, and relaunch persistence;
- responsive Settings/History/This Week navigation, focus restoration, semantic navigation/current state, keyboard Space/Return/Escape activation, conflict live-alert semantics, and compact 640×520 complete interactions;
- week rollover with `Missed — no response`, History source/outcome identity, qualifying progress, and a fresh list-first This Week after relaunch.

The visual side-by-side evidence remains recorded in [01 — V2 A visual parity and default workspace](01-v2-a-visual-parity-and-default-workspace.md), including the packaged 960×720, 800×640, 640×520, and detail captures under `output/playwright/personal-dashboard-v2-parity-closure/`; the final gate above re-proves those surfaces' rendered hierarchy and interaction contract directly.

The compact sheet keeps `role="dialog"`, the visual full-surface boundary, Back semantics, and focus restoration. macOS WebKit collapses the rendered Accessibility subtree when `aria-modal="true"` is applied to this surface, so the production contract deliberately keeps `aria-modal="false"` while preserving the direct packaged AX workflow; this platform boundary was verified by the final gate rather than hidden behind source-only evidence.

Supporting checks also passed: `npm run check`, `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`, `cargo test --manifest-path src-tauri/Cargo.toml` (73 tests), Swift driver compilation, shell syntax, and `git diff --check`.
