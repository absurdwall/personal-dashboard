//! Read-only Habit details over canonical completion facts and sourced projections.
use crate::habit_catalog::{HabitGoal, HabitGoalRevision};
use crate::habits::{
    HabitCellStatus, HabitCellView, HabitLocalCompletionChangeView, HabitLocalCompletionState,
    HabitSnapshotView, HabitView,
};
use crate::today::CalendarDate;
use serde::Serialize;
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitHistoryRecordView {
    pub cell: HabitCellView,
    pub local_changes: Vec<HabitLocalCompletionChangeView>,
    pub can_correct: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitStreakView {
    pub unit: String,
    pub current: u32,
    pub current_confirmed: bool,
    pub highest_known: u32,
    pub highest_confirmed: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitStatisticsView {
    pub total_attained_days: u32,
    pub month_attained_days: u32,
    pub total_exact: bool,
    pub month_exact: bool,
    pub current_streak: u32,
    pub current_confirmed: bool,
    pub highest_known_streak: u32,
    pub highest_confirmed: bool,
    pub unit: String,
    pub streaks: Vec<HabitStreakView>,
    pub coverage_from: String,
    pub coverage_to: String,
    pub unknown_days: u32,
}

pub const HABIT_SOURCE_HISTORY_RELATIVE_PATH: &str =
    "life/.personal-dashboard/habit-history/v1/snapshots";
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitSourceCoverageView {
    pub generated_at: String,
    pub range_from: String,
    pub range_to: String,
    pub producer_label: String,
}

pub(crate) fn retain_source<S: crate::today::HabitCompletionStore>(
    store: &S,
    vault: &std::path::Path,
    bytes: &[u8],
    today: &str,
    local_date: &str,
) -> Result<(), String> {
    crate::habits::project_source_history(bytes, today, local_date, &Default::default())?;
    let path = vault
        .join(HABIT_SOURCE_HISTORY_RELATIVE_PATH)
        .join(format!("{}.json", crate::today::document_revision(bytes)));
    match store.load(&path)? {
        Some(existing) if existing == bytes => Ok(()),
        Some(_) => Err("Habits 来源历史已损坏或冲突；保留原文件，未覆盖当前快照。".into()),
        None => store.create_new(&path, bytes),
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitDetailsView {
    pub habit: HabitView,
    pub statistics: HabitStatisticsView,
    pub catalog_revision: Option<String>,
    pub catalog_target_binding: Option<String>,
    pub completion_revision: Option<String>,
    pub completion_target_binding: Option<String>,
    pub source_state: crate::habits::HabitSnapshotState,
    pub source_generated_at: Option<String>,
    pub source_message: String,
    pub records: Vec<HabitHistoryRecordView>,
    pub record_count: usize,
    pub offset: usize,
    pub next_offset: Option<usize>,
    pub goal_revisions: Vec<HabitGoalRevision>,
    pub activity_changes: Vec<crate::habit_catalog::HabitActivityChange>,
    pub sources: Vec<HabitSourceCoverageView>,
    pub source_warnings: Vec<String>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Outcome {
    Attained,
    Missed,
    Unknown,
    Open,
    Excluded,
}
struct Cycle {
    unit: &'static str,
    activity_segment: usize,
    pending_unknown: bool,
    outcome: Outcome,
}

pub(crate) fn statistics(
    habit: &HabitView,
    cells: &BTreeMap<String, HabitCellView>,
    from: &str,
    today: &str,
    sourced: bool,
    definition: Option<&crate::habit_catalog::HabitDefinition>,
) -> HabitStatisticsView {
    let first = CalendarDate::parse(from).expect("validated history origin");
    let last = CalendarDate::parse(today).expect("validated today");
    let month = &today[..7];
    let known_day = |cell: &HabitCellView| {
        cell.counts_as_completion
            || (cell.status != HabitCellStatus::Conflict
                && !(matches!(
                    cell.status,
                    HabitCellStatus::ActualTime | HabitCellStatus::ThresholdOnly
                ) && habit
                    .goal_revisions
                    .iter()
                    .rev()
                    .find(|revision| revision.applies_on(&cell.date))
                    .is_none_or(|revision| {
                        matches!(
                            revision.goal,
                            HabitGoal::Unconfigured
                                | HabitGoal::DailyTime {
                                    day_relation: crate::habits::DayRelation::Unresolved,
                                    ..
                                }
                        )
                    }))
                && (cell.coverage == "complete"
                    || (!sourced
                        && cell.local_completion_state == HabitLocalCompletionState::Withdrawn)))
    };
    let active_on = |date: &str| definition.is_none_or(|definition| definition.active_on(date));
    let activity_segment = |date: &str| {
        definition
            .map(|definition| {
                definition
                    .activity_changes
                    .iter()
                    .filter(|change| change.lived_date.as_str() <= date)
                    .count()
            })
            .unwrap_or(0)
    };
    let current_segment = activity_segment(today);
    let unknown_days = (first.unix_days()..=last.unix_days())
        .filter(|day| {
            active_on(&CalendarDate::from_unix_days(*day).to_string())
                && cells
                    .get(&CalendarDate::from_unix_days(*day).to_string())
                    .is_none_or(|cell| !known_day(cell))
        })
        .count() as u32;
    let total = cells
        .values()
        .filter(|cell| cell.date.as_str() <= today && cell.counts_as_completion)
        .count() as u32;
    let monthly = cells
        .values()
        .filter(|cell| {
            cell.date.starts_with(month) && cell.date.as_str() <= today && cell.counts_as_completion
        })
        .count() as u32;
    let month_start = CalendarDate::parse(&format!("{month}-01"))
        .unwrap()
        .max(first);
    let month_exact = (month_start.unix_days()..=last.unix_days()).all(|day| {
        !active_on(&CalendarDate::from_unix_days(day).to_string())
            || cells
                .get(&CalendarDate::from_unix_days(day).to_string())
                .is_some_and(known_day)
    });
    let goal_on = |date: &str| {
        habit
            .goal_revisions
            .iter()
            .rev()
            .find(|revision| revision.applies_on(date))
    };
    let mut cycles = Vec::new();
    let mut day = first;
    while day <= last {
        let label = day.to_string();
        let revision = goal_on(&label);
        let weekly = revision
            .is_some_and(|revision| matches!(revision.goal, HabitGoal::WeeklyDays { .. }))
            || (revision.is_none_or(|revision| matches!(revision.goal, HabitGoal::Unconfigured))
                && habit.goal_kind == "weekly-count");
        if weekly {
            let start = day.monday();
            let end = start.plus_days(6);
            let start_label = start.to_string();
            let end_label = end.to_string();
            let target = revision.and_then(|revision| match revision.goal {
                HabitGoal::WeeklyDays { days } => Some(days),
                _ => None,
            });
            let stable_start = active_on(&start_label) && (first <= start);
            let complete_cycle = first <= start
                && revision.is_some_and(|revision| {
                    revision.effective_date <= start_label
                        && revision
                            .valid_through
                            .as_ref()
                            .is_none_or(|through| through >= &end_label)
                })
                && (start.unix_days()..=end.min(last).unix_days()).all(|tick| {
                    goal_on(&CalendarDate::from_unix_days(tick).to_string()).is_some_and(
                        |candidate| matches!(candidate.goal, HabitGoal::WeeklyDays { .. }),
                    )
                });
            let pause = definition
                .and_then(|definition| {
                    definition.activity_changes.iter().find(|change| {
                        !change.active
                            && change.lived_date >= start_label
                            && change.lived_date <= end_label
                    })
                })
                .and_then(|change| CalendarDate::parse(&change.lived_date));
            let evaluation_end = pause
                .map(|pause| pause.plus_days(-1))
                .unwrap_or(end.min(last))
                .min(end.min(last));
            let attained = (day.unix_days()..=evaluation_end.unix_days())
                .filter(|tick| {
                    cells
                        .get(&CalendarDate::from_unix_days(*tick).to_string())
                        .is_some_and(|cell| cell.counts_as_completion)
                })
                .count() as u32;
            let known = (day.unix_days()..=end.min(last).unix_days()).all(|tick| {
                cells
                    .get(&CalendarDate::from_unix_days(tick).to_string())
                    .is_some_and(known_day)
            });
            let all_inactive = (day.unix_days()..=end.min(last).unix_days())
                .all(|tick| !active_on(&CalendarDate::from_unix_days(tick).to_string()));
            let outcome = if all_inactive {
                Outcome::Excluded
            } else if target.is_none() {
                Outcome::Unknown
            } else if !complete_cycle || !stable_start {
                Outcome::Excluded
            } else if target.is_some_and(|target| attained >= target) {
                Outcome::Attained
            } else if pause.is_some() {
                Outcome::Excluded
            } else if end >= last {
                Outcome::Open
            } else if !known {
                Outcome::Unknown
            } else {
                Outcome::Missed
            };
            cycles.push(Cycle {
                unit: "weeks",
                activity_segment: activity_segment(&start_label),
                pending_unknown: outcome == Outcome::Open && !known,
                outcome,
            });
            day = end.plus_days(1);
        } else {
            let cell = cells.get(&label);
            let configured = revision.is_some_and(|revision| {
                matches!(
                    revision.goal,
                    HabitGoal::DailyCompletion
                        | HabitGoal::DailyTime {
                            day_relation: crate::habits::DayRelation::SameDay
                                | crate::habits::DayRelation::NextDay,
                            ..
                        }
                )
            });
            let outcome = if !active_on(&label) {
                Outcome::Excluded
            } else if !configured {
                Outcome::Unknown
            } else if cell.is_some_and(|cell| cell.counts_as_completion) {
                Outcome::Attained
            } else if day == last {
                Outcome::Open
            } else if cell.is_some_and(known_day) {
                Outcome::Missed
            } else {
                Outcome::Unknown
            };
            cycles.push(Cycle {
                unit: "days",
                activity_segment: activity_segment(&label),
                pending_unknown: outcome == Outcome::Open
                    && cell.is_none_or(|cell| !known_day(cell)),
                outcome,
            });
            day = day.plus_days(1);
        }
    }
    let mut streaks = Vec::new();
    for unit in ["days", "weeks"] {
        if !cycles.iter().any(|cycle| cycle.unit == unit) {
            continue;
        }
        let mut running = 0;
        let mut highest = 0;
        let mut previous_segment = None;
        for cycle in &cycles {
            if cycle.unit != unit || previous_segment != Some(cycle.activity_segment) {
                running = 0;
            }
            if cycle.unit == unit && cycle.outcome == Outcome::Attained {
                running += 1;
                highest = highest.max(running);
            } else if cycle.outcome != Outcome::Open {
                running = 0;
            }
            previous_segment = Some(cycle.activity_segment);
        }
        let mut current = 0;
        let mut current_confirmed = true;
        for cycle in cycles.iter().rev() {
            if cycle.unit != unit || cycle.activity_segment != current_segment {
                break;
            }
            match cycle.outcome {
                Outcome::Attained => current += 1,
                Outcome::Open => {
                    if cycle.pending_unknown {
                        current_confirmed = false;
                    }
                }
                Outcome::Unknown => {
                    current_confirmed = false;
                    break;
                }
                Outcome::Missed | Outcome::Excluded => break,
            }
        }
        if !habit.active {
            current = 0;
            current_confirmed = true;
        }
        let confirmed = !sourced
            && cycles.iter().all(|cycle| {
                cycle.unit != unit || (cycle.outcome != Outcome::Unknown && !cycle.pending_unknown)
            });
        streaks.push(HabitStreakView {
            unit: unit.into(),
            current,
            current_confirmed,
            highest_known: highest,
            highest_confirmed: confirmed,
        });
    }
    let unit = if habit.goal_kind == "weekly-count" {
        "weeks"
    } else {
        "days"
    };
    let current = streaks.iter().find(|streak| streak.unit == unit);
    HabitStatisticsView {
        total_attained_days: total,
        month_attained_days: monthly,
        total_exact: !sourced && unknown_days == 0,
        month_exact,
        current_streak: current.map(|streak| streak.current).unwrap_or(0),
        current_confirmed: current.is_some_and(|streak| streak.current_confirmed),
        highest_known_streak: current.map(|streak| streak.highest_known).unwrap_or(0),
        highest_confirmed: current.is_some_and(|streak| streak.highest_confirmed),
        unit: unit.into(),
        streaks,
        coverage_from: from.into(),
        coverage_to: today.into(),
        unknown_days,
    }
}

pub(crate) fn details_view(
    snapshot: &HabitSnapshotView,
    habit: HabitView,
    cells: BTreeMap<String, HabitCellView>,
    changes: &BTreeMap<String, Vec<HabitLocalCompletionChangeView>>,
    from: &str,
    today: &str,
    sourced: bool,
    definition: Option<&crate::habit_catalog::HabitDefinition>,
    sources: Vec<HabitSourceCoverageView>,
    source_warnings: Vec<String>,
    offset: usize,
    limit: usize,
) -> HabitDetailsView {
    let statistics = statistics(&habit, &cells, from, today, sourced, definition);
    let records: Vec<_> = cells
        .into_values()
        .rev()
        .filter(|cell| cell.has_record || cell.coverage != "unknown")
        .map(|cell| HabitHistoryRecordView {
            can_correct: cell.local_completion_state != HabitLocalCompletionState::None
                || habit
                    .goal_revisions
                    .iter()
                    .rev()
                    .find(|revision| revision.applies_on(&cell.date))
                    .is_some_and(|revision| {
                        matches!(
                            revision.goal,
                            HabitGoal::DailyCompletion
                                | HabitGoal::WeeklyDays { .. }
                                | HabitGoal::DailyTime {
                                    day_relation: crate::habits::DayRelation::SameDay
                                        | crate::habits::DayRelation::NextDay,
                                    ..
                                }
                        )
                    })
                || (habit.goal_kind == "weekly-count"
                    && habit
                        .current_goal
                        .as_ref()
                        .is_none_or(|goal| matches!(goal, HabitGoal::Unconfigured))),
            local_changes: changes.get(&cell.date).cloned().unwrap_or_default(),
            cell,
        })
        .collect();
    let record_count = records.len();
    let page = records.into_iter().skip(offset).take(limit).collect();
    HabitDetailsView {
        sources,
        source_warnings,
        activity_changes: definition
            .map(|definition| definition.activity_changes.clone())
            .unwrap_or_default(),
        goal_revisions: habit.goal_revisions.clone(),
        habit,
        statistics,
        catalog_revision: snapshot.catalog_revision.clone(),
        catalog_target_binding: snapshot.catalog_target_binding.clone(),
        completion_revision: snapshot.completion_revision.clone(),
        completion_target_binding: snapshot.completion_target_binding.clone(),
        source_state: snapshot.state,
        source_generated_at: snapshot.generated_at.clone(),
        source_message: snapshot.message.clone(),
        records: page,
        record_count,
        offset,
        next_offset: (offset + limit < record_count).then_some(offset + limit),
    }
}
