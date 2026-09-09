use crate::habits::{project_snapshot, snapshot_dates, LocalHabitRecord, SNAPSHOT_RELATIVE_PATH};
pub use crate::habits::{HabitCellStatus, HabitSnapshotState, HabitSnapshotView};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

const DAILY_RECORD_TYPE: &str = "daily-record";
const CANONICAL_SECTIONS: [&str; 5] = [
    "早间基准",
    "今天的大致安排",
    "计划依据",
    "白天更新",
    "晚间复盘",
];

pub trait TodayWorkspacePersistence {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String>;
    fn save_selected_vault(&self, vault: &Path) -> Result<(), String>;
}

pub trait TodayWorkspaceExchange {
    fn select_vault(&self) -> Result<Option<PathBuf>, String>;
}

pub trait TodayClock {
    fn current_date(&self) -> String;
    fn current_time_label(&self) -> String;
    fn current_timestamp_label(&self) -> String;
}

pub trait TodayRecordStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String>;
    fn save_if_unchanged(&self, path: &Path, expected: &[u8], updated: &[u8])
        -> Result<(), String>;

    fn create_new(&self, _path: &Path, _document: &[u8]) -> Result<(), String> {
        Err("This Daily Record store does not support exclusive creation.".into())
    }
}

#[derive(Clone, Copy)]
pub struct FileTodayRecordStore;

impl TodayRecordStore for FileTodayRecordStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        match fs::read(path) {
            Ok(document) => Ok(Some(document)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(format!("Could not read today's daily record: {error}")),
        }
    }

    fn save_if_unchanged(
        &self,
        path: &Path,
        expected: &[u8],
        updated: &[u8],
    ) -> Result<(), String> {
        save_file_if_unchanged(path, expected, updated, |_| Ok(()))
    }

    fn create_new(&self, path: &Path, document: &[u8]) -> Result<(), String> {
        let parent = path
            .parent()
            .ok_or_else(|| "The Daily Record has no parent directory.".to_string())?;
        fs::create_dir_all(parent)
            .map_err(|error| format!("Could not create the Daily Record directory: {error}"))?;
        let (temporary, mut output) = create_temporary_file(path)?;
        let prepared = output
            .write_all(document)
            .and_then(|_| output.sync_all())
            .map_err(|error| format!("Could not prepare the new Daily Record: {error}"));
        drop(output);
        if let Err(error) = prepared {
            let _ = fs::remove_file(&temporary);
            return Err(error);
        }
        if let Err(error) = fs::hard_link(&temporary, path) {
            let _ = fs::remove_file(&temporary);
            return Err(if error.kind() == std::io::ErrorKind::AlreadyExists {
                "该日期的 Daily Record 已被另一个写入创建。请刷新后重试；现有内容未被覆盖。"
                    .to_string()
            } else {
                format!("Could not exclusively activate the new Daily Record: {error}")
            });
        }
        sync_parent(path).map_err(|error| {
            format!(
                "{error}; the complete new Daily Record is present at {} and can be verified by refreshing",
                path.display()
            )
        })?;
        fs::remove_file(&temporary).map_err(|error| {
            format!(
                "The new Daily Record is active, but its temporary hard link remains at {}: {error}",
                temporary.display()
            )
        })?;
        sync_parent(path)
    }
}

fn save_file_if_unchanged<F>(
    path: &Path,
    expected: &[u8],
    updated: &[u8],
    before_exchange: F,
) -> Result<(), String>
where
    F: FnOnce(&Path) -> Result<(), String>,
{
    let current = fs::read(path)
        .map_err(|error| format!("Could not re-read today's daily record: {error}"))?;
    if current != expected {
        return Err(external_change_message(None));
    }
    prepare_recovery_directory(path)?;
    let (temporary, mut output) = create_temporary_file(path)?;
    let preparation = (|| {
        fs::set_permissions(
            &temporary,
            fs::metadata(path)
                .map_err(|error| {
                    format!("Could not inspect today's daily record permissions: {error}")
                })?
                .permissions(),
        )
        .map_err(|error| format!("Could not preserve today's daily record permissions: {error}"))?;
        output
            .write_all(updated)
            .and_then(|_| output.sync_all())
            .map_err(|error| format!("Could not write today's daily record update: {error}"))?;
        drop(output);
        before_exchange(&temporary)
    })();
    if let Err(error) = preparation {
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }

    if let Err(error) = atomic_exchange(&temporary, path) {
        let _ = fs::remove_file(&temporary);
        return Err(error);
    }
    let recovery = preserve_displaced_inode(path, &temporary).or_else(|preservation_error| {
        match atomic_exchange(&temporary, path) {
            Ok(()) => {
                let _ = sync_parent(path);
                Err(format!(
                    "{preservation_error}; activation was rolled back and the rejected Dashboard candidate remains at {}",
                    temporary.display()
                ))
            }
            Err(rollback_error) => Err(format!(
                "{preservation_error}; rollback also failed ({rollback_error}); the actual displaced Daily Record inode remains linked at {}",
                temporary.display()
            )),
        }
    })?;
    let displaced = fs::read(&temporary).map_err(|error| {
        format!(
            "Could not verify the displaced daily record after atomic exchange; its durable recovery link remains at {}: {error}",
            recovery.display()
        )
    })?;
    if displaced == expected {
        let active = fs::read(path).map_err(|error| {
            format!(
                "Could not verify today's daily record after atomic exchange; the actual displaced inode remains recoverable at {}: {error}",
                recovery.display()
            )
        })?;
        if active == updated {
            sync_parent(path)?;
            sync_parent(&recovery)?;
            fs::remove_file(&temporary).map_err(|error| {
                format!("Could not remove the completed daily record snapshot: {error}")
            })?;
            return Ok(());
        }

        // An external writer superseded our complete atomic activation. Its bytes remain
        // canonical; the inode displaced by our activation remains linked in recovery.
        let _ = fs::remove_file(&temporary);
        return Err(external_change_message(Some(&recovery)));
    }

    // The canonical path changed after the initial read. Swap the exact displaced version
    // back instead of overwriting it with our candidate.
    atomic_exchange(&temporary, path).map_err(|error| {
        format!(
            "{error}; the displaced external record remains at {} for recovery",
            temporary.display()
        )
    })?;
    let active_after_rollback = fs::read(path).map_err(|error| {
        format!("Could not verify today's daily record after conflict rollback: {error}")
    })?;
    let exchanged_candidate = fs::read(&temporary).map_err(|error| {
        format!("Could not verify the rejected daily record candidate: {error}")
    })?;
    if active_after_rollback == displaced && exchanged_candidate == updated {
        fs::remove_file(&temporary).map_err(|error| {
            format!("Could not remove the rejected daily record candidate: {error}")
        })?;
        sync_parent(path)?;
        return Err(external_change_message(Some(&recovery)));
    }

    // A second uncoordinated save crossed the rollback itself. Never delete the bytes that
    // were exchanged out; retain them beside the record for explicit recovery.
    let recovery = preserve_conflict_snapshot(path, &temporary)?;
    sync_parent(path)?;
    Err(external_change_message(Some(&recovery)))
}

fn prepare_recovery_directory(path: &Path) -> Result<(), String> {
    let recovery_directory = recovery_directory_for(path)?;
    fs::create_dir_all(&recovery_directory).map_err(|error| {
        format!(
            "Could not create the Daily Record recovery directory; no write was attempted: {error}"
        )
    })
}

fn preserve_displaced_inode(path: &Path, displaced: &Path) -> Result<PathBuf, String> {
    let recovery_directory = recovery_directory_for(path)?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Could not create a recovery snapshot nonce: {error}"))?
        .as_nanos();
    let record_name = path
        .file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or("daily-record");
    for attempt in 0..32u8 {
        let recovery = recovery_directory.join(format!(
            "{record_name}-{nonce}-{}-{attempt}.snapshot",
            std::process::id()
        ));
        match fs::hard_link(displaced, &recovery) {
            Ok(()) => {
                sync_parent(&recovery)?;
                return Ok(recovery);
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => {
                return Err(format!(
                    "Could not preserve the Daily Record inode actually displaced during activation: {error}"
                ))
            }
        }
    }
    Err(
        "Could not reserve a unique recovery path for the Daily Record inode actually displaced during activation."
            .into(),
    )
}

fn recovery_directory_for(path: &Path) -> Result<PathBuf, String> {
    let vault = path
        .ancestors()
        .find(|ancestor| ancestor.file_name().is_some_and(|name| name == "life"))
        .and_then(Path::parent);
    let root = vault.or_else(|| path.parent()).ok_or_else(|| {
        "Today's Daily Record has no location for a same-volume recovery snapshot.".to_string()
    })?;
    Ok(root.join(".personal-dashboard-recovery").join("today"))
}

fn create_temporary_file(path: &Path) -> Result<(PathBuf, fs::File), String> {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Could not create a daily record update nonce: {error}"))?
        .as_nanos();
    for attempt in 0..32u8 {
        let temporary = path.with_extension(format!(
            "md.personal-dashboard-tmp-{}-{nonce}-{attempt}",
            std::process::id()
        ));
        match OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temporary)
        {
            Ok(output) => return Ok((temporary, output)),
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => {
                return Err(format!(
                    "Could not prepare today's daily record update: {error}"
                ))
            }
        }
    }
    Err("Could not reserve a unique temporary daily record path.".into())
}

fn external_change_message(recovery: Option<&Path>) -> String {
    match recovery {
        Some(path) => format!(
            "今天的 Daily Record 在保存边界发生了并发变化。未静默丢弃交错内容；恢复副本保存在 {}。请在 Obsidian 中检查后刷新 Today。",
            path.display()
        ),
        None => "今天的 Daily Record 已在外部发生变化。请刷新 Today 后再保存；外部内容未被覆盖。".into(),
    }
}

fn preserve_conflict_snapshot(path: &Path, temporary: &Path) -> Result<PathBuf, String> {
    let recovery_directory = recovery_directory_for(path)?;
    fs::create_dir_all(&recovery_directory).map_err(|error| {
        format!("Could not create the Daily Record recovery directory: {error}")
    })?;
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| format!("Could not create a conflict snapshot nonce: {error}"))?
        .as_nanos();
    for attempt in 0..32u8 {
        let record_name = path
            .file_stem()
            .and_then(|name| name.to_str())
            .unwrap_or("daily-record");
        let recovery = recovery_directory.join(format!(
            "{record_name}-conflict-{nonce}-{}-{attempt}.snapshot",
            std::process::id()
        ));
        match fs::hard_link(temporary, &recovery) {
            Ok(()) => {
                fs::remove_file(temporary).map_err(|error| {
                    format!("Could not finalize the conflict recovery snapshot: {error}")
                })?;
                return Ok(recovery);
            }
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => {
                return Err(format!(
                    "Could not preserve the concurrent daily record snapshot: {error}"
                ))
            }
        }
    }
    Err("Could not reserve a unique daily record conflict snapshot path.".into())
}

fn sync_parent(path: &Path) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "Today's daily record has no parent directory.".to_string())?;
    fs::File::open(parent)
        .and_then(|directory| directory.sync_all())
        .map_err(|error| format!("Could not sync today's daily record directory: {error}"))
}

#[cfg(target_os = "macos")]
fn atomic_exchange(left: &Path, right: &Path) -> Result<(), String> {
    use std::ffi::CString;
    use std::os::unix::ffi::OsStrExt;

    const RENAME_SWAP: u32 = 0x0000_0002;
    unsafe extern "C" {
        fn renamex_np(
            from: *const std::os::raw::c_char,
            to: *const std::os::raw::c_char,
            flags: u32,
        ) -> i32;
    }

    let left = CString::new(left.as_os_str().as_bytes())
        .map_err(|_| "The temporary daily record path contains a NUL byte.".to_string())?;
    let right = CString::new(right.as_os_str().as_bytes())
        .map_err(|_| "The daily record path contains a NUL byte.".to_string())?;
    // SAFETY: both C strings are NUL-terminated and remain alive for the duration of the call.
    let result = unsafe { renamex_np(left.as_ptr(), right.as_ptr(), RENAME_SWAP) };
    if result == 0 {
        Ok(())
    } else {
        Err(format!(
            "Could not atomically exchange today's daily record: {}",
            std::io::Error::last_os_error()
        ))
    }
}

#[cfg(not(target_os = "macos"))]
fn atomic_exchange(_left: &Path, _right: &Path) -> Result<(), String> {
    Err("Atomic conditional Daily Record replacement is currently supported only on macOS.".into())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum DaytimeUpdateKind {
    MeaningfulEvent,
    RememberedBlock,
    HabitOutcome,
    MaterialChange,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DaytimeUpdateInput {
    pub expected_revision: String,
    pub kind: DaytimeUpdateKind,
    pub content: String,
    pub habit_name: Option<String>,
    pub habit_outcome: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum EveningUpdateMode {
    Addition,
    Correction,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EveningUpdateInput {
    pub expected_revision: String,
    pub mode: EveningUpdateMode,
    pub content: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum ShortRecordCategory {
    Ordinary,
    Exercise,
}

impl ShortRecordCategory {
    fn as_str(self) -> &'static str {
        match self {
            Self::Ordinary => "ordinary",
            Self::Exercise => "exercise",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatedNoteInput {
    pub date: String,
    pub target_binding: String,
    pub expected_revision: Option<String>,
    pub entry_id: String,
    pub category: ShortRecordCategory,
    pub content: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatedNoteCorrectionInput {
    pub date: String,
    pub target_binding: String,
    pub expected_revision: String,
    pub entry_id: String,
    pub change_id: String,
    pub content: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TodayState {
    Unconfigured,
    Missing,
    Ready,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DailyPhase {
    Morning,
    Daytime,
    Evening,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DailyRecordAvailability {
    Missing,
    Unreviewed,
    Reviewed,
    Error,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarDayView {
    pub date: String,
    pub in_month: bool,
    pub is_today: bool,
    pub availability: DailyRecordAvailability,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarMonthView {
    pub year: i32,
    pub month: u32,
    pub configured: bool,
    pub days: Vec<CalendarDayView>,
}

impl CalendarMonthView {
    pub fn day(&self, date: &str) -> Option<&CalendarDayView> {
        self.days.iter().find(|day| day.date == date)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MorningBlockView {
    pub period: String,
    pub title: String,
    pub detail: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlanningEvidenceView {
    pub label: String,
    pub items: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum BaselineAvailability {
    Missing,
    Empty,
    Saved,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MorningBaselineView {
    pub availability: BaselineAvailability,
    pub message: String,
    pub timeline: Vec<MorningBlockView>,
    pub evidence: Vec<PlanningEvidenceView>,
}

impl MorningBaselineView {
    fn missing() -> Self {
        Self {
            availability: BaselineAvailability::Missing,
            message: "这份 Daily Record 未独立保存早间基准；当前安排仍可在 Daytime 查看。".into(),
            timeline: Vec::new(),
            evidence: Vec::new(),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DaytimeUpdateView {
    pub title: String,
    pub context: Vec<String>,
    pub neutral: Vec<String>,
    pub observed_facts: Vec<String>,
    pub original_intent: Vec<String>,
    pub change_reasons: Vec<String>,
    pub revised_direction: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EveningOtherView {
    pub heading: String,
    pub lines: Vec<String>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DaytimeView {
    pub updates: Vec<DaytimeUpdateView>,
    pub short_records: Vec<ShortRecordView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortRecordChangeView {
    pub id: String,
    pub modified_at: String,
    pub old_text: String,
    pub new_text: String,
    pub needs_review: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ShortRecordView {
    pub id: String,
    pub date: String,
    pub category: ShortRecordCategory,
    pub created_at: String,
    pub text: String,
    pub changes: Vec<ShortRecordChangeView>,
    pub needs_review: bool,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EveningView {
    pub account: Vec<String>,
    pub comparison: Vec<String>,
    pub summary: Vec<String>,
    pub questions: Vec<String>,
    pub additions: Vec<String>,
    pub corrections: Vec<String>,
    pub other: Vec<EveningOtherView>,
    pub record_supplements: Vec<ShortRecordView>,
    pub has_later_record_revision: bool,
}

fn evening_has_content(evening: &EveningView) -> bool {
    !evening.account.is_empty()
        || !evening.comparison.is_empty()
        || !evening.summary.is_empty()
        || !evening.questions.is_empty()
        || !evening.additions.is_empty()
        || !evening.corrections.is_empty()
        || !evening.other.is_empty()
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TodayView {
    pub state: TodayState,
    pub date: String,
    pub is_today: bool,
    pub can_record: bool,
    pub default_phase: DailyPhase,
    pub vault_name: Option<String>,
    pub message: String,
    pub revision: Option<String>,
    pub target_binding: Option<String>,
    pub baseline: MorningBaselineView,
    pub timeline: Vec<MorningBlockView>,
    pub evidence: Vec<PlanningEvidenceView>,
    pub daytime: DaytimeView,
    pub evening: EveningView,
}

pub struct TodayApplication<P, E, C, S = FileTodayRecordStore> {
    persistence: P,
    exchange: E,
    clock: C,
    record_store: S,
    habit_cache: Mutex<HashMap<PathBuf, HabitSnapshotView>>,
}

impl<P, E, C> TodayApplication<P, E, C, FileTodayRecordStore>
where
    P: TodayWorkspacePersistence,
    E: TodayWorkspaceExchange,
    C: TodayClock,
{
    pub fn new(persistence: P, exchange: E, clock: C) -> Self {
        Self {
            persistence,
            exchange,
            clock,
            record_store: FileTodayRecordStore,
            habit_cache: Mutex::new(HashMap::new()),
        }
    }
}

impl<P, E, C, S> TodayApplication<P, E, C, S>
where
    P: TodayWorkspacePersistence,
    E: TodayWorkspaceExchange,
    C: TodayClock,
    S: TodayRecordStore,
{
    pub fn with_record_store(persistence: P, exchange: E, clock: C, record_store: S) -> Self {
        Self {
            persistence,
            exchange,
            clock,
            record_store,
            habit_cache: Mutex::new(HashMap::new()),
        }
    }

    pub fn habits(&self) -> Result<HabitSnapshotView, String> {
        let Some(vault) = self.persistence.load_selected_vault()? else {
            return Ok(HabitSnapshotView::unconfigured());
        };
        let path = vault.join(SNAPSHOT_RELATIVE_PATH);
        let document = match fs::read(&path) {
            Ok(document) => document,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(HabitSnapshotView::missing())
            }
            Err(error) => {
                return Ok(HabitSnapshotView::error(format!(
                    "无法读取 Habits 快照：{error}"
                )))
            }
        };
        let today = self.clock.current_date();
        let dates = match snapshot_dates(&document, &today) {
            Ok(dates) => dates,
            Err(error) => return Ok(self.retained_or_error(&path, error)?),
        };
        let mut local_records = Vec::new();
        for date in dates {
            let record_path = canonical_record_path(&vault, &date)?;
            let Ok(Some(bytes)) = self.record_store.load(&record_path) else {
                continue;
            };
            let Ok(record) = String::from_utf8(bytes) else {
                continue;
            };
            let Ok(records) = parse_short_records(&record, &date) else {
                continue;
            };
            for record in records
                .into_iter()
                .filter(|record| record.category == ShortRecordCategory::Exercise)
            {
                local_records.push(LocalHabitRecord {
                    key: "exercise".into(),
                    date: record.date,
                    source_label: "Dashboard Daily Record".into(),
                    text: record.text,
                });
            }
        }
        match project_snapshot(&document, &today, local_records) {
            Ok(view) => {
                self.habit_cache
                    .lock()
                    .map_err(|_| "Habits 快照缓存不可用。".to_string())?
                    .insert(path, view.clone());
                Ok(view)
            }
            Err(error) => Ok(self.retained_or_error(&path, error)?),
        }
    }

    fn retained_or_error(&self, path: &Path, error: String) -> Result<HabitSnapshotView, String> {
        let cache = self
            .habit_cache
            .lock()
            .map_err(|_| "Habits 快照缓存不可用。".to_string())?;
        if let Some(previous) = cache.get(path) {
            let mut retained = previous.clone();
            retained.state = HabitSnapshotState::Retained;
            retained.message = format!("刷新失败，继续显示上个有效快照：{error}");
            Ok(retained)
        } else {
            Ok(HabitSnapshotView::error(format!(
                "Habits 快照无效；没有可保留的旧读数：{error}"
            )))
        }
    }

    pub fn open(&self) -> Result<TodayView, String> {
        let date = self.clock.current_date();
        self.open_date(&date)
    }

    pub fn open_date(&self, date: &str) -> Result<TodayView, String> {
        canonical_record_path(Path::new("."), date)?;
        let is_today = date == self.clock.current_date();
        let Some(vault) = self.persistence.load_selected_vault()? else {
            return Ok(TodayView {
                state: TodayState::Unconfigured,
                date: date.to_owned(),
                is_today,
                can_record: false,
                default_phase: if is_today {
                    DailyPhase::Morning
                } else {
                    DailyPhase::Daytime
                },
                vault_name: None,
                message: "请选择 Tortilla Flat vault，以读取 Daily Record。".into(),
                revision: None,
                target_binding: None,
                baseline: MorningBaselineView::missing(),
                timeline: Vec::new(),
                evidence: Vec::new(),
                daytime: DaytimeView::default(),
                evening: EveningView::default(),
            });
        };
        self.open_vault(&vault, date.to_owned())
    }

    pub fn select_vault(&self) -> Result<TodayView, String> {
        let Some(vault) = self.exchange.select_vault()? else {
            return self.open();
        };
        self.persistence.save_selected_vault(&vault)?;
        self.open_vault(&vault, self.clock.current_date())
    }

    pub fn calendar_month(&self, year: i32, month: u32) -> Result<CalendarMonthView, String> {
        let first_day = CalendarDate::new(year, month, 1)
            .ok_or_else(|| "The selected calendar month is invalid.".to_string())?;
        let current_date = self.clock.current_date();
        let start = first_day.unix_days() - first_day.weekday_from_sunday();
        let vault = self.persistence.load_selected_vault()?;
        let mut days = Vec::with_capacity(42);
        for offset in 0..42 {
            let date = CalendarDate::from_unix_days(start + offset);
            let date_label = date.to_string();
            let availability = match vault.as_deref() {
                None => DailyRecordAvailability::Missing,
                Some(vault) => match self.open_vault(vault, date_label.clone()) {
                    Ok(view) => match view.state {
                        TodayState::Ready if evening_has_content(&view.evening) => {
                            DailyRecordAvailability::Reviewed
                        }
                        TodayState::Ready => DailyRecordAvailability::Unreviewed,
                        TodayState::Missing | TodayState::Unconfigured => {
                            DailyRecordAvailability::Missing
                        }
                        TodayState::Error => DailyRecordAvailability::Error,
                    },
                    Err(_) => DailyRecordAvailability::Error,
                },
            };
            days.push(CalendarDayView {
                date: date_label.clone(),
                in_month: date.year == year && date.month == month,
                is_today: date_label == current_date,
                availability,
            });
        }
        Ok(CalendarMonthView {
            year,
            month,
            configured: vault.is_some(),
            days,
        })
    }

    pub fn add_dated_note(&self, input: DatedNoteInput) -> Result<TodayView, String> {
        validate_short_text(&input.content, "简短记录")?;
        validate_local_identifier(&input.entry_id, "记录标识")?;
        self.validate_event_date(&input.date)?;
        let (vault, path) = self.bound_record_target(&input.date, &input.target_binding)?;
        let created_at = self.clock.current_timestamp_label();
        validate_timestamp_label(&created_at)?;

        match self.record_store.load(&path)? {
            Some(bytes) => {
                let document = String::from_utf8(bytes).map_err(|_| {
                    "该日期的 Daily Record 不是有效的 UTF-8 文本；未写入任何内容。".to_string()
                })?;
                let records = parse_short_records(&document, &input.date)?;
                if let Some(record) = records.iter().find(|record| record.id == input.entry_id) {
                    if record.category == input.category && record.text == input.content.trim() {
                        return self.open_vault(&vault, input.date);
                    }
                    return Err(
                        "该记录标识已经用于另一条内容。请刷新后重试；未写入任何内容。".into(),
                    );
                }
                let expected = input.expected_revision.as_deref().ok_or_else(|| {
                    "该日期的 Daily Record 已被创建。请刷新后重试；现有内容未被覆盖。".to_string()
                })?;
                require_revision_for_date(&document, expected, &input.date)?;
                validate_writable_daily_record(&document, &input.date)?;
                let marker = short_record_marker(
                    &input.entry_id,
                    input.category,
                    &created_at,
                    daily_record_has_review(&document, &input.date)?,
                );
                let block = format!("{marker}\n- {}", literal_line(input.content.trim()));
                let updated = append_to_named_subsection(
                    &document,
                    "白天更新",
                    "简短记录",
                    &block,
                    Some("晚间复盘"),
                )?;
                validate_writable_daily_record(&updated, &input.date)?;
                self.record_store.save_if_unchanged(
                    &path,
                    document.as_bytes(),
                    updated.as_bytes(),
                )?;
            }
            None => {
                if input.expected_revision.is_some() {
                    return Err(
                        "该日期的 Daily Record 已不存在。请刷新后重试；未创建替代记录。".into(),
                    );
                }
                let marker =
                    short_record_marker(&input.entry_id, input.category, &created_at, false);
                let block = format!("{marker}\n- {}", literal_line(input.content.trim()));
                let document = minimal_daily_record(&input.date, &block);
                validate_writable_daily_record(&document, &input.date)?;
                self.record_store.create_new(&path, document.as_bytes())?;
            }
        }
        self.open_vault(&vault, input.date)
    }

    pub fn correct_dated_note(&self, input: DatedNoteCorrectionInput) -> Result<TodayView, String> {
        validate_short_text(&input.content, "更正内容")?;
        validate_local_identifier(&input.entry_id, "记录标识")?;
        validate_local_identifier(&input.change_id, "修改标识")?;
        self.validate_event_date(&input.date)?;
        let (vault, path) = self.bound_record_target(&input.date, &input.target_binding)?;
        let bytes = self.record_store.load(&path)?.ok_or_else(|| {
            "该日期的 Daily Record 已不存在。请刷新后重试；未创建替代记录。".to_string()
        })?;
        let document = String::from_utf8(bytes).map_err(|_| {
            "该日期的 Daily Record 不是有效的 UTF-8 文本；未写入任何内容。".to_string()
        })?;
        let parsed = parse_short_record_locations(&document, &input.date)?;
        if let Some(change) = parsed
            .changes
            .iter()
            .find(|change| change.view.id == input.change_id)
        {
            if change.entry_id == input.entry_id && change.view.new_text == input.content.trim() {
                return self.open_vault(&vault, input.date);
            }
            return Err("该修改标识已经用于另一项更正。请刷新后重试；未写入任何内容。".into());
        }
        require_revision_for_date(&document, &input.expected_revision, &input.date)?;
        validate_writable_daily_record(&document, &input.date)?;
        let record = parsed
            .records
            .iter()
            .find(|record| record.view.id == input.entry_id)
            .ok_or_else(|| "找不到要更正的简短记录。请刷新后确认该条目仍然存在。".to_string())?;
        let modified_at = self.clock.current_timestamp_label();
        validate_timestamp_label(&modified_at)?;
        let old_text = record.view.text.clone();
        let mut updated = String::with_capacity(document.len() + input.content.len() + 200);
        updated.push_str(&document[..record.text_start]);
        updated.push_str("- ");
        updated.push_str(input.content.trim());
        updated.push_str(&document[record.text_end..]);
        let change_block = format!(
            "{}\n- 原文：{}\n- 新文：{}",
            short_record_change_marker(
                &input.change_id,
                &input.entry_id,
                &modified_at,
                daily_record_has_review(&document, &input.date)?,
            ),
            literal_line(&old_text),
            literal_line(input.content.trim())
        );
        updated = append_to_named_subsection(
            &updated,
            "白天更新",
            "修改记录",
            &change_block,
            Some("晚间复盘"),
        )?;
        validate_writable_daily_record(&updated, &input.date)?;
        self.record_store
            .save_if_unchanged(&path, document.as_bytes(), updated.as_bytes())?;
        self.open_vault(&vault, input.date)
    }

    fn validate_event_date(&self, date: &str) -> Result<(), String> {
        let selected = CalendarDate::parse(date).ok_or_else(|| {
            "The selected date is not a valid YYYY-MM-DD calendar date.".to_string()
        })?;
        let today = CalendarDate::parse(&self.clock.current_date())
            .ok_or_else(|| "The system clock did not provide a valid calendar date.".to_string())?;
        if selected.unix_days() > today.unix_days() {
            return Err("不能在未来日期记录已经发生的事实。请选择今天或过去日期。".into());
        }
        Ok(())
    }

    fn bound_record_target(&self, date: &str, binding: &str) -> Result<(PathBuf, PathBuf), String> {
        let vault = self
            .persistence
            .load_selected_vault()?
            .ok_or_else(|| "请先选择 Tortilla Flat vault，再保存简短记录。".to_string())?;
        let path = canonical_record_path(&vault, date)?;
        if record_target_binding(&path) != binding {
            return Err(
                "Vault 或日期保存目标已经变化。草稿仍保留；请返回原日期或刷新后再保存。".into(),
            );
        }
        Ok((vault, path))
    }

    pub fn append_daytime_update(&self, input: DaytimeUpdateInput) -> Result<TodayView, String> {
        validate_short_text(&input.content, "白天更新")?;
        let (heading, body) = daytime_block(&input, &self.clock.current_time_label())?;
        let (vault, path, document) = self.load_writable_record()?;
        require_revision(&document, &input.expected_revision)?;
        validate_writable_daily_record(&document, &self.clock.current_date())?;
        let updated = append_to_canonical_section(
            &document,
            "白天更新",
            &format!("### {heading}\n\n{body}"),
            Some("晚间复盘"),
        );
        validate_writable_daily_record(&updated, &self.clock.current_date())?;
        self.record_store
            .save_if_unchanged(&path, document.as_bytes(), updated.as_bytes())?;
        self.open_vault(&vault, self.clock.current_date())
    }

    pub fn update_evening_review(&self, input: EveningUpdateInput) -> Result<TodayView, String> {
        validate_short_text(&input.content, "晚间复盘更新")?;
        let (vault, path, document) = self.load_writable_record()?;
        require_revision(&document, &input.expected_revision)?;
        validate_writable_daily_record(&document, &self.clock.current_date())?;
        let updated = match input.mode {
            EveningUpdateMode::Addition => update_evening_subsection(
                &document,
                "用户补充",
                &format!("- {}", literal_line(input.content.trim())),
                false,
            )?,
            EveningUpdateMode::Correction => update_evening_subsection(
                &document,
                "用户修正",
                &format!("- {}", literal_line(input.content.trim())),
                true,
            )?,
        };
        validate_writable_daily_record(&updated, &self.clock.current_date())?;
        self.record_store
            .save_if_unchanged(&path, document.as_bytes(), updated.as_bytes())?;
        self.open_vault(&vault, self.clock.current_date())
    }

    fn load_writable_record(&self) -> Result<(PathBuf, PathBuf, String), String> {
        let vault = self.persistence.load_selected_vault()?.ok_or_else(|| {
            "请先选择 Tortilla Flat vault，再更新今天的 Daily Record。".to_string()
        })?;
        let path = canonical_record_path(&vault, &self.clock.current_date())?;
        let bytes = self.record_store.load(&path)?.ok_or_else(|| {
            "今天还没有 Daily Record。请先让 Codex 运行早间流程，然后刷新 Today。".to_string()
        })?;
        let document = String::from_utf8(bytes).map_err(|_| {
            "今天的 Daily Record 不是有效的 UTF-8 文本；未写入任何内容。".to_string()
        })?;
        Ok((vault, path, document))
    }

    fn open_vault(&self, vault: &Path, date: String) -> Result<TodayView, String> {
        let is_today = date == self.clock.current_date();
        let can_record = CalendarDate::parse(&date).is_some_and(|selected| {
            CalendarDate::parse(&self.clock.current_date())
                .is_some_and(|today| selected.unix_days() <= today.unix_days())
        });
        let vault_name = vault
            .file_name()
            .and_then(|name| name.to_str())
            .map(str::to_owned);
        let path = canonical_record_path(vault, &date)?;
        let target_binding = record_target_binding(&path);
        let bytes = match self.record_store.load(&path)? {
            Some(document) => document,
            None => {
                let message =
                    format!("{date} 还没有 Daily Record。只有明确保存一句记录时才会建立最小记录。");
                return Ok(TodayView {
                    state: TodayState::Missing,
                    date,
                    is_today,
                    can_record,
                    default_phase: if is_today {
                        DailyPhase::Morning
                    } else {
                        DailyPhase::Daytime
                    },
                    vault_name,
                    message,
                    revision: None,
                    target_binding: Some(target_binding),
                    baseline: MorningBaselineView::missing(),
                    timeline: Vec::new(),
                    evidence: Vec::new(),
                    daytime: DaytimeView::default(),
                    evening: EveningView::default(),
                });
            }
        };
        let document = String::from_utf8(bytes)
            .map_err(|_| "今天的 Daily Record 不是有效的 UTF-8 文本。".to_string())?;
        let revision = document_revision(document.as_bytes());

        match parse_daily_record(&document, &date) {
            Ok((baseline, timeline, evidence, mut daytime, mut evening)) => {
                let short_records = parse_short_records(&document, &date)?;
                daytime.short_records = short_records.clone();
                evening.has_later_record_revision = short_records.iter().any(|record| {
                    record.needs_review || record.changes.iter().any(|change| change.needs_review)
                });
                evening.record_supplements = short_records;
                let message = if timeline.is_empty() {
                    "这份 Daily Record 有效，但当前安排尚未写入。"
                } else {
                    match baseline.availability {
                        BaselineAvailability::Missing => {
                            "已读取当前安排；这份 Daily Record 未独立保存早间基准。"
                        }
                        BaselineAvailability::Empty => {
                            "已读取当前安排；早间基准章节存在但内容为空。"
                        }
                        BaselineAvailability::Saved => "已读取独立早间基准和当前安排。",
                    }
                };
                Ok(TodayView {
                    state: TodayState::Ready,
                    date,
                    is_today,
                    can_record,
                    default_phase: if is_today {
                        DailyPhase::Morning
                    } else if evening_has_content(&evening) {
                        DailyPhase::Evening
                    } else {
                        DailyPhase::Daytime
                    },
                    vault_name,
                    message: message.into(),
                    revision: Some(revision),
                    target_binding: Some(target_binding),
                    baseline,
                    timeline,
                    evidence,
                    daytime,
                    evening,
                })
            }
            Err(message) => Ok(TodayView {
                state: TodayState::Error,
                date,
                is_today,
                can_record,
                default_phase: if is_today {
                    DailyPhase::Morning
                } else {
                    DailyPhase::Daytime
                },
                vault_name,
                message,
                revision: None,
                target_binding: Some(target_binding),
                baseline: MorningBaselineView::missing(),
                timeline: Vec::new(),
                evidence: Vec::new(),
                daytime: DaytimeView::default(),
                evening: EveningView::default(),
            }),
        }
    }
}

fn validate_daily_record(document: &str, expected_date: &str) -> Result<(), String> {
    parse_daily_record(document, expected_date).map(|_| ())
}

fn daily_record_has_review(document: &str, expected_date: &str) -> Result<bool, String> {
    parse_daily_record(document, expected_date)
        .map(|(_, _, _, _, evening)| evening_has_content(&evening))
}

fn validate_writable_daily_record(document: &str, expected_date: &str) -> Result<(), String> {
    validate_daily_record(document, expected_date)?;
    let layout = document_layout(document)
        .ok_or_else(|| "今天的 Daily Record 缺少有效 frontmatter。未写入任何内容。".to_string())?;
    if scan_markdown_lines(&document[layout.body_start..]).unclosed_fence {
        return Err(
            "今天的 Daily Record 正文包含未闭合的 Markdown 代码围栏，无法安全定位写入位置；未写入任何内容。"
                .into(),
        );
    }
    Ok(())
}

fn document_revision(document: &[u8]) -> String {
    let mut hash = 0xcbf29ce484222325u64;
    for byte in document {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

fn require_revision(document: &str, expected: &str) -> Result<(), String> {
    if document_revision(document.as_bytes()) == expected {
        Ok(())
    } else {
        Err(
            "今天的 Daily Record 已在外部发生变化。请刷新 Today 后再保存；外部内容未被覆盖。"
                .into(),
        )
    }
}

fn require_revision_for_date(document: &str, expected: &str, date: &str) -> Result<(), String> {
    if document_revision(document.as_bytes()) == expected {
        Ok(())
    } else {
        Err(format!(
            "{date} 的 Daily Record 已在外部发生变化。草稿仍保留；请刷新后再保存，外部内容未被覆盖。"
        ))
    }
}

fn record_target_binding(path: &Path) -> String {
    let normalized = path.to_string_lossy();
    format!("target-{}", document_revision(normalized.as_bytes()))
}

fn validate_short_text(value: &str, label: &str) -> Result<(), String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(format!("{label}不能为空。"));
    }
    if value.chars().count() > 500 || value.contains(['\n', '\r']) {
        return Err(format!("{label}只能是一条不超过 500 字的简短内容。"));
    }
    Ok(())
}

fn daytime_block(input: &DaytimeUpdateInput, time: &str) -> Result<(String, String), String> {
    let content = literal_line(input.content.trim());
    match input.kind {
        DaytimeUpdateKind::MeaningfulEvent => Ok((
            format!("{time} — 有意义的事件"),
            format!("- 观察事实：{content}"),
        )),
        DaytimeUpdateKind::RememberedBlock => Ok((
            format!("{time} — 补记时间块"),
            format!("- 观察事实：{content}"),
        )),
        DaytimeUpdateKind::MaterialChange => Ok((
            format!("{time} — 重大调整"),
            format!("- 调整后方向：{content}"),
        )),
        DaytimeUpdateKind::HabitOutcome => {
            let habit = input.habit_name.as_deref().unwrap_or("").trim();
            validate_short_text(habit, "Habit 名称")?;
            let outcome = input.habit_outcome.as_deref().unwrap_or("");
            if !matches!(outcome, "normal" | "baseline" | "partial" | "not_done") {
                return Err("Habit 结果只能是 normal、baseline、partial 或 not_done；未选择仍表示 unknown。".into());
            }
            Ok((
                format!("{time} — Habit 结果"),
                format!(
                    "- 观察事实：Habit：{}；结果：{}；说明：{}",
                    literal_line(habit),
                    outcome,
                    content
                ),
            ))
        }
    }
}

fn literal_line(value: &str) -> String {
    value.to_owned()
}

fn validate_local_identifier(value: &str, label: &str) -> Result<(), String> {
    if value.is_empty()
        || value.len() > 96
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err(format!("{label}格式无效；未写入任何内容。"));
    }
    Ok(())
}

fn validate_timestamp_label(value: &str) -> Result<(), String> {
    let has_offset = value
        .get(16..)
        .is_some_and(|suffix| suffix.starts_with('+') || suffix.starts_with('-'));
    if value.len() < 22 || value.as_bytes().get(10) != Some(&b'T') || !has_offset {
        return Err("当前本地时间缺少 UTC offset；未写入记录。".into());
    }
    Ok(())
}

fn short_record_marker(
    id: &str,
    category: ShortRecordCategory,
    created_at: &str,
    needs_review: bool,
) -> String {
    format!(
        "<!-- personal-dashboard:short-record id={id} category={} created-at={created_at} needs-review={needs_review} -->",
        category.as_str(),
    )
}

fn short_record_change_marker(
    change_id: &str,
    entry_id: &str,
    modified_at: &str,
    needs_review: bool,
) -> String {
    format!(
        "<!-- personal-dashboard:short-record-change id={change_id} entry-id={entry_id} modified-at={modified_at} needs-review={needs_review} -->"
    )
}

fn minimal_daily_record(date: &str, record_block: &str) -> String {
    format!(
        "---\ntype: daily-record\ndate: {date}\n---\n# {date}\n\n## 白天更新\n\n### 简短记录\n\n{record_block}\n"
    )
}

fn append_to_named_subsection(
    document: &str,
    parent: &str,
    subsection: &str,
    content: &str,
    insert_parent_before: Option<&str>,
) -> Result<String, String> {
    if section_offsets(document, parent).is_none() {
        return Ok(append_to_canonical_section(
            document,
            parent,
            &format!("### {subsection}\n\n{content}"),
            insert_parent_before,
        ));
    }
    let matches = subsection_offsets(document, parent, subsection);
    if matches.len() > 1 {
        return Err(format!(
            "该日期的 Daily Record 包含多个“{subsection}”段落。请先合并重复段落；未写入任何内容。"
        ));
    }
    let Some((_, end)) = matches.first().copied() else {
        return Ok(append_to_canonical_section(
            document,
            parent,
            &format!("### {subsection}\n\n{content}"),
            insert_parent_before,
        ));
    };
    Ok(insert_separated_block(document, end, content))
}

fn append_to_canonical_section(
    document: &str,
    heading: &str,
    block: &str,
    insert_before: Option<&str>,
) -> String {
    if let Some((_, end)) = section_offsets(document, heading) {
        return insert_separated_block(document, end, block);
    }

    let insertion = insert_before
        .and_then(|candidate| section_offsets(document, candidate).map(|(start, _)| start))
        .unwrap_or(document.len());
    let mut output = String::with_capacity(document.len() + heading.len() + block.len() + 8);
    output.push_str(&document[..insertion]);
    if !output.ends_with('\n') {
        output.push('\n');
    }
    if !output.ends_with("\n\n") {
        output.push('\n');
    }
    output.push_str(&format!("## {heading}\n\n{block}\n\n"));
    output.push_str(&document[insertion..]);
    output
}

fn insert_separated_block(document: &str, insertion: usize, block: &str) -> String {
    let mut output = String::with_capacity(document.len() + block.len() + 4);
    output.push_str(&document[..insertion]);
    if !output.ends_with('\n') {
        output.push('\n');
    }
    if !output.ends_with("\n\n") {
        output.push('\n');
    }
    output.push_str(block);
    output.push('\n');
    if !document[insertion..].starts_with('\n') {
        output.push('\n');
    }
    output.push_str(&document[insertion..]);
    output
}

fn update_evening_subsection(
    document: &str,
    subsection: &str,
    content: &str,
    replace_existing: bool,
) -> Result<String, String> {
    if section_offsets(document, "晚间复盘").is_none() {
        return Ok(append_to_canonical_section(
            document,
            "晚间复盘",
            &format!("### {subsection}\n\n{content}"),
            None,
        ));
    }
    let matches = subsection_offsets(document, "晚间复盘", subsection);
    if matches.len() > 1 {
        return Err(format!(
            "今天的 Daily Record 包含多个“{subsection}”段落。请先合并重复段落；未写入任何内容。"
        ));
    }
    let Some((body_start, end)) = matches.first().copied() else {
        return Ok(append_to_canonical_section(
            document,
            "晚间复盘",
            &format!("### {subsection}\n\n{content}"),
            None,
        ));
    };
    let mut output = String::with_capacity(document.len() + content.len() + 4);
    output.push_str(&document[..body_start]);
    if replace_existing {
        output.push('\n');
        output.push_str(content);
        output.push_str("\n\n");
    } else {
        let existing = &document[body_start..end];
        output.push_str(existing);
        if !output.ends_with('\n') {
            output.push('\n');
        }
        if !output.ends_with("\n\n") {
            output.push('\n');
        }
        output.push_str(content);
        output.push_str("\n\n");
    }
    output.push_str(&document[end..]);
    Ok(output)
}

fn subsection_offsets(document: &str, parent: &str, subsection: &str) -> Vec<(usize, usize)> {
    let Some((parent_start, parent_end)) = section_offsets(document, parent) else {
        return Vec::new();
    };
    let mut matches = Vec::new();
    let mut body_start = None;
    for line in scan_markdown_lines(&document[parent_start..parent_end]) {
        if line.in_fenced_code {
            continue;
        }
        let absolute_start = parent_start + line.start;
        if heading_matches(line.text, 3, subsection) {
            if let Some(start) = body_start.take() {
                matches.push((start, absolute_start));
            }
            body_start = Some(parent_start + line.next);
        } else if body_start.is_some()
            && markdown_heading(line.text).is_some_and(|heading| heading.level <= 3)
        {
            matches.push((
                body_start.take().expect("subsection start exists"),
                absolute_start,
            ));
        }
    }
    if let Some(start) = body_start {
        matches.push((start, parent_end));
    }
    matches
}

fn section_offsets(document: &str, heading: &str) -> Option<(usize, usize)> {
    let body_start = document_layout(document)?.body_start;
    let mut section_start = None;
    for line in scan_markdown_lines(&document[body_start..]) {
        if line.in_fenced_code {
            continue;
        }
        let absolute_start = body_start + line.start;
        if section_start.is_none() && heading_matches(line.text, 2, heading) {
            section_start = Some(absolute_start);
        } else if section_start.is_some()
            && markdown_heading(line.text).is_some_and(|heading| heading.level <= 2)
        {
            return Some((section_start.expect("section start exists"), absolute_start));
        }
    }
    section_start.map(|start| (start, document.len()))
}

fn canonical_record_path(vault: &Path, date: &str) -> Result<PathBuf, String> {
    let parsed = CalendarDate::parse(date)
        .ok_or_else(|| "The selected date is not a valid YYYY-MM-DD calendar date.".to_string())?;
    let year = format!("{:04}", parsed.year);
    let month = format!("{:02}", parsed.month);
    Ok(vault
        .join("life/Journal/Daily")
        .join(&year)
        .join(format!("{year}-{month}"))
        .join(format!("{date}.md")))
}

#[derive(Clone, Copy)]
struct CalendarDate {
    year: i32,
    month: u32,
    day: u32,
}

impl CalendarDate {
    fn new(year: i32, month: u32, day: u32) -> Option<Self> {
        if !(1..=9999).contains(&year) || !(1..=12).contains(&month) {
            return None;
        }
        let days_in_month = match month {
            2 if is_leap_year(year) => 29,
            2 => 28,
            4 | 6 | 9 | 11 => 30,
            _ => 31,
        };
        (1..=days_in_month)
            .contains(&day)
            .then_some(Self { year, month, day })
    }

    fn parse(value: &str) -> Option<Self> {
        let bytes = value.as_bytes();
        if bytes.len() != 10
            || bytes[4] != b'-'
            || bytes[7] != b'-'
            || !bytes
                .iter()
                .enumerate()
                .all(|(index, byte)| index == 4 || index == 7 || byte.is_ascii_digit())
        {
            return None;
        }
        Self::new(
            value[..4].parse().ok()?,
            value[5..7].parse().ok()?,
            value[8..].parse().ok()?,
        )
    }

    fn unix_days(self) -> i64 {
        let mut year = i64::from(self.year);
        let month = i64::from(self.month);
        let day = i64::from(self.day);
        year -= i64::from(month <= 2);
        let era = year.div_euclid(400);
        let year_of_era = year - era * 400;
        let month_prime = month + if month > 2 { -3 } else { 9 };
        let day_of_year = (153 * month_prime + 2) / 5 + day - 1;
        let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
        era * 146_097 + day_of_era - 719_468
    }

    fn from_unix_days(unix_days: i64) -> Self {
        let shifted_days = unix_days + 719_468;
        let era = shifted_days.div_euclid(146_097);
        let day_of_era = shifted_days - era * 146_097;
        let year_of_era =
            (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
        let mut year = year_of_era + era * 400;
        let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
        let month_prime = (5 * day_of_year + 2) / 153;
        let day = day_of_year - (153 * month_prime + 2) / 5 + 1;
        let month = month_prime + if month_prime < 10 { 3 } else { -9 };
        year += i64::from(month <= 2);
        Self {
            year: year as i32,
            month: month as u32,
            day: day as u32,
        }
    }

    fn weekday_from_sunday(self) -> i64 {
        (self.unix_days() + 4).rem_euclid(7)
    }
}

impl std::fmt::Display for CalendarDate {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            formatter,
            "{:04}-{:02}-{:02}",
            self.year, self.month, self.day
        )
    }
}

fn is_leap_year(year: i32) -> bool {
    year % 4 == 0 && (year % 100 != 0 || year % 400 == 0)
}

struct ShortRecordLocation {
    view: ShortRecordView,
    text_start: usize,
    text_end: usize,
}

struct ShortRecordChangeLocation {
    entry_id: String,
    view: ShortRecordChangeView,
}

struct ParsedShortRecords {
    records: Vec<ShortRecordLocation>,
    changes: Vec<ShortRecordChangeLocation>,
}

fn parse_short_records(document: &str, date: &str) -> Result<Vec<ShortRecordView>, String> {
    Ok(parse_short_record_locations(document, date)?
        .records
        .into_iter()
        .map(|record| record.view)
        .collect())
}

fn parse_short_record_locations(document: &str, date: &str) -> Result<ParsedShortRecords, String> {
    let Some((section_start, section_end)) = section_offsets(document, "白天更新") else {
        return Ok(ParsedShortRecords {
            records: Vec::new(),
            changes: Vec::new(),
        });
    };
    let lines: Vec<_> = scan_markdown_lines(&document[section_start..section_end])
        .into_iter()
        .filter(|line| !line.in_fenced_code)
        .collect();
    let mut records: Vec<ShortRecordLocation> = Vec::new();
    let mut changes: Vec<ShortRecordChangeLocation> = Vec::new();
    for (index, line) in lines.iter().enumerate() {
        if let Some(attributes) = marker_attributes(line.text, "short-record") {
            let id = required_marker_attribute(&attributes, "id")?;
            validate_local_identifier(id, "记录标识")?;
            if records.iter().any(|record| record.view.id == id) {
                return Err("Daily Record 包含重复的简短记录标识；请修复后刷新 Today。".into());
            }
            let category = match required_marker_attribute(&attributes, "category")? {
                "ordinary" => ShortRecordCategory::Ordinary,
                "exercise" => ShortRecordCategory::Exercise,
                _ => return Err("Daily Record 包含无法识别的简短记录类别。".into()),
            };
            let created_at = required_marker_attribute(&attributes, "created-at")?;
            let needs_review = marker_boolean_attribute(&attributes, "needs-review")?;
            let text_line = lines[index + 1..]
                .iter()
                .find(|candidate| !candidate.text.trim().is_empty())
                .ok_or_else(|| "Daily Record 的简短记录缺少正文。".to_string())?;
            let text = text_line
                .text
                .trim()
                .strip_prefix("- ")
                .ok_or_else(|| "Daily Record 的简短记录正文格式无效。".to_string())?;
            records.push(ShortRecordLocation {
                view: ShortRecordView {
                    id: id.to_owned(),
                    date: date.to_owned(),
                    category,
                    created_at: created_at.to_owned(),
                    text: text.to_owned(),
                    changes: Vec::new(),
                    needs_review,
                },
                text_start: section_start + text_line.start,
                text_end: section_start + text_line.start + text_line.text.len(),
            });
        } else if let Some(attributes) = marker_attributes(line.text, "short-record-change") {
            let change_id = required_marker_attribute(&attributes, "id")?;
            let entry_id = required_marker_attribute(&attributes, "entry-id")?;
            validate_local_identifier(change_id, "修改标识")?;
            validate_local_identifier(entry_id, "记录标识")?;
            if changes.iter().any(|change| change.view.id == change_id) {
                return Err("Daily Record 包含重复的修改记录标识；请修复后刷新 Today。".into());
            }
            let modified_at = required_marker_attribute(&attributes, "modified-at")?;
            let needs_review = marker_boolean_attribute(&attributes, "needs-review")?;
            let mut following = lines[index + 1..]
                .iter()
                .filter(|candidate| !candidate.text.trim().is_empty());
            let old_text = following
                .next()
                .and_then(|candidate| candidate.text.trim().strip_prefix("- 原文："))
                .ok_or_else(|| "Daily Record 的修改记录缺少原文。".to_string())?;
            let new_text = following
                .next()
                .and_then(|candidate| candidate.text.trim().strip_prefix("- 新文："))
                .ok_or_else(|| "Daily Record 的修改记录缺少新文。".to_string())?;
            changes.push(ShortRecordChangeLocation {
                entry_id: entry_id.to_owned(),
                view: ShortRecordChangeView {
                    id: change_id.to_owned(),
                    modified_at: modified_at.to_owned(),
                    old_text: old_text.to_owned(),
                    new_text: new_text.to_owned(),
                    needs_review,
                },
            });
        }
    }
    for change in &changes {
        if let Some(record) = records
            .iter_mut()
            .find(|record| record.view.id == change.entry_id)
        {
            record.view.changes.push(change.view.clone());
        }
    }
    Ok(ParsedShortRecords { records, changes })
}

fn marker_attributes<'a>(line: &'a str, marker: &str) -> Option<Vec<(&'a str, &'a str)>> {
    let prefix = format!("<!-- personal-dashboard:{marker} ");
    let body = line.trim().strip_prefix(&prefix)?.strip_suffix(" -->")?;
    body.split_ascii_whitespace()
        .map(|attribute| attribute.split_once('='))
        .collect()
}

fn required_marker_attribute<'a>(
    attributes: &'a [(&'a str, &'a str)],
    name: &str,
) -> Result<&'a str, String> {
    attributes
        .iter()
        .find_map(|(key, value)| (*key == name).then_some(*value))
        .ok_or_else(|| format!("Daily Record 的 Dashboard 标记缺少 {name}。"))
}

fn marker_boolean_attribute(attributes: &[(&str, &str)], name: &str) -> Result<bool, String> {
    match required_marker_attribute(attributes, name)? {
        "true" => Ok(true),
        "false" => Ok(false),
        _ => Err(format!(
            "Daily Record 的 Dashboard 标记包含无效的 {name} 值。"
        )),
    }
}

fn parse_daily_record(
    document: &str,
    expected_date: &str,
) -> Result<
    (
        MorningBaselineView,
        Vec<MorningBlockView>,
        Vec<PlanningEvidenceView>,
        DaytimeView,
        EveningView,
    ),
    String,
> {
    let (frontmatter, body) = split_frontmatter(document).ok_or_else(|| {
        "今天的 Daily Record 缺少有效 frontmatter。请修复 type 和 date，然后刷新 Today。"
            .to_string()
    })?;
    let record_type = frontmatter_value(frontmatter, "type");
    let record_date = frontmatter_value(frontmatter, "date");
    if record_type.as_deref() != Some(DAILY_RECORD_TYPE)
        || record_date.as_deref() != Some(expected_date)
    {
        return Err(format!(
            "今天的 Daily Record 身份与 {expected_date} 不一致。请修复 type 和 date，然后刷新 Today。"
        ));
    }

    for canonical in CANONICAL_SECTIONS {
        if section_count(body, canonical) > 1 {
            return Err(format!(
                "今天的 Daily Record 包含多个“{canonical}”段落。请合并重复段落，然后刷新 Today。"
            ));
        }
    }

    let baseline = parse_morning_baseline(body)?;
    let timeline = section_body(body, "今天的大致安排")
        .map(parse_timeline)
        .unwrap_or_default();
    let evidence = section_body(body, "计划依据")
        .map(parse_evidence)
        .unwrap_or_default();
    let daytime = section_body(body, "白天更新")
        .map(parse_daytime)
        .unwrap_or_default();
    let evening = section_body(body, "晚间复盘")
        .map(parse_evening)
        .unwrap_or_default();
    Ok((baseline, timeline, evidence, daytime, evening))
}

fn parse_morning_baseline(body: &str) -> Result<MorningBaselineView, String> {
    let Some(section) = section_body(body, "早间基准") else {
        return Ok(MorningBaselineView::missing());
    };
    for subsection in ["初始安排", "初始计划依据"] {
        if heading_count(section, 3, subsection) > 1 {
            return Err(format!(
                "今天的 Daily Record 在“早间基准”中包含多个“{subsection}”段落。请合并重复段落，然后刷新 Today。"
            ));
        }
    }

    let timeline = subsection_body(section, "初始安排")
        .map(parse_timeline)
        .unwrap_or_default();
    let evidence = subsection_body(section, "初始计划依据")
        .map(parse_evidence)
        .unwrap_or_default();
    let availability = if timeline.is_empty() && evidence.is_empty() {
        BaselineAvailability::Empty
    } else {
        BaselineAvailability::Saved
    };
    let message = match availability {
        BaselineAvailability::Empty => "早间基准章节已保存，但初始安排和依据仍为空。",
        BaselineAvailability::Saved => "已读取独立保存的早间基准。",
        BaselineAvailability::Missing => unreachable!("the missing case returns before parsing"),
    };
    Ok(MorningBaselineView {
        availability,
        message: message.into(),
        timeline,
        evidence,
    })
}

fn split_frontmatter(document: &str) -> Option<(&str, &str)> {
    let layout = document_layout(document)?;
    Some((layout.frontmatter, &document[layout.body_start..]))
}

struct DocumentLayout<'a> {
    frontmatter: &'a str,
    body_start: usize,
}

fn document_layout(document: &str) -> Option<DocumentLayout<'_>> {
    let opening_start = if document.starts_with('\u{feff}') {
        3
    } else {
        0
    };
    let (opening, frontmatter_start) = markdown_line(document, opening_start)?;
    if opening != "---" {
        return None;
    }
    let mut offset = frontmatter_start;
    while offset < document.len() {
        let line_start = offset;
        let (line, next) = markdown_line(document, offset)?;
        if line == "---" {
            return Some(DocumentLayout {
                frontmatter: &document[frontmatter_start..line_start],
                body_start: next,
            });
        }
        offset = next;
    }
    None
}

fn markdown_line(document: &str, start: usize) -> Option<(&str, usize)> {
    if start > document.len() {
        return None;
    }
    let remainder = &document[start..];
    let newline = remainder.find('\n');
    let end = newline.map_or(document.len(), |index| start + index);
    let next = newline.map_or(document.len(), |index| start + index + 1);
    Some((
        document[start..end]
            .strip_suffix('\r')
            .unwrap_or(&document[start..end]),
        next,
    ))
}

#[derive(Clone, Copy)]
struct ScannedMarkdownLine<'a> {
    text: &'a str,
    start: usize,
    next: usize,
    in_fenced_code: bool,
    fence_boundary: bool,
}

#[derive(Clone, Copy)]
struct MarkdownFence {
    marker: u8,
    length: usize,
}

struct MarkdownScan<'a> {
    lines: Vec<ScannedMarkdownLine<'a>>,
    unclosed_fence: bool,
}

impl<'a> IntoIterator for MarkdownScan<'a> {
    type Item = ScannedMarkdownLine<'a>;
    type IntoIter = std::vec::IntoIter<Self::Item>;

    fn into_iter(self) -> Self::IntoIter {
        self.lines.into_iter()
    }
}

fn scan_markdown_lines(document: &str) -> MarkdownScan<'_> {
    let mut lines = Vec::new();
    let mut offset = 0;
    let mut active_fence = None;
    while offset < document.len() {
        let Some((text, next)) = markdown_line(document, offset) else {
            break;
        };
        let (in_fenced_code, fence_boundary) = if let Some(fence) = active_fence {
            if closes_markdown_fence(text, fence) {
                active_fence = None;
                (true, true)
            } else {
                (true, false)
            }
        } else if let Some(fence) = opens_markdown_fence(text) {
            active_fence = Some(fence);
            (true, true)
        } else {
            (false, false)
        };
        lines.push(ScannedMarkdownLine {
            text,
            start: offset,
            next,
            in_fenced_code,
            fence_boundary,
        });
        offset = next;
    }
    MarkdownScan {
        lines,
        unclosed_fence: active_fence.is_some(),
    }
}

fn opens_markdown_fence(line: &str) -> Option<MarkdownFence> {
    let indentation = line.bytes().take_while(|byte| *byte == b' ').count();
    if indentation > 3 {
        return None;
    }
    let remainder = &line[indentation..];
    let marker = *remainder.as_bytes().first()?;
    if !matches!(marker, b'`' | b'~') {
        return None;
    }
    let length = remainder.bytes().take_while(|byte| *byte == marker).count();
    if length < 3 || (marker == b'`' && remainder[length..].contains('`')) {
        return None;
    }
    Some(MarkdownFence { marker, length })
}

fn closes_markdown_fence(line: &str, fence: MarkdownFence) -> bool {
    let indentation = line.bytes().take_while(|byte| *byte == b' ').count();
    if indentation > 3 {
        return false;
    }
    let remainder = &line[indentation..];
    let length = remainder
        .bytes()
        .take_while(|byte| *byte == fence.marker)
        .count();
    length >= fence.length
        && remainder[length..]
            .bytes()
            .all(|byte| matches!(byte, b' ' | b'\t'))
}

fn frontmatter_value(frontmatter: &str, key: &str) -> Option<String> {
    frontmatter.lines().find_map(|line| {
        let (candidate, value) = line.split_once(':')?;
        (candidate.trim() == key).then(|| {
            value
                .trim()
                .trim_matches(|character| character == '\'' || character == '"')
                .to_owned()
        })
    })
}

fn section_count(body: &str, heading: &str) -> usize {
    heading_count(body, 2, heading)
}

fn heading_count(body: &str, level: usize, heading: &str) -> usize {
    scan_markdown_lines(body)
        .into_iter()
        .filter(|line| !line.in_fenced_code && heading_matches(line.text, level, heading))
        .count()
}

fn section_body<'a>(body: &'a str, heading: &str) -> Option<&'a str> {
    heading_body(body, 2, heading)
}

fn subsection_body<'a>(body: &'a str, heading: &str) -> Option<&'a str> {
    heading_body(body, 3, heading)
}

fn heading_body<'a>(body: &'a str, level: usize, heading: &str) -> Option<&'a str> {
    let mut start = None;
    let mut end = body.len();
    for line in scan_markdown_lines(body) {
        if line.in_fenced_code {
            continue;
        }
        if start.is_none() && heading_matches(line.text, level, heading) {
            start = Some(line.next);
        } else if start.is_some()
            && markdown_heading(line.text).is_some_and(|heading| heading.level <= level)
        {
            end = line.start;
            break;
        }
    }
    let start = start?;
    Some(body[start..end].trim())
}

struct MarkdownHeading<'a> {
    level: usize,
    title: &'a str,
}

fn markdown_heading(line: &str) -> Option<MarkdownHeading<'_>> {
    let indentation = line.bytes().take_while(|byte| *byte == b' ').count();
    if indentation > 3 {
        return None;
    }
    let remainder = &line[indentation..];
    let level = remainder.bytes().take_while(|byte| *byte == b'#').count();
    if !(1..=6).contains(&level) {
        return None;
    }
    let after_marks = &remainder[level..];
    if !after_marks.is_empty() && !after_marks.starts_with(' ') && !after_marks.starts_with('\t') {
        return None;
    }
    let title = atx_heading_title(after_marks);
    Some(MarkdownHeading { level, title })
}

fn atx_heading_title(after_marks: &str) -> &str {
    let title = after_marks
        .trim_start_matches([' ', '\t'])
        .trim_end_matches([' ', '\t']);
    let closing_start = title.trim_end_matches('#').len();
    if closing_start == title.len() {
        return title;
    }
    let before_closing = &title[..closing_start];
    if before_closing.is_empty() || before_closing.ends_with(' ') || before_closing.ends_with('\t')
    {
        before_closing.trim_end_matches([' ', '\t'])
    } else {
        title
    }
}

fn heading_matches(line: &str, level: usize, title: &str) -> bool {
    markdown_heading(line).is_some_and(|heading| heading.level == level && heading.title == title)
}

fn parse_timeline(section: &str) -> Vec<MorningBlockView> {
    let mut timeline = Vec::new();
    let mut active_heading = None;
    let mut current: Option<(String, String)> = None;

    for line in scan_markdown_lines(section) {
        let trimmed = line.text.trim();
        if !line.in_fenced_code {
            if let Some(heading) = markdown_heading(line.text).filter(|heading| heading.level >= 3)
            {
                flush_timeline_block(&mut timeline, &mut current);
                let heading = clean_inline_markdown(heading.title);
                active_heading = (!heading.is_empty()).then_some(heading);
                continue;
            }
            if let Some(item) = list_item(trimmed)
                .map(str::trim)
                .filter(|item| !item.is_empty())
            {
                flush_timeline_block(&mut timeline, &mut current);
                let (period, content) = parse_bold_prefix(item)
                    .map(|(period, content)| {
                        (
                            period
                                .trim_end_matches('：')
                                .trim_end_matches(':')
                                .to_owned(),
                            content.to_owned(),
                        )
                    })
                    .unwrap_or_else(|| {
                        (
                            active_heading.clone().unwrap_or_else(|| "安排".to_owned()),
                            item.to_owned(),
                        )
                    });
                current = Some((period, clean_inline_markdown(&content)));
                continue;
            }
        }
        if trimmed.is_empty() || line.fence_boundary {
            continue;
        }

        let prose = clean_inline_markdown(trimmed);
        if prose.is_empty() {
            continue;
        }
        if let Some((_, content)) = current.as_mut() {
            if !content.is_empty() && !content.ends_with(['，', '。', '；', '：', '、']) {
                content.push(' ');
            }
            content.push_str(&prose);
        } else {
            current = Some((
                active_heading.clone().unwrap_or_else(|| "安排".to_owned()),
                prose,
            ));
        }
    }
    flush_timeline_block(&mut timeline, &mut current);
    timeline
}

fn flush_timeline_block(
    timeline: &mut Vec<MorningBlockView>,
    current: &mut Option<(String, String)>,
) {
    let Some((period, content)) = current.take() else {
        return;
    };
    let (title, detail) = split_summary(&content);
    if !title.is_empty() {
        timeline.push(MorningBlockView {
            period,
            title: title.to_owned(),
            detail: detail.map(str::to_owned),
        });
    }
}

fn parse_bold_prefix(item: &str) -> Option<(&str, &str)> {
    let rest = item.strip_prefix("**")?;
    let end = rest.find("**")?;
    Some((&rest[..end], rest[end + 2..].trim()))
}

fn split_summary(content: &str) -> (&str, Option<&str>) {
    for delimiter in ['；', ';'] {
        if let Some(index) = content.find(delimiter) {
            let title = content[..index].trim().trim_end_matches(['。', '.']);
            let detail = content[index + delimiter.len_utf8()..].trim();
            return (title, (!detail.is_empty()).then_some(detail));
        }
    }
    (content.trim(), None)
}

fn parse_evidence(section: &str) -> Vec<PlanningEvidenceView> {
    let mut groups = Vec::new();
    let mut current: Option<PlanningEvidenceView> = None;
    for line in scan_markdown_lines(section) {
        if line.in_fenced_code {
            continue;
        }
        let trimmed = line.text.trim();
        if let Some(label) = markdown_heading(line.text)
            .filter(|heading| matches!(heading.level, 3 | 4))
            .map(|heading| heading.title)
        {
            if let Some(group) = current.take() {
                groups.push(group);
            }
            current = Some(PlanningEvidenceView {
                label: clean_inline_markdown(label),
                items: Vec::new(),
            });
        } else if let Some(item) = list_item(trimmed) {
            let item = clean_inline_markdown(item);
            if !item.is_empty() {
                current
                    .get_or_insert_with(|| PlanningEvidenceView {
                        label: "其他依据".into(),
                        items: Vec::new(),
                    })
                    .items
                    .push(item);
            }
        }
    }
    if let Some(group) = current {
        groups.push(group);
    }
    groups
        .into_iter()
        .filter(|group| !group.items.is_empty())
        .collect()
}

#[derive(Default)]
struct ReadingContent {
    paragraphs: Vec<String>,
    items: Vec<String>,
}

fn parse_daytime(section: &str) -> DaytimeView {
    let updates = split_subsections(section)
        .into_iter()
        .filter_map(|(title, body)| {
            let body = strip_app_owned_record_blocks(title.as_deref(), &body);
            let content = parse_reading_content(&body);
            if content.paragraphs.is_empty() && content.items.is_empty() {
                return None;
            }
            let title = title.unwrap_or_else(|| "白天记录".into());
            let mut observed_facts = Vec::new();
            let mut neutral = Vec::new();
            let mut original_intent = Vec::new();
            let mut change_reasons = Vec::new();
            let mut revised_direction = Vec::new();
            for item in content.items {
                match daytime_item_role(&item) {
                    (DaytimeItemRole::ObservedFact, value) => observed_facts.push(value),
                    (DaytimeItemRole::OriginalIntent, value) => original_intent.push(value),
                    (DaytimeItemRole::ChangeReason, value) => change_reasons.push(value),
                    (DaytimeItemRole::RevisedDirection, value) => revised_direction.push(value),
                    (DaytimeItemRole::Unlabeled, value) => neutral.push(value),
                }
            }
            Some(DaytimeUpdateView {
                title,
                context: content.paragraphs,
                neutral,
                observed_facts,
                original_intent,
                change_reasons,
                revised_direction,
            })
        })
        .collect();
    DaytimeView {
        updates,
        short_records: Vec::new(),
    }
}

fn strip_app_owned_record_blocks(title: Option<&str>, body: &str) -> String {
    let marker = match title {
        Some("简短记录") => "short-record",
        Some("修改记录") => "short-record-change",
        _ => return body.to_owned(),
    };
    let owned_line_count = if marker == "short-record" { 1 } else { 2 };
    let mut skip_nonempty = 0;
    let mut unmanaged = Vec::new();
    for line in scan_markdown_lines(body) {
        if !line.in_fenced_code && marker_attributes(line.text, marker).is_some() {
            skip_nonempty = owned_line_count;
            continue;
        }
        if skip_nonempty > 0 {
            if !line.text.trim().is_empty() {
                skip_nonempty -= 1;
            }
            continue;
        }
        unmanaged.push(line.text);
    }
    unmanaged.join("\n")
}

enum DaytimeItemRole {
    ObservedFact,
    OriginalIntent,
    ChangeReason,
    RevisedDirection,
    Unlabeled,
}

fn daytime_item_role(item: &str) -> (DaytimeItemRole, String) {
    let cleaned = clean_inline_markdown(item);
    let Some((label, value)) = cleaned
        .split_once('：')
        .or_else(|| cleaned.split_once(": "))
    else {
        return (DaytimeItemRole::Unlabeled, cleaned);
    };
    let role = match label.trim() {
        "观察事实" | "已确认" | "事实" => DaytimeItemRole::ObservedFact,
        "原计划意图" | "原始意图" | "原计划" => DaytimeItemRole::OriginalIntent,
        "变化原因" | "变更原因" | "原因" => DaytimeItemRole::ChangeReason,
        "修订方向" | "调整后方向" | "调整方向" => DaytimeItemRole::RevisedDirection,
        _ => return (DaytimeItemRole::Unlabeled, cleaned),
    };
    let value = value.trim();
    if value.is_empty() {
        (DaytimeItemRole::Unlabeled, cleaned)
    } else {
        (role, value.to_owned())
    }
}

fn parse_evening(section: &str) -> EveningView {
    let mut view = EveningView::default();
    for (heading, body) in split_subsections(section) {
        let content = parse_reading_content(&body);
        let mut lines = content.paragraphs;
        lines.extend(content.items);
        if lines.is_empty() {
            continue;
        }
        let normalized = heading.as_deref().unwrap_or("今天发生了什么");
        if normalized.contains("用户补充") {
            view.additions.extend(lines);
        } else if normalized.contains("用户修正") {
            view.corrections.extend(lines);
        } else if normalized.contains("计划与实际") || normalized.contains("计划与现实") {
            view.comparison.extend(lines);
        } else if normalized.contains("总结") || normalized.contains("概览") {
            view.summary.extend(lines);
        } else if normalized.contains("问题")
            || normalized.contains("待确认")
            || normalized.contains("缺口")
        {
            view.questions.extend(lines);
        } else if normalized.contains("发生了什么")
            || normalized.contains("今日回顾")
            || normalized.contains("今日记录")
            || normalized.contains("重要事件")
            || heading.is_none()
        {
            view.account.extend(lines);
        } else {
            view.other.push(EveningOtherView {
                heading: normalized.to_owned(),
                lines,
            });
        }
    }
    view
}

fn split_subsections(section: &str) -> Vec<(Option<String>, String)> {
    let mut sections = Vec::new();
    let mut heading = None;
    let mut lines = Vec::new();
    for line in scan_markdown_lines(section) {
        if let Some(next_heading) = (!line.in_fenced_code)
            .then(|| markdown_heading(line.text))
            .flatten()
            .filter(|heading| matches!(heading.level, 3 | 4))
            .map(|heading| heading.title)
        {
            if heading.is_some() || lines.iter().any(|line: &String| !line.trim().is_empty()) {
                sections.push((heading.take(), lines.join("\n")));
                lines.clear();
            }
            heading = Some(clean_inline_markdown(next_heading));
        } else {
            lines.push(line.text.to_owned());
        }
    }
    if heading.is_some() || lines.iter().any(|line| !line.trim().is_empty()) {
        sections.push((heading, lines.join("\n")));
    }
    sections
}

fn parse_reading_content(body: &str) -> ReadingContent {
    let mut content = ReadingContent::default();
    let mut paragraph = Vec::new();
    let flush_paragraph = |paragraph: &mut Vec<String>, output: &mut Vec<String>| {
        if !paragraph.is_empty() {
            output.push(clean_inline_markdown(&paragraph.join(" ")));
            paragraph.clear();
        }
    };
    for line in scan_markdown_lines(body) {
        let trimmed = line.text.trim();
        if trimmed.is_empty() {
            flush_paragraph(&mut paragraph, &mut content.paragraphs);
        } else if line.fence_boundary {
            flush_paragraph(&mut paragraph, &mut content.paragraphs);
        } else if !line.in_fenced_code {
            if let Some(item) = list_item(trimmed) {
                flush_paragraph(&mut paragraph, &mut content.paragraphs);
                let item = clean_inline_markdown(item);
                if !item.is_empty() {
                    content.items.push(item);
                }
            } else if !trimmed.starts_with('#') {
                paragraph.push(trimmed.to_owned());
            }
        } else {
            paragraph.push(trimmed.to_owned());
        }
    }
    flush_paragraph(&mut paragraph, &mut content.paragraphs);
    content
}

fn list_item(line: &str) -> Option<&str> {
    line.strip_prefix("- ")
        .or_else(|| line.strip_prefix("* "))
        .or_else(|| line.strip_prefix("+ "))
        .or_else(|| ordered_list_item(line))
}

fn ordered_list_item(line: &str) -> Option<&str> {
    let marker_end = line
        .bytes()
        .take_while(|byte| byte.is_ascii_digit())
        .count();
    if marker_end == 0 || marker_end > 9 {
        return None;
    }
    let marker = line.as_bytes().get(marker_end)?;
    if !matches!(marker, b'.' | b')') {
        return None;
    }
    line.get(marker_end + 1..)?.strip_prefix(' ')
}

fn clean_inline_markdown(value: &str) -> String {
    let mut output = String::new();
    let mut remainder = value.trim();
    while let Some(open) = remainder.find('[') {
        output.push_str(&remainder[..open]);
        let link = &remainder[open + 1..];
        let Some(close_label) = link.find(']') else {
            output.push_str(&remainder[open..]);
            remainder = "";
            break;
        };
        let after_label = &link[close_label + 1..];
        if !after_label.starts_with('(') {
            output.push_str(&remainder[open..open + close_label + 2]);
            remainder = after_label;
            continue;
        }
        let Some(close_url) = after_label.find(')') else {
            output.push_str(&remainder[open..]);
            remainder = "";
            break;
        };
        output.push_str(&link[..close_label]);
        remainder = &after_label[close_url + 1..];
    }
    output.push_str(remainder);
    output.replace("**", "").replace('`', "").trim().to_owned()
}

#[cfg(test)]
mod tests {
    use super::save_file_if_unchanged;
    use std::cell::RefCell;
    use std::fs;
    use std::io::{Seek, SeekFrom, Write};
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    struct TempDirectory(PathBuf);

    impl TempDirectory {
        fn new() -> Self {
            let nonce = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("system clock should be after the epoch")
                .as_nanos();
            let path = std::env::temp_dir().join(format!(
                "personal-dashboard-today-store-{}-{nonce}",
                std::process::id()
            ));
            fs::create_dir_all(&path).expect("temporary directory should be created");
            Self(path)
        }
    }

    impl Drop for TempDirectory {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    #[test]
    fn atomic_exchange_detects_an_external_save_after_candidate_sync() {
        let directory = TempDirectory::new();
        let path = directory.0.join("2026-08-10.md");
        let original = b"original daily record\n";
        let external = b"external editor save\n";
        let updated = b"dashboard candidate\n";
        fs::write(&path, original).expect("original should be written");

        let error = save_file_if_unchanged(&path, original, updated, |_| {
            fs::write(&path, external).map_err(|error| error.to_string())
        })
        .expect_err("the save crossing candidate preparation must conflict");

        assert!(error.contains("并发变化"), "{error}");
        assert_eq!(
            fs::read(&path).expect("canonical record should remain readable"),
            external
        );
        let recoveries = fs::read_dir(directory.0.join(".personal-dashboard-recovery/today"))
            .expect("recovery directory should remain readable")
            .collect::<Result<Vec<_>, _>>()
            .expect("recovery entries should be readable");
        assert_eq!(
            recoveries.len(),
            1,
            "the original inode remains recoverable"
        );
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn recovery_tracks_the_same_byte_inode_actually_displaced_by_activation() {
        let directory = TempDirectory::new();
        let path = directory.0.join("2026-08-10.md");
        let replacement = directory.0.join("external-replacement.md");
        let original = b"original daily record\n";
        let updated = b"dashboard candidate\n";
        fs::write(&path, original).expect("original should be written");
        let retained_descriptor = RefCell::new(None);

        save_file_if_unchanged(&path, original, updated, |_| {
            fs::write(&replacement, original).map_err(|error| error.to_string())?;
            fs::rename(&replacement, &path).map_err(|error| error.to_string())?;
            let descriptor = fs::OpenOptions::new()
                .write(true)
                .open(&path)
                .map_err(|error| error.to_string())?;
            retained_descriptor.replace(Some(descriptor));
            Ok(())
        })
        .expect("same-byte replacement may be activated after its inode is preserved");

        let mut descriptor = retained_descriptor
            .borrow_mut()
            .take()
            .expect("external replacement descriptor should be retained");
        descriptor
            .seek(SeekFrom::Start(0))
            .expect("external descriptor should seek");
        descriptor
            .write_all(b"late external edit\n")
            .expect("late external edit should complete");
        descriptor
            .set_len(b"late external edit\n".len() as u64)
            .expect("late external edit should replace prior bytes");
        descriptor
            .sync_all()
            .expect("late external edit should sync");

        assert_eq!(
            fs::read(&path).expect("canonical record should remain readable"),
            updated
        );
        let recovery_directory = directory.0.join(".personal-dashboard-recovery/today");
        let late_edit_is_recoverable = fs::read_dir(recovery_directory)
            .expect("recovery directory should remain readable")
            .filter_map(Result::ok)
            .any(|entry| {
                fs::read(entry.path()).is_ok_and(|bytes| bytes == b"late external edit\n")
            });
        assert!(
            late_edit_is_recoverable,
            "the inode actually displaced by activation must keep a durable link"
        );
    }
}
