use crate::habits::{
    HabitCellStatus, HabitCellView, HabitDetailView, HabitLocalCompletionState, HabitSnapshotState,
    LocalHabitGoal, LocalHabitGoalHistory, LocalHabitGoalRevision, LocalHabitLifecycleChange,
    LocalHabitLifecycleKind, LocalHabitRevisionDisposition,
};
use crate::today::{CalendarDate, HabitHistoryHabitContext};
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum HabitHistoryPrecision {
    Confirmed,
    AtLeast,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum HabitHistoryUnit {
    Days,
    Weeks,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitHistoryMetric {
    pub value: Option<u32>,
    pub precision: HabitHistoryPrecision,
    pub unit: HabitHistoryUnit,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitHistoryHighestByUnit {
    pub days: Option<HabitHistoryMetric>,
    pub weeks: Option<HabitHistoryMetric>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitHistoryStatistics {
    pub month: HabitHistoryMetric,
    pub all_time: HabitHistoryMetric,
    pub current_streak: HabitHistoryMetric,
    /// Highest streak in the unit of the currently applicable goal.
    pub highest_streak: HabitHistoryMetric,
    /// Historical maxima remain separate when the Habit changed frequency.
    pub highest_streak_by_unit: HabitHistoryHighestByUnit,
    pub coverage_from: String,
    pub coverage_to: String,
    pub coverage_is_complete: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum HabitHistoryGoalSource {
    Start,
    SourceSnapshot,
    LocalRevision,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitHistoryGoalSegment {
    pub effective_on: Option<String>,
    pub effective_through: Option<String>,
    pub goal: Option<LocalHabitGoal>,
    pub source: HabitHistoryGoalSource,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitHistoryStatisticsView {
    pub habit_key: String,
    pub stats: HabitHistoryStatistics,
    pub historical_goals: Vec<HabitHistoryGoalSegment>,
    pub range_from: String,
    pub range_to: String,
    pub current_lived_date: String,
    pub canonical_state: String,
    pub canonical_revision: Option<String>,
    pub projection_state: HabitSnapshotState,
    pub projection_revision: Option<String>,
    pub catalog_revision: Option<String>,
    pub definition_target_binding: Option<String>,
    pub coverage: &'static str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum CanonicalHistoryState {
    Ready,
    Missing,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct HabitHistoryFact {
    pub date: String,
    pub canonical_state: CanonicalHistoryState,
    pub local_state: HabitLocalCompletionState,
    pub completed_at: Option<String>,
    pub local_changed_at: Option<String>,
    pub projected: Option<HabitCellView>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Outcome {
    Success,
    Failure,
    Unknown,
    Inactive,
    Partial,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct Period {
    key: String,
    unit: HabitHistoryUnit,
    outcome: Outcome,
    streak_eligible: bool,
    breaks_before: bool,
    breaks_after: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct GoalEvent {
    effective_on: Option<String>,
    goal: Option<LocalHabitGoal>,
    source: HabitHistoryGoalSource,
    precedence: u8,
    changed_at: String,
}

fn metric(
    value: Option<u32>,
    precision: HabitHistoryPrecision,
    unit: HabitHistoryUnit,
) -> HabitHistoryMetric {
    HabitHistoryMetric {
        value: if precision == HabitHistoryPrecision::Unknown {
            None
        } else {
            value
        },
        precision,
        unit,
    }
}

fn parse_date(value: &str) -> Option<CalendarDate> {
    CalendarDate::parse(value)
}

fn shift_date(value: &str, amount: i64) -> String {
    parse_date(value)
        .map(|date| date.plus_days(amount).to_string())
        .unwrap_or_else(|| value.to_string())
}

fn monday_of(value: &str) -> String {
    parse_date(value)
        .map(|date| date.monday().to_string())
        .unwrap_or_else(|| value.to_string())
}

fn goal_on(
    context: &HabitHistoryHabitContext,
    date: &str,
    current_date: &str,
) -> Option<LocalHabitGoal> {
    let revision = context
        .goal_revisions
        .iter()
        .filter(|revision| {
            revision.disposition == LocalHabitRevisionDisposition::Scheduled
                && revision.effective_on.as_str() <= date
        })
        .max_by(|left, right| {
            left.effective_on
                .cmp(&right.effective_on)
                .then_with(|| left.changed_at.cmp(&right.changed_at))
        });
    if let Some(revision) = revision {
        return revision.goal.clone();
    }

    let week_of = monday_of(date);
    if let Some(source_goal) = context
        .source_goal_history
        .iter()
        .find(|entry| entry.week_of == week_of)
    {
        return Some(source_goal.goal.clone());
    }
    if context.created_locally {
        return context.base_goal.clone();
    }
    if week_of == monday_of(current_date) {
        return context.current_goal.clone();
    }
    None
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct LifecycleState {
    active: bool,
    transition: bool,
    breaks_before_streak: bool,
    breaks_after_streak: bool,
    source_history_before_first_restore: bool,
}

fn observation_at(cell: &HabitCellView, status: crate::habits::ObservationStatus) -> Option<&str> {
    cell.details.iter().find_map(|detail| match detail {
        HabitDetailView::Observation {
            status: observed_status,
            observed_at,
            ..
        } if *observed_status == status => Some(observed_at.as_str()),
        _ => None,
    })
}

fn lifecycle_at(
    context: &HabitHistoryHabitContext,
    date: &str,
    current_date: &str,
    fact: Option<&HabitHistoryFact>,
) -> LifecycleState {
    let mut changes = context.lifecycle_changes.iter().collect::<Vec<_>>();
    changes.sort_by(|left, right| {
        left.effective_on
            .cmp(&right.effective_on)
            .then_with(|| left.changed_at.cmp(&right.changed_at))
    });
    let same_day = changes
        .iter()
        .copied()
        .filter(|change| change.effective_on == date)
        .last();
    if let Some(change) = same_day {
        let projected_at = fact
            .and_then(|fact| fact.projected.as_ref())
            .and_then(|cell| {
                observation_at(cell, crate::habits::ObservationStatus::Completed).or_else(|| {
                    observation_at(cell, crate::habits::ObservationStatus::ThresholdMet)
                })
            });
        let completion_at = fact
            .and_then(|fact| fact.completed_at.as_deref())
            .or_else(|| fact.and_then(|fact| fact.local_changed_at.as_deref()))
            .or(projected_at);
        let completed_before_deactivation = change.kind == LocalHabitLifecycleKind::Deactivated
            && completion_at.is_some_and(|at| at < change.changed_at.as_str());
        let completed_after_restore = change.kind == LocalHabitLifecycleKind::Restored
            && completion_at.is_some_and(|at| at >= change.changed_at.as_str());
        return LifecycleState {
            active: completed_before_deactivation || completed_after_restore,
            transition: true,
            breaks_before_streak: completed_after_restore
                && change.kind == LocalHabitLifecycleKind::Restored,
            breaks_after_streak: completed_before_deactivation
                && change.kind == LocalHabitLifecycleKind::Deactivated,
            source_history_before_first_restore: false,
        };
    }

    if changes.is_empty() {
        return LifecycleState {
            active: date < current_date || context.source_active,
            transition: false,
            breaks_before_streak: false,
            breaks_after_streak: false,
            source_history_before_first_restore: false,
        };
    }

    let before_first_change = date < changes[0].effective_on.as_str();
    let first_is_restore = changes[0].kind == LocalHabitLifecycleKind::Restored;
    if before_first_change && first_is_restore {
        return LifecycleState {
            active: false,
            transition: false,
            breaks_before_streak: false,
            breaks_after_streak: false,
            source_history_before_first_restore: context.source_exists,
        };
    }

    let mut active = changes[0].kind == LocalHabitLifecycleKind::Deactivated;
    for change in changes
        .into_iter()
        .filter(|change| change.effective_on.as_str() < date)
    {
        active = change.kind.active();
    }
    LifecycleState {
        active,
        transition: false,
        breaks_before_streak: false,
        breaks_after_streak: false,
        source_history_before_first_restore: false,
    }
}

fn has_observation(cell: &HabitCellView, status: crate::habits::ObservationStatus) -> bool {
    cell.details.iter().any(|detail| {
        matches!(detail, HabitDetailView::Observation { status: observed, .. } if *observed == status)
    })
}

fn has_completion_evidence(fact: &HabitHistoryFact) -> bool {
    fact.local_state == HabitLocalCompletionState::Completed
        || fact
            .projected
            .as_ref()
            .is_some_and(|cell| cell.has_external_completion && cell.counts_as_completion)
}

fn outcome_for(
    context: &HabitHistoryHabitContext,
    fact: Option<&HabitHistoryFact>,
    date: &str,
    current_date: &str,
    projection_state: HabitSnapshotState,
    effective_start_date: Option<&str>,
) -> Outcome {
    if date > current_date || effective_start_date.is_some_and(|start| date < start) {
        return Outcome::Inactive;
    }
    let Some(goal) = goal_on(context, date, current_date) else {
        return Outcome::Unknown;
    };
    let Some(fact) = fact else {
        return Outcome::Unknown;
    };
    if fact
        .projected
        .as_ref()
        .is_some_and(|cell| cell.status == HabitCellStatus::Conflict)
    {
        return Outcome::Unknown;
    }

    let lifecycle = lifecycle_at(context, date, current_date, Some(fact));
    if lifecycle.source_history_before_first_restore {
        return if has_completion_evidence(fact)
            || (goal.kind_label() == "daily-time"
                && fact.projected.as_ref().is_some_and(|cell| {
                    has_observation(cell, crate::habits::ObservationStatus::ThresholdMet)
                }))
        {
            Outcome::Success
        } else {
            Outcome::Unknown
        };
    }
    if !lifecycle.active {
        return if lifecycle.transition {
            Outcome::Partial
        } else {
            Outcome::Inactive
        };
    }

    if goal.kind_label() == "daily-time" {
        if fact.local_state == HabitLocalCompletionState::Completed
            || fact.projected.as_ref().is_some_and(|cell| {
                has_observation(cell, crate::habits::ObservationStatus::ThresholdMet)
            })
        {
            return Outcome::Success;
        }
        if fact
            .projected
            .as_ref()
            .is_some_and(|cell| has_observation(cell, crate::habits::ObservationStatus::ActualTime))
        {
            return Outcome::Unknown;
        }
        if date == current_date || fact.canonical_state == CanonicalHistoryState::Error {
            return Outcome::Unknown;
        }
        if projection_state == HabitSnapshotState::Ready
            && fact.projected.as_ref().is_some_and(|cell| {
                cell.status == HabitCellStatus::NotDone
                    || has_observation(cell, crate::habits::ObservationStatus::NotDone)
            })
        {
            return Outcome::Failure;
        }
        if projection_state == HabitSnapshotState::Ready
            && fact.projected.as_ref().is_some_and(|cell| {
                cell.coverage == "complete" && cell.status != HabitCellStatus::Unavailable
            })
        {
            return Outcome::Failure;
        }
        return Outcome::Unknown;
    }

    if has_completion_evidence(fact) {
        return Outcome::Success;
    }
    if date == current_date || fact.canonical_state == CanonicalHistoryState::Error {
        return Outcome::Unknown;
    }
    if projection_state == HabitSnapshotState::Ready
        && fact.projected.as_ref().is_some_and(|cell| {
            cell.status == HabitCellStatus::NotDone
                || has_observation(cell, crate::habits::ObservationStatus::NotDone)
        })
    {
        return Outcome::Failure;
    }
    if fact.local_state == HabitLocalCompletionState::Withdrawn
        && fact.canonical_state == CanonicalHistoryState::Ready
        && !context.source_exists
    {
        return Outcome::Failure;
    }
    if projection_state == HabitSnapshotState::Ready
        && fact.projected.as_ref().is_some_and(|cell| {
            cell.coverage == "complete" && cell.status != HabitCellStatus::Unavailable
        })
    {
        return Outcome::Failure;
    }
    Outcome::Unknown
}

fn lifecycle_transition_in_week(changes: &[LocalHabitLifecycleChange], week_of: &str) -> bool {
    let week_end = shift_date(week_of, 6);
    changes
        .iter()
        .any(|change| change.effective_on.as_str() >= week_of && change.effective_on <= week_end)
}

fn lifecycle_boundaries_in_week(
    context: &HabitHistoryHabitContext,
    week_of: &str,
    weekly_days: &[String],
    outcomes: &BTreeMap<String, Outcome>,
    facts: &BTreeMap<String, HabitHistoryFact>,
    current_date: &str,
) -> (bool, bool) {
    let week_end = shift_date(week_of, 6);
    let successful_days = weekly_days
        .iter()
        .filter(|date| outcomes.get(*date) == Some(&Outcome::Success))
        .collect::<Vec<_>>();
    let mut breaks_before = false;
    let mut breaks_after = false;
    for change in context.lifecycle_changes.iter().filter(|change| {
        change.effective_on.as_str() >= week_of && change.effective_on.as_str() <= week_end.as_str()
    }) {
        for date in &successful_days {
            match date.as_str().cmp(change.effective_on.as_str()) {
                std::cmp::Ordering::Less => breaks_after = true,
                std::cmp::Ordering::Greater => {
                    if change.kind == LocalHabitLifecycleKind::Restored {
                        breaks_before = true;
                    }
                }
                std::cmp::Ordering::Equal => {
                    let boundary = lifecycle_at(context, date, current_date, facts.get(*date));
                    breaks_before |= boundary.breaks_before_streak;
                    breaks_after |= boundary.breaks_after_streak;
                }
            }
        }
    }
    (breaks_before, breaks_after)
}

fn week_start_partial(
    week_of: &str,
    effective_start_date: Option<&str>,
    first_weekly_goal_date: Option<&str>,
) -> bool {
    let week_end = shift_date(week_of, 6);
    effective_start_date.is_some_and(|start| start > week_of && start <= week_end.as_str())
        || first_weekly_goal_date.is_some_and(|date| date > week_of)
}

fn consecutive(left: &Period, right: &Period) -> bool {
    if left.unit != right.unit {
        return false;
    }
    match left.unit {
        HabitHistoryUnit::Days => shift_date(&right.key, -1) == left.key,
        HabitHistoryUnit::Weeks => shift_date(&right.key, -7) == left.key,
    }
}

fn build_periods(
    context: &HabitHistoryHabitContext,
    facts: &BTreeMap<String, HabitHistoryFact>,
    range_from: &str,
    range_to: &str,
    current_date: &str,
    projection_state: HabitSnapshotState,
    effective_start_date: Option<&str>,
    evidence_before_start: bool,
) -> (Vec<Period>, BTreeMap<String, Outcome>, HabitHistoryUnit) {
    let mut outcomes = BTreeMap::new();
    let mut date = range_from.to_string();
    while date.as_str() <= range_to && date.as_str() <= current_date {
        outcomes.insert(
            date.clone(),
            outcome_for(
                context,
                facts.get(&date),
                &date,
                current_date,
                projection_state,
                effective_start_date,
            ),
        );
        date = shift_date(&date, 1);
    }

    let mut daily_periods = Vec::new();
    let mut weeks = BTreeSet::new();
    for (date, outcome) in &outcomes {
        match goal_on(context, date, current_date) {
            Some(LocalHabitGoal::WeeklyCount { .. }) => {
                weeks.insert(monday_of(date));
            }
            _ => daily_periods.push(Period {
                key: date.clone(),
                unit: HabitHistoryUnit::Days,
                outcome: *outcome,
                streak_eligible: true,
                breaks_before: lifecycle_at(context, date, current_date, facts.get(date))
                    .breaks_before_streak,
                breaks_after: lifecycle_at(context, date, current_date, facts.get(date))
                    .breaks_after_streak,
            }),
        }
    }

    for week_of in weeks {
        let week_end = shift_date(&week_of, 6);
        let all_week_days = (0..7)
            .map(|offset| shift_date(&week_of, offset))
            .filter(|date| outcomes.contains_key(date))
            .collect::<Vec<_>>();
        let weekly_days = all_week_days
            .iter()
            .filter(|date| {
                matches!(
                    goal_on(context, date, current_date),
                    Some(LocalHabitGoal::WeeklyCount { .. })
                )
            })
            .cloned()
            .collect::<Vec<_>>();
        let first_weekly_goal_date = weekly_days.first().map(String::as_str);
        let period_goal = weekly_days
            .first()
            .and_then(|date| goal_on(context, date, current_date));
        let Some(LocalHabitGoal::WeeklyCount { days: target }) = period_goal else {
            continue;
        };
        let goals_consistent = weekly_days.iter().all(|date| {
            goal_on(context, date, current_date)
                == Some(LocalHabitGoal::WeeklyCount { days: target })
        });
        let success_count = weekly_days
            .iter()
            .filter(|date| outcomes.get(*date) == Some(&Outcome::Success))
            .count();
        let transition = lifecycle_transition_in_week(&context.lifecycle_changes, &week_of);
        let partial_start = if evidence_before_start {
            first_weekly_goal_date.is_some_and(|date| date > week_of.as_str())
        } else {
            week_start_partial(&week_of, effective_start_date, first_weekly_goal_date)
        };
        let (breaks_before, breaks_after) = lifecycle_boundaries_in_week(
            context,
            &week_of,
            &weekly_days,
            &outcomes,
            facts,
            current_date,
        );
        let week_is_open = week_end.as_str() >= current_date;
        let outcome = if !goals_consistent {
            Outcome::Unknown
        } else if success_count >= usize::from(target) {
            // Attainment counts distinct successful lived dates, while lifecycle
            // and partial-start boundaries independently prevent streak carry.
            Outcome::Success
        } else if week_is_open {
            Outcome::Unknown
        } else if transition || partial_start {
            Outcome::Partial
        } else if weekly_days
            .iter()
            .all(|date| outcomes.get(date) == Some(&Outcome::Inactive))
        {
            Outcome::Inactive
        } else if weekly_days.iter().any(|date| {
            matches!(
                outcomes.get(date),
                Some(Outcome::Unknown | Outcome::Partial)
            )
        }) {
            Outcome::Unknown
        } else {
            Outcome::Failure
        };
        daily_periods.push(Period {
            key: week_of,
            unit: HabitHistoryUnit::Weeks,
            outcome,
            streak_eligible: !partial_start,
            breaks_before,
            breaks_after,
        });
    }
    daily_periods.sort_by(|left, right| {
        left.key
            .cmp(&right.key)
            .then_with(|| left.unit.cmp(&right.unit))
    });

    let current_goal = goal_on(context, current_date, current_date);
    let current_unit = if matches!(current_goal, Some(LocalHabitGoal::WeeklyCount { .. })) {
        HabitHistoryUnit::Weeks
    } else {
        HabitHistoryUnit::Days
    };
    (daily_periods, outcomes, current_unit)
}

fn run_length(periods: &[Period], start: isize) -> u32 {
    if start < 0 {
        return 0;
    }
    let first = &periods[start as usize];
    if first.outcome != Outcome::Success || !first.streak_eligible {
        return 0;
    }
    let mut count = 1;
    let mut index = start - 1;
    let mut right = first;
    while index >= 0 {
        let period = &periods[index as usize];
        if period.outcome != Outcome::Success
            || !period.streak_eligible
            || !consecutive(period, right)
            || period.breaks_after
            || right.breaks_before
        {
            break;
        }
        count += 1;
        right = period;
        index -= 1;
    }
    count
}

fn has_positive_evidence_before_start(
    context: &HabitHistoryHabitContext,
    facts: &BTreeMap<String, HabitHistoryFact>,
) -> bool {
    let Some(start_date) = context.start_date.as_deref() else {
        return false;
    };
    facts.values().any(|fact| {
        fact.date.as_str() < start_date
            && (has_completion_evidence(fact)
                || fact.projected.as_ref().is_some_and(|cell| {
                    has_observation(cell, crate::habits::ObservationStatus::ThresholdMet)
                }))
    })
}

fn goal_events(context: &HabitHistoryHabitContext, current_date: &str) -> Vec<GoalEvent> {
    let mut events = Vec::new();
    if context.created_locally {
        events.push(GoalEvent {
            effective_on: context.start_date.clone(),
            goal: context.base_goal.clone(),
            source: HabitHistoryGoalSource::Start,
            precedence: 0,
            changed_at: String::new(),
        });
    }
    events.extend(
        context
            .source_goal_history
            .iter()
            .map(|history: &LocalHabitGoalHistory| GoalEvent {
                effective_on: Some(history.week_of.clone()),
                goal: Some(history.goal.clone()),
                source: HabitHistoryGoalSource::SourceSnapshot,
                precedence: 1,
                changed_at: String::new(),
            }),
    );
    events.extend(
        context
            .goal_revisions
            .iter()
            .filter(|revision: &&LocalHabitGoalRevision| {
                revision.disposition == LocalHabitRevisionDisposition::Scheduled
                    && revision.effective_on.as_str() <= current_date
            })
            .map(|revision| GoalEvent {
                effective_on: Some(revision.effective_on.clone()),
                goal: revision.goal.clone(),
                source: HabitHistoryGoalSource::LocalRevision,
                precedence: 2,
                changed_at: revision.changed_at.clone(),
            }),
    );
    events.sort_by(|left, right| {
        left.effective_on
            .cmp(&right.effective_on)
            .then_with(|| left.precedence.cmp(&right.precedence))
            .then_with(|| left.changed_at.cmp(&right.changed_at))
    });
    let mut by_date = BTreeMap::<Option<String>, GoalEvent>::new();
    for event in events {
        let key = event.effective_on.clone();
        by_date
            .entry(key)
            .and_modify(|existing| {
                if (event.precedence, &event.changed_at)
                    >= (existing.precedence, &existing.changed_at)
                {
                    *existing = event.clone();
                }
            })
            .or_insert(event);
    }
    let mut collapsed = Vec::<GoalEvent>::new();
    for event in by_date.into_values() {
        if collapsed
            .last()
            .is_some_and(|previous| previous.goal == event.goal)
        {
            continue;
        }
        collapsed.push(event);
    }
    collapsed
}

pub(crate) fn historical_goal_segments(
    context: &HabitHistoryHabitContext,
    current_date: &str,
) -> Vec<HabitHistoryGoalSegment> {
    let events = goal_events(context, current_date);
    events
        .iter()
        .enumerate()
        .map(|(index, event)| HabitHistoryGoalSegment {
            effective_on: event.effective_on.clone(),
            effective_through: events
                .get(index + 1)
                .and_then(|next| next.effective_on.as_deref())
                .map(|next| shift_date(next, -1)),
            goal: event.goal.clone(),
            source: event.source,
        })
        .collect()
}

pub(crate) fn derive_habit_history_statistics(
    context: &HabitHistoryHabitContext,
    input_facts: &[HabitHistoryFact],
    range_from: &str,
    range_to: &str,
    current_date: &str,
    projection_state: HabitSnapshotState,
) -> HabitHistoryStatistics {
    let facts = input_facts
        .iter()
        .cloned()
        .map(|fact| (fact.date.clone(), fact))
        .collect::<BTreeMap<_, _>>();
    let evidence_before_start = has_positive_evidence_before_start(context, &facts);
    let effective_start = (!evidence_before_start)
        .then_some(context.start_date.as_deref())
        .flatten();
    let (periods, outcomes, current_unit) = build_periods(
        context,
        &facts,
        range_from,
        range_to,
        current_date,
        projection_state,
        effective_start,
        evidence_before_start,
    );

    let month_from = format!("{}-01", &current_date[..7]);
    let month_dates = outcomes
        .keys()
        .filter(|date| date.as_str() >= month_from.as_str() && date.as_str() <= current_date)
        .collect::<Vec<_>>();
    let month_value = month_dates
        .iter()
        .filter(|date| outcomes.get(**date) == Some(&Outcome::Success))
        .count() as u32;
    let month_start = effective_start
        .filter(|start| *start > month_from.as_str())
        .unwrap_or(month_from.as_str());
    let month_complete = range_from <= month_start;
    let month_known = month_dates.iter().all(|date| {
        !matches!(
            outcomes.get(*date),
            Some(Outcome::Unknown | Outcome::Partial)
        )
    }) && (!context.source_exists
        || projection_state == HabitSnapshotState::Ready)
        && month_complete;
    let month_has_evidence = month_value > 0
        || month_dates
            .iter()
            .any(|date| outcomes.get(*date) == Some(&Outcome::Failure));
    let month = metric(
        Some(month_value),
        if month_known {
            HabitHistoryPrecision::Confirmed
        } else if month_has_evidence {
            HabitHistoryPrecision::AtLeast
        } else {
            HabitHistoryPrecision::Unknown
        },
        HabitHistoryUnit::Days,
    );

    // The count is by unique lived dates; weekly target periods never collapse
    // multiple checked dates into a single all-time result.
    let all_time_value = outcomes
        .values()
        .filter(|outcome| **outcome == Outcome::Success)
        .count() as u32;
    let complete_lifetime_start = context.start_date.is_some()
        && !evidence_before_start
        && context
            .start_date
            .as_deref()
            .is_some_and(|start| range_from <= start);
    let all_time_known = complete_lifetime_start
        && range_to >= current_date
        && outcomes
            .values()
            .all(|outcome| !matches!(outcome, Outcome::Unknown | Outcome::Partial))
        && (!context.source_exists || projection_state == HabitSnapshotState::Ready);
    let all_time_has_evidence = all_time_value > 0
        || outcomes
            .values()
            .any(|outcome| *outcome == Outcome::Failure);
    let all_time = metric(
        Some(all_time_value),
        if all_time_known {
            HabitHistoryPrecision::Confirmed
        } else if all_time_has_evidence {
            HabitHistoryPrecision::AtLeast
        } else {
            HabitHistoryPrecision::Unknown
        },
        HabitHistoryUnit::Days,
    );

    let current_period_key = if current_unit == HabitHistoryUnit::Weeks {
        monday_of(current_date)
    } else {
        current_date.to_string()
    };
    let current_index = periods
        .iter()
        .position(|period| period.key == current_period_key && period.unit == current_unit);
    let mut current_value = None;
    let mut current_precision = HabitHistoryPrecision::Unknown;
    if let Some(current_index) = current_index {
        let current = &periods[current_index];
        match current.outcome {
            Outcome::Success if current.streak_eligible => {
                let run = run_length(&periods, current_index as isize);
                current_value = (run > 0).then_some(run);
                current_precision = if run > 0 {
                    if all_time_known {
                        HabitHistoryPrecision::Confirmed
                    } else {
                        HabitHistoryPrecision::AtLeast
                    }
                } else {
                    HabitHistoryPrecision::Unknown
                };
            }
            Outcome::Unknown if current.key == current_period_key => {
                let run = run_length(&periods, current_index as isize - 1);
                current_value = (run > 0).then_some(run);
                current_precision = if run > 0 {
                    HabitHistoryPrecision::AtLeast
                } else {
                    HabitHistoryPrecision::Unknown
                };
            }
            Outcome::Failure | Outcome::Inactive => {
                current_value = Some(0);
                current_precision = HabitHistoryPrecision::Confirmed;
            }
            Outcome::Success | Outcome::Partial | Outcome::Unknown => {}
        }
    }
    let current_streak = metric(current_value, current_precision, current_unit);

    let highest_for_unit = |unit: HabitHistoryUnit| -> Option<HabitHistoryMetric> {
        let has_period = periods.iter().any(|period| period.unit == unit);
        if !has_period {
            return None;
        }
        let mut highest = 0;
        let mut run = 0;
        let mut previous: Option<&Period> = None;
        for period in periods.iter().filter(|period| period.unit == unit) {
            let is_contiguous = previous.is_some_and(|prior| consecutive(prior, period));
            if period.outcome == Outcome::Success && period.streak_eligible {
                let continues = is_contiguous
                    && previous.is_some_and(|prior| !prior.breaks_after)
                    && !period.breaks_before;
                run = if continues { run + 1 } else { 1 };
                highest = highest.max(run);
            } else {
                run = 0;
            }
            previous = Some(period);
        }
        let known = all_time_known
            && periods
                .iter()
                .filter(|period| period.unit == unit)
                .all(|period| !matches!(period.outcome, Outcome::Unknown | Outcome::Partial));
        let has_success = highest > 0;
        Some(metric(
            if has_success {
                Some(highest)
            } else if known {
                Some(0)
            } else {
                None
            },
            if known {
                HabitHistoryPrecision::Confirmed
            } else if has_success {
                HabitHistoryPrecision::AtLeast
            } else {
                HabitHistoryPrecision::Unknown
            },
            unit,
        ))
    };
    let highest_streak_by_unit = HabitHistoryHighestByUnit {
        days: highest_for_unit(HabitHistoryUnit::Days),
        weeks: highest_for_unit(HabitHistoryUnit::Weeks),
    };
    let highest_streak = match current_unit {
        HabitHistoryUnit::Days => highest_streak_by_unit.days.clone(),
        HabitHistoryUnit::Weeks => highest_streak_by_unit.weeks.clone(),
    }
    .unwrap_or_else(|| metric(None, HabitHistoryPrecision::Unknown, current_unit));

    HabitHistoryStatistics {
        month,
        all_time,
        current_streak,
        highest_streak,
        highest_streak_by_unit,
        coverage_from: range_from.into(),
        coverage_to: range_to.into(),
        coverage_is_complete: all_time_known,
    }
}
