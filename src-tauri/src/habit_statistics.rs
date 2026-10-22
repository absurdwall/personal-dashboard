use crate::habits::{HabitGoalTarget, HabitLocalCompletionState, HabitSnapshotState, HabitView};
use crate::today::CalendarDate;
use serde::Serialize;
use std::collections::BTreeSet;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum HabitDetailStreakUnit {
    Days,
    Weeks,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct HabitDetailStatistics {
    pub month_attained_days: Option<usize>,
    pub month_exact: bool,
    pub cumulative_attained_days: Option<usize>,
    pub cumulative_exact: bool,
    pub current_streak: Option<usize>,
    pub highest_confirmed_streak: Option<usize>,
    pub highest_history_exact: bool,
    pub streak_unit: HabitDetailStreakUnit,
    pub coverage_from: Option<String>,
    pub coverage_to: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum PeriodResult {
    Achieved,
    Missed,
    Unknown,
    Inactive,
    Partial,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Streaks {
    current: Option<usize>,
    highest: Option<usize>,
    exact: bool,
}

pub(crate) fn calculate(
    habit: &HabitView,
    local_completions: &[(String, HabitLocalCompletionState)],
    today: &str,
    canonical_state: &str,
    snapshot_generated_at: Option<&str>,
    snapshot_state: HabitSnapshotState,
) -> HabitDetailStatistics {
    if !valid_date(today) {
        return HabitDetailStatistics {
            month_attained_days: None,
            month_exact: false,
            cumulative_attained_days: None,
            cumulative_exact: false,
            current_streak: None,
            highest_confirmed_streak: None,
            highest_history_exact: false,
            streak_unit: HabitDetailStreakUnit::Days,
            coverage_from: None,
            coverage_to: None,
        };
    }

    let attained = attained_dates(habit, local_completions, today);
    let month_from = format!("{}-01", &today[..7]);
    let month_count = attained
        .iter()
        .filter(|date| date.as_str() >= month_from.as_str() && date.as_str() <= today)
        .count();
    let month_exact = (habit
        .definition
        .as_ref()
        .is_some_and(|definition| definition.origin == "local")
        && canonical_state == "ready")
        || date_range_covered(
            habit,
            local_completions,
            today,
            &month_from,
            today,
            snapshot_generated_at,
            snapshot_state,
        );
    let start_date = habit
        .definition
        .as_ref()
        .and_then(|definition| definition.start_date.as_deref())
        .filter(|date| valid_date(date));
    let history_start = statistical_start_date(habit);
    let cumulative_exact = start_date.is_some()
        && canonical_state == "ready"
        && (habit
            .definition
            .as_ref()
            .is_some_and(|definition| definition.origin == "local")
            || date_range_covered(
                habit,
                local_completions,
                today,
                history_start
                    .as_deref()
                    .unwrap_or_else(|| start_date.expect("checked above")),
                today,
                snapshot_generated_at,
                snapshot_state,
            ));
    let cumulative_count = attained.len();
    let unit = if matches!(
        goal_for_date(habit, today, today),
        Some(HabitGoalTarget::WeeklyCount { .. })
    ) {
        HabitDetailStreakUnit::Weeks
    } else {
        HabitDetailStreakUnit::Days
    };
    let streak = streaks(
        habit,
        local_completions,
        &attained,
        today,
        unit,
        snapshot_generated_at,
        snapshot_state,
    );
    let mut coverage_dates: Vec<&str> = habit
        .history
        .iter()
        .map(|cell| cell.date.as_str())
        .filter(|date| valid_date(date))
        .collect();
    coverage_dates.sort_unstable();
    coverage_dates.dedup();

    HabitDetailStatistics {
        month_attained_days: (month_count > 0 || month_exact).then_some(month_count),
        month_exact,
        cumulative_attained_days: (cumulative_count > 0 || cumulative_exact)
            .then_some(cumulative_count),
        cumulative_exact,
        current_streak: streak.current,
        highest_confirmed_streak: streak.highest,
        highest_history_exact: streak.exact,
        streak_unit: unit,
        coverage_from: coverage_dates.first().map(|date| (*date).to_string()),
        coverage_to: coverage_dates.last().map(|date| (*date).to_string()),
    }
}

fn valid_date(value: &str) -> bool {
    CalendarDate::parse(value).is_some()
}

fn add_days(value: &str, amount: i64) -> String {
    CalendarDate::parse(value)
        .expect("date helpers only receive validated dates")
        .plus_days(amount)
        .to_string()
}

fn monday(value: &str) -> String {
    CalendarDate::parse(value)
        .expect("date helpers only receive validated dates")
        .monday()
        .to_string()
}

fn dates_between(from: &str, to: &str) -> Vec<String> {
    let (Some(start), Some(end)) = (CalendarDate::parse(from), CalendarDate::parse(to)) else {
        return Vec::new();
    };
    if start > end {
        return Vec::new();
    }
    let count = (end.unix_days() - start.unix_days() + 1).min(36_600);
    (0..count)
        .map(|offset| start.plus_days(offset).to_string())
        .collect()
}

fn goal_for_date<'a>(habit: &'a HabitView, date: &str, today: &str) -> Option<&'a HabitGoalTarget> {
    let definition = habit.definition.as_ref();
    if let Some(revision) = definition.and_then(|definition| {
        definition
            .goal_revisions
            .iter()
            .filter(|revision| {
                revision.status != "cancelled" && revision.effective_from.as_str() <= date
            })
            .max_by_key(|revision| revision.effective_from.as_str())
    }) {
        return Some(&revision.target);
    }
    let week_of = monday(date);
    if let Some(target) = habit
        .goal_history
        .iter()
        .find(|context| context.week_of == week_of)
        .and_then(|context| context.target.as_ref())
    {
        return Some(target);
    }
    if let Some(target) = definition.and_then(|definition| {
        definition
            .current_goal_effective_from
            .as_deref()
            .filter(|effective| *effective <= date)
            .and_then(|_| definition.current_goal.as_ref())
    }) {
        return Some(target);
    }
    (date == today)
        .then_some(habit.goal_target.as_ref())
        .flatten()
}

fn statistical_start_date(habit: &HabitView) -> Option<String> {
    let definition = habit.definition.as_ref();
    let start = definition
        .and_then(|definition| definition.start_date.as_deref())
        .filter(|date| valid_date(date))
        .map(str::to_string);
    let revision_start = definition
        .into_iter()
        .flat_map(|definition| definition.goal_revisions.iter())
        .filter(|revision| revision.status != "cancelled" && valid_date(&revision.effective_from))
        .map(|revision| revision.effective_from.clone())
        .min();
    let history_start = habit
        .goal_history
        .iter()
        .filter(|context| context.target.is_some() && valid_date(&context.week_of))
        .map(|context| context.week_of.clone())
        .min();
    [start, revision_start, history_start]
        .into_iter()
        .flatten()
        .min()
}

fn active_on(habit: &HabitView, date: &str, today: &str) -> Option<bool> {
    let definition = habit.definition.as_ref();
    let Some(definition) = definition else {
        return (date == today || habit.active).then_some(habit.active);
    };
    if definition.lifecycle_history.is_empty() {
        if date == today || definition.origin == "local" {
            return Some(habit.active);
        }
        return habit.active.then_some(true);
    }
    Some(
        definition
            .lifecycle_history
            .iter()
            .filter(|event| event.effective_from.as_str() <= date)
            .max_by(|left, right| {
                left.effective_from
                    .cmp(&right.effective_from)
                    .then_with(|| left.changed_at.cmp(&right.changed_at))
            })
            .map_or(true, |event| event.active),
    )
}

fn completion_on(
    habit: &HabitView,
    local_completions: &[(String, HabitLocalCompletionState)],
    date: &str,
) -> bool {
    let local = local_completions
        .iter()
        .find(|(lived_date, _)| lived_date == date)
        .map(|(_, state)| *state);
    let cell = habit.history.iter().find(|cell| cell.date == date);
    match local {
        Some(HabitLocalCompletionState::Completed) => true,
        Some(HabitLocalCompletionState::Withdrawn) => {
            cell.is_some_and(|cell| cell.has_external_completion)
        }
        Some(HabitLocalCompletionState::None) | None => {
            cell.is_some_and(|cell| cell.counts_as_completion)
        }
    }
}

fn coverage_is_complete(
    habit: &HabitView,
    date: &str,
    snapshot_generated_at: Option<&str>,
    snapshot_state: HabitSnapshotState,
) -> bool {
    if matches!(
        snapshot_state,
        HabitSnapshotState::Error | HabitSnapshotState::Missing | HabitSnapshotState::Unconfigured
    ) {
        return false;
    }
    if snapshot_generated_at
        .and_then(|timestamp| timestamp.get(..10))
        .filter(|date| valid_date(date))
        .is_some_and(|generated| date > generated)
    {
        return false;
    }
    habit
        .history
        .iter()
        .any(|cell| cell.date == date && cell.coverage == "complete")
}

fn attained_dates(
    habit: &HabitView,
    local_completions: &[(String, HabitLocalCompletionState)],
    today: &str,
) -> BTreeSet<String> {
    let mut candidates: BTreeSet<String> = local_completions
        .iter()
        .filter(|(_, state)| *state == HabitLocalCompletionState::Completed)
        .map(|(date, _)| date.clone())
        .collect();
    candidates.extend(
        habit
            .history
            .iter()
            .filter(|cell| cell.counts_as_completion)
            .map(|cell| cell.date.clone()),
    );
    candidates
        .into_iter()
        .filter(|date| valid_date(date) && date.as_str() <= today)
        .filter(|date| active_on(habit, date, today) == Some(true))
        .filter(|date| goal_for_date(habit, date, today).is_some())
        .filter(|date| completion_on(habit, local_completions, date))
        .collect()
}

fn date_range_covered(
    habit: &HabitView,
    local_completions: &[(String, HabitLocalCompletionState)],
    today: &str,
    from: &str,
    to: &str,
    snapshot_generated_at: Option<&str>,
    snapshot_state: HabitSnapshotState,
) -> bool {
    let first = statistical_start_date(habit).map_or_else(
        || from.to_string(),
        |start| start.as_str().max(from).to_string(),
    );
    if first.as_str() > to {
        return true;
    }
    dates_between(&first, to).into_iter().all(|date| {
        let activity = active_on(habit, &date, today);
        if activity == Some(false) {
            return true;
        }
        if activity.is_none() || goal_for_date(habit, &date, today).is_none() {
            return false;
        }
        completion_on(habit, local_completions, &date)
            || coverage_is_complete(habit, &date, snapshot_generated_at, snapshot_state)
    })
}

fn daily_result(
    habit: &HabitView,
    date: &str,
    today: &str,
    attained: &BTreeSet<String>,
    snapshot_generated_at: Option<&str>,
    snapshot_state: HabitSnapshotState,
) -> PeriodResult {
    if statistical_start_date(habit).is_some_and(|start| date < start.as_str()) {
        return PeriodResult::Partial;
    }
    let activity = active_on(habit, date, today);
    if activity == Some(false) {
        return PeriodResult::Inactive;
    }
    let target_kind = goal_for_date(habit, date, today);
    if activity.is_none()
        || !matches!(
            target_kind,
            Some(HabitGoalTarget::DailyCompletion | HabitGoalTarget::DailyTime { .. })
        )
    {
        return PeriodResult::Unknown;
    }
    if attained.contains(date) {
        return PeriodResult::Achieved;
    }
    if coverage_is_complete(habit, date, snapshot_generated_at, snapshot_state) {
        PeriodResult::Missed
    } else {
        PeriodResult::Unknown
    }
}

fn weekly_result(
    habit: &HabitView,
    local_completions: &[(String, HabitLocalCompletionState)],
    week_of: &str,
    today: &str,
    attained: &BTreeSet<String>,
    snapshot_generated_at: Option<&str>,
    snapshot_state: HabitSnapshotState,
) -> PeriodResult {
    let week_dates = dates_between(week_of, &add_days(week_of, 6));
    let defined_dates: Vec<&str> = week_dates
        .iter()
        .map(String::as_str)
        .filter(|date| *date <= today)
        .collect();
    let target = goal_for_date(habit, week_of, today);
    let Some(HabitGoalTarget::WeeklyCount { standard }) = target else {
        return PeriodResult::Unknown;
    };
    if statistical_start_date(habit).is_some_and(|start| start.as_str() > week_of) {
        return PeriodResult::Partial;
    }
    if habit
        .definition
        .as_ref()
        .and_then(|definition| definition.current_goal_effective_from.as_deref())
        .filter(|date| valid_date(date))
        .is_some_and(|revision| revision > week_of && revision <= add_days(week_of, 6).as_str())
    {
        return PeriodResult::Partial;
    }
    let activity: Vec<Option<bool>> = defined_dates
        .iter()
        .map(|date| active_on(habit, date, today))
        .collect();
    if activity.iter().any(|active| *active == Some(false)) {
        return PeriodResult::Inactive;
    }
    if activity.iter().any(Option::is_none) {
        return PeriodResult::Unknown;
    }
    let completed = week_dates
        .iter()
        .filter(|date| attained.contains(*date))
        .count();
    if completed >= usize::from(*standard) {
        return PeriodResult::Achieved;
    }
    if week_dates.iter().any(|date| date.as_str() > today) {
        return PeriodResult::Unknown;
    }
    if defined_dates.iter().all(|date| {
        coverage_is_complete(habit, date, snapshot_generated_at, snapshot_state)
            || completion_on(habit, local_completions, date)
    }) {
        PeriodResult::Missed
    } else {
        PeriodResult::Unknown
    }
}

fn streaks(
    habit: &HabitView,
    local_completions: &[(String, HabitLocalCompletionState)],
    attained: &BTreeSet<String>,
    today: &str,
    unit: HabitDetailStreakUnit,
    snapshot_generated_at: Option<&str>,
    snapshot_state: HabitSnapshotState,
) -> Streaks {
    let start = statistical_start_date(habit)
        .or_else(|| attained.first().cloned())
        .unwrap_or_else(|| today.to_string());
    let valid_start = valid_date(&start);
    let period_start = match unit {
        HabitDetailStreakUnit::Days => start.clone(),
        HabitDetailStreakUnit::Weeks => monday(&start),
    };
    let current_start = match unit {
        HabitDetailStreakUnit::Days => today.to_string(),
        HabitDetailStreakUnit::Weeks => monday(today),
    };
    let evaluate = |period: &str| match unit {
        HabitDetailStreakUnit::Days => daily_result(
            habit,
            period,
            today,
            attained,
            snapshot_generated_at,
            snapshot_state,
        ),
        HabitDetailStreakUnit::Weeks => weekly_result(
            habit,
            local_completions,
            period,
            today,
            attained,
            snapshot_generated_at,
            snapshot_state,
        ),
    };
    let current_period_result = evaluate(&current_start);
    let open_current_achieved = current_period_result == PeriodResult::Achieved;
    let mut cursor = if open_current_achieved {
        current_start.clone()
    } else {
        match unit {
            HabitDetailStreakUnit::Days => add_days(&current_start, -1),
            HabitDetailStreakUnit::Weeks => add_days(&current_start, -7),
        }
    };
    let mut current = 0usize;
    let mut current_known = false;
    for _ in 0..36_600 {
        if cursor < period_start {
            break;
        }
        let result = evaluate(&cursor);
        if result != PeriodResult::Achieved {
            current_known = result == PeriodResult::Missed;
            break;
        }
        current += 1;
        current_known = true;
        cursor = match unit {
            HabitDetailStreakUnit::Days => add_days(&cursor, -1),
            HabitDetailStreakUnit::Weeks => add_days(&cursor, -7),
        };
    }
    if cursor < period_start && valid_start {
        current_known = true;
    }

    let mut highest = 0usize;
    let mut run = 0usize;
    let mut run_unit = None;
    let end = match unit {
        HabitDetailStreakUnit::Days => today.to_string(),
        HabitDetailStreakUnit::Weeks => monday(today),
    };
    let step = match unit {
        HabitDetailStreakUnit::Days => 1,
        HabitDetailStreakUnit::Weeks => 7,
    };
    for period in dates_between(&period_start, &end)
        .into_iter()
        .step_by(step as usize)
    {
        let target_date = match unit {
            HabitDetailStreakUnit::Days => period.clone(),
            HabitDetailStreakUnit::Weeks => add_days(&period, 6),
        };
        let target_unit = match goal_for_date(habit, &target_date, today) {
            Some(HabitGoalTarget::WeeklyCount { .. }) => Some("weekly-count"),
            Some(HabitGoalTarget::DailyCompletion | HabitGoalTarget::DailyTime { .. }) => {
                Some("daily-completion")
            }
            None => None,
        };
        let expected_unit = match unit {
            HabitDetailStreakUnit::Days => "daily-completion",
            HabitDetailStreakUnit::Weeks => "weekly-count",
        };
        if evaluate(&period) == PeriodResult::Achieved && target_unit == Some(expected_unit) {
            if run_unit != target_unit {
                run = 0;
            }
            run += 1;
            run_unit = target_unit;
            highest = highest.max(run);
        } else {
            run = 0;
            run_unit = None;
        }
    }
    let exact_through = match unit {
        HabitDetailStreakUnit::Days if open_current_achieved => today.to_string(),
        HabitDetailStreakUnit::Days => add_days(today, -1),
        HabitDetailStreakUnit::Weeks if open_current_achieved => today.to_string(),
        HabitDetailStreakUnit::Weeks => add_days(&monday(today), -1),
    };
    let exact = exact_through < period_start
        || date_range_covered(
            habit,
            local_completions,
            today,
            &period_start,
            &exact_through,
            snapshot_generated_at,
            snapshot_state,
        );
    Streaks {
        current: if matches!(
            current_period_result,
            PeriodResult::Inactive | PeriodResult::Partial
        ) {
            None
        } else if current > 0 || current_known {
            Some(current)
        } else {
            None
        },
        highest: (highest > 0).then_some(highest),
        exact,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::habits::{
        DayRelation, HabitCellStatus, HabitCellView, HabitDefinitionView, HabitGoalRevisionView,
        HabitLifecycleChangeView, HabitLocalizedNames,
    };

    fn daily_habit(start_date: &str) -> HabitView {
        let target = HabitGoalTarget::DailyCompletion;
        let today = HabitCellView {
            date: "2026-10-14".into(),
            coverage: "unknown".into(),
            status: HabitCellStatus::Unknown,
            has_record: false,
            counts_as_completion: false,
            local_completion_state: HabitLocalCompletionState::None,
            has_external_completion: false,
            completion_source_labels: Vec::new(),
            actual_time_label: None,
            sleep_fact: None,
            details: Vec::new(),
            local_records: Vec::new(),
        };
        HabitView {
            key: "local-test".into(),
            name: "Test Habit".into(),
            localized_names: HabitLocalizedNames::default(),
            active: true,
            goal_kind: "daily-completion".into(),
            goal_label: "Daily".into(),
            goal_target: Some(target.clone()),
            definition: Some(HabitDefinitionView {
                origin: "local".into(),
                emoji: None,
                group: None,
                start_date: Some(start_date.into()),
                lifecycle_active: true,
                lifecycle_history: Vec::<HabitLifecycleChangeView>::new(),
                goal_revisions: vec![HabitGoalRevisionView {
                    id: "goal-1".into(),
                    effective_from: "2026-10-01".into(),
                    target: target.clone(),
                    status: "active".into(),
                }],
                current_goal: Some(target),
                current_goal_effective_from: Some("2026-10-01".into()),
                pending_goal: None,
                pending_goal_effective_from: None,
                partial_goal_cycle: false,
            }),
            weekly_target: None,
            completed_count: None,
            can_record_completion: true,
            source_labels: Vec::new(),
            coverage_label: "local".into(),
            goal_history: Vec::new(),
            today: today.clone(),
            recent: vec![today.clone()],
            history: vec![today],
        }
    }

    fn with_target(mut habit: HabitView, target: HabitGoalTarget) -> HabitView {
        habit.goal_kind = match &target {
            HabitGoalTarget::WeeklyCount { .. } => "weekly-count",
            HabitGoalTarget::DailyTime { .. } => "daily-time",
            HabitGoalTarget::DailyCompletion => "daily-completion",
        }
        .into();
        habit.goal_target = Some(target.clone());
        let definition = habit
            .definition
            .as_mut()
            .expect("test Habit has a definition");
        definition.goal_revisions[0].target = target.clone();
        definition.current_goal = Some(target);
        habit
    }

    fn completed(date: &str) -> (String, HabitLocalCompletionState) {
        (date.into(), HabitLocalCompletionState::Completed)
    }

    #[test]
    fn cumulative_count_keeps_attainment_before_the_current_start_date() {
        let habit = daily_habit("2026-10-14");
        let completions = vec![
            ("2026-10-12".into(), HabitLocalCompletionState::Completed),
            ("2026-10-12".into(), HabitLocalCompletionState::Completed),
            ("2026-10-13".into(), HabitLocalCompletionState::Completed),
        ];

        let stats = calculate(
            &habit,
            &completions,
            "2026-10-14",
            "ready",
            None,
            HabitSnapshotState::Missing,
        );

        assert_eq!(stats.month_attained_days, Some(2));
        assert_eq!(stats.cumulative_attained_days, Some(2));
        assert_eq!(stats.current_streak, Some(2));
        assert_eq!(stats.highest_confirmed_streak, Some(2));
        assert!(stats.cumulative_exact);
    }

    #[test]
    fn absent_evidence_and_coverage_remain_unknown() {
        let habit = daily_habit("2026-10-01");
        let stats = calculate(
            &habit,
            &[],
            "2026-10-14",
            "missing",
            None,
            HabitSnapshotState::Missing,
        );

        assert_eq!(stats.month_attained_days, None);
        assert_eq!(stats.cumulative_attained_days, None);
        assert_eq!(stats.current_streak, None);
        assert_eq!(stats.highest_confirmed_streak, None);
    }

    #[test]
    fn inactive_days_break_streaks_but_keep_prior_attainment() {
        let mut habit = daily_habit("2026-10-01");
        habit.definition.as_mut().unwrap().lifecycle_history = vec![
            HabitLifecycleChangeView {
                operation_id: "pause".into(),
                active: false,
                effective_from: "2026-10-13".into(),
                changed_at: "2026-10-13T09:00-04:00".into(),
            },
            HabitLifecycleChangeView {
                operation_id: "restore".into(),
                active: true,
                effective_from: "2026-10-14".into(),
                changed_at: "2026-10-14T09:00-04:00".into(),
            },
        ];
        let stats = calculate(
            &habit,
            &[
                completed("2026-10-11"),
                completed("2026-10-12"),
                completed("2026-10-13"),
                completed("2026-10-14"),
            ],
            "2026-10-14",
            "ready",
            None,
            HabitSnapshotState::Missing,
        );

        assert_eq!(stats.cumulative_attained_days, Some(3));
        assert_eq!(stats.current_streak, Some(1));
        assert_eq!(stats.highest_confirmed_streak, Some(2));
    }

    #[test]
    fn daily_time_goals_use_day_streak_units() {
        let habit = with_target(
            daily_habit("2026-10-01"),
            HabitGoalTarget::DailyTime {
                standard: "07:00".into(),
                day_relation: DayRelation::SameDay,
            },
        );
        let stats = calculate(
            &habit,
            &[completed("2026-10-13")],
            "2026-10-14",
            "ready",
            None,
            HabitSnapshotState::Missing,
        );

        assert_eq!(stats.streak_unit, HabitDetailStreakUnit::Days);
        assert_eq!(stats.current_streak, Some(1));
        assert_eq!(stats.highest_confirmed_streak, Some(1));
    }

    #[test]
    fn open_unachieved_week_does_not_end_the_previous_week_streak() {
        let habit = with_target(
            daily_habit("2026-09-01"),
            HabitGoalTarget::WeeklyCount { standard: 2 },
        );
        let stats = calculate(
            &habit,
            &[completed("2026-10-05"), completed("2026-10-07")],
            "2026-10-14",
            "ready",
            None,
            HabitSnapshotState::Missing,
        );

        assert_eq!(stats.streak_unit, HabitDetailStreakUnit::Weeks);
        assert_eq!(stats.current_streak, Some(1));
        assert_eq!(stats.highest_confirmed_streak, Some(1));
    }
}
