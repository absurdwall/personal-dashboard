use personal_dashboard_lib::exercise::{
    ExerciseApplication, ExerciseAuthority, ExerciseClock, ExerciseDashboardView,
    ExercisePersistence, NoPendingNotificationCancellations,
};
use personal_dashboard_lib::notification::{
    NotificationIntent, NotificationPermission, NotificationPlatform,
};
use std::collections::BTreeMap;
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

#[derive(Clone, Copy, PartialEq)]
enum ReminderFailure {
    Cancel(usize),
    Schedule(usize),
}

#[derive(Clone, Default)]
struct RecoverableReminderOutbox {
    active: Arc<Mutex<BTreeMap<String, NotificationIntent>>>,
    cancel_calls: Arc<Mutex<usize>>,
    schedule_calls: Arc<Mutex<usize>>,
    failure: Arc<Mutex<Option<ReminderFailure>>>,
}

impl RecoverableReminderOutbox {
    fn fail_on_cancel_call(&self, call: usize) {
        *self.failure.lock().unwrap() = Some(ReminderFailure::Cancel(call));
    }

    fn fail_on_schedule_call(&self, call: usize) {
        *self.failure.lock().unwrap() = Some(ReminderFailure::Schedule(call));
    }

    fn clear_failure(&self) {
        *self.failure.lock().unwrap() = None;
    }

    fn active_ids(&self) -> Vec<String> {
        self.active.lock().unwrap().keys().cloned().collect()
    }

    fn schedule_call_count(&self) -> usize {
        *self.schedule_calls.lock().unwrap()
    }
}

impl NotificationPlatform for RecoverableReminderOutbox {
    fn permission(&self) -> Result<NotificationPermission, String> {
        Ok(NotificationPermission::Granted)
    }

    fn request_permission(&self) -> Result<NotificationPermission, String> {
        Ok(NotificationPermission::Granted)
    }

    fn schedule(&self, intent: NotificationIntent) -> Result<(), String> {
        let mut calls = self.schedule_calls.lock().unwrap();
        *calls += 1;
        let failure = *self.failure.lock().unwrap();
        if failure.is_some_and(|failure| failure == ReminderFailure::Schedule(*calls)) {
            *self.failure.lock().unwrap() = None;
            return Err("The exercise reminder could not be scheduled.".into());
        }
        self.active
            .lock()
            .unwrap()
            .insert(intent.id.clone(), intent);
        Ok(())
    }

    fn cancel(&self, id: &str) -> Result<(), String> {
        let mut calls = self.cancel_calls.lock().unwrap();
        *calls += 1;
        let failure = *self.failure.lock().unwrap();
        if failure.is_some_and(|failure| failure == ReminderFailure::Cancel(*calls)) {
            *self.failure.lock().unwrap() = None;
            return Err("The exercise reminder could not be cancelled.".into());
        }
        self.active.lock().unwrap().remove(id);
        Ok(())
    }
}

#[derive(Clone, Default)]
struct FaultingPersistence {
    document: Arc<Mutex<Option<Vec<u8>>>>,
    save_calls: Arc<Mutex<usize>>,
    fail_on_save: Arc<Mutex<Option<usize>>>,
}

impl FaultingPersistence {
    fn fail_on_save_call(&self, call: usize) {
        *self.fail_on_save.lock().unwrap() = Some(call);
    }

    fn save_call_count(&self) -> usize {
        *self.save_calls.lock().unwrap()
    }

    fn document_json(&self) -> serde_json::Value {
        serde_json::from_slice(&self.document.lock().unwrap().clone().unwrap()).unwrap()
    }
}

impl ExercisePersistence for FaultingPersistence {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(self.document.lock().unwrap().clone())
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        let mut calls = self.save_calls.lock().unwrap();
        *calls += 1;
        if *self.fail_on_save.lock().unwrap() == Some(*calls) {
            *self.fail_on_save.lock().unwrap() = None;
            return Err("The local exercise state could not be saved.".into());
        }
        *self.document.lock().unwrap() = Some(document.to_vec());
        Ok(())
    }
}

#[derive(Clone, Copy, Default)]
struct InactiveExerciseAuthority;

impl ExerciseAuthority for InactiveExerciseAuthority {
    fn is_active(&self) -> Result<bool, String> {
        Ok(false)
    }
}

fn finish_unscheduled_workout(
    application: &ExerciseApplication<IsolatedProfile, ReminderOutbox, FixedNewYorkClock>,
    activity: &str,
    duration: &str,
    effort: &str,
) -> ExerciseDashboardView {
    application
        .choose_workout_activity("unscheduled", activity)
        .unwrap();
    application
        .choose_workout_duration("unscheduled", duration)
        .unwrap();
    application
        .complete_workout_record("unscheduled", effort)
        .unwrap()
}

fn record_unscheduled_workout(
    application: &ExerciseApplication<IsolatedProfile, ReminderOutbox, FixedNewYorkClock>,
    activity: &str,
    duration: &str,
    effort: &str,
) -> ExerciseDashboardView {
    application.start_unscheduled_workout_record().unwrap();
    finish_unscheduled_workout(application, activity, duration, effort)
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
    assert_eq!(9, dashboard.schema_version);
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
fn week_rollover_closes_unanswered_departures_and_repeats_the_routine() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_366_800_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    clock.advance_to(1_786_971_600_000);
    let rolled = application.open().unwrap();

    assert_eq!("Monday, August 17 – Sunday, August 23", rolled.week_label);
    assert_eq!("0 of 3 completed", rolled.progress);
    assert_eq!(
        Some("Monday, August 17 at 4:00 PM"),
        rolled.next_departure.as_deref()
    );
    assert_eq!(1, rolled.history.len());
    let previous = &rolled.history[0];
    assert_eq!("Monday, August 10 – Sunday, August 16", previous.week_label);
    assert_eq!("0 of 3 completed", previous.progress);
    assert_eq!(
        vec!["Missed — no response"; 3],
        previous
            .primary_departures
            .iter()
            .map(|departure| departure.status.as_str())
            .collect::<Vec<_>>()
    );
    assert!(previous
        .primary_departures
        .iter()
        .all(|departure| !departure.status.contains("Skipped")));
    assert!(reminders
        .scheduled
        .lock()
        .unwrap()
        .iter()
        .any(|intent| intent.id == "exercise-departure-2026-08-17-primary-1"));

    let relaunched = ExerciseApplication::new(profile, reminders, clock.clone());
    assert_eq!(rolled, relaunched.open().unwrap());

    clock.advance_to(1_787_576_400_000);
    let following_week = relaunched.open().unwrap();
    assert_eq!(2, following_week.history.len());
    assert_eq!(
        "Monday, August 17 – Sunday, August 23",
        following_week.history[0].week_label
    );
    assert_eq!(
        "Monday, August 10 – Sunday, August 16",
        following_week.history[1].week_label
    );
    assert!(following_week.history[1]
        .primary_departures
        .iter()
        .all(|departure| departure.status == "Missed — no response"));
}

#[test]
fn week_rollover_discards_an_abandoned_workout_draft_without_changing_the_routine() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_366_800_000);
    let application = ExerciseApplication::new(profile, reminders, clock.clone());

    application.open().unwrap();
    application.start_unscheduled_workout_record().unwrap();
    application
        .choose_workout_activity("unscheduled", "Elliptical")
        .unwrap();

    clock.advance_to(1_786_971_600_000);
    let rolled = application.open().unwrap();
    assert_eq!(None, rolled.workout_recording);
    assert_eq!(
        vec!["Monday", "Wednesday", "Friday"],
        rolled
            .primary_departures
            .iter()
            .map(|departure| departure.day.as_str())
            .collect::<Vec<_>>()
    );
    assert_eq!(
        vec!["Saturday", "Sunday"],
        rolled
            .fallback_departures
            .iter()
            .map(|departure| departure.day.as_str())
            .collect::<Vec<_>>()
    );
    assert!(application.start_unscheduled_workout_record().is_ok());
}

#[test]
fn week_rollover_preserves_completed_short_moved_skipped_and_missed_history() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_392_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

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
    record_unscheduled_workout(&application, "Other exercise", "Under 20", "Easy");

    clock.advance_to(1_786_564_800_000);
    application.open().unwrap();
    application
        .confirm_departure_decision("2026-08-10-primary-2", "move-to-fallback", "Work ran late")
        .unwrap();
    clock.advance_to(1_786_737_600_000);
    application.open().unwrap();
    application
        .confirm_departure_decision("2026-08-10-primary-3", "skip", "Another commitment")
        .unwrap();

    clock.advance_to(1_786_971_600_000);
    let rolled = application.open().unwrap();
    let previous = &rolled.history[0];
    assert_eq!(
        vec![
            "Completed",
            "Moved to Saturday · Work ran late",
            "Skipped · Another commitment"
        ],
        previous
            .primary_departures
            .iter()
            .map(|departure| departure.status.as_str())
            .collect::<Vec<_>>()
    );
    assert_eq!(
        "Assigned from Wednesday · Missed — no response",
        previous.fallback_departures[0].availability
    );
    assert_eq!(2, previous.workout_records.len());
    assert_eq!("Elliptical", previous.workout_records[0].activity);
    assert_eq!("Other exercise", previous.workout_records[1].activity);
    assert_eq!(
        "Short effort — does not count toward weekly progress",
        previous.workout_records[1].outcome
    );

    let relaunched = ExerciseApplication::new(profile, reminders, clock);
    assert_eq!(rolled, relaunched.open().unwrap());
}

#[test]
fn week_rollover_preserves_goal_suppressed_slots_as_not_needed() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_366_800_000);
    let application = ExerciseApplication::new(profile, reminders, clock.clone());

    application.open().unwrap();
    for effort in ["Easy", "Moderate", "Hard"] {
        record_unscheduled_workout(&application, "Other exercise", "20", effort);
    }

    clock.advance_to(1_786_971_600_000);
    let rolled = application.open().unwrap();
    let previous = &rolled.history[0];
    assert!(previous
        .primary_departures
        .iter()
        .all(|departure| departure.status == "Weekly goal met — no workout needed"));
    assert!(previous
        .fallback_departures
        .iter()
        .all(|departure| { departure.availability == "Weekly goal met — no workout needed" }));
    assert!(previous
        .primary_departures
        .iter()
        .all(|departure| !departure.status.contains("Missed")));
    assert_eq!("0 of 3 completed", rolled.progress);
    assert_eq!(None, rolled.weekly_goal_status);
}

#[test]
fn week_rollover_keeps_an_ignored_reminder_before_later_success_as_missed() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_392_900_000);
    let application = ExerciseApplication::new(profile, reminders, clock.clone());

    application.open().unwrap();
    clock.advance_to(1_786_453_200_000);
    for effort in ["Easy", "Moderate", "Hard"] {
        record_unscheduled_workout(&application, "Other exercise", "20", effort);
    }

    clock.advance_to(1_786_971_600_000);
    let rolled = application.open().unwrap();
    let previous = &rolled.history[0];
    assert_eq!(
        "Missed — no response",
        previous.primary_departures[0].status
    );
    assert!(previous.primary_departures[1..]
        .iter()
        .all(|departure| departure.status == "Weekly goal met — no workout needed"));
    assert!(previous
        .fallback_departures
        .iter()
        .all(|departure| departure.availability == "Weekly goal met — no workout needed"));
}

#[test]
fn upcoming_primary_departure_adjusts_this_week_and_replaces_its_reminders() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_626_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    let before = application.open().unwrap();
    assert_eq!(None, before.primary_departures[0].adjustment);
    assert_eq!(None, before.primary_departures[1].adjustment);
    let adjustment = before.primary_departures[2].adjustment.as_ref().unwrap();
    assert_eq!("Adjust this week", adjustment.action);
    assert_eq!("Save this week only", adjustment.save_action);
    assert_eq!("Friday", adjustment.selected_day);
    assert_eq!("16:00", adjustment.selected_time);
    assert_eq!(
        vec![
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday"
        ],
        before
            .schedule_choices
            .day_choices
            .iter()
            .map(|choice| choice.label.as_str())
            .collect::<Vec<_>>()
    );
    assert_eq!(48, before.schedule_choices.time_choices.len());
    assert!(before
        .schedule_choices
        .time_choices
        .iter()
        .any(|choice| choice.value == "17:30" && choice.label == "5:30 PM"));

    let adjusted = application
        .adjust_current_week_departure("2026-08-10-primary-3", "Saturday", "17:30")
        .unwrap();
    assert_eq!(
        Some("Saturday, August 15 at 5:30 PM"),
        adjusted.next_departure.as_deref()
    );
    assert_eq!(
        vec![
            ("Monday", "4:00 PM"),
            ("Wednesday", "4:00 PM"),
            ("Saturday", "5:30 PM")
        ],
        adjusted
            .primary_departures
            .iter()
            .map(|departure| (departure.day.as_str(), departure.time.as_str()))
            .collect::<Vec<_>>()
    );
    assert_eq!(1, adjusted.fallback_available_count);
    assert_eq!(
        "Reserved by primary departure",
        adjusted.fallback_departures[0].availability
    );
    assert_eq!(
        vec![
            "exercise-departure-2026-08-10-primary-3",
            "exercise-follow-up-2026-08-10-primary-3"
        ],
        *reminders.cancelled.lock().unwrap()
    );
    assert_eq!(
        Some(1_786_829_400_000),
        reminders
            .scheduled
            .lock()
            .unwrap()
            .iter()
            .rev()
            .find(|intent| intent.id == "exercise-departure-2026-08-10-primary-3")
            .map(|intent| intent.deliver_at_epoch_millis)
    );
    assert_eq!(
        Some(1_786_830_300_000),
        reminders
            .scheduled
            .lock()
            .unwrap()
            .iter()
            .rev()
            .find(|intent| intent.id == "exercise-follow-up-2026-08-10-primary-3")
            .map(|intent| intent.deliver_at_epoch_millis)
    );

    let relaunched = ExerciseApplication::new(profile, reminders, clock.clone());
    assert_eq!(adjusted, relaunched.open().unwrap());

    clock.advance_to(1_786_971_600_000);
    let next_week = relaunched.open().unwrap();
    assert_eq!("Friday", next_week.primary_departures[2].day);
    assert_eq!("4:00 PM", next_week.primary_departures[2].time);
    assert_eq!("Saturday", next_week.history[0].primary_departures[2].day);
    assert_eq!("5:30 PM", next_week.history[0].primary_departures[2].time);
}

#[test]
fn deliberate_routine_change_applies_to_future_weeks_without_rewriting_this_week() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_366_800_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    let before = application.open().unwrap();
    assert_eq!("Change repeating routine", before.routine_settings.action);
    assert_eq!(
        "Applies to future weeks only. This week and prior weeks stay unchanged.",
        before.routine_settings.guidance
    );
    assert_eq!(
        vec![
            ("Monday", "4:00 PM"),
            ("Wednesday", "4:00 PM"),
            ("Friday", "4:00 PM")
        ],
        before
            .routine_settings
            .primary_departures
            .iter()
            .map(|departure| (departure.day.as_str(), departure.time.as_str()))
            .collect::<Vec<_>>()
    );

    let changed = application
        .change_repeating_primary_departure(1, "Tuesday", "15:30")
        .unwrap();
    assert_eq!(
        vec![
            ("Monday", "4:00 PM"),
            ("Wednesday", "4:00 PM"),
            ("Friday", "4:00 PM")
        ],
        changed
            .primary_departures
            .iter()
            .map(|departure| (departure.day.as_str(), departure.time.as_str()))
            .collect::<Vec<_>>()
    );
    assert_eq!(
        ("Tuesday", "3:30 PM"),
        (
            changed.routine_settings.primary_departures[0].day.as_str(),
            changed.routine_settings.primary_departures[0].time.as_str()
        )
    );

    let relaunched = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());
    assert_eq!(changed, relaunched.open().unwrap());

    clock.advance_to(1_786_971_600_000);
    let next_week = relaunched.open().unwrap();
    assert_eq!(
        vec![
            ("Tuesday", "3:30 PM"),
            ("Wednesday", "4:00 PM"),
            ("Friday", "4:00 PM")
        ],
        next_week
            .primary_departures
            .iter()
            .map(|departure| (departure.day.as_str(), departure.time.as_str()))
            .collect::<Vec<_>>()
    );
    assert_eq!("Monday", next_week.history[0].primary_departures[0].day);
    assert_eq!("4:00 PM", next_week.history[0].primary_departures[0].time);
    assert_eq!(
        Some(1_787_081_400_000),
        reminders
            .scheduled
            .lock()
            .unwrap()
            .iter()
            .find(|intent| intent.id == "exercise-departure-2026-08-17-primary-1")
            .map(|intent| intent.deliver_at_epoch_millis)
    );
}

#[test]
fn past_or_ineligible_departures_cannot_be_rewritten_as_upcoming_exceptions() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_392_000_000);
    let application = ExerciseApplication::new(profile, reminders, clock);

    let due = application.open().unwrap();
    assert_eq!(None, due.primary_departures[0].adjustment);
    assert_eq!(
        "Only an upcoming primary departure can be adjusted.",
        application
            .adjust_current_week_departure("2026-08-10-primary-1", "Tuesday", "16:00")
            .unwrap_err()
    );
    assert_eq!(
        "The adjusted departure must remain upcoming.",
        application
            .adjust_current_week_departure("2026-08-10-primary-2", "Monday", "15:30")
            .unwrap_err()
    );
    assert_eq!(
        "That departure time is not available.",
        application
            .adjust_current_week_departure("2026-08-10-primary-2", "Thursday", "15:15")
            .unwrap_err()
    );
    assert_eq!(
        "That schedule day is not available.",
        application
            .change_repeating_primary_departure(1, "Someday", "16:00")
            .unwrap_err()
    );
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
fn departures_move_to_ordered_fallbacks_or_skip_with_the_complete_preset_reason_set() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_392_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    let moving = application
        .start_departure_decision("2026-08-10-primary-1", "move-to-fallback")
        .unwrap();
    let reason_prompt = moving.departure_reason_prompt.as_ref().unwrap();
    assert_eq!("Why are you moving this workout?", reason_prompt.heading);
    assert_eq!(
        vec![
            "Work ran late",
            "Too tired",
            "Sick or injured",
            "Another commitment",
            "Other"
        ],
        reason_prompt.reasons
    );
    assert!(application
        .open()
        .unwrap()
        .departure_reason_prompt
        .is_some());
    assert_eq!(
        "That departure reason is not available.",
        application
            .confirm_departure_decision("2026-08-10-primary-1", "move-to-fallback", "Traffic")
            .unwrap_err()
    );

    let saturday = application
        .confirm_departure_decision("2026-08-10-primary-1", "move-to-fallback", "Work ran late")
        .unwrap();
    assert_eq!(
        "Moved to Saturday · Work ran late",
        saturday.primary_departures[0].status
    );
    assert_eq!(
        "Assigned from Monday",
        saturday.fallback_departures[0].availability
    );
    assert_eq!(1, saturday.fallback_available_count);

    clock.advance_to(1_786_564_800_000);
    application.open().unwrap();
    let sunday = application
        .confirm_departure_decision("2026-08-10-primary-2", "move-to-fallback", "Too tired")
        .unwrap();
    assert_eq!(
        "Moved to Sunday · Too tired",
        sunday.primary_departures[1].status
    );
    assert_eq!(
        "Assigned from Wednesday",
        sunday.fallback_departures[1].availability
    );
    assert_eq!(0, sunday.fallback_available_count);

    clock.advance_to(1_786_737_600_000);
    application.open().unwrap();
    assert_eq!(
        "No fallback slot remains available.",
        application
            .start_departure_decision("2026-08-10-primary-3", "move-to-fallback")
            .unwrap_err()
    );
    let skipping = application
        .start_departure_decision("2026-08-10-primary-3", "skip")
        .unwrap();
    assert_eq!(
        "Why are you skipping this workout?",
        skipping.departure_reason_prompt.as_ref().unwrap().heading
    );
    assert_eq!(
        vec![
            "Work ran late",
            "Too tired",
            "Sick or injured",
            "Another commitment",
            "Other"
        ],
        skipping.departure_reason_prompt.as_ref().unwrap().reasons
    );
    let skipped = application
        .confirm_departure_decision("2026-08-10-primary-3", "skip", "Sick or injured")
        .unwrap();
    assert_eq!(
        "Skipped · Sick or injured",
        skipped.primary_departures[2].status
    );

    let relaunched = ExerciseApplication::new(profile, reminders, clock);
    assert_eq!(skipped, relaunched.open().unwrap());
}

#[test]
fn assigned_fallback_uses_the_established_reminder_recording_and_progress_flow() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_392_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    application
        .confirm_departure_decision(
            "2026-08-10-primary-1",
            "move-to-fallback",
            "Another commitment",
        )
        .unwrap();

    clock.advance_to(1_786_824_000_000);
    let fallback_due = application.open().unwrap();
    assert_eq!(
        "2026-08-10-fallback-1",
        fallback_due.departure_prompt.as_ref().unwrap().slot_id
    );
    assert_eq!(
        vec![
            NotificationIntent {
                id: "exercise-departure-2026-08-10-fallback-1".into(),
                deliver_at_epoch_millis: 1_786_824_000_000,
                title: "Personal Dashboard".into(),
                body: "Time to leave for the gym.".into(),
                detail: "Saturday, August 15 at 4:00 PM".into(),
            },
            NotificationIntent {
                id: "exercise-follow-up-2026-08-10-fallback-1".into(),
                deliver_at_epoch_millis: 1_786_824_900_000,
                title: "Personal Dashboard".into(),
                body: "A gentle follow-up: are you leaving for the gym?".into(),
                detail: "Saturday, August 15 at 4:00 PM".into(),
            }
        ],
        reminders
            .scheduled
            .lock()
            .unwrap()
            .iter()
            .filter(|intent| intent.id.contains("fallback-1"))
            .cloned()
            .collect::<Vec<_>>()
    );

    let confirmed = application
        .respond_to_departure("2026-08-10-fallback-1", "leaving-for-gym")
        .unwrap();
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
    assert_eq!(
        vec![
            "exercise-follow-up-2026-08-10-primary-1",
            "exercise-follow-up-2026-08-10-fallback-1"
        ],
        *reminders.cancelled.lock().unwrap()
    );
    assert_eq!(
        Some(NotificationIntent {
            id: "exercise-record-workout-2026-08-10-fallback-1".into(),
            deliver_at_epoch_millis: 1_786_829_400_000,
            title: "Personal Dashboard".into(),
            body: "Record workout.".into(),
            detail: "Leaving confirmed Saturday, August 15 at 4:00 PM".into(),
        }),
        reminders
            .scheduled
            .lock()
            .unwrap()
            .iter()
            .find(|intent| intent.id == "exercise-record-workout-2026-08-10-fallback-1")
            .cloned()
    );

    clock.advance_to(1_786_829_400_000);
    assert_eq!(
        "2026-08-10-fallback-1",
        application
            .open()
            .unwrap()
            .workout_prompt
            .as_ref()
            .unwrap()
            .slot_id
    );
    application
        .start_workout_record("2026-08-10-fallback-1")
        .unwrap();
    application
        .choose_workout_activity("2026-08-10-fallback-1", "Weight training")
        .unwrap();
    application
        .choose_workout_duration("2026-08-10-fallback-1", "30")
        .unwrap();
    let completed = application
        .complete_workout_record("2026-08-10-fallback-1", "Hard")
        .unwrap();
    assert_eq!("1 of 3 completed", completed.progress);
    assert_eq!("Weight training", completed.workout_records[0].activity);
    assert_eq!(
        "Counts toward weekly progress",
        completed.workout_records[0].outcome
    );

    let relaunched = ExerciseApplication::new(profile, reminders, clock);
    assert_eq!(completed, relaunched.open().unwrap());
}

#[test]
fn unscheduled_workouts_use_the_click_only_flow_and_share_progress_rules() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_366_800_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    let ready = application.open().unwrap();
    assert_eq!("Log workout now", ready.manual_workout_action);
    let activity = application.start_unscheduled_workout_record().unwrap();
    assert_eq!(
        vec!["Elliptical", "Weight training", "Other exercise"],
        activity.workout_recording.as_ref().unwrap().choices
    );
    let qualifying = finish_unscheduled_workout(&application, "Weight training", "30", "Moderate");
    assert_eq!("1 of 3 completed", qualifying.progress);
    assert_eq!("Unscheduled workout", qualifying.workout_records[0].source);
    assert_eq!(
        "Counts toward weekly progress",
        qualifying.workout_records[0].outcome
    );

    clock.advance_to(1_786_370_400_000);
    let short = record_unscheduled_workout(&application, "Other exercise", "Under 20", "Easy");
    assert_eq!("1 of 3 completed", short.progress);
    assert_eq!(2, short.workout_records.len());
    assert_eq!("Unscheduled workout", short.workout_records[0].source);
    assert_eq!(
        "Short effort — does not count toward weekly progress",
        short.workout_records[0].outcome
    );

    let relaunched = ExerciseApplication::new(profile, reminders, clock);
    assert_eq!(short, relaunched.open().unwrap());
}

#[test]
fn workout_history_is_reverse_chronological_with_established_correction_presets() {
    let clock = FixedNewYorkClock::at(1_786_971_600_000);
    let application = ExerciseApplication::new(
        IsolatedProfile::default(),
        ReminderOutbox::default(),
        clock.clone(),
    );

    application.open().unwrap();
    record_unscheduled_workout(&application, "Elliptical", "20", "Easy");
    clock.advance_to(1_787_058_000_000);
    let history =
        record_unscheduled_workout(&application, "Weight training", "Under 20", "Very hard");

    assert_eq!(
        vec!["Weight training", "Elliptical"],
        history
            .workout_records
            .iter()
            .map(|record| record.activity.as_str())
            .collect::<Vec<_>>()
    );
    assert_eq!(
        vec![
            "Tuesday, August 18 at 9:00 AM",
            "Monday, August 17 at 9:00 AM"
        ],
        history
            .workout_records
            .iter()
            .map(|record| record.recorded_at.as_str())
            .collect::<Vec<_>>()
    );
    assert_eq!(
        vec!["Elliptical", "Weight training", "Other exercise"],
        history.workout_history_controls.activity_choices
    );
    assert_eq!(
        vec!["Under 20", "20", "30", "45", "60+ minutes"],
        history.workout_history_controls.duration_choices
    );
    assert_eq!(
        vec!["Very easy", "Easy", "Moderate", "Hard", "Very hard"],
        history.workout_history_controls.effort_choices
    );
    assert_eq!(
        (
            "Edit record",
            "Save correction",
            "Delete record",
            "Delete this workout record? This cannot be undone.",
            "Confirm delete",
            "Cancel"
        ),
        (
            history.workout_history_controls.edit_action.as_str(),
            history.workout_history_controls.save_action.as_str(),
            history.workout_history_controls.delete_action.as_str(),
            history.workout_history_controls.delete_prompt.as_str(),
            history
                .workout_history_controls
                .confirm_delete_action
                .as_str(),
            history
                .workout_history_controls
                .cancel_delete_action
                .as_str()
        )
    );
}

#[test]
fn correcting_current_and_historical_records_recomputes_the_owning_week() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_366_800_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    for (recorded_at, effort) in [
        (1_786_366_800_000, "Easy"),
        (1_786_370_400_000, "Moderate"),
        (1_786_374_000_000, "Hard"),
    ] {
        clock.advance_to(recorded_at);
        record_unscheduled_workout(&application, "Elliptical", "20", effort);
    }

    for (recorded_at, activity, duration, effort) in [
        (1_786_971_600_000, "Weight training", "20", "Moderate"),
        (1_787_058_000_000, "Other exercise", "30", "Hard"),
        (1_787_144_400_000, "Elliptical", "Under 20", "Very easy"),
    ] {
        clock.advance_to(recorded_at);
        application.open().unwrap();
        record_unscheduled_workout(&application, activity, duration, effort);
    }

    let before = application.open().unwrap();
    assert_eq!("2 of 3 completed", before.progress);
    assert_eq!("3 of 3 completed", before.history[0].progress);
    let current_record_id = before.workout_records[0].id.clone();
    let historical_record_id = before.history[0].workout_records[0].id.clone();

    let corrected = application
        .correct_workout_record(&current_record_id, "Weight training", "45", "Hard")
        .unwrap();
    assert_eq!("3 of 3 completed", corrected.progress);
    assert_eq!(
        Some("Weekly goal complete"),
        corrected.weekly_goal_status.as_deref()
    );
    assert_eq!(
        ("Weight training", "45", "Hard"),
        (
            corrected.workout_records[0].activity.as_str(),
            corrected.workout_records[0].duration.as_str(),
            corrected.workout_records[0].effort.as_str()
        )
    );

    let historical = application
        .correct_workout_record(
            &historical_record_id,
            "Other exercise",
            "Under 20",
            "Very easy",
        )
        .unwrap();
    assert_eq!("3 of 3 completed", historical.progress);
    assert_eq!("2 of 3 completed", historical.history[0].progress);
    assert!(historical.history[0]
        .primary_departures
        .iter()
        .all(|departure| departure.status == "Missed — no response"));
    assert_eq!(
        ("Other exercise", "Under 20", "Very easy"),
        (
            historical.history[0].workout_records[0].activity.as_str(),
            historical.history[0].workout_records[0].duration.as_str(),
            historical.history[0].workout_records[0].effort.as_str()
        )
    );

    let relaunched = ExerciseApplication::new(profile, reminders, clock);
    assert_eq!(historical, relaunched.open().unwrap());
}

#[test]
fn deleting_history_requires_confirmation_and_recomputes_historical_success() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_366_800_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    for (recorded_at, activity, effort) in [
        (1_786_366_800_000, "Elliptical", "Easy"),
        (1_786_370_400_000, "Other exercise", "Moderate"),
        (1_786_374_000_000, "Weight training", "Hard"),
    ] {
        clock.advance_to(recorded_at);
        record_unscheduled_workout(&application, activity, "30", effort);
    }

    clock.advance_to(1_786_971_600_000);
    let before = application.open().unwrap();
    assert_eq!("3 of 3 completed", before.history[0].progress);
    assert_eq!(3, before.history[0].workout_records.len());
    let record_id = before.history[0].workout_records[1].id.clone();

    let cancelled = application.open().unwrap();
    assert_eq!(before, cancelled);

    let deleted = application
        .confirm_workout_record_deletion(&record_id)
        .unwrap();
    assert_eq!("0 of 3 completed", deleted.progress);
    assert_eq!("2 of 3 completed", deleted.history[0].progress);
    assert_eq!(2, deleted.history[0].workout_records.len());
    assert!(deleted.history[0]
        .workout_records
        .iter()
        .all(|record| record.id != record_id));
    assert!(deleted.history[0]
        .primary_departures
        .iter()
        .all(|departure| departure.status == "Missed — no response"));

    let relaunched = ExerciseApplication::new(profile, reminders, clock);
    assert_eq!(deleted, relaunched.open().unwrap());
    assert_eq!(
        "That workout record is not available.",
        relaunched
            .confirm_workout_record_deletion(&record_id)
            .unwrap_err()
    );
}

#[test]
fn deleting_current_success_restores_future_departures_and_reminders() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_366_800_000);
    let application = ExerciseApplication::new(profile, reminders.clone(), clock.clone());

    application.open().unwrap();
    for (recorded_at, effort) in [
        (1_786_366_800_000, "Easy"),
        (1_786_370_400_000, "Moderate"),
        (1_786_374_000_000, "Hard"),
    ] {
        clock.advance_to(recorded_at);
        record_unscheduled_workout(&application, "Elliptical", "20", effort);
    }
    let success = application.open().unwrap();
    assert_eq!(
        Some("Weekly goal complete"),
        success.weekly_goal_status.as_deref()
    );
    assert!(success
        .primary_departures
        .iter()
        .all(|departure| departure.status == "Weekly goal met — no workout needed"));
    let record_id = success.workout_records[1].id.clone();

    let restored = application
        .confirm_workout_record_deletion(&record_id)
        .unwrap();
    assert_eq!("2 of 3 completed", restored.progress);
    assert_eq!(None, restored.weekly_goal_status);
    assert_eq!(
        Some("Monday, August 10 at 4:00 PM"),
        restored.next_departure.as_deref()
    );
    assert!(restored
        .primary_departures
        .iter()
        .all(|departure| departure.status == "Scheduled"));
    assert!(restored
        .fallback_departures
        .iter()
        .all(|departure| departure.availability == "Available"));
    assert_eq!(2, restored.fallback_available_count);
    assert_eq!(
        2,
        reminders
            .scheduled
            .lock()
            .unwrap()
            .iter()
            .filter(|intent| intent.id == "exercise-departure-2026-08-10-primary-1")
            .count()
    );
    assert!(reminders
        .cancelled
        .lock()
        .unwrap()
        .contains(&"exercise-departure-2026-08-10-primary-1".to_string()));
}

#[test]
fn mixed_sources_complete_the_goal_and_allow_an_optional_extra_workout() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_366_800_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    record_unscheduled_workout(&application, "Weight training", "30", "Moderate");

    clock.advance_to(1_786_392_000_000);
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
        .complete_workout_record("2026-08-10-primary-1", "Easy")
        .unwrap();

    clock.advance_to(1_786_564_800_000);
    application.open().unwrap();
    application
        .confirm_departure_decision(
            "2026-08-10-primary-2",
            "move-to-fallback",
            "Another commitment",
        )
        .unwrap();
    clock.advance_to(1_786_737_600_000);
    application.open().unwrap();
    application
        .confirm_departure_decision("2026-08-10-primary-3", "move-to-fallback", "Work ran late")
        .unwrap();

    clock.advance_to(1_786_824_000_000);
    application.open().unwrap();
    application
        .respond_to_departure("2026-08-10-fallback-1", "leaving-for-gym")
        .unwrap();
    clock.advance_to(1_786_829_400_000);
    application
        .start_workout_record("2026-08-10-fallback-1")
        .unwrap();
    application
        .choose_workout_activity("2026-08-10-fallback-1", "Other exercise")
        .unwrap();
    application
        .choose_workout_duration("2026-08-10-fallback-1", "45")
        .unwrap();
    let success = application
        .complete_workout_record("2026-08-10-fallback-1", "Hard")
        .unwrap();

    assert_eq!("3 of 3 completed", success.progress);
    assert_eq!(
        Some("Weekly goal complete"),
        success.weekly_goal_status.as_deref()
    );
    assert_eq!(None, success.next_departure);
    assert_eq!(None, success.departure_prompt);
    assert_eq!(
        vec!["Fallback workout", "Primary workout", "Unscheduled workout"],
        success
            .workout_records
            .iter()
            .map(|record| record.source.as_str())
            .collect::<Vec<_>>()
    );
    assert_eq!(
        "Assigned from Friday · Weekly goal met — no workout needed",
        success.fallback_departures[1].availability
    );

    clock.advance_to(1_786_831_200_000);
    let optional = application.start_unscheduled_workout_record().unwrap();
    assert_eq!(
        "Weekly goal complete — optional workouts welcome",
        optional.reminder_message
    );
    let extra = finish_unscheduled_workout(&application, "Elliptical", "60+ minutes", "Very hard");
    assert_eq!("4 of 3 completed", extra.progress);
    assert_eq!(
        Some("Weekly goal complete"),
        extra.weekly_goal_status.as_deref()
    );
    assert_eq!(None, extra.next_departure);
    assert_eq!(None, extra.departure_prompt);

    let relaunched = ExerciseApplication::new(profile, reminders, clock);
    assert_eq!(extra, relaunched.open().unwrap());
}

#[test]
fn reaching_the_goal_cancels_and_suppresses_remaining_planned_obligations() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_392_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    application
        .confirm_departure_decision("2026-08-10-primary-1", "move-to-fallback", "Work ran late")
        .unwrap();
    clock.advance_to(1_786_395_600_000);
    for effort in ["Easy", "Moderate", "Hard"] {
        record_unscheduled_workout(&application, "Other exercise", "20", effort);
    }

    let success = application.open().unwrap();
    assert_eq!("3 of 3 completed", success.progress);
    assert_eq!(
        "Moved to Saturday · Work ran late",
        success.primary_departures[0].status
    );
    assert_eq!(
        "Weekly goal met — no workout needed",
        success.primary_departures[1].status
    );
    assert_eq!(
        "Weekly goal met — no workout needed",
        success.primary_departures[2].status
    );
    assert_eq!(
        "Assigned from Monday · Weekly goal met — no workout needed",
        success.fallback_departures[0].availability
    );
    assert_eq!(None, success.reminder_intent);
    assert_eq!(
        vec![
            "exercise-follow-up-2026-08-10-primary-1",
            "exercise-departure-2026-08-10-primary-2",
            "exercise-follow-up-2026-08-10-primary-2"
        ],
        *reminders.cancelled.lock().unwrap()
    );
    let scheduled_before_relaunch = reminders.scheduled.lock().unwrap().len();

    clock.advance_to(1_786_824_000_000);
    let relaunched = ExerciseApplication::new(profile, reminders.clone(), clock);
    let saturday = relaunched.open().unwrap();
    assert_eq!(
        "Weekly goal complete — optional workouts welcome",
        saturday.reminder_message
    );
    assert_eq!(None, saturday.departure_prompt);
    assert_eq!(
        scheduled_before_relaunch,
        reminders.scheduled.lock().unwrap().len()
    );
}

#[test]
fn reaching_the_goal_suppresses_an_unrecorded_leaving_slot_without_promising_a_reminder() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_392_000_000);
    let application = ExerciseApplication::new(profile, reminders.clone(), clock);

    application.open().unwrap();
    application
        .respond_to_departure("2026-08-10-primary-1", "leaving-for-gym")
        .unwrap();
    for effort in ["Easy", "Moderate", "Hard"] {
        record_unscheduled_workout(&application, "Other exercise", "20", effort);
    }

    let success = application.open().unwrap();
    assert_eq!("3 of 3 completed", success.progress);
    assert_eq!(
        "Weekly goal met — no workout needed",
        success.primary_departures[0].status
    );
    assert_eq!(None, success.departure_confirmation);
    assert!(reminders
        .cancelled
        .lock()
        .unwrap()
        .contains(&"exercise-record-workout-2026-08-10-primary-1".to_string()));
}

#[test]
fn recovery_ignores_expired_fallbacks_and_abandoned_reason_selection() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_737_600_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    clock.advance_to(1_786_827_600_000);
    let moved = application
        .confirm_departure_decision(
            "2026-08-10-primary-3",
            "move-to-fallback",
            "Another commitment",
        )
        .unwrap();
    assert_eq!(
        "No longer available",
        moved.fallback_departures[0].availability
    );
    assert_eq!(
        "Assigned from Friday",
        moved.fallback_departures[1].availability
    );
    assert_eq!(0, moved.fallback_available_count);

    let exhausted_profile = IsolatedProfile::default();
    let exhausted_clock = FixedNewYorkClock::at(1_786_917_600_000);
    let exhausted = ExerciseApplication::new(
        exhausted_profile,
        ReminderOutbox::default(),
        exhausted_clock,
    );
    let exhausted_view = exhausted.open().unwrap();
    assert_eq!(
        vec!["No longer available", "No longer available"],
        exhausted_view
            .fallback_departures
            .iter()
            .map(|departure| departure.availability.as_str())
            .collect::<Vec<_>>()
    );
    assert_eq!(0, exhausted_view.fallback_available_count);
    assert_eq!(
        "No fallback slot remains available.",
        exhausted
            .start_departure_decision("2026-08-10-primary-3", "move-to-fallback")
            .unwrap_err()
    );

    let abandoned_profile = IsolatedProfile::default();
    let abandoned_clock = FixedNewYorkClock::at(1_786_737_600_000);
    let abandoned = ExerciseApplication::new(
        abandoned_profile.clone(),
        ReminderOutbox::default(),
        abandoned_clock.clone(),
    );
    abandoned.open().unwrap();
    assert!(abandoned
        .start_departure_decision("2026-08-10-primary-3", "skip")
        .unwrap()
        .departure_reason_prompt
        .is_some());

    abandoned_clock.advance_to(1_786_996_800_000);
    let next_week = ExerciseApplication::new(
        abandoned_profile,
        ReminderOutbox::default(),
        abandoned_clock,
    );
    let recovered = next_week.open().unwrap();
    assert_eq!(None, recovered.departure_reason_prompt);
    assert_eq!(
        "2026-08-17-primary-1",
        recovered.departure_prompt.as_ref().unwrap().slot_id
    );
    assert!(next_week
        .respond_to_departure("2026-08-17-primary-1", "leaving-for-gym")
        .is_ok());
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
fn old_schema_in_progress_workout_resumes_through_the_current_application() {
    let profile = IsolatedProfile::default();
    let reminders = ReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_392_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    application
        .respond_to_departure("2026-08-10-primary-1", "leaving-for-gym")
        .unwrap();
    clock.advance_to(1_786_397_400_000);
    application.open().unwrap();
    application
        .start_workout_record("2026-08-10-primary-1")
        .unwrap();
    application
        .choose_workout_activity("2026-08-10-primary-1", "Elliptical")
        .unwrap();

    let mut old_document: serde_json::Value = serde_json::from_slice(
        profile
            .document
            .lock()
            .unwrap()
            .as_deref()
            .expect("exercise state was saved"),
    )
    .unwrap();
    old_document["schema_version"] = 7.into();
    old_document["workout_draft"]
        .as_object_mut()
        .unwrap()
        .remove("source");
    *profile.document.lock().unwrap() = Some(serde_json::to_vec(&old_document).unwrap());

    let relaunched = ExerciseApplication::new(profile, reminders, clock);
    let resumed = relaunched.open().unwrap();
    assert_eq!(
        vec!["Under 20", "20", "30", "45", "60+ minutes"],
        resumed.workout_recording.unwrap().choices
    );

    relaunched
        .choose_workout_duration("2026-08-10-primary-1", "20")
        .unwrap();
    let completed = relaunched
        .complete_workout_record("2026-08-10-primary-1", "Moderate")
        .unwrap();
    assert_eq!("1 of 3 completed", completed.progress);
    assert_eq!("Elliptical", completed.workout_records[0].activity);
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

#[test]
fn interrupted_one_week_adjustment_is_reconciled_after_cancellation_failure() {
    let profile = FaultingPersistence::default();
    let reminders = RecoverableReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_626_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    reminders.fail_on_cancel_call(reminders.cancel_calls.lock().unwrap().saturating_add(1));

    assert!(application
        .adjust_current_week_departure("2026-08-10-primary-3", "Saturday", "17:30")
        .is_err());

    let persisted = profile.document_json();
    assert_eq!(
        "Saturday",
        persisted["weeks"][0]["primary_departures"][2]["day"]
    );
    assert!(persisted["pending_reminder_reconciliation"].is_object());

    reminders.clear_failure();
    let relaunched = ExerciseApplication::new(profile.clone(), reminders.clone(), clock);
    let dashboard = relaunched.open().unwrap();

    assert_eq!("Saturday", dashboard.primary_departures[2].day);
    assert_eq!(
        vec![
            "exercise-departure-2026-08-10-primary-3",
            "exercise-follow-up-2026-08-10-primary-3"
        ],
        reminders.active_ids()
    );
    assert!(relaunched.open().is_ok());
    assert_eq!(2, reminders.active_ids().len());
    assert!(profile.document_json()["pending_reminder_reconciliation"].is_null());
}

#[test]
fn interrupted_one_week_adjustment_is_reconciled_after_partial_cancellation() {
    let profile = FaultingPersistence::default();
    let reminders = RecoverableReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_626_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    reminders.fail_on_cancel_call(reminders.cancel_calls.lock().unwrap().saturating_add(2));

    assert!(application
        .adjust_current_week_departure("2026-08-10-primary-3", "Saturday", "17:30")
        .is_err());
    assert!(profile.document_json()["pending_reminder_reconciliation"].is_object());

    reminders.clear_failure();
    ExerciseApplication::new(profile.clone(), reminders.clone(), clock)
        .open()
        .unwrap();

    assert_eq!(2, reminders.active_ids().len());
    assert!(profile.document_json()["pending_reminder_reconciliation"].is_null());
}

#[test]
fn schedule_change_persistence_failure_happens_before_native_effects() {
    let profile = FaultingPersistence::default();
    let reminders = RecoverableReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_626_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    let active_before = reminders.active_ids();
    profile.fail_on_save_call(profile.save_call_count() + 1);

    assert!(application
        .adjust_current_week_departure("2026-08-10-primary-3", "Saturday", "17:30")
        .is_err());
    assert_eq!(active_before, reminders.active_ids());
    assert_eq!(
        "Friday",
        profile.document_json()["weeks"][0]["primary_departures"][2]["day"]
    );
    assert!(profile.document_json()["pending_reminder_reconciliation"].is_null());

    reminders.clear_failure();
    let recovered = application
        .adjust_current_week_departure("2026-08-10-primary-3", "Saturday", "17:30")
        .unwrap();
    assert_eq!("Saturday", recovered.primary_departures[2].day);
}

#[test]
fn interrupted_one_week_adjustment_is_reconciled_after_partial_scheduling() {
    let profile = FaultingPersistence::default();
    let reminders = RecoverableReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_626_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    reminders.fail_on_schedule_call(reminders.schedule_call_count() + 2);

    assert!(application
        .adjust_current_week_departure("2026-08-10-primary-3", "Saturday", "17:30")
        .is_err());
    assert!(profile.document_json()["pending_reminder_reconciliation"].is_object());

    reminders.clear_failure();
    let relaunched = ExerciseApplication::new(profile.clone(), reminders.clone(), clock);
    relaunched.open().unwrap();

    assert_eq!(
        vec![
            "exercise-departure-2026-08-10-primary-3",
            "exercise-follow-up-2026-08-10-primary-3"
        ],
        reminders.active_ids()
    );
    assert!(profile.document_json()["pending_reminder_reconciliation"].is_null());
}

#[test]
fn interrupted_one_week_adjustment_is_reconciled_after_final_persistence_failure() {
    let profile = FaultingPersistence::default();
    let reminders = RecoverableReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_626_000_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    let transition_save = profile.save_call_count() + 1;
    let final_save = transition_save + 1;
    profile.fail_on_save_call(final_save);

    assert!(application
        .adjust_current_week_departure("2026-08-10-primary-3", "Saturday", "17:30")
        .is_err());
    assert!(profile.document_json()["pending_reminder_reconciliation"].is_object());
    assert_eq!(2, reminders.active_ids().len());

    let relaunched = ExerciseApplication::new(profile.clone(), reminders.clone(), clock);
    relaunched.open().unwrap();

    assert_eq!(2, reminders.active_ids().len());
    assert!(profile.document_json()["pending_reminder_reconciliation"].is_null());
}

#[test]
fn repeating_routine_reconciliation_is_idempotent_and_replaces_old_week_reminders() {
    let profile = FaultingPersistence::default();
    let reminders = RecoverableReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_366_800_000);
    let application = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    application.open().unwrap();
    application
        .change_repeating_primary_departure(1, "Tuesday", "15:30")
        .unwrap();
    let calls_after_change = reminders.schedule_call_count();
    assert!(profile.document_json()["pending_reminder_reconciliation"].is_null());

    let relaunched = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());
    relaunched.open().unwrap();
    assert_eq!(calls_after_change, reminders.schedule_call_count());

    clock.advance_to(1_786_971_600_000);
    relaunched.open().unwrap();
    assert_eq!(
        vec![
            "exercise-departure-2026-08-17-primary-1",
            "exercise-follow-up-2026-08-17-primary-1"
        ],
        reminders.active_ids()
    );
    assert!(profile.document_json()["pending_reminder_reconciliation"].is_null());
}

#[test]
fn inactive_profiles_never_schedule_pending_exercise_reconciliation() {
    let profile = FaultingPersistence::default();
    let reminders = RecoverableReminderOutbox::default();
    let clock = FixedNewYorkClock::at(1_786_626_000_000);
    let active = ExerciseApplication::new(profile.clone(), reminders.clone(), clock.clone());

    active.open().unwrap();
    reminders.fail_on_cancel_call(reminders.cancel_calls.lock().unwrap().saturating_add(1));
    assert!(active
        .adjust_current_week_departure("2026-08-10-primary-3", "Saturday", "17:30")
        .is_err());
    let schedule_calls_before = reminders.schedule_call_count();

    let inactive = ExerciseApplication::with_authority(
        profile,
        reminders.clone(),
        clock,
        InactiveExerciseAuthority,
        NoPendingNotificationCancellations,
    );
    inactive.open().unwrap();

    assert_eq!(schedule_calls_before, reminders.schedule_call_count());
}
