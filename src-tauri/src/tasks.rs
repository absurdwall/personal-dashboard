use crate::today::{
    create_new_file, document_revision, save_file_if_unchanged, validate_compatible_vault,
    validate_local_identifier, validate_timestamp_label, CalendarDate, StorageDocumentKind,
    TodayClock, TodayWorkspacePersistence,
};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};

pub const TASK_SCHEMA_VERSION: u32 = 1;
pub const TASK_DOCUMENT_RELATIVE_PATH: &str = "life/.personal-dashboard/tasks/v1/tasks.json";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TaskDataState {
    Unconfigured,
    Empty,
    Ready,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum TaskSourceKind {
    Manual,
    DailyFlow,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TaskSourceView {
    pub kind: TaskSourceKind,
    pub reference: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum TaskState {
    Pending,
    Completed,
    Abandoned,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum TaskChangeKind {
    Renamed,
    ContentEdited,
    Rescheduled,
    ListMoved,
    Edited,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TaskChangeView {
    pub id: String,
    pub kind: TaskChangeKind,
    pub changed_at: String,
    pub previous_name: Option<String>,
    pub new_name: Option<String>,
    pub previous_content: Option<String>,
    pub new_content: Option<String>,
    pub previous_date: Option<String>,
    pub new_date: Option<String>,
    pub previous_time: Option<String>,
    pub new_time: Option<String>,
    pub previous_list_id: Option<String>,
    pub new_list_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskListView {
    pub id: String,
    pub name: String,
    pub is_system: bool,
    pub archived: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskView {
    pub id: String,
    pub name: String,
    pub content: Option<String>,
    pub date: Option<String>,
    pub time: Option<String>,
    pub list_id: String,
    pub source: TaskSourceView,
    pub state: TaskState,
    pub created_at: String,
    pub modified_at: String,
    pub changes: Vec<TaskChangeView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TasksView {
    pub state: TaskDataState,
    pub message: String,
    pub schema_version: u32,
    pub revision: Option<String>,
    pub target_binding: Option<String>,
    pub vault_name: Option<String>,
    pub vault_path: Option<String>,
    pub lists: Vec<TaskListView>,
    pub tasks: Vec<TaskView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskCreateInput {
    pub target_binding: String,
    pub expected_revision: Option<String>,
    pub task_id: String,
    pub name: String,
    pub content: Option<String>,
    pub date: Option<String>,
    pub time: Option<String>,
    pub list_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskUpdateInput {
    pub target_binding: String,
    pub expected_revision: String,
    pub task_id: String,
    pub change_id: String,
    pub name: String,
    pub content: Option<String>,
    pub date: Option<String>,
    pub time: Option<String>,
    pub list_id: Option<String>,
}

pub trait TaskStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String>;
    fn save_if_unchanged(&self, path: &Path, expected: &[u8], updated: &[u8])
        -> Result<(), String>;
    fn create_new(&self, path: &Path, document: &[u8]) -> Result<(), String>;
}

#[derive(Clone, Copy)]
pub struct FileTaskStore;

impl TaskStore for FileTaskStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        match fs::read(path) {
            Ok(document) => Ok(Some(document)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(format!("无法读取任务正本：{error}")),
        }
    }

    fn save_if_unchanged(
        &self,
        path: &Path,
        expected: &[u8],
        updated: &[u8],
    ) -> Result<(), String> {
        save_file_if_unchanged(path, expected, updated, StorageDocumentKind::Tasks, |_| {
            Ok(())
        })
    }

    fn create_new(&self, path: &Path, document: &[u8]) -> Result<(), String> {
        create_new_file(path, document, StorageDocumentKind::Tasks)
    }
}

pub struct TaskApplication<P, C, S = FileTaskStore> {
    persistence: P,
    clock: C,
    store: S,
}

impl<P, C> TaskApplication<P, C, FileTaskStore>
where
    P: TodayWorkspacePersistence,
    C: TodayClock,
{
    pub fn with_file_store(persistence: P, clock: C) -> Self {
        Self::new(persistence, clock, FileTaskStore)
    }
}

impl<P, C, S> TaskApplication<P, C, S>
where
    P: TodayWorkspacePersistence,
    C: TodayClock,
    S: TaskStore,
{
    pub fn new(persistence: P, clock: C, store: S) -> Self {
        Self {
            persistence,
            clock,
            store,
        }
    }

    pub fn read(&self) -> Result<TasksView, String> {
        let Some(vault) = self.persistence.load_selected_vault()? else {
            return Ok(TasksView::unconfigured());
        };
        if let Err(error) = validate_compatible_vault(&vault) {
            return Ok(TasksView::error(error, None, None, Some(vault)));
        }
        let path = task_document_path(&vault);
        let target_binding = task_target_binding(&path);
        let bytes = match self.store.load(&path) {
            Ok(Some(bytes)) => bytes,
            Ok(None) => return Ok(TasksView::empty(Some(target_binding), Some(vault))),
            Err(error) => {
                return Ok(TasksView::error(
                    error,
                    Some(target_binding),
                    None,
                    Some(vault),
                ))
            }
        };
        let revision = document_revision(&bytes);
        match parse_task_document(&bytes) {
            Ok(document) => {
                let state = if document.tasks.is_empty() {
                    TaskDataState::Empty
                } else {
                    TaskDataState::Ready
                };
                let message = if state == TaskDataState::Empty {
                    "Inbox 目前没有任务；新任务会先保存在 Inbox。"
                } else {
                    "已读取任务正本。"
                };
                Ok(tasks_view(
                    document,
                    state,
                    message.into(),
                    Some(revision),
                    Some(target_binding),
                    Some(vault),
                ))
            }
            Err(error) => Ok(TasksView::error(
                error,
                Some(target_binding),
                Some(revision),
                Some(vault),
            )),
        }
    }

    pub fn create(&self, input: TaskCreateInput) -> Result<TasksView, String> {
        let (_vault, path, target_binding) = self.bound_target(&input.target_binding)?;
        let now = self.clock.current_timestamp_label();
        validate_timestamp_label(&now)?;
        let desired = task_from_create(&input, &now)?;
        let bytes = self.store.load(&path)?;
        match bytes {
            Some(bytes) => {
                let mut document = parse_task_document(&bytes)?;
                ensure_task_list_exists(&document, &desired.list_id)?;
                if let Some(existing) = document.tasks.iter().find(|task| task.id == desired.id) {
                    if task_matches(existing, &desired) {
                        return self.read();
                    }
                    return Err(
                        "该任务标识已用于其他任务；请使用新的稳定身份。未写入任何内容。".into(),
                    );
                }
                require_task_revision(&bytes, input_expected_revision(&input)?, &target_binding)?;
                document.tasks.push(desired);
                let updated = encode_task_document(&document)?;
                self.ensure_bound_target_current(&path, &target_binding)?;
                self.store.save_if_unchanged(&path, &bytes, &updated)?;
            }
            None => {
                if input.expected_revision.is_some() {
                    return Err("任务正本已不存在。请刷新 Tasks 后重试；未创建替代数据。".into());
                }
                let document = TaskDocument {
                    schema_version: TASK_SCHEMA_VERSION,
                    lists: vec![inbox_record()],
                    tasks: vec![desired],
                };
                ensure_task_list_exists(&document, &document.tasks[0].list_id)?;
                let encoded = encode_task_document(&document)?;
                self.ensure_bound_target_current(&path, &target_binding)?;
                self.store.create_new(&path, &encoded)?;
            }
        }
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.read()
    }

    pub fn update(&self, input: TaskUpdateInput) -> Result<TasksView, String> {
        let (_vault, path, target_binding) = self.bound_target(&input.target_binding)?;
        let desired = task_from_update(&input)?;
        let bytes = self
            .store
            .load(&path)?
            .ok_or_else(|| "任务正本尚不存在。请刷新 Tasks 后重试；未写入任何内容。".to_string())?;
        let mut document = parse_task_document(&bytes)?;
        ensure_task_list_exists(&document, &desired.list_id)?;
        if let Some((task_index, _change)) = find_task_change(&document, &input.change_id) {
            if document.tasks[task_index].id == input.task_id
                && task_matches(&document.tasks[task_index], &desired)
            {
                return self.read();
            }
            return Err("该任务修改标识已用于其他操作；未写入任何内容。".into());
        }
        require_task_revision(&bytes, &input.expected_revision, &target_binding)?;
        let task = document
            .tasks
            .iter_mut()
            .find(|task| task.id == input.task_id)
            .ok_or_else(|| "找不到要编辑的任务；未写入任何内容。".to_string())?;
        if task_matches(task, &desired) {
            return self.read();
        }
        let now = self.clock.current_timestamp_label();
        validate_timestamp_label(&now)?;
        let change = task_change(task, &desired, input.change_id, now.clone())?;
        task.name = desired.name;
        task.content = desired.content;
        task.date = desired.date;
        task.time = desired.time;
        task.list_id = desired.list_id;
        task.modified_at = now;
        task.changes.push(change);
        let updated = encode_task_document(&document)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.store.save_if_unchanged(&path, &bytes, &updated)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.read()
    }

    fn ensure_bound_target_current(&self, path: &Path, target_binding: &str) -> Result<(), String> {
        let Some(vault) = self.persistence.load_selected_vault()? else {
            return Err(
                "Tasks 当前绑定的 Vault 或文件目标已经变化。请刷新 Tasks 后重试；未写入任何内容。"
                    .into(),
            );
        };
        validate_compatible_vault(&vault)?;
        let current_path = task_document_path(&vault);
        let current_binding = task_target_binding(&current_path);
        if current_path != path || current_binding != target_binding {
            return Err(
                "Tasks 当前绑定的 Vault 或文件目标已经变化。请刷新 Tasks 后重试；未写入任何内容。"
                    .into(),
            );
        }
        Ok(())
    }

    fn bound_target(&self, supplied_binding: &str) -> Result<(PathBuf, PathBuf, String), String> {
        let vault = self
            .persistence
            .load_selected_vault()?
            .ok_or_else(|| "请选择 Vault，以读取 Tasks。".to_string())?;
        validate_compatible_vault(&vault)?;
        let path = task_document_path(&vault);
        let target_binding = task_target_binding(&path);
        if supplied_binding != target_binding {
            return Err(
                "Tasks 当前绑定的 Vault 或文件目标已经变化。请刷新 Tasks 后重试；未写入任何内容。"
                    .into(),
            );
        }
        Ok((vault, path, target_binding))
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TaskDocument {
    schema_version: u32,
    lists: Vec<TaskListRecord>,
    tasks: Vec<TaskRecord>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TaskListRecord {
    id: String,
    name: String,
    system: bool,
    archived: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct TaskRecord {
    id: String,
    name: String,
    content: Option<String>,
    date: Option<String>,
    time: Option<String>,
    list_id: String,
    source: TaskSourceView,
    state: TaskState,
    created_at: String,
    modified_at: String,
    changes: Vec<TaskChangeView>,
}

impl TasksView {
    fn unconfigured() -> Self {
        Self {
            state: TaskDataState::Unconfigured,
            message: "请选择 Vault，以读取 Tasks。".into(),
            schema_version: TASK_SCHEMA_VERSION,
            revision: None,
            target_binding: None,
            vault_name: None,
            vault_path: None,
            lists: Vec::new(),
            tasks: Vec::new(),
        }
    }

    fn empty(target_binding: Option<String>, vault: Option<PathBuf>) -> Self {
        Self {
            state: TaskDataState::Empty,
            message: "Inbox 目前没有任务；新任务会先保存在 Inbox。".into(),
            schema_version: TASK_SCHEMA_VERSION,
            revision: None,
            target_binding,
            vault_name: vault_name(&vault),
            vault_path: vault.map(|path| path.to_string_lossy().into_owned()),
            lists: vec![task_list_view(inbox_record())],
            tasks: Vec::new(),
        }
    }

    fn error(
        message: impl Into<String>,
        target_binding: Option<String>,
        revision: Option<String>,
        vault: Option<PathBuf>,
    ) -> Self {
        Self {
            state: TaskDataState::Error,
            message: message.into(),
            schema_version: TASK_SCHEMA_VERSION,
            revision,
            target_binding,
            vault_name: vault_name(&vault),
            vault_path: vault.map(|path| path.to_string_lossy().into_owned()),
            lists: Vec::new(),
            tasks: Vec::new(),
        }
    }
}

fn task_document_path(vault: &Path) -> PathBuf {
    vault.join(TASK_DOCUMENT_RELATIVE_PATH)
}

fn task_target_binding(path: &Path) -> String {
    format!(
        "task-target-{}",
        document_revision(path.to_string_lossy().as_bytes())
    )
}

fn vault_name(vault: &Option<PathBuf>) -> Option<String> {
    vault
        .as_ref()
        .and_then(|path| path.file_name())
        .and_then(|name| name.to_str())
        .map(str::to_owned)
}

fn inbox_record() -> TaskListRecord {
    TaskListRecord {
        id: "inbox".into(),
        name: "Inbox".into(),
        system: true,
        archived: false,
    }
}

fn task_list_view(list: TaskListRecord) -> TaskListView {
    TaskListView {
        id: list.id,
        name: list.name,
        is_system: list.system,
        archived: list.archived,
    }
}

fn task_view(task: TaskRecord) -> TaskView {
    TaskView {
        id: task.id,
        name: task.name,
        content: task.content,
        date: task.date,
        time: task.time,
        list_id: task.list_id,
        source: task.source,
        state: task.state,
        created_at: task.created_at,
        modified_at: task.modified_at,
        changes: task.changes,
    }
}

fn tasks_view(
    document: TaskDocument,
    state: TaskDataState,
    message: String,
    revision: Option<String>,
    target_binding: Option<String>,
    vault: Option<PathBuf>,
) -> TasksView {
    TasksView {
        state,
        message,
        schema_version: document.schema_version,
        revision,
        target_binding,
        vault_name: vault_name(&vault),
        vault_path: vault.map(|path| path.to_string_lossy().into_owned()),
        lists: document.lists.into_iter().map(task_list_view).collect(),
        tasks: document.tasks.into_iter().map(task_view).collect(),
    }
}

fn normalize_name(value: &str) -> Result<String, String> {
    let name = value.trim();
    if name.is_empty() {
        return Err("任务名称不能为空。".into());
    }
    if name.chars().count() > 160 || name.contains(['\n', '\r']) {
        return Err("任务名称不能超过 160 个字符，也不能换行。".into());
    }
    Ok(name.into())
}

fn normalize_content(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

fn normalize_schedule(
    date: Option<&str>,
    time: Option<&str>,
) -> Result<(Option<String>, Option<String>), String> {
    let date = date.map(str::trim).filter(|value| !value.is_empty());
    let time = time.map(str::trim).filter(|value| !value.is_empty());
    let date = match date {
        Some(value) => {
            CalendarDate::parse(value)
                .ok_or_else(|| "任务日期必须是有效的 YYYY-MM-DD 日期。".to_string())?;
            Some(value.to_owned())
        }
        None => None,
    };
    let time = match time {
        Some(value) => {
            if date.is_none() {
                return Err("任务时间必须先绑定日期。".into());
            }
            validate_time(value)?;
            Some(value.to_owned())
        }
        None => None,
    };
    Ok((date, time))
}

fn validate_time(value: &str) -> Result<(), String> {
    let bytes = value.as_bytes();
    if bytes.len() != 5
        || bytes[2] != b':'
        || !bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| index == 2 || byte.is_ascii_digit())
    {
        return Err("任务时间必须是 HH:MM，并且必须绑定日期。".into());
    }
    let hour: u8 = value[..2]
        .parse()
        .map_err(|_| "任务时间无效。".to_string())?;
    let minute: u8 = value[3..]
        .parse()
        .map_err(|_| "任务时间无效。".to_string())?;
    if hour > 23 || minute > 59 {
        return Err("任务时间必须落在 00:00–23:59。".into());
    }
    Ok(())
}

fn task_from_create(input: &TaskCreateInput, now: &str) -> Result<TaskRecord, String> {
    validate_local_identifier(&input.task_id, "任务标识")?;
    let name = normalize_name(&input.name)?;
    let (date, time) = normalize_schedule(input.date.as_deref(), input.time.as_deref())?;
    let list_id = input.list_id.clone().unwrap_or_else(|| "inbox".into());
    validate_local_identifier(&list_id, "任务列表标识")?;
    Ok(TaskRecord {
        id: input.task_id.clone(),
        name,
        content: normalize_content(input.content.as_deref()),
        date,
        time,
        list_id,
        source: TaskSourceView {
            kind: TaskSourceKind::Manual,
            reference: None,
        },
        state: TaskState::Pending,
        created_at: now.into(),
        modified_at: now.into(),
        changes: Vec::new(),
    })
}

fn task_from_update(input: &TaskUpdateInput) -> Result<TaskRecord, String> {
    validate_local_identifier(&input.task_id, "任务标识")?;
    validate_local_identifier(&input.change_id, "任务修改标识")?;
    let name = normalize_name(&input.name)?;
    let (date, time) = normalize_schedule(input.date.as_deref(), input.time.as_deref())?;
    let list_id = input.list_id.clone().unwrap_or_else(|| "inbox".into());
    validate_local_identifier(&list_id, "任务列表标识")?;
    Ok(TaskRecord {
        id: input.task_id.clone(),
        name,
        content: normalize_content(input.content.as_deref()),
        date,
        time,
        list_id,
        source: TaskSourceView {
            kind: TaskSourceKind::Manual,
            reference: None,
        },
        state: TaskState::Pending,
        created_at: String::new(),
        modified_at: String::new(),
        changes: Vec::new(),
    })
}

fn task_matches(left: &TaskRecord, right: &TaskRecord) -> bool {
    left.id == right.id
        && left.name == right.name
        && left.content == right.content
        && left.date == right.date
        && left.time == right.time
        && left.list_id == right.list_id
}

fn ensure_task_list_exists(document: &TaskDocument, list_id: &str) -> Result<(), String> {
    if document.lists.iter().any(|list| list.id == list_id) {
        Ok(())
    } else {
        Err("任务列表不存在；此票仅支持 Inbox。未写入任何内容。".into())
    }
}

fn task_change(
    previous: &TaskRecord,
    updated: &TaskRecord,
    id: String,
    changed_at: String,
) -> Result<TaskChangeView, String> {
    let name_changed = previous.name != updated.name;
    let content_changed = previous.content != updated.content;
    let schedule_changed = previous.date != updated.date || previous.time != updated.time;
    let list_changed = previous.list_id != updated.list_id;
    let changed_fields = [
        name_changed,
        content_changed,
        schedule_changed,
        list_changed,
    ]
    .into_iter()
    .filter(|changed| *changed)
    .count();
    let kind = match (
        name_changed,
        content_changed,
        schedule_changed,
        list_changed,
    ) {
        (true, false, false, false) => TaskChangeKind::Renamed,
        (false, true, false, false) => TaskChangeKind::ContentEdited,
        (false, false, true, false) => TaskChangeKind::Rescheduled,
        (false, false, false, true) => TaskChangeKind::ListMoved,
        _ if changed_fields > 0 => TaskChangeKind::Edited,
        _ => return Err("任务没有可保存的变化。".into()),
    };
    Ok(TaskChangeView {
        id,
        kind,
        changed_at,
        previous_name: name_changed.then(|| previous.name.clone()),
        new_name: name_changed.then(|| updated.name.clone()),
        previous_content: content_changed.then(|| previous.content.clone()).flatten(),
        new_content: content_changed.then(|| updated.content.clone()).flatten(),
        previous_date: schedule_changed.then(|| previous.date.clone()).flatten(),
        new_date: schedule_changed.then(|| updated.date.clone()).flatten(),
        previous_time: schedule_changed.then(|| previous.time.clone()).flatten(),
        new_time: schedule_changed.then(|| updated.time.clone()).flatten(),
        previous_list_id: list_changed.then(|| previous.list_id.clone()),
        new_list_id: list_changed.then(|| updated.list_id.clone()),
    })
}

fn input_expected_revision(input: &TaskCreateInput) -> Result<&str, String> {
    input
        .expected_revision
        .as_deref()
        .ok_or_else(|| "任务正本已经存在。请刷新 Tasks 后重试；现有任务未被覆盖。".into())
}

fn require_task_revision(
    bytes: &[u8],
    expected: &str,
    _target_binding: &str,
) -> Result<(), String> {
    if document_revision(bytes) == expected {
        Ok(())
    } else {
        Err("任务正本已在外部发生变化。请刷新 Tasks 后再保存；外部内容未被覆盖。".into())
    }
}

fn parse_task_document(bytes: &[u8]) -> Result<TaskDocument, String> {
    let document: TaskDocument =
        serde_json::from_slice(bytes).map_err(|error| format!("任务正本不是有效 JSON：{error}"))?;
    if document.schema_version != TASK_SCHEMA_VERSION {
        return Err(format!(
            "任务正本使用不支持的 schema 版本 {}；未将其当作空任务。",
            document.schema_version
        ));
    }
    let mut list_ids = HashSet::new();
    let mut inbox = false;
    for list in &document.lists {
        validate_local_identifier(&list.id, "任务列表标识")?;
        if list.name.trim().is_empty() {
            return Err("任务正本包含空的任务列表名称。".into());
        }
        if !list_ids.insert(list.id.clone()) {
            return Err("任务正本包含重复任务列表标识。".into());
        }
        if list.id == "inbox" {
            inbox = true;
            if !list.system || list.archived {
                return Err("任务正本的 Inbox 列表必须是未归档的系统列表。".into());
            }
        }
    }
    if !inbox {
        return Err("任务正本缺少 Inbox 列表。".into());
    }
    let mut task_ids = HashSet::new();
    let mut change_ids = HashSet::new();
    for task in &document.tasks {
        validate_task_record(task, &list_ids, &mut task_ids, &mut change_ids)?;
    }
    Ok(document)
}

fn validate_task_record(
    task: &TaskRecord,
    list_ids: &HashSet<String>,
    task_ids: &mut HashSet<String>,
    change_ids: &mut HashSet<String>,
) -> Result<(), String> {
    validate_local_identifier(&task.id, "任务标识")?;
    if !task_ids.insert(task.id.clone()) {
        return Err("任务正本包含重复任务标识；未将其当作空任务。".into());
    }
    if task.name.trim().is_empty() || task.name.chars().count() > 160 {
        return Err("任务正本包含无效任务名称。".into());
    }
    if task.name.contains(['\n', '\r']) {
        return Err("任务正本包含带换行的任务名称。".into());
    }
    if let Some(content) = &task.content {
        if content.trim().is_empty() {
            return Err("任务正本不能保存空白任务内容。".into());
        }
    }
    if !list_ids.contains(&task.list_id) {
        return Err("任务正本包含不存在的任务列表归属。".into());
    }
    match task.source.kind {
        TaskSourceKind::Manual if task.source.reference.is_some() => {
            return Err("手动任务不能声明 producer 来源标识。".into())
        }
        TaskSourceKind::DailyFlow => {
            let reference = task.source.reference.as_deref().unwrap_or("");
            validate_local_identifier(reference, "任务来源标识")?;
        }
        TaskSourceKind::Manual => {}
    }
    if task.date.is_none() && task.time.is_some() {
        return Err("任务时间必须先绑定日期。".into());
    }
    let _ = normalize_schedule(task.date.as_deref(), task.time.as_deref())?;
    validate_timestamp_label(&task.created_at)?;
    validate_timestamp_label(&task.modified_at)?;
    let mut previous_time = None;
    for change in &task.changes {
        validate_local_identifier(&change.id, "任务修改标识")?;
        if !change_ids.insert(change.id.clone()) {
            return Err("任务正本包含重复任务修改标识。".into());
        }
        validate_timestamp_label(&change.changed_at)?;
        if let Some(previous) = previous_time {
            if timestamp_order(previous, &change.changed_at)? == Ordering::Greater {
                return Err("任务正本的修改记录时间顺序倒置。".into());
            }
        }
        previous_time = Some(change.changed_at.as_str());
        validate_change(change)?;
    }
    if task.changes.last().map(|change| change.changed_at.as_str())
        != Some(task.modified_at.as_str())
        && !task.changes.is_empty()
    {
        return Err("任务正本的修改时间与最后一条修改记录不一致。".into());
    }
    Ok(())
}

fn validate_change(change: &TaskChangeView) -> Result<(), String> {
    if let (Some(previous), Some(updated)) = (&change.previous_name, &change.new_name) {
        if previous == updated {
            return Err("任务改名记录不能保存相同的原名称与新名称。".into());
        }
    }
    if let (Some(previous), Some(updated)) = (&change.previous_list_id, &change.new_list_id) {
        validate_local_identifier(previous, "任务列表标识")?;
        validate_local_identifier(updated, "任务列表标识")?;
        if previous == updated {
            return Err("任务移动记录不能保存相同的原列表与新列表。".into());
        }
    }
    normalize_schedule(
        change.previous_date.as_deref(),
        change.previous_time.as_deref(),
    )?;
    normalize_schedule(change.new_date.as_deref(), change.new_time.as_deref())?;
    let has_change = change.previous_name.is_some()
        || change.new_name.is_some()
        || change.previous_content.is_some()
        || change.new_content.is_some()
        || change.previous_date.is_some()
        || change.new_date.is_some()
        || change.previous_time.is_some()
        || change.new_time.is_some()
        || change.previous_list_id.is_some()
        || change.new_list_id.is_some();
    if !has_change {
        return Err("任务修改记录缺少前后变化。".into());
    }
    Ok(())
}

fn timestamp_order(left: &str, right: &str) -> Result<Ordering, String> {
    let left = crate::today::timestamp_label_epoch_seconds(left)
        .ok_or_else(|| "任务正本包含无效修改时间。".to_string())?;
    let right = crate::today::timestamp_label_epoch_seconds(right)
        .ok_or_else(|| "任务正本包含无效修改时间。".to_string())?;
    Ok(left.cmp(&right))
}

fn find_task_change<'a>(
    document: &'a TaskDocument,
    change_id: &str,
) -> Option<(usize, &'a TaskChangeView)> {
    document.tasks.iter().enumerate().find_map(|(index, task)| {
        task.changes
            .iter()
            .find(|change| change.id == change_id)
            .map(|change| (index, change))
    })
}

fn encode_task_document(document: &TaskDocument) -> Result<Vec<u8>, String> {
    let mut encoded = serde_json::to_vec_pretty(document)
        .map_err(|error| format!("无法编码任务正本：{error}"))?;
    encoded.push(b'\n');
    Ok(encoded)
}
