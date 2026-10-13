//! Read-only Habit details over canonical completion facts and sourced projections.
use crate::habit_catalog::{HabitGoal, HabitGoalRevision};
use crate::habits::{HabitCellStatus, HabitCellView, HabitLocalCompletionChangeView, HabitLocalCompletionState, HabitSnapshotView, HabitView};
use crate::today::CalendarDate;
use serde::Serialize;
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitHistoryRecordView {
    pub cell: HabitCellView,
    pub local_changes: Vec<HabitLocalCompletionChangeView>,
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
}

#[derive(Clone, Copy, PartialEq, Eq)]
enum Outcome { Attained, Missed, Unknown, Open, Partial }
struct Cycle { unit: &'static str, start: String, end: String, outcome: Outcome }

pub(crate) fn statistics(habit: &HabitView, cells: &BTreeMap<String, HabitCellView>, from: &str, today: &str, sourced: bool) -> HabitStatisticsView {
    let first = CalendarDate::parse(from).expect("validated history origin");
    let last = CalendarDate::parse(today).expect("validated today");
    let month = &today[..7];
    let known_day = |cell: &HabitCellView| cell.counts_as_completion || (cell.status != HabitCellStatus::Conflict && (cell.coverage == "complete" || (!sourced && cell.local_completion_state == HabitLocalCompletionState::Withdrawn)));
    let unknown_days = (first.unix_days()..=last.unix_days()).filter(|day| cells.get(&CalendarDate::from_unix_days(*day).to_string()).is_none_or(|cell| !known_day(cell))).count() as u32;
    let total = cells.values().filter(|cell| cell.date.as_str() <= today && cell.counts_as_completion).count() as u32;
    let monthly = cells.values().filter(|cell| cell.date.starts_with(month) && cell.date.as_str() <= today && cell.counts_as_completion).count() as u32;
    let month_start = CalendarDate::parse(&format!("{month}-01")).unwrap().max(first);
    let month_exact = (month_start.unix_days()..=last.unix_days()).all(|day| cells.get(&CalendarDate::from_unix_days(day).to_string()).is_some_and(known_day));
    let goal_on = |date: &str| habit.goal_revisions.iter().rev().find(|revision| revision.applies_on(date));
    let mut cycles = Vec::new();
    let mut day = first;
    while day <= last {
        let label = day.to_string();
        let revision = goal_on(&label);
        let weekly = revision.is_some_and(|revision| matches!(revision.goal, HabitGoal::WeeklyDays { .. })) || (revision.is_none_or(|revision| matches!(revision.goal, HabitGoal::Unconfigured)) && habit.goal_kind == "weekly-count");
        if weekly {
            let start = day.monday();
            let end = start.plus_days(6);
            let start_label = start.to_string();
            let end_label = end.to_string();
            let target = revision.and_then(|revision| match revision.goal { HabitGoal::WeeklyDays { days } => Some(days), _ => None });
            let complete_cycle = first <= start && revision.is_some_and(|revision| revision.effective_date <= start_label && revision.valid_through.as_ref().is_none_or(|through| through >= &end_label)) && (start.unix_days()..=end.min(last).unix_days()).all(|tick| goal_on(&CalendarDate::from_unix_days(tick).to_string()).is_some_and(|candidate| matches!(candidate.goal, HabitGoal::WeeklyDays { .. })));
            let attained = (day.unix_days()..=end.min(last).unix_days()).filter(|tick| cells.get(&CalendarDate::from_unix_days(*tick).to_string()).is_some_and(|cell| cell.counts_as_completion)).count() as u32;
            let known = (day.unix_days()..=end.min(last).unix_days()).all(|tick| cells.get(&CalendarDate::from_unix_days(tick).to_string()).is_some_and(known_day));
            let outcome = if !complete_cycle { Outcome::Partial } else if target.is_some_and(|target| attained >= target) { Outcome::Attained } else if end >= last { Outcome::Open } else if target.is_none() || !known { Outcome::Unknown } else { Outcome::Missed };
            cycles.push(Cycle { unit: "weeks", start: start_label, end: end_label, outcome });
            day = end.plus_days(1);
        } else {
            let cell = cells.get(&label);
            let configured = revision.is_some_and(|revision| matches!(revision.goal, HabitGoal::DailyCompletion | HabitGoal::DailyTime { .. }));
            let outcome = if !configured { Outcome::Unknown } else if cell.is_some_and(|cell| cell.counts_as_completion) { Outcome::Attained } else if day == last { Outcome::Open } else if cell.is_some_and(known_day) { Outcome::Missed } else { Outcome::Unknown };
            cycles.push(Cycle { unit: "days", start: label.clone(), end: label, outcome });
            day = day.plus_days(1);
        }
    }
    let mut streaks = Vec::new();
    for unit in ["days", "weeks"] {
        if !cycles.iter().any(|cycle| cycle.unit == unit) { continue; }
        let mut running = 0; let mut highest = 0;
        for cycle in &cycles { if cycle.unit == unit && cycle.outcome == Outcome::Attained { running += 1; highest = highest.max(running); } else if cycle.outcome != Outcome::Open { running = 0; } }
        let mut current = 0; let mut current_confirmed = true;
        for cycle in cycles.iter().rev() {
            if cycle.unit != unit { break; }
            match cycle.outcome { Outcome::Attained => current += 1, Outcome::Open => {}, Outcome::Unknown | Outcome::Partial => {current_confirmed = false; break;}, Outcome::Missed => break }
        }
        if !habit.active { current = 0; current_confirmed = true; }
        let confirmed = !sourced && unknown_days == 0 && cycles.iter().all(|cycle| cycle.unit != unit || !matches!(cycle.outcome, Outcome::Unknown | Outcome::Partial));
        streaks.push(HabitStreakView { unit: unit.into(), current, current_confirmed, highest_known: highest, highest_confirmed: confirmed });
    }
    let unit = if habit.goal_kind == "weekly-count" { "weeks" } else { "days" };
    let current = streaks.iter().find(|streak| streak.unit == unit);
    HabitStatisticsView { total_attained_days: total, month_attained_days: monthly, total_exact: !sourced && unknown_days == 0, month_exact,
        current_streak: current.map(|streak| streak.current).unwrap_or(0), current_confirmed: current.is_some_and(|streak| streak.current_confirmed), highest_known_streak: current.map(|streak| streak.highest_known).unwrap_or(0), highest_confirmed: current.is_some_and(|streak| streak.highest_confirmed), unit:unit.into(), streaks, coverage_from:from.into(), coverage_to:today.into(), unknown_days }
}

pub(crate) fn details_view(snapshot: &HabitSnapshotView, habit: HabitView, cells: BTreeMap<String,HabitCellView>, changes: &BTreeMap<String,Vec<HabitLocalCompletionChangeView>>, from: &str, today: &str, sourced: bool, offset: usize, limit: usize) -> HabitDetailsView {
    let statistics = statistics(&habit, &cells, from, today, sourced);
    let records: Vec<_> = cells.into_values().rev().filter(|cell| cell.has_record || cell.coverage != "unknown").map(|cell| HabitHistoryRecordView {local_changes:changes.get(&cell.date).cloned().unwrap_or_default(),cell}).collect();
    let record_count = records.len();
    let page = records.into_iter().skip(offset).take(limit).collect();
    HabitDetailsView { goal_revisions:habit.goal_revisions.clone(), habit, statistics, catalog_revision:snapshot.catalog_revision.clone(),catalog_target_binding:snapshot.catalog_target_binding.clone(),completion_revision:snapshot.completion_revision.clone(),completion_target_binding:snapshot.completion_target_binding.clone(),source_state:snapshot.state,source_generated_at:snapshot.generated_at.clone(),source_message:snapshot.message.clone(),records:page,record_count,offset,next_offset:(offset+limit<record_count).then_some(offset+limit) }
}
