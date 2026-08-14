# Tauri-only Personal Dashboard cutover

This record establishes the private Apple Silicon Mac release as the sole
active Personal Dashboard implementation while preserving the completed
Python baseline as immutable Git evidence.

## Completed behavior parity

The completed baseline's 20 highest-level scenarios map to tests that drive the
public Rust application services with isolated persistence, controllable time,
and notification or file adapters. Assertions remain at visible dashboard,
action, reminder, relaunch, and recovery outcomes.

| Completed baseline scenario | Active Tauri application evidence |
| --- | --- |
| Fresh plan, relaunch, and closed-window reminder intent | `fresh_exercise_week_survives_relaunch_and_emits_the_first_departure_reminder` |
| Departure response or one follow-up after silence | `confirming_departure_persists_the_response_and_one_record_workout_reminder`; `silence_receives_one_follow_up_and_remains_unresolved_after_relaunch` |
| Four-selection workout record and persisted progress | `eligible_departure_records_a_qualifying_workout_in_four_established_selections` |
| Mixed qualifying sources, suppression, and optional extra workout | `mixed_sources_complete_the_goal_and_allow_an_optional_extra_workout` |
| Old-schema in-progress workout resumes | `old_schema_in_progress_workout_resumes_through_the_current_application` |
| Goal suppresses primary and assigned-fallback reminders | `reaching_the_goal_cancels_and_suppresses_remaining_planned_obligations` |
| Move to ordered fallback or skip with preset reasons | `departures_move_to_ordered_fallbacks_or_skip_with_the_complete_preset_reason_set` |
| Recovery ignores fallbacks that have passed | `recovery_ignores_expired_fallbacks_and_abandoned_reason_selection` |
| Abandoned reason choice does not block the next week | `recovery_ignores_expired_fallbacks_and_abandoned_reason_selection` |
| Week rollover closes unanswered departures and repeats the plan | `week_rollover_closes_unanswered_departures_and_repeats_the_routine` |
| Rollover preserves completed, short, moved, skipped, and missed outcomes | `week_rollover_preserves_completed_short_moved_skipped_and_missed_history` |
| Goal-suppressed departures do not become missed | `week_rollover_preserves_goal_suppressed_slots_as_not_needed` |
| Ignored reminder before later success remains missed | `week_rollover_keeps_an_ignored_reminder_before_later_success_as_missed` |
| Upcoming primary departure changes for one week | `upcoming_primary_departure_adjusts_this_week_and_replaces_its_reminders` |
| Deliberate routine change applies only to future weeks | `deliberate_routine_change_applies_to_future_weeks_without_rewriting_this_week` |
| Unchanged routine repeats without a settings save | `week_rollover_closes_unanswered_departures_and_repeats_the_routine` |
| History correction recomputes progress across weeks | `correcting_current_and_historical_records_recomputes_the_owning_week` |
| Confirmed history deletion recomputes progress | `deleting_history_requires_confirmation_and_recomputes_historical_success` |
| Complete profile exports and restores after confirmation | `complete_profile_backup_restores_only_after_confirmation` |
| Invalid backup cannot replace valid local state | `cancelled_invalid_or_unsupported_restore_keeps_the_active_profile` |

The exercise tests live in `src-tauri/tests/application_workflow.rs`; complete
profile file behavior lives in `src-tauri/tests/profile_backup_workflow.rs`.
Baseline migration and authoritative profile movement use the same application
altitude in their dedicated workflow suites.

## Mac release evidence

- The release build produces an ad-hoc-signed arm64
  `Personal Dashboard.app`. Packaged launch acceptance relocates a copy and
  opens it through Launch Services with isolated profile and baseline paths.
- The running process contains and links no Python runtime, launches no Python
  or local-server child, and opens no listening TCP socket.
- Relaunch persistence, native backup save and restore selection, cancellation,
  confirmed replacement, and invalid-file safety passed with isolated profiles
  on 2026-08-14. See `macos-minimal-profile.md`.
- Distinct profile move save/import panels, source inactivity across relaunch,
  destination activation, cancellation, and recovery passed on 2026-08-14.
  See `macos-profile-move.md`.
- Native notification delivery passed with the only window closed on
  2026-08-12. Delivery after a normal Quit also succeeded in that observation,
  but remains explicitly non-gating. See `macos-notification-capability.md`.
- Automatic schema-v5 baseline adoption, unchanged source bytes, exactly-once
  relaunch behavior, and controlled invalid-input blocking passed on
  2026-08-14. See `macos-baseline-migration.md`.

## Mobile-path gates retained

- **iPad:** Personal Dashboard 0.1.0 was signed through the user's Xcode
  Personal Team, installed, launched, and visibly rendered offline on an iPad
  (A16), product `iPad15,7`, running iPadOS 26.5.2.
- **Samsung:** the ARM64 debug APK was installed, cold-launched, and visibly
  rendered offline on a Samsung Galaxy S24 (`SM-S921U`) running Android 16,
  API 36, One UI 8.0, with the `arm64-v8a` ABI.

These gates establish toolchain, physical installation, launch, and shared
interface reachability. They do not claim mobile exercise parity, notification
parity, profile transfer, distribution readiness, or production mobile layout.
On 2026-08-14, the final shared code still passed an `aarch64-apple-ios` core
check and produced an unsigned ARM64 iOS archive, and it produced the ARM64
Android debug APK with the recorded OpenJDK 21 and NDK 29 toolchain. The
physical-device observations above remain the acceptance evidence; the final
cutover did not repeat provisioning or installation.

## Active product and recovery boundary

The current checkout contains no Python dashboard, localhost server, Python
reminder runner, or Python application-workflow suite. `npm run
accept:cutover` enforces that source boundary and verifies that the annotated
tag `python-exercise-tracker-complete` still resolves to commit
`7856f5019f69a62fbb168e38a03f328c8d0cb983`.

The schema-v5 fixture remains because the active Rust migration suite uses it
as data evidence. The completed source and its original 20-scenario suite can
be inspected or run only from a temporary detached worktree at the annotated
tag; they are not a second maintained edition.

The private release does not add Developer ID signing, notarization, a DMG,
App Store distribution, automatic updates, telemetry, accounts, cloud storage,
synchronization, a second feature area, or a generic dashboard framework.
