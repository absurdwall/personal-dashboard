# Personal Dashboard Mac workspace v2 — production delivery

Status: ready-for-agent
Effort: personal-dashboard-mac-workspace-v2-production

## Sole references

- Product and interaction contract: [approved v2 spec](../personal-dashboard-mac-workspace-v2/spec.md).
- Visual and interaction reference: [A — List + temporary sheet prototype](../personal-dashboard-mac-workspace/prototype/ticket-08-week-flow/).

The older v2 effort and its tickets remain historical design/fixture work. They are not a second production specification. This effort exists so that production implementation has one fresh, unambiguous ticket set.

## Outcome

The effort is complete only when launching the real packaged Mac application produces the approved v2 product:

- This Week is the default, list-first workspace; detail opens only as a temporary sheet after an explicit row action.
- The app supports the approved direct-record, unscheduled-workout, change-time, skip/undo, moved-occurrence, history, settings, persistence, responsive, and keyboard flows.
- The visible state distinguishes future, due, recorded, moved source, moved destination, skipped, unresolved, and available occurrences.
- Relaunching the app preserves the relevant local state.
- The packaged app passes the acceptance gate at the desktop, intermediate, and compact viewports.

Fixture-only tests and Rust-only tests are supporting evidence. They do not replace packaged-app acceptance.

## Non-negotiable boundaries

- Production implementation targets the real app under frontend/, src-tauri/, and scripts/acceptance/.
- The prototype under .scratch/ is read-only reference material for this effort; do not use fixture changes as evidence of production delivery.
- Preserve the existing Tauri 2, Rust, persistence, reminder, local-first, and no-typing contracts unless the v2 spec explicitly requires a change.
- Do not add dependencies, external services, cloud storage, deployment configuration, or a mobile implementation.
- Reuse existing production behavior where it already satisfies v2; each ticket is a gap-closing and evidence task, not permission for a broad rewrite.

## Ticket protocol

Implement tickets in dependency order from [map.md](map.md). A ticket may be marked resolved only when its listed production verification is complete and its Answer records the evidence. Do not mark ticket 08 resolved from fixture or unit-test results alone.
