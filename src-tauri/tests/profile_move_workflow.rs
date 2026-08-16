use personal_dashboard_lib::backup::{CompleteProfileReplacement, ProfileBackupApplication};
use personal_dashboard_lib::exercise::{ExerciseApplication, ExerciseClock, ExercisePersistence};
use personal_dashboard_lib::move_profile::{
    ProfileExerciseAuthority, ProfileMoveApplication, ProfileMoveExchange,
    ProfileNotificationCancellationJournal,
};
use personal_dashboard_lib::notification::{
    NotificationIntent, NotificationPermission, NotificationPlatform,
};
use personal_dashboard_lib::profile::{ProfileApplication, ProfileExchange, ProfilePersistence};
use std::sync::{Arc, Mutex};

#[derive(Clone, Default)]
struct MemoryDocument {
    document: Arc<Mutex<Option<Vec<u8>>>>,
}

impl ProfilePersistence for MemoryDocument {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(self.document.lock().unwrap().clone())
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        *self.document.lock().unwrap() = Some(document.to_vec());
        Ok(())
    }
}

impl ExercisePersistence for MemoryDocument {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
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
        *self.profile.document.lock().unwrap() = Some(profile.to_vec());
        *self.exercise.document.lock().unwrap() = Some(exercise.to_vec());
        Ok(())
    }
}

#[derive(Clone, Default)]
struct MemoryMoveExchange {
    exported_document: Arc<Mutex<Option<Vec<u8>>>>,
    import_document: Arc<Mutex<Option<Vec<u8>>>>,
    cancel_export: Arc<Mutex<bool>>,
}

impl ProfileMoveExchange for MemoryMoveExchange {
    type ExportTarget = ();

    fn select_move_export(&self) -> Result<Option<Self::ExportTarget>, String> {
        if *self.cancel_export.lock().unwrap() {
            return Ok(None);
        }
        Ok(Some(()))
    }

    fn export_move(&self, _target: &Self::ExportTarget, document: &[u8]) -> Result<(), String> {
        *self.exported_document.lock().unwrap() = Some(document.to_vec());
        Ok(())
    }

    fn import_move(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(self.import_document.lock().unwrap().take())
    }
}

#[derive(Clone, Default)]
struct MemoryBackupExchange {
    exported_document: Arc<Mutex<Option<Vec<u8>>>>,
    import_document: Arc<Mutex<Option<Vec<u8>>>>,
}

impl ProfileExchange for MemoryBackupExchange {
    fn export(&self, document: &[u8]) -> Result<bool, String> {
        *self.exported_document.lock().unwrap() = Some(document.to_vec());
        Ok(true)
    }

    fn import(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(self.import_document.lock().unwrap().take())
    }
}

#[derive(Clone)]
struct FixedNewYorkClock(i64);

impl ExerciseClock for FixedNewYorkClock {
    fn now_epoch_millis(&self) -> i64 {
        self.0
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
    fail_cancel: Arc<Mutex<bool>>,
}

impl NotificationPlatform for ReminderOutbox {
    fn permission(&self) -> Result<NotificationPermission, String> {
        Ok(NotificationPermission::Granted)
    }

    fn request_permission(&self) -> Result<NotificationPermission, String> {
        Ok(NotificationPermission::Granted)
    }

    fn schedule(&self, intent: NotificationIntent) -> Result<(), String> {
        self.scheduled.lock().unwrap().push(intent);
        Ok(())
    }

    fn cancel(&self, id: &str) -> Result<(), String> {
        if *self.fail_cancel.lock().unwrap() {
            return Err("The exercise reminder could not be cancelled.".into());
        }
        self.cancelled.lock().unwrap().push(id.into());
        Ok(())
    }
}

type ExerciseApp<C> = ExerciseApplication<
    MemoryDocument,
    ReminderOutbox,
    C,
    ProfileExerciseAuthority<MemoryDocument>,
    ProfileNotificationCancellationJournal<MemoryDocument>,
>;

fn exercise_app<C: ExerciseClock>(
    profile: MemoryDocument,
    exercise: MemoryDocument,
    reminders: ReminderOutbox,
    clock: C,
) -> ExerciseApp<C> {
    ExerciseApplication::with_authority(
        exercise,
        reminders,
        clock,
        ProfileExerciseAuthority::new(profile.clone()),
        ProfileNotificationCancellationJournal::new(profile),
    )
}

fn record_workout<C: ExerciseClock>(application: &ExerciseApp<C>) {
    application.start_unscheduled_workout_record().unwrap();
    application
        .choose_workout_activity("unscheduled", "Elliptical")
        .unwrap();
    application
        .choose_workout_duration("unscheduled", "30")
        .unwrap();
    application
        .complete_workout_record("unscheduled", "Moderate")
        .unwrap();
}

#[test]
fn moved_profile_import_rebases_future_reminders_across_zones() {
    let now = 1_786_366_800_000;
    let source_clock = FixedOffsetClock::at(now, -4 * 60);
    let source_profile = MemoryDocument::default();
    let source_exercise = MemoryDocument::default();
    let source_reminders = ReminderOutbox::default();
    let source_exchange = MemoryMoveExchange::default();
    let source_profile_app =
        ProfileApplication::new(source_profile.clone(), MemoryBackupExchange::default());
    let source_exercise_app = exercise_app(
        source_profile.clone(),
        source_exercise.clone(),
        source_reminders.clone(),
        source_clock.clone(),
    );
    source_profile_app
        .update_profile_label("Portable moved profile".into())
        .unwrap();
    source_exercise_app.open().unwrap();
    record_workout(&source_exercise_app);
    let source_dashboard = source_exercise_app.open().unwrap();
    let source_move = ProfileMoveApplication::new(
        source_profile.clone(),
        source_exercise.clone(),
        source_exchange.clone(),
        source_reminders,
        source_clock,
        MemoryReplacement::new(source_profile.clone(), source_exercise.clone()),
    );

    source_move.move_profile().unwrap();
    let moved_document = source_exchange
        .exported_document
        .lock()
        .unwrap()
        .clone()
        .unwrap();
    let moved_json: serde_json::Value = serde_json::from_slice(&moved_document).unwrap();
    let moved_record = &moved_json["exercise"]["weeks"][0]["workout_records"][0];

    let target_clock = FixedOffsetClock::at(now, 9 * 60);
    let target_profile = MemoryDocument::default();
    let target_exercise = MemoryDocument::default();
    let target_reminders = ReminderOutbox::default();
    let target_exchange = MemoryMoveExchange::default();
    let target_profile_app =
        ProfileApplication::new(target_profile.clone(), MemoryBackupExchange::default());
    let target_exercise_app = exercise_app(
        target_profile.clone(),
        target_exercise.clone(),
        target_reminders.clone(),
        target_clock.clone(),
    );
    target_profile_app
        .update_profile_label("Destination before move".into())
        .unwrap();
    target_exercise_app.open().unwrap();
    *target_exchange.import_document.lock().unwrap() = Some(moved_document);
    let target_move = ProfileMoveApplication::new(
        target_profile.clone(),
        target_exercise.clone(),
        target_exchange,
        target_reminders.clone(),
        target_clock,
        MemoryReplacement::new(target_profile.clone(), target_exercise.clone()),
    );

    target_move.select_profile_move_import().unwrap();
    let imported = target_move.confirm_profile_move_import().unwrap();
    let target_json: serde_json::Value =
        serde_json::from_slice(&target_exercise.document.lock().unwrap().clone().unwrap()).unwrap();
    let target_record = &target_json["weeks"][0]["workout_records"][0];

    assert_eq!(
        source_dashboard
            .primary_departures
            .iter()
            .map(|departure| (&departure.day, &departure.time))
            .collect::<Vec<_>>(),
        imported
            .dashboard
            .primary_departures
            .iter()
            .map(|departure| (&departure.day, &departure.time))
            .collect::<Vec<_>>()
    );
    assert_eq!(
        moved_record["recorded_at_epoch_millis"],
        target_record["recorded_at_epoch_millis"]
    );
    assert_eq!(-4 * 60, target_record["recorded_at_utc_offset_minutes"]);
    assert_ne!(
        source_dashboard
            .reminder_intent
            .as_ref()
            .unwrap()
            .deliver_at_epoch_millis,
        imported
            .dashboard
            .reminder_intent
            .as_ref()
            .unwrap()
            .deliver_at_epoch_millis
    );
    assert!(target_reminders
        .scheduled
        .lock()
        .unwrap()
        .iter()
        .any(|intent| {
            intent.deliver_at_epoch_millis
                == imported
                    .dashboard
                    .reminder_intent
                    .as_ref()
                    .unwrap()
                    .deliver_at_epoch_millis
        }));
}

#[test]
fn move_deactivates_source_and_confirmed_import_activates_destination_without_merging() {
    let clock = FixedNewYorkClock(1_786_366_800_000);
    let source_profile = MemoryDocument::default();
    let source_exercise = MemoryDocument::default();
    let source_reminders = ReminderOutbox::default();
    let source_exchange = MemoryMoveExchange::default();
    let source_profile_app =
        ProfileApplication::new(source_profile.clone(), MemoryBackupExchange::default());
    let source_exercise_app = exercise_app(
        source_profile.clone(),
        source_exercise.clone(),
        source_reminders.clone(),
        clock.clone(),
    );
    source_profile_app
        .update_profile_label("Move this complete profile".into())
        .unwrap();
    let active_dashboard = source_exercise_app.open().unwrap();
    record_workout(&source_exercise_app);
    let scheduled_before_move = source_reminders.scheduled.lock().unwrap().len();
    let source_move = ProfileMoveApplication::new(
        source_profile.clone(),
        source_exercise.clone(),
        source_exchange.clone(),
        source_reminders.clone(),
        clock.clone(),
        MemoryReplacement::new(source_profile.clone(), source_exercise.clone()),
    );

    let moved = source_move.move_profile().unwrap();

    assert_eq!(
        "Profile move saved. This device is now inactive.",
        moved.message
    );
    assert_eq!("inactive", moved.profile.authority);
    assert_eq!("inactive", source_profile_app.open().unwrap().authority);
    assert_eq!(
        active_dashboard.reminder_intent.unwrap().id,
        source_reminders.cancelled.lock().unwrap()[0]
    );
    let scheduled_after_move = source_reminders.scheduled.lock().unwrap().len();
    assert_eq!(scheduled_before_move, scheduled_after_move);
    let inactive_dashboard = source_exercise_app.open().unwrap();
    assert!(inactive_dashboard.reminder_message.is_empty());
    assert!(inactive_dashboard.reminder_intent.is_none());
    assert_eq!(
        scheduled_after_move,
        source_reminders.scheduled.lock().unwrap().len()
    );
    assert_eq!(
        "This profile is inactive. Reactivate it only if the move failed.",
        source_exercise_app
            .start_unscheduled_workout_record()
            .unwrap_err()
    );

    let move_document = source_exchange
        .exported_document
        .lock()
        .unwrap()
        .clone()
        .unwrap();
    let move_json: serde_json::Value = serde_json::from_slice(&move_document).unwrap();
    assert_eq!(1, move_json["schema_version"]);
    assert_eq!("authoritative", move_json["authority"]["source"]);
    assert_eq!(
        "activate_on_confirmation",
        move_json["authority"]["destination"]
    );

    let target_profile = MemoryDocument::default();
    let target_exercise = MemoryDocument::default();
    let target_reminders = ReminderOutbox::default();
    let target_exchange = MemoryMoveExchange::default();
    let target_profile_app =
        ProfileApplication::new(target_profile.clone(), MemoryBackupExchange::default());
    let target_exercise_app = exercise_app(
        target_profile.clone(),
        target_exercise.clone(),
        target_reminders.clone(),
        clock.clone(),
    );
    target_profile_app
        .update_profile_label("Destination history must be replaced".into())
        .unwrap();
    target_exercise_app.open().unwrap();
    record_workout(&target_exercise_app);
    record_workout(&target_exercise_app);
    let target_before = target_exercise_app.open().unwrap();
    let target_profile_before = target_profile_app.open().unwrap();
    *target_exchange.import_document.lock().unwrap() = Some(move_document);
    let target_move = ProfileMoveApplication::new(
        target_profile.clone(),
        target_exercise.clone(),
        target_exchange,
        target_reminders.clone(),
        clock,
        MemoryReplacement::new(target_profile.clone(), target_exercise.clone()),
    );

    let selection = target_move.select_profile_move_import().unwrap();
    assert!(selection.confirmation_required);
    assert_eq!(target_profile_before, target_profile_app.open().unwrap());
    assert_eq!(target_before, target_exercise_app.open().unwrap());

    *target_reminders.fail_cancel.lock().unwrap() = true;
    let imported = target_move.confirm_profile_move_import().unwrap();
    assert!(imported.reminder_transition_pending);
    let target_profile_json: serde_json::Value =
        serde_json::from_slice(target_profile.document.lock().unwrap().as_deref().unwrap())
            .unwrap();
    assert!(!target_profile_json["pending_notification_cancellations"]
        .as_array()
        .unwrap()
        .is_empty());
    *target_reminders.fail_cancel.lock().unwrap() = false;
    target_exercise_app.open().unwrap();
    assert!(!target_reminders.cancelled.lock().unwrap().is_empty());
    let target_profile_json: serde_json::Value =
        serde_json::from_slice(target_profile.document.lock().unwrap().as_deref().unwrap())
            .unwrap();
    assert!(target_profile_json
        .get("pending_notification_cancellations")
        .is_none());
    assert_eq!("Moved profile activated on this device.", imported.message);
    assert_eq!("active", imported.profile.authority);
    assert_eq!("Move this complete profile", imported.profile.profile_label);
    assert_eq!(1, imported.dashboard.workout_records.len());
    assert_eq!("Elliptical", imported.dashboard.workout_records[0].activity);
    assert_eq!(imported.profile, target_profile_app.open().unwrap());
    assert_eq!(imported.dashboard, target_exercise_app.open().unwrap());
}

#[test]
fn cancelled_or_invalid_move_keeps_destination_and_source_can_reactivate_after_failure() {
    let clock = FixedNewYorkClock(1_786_366_800_000);
    let profile = MemoryDocument::default();
    let exercise = MemoryDocument::default();
    let reminders = ReminderOutbox::default();
    let move_exchange = MemoryMoveExchange::default();
    let profile_app = ProfileApplication::new(profile.clone(), MemoryBackupExchange::default());
    let exercise_application = exercise_app(
        profile.clone(),
        exercise.clone(),
        reminders.clone(),
        clock.clone(),
    );
    profile_app
        .update_profile_label("Recover this source".into())
        .unwrap();
    exercise_application.open().unwrap();
    record_workout(&exercise_application);
    let replacement = MemoryReplacement::new(profile.clone(), exercise.clone());
    let move_application = ProfileMoveApplication::new(
        profile.clone(),
        exercise.clone(),
        move_exchange.clone(),
        reminders.clone(),
        clock.clone(),
        replacement.clone(),
    );

    *move_exchange.cancel_export.lock().unwrap() = true;
    let cancelled = move_application.move_profile().unwrap();
    assert_eq!(
        "Profile move cancelled. This device remains active.",
        cancelled.message
    );
    assert_eq!("active", profile_app.open().unwrap().authority);
    assert!(cancelled.dashboard.reminder_intent.is_some());
    *move_exchange.cancel_export.lock().unwrap() = false;

    *reminders.fail_cancel.lock().unwrap() = true;
    assert_eq!(
        "The exercise reminder could not be cancelled. This profile is inactive and will retry automatically.",
        move_application.move_profile().unwrap_err()
    );
    assert_eq!("inactive", profile_app.open().unwrap().authority);
    assert!(move_exchange.exported_document.lock().unwrap().is_none());
    let inactive_profile_json: serde_json::Value =
        serde_json::from_slice(profile.document.lock().unwrap().as_deref().unwrap()).unwrap();
    assert!(!inactive_profile_json["pending_notification_cancellations"]
        .as_array()
        .unwrap()
        .is_empty());
    let interrupted_relaunch = exercise_app(
        profile.clone(),
        exercise.clone(),
        reminders.clone(),
        clock.clone(),
    )
    .open()
    .unwrap();
    assert!(interrupted_relaunch.reminder_intent.is_none());
    assert!(interrupted_relaunch.reminder_message.is_empty());
    *reminders.fail_cancel.lock().unwrap() = false;
    exercise_application.open().unwrap();
    assert!(!reminders.cancelled.lock().unwrap().is_empty());
    let retried_profile_json: serde_json::Value =
        serde_json::from_slice(profile.document.lock().unwrap().as_deref().unwrap()).unwrap();
    assert!(retried_profile_json
        .get("pending_notification_cancellations")
        .is_none());
    assert_eq!(
        "active",
        move_application
            .reactivate_profile()
            .unwrap()
            .profile
            .authority
    );

    move_application.move_profile().unwrap();
    assert_eq!("inactive", profile_app.open().unwrap().authority);

    let reactivated = move_application.reactivate_profile().unwrap();
    assert_eq!("Profile reactivated on this device.", reactivated.message);
    assert_eq!("active", reactivated.profile.authority);
    assert_eq!(1, reactivated.dashboard.workout_records.len());
    assert!(reactivated.dashboard.reminder_intent.is_some());
    assert_eq!(
        "This profile is already active.",
        move_application.reactivate_profile().unwrap_err()
    );

    let active_profile = profile_app.open().unwrap();
    let active_dashboard = exercise_application.open().unwrap();
    assert!(
        !move_application
            .select_profile_move_import()
            .unwrap()
            .confirmation_required
    );
    *move_exchange.import_document.lock().unwrap() = Some(b"not json".to_vec());
    assert_eq!(
        "The selected file is not a valid Personal Dashboard move.",
        move_application.select_profile_move_import().unwrap_err()
    );
    assert_eq!(active_profile, profile_app.open().unwrap());
    assert_eq!(active_dashboard, exercise_application.open().unwrap());
    assert_eq!(
        "No validated profile move is awaiting confirmation.",
        move_application.confirm_profile_move_import().unwrap_err()
    );

    let valid_move = move_exchange
        .exported_document
        .lock()
        .unwrap()
        .clone()
        .unwrap();
    *move_exchange.import_document.lock().unwrap() = Some(valid_move.clone());
    assert!(
        move_application
            .select_profile_move_import()
            .unwrap()
            .confirmation_required
    );
    *replacement.fail.lock().unwrap() = true;
    assert_eq!(
        "The complete profile could not be replaced.",
        move_application.confirm_profile_move_import().unwrap_err()
    );
    assert_eq!(active_profile, profile_app.open().unwrap());
    assert_eq!(active_dashboard, exercise_application.open().unwrap());
    *replacement.fail.lock().unwrap() = false;
    move_application.cancel_profile_move_import().unwrap();

    let mut unsupported: serde_json::Value = serde_json::from_slice(&valid_move).unwrap();
    unsupported["schema_version"] = 99.into();
    *move_exchange.import_document.lock().unwrap() =
        Some(serde_json::to_vec(&unsupported).unwrap());
    assert_eq!(
        "Unsupported profile move schema version: 99",
        move_application.select_profile_move_import().unwrap_err()
    );
    assert_eq!(active_profile, profile_app.open().unwrap());
    assert_eq!(active_dashboard, exercise_application.open().unwrap());
}

#[test]
fn backup_and_move_documents_do_not_change_authority_across_the_wrong_operation() {
    let clock = FixedNewYorkClock(1_786_366_800_000);
    let profile = MemoryDocument::default();
    let exercise = MemoryDocument::default();
    let reminders = ReminderOutbox::default();
    let backup_exchange = MemoryBackupExchange::default();
    let move_exchange = MemoryMoveExchange::default();
    let profile_app = ProfileApplication::new(profile.clone(), backup_exchange.clone());
    profile_app.open().unwrap();
    exercise_app(
        profile.clone(),
        exercise.clone(),
        reminders.clone(),
        clock.clone(),
    )
    .open()
    .unwrap();
    let replacement = MemoryReplacement::new(profile.clone(), exercise.clone());
    let backup = ProfileBackupApplication::new(
        profile.clone(),
        exercise.clone(),
        backup_exchange.clone(),
        reminders.clone(),
        clock.clone(),
        replacement.clone(),
    );
    let move_application = ProfileMoveApplication::new(
        profile.clone(),
        exercise.clone(),
        move_exchange.clone(),
        reminders.clone(),
        clock,
        replacement,
    );

    backup.backup_profile().unwrap();
    *move_exchange.import_document.lock().unwrap() =
        backup_exchange.exported_document.lock().unwrap().clone();
    assert_eq!(
        "The selected file is not a valid Personal Dashboard move.",
        move_application.select_profile_move_import().unwrap_err()
    );
    assert_eq!("active", profile_app.open().unwrap().authority);

    move_application.move_profile().unwrap();
    let scheduled_while_inactive = reminders.scheduled.lock().unwrap().len();
    *backup_exchange.import_document.lock().unwrap() =
        backup_exchange.exported_document.lock().unwrap().clone();
    assert!(
        backup
            .select_profile_restore()
            .unwrap()
            .confirmation_required
    );
    let restored_backup = backup.confirm_profile_restore().unwrap();
    assert_eq!("inactive", restored_backup.profile.authority);
    assert!(restored_backup.dashboard.reminder_intent.is_none());
    assert_eq!(
        scheduled_while_inactive,
        reminders.scheduled.lock().unwrap().len()
    );

    *backup_exchange.import_document.lock().unwrap() =
        move_exchange.exported_document.lock().unwrap().clone();
    assert_eq!(
        "The selected file is not a valid Personal Dashboard backup.",
        backup.select_profile_restore().unwrap_err()
    );
    assert_eq!("inactive", profile_app.open().unwrap().authority);
}
