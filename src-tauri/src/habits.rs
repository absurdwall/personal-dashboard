use crate::today::CalendarDate;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::fs;
use std::path::Path;

pub const SNAPSHOT_RELATIVE_PATH: &str = ".personal-dashboard/derived/habits-v1.json";
const SNAPSHOT_SCHEMA_VERSION: u32 = 1;
const HISTORY_WEEKS: i64 = 12;

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

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitCellView {
    pub date: String,
    pub coverage: String,
    pub status: HabitCellStatus,
    pub has_record: bool,
    pub counts_as_completion: bool,
    pub actual_time_label: Option<String>,
    pub details: Vec<String>,
    pub local_records: Vec<HabitLocalRecordView>,
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
    pub active: bool,
    pub goal_kind: String,
    pub goal_label: String,
    pub weekly_target: Option<u32>,
    pub completed_count: Option<u32>,
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
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HabitSnapshotView {
    pub state: HabitSnapshotState,
    pub message: String,
    pub generated_at: Option<String>,
    pub display_range_label: Option<String>,
    pub range_label: Option<String>,
    pub producer_label: Option<String>,
    pub summary: HabitSummaryView,
    pub habits: Vec<HabitView>,
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
            generated_at: None,
            display_range_label: None,
            range_label: None,
            producer_label: None,
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

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum ObservationStatus {
    Completed,
    NotDone,
    Partial,
    Baseline,
    Unavailable,
    ActualTime,
    ThresholdMet,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum EvidenceKind {
    CheckIn,
    ManualCompletion,
    ExplicitTime,
    ThresholdCheckIn,
}

#[derive(Debug, Clone, Copy, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
enum DayRelation {
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
    let snapshot = parse_and_validate(document, today)?;
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
) -> Result<HabitSnapshotView, String> {
    let snapshot = parse_and_validate(document, today)?;
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
            history.push(project_cell(
                &date,
                days_by_date.get(date.as_str()).copied(),
                &source_by_key,
                &local,
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
        let source_keys: HashSet<&str> = habit
            .days
            .iter()
            .flat_map(|day| day.observations.iter().map(|item| item.source.as_str()))
            .collect();
        let mut source_labels: Vec<String> = source_keys
            .into_iter()
            .filter_map(|key| source_by_key.get(key).map(|source| source.label.clone()))
            .collect();
        if local_records.iter().any(|record| record.key == habit.key) {
            source_labels.push("Dashboard Daily Record".into());
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
            active: habit.active,
            goal_kind,
            goal_label: current_goal_label,
            weekly_target: match habit.goal {
                Some(Goal::WeeklyCount { standard }) => Some(standard),
                _ => None,
            },
            completed_count,
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
            "已读取按需生成的本地快照；Dashboard 未连接或轮询外部服务。".to_string(),
        )
    };
    Ok(HabitSnapshotView {
        state,
        message,
        generated_at: Some(snapshot.generated_at.clone()),
        display_range_label: Some(format!("{history_start} — {history_end}")),
        range_label: Some(format!("{} — {}", snapshot.range.from, snapshot.range.to)),
        producer_label: Some(format!(
            "{} · {}",
            snapshot.producer.label, snapshot.producer.kind
        )),
        summary,
        habits: projected,
    })
}

fn project_cell(
    date: &str,
    day: Option<&HabitDay>,
    sources: &HashMap<&str, &Source>,
    local: &[&LocalHabitRecord],
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
            actual_time_label: None,
            details: vec!["未来日期 · unknown".into()],
            local_records: Vec::new(),
        };
    }
    let coverage = day.map(|item| item.coverage).unwrap_or(Coverage::Unknown);
    let mut latest: BTreeMap<&str, (&Observation, i64)> = BTreeMap::new();
    if let Some(day) = day {
        for observation in &day.observations {
            let timestamp = timestamp_epoch_minutes(&observation.observed_at).unwrap_or(i64::MIN);
            match latest.get(observation.source.as_str()) {
                Some((_, previous)) if *previous >= timestamp => {}
                _ => {
                    latest.insert(observation.source.as_str(), (observation, timestamp));
                }
            }
        }
    }
    let observations: Vec<&Observation> = latest.values().map(|(item, _)| *item).collect();
    let definitive: Vec<ObservationStatus> = observations
        .iter()
        .filter_map(|observation| {
            sources.get(observation.source.as_str()).and_then(|source| {
                matches!(source.kind, SourceKind::Dida365 | SourceKind::Manual)
                    .then_some(observation.status)
            })
        })
        .filter(|status| {
            matches!(
                status,
                ObservationStatus::Completed | ObservationStatus::NotDone
            )
        })
        .collect();
    let completed = definitive.contains(&ObservationStatus::Completed);
    let not_done = definitive.contains(&ObservationStatus::NotDone);
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
    let conflict = (completed && not_done)
        || exact_times.len() > 1
        || (!actual_candidates.is_empty() && not_done);
    let actual = (!conflict)
        .then(|| actual_candidates.first().copied())
        .flatten();
    let status = if conflict {
        HabitCellStatus::Conflict
    } else if actual.is_some() {
        HabitCellStatus::ActualTime
    } else if completed {
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
        let status_label = observation_status_label(observation.status);
        let evidence = evidence_label(observation.evidence);
        let note = observation
            .note
            .as_deref()
            .map(|note| format!(" · {note}"))
            .unwrap_or_default();
        details.push(format!(
            "{source} · {status_label} · {evidence} · observedAt {}{note}",
            observation.observed_at
        ));
        if let Some(actual) = &observation.actual_time {
            let relation = match actual.day_relation {
                DayRelation::SameDay => actual.local_time.clone(),
                DayRelation::NextDay => format!("次日 {}", actual.local_time),
                DayRelation::Unresolved => format!("待解释 {}", actual.local_time),
            };
            let offset = actual
                .utc_offset_minutes
                .map(|minutes| format!("UTC offset {minutes} 分钟"))
                .unwrap_or_else(|| "UTC offset 未知".into());
            details.push(format!("明确时刻 {relation} · {offset}"));
        }
    }
    for record in local {
        details.push(format!(
            "{} · 文字记录 · {}",
            record.source_label, record.text
        ));
    }
    if conflict {
        details.push("来源冲突 · 暂不计入完成次数".into());
    }
    if details.is_empty() {
        details.push("未读取或没有记录 · unknown，不等于 not_done".into());
    }
    HabitCellView {
        date: date.into(),
        coverage: coverage.label().into(),
        status,
        has_record: !observations.is_empty() || !local.is_empty(),
        counts_as_completion: completed && !conflict,
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

fn parse_and_validate(document: &[u8], today: &str) -> Result<SnapshotDocument, String> {
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
    let generated_at = timestamp_epoch_minutes(&snapshot.generated_at).ok_or_else(|| {
        "Habits 快照 generatedAt 必须是含 UTC offset 的完整本地时间。".to_string()
    })?;
    let generated_date = CalendarDate::parse(&snapshot.generated_at[..10])
        .expect("validated timestamp contains a valid date");
    if generated_date > today {
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
                    timestamp_epoch_minutes(&observation.observed_at).ok_or_else(|| {
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
    if value.is_empty()
        || value.len() > 64
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_lowercase() || byte.is_ascii_digit() || byte == b'-')
    {
        return Err(format!("Habits 快照 {label} 必须是稳定的小写语义 key。"));
    }
    Ok(())
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

fn timestamp_epoch_minutes(value: &str) -> Option<i64> {
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
    Some(date.unix_days() * 1440 + hour * 60 + minute - sign * (offset_hour * 60 + offset_minute))
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

fn observation_status_label(status: ObservationStatus) -> &'static str {
    match status {
        ObservationStatus::Completed => "completed",
        ObservationStatus::NotDone => "not_done",
        ObservationStatus::Partial => "partial · 不计次",
        ObservationStatus::Baseline => "baseline · 不计次",
        ObservationStatus::Unavailable => "unavailable",
        ObservationStatus::ActualTime => "actual_time",
        ObservationStatus::ThresholdMet => "threshold_met · 不编造分钟",
    }
}

fn evidence_label(evidence: EvidenceKind) -> &'static str {
    match evidence {
        EvidenceKind::CheckIn => "打卡证据",
        EvidenceKind::ManualCompletion => "人工明确补报",
        EvidenceKind::ExplicitTime => "明确时刻证据",
        EvidenceKind::ThresholdCheckIn => "阈值打卡证据",
    }
}
