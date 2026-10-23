//! Canonical reported endpoints. Night identity and endpoint lived-day projection are independent.
use serde::{Deserialize, Serialize};
#[path = "sleep_overview.rs"]
mod overview;
pub use overview::SleepOverview;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
static WRITE_LOCK: Mutex<()> = Mutex::new(());
const RELATIVE_PATH: &str = "life/.personal-dashboard/sleep/v1/sessions.json";

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SleepPoint {
    pub date: String,
    pub time: String,
    pub utc_offset_minutes: i32,
    #[serde(default)]
    pub approximate: bool,
}
/// Fixed lived-day point interpretation request; IPC retains these flat fields.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitSleepPointRequest {
    pub lived_date: String,
    pub time: String,
    pub approximate: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub existing_point: Option<SleepPoint>,
}

/// A reported range carries both wall times with one fixed lived-day context.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct HabitSleepRangeRequest {
    pub lived_date: String,
    pub start_time: String,
    pub end_time: String,
    pub reported_text: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub existing_range: Option<SleepRangeProvenance>,
}

/// Known endpoint provenance is independent of the machine's current timezone.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SleepRangeProvenance {
    pub start: SleepPoint,
    pub end: SleepPoint,
}
impl SleepRangeProvenance {
    pub(crate) fn corrected(
        &self,
        start_date: &str,
        start_time: &str,
        end_date: &str,
        end_time: &str,
        reported_text: &str,
    ) -> Result<SleepEndpoint, String> {
        if point_seconds(&self.end)? < point_seconds(&self.start)? {
            return Err("时间范围需要可靠且有序的上下界与原文。".into());
        }
        let endpoint = SleepEndpoint::Range {
            start: self
                .start
                .corrected(start_date, start_time, self.start.approximate)?,
            end: self
                .end
                .corrected(end_date, end_time, self.end.approximate)?,
            reported_text: reported_text.into(),
        };
        endpoint.validate()?;
        Ok(endpoint)
    }
}

impl SleepPoint {
    /// Correct wall time without reinterpreting a known fact in the current zone.
    pub(crate) fn corrected(&self, date: &str, time: &str, approximate: bool) -> Result<Self, String> {
        point_seconds(self)?;
        let corrected = Self {
            date: date.into(),
            time: time.into(),
            approximate,
            ..self.clone()
        };
        point_seconds(&corrected)?;
        Ok(corrected)
    }

    pub(crate) fn lived_date(&self) -> String {
        crate::today::TodayClockView {
            date: self.date.clone(),
            time: self.time.clone(),
        }
        .lived_date()
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(
    tag = "kind",
    rename_all = "camelCase",
    rename_all_fields = "camelCase",
    deny_unknown_fields
)]
pub enum SleepEndpoint {
    Point {
        #[serde(flatten)]
        point: SleepPoint,
    },
    Range {
        start: SleepPoint,
        end: SleepPoint,
        reported_text: String,
    },
    Text {
        /// The reported actual calendar date, absent when it was not established.
        #[serde(default, skip_serializing_if = "Option::is_none")]
        date: Option<String>,
        text: String,
    },
    Unknown,
    Unrecorded,
}
impl SleepEndpoint {
    fn lived_date(&self) -> Option<String> {
        match self {
            SleepEndpoint::Point { point } => Some(point.lived_date()),
            SleepEndpoint::Range { start, end, .. } => {
                let first = start.lived_date();
                (first == end.lived_date()).then_some(first)
            }
            _ => None,
        }
    }

    // These bounds are only a clarification signal. A crossing range remains
    // unlocated; its possible lived days never assign it to a night or display day.
    fn possible_lived_dates(&self) -> Option<(String, String)> {
        match self {
            Self::Point { point } => {
                let day = point.lived_date();
                Some((day.clone(), day))
            }
            Self::Range { start, end, .. } => {
                let first = start.lived_date();
                let last = end.lived_date();
                if first <= last {
                    Some((first, last))
                } else {
                    Some((last, first))
                }
            }
            _ => None,
        }
    }

    fn may_include_lived_date(&self, date: &str) -> bool {
        self.possible_lived_dates()
            .is_some_and(|(first, last)| first.as_str() <= date && date <= last.as_str())
    }

    fn may_share_lived_date(&self, other: &Self) -> bool {
        match (self.possible_lived_dates(), other.possible_lived_dates()) {
            (Some((first, last)), Some((other_first, other_last))) => {
                first <= other_last && other_first <= last
            }
            _ => false,
        }
    }

    fn validate_context(&self, context: Option<String>) -> Result<Option<String>, String> {
        if let Some(date) = context.as_ref() {
            validate_date(date)?;
        }
        match self {
            SleepEndpoint::Point { .. } | SleepEndpoint::Range { .. } => {
                if context
                    .as_ref()
                    .is_some_and(|date| self.lived_date().as_ref() != Some(date))
                {
                    return Err("端点与所选 lived day 不一致或跨越边界；未写入。".into());
                }
            }
            SleepEndpoint::Text { date: Some(date), .. } => {
                let previous = crate::today::TodayClockView {
                    date: date.clone(),
                    time: "00:00".into(),
                }
                .lived_date();
                if context
                    .as_ref()
                    .is_some_and(|value| value != date && value != &previous)
                {
                    return Err("端点与所选 lived day 不一致或跨越边界；未写入。".into());
                }
            }
            SleepEndpoint::Text { date: None, .. } | SleepEndpoint::Unrecorded => {}
            SleepEndpoint::Unknown => {}
        }
        Ok(context)
    }

    fn validate(&self) -> Result<(), String> {
        match self {
            SleepEndpoint::Point { point } => {
                point_seconds(point)?;
            }
            SleepEndpoint::Range {
                start,
                end,
                reported_text,
            } => {
                if point_seconds(end)? < point_seconds(start)? || reported_text.trim().is_empty() {
                    return Err("时间范围需要可靠且有序的上下界与原文。".into());
                }
            }
            SleepEndpoint::Text { date, text } => {
                if let Some(date) = date {
                    validate_date(date)?;
                }
                // Match the original-wording input's HTML maxlength (UTF-16 code units).
                if text.trim().is_empty() || text.encode_utf16().count() > 2000 {
                    return Err("请保留有效的模糊时间原文。".into());
                }
            }
            SleepEndpoint::Unknown | SleepEndpoint::Unrecorded => {}
        };
        Ok(())
    }

    fn bounds(&self) -> Result<Option<(i64, i64)>, String> {
        match self {
            SleepEndpoint::Point { point } => {
                let instant = point_seconds(point)?;
                Ok(Some((instant, instant)))
            }
            SleepEndpoint::Range { start, end, .. } => {
                Ok(Some((point_seconds(start)?, point_seconds(end)?)))
            }
            SleepEndpoint::Text { .. } | SleepEndpoint::Unknown | SleepEndpoint::Unrecorded => {
                Ok(None)
            }
        }
    }

    fn day_relation(&self, lived_date: Option<&str>) -> crate::habits::DayRelation {
        match (self, lived_date) {
            (Self::Point { point }, Some(date)) if date != point.date => {
                crate::habits::DayRelation::NextDay
            }
            (Self::Point { .. }, Some(_)) => crate::habits::DayRelation::SameDay,
            _ => crate::habits::DayRelation::Unresolved,
        }
    }
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SleepRecord {
    pub id: String,
    /// Stable internal night index, independent of either endpoint's actual date.
    #[serde(rename = "wakeDate")]
    pub night_index: String,
    pub sleep_onset: SleepEndpoint,
    pub get_up: SleepEndpoint,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sleep_onset_lived_date: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub get_up_lived_date: Option<String>,
    pub estimated_duration_minutes: Option<i64>,
}
/// Guard and idempotency identity carried together through a sleep mutation.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SleepMutationContext {
    pub change_id: String,
    pub target_binding: String,
    pub expected_revision: Option<String>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(from = "SleepMutationInputWire", into = "SleepMutationInputWire")]
pub struct SleepMutationInput {
    pub record_id: Option<String>,
    /// Internal night identity; the public wire adapter retains legacy `wakeDate`.
    pub night_index: String,
    pub sleep_onset: Option<SleepEndpoint>,
    pub get_up: Option<SleepEndpoint>,
    pub sleep_onset_lived_date: Option<String>,
    pub get_up_lived_date: Option<String>,
    pub mutation: SleepMutationContext,
}
/// The only stable Habit identities that own canonical sleep endpoints.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(try_from = "String", into = "String")]
pub enum SleepHabitKey {
    Sleep,
    Wake,
}
impl SleepHabitKey {
    pub fn parse(key: &str) -> Result<Self, &'static str> {
        match key {
            "sleep" => Ok(Self::Sleep),
            "wake" => Ok(Self::Wake),
            _ => Err("需要稳定的 wake 或 sleep Habit 身份；未写入。"),
        }
    }
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Sleep => "sleep",
            Self::Wake => "wake",
        }
    }
    fn opposite(self) -> Self {
        match self {
            Self::Sleep => Self::Wake,
            Self::Wake => Self::Sleep,
        }
    }
}
impl TryFrom<String> for SleepHabitKey {
    type Error = &'static str;
    fn try_from(key: String) -> Result<Self, Self::Error> {
        Self::parse(&key)
    }
}
impl From<SleepHabitKey> for String {
    fn from(key: SleepHabitKey) -> Self {
        key.as_str().to_owned()
    }
}

/// The lightweight entry's fixed Habit/date context; no night index is exposed.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(from = "HabitSleepMutationInputWire", into = "HabitSleepMutationInputWire")]
pub struct HabitSleepMutationInput {
    pub habit_key: SleepHabitKey,
    pub lived_date: String,
    pub endpoint: SleepEndpoint,
    pub record_id: Option<String>,
    pub mutation: SleepMutationContext,
}
// These boundary DTOs intentionally spell out the flat public fields. Using
// explicit adapters keeps unknown/duplicate-field rejection with no serde
// flatten/deny_unknown_fields interaction; domain workflows share one context.
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct SleepMutationInputWire {
    record_id: Option<String>,
    // Legacy public spelling for the internal night index, not an endpoint date.
    wake_date: String,
    sleep_onset: Option<SleepEndpoint>,
    get_up: Option<SleepEndpoint>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    sleep_onset_lived_date: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    get_up_lived_date: Option<String>,
    change_id: String,
    target_binding: String,
    expected_revision: Option<String>,
}
impl From<SleepMutationInputWire> for SleepMutationInput {
    fn from(wire: SleepMutationInputWire) -> Self {
        Self {
            record_id: wire.record_id,
            night_index: wire.wake_date,
            sleep_onset: wire.sleep_onset,
            get_up: wire.get_up,
            sleep_onset_lived_date: wire.sleep_onset_lived_date,
            get_up_lived_date: wire.get_up_lived_date,
            mutation: SleepMutationContext {
                change_id: wire.change_id,
                target_binding: wire.target_binding,
                expected_revision: wire.expected_revision,
            },
        }
    }
}
impl From<SleepMutationInput> for SleepMutationInputWire {
    fn from(input: SleepMutationInput) -> Self {
        Self {
            record_id: input.record_id,
            wake_date: input.night_index,
            sleep_onset: input.sleep_onset,
            get_up: input.get_up,
            sleep_onset_lived_date: input.sleep_onset_lived_date,
            get_up_lived_date: input.get_up_lived_date,
            change_id: input.mutation.change_id,
            target_binding: input.mutation.target_binding,
            expected_revision: input.mutation.expected_revision,
        }
    }
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HabitSleepMutationInputWire {
    habit_key: SleepHabitKey,
    lived_date: String,
    endpoint: SleepEndpoint,
    record_id: Option<String>,
    change_id: String,
    target_binding: String,
    expected_revision: Option<String>,
}
impl From<HabitSleepMutationInputWire> for HabitSleepMutationInput {
    fn from(wire: HabitSleepMutationInputWire) -> Self {
        Self {
            habit_key: wire.habit_key,
            lived_date: wire.lived_date,
            endpoint: wire.endpoint,
            record_id: wire.record_id,
            mutation: SleepMutationContext {
                change_id: wire.change_id,
                target_binding: wire.target_binding,
                expected_revision: wire.expected_revision,
            },
        }
    }
}
impl From<HabitSleepMutationInput> for HabitSleepMutationInputWire {
    fn from(input: HabitSleepMutationInput) -> Self {
        Self {
            habit_key: input.habit_key,
            lived_date: input.lived_date,
            endpoint: input.endpoint,
            record_id: input.record_id,
            change_id: input.mutation.change_id,
            target_binding: input.mutation.target_binding,
            expected_revision: input.mutation.expected_revision,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SleepView {
    pub target_binding: String,
    pub revision: Option<String>,
    pub records: Vec<SleepRecord>,
    pub facts: Vec<SleepEndpointFact>,
    pub overview: Option<SleepOverview>,
}
/// A read-only endpoint projection. Its date never comes from the night index.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SleepEndpointFact {
    pub record_id: String,
    pub habit_key: SleepHabitKey,
    pub lived_date: Option<String>,
    pub day_relation: crate::habits::DayRelation,
    /// Derived clock coordinate for plotting/statistics; never a stored timestamp.
    #[serde(default)]
    pub clock_plot_minutes: Option<i64>,
    pub endpoint: SleepEndpoint,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Receipt {
    id: String,
    input: SleepMutationInput,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Document {
    schema_version: u8,
    records: Vec<SleepRecord>,
    operations: Vec<Receipt>,
}
impl Default for Document {
    fn default() -> Self {
        Self {
            schema_version: 1,
            records: vec![],
            operations: vec![],
        }
    }
}

pub trait SleepStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String>;
    fn save_if_unchanged(&self, path: &Path, expected: &[u8], updated: &[u8])
        -> Result<(), String>;
    fn create_new(&self, path: &Path, document: &[u8]) -> Result<(), String>;
}

#[derive(Clone, Copy)]
pub struct FileSleepStore;
impl SleepStore for FileSleepStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        match fs::read(path) {
            Ok(bytes) => Ok(Some(bytes)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(error.to_string()),
        }
    }
    fn save_if_unchanged(
        &self,
        path: &Path,
        expected: &[u8],
        updated: &[u8],
    ) -> Result<(), String> {
        crate::today::save_file_if_unchanged(
            path,
            expected,
            updated,
            crate::today::StorageDocumentKind::SleepRecords,
            |_| Ok(()),
        )
    }
    fn create_new(&self, path: &Path, document: &[u8]) -> Result<(), String> {
        crate::today::create_new_file(
            path,
            document,
            crate::today::StorageDocumentKind::SleepRecords,
        )
    }
}

pub struct SleepWorkflow<S = FileSleepStore> {
    vault: PathBuf,
    store: S,
}
impl SleepWorkflow<FileSleepStore> {
    pub fn new(vault: &Path) -> Self {
        Self::with_store(vault, FileSleepStore)
    }
}
impl<S: SleepStore> SleepWorkflow<S> {
    pub fn with_store(vault: &Path, store: S) -> Self {
        Self {
            vault: vault.to_path_buf(),
            store,
        }
    }
    fn path(&self) -> Result<PathBuf, String> {
        crate::today::validate_compatible_vault(&self.vault)?;
        let mut path = self.vault.clone();
        for component in Path::new(RELATIVE_PATH).components() {
            path.push(component);
            if fs::symlink_metadata(&path).is_ok_and(|m| m.file_type().is_symlink()) {
                return Err("作息正本路径不能包含符号链接；未写入。".into());
            }
        }
        Ok(path)
    }
    fn load(&self) -> Result<(PathBuf, Document, Option<Vec<u8>>), String> {
        let path = self.path()?;
        let bytes = self.store.load(&path)?;
        let document: Document = match bytes.as_ref() {
            Some(b) => serde_json::from_slice(b).map_err(|e| format!("作息正本无效：{e}"))?,
            None => Document::default(),
        };
        if document.schema_version != 1 {
            return Err("不支持的作息正本版本。".into());
        }
        for record in &document.records {
            validate_record(record)?;
        }
        let mut dates = std::collections::HashSet::new();
        let mut ids = std::collections::HashSet::new();
        if document
            .records
            .iter()
            .any(|r| !dates.insert(&r.night_index) || !ids.insert(&r.id))
        {
            return Err("作息正本存在重复身份或日期。".into());
        }
        Ok((path, document, bytes))
    }
    pub fn read(&self) -> Result<SleepView, String> {
        let (path, document, bytes) = self.load()?;
        Ok(view(
            &path,
            document,
            bytes.as_ref().map(|b| crate::today::document_revision(b)),
        ))
    }
    pub fn save_habit_time(&self, input: HabitSleepMutationInput) -> Result<SleepView, String> {
        if input.mutation.target_binding != binding(&self.path()?) {
            return Err("所选 Vault 已改变；未写入。".into());
        }
        validate_date(&input.lived_date)?;
        let context = if matches!(input.endpoint, SleepEndpoint::Unrecorded)
            || (matches!(input.endpoint, SleepEndpoint::Range { .. })
                && input.endpoint.lived_date().is_none())
        {
            // A range crossing 04:00 remains unlocated, even when entered from one day's UI.
            None
        } else {
            Some(input.lived_date.clone())
        };
        input.endpoint.validate()?;
        input.endpoint.validate_context(context.clone())?;
        let (_, document, _) = self.load()?;
        let onset = input.habit_key == SleepHabitKey::Sleep;
        if let Some(receipt) = document.operations.iter().find(|r| r.id == input.mutation.change_id) {
            let previous = &receipt.input;
            let endpoint = if onset {
                &previous.sleep_onset
            } else {
                &previous.get_up
            };
            let previous_context = if onset {
                &previous.sleep_onset_lived_date
            } else {
                &previous.get_up_lived_date
            };
            if endpoint.as_ref() != Some(&input.endpoint)
                || previous_context != &context
                || previous.mutation.target_binding != input.mutation.target_binding
                || previous.mutation.expected_revision != input.mutation.expected_revision
                || input.record_id.as_ref().is_some_and(|id| {
                    previous
                        .record_id
                        .as_ref()
                        .unwrap_or(&record_id_for_change(&previous.mutation.change_id))
                        != id
                })
            {
                return Err("changeId 已用于不同作息修改；未写入。".into());
            }
            return self.save(previous.clone());
        }
        let matching: Vec<_> = document
            .records
            .iter()
            .filter(|r| {
                record_facts(r).iter().any(|fact| {
                    fact.habit_key == input.habit_key
                        && fact.lived_date.as_deref() == Some(input.lived_date.as_str())
                })
            })
            .collect();
        if matching.len() > 1
            || (matching
                .first()
                .is_some_and(|r| input.record_id.as_ref().is_some_and(|id| id != &r.id)))
        {
            return Err("同一 Habit 日期存在多条作息端点；请明确记录身份。".into());
        }
        // The selected sleep Habit explicitly means that lived day's night; the
        // selected wake Habit means that morning. This is contextual entry, never
        // an interpretation of free text or a modulo-clock pairing heuristic.
        let night_date = if onset {
            crate::today::CalendarDate::parse(&input.lived_date)
                .unwrap()
                .plus_days(1)
                .to_string()
        } else {
            input.lived_date.clone()
        };
        let opposite_context = crate::today::CalendarDate::parse(&input.lived_date)
            .unwrap()
            .plus_days(if onset { 1 } else { -1 })
            .to_string();
        if input.record_id.is_none() && matching.is_empty() {
            if let Some((incoming_earliest, incoming_latest)) = input.endpoint.bounds()? {
                let opposite_key = input.habit_key.opposite();
                for candidate in &document.records {
                    if candidate.night_index == night_date {
                        continue;
                    }
                    for fact in record_facts(candidate) {
                        if fact.habit_key != opposite_key
                            || !(input.endpoint.may_share_lived_date(&fact.endpoint)
                                || fact.endpoint.may_include_lived_date(&opposite_context))
                        {
                            continue;
                        }
                        if let Some((opposite_earliest, opposite_latest)) = fact.endpoint.bounds()? {
                            // A compatible opposite endpoint in the selected context
                            // is a clarification signal, even when its night is complete.
                            // It never identifies a night by chronology or distance.
                            if (onset && incoming_earliest <= opposite_latest)
                                || (!onset && opposite_earliest <= incoming_latest)
                            {
                                return Err("所选夜晚的另一条记录有可兼容的相反端点；请先澄清是否属于同一晚，再通过 Collaboration 明确记录身份；未写入。".into());
                            }
                        }
                    }
                }
            }
        }
        let record = if let Some(id) = input.record_id.as_ref() {
            Some(
                document
                    .records
                    .iter()
                    .find(|r| &r.id == id)
                    .ok_or("作息记录不存在；未写入。")?,
            )
        } else if let Some(record) = matching.first() {
            Some(*record)
        } else {
            document.records.iter().find(|r| r.night_index == night_date)
        };
        if let Some(record) = record {
            let existing = if onset {
                &record.sleep_onset
            } else {
                &record.get_up
            };
            if input.record_id.is_none()
                && matching.is_empty()
                && !matches!(existing, SleepEndpoint::Unrecorded)
            {
                return Err("目标夜晚已有不同日期的端点；请明确记录身份，未写入。".into());
            }
        }
        self.save(SleepMutationInput {
            record_id: record.map(|r| r.id.clone()),
            night_index: record.map(|r| r.night_index.clone()).unwrap_or(night_date),
            sleep_onset: onset.then(|| input.endpoint.clone()),
            get_up: (!onset).then_some(input.endpoint),
            sleep_onset_lived_date: if onset { context.clone() } else { None },
            get_up_lived_date: if onset { None } else { context },
            mutation: input.mutation,
        })
    }
    pub fn save(&self, input: SleepMutationInput) -> Result<SleepView, String> {
        let _guard = WRITE_LOCK.lock().map_err(|_| "作息写入暂不可用")?;
        // Reject stale callers before loading another Vault's document or diagnostics.
        if input.mutation.target_binding != binding(&self.path()?) {
            return Err("所选 Vault 已改变；未写入。".into());
        }
        let (path, mut document, original) = self.load()?;
        let revision = original
            .as_ref()
            .map(|b| crate::today::document_revision(b));
        if input.mutation.target_binding != binding(&path) {
            return Err("所选 Vault 已改变；未写入。".into());
        }
        if input.mutation.change_id.trim().is_empty() || input.mutation.change_id.len() > 160 {
            return Err("需要有效 changeId；未写入。".into());
        }
        if let Some(receipt) = document.operations.iter().find(|r| r.id == input.mutation.change_id) {
            if receipt.input == input {
                let id = input
                    .record_id
                    .clone()
                    .unwrap_or_else(|| record_id_for_change(&input.mutation.change_id));
                let confirmed = document
                    .records
                    .iter()
                    .find(|record| record.id == id)
                    .is_some_and(|record| {
                        record.night_index == input.night_index
                            && input
                                .sleep_onset
                                .as_ref()
                                .is_none_or(|endpoint| endpoint == &record.sleep_onset)
                            && input
                                .get_up
                                .as_ref()
                                .is_none_or(|endpoint| endpoint == &record.get_up)
                            && input.sleep_onset.as_ref().is_none_or(|_| {
                                input.sleep_onset_lived_date == record.sleep_onset_lived_date
                            })
                            && input
                                .get_up
                                .as_ref()
                                .is_none_or(|_| input.get_up_lived_date == record.get_up_lived_date)
                    });
                if !confirmed {
                    return Err(READBACK_CHANGED.into());
                }
                return Ok(view(&path, document, revision));
            }
            return Err("changeId 已用于不同作息修改；未写入。".into());
        }
        if revision != input.mutation.expected_revision {
            return Err("作息已更新，请重新读取后修改；未写入。".into());
        }
        validate_date(&input.night_index)?;
        if (input.sleep_onset.is_none() && input.sleep_onset_lived_date.is_some())
            || (input.get_up.is_none() && input.get_up_lived_date.is_some())
        {
            return Err("端点日期上下文需要对应的明确端点；未写入。".into());
        }
        if input.sleep_onset.is_none() && input.get_up.is_none() {
            return Err("请明确提供要修改的作息端点；未写入。".into());
        }
        let existing = match input.record_id.as_ref() {
            Some(id) => Some(
                document
                    .records
                    .iter()
                    .position(|r| &r.id == id)
                    .ok_or("作息记录不存在；未写入。")?,
            ),
            None => None,
        };
        if document
            .records
            .iter()
            .enumerate()
            .any(|(i, r)| r.night_index == input.night_index && Some(i) != existing)
        {
            return Err("目标起床日期已有另一条作息；未覆盖。".into());
        }
        let mut record = existing
            .map(|i| document.records[i].clone())
            .unwrap_or_else(|| SleepRecord {
                id: record_id_for_change(&input.mutation.change_id),
                night_index: input.night_index.clone(),
                sleep_onset: SleepEndpoint::Unrecorded,
                get_up: SleepEndpoint::Unrecorded,
                estimated_duration_minutes: None,
                sleep_onset_lived_date: None,
                get_up_lived_date: None,
            });
        record.night_index = input.night_index.clone();
        if let Some(value) = input.sleep_onset.clone() {
            record.sleep_onset_lived_date =
                value.validate_context(input.sleep_onset_lived_date.clone())?;
            record.sleep_onset = value;
        }
        if let Some(value) = input.get_up.clone() {
            record.get_up_lived_date = value.validate_context(input.get_up_lived_date.clone())?;
            record.get_up = value;
        }
        record.estimated_duration_minutes = duration_minutes(&record.sleep_onset, &record.get_up)?;
        validate_record(&record)?;
        for fact in record_facts(&record) {
            if fact.lived_date.is_some()
                && document
                    .records
                    .iter()
                    .enumerate()
                    .filter(|(i, _)| Some(*i) != existing)
                    .flat_map(|(_, other)| record_facts(other))
                    .any(|other| {
                        other.habit_key == fact.habit_key && other.lived_date == fact.lived_date
                    })
            {
                return Err("同一 Habit 日期存在多条作息端点；请明确记录身份。".into());
            }
        }
        match existing {
            Some(i) => document.records[i] = record,
            None => document.records.push(record),
        };
        document
            .records
            .sort_by(|a, b| a.night_index.cmp(&b.night_index));
        document.operations.push(Receipt {
            id: input.mutation.change_id.clone(),
            input,
        });
        let bytes = serde_json::to_vec_pretty(&document).map_err(|e| e.to_string())?;
        match original {
            Some(expected) => self.store.save_if_unchanged(&path, &expected, &bytes)?,
            None => self.store.create_new(&path, &bytes)?,
        }
        let (read_path, read_document, read_bytes) = self
            .load()
            .map_err(|error| format!("作息已保存，但无法确认读回：{error}"))?;
        if read_path != path || read_bytes.as_deref() != Some(bytes.as_slice()) {
            return Err(READBACK_CHANGED.into());
        }
        Ok(view(
            &read_path,
            read_document,
            read_bytes
                .as_ref()
                .map(|value| crate::today::document_revision(value)),
        ))
    }
}
const READBACK_CHANGED: &str = "文档已保存，但读回结果已经变化；请重新读取核对。";
fn record_id_for_change(change_id: &str) -> String {
    format!(
        "sleep-{}",
        crate::today::document_revision(change_id.as_bytes())
    )
}
fn view(path: &Path, document: Document, revision: Option<String>) -> SleepView {
    SleepView {
        target_binding: binding(path),
        revision,
        facts: document.records.iter().flat_map(record_facts).collect(),
        records: document.records,
        overview: None,
    }
}

fn record_facts(record: &SleepRecord) -> Vec<SleepEndpointFact> {
    [
        (SleepHabitKey::Sleep, &record.sleep_onset, &record.sleep_onset_lived_date),
        (SleepHabitKey::Wake, &record.get_up, &record.get_up_lived_date),
    ]
    .into_iter()
    .filter(|(_, endpoint, _)| !matches!(endpoint, SleepEndpoint::Unrecorded))
    .map(|(key, endpoint, context)| {
        let lived_date = endpoint.lived_date().or_else(|| context.clone());
        let day_relation = endpoint.day_relation(lived_date.as_deref());
        SleepEndpointFact {
            record_id: record.id.clone(),
            habit_key: key,
            lived_date,
            day_relation,
            clock_plot_minutes: match endpoint {
                SleepEndpoint::Point { point } => Some(overview::clock_plot_minutes(
                    key,
                    i64::from(clock_minutes(&point.time).expect("validated canonical time")),
                )),
                _ => None,
            },
            endpoint: endpoint.clone(),
        }
    })
    .collect()
}

/// Enrich the existing cells without changing completion, goal or source evidence.
pub(crate) fn project_habits(view: &mut crate::habits::HabitSnapshotView, sleep: &SleepView) {
    for habit in &mut view.habits {
        let Ok(key) = SleepHabitKey::parse(&habit.key) else {
            continue;
        };
        for cell in std::iter::once(&mut habit.today)
            .chain(habit.recent.iter_mut())
            .chain(habit.history.iter_mut())
        {
            let mut facts = sleep.facts.iter().filter(|fact| {
                fact.habit_key == key
                    && fact.lived_date.as_deref() == Some(cell.date.as_str())
            });
            let Some(fact) = facts.next() else {
                continue;
            };
            if facts.next().is_some() {
                view.sleep_error = Some("同一 Habit 日期存在多条作息端点；请明确记录身份。".into());
                continue;
            }
            cell.sleep_fact = Some(fact.clone());
        }
    }
}

fn binding(path: &Path) -> String {
    format!(
        "sleep-target-{}",
        crate::today::document_revision(path.to_string_lossy().as_bytes())
    )
}
fn validate_date(date: &str) -> Result<(), String> {
    crate::today::wall_time_components(date, 0)
        .map(|_| ())
        .ok_or_else(|| "需要明确、有效的 YYYY-MM-DD 日期；日期含糊时请先澄清。".into())
}
pub(crate) fn clock_minutes(time: &str) -> Result<u16, String> {
    let (hour, minute) = time
        .split_once(':')
        .ok_or("需要 HH:MM 单点时间及实际日期。")?;
    if hour.len() != 2
        || minute.len() != 2
        || !hour.bytes().all(|byte| byte.is_ascii_digit())
        || !minute.bytes().all(|byte| byte.is_ascii_digit())
    {
        return Err("需要 HH:MM 单点时间及实际日期。".into());
    }
    let hour: u16 = hour
        .parse()
        .map_err(|_| "需要 HH:MM 单点时间及实际日期。")?;
    let minute: u16 = minute
        .parse()
        .map_err(|_| "需要 HH:MM 单点时间及实际日期。")?;
    if time.len() != 5 || hour > 23 || minute > 59 {
        return Err("需要 HH:MM 单点时间及实际日期。".into());
    }
    Ok(hour * 60 + minute)
}

fn point_seconds(point: &SleepPoint) -> Result<i64, String> {
    validate_date(&point.date)?;
    clock_minutes(&point.time)?;
    if !(-840..=840).contains(&point.utc_offset_minutes) {
        return Err("需要有效的实际端点时区偏移。".into());
    }
    let offset = point.utc_offset_minutes;
    let absolute = offset.unsigned_abs();
    let timestamp = format!(
        "{}T{}{}{:02}:{:02}",
        point.date,
        point.time,
        if offset < 0 { '-' } else { '+' },
        absolute / 60,
        absolute % 60
    );
    crate::today::timestamp_label_epoch_seconds(&timestamp)
        .ok_or_else(|| "需要 HH:MM 单点时间及实际日期。".into())
}

pub fn duration_minutes(start: &SleepEndpoint, end: &SleepEndpoint) -> Result<Option<i64>, String> {
    let Some((earliest_onset, _)) = start.bounds()? else {
        return Ok(None);
    };
    let Some((_, latest_get_up)) = end.bounds()? else {
        return Ok(None);
    };
    // Reject only when every possible get-up instant precedes every possible
    // onset instant. Overlapping reported ranges remain uncertain, not reversed.
    if latest_get_up < earliest_onset {
        return Err("离床时间早于入睡时间；请更正实际日期，未写入。".into());
    }
    match (start, end) {
        (SleepEndpoint::Point { .. }, SleepEndpoint::Point { .. }) => {
            Ok(Some((latest_get_up - earliest_onset) / 60))
        }
        _ => Ok(None),
    }
}

fn validate_record(record: &SleepRecord) -> Result<(), String> {
    validate_date(&record.night_index)?;
    record.sleep_onset.validate()?;
    record.get_up.validate()?;
    record
        .sleep_onset
        .validate_context(record.sleep_onset_lived_date.clone())?;
    record
        .get_up
        .validate_context(record.get_up_lived_date.clone())?;
    if duration_minutes(&record.sleep_onset, &record.get_up)? != record.estimated_duration_minutes {
        return Err("作息时长与报告端点不一致。".into());
    }
    Ok(())
}

/// Advertised to the existing Codex connection; the same mechanical workflow serves manual edits.
pub fn tool_spec(description: &str) -> serde_json::Value {
    use serde_json::json;
    let point = json!({"type":"object","properties":{"date":{"type":"string","description":"Actual endpoint local calendar YYYY-MM-DD"},"time":{"type":"string","description":"HH:MM"},"utcOffsetMinutes":{"type":"integer","minimum":-840,"maximum":840},"approximate":{"type":"boolean"}},"required":["date","time","utcOffsetMinutes"],"additionalProperties":false});
    let mut point_endpoint = point.clone();
    point_endpoint["properties"]["kind"] = json!({"const":"point"});
    point_endpoint["required"]
        .as_array_mut()
        .unwrap()
        .push(json!("kind"));
    let endpoint = json!({"oneOf":[point_endpoint,
        {"type":"object","properties":{"kind":{"const":"range"},"start":point,"end":point,"reportedText":{"type":"string"}},"required":["kind","start","end","reportedText"],"additionalProperties":false},
        {"type":"object","properties":{"kind":{"const":"text"},"date":{"type":["string","null"],"description":"Actual calendar YYYY-MM-DD only when explicitly known; omit or null when wording does not establish it. Never copy livedDate or wakeDate into this field."},"text":{"type":"string"}},"required":["kind","text"],"additionalProperties":false},
        {"type":"object","properties":{"kind":{"enum":["unknown","unrecorded"]}},"required":["kind"],"additionalProperties":false}]});
    json!({"name":"dashboard_sleep_records","description":description,
    "inputSchema":{"oneOf":[
        {"type":"object","properties":{"action":{"const":"read"}},"required":["action"],"additionalProperties":false},
        {"type":"object","properties":{"action":{"const":"save"},"input":{"type":"object","properties":{"recordId":{"type":["string","null"]},"wakeDate":{"type":"string"},"sleepOnset":endpoint,"getUp":endpoint,"sleepOnsetLivedDate":{"type":"string"},"getUpLivedDate":{"type":"string"},"changeId":{"type":"string"},"targetBinding":{"type":"string"},"expectedRevision":{"type":["string","null"]}},"required":["wakeDate","changeId","targetBinding","expectedRevision"],"additionalProperties":false}},"required":["action","input"],"additionalProperties":false},
        {"type":"object","properties":{"action":{"const":"saveHabitTime"},"input":{"type":"object","properties":{"habitKey":{"enum":["sleep","wake"]},"livedDate":{"type":"string"},"endpoint":endpoint,"recordId":{"type":["string","null"]},"changeId":{"type":"string"},"targetBinding":{"type":"string"},"expectedRevision":{"type":["string","null"]}},"required":["habitKey","livedDate","endpoint","changeId","targetBinding","expectedRevision"],"additionalProperties":false}},"required":["action","input"],"additionalProperties":false}
    ]}})
}
