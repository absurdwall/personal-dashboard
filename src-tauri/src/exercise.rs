use crate::notification::{NotificationIntent, NotificationPermission, NotificationPlatform};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

const EXERCISE_SCHEMA_VERSION: u32 = 4;
const WEEKLY_GOAL: u32 = 3;
const DEPARTURE_HOUR: i64 = 16;
const FOLLOW_UP_DELAY_MILLIS: i64 = 15 * 60 * 1_000;
const RECORD_WORKOUT_DELAY_MILLIS: i64 = 90 * 60 * 1_000;
const PRIMARY_DAYS: [(i64, &str); 3] = [(0, "Monday"), (2, "Wednesday"), (4, "Friday")];
const FALLBACK_DAYS: [(i64, &str); 2] = [(5, "Saturday"), (6, "Sunday")];
const MONTH_NAMES: [&str; 12] = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];
pub trait ExercisePersistence: Send + Sync {
    fn load(&self) -> Result<Option<Vec<u8>>, String>;
    fn save(&self, document: &[u8]) -> Result<(), String>;
}

pub trait ExerciseClock: Send + Sync {
    fn now_epoch_millis(&self) -> i64;
    fn utc_offset_minutes_at(&self, epoch_millis: i64) -> i32;
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct ExerciseState {
    schema_version: u32,
    routine: Routine,
    weeks: Vec<ExerciseWeek>,
    #[serde(default)]
    workout_draft: Option<WorkoutDraft>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct Routine {
    weekly_goal: u32,
    primary: Vec<RoutineDeparture>,
    fallback: Vec<RoutineDeparture>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct RoutineDeparture {
    weekday: i64,
    day: String,
    departure_time: String,
    order: u32,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct ExerciseWeek {
    week_start: String,
    week_end: String,
    completed_count: u32,
    primary_departures: Vec<PlannedDeparture>,
    fallback_departures: Vec<PlannedDeparture>,
    #[serde(default)]
    workout_records: Vec<WorkoutRecord>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct WorkoutDraft {
    slot_id: String,
    activity: Option<WorkoutActivity>,
    duration: Option<WorkoutDuration>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct WorkoutRecord {
    id: String,
    source_slot_id: String,
    recorded_at_epoch_millis: i64,
    activity: WorkoutActivity,
    duration: WorkoutDuration,
    effort: PerceivedEffort,
}

trait WorkoutChoice: Copy + Sized + 'static {
    const ALL: &'static [Self];

    fn label(self) -> &'static str;

    fn from_label(label: &str) -> Option<Self> {
        Self::ALL
            .iter()
            .copied()
            .find(|choice| choice.label() == label)
    }
}

macro_rules! persist_workout_choice {
    ($choice:ty) => {
        impl Serialize for $choice {
            fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
                serializer.serialize_str(self.label())
            }
        }

        impl<'de> Deserialize<'de> for $choice {
            fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
                let label = String::deserialize(deserializer)?;
                Self::from_label(&label)
                    .ok_or_else(|| serde::de::Error::custom("unsupported workout choice"))
            }
        }
    };
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum WorkoutActivity {
    Elliptical,
    WeightTraining,
    OtherExercise,
}

impl WorkoutChoice for WorkoutActivity {
    const ALL: &'static [Self] = &[Self::Elliptical, Self::WeightTraining, Self::OtherExercise];

    fn label(self) -> &'static str {
        match self {
            Self::Elliptical => "Elliptical",
            Self::WeightTraining => "Weight training",
            Self::OtherExercise => "Other exercise",
        }
    }
}
persist_workout_choice!(WorkoutActivity);

#[derive(Clone, Copy, Debug, PartialEq)]
enum WorkoutDuration {
    Under20,
    Minutes20,
    Minutes30,
    Minutes45,
    Minutes60Plus,
}

impl WorkoutChoice for WorkoutDuration {
    const ALL: &'static [Self] = &[
        Self::Under20,
        Self::Minutes20,
        Self::Minutes30,
        Self::Minutes45,
        Self::Minutes60Plus,
    ];

    fn label(self) -> &'static str {
        match self {
            Self::Under20 => "Under 20",
            Self::Minutes20 => "20",
            Self::Minutes30 => "30",
            Self::Minutes45 => "45",
            Self::Minutes60Plus => "60+ minutes",
        }
    }
}
persist_workout_choice!(WorkoutDuration);

impl WorkoutDuration {
    fn qualifies(self) -> bool {
        self != Self::Under20
    }
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum PerceivedEffort {
    VeryEasy,
    Easy,
    Moderate,
    Hard,
    VeryHard,
}

impl WorkoutChoice for PerceivedEffort {
    const ALL: &'static [Self] = &[
        Self::VeryEasy,
        Self::Easy,
        Self::Moderate,
        Self::Hard,
        Self::VeryHard,
    ];

    fn label(self) -> &'static str {
        match self {
            Self::VeryEasy => "Very easy",
            Self::Easy => "Easy",
            Self::Moderate => "Moderate",
            Self::Hard => "Hard",
            Self::VeryHard => "Very hard",
        }
    }
}
persist_workout_choice!(PerceivedEffort);

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct PlannedDeparture {
    id: String,
    day: String,
    date: String,
    departure_at_epoch_millis: i64,
    status: DepartureStatus,
    reminder_scheduled_at_epoch_millis: Option<i64>,
    #[serde(default)]
    follow_up_scheduled_at_epoch_millis: Option<i64>,
    #[serde(default)]
    departure_response: Option<DepartureResponse>,
    #[serde(default)]
    record_workout_prompt_due_at_epoch_millis: Option<i64>,
    #[serde(default)]
    record_workout_reminder_scheduled_at_epoch_millis: Option<i64>,
    #[serde(default)]
    assigned_from_slot_id: Option<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum DepartureStatus {
    Scheduled,
    Available,
    Leaving,
    Moved,
    Skipped,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct DepartureResponse {
    outcome: DepartureOutcome,
    recorded_at_epoch_millis: i64,
    #[serde(default)]
    reason: Option<DepartureReason>,
    #[serde(default)]
    fallback_slot_id: Option<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum DepartureOutcome {
    LeavingForGym,
    MoveToFallback,
    Skip,
}

#[derive(Clone, Copy, Debug, PartialEq)]
enum DepartureReason {
    WorkRanLate,
    TooTired,
    SickOrInjured,
    AnotherCommitment,
    Other,
}

impl DepartureReason {
    const ALL: &'static [Self] = &[
        Self::WorkRanLate,
        Self::TooTired,
        Self::SickOrInjured,
        Self::AnotherCommitment,
        Self::Other,
    ];

    fn label(self) -> &'static str {
        match self {
            Self::WorkRanLate => "Work ran late",
            Self::TooTired => "Too tired",
            Self::SickOrInjured => "Sick or injured",
            Self::AnotherCommitment => "Another commitment",
            Self::Other => "Other",
        }
    }

    fn from_label(label: &str) -> Option<Self> {
        Self::ALL
            .iter()
            .copied()
            .find(|reason| reason.label() == label)
    }
}

impl Serialize for DepartureReason {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        serializer.serialize_str(self.label())
    }
}

impl<'de> Deserialize<'de> for DepartureReason {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let label = String::deserialize(deserializer)?;
        Self::from_label(&label)
            .ok_or_else(|| serde::de::Error::custom("unsupported departure reason"))
    }
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrimaryDepartureView {
    pub id: String,
    pub day: String,
    pub time: String,
    pub status: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FallbackDepartureView {
    pub id: String,
    pub day: String,
    pub time: String,
    pub availability: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DeparturePromptView {
    pub slot_id: String,
    pub heading: String,
    pub actions: Vec<String>,
    pub status: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DepartureReasonPromptView {
    pub slot_id: String,
    pub outcome: String,
    pub heading: String,
    pub reasons: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DepartureConfirmationView {
    pub message: String,
    pub next_prompt: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutPromptView {
    pub slot_id: String,
    pub heading: String,
    pub action: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutRecordingView {
    pub slot_id: String,
    pub heading: String,
    pub guidance: String,
    pub choice_name: String,
    pub choices: Vec<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutRecordView {
    pub id: String,
    pub activity: String,
    pub duration: String,
    pub effort: String,
    pub outcome: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseDashboardView {
    pub product_name: String,
    pub feature_area: String,
    pub schema_version: u32,
    pub week_label: String,
    pub progress: String,
    pub next_departure: Option<String>,
    pub primary_departures: Vec<PrimaryDepartureView>,
    pub fallback_departures: Vec<FallbackDepartureView>,
    pub fallback_available_count: usize,
    pub reminder_intent: Option<NotificationIntent>,
    pub reminder_message: String,
    pub departure_prompt: Option<DeparturePromptView>,
    pub departure_reason_prompt: Option<DepartureReasonPromptView>,
    pub departure_confirmation: Option<DepartureConfirmationView>,
    pub workout_prompt: Option<WorkoutPromptView>,
    pub workout_recording: Option<WorkoutRecordingView>,
    pub workout_records: Vec<WorkoutRecordView>,
}

pub struct ExerciseApplication<P, N, C> {
    persistence: P,
    notifications: N,
    clock: C,
}

impl<P: ExercisePersistence, N: NotificationPlatform, C: ExerciseClock>
    ExerciseApplication<P, N, C>
{
    pub fn new(persistence: P, notifications: N, clock: C) -> Self {
        Self {
            persistence,
            notifications,
            clock,
        }
    }

    pub fn open(&self) -> Result<ExerciseDashboardView, String> {
        let now = self.clock.now_epoch_millis();
        let (mut state, mut changed) = self.current_state()?;
        let week_start_day = local_day_number(&self.clock, now) - local_weekday(&self.clock, now);
        let week_key = date_from_day_number(week_start_day).iso_date();
        if !state.weeks.iter().any(|week| week.week_start == week_key) {
            state
                .weeks
                .push(make_week(&state.routine, &self.clock, week_start_day));
            changed = true;
        }

        let week = state
            .weeks
            .iter_mut()
            .find(|week| week.week_start == week_key)
            .expect("the current week was just ensured");
        let next_id =
            next_scheduled_departure(week, &self.clock, now).map(|departure| departure.id.clone());
        let visible_reminder_intent =
            next_scheduled_departure(week, &self.clock, now).map(reminder_intent);
        let mut reminder_message = "No departure reminder remains this week.".to_string();

        if let Some(next_id) = next_id {
            let departure = all_departures_mut(week)
                .find(|departure| departure.id == next_id)
                .expect("the next departure belongs to this week");
            reminder_message = if departure.reminder_scheduled_at_epoch_millis.is_some()
                && departure.follow_up_scheduled_at_epoch_millis.is_some()
            {
                "Next departure reminder is scheduled.".into()
            } else {
                match self.notifications.permission() {
                    Ok(NotificationPermission::Granted) => {
                        if departure.reminder_scheduled_at_epoch_millis.is_none() {
                            self.notifications.schedule(reminder_intent(departure))?;
                            departure.reminder_scheduled_at_epoch_millis = Some(now);
                            changed = true;
                        }
                        if departure.follow_up_scheduled_at_epoch_millis.is_none() {
                            self.notifications.schedule(follow_up_intent(departure))?;
                            departure.follow_up_scheduled_at_epoch_millis = Some(now);
                            changed = true;
                        }
                        "Next departure reminder is scheduled.".into()
                    }
                    Ok(NotificationPermission::Denied) => {
                        "Allow notifications in system settings to receive departure reminders."
                            .into()
                    }
                    Ok(NotificationPermission::Prompt) => {
                        "Allow notifications to receive departure reminders.".into()
                    }
                    Err(_) => "Notification status is temporarily unavailable.".into(),
                }
            };
        }

        if self.notifications.permission() == Ok(NotificationPermission::Granted) {
            for departure in all_departures_mut(week) {
                if departure.status == DepartureStatus::Leaving
                    && departure
                        .record_workout_reminder_scheduled_at_epoch_millis
                        .is_none()
                {
                    if let Some(due_at) = departure.record_workout_prompt_due_at_epoch_millis {
                        self.notifications
                            .schedule(record_workout_intent(departure, due_at))?;
                        departure.record_workout_reminder_scheduled_at_epoch_millis = Some(now);
                        changed = true;
                    }
                }
            }
        }

        if changed {
            self.save_state(&state)?;
        }

        let week = state
            .weeks
            .iter()
            .find(|week| week.week_start == week_key)
            .expect("the current week was just ensured");
        Ok(dashboard_view(
            &state,
            week,
            &self.clock,
            now,
            next_scheduled_departure(week, &self.clock, now),
            visible_reminder_intent,
            reminder_message,
        ))
    }

    pub fn respond_to_departure(
        &self,
        slot_id: &str,
        action: &str,
    ) -> Result<ExerciseDashboardView, String> {
        if action != "leaving-for-gym" {
            return Err("That departure response is not available yet.".into());
        }

        let now = self.clock.now_epoch_millis();
        let (mut state, _) = self.current_state()?;
        let week_start_day = local_day_number(&self.clock, now) - local_weekday(&self.clock, now);
        let week_key = date_from_day_number(week_start_day).iso_date();
        let week = state
            .weeks
            .iter_mut()
            .find(|week| week.week_start == week_key)
            .ok_or_else(|| "The current exercise week is unavailable.".to_string())?;
        let departure = decidable_departure_mut(week, slot_id, now)?;

        let due_at = now + RECORD_WORKOUT_DELAY_MILLIS;
        if self.notifications.permission()? == NotificationPermission::Granted {
            self.notifications
                .schedule(record_workout_intent(departure, due_at))?;
            departure.record_workout_reminder_scheduled_at_epoch_millis = Some(now);
        }
        if departure.follow_up_scheduled_at_epoch_millis.is_some() {
            self.notifications.cancel(&follow_up_intent(departure).id)?;
        }
        departure.status = DepartureStatus::Leaving;
        departure.departure_response = Some(DepartureResponse {
            outcome: DepartureOutcome::LeavingForGym,
            recorded_at_epoch_millis: now,
            reason: None,
            fallback_slot_id: None,
        });
        departure.record_workout_prompt_due_at_epoch_millis = Some(due_at);
        self.save_state(&state)?;
        self.open()
    }

    pub fn start_departure_decision(
        &self,
        slot_id: &str,
        outcome: &str,
    ) -> Result<ExerciseDashboardView, String> {
        let outcome = departure_decision_outcome(outcome)?;
        let now = self.clock.now_epoch_millis();
        let (state, _) = self.current_state()?;
        let week = current_week(&state, &self.clock, now)?;
        decidable_departure(week, slot_id, now)?;
        if outcome == DepartureOutcome::MoveToFallback
            && next_available_fallback_index(week, now).is_none()
        {
            return Err("No fallback slot remains available.".into());
        }

        let mut dashboard = self.open()?;
        dashboard.departure_reason_prompt = Some(DepartureReasonPromptView {
            slot_id: slot_id.into(),
            outcome: outcome_label(outcome).into(),
            heading: match outcome {
                DepartureOutcome::MoveToFallback => "Why are you moving this workout?",
                DepartureOutcome::Skip => "Why are you skipping this workout?",
                DepartureOutcome::LeavingForGym => unreachable!("validated decision outcome"),
            }
            .into(),
            reasons: DepartureReason::ALL
                .iter()
                .map(|reason| reason.label().into())
                .collect(),
        });
        dashboard.departure_prompt = None;
        Ok(dashboard)
    }

    pub fn confirm_departure_decision(
        &self,
        slot_id: &str,
        outcome: &str,
        reason: &str,
    ) -> Result<ExerciseDashboardView, String> {
        let outcome = departure_decision_outcome(outcome)?;
        let reason = DepartureReason::from_label(reason)
            .ok_or_else(|| "That departure reason is not available.".to_string())?;
        let now = self.clock.now_epoch_millis();
        let (mut state, _) = self.current_state()?;
        let week = current_week_mut(&mut state, &self.clock, now)?;
        let source = decidable_departure(week, slot_id, now)?;
        let source_id = source.id.clone();
        let follow_up_id = source
            .follow_up_scheduled_at_epoch_millis
            .map(|_| follow_up_intent(source).id);

        let fallback_slot_id = if outcome == DepartureOutcome::MoveToFallback {
            let fallback_index = next_available_fallback_index(week, now)
                .ok_or_else(|| "No fallback slot remains available.".to_string())?;
            let fallback = &mut week.fallback_departures[fallback_index];
            fallback.status = DepartureStatus::Scheduled;
            fallback.assigned_from_slot_id = Some(source_id.clone());
            Some(fallback.id.clone())
        } else {
            None
        };

        let source = decidable_departure_mut(week, slot_id, now)?;
        source.status = match outcome {
            DepartureOutcome::MoveToFallback => DepartureStatus::Moved,
            DepartureOutcome::Skip => DepartureStatus::Skipped,
            DepartureOutcome::LeavingForGym => unreachable!("validated decision outcome"),
        };
        source.departure_response = Some(DepartureResponse {
            outcome,
            recorded_at_epoch_millis: now,
            reason: Some(reason),
            fallback_slot_id,
        });
        if let Some(follow_up_id) = follow_up_id {
            self.notifications.cancel(&follow_up_id)?;
        }
        self.save_state(&state)?;
        self.open()
    }

    pub fn start_workout_record(&self, slot_id: &str) -> Result<ExerciseDashboardView, String> {
        let now = self.clock.now_epoch_millis();
        let (mut state, _) = self.current_state()?;
        if state.workout_draft.is_some() {
            return Err("A workout record is already in progress.".into());
        }
        let week = current_week(&state, &self.clock, now)?;
        recordable_departure(week, slot_id, now)?;
        state.workout_draft = Some(WorkoutDraft {
            slot_id: slot_id.into(),
            activity: None,
            duration: None,
        });
        self.save_state(&state)?;
        self.open()
    }

    pub fn choose_workout_activity(
        &self,
        slot_id: &str,
        activity: &str,
    ) -> Result<ExerciseDashboardView, String> {
        let activity = WorkoutActivity::from_label(activity)
            .ok_or_else(|| "That workout activity is not available.".to_string())?;
        let (mut state, _) = self.current_state()?;
        let draft = workout_draft_for(&mut state, slot_id)?;
        if draft.activity.is_some() {
            return Err("The workout activity has already been selected.".into());
        }
        draft.activity = Some(activity);
        self.save_state(&state)?;
        self.open()
    }

    pub fn choose_workout_duration(
        &self,
        slot_id: &str,
        duration: &str,
    ) -> Result<ExerciseDashboardView, String> {
        let duration = WorkoutDuration::from_label(duration)
            .ok_or_else(|| "That workout duration is not available.".to_string())?;
        let (mut state, _) = self.current_state()?;
        let draft = workout_draft_for(&mut state, slot_id)?;
        if draft.activity.is_none() || draft.duration.is_some() {
            return Err("The workout duration is not ready for selection.".into());
        }
        draft.duration = Some(duration);
        self.save_state(&state)?;
        self.open()
    }

    pub fn complete_workout_record(
        &self,
        slot_id: &str,
        effort: &str,
    ) -> Result<ExerciseDashboardView, String> {
        let effort = PerceivedEffort::from_label(effort)
            .ok_or_else(|| "That perceived effort is not available.".to_string())?;
        let now = self.clock.now_epoch_millis();
        let (mut state, _) = self.current_state()?;
        let draft = state
            .workout_draft
            .as_ref()
            .filter(|draft| draft.slot_id == slot_id)
            .ok_or_else(|| "No workout record is in progress.".to_string())?;
        let activity = draft
            .activity
            .ok_or_else(|| "The workout activity has not been selected.".to_string())?;
        let duration = draft
            .duration
            .ok_or_else(|| "The workout duration has not been selected.".to_string())?;
        let week = current_week_mut(&mut state, &self.clock, now)?;
        recordable_departure(week, slot_id, now)?;
        week.workout_records.push(WorkoutRecord {
            id: format!("{slot_id}-workout"),
            source_slot_id: slot_id.into(),
            recorded_at_epoch_millis: now,
            activity,
            duration,
            effort,
        });
        week.completed_count = week
            .workout_records
            .iter()
            .filter(|record| record.duration.qualifies())
            .count() as u32;
        state.workout_draft = None;
        self.save_state(&state)?;
        self.open()
    }

    fn current_state(&self) -> Result<(ExerciseState, bool), String> {
        match self.persistence.load()? {
            Some(document) => parse_state(&document),
            None => Ok((ExerciseState::new(), false)),
        }
    }

    fn save_state(&self, state: &ExerciseState) -> Result<(), String> {
        let document = serde_json::to_vec_pretty(state)
            .map_err(|error| format!("Could not encode exercise state: {error}"))?;
        self.persistence.save(&document)
    }
}

impl ExerciseState {
    fn new() -> Self {
        Self {
            schema_version: EXERCISE_SCHEMA_VERSION,
            routine: Routine {
                weekly_goal: WEEKLY_GOAL,
                primary: routine_departures(&PRIMARY_DAYS),
                fallback: routine_departures(&FALLBACK_DAYS),
            },
            weeks: Vec::new(),
            workout_draft: None,
        }
    }

    fn validate(mut self) -> Result<Self, String> {
        if (1..EXERCISE_SCHEMA_VERSION).contains(&self.schema_version) {
            self.schema_version = EXERCISE_SCHEMA_VERSION;
        } else if self.schema_version != EXERCISE_SCHEMA_VERSION {
            return Err(format!(
                "Unsupported exercise schema version: {}",
                self.schema_version
            ));
        }
        if self.routine != ExerciseState::new().routine {
            return Err("The saved exercise routine is not supported yet.".into());
        }
        self.validate_departures()?;
        self.validate_workouts()?;
        Ok(self)
    }

    fn validate_departures(&self) -> Result<(), String> {
        for week in &self.weeks {
            let mut departure_ids = HashSet::new();
            for departure in all_departures(week) {
                if !departure_ids.insert(departure.id.as_str()) {
                    return Err("The saved departure data is not valid.".into());
                }
                let response_is_valid =
                    match departure.status {
                        DepartureStatus::Available | DepartureStatus::Scheduled => {
                            departure.departure_response.is_none()
                                && departure
                                    .record_workout_prompt_due_at_epoch_millis
                                    .is_none()
                                && departure
                                    .record_workout_reminder_scheduled_at_epoch_millis
                                    .is_none()
                        }
                        DepartureStatus::Leaving => departure
                            .departure_response
                            .as_ref()
                            .is_some_and(|response| {
                                response.outcome == DepartureOutcome::LeavingForGym
                                    && response.reason.is_none()
                                    && response.fallback_slot_id.is_none()
                                    && departure
                                        .record_workout_prompt_due_at_epoch_millis
                                        .is_some()
                            }),
                        DepartureStatus::Moved => departure
                            .departure_response
                            .as_ref()
                            .is_some_and(|response| {
                                response.outcome == DepartureOutcome::MoveToFallback
                                    && response.reason.is_some()
                                    && response.fallback_slot_id.is_some()
                            }),
                        DepartureStatus::Skipped => departure
                            .departure_response
                            .as_ref()
                            .is_some_and(|response| {
                                response.outcome == DepartureOutcome::Skip
                                    && response.reason.is_some()
                                    && response.fallback_slot_id.is_none()
                            }),
                    };
                if !response_is_valid {
                    return Err("The saved departure data is not valid.".into());
                }
            }

            for source in
                all_departures(week).filter(|departure| departure.status == DepartureStatus::Moved)
            {
                let target_id = source
                    .departure_response
                    .as_ref()
                    .and_then(|response| response.fallback_slot_id.as_deref())
                    .expect("validated moved departure has a target");
                let target_is_valid = week.fallback_departures.iter().any(|fallback| {
                    fallback.id == target_id
                        && fallback.assigned_from_slot_id.as_deref() == Some(source.id.as_str())
                        && fallback.status != DepartureStatus::Available
                });
                if !target_is_valid {
                    return Err("The saved departure data is not valid.".into());
                }
            }
        }
        Ok(())
    }

    fn validate_workouts(&self) -> Result<(), String> {
        for week in &self.weeks {
            let mut record_ids = HashSet::new();
            let mut source_slot_ids = HashSet::new();
            for record in &week.workout_records {
                let source =
                    all_departures(week).find(|departure| departure.id == record.source_slot_id);
                let valid_source = source.is_some_and(|departure| {
                    departure.status == DepartureStatus::Leaving
                        && departure
                            .record_workout_prompt_due_at_epoch_millis
                            .is_some()
                        && departure
                            .record_workout_reminder_scheduled_at_epoch_millis
                            .is_some()
                });
                if !record_ids.insert(record.id.as_str())
                    || !source_slot_ids.insert(record.source_slot_id.as_str())
                    || record.id != format!("{}-workout", record.source_slot_id)
                    || !valid_source
                {
                    return Err("The saved workout data is not valid.".into());
                }
            }
            let qualifying_count = week
                .workout_records
                .iter()
                .filter(|record| record.duration.qualifies())
                .count() as u32;
            if week.completed_count != qualifying_count {
                return Err("The saved workout data is not valid.".into());
            }
        }

        if let Some(draft) = &self.workout_draft {
            if draft.duration.is_some() && draft.activity.is_none() {
                return Err("The saved workout data is not valid.".into());
            }
            let source = self.weeks.iter().find_map(|week| {
                all_departures(week)
                    .find(|departure| departure.id == draft.slot_id)
                    .map(|departure| (week, departure))
            });
            let valid_source = source.is_some_and(|(week, departure)| {
                departure.status == DepartureStatus::Leaving
                    && departure
                        .record_workout_prompt_due_at_epoch_millis
                        .is_some()
                    && departure
                        .record_workout_reminder_scheduled_at_epoch_millis
                        .is_some()
                    && !week
                        .workout_records
                        .iter()
                        .any(|record| record.source_slot_id == draft.slot_id)
            });
            if !valid_source {
                return Err("The saved workout data is not valid.".into());
            }
        }
        Ok(())
    }
}

fn parse_state(document: &[u8]) -> Result<(ExerciseState, bool), String> {
    let state = serde_json::from_slice::<ExerciseState>(document)
        .map_err(|_| "The local exercise state is not valid.".to_string())?;
    let migrated = state.schema_version != EXERCISE_SCHEMA_VERSION;
    Ok((state.validate()?, migrated))
}

fn routine_departures(days: &[(i64, &str)]) -> Vec<RoutineDeparture> {
    days.iter()
        .enumerate()
        .map(|(index, (weekday, day))| RoutineDeparture {
            weekday: *weekday,
            day: (*day).into(),
            departure_time: "16:00".into(),
            order: (index + 1) as u32,
        })
        .collect()
}

fn make_week<C: ExerciseClock>(routine: &Routine, clock: &C, week_start_day: i64) -> ExerciseWeek {
    let week_start = date_from_day_number(week_start_day);
    let week_end = date_from_day_number(week_start_day + 6);
    ExerciseWeek {
        week_start: week_start.iso_date(),
        week_end: week_end.iso_date(),
        completed_count: 0,
        primary_departures: make_departures(
            &routine.primary,
            clock,
            week_start_day,
            "primary",
            DepartureStatus::Scheduled,
        ),
        fallback_departures: make_departures(
            &routine.fallback,
            clock,
            week_start_day,
            "fallback",
            DepartureStatus::Available,
        ),
        workout_records: Vec::new(),
    }
}

fn make_departures<C: ExerciseClock>(
    routine: &[RoutineDeparture],
    clock: &C,
    week_start_day: i64,
    kind: &str,
    status: DepartureStatus,
) -> Vec<PlannedDeparture> {
    let week_key = date_from_day_number(week_start_day).iso_date();
    routine
        .iter()
        .map(|slot| PlannedDeparture {
            id: format!("{week_key}-{kind}-{}", slot.order),
            day: slot.day.clone(),
            date: date_from_day_number(week_start_day + slot.weekday).iso_date(),
            departure_at_epoch_millis: local_epoch_millis(
                clock,
                week_start_day + slot.weekday,
                DEPARTURE_HOUR,
                0,
            ),
            status,
            reminder_scheduled_at_epoch_millis: None,
            follow_up_scheduled_at_epoch_millis: None,
            departure_response: None,
            record_workout_prompt_due_at_epoch_millis: None,
            record_workout_reminder_scheduled_at_epoch_millis: None,
            assigned_from_slot_id: None,
        })
        .collect()
}

fn next_scheduled_departure<'a, C: ExerciseClock>(
    week: &'a ExerciseWeek,
    clock: &C,
    now: i64,
) -> Option<&'a PlannedDeparture> {
    let today = local_day_number(clock, now);
    all_departures(week)
        .filter(|departure| departure.status == DepartureStatus::Scheduled)
        .filter(|departure| {
            departure.departure_at_epoch_millis >= now
                || local_day_number(clock, departure.departure_at_epoch_millis) == today
        })
        .min_by_key(|departure| departure.departure_at_epoch_millis)
}

fn departure_decision_outcome(outcome: &str) -> Result<DepartureOutcome, String> {
    match outcome {
        "move-to-fallback" => Ok(DepartureOutcome::MoveToFallback),
        "skip" => Ok(DepartureOutcome::Skip),
        _ => Err("That departure response is not available.".into()),
    }
}

fn outcome_label(outcome: DepartureOutcome) -> &'static str {
    match outcome {
        DepartureOutcome::LeavingForGym => "leaving-for-gym",
        DepartureOutcome::MoveToFallback => "move-to-fallback",
        DepartureOutcome::Skip => "skip",
    }
}

fn all_departures(week: &ExerciseWeek) -> impl Iterator<Item = &PlannedDeparture> {
    week.primary_departures
        .iter()
        .chain(week.fallback_departures.iter())
}

fn all_departures_mut(week: &mut ExerciseWeek) -> impl Iterator<Item = &mut PlannedDeparture> {
    week.primary_departures
        .iter_mut()
        .chain(week.fallback_departures.iter_mut())
}

fn decidable_departure<'a>(
    week: &'a ExerciseWeek,
    slot_id: &str,
    now: i64,
) -> Result<&'a PlannedDeparture, String> {
    all_departures(week)
        .find(|departure| {
            departure.id == slot_id
                && departure.status == DepartureStatus::Scheduled
                && departure.departure_at_epoch_millis <= now
                && departure.departure_response.is_none()
        })
        .ok_or_else(|| "That departure is not awaiting a response.".to_string())
}

fn decidable_departure_mut<'a>(
    week: &'a mut ExerciseWeek,
    slot_id: &str,
    now: i64,
) -> Result<&'a mut PlannedDeparture, String> {
    week.primary_departures
        .iter_mut()
        .chain(week.fallback_departures.iter_mut())
        .find(|departure| {
            departure.id == slot_id
                && departure.status == DepartureStatus::Scheduled
                && departure.departure_at_epoch_millis <= now
                && departure.departure_response.is_none()
        })
        .ok_or_else(|| "That departure is not awaiting a response.".to_string())
}

fn fallback_is_available(departure: &PlannedDeparture, now: i64) -> bool {
    departure.status == DepartureStatus::Available && departure.departure_at_epoch_millis >= now
}

fn next_available_fallback_index(week: &ExerciseWeek, now: i64) -> Option<usize> {
    week.fallback_departures
        .iter()
        .enumerate()
        .filter(|(_, departure)| fallback_is_available(departure, now))
        .min_by_key(|(_, departure)| departure.departure_at_epoch_millis)
        .map(|(index, _)| index)
}

fn fallback_status(week: &ExerciseWeek, departure: &PlannedDeparture, now: i64) -> String {
    if let Some(source_id) = departure.assigned_from_slot_id.as_deref() {
        let source_day = all_departures(week)
            .find(|candidate| candidate.id == source_id)
            .map(|source| source.day.as_str())
            .unwrap_or("planned workout");
        let assignment = format!("Assigned from {source_day}");
        match departure.status {
            DepartureStatus::Scheduled => assignment,
            DepartureStatus::Leaving => format!("{assignment} · Leaving for gym confirmed"),
            DepartureStatus::Moved | DepartureStatus::Skipped => format!(
                "{assignment} · {}",
                departure_decision_status(week, departure)
                    .expect("closed assigned fallback has a decision")
            ),
            DepartureStatus::Available => "Available".into(),
        }
    } else if fallback_is_available(departure, now) {
        "Available".into()
    } else {
        "No longer available".into()
    }
}

fn reminder_intent(departure: &PlannedDeparture) -> NotificationIntent {
    NotificationIntent {
        id: format!("exercise-departure-{}", departure.id),
        deliver_at_epoch_millis: departure.departure_at_epoch_millis,
        title: "Personal Dashboard".into(),
        body: "Time to leave for the gym.".into(),
        detail: friendly_departure(departure),
    }
}

fn follow_up_intent(departure: &PlannedDeparture) -> NotificationIntent {
    NotificationIntent {
        id: format!("exercise-follow-up-{}", departure.id),
        deliver_at_epoch_millis: departure.departure_at_epoch_millis + FOLLOW_UP_DELAY_MILLIS,
        title: "Personal Dashboard".into(),
        body: "A gentle follow-up: are you leaving for the gym?".into(),
        detail: friendly_departure(departure),
    }
}

fn record_workout_intent(departure: &PlannedDeparture, due_at: i64) -> NotificationIntent {
    NotificationIntent {
        id: format!("exercise-record-workout-{}", departure.id),
        deliver_at_epoch_millis: due_at,
        title: "Personal Dashboard".into(),
        body: "Record workout.".into(),
        detail: format!("Leaving confirmed {}", friendly_departure(departure)),
    }
}

fn dashboard_view(
    state: &ExerciseState,
    week: &ExerciseWeek,
    clock: &impl ExerciseClock,
    now: i64,
    next_departure: Option<&PlannedDeparture>,
    reminder_intent: Option<NotificationIntent>,
    reminder_message: String,
) -> ExerciseDashboardView {
    let start = parse_iso_date(&week.week_start).expect("saved week start is valid");
    let end = parse_iso_date(&week.week_end).expect("saved week end is valid");
    ExerciseDashboardView {
        product_name: "Personal Dashboard".into(),
        feature_area: "Exercise tracking".into(),
        schema_version: state.schema_version,
        week_label: format!(
            "{}, {} {} – {}, {} {}",
            PRIMARY_DAYS[0].1,
            month_name(start.month),
            start.day,
            FALLBACK_DAYS[1].1,
            month_name(end.month),
            end.day
        ),
        progress: format!(
            "{} of {} completed",
            week.completed_count, state.routine.weekly_goal
        ),
        next_departure: next_departure.map(friendly_departure),
        primary_departures: week
            .primary_departures
            .iter()
            .map(|departure| PrimaryDepartureView {
                id: departure.id.clone(),
                day: departure.day.clone(),
                time: "4:00 PM".into(),
                status: departure_status(week, departure, now),
            })
            .collect(),
        fallback_departures: week
            .fallback_departures
            .iter()
            .map(|departure| FallbackDepartureView {
                id: departure.id.clone(),
                day: departure.day.clone(),
                time: "4:00 PM".into(),
                availability: fallback_status(week, departure, now),
            })
            .collect(),
        fallback_available_count: week
            .fallback_departures
            .iter()
            .filter(|departure| fallback_is_available(departure, now))
            .count(),
        reminder_intent,
        reminder_message,
        departure_prompt: departure_prompt(week, now),
        departure_reason_prompt: None,
        departure_confirmation: departure_confirmation(week, clock),
        workout_prompt: workout_prompt(state, week, now),
        workout_recording: workout_recording(state),
        workout_records: week
            .workout_records
            .iter()
            .map(|record| WorkoutRecordView {
                id: record.id.clone(),
                activity: record.activity.label().into(),
                duration: record.duration.label().into(),
                effort: record.effort.label().into(),
                outcome: if record.duration.qualifies() {
                    "Counts toward weekly progress".into()
                } else {
                    "Short effort — does not count toward weekly progress".into()
                },
            })
            .collect(),
    }
}

fn current_week<'a>(
    state: &'a ExerciseState,
    clock: &impl ExerciseClock,
    now: i64,
) -> Result<&'a ExerciseWeek, String> {
    let week_key = current_week_key(clock, now);
    state
        .weeks
        .iter()
        .find(|week| week.week_start == week_key)
        .ok_or_else(|| "The current exercise week is unavailable.".to_string())
}

fn current_week_mut<'a>(
    state: &'a mut ExerciseState,
    clock: &impl ExerciseClock,
    now: i64,
) -> Result<&'a mut ExerciseWeek, String> {
    let week_key = current_week_key(clock, now);
    state
        .weeks
        .iter_mut()
        .find(|week| week.week_start == week_key)
        .ok_or_else(|| "The current exercise week is unavailable.".to_string())
}

fn current_week_key(clock: &impl ExerciseClock, now: i64) -> String {
    let week_start_day = local_day_number(clock, now) - local_weekday(clock, now);
    date_from_day_number(week_start_day).iso_date()
}

fn recordable_departure<'a>(
    week: &'a ExerciseWeek,
    slot_id: &str,
    now: i64,
) -> Result<&'a PlannedDeparture, String> {
    all_departures(week)
        .find(|departure| {
            departure.id == slot_id
                && departure.status == DepartureStatus::Leaving
                && departure
                    .record_workout_prompt_due_at_epoch_millis
                    .is_some_and(|due_at| due_at <= now)
                && departure
                    .record_workout_reminder_scheduled_at_epoch_millis
                    .is_some()
                && !week
                    .workout_records
                    .iter()
                    .any(|record| record.source_slot_id == slot_id)
        })
        .ok_or_else(|| "That workout prompt is not awaiting a record.".to_string())
}

fn workout_draft_for<'a>(
    state: &'a mut ExerciseState,
    slot_id: &str,
) -> Result<&'a mut WorkoutDraft, String> {
    state
        .workout_draft
        .as_mut()
        .filter(|draft| draft.slot_id == slot_id)
        .ok_or_else(|| "No workout record is in progress.".to_string())
}

fn workout_prompt(
    state: &ExerciseState,
    week: &ExerciseWeek,
    now: i64,
) -> Option<WorkoutPromptView> {
    if state.workout_draft.is_some() {
        return None;
    }
    all_departures(week)
        .filter(|departure| recordable_departure(week, &departure.id, now).is_ok())
        .max_by_key(|departure| departure.record_workout_prompt_due_at_epoch_millis)
        .map(|departure| WorkoutPromptView {
            slot_id: departure.id.clone(),
            heading: "Ready to save this workout?".into(),
            action: "Done".into(),
        })
}

fn workout_recording(state: &ExerciseState) -> Option<WorkoutRecordingView> {
    let draft = state.workout_draft.as_ref()?;
    let (heading, guidance, choice_name, choices) = if draft.activity.is_none() {
        (
            "What activity did you do?",
            "Choose one activity.",
            "activity",
            WorkoutActivity::ALL
                .iter()
                .map(|choice| choice.label().into())
                .collect(),
        )
    } else if draft.duration.is_none() {
        (
            "About how long was the workout?",
            "Choose the closest duration.",
            "duration",
            WorkoutDuration::ALL
                .iter()
                .map(|choice| choice.label().into())
                .collect(),
        )
    } else {
        (
            "How strenuous did this workout feel?",
            "Choose the description that fits. Harder is not better.",
            "effort",
            PerceivedEffort::ALL
                .iter()
                .map(|choice| choice.label().into())
                .collect(),
        )
    };
    Some(WorkoutRecordingView {
        slot_id: draft.slot_id.clone(),
        heading: heading.into(),
        guidance: guidance.into(),
        choice_name: choice_name.into(),
        choices,
    })
}

fn departure_prompt(week: &ExerciseWeek, now: i64) -> Option<DeparturePromptView> {
    all_departures(week)
        .filter(|departure| {
            departure.status == DepartureStatus::Scheduled
                && departure.reminder_scheduled_at_epoch_millis.is_some()
                && departure.departure_at_epoch_millis <= now
        })
        .max_by_key(|departure| departure.departure_at_epoch_millis)
        .map(|departure| DeparturePromptView {
            slot_id: departure.id.clone(),
            heading: "Time to leave for the gym".into(),
            actions: vec![
                "Leaving for gym".into(),
                "Move to fallback".into(),
                "Skip".into(),
            ],
            status: follow_up_is_due(departure, now).then(|| "Unresolved — no response".into()),
        })
}

fn departure_confirmation(
    week: &ExerciseWeek,
    clock: &impl ExerciseClock,
) -> Option<DepartureConfirmationView> {
    all_departures(week)
        .filter(|departure| departure.status == DepartureStatus::Leaving)
        .filter_map(|departure| {
            Some((
                departure
                    .departure_response
                    .as_ref()?
                    .recorded_at_epoch_millis,
                departure.record_workout_prompt_due_at_epoch_millis?,
            ))
        })
        .max_by_key(|(recorded_at, _)| *recorded_at)
        .map(|(_, due_at)| DepartureConfirmationView {
            message: "Leaving for gym confirmed".into(),
            next_prompt: format!(
                "Record workout reminder at {}",
                friendly_time(clock, due_at)
            ),
        })
}

fn departure_decision_status(week: &ExerciseWeek, departure: &PlannedDeparture) -> Option<String> {
    let response = departure.departure_response.as_ref()?;
    match response.outcome {
        DepartureOutcome::MoveToFallback => {
            let fallback_day = response
                .fallback_slot_id
                .as_deref()
                .and_then(|slot_id| all_departures(week).find(|slot| slot.id == slot_id))
                .map(|fallback| fallback.day.as_str())
                .unwrap_or("fallback");
            Some(format!(
                "Moved to {fallback_day} · {}",
                response.reason?.label()
            ))
        }
        DepartureOutcome::Skip => Some(format!("Skipped · {}", response.reason?.label())),
        DepartureOutcome::LeavingForGym => None,
    }
}

fn departure_status(week: &ExerciseWeek, departure: &PlannedDeparture, now: i64) -> String {
    match departure.status {
        DepartureStatus::Leaving => "Leaving for gym confirmed".into(),
        DepartureStatus::Moved | DepartureStatus::Skipped => {
            departure_decision_status(week, departure).expect("closed departure has a decision")
        }
        DepartureStatus::Scheduled if follow_up_is_due(departure, now) => {
            "Unresolved — no response".into()
        }
        DepartureStatus::Scheduled if departure.departure_at_epoch_millis <= now => {
            "Awaiting response".into()
        }
        DepartureStatus::Scheduled => "Scheduled".into(),
        DepartureStatus::Available => "Available".into(),
    }
}

fn follow_up_is_due(departure: &PlannedDeparture, now: i64) -> bool {
    departure.status == DepartureStatus::Scheduled
        && departure.departure_response.is_none()
        && departure.follow_up_scheduled_at_epoch_millis.is_some()
        && departure.departure_at_epoch_millis + FOLLOW_UP_DELAY_MILLIS <= now
}

fn friendly_time(clock: &impl ExerciseClock, epoch_millis: i64) -> String {
    let local_seconds =
        epoch_millis.div_euclid(1_000) + i64::from(clock.utc_offset_minutes_at(epoch_millis)) * 60;
    let seconds_in_day = local_seconds.rem_euclid(86_400);
    let hour = seconds_in_day.div_euclid(3_600);
    let minute = seconds_in_day.rem_euclid(3_600).div_euclid(60);
    let period = if hour < 12 { "AM" } else { "PM" };
    let display_hour = match hour.rem_euclid(12) {
        0 => 12,
        value => value,
    };
    format!("{display_hour}:{minute:02} {period}")
}

fn friendly_departure(departure: &PlannedDeparture) -> String {
    let date = parse_iso_date(&departure.date).expect("saved departure date is valid");
    format!(
        "{}, {} {} at 4:00 PM",
        departure.day,
        month_name(date.month),
        date.day
    )
}

#[derive(Clone, Copy, Debug, PartialEq)]
struct CivilDate {
    year: i64,
    month: i64,
    day: i64,
}

impl CivilDate {
    fn iso_date(self) -> String {
        format!("{:04}-{:02}-{:02}", self.year, self.month, self.day)
    }
}

fn parse_iso_date(value: &str) -> Option<CivilDate> {
    let mut parts = value.split('-');
    Some(CivilDate {
        year: parts.next()?.parse().ok()?,
        month: parts.next()?.parse().ok()?,
        day: parts.next()?.parse().ok()?,
    })
}

fn local_day_number<C: ExerciseClock>(clock: &C, epoch_millis: i64) -> i64 {
    let local_seconds =
        epoch_millis.div_euclid(1_000) + i64::from(clock.utc_offset_minutes_at(epoch_millis)) * 60;
    local_seconds.div_euclid(86_400)
}

fn local_weekday<C: ExerciseClock>(clock: &C, epoch_millis: i64) -> i64 {
    (local_day_number(clock, epoch_millis) + 3).rem_euclid(7)
}

fn local_epoch_millis<C: ExerciseClock>(clock: &C, day_number: i64, hour: i64, minute: i64) -> i64 {
    let local_millis = (day_number * 86_400 + hour * 3_600 + minute * 60) * 1_000;
    let first_offset = i64::from(clock.utc_offset_minutes_at(local_millis)) * 60_000;
    let first_epoch = local_millis - first_offset;
    let resolved_offset = i64::from(clock.utc_offset_minutes_at(first_epoch)) * 60_000;
    local_millis - resolved_offset
}

fn date_from_day_number(day_number: i64) -> CivilDate {
    let z = day_number + 719_468;
    let era = if z >= 0 { z } else { z - 146_096 }.div_euclid(146_097);
    let day_of_era = z - era * 146_097;
    let year_of_era =
        (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
    let mut year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    year += i64::from(month <= 2);
    CivilDate { year, month, day }
}

fn month_name(month: i64) -> &'static str {
    MONTH_NAMES[(month - 1) as usize]
}
