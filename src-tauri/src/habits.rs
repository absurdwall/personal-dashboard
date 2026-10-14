use crate::today::CalendarDate;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::fs;
use std::path::Path;

pub const SNAPSHOT_RELATIVE_PATH: &str = "life/.personal-dashboard/derived/habits-v1.json";
pub const LEGACY_SNAPSHOT_RELATIVE_PATH: &str = ".personal-dashboard/derived/habits-v1.json";
pub const HABIT_NAMES_RELATIVE_PATH: &str = "life/.personal-dashboard/habit-names/v1/names.json";
pub const HABIT_DEFINITIONS_RELATIVE_PATH: &str = "life/.personal-dashboard/habits/v1/catalog.json";
const SNAPSHOT_SCHEMA_VERSION: u32 = 1;
const HABIT_NAMES_SCHEMA_VERSION: u32 = 1;
const HABIT_DEFINITIONS_SCHEMA_VERSION: u32 = 1;
const HISTORY_WEEKS: i64 = 12;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
pub enum LocalHabitGoal {
    DailyCount,
    WeeklyCount {
        days: u8,
    },
    DailyTime {
        standard: String,
        day_relation: DayRelation,
    },
}

impl LocalHabitGoal {
    pub fn label(&self) -> String {
        match self {
            Self::DailyCount => "每日完成".into(),
            Self::WeeklyCount { days } => format!("每周 {days} 天"),
            Self::DailyTime {
                standard,
                day_relation,
            } => match day_relation {
                DayRelation::SameDay => format!("每日 {standard}"),
                DayRelation::NextDay => format!("每日 次日 {standard}"),
                DayRelation::Unresolved => format!("每日 {standard} · 日期归属待解释"),
            },
        }
    }

    pub fn kind_label(&self) -> &'static str {
        match self {
            Self::DailyCount => "daily-count",
            Self::WeeklyCount { .. } => "weekly-count",
            Self::DailyTime { .. } => "daily-time",
        }
    }

    pub fn allows_completion(&self) -> bool {
        matches!(self, Self::DailyCount | Self::WeeklyCount { .. })
    }

    pub fn validate(&self) -> Result<(), String> {
        match self {
            Self::DailyCount => Ok(()),
            Self::WeeklyCount { days } if (1..=7).contains(days) => Ok(()),
            Self::WeeklyCount { .. } => Err("每周目标必须是 1 至 7 个不同达标日。".into()),
            Self::DailyTime { standard, .. } if valid_time(standard) => Ok(()),
            Self::DailyTime { .. } => Err("每日目标时刻必须使用 HH:mm。".into()),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LocalHabitGoalHistory {
    pub week_of: String,
    pub label: String,
    pub goal: LocalHabitGoal,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum LocalHabitRevisionDisposition {
    Scheduled,
    Superseded,
    Cancelled,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LocalHabitGoalRevision {
    pub id: String,
    pub goal: Option<LocalHabitGoal>,
    pub effective_on: String,
    pub changed_at: String,
    pub disposition: LocalHabitRevisionDisposition,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LocalHabitDefinition {
    pub key: String,
    pub name: String,
    pub emoji: Option<String>,
    pub group: Option<String>,
    pub start_date: Option<String>,
    pub created_locally: bool,
    pub base_goal: Option<LocalHabitGoal>,
    pub source_goal_history: Vec<LocalHabitGoalHistory>,
    pub goal_revisions: Vec<LocalHabitGoalRevision>,
}

impl LocalHabitDefinition {
    pub fn goal_on(&self, date: &str) -> Option<LocalHabitGoal> {
        let current_revision = self
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
        current_revision
            .map(|revision| revision.goal.clone())
            .unwrap_or_else(|| self.base_goal.clone())
    }

    pub fn pending_goal(&self, date: &str) -> Option<&LocalHabitGoalRevision> {
        self.goal_revisions
            .iter()
            .filter(|revision| {
                revision.disposition == LocalHabitRevisionDisposition::Scheduled
                    && revision.effective_on.as_str() > date
            })
            .min_by(|left, right| {
                left.effective_on
                    .cmp(&right.effective_on)
                    .then_with(|| left.changed_at.cmp(&right.changed_at))
            })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LocalHabitOperationReceipt {
    pub id: String,
    pub fingerprint: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LocalHabitDefinitionsDocument {
    pub schema_version: u32,
    pub habits: Vec<LocalHabitDefinition>,
    pub operations: Vec<LocalHabitOperationReceipt>,
}

impl Default for LocalHabitDefinitionsDocument {
    fn default() -> Self {
        Self {
            schema_version: HABIT_DEFINITIONS_SCHEMA_VERSION,
            habits: Vec::new(),
            operations: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LocalHabitSource {
    pub name: String,
    pub goal: Option<LocalHabitGoal>,
    pub goal_history: Vec<LocalHabitGoalHistory>,
}

// Snapshot v1 retains this verified association in the existing source label.
// Keep its encoder and readers together without changing the persisted schema.
pub(crate) fn explicit_dida_mapping_label(key: &str, id: &str) -> String {
    format!("Dida365 explicit mapping {key}={id}")
}

pub(crate) fn explicit_dida_mapping_id<'a>(label: &'a str, key: &str) -> Option<&'a str> {
    let id = label.strip_prefix(&explicit_dida_mapping_label(key, ""))?;
    (!id.is_empty() && id.len() <= 160 && !id.contains(char::is_whitespace)).then_some(id)
}

pub trait HabitSnapshotStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String>;
}

#[derive(Clone, Copy)]
pub struct FileHabitSnapshotStore;

impl HabitSnapshotStore for FileHabitSnapshotStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        match fs::read(path) {
            Ok(document) => Ok(Some(document)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(format!("无法读取 Habits 快照：{error}")),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum HabitNamesConfigurationState {
    Missing,
    Ready,
    Invalid,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitLocalizedNames {
    #[serde(default)]
    pub zh: Option<String>,
    #[serde(default)]
    pub en: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HabitNamesConfiguration {
    pub state: HabitNamesConfigurationState,
    pub names: BTreeMap<String, HabitLocalizedNames>,
}

impl Default for HabitNamesConfiguration {
    fn default() -> Self {
        Self {
            state: HabitNamesConfigurationState::Missing,
            names: BTreeMap::new(),
        }
    }
}

impl HabitNamesConfiguration {
    fn names_for(&self, key: &str) -> HabitLocalizedNames {
        self.names.get(key).cloned().unwrap_or_default()
    }
}

pub fn parse_local_habit_definitions(
    bytes: &[u8],
    current_timestamp: &str,
) -> Result<LocalHabitDefinitionsDocument, String> {
    let document: LocalHabitDefinitionsDocument = serde_json::from_slice(bytes)
        .map_err(|error| format!("本地 Habit catalog 不是有效的 schema v1 JSON：{error}"))?;
    if document.schema_version != HABIT_DEFINITIONS_SCHEMA_VERSION {
        return Err(format!(
            "本地 Habit catalog schemaVersion {} 不受支持；当前只读取版本 1。",
            document.schema_version
        ));
    }
    let now = timestamp_epoch_seconds(current_timestamp)
        .ok_or_else(|| "当前本地时间缺少有效 UTC offset。".to_string())?;
    let mut keys = HashSet::new();
    let mut revision_ids = HashSet::new();
    for habit in &document.habits {
        validate_key(&habit.key, "local Habit key")?;
        if !keys.insert(habit.key.as_str()) {
            return Err(format!(
                "本地 Habit catalog 有重复稳定 key：{}。",
                habit.key
            ));
        }
        validate_text(&habit.name, "local Habit name")?;
        if habit.name.trim().chars().count() > 80 {
            return Err("本地 Habit 名称不能超过 80 个字符。".into());
        }
        if let Some(emoji) = habit.emoji.as_deref() {
            let trimmed = emoji.trim();
            if trimmed.is_empty()
                || trimmed.chars().count() > 8
                || trimmed.chars().any(char::is_control)
            {
                return Err("Habit emoji 只能是一个简短、非空的图标。".into());
            }
        }
        if let Some(group) = habit.group.as_deref() {
            if group.trim().is_empty() || group.trim().chars().count() > 48 {
                return Err("Habit 分组名称必须是 1 至 48 个字符。".into());
            }
        }
        if habit
            .start_date
            .as_deref()
            .is_some_and(|date| CalendarDate::parse(date).is_none())
        {
            return Err(format!("Habit {} 的开始日期无效。", habit.key));
        }
        if let Some(goal) = &habit.base_goal {
            goal.validate()?;
        }
        let mut source_weeks = HashSet::new();
        for context in &habit.source_goal_history {
            let week = CalendarDate::parse(&context.week_of)
                .ok_or_else(|| format!("Habit {} 的历史目标周日期无效。", habit.key))?;
            if week.monday() != week || !source_weeks.insert(context.week_of.as_str()) {
                return Err(format!(
                    "Habit {} 的历史目标周必须唯一且从周一开始。",
                    habit.key
                ));
            }
            validate_text(&context.label, "local Habit historical goal label")?;
            context.goal.validate()?;
        }
        for revision in &habit.goal_revisions {
            validate_local_id(&revision.id, "Habit goal revision id")?;
            if !revision_ids.insert(revision.id.as_str()) {
                return Err(format!(
                    "本地 Habit catalog 有重复目标修订 id：{}。",
                    revision.id
                ));
            }
            if let Some(goal) = &revision.goal {
                goal.validate()?;
            }
            if CalendarDate::parse(&revision.effective_on).is_none() {
                return Err(format!("Habit {} 有无效的目标生效日期。", habit.key));
            }
            let changed_at = timestamp_epoch_seconds(&revision.changed_at)
                .ok_or_else(|| format!("Habit {} 的目标修订时间缺少 UTC offset。", habit.key))?;
            if changed_at > now {
                return Err(format!("Habit {} 的目标修订时间晚于当前时间。", habit.key));
            }
        }
    }
    let mut operation_ids = HashSet::new();
    for operation in &document.operations {
        validate_local_id(&operation.id, "Habit operation id")?;
        if !operation_ids.insert(operation.id.as_str()) {
            return Err(format!(
                "本地 Habit catalog 有重复操作 id：{}。",
                operation.id
            ));
        }
        if operation.fingerprint.len() != 16
            || !operation
                .fingerprint
                .bytes()
                .all(|byte| byte.is_ascii_hexdigit())
        {
            return Err("本地 Habit catalog 的操作收据指纹无效。".into());
        }
    }
    Ok(document)
}

fn validate_local_id(value: &str, label: &str) -> Result<(), String> {
    if value.is_empty()
        || value.len() > 96
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err(format!("{label}格式无效。"));
    }
    Ok(())
}

pub fn local_habit_source(
    snapshot: &[u8],
    key: &str,
    today: &str,
    local_date: &str,
) -> Result<Option<LocalHabitSource>, String> {
    let snapshot = parse_and_validate_at_local_date(snapshot, today, local_date)?;
    Ok(snapshot
        .habits
        .iter()
        .find(|habit| habit.key == key)
        .map(|habit| LocalHabitSource {
            name: habit.name.clone(),
            goal: snapshot_local_goal(habit),
            goal_history: habit
                .goal_history
                .iter()
                .filter_map(|context| {
                    Some(LocalHabitGoalHistory {
                        week_of: context.week_of.clone(),
                        label: context.label.clone(),
                        goal: snapshot_goal(&context.goal)?,
                    })
                })
                .collect(),
        }))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HabitNamesDocument {
    schema_version: u32,
    habits: BTreeMap<String, HabitLocalizedNames>,
}

pub fn load_habit_names(vault: &Path) -> HabitNamesConfiguration {
    let path = vault.join(HABIT_NAMES_RELATIVE_PATH);
    let document = match fs::read(path) {
        Ok(document) => document,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
            return HabitNamesConfiguration::default()
        }
        Err(_) => {
            return HabitNamesConfiguration {
                state: HabitNamesConfigurationState::Invalid,
                names: BTreeMap::new(),
            }
        }
    };
    match parse_habit_names_document(&document) {
        Ok(names) => HabitNamesConfiguration {
            state: HabitNamesConfigurationState::Ready,
            names,
        },
        Err(_) => HabitNamesConfiguration {
            state: HabitNamesConfigurationState::Invalid,
            names: BTreeMap::new(),
        },
    }
}

fn parse_habit_names_document(
    document: &[u8],
) -> Result<BTreeMap<String, HabitLocalizedNames>, String> {
    let document: HabitNamesDocument = serde_json::from_slice(document)
        .map_err(|error| format!("习惯名称配置不是有效 JSON：{error}"))?;
    if document.schema_version != HABIT_NAMES_SCHEMA_VERSION {
        return Err(format!(
            "习惯名称配置使用不支持的 schema 版本 {}。",
            document.schema_version
        ));
    }
    for (key, names) in &document.habits {
        if !is_valid_habit_key(key) {
            return Err("习惯名称配置包含无效的稳定 habit key。".into());
        }
        if names.zh.is_none() && names.en.is_none() {
            return Err(format!("习惯 {key} 至少需要一个本地化名称。"));
        }
        for name in [&names.zh, &names.en].into_iter().flatten() {
            if name.trim().is_empty() || name.len() > 200 {
                return Err(format!("习惯 {key} 的本地化名称缺失或过长。"));
            }
        }
    }
    Ok(document.habits)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum HabitSnapshotState {
    Unconfigured,
    Missing,
    Ready,
    Stale,
    Retained,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum HabitCellStatus {
    Unknown,
    Completed,
    NotDone,
    Conflict,
    Partial,
    Baseline,
    Unavailable,
    ActualTime,
    ThresholdOnly,
    RecordOnly,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum HabitLocalCompletionState {
    None,
    Completed,
    Withdrawn,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitCellView {
    pub date: String,
    pub coverage: String,
    pub status: HabitCellStatus,
    pub has_record: bool,
    pub counts_as_completion: bool,
    pub local_completion_state: HabitLocalCompletionState,
    pub has_external_completion: bool,
    pub completion_source_labels: Vec<String>,
    pub actual_time_label: Option<String>,
    pub details: Vec<HabitDetailView>,
    pub local_records: Vec<HabitLocalRecordView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum HabitDetailView {
    Future,
    Observation {
        source_label: String,
        status: ObservationStatus,
        evidence: EvidenceKind,
        observed_at: String,
        note: Option<String>,
    },
    ActualTime {
        day_relation: DayRelation,
        local_time: String,
        utc_offset_minutes: Option<i32>,
    },
    LocalRecord {
        source_label: String,
        text: String,
    },
    LocalCompletion {
        state: HabitLocalCompletionState,
        changed_at: String,
    },
    Conflict,
    NoRecord,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitLocalRecordView {
    pub id: String,
    pub source_label: String,
    pub text: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitGoalContextView {
    pub week_of: String,
    pub label: String,
    pub goal_label: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitView {
    pub key: String,
    pub name: String,
    pub localized_names: HabitLocalizedNames,
    pub is_local_definition: bool,
    pub created_locally: bool,
    pub emoji: Option<String>,
    pub group: Option<String>,
    pub start_date: Option<String>,
    pub current_goal: Option<LocalHabitGoal>,
    pub pending_goal: Option<LocalHabitGoal>,
    pub pending_goal_label: Option<String>,
    pub active: bool,
    pub goal_kind: String,
    pub goal_label: String,
    pub weekly_target: Option<u32>,
    pub completed_count: Option<u32>,
    pub weekly_period_start: Option<String>,
    pub weekly_period_partial: bool,
    pub can_record_completion: bool,
    pub source_labels: Vec<String>,
    pub coverage_label: String,
    pub goal_history: Vec<HabitGoalContextView>,
    pub today: HabitCellView,
    pub recent: Vec<HabitCellView>,
    pub history: Vec<HabitCellView>,
}

impl HabitView {
    pub fn cell(&self, date: &str) -> Option<&HabitCellView> {
        self.history.iter().find(|cell| cell.date == date)
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitSummaryView {
    pub known_completions: u32,
    pub target_completions: u32,
    pub coverage_note: String,
    pub excluded_no_goal: u32,
    pub partial_weeks_excluded: u32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitSnapshotView {
    pub state: HabitSnapshotState,
    pub message: String,
    pub read_error: Option<String>,
    pub generated_at: Option<String>,
    pub current_lived_date: Option<String>,
    pub snapshot_revision: Option<String>,
    pub display_range_label: Option<String>,
    pub range_label: Option<String>,
    pub producer_label: Option<String>,
    pub completion_revision: Option<String>,
    pub completion_target_binding: Option<String>,
    pub definition_revision: Option<String>,
    pub definition_target_binding: Option<String>,
    pub names_configuration_state: HabitNamesConfigurationState,
    pub summary: HabitSummaryView,
    pub habits: Vec<HabitView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitCorrectionHabitView {
    pub key: String,
    pub name: String,
    pub localized_names: HabitLocalizedNames,
    pub name_known: bool,
    pub can_record_completion: bool,
    pub goal_label: Option<String>,
    pub local_change_count: usize,
    pub local_changes: Vec<HabitLocalCompletionChangeView>,
    pub cell: HabitCellView,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitLocalCompletionChangeView {
    pub state: HabitLocalCompletionState,
    pub changed_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitCorrectionView {
    pub state: HabitSnapshotState,
    pub message: String,
    pub date: String,
    pub can_record: bool,
    pub completion_revision: Option<String>,
    pub completion_target_binding: Option<String>,
    pub names_configuration_state: HabitNamesConfigurationState,
    pub habits: Vec<HabitCorrectionHabitView>,
}

impl HabitCorrectionView {
    pub fn habit(&self, key: &str) -> Option<&HabitCorrectionHabitView> {
        self.habits.iter().find(|habit| habit.key == key)
    }

    pub fn empty(
        date: impl Into<String>,
        state: HabitSnapshotState,
        message: impl Into<String>,
    ) -> Self {
        Self {
            state,
            message: message.into(),
            date: date.into(),
            can_record: false,
            completion_revision: None,
            completion_target_binding: None,
            names_configuration_state: HabitNamesConfigurationState::Missing,
            habits: Vec::new(),
        }
    }
}

impl HabitSnapshotView {
    pub fn habit(&self, key: &str) -> Option<&HabitView> {
        self.habits.iter().find(|habit| habit.key == key)
    }

    pub fn unconfigured() -> Self {
        Self::empty(
            HabitSnapshotState::Unconfigured,
            "请选择 Tortilla Flat vault，以读取 Habits 快照。",
        )
    }

    pub fn missing() -> Self {
        Self::empty(
            HabitSnapshotState::Missing,
            "尚无 Habits 快照。Dashboard 不会自动生成数据；请在每日流程按需生成后刷新。",
        )
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self::empty(HabitSnapshotState::Error, message)
    }

    fn empty(state: HabitSnapshotState, message: impl Into<String>) -> Self {
        Self {
            state,
            message: message.into(),
            read_error: None,
            generated_at: None,
            current_lived_date: None,
            snapshot_revision: None,
            display_range_label: None,
            range_label: None,
            producer_label: None,
            completion_revision: None,
            completion_target_binding: None,
            definition_revision: None,
            definition_target_binding: None,
            names_configuration_state: HabitNamesConfigurationState::Missing,
            summary: HabitSummaryView::default(),
            habits: Vec::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct LocalHabitRecord {
    pub id: String,
    pub key: String,
    pub date: String,
    pub source_label: String,
    pub text: String,
}

#[derive(Debug, Clone)]
pub struct LocalHabitCompletion {
    pub key: String,
    pub date: String,
    pub state: HabitLocalCompletionState,
    pub changed_at: String,
    pub change_count: usize,
    pub changes: Vec<HabitLocalCompletionChangeView>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SnapshotDocument {
    schema_version: u32,
    generated_at: String,
    range: SnapshotRange,
    producer: Producer,
    sources: Vec<Source>,
    habits: Vec<Habit>,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct SnapshotRange {
    from: String,
    to: String,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Producer {
    kind: String,
    label: String,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum SourceKind {
    Dida365,
    Manual,
    Dashboard,
    Other,
}

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields)]
struct Source {
    key: String,
    kind: SourceKind,
    label: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Habit {
    key: String,
    name: String,
    active: bool,
    tracking_kind: TrackingKind,
    goal: Option<Goal>,
    #[serde(default)]
    goal_history: Vec<GoalContext>,
    days: Vec<HabitDay>,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum TrackingKind {
    WeeklyCount,
    DailyTime,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "kind", rename_all = "kebab-case", deny_unknown_fields)]
enum Goal {
    WeeklyCount {
        standard: u32,
    },
    DailyTime {
        standard: String,
        #[serde(rename = "dayRelation")]
        day_relation: DayRelation,
    },
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct GoalContext {
    week_of: String,
    label: String,
    goal: Goal,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum Coverage {
    Complete,
    Partial,
    Unavailable,
    Unknown,
}

impl Coverage {
    fn label(self) -> &'static str {
        match self {
            Self::Complete => "complete",
            Self::Partial => "partial",
            Self::Unavailable => "unavailable",
            Self::Unknown => "unknown",
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HabitDay {
    lived_date: String,
    coverage: Coverage,
    observations: Vec<Observation>,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum ObservationStatus {
    Completed,
    NotDone,
    Partial,
    Baseline,
    Unavailable,
    ActualTime,
    ThresholdMet,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum EvidenceKind {
    CheckIn,
    ManualCompletion,
    ExplicitTime,
    ThresholdCheckIn,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum DayRelation {
    SameDay,
    NextDay,
    Unresolved,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ActualTime {
    occurred_on: String,
    local_time: String,
    utc_offset_minutes: Option<i32>,
    day_relation: DayRelation,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Observation {
    source: String,
    observed_at: String,
    status: ObservationStatus,
    evidence: EvidenceKind,
    #[serde(default)]
    actual_time: Option<ActualTime>,
    #[serde(default)]
    note: Option<String>,
}

pub fn snapshot_dates(document: &[u8], today: &str) -> Result<Vec<String>, String> {
    snapshot_dates_at_local_date(document,today,today)
}
pub fn snapshot_dates_at_local_date(
    document: &[u8],
    today: &str,
    local_date: &str,
) -> Result<Vec<String>, String> {
    let snapshot = parse_and_validate_at_local_date(document, today, local_date)?;
    let end = CalendarDate::parse(today).expect("validated current date");
    let snapshot_start =
        CalendarDate::parse(&snapshot.range.from).expect("validated snapshot start");
    let current_window_start = end.monday().plus_days(-7 * (HISTORY_WEEKS - 1));
    let start = std::cmp::max(snapshot_start, current_window_start);
    Ok((start.unix_days()..=end.unix_days())
        .map(|day| CalendarDate::from_unix_days(day).to_string())
        .collect())
}

pub fn project_snapshot(
    document: &[u8],
    today: &str,
    local_records: Vec<LocalHabitRecord>,
    local_completions: Vec<LocalHabitCompletion>,
) -> Result<HabitSnapshotView, String> {
    project_snapshot_with_names(
        document,
        today,
        local_records,
        local_completions,
        &HabitNamesConfiguration::default(),
    )
}

pub fn project_snapshot_with_names(
    document: &[u8],
    today: &str,
    local_records: Vec<LocalHabitRecord>,
    local_completions: Vec<LocalHabitCompletion>,
    names_configuration: &HabitNamesConfiguration,
) -> Result<HabitSnapshotView, String> {
    project_snapshot_with_names_at_local_date(
        document,
        today,
        today,
        local_records,
        local_completions,
        names_configuration,
    )
}

pub fn project_snapshot_with_names_at_local_date(
    document: &[u8], today: &str, local_date: &str,
    local_records: Vec<LocalHabitRecord>, local_completions: Vec<LocalHabitCompletion>,
    names_configuration: &HabitNamesConfiguration,
) -> Result<HabitSnapshotView, String> {
    let snapshot = parse_and_validate_at_local_date(document, today, local_date)?;
    let today_date = CalendarDate::parse(today).expect("validated current date");
    let week_start = today_date.monday();
    let history_start = week_start.plus_days(-7 * (HISTORY_WEEKS - 1));
    let history_end = week_start.plus_days(6);
    let source_by_key: HashMap<&str, &Source> = snapshot
        .sources
        .iter()
        .map(|source| (source.key.as_str(), source))
        .collect();
    let mut local_by_key_date: HashMap<(&str, &str), Vec<&LocalHabitRecord>> = HashMap::new();
    for record in &local_records {
        local_by_key_date
            .entry((record.key.as_str(), record.date.as_str()))
            .or_default()
            .push(record);
    }
    let local_completion_by_key_date: HashMap<(&str, &str), &LocalHabitCompletion> =
        local_completions
            .iter()
            .map(|completion| {
                (
                    (completion.key.as_str(), completion.date.as_str()),
                    completion,
                )
            })
            .collect();
    let mut summary = HabitSummaryView::default();
    let mut projected = Vec::with_capacity(snapshot.habits.len());
    let mut current_week_has_incomplete_coverage = false;

    for habit in &snapshot.habits {
        let days_by_date: HashMap<&str, &HabitDay> = habit
            .days
            .iter()
            .map(|day| (day.lived_date.as_str(), day))
            .collect();
        let mut history = Vec::with_capacity((HISTORY_WEEKS * 7) as usize);
        for unix_day in history_start.unix_days()..=history_end.unix_days() {
            let date = CalendarDate::from_unix_days(unix_day).to_string();
            let local = local_by_key_date
                .get(&(habit.key.as_str(), date.as_str()))
                .cloned()
                .unwrap_or_default();
            let local_completion = local_completion_by_key_date
                .get(&(habit.key.as_str(), date.as_str()))
                .copied();
            history.push(project_cell(
                &date,
                days_by_date.get(date.as_str()).copied(),
                &source_by_key,
                &local,
                local_completion,
                today_date,
            ));
        }
        let current_cells: Vec<&HabitCellView> = history
            .iter()
            .filter(|cell| {
                CalendarDate::parse(&cell.date)
                    .is_some_and(|date| date >= week_start && date <= today_date)
            })
            .collect();
        if current_cells.iter().any(|cell| cell.coverage != "complete") {
            current_week_has_incomplete_coverage = true;
        }
        let completed_count = (habit.tracking_kind == TrackingKind::WeeklyCount).then(|| {
            current_cells
                .iter()
                .filter(|cell| cell.counts_as_completion)
                .count() as u32
        });
        if let Some(Goal::WeeklyCount { standard }) = habit.goal {
            if let Some(count) = completed_count {
                if habit.active && standard > 0 {
                    summary.known_completions += count;
                    summary.target_completions += standard;
                }
            }
        }
        if habit.active && habit.goal.is_none() {
            summary.excluded_no_goal += 1;
        }
        let goal_kind = match habit.tracking_kind {
            TrackingKind::WeeklyCount => "weekly-count",
            TrackingKind::DailyTime => "daily-time",
        }
        .to_string();
        let current_goal_label = habit
            .goal
            .as_ref()
            .map(goal_label)
            .unwrap_or_else(|| "未配置目标 · 不计入汇总".into());
        let mut source_keys: HashSet<&str> = habit
            .days
            .iter()
            .flat_map(|day| day.observations.iter().map(|item| item.source.as_str()))
            .collect();
        // A verified producer mapping survives confirmed-empty reads and
        // withdrawal (status 0 has no completion observation).
        let mapping_key = format!("dida-{}", habit.key);
        if let Some(source) = source_by_key.get(mapping_key.as_str()) {
            if explicit_dida_mapping_id(&source.label, &habit.key).is_some() {
                source_keys.insert(source.key.as_str());
            }
        }
        let mut source_labels: Vec<String> = source_keys
            .into_iter()
            .filter_map(|key| source_by_key.get(key).map(|source| source.label.clone()))
            .collect();
        if local_records.iter().any(|record| record.key == habit.key) {
            source_labels.push("Dashboard Daily Record".into());
        }
        if local_completions
            .iter()
            .any(|completion| completion.key == habit.key)
        {
            source_labels.push("Personal Dashboard local".into());
        }
        source_labels.sort();
        source_labels.dedup();
        let complete_days = habit
            .days
            .iter()
            .filter(|day| day.coverage == Coverage::Complete)
            .count();
        let today_cell = history
            .iter()
            .find(|cell| cell.date == today)
            .cloned()
            .expect("history includes current date");
        let recent_start = today_date.plus_days(-6);
        let recent = history
            .iter()
            .filter(|cell| {
                CalendarDate::parse(&cell.date)
                    .is_some_and(|date| date >= recent_start && date <= today_date)
            })
            .cloned()
            .collect();
        projected.push(HabitView {
            key: habit.key.clone(),
            name: habit.name.clone(),
            localized_names: names_configuration.names_for(&habit.key),
            is_local_definition: false,
            created_locally: false,
            emoji: None,
            group: None,
            start_date: None,
            current_goal: habit.goal.as_ref().and_then(snapshot_goal),
            pending_goal: None,
            pending_goal_label: None,
            active: habit.active,
            goal_kind,
            goal_label: current_goal_label,
            weekly_target: match habit.goal {
                Some(Goal::WeeklyCount { standard }) => Some(standard),
                _ => None,
            },
            completed_count,
            weekly_period_start: None,
            weekly_period_partial: false,
            can_record_completion: habit.tracking_kind == TrackingKind::WeeklyCount,
            source_labels,
            coverage_label: format!(
                "{} — {} · {} 个 complete 日期",
                snapshot.range.from, snapshot.range.to, complete_days
            ),
            goal_history: habit
                .goal_history
                .iter()
                .map(|context| HabitGoalContextView {
                    week_of: context.week_of.clone(),
                    label: context.label.clone(),
                    goal_label: goal_label(&context.goal),
                })
                .collect(),
            today: today_cell,
            recent,
            history,
        });
    }

    summary.coverage_note = if current_week_has_incomplete_coverage {
        "当前周覆盖不完整；显示已知次数下界，未知不等于未完成。".into()
    } else {
        "当前周截至快照范围的来源覆盖完整；未来日期仍保持未知。".into()
    };
    let generated_date = snapshot.generated_at.get(..10).unwrap_or_default();
    let (state, message) = if generated_date < today {
        (
            HabitSnapshotState::Stale,
            "正在显示过期的有效快照；数据不是实时读数。".to_string(),
        )
    } else {
        (
            HabitSnapshotState::Ready,
            "已读取按需生成的本地快照；来源覆盖与刷新结果可分别核对。".to_string(),
        )
    };
    Ok(HabitSnapshotView {
        state,
        message,
        read_error: None,
        generated_at: Some(snapshot.generated_at.clone()),
        current_lived_date: None,
        snapshot_revision: None,
        display_range_label: Some(format!("{history_start} — {history_end}")),
        range_label: Some(format!("{} — {}", snapshot.range.from, snapshot.range.to)),
        producer_label: Some(format!(
            "{} · {}",
            snapshot.producer.label, snapshot.producer.kind
        )),
        completion_revision: None,
        completion_target_binding: None,
        definition_revision: None,
        definition_target_binding: None,
        names_configuration_state: names_configuration.state,
        summary,
        habits: projected,
    })
}

pub fn merge_local_habit_definitions(
    view: &mut HabitSnapshotView,
    definitions: &LocalHabitDefinitionsDocument,
    completions: Vec<LocalHabitCompletion>,
    names_configuration: &HabitNamesConfiguration,
    current_lived_date: &str,
    current_local_date: &str,
    current_timestamp: &str,
) -> Result<(), String> {
    if definitions.habits.is_empty() {
        return Ok(());
    }
    if CalendarDate::parse(current_lived_date).is_none() {
        return Err("当前 lived date 无效；未合并本地 Habit。".into());
    }
    CalendarDate::parse(current_local_date)
        .ok_or_else(|| "当前本地日期无效；未合并本地 Habit。".to_string())?;
    let lived_date = CalendarDate::parse(current_lived_date)
        .expect("current lived date was validated above");
    if timestamp_epoch_seconds(current_timestamp).is_none() {
        return Err("当前本地时间缺少有效 UTC offset；未合并本地 Habit。".into());
    }

    let present_keys: HashSet<String> = view.habits.iter().map(|habit| habit.key.clone()).collect();
    for habit in &mut view.habits {
        let Some(definition) = definitions.habits.iter().find(|item| item.key == habit.key) else {
            continue;
        };
        apply_local_habit_definition(habit, definition, current_lived_date);
    }

    let local_only: Vec<&LocalHabitDefinition> = definitions
        .habits
        .iter()
        .filter(|definition| definition.created_locally || !present_keys.contains(&definition.key))
        .collect();
    if !local_only.is_empty() {
        // The synthetic projection follows the app's 04:00 lived-day boundary,
        // even when the wall-clock date has already advanced.
        let generated_at = format!("{current_lived_date}{}", &current_timestamp[10..]);
        let mut synthetic_habits = Vec::with_capacity(local_only.len());
        for definition in &local_only {
            let goal = definition.goal_on(current_lived_date);
            let tracking_kind = match goal.as_ref() {
                Some(LocalHabitGoal::DailyTime { .. }) => "daily-time",
                _ => "weekly-count",
            };
            let serialized_goal = goal.as_ref().and_then(local_goal_snapshot_value);
            let goal_history = historical_snapshot_goals(definition);
            synthetic_habits.push(serde_json::json!({
                "key": definition.key,
                "name": definition.name,
                "active": true,
                "trackingKind": tracking_kind,
                "goal": serialized_goal,
                "goalHistory": goal_history,
                "days": [],
            }));
        }
        let synthetic = serde_json::json!({
            "schemaVersion": 1,
            "generatedAt": generated_at,
            "range": {
                "from": lived_date.monday().plus_days(-7 * (HISTORY_WEEKS - 1)).to_string(),
                "to": current_lived_date,
            },
            "producer": { "kind": "dashboard-local", "label": "Personal Dashboard local definitions" },
            "sources": [],
            "habits": synthetic_habits,
        });
        let local_keys: HashSet<&str> = local_only.iter().map(|item| item.key.as_str()).collect();
        let local_completions = completions
            .into_iter()
            .filter(|completion| local_keys.contains(completion.key.as_str()))
            .collect();
        let mut projected = project_snapshot_with_names_at_local_date(
            &serde_json::to_vec(&synthetic).map_err(|error| error.to_string())?,
            current_lived_date,
            current_local_date,
            Vec::new(),
            local_completions,
            names_configuration,
        )?;
        for habit in &mut projected.habits {
            if let Some(definition) = local_only.iter().find(|item| item.key == habit.key) {
                apply_local_habit_definition(habit, definition, current_lived_date);
                habit.coverage_label = "没有可用的外部历史覆盖".into();
            }
        }
        view.habits.extend(projected.habits);
    }

    view.summary = summary_for_habits(&view.habits);
    Ok(())
}

fn apply_local_habit_definition(
    habit: &mut HabitView,
    definition: &LocalHabitDefinition,
    current_lived_date: &str,
) {
    habit.name = definition.name.clone();
    habit.is_local_definition = true;
    habit.created_locally = definition.created_locally;
    habit.emoji = definition.emoji.clone();
    habit.group = definition.group.clone();
    habit.start_date = definition.start_date.clone();
    habit.weekly_period_start = None;
    habit.weekly_period_partial = false;
    let current_goal = definition.goal_on(current_lived_date);
    habit.current_goal = current_goal.clone();
    let pending_revision = definition.pending_goal(current_lived_date);
    habit.pending_goal = pending_revision.and_then(|revision| revision.goal.clone());
    habit.pending_goal_label = pending_revision.map(|revision| {
        revision
            .goal
            .as_ref()
            .map(LocalHabitGoal::label)
            .unwrap_or_else(|| "未配置目标 · 不计入汇总".into())
    });
    if let Some(goal) = current_goal {
        habit.goal_kind = goal.kind_label().into();
        habit.goal_label = goal.label();
        habit.weekly_target = match goal {
            LocalHabitGoal::WeeklyCount { days } => Some(u32::from(days)),
            LocalHabitGoal::DailyCount => Some(1),
            LocalHabitGoal::DailyTime { .. } => None,
        };
        habit.can_record_completion = goal.allows_completion();
        match goal {
            LocalHabitGoal::DailyCount => {
                habit.completed_count = Some(u32::from(habit.today.counts_as_completion));
            }
            LocalHabitGoal::WeeklyCount { .. } => {
                let period_start = local_weekly_period_start(definition, current_lived_date);
                habit.weekly_period_start = Some(period_start.to_string());
                habit.weekly_period_partial = period_start > today_week(current_lived_date);
                habit.completed_count = Some(
                    habit
                        .history
                        .iter()
                        .filter(|cell| {
                            cell.counts_as_completion
                                && CalendarDate::parse(&cell.date).is_some_and(|date| {
                                    date.monday() == today_week(current_lived_date)
                                        && date >= period_start
                                })
                        })
                        .count() as u32,
                );
            }
            LocalHabitGoal::DailyTime { .. } => habit.completed_count = None,
        }
    } else {
        habit.goal_kind = "weekly-count".into();
        habit.goal_label = "未配置目标 · 不计入汇总".into();
        habit.weekly_target = None;
        habit.completed_count = Some(0);
        habit.can_record_completion = false;
    }

    if !definition.source_goal_history.is_empty() || !definition.goal_revisions.is_empty() {
        let current_week = today_week(current_lived_date);
        let mut history: BTreeMap<String, HabitGoalContextView> = definition
            .source_goal_history
            .iter()
            .filter(|context| context.week_of < current_week.to_string())
            .map(|context| {
                (
                    context.week_of.clone(),
                    HabitGoalContextView {
                        week_of: context.week_of.clone(),
                        label: context.label.clone(),
                        goal_label: context.goal.label(),
                    },
                )
            })
            .collect();
        for revision in &definition.goal_revisions {
            let Some(effective_on) = CalendarDate::parse(&revision.effective_on) else {
                continue;
            };
            let previous_week = effective_on.monday().plus_days(-7);
            let previous_day = effective_on.plus_days(-1).to_string();
            if previous_week < current_week {
                if let Some(previous_goal @ LocalHabitGoal::WeeklyCount { .. }) =
                    definition.goal_on(&previous_day)
                {
                    let week_of = previous_week.to_string();
                    let goal_label = previous_goal.label();
                    history.entry(week_of.clone()).or_insert_with(|| {
                        HabitGoalContextView {
                            week_of,
                            label: "本地目标修订前".into(),
                            goal_label,
                        }
                    });
                }
            }
            let week = effective_on.monday();
            if week < current_week
                && revision.disposition == LocalHabitRevisionDisposition::Scheduled
            {
                let week_of = week.to_string();
                history.insert(
                    week_of.clone(),
                    HabitGoalContextView {
                        week_of,
                        label: "本地目标修订".into(),
                        goal_label: revision
                            .goal
                            .as_ref()
                            .map(LocalHabitGoal::label)
                            .unwrap_or_else(|| "未配置目标 · 不计入汇总".into()),
                    },
                );
            }
        }
        habit.goal_history = history.into_values().collect();
    }
}

fn today_week(date: &str) -> CalendarDate {
    CalendarDate::parse(date)
        .expect("current lived date was validated before local habit projection")
        .monday()
}

fn local_weekly_period_start(
    definition: &LocalHabitDefinition,
    current_lived_date: &str,
) -> CalendarDate {
    let week_start = today_week(current_lived_date);
    let mut period_start = week_start;
    if let Some(start_date) = definition
        .start_date
        .as_deref()
        .and_then(CalendarDate::parse)
    {
        if start_date > period_start {
            period_start = start_date;
        }
    }

    let active_revision = definition
        .goal_revisions
        .iter()
        .filter(|revision| {
            revision.disposition == LocalHabitRevisionDisposition::Scheduled
                && revision.effective_on.as_str() <= current_lived_date
        })
        .max_by(|left, right| {
            left.effective_on
                .cmp(&right.effective_on)
                .then_with(|| left.changed_at.cmp(&right.changed_at))
        });
    if let Some(revision) = active_revision.filter(|revision| {
        matches!(
            revision.goal.as_ref(),
            Some(LocalHabitGoal::WeeklyCount { .. })
        )
    }) {
        let revision_date = CalendarDate::parse(&revision.effective_on)
            .expect("scheduled local goal revisions have validated effective dates");
        let previous_goal = definition.goal_on(&revision_date.plus_days(-1).to_string());
        if !matches!(previous_goal, Some(LocalHabitGoal::WeeklyCount { .. }))
            && revision_date > period_start
        {
            period_start = revision_date;
        }
    }
    period_start
}

fn summary_for_habits(habits: &[HabitView]) -> HabitSummaryView {
    let mut summary = HabitSummaryView::default();
    for habit in habits.iter().filter(|habit| habit.active) {
        if habit.goal_kind == "weekly-count" {
            if let Some(target) = habit.weekly_target {
                if habit.weekly_period_partial {
                    summary.partial_weeks_excluded += 1;
                } else {
                    summary.target_completions += target;
                    summary.known_completions += habit.completed_count.unwrap_or_default();
                }
            } else {
                summary.excluded_no_goal += 1;
            }
        }
    }
    summary.coverage_note = "覆盖不足的日期仍保持未知；显示已知次数下界。".into();
    summary
}

fn local_goal_snapshot_value(goal: &LocalHabitGoal) -> Option<serde_json::Value> {
    match goal {
        LocalHabitGoal::DailyCount => None,
        LocalHabitGoal::WeeklyCount { days } => Some(serde_json::json!({
            "kind": "weekly-count",
            "standard": days,
        })),
        LocalHabitGoal::DailyTime {
            standard,
            day_relation,
        } => Some(serde_json::json!({
            "kind": "daily-time",
            "standard": standard,
            "dayRelation": day_relation,
        })),
    }
}

fn historical_snapshot_goals(
    definition: &LocalHabitDefinition,
) -> Vec<serde_json::Value> {
    definition
        .source_goal_history
        .iter()
        .filter_map(|context| {
            let goal = local_goal_snapshot_value(&context.goal)?;
            Some(serde_json::json!({
                "weekOf": context.week_of,
                "label": context.label,
                "goal": goal,
            }))
        })
        .collect()
}

fn snapshot_local_goal(habit: &Habit) -> Option<LocalHabitGoal> {
    match (habit.tracking_kind, habit.goal.as_ref()) {
        (TrackingKind::WeeklyCount, Some(Goal::WeeklyCount { standard })) => {
            u8::try_from(*standard)
                .ok()
                .map(|days| LocalHabitGoal::WeeklyCount { days })
        }
        (
            TrackingKind::DailyTime,
            Some(Goal::DailyTime {
                standard,
                day_relation,
            }),
        ) => Some(LocalHabitGoal::DailyTime {
            standard: standard.clone(),
            day_relation: *day_relation,
        }),
        _ => None,
    }
}

fn snapshot_goal(goal: &Goal) -> Option<LocalHabitGoal> {
    match goal {
        Goal::WeeklyCount { standard } => u8::try_from(*standard)
            .ok()
            .map(|days| LocalHabitGoal::WeeklyCount { days }),
        Goal::DailyTime {
            standard,
            day_relation,
        } => Some(LocalHabitGoal::DailyTime {
            standard: standard.clone(),
            day_relation: *day_relation,
        }),
    }
}

pub fn project_habit_corrections(
    document: &[u8],
    today: &str,
    selected_date: &str,
    local_records: Vec<LocalHabitRecord>,
    local_completions: Vec<LocalHabitCompletion>,
) -> Result<HabitCorrectionView, String> {
    project_habit_corrections_with_names(
        document,
        today,
        selected_date,
        local_records,
        local_completions,
        &HabitNamesConfiguration::default(),
    )
}

pub fn project_habit_corrections_with_names(
    document: &[u8],
    today: &str,
    selected_date: &str,
    local_records: Vec<LocalHabitRecord>,
    local_completions: Vec<LocalHabitCompletion>,
    names_configuration: &HabitNamesConfiguration,
) -> Result<HabitCorrectionView, String> {
    project_habit_corrections_with_recording_limit(
        document,
        today,
        today,
        selected_date,
        local_records,
        local_completions,
        names_configuration,
    )
}

pub fn project_habit_corrections_with_recording_limit(
    document: &[u8],
    today: &str,
    latest_recordable_date: &str,
    selected_date: &str,
    local_records: Vec<LocalHabitRecord>,
    local_completions: Vec<LocalHabitCompletion>,
    names_configuration: &HabitNamesConfiguration,
) -> Result<HabitCorrectionView, String> {
    let snapshot = parse_and_validate_at_local_date(document, today, latest_recordable_date)?;
    let today_date = CalendarDate::parse(today)
        .ok_or_else(|| "The system clock did not provide a valid calendar date.".to_string())?;
    let selected = CalendarDate::parse(selected_date)
        .ok_or_else(|| "The selected date is not a valid YYYY-MM-DD calendar date.".to_string())?;
    let source_by_key: HashMap<&str, &Source> = snapshot
        .sources
        .iter()
        .map(|source| (source.key.as_str(), source))
        .collect();
    let local_by_key: HashMap<&str, Vec<&LocalHabitRecord>> =
        local_records
            .iter()
            .fold(HashMap::new(), |mut records, record| {
                if record.date == selected_date {
                    records.entry(record.key.as_str()).or_default().push(record);
                }
                records
            });
    let local_completion_by_key: HashMap<&str, &LocalHabitCompletion> = local_completions
        .iter()
        .filter(|completion| completion.date == selected_date)
        .map(|completion| (completion.key.as_str(), completion))
        .collect();
    let selected_week = selected.monday();
    let selected_week_label = selected_week.to_string();
    let current_week = today_date.monday();
    let recording_limit = CalendarDate::parse(latest_recordable_date)
        .ok_or_else(|| "The recording date limit is invalid.".to_string())?;
    let can_record = selected <= recording_limit;
    let habits = snapshot
        .habits
        .iter()
        .map(|habit| {
            let day = habit
                .days
                .iter()
                .find(|day| day.lived_date == selected_date);
            let local = local_by_key
                .get(habit.key.as_str())
                .cloned()
                .unwrap_or_default();
            let local_completion = local_completion_by_key.get(habit.key.as_str()).copied();
            let historical_goal = if selected_week == current_week {
                habit.goal.as_ref()
            } else {
                habit
                    .goal_history
                    .iter()
                    .find(|context| context.week_of == selected_week_label)
                    .map(|context| &context.goal)
            };
            HabitCorrectionHabitView {
                key: habit.key.clone(),
                name: habit.name.clone(),
                localized_names: names_configuration.names_for(&habit.key),
                name_known: true,
                can_record_completion: habit.tracking_kind == TrackingKind::WeeklyCount,
                goal_label: historical_goal.map(goal_label),
                local_change_count: local_completion
                    .map(|completion| completion.change_count)
                    .unwrap_or(0),
                local_changes: local_completion
                    .map(|completion| completion.changes.clone())
                    .unwrap_or_default(),
                cell: project_cell(
                    selected_date,
                    day,
                    &source_by_key,
                    &local,
                    local_completion,
                    recording_limit,
                ),
            }
        })
        .collect();
    let generated_date = snapshot.generated_at.get(..10).unwrap_or_default();
    let outside_coverage = selected < CalendarDate::parse(&snapshot.range.from).unwrap()
        || selected > CalendarDate::parse(&snapshot.range.to).unwrap();
    let (state, message) = if selected > recording_limit {
        (
            HabitSnapshotState::Ready,
            "未来日期仅供查看；不能记录尚未发生的本地习惯完成。".to_string(),
        )
    } else if outside_coverage {
        (
            HabitSnapshotState::Ready,
            "所选日期不在外部快照覆盖内；外部状态未知，本地更正仍按稳定习惯 key 保存。".to_string(),
        )
    } else if generated_date < today {
        (
            HabitSnapshotState::Stale,
            "正在使用过期但有效的 catalog；所选日期的外部证据可能不是最新。".to_string(),
        )
    } else {
        (
            HabitSnapshotState::Ready,
            "已读取所选日期的习惯证据与本地更正。".to_string(),
        )
    };
    Ok(HabitCorrectionView {
        state,
        message,
        date: selected_date.into(),
        can_record,
        completion_revision: None,
        completion_target_binding: None,
        names_configuration_state: names_configuration.state,
        habits,
    })
}

pub fn project_uncatalogued_habit_corrections(
    today: &str,
    selected_date: &str,
    state: HabitSnapshotState,
    message: impl Into<String>,
    local_completions: Vec<LocalHabitCompletion>,
) -> Result<HabitCorrectionView, String> {
    project_uncatalogued_habit_corrections_with_recording_limit(
        today,
        today,
        selected_date,
        state,
        message,
        local_completions,
    )
}

pub fn project_uncatalogued_habit_corrections_with_recording_limit(
    today: &str,
    latest_recordable_date: &str,
    selected_date: &str,
    state: HabitSnapshotState,
    message: impl Into<String>,
    local_completions: Vec<LocalHabitCompletion>,
) -> Result<HabitCorrectionView, String> {
    CalendarDate::parse(today)
        .ok_or_else(|| "The system clock did not provide a valid calendar date.".to_string())?;
    let recording_limit = CalendarDate::parse(latest_recordable_date)
        .ok_or_else(|| "The recording date limit is invalid.".to_string())?;
    let selected = CalendarDate::parse(selected_date)
        .ok_or_else(|| "The selected date is not a valid YYYY-MM-DD calendar date.".to_string())?;
    let source_by_key: HashMap<&str, &Source> = HashMap::new();
    let mut completions = local_completions
        .iter()
        .filter(|completion| completion.date == selected_date)
        .collect::<Vec<_>>();
    completions.sort_by(|left, right| left.key.cmp(&right.key));
    let habits = completions
        .into_iter()
        .map(|completion| HabitCorrectionHabitView {
            key: completion.key.clone(),
            name: completion.key.clone(),
            localized_names: HabitLocalizedNames::default(),
            name_known: false,
            can_record_completion: true,
            goal_label: None,
            local_change_count: completion.change_count,
            local_changes: completion.changes.clone(),
            cell: project_cell(
                selected_date,
                None,
                &source_by_key,
                &[],
                Some(completion),
                recording_limit,
            ),
        })
        .collect();
    Ok(HabitCorrectionView {
        state,
        message: message.into(),
        date: selected_date.into(),
        can_record: selected <= recording_limit,
        completion_revision: None,
        completion_target_binding: None,
        names_configuration_state: HabitNamesConfigurationState::Missing,
        habits,
    })
}

fn project_cell(
    date: &str,
    day: Option<&HabitDay>,
    sources: &HashMap<&str, &Source>,
    local: &[&LocalHabitRecord],
    local_completion: Option<&LocalHabitCompletion>,
    today: CalendarDate,
) -> HabitCellView {
    let date_value = CalendarDate::parse(date).expect("generated history date");
    if date_value > today {
        return HabitCellView {
            date: date.into(),
            coverage: "unknown".into(),
            status: HabitCellStatus::Unknown,
            has_record: false,
            counts_as_completion: false,
            local_completion_state: HabitLocalCompletionState::None,
            has_external_completion: false,
            completion_source_labels: Vec::new(),
            actual_time_label: None,
            details: vec![HabitDetailView::Future],
            local_records: Vec::new(),
        };
    }
    let coverage = day.map(|item| item.coverage).unwrap_or(Coverage::Unknown);
    let mut latest: BTreeMap<&str, (&Observation, i64)> = BTreeMap::new();
    if let Some(day) = day {
        for observation in &day.observations {
            let timestamp = timestamp_epoch_seconds(&observation.observed_at).unwrap_or(i64::MIN);
            match latest.get(observation.source.as_str()) {
                Some((_, previous)) if *previous >= timestamp => {}
                _ => {
                    latest.insert(observation.source.as_str(), (observation, timestamp));
                }
            }
        }
    }
    let observations: Vec<&Observation> = latest.values().map(|(item, _)| *item).collect();
    let definitive: Vec<(&Observation, &Source)> = observations
        .iter()
        .filter_map(|observation| {
            sources.get(observation.source.as_str()).and_then(|source| {
                matches!(source.kind, SourceKind::Dida365 | SourceKind::Manual)
                    .then_some((*observation, *source))
            })
        })
        .filter(|(observation, _)| {
            matches!(
                observation.status,
                ObservationStatus::Completed | ObservationStatus::NotDone
            )
        })
        .collect();
    let completed = definitive
        .iter()
        .any(|(observation, _)| observation.status == ObservationStatus::Completed);
    let not_done = definitive
        .iter()
        .any(|(observation, _)| observation.status == ObservationStatus::NotDone);
    let local_completion_state = local_completion
        .map(|completion| completion.state)
        .unwrap_or(HabitLocalCompletionState::None);
    let locally_completed = local_completion_state == HabitLocalCompletionState::Completed;
    let merged_completion = completed || locally_completed;
    let mut completion_source_labels = definitive
        .iter()
        .filter(|(observation, _)| observation.status == ObservationStatus::Completed)
        .map(|(_, source)| source.label.clone())
        .collect::<Vec<_>>();
    if locally_completed {
        completion_source_labels.push("Personal Dashboard local".into());
    }
    completion_source_labels.sort();
    completion_source_labels.dedup();
    let actual_candidates: Vec<&ActualTime> = observations
        .iter()
        .filter(|item| item.status == ObservationStatus::ActualTime)
        .filter_map(|item| item.actual_time.as_ref())
        .filter(|actual| actual.day_relation != DayRelation::Unresolved)
        .collect();
    let exact_times: BTreeSet<String> = actual_candidates
        .iter()
        .map(|actual| {
            format!(
                "{}|{}|{:?}|{:?}",
                actual.occurred_on,
                actual.local_time,
                actual.utc_offset_minutes,
                actual.day_relation
            )
        })
        .collect();
    let conflict = exact_times.len() > 1 || (!actual_candidates.is_empty() && not_done);
    let actual = (!conflict)
        .then(|| actual_candidates.first().copied())
        .flatten();
    let status = if conflict {
        HabitCellStatus::Conflict
    } else if actual.is_some() {
        HabitCellStatus::ActualTime
    } else if merged_completion {
        HabitCellStatus::Completed
    } else if not_done {
        HabitCellStatus::NotDone
    } else if observations
        .iter()
        .any(|item| item.status == ObservationStatus::Partial)
    {
        HabitCellStatus::Partial
    } else if observations
        .iter()
        .any(|item| item.status == ObservationStatus::Baseline)
    {
        HabitCellStatus::Baseline
    } else if observations
        .iter()
        .any(|item| item.status == ObservationStatus::ThresholdMet)
    {
        HabitCellStatus::ThresholdOnly
    } else if observations
        .iter()
        .any(|item| item.status == ObservationStatus::Unavailable)
        || coverage == Coverage::Unavailable
    {
        HabitCellStatus::Unavailable
    } else if !local.is_empty() {
        HabitCellStatus::RecordOnly
    } else {
        HabitCellStatus::Unknown
    };
    let mut details = Vec::new();
    for observation in &observations {
        let source = sources
            .get(observation.source.as_str())
            .map(|source| source.label.as_str())
            .unwrap_or(observation.source.as_str());
        details.push(HabitDetailView::Observation {
            source_label: source.to_string(),
            status: observation.status,
            evidence: observation.evidence,
            observed_at: observation.observed_at.clone(),
            note: observation.note.clone(),
        });
        if let Some(actual) = &observation.actual_time {
            details.push(HabitDetailView::ActualTime {
                day_relation: actual.day_relation,
                local_time: actual.local_time.clone(),
                utc_offset_minutes: actual.utc_offset_minutes,
            });
        }
    }
    for record in local {
        details.push(HabitDetailView::LocalRecord {
            source_label: record.source_label.clone(),
            text: record.text.clone(),
        });
    }
    if let Some(completion) = local_completion {
        details.push(HabitDetailView::LocalCompletion {
            state: completion.state,
            changed_at: completion.changed_at.clone(),
        });
    }
    if conflict {
        details.push(HabitDetailView::Conflict);
    }
    if details.is_empty() {
        details.push(HabitDetailView::NoRecord);
    }
    HabitCellView {
        date: date.into(),
        coverage: coverage.label().into(),
        status,
        has_record: !observations.is_empty()
            || !local.is_empty()
            || local_completion_state != HabitLocalCompletionState::None,
        counts_as_completion: merged_completion && !conflict,
        local_completion_state,
        has_external_completion: completed,
        completion_source_labels,
        actual_time_label: actual.map(|time| match time.day_relation {
            DayRelation::SameDay => time.local_time.clone(),
            DayRelation::NextDay => format!("次日 {}", time.local_time),
            DayRelation::Unresolved => unreachable!(),
        }),
        details,
        local_records: local
            .iter()
            .map(|record| HabitLocalRecordView {
                id: record.id.clone(),
                source_label: record.source_label.clone(),
                text: record.text.clone(),
            })
            .collect(),
    }
}

fn parse_and_validate_at_local_date(document: &[u8], today: &str, local_date: &str) -> Result<SnapshotDocument, String> {
    let local_date=CalendarDate::parse(local_date).ok_or_else(|| "Invalid local calendar date".to_string())?;
    let today = CalendarDate::parse(today)
        .ok_or_else(|| "The system clock did not provide a valid calendar date.".to_string())?;
    let snapshot: SnapshotDocument = serde_json::from_slice(document)
        .map_err(|error| format!("Habits 快照不是有效的 schema v1 JSON：{error}"))?;
    if snapshot.schema_version != SNAPSHOT_SCHEMA_VERSION {
        return Err(format!(
            "Habits 快照 schemaVersion {} 不受支持；当前只读取版本 1。",
            snapshot.schema_version
        ));
    }
    validate_text(&snapshot.producer.kind, "producer.kind")?;
    validate_text(&snapshot.producer.label, "producer.label")?;
    let generated_at = timestamp_epoch_seconds(&snapshot.generated_at).ok_or_else(|| {
        "Habits 快照 generatedAt 必须是含 UTC offset 的完整本地时间。".to_string()
    })?;
    let generated_date = CalendarDate::parse(&snapshot.generated_at[..10])
        .expect("validated timestamp contains a valid date");
    if generated_date > local_date {
        return Err("Habits 快照 generatedAt 不能晚于当前本地日期。".into());
    }
    let range_from = CalendarDate::parse(&snapshot.range.from)
        .ok_or_else(|| "Habits 快照 range.from 不是有效日期。".to_string())?;
    let range_to = CalendarDate::parse(&snapshot.range.to)
        .ok_or_else(|| "Habits 快照 range.to 不是有效日期。".to_string())?;
    let expected_from = generated_date.monday().plus_days(-7 * (HISTORY_WEEKS - 1));
    if range_from != expected_from
        || range_to < range_from
        || range_to > generated_date
        || range_to > today
    {
        return Err(format!(
            "Habits 快照范围必须从 {expected_from} 开始并在今天之前结束；收到 {} — {}。",
            snapshot.range.from, snapshot.range.to
        ));
    }
    let mut source_keys = HashSet::new();
    for source in &snapshot.sources {
        validate_key(&source.key, "source key")?;
        validate_text(&source.label, "source label")?;
        if !source_keys.insert(source.key.as_str()) {
            return Err(format!("Habits 快照包含重复 source key：{}。", source.key));
        }
    }
    let mut habit_keys = HashSet::new();
    for habit in &snapshot.habits {
        validate_key(&habit.key, "habit key")?;
        validate_text(&habit.name, "habit name")?;
        if !habit_keys.insert(habit.key.as_str()) {
            return Err(format!("Habits 快照包含重复 habit key：{}。", habit.key));
        }
        validate_goal(habit.goal.as_ref())?;
        if matches!(
            (habit.tracking_kind, habit.goal.as_ref()),
            (TrackingKind::WeeklyCount, Some(Goal::DailyTime { .. }))
                | (TrackingKind::DailyTime, Some(Goal::WeeklyCount { .. }))
        ) {
            return Err(format!(
                "Habit {} 的 trackingKind 与当前 goal 类型不一致。",
                habit.key
            ));
        }
        let mut history_weeks = HashSet::new();
        for context in &habit.goal_history {
            let week = CalendarDate::parse(&context.week_of)
                .ok_or_else(|| format!("Habit {} 的历史目标周日期无效。", habit.key))?;
            if week.monday() != week || week >= today.monday() {
                return Err(format!("Habit {} 的历史目标必须使用过去周一。", habit.key));
            }
            validate_text(&context.label, "goal history label")?;
            validate_goal(Some(&context.goal))?;
            if !history_weeks.insert(context.week_of.as_str()) {
                return Err(format!("Habit {} 有重复历史目标周。", habit.key));
            }
        }
        let mut day_keys = HashSet::new();
        for day in &habit.days {
            let lived = CalendarDate::parse(&day.lived_date)
                .ok_or_else(|| format!("Habit {} 有无效 livedDate。", habit.key))?;
            if lived < range_from || lived > range_to {
                return Err(format!("Habit {} 的 livedDate 超出快照范围。", habit.key));
            }
            if !day_keys.insert(day.lived_date.as_str()) {
                return Err(format!("Habit {} 有重复 livedDate。", habit.key));
            }
            let mut source_times = HashSet::new();
            for observation in &day.observations {
                if !source_keys.contains(observation.source.as_str()) {
                    return Err(format!(
                        "Habit {} 引用了未声明来源 {}。",
                        habit.key, observation.source
                    ));
                }
                let observed_at =
                    timestamp_epoch_seconds(&observation.observed_at).ok_or_else(|| {
                        format!("Habit {} 的 observedAt 缺少有效 UTC offset。", habit.key)
                    })?;
                if observed_at > generated_at {
                    return Err(format!(
                        "Habit {} 的 observedAt 晚于快照 generatedAt。",
                        habit.key
                    ));
                }
                if !source_times.insert((observation.source.as_str(), observed_at)) {
                    return Err(format!(
                        "Habit {} 的同一来源在同一天有相同 observedAt；无法判断替换顺序。",
                        habit.key
                    ));
                }
                let status_matches_tracking = match habit.tracking_kind {
                    TrackingKind::WeeklyCount => !matches!(
                        observation.status,
                        ObservationStatus::ActualTime | ObservationStatus::ThresholdMet
                    ),
                    TrackingKind::DailyTime => {
                        !matches!(observation.status, ObservationStatus::Completed)
                    }
                };
                if !status_matches_tracking {
                    return Err(format!(
                        "Habit {} 的 observation status 与 trackingKind 不一致。",
                        habit.key
                    ));
                }
                validate_observation(observation, lived, &habit.key)?;
            }
        }
    }
    Ok(snapshot)
}

fn validate_goal(goal: Option<&Goal>) -> Result<(), String> {
    match goal {
        Some(Goal::WeeklyCount { standard: 0 }) => {
            Err("weekly-count standard 必须大于 0；无目标请使用 null。".into())
        }
        Some(Goal::DailyTime { standard, .. }) if !valid_time(standard) => {
            Err("daily-time standard 必须是 HH:mm。".into())
        }
        _ => Ok(()),
    }
}

fn validate_observation(
    observation: &Observation,
    lived: CalendarDate,
    habit: &str,
) -> Result<(), String> {
    match (
        observation.status,
        observation.evidence,
        observation.actual_time.as_ref(),
    ) {
        (ObservationStatus::ActualTime, EvidenceKind::ExplicitTime, Some(actual)) => {
            let occurred = CalendarDate::parse(&actual.occurred_on)
                .ok_or_else(|| format!("Habit {habit} 的 actualTime.occurredOn 无效。"))?;
            if !valid_time(&actual.local_time) {
                return Err(format!(
                    "Habit {habit} 的 actualTime.localTime 必须是 HH:mm。"
                ));
            }
            let attribution_valid = match actual.day_relation {
                DayRelation::SameDay => occurred == lived,
                DayRelation::NextDay => occurred == lived.plus_days(1),
                DayRelation::Unresolved => occurred == lived || occurred == lived.plus_days(1),
            };
            if !attribution_valid {
                return Err(format!(
                    "Habit {habit} 的 actualTime 不符合 lived-day 归属。"
                ));
            }
        }
        (ObservationStatus::ActualTime, _, _) => {
            return Err(format!(
                "Habit {habit} 的 actual-time 必须带 explicit-time 证据。"
            ));
        }
        (_, _, Some(_)) => {
            return Err(format!(
                "Habit {habit} 只有 actual-time 可以携带 actualTime。"
            ));
        }
        (ObservationStatus::ThresholdMet, EvidenceKind::ThresholdCheckIn, None) => {}
        (ObservationStatus::ThresholdMet, _, None) => {
            return Err(format!("Habit {habit} 的 threshold-met 必须保留阈值证据。"));
        }
        (
            ObservationStatus::Completed | ObservationStatus::NotDone,
            EvidenceKind::CheckIn | EvidenceKind::ManualCompletion,
            None,
        ) => {}
        (ObservationStatus::Completed | ObservationStatus::NotDone, _, None) => {
            return Err(format!(
                "Habit {habit} 的完成结果必须带 check-in 或 manual-completion 证据。"
            ));
        }
        _ => {}
    }
    Ok(())
}

fn validate_key(value: &str, label: &str) -> Result<(), String> {
    if !is_valid_habit_key(value) {
        return Err(format!("Habits 快照 {label} 必须是稳定的小写语义 key。"));
    }
    Ok(())
}

fn is_valid_habit_key(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
}

fn validate_text(value: &str, label: &str) -> Result<(), String> {
    if value.trim().is_empty() || value.len() > 200 {
        return Err(format!("Habits 快照 {label} 缺失或过长。"));
    }
    Ok(())
}

fn valid_time(value: &str) -> bool {
    value.len() == 5
        && value.as_bytes()[2] == b':'
        && value[..2].parse::<u32>().is_ok_and(|hour| hour < 24)
        && value[3..].parse::<u32>().is_ok_and(|minute| minute < 60)
}

pub(crate) fn timestamp_epoch_seconds(value: &str) -> Option<i64> {
    if value.len() != 25
        || &value[10..11] != "T"
        || &value[13..14] != ":"
        || &value[16..17] != ":"
        || &value[22..23] != ":"
    {
        return None;
    }
    let date = CalendarDate::parse(&value[..10])?;
    let hour: i64 = value[11..13].parse().ok()?;
    let minute: i64 = value[14..16].parse().ok()?;
    let second: i64 = value[17..19].parse().ok()?;
    let sign = match &value[19..20] {
        "+" => 1,
        "-" => -1,
        _ => return None,
    };
    let offset_hour: i64 = value[20..22].parse().ok()?;
    let offset_minute: i64 = value[23..25].parse().ok()?;
    if hour >= 24 || minute >= 60 || second >= 60 || offset_hour > 23 || offset_minute >= 60 {
        return None;
    }
    Some(
        date.unix_days() * 86_400 + hour * 3_600 + minute * 60 + second
            - sign * (offset_hour * 3_600 + offset_minute * 60),
    )
}

fn goal_label(goal: &Goal) -> String {
    match goal {
        Goal::WeeklyCount { standard } => format!("每周 {standard} 次"),
        Goal::DailyTime {
            standard,
            day_relation,
        } => match day_relation {
            DayRelation::SameDay => format!("每日 {standard}"),
            DayRelation::NextDay => format!("每日 次日 {standard}"),
            DayRelation::Unresolved => format!("每日 {standard} · 日期归属待解释"),
        },
    }
}
