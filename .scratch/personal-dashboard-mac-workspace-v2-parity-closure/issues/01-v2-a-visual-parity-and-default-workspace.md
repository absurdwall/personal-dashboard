# 01 — V2 A visual parity and default workspace

**What to build:** When the user launches Personal Dashboard, the default This Week surface should look and feel like prototype A — List + temporary sheet — rather than merely sharing its general concept. The visual hierarchy, palette, typography, spacing, agenda rows, status signals, unscheduled entry point, and temporary detail surface must be one coherent production surface at all supported viewport classes.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] At the desktop reference viewport, a fresh launch matches prototype A's This Week hierarchy: week context, progress, next-workout context, unscheduled entry, primary agenda, open capacity, and no automatically opened detail.
- [x] Production colors, typography, surfaces, borders, status markers, selected states, spacing, and sheet treatment are derived from the prototype reference rather than the legacy landing-page palette.
- [x] Selecting a row opens the same temporary detail pattern as prototype A; closing it returns to the same selected agenda context.
- [x] The intermediate and compact viewport classes preserve the prototype's navigation, list-first agenda, full-surface detail, and readable hierarchy.
- [x] The Answer records direct side-by-side parity evidence at all three viewport classes; implementation checks alone do not resolve this ticket.

## Answer

Implemented the A List + temporary sheet workspace in the production frontend. The fixture remains unchanged. The launch surface now uses the reference hierarchy and palette, renders date/time/status/chevron agenda rows, keeps This Week list-first at desktop and intermediate sizes, switches to the compact destination control at 640px, and uses a full-surface detail sheet with a date tile and Back action on compact. Row/card accessible names include the visible schedule and status content.

Direct packaged comparison evidence captured from the freshly rebuilt `.app`:

| Viewport | Reference | Packaged production capture | Result |
|---|---|---|---|
| Desktop 960×720 | `output/playwright/personal-dashboard-mac-workspace-v2-ticket-08-960x720.png` | `output/playwright/personal-dashboard-v2-parity-closure/packaged-960x720.png` | List-first hierarchy, progress chip, next-workout card, extra-workout entry, primary agenda, and open capacity align. |
| Intermediate 800×640 | `output/playwright/personal-dashboard-mac-workspace-v2-ticket-08-800x720.png` | `output/playwright/personal-dashboard-v2-parity-closure/packaged-800x640.png` | Icon rail and readable list hierarchy align. |
| Compact 640×520 | `output/playwright/personal-dashboard-mac-workspace-v2-ticket-08-640x520.png` | `output/playwright/personal-dashboard-v2-parity-closure/packaged-640x520.png` | Compact brand/destination select, list-first surface, and internal agenda scroll align. |
| Detail check | `output/playwright/personal-dashboard-mac-workspace-v2-ticket-08-960x720.png` | `output/playwright/personal-dashboard-v2-parity-closure/packaged-960x720-detail.png`, `packaged-640x520-detail.png` | Selection opens the temporary sheet; Close/Back returns to the selected agenda context. |

Verification completed on 2026-08-20:

- `npm run check`
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `cargo test --manifest-path src-tauri/Cargo.toml` — 73 passed
- `git diff --check`
- `npm run build:mac`
- `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=shell scripts/acceptance/macos-ipc-workflow.sh` — packaged desktop, intermediate, compact-scroll, and row-selection checks passed
- Direct visual inspection of the fixture and packaged captures above
