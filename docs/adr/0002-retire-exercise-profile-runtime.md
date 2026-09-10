---
status: accepted
---

# Retire the Exercise and Profile runtime from Personal Dashboard 2.0

Keep the Tauri 2 application foundation, but make Daily Records and Habits the
single current product context. Personal Dashboard 2.0 ships only Today,
Calendar, and Habits; it does not initialize, expose, recreate, or automatically
migrate the former Exercise/Profile runtime. The old Rust modules remain only
as bounded historical parsers and regression seams required for an explicit,
auditable cutover. This decision supersedes ADR-0001's Exercise-first scope and
automatic migration behavior because current exercise capture belongs in dated
Daily Record notes, while silently reviving either old state model would violate
the cutover boundary.

## Consequences

- Normal startup must not read or write `profile.json` or `exercise.json`.
- Retirement requires a separately authorized, evidence-gated cutover; a marker
  alone never proves launchd, notification, installed UI, or producer state.
- Reintroducing an Exercise/Profile product context requires a new decision,
  not reuse of the retained historical modules by convenience.
