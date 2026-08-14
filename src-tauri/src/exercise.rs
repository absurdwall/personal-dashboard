use crate::notification::{NotificationIntent, NotificationPermission, NotificationPlatform};
use serde::{Deserialize, Serialize};

const EXERCISE_SCHEMA_VERSION: u32 = 1;
const WEEKLY_GOAL: u32 = 3;
const DEPARTURE_HOUR: i64 = 16;
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
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(deny_unknown_fields)]
struct PlannedDeparture {
    id: String,
    day: String,
    date: String,
    departure_at_epoch_millis: i64,
    status: DepartureStatus,
    reminder_scheduled_at_epoch_millis: Option<i64>,
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
enum DepartureStatus {
    Scheduled,
    Available,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PrimaryDepartureView {
    pub id: String,
    pub day: String,
    pub time: String,
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
        let mut state = self.current_state()?;
        let week_start_day = local_day_number(&self.clock, now) - local_weekday(&self.clock, now);
        let week_key = date_from_day_number(week_start_day).iso_date();
        let mut changed = false;

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
        let next_index = next_primary_departure_index(week, &self.clock, now);
        let visible_reminder_intent =
            next_index.map(|index| reminder_intent(&week.primary_departures[index]));
        let mut reminder_message = "No primary departure reminder remains this week.".to_string();

        if let Some(index) = next_index {
            let departure = &mut week.primary_departures[index];
            reminder_message = if departure.reminder_scheduled_at_epoch_millis.is_some() {
                "Next departure reminder is scheduled.".into()
            } else {
                match self.notifications.permission() {
                    Ok(NotificationPermission::Granted) => {
                        let intent = reminder_intent(departure);
                        self.notifications.schedule(intent)?;
                        departure.reminder_scheduled_at_epoch_millis = Some(now);
                        changed = true;
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
            next_primary_departure_index(week, &self.clock, now),
            visible_reminder_intent,
            reminder_message,
        ))
    }

    fn current_state(&self) -> Result<ExerciseState, String> {
        match self.persistence.load()? {
            Some(document) => parse_state(&document),
            None => Ok(ExerciseState::new()),
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
        }
    }

    fn validate(self) -> Result<Self, String> {
        if self.schema_version != EXERCISE_SCHEMA_VERSION {
            return Err(format!(
                "Unsupported exercise schema version: {}",
                self.schema_version
            ));
        }
        if self.routine != ExerciseState::new().routine {
            return Err("The saved exercise routine is not supported yet.".into());
        }
        Ok(self)
    }
}

fn parse_state(document: &[u8]) -> Result<ExerciseState, String> {
    serde_json::from_slice::<ExerciseState>(document)
        .map_err(|_| "The local exercise state is not valid.".to_string())?
        .validate()
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
        })
        .collect()
}

fn next_primary_departure_index<C: ExerciseClock>(
    week: &ExerciseWeek,
    clock: &C,
    now: i64,
) -> Option<usize> {
    let today = local_day_number(clock, now);
    week.primary_departures
        .iter()
        .enumerate()
        .filter(|(_, departure)| departure.status == DepartureStatus::Scheduled)
        .filter(|(_, departure)| {
            departure.departure_at_epoch_millis >= now
                || local_day_number(clock, departure.departure_at_epoch_millis) == today
        })
        .min_by_key(|(_, departure)| departure.departure_at_epoch_millis)
        .map(|(index, _)| index)
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

fn dashboard_view(
    state: &ExerciseState,
    week: &ExerciseWeek,
    next_index: Option<usize>,
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
        next_departure: next_index.map(|index| friendly_departure(&week.primary_departures[index])),
        primary_departures: week
            .primary_departures
            .iter()
            .map(|departure| PrimaryDepartureView {
                id: departure.id.clone(),
                day: departure.day.clone(),
                time: "4:00 PM".into(),
            })
            .collect(),
        fallback_departures: week
            .fallback_departures
            .iter()
            .map(|departure| FallbackDepartureView {
                id: departure.id.clone(),
                day: departure.day.clone(),
                time: "4:00 PM".into(),
                availability: "Available".into(),
            })
            .collect(),
        fallback_available_count: week.fallback_departures.len(),
        reminder_intent,
        reminder_message,
    }
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
