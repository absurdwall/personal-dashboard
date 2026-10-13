//! Canonical local Habit settings. Source snapshots remain read-only evidence.
use crate::habits::{DayRelation, HabitGoalContextView, HabitSnapshotView, HabitView, LocalHabitCompletion};
use crate::today::{CalendarDate, document_revision, validate_local_identifier};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

pub const HABIT_CATALOG_RELATIVE_PATH: &str = "life/.personal-dashboard/habit-catalog/v1/catalog.json";

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(tag = "kind", rename_all = "kebab-case", rename_all_fields = "camelCase", deny_unknown_fields)]
pub enum HabitGoal {
    DailyCompletion,
    WeeklyDays { days: u32 },
    DailyTime { time: String, day_relation: DayRelation },
    Unconfigured,
}

impl HabitGoal {
    pub fn label(&self) -> String {
        match self {
            Self::DailyCompletion => "每天完成".into(),
            Self::WeeklyDays { days } => format!("每周 {days} 个达标天"),
            Self::DailyTime { time, day_relation } => format!("每日 {}{time}", match day_relation {
                DayRelation::SameDay => "", DayRelation::NextDay => "次日 ", DayRelation::Unresolved => "日期归属待解释 · ",
            }),
            Self::Unconfigured => "未配置目标".into(),
        }
    }
    pub fn next_boundary(&self, date: CalendarDate) -> CalendarDate {
        match self { Self::WeeklyDays { .. } => date.monday().plus_days(7), _ => date.plus_days(1) }
    }
    pub fn validate(&self) -> Result<(), String> {
        match self {
            Self::WeeklyDays { days } if !(1..=7).contains(days) => Err("每周目标须为 1–7 个不同达标天。".into()),
            Self::DailyTime { time, .. } if time.len() != 5 || time.as_bytes()[2] != b':' ||
                time[..2].parse::<u32>().ok().is_none_or(|hour| hour > 23) ||
                time[3..].parse::<u32>().ok().is_none_or(|minute| minute > 59) => Err("请输入有效目标时刻 HH:mm。".into()),
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
        if self.name.trim().is_empty() || self.name.len() > 200 { return Err("习惯名称缺失或过长。".into()); }
        if self.emoji.as_ref().is_some_and(|s| s.len() > 80) || self.group.as_ref().is_some_and(|s| s.len() > 200) {
            return Err("图标或分组过长。".into());
        }
        if CalendarDate::parse(&self.start_date).is_none() { return Err("开始日期无效。".into()); }
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
    pub goal: HabitGoal,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitDefinition {
    pub key: String,
    pub settings: HabitSettings,
    pub active: bool,
    pub sourced: bool,
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
    fn default() -> Self { Self { schema_version: 1, habits: vec![], receipts: vec![] } }
}

impl HabitCatalogDocument {
    pub fn parse(bytes: &[u8]) -> Result<Self, String> {
        let catalog: Self = serde_json::from_slice(bytes).map_err(|error| format!("Habit catalog 无效，原文件保留：{error}"))?;
        if catalog.schema_version != 1 { return Err("Habit catalog 版本不支持；原文件保留。".into()); }
        let mut keys = HashSet::new();
        for habit in &catalog.habits {
            validate_local_identifier(&habit.key, "Habit key")?;
            if !keys.insert(&habit.key) { return Err("Habit catalog 重复身份；原文件保留。".into()); }
            habit.settings.validate()?;
            if habit.goal_revisions.is_empty() { return Err("Habit catalog 缺少目标历史。".into()); }
            let mut previous: Option<&str> = None;
            for revision in &habit.goal_revisions {
                if CalendarDate::parse(&revision.effective_date).is_none() || previous.is_some_and(|p| p >= revision.effective_date.as_str()) {
                    return Err("Habit catalog 目标历史日期无效。".into());
                }
                revision.goal.validate()?;
                previous = Some(&revision.effective_date);
            }
        }
        let mut operations = HashSet::new();
        for receipt in &catalog.receipts {
            receipt.input.settings.validate()?;
            if !operations.insert(&receipt.input.change_id) { return Err("Habit catalog 重复操作身份。".into()); }
        }
        Ok(catalog)
    }

    pub fn apply(&mut self, input: HabitDefinitionMutationInput, source: Option<&HabitView>, today: &str, now: &str) -> Result<(), String> {
        input.settings.validate()?;
        validate_local_identifier(&input.habit_key, "Habit key")?;
        validate_local_identifier(&input.change_id, "Habit operation")?;
        if let Some(definition) = self.habits.iter_mut().find(|habit| habit.key == input.habit_key) {
            definition.settings = input.settings.clone();
        } else {
            self.habits.push(HabitDefinition {
                key: input.habit_key.clone(), settings: input.settings.clone(), active: source.is_none_or(|s| s.active),
                sourced: source.is_some(), source_labels: source.map(|s| s.source_labels.clone()).unwrap_or_default(),
                source_goal_history: source.map(|s| s.goal_history.clone()).unwrap_or_default(),
                goal_revisions: vec![HabitGoalRevision { effective_date: input.settings.start_date.clone(), goal: input.settings.goal.clone() }],
            });
        }
        self.receipts.push(HabitCatalogReceipt { input, saved_at: now.into(), lived_date: today.into() });
        Ok(())
    }
}

pub fn catalog_binding(path: &std::path::Path) -> String {
    format!("habit-catalog:{}", document_revision(path.to_string_lossy().as_bytes()))
}

pub fn overlay_catalog(view: &mut HabitSnapshotView, catalog: &HabitCatalogDocument, today: &str, completions: &[LocalHabitCompletion]) {
    for definition in &catalog.habits {
        if !view.habits.iter().any(|habit| habit.key == definition.key) {
            view.habits.push(crate::habits::project_local_definition(definition, today, completions));
        }
        let habit = view.habits.iter_mut().find(|habit| habit.key == definition.key).unwrap();
        habit.name = definition.settings.name.clone();
        habit.localized_names = Default::default(); // explicit local name overrides display-name fallback; language config file is retained
        habit.active = definition.active;
        habit.settings = Some(definition.settings.clone());
        habit.goal_revisions = definition.goal_revisions.clone();
        habit.current_goal = definition.goal_revisions.iter().rev().find(|r| r.effective_date.as_str() <= today).map(|r| r.goal.clone());
        habit.pending_goal = definition.goal_revisions.iter().find(|r| r.effective_date.as_str() > today).cloned();
        if let Some(goal) = &habit.current_goal {
            habit.goal_label = goal.label();
            habit.goal_kind = match goal { HabitGoal::WeeklyDays { .. } => "weekly-count", HabitGoal::DailyTime { .. } => "daily-time", _ => "daily-completion" }.into();
            habit.weekly_target = match goal { HabitGoal::WeeklyDays { days } => Some(*days), _ => None };
            habit.completed_count = habit.weekly_target.map(|_| habit.history.iter().filter(|c| c.date.as_str() >= CalendarDate::parse(today).unwrap().monday().to_string().as_str() && c.date.as_str() <= today && c.counts_as_completion).count() as u32);
            habit.can_record_completion = !matches!(goal, HabitGoal::Unconfigured);
        }
    }
    view.summary.known_completions = view.habits.iter().filter(|h| h.active).filter_map(|h| h.completed_count).sum();
    view.summary.target_completions = view.habits.iter().filter(|h| h.active).filter_map(|h| h.weekly_target).sum();
}
