# PDEX-22 implementation and verification — 2026-10-14

**Status:** code implementation committed; ticket lifecycle remains `in-progress` pending packaged acceptance under PDEX-26.

## Git lineage

- Requested clean source history: `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- Integration branch at claim: `codex/dashboard-experience-refinement-restart-20261014`, commit `2ef5d0e0fef34f8a6a4ebbb383eb886a7a1699b6`.
- Ticket branch: `codex/pdex-22-restart`.
- Ticket worktree: `/private/tmp/pdex-restart-20261014.noindex/pdex-22`.
- Claim commit: `a42c827b37591ba11980a283b4da332c426f0274`.
- Implementation history, retained without squashing:
  - `135add3cddfe51c15e8c820f0d71aaf6f536cf59` — replace the large Calendar create form with the selected-date Task dialog, add compact Task details, and add saved holiday preferences and display.
  - `41031c52af66c8a4b30c17275272f8e4eb4123c8` — commit the local holiday-date catalog imported by the Calendar renderer.
- No code or history was copied from the rejected post-`918e7e0` implementation.

## Implemented scope

- Kept the Calendar month and selected-date summary layout. Its top plus opens the shared Task creation dialog with the selected date and name focus; the former large bottom creation form is removed.
- Calendar Task previews open the shared editable Task surface without selecting another date. Date selection and Task opening have separate controls.
- Added local China and U.S. holiday labels for 2026 and 2027, compact overflow treatment, global and per-region switches, and app-local persistence. Unsupported years return no labels.
- The holiday list is read-only and does not write Tasks, Daily Records, reminders, or workday status. Verified sources and coverage limits are documented in `docs/calendar-holidays-v1.md`.
- Kept typography and spacing within existing Dashboard tokens and controls; no new dependency, service, or deployment setting was added.

## Verification

- `npm run build` — passed.
- Focused frontend/browser run, filtered to Calendar, holidays, and the packaged Task label check — **16/16 passed**:
  `node --test --test-name-pattern='Calendar|calendar|holiday|packaged task creation fields' tests/frontend/compact-calendar.test.ts tests/frontend/calendar-holidays.test.ts tests/frontend/task-surface.test.ts tests/frontend/docked-sidebars.test.ts tests/frontend/packaged-acceptance.test.ts`
- `cargo test --manifest-path src-tauri/Cargo.toml --test calendar_holiday_preferences_workflow` — **2/2 passed**, including persistence across a new application instance and recovery from a corrupt preferences file.
- `cargo test --manifest-path src-tauri/Cargo.toml calendar_holiday -- --nocapture` — **1/1 passed** for save/read from the actual app-local file path.
- Targeted `rustfmt --check`, `bash -n scripts/acceptance/macos-ipc-workflow.sh`, and `git diff --check` — passed.
- An earlier broader frontend diagnostic exposed two unchanged, out-of-scope baseline assertions: a Today quick-schedule minimum input-width expectation and a Tasks row-gap expectation. This ticket did not change those surfaces. The broad suite was not rerun after the targeted repairs; this record does not claim a full-suite pass.

## Acceptance boundary

The focused tests use the production frontend with synthetic IPC fixtures; Rust workflow tests exercise app-local persistence. No packaged App install, normal user Vault, remote Git operation, or human App acceptance was performed. PDEX-22 remains `in-progress`; PDEX-26 owns packaged acceptance. No main merge, push, or parent-spec closure is claimed.
