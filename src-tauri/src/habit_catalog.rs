//! Canonical local Habit settings. Source snapshots remain read-only evidence.
use crate::habits::{
    DayRelation, HabitGoalContextView, HabitSnapshotView, HabitView, LocalHabitCompletion,
};
use crate::today::{
    document_revision, validate_habit_key, validate_local_identifier, validate_timestamp_label,
    CalendarDate,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

pub const HABIT_CATALOG_RELATIVE_PATH: &str =
    "life/.personal-dashboard/habit-catalog/v1/catalog.json";

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum HabitGoal {
    DailyCompletion,
    WeeklyDays {
        days: u32,
    },
    DailyTime {
        time: String,
        day_relation: DayRelation,
    },
    Unconfigured,
}

impl HabitGoal {
    pub fn label(&self) -> String {
        match self {
            Self::DailyCompletion => "每天完成".into(),
            Self::WeeklyDays { days } => format!("每周 {days} 个达标天"),
            Self::DailyTime { time, day_relation } => format!(
                "每日 {}{time}",
                match day_relation {
                    DayRelation::SameDay => "",
                    DayRelation::NextDay => "次日 ",
                    DayRelation::Unresolved => "日期归属待解释 · ",
                }
            ),
            Self::Unconfigured => "未配置目标".into(),
        }
    }
    pub(crate) fn next_boundary(&self, date: CalendarDate) -> CalendarDate {
        match self {
            Self::WeeklyDays { .. } => date.monday().plus_days(7),
            _ => date.plus_days(1),
        }
    }
    pub fn validate(&self) -> Result<(), String> {
        match self {
            Self::WeeklyDays { days } if !(1..=7).contains(days) => {
                Err("每周目标须为 1–7 个不同达标天。".into())
            }
            Self::DailyTime { time, .. }
                if time.len() != 5
                    || time.as_bytes()[2] != b':'
                    || !time
                        .as_bytes()
                        .iter()
                        .enumerate()
                        .all(|(index, byte)| index == 2 || byte.is_ascii_digit())
                    || time
                        .get(..2)
                        .and_then(|hour| hour.parse::<u32>().ok())
                        .is_none_or(|hour| hour > 23)
                    || time
                        .get(3..)
                        .and_then(|minute| minute.parse::<u32>().ok())
                        .is_none_or(|minute| minute > 59) =>
            {
                Err("请输入有效目标时刻 HH:mm。".into())
            }
            _ => Ok(()),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitSettings {
    pub name: String,
    pub emoji: Option<String>,
    pub group: Option<String>,
    pub start_date: String,
    pub goal: HabitGoal,
}

impl HabitSettings {
    pub fn validate(&self) -> Result<(), String> {
        if self.name.trim().is_empty() || self.name.len() > 200 {
            return Err("习惯名称缺失或过长。".into());
        }
        if self.emoji.as_ref().is_some_and(|s| s.len() > 80)
            || self.group.as_ref().is_some_and(|s| s.len() > 200)
        {
            return Err("图标或分组过长。".into());
        }
        if CalendarDate::parse(&self.start_date).is_none() {
            return Err("开始日期无效。".into());
        }
        self.goal.validate()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitDefinitionMutationInput {
    pub habit_key: String,
    pub change_id: String,
    pub target_binding: String,
    pub expected_revision: Option<String>,
    pub settings: HabitSettings,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitGoalRevision {
    pub effective_date: String,
    /// A source history entry establishes only its named week, not intervening gaps.
    #[serde(default)]
    pub valid_through: Option<String>,
    pub goal: HabitGoal,
}
impl HabitGoalRevision {
    pub fn applies_on(&self, date: &str) -> bool {
        self.effective_date.as_str() <= date
            && self.valid_through.as_deref().is_none_or(|end| date <= end)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitDefinition {
    pub key: String,
    pub settings: HabitSettings,
    pub active: bool,
    pub sourced: bool,
    #[serde(default)]
    pub source_name: Option<String>,
    #[serde(default)]
    pub source_localized_names: crate::habits::HabitLocalizedNames,
    pub source_labels: Vec<String>,
    pub source_goal_history: Vec<HabitGoalContextView>,
    pub goal_revisions: Vec<HabitGoalRevision>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitCatalogReceipt {
    pub input: HabitDefinitionMutationInput,
    pub saved_at: String,
    pub lived_date: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitCatalogDocument {
    pub schema_version: u32,
    pub habits: Vec<HabitDefinition>,
    pub receipts: Vec<HabitCatalogReceipt>,
}

impl Default for HabitCatalogDocument {
    fn default() -> Self {
        Self {
            schema_version: 1,
            habits: vec![],
            receipts: vec![],
        }
    }
}

impl HabitCatalogDocument {
    pub fn parse(bytes: &[u8]) -> Result<Self, String> {
        let catalog: Self = serde_json::from_slice(bytes)
            .map_err(|error| format!("Habit catalog 无效，原文件保留：{error}"))?;
        if catalog.schema_version != 1 {
            return Err("Habit catalog 版本不支持；原文件保留。".into());
        }
        let mut keys = HashSet::new();
        for habit in &catalog.habits {
            validate_habit_key(&habit.key)?;
            if !keys.insert(&habit.key) {
                return Err("Habit catalog 重复身份；原文件保留。".into());
            }
            habit.settings.validate()?;
            if habit.goal_revisions.is_empty() {
                return Err("Habit catalog 缺少目标历史。".into());
            }
            let mut previous: Option<&str> = None;
            for revision in &habit.goal_revisions {
                if revision.valid_through.as_deref().is_some_and(|end| {
                    CalendarDate::parse(end).is_none() || end < revision.effective_date.as_str()
                }) {
                    return Err("Habit 目标覆盖日期无效。".into());
                }
                if CalendarDate::parse(&revision.effective_date).is_none()
                    || previous.is_some_and(|p| p >= revision.effective_date.as_str())
                {
                    return Err("Habit catalog 目标历史日期无效。".into());
                }
                revision.goal.validate()?;
                previous = Some(&revision.effective_date);
            }
        }
        let mut operations = HashSet::new();
        for receipt in &catalog.receipts {
            receipt.input.settings.validate()?;
            validate_habit_key(&receipt.input.habit_key)?;
            validate_local_identifier(&receipt.input.change_id, "Habit operation")?;
            validate_timestamp_label(&receipt.saved_at)?;
            if CalendarDate::parse(&receipt.lived_date).is_none() {
                return Err("Habit 操作 lived date 无效。".into());
            }
            if !operations.insert(&receipt.input.change_id) {
                return Err("Habit catalog 重复操作身份。".into());
            }
        }
        Ok(catalog)
    }

    pub fn apply(
        &mut self,
        input: HabitDefinitionMutationInput,
        source: Option<&HabitView>,
        today: &str,
        now: &str,
    ) -> Result<(), String> {
        input.settings.validate()?;
        validate_local_identifier(&input.habit_key, "Habit key")?;
        validate_local_identifier(&input.change_id, "Habit operation")?;
        if let Some(definition) = self
            .habits
            .iter_mut()
            .find(|habit| habit.key == input.habit_key)
        {
            let current = definition
                .goal_revisions
                .iter()
                .rev()
                .find(|revision| revision.applies_on(today))
                .cloned();
            if let Some(current) = current {
                let boundary = current
                    .goal
                    .next_boundary(CalendarDate::parse(today).ok_or("Invalid lived date")?)
                    .to_string();
                definition
                    .goal_revisions
                    .retain(|revision| revision.effective_date.as_str() <= today);
                if input.settings.goal != current.goal {
                    definition.goal_revisions.push(HabitGoalRevision {
                        valid_through: None,
                        effective_date: boundary,
                        goal: input.settings.goal.clone(),
                    });
                }
            } else {
                // Before first activation, replace the initial plan without claiming a completed cycle.
                definition.goal_revisions = vec![HabitGoalRevision {
                    valid_through: None,
                    effective_date: input.settings.start_date.clone(),
                    goal: input.settings.goal.clone(),
                }];
            }
            definition.settings = input.settings.clone();
        } else {
            let mut revisions = source
                .map(|habit| habit.goal_revisions.clone())
                .unwrap_or_default();
            if let Some(source) = source {
                let current = source
                    .current_goal
                    .clone()
                    .unwrap_or(HabitGoal::Unconfigured);
                if revisions.is_empty() {
                    revisions.push(HabitGoalRevision {
                        valid_through: None,
                        effective_date: today.into(),
                        goal: current.clone(),
                    });
                }
                if input.settings.goal != current {
                    revisions.push(HabitGoalRevision {
                        valid_through: None,
                        effective_date: current
                            .next_boundary(CalendarDate::parse(today).ok_or("Invalid lived date")?)
                            .to_string(),
                        goal: input.settings.goal.clone(),
                    });
                }
            } else {
                revisions.push(HabitGoalRevision {
                    valid_through: None,
                    effective_date: input.settings.start_date.clone(),
                    goal: input.settings.goal.clone(),
                });
            }
            self.habits.push(HabitDefinition {
                key: input.habit_key.clone(),
                settings: input.settings.clone(),
                active: source.is_none_or(|s| s.active),
                source_name: source.map(|s| s.name.clone()),
                source_localized_names: source
                    .map(|s| s.localized_names.clone())
                    .unwrap_or_default(),
                sourced: source.is_some(),
                source_labels: source.map(|s| s.source_labels.clone()).unwrap_or_default(),
                source_goal_history: source.map(|s| s.goal_history.clone()).unwrap_or_default(),
                goal_revisions: revisions,
            });
        }
        self.receipts.push(HabitCatalogReceipt {
            input,
            saved_at: now.into(),
            lived_date: today.into(),
        });
        Ok(())
    }
}

pub fn catalog_binding(path: &std::path::Path) -> String {
    format!(
        "habit-catalog:{}",
        document_revision(path.to_string_lossy().as_bytes())
    )
}

pub fn overlay_catalog(
    view: &mut HabitSnapshotView,
    catalog: &HabitCatalogDocument,
    today: &str,
    completions: &[LocalHabitCompletion],
) {
    for definition in &catalog.habits {
        if !view.habits.iter().any(|habit| habit.key == definition.key) {
            view.habits.push(crate::habits::project_local_definition(
                definition,
                today,
                completions,
            ));
        }
        let habit = view
            .habits
            .iter_mut()
            .find(|habit| habit.key == definition.key)
            .unwrap();
        let source_revisions = habit.goal_revisions.clone();
        let date = CalendarDate::parse(today).expect("valid lived date");
        let window_start = date.monday().plus_days(-77).to_string();
        let window_end = date.monday().plus_days(6).to_string();
        let fallback = crate::habits::project_local_definition(definition, today, completions);
        for cell in fallback.history {
            if !habit
                .history
                .iter()
                .any(|previous| previous.date == cell.date)
            {
                habit.history.push(cell);
            }
        }
        habit
            .history
            .retain(|cell| cell.date >= window_start && cell.date <= window_end);
        habit.history.sort_by(|a, b| a.date.cmp(&b.date));
        for cell in &mut habit.history {
            if cell.date.as_str() <= today {
                crate::habits::reconcile_local_completion(
                    cell,
                    completions.iter().find(|completion| {
                        completion.key == definition.key && completion.date == cell.date
                    }),
                );
            }
            let applicable = definition
                .goal_revisions
                .iter()
                .rev()
                .find(|r| r.applies_on(&cell.date));
            let source_goal = source_revisions
                .iter()
                .rev()
                .find(|r| r.applies_on(&cell.date))
                .map(|r| &r.goal);
            if let Some(revision) = applicable {
                apply_goal_to_cell(cell, &revision.goal, source_goal);
            }
        }
        habit.today = habit
            .history
            .iter()
            .find(|c| c.date == today)
            .unwrap()
            .clone();
        habit.recent = habit
            .history
            .iter()
            .filter(|cell| {
                cell.date.as_str() >= date.plus_days(-6).to_string().as_str()
                    && cell.date.as_str() <= today
            })
            .cloned()
            .collect();
        habit.name = definition.settings.name.clone();
        habit.localized_names =
            if definition.source_name.as_ref() == Some(&definition.settings.name) {
                definition.source_localized_names.clone()
            } else {
                Default::default()
            };
        habit.active = definition.active;
        habit.locally_configured = true;
        for label in &definition.source_labels {
            if !habit.source_labels.contains(label) {
                habit.source_labels.push(label.clone());
            }
        }
        habit.settings = Some(definition.settings.clone());
        habit.goal_revisions = definition.goal_revisions.clone();
        habit.current_goal = definition
            .goal_revisions
            .iter()
            .rev()
            .find(|r| r.applies_on(today))
            .map(|r| r.goal.clone());
        habit.pending_goal = definition
            .goal_revisions
            .iter()
            .find(|r| r.effective_date.as_str() > today)
            .cloned();
        habit.can_record_completion = false;
        if let Some(goal) = &habit.current_goal {
            let applicable = definition
                .goal_revisions
                .iter()
                .rev()
                .find(|r| r.applies_on(today))
                .unwrap();
            let cycle_start = match goal {
                HabitGoal::WeeklyDays { .. } => {
                    CalendarDate::parse(today).unwrap().monday().to_string()
                }
                _ => today.into(),
            };
            habit.partial_cycle = applicable.effective_date > cycle_start
                || definition.settings.start_date > cycle_start;
            habit.goal_label = goal.label();
            habit.goal_kind = match goal {
                HabitGoal::WeeklyDays { .. } => "weekly-count",
                HabitGoal::DailyTime { .. } => "daily-time",
                _ => "daily-completion",
            }
            .into();
            habit.weekly_target = match goal {
                HabitGoal::WeeklyDays { days } => Some(*days),
                _ => None,
            };
            habit.completed_count = habit.weekly_target.map(|_| {
                habit
                    .history
                    .iter()
                    .filter(|c| {
                        c.date.as_str()
                            >= CalendarDate::parse(today)
                                .unwrap()
                                .monday()
                                .to_string()
                                .as_str()
                            && c.date.as_str() >= applicable.effective_date.as_str()
                            && c.date.as_str() <= today
                            && c.counts_as_completion
                    })
                    .count() as u32
            });
            habit.can_record_completion = definition.active
                && definition.settings.start_date.as_str() <= today
                && !matches!(
                    goal,
                    HabitGoal::Unconfigured
                        | HabitGoal::DailyTime {
                            day_relation: DayRelation::Unresolved,
                            ..
                        }
                );
        }
    }
    view.summary.known_completions = view
        .habits
        .iter()
        .filter(|h| h.active && h.weekly_target.is_some())
        .filter_map(|h| h.completed_count)
        .sum();
    view.summary.target_completions = view
        .habits
        .iter()
        .filter(|h| h.active)
        .filter_map(|h| h.weekly_target)
        .sum();
}

/// Evaluate threshold evidence without turning a save timestamp into activity time.
/// Unknown date relations and conflicting source observations remain unknown.
pub(crate) fn apply_goal_to_cell(
    cell: &mut crate::habits::HabitCellView,
    goal: &HabitGoal,
    source_goal: Option<&HabitGoal>,
) {
    use crate::habits::{HabitCellStatus, HabitDetailView, HabitLocalCompletionState};
    let HabitGoal::DailyTime { time, day_relation } = goal else {
        return;
    };
    if *day_relation == DayRelation::Unresolved || cell.status == HabitCellStatus::Conflict {
        cell.counts_as_completion = false;
        return;
    }
    let minutes = |time: &str, relation: DayRelation| -> Option<u32> {
        if relation == DayRelation::Unresolved {
            return None;
        }
        let (hour, minute) = time.split_once(':')?;
        Some(
            hour.parse::<u32>().ok()? * 60
                + minute.parse::<u32>().ok()?
                + if relation == DayRelation::NextDay {
                    1440
                } else {
                    0
                },
        )
    };
    let target = minutes(time, *day_relation).unwrap();
    let actual_met = cell.details.iter().any(|detail| match detail {
        HabitDetailView::ActualTime {
            day_relation,
            local_time,
            ..
        } => minutes(local_time, *day_relation).is_some_and(|actual| actual <= target),
        _ => false,
    });
    let threshold_met = cell.status == HabitCellStatus::ThresholdOnly
        && match source_goal {
            Some(HabitGoal::DailyTime { time, day_relation }) => {
                minutes(time, *day_relation).is_some_and(|source_target| source_target <= target)
            }
            _ => false,
        };
    let external_met = cell.has_external_completion || actual_met || threshold_met;
    cell.has_external_completion = external_met;
    cell.counts_as_completion =
        external_met || cell.local_completion_state == HabitLocalCompletionState::Completed;
    if actual_met || threshold_met {
        for detail in &cell.details {
            if let HabitDetailView::Observation { source_label, .. } = detail {
                if !cell.completion_source_labels.contains(source_label) {
                    cell.completion_source_labels.push(source_label.clone());
                }
            }
        }
    }
    if cell.local_completion_state == HabitLocalCompletionState::Completed
        && cell.actual_time_label.is_none()
    {
        cell.status = HabitCellStatus::ThresholdOnly;
    }
}
