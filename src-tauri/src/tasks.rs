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

pub const TASK_SCHEMA_VERSION: u32 = 2;
const LEGACY_TASK_SCHEMA_VERSION: u32 = 1;
pub const TASK_DOCUMENT_RELATIVE_PATH: &str = "life/.personal-dashboard/tasks/v1/tasks.json";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TaskDataState {
    Unconfigured,
    Empty,
    Ready,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum TaskDataErrorKind {
    Damaged,
    Unavailable,
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
pub enum TaskChangeSourceKind {
    User,
    DailyFlow,
}

impl Default for TaskChangeSourceKind {
    fn default() -> Self {
        Self::User
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum TaskCompletionSourceKind {
    Checkbox,
    DateCorrection,
    DailyFlow,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TaskCompletionView {
    pub completed_on: String,
    pub completed_time: Option<String>,
    pub recorded_at: String,
    pub source: TaskCompletionSourceKind,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum TaskChangeKind {
    Renamed,
    ContentEdited,
    Rescheduled,
    ListMoved,
    Edited,
    Completed,
    Reopened,
    Abandoned,
    Restored,
    Deleted,
    Undeleted,
    CompletionCorrected,
    Noop,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind", deny_unknown_fields)]
pub enum TaskChangeOperation {
    Reschedule {
        date: Option<String>,
        time: Option<String>,
    },
    SetState {
        state: TaskState,
    },
    CorrectCompletion {
        completed_on: String,
        completed_time: Option<String>,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TaskChangeView {
    pub id: String,
    pub kind: TaskChangeKind,
    pub changed_at: String,
    #[serde(default)]
    pub source: TaskChangeSourceKind,
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
    #[serde(default)]
    pub previous_state: Option<TaskState>,
    #[serde(default)]
    pub new_state: Option<TaskState>,
    #[serde(default)]
    pub previous_deleted_at: Option<String>,
    #[serde(default)]
    pub new_deleted_at: Option<String>,
    #[serde(default)]
    pub previous_completion: Option<TaskCompletionView>,
    #[serde(default)]
    pub new_completion: Option<TaskCompletionView>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub operation: Option<TaskChangeOperation>,
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
    pub deleted_at: Option<String>,
    pub completion: Option<TaskCompletionView>,
    pub overdue: bool,
    pub time_passed: bool,
    pub created_at: String,
    pub modified_at: String,
    pub changes: Vec<TaskChangeView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TasksView {
    pub state: TaskDataState,
    pub error_kind: Option<TaskDataErrorKind>,
    pub message: String,
    pub schema_version: u32,
    pub revision: Option<String>,
    pub target_binding: Option<String>,
    pub vault_name: Option<String>,
    pub vault_path: Option<String>,
    pub current_date: Option<String>,
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
pub struct TaskListCreateInput {
    pub target_binding: String,
    pub expected_revision: Option<String>,
    pub list_id: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskListRenameInput {
    pub target_binding: String,
    pub expected_revision: String,
    pub list_id: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskListArchiveInput {
    pub target_binding: String,
    pub expected_revision: String,
    pub list_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskListRestoreInput {
    pub target_binding: String,
    pub expected_revision: String,
    pub list_id: String,
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

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskStateInput {
    pub target_binding: String,
    pub expected_revision: String,
    pub task_id: String,
    pub change_id: String,
    pub state: TaskState,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDeleteInput {
    pub target_binding: String,
    pub expected_revision: String,
    pub task_id: String,
    pub change_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskRestoreInput {
    pub target_binding: String,
    pub expected_revision: String,
    pub task_id: String,
    pub change_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskCompletionCorrectionInput {
    pub target_binding: String,
    pub expected_revision: String,
    pub task_id: String,
    pub change_id: String,
    pub completed_on: String,
    pub completed_time: Option<String>,
}

pub trait TaskStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String>;
    fn save_if_unchanged(&self, path: &Path, expected: &[u8], updated: &[u8])
        -> Result<(), String>;
    fn create_new(&self, path: &Path, document: &[u8]) -> Result<(), String>;
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum DailyFlowMutation {
    Create {
        task_id: String,
        source_reference: String,
        name: String,
        content: Option<String>,
        date: Option<String>,
        time: Option<String>,
        list_id: Option<String>,
    },
    Reschedule {
        task_id: String,
        change_id: String,
        date: Option<String>,
        time: Option<String>,
    },
    SetState {
        task_id: String,
        change_id: String,
        state: TaskState,
    },
    CorrectCompletion {
        task_id: String,
        change_id: String,
        completed_on: String,
        completed_time: Option<String>,
    },
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) struct DailyFlowBatchResult {
    pub view: TasksView,
    pub changed: bool,
    pub created_task_ids: Vec<String>,
    pub preserved_task_ids: Vec<String>,
    pub applied_operation_ids: Vec<String>,
    pub idempotent_operation_ids: Vec<String>,
    pub unchanged_operation_ids: Vec<String>,
}

#[derive(Default)]
struct DailyFlowBatchOutcome {
    created_task_ids: Vec<String>,
    preserved_task_ids: Vec<String>,
    applied_operation_ids: Vec<String>,
    idempotent_operation_ids: Vec<String>,
    unchanged_operation_ids: Vec<String>,
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
            return Ok(TasksView::unconfigured().with_current_date(Some(self.clock.current_date())));
        };
        self.read_for_vault(&vault)
    }

    pub(crate) fn read_for_vault(&self, vault: &Path) -> Result<TasksView, String> {
        let current_date = self.clock.current_date();
        if let Err(error) = validate_compatible_vault(vault) {
            return Ok(
                TasksView::error(error, None, None, Some(vault.to_path_buf()))
                    .with_error_kind(TaskDataErrorKind::Unavailable)
                    .with_current_date(Some(current_date)),
            );
        }
        let path = task_document_path(&vault);
        let target_binding = task_target_binding(&path);
        let bytes = match self.store.load(&path) {
            Ok(Some(bytes)) => bytes,
            Ok(None) => {
                return Ok(
                    TasksView::empty(Some(target_binding), Some(vault.to_path_buf()))
                        .with_current_date(Some(current_date)),
                )
            }
            Err(error) => {
                return Ok(TasksView::error(
                    error,
                    Some(target_binding),
                    None,
                    Some(vault.to_path_buf()),
                )
                .with_error_kind(TaskDataErrorKind::Unavailable)
                .with_current_date(Some(current_date)))
            }
        };
        let current_time = self.clock.current_time_label();
        validate_timestamp_label(&format!("{current_date}T{current_time}+00:00"))?;
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
                    Some(vault.to_path_buf()),
                    &current_date,
                    &current_time,
                ))
            }
            Err(error) => Ok(TasksView::error(
                error,
                Some(target_binding),
                Some(revision),
                Some(vault.to_path_buf()),
            )
            .with_error_kind(TaskDataErrorKind::Damaged)
            .with_current_date(Some(current_date))),
        }
    }

    pub(crate) fn current_time_context(&self) -> Result<(String, String, String), String> {
        let current_date = self.clock.current_date();
        let current_time = self.clock.current_time_label();
        let current_timestamp = self.clock.current_timestamp_label();
        validate_timestamp_label(&current_timestamp)?;
        Ok((current_date, current_time, current_timestamp))
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
                if let Some(existing) = document.tasks.iter().find(|task| task.id == desired.id) {
                    if existing.deleted_at.is_some() {
                        return Err(
                            "该任务已经删除；旧规划输入不会重新激活它。请明确恢复或使用新的稳定身份。未写入任何内容。"
                                .into(),
                        );
                    }
                    if task_matches(existing, &desired) {
                        return self.read();
                    }
                    return Err(
                        "该任务标识已用于其他任务；请使用新的稳定身份。未写入任何内容。".into(),
                    );
                }
                ensure_active_task_list_exists(&document, &desired.list_id)?;
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
                ensure_active_task_list_exists(&document, &document.tasks[0].list_id)?;
                let encoded = encode_task_document(&document)?;
                self.ensure_bound_target_current(&path, &target_binding)?;
                self.store.create_new(&path, &encoded)?;
            }
        }
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.read()
    }

    pub fn create_list(&self, input: TaskListCreateInput) -> Result<TasksView, String> {
        validate_local_identifier(&input.list_id, "任务列表标识")?;
        let name = normalize_list_name(&input.name)?;
        if input.list_id == "inbox" {
            return Err("Inbox 是永久清单；不能重复创建。未写入任何内容。".into());
        }
        let (_vault, path, target_binding) = self.bound_target(&input.target_binding)?;
        let bytes = self.store.load(&path)?;
        match bytes {
            Some(bytes) => {
                let mut document = parse_task_document(&bytes)?;
                if let Some(existing) = document.lists.iter().find(|list| list.id == input.list_id)
                {
                    if !existing.system && existing.name == name && !existing.archived {
                        self.ensure_bound_target_current(&path, &target_binding)?;
                        return self.read();
                    }
                    return Err(
                        "该任务列表标识已用于其他清单；请使用新的稳定身份。未写入任何内容。".into(),
                    );
                }
                let expected_revision = input.expected_revision.as_deref().ok_or_else(|| {
                    "任务正本已经存在。请刷新 Tasks 后重试；现有清单未被覆盖。".to_string()
                })?;
                require_task_revision(&bytes, expected_revision, &target_binding)?;
                document.lists.push(TaskListRecord {
                    id: input.list_id,
                    name,
                    system: false,
                    archived: false,
                });
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
                    lists: vec![
                        inbox_record(),
                        TaskListRecord {
                            id: input.list_id,
                            name,
                            system: false,
                            archived: false,
                        },
                    ],
                    tasks: Vec::new(),
                };
                let encoded = encode_task_document(&document)?;
                self.ensure_bound_target_current(&path, &target_binding)?;
                self.store.create_new(&path, &encoded)?;
            }
        }
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.read()
    }

    pub fn rename_list(&self, input: TaskListRenameInput) -> Result<TasksView, String> {
        validate_local_identifier(&input.list_id, "任务列表标识")?;
        let name = normalize_list_name(&input.name)?;
        let (_vault, path, target_binding) = self.bound_target(&input.target_binding)?;
        let bytes = self
            .store
            .load(&path)?
            .ok_or_else(|| "任务正本尚不存在。请刷新 Tasks 后重试；未写入任何内容。".to_string())?;
        let mut document = parse_task_document(&bytes)?;
        let list_index = task_list_index(&document, &input.list_id)
            .ok_or_else(|| "找不到要改名的任务列表；未写入任何内容。".to_string())?;
        if document.lists[list_index].system {
            return Err("Inbox 是永久清单；不能改名。未写入任何内容。".into());
        }
        if document.lists[list_index].name == name {
            self.ensure_bound_target_current(&path, &target_binding)?;
            return self.read();
        }
        require_task_revision(&bytes, &input.expected_revision, &target_binding)?;
        document.lists[list_index].name = name;
        let updated = encode_task_document(&document)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.store.save_if_unchanged(&path, &bytes, &updated)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.read()
    }

    pub fn archive_list(&self, input: TaskListArchiveInput) -> Result<TasksView, String> {
        self.set_list_archived(
            input.target_binding,
            input.expected_revision,
            input.list_id,
            true,
        )
    }

    pub fn restore_list(&self, input: TaskListRestoreInput) -> Result<TasksView, String> {
        self.set_list_archived(
            input.target_binding,
            input.expected_revision,
            input.list_id,
            false,
        )
    }

    fn set_list_archived(
        &self,
        target_binding: String,
        expected_revision: String,
        list_id: String,
        archived: bool,
    ) -> Result<TasksView, String> {
        validate_local_identifier(&list_id, "任务列表标识")?;
        let (_vault, path, target_binding) = self.bound_target(&target_binding)?;
        let bytes = self
            .store
            .load(&path)?
            .ok_or_else(|| "任务正本尚不存在。请刷新 Tasks 后重试；未写入任何内容。".to_string())?;
        let mut document = parse_task_document(&bytes)?;
        let list_index = task_list_index(&document, &list_id)
            .ok_or_else(|| "找不到要更新的任务列表；未写入任何内容。".to_string())?;
        if document.lists[list_index].system {
            return Err("Inbox 是永久清单；不能归档或恢复。未写入任何内容。".into());
        }
        if document.lists[list_index].archived == archived {
            self.ensure_bound_target_current(&path, &target_binding)?;
            return self.read();
        }
        require_task_revision(&bytes, &expected_revision, &target_binding)?;
        document.lists[list_index].archived = archived;
        let updated = encode_task_document(&document)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.store.save_if_unchanged(&path, &bytes, &updated)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.read()
    }

    pub fn update(&self, input: TaskUpdateInput) -> Result<TasksView, String> {
        let (_vault, path, target_binding) = self.bound_target(&input.target_binding)?;
        let bytes = self
            .store
            .load(&path)?
            .ok_or_else(|| "任务正本尚不存在。请刷新 Tasks 后重试；未写入任何内容。".to_string())?;
        let mut document = parse_task_document(&bytes)?;
        let current_list_id = document
            .tasks
            .iter()
            .find(|task| task.id == input.task_id)
            .map(|task| task.list_id.clone())
            .unwrap_or_else(|| "inbox".into());
        let desired = task_from_update(&input, &current_list_id)?;
        ensure_task_list_exists(&document, &desired.list_id)?;
        if input
            .list_id
            .as_deref()
            .is_some_and(|list_id| list_id != current_list_id)
        {
            ensure_active_task_list_exists(&document, &desired.list_id)?;
        }
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
        if task.deleted_at.is_some() {
            return Err(
                "已删除任务不会被旧编辑操作重新激活；请先恢复任务。未写入任何内容。".into(),
            );
        }
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

    pub fn set_state(&self, input: TaskStateInput) -> Result<TasksView, String> {
        validate_local_identifier(&input.task_id, "任务标识")?;
        validate_local_identifier(&input.change_id, "任务修改标识")?;
        let (_vault, path, target_binding) = self.bound_target(&input.target_binding)?;
        let bytes = self
            .store
            .load(&path)?
            .ok_or_else(|| "任务正本尚不存在。请刷新 Tasks 后重试；未写入任何内容。".to_string())?;
        let mut document = parse_task_document(&bytes)?;
        if let Some((task_index, change)) = find_task_change(&document, &input.change_id) {
            if document.tasks[task_index].id == input.task_id
                && state_change_matches(change, input.state)
                && lifecycle_result_matches(&document.tasks[task_index], change)
            {
                return self.read();
            }
            return Err("该任务修改标识已用于其他操作；未写入任何内容。".into());
        }
        require_task_revision(&bytes, &input.expected_revision, &target_binding)?;
        let task_index = document
            .tasks
            .iter()
            .position(|task| task.id == input.task_id)
            .ok_or_else(|| "找不到要更新状态的任务；未写入任何内容。".to_string())?;
        if document.tasks[task_index].deleted_at.is_some() {
            return Err("已删除任务不会被旧操作重新激活；请先恢复任务。未写入任何内容。".into());
        }
        if document.tasks[task_index].state == TaskState::Abandoned
            && input.state == TaskState::Completed
        {
            return Err("任务必须先从放弃状态恢复为待办，再标记完成；未写入任何内容。".into());
        }
        if document.tasks[task_index].state == input.state {
            return self.read();
        }
        let now = self.clock.current_timestamp_label();
        validate_timestamp_label(&now)?;
        let completion = if input.state == TaskState::Completed {
            Some(completion_from_timestamp(
                &now,
                TaskCompletionSourceKind::Checkbox,
            )?)
        } else {
            None
        };
        let previous = document.tasks[task_index].clone();
        let updated = TaskRecord {
            state: input.state,
            completion,
            modified_at: now.clone(),
            ..previous.clone()
        };
        let change = task_state_change(
            &previous,
            &updated,
            input.change_id,
            now,
            TaskChangeSourceKind::User,
        )?;
        document.tasks[task_index] = updated;
        document.tasks[task_index].changes.push(change);
        let updated_bytes = encode_task_document(&document)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.store
            .save_if_unchanged(&path, &bytes, &updated_bytes)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.read()
    }

    pub fn delete(&self, input: TaskDeleteInput) -> Result<TasksView, String> {
        validate_local_identifier(&input.task_id, "任务标识")?;
        validate_local_identifier(&input.change_id, "任务修改标识")?;
        let (_vault, path, target_binding) = self.bound_target(&input.target_binding)?;
        let bytes = self
            .store
            .load(&path)?
            .ok_or_else(|| "任务正本尚不存在。请刷新 Tasks 后重试；未写入任何内容。".to_string())?;
        let mut document = parse_task_document(&bytes)?;
        if let Some((task_index, change)) = find_task_change(&document, &input.change_id) {
            if document.tasks[task_index].id == input.task_id
                && change.kind == TaskChangeKind::Deleted
                && lifecycle_result_matches(&document.tasks[task_index], change)
            {
                return self.read();
            }
            return Err("该任务修改标识已用于其他操作；未写入任何内容。".into());
        }
        require_task_revision(&bytes, &input.expected_revision, &target_binding)?;
        let task_index = document
            .tasks
            .iter()
            .position(|task| task.id == input.task_id)
            .ok_or_else(|| "找不到要删除的任务；未写入任何内容。".to_string())?;
        if document.tasks[task_index].deleted_at.is_some() {
            return Err("任务已经删除；请使用恢复操作。未写入任何内容。".into());
        }
        let now = self.clock.current_timestamp_label();
        validate_timestamp_label(&now)?;
        let previous = document.tasks[task_index].clone();
        let updated = TaskRecord {
            deleted_at: Some(now.clone()),
            modified_at: now.clone(),
            ..previous.clone()
        };
        let change = task_lifecycle_change(
            &previous,
            &updated,
            input.change_id,
            TaskChangeKind::Deleted,
            now,
            TaskChangeSourceKind::User,
        );
        document.tasks[task_index] = updated;
        document.tasks[task_index].changes.push(change);
        let updated_bytes = encode_task_document(&document)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.store
            .save_if_unchanged(&path, &bytes, &updated_bytes)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.read()
    }

    pub fn restore(&self, input: TaskRestoreInput) -> Result<TasksView, String> {
        validate_local_identifier(&input.task_id, "任务标识")?;
        validate_local_identifier(&input.change_id, "任务修改标识")?;
        let (_vault, path, target_binding) = self.bound_target(&input.target_binding)?;
        let bytes = self
            .store
            .load(&path)?
            .ok_or_else(|| "任务正本尚不存在。请刷新 Tasks 后重试；未写入任何内容。".to_string())?;
        let mut document = parse_task_document(&bytes)?;
        if let Some((task_index, change)) = find_task_change(&document, &input.change_id) {
            if document.tasks[task_index].id == input.task_id
                && change.kind == TaskChangeKind::Undeleted
                && lifecycle_result_matches(&document.tasks[task_index], change)
            {
                return self.read();
            }
            return Err("该任务修改标识已用于其他操作；未写入任何内容。".into());
        }
        require_task_revision(&bytes, &input.expected_revision, &target_binding)?;
        let task_index = document
            .tasks
            .iter()
            .position(|task| task.id == input.task_id)
            .ok_or_else(|| "找不到要恢复的任务；未写入任何内容。".to_string())?;
        if document.tasks[task_index].deleted_at.is_none() {
            return self.read();
        }
        let now = self.clock.current_timestamp_label();
        validate_timestamp_label(&now)?;
        let previous = document.tasks[task_index].clone();
        let updated = TaskRecord {
            deleted_at: None,
            modified_at: now.clone(),
            ..previous.clone()
        };
        let change = task_lifecycle_change(
            &previous,
            &updated,
            input.change_id,
            TaskChangeKind::Undeleted,
            now,
            TaskChangeSourceKind::User,
        );
        document.tasks[task_index] = updated;
        document.tasks[task_index].changes.push(change);
        let updated_bytes = encode_task_document(&document)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.store
            .save_if_unchanged(&path, &bytes, &updated_bytes)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.read()
    }

    pub fn correct_completion(
        &self,
        input: TaskCompletionCorrectionInput,
    ) -> Result<TasksView, String> {
        validate_local_identifier(&input.task_id, "任务标识")?;
        validate_local_identifier(&input.change_id, "任务修改标识")?;
        validate_completion_date(&input.completed_on)?;
        if let Some(time) = input.completed_time.as_deref() {
            validate_time(time)?;
        }
        let (_vault, path, target_binding) = self.bound_target(&input.target_binding)?;
        let bytes = self
            .store
            .load(&path)?
            .ok_or_else(|| "任务正本尚不存在。请刷新 Tasks 后重试；未写入任何内容。".to_string())?;
        let mut document = parse_task_document(&bytes)?;
        if let Some((task_index, change)) = find_task_change(&document, &input.change_id) {
            if document.tasks[task_index].id == input.task_id
                && change.kind == TaskChangeKind::CompletionCorrected
                && change.new_completion.as_ref().is_some_and(|completion| {
                    completion.completed_on == input.completed_on
                        && completion.completed_time == input.completed_time
                })
                && lifecycle_result_matches(&document.tasks[task_index], change)
            {
                return self.read();
            }
            return Err("该任务修改标识已用于其他操作；未写入任何内容。".into());
        }
        require_task_revision(&bytes, &input.expected_revision, &target_binding)?;
        let task_index = document
            .tasks
            .iter()
            .position(|task| task.id == input.task_id)
            .ok_or_else(|| "找不到要更正完成记录的任务；未写入任何内容。".to_string())?;
        let task = &document.tasks[task_index];
        if task.deleted_at.is_some() {
            return Err("已删除任务不会被旧操作重新激活；请先恢复任务。未写入任何内容。".into());
        }
        if task.state != TaskState::Completed || task.completion.is_none() {
            return Err("只有已明确完成的任务才能更正完成记录；未写入任何内容。".into());
        }
        if task.completion.as_ref().is_some_and(|completion| {
            completion.completed_on == input.completed_on
                && completion.completed_time == input.completed_time
        }) {
            return self.read();
        }
        let recorded_at = self.clock.current_timestamp_label();
        validate_timestamp_label(&recorded_at)?;
        let completion = completion_from_correction(
            &input.completed_on,
            input.completed_time.as_deref(),
            &recorded_at,
        )?;
        let previous = task.clone();
        let updated = TaskRecord {
            completion: Some(completion),
            modified_at: recorded_at.clone(),
            ..previous.clone()
        };
        let change = task_lifecycle_change(
            &previous,
            &updated,
            input.change_id,
            TaskChangeKind::CompletionCorrected,
            recorded_at,
            TaskChangeSourceKind::User,
        );
        document.tasks[task_index] = updated;
        document.tasks[task_index].changes.push(change);
        let updated_bytes = encode_task_document(&document)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.store
            .save_if_unchanged(&path, &bytes, &updated_bytes)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        self.read()
    }

    pub(crate) fn apply_daily_flow_batch(
        &self,
        supplied_binding: &str,
        expected_revision: Option<&str>,
        mutations: &[DailyFlowMutation],
    ) -> Result<DailyFlowBatchResult, String> {
        let (_vault, path, target_binding) = self.bound_target(supplied_binding)?;
        let bytes = self.store.load(&path)?;
        let (mut document, original_bytes) = match bytes {
            Some(bytes) => {
                let document = parse_task_document(&bytes)?;
                let expected = expected_revision.ok_or_else(|| {
                    "任务正本已经存在。请先读取最新任务正本，再提交 daily-flow 写命令；未写入任何内容。"
                        .to_string()
                })?;
                require_task_revision(&bytes, expected, &target_binding)?;
                (document, Some(bytes))
            }
            None => {
                if expected_revision.is_some() {
                    return Err("任务正本已不存在。请刷新 Tasks 后重试；未创建替代数据。".into());
                }
                (
                    TaskDocument {
                        schema_version: TASK_SCHEMA_VERSION,
                        lists: vec![inbox_record()],
                        tasks: Vec::new(),
                    },
                    None,
                )
            }
        };
        if mutations.is_empty() {
            return Ok(DailyFlowBatchResult {
                view: self.read()?,
                changed: false,
                created_task_ids: Vec::new(),
                preserved_task_ids: Vec::new(),
                applied_operation_ids: Vec::new(),
                idempotent_operation_ids: Vec::new(),
                unchanged_operation_ids: Vec::new(),
            });
        }

        let now = self.clock.current_timestamp_label();
        validate_timestamp_label(&now)?;
        let mut outcome = DailyFlowBatchOutcome::default();
        let mut changed = false;
        for mutation in mutations {
            changed |= apply_daily_flow_mutation(&mut document, mutation, &now, &mut outcome)?;
        }
        if !changed {
            return Ok(DailyFlowBatchResult {
                view: self.read()?,
                changed: false,
                created_task_ids: outcome.created_task_ids,
                preserved_task_ids: outcome.preserved_task_ids,
                applied_operation_ids: outcome.applied_operation_ids,
                idempotent_operation_ids: outcome.idempotent_operation_ids,
                unchanged_operation_ids: outcome.unchanged_operation_ids,
            });
        }

        let updated = encode_task_document(&document)?;
        self.ensure_bound_target_current(&path, &target_binding)?;
        match original_bytes {
            Some(bytes) => self.store.save_if_unchanged(&path, &bytes, &updated)?,
            None => self.store.create_new(&path, &updated)?,
        }
        self.ensure_bound_target_current(&path, &target_binding)?;
        Ok(DailyFlowBatchResult {
            view: self.read()?,
            changed: true,
            created_task_ids: outcome.created_task_ids,
            preserved_task_ids: outcome.preserved_task_ids,
            applied_operation_ids: outcome.applied_operation_ids,
            idempotent_operation_ids: outcome.idempotent_operation_ids,
            unchanged_operation_ids: outcome.unchanged_operation_ids,
        })
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
    #[serde(default)]
    deleted_at: Option<String>,
    #[serde(default)]
    completion: Option<TaskCompletionView>,
    created_at: String,
    modified_at: String,
    changes: Vec<TaskChangeView>,
}

impl TasksView {
    pub(crate) fn unconfigured() -> Self {
        Self {
            state: TaskDataState::Unconfigured,
            error_kind: None,
            message: "请选择 Vault，以读取 Tasks。".into(),
            schema_version: TASK_SCHEMA_VERSION,
            revision: None,
            target_binding: None,
            vault_name: None,
            vault_path: None,
            current_date: None,
            lists: Vec::new(),
            tasks: Vec::new(),
        }
    }

    pub(crate) fn empty(target_binding: Option<String>, vault: Option<PathBuf>) -> Self {
        Self {
            state: TaskDataState::Empty,
            error_kind: None,
            message: "Inbox 目前没有任务；新任务会先保存在 Inbox。".into(),
            schema_version: TASK_SCHEMA_VERSION,
            revision: None,
            target_binding,
            vault_name: vault_name(&vault),
            vault_path: vault.map(|path| path.to_string_lossy().into_owned()),
            current_date: None,
            lists: vec![task_list_view(inbox_record())],
            tasks: Vec::new(),
        }
    }

    pub(crate) fn error(
        message: impl Into<String>,
        target_binding: Option<String>,
        revision: Option<String>,
        vault: Option<PathBuf>,
    ) -> Self {
        Self {
            state: TaskDataState::Error,
            error_kind: None,
            message: message.into(),
            schema_version: TASK_SCHEMA_VERSION,
            revision,
            target_binding,
            vault_name: vault_name(&vault),
            vault_path: vault.map(|path| path.to_string_lossy().into_owned()),
            current_date: None,
            lists: Vec::new(),
            tasks: Vec::new(),
        }
    }

    fn with_current_date(mut self, current_date: Option<String>) -> Self {
        self.current_date = current_date;
        self
    }

    fn with_error_kind(mut self, error_kind: TaskDataErrorKind) -> Self {
        self.error_kind = Some(error_kind);
        self
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

fn task_view_at(task: &TaskRecord, current_date: &str, current_time: &str) -> TaskView {
    TaskView {
        id: task.id.clone(),
        name: task.name.clone(),
        content: task.content.clone(),
        date: task.date.clone(),
        time: task.time.clone(),
        list_id: task.list_id.clone(),
        source: task.source.clone(),
        state: task.state,
        deleted_at: task.deleted_at.clone(),
        completion: task.completion.clone(),
        overdue: task_is_overdue(task, current_date),
        time_passed: task_time_passed(task, current_date, current_time),
        created_at: task.created_at.clone(),
        modified_at: task.modified_at.clone(),
        changes: task.changes.clone(),
    }
}

fn tasks_view(
    document: TaskDocument,
    state: TaskDataState,
    message: String,
    revision: Option<String>,
    target_binding: Option<String>,
    vault: Option<PathBuf>,
    current_date: &str,
    current_time: &str,
) -> TasksView {
    TasksView {
        state,
        error_kind: None,
        message,
        schema_version: document.schema_version,
        revision,
        target_binding,
        vault_name: vault_name(&vault),
        vault_path: vault.map(|path| path.to_string_lossy().into_owned()),
        current_date: Some(current_date.to_owned()),
        lists: document.lists.into_iter().map(task_list_view).collect(),
        tasks: document
            .tasks
            .iter()
            .map(|task| task_view_at(task, current_date, current_time))
            .collect(),
    }
}

fn task_is_overdue(task: &TaskRecord, current_date: &str) -> bool {
    if task.state != TaskState::Pending || task.deleted_at.is_some() {
        return false;
    }
    let Some(date) = task.date.as_deref() else {
        return false;
    };
    let Some(task_date) = CalendarDate::parse(date) else {
        return false;
    };
    let Some(today) = CalendarDate::parse(current_date) else {
        return false;
    };
    task_date.unix_days() < today.unix_days()
}

fn task_time_passed(task: &TaskRecord, current_date: &str, current_time: &str) -> bool {
    if task.state != TaskState::Pending || task.deleted_at.is_some() {
        return false;
    }
    let Some(date) = task.date.as_deref() else {
        return false;
    };
    let Some(task_date) = CalendarDate::parse(date) else {
        return false;
    };
    let Some(today) = CalendarDate::parse(current_date) else {
        return false;
    };
    task_date == today && task.time.as_deref().is_some_and(|time| time < current_time)
}

pub(crate) fn normalize_name(value: &str) -> Result<String, String> {
    let name = value.trim();
    if name.is_empty() {
        return Err("任务名称不能为空。".into());
    }
    if name.chars().count() > 160 || name.contains(['\n', '\r']) {
        return Err("任务名称不能超过 160 个字符，也不能换行。".into());
    }
    Ok(name.into())
}

fn normalize_list_name(value: &str) -> Result<String, String> {
    let name = value.trim();
    if name.is_empty() {
        return Err("任务列表名称不能为空。".into());
    }
    if name.chars().count() > 80 || name.contains(['\n', '\r']) {
        return Err("任务列表名称不能超过 80 个字符，也不能换行。".into());
    }
    Ok(name.into())
}

pub(crate) fn normalize_content(value: Option<&str>) -> Option<String> {
    value
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
}

pub(crate) fn normalize_schedule(
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

pub(crate) fn validate_time(value: &str) -> Result<(), String> {
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
    task_from_draft(TaskRecordDraft {
        task_id: &input.task_id,
        source_reference: None,
        name: &input.name,
        content: input.content.as_deref(),
        date: input.date.as_deref(),
        time: input.time.as_deref(),
        list_id: input.list_id.as_deref(),
        source_kind: TaskSourceKind::Manual,
        now,
    })
}

struct TaskRecordDraft<'a> {
    task_id: &'a str,
    source_reference: Option<&'a str>,
    name: &'a str,
    content: Option<&'a str>,
    date: Option<&'a str>,
    time: Option<&'a str>,
    list_id: Option<&'a str>,
    source_kind: TaskSourceKind,
    now: &'a str,
}

fn task_from_draft(draft: TaskRecordDraft<'_>) -> Result<TaskRecord, String> {
    validate_local_identifier(draft.task_id, "任务标识")?;
    if draft.source_kind == TaskSourceKind::DailyFlow {
        validate_local_identifier(draft.source_reference.unwrap_or_default(), "任务来源标识")?;
    }
    let name = normalize_name(draft.name)?;
    let (date, time) = normalize_schedule(draft.date, draft.time)?;
    let list_id = draft.list_id.unwrap_or("inbox").to_owned();
    validate_local_identifier(&list_id, "任务列表标识")?;
    Ok(TaskRecord {
        id: draft.task_id.to_owned(),
        name,
        content: normalize_content(draft.content),
        date,
        time,
        list_id,
        source: TaskSourceView {
            kind: draft.source_kind,
            reference: draft.source_reference.map(str::to_owned),
        },
        state: TaskState::Pending,
        deleted_at: None,
        completion: None,
        created_at: draft.now.to_owned(),
        modified_at: draft.now.to_owned(),
        changes: Vec::new(),
    })
}

fn apply_daily_flow_mutation(
    document: &mut TaskDocument,
    mutation: &DailyFlowMutation,
    now: &str,
    outcome: &mut DailyFlowBatchOutcome,
) -> Result<bool, String> {
    match mutation {
        DailyFlowMutation::Create {
            task_id,
            source_reference,
            name,
            content,
            date,
            time,
            list_id,
        } => {
            let desired = task_from_draft(TaskRecordDraft {
                task_id,
                source_reference: Some(source_reference),
                name,
                content: content.as_deref(),
                date: date.as_deref(),
                time: time.as_deref(),
                list_id: list_id.as_deref(),
                source_kind: TaskSourceKind::DailyFlow,
                now,
            })?;
            if let Some(existing) = document.tasks.iter().find(|task| task.id == desired.id) {
                if existing.source.kind == TaskSourceKind::DailyFlow
                    && existing.source.reference.as_deref() == Some(source_reference.as_str())
                {
                    outcome.preserved_task_ids.push(task_id.clone());
                    return Ok(false);
                }
                return Err(
                    "该任务标识已用于其他任务；请使用新的稳定身份。未写入任何内容。".into(),
                );
            }
            if document.tasks.iter().any(|task| {
                task.source.kind == TaskSourceKind::DailyFlow
                    && task.source.reference.as_deref() == Some(source_reference.as_str())
            }) {
                return Err(
                    "该 daily-flow 来源标识已经绑定到其他任务；旧输入不会改绑对象。未写入任何内容。"
                        .into(),
                );
            }
            ensure_active_task_list_exists(document, &desired.list_id)?;
            outcome.created_task_ids.push(task_id.clone());
            document.tasks.push(desired);
            Ok(true)
        }
        DailyFlowMutation::Reschedule {
            task_id,
            change_id,
            date,
            time,
        } => {
            validate_local_identifier(task_id, "任务标识")?;
            validate_local_identifier(change_id, "任务修改标识")?;
            let (date, time) = normalize_schedule(date.as_deref(), time.as_deref())?;
            if let Some((task_index, change)) = find_task_change(document, change_id) {
                if document.tasks[task_index].id == *task_id
                    && reschedule_operation_matches(change, &date, &time)
                {
                    outcome.idempotent_operation_ids.push(change_id.clone());
                    return Ok(false);
                }
                return Err("该 daily-flow 操作标识已用于其他操作；未写入任何内容。".into());
            }
            let task_index = document
                .tasks
                .iter()
                .position(|task| task.id == *task_id)
                .ok_or_else(|| "找不到要改期的任务；未写入任何内容。".to_string())?;
            if document.tasks[task_index].deleted_at.is_some() {
                return Err(
                    "已删除任务不会被旧操作重新激活；请先恢复任务。未写入任何内容。".into(),
                );
            }
            if document.tasks[task_index].date == date && document.tasks[task_index].time == time {
                let task = &mut document.tasks[task_index];
                task.modified_at = now.to_owned();
                task.changes.push(task_noop_change(
                    change_id.clone(),
                    now.to_owned(),
                    TaskChangeSourceKind::DailyFlow,
                    TaskChangeOperation::Reschedule {
                        date: date.clone(),
                        time: time.clone(),
                    },
                ));
                outcome.applied_operation_ids.push(change_id.clone());
                return Ok(true);
            }
            let previous = document.tasks[task_index].clone();
            let updated = TaskRecord {
                date,
                time,
                modified_at: now.to_owned(),
                ..previous.clone()
            };
            let change = task_change_with_source(
                &previous,
                &updated,
                change_id.clone(),
                now.to_owned(),
                TaskChangeSourceKind::DailyFlow,
            )?;
            document.tasks[task_index] = updated;
            document.tasks[task_index].changes.push(change);
            outcome.applied_operation_ids.push(change_id.clone());
            Ok(true)
        }
        DailyFlowMutation::SetState {
            task_id,
            change_id,
            state,
        } => {
            validate_local_identifier(task_id, "任务标识")?;
            validate_local_identifier(change_id, "任务修改标识")?;
            if let Some((task_index, change)) = find_task_change(document, change_id) {
                if document.tasks[task_index].id == *task_id
                    && change.source == TaskChangeSourceKind::DailyFlow
                    && state_change_matches(change, *state)
                {
                    outcome.idempotent_operation_ids.push(change_id.clone());
                    return Ok(false);
                }
                return Err("该 daily-flow 操作标识已用于其他操作；未写入任何内容。".into());
            }
            let task_index = document
                .tasks
                .iter()
                .position(|task| task.id == *task_id)
                .ok_or_else(|| "找不到要更新状态的任务；未写入任何内容。".to_string())?;
            if document.tasks[task_index].deleted_at.is_some() {
                return Err(
                    "已删除任务不会被旧操作重新激活；请先恢复任务。未写入任何内容。".into(),
                );
            }
            if document.tasks[task_index].state == *state {
                let task = &mut document.tasks[task_index];
                task.modified_at = now.to_owned();
                task.changes.push(task_noop_change(
                    change_id.clone(),
                    now.to_owned(),
                    TaskChangeSourceKind::DailyFlow,
                    TaskChangeOperation::SetState { state: *state },
                ));
                outcome.applied_operation_ids.push(change_id.clone());
                return Ok(true);
            }
            if document.tasks[task_index].state == TaskState::Abandoned
                && *state == TaskState::Completed
            {
                return Err(
                    "放弃任务不会被旧 daily-flow 操作重新激活；请先明确恢复意图。未写入任何内容。"
                        .into(),
                );
            }
            let completion = if *state == TaskState::Completed {
                Some(completion_from_timestamp(
                    now,
                    TaskCompletionSourceKind::DailyFlow,
                )?)
            } else {
                None
            };
            let previous = document.tasks[task_index].clone();
            let updated = TaskRecord {
                state: *state,
                completion,
                modified_at: now.to_owned(),
                ..previous.clone()
            };
            let change = task_state_change(
                &previous,
                &updated,
                change_id.clone(),
                now.to_owned(),
                TaskChangeSourceKind::DailyFlow,
            )?;
            document.tasks[task_index] = updated;
            document.tasks[task_index].changes.push(change);
            outcome.applied_operation_ids.push(change_id.clone());
            Ok(true)
        }
        DailyFlowMutation::CorrectCompletion {
            task_id,
            change_id,
            completed_on,
            completed_time,
        } => {
            validate_local_identifier(task_id, "任务标识")?;
            validate_local_identifier(change_id, "任务修改标识")?;
            validate_completion_date(completed_on)?;
            if let Some(time) = completed_time.as_deref() {
                validate_time(time)?;
            }
            if let Some((task_index, change)) = find_task_change(document, change_id) {
                if document.tasks[task_index].id == *task_id
                    && change.source == TaskChangeSourceKind::DailyFlow
                    && completion_correction_matches(change, completed_on, completed_time)
                {
                    outcome.idempotent_operation_ids.push(change_id.clone());
                    return Ok(false);
                }
                return Err("该 daily-flow 操作标识已用于其他操作；未写入任何内容。".into());
            }
            let task_index = document
                .tasks
                .iter()
                .position(|task| task.id == *task_id)
                .ok_or_else(|| "找不到要更正完成记录的任务；未写入任何内容。".to_string())?;
            let task = &document.tasks[task_index];
            if task.deleted_at.is_some() {
                return Err(
                    "已删除任务不会被旧操作重新激活；请先恢复任务。未写入任何内容。".into(),
                );
            }
            if task.state != TaskState::Completed || task.completion.is_none() {
                return Err("只有已明确完成的任务才能更正完成记录；未写入任何内容。".into());
            }
            if task.completion.as_ref().is_some_and(|completion| {
                completion.completed_on == *completed_on
                    && completion.completed_time == *completed_time
            }) {
                let task = &mut document.tasks[task_index];
                task.modified_at = now.to_owned();
                task.changes.push(task_noop_change(
                    change_id.clone(),
                    now.to_owned(),
                    TaskChangeSourceKind::DailyFlow,
                    TaskChangeOperation::CorrectCompletion {
                        completed_on: completed_on.clone(),
                        completed_time: completed_time.clone(),
                    },
                ));
                outcome.applied_operation_ids.push(change_id.clone());
                return Ok(true);
            }
            let completion = completion_from_correction_with_source(
                completed_on,
                completed_time.as_deref(),
                now,
                TaskCompletionSourceKind::DateCorrection,
            )?;
            let previous = task.clone();
            let updated = TaskRecord {
                completion: Some(completion),
                modified_at: now.to_owned(),
                ..previous.clone()
            };
            let change = task_lifecycle_change(
                &previous,
                &updated,
                change_id.clone(),
                TaskChangeKind::CompletionCorrected,
                now.to_owned(),
                TaskChangeSourceKind::DailyFlow,
            );
            document.tasks[task_index] = updated;
            document.tasks[task_index].changes.push(change);
            outcome.applied_operation_ids.push(change_id.clone());
            Ok(true)
        }
    }
}

fn task_from_update(input: &TaskUpdateInput, current_list_id: &str) -> Result<TaskRecord, String> {
    validate_local_identifier(&input.task_id, "任务标识")?;
    validate_local_identifier(&input.change_id, "任务修改标识")?;
    let name = normalize_name(&input.name)?;
    let (date, time) = normalize_schedule(input.date.as_deref(), input.time.as_deref())?;
    let list_id = input
        .list_id
        .clone()
        .unwrap_or_else(|| current_list_id.to_owned());
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
        deleted_at: None,
        completion: None,
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

fn completion_from_timestamp(
    timestamp: &str,
    source: TaskCompletionSourceKind,
) -> Result<TaskCompletionView, String> {
    validate_timestamp_label(timestamp)?;
    let completed_on = timestamp
        .get(..10)
        .filter(|value| CalendarDate::parse(value).is_some())
        .ok_or_else(|| "任务完成日期无效。".to_string())?;
    let completed_time = timestamp
        .get(11..16)
        .ok_or_else(|| "任务完成时刻无效。".to_string())?;
    validate_time(completed_time)?;
    Ok(TaskCompletionView {
        completed_on: completed_on.to_owned(),
        completed_time: Some(completed_time.to_owned()),
        recorded_at: timestamp.to_owned(),
        source,
    })
}

pub(crate) fn validate_completion_date(value: &str) -> Result<(), String> {
    if CalendarDate::parse(value).is_some() {
        Ok(())
    } else {
        Err("任务完成日期必须是有效的 YYYY-MM-DD 日期。".into())
    }
}

fn completion_from_correction(
    completed_on: &str,
    completed_time: Option<&str>,
    recorded_at: &str,
) -> Result<TaskCompletionView, String> {
    completion_from_correction_with_source(
        completed_on,
        completed_time,
        recorded_at,
        TaskCompletionSourceKind::DateCorrection,
    )
}

fn completion_from_correction_with_source(
    completed_on: &str,
    completed_time: Option<&str>,
    recorded_at: &str,
    source: TaskCompletionSourceKind,
) -> Result<TaskCompletionView, String> {
    validate_completion_date(completed_on)?;
    if let Some(time) = completed_time {
        validate_time(time)?;
    }
    let current_on = recorded_at
        .get(..10)
        .ok_or_else(|| "任务完成日期无效。".to_string())?;
    let current_time = recorded_at
        .get(11..16)
        .ok_or_else(|| "任务完成时刻无效。".to_string())?;
    let completed_date = CalendarDate::parse(completed_on).expect("validated completion date");
    let current_date =
        CalendarDate::parse(current_on).ok_or_else(|| "任务完成日期无效。".to_string())?;
    if completed_date > current_date
        || (completed_date == current_date
            && completed_time.is_some_and(|time| time > current_time))
    {
        return Err("任务完成记录不能使用未来日期或未来时刻。".into());
    }
    Ok(TaskCompletionView {
        completed_on: completed_on.to_owned(),
        completed_time: completed_time.map(str::to_owned),
        recorded_at: recorded_at.to_owned(),
        source,
    })
}

fn state_change_matches(change: &TaskChangeView, state: TaskState) -> bool {
    (change.new_state == Some(state)
        && matches!(
            (state, change.kind),
            (TaskState::Completed, TaskChangeKind::Completed)
                | (TaskState::Pending, TaskChangeKind::Reopened)
                | (TaskState::Pending, TaskChangeKind::Restored)
                | (TaskState::Abandoned, TaskChangeKind::Abandoned)
        ))
        || (change.kind == TaskChangeKind::Noop
            && change.source == TaskChangeSourceKind::DailyFlow
            && change.operation == Some(TaskChangeOperation::SetState { state }))
}

fn reschedule_operation_matches(
    change: &TaskChangeView,
    date: &Option<String>,
    time: &Option<String>,
) -> bool {
    if change.source != TaskChangeSourceKind::DailyFlow {
        return false;
    }
    match change.kind {
        TaskChangeKind::Rescheduled => change.new_date == *date && change.new_time == *time,
        TaskChangeKind::Noop => matches!(
            change.operation.as_ref(),
            Some(TaskChangeOperation::Reschedule {
                date: recorded_date,
                time: recorded_time,
            }) if recorded_date == date && recorded_time == time
        ),
        _ => false,
    }
}

fn completion_correction_matches(
    change: &TaskChangeView,
    completed_on: &str,
    completed_time: &Option<String>,
) -> bool {
    if change.source != TaskChangeSourceKind::DailyFlow {
        return false;
    }
    match change.kind {
        TaskChangeKind::CompletionCorrected => {
            change.new_completion.as_ref().is_some_and(|completion| {
                completion.completed_on == completed_on
                    && completion.completed_time == *completed_time
            })
        }
        TaskChangeKind::Noop => matches!(
            change.operation.as_ref(),
            Some(TaskChangeOperation::CorrectCompletion {
                completed_on: recorded_date,
                completed_time: recorded_time,
            }) if recorded_date == completed_on && recorded_time == completed_time
        ),
        _ => false,
    }
}

fn task_lifecycle_change(
    previous: &TaskRecord,
    updated: &TaskRecord,
    id: String,
    kind: TaskChangeKind,
    changed_at: String,
    source: TaskChangeSourceKind,
) -> TaskChangeView {
    TaskChangeView {
        id,
        kind,
        changed_at,
        source,
        previous_name: None,
        new_name: None,
        previous_content: None,
        new_content: None,
        previous_date: None,
        new_date: None,
        previous_time: None,
        new_time: None,
        previous_list_id: None,
        new_list_id: None,
        previous_state: Some(previous.state),
        new_state: Some(updated.state),
        previous_deleted_at: previous.deleted_at.clone(),
        new_deleted_at: updated.deleted_at.clone(),
        previous_completion: previous.completion.clone(),
        new_completion: updated.completion.clone(),
        operation: None,
    }
}

fn task_noop_change(
    id: String,
    changed_at: String,
    source: TaskChangeSourceKind,
    operation: TaskChangeOperation,
) -> TaskChangeView {
    TaskChangeView {
        id,
        kind: TaskChangeKind::Noop,
        changed_at,
        source,
        previous_name: None,
        new_name: None,
        previous_content: None,
        new_content: None,
        previous_date: None,
        new_date: None,
        previous_time: None,
        new_time: None,
        previous_list_id: None,
        new_list_id: None,
        previous_state: None,
        new_state: None,
        previous_deleted_at: None,
        new_deleted_at: None,
        previous_completion: None,
        new_completion: None,
        operation: Some(operation),
    }
}

fn lifecycle_result_matches(task: &TaskRecord, change: &TaskChangeView) -> bool {
    change.new_state == Some(task.state)
        && change.new_deleted_at == task.deleted_at
        && change.new_completion == task.completion
}

fn task_state_change(
    previous: &TaskRecord,
    updated: &TaskRecord,
    id: String,
    changed_at: String,
    source: TaskChangeSourceKind,
) -> Result<TaskChangeView, String> {
    let kind = match (previous.state, updated.state) {
        (TaskState::Abandoned, TaskState::Completed) => {
            return Err("任务必须先从放弃状态恢复为待办，再标记完成；未写入任何内容。".into())
        }
        (_, TaskState::Completed) => TaskChangeKind::Completed,
        (TaskState::Completed, TaskState::Pending) => TaskChangeKind::Reopened,
        (_, TaskState::Abandoned) => TaskChangeKind::Abandoned,
        (TaskState::Abandoned, TaskState::Pending) => TaskChangeKind::Restored,
        _ => return Err("任务状态没有可保存的变化。".into()),
    };
    Ok(task_lifecycle_change(
        previous, updated, id, kind, changed_at, source,
    ))
}

fn ensure_task_list_exists(document: &TaskDocument, list_id: &str) -> Result<(), String> {
    if document.lists.iter().any(|list| list.id == list_id) {
        Ok(())
    } else {
        Err("任务列表不存在；未写入任何内容。".into())
    }
}

fn ensure_active_task_list_exists(document: &TaskDocument, list_id: &str) -> Result<(), String> {
    let list = document
        .lists
        .iter()
        .find(|list| list.id == list_id)
        .ok_or_else(|| "任务列表不存在；未写入任何内容。".to_string())?;
    if list.archived {
        return Err(
            "归档清单不能作为新任务或移动任务的目标；请先恢复清单。未写入任何内容。".into(),
        );
    }
    Ok(())
}

fn task_list_index(document: &TaskDocument, list_id: &str) -> Option<usize> {
    document.lists.iter().position(|list| list.id == list_id)
}

fn task_change(
    previous: &TaskRecord,
    updated: &TaskRecord,
    id: String,
    changed_at: String,
) -> Result<TaskChangeView, String> {
    task_change_with_source(
        previous,
        updated,
        id,
        changed_at,
        TaskChangeSourceKind::User,
    )
}

fn task_change_with_source(
    previous: &TaskRecord,
    updated: &TaskRecord,
    id: String,
    changed_at: String,
    source: TaskChangeSourceKind,
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
        source,
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
        previous_state: None,
        new_state: None,
        previous_deleted_at: None,
        new_deleted_at: None,
        previous_completion: None,
        new_completion: None,
        operation: None,
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
    let mut document: TaskDocument =
        serde_json::from_slice(bytes).map_err(|error| format!("任务正本不是有效 JSON：{error}"))?;
    match document.schema_version {
        LEGACY_TASK_SCHEMA_VERSION => {
            document.schema_version = TASK_SCHEMA_VERSION;
        }
        TASK_SCHEMA_VERSION => {}
        version => {
            return Err(format!(
                "任务正本使用不支持的 schema 版本 {}；未将其当作空任务。",
                version
            ));
        }
    }
    let mut list_ids = HashSet::new();
    let mut inbox = false;
    for list in &document.lists {
        validate_local_identifier(&list.id, "任务列表标识")?;
        normalize_list_name(&list.name)?;
        if !list_ids.insert(list.id.clone()) {
            return Err("任务正本包含重复任务列表标识。".into());
        }
        if list.id == "inbox" {
            inbox = true;
            if !list.system || list.archived {
                return Err("任务正本的 Inbox 列表必须是未归档的系统列表。".into());
            }
        } else if list.system {
            return Err("任务正本只能将 Inbox 声明为系统列表。".into());
        }
    }
    if !inbox {
        return Err("任务正本缺少 Inbox 列表。".into());
    }
    let mut task_ids = HashSet::new();
    let mut change_ids = HashSet::new();
    let mut daily_flow_references = HashSet::new();
    for task in &document.tasks {
        validate_task_record(task, &list_ids, &mut task_ids, &mut change_ids)?;
        if task.source.kind == TaskSourceKind::DailyFlow
            && !daily_flow_references.insert(task.source.reference.clone())
        {
            return Err("任务正本包含重复的 daily-flow 来源标识。".into());
        }
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
    if let Some(deleted_at) = &task.deleted_at {
        validate_timestamp_label(deleted_at)?;
    }
    match (task.state, task.completion.as_ref()) {
        (TaskState::Completed, Some(completion)) => validate_completion(completion)?,
        (TaskState::Completed, None) => return Err("任务正本的已完成任务缺少完成记录。".into()),
        (TaskState::Pending | TaskState::Abandoned, Some(_)) => {
            return Err("任务正本的未完成或放弃任务不能携带当前完成记录。".into())
        }
        (TaskState::Pending | TaskState::Abandoned, None) => {}
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
    if let Some(deleted_at) = &change.previous_deleted_at {
        validate_timestamp_label(deleted_at)?;
    }
    if let Some(deleted_at) = &change.new_deleted_at {
        validate_timestamp_label(deleted_at)?;
    }
    if let Some(completion) = &change.previous_completion {
        validate_completion(completion)?;
    }
    if let Some(completion) = &change.new_completion {
        validate_completion(completion)?;
    }
    validate_lifecycle_change(change)?;
    let has_change = change.previous_name.is_some()
        || change.new_name.is_some()
        || change.previous_content.is_some()
        || change.new_content.is_some()
        || change.previous_date.is_some()
        || change.new_date.is_some()
        || change.previous_time.is_some()
        || change.new_time.is_some()
        || change.previous_list_id.is_some()
        || change.new_list_id.is_some()
        || change.previous_state.is_some()
        || change.new_state.is_some()
        || change.previous_deleted_at.is_some()
        || change.new_deleted_at.is_some()
        || change.previous_completion.is_some()
        || change.new_completion.is_some()
        || change.operation.is_some();
    if !has_change {
        return Err("任务修改记录缺少前后变化。".into());
    }
    Ok(())
}

fn validate_completion(completion: &TaskCompletionView) -> Result<(), String> {
    validate_completion_date(&completion.completed_on)?;
    if let Some(time) = completion.completed_time.as_deref() {
        validate_time(time)?;
    }
    validate_timestamp_label(&completion.recorded_at)
}

fn validate_lifecycle_change(change: &TaskChangeView) -> Result<(), String> {
    let has_field_change = change.previous_name.is_some()
        || change.new_name.is_some()
        || change.previous_content.is_some()
        || change.new_content.is_some()
        || change.previous_date.is_some()
        || change.new_date.is_some()
        || change.previous_time.is_some()
        || change.new_time.is_some()
        || change.previous_list_id.is_some()
        || change.new_list_id.is_some();
    match change.kind {
        TaskChangeKind::Completed => {
            if has_field_change
                || change
                    .previous_state
                    .is_none_or(|state| state == TaskState::Completed)
                || change.new_state != Some(TaskState::Completed)
                || change.previous_completion.is_some()
                || change.new_completion.is_none()
                || change.previous_deleted_at.is_some()
                || change.new_deleted_at.is_some()
            {
                return Err("任务完成记录的前后状态或完成证据无效。".into());
            }
        }
        TaskChangeKind::Reopened => {
            if has_field_change
                || change.previous_state != Some(TaskState::Completed)
                || change.new_state != Some(TaskState::Pending)
                || change.previous_completion.is_none()
                || change.new_completion.is_some()
                || change.previous_deleted_at.is_some()
                || change.new_deleted_at.is_some()
            {
                return Err("任务重开记录的前后状态无效。".into());
            }
        }
        TaskChangeKind::Abandoned => {
            let previous_state = change.previous_state;
            let previous_completion_valid = match previous_state {
                Some(TaskState::Pending) => change.previous_completion.is_none(),
                Some(TaskState::Completed) => change.previous_completion.is_some(),
                Some(TaskState::Abandoned) | None => false,
            };
            if has_field_change
                || !previous_completion_valid
                || change.new_state != Some(TaskState::Abandoned)
                || change.new_completion.is_some()
                || change.previous_deleted_at.is_some()
                || change.new_deleted_at.is_some()
            {
                return Err("任务放弃记录的前后状态无效。".into());
            }
        }
        TaskChangeKind::Restored => {
            if has_field_change
                || change.previous_state != Some(TaskState::Abandoned)
                || change.new_state != Some(TaskState::Pending)
                || change.previous_completion.is_some()
                || change.new_completion.is_some()
                || change.previous_deleted_at.is_some()
                || change.new_deleted_at.is_some()
            {
                return Err("任务恢复记录的前后状态无效。".into());
            }
        }
        TaskChangeKind::Deleted => {
            if has_field_change
                || change.previous_deleted_at.is_some()
                || change.new_deleted_at.is_none()
                || change.previous_state.is_none()
                || change.previous_state != change.new_state
                || change.previous_completion != change.new_completion
            {
                return Err("任务删除记录的前后删除标记无效。".into());
            }
        }
        TaskChangeKind::Undeleted => {
            if has_field_change
                || change.previous_deleted_at.is_none()
                || change.new_deleted_at.is_some()
                || change.previous_state.is_none()
                || change.previous_state != change.new_state
                || change.previous_completion != change.new_completion
            {
                return Err("任务恢复记录的前后删除标记无效。".into());
            }
        }
        TaskChangeKind::CompletionCorrected => {
            if has_field_change
                || change.previous_state != Some(TaskState::Completed)
                || change.new_state != Some(TaskState::Completed)
                || change.previous_completion.is_none()
                || change.new_completion.is_none()
                || change.previous_completion == change.new_completion
                || change.previous_deleted_at.is_some()
                || change.new_deleted_at.is_some()
            {
                return Err("任务完成更正记录的前后状态或完成证据无效。".into());
            }
        }
        TaskChangeKind::Noop => {
            if change.source != TaskChangeSourceKind::DailyFlow
                || has_field_change
                || change.previous_state.is_some()
                || change.new_state.is_some()
                || change.previous_deleted_at.is_some()
                || change.new_deleted_at.is_some()
                || change.previous_completion.is_some()
                || change.new_completion.is_some()
            {
                return Err("任务无变化操作记录不能携带字段前后值。".into());
            }
            match change.operation.as_ref() {
                Some(TaskChangeOperation::Reschedule { date, time }) => {
                    normalize_schedule(date.as_deref(), time.as_deref())?;
                }
                Some(TaskChangeOperation::SetState { .. }) => {}
                Some(TaskChangeOperation::CorrectCompletion {
                    completed_on,
                    completed_time,
                }) => {
                    validate_completion_date(completed_on)?;
                    if let Some(time) = completed_time.as_deref() {
                        validate_time(time)?;
                    }
                }
                None => {
                    return Err("任务无变化操作记录缺少操作内容。".into());
                }
            }
        }
        TaskChangeKind::Renamed
        | TaskChangeKind::ContentEdited
        | TaskChangeKind::Rescheduled
        | TaskChangeKind::ListMoved
        | TaskChangeKind::Edited => {
            if change.previous_state.is_some()
                || change.new_state.is_some()
                || change.previous_deleted_at.is_some()
                || change.new_deleted_at.is_some()
                || change.previous_completion.is_some()
                || change.new_completion.is_some()
                || change.operation.is_some()
            {
                return Err("任务字段变更记录不能携带状态或完成生命周期字段。".into());
            }
        }
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
