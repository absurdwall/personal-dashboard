use personal_dashboard_lib::backup::{CompleteProfileReplacement, ProfileBackupApplication};
use personal_dashboard_lib::exercise::{ExerciseApplication, ExerciseClock, ExercisePersistence};
use personal_dashboard_lib::notification::{
    NotificationIntent, NotificationPermission, NotificationPlatform,
};
use personal_dashboard_lib::profile::{ProfileApplication, ProfileExchange, ProfilePersistence};
use std::collections::HashSet;
use std::sync::{Arc, Mutex};

#[derive(Clone, Default)]
struct MemoryDocument {
    document: Arc<Mutex<Option<Vec<u8>>>>,
    fail_next_load: Arc<Mutex<Option<String>>>,
}

impl MemoryDocument {
    fn fail_next_load(&self, message: &str) {
        *self.fail_next_load.lock().unwrap() = Some(message.into());
    }
}

impl ProfilePersistence for MemoryDocument {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        if let Some(error) = self.fail_next_load.lock().unwrap().take() {
            return Err(error);
        }
        Ok(self.document.lock().unwrap().clone())
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        *self.document.lock().unwrap() = Some(document.to_vec());
        Ok(())
    }
}

impl ExercisePersistence for MemoryDocument {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        if let Some(error) = self.fail_next_load.lock().unwrap().take() {
            return Err(error);
        }
        Ok(self.document.lock().unwrap().clone())
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        *self.document.lock().unwrap() = Some(document.to_vec());
        Ok(())
    }
}

#[derive(Clone)]
struct MemoryReplacement {
    profile: MemoryDocument,
    exercise: MemoryDocument,
    fail: Arc<Mutex<bool>>,
}

impl MemoryReplacement {
    fn new(profile: MemoryDocument, exercise: MemoryDocument) -> Self {
        Self {
            profile,
            exercise,
            fail: Arc::new(Mutex::new(false)),
        }
    }
}

impl CompleteProfileReplacement for MemoryReplacement {
    fn replace_complete(&self, profile: &[u8], exercise: &[u8]) -> Result<(), String> {
        if *self.fail.lock().unwrap() {
            return Err("The complete profile could not be replaced.".into());
        }
        let mut active_profile = self.profile.document.lock().unwrap();
        let mut active_exercise = self.exercise.document.lock().unwrap();
        *active_profile = Some(profile.to_vec());
        *active_exercise = Some(exercise.to_vec());
        Ok(())
    }
}

#[derive(Clone, Default)]
struct MemoryExchange {
    exported_document: Arc<Mutex<Option<Vec<u8>>>>,
    import_document: Arc<Mutex<Option<Vec<u8>>>>,
}

impl ProfileExchange for MemoryExchange {
    fn export(&self, document: &[u8]) -> Result<bool, String> {
        *self.exported_document.lock().unwrap() = Some(document.to_vec());
        Ok(true)
    }

    fn import(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(self.import_document.lock().unwrap().take())
    }
}

#[derive(Clone)]
struct FixedNewYorkClock {
    now_epoch_millis: Arc<Mutex<i64>>,
}

impl FixedNewYorkClock {
    fn at(now_epoch_millis: i64) -> Self {
        Self {
            now_epoch_millis: Arc::new(Mutex::new(now_epoch_millis)),
        }
    }

    fn advance_to(&self, now_epoch_millis: i64) {
        *self.now_epoch_millis.lock().unwrap() = now_epoch_millis;
    }
}

impl ExerciseClock for FixedNewYorkClock {
    fn now_epoch_millis(&self) -> i64 {
        *self.now_epoch_millis.lock().unwrap()
    }

    fn utc_offset_minutes_at(&self, _epoch_millis: i64) -> i32 {
        -4 * 60
    }
}

#[derive(Clone)]
struct FixedOffsetClock {
    now_epoch_millis: i64,
    offset_minutes: i32,
}

impl FixedOffsetClock {
    fn at(now_epoch_millis: i64, offset_minutes: i32) -> Self {
        Self {
            now_epoch_millis,
            offset_minutes,
        }
    }
}

impl ExerciseClock for FixedOffsetClock {
    fn now_epoch_millis(&self) -> i64 {
        self.now_epoch_millis
    }

    fn utc_offset_minutes_at(&self, _epoch_millis: i64) -> i32 {
        self.offset_minutes
    }
}

#[derive(Clone, Default)]
struct ReminderOutbox {
    scheduled: Arc<Mutex<Vec<NotificationIntent>>>,
    cancelled: Arc<Mutex<Vec<String>>>,
    active: Arc<Mutex<HashSet<String>>>,
    fail_cancel: Arc<Mutex<bool>>,
    fail_schedule_after: Arc<Mutex<Option<usize>>>,
}

impl ReminderOutbox {
    fn fail_scheduling_after(&self, successful_schedules: usize) {
        *self.fail_schedule_after.lock().unwrap() = Some(successful_schedules);
    }
}

impl NotificationPlatform for ReminderOutbox {
    fn permission(&self) -> Result<NotificationPermission, String> {
        Ok(NotificationPermission::Granted)
    }

    fn request_permission(&self) -> Result<NotificationPermission, String> {
        Ok(NotificationPermission::Granted)
    }

    fn schedule(&self, intent: NotificationIntent) -> Result<(), String> {
        let mut remaining = self.fail_schedule_after.lock().unwrap();
        if let Some(countdown) = remaining.as_mut() {
            if *countdown == 0 {
                return Err("The exercise reminder could not be scheduled.".into());
            }
            *countdown -= 1;
        }
        drop(remaining);
        let notification_id = intent.id.clone();
        self.scheduled.lock().unwrap().push(intent);
        self.active.lock().unwrap().insert(notification_id);
        Ok(())
    }

    fn cancel(&self, id: &str) -> Result<(), String> {
        if *self.fail_cancel.lock().unwrap() {
            return Err("The exercise reminder could not be cancelled.".into());
        }
        self.cancelled.lock().unwrap().push(id.into());
        self.active.lock().unwrap().remove(id);
        Ok(())
    }
}

fn record_unscheduled_workout<C: ExerciseClock>(
    application: &ExerciseApplication<MemoryDocument, ReminderOutbox, C>,
    activity: &str,
    duration: &str,
    effort: &str,
) {
    application.start_unscheduled_workout_record().unwrap();
    application
        .choose_workout_activity("unscheduled", activity)
        .unwrap();
    application
        .choose_workout_duration("unscheduled", duration)
        .unwrap();
    application
        .complete_workout_record("unscheduled", effort)
        .unwrap();
}

#[test]
fn backup_restore_rebases_future_reminders_but_preserves_historical_instants_across_zones() {
    let now = 1_786_366_800_000;
    let source_clock = FixedOffsetClock::at(now, -4 * 60);
    let source_profile = MemoryDocument::default();
    let source_exercise = MemoryDocument::default();
    let source_exchange = MemoryExchange::default();
    let source_reminders = ReminderOutbox::default();
    let source_profile_application =
        ProfileApplication::new(source_profile.clone(), source_exchange.clone());
    let source_exercise_application = ExerciseApplication::new(
        source_exercise.clone(),
        source_reminders.clone(),
        source_clock.clone(),
    );
    source_profile_application
        .update_profile_label("Portable source profile".into())
        .unwrap();
    source_exercise_application.open().unwrap();
    record_unscheduled_workout(
        &source_exercise_application,
        "Weight training",
        "30",
        "Moderate",
    );
    let source_dashboard = source_exercise_application.open().unwrap();
    let source_backup = ProfileBackupApplication::new(
        source_profile.clone(),
        source_exercise.clone(),
        source_exchange.clone(),
        source_reminders,
        source_clock,
        MemoryReplacement::new(source_profile.clone(), source_exercise.clone()),
    );
    source_backup.backup_profile().unwrap();
    let backup_document = source_exchange
        .exported_document
        .lock()
        .unwrap()
        .clone()
        .unwrap();
    let source_json: serde_json::Value = serde_json::from_slice(&backup_document).unwrap();
    let source_record = &source_json["exercise"]["weeks"][0]["workout_records"][0];

    let target_clock = FixedOffsetClock::at(now, 9 * 60);
    let target_profile = MemoryDocument::default();
    let target_exercise = MemoryDocument::default();
    let target_exchange = MemoryExchange::default();
    let target_reminders = ReminderOutbox::default();
    let target_profile_application =
        ProfileApplication::new(target_profile.clone(), target_exchange.clone());
    let target_exercise_application = ExerciseApplication::new(
        target_exercise.clone(),
        target_reminders.clone(),
        target_clock.clone(),
    );
    target_profile_application
        .update_profile_label("Destination profile".into())
        .unwrap();
    target_exercise_application.open().unwrap();
    *target_exchange.import_document.lock().unwrap() = Some(backup_document);
    let target_backup = ProfileBackupApplication::new(
        target_profile.clone(),
        target_exercise.clone(),
        target_exchange,
        target_reminders.clone(),
        target_clock.clone(),
        MemoryReplacement::new(target_profile.clone(), target_exercise.clone()),
    );

    target_backup.select_profile_restore().unwrap();
    target_backup.confirm_profile_restore().unwrap();
    let target_dashboard = target_exercise_application.open().unwrap();
    let target_json: serde_json::Value =
        serde_json::from_slice(&target_exercise.document.lock().unwrap().clone().unwrap()).unwrap();
    let target_record = &target_json["weeks"][0]["workout_records"][0];

    assert_eq!(
        source_dashboard
            .primary_departures
            .iter()
            .map(|departure| (&departure.day, &departure.time))
            .collect::<Vec<_>>(),
        target_dashboard
            .primary_departures
            .iter()
            .map(|departure| (&departure.day, &departure.time))
            .collect::<Vec<_>>()
    );
    assert_eq!(
        source_record["recorded_at_epoch_millis"],
        target_record["recorded_at_epoch_millis"]
    );
    assert_eq!(-4 * 60, target_record["recorded_at_utc_offset_minutes"]);
    let source_deliver_at = source_dashboard
        .reminder_intent
        .as_ref()
        .unwrap()
        .deliver_at_epoch_millis;
    let target_deliver_at = target_dashboard
        .reminder_intent
        .as_ref()
        .unwrap()
        .deliver_at_epoch_millis;
    assert_ne!(source_deliver_at, target_deliver_at);
    assert!(target_reminders
        .scheduled
        .lock()
        .unwrap()
        .iter()
        .any(|intent| intent.deliver_at_epoch_millis == target_deliver_at));

    let scheduled_after_restore = target_reminders.scheduled.lock().unwrap().len();
    ExerciseApplication::new(target_exercise, target_reminders.clone(), target_clock)
        .open()
        .unwrap();
    assert_eq!(
        scheduled_after_restore,
        target_reminders.scheduled.lock().unwrap().len()
    );
}

#[test]
fn complete_profile_backup_restores_only_after_confirmation() {
    let source_profile = MemoryDocument::default();
    let source_exercise = MemoryDocument::default();
    let source_exchange = MemoryExchange::default();
    let source_reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_366_800_000);
    let source_profile_application =
        ProfileApplication::new(source_profile.clone(), source_exchange.clone());
    let source_exercise_application = ExerciseApplication::new(
        source_exercise.clone(),
        source_reminders.clone(),
        clock.clone(),
    );

    source_profile_application
        .update_profile_label("Complete exercise profile".into())
        .unwrap();
    source_exercise_application.open().unwrap();
    record_unscheduled_workout(
        &source_exercise_application,
        "Weight training",
        "30",
        "Moderate",
    );
    record_unscheduled_workout(
        &source_exercise_application,
        "Other exercise",
        "Under 20",
        "Easy",
    );
    record_unscheduled_workout(&source_exercise_application, "Elliptical", "20", "Hard");
    let history_changes = source_exercise_application.open().unwrap();
    let corrected_record_id = history_changes
        .workout_records
        .iter()
        .find(|record| record.activity == "Weight training")
        .unwrap()
        .id
        .clone();
    let deleted_record_id = history_changes
        .workout_records
        .iter()
        .find(|record| record.activity == "Elliptical")
        .unwrap()
        .id
        .clone();
    source_exercise_application
        .correct_workout_record(&corrected_record_id, "Weight training", "45", "Very hard")
        .unwrap();
    source_exercise_application
        .confirm_workout_record_deletion(&deleted_record_id)
        .unwrap();
    source_exercise_application
        .adjust_current_week_departure("2026-08-10-primary-3", "Sunday", "17:30")
        .unwrap();
    source_exercise_application
        .change_repeating_primary_departure(1, "Tuesday", "15:30")
        .unwrap();
    clock.advance_to(1_786_392_000_000);
    source_exercise_application.open().unwrap();
    source_exercise_application
        .confirm_departure_decision("2026-08-10-primary-1", "move-to-fallback", "Work ran late")
        .unwrap();
    clock.advance_to(1_786_564_800_000);
    source_exercise_application.open().unwrap();
    source_exercise_application
        .respond_to_departure("2026-08-10-primary-2", "leaving-for-gym")
        .unwrap();
    clock.advance_to(1_786_570_200_000);
    source_exercise_application
        .start_workout_record("2026-08-10-primary-2")
        .unwrap();
    source_exercise_application
        .choose_workout_activity("2026-08-10-primary-2", "Elliptical")
        .unwrap();
    source_exercise_application
        .choose_workout_duration("2026-08-10-primary-2", "Under 20")
        .unwrap();
    source_exercise_application
        .complete_workout_record("2026-08-10-primary-2", "Easy")
        .unwrap();
    clock.advance_to(1_786_971_600_000);
    let source_dashboard = source_exercise_application.open().unwrap();
    let backed_up_week = &source_dashboard.history[0];
    assert_eq!(
        vec![
            "Moved to Saturday · Work ran late",
            "Completed",
            "Missed — no response",
        ],
        backed_up_week
            .primary_departures
            .iter()
            .map(|departure| departure.status.as_str())
            .collect::<Vec<_>>()
    );
    assert!(backed_up_week
        .fallback_departures
        .iter()
        .any(|departure| departure.availability == "Assigned from Monday · Missed — no response"));
    assert!(backed_up_week.workout_records.iter().any(|record| {
        record.id == corrected_record_id
            && record.duration == "45"
            && record.effort == "Very hard"
            && record.outcome == "Counts toward weekly progress"
    }));
    assert!(backed_up_week.workout_records.iter().any(|record| {
        record.activity == "Other exercise"
            && record.duration == "Under 20"
            && record.outcome == "Short effort — does not count toward weekly progress"
    }));
    assert!(backed_up_week
        .workout_records
        .iter()
        .all(|record| record.id != deleted_record_id));
    let source_profile_view = source_profile_application.open().unwrap();
    let source_scheduled_before = source_reminders.scheduled.lock().unwrap().len();
    let source_cancelled_before = source_reminders.cancelled.lock().unwrap().len();

    let source_backup = ProfileBackupApplication::new(
        source_profile.clone(),
        source_exercise.clone(),
        source_exchange.clone(),
        source_reminders.clone(),
        clock.clone(),
        MemoryReplacement::new(source_profile.clone(), source_exercise.clone()),
    );
    assert_eq!(
        "Profile backup saved.",
        source_backup.backup_profile().unwrap().message
    );
    assert_eq!(
        source_profile_view,
        source_profile_application.open().unwrap()
    );
    assert_eq!(
        source_dashboard,
        source_exercise_application.open().unwrap()
    );
    assert_eq!(
        source_scheduled_before,
        source_reminders.scheduled.lock().unwrap().len()
    );
    assert_eq!(
        source_cancelled_before,
        source_reminders.cancelled.lock().unwrap().len()
    );

    let target_profile = MemoryDocument::default();
    let target_exercise = MemoryDocument::default();
    let target_exchange = MemoryExchange::default();
    let target_reminders = ReminderOutbox::default();
    let target_profile_application =
        ProfileApplication::new(target_profile.clone(), target_exchange.clone());
    let target_exercise_application = ExerciseApplication::new(
        target_exercise.clone(),
        target_reminders.clone(),
        clock.clone(),
    );
    target_profile_application
        .update_profile_label("Keep until confirmed".into())
        .unwrap();
    let target_dashboard_before = target_exercise_application.open().unwrap();
    let target_profile_before = target_profile_application.open().unwrap();
    *target_exchange.import_document.lock().unwrap() =
        source_exchange.exported_document.lock().unwrap().clone();
    let target_backup = ProfileBackupApplication::new(
        target_profile.clone(),
        target_exercise.clone(),
        target_exchange,
        target_reminders.clone(),
        clock,
        MemoryReplacement::new(target_profile.clone(), target_exercise.clone()),
    );

    let selection = target_backup.select_profile_restore().unwrap();
    assert!(selection.confirmation_required);
    let preview = selection.preview.unwrap();
    assert_eq!(source_profile_view, preview.profile);
    let preview_week = preview.exercise.current_week.as_ref().unwrap();
    assert_eq!("2026-08-17", preview_week.week_start);
    assert_eq!("2026-08-23", preview_week.week_end);
    assert_eq!(
        source_dashboard.progress,
        format!(
            "{} of {} completed",
            preview_week.completed_count, preview_week.weekly_goal
        )
    );
    assert_eq!(
        source_dashboard.history.len(),
        preview.exercise.historical_week_count
    );
    assert_eq!(
        target_profile_before,
        target_profile_application.open().unwrap()
    );
    assert_eq!(
        target_dashboard_before,
        target_exercise_application.open().unwrap()
    );

    let restored = target_backup.confirm_profile_restore().unwrap();
    assert_eq!("Profile restored.", restored.message);
    assert_eq!(source_profile_view, restored.profile);
    assert_eq!(source_dashboard, restored.dashboard);
    assert_eq!(
        source_profile_view,
        target_profile_application.open().unwrap()
    );
    assert_eq!(
        source_dashboard,
        target_exercise_application.open().unwrap()
    );
    assert!(target_reminders
        .active
        .lock()
        .unwrap()
        .contains(&source_dashboard.reminder_intent.as_ref().unwrap().id));
    assert!(target_reminders
        .cancelled
        .lock()
        .unwrap()
        .contains(&"exercise-departure-2026-08-17-primary-1".to_string()));
    assert!(target_reminders
        .scheduled
        .lock()
        .unwrap()
        .iter()
        .any(|intent| Some(intent) == source_dashboard.reminder_intent.as_ref()));
}

#[test]
fn cancelled_invalid_or_unsupported_restore_keeps_the_active_profile() {
    let profile = MemoryDocument::default();
    let exercise = MemoryDocument::default();
    let exchange = MemoryExchange::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_971_600_000);
    let profile_application = ProfileApplication::new(profile.clone(), exchange.clone());
    let exercise_application =
        ExerciseApplication::new(exercise.clone(), reminders.clone(), clock.clone());
    profile_application
        .update_profile_label("Active profile".into())
        .unwrap();
    exercise_application.open().unwrap();
    record_unscheduled_workout(&exercise_application, "Other exercise", "Under 20", "Easy");
    let replacement = MemoryReplacement::new(profile.clone(), exercise.clone());
    let backup = ProfileBackupApplication::new(
        profile.clone(),
        exercise.clone(),
        exchange.clone(),
        reminders,
        clock,
        replacement.clone(),
    );
    backup.backup_profile().unwrap();
    let valid_backup = exchange.exported_document.lock().unwrap().clone().unwrap();
    let active_profile = profile_application.open().unwrap();
    let active_dashboard = exercise_application.open().unwrap();

    assert!(
        !backup
            .select_profile_restore()
            .unwrap()
            .confirmation_required
    );
    assert_eq!(active_profile, profile_application.open().unwrap());
    assert_eq!(active_dashboard, exercise_application.open().unwrap());

    *exchange.import_document.lock().unwrap() = Some(valid_backup.clone());
    assert!(
        backup
            .select_profile_restore()
            .unwrap()
            .confirmation_required
    );
    assert!(
        !backup
            .cancel_profile_restore()
            .unwrap()
            .confirmation_required
    );
    assert_eq!(
        "No validated profile restore is awaiting confirmation.",
        backup.confirm_profile_restore().unwrap_err()
    );

    *exchange.import_document.lock().unwrap() = Some(valid_backup.clone());
    assert!(
        backup
            .select_profile_restore()
            .unwrap()
            .confirmation_required
    );
    exercise.fail_next_load("The active exercise profile could not be read.");
    assert_eq!(
        "The active exercise profile could not be read.",
        backup.confirm_profile_restore().unwrap_err()
    );
    assert!(
        !backup
            .cancel_profile_restore()
            .unwrap()
            .confirmation_required
    );
    assert_eq!(active_profile, profile_application.open().unwrap());
    assert_eq!(active_dashboard, exercise_application.open().unwrap());

    *exchange.import_document.lock().unwrap() = Some(valid_backup.clone());
    assert!(
        backup
            .select_profile_restore()
            .unwrap()
            .confirmation_required
    );
    *exchange.import_document.lock().unwrap() = Some(b"not json".to_vec());
    assert_eq!(
        "The selected file is not a valid Personal Dashboard backup.",
        backup.select_profile_restore().unwrap_err()
    );
    assert_eq!(
        "No validated profile restore is awaiting confirmation.",
        backup.confirm_profile_restore().unwrap_err()
    );

    *exchange.import_document.lock().unwrap() = Some(valid_backup.clone());
    assert!(
        backup
            .select_profile_restore()
            .unwrap()
            .confirmation_required
    );
    *replacement.fail.lock().unwrap() = true;
    assert_eq!(
        "The complete profile could not be replaced.",
        backup.confirm_profile_restore().unwrap_err()
    );
    assert_eq!(active_profile, profile_application.open().unwrap());
    assert_eq!(active_dashboard, exercise_application.open().unwrap());
    *replacement.fail.lock().unwrap() = false;
    backup.cancel_profile_restore().unwrap();

    let mut invalid_week: serde_json::Value = serde_json::from_slice(&valid_backup).unwrap();
    invalid_week["exercise"]["weeks"][0]["week_end"] = "invalid".into();
    *exchange.import_document.lock().unwrap() = Some(serde_json::to_vec(&invalid_week).unwrap());
    assert_eq!(
        "The saved exercise week is not valid.",
        backup.select_profile_restore().unwrap_err()
    );
    assert_eq!(
        "No validated profile restore is awaiting confirmation.",
        backup.confirm_profile_restore().unwrap_err()
    );

    let mut invalid_timestamp: serde_json::Value = serde_json::from_slice(&valid_backup).unwrap();
    invalid_timestamp["exercise"]["weeks"][0]["primary_departures"][0]
        ["departure_at_epoch_millis"] = 0.into();
    *exchange.import_document.lock().unwrap() =
        Some(serde_json::to_vec(&invalid_timestamp).unwrap());
    assert_eq!(
        "The saved exercise timestamps are not valid.",
        backup.select_profile_restore().unwrap_err()
    );
    assert_eq!(active_profile, profile_application.open().unwrap());
    assert_eq!(active_dashboard, exercise_application.open().unwrap());

    let mut invalid_offset: serde_json::Value = serde_json::from_slice(&valid_backup).unwrap();
    invalid_offset["exercise"]["weeks"][0]["primary_departures"][0]
        ["departure_utc_offset_minutes"] = 0.into();
    *exchange.import_document.lock().unwrap() = Some(serde_json::to_vec(&invalid_offset).unwrap());
    assert_eq!(
        "The saved exercise timestamps are not valid.",
        backup.select_profile_restore().unwrap_err()
    );

    let mut unsupported: serde_json::Value = serde_json::from_slice(&valid_backup).unwrap();
    unsupported["schema_version"] = 99.into();
    *exchange.import_document.lock().unwrap() = Some(serde_json::to_vec(&unsupported).unwrap());
    assert_eq!(
        "Unsupported profile backup schema version: 99",
        backup.select_profile_restore().unwrap_err()
    );
    assert_eq!(active_profile, profile_application.open().unwrap());
    assert_eq!(active_dashboard, exercise_application.open().unwrap());
}

#[test]
fn confirmed_restore_recovers_after_native_effect_failure_and_is_idempotent() {
    let clock = FixedNewYorkClock::at(1_786_366_800_000);
    let source_profile = MemoryDocument::default();
    let source_exercise = MemoryDocument::default();
    let source_exchange = MemoryExchange::default();
    let source_reminders = ReminderOutbox::default();
    let source_profile_application =
        ProfileApplication::new(source_profile.clone(), source_exchange.clone());
    let source_exercise_application =
        ExerciseApplication::new(source_exercise.clone(), source_reminders, clock.clone());
    source_profile_application
        .update_profile_label("Restored after interruption".into())
        .unwrap();
    source_exercise_application.open().unwrap();
    let source_backup = ProfileBackupApplication::new(
        source_profile.clone(),
        source_exercise.clone(),
        source_exchange.clone(),
        ReminderOutbox::default(),
        clock.clone(),
        MemoryReplacement::new(source_profile.clone(), source_exercise.clone()),
    );
    source_backup.backup_profile().unwrap();
    let backup_document = source_exchange
        .exported_document
        .lock()
        .unwrap()
        .clone()
        .unwrap();

    let target_profile = MemoryDocument::default();
    let target_exercise = MemoryDocument::default();
    let target_exchange = MemoryExchange::default();
    let target_reminders = ReminderOutbox::default();
    let target_profile_application =
        ProfileApplication::new(target_profile.clone(), target_exchange.clone());
    let target_exercise_application = ExerciseApplication::new(
        target_exercise.clone(),
        target_reminders.clone(),
        clock.clone(),
    );
    target_profile_application
        .update_profile_label("Current profile before restore".into())
        .unwrap();
    target_exercise_application.open().unwrap();
    *target_exchange.import_document.lock().unwrap() = Some(backup_document);
    *target_reminders.fail_cancel.lock().unwrap() = true;
    target_reminders.fail_scheduling_after(1);

    let restore = ProfileBackupApplication::new(
        target_profile.clone(),
        target_exercise.clone(),
        target_exchange,
        target_reminders.clone(),
        clock.clone(),
        MemoryReplacement::new(target_profile.clone(), target_exercise.clone()),
    );
    restore.select_profile_restore().unwrap();
    assert_eq!(
        "The exercise reminder could not be cancelled.",
        restore.confirm_profile_restore().unwrap_err()
    );

    let committed_exercise: serde_json::Value =
        serde_json::from_slice(&target_exercise.document.lock().unwrap().clone().unwrap()).unwrap();
    assert!(committed_exercise["pending_reminder_reconciliation"].is_object());
    assert_eq!(
        "Restored after interruption",
        target_profile_application.open().unwrap().profile_label
    );

    *target_reminders.fail_cancel.lock().unwrap() = false;
    let interrupted = ExerciseApplication::new(
        target_exercise.clone(),
        target_reminders.clone(),
        clock.clone(),
    );
    assert_eq!(
        "The exercise reminder could not be scheduled.",
        interrupted.open().unwrap_err()
    );
    *target_reminders.fail_schedule_after.lock().unwrap() = None;
    let relaunched = ExerciseApplication::new(
        target_exercise.clone(),
        target_reminders.clone(),
        clock.clone(),
    );
    let recovered = relaunched.open().unwrap();
    let scheduled_after_recovery = target_reminders.scheduled.lock().unwrap().len();
    let recovered_exercise: serde_json::Value =
        serde_json::from_slice(&target_exercise.document.lock().unwrap().clone().unwrap()).unwrap();
    assert!(recovered_exercise["pending_reminder_reconciliation"].is_null());
    assert!(target_reminders
        .active
        .lock()
        .unwrap()
        .contains(&recovered.reminder_intent.unwrap().id));

    let repeated = ExerciseApplication::new(target_exercise, target_reminders.clone(), clock)
        .open()
        .unwrap();
    assert_eq!(
        scheduled_after_recovery,
        target_reminders.scheduled.lock().unwrap().len()
    );
    assert_eq!(recovered.week_label, repeated.week_label);
}
