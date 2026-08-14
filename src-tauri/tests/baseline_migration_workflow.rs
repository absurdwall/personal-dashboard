use personal_dashboard_lib::exercise::{ExerciseApplication, ExerciseClock, ExercisePersistence};
use personal_dashboard_lib::migration::{
    BaselineMigrationApplication, BaselineMigrationStatus, BaselinePersistence,
    CompleteProfileAdoption, CompleteProfileDocuments,
};
use personal_dashboard_lib::move_profile::{
    ProfileExerciseAuthority, ProfileNotificationCancellationJournal,
};
use personal_dashboard_lib::notification::{
    NotificationIntent, NotificationPermission, NotificationPlatform,
};
use personal_dashboard_lib::profile::{
    ProfileApplication, ProfileExchange, ProfileOrigin, ProfilePersistence,
};
use std::sync::{Arc, Mutex};

const COMPLETED_BASELINE: &[u8] =
    include_bytes!("../../tests/fixtures/completed-python-baseline-state.json");

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
struct MemoryBaseline {
    document: Arc<Mutex<Option<Vec<u8>>>>,
}

impl MemoryBaseline {
    fn containing(document: &[u8]) -> Self {
        Self {
            document: Arc::new(Mutex::new(Some(document.to_vec()))),
        }
    }
}

impl BaselinePersistence for MemoryBaseline {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(self.document.lock().unwrap().clone())
    }
}

#[derive(Clone)]
struct MemoryAdoption {
    profile: MemoryDocument,
    exercise: MemoryDocument,
}

impl CompleteProfileAdoption for MemoryAdoption {
    fn adopt_complete(&self, documents: &CompleteProfileDocuments) -> Result<(), String> {
        *self.profile.document.lock().unwrap() = Some(documents.profile().to_vec());
        *self.exercise.document.lock().unwrap() = Some(documents.exercise().to_vec());
        Ok(())
    }
}

#[derive(Clone, Copy)]
struct FailingAdoption;

impl CompleteProfileAdoption for FailingAdoption {
    fn adopt_complete(&self, _documents: &CompleteProfileDocuments) -> Result<(), String> {
        Err("simulated interruption".into())
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

#[derive(Clone, Default)]
struct ReminderOutbox {
    scheduled: Arc<Mutex<Vec<NotificationIntent>>>,
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

    fn cancel(&self, _id: &str) -> Result<(), String> {
        Ok(())
    }
}

#[derive(Clone, Default)]
struct NoProfileExchange;

impl ProfileExchange for NoProfileExchange {
    fn export(&self, _document: &[u8]) -> Result<bool, String> {
        Ok(false)
    }

    fn import(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(None)
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
struct MemoryReplacement {
    profile: MemoryDocument,
    exercise: MemoryDocument,
}

impl CompleteProfileReplacement for MemoryReplacement {
    fn replace_complete(&self, profile: &[u8], exercise: &[u8]) -> Result<(), String> {
        *self.profile.document.lock().unwrap() = Some(profile.to_vec());
        *self.exercise.document.lock().unwrap() = Some(exercise.to_vec());
        Ok(())
    }
}

#[test]
fn first_launch_adopts_the_completed_baseline_without_changing_its_source() {
    let clock = FixedNewYorkClock(1_787_686_200_000);
    let baseline = MemoryBaseline::containing(COMPLETED_BASELINE);
    let original_baseline = baseline.load().unwrap().unwrap();
    let profile = MemoryDocument::default();
    let exercise = MemoryDocument::default();
    let migration = BaselineMigrationApplication::new(
        baseline.clone(),
        profile.clone(),
        exercise.clone(),
        MemoryAdoption {
            profile: profile.clone(),
            exercise: exercise.clone(),
        },
        clock.clone(),
    );

    let launch = migration.launch();

    assert_eq!(BaselineMigrationStatus::Completed, launch.status);
    assert!(!launch.blocks_profile);
    assert_eq!(original_baseline, baseline.load().unwrap().unwrap());

    let profile_view = ProfileApplication::new(profile.clone(), NoProfileExchange)
        .open()
        .unwrap();
    assert_eq!("active", profile_view.authority);

    let reminders = ReminderOutbox::default();
    let dashboard = ExerciseApplication::with_authority(
        exercise,
        reminders,
        clock,
        ProfileExerciseAuthority::new(profile.clone()),
        ProfileNotificationCancellationJournal::new(profile),
    )
    .open()
    .unwrap();
    assert_eq!(
        "Tuesday, August 25 at 3:30 PM",
        dashboard.next_departure.unwrap()
    );
    assert_eq!("0 of 3 completed", dashboard.progress);
    assert_eq!(2, dashboard.fallback_available_count);
    assert_eq!(2, dashboard.history.len());
    assert_eq!("3 of 3 completed", dashboard.history[0].progress);
    assert_eq!(4, dashboard.history[0].workout_records.len());
    assert_eq!("1 of 3 completed", dashboard.history[1].progress);
    assert_eq!(1, dashboard.history[1].workout_records.len());
    assert_eq!(
        "Tuesday",
        dashboard.routine_settings.primary_departures[0].day
    );
    assert_eq!(
        "3:30 PM",
        dashboard.routine_settings.primary_departures[0].time
    );
    assert!(dashboard.reminder_intent.is_some());
}

#[test]
fn successful_migration_is_recorded_and_later_launches_do_not_reconvert() {
    let clock = FixedNewYorkClock(1_787_686_200_000);
    let baseline = MemoryBaseline::containing(COMPLETED_BASELINE);
    let profile = MemoryDocument::default();
    let exercise = MemoryDocument::default();
    let migration = BaselineMigrationApplication::new(
        baseline.clone(),
        profile.clone(),
        exercise.clone(),
        MemoryAdoption {
            profile: profile.clone(),
            exercise: exercise.clone(),
        },
        clock,
    );
    assert_eq!(
        BaselineMigrationStatus::Completed,
        migration.launch().status
    );
    let migrated_profile = profile.document.lock().unwrap().clone().unwrap();
    let migrated_exercise = exercise.document.lock().unwrap().clone().unwrap();
    *baseline.document.lock().unwrap() = Some(b"changed after migration".to_vec());

    let relaunched = migration.launch();

    assert_eq!(BaselineMigrationStatus::ExistingProfile, relaunched.status);
    assert_eq!(
        ProfileOrigin::CompletedBaseline,
        ProfileApplication::new(profile.clone(), NoProfileExchange)
            .open()
            .unwrap()
            .origin
    );
    assert_eq!(
        migrated_profile,
        profile.document.lock().unwrap().clone().unwrap()
    );
    assert_eq!(
        migrated_exercise,
        exercise.document.lock().unwrap().clone().unwrap()
    );
}

#[test]
fn invalid_or_unsupported_baseline_blocks_adoption_without_writing_app_state() {
    let mut unsupported: serde_json::Value = serde_json::from_slice(COMPLETED_BASELINE).unwrap();
    unsupported["schema_version"] = 4.into();
    let mut empty_record_id: serde_json::Value =
        serde_json::from_slice(COMPLETED_BASELINE).unwrap();
    empty_record_id["weeks"]["2026-08-17"]["workout_records"][0]["id"] = "".into();
    let mut duplicate_record_id: serde_json::Value =
        serde_json::from_slice(COMPLETED_BASELINE).unwrap();
    let duplicate = duplicate_record_id["weeks"]["2026-08-17"]["workout_records"][0]["id"].clone();
    duplicate_record_id["weeks"]["2026-08-17"]["workout_records"][1]["id"] = duplicate;
    let cases = [
        b"not json".to_vec(),
        serde_json::to_vec(&unsupported).unwrap(),
        serde_json::to_vec(&empty_record_id).unwrap(),
        serde_json::to_vec(&duplicate_record_id).unwrap(),
    ];

    for baseline_document in cases {
        let baseline = MemoryBaseline::containing(&baseline_document);
        let profile = MemoryDocument::default();
        let exercise = MemoryDocument::default();
        let migration = BaselineMigrationApplication::new(
            baseline.clone(),
            profile.clone(),
            exercise.clone(),
            MemoryAdoption {
                profile: profile.clone(),
                exercise: exercise.clone(),
            },
            FixedNewYorkClock(1_787_686_200_000),
        );

        let launch = migration.launch();

        assert_eq!(BaselineMigrationStatus::Failed, launch.status);
        assert!(launch.blocks_profile);
        assert_eq!(baseline_document, baseline.load().unwrap().unwrap());
        assert!(profile.document.lock().unwrap().is_none());
        assert!(exercise.document.lock().unwrap().is_none());
    }
}

#[test]
fn migration_preserves_an_in_progress_departure_decision() {
    let mut baseline: serde_json::Value = serde_json::from_slice(COMPLETED_BASELINE).unwrap();
    baseline["weeks"]["2026-08-17"]["completed_count"] = 0.into();
    baseline["weeks"]["2026-08-17"]["workout_records"] = serde_json::json!([]);
    baseline["departure_decision"] = serde_json::json!({
        "slot_id": "2026-08-17-primary-1",
        "outcome": "move-to-fallback"
    });
    let profile = MemoryDocument::default();
    let exercise = MemoryDocument::default();
    let clock = FixedNewYorkClock(1_787_081_700_000);
    let migration = BaselineMigrationApplication::new(
        MemoryBaseline::containing(&serde_json::to_vec(&baseline).unwrap()),
        profile.clone(),
        exercise.clone(),
        MemoryAdoption {
            profile: profile.clone(),
            exercise: exercise.clone(),
        },
        clock.clone(),
    );
    assert_eq!(
        BaselineMigrationStatus::Completed,
        migration.launch().status
    );

    let dashboard = ExerciseApplication::with_authority(
        exercise,
        ReminderOutbox::default(),
        clock,
        ProfileExerciseAuthority::new(profile.clone()),
        ProfileNotificationCancellationJournal::new(profile),
    )
    .open()
    .unwrap();

    let prompt = dashboard.departure_reason_prompt.unwrap();
    assert_eq!("2026-08-17-primary-1", prompt.slot_id);
    assert_eq!("move-to-fallback", prompt.outcome);
    assert_eq!("Why are you moving this workout?", prompt.heading);
}

#[test]
fn migration_does_not_reschedule_reminders_that_the_baseline_already_sent() {
    let mut baseline: serde_json::Value = serde_json::from_slice(COMPLETED_BASELINE).unwrap();
    baseline["weeks"]["2026-08-10"]["primary_slots"][2]["status"] = "scheduled".into();
    let profile = MemoryDocument::default();
    let exercise = MemoryDocument::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock(1_786_830_600_000);
    let migration = BaselineMigrationApplication::new(
        MemoryBaseline::containing(&serde_json::to_vec(&baseline).unwrap()),
        profile.clone(),
        exercise.clone(),
        MemoryAdoption {
            profile: profile.clone(),
            exercise: exercise.clone(),
        },
        clock.clone(),
    );
    assert_eq!(
        BaselineMigrationStatus::Completed,
        migration.launch().status
    );

    ExerciseApplication::with_authority(
        exercise,
        reminders.clone(),
        clock,
        ProfileExerciseAuthority::new(profile.clone()),
        ProfileNotificationCancellationJournal::new(profile),
    )
    .open()
    .unwrap();

    assert!(reminders.scheduled.lock().unwrap().is_empty());
}

#[test]
fn migrated_profile_backup_reproduces_the_visible_baseline_outcomes() {
    let clock = FixedNewYorkClock(1_787_686_200_000);
    let profile = MemoryDocument::default();
    let exercise = MemoryDocument::default();
    let migration = BaselineMigrationApplication::new(
        MemoryBaseline::containing(COMPLETED_BASELINE),
        profile.clone(),
        exercise.clone(),
        MemoryAdoption {
            profile: profile.clone(),
            exercise: exercise.clone(),
        },
        clock.clone(),
    );
    assert_eq!(
        BaselineMigrationStatus::Completed,
        migration.launch().status
    );
    let exchange = MemoryBackupExchange::default();
    let reminders = ReminderOutbox::default();
    let source_backup = ProfileBackupApplication::new(
        profile.clone(),
        exercise.clone(),
        exchange.clone(),
        reminders.clone(),
        clock.clone(),
        MemoryReplacement {
            profile: profile.clone(),
            exercise: exercise.clone(),
        },
    );
    source_backup.backup_profile().unwrap();
    let backup = exchange.exported_document.lock().unwrap().clone().unwrap();

    let restored_profile = MemoryDocument::default();
    let restored_exercise = MemoryDocument::default();
    ProfileApplication::new(restored_profile.clone(), NoProfileExchange)
        .open()
        .unwrap();
    ExerciseApplication::new(
        restored_exercise.clone(),
        ReminderOutbox::default(),
        clock.clone(),
    )
    .open()
    .unwrap();
    *exchange.import_document.lock().unwrap() = Some(backup);
    let restore = ProfileBackupApplication::new(
        restored_profile.clone(),
        restored_exercise.clone(),
        exchange,
        ReminderOutbox::default(),
        clock,
        MemoryReplacement {
            profile: restored_profile,
            exercise: restored_exercise,
        },
    );
    assert!(
        restore
            .select_profile_restore()
            .unwrap()
            .confirmation_required
    );

    let restored = restore.confirm_profile_restore().unwrap();

    assert_eq!(ProfileOrigin::CompletedBaseline, restored.profile.origin);
    assert_eq!(
        "Tuesday, August 25 at 3:30 PM",
        restored.dashboard.next_departure.unwrap()
    );
    assert_eq!(2, restored.dashboard.history.len());
    assert_eq!(4, restored.dashboard.history[0].workout_records.len());
    assert_eq!(1, restored.dashboard.history[1].workout_records.len());
}

#[test]
fn interrupted_adoption_is_retryable_and_never_changes_the_baseline() {
    let baseline = MemoryBaseline::containing(COMPLETED_BASELINE);
    let original_baseline = baseline.load().unwrap().unwrap();
    let profile = MemoryDocument::default();
    let exercise = MemoryDocument::default();
    let interrupted = BaselineMigrationApplication::new(
        baseline.clone(),
        profile.clone(),
        exercise.clone(),
        FailingAdoption,
        FixedNewYorkClock(1_787_686_200_000),
    );

    let failed = interrupted.launch();

    assert_eq!(BaselineMigrationStatus::Failed, failed.status);
    assert!(failed.blocks_profile);
    assert_eq!(original_baseline, baseline.load().unwrap().unwrap());
    assert!(profile.document.lock().unwrap().is_none());
    assert!(exercise.document.lock().unwrap().is_none());

    let retried = BaselineMigrationApplication::new(
        baseline.clone(),
        profile.clone(),
        exercise.clone(),
        MemoryAdoption {
            profile: profile.clone(),
            exercise: exercise.clone(),
        },
        FixedNewYorkClock(1_787_686_200_000),
    )
    .launch();
    assert_eq!(BaselineMigrationStatus::Completed, retried.status);
    assert_eq!(original_baseline, baseline.load().unwrap().unwrap());
    assert!(profile.document.lock().unwrap().is_some());
    assert!(exercise.document.lock().unwrap().is_some());
}

#[test]
fn incomplete_app_owned_state_is_preserved_and_blocks_baseline_adoption() {
    let baseline = MemoryBaseline::containing(COMPLETED_BASELINE);
    let profile = MemoryDocument::default();
    let exercise = MemoryDocument::default();
    *profile.document.lock().unwrap() = Some(b"existing profile fragment".to_vec());
    let migration = BaselineMigrationApplication::new(
        baseline.clone(),
        profile.clone(),
        exercise.clone(),
        MemoryAdoption {
            profile: profile.clone(),
            exercise: exercise.clone(),
        },
        FixedNewYorkClock(1_787_686_200_000),
    );

    let launch = migration.launch();

    assert_eq!(BaselineMigrationStatus::Failed, launch.status);
    assert!(launch.blocks_profile);
    assert_eq!(
        b"existing profile fragment",
        profile.document.lock().unwrap().as_deref().unwrap()
    );
    assert!(exercise.document.lock().unwrap().is_none());
    assert_eq!(COMPLETED_BASELINE, baseline.load().unwrap().unwrap());
}

#[test]
fn completed_baseline_replaces_valid_pre_migration_app_state_exactly_once() {
    let clock = FixedNewYorkClock(1_787_686_200_000);
    let profile = MemoryDocument::default();
    let exercise = MemoryDocument::default();
    ProfileApplication::new(profile.clone(), NoProfileExchange)
        .update_profile_label("Pre-migration app state".into())
        .unwrap();
    ExerciseApplication::new(exercise.clone(), ReminderOutbox::default(), clock.clone())
        .open()
        .unwrap();
    let migration = BaselineMigrationApplication::new(
        MemoryBaseline::containing(COMPLETED_BASELINE),
        profile.clone(),
        exercise.clone(),
        MemoryAdoption {
            profile: profile.clone(),
            exercise: exercise.clone(),
        },
        clock.clone(),
    );

    let launch = migration.launch();

    assert_eq!(BaselineMigrationStatus::Completed, launch.status);
    let migrated_profile = ProfileApplication::new(profile.clone(), NoProfileExchange)
        .open()
        .unwrap();
    assert_eq!(ProfileOrigin::CompletedBaseline, migrated_profile.origin);
    assert_eq!("My Personal Dashboard", migrated_profile.profile_label);
    let migrated_dashboard = ExerciseApplication::with_authority(
        exercise,
        ReminderOutbox::default(),
        clock,
        ProfileExerciseAuthority::new(profile.clone()),
        ProfileNotificationCancellationJournal::new(profile),
    )
    .open()
    .unwrap();
    assert_eq!(2, migrated_dashboard.history.len());
    assert_eq!(4, migrated_dashboard.history[0].workout_records.len());
}
use personal_dashboard_lib::backup::{CompleteProfileReplacement, ProfileBackupApplication};
