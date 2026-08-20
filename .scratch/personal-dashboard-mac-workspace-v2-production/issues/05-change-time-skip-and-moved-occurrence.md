# 05 — Complete change-time, skip/undo, and moved-occurrence semantics

Type: task
Status: resolved
Blocked by: 01, 02, 03

## Goal

Implement and prove the v2 exception model on the real app. Changing time moves the original occurrence and creates an independent destination; skip and undo change only the selected occurrence. None of these actions may silently change the routine or create duplicate recordable rows.

## Production surface

Primary targets are frontend/main.ts, frontend/index.html, frontend/styles.css, src-tauri/src/exercise.rs, src-tauri/src/lib.rs, and the production workflow/acceptance tests.

## Required work

- [x] Show Change time only where the occurrence is eligible, and offer only future eligible slots.
- [x] Detect conflicts for every occupied target slot, not only one weekday; require an explicit confirmation before applying a conflicting move.
- [x] Preserve the source occurrence as moved/non-recordable and expose the moved destination as the independent scheduled occurrence.
- [x] Ensure the moved original has no Record, Change time, Skip, or Undo action, while the destination can become directly recordable when due.
- [x] Implement Skip and Undo without requiring a reason, preserving routine definition and unrelated occurrences.
- [x] Keep reminders, dashboard state, source binding, and relaunch behavior coherent after each mutation.
- [x] Verify all exception actions restore the user to the selected agenda context; detailed focus behavior is ticket 06.

## Acceptance

- [x] Past or otherwise ineligible time choices never appear in the real production UI.
- [x] Every occupied target slot triggers the same explicit conflict-confirmation contract.
- [x] After a move, the source and destination are visibly distinct and only the destination can be recorded.
- [x] Skip removes the occurrence from the active recordable path; Undo restores it without changing the routine.
- [x] Production tests and a real-app scenario cover move, conflict, skip, undo, destination recording, and relaunch.

## Boundaries

Do not “fix” this by changing the fixture. Do not add typed reasons, cloud synchronization, or an unrelated schedule redesign.

## Comments

### Implementation

- Kept the existing production exception seam and made the occupancy rule explicit in `departure_occupies_target_slot`: scheduled/leaving occurrences and occurrences with a bound workout record occupy a target time, while moved/skipped/available rows do not.
- Added `change_time_requires_the_same_confirmation_for_adjusted_and_assigned_targets`, covering a moved adjusted destination and an assigned fallback target with the same preview warning, rejection without `confirm_conflict`, and successful explicit confirmation.
- Added `moved_destination_skip_and_undo_preserve_source_binding_and_recordability`, proving that a moved destination can be skipped without a reason, persists through relaunch, and becomes directly recordable again after Undo while the original remains moved, the workout record binds to the destination slot, progress updates once, the routine stays unchanged, and the target reminder cancellation/reconciliation remains coherent. With granted reminders, the due target may be `Unresolved` after its follow-up while its direct Record action remains available.
- Extended the packaged exception workflow with moved-destination Skip/Undo coverage, explicit absence checks for past Monday choices, and selected-row context assertions with `aria-pressed`; detailed keyboard focus remains owned by ticket 06.

### Verification

Passed:

- `npm run check`
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `bash -n scripts/acceptance/macos-ipc-workflow.sh`
- `cargo test --manifest-path src-tauri/Cargo.toml` — 73 tests passed across the Rust unit, application, migration, backup, and move suites.
- `npm run build:mac` — rebuilt `src-tauri/target/release/bundle/macos/Personal Dashboard.app`.

Unlocked packaged-app evidence was completed through the real Tauri window before macOS automatically re-locked: future-only Change-time choices and weekend suggestions, an independent Tuesday destination, moved-destination Skip/Undo, an occupied Wednesday conflict requiring explicit Confirm, direct recording of the confirmed Wednesday destination, `1 of 3 completed`, and relaunch persistence of the moved source and recorded destination. The repository Accessibility driver reached the same Skip/Undo path; its remaining focus assertion is intentionally ticket 06 scope. A later scripted rerun was stopped by the automatic lock screen before the initial rendered state, so no post-lock script result is claimed as a pass.

## Answer

Resolved with complete local-first change-time, conflict, Skip/Undo, and moved-occurrence semantics. The original occurrence remains visibly moved and non-recordable, each destination is independent and directly recordable when due, occupied adjusted/fallback targets require the same explicit confirmation, and reminder/source/progress state survives relaunch. The production tests and unlocked packaged-app workflow cover the required exception path without adding reasons, dependencies, cloud state, or schedule redesign.
