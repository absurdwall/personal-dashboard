use personal_dashboard_lib::task_adapter::{
    DailyFlowCandidate, DailyFlowCommand, DailyFlowCommandOutcome, DailyFlowTaskAdapter,
    DailyFlowTaskReadState, DailyFlowTaskReason, DailyFlowTaskRequest, DailyFlowTaskResponse,
    DAILY_FLOW_TASK_ADAPTER_SCHEMA_VERSION,
};
use personal_dashboard_lib::tasks::{
    FileTaskStore, TaskApplication, TaskChangeKind, TaskChangeSourceKind, TaskCompletionSourceKind,
    TaskCreateInput, TaskDeleteInput, TaskListArchiveInput, TaskState, TaskStateInput, TaskStore,
    TaskUpdateInput,
};
use personal_dashboard_lib::today::{TodayClock, TodayWorkspacePersistence};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};

struct TempVault(PathBuf);

impl TempVault {
    fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "personal-dashboard-task-adapter-{label}-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir_all(path.join(".obsidian")).unwrap();
        fs::create_dir_all(path.join("life/Journal/Daily")).unwrap();
        Self(path)
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TempVault {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[derive(Clone)]
struct SelectedVault(PathBuf);

impl TodayWorkspacePersistence for SelectedVault {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(self.0.clone()))
    }

    fn save_selected_vault(&self, _vault: &Path) -> Result<(), String> {
        Ok(())
    }
}

struct FixedClock;

impl TodayClock for FixedClock {
    fn current_date(&self) -> String {
        "2026-09-17".into()
    }

    fn current_time_label(&self) -> String {
        "14:10".into()
    }

    fn current_timestamp_label(&self) -> String {
        "2026-09-17T14:10-04:00".into()
    }
}

struct InvalidTimestampClock;

impl TodayClock for InvalidTimestampClock {
    fn current_date(&self) -> String {
        "2026-09-17".into()
    }

    fn current_time_label(&self) -> String {
        "14:10".into()
    }

    fn current_timestamp_label(&self) -> String {
        "not-a-timestamp".into()
    }
}

fn adapter(vault: &Path) -> DailyFlowTaskAdapter<SelectedVault, FixedClock, FileTaskStore> {
    DailyFlowTaskAdapter::new(TaskApplication::new(
        SelectedVault(vault.to_path_buf()),
        FixedClock,
        FileTaskStore,
    ))
}

fn task_path(vault: &Path) -> PathBuf {
    vault.join("life/.personal-dashboard/tasks/v1/tasks.json")
}

fn read_request(vault: &Path, lived_date: &str) -> DailyFlowTaskRequest {
    DailyFlowTaskRequest::Read {
        schema_version: DAILY_FLOW_TASK_ADAPTER_SCHEMA_VERSION,
        vault_path: vault.to_path_buf(),
        lived_date: lived_date.into(),
    }
}

fn apply_request(
    vault: &Path,
    target_binding: &str,
    expected_revision: Option<String>,
    candidates: Vec<DailyFlowCandidate>,
    commands: Vec<DailyFlowCommand>,
    lived_date: &str,
) -> DailyFlowTaskRequest {
    DailyFlowTaskRequest::Apply {
        schema_version: DAILY_FLOW_TASK_ADAPTER_SCHEMA_VERSION,
        vault_path: vault.to_path_buf(),
        lived_date: lived_date.into(),
        target_binding: target_binding.into(),
        expected_revision,
        candidates,
        commands,
    }
}

fn action(task_id: &str, source_reference: &str, name: &str) -> DailyFlowCandidate {
    DailyFlowCandidate::Action {
        task_id: task_id.into(),
        source_reference: source_reference.into(),
        name: name.into(),
        content: None,
        date: Some("2026-09-17".into()),
        time: None,
        list_id: None,
    }
}

fn apply_view(
    response: DailyFlowTaskResponse,
) -> personal_dashboard_lib::task_adapter::DailyFlowTaskApplyView {
    match response {
        DailyFlowTaskResponse::Apply(view) => view,
        DailyFlowTaskResponse::Read(_) => panic!("expected apply response"),
    }
}

fn read_view(
    response: DailyFlowTaskResponse,
) -> personal_dashboard_lib::task_adapter::DailyFlowTaskReadView {
    match response {
        DailyFlowTaskResponse::Read(view) => view,
        DailyFlowTaskResponse::Apply(_) => panic!("expected read response"),
    }
}

fn run_cli(request: &DailyFlowTaskRequest) -> serde_json::Value {
    let mut child = Command::new(env!("CARGO_BIN_EXE_personal-dashboard"))
        .arg("--daily-flow-tasks")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .take()
        .unwrap()
        .write_all(&serde_json::to_vec(request).unwrap())
        .unwrap();
    let output = child.wait_with_output().unwrap();
    assert!(
        output.status.success(),
        "CLI failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    serde_json::from_slice(&output.stdout).unwrap()
}

fn run_cli_failure(request: &DailyFlowTaskRequest) -> String {
    let mut child = Command::new(env!("CARGO_BIN_EXE_personal-dashboard"))
        .arg("--daily-flow-tasks")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    child
        .stdin
        .take()
        .unwrap()
        .write_all(&serde_json::to_vec(request).unwrap())
        .unwrap();
    let output = child.wait_with_output().unwrap();
    assert!(!output.status.success());
    String::from_utf8(output.stderr).unwrap()
}

fn create_manual_task(
    application: &TaskApplication<SelectedVault, FixedClock, FileTaskStore>,
    current: &personal_dashboard_lib::tasks::TasksView,
    task_id: &str,
    name: &str,
    date: Option<&str>,
) -> personal_dashboard_lib::tasks::TasksView {
    application
        .create(TaskCreateInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: current.revision.clone(),
            task_id: task_id.into(),
            name: name.into(),
            content: None,
            date: date.map(str::to_owned),
            time: None,
            list_id: None,
        })
        .unwrap()
}

#[test]
fn adapter_json_contract_is_tagged_and_rejects_unknown_fields() {
    let request: DailyFlowTaskRequest = serde_json::from_str(
        r#"{"operation":"read","schemaVersion":1,"vaultPath":"/tmp/vault","livedDate":"2026-09-17"}"#,
    )
    .unwrap();
    assert!(matches!(request, DailyFlowTaskRequest::Read { .. }));
    let error = serde_json::from_str::<DailyFlowTaskRequest>(
        r#"{"operation":"read","schemaVersion":1,"vaultPath":"/tmp/vault","livedDate":"2026-09-17","extra":true}"#,
    )
    .unwrap_err();
    assert!(error.to_string().contains("unknown field"));

    let vault = TempVault::new("json-output");
    let response = adapter(vault.path())
        .execute(read_request(vault.path(), "2026-09-17"))
        .unwrap();
    let json = serde_json::to_value(response).unwrap();
    assert_eq!(json["operation"], "read");
    assert_eq!(json["result"]["state"], "empty");
    assert_eq!(json["result"]["livedDate"], "2026-09-17");
}

#[test]
fn adapter_rejects_relative_and_empty_vault_paths_before_reading_or_writing() {
    let vault = TempVault::new("path-validation");
    let path = task_path(vault.path());
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let before = br#"{"schemaVersion":1,"lists":[],"tasks":[]}"#.to_vec();
    fs::write(&path, &before).unwrap();

    for (vault_path, expected_fragment) in [
        (PathBuf::from("relative-vault"), "绝对"),
        (PathBuf::new(), "Vault 路径"),
    ] {
        let error = adapter(vault.path())
            .execute(DailyFlowTaskRequest::Read {
                schema_version: DAILY_FLOW_TASK_ADAPTER_SCHEMA_VERSION,
                vault_path,
                lived_date: "2026-09-17".into(),
            })
            .unwrap_err();
        assert!(
            error.contains(expected_fragment),
            "unexpected error: {error}"
        );
        assert_eq!(fs::read(&path).unwrap(), before);
    }
}

#[test]
fn real_cli_entry_reads_and_writes_a_synthetic_vault_across_processes() {
    let vault = TempVault::new("cli-entry");
    let lived_date = "2000-01-01";
    let opened = run_cli(&read_request(vault.path(), lived_date));
    assert_eq!(opened["operation"], "read");
    assert_eq!(opened["result"]["state"], "empty");
    let target_binding = opened["result"]["targetBinding"].as_str().unwrap();
    assert!(opened["result"]["revision"].is_null());

    let applied = run_cli(&apply_request(
        vault.path(),
        target_binding,
        None,
        vec![DailyFlowCandidate::Action {
            task_id: "cli-task".into(),
            source_reference: "cli-source".into(),
            name: "跨进程保存".into(),
            content: None,
            date: Some(lived_date.into()),
            time: None,
            list_id: None,
        }],
        vec![],
        lived_date,
    ));
    assert_eq!(applied["operation"], "apply");
    assert_eq!(applied["result"]["changed"], true);

    let before_stale_write = fs::read(task_path(vault.path())).unwrap();
    let stale_error = run_cli_failure(&apply_request(
        vault.path(),
        target_binding,
        Some("stale-revision".into()),
        vec![DailyFlowCandidate::Action {
            task_id: "cli-stale-task".into(),
            source_reference: "cli-stale-source".into(),
            name: "不应覆盖".into(),
            content: None,
            date: Some(lived_date.into()),
            time: None,
            list_id: None,
        }],
        vec![],
        lived_date,
    ));
    assert!(stale_error.contains("外部发生变化"));
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        before_stale_write
    );

    let reread = run_cli(&read_request(vault.path(), lived_date));
    assert_eq!(reread["operation"], "read");
    assert_eq!(reread["result"]["tasks"][0]["id"], "cli-task");
}

#[test]
fn external_read_reports_lived_date_context_and_excludes_archived_pending_obligations() {
    let vault = TempVault::new("read-context");
    let application = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        FileTaskStore,
    );
    let opened = application.read().unwrap();
    let today = create_manual_task(
        &application,
        &opened,
        "today-task",
        "今天任务",
        Some("2026-09-17"),
    );
    let overdue = create_manual_task(
        &application,
        &today,
        "overdue-task",
        "逾期任务",
        Some("2026-09-16"),
    );
    let undated = create_manual_task(&application, &overdue, "undated-task", "未安排任务", None);
    let completed_source = create_manual_task(
        &application,
        &undated,
        "completed-context",
        "晚完成任务",
        Some("2026-09-10"),
    );
    let completed = application
        .set_state(TaskStateInput {
            target_binding: completed_source.target_binding.clone().unwrap(),
            expected_revision: completed_source.revision.clone().unwrap(),
            task_id: "completed-context".into(),
            change_id: "complete-context".into(),
            state: TaskState::Completed,
        })
        .unwrap();
    let list = application
        .create_list(personal_dashboard_lib::tasks::TaskListCreateInput {
            target_binding: completed.target_binding.clone().unwrap(),
            expected_revision: completed.revision.clone(),
            list_id: "archive-list".into(),
            name: "Archive list".into(),
        })
        .unwrap();
    let archived_task = application
        .create(TaskCreateInput {
            target_binding: list.target_binding.clone().unwrap(),
            expected_revision: list.revision.clone(),
            task_id: "archived-pending".into(),
            name: "归档待办".into(),
            content: None,
            date: Some("2026-09-17".into()),
            time: None,
            list_id: Some("archive-list".into()),
        })
        .unwrap();
    let archived = application
        .archive_list(TaskListArchiveInput {
            target_binding: archived_task.target_binding.clone().unwrap(),
            expected_revision: archived_task.revision.clone().unwrap(),
            list_id: "archive-list".into(),
        })
        .unwrap();

    let view = read_view(
        adapter(vault.path())
            .execute(read_request(vault.path(), "2026-09-17"))
            .unwrap(),
    );

    assert_eq!(view.state, DailyFlowTaskReadState::Ready);
    assert_eq!(view.lived_date, "2026-09-17");
    assert_eq!(view.current_date, "2026-09-17");
    assert_eq!(view.current_timestamp, "2026-09-17T14:10-04:00");
    assert_eq!(view.timezone_offset.as_deref(), Some("-04:00"));
    assert_eq!(view.target_binding, archived.target_binding);
    assert_eq!(view.revision, archived.revision);
    assert_eq!(view.excluded_archived_pending, 1);
    assert!(!view.tasks.iter().any(|task| task.id == "archived-pending"));

    let today_view = view
        .tasks
        .iter()
        .find(|task| task.id == "today-task")
        .unwrap();
    assert!(today_view
        .reasons
        .contains(&DailyFlowTaskReason::ScheduledForLivedDate));
    assert!(today_view.planning_eligible);
    let overdue_view = view
        .tasks
        .iter()
        .find(|task| task.id == "overdue-task")
        .unwrap();
    assert!(overdue_view.overdue);
    assert!(overdue_view.reasons.contains(&DailyFlowTaskReason::Overdue));
    let undated_view = view
        .tasks
        .iter()
        .find(|task| task.id == "undated-task")
        .unwrap();
    assert!(undated_view
        .reasons
        .contains(&DailyFlowTaskReason::UndatedCandidate));
    let completed_view = view
        .tasks
        .iter()
        .find(|task| task.id == "completed-context")
        .unwrap();
    assert_eq!(completed_view.state, TaskState::Completed);
    assert!(completed_view
        .reasons
        .contains(&DailyFlowTaskReason::CompletedOnLivedDate));
    assert!(!completed_view.planning_eligible);
}

#[test]
fn external_actions_are_idempotent_preserve_user_edits_and_never_revive_deleted_tasks() {
    let vault = TempVault::new("idempotency");
    let entry = adapter(vault.path());
    let opened = read_view(
        entry
            .execute(read_request(vault.path(), "2026-09-17"))
            .unwrap(),
    );
    let suggestion_only = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &opened.target_binding.clone().unwrap(),
                opened.revision.clone(),
                vec![DailyFlowCandidate::Suggestion {
                    source_reference: "suggestion-only".into(),
                    name: "只供考虑".into(),
                    content: None,
                    date: None,
                    time: None,
                }],
                vec![],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert!(!suggestion_only.changed);
    assert_eq!(suggestion_only.read.state, DailyFlowTaskReadState::Empty);
    assert!(!task_path(vault.path()).exists());
    let first = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &opened.target_binding.clone().unwrap(),
                opened.revision.clone(),
                vec![
                    action("flow-task", "morning-1", "原始安排"),
                    DailyFlowCandidate::Suggestion {
                        source_reference: "suggested-1".into(),
                        name: "只供考虑的建议".into(),
                        content: Some("建议不会直接变成任务".into()),
                        date: Some("2026-09-17".into()),
                        time: Some("15:00".into()),
                    },
                ],
                vec![],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert!(first.changed);
    assert_eq!(first.suggestions.len(), 1);
    assert_eq!(first.read.tasks.len(), 1);
    assert_eq!(
        first.read.tasks[0].source.reference.as_deref(),
        Some("morning-1")
    );

    let repeated = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &first.read.target_binding.clone().unwrap(),
                first.read.revision.clone(),
                vec![action("flow-task", "morning-1", "外部改名不能覆盖用户")],
                vec![],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert!(!repeated.changed);
    assert_eq!(repeated.read.tasks[0].name, "原始安排");
    assert_eq!(repeated.read.tasks[0].changes.len(), 0);

    let application = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        FileTaskStore,
    );
    let edited = application
        .update(TaskUpdateInput {
            target_binding: repeated.read.target_binding.clone().unwrap(),
            expected_revision: repeated.read.revision.clone().unwrap(),
            task_id: "flow-task".into(),
            change_id: "user-rename-flow-task".into(),
            name: "用户已经改名".into(),
            content: None,
            date: Some("2026-09-17".into()),
            time: Some("09:00".into()),
            list_id: None,
        })
        .unwrap();
    let preserved = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &edited.target_binding.clone().unwrap(),
                edited.revision.clone(),
                vec![action("flow-task", "morning-1", "旧安排")],
                vec![],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert!(!preserved.changed);
    assert_eq!(preserved.read.tasks[0].name, "用户已经改名");
    assert_eq!(preserved.read.tasks[0].date.as_deref(), Some("2026-09-17"));
    assert_eq!(preserved.read.tasks[0].changes.len(), 1);
    assert_eq!(
        preserved.read.tasks[0].changes[0].source,
        TaskChangeSourceKind::User
    );

    let deleted = application
        .delete(TaskDeleteInput {
            target_binding: preserved.read.target_binding.clone().unwrap(),
            expected_revision: preserved.read.revision.clone().unwrap(),
            task_id: "flow-task".into(),
            change_id: "user-delete-flow-task".into(),
        })
        .unwrap();
    let terminal_repeat = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &deleted.target_binding.clone().unwrap(),
                deleted.revision.clone(),
                vec![action("flow-task", "morning-1", "不应复活")],
                vec![],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert!(!terminal_repeat.changed);
    assert!(terminal_repeat.read.tasks[0].deleted_at.is_some());

    let reused_id = entry.execute(apply_request(
        vault.path(),
        &terminal_repeat.read.target_binding.clone().unwrap(),
        terminal_repeat.read.revision.clone(),
        vec![action("flow-task", "morning-2", "旧任务标识不能换来源")],
        vec![],
        "2026-09-17",
    ));
    assert!(reused_id.is_err());

    let fresh = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &terminal_repeat.read.target_binding.clone().unwrap(),
                terminal_repeat.read.revision.clone(),
                vec![action("flow-task-2", "morning-2", "再次明确安排")],
                vec![],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert!(fresh.changed);
    assert_eq!(fresh.read.tasks.len(), 2);
}

#[test]
fn explicit_daily_flow_commands_preserve_history_source_and_completion_precision() {
    let vault = TempVault::new("commands");
    let entry = adapter(vault.path());
    let opened = read_view(
        entry
            .execute(read_request(vault.path(), "2026-09-17"))
            .unwrap(),
    );
    let created = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &opened.target_binding.clone().unwrap(),
                opened.revision.clone(),
                vec![action("command-task", "command-1", "命令任务")],
                vec![],
                "2026-09-17",
            ))
            .unwrap(),
    );
    let rescheduled = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &created.read.target_binding.clone().unwrap(),
                created.read.revision.clone(),
                vec![],
                vec![DailyFlowCommand::Reschedule {
                    task_id: "command-task".into(),
                    operation_id: "flow-reschedule-1".into(),
                    date: Some("2026-09-17".into()),
                    time: Some("09:05".into()),
                }],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert!(rescheduled.changed);
    assert_eq!(
        rescheduled.commands[0].outcome,
        DailyFlowCommandOutcome::Applied
    );
    assert_eq!(
        rescheduled.read.tasks[0].date.as_deref(),
        Some("2026-09-17")
    );
    assert_eq!(rescheduled.read.tasks[0].time.as_deref(), Some("09:05"));
    assert_eq!(
        rescheduled.read.tasks[0].changes[0].source,
        TaskChangeSourceKind::DailyFlow
    );

    let rescheduled_repeat = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &rescheduled.read.target_binding.clone().unwrap(),
                rescheduled.read.revision.clone(),
                vec![],
                vec![DailyFlowCommand::Reschedule {
                    task_id: "command-task".into(),
                    operation_id: "flow-reschedule-1".into(),
                    date: Some("2026-09-17".into()),
                    time: Some("09:05".into()),
                }],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert!(!rescheduled_repeat.changed);
    assert_eq!(
        rescheduled_repeat.commands[0].outcome,
        DailyFlowCommandOutcome::Idempotent
    );
    assert_eq!(rescheduled_repeat.read.tasks[0].changes.len(), 1);

    let completed = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &rescheduled.read.target_binding.clone().unwrap(),
                rescheduled.read.revision.clone(),
                vec![],
                vec![DailyFlowCommand::Complete {
                    task_id: "command-task".into(),
                    operation_id: "flow-complete-1".into(),
                }],
                "2026-09-17",
            ))
            .unwrap(),
    );
    let completion = completed.read.tasks[0].completion.as_ref().unwrap();
    assert_eq!(completed.read.tasks[0].state, TaskState::Completed);
    assert_eq!(completion.source, TaskCompletionSourceKind::DailyFlow);
    assert_eq!(completion.completed_time.as_deref(), Some("14:10"));
    assert_eq!(completion.recorded_at, "2026-09-17T14:10-04:00");
    assert_eq!(
        completed.read.tasks[0].changes[1].source,
        TaskChangeSourceKind::DailyFlow
    );

    let completed_repeat = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &completed.read.target_binding.clone().unwrap(),
                completed.read.revision.clone(),
                vec![],
                vec![DailyFlowCommand::Complete {
                    task_id: "command-task".into(),
                    operation_id: "flow-complete-1".into(),
                }],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert!(!completed_repeat.changed);
    assert_eq!(
        completed_repeat.commands[0].outcome,
        DailyFlowCommandOutcome::Idempotent
    );
    assert_eq!(completed_repeat.read.tasks[0].changes.len(), 2);

    let corrected = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &completed.read.target_binding.clone().unwrap(),
                completed.read.revision.clone(),
                vec![],
                vec![DailyFlowCommand::CorrectCompletion {
                    task_id: "command-task".into(),
                    operation_id: "flow-correction-1".into(),
                    completed_on: "2026-09-16".into(),
                    completed_time: Some("23:59".into()),
                }],
                "2026-09-17",
            ))
            .unwrap(),
    );
    let corrected_completion = corrected.read.tasks[0].completion.as_ref().unwrap();
    assert_eq!(corrected_completion.completed_on, "2026-09-16");
    assert_eq!(
        corrected_completion.completed_time.as_deref(),
        Some("23:59")
    );
    assert_eq!(
        corrected_completion.source,
        TaskCompletionSourceKind::DateCorrection
    );
    assert_eq!(
        corrected.read.tasks[0].changes[2].source,
        TaskChangeSourceKind::DailyFlow
    );

    let corrected_repeat = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &corrected.read.target_binding.clone().unwrap(),
                corrected.read.revision.clone(),
                vec![],
                vec![DailyFlowCommand::CorrectCompletion {
                    task_id: "command-task".into(),
                    operation_id: "flow-correction-1".into(),
                    completed_on: "2026-09-16".into(),
                    completed_time: Some("23:59".into()),
                }],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert!(!corrected_repeat.changed);
    assert_eq!(
        corrected_repeat.commands[0].outcome,
        DailyFlowCommandOutcome::Idempotent
    );
    assert_eq!(corrected_repeat.read.tasks[0].changes.len(), 3);

    let late_context = read_view(
        entry
            .execute(read_request(vault.path(), "2026-09-16"))
            .unwrap(),
    );
    assert!(late_context.tasks[0]
        .reasons
        .contains(&DailyFlowTaskReason::CompletedOnLivedDate));

    let abandoned = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &corrected.read.target_binding.clone().unwrap(),
                corrected.read.revision.clone(),
                vec![action("abandoned-task", "command-2", "明确放弃")],
                vec![],
                "2026-09-17",
            ))
            .unwrap(),
    );
    let abandoned = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &abandoned.read.target_binding.clone().unwrap(),
                abandoned.read.revision.clone(),
                vec![],
                vec![DailyFlowCommand::Abandon {
                    task_id: "abandoned-task".into(),
                    operation_id: "flow-abandon-1".into(),
                }],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert_eq!(abandoned.read.tasks[1].state, TaskState::Abandoned);
    assert_eq!(
        abandoned.read.tasks[1].changes[0].source,
        TaskChangeSourceKind::DailyFlow
    );
}

#[test]
fn no_op_daily_flow_commands_persist_identity_before_user_edits() {
    let vault = TempVault::new("durable-no-op");
    let entry = adapter(vault.path());
    let opened = read_view(
        entry
            .execute(read_request(vault.path(), "2026-09-17"))
            .unwrap(),
    );
    let created = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &opened.target_binding.clone().unwrap(),
                opened.revision.clone(),
                vec![action("noop-task", "noop-source", "不变任务")],
                vec![],
                "2026-09-17",
            ))
            .unwrap(),
    );
    let no_op_reschedule = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &created.read.target_binding.clone().unwrap(),
                created.read.revision.clone(),
                vec![],
                vec![DailyFlowCommand::Reschedule {
                    task_id: "noop-task".into(),
                    operation_id: "noop-reschedule-1".into(),
                    date: Some("2026-09-17".into()),
                    time: None,
                }],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert!(no_op_reschedule.changed);
    assert_eq!(
        no_op_reschedule.commands[0].outcome,
        DailyFlowCommandOutcome::Applied
    );
    assert_eq!(
        no_op_reschedule.read.tasks[0].changes[0].kind,
        TaskChangeKind::Noop
    );

    let application = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        FileTaskStore,
    );
    let edited = application
        .update(TaskUpdateInput {
            target_binding: no_op_reschedule.read.target_binding.clone().unwrap(),
            expected_revision: no_op_reschedule.read.revision.clone().unwrap(),
            task_id: "noop-task".into(),
            change_id: "noop-user-edit".into(),
            name: "用户改过的任务".into(),
            content: None,
            date: Some("2026-09-17".into()),
            time: None,
            list_id: None,
        })
        .unwrap();
    let repeated_old = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &edited.target_binding.clone().unwrap(),
                edited.revision.clone(),
                vec![],
                vec![DailyFlowCommand::Reschedule {
                    task_id: "noop-task".into(),
                    operation_id: "noop-reschedule-1".into(),
                    date: Some("2026-09-17".into()),
                    time: None,
                }],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert!(!repeated_old.changed);
    assert_eq!(
        repeated_old.commands[0].outcome,
        DailyFlowCommandOutcome::Idempotent
    );
    assert_eq!(repeated_old.read.tasks[0].name, "用户改过的任务");
    assert_eq!(repeated_old.read.tasks[0].changes.len(), 2);

    let completed = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &repeated_old.read.target_binding.clone().unwrap(),
                repeated_old.read.revision.clone(),
                vec![],
                vec![DailyFlowCommand::Complete {
                    task_id: "noop-task".into(),
                    operation_id: "noop-complete-1".into(),
                }],
                "2026-09-17",
            ))
            .unwrap(),
    );
    let no_op_complete = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &completed.read.target_binding.clone().unwrap(),
                completed.read.revision.clone(),
                vec![],
                vec![DailyFlowCommand::Complete {
                    task_id: "noop-task".into(),
                    operation_id: "noop-complete-2".into(),
                }],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert_eq!(
        no_op_complete.read.tasks[0].changes[3].kind,
        TaskChangeKind::Noop
    );

    let no_op_correction = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &no_op_complete.read.target_binding.clone().unwrap(),
                no_op_complete.read.revision.clone(),
                vec![],
                vec![DailyFlowCommand::CorrectCompletion {
                    task_id: "noop-task".into(),
                    operation_id: "noop-correction-1".into(),
                    completed_on: "2026-09-17".into(),
                    completed_time: Some("14:10".into()),
                }],
                "2026-09-17",
            ))
            .unwrap(),
    );
    assert_eq!(
        no_op_correction.read.tasks[0].changes[4].kind,
        TaskChangeKind::Noop
    );
}

#[test]
fn adapter_write_failure_does_not_leave_a_partial_document() {
    let vault = TempVault::new("failure");
    let entry = adapter(vault.path());
    let opened = read_view(
        entry
            .execute(read_request(vault.path(), "2026-09-17"))
            .unwrap(),
    );
    let created = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &opened.target_binding.clone().unwrap(),
                opened.revision.clone(),
                vec![action("failure-task", "failure-1", "保存前任务")],
                vec![],
                "2026-09-17",
            ))
            .unwrap(),
    );
    let before = fs::read(task_path(vault.path())).unwrap();
    let failing = DailyFlowTaskAdapter::new(TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        FailingTaskStore,
    ));
    let error = failing
        .execute(apply_request(
            vault.path(),
            &created.read.target_binding.clone().unwrap(),
            created.read.revision.clone(),
            vec![action("failure-task-2", "failure-2", "不能部分写入")],
            vec![],
            "2026-09-17",
        ))
        .unwrap_err();
    assert!(error.contains("injected task save failure"));
    assert_eq!(fs::read(task_path(vault.path())).unwrap(), before);
}

#[test]
fn adapter_distinguishes_damaged_and_failed_reads() {
    let damaged_vault = TempVault::new("damaged");
    let damaged_path = task_path(damaged_vault.path());
    fs::create_dir_all(damaged_path.parent().unwrap()).unwrap();
    fs::write(&damaged_path, b"{not-json").unwrap();
    let damaged = read_view(
        adapter(damaged_vault.path())
            .execute(read_request(damaged_vault.path(), "2026-09-17"))
            .unwrap(),
    );
    assert_eq!(damaged.state, DailyFlowTaskReadState::Damaged);
    assert!(damaged.revision.is_some());

    let failed_vault = TempVault::new("unavailable");
    let failed = read_view(
        DailyFlowTaskAdapter::new(TaskApplication::new(
            SelectedVault(failed_vault.path().to_path_buf()),
            FixedClock,
            UnavailableTaskStore,
        ))
        .execute(read_request(failed_vault.path(), "2026-09-17"))
        .unwrap(),
    );
    assert_eq!(failed.state, DailyFlowTaskReadState::Failed);
    assert!(failed.revision.is_none());
}

#[test]
fn adapter_returns_failed_state_when_current_time_context_is_unavailable() {
    let vault = TempVault::new("invalid-clock");
    let failed = read_view(
        DailyFlowTaskAdapter::new(TaskApplication::new(
            SelectedVault(vault.path().to_path_buf()),
            InvalidTimestampClock,
            FileTaskStore,
        ))
        .execute(read_request(vault.path(), "2026-09-17"))
        .unwrap(),
    );
    assert_eq!(failed.state, DailyFlowTaskReadState::Failed);
    assert!(failed.current_timestamp.is_empty());
    assert!(failed.message.contains("时间上下文"));
}

#[test]
fn adapter_rejects_stale_and_concurrent_writes_without_overwriting_external_bytes() {
    let vault = TempVault::new("stale-and-race");
    let entry = adapter(vault.path());
    let opened = read_view(
        entry
            .execute(read_request(vault.path(), "2026-09-17"))
            .unwrap(),
    );
    let created = apply_view(
        entry
            .execute(apply_request(
                vault.path(),
                &opened.target_binding.clone().unwrap(),
                opened.revision.clone(),
                vec![action("race-task", "race-1", "初始任务")],
                vec![],
                "2026-09-17",
            ))
            .unwrap(),
    );
    let application = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        FileTaskStore,
    );
    let user_edit = application
        .update(TaskUpdateInput {
            target_binding: created.read.target_binding.clone().unwrap(),
            expected_revision: created.read.revision.clone().unwrap(),
            task_id: "race-task".into(),
            change_id: "user-race-edit".into(),
            name: "用户版本".into(),
            content: None,
            date: Some("2026-09-17".into()),
            time: None,
            list_id: None,
        })
        .unwrap();
    let stale = entry.execute(apply_request(
        vault.path(),
        &created.read.target_binding.clone().unwrap(),
        created.read.revision.clone(),
        vec![action("new-stale-task", "race-2", "陈旧写入")],
        vec![],
        "2026-09-17",
    ));
    assert!(stale.unwrap_err().contains("外部发生变化"));
    assert_eq!(
        read_view(
            entry
                .execute(read_request(vault.path(), "2026-09-17"))
                .unwrap()
        )
        .tasks[0]
            .name,
        "用户版本"
    );

    let before_wrong_target = fs::read(task_path(vault.path())).unwrap();
    let wrong_target = entry.execute(apply_request(
        vault.path(),
        "wrong-target-binding",
        user_edit.revision.clone(),
        vec![action("wrong-target-task", "wrong-target-1", "错误目标")],
        vec![],
        "2026-09-17",
    ));
    assert!(wrong_target.is_err());
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        before_wrong_target
    );

    let external_document = br#"{"schemaVersion":1,"lists":[{"id":"inbox","name":"Inbox","system":true,"archived":false}],"tasks":[]}
"#
        .to_vec();
    let racing = DailyFlowTaskAdapter::new(TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        RacingTaskStore {
            external_document: external_document.clone(),
        },
    ));
    let current = read_view(
        racing
            .execute(read_request(vault.path(), "2026-09-17"))
            .unwrap(),
    );
    let race = racing.execute(apply_request(
        vault.path(),
        &current.target_binding.clone().unwrap(),
        current.revision.clone(),
        vec![action("race-3", "race-3", "并发写入")],
        vec![],
        "2026-09-17",
    ));
    assert!(race.unwrap_err().contains("外部发生变化"));
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        external_document
    );
    assert_eq!(user_edit.tasks[0].name, "用户版本");
}

#[derive(Clone, Copy)]
struct UnavailableTaskStore;

impl TaskStore for UnavailableTaskStore {
    fn load(&self, _path: &Path) -> Result<Option<Vec<u8>>, String> {
        Err("injected task read failure".into())
    }

    fn save_if_unchanged(
        &self,
        _path: &Path,
        _expected: &[u8],
        _updated: &[u8],
    ) -> Result<(), String> {
        Err("injected task save failure".into())
    }

    fn create_new(&self, _path: &Path, _document: &[u8]) -> Result<(), String> {
        Err("injected task create failure".into())
    }
}

#[derive(Clone)]
struct RacingTaskStore {
    external_document: Vec<u8>,
}

impl TaskStore for RacingTaskStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        FileTaskStore.load(path)
    }

    fn save_if_unchanged(
        &self,
        path: &Path,
        expected: &[u8],
        updated: &[u8],
    ) -> Result<(), String> {
        fs::write(path, &self.external_document).unwrap();
        FileTaskStore.save_if_unchanged(path, expected, updated)
    }

    fn create_new(&self, path: &Path, document: &[u8]) -> Result<(), String> {
        FileTaskStore.create_new(path, document)
    }
}

#[derive(Clone, Copy)]
struct FailingTaskStore;

impl TaskStore for FailingTaskStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        match fs::read(path) {
            Ok(document) => Ok(Some(document)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(error.to_string()),
        }
    }

    fn save_if_unchanged(
        &self,
        _path: &Path,
        _expected: &[u8],
        _updated: &[u8],
    ) -> Result<(), String> {
        Err("injected task save failure".into())
    }

    fn create_new(&self, _path: &Path, _document: &[u8]) -> Result<(), String> {
        Err("injected task create failure".into())
    }
}
