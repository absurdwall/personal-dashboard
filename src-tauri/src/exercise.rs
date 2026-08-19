use crate::notification::{NotificationIntent, NotificationPermission, NotificationPlatform};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

mod baseline_migration;
pub(crate) use baseline_migration::{CompletedBaselineError, CompletedBaselineExercise};

const EXERCISE_SCHEMA_VERSION: u32 = 9;
const WEEKLY_GOAL: u32 = 3;
const UNSCHEDULED_WORKOUT_SLOT_ID: &str = "unscheduled";
const FOLLOW_UP_DELAY_MILLIS: i64 = 15 * 60 * 1_000;
const RECORD_WORKOUT_DELAY_MILLIS: i64 = 90 * 60 * 1_000;
const MAX_UTC_OFFSET_MINUTES: i32 = 24 * 60;
const PRIMARY_DAYS: [(i64, &str); 3] = [(0, "Monday"), (2, "Wednesday"), (4, "Friday")];
const FALLBACK_DAYS: [(i64, &str); 2] = [(5, "Saturday"), (6, "Sunday")];
const WEEKDAYS: [&str; 7] = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
];
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
pub(crate) struct ExerciseState {
    schema_version: u32,
    routine: Routine,
    weeks: Vec<ExerciseWeek>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pending_reminder_reconciliation: Option<ReminderReconciliation>,
    #[serde(default)]
    workout_draft: Option<WorkoutDraft>,
    #[serde(default)]
    departure_decision: Option<DepartureDecision>,
    #[serde(default = "first_unscheduled_sequence")]
    next_unscheduled_sequence: u64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct ReminderReconciliation {
    #[serde(default)]
    cancel_notification_ids: Vec<String>,
    #[serde(default)]
    desired_notification_ids: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct DepartureDecision {
    slot_id: String,
    outcome: DepartureOutcome,
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
    #[serde(default)]
    source: Option<WorkoutSource>,
    activity: Option<WorkoutActivity>,
    duration: Option<WorkoutDuration>,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct WorkoutRecord {
    id: String,
    #[serde(default)]
    source: Option<WorkoutSource>,
    source_slot_id: Option<String>,
    recorded_at_epoch_millis: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    recorded_at_utc_offset_minutes: Option<i32>,
    activity: WorkoutActivity,
    duration: WorkoutDuration,
    effort: PerceivedEffort,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum WorkoutSource {
    Primary,
    Fallback,
    Unscheduled,
}

impl WorkoutSource {
    fn label(self) -> &'static str {
        match self {
            Self::Primary => "Primary workout",
            Self::Fallback => "Fallback workout",
            Self::Unscheduled => "Unscheduled workout",
        }
    }
}

fn first_unscheduled_sequence() -> u64 {
    1
}

fn default_departure_time() -> String {
    "16:00".into()
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
    #[serde(default = "default_departure_time")]
    departure_time: String,
    departure_at_epoch_millis: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    departure_utc_offset_minutes: Option<i32>,
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
    NotNeeded,
    Missed,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct DepartureResponse {
    outcome: DepartureOutcome,
    recorded_at_epoch_millis: i64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    recorded_at_utc_offset_minutes: Option<i32>,
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
    pub departure_at_epoch_millis: i64,
    pub status: String,
    pub status_kind: DepartureStatusKind,
    pub has_workout_record: bool,
    pub record_workout_action: Option<String>,
    pub adjustment: Option<ScheduleAdjustmentView>,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum DepartureStatusKind {
    Scheduled,
    Unrecorded,
    AwaitingResponse,
    Unresolved,
    Leaving,
    Completed,
    Moved,
    Skipped,
    NotNeeded,
    Missed,
    Available,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleChoiceView {
    pub value: String,
    pub label: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleChoicesView {
    pub day_choices: Vec<ScheduleChoiceView>,
    pub time_choices: Vec<ScheduleChoiceView>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ScheduleAdjustmentView {
    pub action: String,
    pub save_action: String,
    pub selected_day: String,
    pub selected_time: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoutineDepartureSettingsView {
    pub order: u32,
    pub day: String,
    pub time: String,
    pub selected_day: String,
    pub selected_time: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoutineSettingsView {
    pub action: String,
    pub guidance: String,
    pub save_action: String,
    pub primary_departures: Vec<RoutineDepartureSettingsView>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FallbackDepartureView {
    pub id: String,
    pub day: String,
    pub time: String,
    pub departure_at_epoch_millis: i64,
    pub availability: String,
    pub availability_kind: FallbackAvailabilityKind,
    pub record_workout_action: Option<String>,
}

#[derive(Clone, Copy, Debug, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum FallbackAvailabilityKind {
    Assigned,
    Available,
    Unrecorded,
    Recorded,
    NotNeeded,
    Missed,
    Reserved,
    Unavailable,
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
    pub source: String,
    pub recorded_at: String,
    pub recorded_at_utc_offset_minutes: Option<i32>,
    pub activity: String,
    pub duration: String,
    pub effort: String,
    pub outcome: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkoutHistoryControlsView {
    pub activity_choices: Vec<String>,
    pub duration_choices: Vec<String>,
    pub effort_choices: Vec<String>,
    pub edit_action: String,
    pub save_action: String,
    pub delete_action: String,
    pub delete_prompt: String,
    pub confirm_delete_action: String,
    pub cancel_delete_action: String,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseWeekHistoryView {
    pub week_label: String,
    pub progress: String,
    pub primary_departures: Vec<PrimaryDepartureView>,
    pub fallback_departures: Vec<FallbackDepartureView>,
    pub workout_records: Vec<WorkoutRecordView>,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseDashboardView {
    pub product_name: String,
    pub feature_area: String,
    pub schema_version: u32,
    pub week_label: String,
    pub progress: String,
    pub manual_workout_action: String,
    pub weekly_goal_status: Option<String>,
    pub next_departure: Option<String>,
    pub next_departure_slot_id: Option<String>,
    pub schedule_choices: ScheduleChoicesView,
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
    pub workout_history_controls: WorkoutHistoryControlsView,
    pub workout_records: Vec<WorkoutRecordView>,
    pub history: Vec<ExerciseWeekHistoryView>,
    pub routine_settings: RoutineSettingsView,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseWeekPreview {
    pub week_start: String,
    pub week_end: String,
    pub completed_count: u32,
    pub weekly_goal: u32,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExerciseRestorePreview {
    pub current_week: Option<ExerciseWeekPreview>,
    pub historical_week_count: usize,
    pub desired_reminder_count: usize,
}

pub trait ExerciseAuthority: Send + Sync {
    fn is_active(&self) -> Result<bool, String>;
}

pub trait NotificationCancellationJournal: Send + Sync {
    fn pending_notification_cancellations(&self) -> Result<Vec<String>, String>;
    fn notification_cancellation_completed(&self, notification_id: &str) -> Result<(), String>;
}

#[derive(Clone, Copy, Default)]
pub struct AlwaysActiveExerciseAuthority;

#[derive(Clone, Copy, Default)]
pub struct NoPendingNotificationCancellations;

impl ExerciseAuthority for AlwaysActiveExerciseAuthority {
    fn is_active(&self) -> Result<bool, String> {
        Ok(true)
    }
}

impl NotificationCancellationJournal for NoPendingNotificationCancellations {
    fn pending_notification_cancellations(&self) -> Result<Vec<String>, String> {
        Ok(Vec::new())
    }

    fn notification_cancellation_completed(&self, _notification_id: &str) -> Result<(), String> {
        Ok(())
    }
}

pub struct ExerciseApplication<
    P,
    N,
    C,
    A = AlwaysActiveExerciseAuthority,
    J = NoPendingNotificationCancellations,
> {
    persistence: P,
    notifications: N,
    clock: C,
    authority: A,
    cancellation_journal: J,
}

impl<P: ExercisePersistence, N: NotificationPlatform, C: ExerciseClock>
    ExerciseApplication<P, N, C, AlwaysActiveExerciseAuthority, NoPendingNotificationCancellations>
{
    pub fn new(persistence: P, notifications: N, clock: C) -> Self {
        Self {
            persistence,
            notifications,
            clock,
            authority: AlwaysActiveExerciseAuthority,
            cancellation_journal: NoPendingNotificationCancellations,
        }
    }
}

impl<
        P: ExercisePersistence,
        N: NotificationPlatform,
        C: ExerciseClock,
        A: ExerciseAuthority,
        J: NotificationCancellationJournal,
    > ExerciseApplication<P, N, C, A, J>
{
    pub fn with_authority(
        persistence: P,
        notifications: N,
        clock: C,
        authority: A,
        cancellation_journal: J,
    ) -> Self {
        Self {
            persistence,
            notifications,
            clock,
            authority,
            cancellation_journal,
        }
    }

    pub fn open(&self) -> Result<ExerciseDashboardView, String> {
        self.retry_pending_notification_cancellations()?;
        if !self.authority.is_active()? {
            return self.open_inactive();
        }
        let now = self.clock.now_epoch_millis();
        let (mut state, mut changed) = self.current_state()?;
        let previously_scheduled_notification_ids = state.scheduled_notification_ids();
        let schedule_rebased = state.rebase_planned_departures(&self.clock);
        if schedule_rebased {
            state.clear_native_reminder_markers();
            changed = true;
        }
        let week_start_day = local_day_number(&self.clock, now) - local_weekday(&self.clock, now);
        let current_week_start = date_from_day_number(week_start_day);
        let week_key = current_week_start.iso_date();
        changed |= close_expired_weeks(&mut state, current_week_start);
        if !state.weeks.iter().any(|week| week.week_start == week_key) {
            state.workout_draft = None;
            state.departure_decision = None;
            state
                .weeks
                .push(make_week(&state.routine, &self.clock, week_start_day));
            changed = true;
        }
        if state.departure_decision.is_some()
            && !departure_decision_is_current(&state, &week_key, now)
        {
            state.departure_decision = None;
            changed = true;
        }

        let weekly_goal = state.routine.weekly_goal;
        let week = state
            .weeks
            .iter_mut()
            .find(|week| week.week_start == week_key)
            .expect("the current week was just ensured");
        let goal_reached = weekly_goal_reached_at(week, weekly_goal).is_some();
        if let Some(goal_reached_at) = weekly_goal_reached_at(week, weekly_goal) {
            let (suppressed, _reminder_ids) = suppress_remaining_obligations(week, goal_reached_at);
            changed |= suppressed;
        }
        let desired_reminder_intents = reminder_intents_for_state(&state, &self.clock, now);
        let desired_notification_ids = desired_reminder_intents
            .iter()
            .map(|intent| intent.id.clone())
            .collect::<HashSet<_>>();
        let was_pending_reminder_reconciliation = state.pending_reminder_reconciliation.is_some();
        let previously_scheduled_notification_ids = previously_scheduled_notification_ids
            .iter()
            .cloned()
            .collect::<HashSet<_>>();
        let reconciliation_required = state.pending_reminder_reconciliation.is_some()
            || schedule_rebased
            || (changed && previously_scheduled_notification_ids != desired_notification_ids);
        let permission = if reconciliation_required || !desired_reminder_intents.is_empty() {
            Some(self.notifications.permission())
        } else {
            None
        };

        if reconciliation_required {
            let mut reconciliation_ids = previously_scheduled_notification_ids;
            reconciliation_ids.extend(state.scheduled_notification_ids());
            state.begin_reminder_reconciliation(reconciliation_ids);
            state.set_desired_reminder_ids(desired_notification_ids.iter().cloned());
            self.save_state(&state)?;

            if let Some(Ok(notification_permission)) = &permission {
                let intents = if *notification_permission == NotificationPermission::Granted {
                    desired_reminder_intents
                } else {
                    Vec::new()
                };
                self.reconcile_reminders(
                    &mut state,
                    intents,
                    now,
                    was_pending_reminder_reconciliation,
                )?;
            }
        } else if let Some(Ok(NotificationPermission::Granted)) = &permission {
            let mut scheduled_notification_ids = state
                .scheduled_notification_ids()
                .into_iter()
                .collect::<HashSet<_>>();
            let mut reminders_changed = false;
            for intent in desired_reminder_intents {
                if scheduled_notification_ids.insert(intent.id.clone()) {
                    self.notifications.schedule(intent.clone())?;
                    state.mark_native_reminder(&intent.id, now);
                    reminders_changed = true;
                }
            }
            if reminders_changed || changed {
                self.save_state(&state)?;
            }
        } else if changed {
            self.save_state(&state)?;
        }

        let next_departure = (!goal_reached)
            .then(|| {
                state
                    .weeks
                    .iter()
                    .find(|candidate| candidate.week_start == week_key)
                    .and_then(|current| next_scheduled_departure(current, &self.clock, now))
            })
            .flatten();
        let visible_reminder_intent = next_departure.map(reminder_intent);
        let mut reminder_message = if goal_reached {
            "Weekly goal complete — optional workouts welcome".into()
        } else {
            "No departure reminder remains this week.".into()
        };
        if let Some(next_departure) = next_departure {
            reminder_message = match permission {
                Some(Ok(NotificationPermission::Granted))
                    if next_departure.reminder_scheduled_at_epoch_millis.is_some()
                        && next_departure.follow_up_scheduled_at_epoch_millis.is_some() =>
                {
                    "Next departure reminder is scheduled.".into()
                }
                Some(Ok(NotificationPermission::Granted)) => {
                    "Next departure reminder is not scheduled yet.".into()
                }
                Some(Ok(NotificationPermission::Denied)) => {
                    "Allow notifications in system settings to receive departure reminders.".into()
                }
                Some(Ok(NotificationPermission::Prompt)) => {
                    "Allow notifications to receive departure reminders.".into()
                }
                Some(Err(_)) => "Notification status is temporarily unavailable.".into(),
                None => "No departure reminder remains this week.".into(),
            };
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
            (!goal_reached)
                .then(|| next_scheduled_departure(week, &self.clock, now))
                .flatten(),
            visible_reminder_intent,
            reminder_message,
        ))
    }

    fn reconcile_reminders(
        &self,
        state: &mut ExerciseState,
        desired_reminder_intents: Vec<NotificationIntent>,
        now: i64,
        cancel_desired_notification_ids: bool,
    ) -> Result<(), String> {
        for notification_id in
            state.reminder_reconciliation_notification_ids(cancel_desired_notification_ids)
        {
            self.notifications.cancel(&notification_id)?;
        }
        let desired_notification_ids = desired_reminder_intents
            .iter()
            .map(|intent| intent.id.clone())
            .collect::<HashSet<_>>();
        for intent in desired_reminder_intents {
            self.notifications.schedule(intent)?;
        }
        state.set_native_reminder_markers(&desired_notification_ids, now);
        state.complete_reminder_reconciliation();
        self.save_state(state)
    }

    fn retry_pending_notification_cancellations(&self) -> Result<(), String> {
        for notification_id in self
            .cancellation_journal
            .pending_notification_cancellations()?
        {
            if self.notifications.cancel(&notification_id).is_ok() {
                self.cancellation_journal
                    .notification_cancellation_completed(&notification_id)?;
            }
        }
        Ok(())
    }

    pub fn open_inactive(&self) -> Result<ExerciseDashboardView, String> {
        let now = self.clock.now_epoch_millis();
        let (mut state, _) = self.current_state()?;
        let previously_scheduled_notification_ids = state.scheduled_notification_ids();
        if state.rebase_planned_departures(&self.clock) {
            state.clear_native_reminder_markers();
            state.begin_reminder_reconciliation(previously_scheduled_notification_ids);
        }
        if state.pending_reminder_reconciliation.is_some() {
            for notification_id in state.reminder_reconciliation_notification_ids(true) {
                self.notifications.cancel(&notification_id)?;
            }
            state.reset_native_reminder_markers();
            self.save_state(&state)?;
        }
        let week_key = current_week_key(&self.clock, now);
        let week = state
            .weeks
            .iter()
            .find(|week| week.week_start == week_key)
            .or_else(|| state.weeks.last())
            .ok_or_else(|| "The inactive exercise profile has no saved week.".to_string())?;
        Ok(dashboard_view(
            &state,
            week,
            &self.clock,
            now,
            None,
            None,
            String::new(),
        ))
    }

    pub fn adjust_current_week_departure(
        &self,
        slot_id: &str,
        day: &str,
        departure_time: &str,
    ) -> Result<ExerciseDashboardView, String> {
        self.require_active()?;
        let schedule = ScheduleSelection::parse(day, departure_time)
            .map_err(ScheduleSelectionError::message)?;
        let now = self.clock.now_epoch_millis();
        let week_start_day = local_day_number(&self.clock, now) - local_weekday(&self.clock, now);
        let adjusted_at = schedule.epoch_millis(&self.clock, week_start_day);
        if adjusted_at <= now {
            return Err("The adjusted departure must remain upcoming.".into());
        }

        let (mut state, _) = self.current_state()?;
        let previously_scheduled_notification_ids = state.scheduled_notification_ids();
        let week = current_week_mut(&mut state, &self.clock, now)?;
        let departure = week
            .primary_departures
            .iter_mut()
            .find(|departure| {
                departure.id == slot_id
                    && departure.status == DepartureStatus::Scheduled
                    && departure.departure_at_epoch_millis > now
            })
            .ok_or_else(|| "Only an upcoming primary departure can be adjusted.".to_string())?;
        schedule.apply_to_planned(departure, week_start_day);
        departure.departure_at_epoch_millis = adjusted_at;
        departure.reminder_scheduled_at_epoch_millis = None;
        departure.follow_up_scheduled_at_epoch_millis = None;

        state.begin_reminder_reconciliation(previously_scheduled_notification_ids);
        self.save_state(&state)?;
        self.open()
    }

    pub fn change_repeating_primary_departure(
        &self,
        order: u32,
        day: &str,
        departure_time: &str,
    ) -> Result<ExerciseDashboardView, String> {
        self.require_active()?;
        let schedule = ScheduleSelection::parse(day, departure_time)
            .map_err(ScheduleSelectionError::message)?;
        let (mut state, _) = self.current_state()?;
        let previously_scheduled_notification_ids = state.scheduled_notification_ids();
        let departure = state
            .routine
            .primary
            .iter_mut()
            .find(|departure| departure.order == order)
            .ok_or_else(|| "That repeating routine departure is not available.".to_string())?;
        schedule.apply_to_routine(departure);
        state.begin_reminder_reconciliation(previously_scheduled_notification_ids);
        self.save_state(&state)?;
        self.open()
    }

    pub fn respond_to_departure(
        &self,
        slot_id: &str,
        action: &str,
    ) -> Result<ExerciseDashboardView, String> {
        self.require_active()?;
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
            recorded_at_utc_offset_minutes: Some(self.clock.utc_offset_minutes_at(now)),
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
        self.require_active()?;
        let outcome = departure_decision_outcome(outcome)?;
        let now = self.clock.now_epoch_millis();
        let (mut state, _) = self.current_state()?;
        let week = current_week(&state, &self.clock, now)?;
        decidable_departure(week, slot_id, now)?;
        if outcome == DepartureOutcome::MoveToFallback
            && next_available_fallback_index(week, now).is_none()
        {
            return Err("No fallback slot remains available.".into());
        }

        state.departure_decision = Some(DepartureDecision {
            slot_id: slot_id.into(),
            outcome,
        });
        self.save_state(&state)?;
        self.open()
    }

    pub fn confirm_departure_decision(
        &self,
        slot_id: &str,
        outcome: &str,
        reason: &str,
    ) -> Result<ExerciseDashboardView, String> {
        self.require_active()?;
        let outcome = departure_decision_outcome(outcome)?;
        let reason = DepartureReason::from_label(reason)
            .ok_or_else(|| "That departure reason is not available.".to_string())?;
        let now = self.clock.now_epoch_millis();
        let (mut state, _) = self.current_state()?;
        if state
            .departure_decision
            .as_ref()
            .is_some_and(|decision| decision.slot_id != slot_id || decision.outcome != outcome)
        {
            return Err("That departure decision is not in progress.".into());
        }
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
            recorded_at_utc_offset_minutes: Some(self.clock.utc_offset_minutes_at(now)),
            reason: Some(reason),
            fallback_slot_id,
        });
        if let Some(follow_up_id) = follow_up_id {
            self.notifications.cancel(&follow_up_id)?;
        }
        state.departure_decision = None;
        self.save_state(&state)?;
        self.open()
    }

    pub fn start_workout_record(&self, slot_id: &str) -> Result<ExerciseDashboardView, String> {
        self.require_active()?;
        let now = self.clock.now_epoch_millis();
        let (mut state, _) = self.current_state()?;
        if state.workout_draft.is_some() {
            return Err("A workout record is already in progress.".into());
        }
        let week = current_week(&state, &self.clock, now)?;
        let departure = direct_recordable_departure(week, slot_id, now)
            .or_else(|_| recordable_departure(week, slot_id, now))?;
        let source = workout_source_for_departure(week, departure)
            .ok_or_else(|| "That workout source is not available.".to_string())?;
        state.workout_draft = Some(WorkoutDraft {
            slot_id: slot_id.into(),
            source: Some(source),
            activity: None,
            duration: None,
        });
        state.departure_decision = None;
        self.save_state(&state)?;
        self.open()
    }

    pub fn start_unscheduled_workout_record(&self) -> Result<ExerciseDashboardView, String> {
        self.require_active()?;
        let (mut state, _) = self.current_state()?;
        if state.workout_draft.is_some() {
            return Err("A workout record is already in progress.".into());
        }
        state.workout_draft = Some(WorkoutDraft {
            slot_id: UNSCHEDULED_WORKOUT_SLOT_ID.into(),
            source: Some(WorkoutSource::Unscheduled),
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
        self.require_active()?;
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
        self.require_active()?;
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
        self.require_active()?;
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
        let source = draft
            .source
            .ok_or_else(|| "The workout source is not available.".to_string())?;
        let direct_record = if source == WorkoutSource::Unscheduled {
            false
        } else {
            let week = current_week(&state, &self.clock, now)?;
            direct_recordable_departure(week, slot_id, now).is_ok()
        };
        if source != WorkoutSource::Unscheduled && !direct_record {
            let week = current_week(&state, &self.clock, now)?;
            recordable_departure(week, slot_id, now)?;
        }
        let previously_scheduled_notification_ids = direct_record
            .then(|| state.scheduled_notification_ids())
            .unwrap_or_default();
        let unscheduled_sequence = state.next_unscheduled_sequence;
        if source == WorkoutSource::Unscheduled {
            state.next_unscheduled_sequence += 1;
        }
        let weekly_goal = state.routine.weekly_goal;
        {
            let week = current_week_mut(&mut state, &self.clock, now)?;
            week.workout_records.push(WorkoutRecord {
                id: if source == WorkoutSource::Unscheduled {
                    format!("{}-unscheduled-{unscheduled_sequence}", week.week_start)
                } else {
                    format!("{slot_id}-workout")
                },
                source: Some(source),
                source_slot_id: (source != WorkoutSource::Unscheduled).then(|| slot_id.into()),
                recorded_at_epoch_millis: now,
                recorded_at_utc_offset_minutes: Some(self.clock.utc_offset_minutes_at(now)),
                activity,
                duration,
                effort,
            });
            if direct_record {
                if let Some(departure) =
                    all_departures_mut(week).find(|departure| departure.id == slot_id)
                {
                    departure.reminder_scheduled_at_epoch_millis = None;
                    departure.follow_up_scheduled_at_epoch_millis = None;
                }
            }
            recompute_week_progress(week, weekly_goal, now, true);
        }
        if direct_record && !previously_scheduled_notification_ids.is_empty() {
            state.begin_reminder_reconciliation(previously_scheduled_notification_ids);
        }
        state.workout_draft = None;
        self.save_state(&state)?;
        self.open()
    }

    pub fn correct_workout_record(
        &self,
        record_id: &str,
        activity: &str,
        duration: &str,
        effort: &str,
    ) -> Result<ExerciseDashboardView, String> {
        self.require_active()?;
        let activity = WorkoutActivity::from_label(activity)
            .ok_or_else(|| "That workout correction is not available.".to_string())?;
        let duration = WorkoutDuration::from_label(duration)
            .ok_or_else(|| "That workout correction is not available.".to_string())?;
        let effort = PerceivedEffort::from_label(effort)
            .ok_or_else(|| "That workout correction is not available.".to_string())?;
        let now = self.clock.now_epoch_millis();
        let current_week_key = current_week_key(&self.clock, now);
        let (mut state, _) = self.current_state()?;
        let weekly_goal = state.routine.weekly_goal;
        let (week, record_index) = workout_record_location_mut(&mut state, record_id)?;
        let record = &mut week.workout_records[record_index];
        record.activity = activity;
        record.duration = duration;
        record.effort = effort;
        let is_current = week.week_start == current_week_key;
        recompute_week_progress(week, weekly_goal, now, is_current);
        self.save_state(&state)?;
        self.open()
    }

    pub fn confirm_workout_record_deletion(
        &self,
        record_id: &str,
    ) -> Result<ExerciseDashboardView, String> {
        self.require_active()?;
        let now = self.clock.now_epoch_millis();
        let current_week_key = current_week_key(&self.clock, now);
        let (mut state, _) = self.current_state()?;
        let weekly_goal = state.routine.weekly_goal;
        let (week, record_index) = workout_record_location_mut(&mut state, record_id)?;
        week.workout_records.remove(record_index);
        let is_current = week.week_start == current_week_key;
        recompute_week_progress(week, weekly_goal, now, is_current);
        self.save_state(&state)?;
        self.open()
    }

    fn require_active(&self) -> Result<(), String> {
        if self.authority.is_active()? {
            Ok(())
        } else {
            Err("This profile is inactive. Reactivate it only if the move failed.".into())
        }
    }

    fn current_state(&self) -> Result<(ExerciseState, bool), String> {
        match self.persistence.load()? {
            Some(document) => {
                let (state, migrated) = parse_state(&document)?;
                state.validate_timestamps(&self.clock)?;
                Ok((state, migrated))
            }
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
            pending_reminder_reconciliation: None,
            workout_draft: None,
            departure_decision: None,
            next_unscheduled_sequence: first_unscheduled_sequence(),
        }
    }

    pub(crate) fn validate(mut self) -> Result<Self, String> {
        if (1..EXERCISE_SCHEMA_VERSION).contains(&self.schema_version) {
            self.schema_version = EXERCISE_SCHEMA_VERSION;
        } else if self.schema_version != EXERCISE_SCHEMA_VERSION {
            return Err(format!(
                "Unsupported exercise schema version: {}",
                self.schema_version
            ));
        }
        if !routine_is_valid(&self.routine) {
            return Err("The saved exercise routine is not supported yet.".into());
        }
        self.validate_weeks()?;
        self.migrate_workout_sources();
        self.validate_departures()?;
        self.validate_workouts()?;
        if self.departure_decision.as_ref().is_some_and(|decision| {
            decision.slot_id.is_empty() || decision.outcome == DepartureOutcome::LeavingForGym
        }) {
            return Err("The saved departure decision is not valid.".into());
        }
        if self
            .pending_reminder_reconciliation
            .as_ref()
            .is_some_and(|transition| {
                transition
                    .cancel_notification_ids
                    .iter()
                    .chain(transition.desired_notification_ids.iter())
                    .any(|notification_id| notification_id.is_empty())
                    || transition.cancel_notification_ids.len()
                        != transition
                            .cancel_notification_ids
                            .iter()
                            .collect::<HashSet<_>>()
                            .len()
                    || transition.desired_notification_ids.len()
                        != transition
                            .desired_notification_ids
                            .iter()
                            .collect::<HashSet<_>>()
                            .len()
            })
        {
            return Err("The saved reminder reconciliation is not valid.".into());
        }
        Ok(self)
    }

    fn validate_weeks(&self) -> Result<(), String> {
        let mut week_starts = HashSet::new();
        for week in &self.weeks {
            let Some(week_start) = parse_iso_date(&week.week_start) else {
                return Err("The saved exercise week is not valid.".into());
            };
            let Some(week_end) = parse_iso_date(&week.week_end) else {
                return Err("The saved exercise week is not valid.".into());
            };
            let week_start_day = week_start.day_number();
            if !week_starts.insert(week_start)
                || week_end.day_number() != week_start_day + 6
                || week.primary_departures.len() != PRIMARY_DAYS.len()
                || week.fallback_departures.len() != FALLBACK_DAYS.len()
            {
                return Err("The saved exercise week is not valid.".into());
            }
            for (kind, departures) in [
                ("primary", &week.primary_departures),
                ("fallback", &week.fallback_departures),
            ] {
                for (index, departure) in departures.iter().enumerate() {
                    let Some(date) = parse_iso_date(&departure.date) else {
                        return Err("The saved exercise week is not valid.".into());
                    };
                    let schedule =
                        ScheduleSelection::parse(&departure.day, &departure.departure_time)
                            .map_err(|_| "The saved exercise week is not valid.".to_string())?;
                    if departure.id != format!("{}-{kind}-{}", week.week_start, index + 1)
                        || date.day_number() != week_start_day + schedule.weekday
                        || departure.departure_at_epoch_millis < 0
                    {
                        return Err("The saved exercise week is not valid.".into());
                    }
                }
            }
        }
        Ok(())
    }

    fn begin_reminder_reconciliation(
        &mut self,
        notification_ids: impl IntoIterator<Item = String>,
    ) {
        let transition =
            self.pending_reminder_reconciliation
                .get_or_insert_with(|| ReminderReconciliation {
                    cancel_notification_ids: Vec::new(),
                    desired_notification_ids: Vec::new(),
                });
        transition.cancel_notification_ids.extend(notification_ids);
        transition.cancel_notification_ids.sort();
        transition.cancel_notification_ids.dedup();
    }

    fn pending_reminder_cancellation_ids(&self) -> &[String] {
        self.pending_reminder_reconciliation
            .as_ref()
            .map(|transition| transition.cancel_notification_ids.as_slice())
            .unwrap_or(&[])
    }

    fn set_desired_reminder_ids(&mut self, notification_ids: impl IntoIterator<Item = String>) {
        if let Some(transition) = &mut self.pending_reminder_reconciliation {
            transition.desired_notification_ids = notification_ids.into_iter().collect();
            transition.desired_notification_ids.sort();
            transition.desired_notification_ids.dedup();
        }
    }

    fn pending_reminder_desired_ids(&self) -> &[String] {
        self.pending_reminder_reconciliation
            .as_ref()
            .map(|transition| transition.desired_notification_ids.as_slice())
            .unwrap_or(&[])
    }

    fn reminder_reconciliation_notification_ids(&self, include_desired: bool) -> Vec<String> {
        let mut notification_ids = self.pending_reminder_cancellation_ids().to_vec();
        notification_ids.extend(self.scheduled_notification_ids());
        if include_desired {
            notification_ids.extend(self.pending_reminder_desired_ids().iter().cloned());
        }
        notification_ids.sort();
        notification_ids.dedup();
        notification_ids
    }

    fn complete_reminder_reconciliation(&mut self) {
        self.pending_reminder_reconciliation = None;
    }

    fn mark_native_reminder(&mut self, notification_id: &str, now: i64) {
        for week in &mut self.weeks {
            for departure in all_departures_mut(week) {
                if notification_id == reminder_intent(departure).id {
                    departure.reminder_scheduled_at_epoch_millis = Some(now);
                }
                if notification_id == follow_up_intent(departure).id {
                    departure.follow_up_scheduled_at_epoch_millis = Some(now);
                }
                if let Some(due_at) = departure.record_workout_prompt_due_at_epoch_millis {
                    if notification_id == record_workout_intent(departure, due_at).id {
                        departure.record_workout_reminder_scheduled_at_epoch_millis = Some(now);
                    }
                }
            }
        }
    }

    pub(crate) fn scheduled_notification_ids(&self) -> Vec<String> {
        self.weeks
            .iter()
            .flat_map(|week| {
                all_departures(week).flat_map(|departure| {
                    let mut ids = Vec::new();
                    if departure.status == DepartureStatus::Scheduled
                        && !departure_has_workout_record(week, departure)
                    {
                        if departure.reminder_scheduled_at_epoch_millis.is_some() {
                            ids.push(reminder_intent(departure).id);
                        }
                        if departure.follow_up_scheduled_at_epoch_millis.is_some() {
                            ids.push(follow_up_intent(departure).id);
                        }
                    }
                    if departure.status == DepartureStatus::Leaving
                        && !departure_has_workout_record(week, departure)
                        && departure
                            .record_workout_reminder_scheduled_at_epoch_millis
                            .is_some()
                    {
                        if let Some(due_at) = departure.record_workout_prompt_due_at_epoch_millis {
                            ids.push(record_workout_intent(departure, due_at).id);
                        }
                    }
                    ids
                })
            })
            .collect()
    }

    pub(crate) fn validate_timestamps<C: ExerciseClock>(&self, _clock: &C) -> Result<(), String> {
        for week in &self.weeks {
            for departure in all_departures(week) {
                let optional_timestamps_are_valid = [
                    departure.reminder_scheduled_at_epoch_millis,
                    departure.follow_up_scheduled_at_epoch_millis,
                    departure.record_workout_prompt_due_at_epoch_millis,
                    departure.record_workout_reminder_scheduled_at_epoch_millis,
                ]
                .into_iter()
                .flatten()
                .all(|timestamp| timestamp >= 0);
                let response_timestamps_are_valid = departure
                    .departure_response
                    .as_ref()
                    .is_none_or(|response| {
                        response.recorded_at_epoch_millis >= 0
                            && response
                                .recorded_at_utc_offset_minutes
                                .is_none_or(valid_utc_offset_minutes)
                            && departure
                                .record_workout_prompt_due_at_epoch_millis
                                .is_none_or(|due_at| {
                                    due_at
                                        == response.recorded_at_epoch_millis
                                            + RECORD_WORKOUT_DELAY_MILLIS
                                })
                    });
                if !planned_departure_timestamp_is_valid(departure)
                    || !optional_timestamps_are_valid
                    || !response_timestamps_are_valid
                {
                    return Err("The saved exercise timestamps are not valid.".into());
                }
            }
            if !week.workout_records.iter().all(|record| {
                record.recorded_at_epoch_millis >= 0
                    && record
                        .recorded_at_utc_offset_minutes
                        .is_none_or(valid_utc_offset_minutes)
            }) {
                return Err("The saved exercise timestamps are not valid.".into());
            }
        }
        Ok(())
    }

    fn rebase_planned_departures<C: ExerciseClock>(&mut self, clock: &C) -> bool {
        let mut changed = false;
        for week in &mut self.weeks {
            for departure in all_departures_mut(week) {
                let date = parse_iso_date(&departure.date).expect("saved departure date is valid");
                let schedule = ScheduleSelection::parse(&departure.day, &departure.departure_time)
                    .expect("saved departure schedule is valid");
                let departure_at = local_epoch_millis(
                    clock,
                    date.day_number(),
                    schedule.departure_time.hour,
                    schedule.departure_time.minute,
                );
                let offset_minutes = clock.utc_offset_minutes_at(departure_at);
                if departure.departure_at_epoch_millis != departure_at
                    || departure.departure_utc_offset_minutes != Some(offset_minutes)
                {
                    departure.departure_at_epoch_millis = departure_at;
                    departure.departure_utc_offset_minutes = Some(offset_minutes);
                    changed = true;
                }
            }
        }
        changed
    }

    pub(crate) fn reset_native_reminder_markers(&mut self) {
        self.pending_reminder_reconciliation = None;
        self.clear_native_reminder_markers();
    }

    pub(crate) fn prepare_reminder_reconciliation<C: ExerciseClock>(
        &mut self,
        notification_ids: impl IntoIterator<Item = String>,
        clock: &C,
        now: i64,
    ) {
        self.reset_native_reminder_markers();
        self.begin_reminder_reconciliation(notification_ids);
        let desired_notification_ids = reminder_intents_for_state(self, clock, now)
            .into_iter()
            .map(|intent| intent.id);
        self.set_desired_reminder_ids(desired_notification_ids);
    }

    pub(crate) fn restore_preview<C: ExerciseClock>(
        &self,
        clock: &C,
        now: i64,
    ) -> ExerciseRestorePreview {
        let latest_week = self
            .weeks
            .iter()
            .max_by(|left, right| left.week_start.cmp(&right.week_start));
        let current_week = latest_week.map(|week| ExerciseWeekPreview {
            week_start: week.week_start.clone(),
            week_end: week.week_end.clone(),
            completed_count: week.completed_count,
            weekly_goal: self.routine.weekly_goal,
        });
        ExerciseRestorePreview {
            current_week,
            historical_week_count: self.weeks.len().saturating_sub(1),
            desired_reminder_count: reminder_intents_for_state(self, clock, now).len(),
        }
    }

    fn clear_native_reminder_markers(&mut self) {
        for week in &mut self.weeks {
            let recorded_slot_ids = week
                .workout_records
                .iter()
                .filter_map(|record| record.source_slot_id.clone())
                .collect::<HashSet<_>>();
            for departure in all_departures_mut(week) {
                if departure.status == DepartureStatus::Scheduled {
                    departure.reminder_scheduled_at_epoch_millis = None;
                    departure.follow_up_scheduled_at_epoch_millis = None;
                }
                if departure.status == DepartureStatus::Leaving
                    && !recorded_slot_ids.contains(&departure.id)
                {
                    departure.record_workout_reminder_scheduled_at_epoch_millis = None;
                }
            }
        }
    }

    fn set_native_reminder_markers(&mut self, notification_ids: &HashSet<String>, now: i64) {
        self.clear_native_reminder_markers();
        for week in &mut self.weeks {
            for departure in all_departures_mut(week) {
                if notification_ids.contains(&reminder_intent(departure).id) {
                    departure.reminder_scheduled_at_epoch_millis = Some(now);
                }
                if notification_ids.contains(&follow_up_intent(departure).id) {
                    departure.follow_up_scheduled_at_epoch_millis = Some(now);
                }
                if let Some(due_at) = departure.record_workout_prompt_due_at_epoch_millis {
                    if notification_ids.contains(&record_workout_intent(departure, due_at).id) {
                        departure.record_workout_reminder_scheduled_at_epoch_millis = Some(now);
                    }
                }
            }
        }
    }

    fn migrate_workout_sources(&mut self) {
        for week in &mut self.weeks {
            for record in &mut week.workout_records {
                if record.source.is_none() {
                    record.source = record
                        .source_slot_id
                        .as_deref()
                        .map(source_from_legacy_slot_id);
                }
            }
        }
        if let Some(draft) = &mut self.workout_draft {
            if draft.source.is_none() {
                draft.source = Some(source_from_legacy_slot_id(&draft.slot_id));
            }
        }
    }

    fn validate_departures(&self) -> Result<(), String> {
        for week in &self.weeks {
            let mut departure_ids = HashSet::new();
            for departure in all_departures(week) {
                if !departure_ids.insert(departure.id.as_str())
                    || DepartureTime::parse(&departure.departure_time).is_none()
                {
                    return Err("The saved departure data is not valid.".into());
                }
                let response_is_valid =
                    match departure.status {
                        DepartureStatus::Available
                        | DepartureStatus::Scheduled
                        | DepartureStatus::Missed => {
                            departure.departure_response.is_none()
                                && departure
                                    .record_workout_prompt_due_at_epoch_millis
                                    .is_none()
                                && departure
                                    .record_workout_reminder_scheduled_at_epoch_millis
                                    .is_none()
                        }
                        DepartureStatus::NotNeeded => {
                            departure
                                .departure_response
                                .as_ref()
                                .is_none_or(|response| {
                                    response.outcome == DepartureOutcome::LeavingForGym
                                        && response.reason.is_none()
                                        && response.fallback_slot_id.is_none()
                                })
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
                let source = record.source.expect("workout sources were migrated");
                let valid_source = match source {
                    WorkoutSource::Unscheduled => {
                        record.source_slot_id.is_none()
                            && record
                                .id
                                .strip_prefix(&format!("{}-unscheduled-", week.week_start))
                                .and_then(|sequence| sequence.parse::<u64>().ok())
                                .is_some_and(|sequence| sequence < self.next_unscheduled_sequence)
                    }
                    WorkoutSource::Primary | WorkoutSource::Fallback => record
                        .source_slot_id
                        .as_deref()
                        .and_then(|slot_id| {
                            all_departures(week)
                                .find(|departure| departure.id == slot_id)
                                .map(|departure| (slot_id, departure))
                        })
                        .is_some_and(|(slot_id, departure)| {
                            source_slot_ids.insert(slot_id)
                                && record.id == format!("{slot_id}-workout")
                                && (departure_supports_workout_draft(week, departure, source)
                                    || departure_supports_direct_workout_record(
                                        week, departure, source, record,
                                    ))
                        }),
                };
                if !record_ids.insert(record.id.as_str())
                    || !valid_source
                    || record
                        .recorded_at_utc_offset_minutes
                        .is_some_and(|offset| !valid_utc_offset_minutes(offset))
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
            let source = draft.source.expect("workout sources were migrated");
            let valid_source = if source == WorkoutSource::Unscheduled {
                draft.slot_id == UNSCHEDULED_WORKOUT_SLOT_ID
            } else {
                self.weeks
                    .iter()
                    .find_map(|week| {
                        all_departures(week)
                            .find(|departure| departure.id == draft.slot_id)
                            .map(|departure| (week, departure))
                    })
                    .is_some_and(|(week, departure)| {
                        departure_supports_workout_draft(week, departure, source)
                            && !week.workout_records.iter().any(|record| {
                                record.source_slot_id.as_deref() == Some(draft.slot_id.as_str())
                            })
                    })
            };
            if !valid_source {
                return Err("The saved workout data is not valid.".into());
            }
        }
        Ok(())
    }
}

pub(crate) fn parse_state(document: &[u8]) -> Result<(ExerciseState, bool), String> {
    let state = serde_json::from_slice::<ExerciseState>(document)
        .map_err(|_| "The local exercise state is not valid.".to_string())?;
    let migrated = state.schema_version != EXERCISE_SCHEMA_VERSION;
    Ok((state.validate()?, migrated))
}

fn valid_utc_offset_minutes(offset_minutes: i32) -> bool {
    (-MAX_UTC_OFFSET_MINUTES..=MAX_UTC_OFFSET_MINUTES).contains(&offset_minutes)
}

fn planned_departure_timestamp_is_valid(departure: &PlannedDeparture) -> bool {
    if departure.departure_at_epoch_millis < 0 {
        return false;
    }
    let Some(date) = parse_iso_date(&departure.date) else {
        return false;
    };
    let Ok(schedule) = ScheduleSelection::parse(&departure.day, &departure.departure_time) else {
        return false;
    };
    let local_millis = (date.day_number() * 86_400
        + schedule.departure_time.hour * 3_600
        + schedule.departure_time.minute * 60)
        * 1_000;
    let offset_minutes = match departure.departure_utc_offset_minutes {
        Some(offset_minutes) if valid_utc_offset_minutes(offset_minutes) => offset_minutes,
        Some(_) => return false,
        None => {
            let difference = local_millis - departure.departure_at_epoch_millis;
            if difference.rem_euclid(60_000) != 0 {
                return false;
            }
            let Ok(offset_minutes) = i32::try_from(difference / 60_000) else {
                return false;
            };
            if !valid_utc_offset_minutes(offset_minutes) {
                return false;
            }
            return true;
        }
    };
    departure.departure_at_epoch_millis == local_millis - i64::from(offset_minutes) * 60_000
}

fn routine_departures(days: &[(i64, &str)]) -> Vec<RoutineDeparture> {
    days.iter()
        .enumerate()
        .map(|(index, (weekday, day))| RoutineDeparture {
            weekday: *weekday,
            day: (*day).into(),
            departure_time: default_departure_time(),
            order: (index + 1) as u32,
        })
        .collect()
}

fn routine_is_valid(routine: &Routine) -> bool {
    routine.weekly_goal == WEEKLY_GOAL
        && routine.fallback == routine_departures(&FALLBACK_DAYS)
        && routine.primary.len() == PRIMARY_DAYS.len()
        && routine
            .primary
            .iter()
            .enumerate()
            .all(|(index, departure)| {
                departure.order == (index + 1) as u32
                    && ScheduleSelection::parse(&departure.day, &departure.departure_time)
                        .is_ok_and(|schedule| schedule.weekday == departure.weekday)
            })
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
        .map(|slot| {
            let schedule = ScheduleSelection::parse(&slot.day, &slot.departure_time)
                .expect("the saved routine departure was validated");
            let departure_at = local_epoch_millis(
                clock,
                week_start_day + schedule.weekday,
                schedule.departure_time.hour,
                schedule.departure_time.minute,
            );
            PlannedDeparture {
                id: format!("{week_key}-{kind}-{}", slot.order),
                day: slot.day.clone(),
                date: date_from_day_number(week_start_day + slot.weekday).iso_date(),
                departure_time: slot.departure_time.clone(),
                departure_at_epoch_millis: departure_at,
                departure_utc_offset_minutes: Some(clock.utc_offset_minutes_at(departure_at)),
                status,
                reminder_scheduled_at_epoch_millis: None,
                follow_up_scheduled_at_epoch_millis: None,
                departure_response: None,
                record_workout_prompt_due_at_epoch_millis: None,
                record_workout_reminder_scheduled_at_epoch_millis: None,
                assigned_from_slot_id: None,
            }
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
        .filter(|departure| {
            departure.status == DepartureStatus::Scheduled
                && !departure_has_workout_record(week, departure)
        })
        .filter(|departure| {
            departure.departure_at_epoch_millis >= now
                || local_day_number(clock, departure.departure_at_epoch_millis) == today
        })
        .min_by_key(|departure| departure.departure_at_epoch_millis)
}

fn reminder_intents_for_state<C: ExerciseClock>(
    state: &ExerciseState,
    clock: &C,
    now: i64,
) -> Vec<NotificationIntent> {
    let week_key = current_week_key(clock, now);
    let Some(week) = state.weeks.iter().find(|week| week.week_start == week_key) else {
        return Vec::new();
    };
    if weekly_goal_reached_at(week, state.routine.weekly_goal).is_some() {
        return Vec::new();
    }

    let mut intents = Vec::new();
    if let Some(departure) = next_scheduled_departure(week, clock, now) {
        intents.push(reminder_intent(departure));
        intents.push(follow_up_intent(departure));
    }
    for departure in all_departures(week) {
        if departure.status == DepartureStatus::Leaving
            && !departure_has_workout_record(week, departure)
        {
            if let Some(due_at) = departure.record_workout_prompt_due_at_epoch_millis {
                intents.push(record_workout_intent(departure, due_at));
            }
        }
    }
    intents
}

fn departure_decision_outcome(outcome: &str) -> Result<DepartureOutcome, String> {
    match outcome {
        "move-to-fallback" => Ok(DepartureOutcome::MoveToFallback),
        "skip" => Ok(DepartureOutcome::Skip),
        _ => Err("That departure response is not available.".into()),
    }
}

fn departure_reason_prompt(decision: &DepartureDecision) -> DepartureReasonPromptView {
    DepartureReasonPromptView {
        slot_id: decision.slot_id.clone(),
        outcome: outcome_label(decision.outcome).into(),
        heading: match decision.outcome {
            DepartureOutcome::MoveToFallback => "Why are you moving this workout?",
            DepartureOutcome::Skip => "Why are you skipping this workout?",
            DepartureOutcome::LeavingForGym => unreachable!("validated decision outcome"),
        }
        .into(),
        reasons: DepartureReason::ALL
            .iter()
            .map(|reason| reason.label().into())
            .collect(),
    }
}

fn departure_decision_is_current(state: &ExerciseState, week_key: &str, now: i64) -> bool {
    let Some(decision) = &state.departure_decision else {
        return true;
    };
    let Some(week) = state.weeks.iter().find(|week| week.week_start == week_key) else {
        return false;
    };
    decidable_departure(week, &decision.slot_id, now).is_ok()
        && (decision.outcome != DepartureOutcome::MoveToFallback
            || next_available_fallback_index(week, now).is_some())
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

fn workout_source_for_departure(
    week: &ExerciseWeek,
    departure: &PlannedDeparture,
) -> Option<WorkoutSource> {
    if week
        .primary_departures
        .iter()
        .any(|candidate| candidate.id == departure.id)
    {
        Some(WorkoutSource::Primary)
    } else if week
        .fallback_departures
        .iter()
        .any(|candidate| candidate.id == departure.id)
    {
        Some(WorkoutSource::Fallback)
    } else {
        None
    }
}

fn source_from_legacy_slot_id(slot_id: &str) -> WorkoutSource {
    if slot_id.contains("-fallback-") {
        WorkoutSource::Fallback
    } else {
        WorkoutSource::Primary
    }
}

fn all_departures_mut(week: &mut ExerciseWeek) -> impl Iterator<Item = &mut PlannedDeparture> {
    week.primary_departures
        .iter_mut()
        .chain(week.fallback_departures.iter_mut())
}

fn weekly_goal_reached_at(week: &ExerciseWeek, weekly_goal: u32) -> Option<i64> {
    let mut qualifying_records = week
        .workout_records
        .iter()
        .filter(|record| record.duration.qualifies())
        .map(|record| record.recorded_at_epoch_millis)
        .collect::<Vec<_>>();
    qualifying_records.sort_unstable();
    qualifying_records
        .get(weekly_goal.saturating_sub(1) as usize)
        .copied()
}

fn recompute_week_progress(week: &mut ExerciseWeek, weekly_goal: u32, now: i64, is_current: bool) {
    week.completed_count = week
        .workout_records
        .iter()
        .filter(|record| record.duration.qualifies())
        .count() as u32;
    let goal_reached_at = weekly_goal_reached_at(week, weekly_goal);
    for departure in &mut week.primary_departures {
        recompute_departure_outcome(departure, goal_reached_at, now, is_current, false);
    }
    for departure in &mut week.fallback_departures {
        recompute_departure_outcome(departure, goal_reached_at, now, is_current, true);
    }
}

fn recompute_departure_outcome(
    departure: &mut PlannedDeparture,
    goal_reached_at: Option<i64>,
    now: i64,
    is_current: bool,
    is_fallback: bool,
) {
    if !matches!(
        departure.status,
        DepartureStatus::Missed | DepartureStatus::NotNeeded
    ) {
        return;
    }
    let leaving_was_suppressed = departure
        .departure_response
        .as_ref()
        .is_some_and(|response| response.outcome == DepartureOutcome::LeavingForGym);
    if goal_reached_at.is_some_and(|reached_at| {
        departure.departure_at_epoch_millis >= reached_at || leaving_was_suppressed
    }) {
        departure.status = DepartureStatus::NotNeeded;
    } else if leaving_was_suppressed {
        let response_at = departure
            .departure_response
            .as_ref()
            .expect("the suppressed leaving departure has a response")
            .recorded_at_epoch_millis;
        departure.status = DepartureStatus::Leaving;
        departure.record_workout_prompt_due_at_epoch_millis =
            Some(response_at + RECORD_WORKOUT_DELAY_MILLIS);
        departure.record_workout_reminder_scheduled_at_epoch_millis = None;
    } else if is_current && departure.departure_at_epoch_millis > now {
        departure.status = if is_fallback && departure.assigned_from_slot_id.is_none() {
            DepartureStatus::Available
        } else {
            DepartureStatus::Scheduled
        };
        departure.reminder_scheduled_at_epoch_millis = None;
        departure.follow_up_scheduled_at_epoch_millis = None;
    } else {
        departure.status = DepartureStatus::Missed;
    }
}

fn workout_record_location_mut<'a>(
    state: &'a mut ExerciseState,
    record_id: &str,
) -> Result<(&'a mut ExerciseWeek, usize), String> {
    for week in &mut state.weeks {
        if let Some(record_index) = week
            .workout_records
            .iter()
            .position(|record| record.id == record_id)
        {
            return Ok((week, record_index));
        }
    }
    Err("That workout record is not available.".into())
}

fn close_expired_weeks(state: &mut ExerciseState, current_week_start: CivilDate) -> bool {
    let mut changed = false;
    for week in &mut state.weeks {
        let week_end = parse_iso_date(&week.week_end).expect("saved week end is valid");
        if week_end >= current_week_start {
            continue;
        }
        for departure in all_departures_mut(week) {
            if departure.status == DepartureStatus::Scheduled {
                departure.status = DepartureStatus::Missed;
                changed = true;
            }
        }
    }
    changed
}

fn suppress_remaining_obligations(
    week: &mut ExerciseWeek,
    goal_reached_at: i64,
) -> (bool, Vec<String>) {
    let recorded_slot_ids = week
        .workout_records
        .iter()
        .filter_map(|record| record.source_slot_id.clone())
        .collect::<HashSet<_>>();
    let mut changed = false;
    let mut reminder_ids = Vec::new();
    for departure in all_departures_mut(week) {
        if departure.departure_at_epoch_millis >= goal_reached_at
            && matches!(
                departure.status,
                DepartureStatus::Scheduled | DepartureStatus::Available
            )
        {
            if departure.reminder_scheduled_at_epoch_millis.is_some() {
                reminder_ids.push(reminder_intent(departure).id);
            }
            if departure.follow_up_scheduled_at_epoch_millis.is_some() {
                reminder_ids.push(follow_up_intent(departure).id);
            }
            departure.status = DepartureStatus::NotNeeded;
            changed = true;
        } else if departure.status == DepartureStatus::Leaving
            && !recorded_slot_ids.contains(&departure.id)
        {
            if departure
                .record_workout_reminder_scheduled_at_epoch_millis
                .is_some()
            {
                if let Some(due_at) = departure.record_workout_prompt_due_at_epoch_millis {
                    reminder_ids.push(record_workout_intent(departure, due_at).id);
                }
            }
            departure.status = DepartureStatus::NotNeeded;
            departure.record_workout_prompt_due_at_epoch_millis = None;
            departure.record_workout_reminder_scheduled_at_epoch_millis = None;
            changed = true;
        }
    }
    (changed, reminder_ids)
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

fn fallback_reserved_by_primary(week: &ExerciseWeek, departure: &PlannedDeparture) -> bool {
    week.primary_departures.iter().any(|primary| {
        matches!(
            primary.status,
            DepartureStatus::Scheduled | DepartureStatus::Leaving
        ) && !departure_has_workout_record(week, primary)
            && primary.date == departure.date
    })
}

fn fallback_is_available(week: &ExerciseWeek, departure: &PlannedDeparture, now: i64) -> bool {
    departure.status == DepartureStatus::Available
        && departure.departure_at_epoch_millis >= now
        && !departure_has_workout_record(week, departure)
        && !fallback_reserved_by_primary(week, departure)
}

fn next_available_fallback_index(week: &ExerciseWeek, now: i64) -> Option<usize> {
    week.fallback_departures
        .iter()
        .enumerate()
        .filter(|(_, departure)| fallback_is_available(week, departure, now))
        .min_by_key(|(_, departure)| departure.departure_at_epoch_millis)
        .map(|(index, _)| index)
}

fn fallback_status(week: &ExerciseWeek, departure: &PlannedDeparture, now: i64) -> String {
    if departure_has_workout_record(week, departure) {
        return "Recorded".into();
    }
    if let Some(source_id) = departure.assigned_from_slot_id.as_deref() {
        let source_day = all_departures(week)
            .find(|candidate| candidate.id == source_id)
            .map(|source| source.day.as_str())
            .unwrap_or("planned workout");
        let assignment = format!("Assigned from {source_day}");
        match departure.status {
            DepartureStatus::Scheduled
                if direct_recordable_departure(week, &departure.id, now).is_ok() =>
            {
                format!("{assignment} · Unrecorded — ready to record")
            }
            DepartureStatus::Scheduled => assignment,
            DepartureStatus::Leaving if departure_has_workout_record(week, departure) => {
                format!("{assignment} · Completed")
            }
            DepartureStatus::Leaving => format!("{assignment} · Leaving for gym confirmed"),
            DepartureStatus::Moved | DepartureStatus::Skipped => format!(
                "{assignment} · {}",
                departure_decision_status(week, departure)
                    .expect("closed assigned fallback has a decision")
            ),
            DepartureStatus::NotNeeded => {
                format!("{assignment} · Weekly goal met — no workout needed")
            }
            DepartureStatus::Missed => format!("{assignment} · Missed — no response"),
            DepartureStatus::Available => "Available".into(),
        }
    } else if departure.status == DepartureStatus::NotNeeded {
        "Weekly goal met — no workout needed".into()
    } else if departure.status == DepartureStatus::Missed {
        "Missed — no response".into()
    } else if direct_recordable_departure(week, &departure.id, now).is_ok() {
        "Unrecorded — ready to record".into()
    } else if fallback_reserved_by_primary(week, departure) {
        "Reserved by primary departure".into()
    } else if fallback_is_available(week, departure, now) {
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
    let goal_reached = weekly_goal_reached_at(week, state.routine.weekly_goal).is_some();
    let mut historical_weeks = state
        .weeks
        .iter()
        .filter(|candidate| candidate.week_start != week.week_start)
        .collect::<Vec<_>>();
    historical_weeks.sort_by(|left, right| right.week_start.cmp(&left.week_start));
    ExerciseDashboardView {
        product_name: "Personal Dashboard".into(),
        feature_area: "Exercise tracking".into(),
        schema_version: state.schema_version,
        week_label: friendly_week_label(week),
        progress: format!(
            "{} of {} completed",
            week.completed_count, state.routine.weekly_goal
        ),
        manual_workout_action: "Log workout now".into(),
        weekly_goal_status: goal_reached.then(|| "Weekly goal complete".into()),
        next_departure: next_departure.map(friendly_departure),
        next_departure_slot_id: next_departure.map(|departure| departure.id.clone()),
        schedule_choices: schedule_choices_view(),
        primary_departures: primary_departure_views(week, now),
        fallback_departures: fallback_departure_views(week, now),
        fallback_available_count: week
            .fallback_departures
            .iter()
            .filter(|departure| fallback_is_available(week, departure, now))
            .count(),
        reminder_intent,
        reminder_message,
        departure_prompt: (!goal_reached && state.departure_decision.is_none())
            .then(|| departure_prompt(week, now))
            .flatten(),
        departure_reason_prompt: state
            .departure_decision
            .as_ref()
            .map(departure_reason_prompt),
        departure_confirmation: departure_confirmation(week, clock),
        workout_prompt: (!goal_reached)
            .then(|| workout_prompt(state, week, now))
            .flatten(),
        workout_recording: workout_recording(state),
        workout_history_controls: workout_history_controls_view(),
        workout_records: workout_record_views(week, clock),
        history: historical_weeks
            .into_iter()
            .map(|historical_week| {
                exercise_week_history_view(historical_week, state.routine.weekly_goal, clock, now)
            })
            .collect(),
        routine_settings: routine_settings_view(&state.routine),
    }
}

fn friendly_week_label(week: &ExerciseWeek) -> String {
    let start = parse_iso_date(&week.week_start).expect("saved week start is valid");
    let end = parse_iso_date(&week.week_end).expect("saved week end is valid");
    format!(
        "{}, {} {} – {}, {} {}",
        PRIMARY_DAYS[0].1,
        month_name(start.month),
        start.day,
        FALLBACK_DAYS[1].1,
        month_name(end.month),
        end.day
    )
}

fn workout_record_view(record: &WorkoutRecord, clock: &impl ExerciseClock) -> WorkoutRecordView {
    WorkoutRecordView {
        id: record.id.clone(),
        source: record
            .source
            .expect("workout sources were migrated")
            .label()
            .into(),
        recorded_at: friendly_recorded_at(clock, record.recorded_at_epoch_millis),
        recorded_at_utc_offset_minutes: record.recorded_at_utc_offset_minutes,
        activity: record.activity.label().into(),
        duration: record.duration.label().into(),
        effort: record.effort.label().into(),
        outcome: if record.duration.qualifies() {
            "Counts toward weekly progress".into()
        } else {
            "Short effort — does not count toward weekly progress".into()
        },
    }
}

fn workout_record_views(week: &ExerciseWeek, clock: &impl ExerciseClock) -> Vec<WorkoutRecordView> {
    let mut records = week.workout_records.iter().collect::<Vec<_>>();
    records.sort_by(|left, right| {
        right
            .recorded_at_epoch_millis
            .cmp(&left.recorded_at_epoch_millis)
    });
    records
        .into_iter()
        .map(|record| workout_record_view(record, clock))
        .collect()
}

fn workout_history_controls_view() -> WorkoutHistoryControlsView {
    WorkoutHistoryControlsView {
        activity_choices: WorkoutActivity::ALL
            .iter()
            .map(|choice| choice.label().into())
            .collect(),
        duration_choices: WorkoutDuration::ALL
            .iter()
            .map(|choice| choice.label().into())
            .collect(),
        effort_choices: PerceivedEffort::ALL
            .iter()
            .map(|choice| choice.label().into())
            .collect(),
        edit_action: "Edit record".into(),
        save_action: "Save correction".into(),
        delete_action: "Delete record".into(),
        delete_prompt: "Delete this workout record? This cannot be undone.".into(),
        confirm_delete_action: "Confirm delete".into(),
        cancel_delete_action: "Cancel".into(),
    }
}

fn weekday_from_label(label: &str) -> Option<i64> {
    WEEKDAYS
        .iter()
        .position(|candidate| *candidate == label)
        .map(|weekday| weekday as i64)
}

#[derive(Clone, Copy, Debug)]
struct DepartureTime {
    hour: i64,
    minute: i64,
}

impl DepartureTime {
    fn parse(value: &str) -> Option<Self> {
        if value.len() != 5 || value.as_bytes().get(2) != Some(&b':') {
            return None;
        }
        let mut parts = value.split(':');
        let hour = parts.next()?.parse::<i64>().ok()?;
        let minute = parts.next()?.parse::<i64>().ok()?;
        if parts.next().is_some() || !(0..24).contains(&hour) || !matches!(minute, 0 | 30) {
            return None;
        }
        Some(Self { hour, minute })
    }

    fn value(self) -> String {
        format!("{:02}:{:02}", self.hour, self.minute)
    }

    fn friendly_label(self) -> String {
        let period = if self.hour < 12 { "AM" } else { "PM" };
        let display_hour = match self.hour.rem_euclid(12) {
            0 => 12,
            value => value,
        };
        format!("{display_hour}:{:02} {period}", self.minute)
    }
}

#[derive(Clone, Copy, Debug)]
struct ScheduleSelection {
    weekday: i64,
    day: &'static str,
    departure_time: DepartureTime,
}

#[derive(Clone, Copy, Debug)]
enum ScheduleSelectionError {
    Day,
    Time,
}

impl ScheduleSelectionError {
    fn message(self) -> &'static str {
        match self {
            Self::Day => "That schedule day is not available.",
            Self::Time => "That departure time is not available.",
        }
    }
}

impl ScheduleSelection {
    fn parse(day: &str, departure_time: &str) -> Result<Self, ScheduleSelectionError> {
        let weekday = weekday_from_label(day).ok_or(ScheduleSelectionError::Day)?;
        let departure_time =
            DepartureTime::parse(departure_time).ok_or(ScheduleSelectionError::Time)?;
        Ok(Self {
            weekday,
            day: WEEKDAYS[weekday as usize],
            departure_time,
        })
    }

    fn epoch_millis<C: ExerciseClock>(self, clock: &C, week_start_day: i64) -> i64 {
        local_epoch_millis(
            clock,
            week_start_day + self.weekday,
            self.departure_time.hour,
            self.departure_time.minute,
        )
    }

    fn apply_to_planned(self, departure: &mut PlannedDeparture, week_start_day: i64) {
        departure.day = self.day.into();
        departure.date = date_from_day_number(week_start_day + self.weekday).iso_date();
        departure.departure_time = self.departure_time.value();
    }

    fn apply_to_routine(self, departure: &mut RoutineDeparture) {
        departure.weekday = self.weekday;
        departure.day = self.day.into();
        departure.departure_time = self.departure_time.value();
    }
}

fn friendly_schedule_time(value: &str) -> String {
    DepartureTime::parse(value)
        .expect("saved departure time is valid")
        .friendly_label()
}

fn schedule_day_choices() -> Vec<ScheduleChoiceView> {
    WEEKDAYS
        .iter()
        .map(|day| ScheduleChoiceView {
            value: (*day).into(),
            label: (*day).into(),
        })
        .collect()
}

fn schedule_time_choices() -> Vec<ScheduleChoiceView> {
    (0..24)
        .flat_map(|hour| [0, 30].map(move |minute| (hour, minute)))
        .map(|(hour, minute)| {
            let value = format!("{hour:02}:{minute:02}");
            ScheduleChoiceView {
                label: friendly_schedule_time(&value),
                value,
            }
        })
        .collect()
}

fn schedule_choices_view() -> ScheduleChoicesView {
    ScheduleChoicesView {
        day_choices: schedule_day_choices(),
        time_choices: schedule_time_choices(),
    }
}

fn schedule_adjustment_view(
    departure: &PlannedDeparture,
    now: i64,
) -> Option<ScheduleAdjustmentView> {
    (departure.status == DepartureStatus::Scheduled && departure.departure_at_epoch_millis > now)
        .then(|| ScheduleAdjustmentView {
            action: "Adjust this week".into(),
            save_action: "Save this week only".into(),
            selected_day: departure.day.clone(),
            selected_time: departure.departure_time.clone(),
        })
}

fn routine_settings_view(routine: &Routine) -> RoutineSettingsView {
    RoutineSettingsView {
        action: "Change repeating routine".into(),
        guidance: "Applies to future weeks only. This week and prior weeks stay unchanged.".into(),
        save_action: "Save future routine".into(),
        primary_departures: routine
            .primary
            .iter()
            .map(|departure| RoutineDepartureSettingsView {
                order: departure.order,
                day: departure.day.clone(),
                time: friendly_schedule_time(&departure.departure_time),
                selected_day: departure.day.clone(),
                selected_time: departure.departure_time.clone(),
            })
            .collect(),
    }
}

fn primary_departure_views(week: &ExerciseWeek, now: i64) -> Vec<PrimaryDepartureView> {
    week.primary_departures
        .iter()
        .map(|departure| PrimaryDepartureView {
            id: departure.id.clone(),
            day: departure.day.clone(),
            time: friendly_schedule_time(&departure.departure_time),
            departure_at_epoch_millis: departure.departure_at_epoch_millis,
            status: departure_status(week, departure, now),
            status_kind: departure_status_kind(week, departure, now),
            has_workout_record: departure_has_workout_record(week, departure),
            record_workout_action: record_workout_action(week, departure, now),
            adjustment: schedule_adjustment_view(departure, now),
        })
        .collect()
}

fn fallback_departure_views(week: &ExerciseWeek, now: i64) -> Vec<FallbackDepartureView> {
    week.fallback_departures
        .iter()
        .map(|departure| FallbackDepartureView {
            id: departure.id.clone(),
            day: departure.day.clone(),
            time: friendly_schedule_time(&departure.departure_time),
            departure_at_epoch_millis: departure.departure_at_epoch_millis,
            availability: fallback_status(week, departure, now),
            availability_kind: fallback_availability_kind(week, departure, now),
            record_workout_action: record_workout_action(week, departure, now),
        })
        .collect()
}

fn exercise_week_history_view(
    week: &ExerciseWeek,
    weekly_goal: u32,
    clock: &impl ExerciseClock,
    now: i64,
) -> ExerciseWeekHistoryView {
    ExerciseWeekHistoryView {
        week_label: friendly_week_label(week),
        progress: format!("{} of {} completed", week.completed_count, weekly_goal),
        primary_departures: primary_departure_views(week, now),
        fallback_departures: fallback_departure_views(week, now),
        workout_records: workout_record_views(week, clock),
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
                    .any(|record| record.source_slot_id.as_deref() == Some(slot_id))
        })
        .ok_or_else(|| "That workout prompt is not awaiting a record.".to_string())
}

fn direct_recordable_departure<'a>(
    week: &'a ExerciseWeek,
    slot_id: &str,
    now: i64,
) -> Result<&'a PlannedDeparture, String> {
    all_departures(week)
        .find(|departure| {
            departure.id == slot_id
                && matches!(
                    departure.status,
                    DepartureStatus::Scheduled | DepartureStatus::Available
                )
                && departure.departure_at_epoch_millis <= now
                && departure.departure_response.is_none()
                && departure
                    .record_workout_prompt_due_at_epoch_millis
                    .is_none()
                && departure
                    .record_workout_reminder_scheduled_at_epoch_millis
                    .is_none()
                && (departure.assigned_from_slot_id.is_some()
                    || workout_source_for_departure(week, departure)
                        != Some(WorkoutSource::Fallback))
                && !departure_has_workout_record(week, departure)
        })
        .ok_or_else(|| "That planned workout is not ready to record.".into())
}

fn record_workout_action(
    week: &ExerciseWeek,
    departure: &PlannedDeparture,
    now: i64,
) -> Option<String> {
    direct_recordable_departure(week, &departure.id, now)
        .or_else(|_| recordable_departure(week, &departure.id, now))
        .ok()
        .map(|_| "Record workout".into())
}

fn departure_supports_workout_draft(
    week: &ExerciseWeek,
    departure: &PlannedDeparture,
    source: WorkoutSource,
) -> bool {
    if workout_source_for_departure(week, departure) != Some(source) {
        return false;
    }
    if source == WorkoutSource::Fallback && departure.assigned_from_slot_id.is_none() {
        return false;
    }
    match departure.status {
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
                    && departure
                        .record_workout_reminder_scheduled_at_epoch_millis
                        .is_some()
            }),
        DepartureStatus::Available | DepartureStatus::Scheduled => {
            departure.departure_response.is_none()
                && departure
                    .record_workout_prompt_due_at_epoch_millis
                    .is_none()
                && departure
                    .record_workout_reminder_scheduled_at_epoch_millis
                    .is_none()
        }
        DepartureStatus::Moved
        | DepartureStatus::Skipped
        | DepartureStatus::NotNeeded
        | DepartureStatus::Missed => false,
    }
}

fn departure_supports_direct_workout_record(
    week: &ExerciseWeek,
    departure: &PlannedDeparture,
    source: WorkoutSource,
    record: &WorkoutRecord,
) -> bool {
    workout_source_for_departure(week, departure) == Some(source)
        && matches!(
            departure.status,
            DepartureStatus::Available
                | DepartureStatus::Scheduled
                | DepartureStatus::Missed
                | DepartureStatus::NotNeeded
        )
        && departure.departure_response.is_none()
        && departure
            .record_workout_prompt_due_at_epoch_millis
            .is_none()
        && departure
            .record_workout_reminder_scheduled_at_epoch_millis
            .is_none()
        && (departure.assigned_from_slot_id.is_some()
            || workout_source_for_departure(week, departure) != Some(WorkoutSource::Fallback))
        && record.recorded_at_epoch_millis >= departure.departure_at_epoch_millis
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
                && departure.departure_at_epoch_millis <= now
                && !departure_has_workout_record(week, departure)
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

fn departure_status_kind(
    week: &ExerciseWeek,
    departure: &PlannedDeparture,
    now: i64,
) -> DepartureStatusKind {
    match departure.status {
        _ if departure_has_workout_record(week, departure) => DepartureStatusKind::Completed,
        DepartureStatus::Leaving => DepartureStatusKind::Leaving,
        DepartureStatus::Moved => DepartureStatusKind::Moved,
        DepartureStatus::Skipped => DepartureStatusKind::Skipped,
        DepartureStatus::Scheduled if follow_up_is_due(departure, now) => {
            DepartureStatusKind::Unresolved
        }
        DepartureStatus::Scheduled
            if direct_recordable_departure(week, &departure.id, now).is_ok() =>
        {
            DepartureStatusKind::Unrecorded
        }
        DepartureStatus::Scheduled if departure.departure_at_epoch_millis <= now => {
            DepartureStatusKind::AwaitingResponse
        }
        DepartureStatus::Scheduled => DepartureStatusKind::Scheduled,
        DepartureStatus::NotNeeded => DepartureStatusKind::NotNeeded,
        DepartureStatus::Missed => DepartureStatusKind::Missed,
        DepartureStatus::Available
            if direct_recordable_departure(week, &departure.id, now).is_ok() =>
        {
            DepartureStatusKind::Unrecorded
        }
        DepartureStatus::Available => DepartureStatusKind::Available,
    }
}

fn departure_status(week: &ExerciseWeek, departure: &PlannedDeparture, now: i64) -> String {
    match departure_status_kind(week, departure, now) {
        DepartureStatusKind::Completed => "Completed".into(),
        DepartureStatusKind::Leaving => "Leaving for gym confirmed".into(),
        DepartureStatusKind::Moved | DepartureStatusKind::Skipped => {
            departure_decision_status(week, departure).expect("closed departure has a decision")
        }
        DepartureStatusKind::Unresolved => "Unresolved — no response".into(),
        DepartureStatusKind::Unrecorded => "Unrecorded — ready to record".into(),
        DepartureStatusKind::AwaitingResponse => "Awaiting response".into(),
        DepartureStatusKind::Scheduled => "Scheduled".into(),
        DepartureStatusKind::NotNeeded => "Weekly goal met — no workout needed".into(),
        DepartureStatusKind::Missed => "Missed — no response".into(),
        DepartureStatusKind::Available => "Available".into(),
    }
}

fn departure_has_workout_record(week: &ExerciseWeek, departure: &PlannedDeparture) -> bool {
    week.workout_records
        .iter()
        .any(|record| record.source_slot_id.as_deref() == Some(departure.id.as_str()))
}

fn follow_up_is_due(departure: &PlannedDeparture, now: i64) -> bool {
    departure.status == DepartureStatus::Scheduled
        && departure.departure_response.is_none()
        && departure.follow_up_scheduled_at_epoch_millis.is_some()
        && departure.departure_at_epoch_millis + FOLLOW_UP_DELAY_MILLIS <= now
}

fn fallback_availability_kind(
    week: &ExerciseWeek,
    departure: &PlannedDeparture,
    now: i64,
) -> FallbackAvailabilityKind {
    if departure_has_workout_record(week, departure) {
        FallbackAvailabilityKind::Recorded
    } else if direct_recordable_departure(week, &departure.id, now).is_ok() {
        FallbackAvailabilityKind::Unrecorded
    } else if departure.assigned_from_slot_id.is_some() {
        FallbackAvailabilityKind::Assigned
    } else if departure.status == DepartureStatus::NotNeeded {
        FallbackAvailabilityKind::NotNeeded
    } else if departure.status == DepartureStatus::Missed {
        FallbackAvailabilityKind::Missed
    } else if fallback_reserved_by_primary(week, departure) {
        FallbackAvailabilityKind::Reserved
    } else if fallback_is_available(week, departure, now) {
        FallbackAvailabilityKind::Available
    } else {
        FallbackAvailabilityKind::Unavailable
    }
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

fn friendly_recorded_at(clock: &impl ExerciseClock, epoch_millis: i64) -> String {
    let day_number = local_day_number(clock, epoch_millis);
    let date = date_from_day_number(day_number);
    let weekday = WEEKDAYS[(day_number + 3).rem_euclid(7) as usize];
    format!(
        "{weekday}, {} {} at {}",
        month_name(date.month),
        date.day,
        friendly_time(clock, epoch_millis)
    )
}

fn friendly_departure(departure: &PlannedDeparture) -> String {
    let date = parse_iso_date(&departure.date).expect("saved departure date is valid");
    format!(
        "{}, {} {} at {}",
        departure.day,
        month_name(date.month),
        date.day,
        friendly_schedule_time(&departure.departure_time)
    )
}

#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
struct CivilDate {
    year: i64,
    month: i64,
    day: i64,
}

impl CivilDate {
    fn iso_date(self) -> String {
        format!("{:04}-{:02}-{:02}", self.year, self.month, self.day)
    }

    fn day_number(self) -> i64 {
        let adjusted_year = self.year - i64::from(self.month <= 2);
        let era = if adjusted_year >= 0 {
            adjusted_year
        } else {
            adjusted_year - 399
        }
        .div_euclid(400);
        let year_of_era = adjusted_year - era * 400;
        let adjusted_month = self.month + if self.month > 2 { -3 } else { 9 };
        let day_of_year = (153 * adjusted_month + 2) / 5 + self.day - 1;
        let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
        era * 146_097 + day_of_era - 719_468
    }
}

fn parse_iso_date(value: &str) -> Option<CivilDate> {
    let mut parts = value.split('-');
    let date = CivilDate {
        year: parts.next()?.parse().ok()?,
        month: parts.next()?.parse().ok()?,
        day: parts.next()?.parse().ok()?,
    };
    (parts.next().is_none()
        && value == date.iso_date()
        && date_from_day_number(date.day_number()) == date)
        .then_some(date)
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
