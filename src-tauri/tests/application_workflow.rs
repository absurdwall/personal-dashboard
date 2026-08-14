use personal_dashboard_lib::exercise::{ExerciseApplication, ExerciseClock, ExercisePersistence};
use personal_dashboard_lib::notification::{
    NotificationIntent, NotificationPermission, NotificationPlatform,
};
use std::sync::{Arc, Mutex};

#[derive(Clone, Default)]
struct IsolatedProfile {
    document: Arc<Mutex<Option<Vec<u8>>>>,
}

impl ExercisePersistence for IsolatedProfile {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(self.document.lock().unwrap().clone())
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        *self.document.lock().unwrap() = Some(document.to_vec());
        Ok(())
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

#[derive(Clone, Default)]
struct ReminderOutbox {
    scheduled: Arc<Mutex<Vec<NotificationIntent>>>,
    cancelled: Arc<Mutex<Vec<String>>>,
}

#[derive(Clone, Default)]
struct DeniedReminderOutbox;

impl NotificationPlatform for DeniedReminderOutbox {
    fn permission(&self) -> Result<NotificationPermission, String> {
        Ok(NotificationPermission::Denied)
    }

    fn request_permission(&self) -> Result<NotificationPermission, String> {
        Ok(NotificationPermission::Denied)
    }

    fn schedule(&self, _intent: NotificationIntent) -> Result<(), String> {
        panic!("a denied reminder platform must not schedule")
    }

    fn cancel(&self, _id: &str) -> Result<(), String> {
        Ok(())
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
        self.scheduled.lock().unwrap().push(intent);
        Ok(())
    }

    fn cancel(&self, id: &str) -> Result<(), String> {
        self.cancelled.lock().unwrap().push(id.into());
        Ok(())
    }
}

#[test]
fn fresh_exercise_week_survives_relaunch_and_emits_the_first_departure_reminder() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let monday_morning = FixedNewYorkClock::at(1_786_366_800_000);

    let first_launch =
        ExerciseApplication::new(profile.clone(), reminders.clone(), monday_morning.clone());
    let dashboard = first_launch.open().unwrap();

    assert_eq!("Personal Dashboard", dashboard.product_name);
    assert_eq!("Exercise tracking", dashboard.feature_area);
    assert_eq!(3, dashboard.schema_version);
    assert_eq!(
        "Monday, August 10 – Sunday, August 16",
        dashboard.week_label
    );
    assert_eq!("0 of 3 completed", dashboard.progress);
    assert_eq!(
        vec![
            ("Monday", "4:00 PM"),
            ("Wednesday", "4:00 PM"),
            ("Friday", "4:00 PM")
        ],
        dashboard
            .primary_departures
            .iter()
            .map(|slot| (slot.day.as_str(), slot.time.as_str()))
            .collect::<Vec<_>>()
    );
    assert_eq!(
        vec![("Saturday", "Available"), ("Sunday", "Available")],
        dashboard
            .fallback_departures
            .iter()
            .map(|slot| (slot.day.as_str(), slot.availability.as_str()))
            .collect::<Vec<_>>()
    );
    assert_eq!(2, dashboard.fallback_available_count);
    assert_eq!(
        "Monday, August 10 at 4:00 PM",
        dashboard.next_departure.as_deref().unwrap()
    );
    assert_eq!(
        vec![
            NotificationIntent {
                id: "exercise-departure-2026-08-10-primary-1".into(),
                deliver_at_epoch_millis: 1_786_392_000_000,
                title: "Personal Dashboard".into(),
                body: "Time to leave for the gym.".into(),
                detail: "Monday, August 10 at 4:00 PM".into(),
            },
            NotificationIntent {
                id: "exercise-follow-up-2026-08-10-primary-1".into(),
                deliver_at_epoch_millis: 1_786_392_900_000,
                title: "Personal Dashboard".into(),
                body: "A gentle follow-up: are you leaving for the gym?".into(),
                detail: "Monday, August 10 at 4:00 PM".into(),
            },
        ],
        *reminders.scheduled.lock().unwrap()
    );

    let relaunched = ExerciseApplication::new(profile, reminders.clone(), monday_morning);
    assert_eq!(dashboard, relaunched.open().unwrap());
    assert_eq!(2, reminders.scheduled.lock().unwrap().len());
}

#[test]
fn confirming_departure_persists_the_response_and_one_record_workout_reminder() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_392_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    let due = application.open().unwrap();
    let prompt = due.departure_prompt.as_ref().unwrap();
    assert_eq!("2026-08-10-primary-1", prompt.slot_id);
    assert_eq!(
        vec!["Leaving for gym", "Move to fallback", "Skip"],
        prompt.actions
    );

    let confirmed = application
        .respond_to_departure("2026-08-10-primary-1", "leaving-for-gym")
        .unwrap();
    assert_eq!(None, confirmed.departure_prompt);
    assert_eq!(
        "Leaving for gym confirmed",
        confirmed.departure_confirmation.as_ref().unwrap().message
    );
    assert_eq!(
        "Record workout reminder at 5:30 PM",
        confirmed
            .departure_confirmation
            .as_ref()
            .unwrap()
            .next_prompt
    );

    clock.advance_to(1_786_392_001_000);
    let relaunched = ExerciseApplication::new(profile, reminders.clone(), clock);
    assert_eq!(confirmed, relaunched.open().unwrap());
    assert_eq!(
        vec![NotificationIntent {
            id: "exercise-record-workout-2026-08-10-primary-1".into(),
            deliver_at_epoch_millis: 1_786_397_400_000,
            title: "Personal Dashboard".into(),
            body: "Record workout.".into(),
            detail: "Leaving confirmed Monday, August 10 at 4:00 PM".into(),
        }],
        reminders
            .scheduled
            .lock()
            .unwrap()
            .iter()
            .filter(|intent| intent.body == "Record workout.")
            .cloned()
            .collect::<Vec<_>>()
    );
    assert_eq!(
        vec!["exercise-follow-up-2026-08-10-primary-1"],
        *reminders.cancelled.lock().unwrap()
    );
    assert_eq!(
        "That departure is not awaiting a response.",
        relaunched
            .respond_to_departure("2026-08-10-primary-1", "leaving-for-gym")
            .unwrap_err()
    );
}

#[test]
fn eligible_departure_records_a_qualifying_workout_in_four_established_selections() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_392_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    application
        .respond_to_departure("2026-08-10-primary-1", "leaving-for-gym")
        .unwrap();
    assert_eq!(
        1,
        reminders
            .scheduled
            .lock()
            .unwrap()
            .iter()
            .filter(|intent| intent.body == "Record workout.")
            .count()
    );

    clock.advance_to(1_786_397_340_000);
    assert_eq!(None, application.open().unwrap().workout_prompt);

    clock.advance_to(1_786_397_400_000);
    let ready = application.open().unwrap();
    let prompt = ready.workout_prompt.as_ref().unwrap();
    assert_eq!("2026-08-10-primary-1", prompt.slot_id);
    assert_eq!("Ready to save this workout?", prompt.heading);
    assert_eq!("Done", prompt.action);

    let activity = application
        .start_workout_record("2026-08-10-primary-1")
        .unwrap();
    let recording = activity.workout_recording.as_ref().unwrap();
    assert_eq!("What activity did you do?", recording.heading);
    assert_eq!("Choose one activity.", recording.guidance);
    assert_eq!("activity", recording.choice_name);
    assert_eq!(
        vec!["Elliptical", "Weight training", "Other exercise"],
        recording.choices
    );

    let duration = application
        .choose_workout_activity("2026-08-10-primary-1", "Elliptical")
        .unwrap();
    let recording = duration.workout_recording.as_ref().unwrap();
    assert_eq!("About how long was the workout?", recording.heading);
    assert_eq!("Choose the closest duration.", recording.guidance);
    assert_eq!("duration", recording.choice_name);
    assert_eq!(
        vec!["Under 20", "20", "30", "45", "60+ minutes"],
        recording.choices
    );

    let effort = application
        .choose_workout_duration("2026-08-10-primary-1", "20")
        .unwrap();
    let recording = effort.workout_recording.as_ref().unwrap();
    assert_eq!("How strenuous did this workout feel?", recording.heading);
    assert_eq!(
        "Choose the description that fits. Harder is not better.",
        recording.guidance
    );
    assert_eq!("effort", recording.choice_name);
    assert_eq!(
        vec!["Very easy", "Easy", "Moderate", "Hard", "Very hard"],
        recording.choices
    );

    let completed = application
        .complete_workout_record("2026-08-10-primary-1", "Moderate")
        .unwrap();
    assert_eq!("1 of 3 completed", completed.progress);
    assert_eq!(None, completed.workout_prompt);
    assert_eq!(None, completed.workout_recording);
    assert_eq!(1, completed.workout_records.len());
    let record = &completed.workout_records[0];
    assert_eq!("Elliptical", record.activity);
    assert_eq!("20", record.duration);
    assert_eq!("Moderate", record.effort);
    assert_eq!("Counts toward weekly progress", record.outcome);

    let relaunched = ExerciseApplication::new(profile, reminders, clock);
    assert_eq!(completed, relaunched.open().unwrap());
    assert_eq!(
        "No workout record is in progress.",
        relaunched
            .complete_workout_record("2026-08-10-primary-1", "Moderate")
            .unwrap_err()
    );
    assert_eq!("1 of 3 completed", relaunched.open().unwrap().progress);
}

#[test]
fn in_progress_recording_survives_relaunch_and_retains_a_short_effort() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_564_800_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    application
        .respond_to_departure("2026-08-10-primary-2", "leaving-for-gym")
        .unwrap();
    clock.advance_to(1_786_570_200_000);
    application
        .start_workout_record("2026-08-10-primary-2")
        .unwrap();
    assert_eq!(
        "The workout duration is not ready for selection.",
        application
            .choose_workout_duration("2026-08-10-primary-2", "Under 20")
            .unwrap_err()
    );
    assert_eq!(
        "That workout activity is not available.",
        application
            .choose_workout_activity("2026-08-10-primary-2", "Cycling")
            .unwrap_err()
    );
    let duration = application
        .choose_workout_activity("2026-08-10-primary-2", "Other exercise")
        .unwrap();

    let relaunched = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());
    assert_eq!(duration, relaunched.open().unwrap());
    assert_eq!(
        vec!["Under 20", "20", "30", "45", "60+ minutes"],
        relaunched
            .open()
            .unwrap()
            .workout_recording
            .unwrap()
            .choices
    );

    relaunched
        .choose_workout_duration("2026-08-10-primary-2", "Under 20")
        .unwrap();
    let completed = relaunched
        .complete_workout_record("2026-08-10-primary-2", "Very easy")
        .unwrap();
    assert_eq!("0 of 3 completed", completed.progress);
    assert_eq!(1, completed.workout_records.len());
    let record = &completed.workout_records[0];
    assert_eq!("Other exercise", record.activity);
    assert_eq!("Under 20", record.duration);
    assert_eq!("Very easy", record.effort);
    assert_eq!(
        "Short effort — does not count toward weekly progress",
        record.outcome
    );

    let reopened = ExerciseApplication::new(profile, reminders, clock)
        .open()
        .unwrap();
    assert_eq!(completed, reopened);
    assert_eq!(1, reopened.workout_records.len());
    assert_eq!("0 of 3 completed", reopened.progress);
}

#[test]
fn workout_prompt_requires_a_scheduled_record_reminder() {
    let profile = IsolatedProfile::default();
    let clock = FixedNewYorkClock::at(1_786_392_000_000);
    let application = ExerciseApplication::new(profile, DeniedReminderOutbox, clock.clone());

    application.open().unwrap();
    application
        .respond_to_departure("2026-08-10-primary-1", "leaving-for-gym")
        .unwrap();
    clock.advance_to(1_786_397_400_000);

    assert_eq!(None, application.open().unwrap().workout_prompt);
    assert_eq!(
        "That workout prompt is not awaiting a record.",
        application
            .start_workout_record("2026-08-10-primary-1")
            .unwrap_err()
    );
}

#[test]
fn invalid_persisted_workout_data_is_rejected_by_the_application_boundary() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_392_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders, clock.clone());

    application.open().unwrap();
    application
        .respond_to_departure("2026-08-10-primary-1", "leaving-for-gym")
        .unwrap();
    clock.advance_to(1_786_397_400_000);
    application
        .start_workout_record("2026-08-10-primary-1")
        .unwrap();
    application
        .choose_workout_activity("2026-08-10-primary-1", "Elliptical")
        .unwrap();
    application
        .choose_workout_duration("2026-08-10-primary-1", "20")
        .unwrap();
    application
        .complete_workout_record("2026-08-10-primary-1", "Moderate")
        .unwrap();

    let document = profile.document.lock().unwrap().clone().unwrap();
    let mut invalid: serde_json::Value = serde_json::from_slice(&document).unwrap();
    invalid["weeks"][0]["completed_count"] = 0.into();
    *profile.document.lock().unwrap() = Some(serde_json::to_vec(&invalid).unwrap());

    assert_eq!(
        "The saved workout data is not valid.",
        application.open().unwrap_err()
    );
}

#[test]
fn silence_receives_one_follow_up_and_remains_unresolved_after_relaunch() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_366_800_000);
    let first_launch = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    first_launch.open().unwrap();
    assert_eq!(
        1,
        reminders
            .scheduled
            .lock()
            .unwrap()
            .iter()
            .filter(|intent| intent.body == "A gentle follow-up: are you leaving for the gym?")
            .count()
    );

    clock.advance_to(1_786_392_840_000);
    let before_follow_up =
        ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone())
            .open()
            .unwrap();
    assert_eq!(None, before_follow_up.departure_prompt.unwrap().status);

    clock.advance_to(1_786_392_900_000);
    let after_follow_up =
        ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone())
            .open()
            .unwrap();
    assert_eq!(
        Some("Unresolved — no response"),
        after_follow_up
            .departure_prompt
            .as_ref()
            .unwrap()
            .status
            .as_deref()
    );
    assert_eq!(
        "Unresolved — no response",
        after_follow_up.primary_departures[0].status
    );

    clock.advance_to(1_786_399_200_000);
    let later = ExerciseApplication::new(profile, reminders.clone(), clock)
        .open()
        .unwrap();
    assert_eq!(
        Some("Unresolved — no response"),
        later.departure_prompt.unwrap().status.as_deref()
    );
    assert!(!later.primary_departures[0].status.contains("Skipped"));
    assert_eq!(
        1,
        reminders
            .scheduled
            .lock()
            .unwrap()
            .iter()
            .filter(|intent| intent.body == "A gentle follow-up: are you leaving for the gym?")
            .count()
    );
}
