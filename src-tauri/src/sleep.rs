//! Canonical reported sleep facts. Calendar-date ownership deliberately does not use lived dates.
use serde::{Deserialize, Serialize};
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
        date: String,
        text: String,
    },
    Unknown,
    Unrecorded,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SleepRecord {
    pub id: String,
    pub wake_date: String,
    pub sleep_onset: SleepEndpoint,
    pub get_up: SleepEndpoint,
    pub estimated_duration_minutes: Option<i64>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SleepMutationInput {
    pub record_id: Option<String>,
    pub wake_date: String,
    pub sleep_onset: Option<SleepEndpoint>,
    pub get_up: Option<SleepEndpoint>,
    pub change_id: String,
    pub target_binding: String,
    pub expected_revision: Option<String>,
}
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SleepView {
    pub target_binding: String,
    pub revision: Option<String>,
    pub records: Vec<SleepRecord>,
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

pub struct SleepWorkflow {
    vault: PathBuf,
}
impl SleepWorkflow {
    pub fn new(vault: &Path) -> Self {
        Self {
            vault: vault.to_path_buf(),
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
        let bytes = match fs::read(&path) {
            Ok(b) => Some(b),
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
            Err(e) => return Err(e.to_string()),
        };
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
            .any(|r| !dates.insert(&r.wake_date) || !ids.insert(&r.id))
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
    pub fn save(&self, input: SleepMutationInput) -> Result<SleepView, String> {
        let _guard = WRITE_LOCK.lock().map_err(|_| "作息写入暂不可用")?;
        let (path, mut document, original) = self.load()?;
        let revision = original
            .as_ref()
            .map(|b| crate::today::document_revision(b));
        if input.target_binding != binding(&path) {
            return Err("所选 Vault 已改变；未写入。".into());
        }
        if input.change_id.trim().is_empty() || input.change_id.len() > 160 {
            return Err("需要有效 changeId；未写入。".into());
        }
        if let Some(receipt) = document.operations.iter().find(|r| r.id == input.change_id) {
            if receipt.input == input {
                return Ok(view(&path, document, revision));
            }
            return Err("changeId 已用于不同作息修改；未写入。".into());
        }
        if revision != input.expected_revision {
            return Err("作息已更新，请重新读取后修改；未写入。".into());
        }
        validate_date(&input.wake_date)?;
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
            .any(|(i, r)| r.wake_date == input.wake_date && Some(i) != existing)
        {
            return Err("目标起床日期已有另一条作息；未覆盖。".into());
        }
        let mut record = existing
            .map(|i| document.records[i].clone())
            .unwrap_or_else(|| SleepRecord {
                id: format!(
                    "sleep-{}",
                    crate::today::document_revision(input.change_id.as_bytes())
                ),
                wake_date: input.wake_date.clone(),
                sleep_onset: SleepEndpoint::Unrecorded,
                get_up: SleepEndpoint::Unrecorded,
                estimated_duration_minutes: None,
            });
        record.wake_date = input.wake_date.clone();
        if let Some(value) = input.sleep_onset.clone() {
            record.sleep_onset = value;
        }
        if let Some(value) = input.get_up.clone() {
            record.get_up = value;
        }
        record.estimated_duration_minutes = duration_minutes(&record.sleep_onset, &record.get_up)?;
        validate_record(&record)?;
        match existing {
            Some(i) => document.records[i] = record,
            None => document.records.push(record),
        };
        document
            .records
            .sort_by(|a, b| a.wake_date.cmp(&b.wake_date));
        document.operations.push(Receipt {
            id: input.change_id.clone(),
            input,
        });
        let bytes = serde_json::to_vec_pretty(&document).map_err(|e| e.to_string())?;
        match original {
            Some(expected) => crate::today::save_file_if_unchanged(
                &path,
                &expected,
                &bytes,
                crate::today::StorageDocumentKind::SleepRecords,
                |_| Ok(()),
            )?,
            None => crate::today::create_new_file(
                &path,
                &bytes,
                crate::today::StorageDocumentKind::SleepRecords,
            )?,
        }
        self.read()
    }
}
fn view(path: &Path, document: Document, revision: Option<String>) -> SleepView {
    SleepView {
        target_binding: binding(path),
        revision,
        records: document.records,
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
fn point_seconds(point: &SleepPoint) -> Result<i64, String> {
    validate_date(&point.date)?;
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
fn validate_endpoint(endpoint: &SleepEndpoint) -> Result<(), String> {
    match endpoint {
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
            validate_date(date)?;
            if text.trim().is_empty() || text.len() > 2000 {
                return Err("请保留有效的模糊时间原文。".into());
            }
        }
        SleepEndpoint::Unknown | SleepEndpoint::Unrecorded => {}
    };
    Ok(())
}
fn endpoint_bounds(endpoint: &SleepEndpoint) -> Result<Option<(i64, i64)>, String> {
    match endpoint {
        SleepEndpoint::Point { point } => {
            let instant = point_seconds(point)?;
            Ok(Some((instant, instant)))
        }
        SleepEndpoint::Range { start, end, .. } => Ok(Some((point_seconds(start)?, point_seconds(end)?))),
        SleepEndpoint::Text { .. } | SleepEndpoint::Unknown | SleepEndpoint::Unrecorded => Ok(None),
    }
}

pub fn duration_minutes(start: &SleepEndpoint, end: &SleepEndpoint) -> Result<Option<i64>, String> {
    let Some((earliest_onset, _)) = endpoint_bounds(start)? else { return Ok(None); };
    let Some((_, latest_get_up)) = endpoint_bounds(end)? else { return Ok(None); };
    // Reject only when every possible get-up instant precedes every possible
    // onset instant. Overlapping reported ranges remain uncertain, not reversed.
    if latest_get_up < earliest_onset {
        return Err("离床时间早于入睡时间；请更正实际日期，未写入。".into());
    }
    match (start, end) {
        (SleepEndpoint::Point { .. }, SleepEndpoint::Point { .. }) => Ok(Some((latest_get_up - earliest_onset) / 60)),
        _ => Ok(None),
    }
}

fn validate_record(record: &SleepRecord) -> Result<(), String> {
    validate_date(&record.wake_date)?;
    validate_endpoint(&record.sleep_onset)?;
    validate_endpoint(&record.get_up)?;
    // A reported range may straddle midnight. Its explicit upper bound owns
    // the night index; the lower bound retains its own actual calendar date.
    let get_up_date = match &record.get_up {
        SleepEndpoint::Point { point } => Some(point.date.as_str()),
        SleepEndpoint::Range { end, .. } => Some(end.date.as_str()),
        SleepEndpoint::Text { date, .. } => Some(date.as_str()),
        SleepEndpoint::Unknown | SleepEndpoint::Unrecorded => None,
    };
    if get_up_date.is_some_and(|date| date != record.wake_date) {
        return Err("起床端点的实际日期必须与记录起床日一致。".into());
    }
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
        {"type":"object","properties":{"kind":{"const":"text"},"date":{"type":"string"},"text":{"type":"string"}},"required":["kind","date","text"],"additionalProperties":false},
        {"type":"object","properties":{"kind":{"enum":["unknown","unrecorded"]}},"required":["kind"],"additionalProperties":false}]});
    json!({"name":"dashboard_sleep_records","description":description,
    "inputSchema":{"oneOf":[
        {"type":"object","properties":{"action":{"const":"read"}},"required":["action"],"additionalProperties":false},
        {"type":"object","properties":{"action":{"const":"save"},"input":{"type":"object","properties":{"recordId":{"type":["string","null"]},"wakeDate":{"type":"string"},"sleepOnset":endpoint,"getUp":endpoint,"changeId":{"type":"string"},"targetBinding":{"type":"string"},"expectedRevision":{"type":["string","null"]}},"required":["wakeDate","changeId","targetBinding","expectedRevision"],"additionalProperties":false}},"required":["action","input"],"additionalProperties":false}
    ]}})
}
