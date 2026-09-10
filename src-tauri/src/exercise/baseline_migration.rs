use super::*;
use serde::Deserialize;
use std::collections::{BTreeMap, HashSet};

pub(crate) const COMPLETED_BASELINE_SCHEMA_VERSION: u32 = 5;

pub(crate) struct CompletedBaselineExercise {
    source_schema_version: u32,
    state: ExerciseState,
}

pub(crate) enum CompletedBaselineError {
    Invalid,
    Unsupported,
}

impl CompletedBaselineExercise {
    pub(crate) fn parse<C: ExerciseClock>(
        document: &[u8],
        _clock: &C,
    ) -> Result<Self, CompletedBaselineError> {
        let baseline = serde_json::from_slice::<BaselineDocument>(document)
            .map_err(|_| CompletedBaselineError::Invalid)?;
        if baseline.schema_version != COMPLETED_BASELINE_SCHEMA_VERSION {
            return Err(CompletedBaselineError::Unsupported);
        }
        validate_departure_decision(baseline.departure_decision.as_ref())?;

        let mut next_unscheduled_sequence = 1_u64;
        let mut weeks = Vec::with_capacity(baseline.weeks.len());
        for (week_key, week) in baseline.weeks {
            if week.week_start != week_key {
                return Err(CompletedBaselineError::Invalid);
            }
            let primary_departures =
                migrate_departures(&week.primary_slots, BaselineDepartureKind::Primary)?;
            let fallback_departures =
                migrate_departures(&week.fallback_slots, BaselineDepartureKind::Fallback)?;
            let mut baseline_record_ids = HashSet::new();
            let mut workout_records = Vec::with_capacity(week.workout_records.len());
            for record in week.workout_records {
                if record.id.is_empty()
                    || !baseline_record_ids.insert(record.id)
                    || record.qualifies != record.duration.qualifies()
                {
                    return Err(CompletedBaselineError::Invalid);
                }
                let id = if record.source == WorkoutSource::Unscheduled {
                    let id = format!("{week_key}-unscheduled-{next_unscheduled_sequence}");
                    next_unscheduled_sequence += 1;
                    id
                } else {
                    let source_slot_id = record
                        .source_slot_id
                        .as_deref()
                        .ok_or(CompletedBaselineError::Invalid)?;
                    format!("{source_slot_id}-workout")
                };
                let recorded_at = parse_baseline_timestamp(&record.recorded_at)?;
                workout_records.push(WorkoutRecord {
                    id,
                    source: Some(record.source),
                    source_slot_id: record.source_slot_id,
                    recorded_at_epoch_millis: recorded_at.epoch,
                    recorded_at_utc_offset_minutes: Some(recorded_at.offset_minutes),
                    activity: record.activity,
                    duration: record.duration,
                    effort: record.effort,
                });
            }
            weeks.push(ExerciseWeek {
                week_start: week.week_start,
                week_end: week.week_end,
                completed_count: week.completed_count,
                primary_departures,
                adjusted_departures: Vec::new(),
                fallback_departures,
                workout_records,
            });
        }

        let state = ExerciseState {
            schema_version: EXERCISE_SCHEMA_VERSION,
            routine: baseline.routine,
            weeks,
            pending_reminder_reconciliation: None,
            workout_draft: baseline
                .workout_draft
                .map(migrate_workout_draft)
                .transpose()?,
            departure_decision: baseline
                .departure_decision
                .map(|decision| DepartureDecision {
                    slot_id: decision.slot_id,
                    outcome: decision.outcome,
                }),
            next_unscheduled_sequence,
            next_adjusted_sequence: 1,
        }
        .validate()
        .map_err(|_| CompletedBaselineError::Invalid)?;
        state
            .validate_timestamps()
            .map_err(|_| CompletedBaselineError::Invalid)?;
        Ok(Self {
            source_schema_version: baseline.schema_version,
            state,
        })
    }

    pub(crate) fn source_schema_version(&self) -> u32 {
        self.source_schema_version
    }

    pub(crate) fn document(&self) -> Result<Vec<u8>, String> {
        serde_json::to_vec_pretty(&self.state)
            .map_err(|error| format!("Could not encode migrated exercise state: {error}"))
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct BaselineDocument {
    schema_version: u32,
    routine: Routine,
    weeks: BTreeMap<String, BaselineWeek>,
    workout_draft: Option<BaselineWorkoutDraft>,
    departure_decision: Option<BaselineDepartureDecision>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct BaselineWeek {
    week_start: String,
    week_end: String,
    completed_count: u32,
    primary_slots: Vec<BaselineDeparture>,
    fallback_slots: Vec<BaselineDeparture>,
    workout_records: Vec<BaselineWorkoutRecord>,
}

#[derive(Clone, Copy, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
enum BaselineDepartureKind {
    Primary,
    Fallback,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct BaselineDeparture {
    id: String,
    kind: BaselineDepartureKind,
    order: u32,
    weekday: i64,
    day: String,
    departure_at: String,
    status: DepartureStatus,
    reminder_sent_at: Option<String>,
    follow_up_sent_at: Option<String>,
    departure_response: Option<BaselineDepartureResponse>,
    record_workout_prompt_due_at: Option<String>,
    record_workout_prompt_sent_at: Option<String>,
    assigned_from_slot_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct BaselineDepartureResponse {
    outcome: DepartureOutcome,
    recorded_at: String,
    reason: Option<DepartureReason>,
    fallback_slot_id: Option<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct BaselineWorkoutRecord {
    id: String,
    source: WorkoutSource,
    source_slot_id: Option<String>,
    recorded_at: String,
    activity: WorkoutActivity,
    duration: WorkoutDuration,
    effort: PerceivedEffort,
    qualifies: bool,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct BaselineWorkoutDraft {
    source: WorkoutSource,
    slot_id: Option<String>,
    activity: Option<WorkoutActivity>,
    duration: Option<WorkoutDuration>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct BaselineDepartureDecision {
    slot_id: String,
    outcome: DepartureOutcome,
}

fn migrate_departures(
    departures: &[BaselineDeparture],
    expected_kind: BaselineDepartureKind,
) -> Result<Vec<PlannedDeparture>, CompletedBaselineError> {
    departures
        .iter()
        .enumerate()
        .map(|(index, departure)| {
            if departure.kind != expected_kind || departure.order != (index + 1) as u32 {
                return Err(CompletedBaselineError::Invalid);
            }
            let timing = parse_baseline_timestamp(&departure.departure_at)?;
            if departure.weekday != weekday_for_date(&timing.date)? {
                return Err(CompletedBaselineError::Invalid);
            }
            departure
                .reminder_sent_at
                .as_deref()
                .map(parse_baseline_timestamp)
                .transpose()?;
            departure
                .follow_up_sent_at
                .as_deref()
                .map(parse_baseline_timestamp)
                .transpose()?;
            Ok(PlannedDeparture {
                id: departure.id.clone(),
                day: departure.day.clone(),
                date: timing.date,
                departure_time: timing.time,
                departure_at_epoch_millis: timing.epoch,
                departure_utc_offset_minutes: Some(timing.offset_minutes),
                status: departure.status,
                reminder_scheduled_at_epoch_millis: optional_epoch(
                    departure.reminder_sent_at.as_deref(),
                )?,
                follow_up_scheduled_at_epoch_millis: optional_epoch(
                    departure.follow_up_sent_at.as_deref(),
                )?,
                departure_response: departure
                    .departure_response
                    .as_ref()
                    .map(migrate_departure_response)
                    .transpose()?,
                record_workout_prompt_due_at_epoch_millis: optional_epoch(
                    departure.record_workout_prompt_due_at.as_deref(),
                )?,
                record_workout_reminder_scheduled_at_epoch_millis: optional_epoch(
                    departure.record_workout_prompt_sent_at.as_deref(),
                )?,
                assigned_from_slot_id: departure.assigned_from_slot_id.clone(),
            })
        })
        .collect()
}

fn migrate_departure_response(
    response: &BaselineDepartureResponse,
) -> Result<DepartureResponse, CompletedBaselineError> {
    let recorded_at = parse_baseline_timestamp(&response.recorded_at)?;
    Ok(DepartureResponse {
        outcome: response.outcome,
        recorded_at_epoch_millis: recorded_at.epoch,
        recorded_at_utc_offset_minutes: Some(recorded_at.offset_minutes),
        reason: response.reason,
        fallback_slot_id: response.fallback_slot_id.clone(),
        adjusted_slot_id: None,
    })
}

fn migrate_workout_draft(
    draft: BaselineWorkoutDraft,
) -> Result<WorkoutDraft, CompletedBaselineError> {
    Ok(WorkoutDraft {
        slot_id: if draft.source == WorkoutSource::Unscheduled {
            UNSCHEDULED_WORKOUT_SLOT_ID.into()
        } else {
            draft.slot_id.ok_or(CompletedBaselineError::Invalid)?
        },
        source: Some(draft.source),
        activity: draft.activity,
        duration: draft.duration,
    })
}

fn validate_departure_decision(
    decision: Option<&BaselineDepartureDecision>,
) -> Result<(), CompletedBaselineError> {
    if decision.is_some_and(|decision| {
        decision.slot_id.is_empty() || decision.outcome == DepartureOutcome::LeavingForGym
    }) {
        return Err(CompletedBaselineError::Invalid);
    }
    Ok(())
}

fn optional_epoch(value: Option<&str>) -> Result<Option<i64>, CompletedBaselineError> {
    value
        .map(parse_baseline_timestamp)
        .transpose()
        .map(|timestamp| timestamp.map(|timestamp| timestamp.epoch))
}

struct BaselineTimestamp {
    epoch: i64,
    date: String,
    time: String,
    offset_minutes: i32,
}

fn parse_baseline_timestamp(value: &str) -> Result<BaselineTimestamp, CompletedBaselineError> {
    let (local, offset) = value
        .char_indices()
        .skip(10)
        .find(|(_, character)| matches!(character, '+' | '-'))
        .map(|(index, _)| value.split_at(index))
        .ok_or(CompletedBaselineError::Invalid)?;
    let (date, time) = local
        .split_once('T')
        .ok_or(CompletedBaselineError::Invalid)?;
    let date_value = parse_iso_date(date).ok_or(CompletedBaselineError::Invalid)?;
    let mut time_parts = time.split(':');
    let hour = parse_part(time_parts.next())?;
    let minute = parse_part(time_parts.next())?;
    let seconds = time_parts.next().ok_or(CompletedBaselineError::Invalid)?;
    if time_parts.next().is_some() || hour > 23 || minute > 59 {
        return Err(CompletedBaselineError::Invalid);
    }
    let (second, fraction) = seconds.split_once('.').unwrap_or((seconds, ""));
    let second = second
        .parse::<i64>()
        .map_err(|_| CompletedBaselineError::Invalid)?;
    if second > 59
        || (!fraction.is_empty() && !fraction.chars().all(|digit| digit.is_ascii_digit()))
    {
        return Err(CompletedBaselineError::Invalid);
    }
    let millis = fraction
        .chars()
        .take(3)
        .chain(std::iter::repeat('0'))
        .take(3)
        .collect::<String>()
        .parse::<i64>()
        .map_err(|_| CompletedBaselineError::Invalid)?;
    let sign = if offset.starts_with('-') { -1 } else { 1 };
    let mut offset_parts = offset[1..].split(':');
    let offset_hour = parse_part(offset_parts.next())?;
    let offset_minute = parse_part(offset_parts.next())?;
    if offset_parts.next().is_some() || offset_hour > 23 || offset_minute > 59 {
        return Err(CompletedBaselineError::Invalid);
    }
    let local_seconds = date_value.day_number() * 86_400 + hour * 3_600 + minute * 60 + second;
    let offset_seconds = sign * (offset_hour * 3_600 + offset_minute * 60);
    Ok(BaselineTimestamp {
        epoch: (local_seconds - offset_seconds) * 1_000 + millis,
        date: date.to_string(),
        time: format!("{hour:02}:{minute:02}"),
        offset_minutes: (offset_seconds / 60) as i32,
    })
}

fn parse_part(part: Option<&str>) -> Result<i64, CompletedBaselineError> {
    part.ok_or(CompletedBaselineError::Invalid)?
        .parse::<i64>()
        .map_err(|_| CompletedBaselineError::Invalid)
}

fn weekday_for_date(date: &str) -> Result<i64, CompletedBaselineError> {
    let date = parse_iso_date(date).ok_or(CompletedBaselineError::Invalid)?;
    Ok((date.day_number() + 3).rem_euclid(7))
}
