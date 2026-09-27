use personal_dashboard_lib::collaboration::{
    AppServerTransport, CollaborationApplication, CollaborationClock, CollaborationContextSource,
    CollaborationContextView, CollaborationState, CollaborationStore,
    CollaborationTaskListReferenceView, CollaborationTaskOperation, CollaborationTaskService,
    ContextPaneView, FileCollaborationStore, ModelOptionView, RuntimeConnectionView,
    RuntimeDynamicToolCall, RuntimeDynamicToolHandler, RuntimeDynamicToolResult,
    RuntimeRunReconciliation, RuntimeTurnRequest, RuntimeTurnResult,
    TaskApplicationCollaborationAdapter, TodayApplicationCollaborationPlanAdapter,
};
use personal_dashboard_lib::tasks::{FileTaskStore, TaskApplication, TaskDataState, TaskState};
use personal_dashboard_lib::today::{
    DatedNoteCorrectionInput, DatedNoteInput, HabitLocalCompletionState, ShortRecordCategory,
    TodayApplication, TodayClock, TodayWorkspaceExchange, TodayWorkspacePersistence,
};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

static DIRECTORY_SEQUENCE: AtomicU64 = AtomicU64::new(1);

struct IsolatedDirectory(PathBuf);

impl IsolatedDirectory {
    fn new() -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock is after the epoch")
            .as_nanos();
        let sequence = DIRECTORY_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "personal-dashboard-collaboration-tasks-{}-{nonce}-{sequence}",
            std::process::id(),
        ));
        fs::create_dir_all(&path).expect("temporary directory is created");
        Self(path)
    }

    fn path(&self) -> &Path {
        &self.0
    }

    fn vault(&self, name: &str) -> PathBuf {
        let path = self.path().join(name);
        fs::create_dir_all(path.join(".obsidian")).expect("synthetic Vault is created");
        fs::create_dir_all(path.join("life/Journal/Daily"))
            .expect("synthetic Daily Record folder is created");
        path
    }
}

impl Drop for IsolatedDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[derive(Clone)]
struct MutableVault(Arc<Mutex<PathBuf>>);

impl MutableVault {
    fn new(path: &Path) -> Self {
        Self(Arc::new(Mutex::new(path.to_path_buf())))
    }

    fn select(&self, path: &Path) {
        *self.0.lock().expect("selection lock") = path.to_path_buf();
    }
}

impl TodayWorkspacePersistence for MutableVault {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(
            self.0
                .lock()
                .map_err(|_| "selection lock poisoned")?
                .clone(),
        ))
    }

    fn save_selected_vault(&self, vault: &Path) -> Result<(), String> {
        self.select(vault);
        Ok(())
    }
}

struct FixedClock;

impl CollaborationClock for FixedClock {
    fn current_timestamp(&self) -> String {
        "2026-09-27T09:15:00-04:00".into()
    }

    fn current_date(&self) -> String {
        "2026-09-27".into()
    }
}

impl TodayClock for FixedClock {
    fn current_date(&self) -> String {
        "2026-09-27".into()
    }

    fn current_time_label(&self) -> String {
        "09:15".into()
    }

    fn current_timestamp_label(&self) -> String {
        "2026-09-27T09:15-04:00".into()
    }
}

struct NoVaultPicker;

impl TodayWorkspaceExchange for NoVaultPicker {
    fn select_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(None)
    }
}

#[derive(Clone)]
struct MutableContext {
    selected_vault: Arc<Mutex<String>>,
}

impl MutableContext {
    fn new(key: &str) -> Self {
        Self {
            selected_vault: Arc::new(Mutex::new(key.into())),
        }
    }

    fn select(&self, key: &str) {
        *self.selected_vault.lock().expect("context lock") = key.into();
    }
}

impl CollaborationContextSource for MutableContext {
    fn current_vault_key(&self) -> Result<Option<String>, String> {
        Ok(Some(
            self.selected_vault
                .lock()
                .map_err(|_| "context lock poisoned")?
                .clone(),
        ))
    }

    fn read_context(
        &self,
        expected_vault_key: Option<&str>,
        date: &str,
    ) -> Result<CollaborationContextView, String> {
        let selected = self.current_vault_key()?.unwrap();
        if expected_vault_key != Some(selected.as_str()) {
            return Err("selected Vault changed while reading context".into());
        }
        Ok(CollaborationContextView {
            date: date.into(),
            vault_name: Some("Synthetic Vault".into()),
            daily_record: ContextPaneView {
                state: "ready".into(),
                message: "Synthetic Daily Record".into(),
                items: vec!["Synthetic baseline".into()],
            },
            tasks: ContextPaneView {
                state: "ready".into(),
                message: "Synthetic Tasks".into(),
                items: vec!["Tasks are shared across Tasks, Today, and Calendar".into()],
            },
            task_revision: Some("synthetic-revision-is-not-used-for-writes".into()),
            task_target_binding: Some("synthetic-binding-is-not-used-for-writes".into()),
            task_records: Vec::new(),
            task_lists: vec![CollaborationTaskListReferenceView {
                id: "inbox".into(),
                name: "Inbox".into(),
                is_system: true,
                archived: false,
            }],
            habits: ContextPaneView {
                state: "ready".into(),
                message: "Synthetic habits".into(),
                items: Vec::new(),
            },
        })
    }
}

#[derive(Clone)]
struct DynamicRuntime {
    registered_tools: Arc<Mutex<Vec<Value>>>,
    results: Arc<Mutex<Vec<RuntimeDynamicToolResult>>>,
}

impl AppServerTransport for DynamicRuntime {
    fn inspect(&mut self) -> Result<RuntimeConnectionView, String> {
        Ok(RuntimeConnectionView {
            executable_path: Some("/synthetic/codex".into()),
            version: Some("codex synthetic".into()),
            experimental: true,
            read_only_text_turns_available: true,
            text_turn_unavailable_reason: None,
            authenticated: true,
            auth_mode: Some("chatgpt".into()),
            account_email: Some("fixture@example.invalid".into()),
            plan_type: Some("test".into()),
            models: vec![ModelOptionView {
                id: "synthetic-model".into(),
                display_name: "Synthetic model".into(),
                default_reasoning_effort: None,
                reasoning_efforts: Vec::new(),
                is_default: true,
            }],
            selected_model: Some("synthetic-model".into()),
            selected_reasoning_effort: None,
            error: None,
        })
    }

    fn start_chatgpt_login(&mut self) -> Result<(), String> {
        Err("login is not part of this synthetic test".into())
    }

    fn start_thread(
        &mut self,
        _model: Option<&str>,
        _instructions: &str,
    ) -> Result<String, String> {
        Ok("synthetic-thread".into())
    }

    fn start_thread_with_dynamic_tools(
        &mut self,
        _model: Option<&str>,
        _instructions: &str,
        dynamic_tools: Vec<Value>,
    ) -> Result<String, String> {
        *self
            .registered_tools
            .lock()
            .map_err(|_| "tool lock poisoned")? = dynamic_tools;
        Ok("synthetic-thread".into())
    }

    fn resume_thread(&mut self, thread_id: &str) -> Result<(), String> {
        if thread_id == "synthetic-thread" {
            Ok(())
        } else {
            Err("unexpected synthetic thread id".into())
        }
    }

    fn send_turn(&mut self, request: RuntimeTurnRequest) -> Result<RuntimeTurnResult, String> {
        Ok(RuntimeTurnResult {
            text: format!("Synthetic response to {}", request.user_text),
            runtime_turn_id: Some(format!("turn-{}", request.execution_id)),
            stopped: false,
        })
    }

    fn send_turn_with_dynamic_tools(
        &mut self,
        request: RuntimeTurnRequest,
        _cancel_requested: Arc<AtomicBool>,
        tool_handler: Option<RuntimeDynamicToolHandler>,
    ) -> Result<RuntimeTurnResult, String> {
        let handler = tool_handler.ok_or_else(|| "expected a registered task tool".to_string())?;
        let (call_id, tool, arguments) = if request.user_text == "create task" {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "createTask",
                    "name": "Synthetic report",
                    "content": "Prepared by a test fixture",
                    "date": "2026-09-20",
                    "time": "09:30",
                    "listId": null
                }),
            )
        } else if request.user_text == "create list" {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({ "operation": "createList", "name": "Synthetic list" }),
            )
        } else if request.user_text == "save daily plan" {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "saveDailyPlan",
                    "transition": "initialPlan",
                    "arrangement": [
                        {"period": "morning", "title": "Prepare the report", "detail": "Outline only"},
                        {"period": "afternoon", "title": "Review the draft", "detail": null}
                    ],
                    "evidence": [
                        {"label": "Tasks", "items": ["Synthetic report task"]},
                        {"label": "Habits", "items": ["One confirmed exercise habit"]}
                    ],
                    "calibrationNote": null,
                    "baselineCorrectionReason": null,
                    "event": null,
                    "originalIntent": null,
                    "changeReason": null,
                    "revisedDirection": null
                }),
            )
        } else if request.user_text == "morning calibration" {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "saveDailyPlan",
                    "transition": "morningCalibration",
                    "arrangement": [
                        {"period": "morning", "title": "Handle the urgent review", "detail": "The appointment moved"},
                        {"period": "afternoon", "title": "Review the report", "detail": null}
                    ],
                    "evidence": [
                        {"label": "Tasks", "items": ["Synthetic report task"]},
                        {"label": "User update", "items": ["Appointment starts later"]}
                    ],
                    "calibrationNote": "The appointment moved to the afternoon",
                    "baselineCorrectionReason": null,
                    "event": null,
                    "originalIntent": null,
                    "changeReason": null,
                    "revisedDirection": null
                }),
            )
        } else if request.user_text == "daytime replan" {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "saveDailyPlan",
                    "transition": "daytimeReplan",
                    "arrangement": [
                        {"period": "later", "title": "Move the review to tomorrow", "detail": "Protect rest time"}
                    ],
                    "evidence": [
                        {"label": "User report", "items": ["Energy is lower than expected"]}
                    ],
                    "calibrationNote": null,
                    "baselineCorrectionReason": null,
                    "event": null,
                    "originalIntent": "Review the report today",
                    "changeReason": "Energy is lower than expected",
                    "revisedDirection": "Move the review to tomorrow"
                }),
            )
        } else if request.user_text == "daytime event" {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "saveDailyPlan",
                    "transition": "daytimeEvent",
                    "arrangement": [],
                    "evidence": [],
                    "calibrationNote": null,
                    "baselineCorrectionReason": null,
                    "event": "I completed a short walk",
                    "originalIntent": null,
                    "changeReason": null,
                    "revisedDirection": null
                }),
            )
        } else if request.user_text == "evening addition" {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "saveEveningReview",
                    "mode": "addition",
                    "content": "I finished the synthetic evening review."
                }),
            )
        } else if request.user_text == "evening correction" {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "saveEveningReview",
                    "mode": "correction",
                    "content": "Correction: it happened during the afternoon."
                }),
            )
        } else if request.user_text == "correct exercise record" {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "correctShortRecord",
                    "recordId": "exercise-short-1",
                    "content": "Walked outdoors for 25 minutes."
                }),
            )
        } else if request.user_text == "correct ordinary record" {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "correctShortRecord",
                    "recordId": "ordinary-short-1",
                    "content": "The ordinary note was corrected."
                }),
            )
        } else if request.user_text == "complete habit" {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "setLocalHabitCompletion",
                    "habitKey": "exercise",
                    "completed": true
                }),
            )
        } else if request.user_text == "withdraw habit" {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "setLocalHabitCompletion",
                    "habitKey": "exercise",
                    "completed": false
                }),
            )
        } else if request.user_text == "unknown tool" {
            (
                "unknown-tool-call",
                "dashboard_unregistered_tool",
                json!({ "operation": "createTask", "name": "Should not save" }),
            )
        } else {
            return Err(format!(
                "unexpected synthetic prompt: {}",
                request.user_text
            ));
        };
        let call = RuntimeDynamicToolCall {
            thread_id: request.thread_id.clone(),
            turn_id: format!("turn-{}", request.execution_id),
            call_id: call_id.into(),
            tool: tool.into(),
            arguments,
        };
        let first_delivery = handler(call.clone());
        let duplicate_delivery = handler(call);
        if first_delivery != duplicate_delivery {
            return Err("duplicate tool delivery did not return the same proposal".into());
        }
        self.results
            .lock()
            .map_err(|_| "result lock poisoned")?
            .push(first_delivery);
        Ok(RuntimeTurnResult {
            text: format!("Synthetic response to {}", request.user_text),
            runtime_turn_id: Some(format!("turn-{}", request.execution_id)),
            stopped: false,
        })
    }

    fn reconcile_turn(
        &mut self,
        _thread_id: &str,
        _execution_id: &str,
    ) -> Result<RuntimeRunReconciliation, String> {
        Ok(RuntimeRunReconciliation::NotFound)
    }
}

struct FailNextSaveStore {
    inner: FileCollaborationStore,
    fail_next_save: Arc<AtomicBool>,
}

impl CollaborationStore for FailNextSaveStore {
    fn load(&self) -> Result<CollaborationState, String> {
        self.inner.load()
    }

    fn save(&self, state: &CollaborationState) -> Result<(), String> {
        if self.fail_next_save.swap(false, Ordering::SeqCst) {
            return Err("synthetic collaboration-history disk failure".into());
        }
        self.inner.save(state)
    }
}

fn new_application(
    directory: &IsolatedDirectory,
    vault: &MutableVault,
    context: MutableContext,
    fail_next_save: Arc<AtomicBool>,
) -> (
    CollaborationApplication,
    Arc<Mutex<Vec<Value>>>,
    Arc<Mutex<Vec<RuntimeDynamicToolResult>>>,
) {
    let registered_tools = Arc::new(Mutex::new(Vec::new()));
    let results = Arc::new(Mutex::new(Vec::new()));
    let task_service = Arc::new(TaskApplicationCollaborationAdapter::new(
        TaskApplication::new(vault.clone(), FixedClock, FileTaskStore),
    ));
    let daily_plan_service = Arc::new(TodayApplicationCollaborationPlanAdapter::new(
        TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock),
    ));
    let application = CollaborationApplication::with_adapters(
        Arc::new(FailNextSaveStore {
            inner: FileCollaborationStore::new(
                directory.path().join("collaboration/collaboration.json"),
            ),
            fail_next_save,
        }),
        Box::new(DynamicRuntime {
            registered_tools: Arc::clone(&registered_tools),
            results: Arc::clone(&results),
        }),
        Arc::new(context),
        Arc::new(FixedClock),
        directory.path().join("runtime"),
        "Only use supplied synthetic Dashboard context.".into(),
    )
    .with_task_service(task_service)
    .with_daily_plan_service(daily_plan_service);
    (application, registered_tools, results)
}

fn prepare_daily_review_vault(vault_path: &Path, with_exercise_record: bool) -> PathBuf {
    let daily_path = vault_path.join("life/Journal/Daily/2026/2026-09/2026-09-27.md");
    fs::create_dir_all(daily_path.parent().unwrap()).unwrap();
    fs::write(
        &daily_path,
        "---\ntype: daily-record\ndate: 2026-09-27\n---\n# 2026-09-27\n\n## 早间基准\n\n### 初始安排\n\n- **上午：** Synthetic morning baseline.\n\n### 初始计划依据\n\n- Morning evidence, preserved.\n\n## 今天的大致安排\n\n- **下午：** Synthetic current arrangement.\n\n## 计划依据\n\n- Current evidence, preserved.\n\n## 白天更新\n\n### 11:00 — 更新记录，不作为事实时间\n\n- 观察事实：完成合成工作块。\n\n## 晚间复盘\n\n### 今天发生了什么\n\n- 已有原始复盘。\n\n## 私人扩展\n\n用户自有章节原文。\n",
    )
    .unwrap();
    fs::create_dir_all(vault_path.join(".personal-dashboard/derived")).unwrap();
    fs::write(
        vault_path.join(".personal-dashboard/derived/habits-v1.json"),
        include_bytes!("fixtures/habits-v1-complete.json"),
    )
    .unwrap();
    if with_exercise_record {
        let workspace = MutableVault::new(vault_path);
        let today = TodayApplication::new(workspace, NoVaultPicker, FixedClock);
        let opened = today.read_date("2026-09-27").unwrap();
        today
            .add_dated_note(DatedNoteInput {
                date: "2026-09-27".into(),
                target_binding: opened.target_binding.unwrap(),
                expected_revision: opened.revision,
                entry_id: "exercise-short-1".into(),
                category: ShortRecordCategory::Exercise,
                content: "Walked outdoors for 20 minutes.".into(),
            })
            .unwrap();
    }
    daily_path
}

fn submit_for_proposal(
    application: &CollaborationApplication,
    session_id: &str,
    prompt: &str,
) -> personal_dashboard_lib::collaboration::CollaborationTaskOperationView {
    application
        .submit_message("vault-a", session_id, "2026-09-27", prompt)
        .unwrap();
    wait_for_finish(application, session_id, "vault-a");
    application
        .session("vault-a", session_id)
        .unwrap()
        .task_operations
        .into_iter()
        .rev()
        .find(|operation| operation.status == "awaitingApproval")
        .expect("synthetic runtime proposes the requested action")
}

fn wait_for_finish(application: &CollaborationApplication, session_id: &str, vault: &str) {
    for _ in 0..300 {
        let session = application
            .session(vault, session_id)
            .expect("session exists");
        if matches!(session.run_state.as_str(), "completed" | "error") {
            assert_eq!(session.run_state, "completed", "{}", session.progress);
            return;
        }
        thread::sleep(Duration::from_millis(10));
    }
    panic!("synthetic dynamic-tool run did not finish");
}

fn submit_and_approve_plan_step(
    application: &CollaborationApplication,
    session_id: &str,
    prompt: &str,
) -> personal_dashboard_lib::collaboration::CollaborationTaskOperationView {
    application
        .submit_message("vault-a", session_id, "2026-09-27", prompt)
        .unwrap();
    wait_for_finish(application, session_id, "vault-a");
    let view = application.session("vault-a", session_id).unwrap();
    let proposal = view
        .task_operations
        .iter()
        .rev()
        .find(|operation| operation.status == "awaitingApproval")
        .expect("runtime produced a Daily Record proposal")
        .clone();
    assert!(matches!(
        &proposal.operation,
        CollaborationTaskOperation::SaveDailyPlan { .. }
    ));
    application
        .approve_task_operation_for_selected_vault(session_id, &proposal.id)
        .unwrap()
        .task_operations
        .into_iter()
        .find(|operation| operation.id == proposal.id)
        .expect("approved Daily Record proposal remains visible")
}

fn canonical_section<'a>(document: &'a str, heading: &str, next_heading: &str) -> &'a str {
    let start = document
        .find(&format!("## {heading}"))
        .expect("Daily Record section exists");
    let end = document[start..]
        .find(&format!("## {next_heading}"))
        .map(|offset| start + offset)
        .expect("next Daily Record section exists");
    &document[start..end]
}

#[test]
fn dynamic_tool_registration_duplicate_delivery_and_approval_share_canonical_task_identity() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault-a");
    let second_vault = directory.vault("vault-b");
    let vault = MutableVault::new(&vault_path);
    let context = MutableContext::new("vault-a");
    let (application, registered_tools, results) = new_application(
        &directory,
        &vault,
        context.clone(),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message("vault-a", &session.id, "2026-09-27", "create task")
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");

    let registered = registered_tools.lock().unwrap();
    assert_eq!(registered.len(), 1);
    assert_eq!(registered[0]["name"], "dashboard_task_operation");
    assert!(
        registered[0]["inputSchema"]["oneOf"]
            .as_array()
            .unwrap()
            .len()
            >= 12
    );
    drop(registered);
    assert_eq!(results.lock().unwrap().len(), 1);
    assert!(
        results.lock().unwrap()[0].success,
        "{:?}",
        results.lock().unwrap()[0]
    );

    let proposed = application.session("vault-a", &session.id).unwrap();
    assert_eq!(proposed.task_operations.len(), 1);
    let operation = &proposed.task_operations[0];
    assert_eq!(operation.status, "awaitingApproval");
    assert_eq!(operation.target_date, "2026-09-27");
    let operation_id = operation.id.clone();
    let stable_task_id = operation.task_id.clone().unwrap();
    let adapter = TaskApplicationCollaborationAdapter::new(TaskApplication::new(
        vault.clone(),
        FixedClock,
        FileTaskStore,
    ));
    assert!(
        adapter.read().unwrap().tasks.is_empty(),
        "tool delivery only proposes"
    );

    vault.select(&second_vault);
    context.select("vault-b");
    assert!(application
        .approve_task_operation_for_selected_vault(&session.id, &operation_id)
        .unwrap_err()
        .contains("not available in the selected Vault"));
    assert!(adapter.read().unwrap().tasks.is_empty());
    vault.select(&vault_path);
    context.select("vault-a");

    let approved = application
        .approve_task_operation_for_selected_vault(&session.id, &operation_id)
        .unwrap();
    assert_eq!(approved.task_operations[0].status, "applied");
    let repeated_approval = application
        .approve_task_operation_for_selected_vault(&session.id, &operation_id)
        .unwrap();
    assert_eq!(repeated_approval.task_operations[0].status, "applied");
    let saved = adapter.read().unwrap();
    assert_eq!(saved.tasks.len(), 1);
    assert_eq!(saved.tasks[0].id, stable_task_id);
    assert_eq!(saved.tasks[0].date.as_deref(), Some("2026-09-20"));
    assert_eq!(saved.tasks[0].time.as_deref(), Some("09:30"));
    assert_eq!(saved.tasks[0].state, TaskState::Pending);
}

#[test]
fn daily_plan_uses_the_shared_review_tool_and_persists_only_after_approval() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let context = MutableContext::new("vault-a");
    let task_path = vault_path.join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH);
    let (application, registered_tools, results) = new_application(
        &directory,
        &vault,
        context,
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message("vault-a", &session.id, "2026-09-27", "save daily plan")
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");

    let registered = registered_tools.lock().unwrap();
    assert_eq!(registered.len(), 1, "the existing single tool is reused");
    assert_eq!(registered[0]["name"], "dashboard_task_operation");
    assert!(registered[0]["inputSchema"]["oneOf"]
        .as_array()
        .unwrap()
        .iter()
        .any(|variant| variant["properties"]["operation"]["const"] == "saveDailyPlan"));
    drop(registered);
    let delivery_results = results.lock().unwrap();
    assert_eq!(
        delivery_results.len(),
        1,
        "duplicate delivery is deduplicated"
    );
    assert!(delivery_results[0].success, "{:?}", delivery_results[0]);
    drop(delivery_results);

    let proposed = application.session("vault-a", &session.id).unwrap();
    assert_eq!(proposed.task_operations.len(), 1);
    let proposal = proposed.task_operations[0].clone();
    assert_eq!(proposal.status, "awaitingApproval");
    assert_eq!(proposal.target_date, "2026-09-27");
    assert!(matches!(
        &proposal.baseline,
        personal_dashboard_lib::collaboration::CollaborationTaskOperationBaseline::DailyRecord { .. }
    ));
    assert!(matches!(
        &proposal.operation,
        CollaborationTaskOperation::SaveDailyPlan { .. }
    ));
    assert!(
        !task_path.exists(),
        "proposal must not create or mutate Tasks"
    );

    let approved = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(approved.task_operations[0].status, "applied");
    let daily_path = vault_path.join("life/Journal/Daily/2026/2026-09/2026-09-27.md");
    let saved_bytes =
        fs::read(&daily_path).expect("approved plan exists in canonical Daily Record");
    let saved_text = String::from_utf8(saved_bytes.clone()).unwrap();
    assert!(saved_text.contains("Prepare the report"));
    assert!(saved_text.contains("Synthetic report task"));
    assert!(saved_text.contains("One confirmed exercise habit"));
    assert!(
        !task_path.exists(),
        "plan approval still leaves Tasks untouched"
    );
    let saved_today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock)
        .read_date("2026-09-27")
        .unwrap();
    assert_eq!(saved_today.timeline.len(), 2);
    assert_eq!(saved_today.baseline.timeline, saved_today.timeline);
    assert_eq!(saved_today.baseline.evidence, saved_today.evidence);
    let morning_baseline = canonical_section(&saved_text, "早间基准", "今天的大致安排").to_owned();

    let calibration =
        submit_and_approve_plan_step(&application, &session.id, "morning calibration");
    assert_eq!(calibration.status, "applied");
    let calibrated_text = fs::read_to_string(&daily_path).unwrap();
    assert_eq!(
        canonical_section(&calibrated_text, "早间基准", "今天的大致安排"),
        morning_baseline,
        "morning calibration preserves the point-in-time baseline bytes"
    );
    let calibrated_today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock)
        .read_date("2026-09-27")
        .unwrap();
    assert_ne!(calibrated_today.timeline, saved_today.timeline);
    assert_eq!(
        calibrated_today.baseline.timeline,
        saved_today.baseline.timeline
    );
    assert!(calibrated_today
        .daytime
        .updates
        .iter()
        .any(|update| update.title == "早间校准"));

    let current_arrangement =
        canonical_section(&calibrated_text, "今天的大致安排", "计划依据").to_owned();
    let current_basis = canonical_section(&calibrated_text, "计划依据", "白天更新").to_owned();
    let event = submit_and_approve_plan_step(&application, &session.id, "daytime event");
    assert_eq!(event.status, "applied");
    let event_text = fs::read_to_string(&daily_path).unwrap();
    assert_eq!(
        canonical_section(&event_text, "早间基准", "今天的大致安排"),
        morning_baseline
    );
    assert_eq!(
        canonical_section(&event_text, "今天的大致安排", "计划依据"),
        current_arrangement
    );
    assert_eq!(
        canonical_section(&event_text, "计划依据", "白天更新"),
        current_basis
    );
    let event_today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock)
        .read_date("2026-09-27")
        .unwrap();
    assert!(event_today
        .time_axis
        .unlocated_confirmed_facts
        .iter()
        .any(|fact| {
            fact.text.contains("I completed a short walk") && fact.start_minute.is_none()
        }));

    let replan = submit_and_approve_plan_step(&application, &session.id, "daytime replan");
    assert_eq!(replan.status, "applied");
    let replanned_text = fs::read_to_string(&daily_path).unwrap();
    assert_eq!(
        canonical_section(&replanned_text, "早间基准", "今天的大致安排"),
        morning_baseline,
        "daytime replan preserves the point-in-time baseline bytes"
    );
    let replanned_today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock)
        .read_date("2026-09-27")
        .unwrap();
    assert!(replanned_today
        .timeline
        .iter()
        .any(|block| block.title.contains("tomorrow")));
    assert!(replanned_today
        .daytime
        .updates
        .iter()
        .any(|update| update.title == "计划调整"));
    assert!(!task_path.exists());
    let final_daily_bytes = fs::read(&daily_path).unwrap();

    let reloaded = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    )
    .0
    .session("vault-a", &session.id)
    .unwrap();
    assert_eq!(reloaded.task_operations[0].status, "applied");
    assert_eq!(fs::read(&daily_path).unwrap(), final_daily_bytes);
    assert!(!task_path.exists());
}

#[test]
fn daily_plan_receipt_reconciles_after_restart_when_collaboration_history_save_fails() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let fail_next_save = Arc::new(AtomicBool::new(false));
    let (application, _, _) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::clone(&fail_next_save),
    );
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message("vault-a", &session.id, "2026-09-27", "save daily plan")
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");
    let proposal = application
        .session("vault-a", &session.id)
        .unwrap()
        .task_operations[0]
        .clone();
    let daily_path = vault_path.join("life/Journal/Daily/2026/2026-09/2026-09-27.md");

    fail_next_save.store(true, Ordering::SeqCst);
    let failure = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap_err();
    assert!(failure.contains("was saved"), "{failure}");
    let saved_bytes =
        fs::read(&daily_path).expect("Daily Record write completed before history fault");
    assert!(saved_bytes.iter().any(|byte| *byte == b'\n'));

    drop(application);
    let (restarted, _, _) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let reconciled = restarted
        .reconcile_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(reconciled.task_operations[0].status, "applied");
    let after_reconcile = fs::read(&daily_path).unwrap();
    assert_eq!(
        after_reconcile, saved_bytes,
        "reconciliation must not duplicate the write"
    );
    assert_eq!(
        after_reconcile
            .windows(b"plan-operation id=".len())
            .filter(|window| *window == b"plan-operation id=")
            .count(),
        1
    );
    assert!(!vault_path
        .join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH)
        .exists());
}

#[test]
fn revision_conflict_requires_refresh_and_a_second_explicit_approval() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let (application, _, _) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message("vault-a", &session.id, "2026-09-27", "create task")
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");
    let proposal = application
        .session("vault-a", &session.id)
        .unwrap()
        .task_operations[0]
        .clone();
    let proposal_task_id = proposal.task_id.clone().unwrap();

    let tasks = TaskApplication::new(vault.clone(), FixedClock, FileTaskStore);
    let before_external_change = tasks.read().unwrap();
    tasks
        .create(personal_dashboard_lib::tasks::TaskCreateInput {
            target_binding: before_external_change.target_binding.unwrap(),
            expected_revision: before_external_change.revision,
            task_id: "unrelated-human-task".into(),
            name: "Unrelated human change".into(),
            content: None,
            date: Some("2026-09-27".into()),
            time: None,
            list_id: None,
        })
        .unwrap();

    let conflicted = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(conflicted.task_operations[0].status, "conflict");
    assert!(!tasks
        .read()
        .unwrap()
        .tasks
        .iter()
        .any(|task| task.id == proposal_task_id));

    let refreshed = application
        .refresh_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(refreshed.task_operations[0].status, "awaitingApproval");
    assert!(refreshed.task_operations[0]
        .result_message
        .as_deref()
        .unwrap()
        .contains("approve again"));
    let applied = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(applied.task_operations[0].status, "applied");
    let saved = tasks.read().unwrap();
    assert_eq!(saved.tasks.len(), 2);
    assert!(saved.tasks.iter().any(|task| task.id == proposal_task_id));
}

#[test]
fn daily_plan_vault_switch_and_stale_revision_require_conflict_refresh_and_new_approval() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault-a");
    let second_vault = directory.vault("vault-b");
    let vault = MutableVault::new(&vault_path);
    let context = MutableContext::new("vault-a");
    let (application, _, _) = new_application(
        &directory,
        &vault,
        context.clone(),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message("vault-a", &session.id, "2026-09-27", "save daily plan")
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");
    let proposal = application
        .session("vault-a", &session.id)
        .unwrap()
        .task_operations[0]
        .clone();

    vault.select(&second_vault);
    context.select("vault-b");
    assert!(application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap_err()
        .contains("not available in the selected Vault"));
    assert!(!vault_path
        .join("life/Journal/Daily/2026/2026-09/2026-09-27.md")
        .exists());
    assert!(!second_vault
        .join("life/Journal/Daily/2026/2026-09/2026-09-27.md")
        .exists());

    vault.select(&vault_path);
    context.select("vault-a");
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock);
    let before_external = today.read_date("2026-09-27").unwrap();
    today
        .add_dated_note(DatedNoteInput {
            date: "2026-09-27".into(),
            target_binding: before_external.target_binding.unwrap(),
            expected_revision: before_external.revision,
            entry_id: "external-note-1".into(),
            category: ShortRecordCategory::Ordinary,
            content: "Human entered a note while reviewing the plan".into(),
        })
        .unwrap();

    let conflicted = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(conflicted.task_operations[0].status, "conflict");
    let after_conflict =
        fs::read_to_string(vault_path.join("life/Journal/Daily/2026/2026-09/2026-09-27.md"))
            .unwrap();
    assert!(after_conflict.contains("Human entered a note"));
    assert!(!after_conflict.contains("Prepare the report"));
    let unreconciled = application
        .reconcile_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(unreconciled.task_operations[0].status, "conflict");
    assert!(unreconciled.task_operations[0]
        .result_message
        .as_deref()
        .unwrap()
        .contains("does not confirm this exact plan"));

    let refreshed = application
        .refresh_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(refreshed.task_operations[0].status, "awaitingApproval");
    assert!(refreshed.task_operations[0]
        .result_message
        .as_deref()
        .unwrap()
        .contains("approve again"));
    let applied = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(applied.task_operations[0].status, "applied");
    let final_text =
        fs::read_to_string(vault_path.join("life/Journal/Daily/2026/2026-09/2026-09-27.md"))
            .unwrap();
    assert!(final_text.contains("Human entered a note"));
    assert!(final_text.contains("Prepare the report"));
}

#[test]
fn legacy_thread_keeps_task_proposals_but_requires_a_new_chat_for_daily_plans() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let (application, _, _) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message("vault-a", &session.id, "2026-09-27", "create task")
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");
    let current = application.session("vault-a", &session.id).unwrap();
    assert!(current.task_tool_available);
    assert!(current.daily_plan_tool_available);
    drop(application);

    let history_path = directory.path().join("collaboration/collaboration.json");
    let mut history: Value = serde_json::from_slice(&fs::read(&history_path).unwrap()).unwrap();
    history["sessions"][0]
        .as_object_mut()
        .unwrap()
        .remove("dailyPlanToolRegistered");
    fs::write(&history_path, serde_json::to_vec_pretty(&history).unwrap()).unwrap();

    let (restarted, _, plan_results) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let legacy = restarted.session("vault-a", &session.id).unwrap();
    assert!(legacy.task_tool_available);
    assert!(!legacy.daily_plan_tool_available);

    restarted
        .submit_message("vault-a", &session.id, "2026-09-27", "save daily plan")
        .unwrap();
    wait_for_finish(&restarted, &session.id, "vault-a");
    let result = plan_results.lock().unwrap()[0].clone();
    assert!(!result.success);
    assert!(result.text.contains("older proposal-tool schema"));
    assert_eq!(
        restarted
            .session("vault-a", &session.id)
            .unwrap()
            .task_operations
            .len(),
        1
    );
    assert!(!vault_path
        .join("life/Journal/Daily/2026/2026-09/2026-09-27.md")
        .exists());

    restarted
        .submit_message("vault-a", &session.id, "2026-09-27", "create task")
        .unwrap();
    wait_for_finish(&restarted, &session.id, "vault-a");
    let after_task_proposal = restarted.session("vault-a", &session.id).unwrap();
    assert_eq!(after_task_proposal.task_operations.len(), 2);
    assert!(after_task_proposal.task_operations.iter().all(|operation| {
        !matches!(
            &operation.operation,
            CollaborationTaskOperation::SaveDailyPlan { .. }
        )
    }));
}

#[test]
fn unknown_runtime_dynamic_tool_request_is_rejected_without_a_proposal_or_write() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let (application, _, results) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message("vault-a", &session.id, "2026-09-27", "unknown tool")
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");

    let result = results.lock().unwrap()[0].clone();
    assert!(!result.success);
    assert!(result.text.contains("Unsupported Dashboard dynamic tool"));
    assert!(application
        .session("vault-a", &session.id)
        .unwrap()
        .task_operations
        .is_empty());
    assert!(TaskApplication::new(vault, FixedClock, FileTaskStore)
        .read()
        .unwrap()
        .tasks
        .is_empty());
}

#[test]
fn task_and_list_writes_reconcile_after_history_failure_without_duplicate_retry() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let fail_next_save = Arc::new(AtomicBool::new(false));
    let (application, _, results) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::clone(&fail_next_save),
    );
    let session = application.create_session("2026-09-27").unwrap();

    application
        .submit_message("vault-a", &session.id, "2026-09-27", "create task")
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");
    let task_proposal = application
        .session("vault-a", &session.id)
        .unwrap()
        .task_operations[0]
        .clone();
    fail_next_save.store(true, Ordering::SeqCst);
    let failure = application
        .approve_task_operation_for_selected_vault(&session.id, &task_proposal.id)
        .unwrap_err();
    assert!(failure.contains("was saved"), "{failure}");
    let task_id = task_proposal.task_id.clone().unwrap();
    let tasks = TaskApplication::new(vault.clone(), FixedClock, FileTaskStore);
    assert_eq!(
        tasks
            .read()
            .unwrap()
            .tasks
            .iter()
            .filter(|task| task.id == task_id)
            .count(),
        1
    );
    let dismissed_after_uncertain_save = application
        .reject_task_operation_for_selected_vault(&session.id, &task_proposal.id)
        .unwrap();
    assert_eq!(
        dismissed_after_uncertain_save.task_operations[0].status, "applied",
        "a changed Tasks revision must be reconciled instead of mislabeled dismissed"
    );
    application
        .approve_task_operation_for_selected_vault(&session.id, &task_proposal.id)
        .unwrap();
    assert_eq!(
        tasks
            .read()
            .unwrap()
            .tasks
            .iter()
            .filter(|task| task.id == task_id)
            .count(),
        1
    );

    application
        .submit_message("vault-a", &session.id, "2026-09-27", "create list")
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");
    let after_second = application.session("vault-a", &session.id).unwrap();
    let list_proposal = after_second
        .task_operations
        .iter()
        .find(|op| op.list_id.is_some())
        .unwrap()
        .clone();
    assert_ne!(
        list_proposal.id, task_proposal.id,
        "the same App Server call ID on a later turn is a distinct operation"
    );
    fail_next_save.store(true, Ordering::SeqCst);
    let failure = application
        .approve_task_operation_for_selected_vault(&session.id, &list_proposal.id)
        .unwrap_err();
    assert!(failure.contains("was saved"), "{failure}");
    let list_id = list_proposal.list_id.clone().unwrap();
    assert_eq!(
        tasks
            .read()
            .unwrap()
            .lists
            .iter()
            .filter(|list| list.id == list_id)
            .count(),
        1
    );
    let reconciled_list = application
        .reconcile_task_operation_for_selected_vault(&session.id, &list_proposal.id)
        .unwrap();
    assert!(
        reconciled_list
            .task_operations
            .iter()
            .find(|op| op.id == list_proposal.id)
            .unwrap()
            .status
            == "applied"
    );
    application
        .approve_task_operation_for_selected_vault(&session.id, &list_proposal.id)
        .unwrap();
    assert_eq!(
        tasks
            .read()
            .unwrap()
            .lists
            .iter()
            .filter(|list| list.id == list_id)
            .count(),
        1
    );
    assert!(results.lock().unwrap().iter().all(|result| result.success));
}

#[test]
fn evening_review_proposals_are_distinct_append_only_and_reconcile_after_restart() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let daily_path = prepare_daily_review_vault(&vault_path, false);
    let original = fs::read_to_string(&daily_path).unwrap();
    let vault = MutableVault::new(&vault_path);
    let context = MutableContext::new("vault-a");
    let fail_next_save = Arc::new(AtomicBool::new(false));
    let (application, registered_tools, results) = new_application(
        &directory,
        &vault,
        context.clone(),
        Arc::clone(&fail_next_save),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let addition = submit_for_proposal(&application, &session.id, "evening addition");
    assert!(matches!(
        &addition.operation,
        CollaborationTaskOperation::SaveEveningReview { .. }
    ));
    assert!(matches!(
        &addition.baseline,
        personal_dashboard_lib::collaboration::CollaborationTaskOperationBaseline::DailyReview { account, .. }
            if account.iter().any(|line| line.contains("已有原始复盘"))
    ));
    assert_eq!(fs::read_to_string(&daily_path).unwrap(), original);
    assert!(!vault_path
        .join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH)
        .exists());
    let tool = registered_tools.lock().unwrap()[0].clone();
    for name in [
        "saveEveningReview",
        "correctShortRecord",
        "setLocalHabitCompletion",
    ] {
        assert!(tool["inputSchema"]["oneOf"]
            .as_array()
            .unwrap()
            .iter()
            .any(|variant| variant["properties"]["operation"]["const"] == name));
    }
    assert!(results.lock().unwrap()[0].success);

    application
        .approve_task_operation_for_selected_vault(&session.id, &addition.id)
        .unwrap();
    let after_add = fs::read_to_string(&daily_path).unwrap();
    assert!(after_add.contains("已有原始复盘。"));
    assert!(after_add.contains("I finished the synthetic evening review."));
    assert!(after_add.contains("用户自有章节原文。"));
    assert_eq!(
        after_add.matches(&format!("id={} ", addition.id)).count(),
        1
    );
    assert_eq!(
        application
            .approve_task_operation_for_selected_vault(&session.id, &addition.id)
            .unwrap()
            .task_operations[0]
            .status,
        "applied"
    );
    assert_eq!(
        fs::read_to_string(&daily_path)
            .unwrap()
            .matches(&format!("id={} ", addition.id))
            .count(),
        1,
        "repeated approval does not append a second receipt"
    );

    let correction = submit_for_proposal(&application, &session.id, "evening correction");
    assert!(matches!(
        &correction.operation,
        CollaborationTaskOperation::SaveEveningReview { .. }
    ));
    application
        .approve_task_operation_for_selected_vault(&session.id, &correction.id)
        .unwrap();
    let after_correction = fs::read_to_string(&daily_path).unwrap();
    assert!(after_correction.contains("已有原始复盘。"));
    assert!(after_correction.contains("I finished the synthetic evening review."));
    assert!(after_correction.contains("review-2026-09-27"));
    assert!(after_correction.contains("Correction: it happened during the afternoon."));
    drop(application);

    let (restarted, _, _) = new_application(
        &directory,
        &vault,
        context,
        Arc::new(AtomicBool::new(false)),
    );
    let persisted = restarted.session("vault-a", &session.id).unwrap();
    assert!(persisted
        .task_operations
        .iter()
        .any(|operation| operation.id == addition.id && operation.status == "applied"));
    assert!(persisted
        .task_operations
        .iter()
        .any(|operation| operation.id == correction.id && operation.status == "applied"));
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock)
        .read_date("2026-09-27")
        .unwrap();
    assert!(today
        .evening
        .additions
        .iter()
        .any(|line| line.contains("synthetic evening review")));
    assert!(today
        .evening
        .corrections
        .iter()
        .any(|line| line.contains("review-2026-09-27")));
    let calendar = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock)
        .calendar_month(2026, 9)
        .unwrap();
    assert_eq!(
        calendar.day("2026-09-27").unwrap().availability,
        personal_dashboard_lib::today::DailyRecordAvailability::Reviewed
    );
}

#[test]
fn exercise_short_record_correction_uses_stable_identity_and_preserves_its_trace() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let daily_path = prepare_daily_review_vault(&vault_path, true);
    let before = fs::read_to_string(&daily_path).unwrap();
    let task_path = vault_path.join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH);
    let vault = MutableVault::new(&vault_path);
    let (application, _, _) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let proposal = submit_for_proposal(&application, &session.id, "correct exercise record");
    assert!(matches!(
        &proposal.operation,
        CollaborationTaskOperation::CorrectShortRecord { record_id, .. }
            if record_id == "exercise-short-1"
    ));
    assert!(matches!(
        &proposal.baseline,
        personal_dashboard_lib::collaboration::CollaborationTaskOperationBaseline::ShortRecord { id, text, .. }
            if id == "exercise-short-1" && text == "Walked outdoors for 20 minutes."
    ));
    assert_eq!(fs::read_to_string(&daily_path).unwrap(), before);
    assert!(!task_path.exists());

    let applied = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(applied.task_operations[0].status, "applied");
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock)
        .read_date("2026-09-27")
        .unwrap();
    let record = today
        .daytime
        .short_records
        .iter()
        .find(|record| record.id == "exercise-short-1")
        .unwrap();
    assert_eq!(record.text, "Walked outdoors for 25 minutes.");
    assert_eq!(record.changes.len(), 1);
    assert_eq!(record.changes[0].id, proposal.id);
    assert_eq!(
        record.changes[0].old_text,
        "Walked outdoors for 20 minutes."
    );
    assert_eq!(
        record.changes[0].new_text,
        "Walked outdoors for 25 minutes."
    );
    assert!(today
        .habit_corrections
        .habit("exercise")
        .unwrap()
        .cell
        .local_records
        .iter()
        .any(|record| record.id == "exercise-short-1"
            && record.text == "Walked outdoors for 25 minutes."));
    assert!(!task_path.exists());
}

#[test]
fn ordinary_short_record_correction_uses_the_same_stable_trace_without_habit_linkage() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let daily_path = prepare_daily_review_vault(&vault_path, false);
    let vault = MutableVault::new(&vault_path);
    let today_app = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock);
    let opened = today_app.read_date("2026-09-27").unwrap();
    today_app
        .add_dated_note(DatedNoteInput {
            date: "2026-09-27".into(),
            target_binding: opened.target_binding.unwrap(),
            expected_revision: opened.revision,
            entry_id: "ordinary-short-1".into(),
            category: ShortRecordCategory::Ordinary,
            content: "The original ordinary note.".into(),
        })
        .unwrap();
    let before = fs::read_to_string(&daily_path).unwrap();
    let task_path = vault_path.join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH);
    let (application, _, _) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let proposal = submit_for_proposal(&application, &session.id, "correct ordinary record");
    assert!(matches!(
        &proposal.operation,
        CollaborationTaskOperation::CorrectShortRecord { record_id, .. }
            if record_id == "ordinary-short-1"
    ));
    assert!(matches!(
        &proposal.baseline,
        personal_dashboard_lib::collaboration::CollaborationTaskOperationBaseline::ShortRecord { id, category, text, .. }
            if id == "ordinary-short-1"
                && *category == ShortRecordCategory::Ordinary
                && text == "The original ordinary note."
    ));
    assert_eq!(fs::read_to_string(&daily_path).unwrap(), before);
    assert!(!task_path.exists());

    let applied = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(applied.task_operations[0].status, "applied");
    assert!(applied.task_operations[0]
        .result_message
        .as_deref()
        .unwrap()
        .contains("linked correction trace"));
    let today = today_app.read_date("2026-09-27").unwrap();
    let record = today
        .daytime
        .short_records
        .iter()
        .find(|record| record.id == "ordinary-short-1")
        .unwrap();
    assert_eq!(record.category, ShortRecordCategory::Ordinary);
    assert_eq!(record.text, "The ordinary note was corrected.");
    assert_eq!(record.changes.len(), 1);
    assert_eq!(record.changes[0].id, proposal.id);
    assert_eq!(record.changes[0].old_text, "The original ordinary note.");
    assert_eq!(
        record.changes[0].new_text,
        "The ordinary note was corrected."
    );
    assert!(!today
        .habit_corrections
        .habit("exercise")
        .unwrap()
        .cell
        .local_records
        .iter()
        .any(|record| record.id == "ordinary-short-1"));
    assert!(!task_path.exists());
}

#[test]
fn ordinary_short_record_conflict_can_refresh_and_require_new_approval() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let daily_path = prepare_daily_review_vault(&vault_path, false);
    let vault = MutableVault::new(&vault_path);
    let today_app = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock);
    let opened = today_app.read_date("2026-09-27").unwrap();
    let added = today_app
        .add_dated_note(DatedNoteInput {
            date: "2026-09-27".into(),
            target_binding: opened.target_binding.unwrap(),
            expected_revision: opened.revision,
            entry_id: "ordinary-short-1".into(),
            category: ShortRecordCategory::Ordinary,
            content: "The original ordinary note.".into(),
        })
        .unwrap();
    let (application, _, _) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let proposal = submit_for_proposal(&application, &session.id, "correct ordinary record");

    today_app
        .correct_dated_note(DatedNoteCorrectionInput {
            date: added.date,
            target_binding: added.target_binding.unwrap(),
            expected_revision: added.revision.unwrap(),
            entry_id: "ordinary-short-1".into(),
            change_id: "external-ordinary-correction".into(),
            content: "Concurrent ordinary note.".into(),
        })
        .unwrap();
    let conflict = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(conflict.task_operations[0].status, "conflict");
    assert!(fs::read_to_string(&daily_path)
        .unwrap()
        .contains("Concurrent ordinary note."));

    let refreshed = application
        .refresh_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(refreshed.task_operations[0].status, "awaitingApproval");
    assert!(matches!(
        &refreshed.task_operations[0].baseline,
        personal_dashboard_lib::collaboration::CollaborationTaskOperationBaseline::ShortRecord {
            id,
            category,
            text,
            change_count,
            ..
        } if id == "ordinary-short-1"
            && *category == ShortRecordCategory::Ordinary
            && text == "Concurrent ordinary note."
            && *change_count == 1
    ));

    let applied = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(applied.task_operations[0].status, "applied");
    let corrected = today_app.read_date("2026-09-27").unwrap();
    let record = corrected
        .daytime
        .short_records
        .iter()
        .find(|record| record.id == "ordinary-short-1")
        .unwrap();
    assert_eq!(record.text, "The ordinary note was corrected.");
    assert_eq!(record.changes.len(), 2);
    assert_eq!(record.changes[0].id, "external-ordinary-correction");
    assert_eq!(record.changes[1].id, proposal.id);
}

#[test]
fn local_habit_completion_add_and_withdraw_refresh_today_calendar_and_habits_only() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let daily_path = prepare_daily_review_vault(&vault_path, false);
    let snapshot_path = vault_path.join(".personal-dashboard/derived/habits-v1.json");
    let source_snapshot = fs::read(&snapshot_path).unwrap();
    let task_path = vault_path.join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH);
    let vault = MutableVault::new(&vault_path);
    let (application, _, _) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let add = submit_for_proposal(&application, &session.id, "complete habit");
    assert!(matches!(
        &add.operation,
        CollaborationTaskOperation::SetLocalHabitCompletion {
            habit_key,
            completed: true
        } if habit_key == "exercise"
    ));
    assert!(matches!(
        &add.baseline,
        personal_dashboard_lib::collaboration::CollaborationTaskOperationBaseline::HabitCompletion { source_evidence, source_snapshot_at: Some(_), .. }
            if source_evidence.iter().any(|evidence| evidence.contains("External source revision is not exposed"))
    ));
    assert!(!vault_path
        .join("life/.personal-dashboard/habit-completions/v1/completions.json")
        .exists());
    assert!(!task_path.exists());

    application
        .approve_task_operation_for_selected_vault(&session.id, &add.id)
        .unwrap();
    application
        .approve_task_operation_for_selected_vault(&session.id, &add.id)
        .unwrap();
    let today_app = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock);
    let today = today_app.read_date("2026-09-27").unwrap();
    let historical = today.habit_corrections.habit("exercise").unwrap();
    assert_eq!(
        historical.cell.local_completion_state,
        HabitLocalCompletionState::Completed
    );
    let habits = today_app.habits().unwrap();
    let habit = habits.habit("exercise").unwrap();
    assert_eq!(
        habit.cell("2026-09-27").unwrap().local_completion_state,
        HabitLocalCompletionState::Completed
    );
    assert_eq!(
        today_app
            .calendar_month(2026, 9)
            .unwrap()
            .day("2026-09-27")
            .unwrap()
            .availability,
        personal_dashboard_lib::today::DailyRecordAvailability::Reviewed
    );
    assert_eq!(fs::read(&snapshot_path).unwrap(), source_snapshot);
    assert!(!task_path.exists());
    let completion_document: Value = serde_json::from_slice(
        &fs::read(
            vault_path.join("life/.personal-dashboard/habit-completions/v1/completions.json"),
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(
        completion_document["completions"][0]["changes"]
            .as_array()
            .unwrap()
            .len(),
        1,
        "repeated approval does not create a second completion change"
    );
    assert!(daily_path.exists());

    let withdraw = submit_for_proposal(&application, &session.id, "withdraw habit");
    application
        .approve_task_operation_for_selected_vault(&session.id, &withdraw.id)
        .unwrap();
    let withdrawn = today_app.read_date("2026-09-27").unwrap();
    assert_eq!(
        withdrawn
            .habit_corrections
            .habit("exercise")
            .unwrap()
            .cell
            .local_completion_state,
        HabitLocalCompletionState::Withdrawn
    );
    assert_eq!(fs::read(&snapshot_path).unwrap(), source_snapshot);
    assert!(!task_path.exists());
    let completions: Value = serde_json::from_slice(
        &fs::read(
            vault_path.join("life/.personal-dashboard/habit-completions/v1/completions.json"),
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(
        completions["completions"][0]["changes"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
}

#[test]
fn habit_proposal_outside_snapshot_range_shows_unknown_date_cell_state() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    prepare_daily_review_vault(&vault_path, false);
    let vault = MutableVault::new(&vault_path);
    let (application, _, _) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-01-01").unwrap();
    application
        .submit_message("vault-a", &session.id, "2026-01-01", "complete habit")
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");
    let proposal = application
        .session("vault-a", &session.id)
        .unwrap()
        .task_operations
        .into_iter()
        .rev()
        .find(|operation| operation.status == "awaitingApproval")
        .expect("synthetic runtime proposes the requested action");

    assert!(matches!(
        &proposal.baseline,
        personal_dashboard_lib::collaboration::CollaborationTaskOperationBaseline::HabitCompletion {
            date,
            local_state,
            source_evidence,
            ..
        } if date == "2026-01-01"
            && local_state == "unknown"
            && source_evidence.iter().any(|evidence| evidence.contains("no dated cell for 2026-01-01; status is unknown"))
    ));
}

#[test]
fn evening_proposal_vault_switch_and_stale_record_require_refresh_then_explicit_approval() {
    let directory = IsolatedDirectory::new();
    let vault_a = directory.vault("vault-a");
    let vault_b = directory.vault("vault-b");
    let daily_a = prepare_daily_review_vault(&vault_a, false);
    let daily_b = prepare_daily_review_vault(&vault_b, false);
    let vault = MutableVault::new(&vault_a);
    let context = MutableContext::new("vault-a");
    let (application, _, _) = new_application(
        &directory,
        &vault,
        context.clone(),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let proposal = submit_for_proposal(&application, &session.id, "evening addition");
    let original_a = fs::read_to_string(&daily_a).unwrap();
    let original_b = fs::read_to_string(&daily_b).unwrap();

    vault.select(&vault_b);
    context.select("vault-b");
    assert!(application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap_err()
        .contains("not available in the selected Vault"));
    assert_eq!(fs::read_to_string(&daily_a).unwrap(), original_a);
    assert_eq!(fs::read_to_string(&daily_b).unwrap(), original_b);

    vault.select(&vault_a);
    context.select("vault-a");
    let externally_changed = original_a.replace(
        "## 私人扩展",
        "- External concurrent edit preserved.\n\n## 私人扩展",
    );
    fs::write(&daily_a, &externally_changed).unwrap();
    let conflict = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(conflict.task_operations[0].status, "conflict");
    assert_eq!(fs::read_to_string(&daily_a).unwrap(), externally_changed);

    let refreshed = application
        .refresh_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(refreshed.task_operations[0].status, "awaitingApproval");
    assert!(matches!(
        &refreshed.task_operations[0].baseline,
        personal_dashboard_lib::collaboration::CollaborationTaskOperationBaseline::DailyReview { account, .. }
            if account.iter().any(|line| line.contains("External concurrent edit preserved"))
    ));
    assert!(fs::read_to_string(&daily_a)
        .unwrap()
        .contains("External concurrent edit preserved."));
    let approved = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(approved.task_operations[0].status, "applied");
    let saved = fs::read_to_string(&daily_a).unwrap();
    assert!(saved.contains("External concurrent edit preserved."));
    assert!(saved.contains("I finished the synthetic evening review."));
}

#[test]
fn evening_receipt_reconciles_after_restart_when_history_result_save_fails() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let daily_path = prepare_daily_review_vault(&vault_path, false);
    let vault = MutableVault::new(&vault_path);
    let context = MutableContext::new("vault-a");
    let fail_next_save = Arc::new(AtomicBool::new(false));
    let (application, _, _) = new_application(
        &directory,
        &vault,
        context.clone(),
        Arc::clone(&fail_next_save),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let proposal = submit_for_proposal(&application, &session.id, "evening addition");
    fail_next_save.store(true, Ordering::SeqCst);
    assert!(application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap_err()
        .contains("saved"));
    let committed_record = fs::read_to_string(&daily_path).unwrap();
    assert!(committed_record.contains("I finished the synthetic evening review."));
    assert_eq!(
        committed_record
            .matches(&format!("id={} ", proposal.id))
            .count(),
        1
    );
    drop(application);

    let (restarted, _, _) = new_application(
        &directory,
        &vault,
        context,
        Arc::new(AtomicBool::new(false)),
    );
    let checked = restarted
        .reconcile_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(checked.task_operations[0].status, "applied");
    assert!(checked.task_operations[0]
        .result_message
        .as_deref()
        .unwrap()
        .contains("confirms this exact operation was saved"));
    assert_eq!(
        fs::read_to_string(&daily_path)
            .unwrap()
            .matches(&format!("id={} ", proposal.id))
            .count(),
        1
    );
    assert!(!vault_path
        .join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH)
        .exists());
}

#[test]
fn local_habit_revision_conflict_requires_refresh_and_a_new_approval() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    prepare_daily_review_vault(&vault_path, false);
    let vault = MutableVault::new(&vault_path);
    let (application, _, _) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let proposal = submit_for_proposal(&application, &session.id, "complete habit");
    let habit_app = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock);
    let snapshot = habit_app.habits().unwrap();
    habit_app
        .set_historical_habit_completion(
            personal_dashboard_lib::today::HabitCompletionMutationInput {
                habit_key: "nutrition".into(),
                lived_date: "2026-09-27".into(),
                completed: true,
                change_id: "outside-nutrition-1".into(),
                target_binding: snapshot.completion_target_binding.unwrap(),
                expected_revision: None,
            },
        )
        .unwrap();
    let conflict = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(conflict.task_operations[0].status, "conflict");
    assert!(
        !habit_app
            .habits()
            .unwrap()
            .habit("exercise")
            .unwrap()
            .cell("2026-09-27")
            .unwrap()
            .counts_as_completion
    );

    let refreshed = application
        .refresh_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(refreshed.task_operations[0].status, "awaitingApproval");
    assert!(matches!(
        &refreshed.task_operations[0].baseline,
        personal_dashboard_lib::collaboration::CollaborationTaskOperationBaseline::HabitCompletion { completion_revision: Some(_), .. }
    ));
    let approved = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(approved.task_operations[0].status, "applied");
    assert_eq!(
        habit_app
            .habits()
            .unwrap()
            .habit("exercise")
            .unwrap()
            .cell("2026-09-27")
            .unwrap()
            .local_completion_state,
        HabitLocalCompletionState::Completed
    );
}

#[test]
fn local_habit_receipt_reconciles_after_restart_when_history_save_fails() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    prepare_daily_review_vault(&vault_path, false);
    let vault = MutableVault::new(&vault_path);
    let context = MutableContext::new("vault-a");
    let fail_next_save = Arc::new(AtomicBool::new(false));
    let (application, _, _) = new_application(
        &directory,
        &vault,
        context.clone(),
        Arc::clone(&fail_next_save),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let proposal = submit_for_proposal(&application, &session.id, "complete habit");
    fail_next_save.store(true, Ordering::SeqCst);
    assert!(application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap_err()
        .contains("collaboration result"));
    let completion_path =
        vault_path.join("life/.personal-dashboard/habit-completions/v1/completions.json");
    let committed: Value = serde_json::from_slice(&fs::read(&completion_path).unwrap()).unwrap();
    assert_eq!(committed["completions"][0]["habitKey"], "exercise");
    assert_eq!(
        committed["completions"][0]["changes"]
            .as_array()
            .unwrap()
            .len(),
        1
    );
    drop(application);

    let (restarted, _, _) = new_application(
        &directory,
        &vault,
        context,
        Arc::new(AtomicBool::new(false)),
    );
    let reconciled = restarted
        .reconcile_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(reconciled.task_operations[0].status, "applied");
    assert!(reconciled.task_operations[0]
        .result_message
        .as_deref()
        .unwrap()
        .contains("receipt confirms this exact change was saved"));
    let after: Value = serde_json::from_slice(&fs::read(&completion_path).unwrap()).unwrap();
    assert_eq!(
        after["completions"][0]["changes"].as_array().unwrap().len(),
        1
    );
}

#[test]
fn task_application_adapter_preserves_date_completion_and_list_lifecycle_semantics() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let adapter = TaskApplicationCollaborationAdapter::new(TaskApplication::new(
        MutableVault::new(&vault_path),
        FixedClock,
        FileTaskStore,
    ));
    let mut view = adapter.read().unwrap();
    assert_eq!(view.state, TaskDataState::Empty);
    let binding = view.target_binding.clone().unwrap();
    view = adapter
        .apply(
            &CollaborationTaskOperation::CreateList {
                name: "Planning".into(),
            },
            &binding,
            view.revision.as_deref(),
            "operation-create-list",
        )
        .unwrap();
    let list_id = view
        .lists
        .iter()
        .find(|list| list.name == "Planning")
        .unwrap()
        .id
        .clone();
    view = adapter
        .apply(
            &CollaborationTaskOperation::CreateTask {
                name: "Draft report".into(),
                content: Some("Collect notes".into()),
                date: Some("2026-09-20".into()),
                time: Some("09:30".into()),
                list_id: Some(list_id.clone()),
            },
            &binding,
            view.revision.as_deref(),
            "operation-create-task",
        )
        .unwrap();
    let task_id = view.tasks[0].id.clone();
    view = adapter
        .apply(
            &CollaborationTaskOperation::UpdateTask {
                task_id: task_id.clone(),
                name: "Prepare report".into(),
                content: Some("Collect final notes".into()),
                date: Some("2026-09-22".into()),
                time: Some("14:00".into()),
                list_id: None,
            },
            &binding,
            view.revision.as_deref(),
            "operation-update-task",
        )
        .unwrap();
    assert_eq!(view.tasks[0].date.as_deref(), Some("2026-09-22"));
    assert_eq!(view.tasks[0].list_id, list_id);
    view = adapter
        .apply(
            &CollaborationTaskOperation::CompleteTask {
                task_id: task_id.clone(),
            },
            &binding,
            view.revision.as_deref(),
            "operation-complete-task",
        )
        .unwrap();
    view = adapter
        .apply(
            &CollaborationTaskOperation::CorrectCompletion {
                task_id: task_id.clone(),
                completed_on: "2026-09-26".into(),
                completed_time: Some("11:45".into()),
            },
            &binding,
            view.revision.as_deref(),
            "operation-correct-completion",
        )
        .unwrap();
    assert_eq!(view.tasks[0].date.as_deref(), Some("2026-09-22"));
    assert_eq!(
        view.tasks[0]
            .completion
            .as_ref()
            .map(|completion| completion.completed_on.as_str()),
        Some("2026-09-26")
    );
    assert_eq!(
        view.tasks[0]
            .completion
            .as_ref()
            .and_then(|completion| completion.completed_time.as_deref()),
        Some("11:45")
    );
    view = adapter
        .apply(
            &CollaborationTaskOperation::ReopenTask {
                task_id: task_id.clone(),
            },
            &binding,
            view.revision.as_deref(),
            "operation-reopen-task",
        )
        .unwrap();
    view = adapter
        .apply(
            &CollaborationTaskOperation::AbandonTask {
                task_id: task_id.clone(),
            },
            &binding,
            view.revision.as_deref(),
            "operation-abandon-task",
        )
        .unwrap();
    view = adapter
        .apply(
            &CollaborationTaskOperation::ReopenTask {
                task_id: task_id.clone(),
            },
            &binding,
            view.revision.as_deref(),
            "operation-reopen-task-again",
        )
        .unwrap();
    view = adapter
        .apply(
            &CollaborationTaskOperation::DeleteTask {
                task_id: task_id.clone(),
            },
            &binding,
            view.revision.as_deref(),
            "operation-delete-task",
        )
        .unwrap();
    assert!(view.tasks[0].deleted_at.is_some());
    view = adapter
        .apply(
            &CollaborationTaskOperation::RestoreTask {
                task_id: task_id.clone(),
            },
            &binding,
            view.revision.as_deref(),
            "operation-restore-task",
        )
        .unwrap();
    assert_eq!(view.tasks[0].state, TaskState::Pending);
    view = adapter
        .apply(
            &CollaborationTaskOperation::RenameList {
                list_id: list_id.clone(),
                name: "Planning and review".into(),
            },
            &binding,
            view.revision.as_deref(),
            "operation-rename-list",
        )
        .unwrap();
    view = adapter
        .apply(
            &CollaborationTaskOperation::ArchiveList {
                list_id: list_id.clone(),
            },
            &binding,
            view.revision.as_deref(),
            "operation-archive-list",
        )
        .unwrap();
    assert!(
        view.lists
            .iter()
            .find(|list| list.id == list_id)
            .unwrap()
            .archived
    );
    assert_eq!(
        view.tasks[0].state,
        TaskState::Pending,
        "list archive never changes task state"
    );
    view = adapter
        .apply(
            &CollaborationTaskOperation::RestoreList {
                list_id: list_id.clone(),
            },
            &binding,
            view.revision.as_deref(),
            "operation-restore-list",
        )
        .unwrap();
    assert!(
        !view
            .lists
            .iter()
            .find(|list| list.id == list_id)
            .unwrap()
            .archived
    );
}
