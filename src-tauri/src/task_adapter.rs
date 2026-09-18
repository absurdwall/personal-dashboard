use crate::clock::SystemClock;
use crate::tasks::{
    normalize_content, normalize_name, normalize_schedule, DailyFlowMutation, FileTaskStore,
    TaskApplication, TaskDataErrorKind, TaskDataState, TaskSourceView, TaskState, TasksView,
};
use crate::today::{CalendarDate, TodayClock, TodayWorkspacePersistence};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::io::Read;
use std::path::{Path, PathBuf};

pub const DAILY_FLOW_TASK_ADAPTER_SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", tag = "operation", deny_unknown_fields)]
pub enum DailyFlowTaskRequest {
    #[serde(rename = "read", rename_all = "camelCase")]
    Read {
        schema_version: u32,
        vault_path: PathBuf,
        lived_date: String,
    },
    #[serde(rename = "apply", rename_all = "camelCase")]
    Apply {
        schema_version: u32,
        vault_path: PathBuf,
        lived_date: String,
        target_binding: String,
        expected_revision: Option<String>,
        candidates: Vec<DailyFlowCandidate>,
        commands: Vec<DailyFlowCommand>,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind", deny_unknown_fields)]
pub enum DailyFlowCandidate {
    #[serde(rename = "action", rename_all = "camelCase")]
    Action {
        task_id: String,
        source_reference: String,
        name: String,
        content: Option<String>,
        date: Option<String>,
        time: Option<String>,
        list_id: Option<String>,
    },
    #[serde(rename = "suggestion", rename_all = "camelCase")]
    Suggestion {
        source_reference: String,
        name: String,
        content: Option<String>,
        date: Option<String>,
        time: Option<String>,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", tag = "kind", deny_unknown_fields)]
pub enum DailyFlowCommand {
    #[serde(rename = "reschedule", rename_all = "camelCase")]
    Reschedule {
        task_id: String,
        operation_id: String,
        date: Option<String>,
        time: Option<String>,
    },
    #[serde(rename = "complete", rename_all = "camelCase")]
    Complete {
        task_id: String,
        operation_id: String,
    },
    #[serde(rename = "abandon", rename_all = "camelCase")]
    Abandon {
        task_id: String,
        operation_id: String,
    },
    #[serde(rename = "correctCompletion", rename_all = "camelCase")]
    CorrectCompletion {
        task_id: String,
        operation_id: String,
        completed_on: String,
        completed_time: Option<String>,
    },
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase", tag = "operation", content = "result")]
pub enum DailyFlowTaskResponse {
    #[serde(rename = "read")]
    Read(DailyFlowTaskReadView),
    #[serde(rename = "apply")]
    Apply(DailyFlowTaskApplyView),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DailyFlowTaskReadState {
    Empty,
    Ready,
    Damaged,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DailyFlowTaskReason {
    ScheduledForLivedDate,
    Overdue,
    UndatedCandidate,
    CompletedOnLivedDate,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyFlowTaskView {
    pub id: String,
    pub name: String,
    pub content: Option<String>,
    pub date: Option<String>,
    pub time: Option<String>,
    pub list_id: String,
    pub list_name: String,
    pub list_archived: bool,
    pub source: TaskSourceView,
    pub state: TaskState,
    pub deleted_at: Option<String>,
    pub completion: Option<crate::tasks::TaskCompletionView>,
    pub overdue: bool,
    pub planning_eligible: bool,
    pub reasons: Vec<DailyFlowTaskReason>,
    pub changes: Vec<crate::tasks::TaskChangeView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyFlowTaskReadView {
    pub schema_version: u32,
    pub state: DailyFlowTaskReadState,
    pub message: String,
    pub lived_date: String,
    pub current_date: String,
    pub current_timestamp: String,
    pub timezone_offset: Option<String>,
    pub canonical_schema_version: Option<u32>,
    pub revision: Option<String>,
    pub target_binding: Option<String>,
    pub vault_path: Option<String>,
    pub tasks: Vec<DailyFlowTaskView>,
    pub excluded_archived_pending: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DailyFlowActionOutcome {
    Created,
    Preserved,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum DailyFlowCommandOutcome {
    Applied,
    Idempotent,
    Unchanged,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyFlowTaskSuggestionView {
    pub source_reference: String,
    pub name: String,
    pub content: Option<String>,
    pub date: Option<String>,
    pub time: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyFlowActionResult {
    pub task_id: String,
    pub source_reference: String,
    pub outcome: DailyFlowActionOutcome,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyFlowCommandResult {
    pub operation_id: String,
    pub outcome: DailyFlowCommandOutcome,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyFlowTaskApplyView {
    pub schema_version: u32,
    pub changed: bool,
    pub message: String,
    pub target_binding: Option<String>,
    pub revision: Option<String>,
    pub suggestions: Vec<DailyFlowTaskSuggestionView>,
    pub actions: Vec<DailyFlowActionResult>,
    pub commands: Vec<DailyFlowCommandResult>,
    pub read: DailyFlowTaskReadView,
}

struct PreparedMutations {
    mutations: Vec<DailyFlowMutation>,
    suggestions: Vec<DailyFlowTaskSuggestionView>,
    actions: Vec<(String, String)>,
    command_ids: Vec<String>,
}

#[derive(Clone)]
pub struct FixedVaultPersistence {
    vault: PathBuf,
}

impl FixedVaultPersistence {
    pub fn new(vault: PathBuf) -> Self {
        Self { vault }
    }
}

impl TodayWorkspacePersistence for FixedVaultPersistence {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(self.vault.clone()))
    }

    fn save_selected_vault(&self, _vault: &Path) -> Result<(), String> {
        Err(
            "daily-flow adapter 使用调用方明确提供的 Vault；不会改变 Dashboard 的已选 Vault。"
                .into(),
        )
    }
}

pub struct DailyFlowTaskAdapter<P, C, S = FileTaskStore> {
    application: TaskApplication<P, C, S>,
}

impl<P, C, S> DailyFlowTaskAdapter<P, C, S>
where
    P: TodayWorkspacePersistence,
    C: TodayClock,
    S: crate::tasks::TaskStore,
{
    pub fn new(application: TaskApplication<P, C, S>) -> Self {
        Self { application }
    }

    pub fn execute(&self, request: DailyFlowTaskRequest) -> Result<DailyFlowTaskResponse, String> {
        match request {
            DailyFlowTaskRequest::Read {
                schema_version,
                vault_path,
                lived_date,
            } => {
                validate_request_header(schema_version, &vault_path, &lived_date)?;
                let view = self.application.read()?;
                ensure_request_vault(&view, &vault_path)?;
                Ok(DailyFlowTaskResponse::Read(
                    self.read_view(view, &lived_date)?,
                ))
            }
            DailyFlowTaskRequest::Apply {
                schema_version,
                vault_path,
                lived_date,
                target_binding,
                expected_revision,
                candidates,
                commands,
            } => {
                validate_request_header(schema_version, &vault_path, &lived_date)?;
                self.apply(
                    vault_path,
                    lived_date,
                    target_binding,
                    expected_revision,
                    candidates,
                    commands,
                )
            }
        }
    }

    fn apply(
        &self,
        vault_path: PathBuf,
        lived_date: String,
        target_binding: String,
        expected_revision: Option<String>,
        candidates: Vec<DailyFlowCandidate>,
        commands: Vec<DailyFlowCommand>,
    ) -> Result<DailyFlowTaskResponse, String> {
        let current = self.application.read()?;
        ensure_request_vault(&current, &vault_path)?;
        if current.state == TaskDataState::Error {
            return Err(current.message);
        }
        if current.target_binding.as_deref() != Some(target_binding.as_str()) {
            return Err(
                "Tasks 当前绑定的 Vault 或文件目标已经变化。请先读取最新任务正本；未写入任何内容。"
                    .into(),
            );
        }
        let PreparedMutations {
            mutations,
            suggestions,
            actions,
            command_ids,
        } = prepare_apply_request(&lived_date, candidates, commands)?;
        if mutations.is_empty() {
            let read = self.read_view(current, &lived_date)?;
            return Ok(DailyFlowTaskResponse::Apply(DailyFlowTaskApplyView {
                schema_version: DAILY_FLOW_TASK_ADAPTER_SCHEMA_VERSION,
                changed: false,
                message: "没有需要写入的 daily-flow 行动；建议仍保持为建议。".into(),
                target_binding: read.target_binding.clone(),
                revision: read.revision.clone(),
                suggestions,
                actions: actions
                    .into_iter()
                    .map(|(task_id, source_reference)| DailyFlowActionResult {
                        task_id,
                        source_reference,
                        outcome: DailyFlowActionOutcome::Preserved,
                    })
                    .collect(),
                commands: Vec::new(),
                read,
            }));
        }

        let batch = self.application.apply_daily_flow_batch(
            &target_binding,
            expected_revision.as_deref(),
            &mutations,
        )?;
        let read = self.read_view(batch.view, &lived_date)?;
        let action_results = actions
            .into_iter()
            .map(|(task_id, source_reference)| {
                let outcome = if batch.created_task_ids.iter().any(|id| id == &task_id) {
                    DailyFlowActionOutcome::Created
                } else {
                    DailyFlowActionOutcome::Preserved
                };
                DailyFlowActionResult {
                    task_id,
                    source_reference,
                    outcome,
                }
            })
            .collect();
        let command_results = command_ids
            .into_iter()
            .map(|operation_id| {
                let outcome = if batch
                    .applied_operation_ids
                    .iter()
                    .any(|id| id == &operation_id)
                {
                    DailyFlowCommandOutcome::Applied
                } else if batch
                    .idempotent_operation_ids
                    .iter()
                    .any(|id| id == &operation_id)
                {
                    DailyFlowCommandOutcome::Idempotent
                } else {
                    DailyFlowCommandOutcome::Unchanged
                };
                DailyFlowCommandResult {
                    operation_id,
                    outcome,
                }
            })
            .collect();
        Ok(DailyFlowTaskResponse::Apply(DailyFlowTaskApplyView {
            schema_version: DAILY_FLOW_TASK_ADAPTER_SCHEMA_VERSION,
            changed: batch.changed,
            message: if batch.changed {
                "daily-flow 明确行动已写入任务正本。".into()
            } else {
                "daily-flow 行动没有改变任务正本。".into()
            },
            target_binding: read.target_binding.clone(),
            revision: read.revision.clone(),
            suggestions,
            actions: action_results,
            commands: command_results,
            read,
        }))
    }

    fn read_view(
        &self,
        view: TasksView,
        lived_date: &str,
    ) -> Result<DailyFlowTaskReadView, String> {
        let (current_date, _current_time, current_timestamp) =
            match self.application.current_time_context() {
                Ok(context) => context,
                Err(error) => return Ok(failed_read_view(view, lived_date, error)),
            };
        let state = match view.state {
            TaskDataState::Empty => DailyFlowTaskReadState::Empty,
            TaskDataState::Ready => DailyFlowTaskReadState::Ready,
            TaskDataState::Error => match view.error_kind {
                Some(TaskDataErrorKind::Damaged) => DailyFlowTaskReadState::Damaged,
                Some(TaskDataErrorKind::Unavailable) | None => DailyFlowTaskReadState::Failed,
            },
            TaskDataState::Unconfigured => DailyFlowTaskReadState::Failed,
        };
        let mut excluded_archived_pending = 0;
        let tasks = if state == DailyFlowTaskReadState::Ready {
            view.tasks
                .into_iter()
                .filter_map(|task| {
                    let list = view.lists.iter().find(|list| list.id == task.list_id);
                    let list_archived = list.is_some_and(|list| list.archived);
                    let scheduled_for_lived_date = task.date.as_deref() == Some(lived_date);
                    let undated_candidate = task.date.is_none()
                        && task.state == TaskState::Pending
                        && task.deleted_at.is_none();
                    let completed_on_lived_date = task
                        .completion
                        .as_ref()
                        .is_some_and(|completion| completion.completed_on == lived_date);
                    let mut reasons = Vec::new();
                    if scheduled_for_lived_date {
                        reasons.push(DailyFlowTaskReason::ScheduledForLivedDate);
                    }
                    if task.overdue {
                        reasons.push(DailyFlowTaskReason::Overdue);
                    }
                    if undated_candidate {
                        reasons.push(DailyFlowTaskReason::UndatedCandidate);
                    }
                    if completed_on_lived_date {
                        reasons.push(DailyFlowTaskReason::CompletedOnLivedDate);
                    }
                    if list_archived
                        && task.state == TaskState::Pending
                        && task.deleted_at.is_none()
                        && !reasons.is_empty()
                    {
                        excluded_archived_pending += 1;
                        return None;
                    }
                    if reasons.is_empty() {
                        return None;
                    }
                    Some(DailyFlowTaskView {
                        id: task.id,
                        name: task.name,
                        content: task.content,
                        date: task.date,
                        time: task.time,
                        list_id: task.list_id,
                        list_name: list
                            .map(|list| list.name.clone())
                            .unwrap_or_else(|| "未知清单".into()),
                        list_archived,
                        source: task.source,
                        state: task.state,
                        deleted_at: task.deleted_at.clone(),
                        completion: task.completion,
                        overdue: task.overdue,
                        planning_eligible: task.state == TaskState::Pending
                            && task.deleted_at.is_none()
                            && !list_archived,
                        reasons,
                        changes: task.changes,
                    })
                })
                .collect()
        } else {
            Vec::new()
        };
        Ok(DailyFlowTaskReadView {
            schema_version: DAILY_FLOW_TASK_ADAPTER_SCHEMA_VERSION,
            state,
            message: view.message,
            lived_date: lived_date.to_owned(),
            current_date,
            current_timestamp: current_timestamp.clone(),
            timezone_offset: timestamp_timezone_offset(&current_timestamp),
            canonical_schema_version: (state == DailyFlowTaskReadState::Ready
                || (state == DailyFlowTaskReadState::Empty && view.revision.is_some()))
            .then_some(view.schema_version),
            revision: view.revision,
            target_binding: view.target_binding,
            vault_path: view.vault_path,
            tasks,
            excluded_archived_pending,
        })
    }
}

fn failed_read_view(view: TasksView, lived_date: &str, error: String) -> DailyFlowTaskReadView {
    DailyFlowTaskReadView {
        schema_version: DAILY_FLOW_TASK_ADAPTER_SCHEMA_VERSION,
        state: DailyFlowTaskReadState::Failed,
        message: format!("daily-flow adapter 无法读取当前时间上下文：{error}"),
        lived_date: lived_date.to_owned(),
        current_date: view.current_date.unwrap_or_default(),
        current_timestamp: String::new(),
        timezone_offset: None,
        canonical_schema_version: None,
        revision: view.revision,
        target_binding: view.target_binding,
        vault_path: view.vault_path,
        tasks: Vec::new(),
        excluded_archived_pending: 0,
    }
}

pub fn run_daily_flow_task_request(
    request: DailyFlowTaskRequest,
) -> Result<DailyFlowTaskResponse, String> {
    let vault_path = request.vault_path().to_path_buf();
    validate_vault_path(&vault_path)?;
    let application =
        TaskApplication::with_file_store(FixedVaultPersistence::new(vault_path), SystemClock);
    DailyFlowTaskAdapter::new(application).execute(request)
}

pub fn run_daily_flow_task_cli() -> i32 {
    let mut input = String::new();
    if let Err(error) = std::io::stdin().read_to_string(&mut input) {
        eprintln!("daily-flow task adapter input failed: {error}");
        return 1;
    }
    let request: DailyFlowTaskRequest = match serde_json::from_str(&input) {
        Ok(request) => request,
        Err(error) => {
            eprintln!("daily-flow task adapter request is invalid: {error}");
            return 1;
        }
    };
    match run_daily_flow_task_request(request) {
        Ok(response) => match serde_json::to_string_pretty(&response) {
            Ok(document) => {
                println!("{document}");
                0
            }
            Err(error) => {
                eprintln!("daily-flow task adapter response failed: {error}");
                1
            }
        },
        Err(error) => {
            eprintln!("daily-flow task adapter operation failed: {error}");
            1
        }
    }
}

fn prepare_apply_request(
    lived_date: &str,
    candidates: Vec<DailyFlowCandidate>,
    commands: Vec<DailyFlowCommand>,
) -> Result<PreparedMutations, String> {
    let mut mutations = Vec::new();
    let mut suggestions = Vec::new();
    let mut actions = Vec::new();
    let mut action_task_ids = HashSet::new();
    let mut action_source_references = HashSet::new();
    for candidate in candidates {
        match candidate {
            DailyFlowCandidate::Action {
                task_id,
                source_reference,
                name,
                content,
                date,
                time,
                list_id,
            } => {
                crate::today::validate_local_identifier(&task_id, "任务标识")?;
                crate::today::validate_local_identifier(&source_reference, "任务来源标识")?;
                if !action_task_ids.insert(task_id.clone()) {
                    return Err("同一 daily-flow 请求不能重复声明任务标识；未写入任何内容。".into());
                }
                if !action_source_references.insert(source_reference.clone()) {
                    return Err("同一 daily-flow 请求不能重复声明来源标识；未写入任何内容。".into());
                }
                let name = normalize_name(&name)?;
                let content = normalize_content(content.as_deref());
                let date = date
                    .as_deref()
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                    .or(Some(lived_date));
                let (date, time) = normalize_schedule(date, time.as_deref())?;
                if let Some(list_id) = list_id.as_deref() {
                    crate::today::validate_local_identifier(list_id, "任务列表标识")?;
                }
                actions.push((task_id.clone(), source_reference.clone()));
                mutations.push(DailyFlowMutation::Create {
                    task_id,
                    source_reference,
                    name,
                    content,
                    date,
                    time,
                    list_id,
                });
            }
            DailyFlowCandidate::Suggestion {
                source_reference,
                name,
                content,
                date,
                time,
            } => {
                crate::today::validate_local_identifier(&source_reference, "建议来源标识")?;
                let name = normalize_name(&name)?;
                let content = normalize_content(content.as_deref());
                let (date, time) = normalize_schedule(date.as_deref(), time.as_deref())?;
                suggestions.push(DailyFlowTaskSuggestionView {
                    source_reference,
                    name,
                    content,
                    date,
                    time,
                });
            }
        }
    }

    let mut operation_ids = HashSet::new();
    let mut command_ids = Vec::new();
    for command in commands {
        match command {
            DailyFlowCommand::Reschedule {
                task_id,
                operation_id,
                date,
                time,
            } => {
                validate_command_identity(&task_id, &operation_id, &mut operation_ids)?;
                let (date, time) = normalize_schedule(date.as_deref(), time.as_deref())?;
                mutations.push(DailyFlowMutation::Reschedule {
                    task_id,
                    change_id: operation_id.clone(),
                    date,
                    time,
                });
                command_ids.push(operation_id);
            }
            DailyFlowCommand::Complete {
                task_id,
                operation_id,
            } => {
                validate_command_identity(&task_id, &operation_id, &mut operation_ids)?;
                mutations.push(DailyFlowMutation::SetState {
                    task_id,
                    change_id: operation_id.clone(),
                    state: TaskState::Completed,
                });
                command_ids.push(operation_id);
            }
            DailyFlowCommand::Abandon {
                task_id,
                operation_id,
            } => {
                validate_command_identity(&task_id, &operation_id, &mut operation_ids)?;
                mutations.push(DailyFlowMutation::SetState {
                    task_id,
                    change_id: operation_id.clone(),
                    state: TaskState::Abandoned,
                });
                command_ids.push(operation_id);
            }
            DailyFlowCommand::CorrectCompletion {
                task_id,
                operation_id,
                completed_on,
                completed_time,
            } => {
                validate_command_identity(&task_id, &operation_id, &mut operation_ids)?;
                CalendarDate::parse(&completed_on)
                    .ok_or_else(|| "任务完成日期必须是有效的 YYYY-MM-DD 日期。".to_string())?;
                if let Some(time) = completed_time.as_deref() {
                    crate::tasks::validate_time(time)?;
                }
                mutations.push(DailyFlowMutation::CorrectCompletion {
                    task_id,
                    change_id: operation_id.clone(),
                    completed_on,
                    completed_time,
                });
                command_ids.push(operation_id);
            }
        }
    }
    Ok(PreparedMutations {
        mutations,
        suggestions,
        actions,
        command_ids,
    })
}

fn validate_command_identity(
    task_id: &str,
    operation_id: &str,
    operation_ids: &mut HashSet<String>,
) -> Result<(), String> {
    crate::today::validate_local_identifier(task_id, "任务标识")?;
    crate::today::validate_local_identifier(operation_id, "daily-flow 操作标识")?;
    if !operation_ids.insert(operation_id.to_owned()) {
        return Err("同一 daily-flow 请求不能重复使用操作标识；未写入任何内容。".into());
    }
    Ok(())
}

fn validate_request_header(
    schema_version: u32,
    vault_path: &Path,
    lived_date: &str,
) -> Result<(), String> {
    if schema_version != DAILY_FLOW_TASK_ADAPTER_SCHEMA_VERSION {
        return Err(format!(
            "daily-flow task adapter 使用不支持的 schema 版本 {schema_version}。"
        ));
    }
    validate_vault_path(vault_path)?;
    if CalendarDate::parse(lived_date).is_none() {
        return Err("lived date 必须是有效的 YYYY-MM-DD 日期。".into());
    }
    Ok(())
}

fn validate_vault_path(vault_path: &Path) -> Result<(), String> {
    if vault_path.as_os_str().is_empty() {
        Err("daily-flow task adapter 必须明确提供 Vault 路径。".into())
    } else if !vault_path.is_absolute() {
        Err("daily-flow task adapter 必须提供绝对 Vault 路径。".into())
    } else {
        Ok(())
    }
}

fn ensure_request_vault(view: &TasksView, vault_path: &Path) -> Result<(), String> {
    let expected = vault_path.to_string_lossy().into_owned();
    if view.vault_path.as_deref() == Some(expected.as_str()) {
        Ok(())
    } else {
        Err("daily-flow 请求的 Vault 与任务正本当前目标不一致；未写入任何内容。".into())
    }
}

fn timestamp_timezone_offset(timestamp: &str) -> Option<String> {
    let offset_start = match timestamp.len() {
        22 => 16,
        25 => 19,
        _ => return None,
    };
    timestamp.get(offset_start..).map(str::to_owned)
}

impl DailyFlowTaskRequest {
    fn vault_path(&self) -> &Path {
        match self {
            Self::Read { vault_path, .. } | Self::Apply { vault_path, .. } => vault_path,
        }
    }
}
