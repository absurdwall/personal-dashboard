use personal_dashboard_lib::collaboration::{
    AppServerTransport, CollaborationApplication, CollaborationClock, CollaborationContextSource,
    CollaborationContextView, CollaborationState, CollaborationStore,
    CollaborationTaskListReferenceView, CollaborationTaskOperation, CollaborationTaskService,
    ContextPaneView, DailyPlanAutomationSettings, FileCollaborationStore, ModelOptionView,
    RuntimeConnectionView, RuntimeDynamicToolCall, RuntimeDynamicToolHandler,
    RuntimeDynamicToolResult, RuntimeRunReconciliation, RuntimeTurnRequest, RuntimeTurnResult,
    TaskApplicationCollaborationAdapter, TodayApplicationCollaborationDailyDataAdapter,
};
use personal_dashboard_lib::tasks::{
    FileTaskStore, TaskApplication, TaskCreateInput, TaskDataState, TaskState,
};
use personal_dashboard_lib::today::{
    daily_plan_effect_fingerprint, DailyPlanBlockInput, DailyPlanEvidenceInput,
    DailyPlanTransition, DailyPlanWriteInput, DatedNoteCorrectionInput, DatedNoteInput,
    HabitLocalCompletionState, ShortRecordCategory, TodayApplication, TodayClock, TodayState,
    TodayWorkspaceExchange, TodayWorkspacePersistence,
};
use serde_json::{json, Value};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
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

#[derive(Clone)]
struct ManualClock(Arc<Mutex<(String, String)>>);

impl ManualClock {
    fn new(date: &str, time: &str) -> Self {
        Self(Arc::new(Mutex::new((date.into(), time.into()))))
    }

    fn set_time(&self, time: &str) {
        self.0.lock().expect("manual clock lock").1 = time.into();
    }

    fn date_time(&self) -> (String, String) {
        self.0.lock().expect("manual clock lock").clone()
    }
}

impl CollaborationClock for ManualClock {
    fn current_timestamp(&self) -> String {
        let (date, time) = self.date_time();
        format!("{date}T{time}:00-04:00")
    }

    fn current_date(&self) -> String {
        self.date_time().0
    }

    fn current_time(&self) -> String {
        self.date_time().1
    }
}

impl TodayClock for ManualClock {
    fn current_date(&self) -> String {
        self.date_time().0
    }

    fn current_time_label(&self) -> String {
        self.date_time().1
    }

    fn current_timestamp_label(&self) -> String {
        let (date, time) = self.date_time();
        format!("{date}T{time}-04:00")
    }
}

#[derive(Default)]
struct AutomaticTurnGate {
    released: Mutex<bool>,
    changed: Condvar,
    entered: Mutex<bool>,
    entered_changed: Condvar,
}

impl AutomaticTurnGate {
    fn wait_until_entered(&self) {
        let deadline = std::time::Instant::now() + Duration::from_secs(3);
        let mut entered = self.entered.lock().expect("automatic gate lock");
        while !*entered {
            let remaining = deadline.saturating_duration_since(std::time::Instant::now());
            assert!(
                !remaining.is_zero(),
                "automatic runtime did not reach its gate"
            );
            let (next, timeout) = self
                .entered_changed
                .wait_timeout(entered, remaining)
                .unwrap();
            entered = next;
            assert!(!timeout.timed_out() || *entered);
        }
    }

    fn release(&self) {
        *self.released.lock().expect("automatic gate lock") = true;
        self.changed.notify_all();
    }

    fn block_automatic_turn(&self) {
        *self.entered.lock().expect("automatic gate lock") = true;
        self.entered_changed.notify_all();
        let mut released = self.released.lock().expect("automatic gate lock");
        while !*released {
            released = self.changed.wait(released).expect("automatic gate wait");
        }
    }
}

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
    requests: Arc<Mutex<Vec<RuntimeTurnRequest>>>,
    automatic_gate: Option<Arc<AutomaticTurnGate>>,
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
            external_apps: Vec::new(),
            external_discovery_error: None,
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
            external_actions: Vec::new(),
        })
    }

    fn send_turn_with_dynamic_tools(
        &mut self,
        request: RuntimeTurnRequest,
        _cancel_requested: Arc<AtomicBool>,
        tool_handler: Option<RuntimeDynamicToolHandler>,
    ) -> Result<RuntimeTurnResult, String> {
        let handler = tool_handler.ok_or_else(|| "expected a registered task tool".to_string())?;
        self.requests
            .lock()
            .map_err(|_| "request lock poisoned".to_string())?
            .push(request.clone());
        if request.user_text == "hold-worker" {
            if let Some(gate) = &self.automatic_gate {
                gate.block_automatic_turn();
            }
            return Ok(RuntimeTurnResult {
                text: "Synthetic queue holder completed.".into(),
                runtime_turn_id: Some(format!("turn-{}", request.execution_id)),
                stopped: false,
                external_actions: Vec::new(),
            });
        }
        let automatic_plan = request
            .user_text
            .starts_with("Generate and save the automatic first-draft plan");
        if automatic_plan {
            if let Some(gate) = &self.automatic_gate {
                gate.block_automatic_turn();
            }
        }
        let (call_id, tool, arguments) = if request.user_text
            == "Please create a task named Synthetic report."
            || request.user_text == "Don't ask me again; create a task named Synthetic report."
            || request.user_text == "I plan to create a task named Synthetic report next week."
        {
            (
                "direct-task-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "createTask",
                    "executionMode": "execute",
                    "authorizationQuote": request.user_text,
                    "name": "Synthetic report",
                    "content": null,
                    "date": null,
                    "time": null,
                    "listId": null
                }),
            )
        } else if request.user_text == "create task" {
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
        } else if automatic_plan && request.user_text.contains("Current local time: 15:00") {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "saveDailyPlan",
                    "transition": "initialPlan",
                    "arrangement": [
                        {"period": "later today", "title": "Take a short walk", "detail": null},
                        {"period": "evening", "title": "Prepare tomorrow's brief", "detail": null}
                    ],
                    "evidence": [{"label": "Tasks", "items": ["Synthetic task remains upcoming"]}],
                    "calibrationNote": null,
                    "baselineCorrectionReason": null,
                    "event": null,
                    "originalIntent": null,
                    "changeReason": null,
                    "revisedDirection": null
                }),
            )
        } else if request.user_text == "save daily plan" || automatic_plan {
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
        } else if request.user_text == "Please add a note to today's Daily Record: 'Completed the synthetic collaboration acceptance task.' Show the exact note proposal and wait for my approval before saving." {
            (
                "reused-turn-scoped-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "saveEveningReview",
                    "executionMode": "prepareProposal",
                    "authorizationQuote": request.user_text.clone(),
                    "mode": "addition",
                    "content": "Completed the synthetic collaboration acceptance task."
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
            external_actions: Vec::new(),
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
    let daily_data_service = Arc::new(TodayApplicationCollaborationDailyDataAdapter::new(
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
            requests: Arc::new(Mutex::new(Vec::new())),
            automatic_gate: None,
        }),
        Arc::new(context),
        Arc::new(FixedClock),
        directory.path().join("runtime"),
        "Only use supplied synthetic Dashboard context.".into(),
    )
    .with_task_service(task_service)
    .with_daily_data_service(daily_data_service);
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

fn new_automatic_application(
    directory: &IsolatedDirectory,
    vault: &MutableVault,
    context: MutableContext,
    clock: ManualClock,
    automatic_gate: Option<Arc<AutomaticTurnGate>>,
) -> (
    CollaborationApplication,
    Arc<Mutex<Vec<Value>>>,
    Arc<Mutex<Vec<RuntimeDynamicToolResult>>>,
    Arc<Mutex<Vec<RuntimeTurnRequest>>>,
) {
    let registered_tools = Arc::new(Mutex::new(Vec::new()));
    let results = Arc::new(Mutex::new(Vec::new()));
    let requests = Arc::new(Mutex::new(Vec::new()));
    let task_service = Arc::new(TaskApplicationCollaborationAdapter::new(
        TaskApplication::new(vault.clone(), clock.clone(), FileTaskStore),
    ));
    let daily_plan_service = Arc::new(TodayApplicationCollaborationDailyDataAdapter::new(
        TodayApplication::new(vault.clone(), NoVaultPicker, clock.clone()),
    ));
    let application = CollaborationApplication::with_adapters(
        Arc::new(FileCollaborationStore::new(
            directory.path().join("collaboration/collaboration.json"),
        )),
        Box::new(DynamicRuntime {
            registered_tools: Arc::clone(&registered_tools),
            results: Arc::clone(&results),
            requests: Arc::clone(&requests),
            automatic_gate,
        }),
        Arc::new(context),
        Arc::new(clock),
        directory.path().join("runtime"),
        "Use only supplied synthetic Dashboard context. Do not change Tasks.".into(),
    )
    .with_task_service(task_service)
    .with_daily_data_service(daily_plan_service);
    (application, registered_tools, results, requests)
}

fn record_path(vault: &Path) -> PathBuf {
    vault.join("life/Journal/Daily/2026/2026-09/2026-09-27.md")
}

fn initial_fixture_plan(
    today: &TodayApplication<MutableVault, NoVaultPicker, ManualClock>,
    operation_id: &str,
    title: &str,
) -> personal_dashboard_lib::today::TodayView {
    let current = today.read_date("2026-09-27").unwrap();
    let arrangement = vec![DailyPlanBlockInput {
        period: "上午".into(),
        title: title.into(),
        detail: Some("Synthetic fixture plan".into()),
    }];
    let evidence = vec![DailyPlanEvidenceInput {
        label: "Synthetic fixture evidence".into(),
        items: vec!["Test-only background".into()],
    }];
    let mut input = DailyPlanWriteInput {
        date: "2026-09-27".into(),
        target_binding: current.target_binding.unwrap(),
        expected_revision: current.revision,
        operation_id: operation_id.into(),
        effect_fingerprint: String::new(),
        transition: DailyPlanTransition::InitialPlan,
        arrangement,
        evidence,
        calibration_note: None,
        baseline_correction_reason: None,
        event: None,
        original_intent: None,
        change_reason: None,
        revised_direction: None,
    };
    input.effect_fingerprint = daily_plan_effect_fingerprint(
        &input.date,
        input.transition,
        &input.arrangement,
        &input.evidence,
        input.calibration_note.as_deref(),
        input.baseline_correction_reason.as_deref(),
        input.event.as_deref(),
        input.original_intent.as_deref(),
        input.change_reason.as_deref(),
        input.revised_direction.as_deref(),
    );
    today.save_daily_plan(input).unwrap()
}

fn enabled_automation(time: &str) -> DailyPlanAutomationSettings {
    DailyPlanAutomationSettings {
        enabled: true,
        time: time.into(),
        external_schedule_handoff_confirmed: true,
    }
}

#[test]
fn automation_requires_confirmation_that_the_previous_schedule_was_handed_off() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let clock = ManualClock::new("2026-09-27", "06:00");
    let (application, _, _, _) = new_automatic_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        clock,
        None,
    );

    let error = application
        .update_daily_plan_automation(DailyPlanAutomationSettings {
            enabled: true,
            time: "07:00".into(),
            external_schedule_handoff_confirmed: false,
        })
        .unwrap_err();
    assert!(error.contains("previous morning-plan schedule is disabled"));

    let saved = application.daily_plan_automation().unwrap();
    assert!(
        !saved.settings.enabled,
        "failed handoff confirmation must not persist enabled state"
    );
    assert!(
        saved.current_run.is_none(),
        "failed handoff confirmation must not queue a run"
    );

    let store =
        FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json"));
    let mut legacy_settings = store.load().unwrap();
    legacy_settings.settings.daily_plan_automation = DailyPlanAutomationSettings {
        enabled: true,
        time: "06:00".into(),
        external_schedule_handoff_confirmed: false,
    };
    store.save(&legacy_settings).unwrap();
    let legacy_run = application.check_daily_plan_automation().unwrap();
    assert!(
        legacy_run.current_run.is_none(),
        "restored or migrated settings cannot run before the handoff is confirmed"
    );
    assert!(application.list_sessions("2026-09-27").unwrap().is_empty());
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
    let session = application.session(vault, session_id).unwrap();
    panic!(
        "synthetic dynamic-tool run did not finish: {} ({})",
        session.run_state, session.progress
    );
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
    let task_variants = registered[0]["inputSchema"]["oneOf"].as_array().unwrap();
    let create_task = task_variants
        .iter()
        .find(|variant| variant["properties"]["operation"]["const"] == "createTask")
        .unwrap();
    assert_eq!(
        create_task["properties"]["executionMode"]["enum"][0],
        "execute"
    );
    assert!(create_task["required"]
        .as_array()
        .unwrap()
        .iter()
        .any(|field| field == "authorizationQuote"));
    let evening_review = task_variants
        .iter()
        .find(|variant| variant["properties"]["operation"]["const"] == "saveEveningReview")
        .unwrap();
    let execution_mode_guidance = evening_review["properties"]["executionMode"]["description"]
        .as_str()
        .expect("the model receives explicit proposal-versus-execute guidance");
    assert!(
        execution_mode_guidance.contains("wait for approval")
            && execution_mode_guidance.contains("proposal"),
        "{execution_mode_guidance}"
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
fn exact_current_user_instruction_executes_task_without_a_second_approval() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault-a");
    let vault = MutableVault::new(&vault_path);
    let (application, _, results) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message(
            "vault-a",
            &session.id,
            "2026-09-27",
            "Don't ask me again; create a task named Synthetic report.",
        )
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");

    let completed = application.session("vault-a", &session.id).unwrap();
    assert_eq!(completed.task_operations.len(), 1);
    assert_eq!(completed.task_operations[0].status, "applied");
    assert!(completed.task_operations[0]
        .result_message
        .as_deref()
        .unwrap_or_default()
        .contains("Synthetic report"));
    assert!(results.lock().unwrap()[0].success);
    let saved = TaskApplicationCollaborationAdapter::new(TaskApplication::new(
        vault,
        FixedClock,
        FileTaskStore,
    ))
    .read()
    .unwrap();
    assert_eq!(saved.tasks.len(), 1);
    assert_eq!(saved.tasks[0].name, "Synthetic report");
}

#[test]
fn future_task_intent_does_not_execute_a_task_immediately() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault-a");
    let vault = MutableVault::new(&vault_path);
    let (application, _, results) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message(
            "vault-a",
            &session.id,
            "2026-09-27",
            "I plan to create a task named Synthetic report next week.",
        )
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");

    let completed = application.session("vault-a", &session.id).unwrap();
    assert!(completed.task_operations.is_empty());
    assert!(!results.lock().unwrap()[0].success);

    let saved = TaskApplicationCollaborationAdapter::new(TaskApplication::new(
        vault,
        FixedClock,
        FileTaskStore,
    ))
    .read()
    .unwrap();
    assert!(saved.tasks.is_empty(), "future intent must not write now");
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
fn daily_record_note_request_creates_review_proposal_without_mutation() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let daily_path = vault_path.join("life/Journal/Daily/2026/2026-09/2026-09-27.md");
    let vault = MutableVault::new(&vault_path);
    let context = MutableContext::new("vault-a");
    let (application, _, results) = new_application(
        &directory,
        &vault,
        context,
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let prompt = "Please add a note to today's Daily Record: 'Completed the synthetic collaboration acceptance task.' Show the exact note proposal and wait for my approval before saving.";

    application
        .submit_message("vault-a", &session.id, "2026-09-27", prompt)
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");

    let result = results.lock().unwrap()[0].clone();
    assert!(result.success, "{}", result.text);
    let proposal = application
        .session("vault-a", &session.id)
        .unwrap()
        .task_operations
        .into_iter()
        .find(|operation| operation.status == "awaitingApproval")
        .expect("the exact Daily Record note should be available for approval");
    assert!(matches!(
        proposal.operation,
        CollaborationTaskOperation::SaveEveningReview {
            mode: personal_dashboard_lib::today::CollaborationEveningReviewMode::Addition,
            ref content,
        } if content == "Completed the synthetic collaboration acceptance task."
    ));
    assert!(!daily_path.exists(), "preparing a note must not write it");
}

#[test]
fn evening_addition_creates_missing_daily_record_and_recovers_receipt_after_restart() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let daily_path = prepare_daily_review_vault(&vault_path, false);
    fs::remove_file(&daily_path).unwrap();
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
    assert!(matches!(
        &proposal.baseline,
        personal_dashboard_lib::collaboration::CollaborationTaskOperationBaseline::DailyReview {
            revision: None,
            ..
        }
    ));
    assert!(matches!(
        &proposal.operation,
        CollaborationTaskOperation::SaveEveningReview {
            mode: personal_dashboard_lib::today::CollaborationEveningReviewMode::Addition,
            ..
        }
    ));
    assert!(!daily_path.exists());

    fail_next_save.store(true, Ordering::SeqCst);
    assert!(application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap_err()
        .contains("saved"));
    let created = fs::read_to_string(&daily_path).unwrap();
    assert!(created.starts_with("---\ntype: daily-record\ndate: 2026-09-27\n---\n# 2026-09-27\n"));
    assert!(created.contains("## 白天更新"));
    assert!(created.contains("## 晚间复盘"));
    assert!(created.contains("I finished the synthetic evening review."));
    assert!(!created.contains("## 早间基准"));
    assert_eq!(created.matches(&format!("id={} ", proposal.id)).count(), 1);
    assert!(!vault_path
        .join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH)
        .exists());
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
        .result_snapshot
        .as_ref()
        .is_some_and(|snapshot| matches!(
            snapshot,
            personal_dashboard_lib::collaboration::CollaborationTaskOperationBaseline::DailyReview {
                revision: Some(_),
                ..
            }
        )));
    assert_eq!(
        fs::read_to_string(&daily_path)
            .unwrap()
            .matches(&format!("id={} ", proposal.id))
            .count(),
        1
    );
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock)
        .read_date("2026-09-27")
        .unwrap();
    assert_eq!(
        today.state,
        personal_dashboard_lib::today::TodayState::Ready
    );
    assert!(today
        .evening
        .additions
        .iter()
        .any(|line| line.contains("synthetic evening review")));
}

#[test]
fn missing_daily_record_rejects_evening_review_correction_before_proposal() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let daily_path = prepare_daily_review_vault(&vault_path, false);
    fs::remove_file(&daily_path).unwrap();
    let vault = MutableVault::new(&vault_path);
    let (application, _, results) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message("vault-a", &session.id, "2026-09-27", "evening correction")
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");
    let view = application.session("vault-a", &session.id).unwrap();
    assert!(view.task_operations.is_empty());
    assert!(results.lock().unwrap().last().is_some_and(
        |result| !result.success && result.text.contains("no existing evening review")
    ));
    assert!(!daily_path.exists());
}

#[test]
fn missing_record_proposal_conflicts_if_the_target_appears_before_approval() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let daily_path = prepare_daily_review_vault(&vault_path, false);
    fs::remove_file(&daily_path).unwrap();
    let vault = MutableVault::new(&vault_path);
    let (application, _, _) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let proposal = submit_for_proposal(&application, &session.id, "evening addition");
    let external = "---\ntype: daily-record\ndate: 2026-09-27\n---\n# 2026-09-27\n\n## 晚间复盘\n\n### 今天发生了什么\n\n- Concurrent user-authored review.\n";
    fs::write(&daily_path, external).unwrap();

    let conflict = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(conflict.task_operations[0].status, "conflict");
    assert_eq!(fs::read_to_string(&daily_path).unwrap(), external);

    let refreshed = application
        .refresh_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert!(matches!(
        &refreshed.task_operations[0].baseline,
        personal_dashboard_lib::collaboration::CollaborationTaskOperationBaseline::DailyReview {
            account,
            revision: Some(_),
            ..
        } if account.iter().any(|line| line.contains("Concurrent user-authored review"))
    ));
    assert_eq!(refreshed.task_operations[0].status, "awaitingApproval");
    let saved = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(saved.task_operations[0].status, "applied");
    let document = fs::read_to_string(&daily_path).unwrap();
    assert!(document.contains("Concurrent user-authored review."));
    assert!(document.contains("I finished the synthetic evening review."));
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

#[test]
fn automatic_plan_triggers_at_configured_local_time_and_restart_does_not_duplicate_it() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let context = MutableContext::new("vault-a");
    let clock = ManualClock::new("2026-09-27", "06:59");
    let task_path = vault_path.join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH);
    let tasks = TaskApplication::new(vault.clone(), clock.clone(), FileTaskStore);
    let empty_tasks = tasks.read().unwrap();
    tasks
        .create(TaskCreateInput {
            target_binding: empty_tasks.target_binding.unwrap(),
            expected_revision: empty_tasks.revision,
            task_id: "existing-synthetic-task".into(),
            name: "Synthetic task to preserve".into(),
            content: Some("Keep this exact Task document unchanged.".into()),
            date: Some("2026-09-27".into()),
            time: None,
            list_id: None,
        })
        .unwrap();
    let task_bytes_before = fs::read(&task_path).unwrap();
    let (application, registered_tools, results, requests) =
        new_automatic_application(&directory, &vault, context.clone(), clock.clone(), None);

    let before_time = application
        .update_daily_plan_automation(enabled_automation("07:00"))
        .unwrap();
    assert!(
        before_time.current_run.is_none(),
        "the trigger must not run early"
    );
    assert!(application.list_sessions("2026-09-27").unwrap().is_empty());

    clock.set_time("07:00");
    let queued = application.check_daily_plan_automation().unwrap();
    let run_session_id = queued
        .current_run
        .as_ref()
        .and_then(|run| run.session_id.clone())
        .expect("the exact local trigger time queues a collaboration session");
    wait_for_finish(&application, &run_session_id, "vault-a");
    let completed = application.check_daily_plan_automation().unwrap();
    assert_eq!(completed.current_run.unwrap().state, "completed");

    let sessions = application.list_sessions("2026-09-27").unwrap();
    assert_eq!(sessions.len(), 1, "repeated checks must be idempotent");
    let session = application.session("vault-a", &run_session_id).unwrap();
    assert!(session.messages[0].automatic_plan);
    assert!(session.daily_plan_tool_available);
    assert!(
        !session.task_tool_available,
        "automatic runs register only the plan operation"
    );
    assert_eq!(session.task_operations.len(), 1);
    assert_eq!(session.task_operations[0].status, "applied");
    assert!(session.task_operations[0].automatic_plan);
    assert!(matches!(
        session.task_operations[0].operation,
        CollaborationTaskOperation::SaveDailyPlan {
            transition: DailyPlanTransition::InitialPlan,
            ..
        }
    ));
    assert_eq!(fs::read(&task_path).unwrap(), task_bytes_before);

    let today = TodayApplication::new(vault.clone(), NoVaultPicker, clock.clone());
    let saved = today.read_date("2026-09-27").unwrap();
    assert_eq!(saved.state, TodayState::Ready);
    assert_eq!(saved.timeline.len(), 2);
    assert_eq!(saved.baseline.timeline, saved.timeline);
    assert!(saved.time_axis.confirmed_facts.is_empty());

    let registered = registered_tools.lock().unwrap();
    assert_eq!(registered.len(), 1);
    assert_eq!(registered[0]["name"], "dashboard_task_operation");
    let variants = registered[0]["inputSchema"]["oneOf"].as_array().unwrap();
    assert!(variants
        .iter()
        .any(|variant| { variant["properties"]["operation"]["const"] == "saveDailyPlan" }));
    assert!(!variants
        .iter()
        .any(|variant| { variant["properties"]["operation"]["const"] == "createTask" }));
    drop(registered);
    let delivery_results = results.lock().unwrap();
    assert_eq!(
        delivery_results.len(),
        1,
        "duplicate tool delivery is deduplicated"
    );
    assert!(delivery_results[0].success);
    drop(delivery_results);
    let sent = requests.lock().unwrap();
    assert_eq!(sent.len(), 1);
    assert!(sent[0].user_text.contains("plan only the remaining day"));
    assert!(sent[0]
        .context
        .daily_record
        .items
        .contains(&"Synthetic baseline".into()));
    assert_eq!(sent[0].context.tasks.state, "ready");
    assert_eq!(sent[0].context.habits.state, "ready");
    drop(sent);

    let reopened = new_automatic_application(&directory, &vault, context, clock, None).0;
    let recovered = reopened.check_daily_plan_automation().unwrap();
    assert_eq!(recovered.settings.time, "07:00");
    assert_eq!(recovered.current_run.unwrap().state, "completed");
    assert_eq!(reopened.list_sessions("2026-09-27").unwrap().len(), 1);
}

#[test]
fn late_open_generates_only_a_remaining_day_plan_from_current_synthetic_context() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let clock = ManualClock::new("2026-09-27", "15:00");
    let (application, _, results, requests) = new_automatic_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        clock,
        None,
    );

    let queued = application
        .update_daily_plan_automation(enabled_automation("06:00"))
        .unwrap();
    let session_id = queued
        .current_run
        .as_ref()
        .and_then(|run| run.session_id.clone())
        .expect("opening after the schedule queues a late plan");
    wait_for_finish(&application, &session_id, "vault-a");
    let request = requests.lock().unwrap().first().cloned().unwrap();
    assert!(request.user_text.contains("Current local time: 15:00"));
    assert!(request
        .user_text
        .contains("Do not claim past planned time happened"));
    let session = application.session("vault-a", &session_id).unwrap();
    let tool_results = results.lock().unwrap().clone();
    assert!(
        tool_results[0].success,
        "automatic tool result: {tool_results:?}"
    );
    let CollaborationTaskOperation::SaveDailyPlan { arrangement, .. } =
        &session.task_operations[0].operation
    else {
        panic!("automatic run saved a structured Daily Record plan")
    };
    assert_eq!(arrangement[0].period, "later today");
    assert_ne!(arrangement[0].period, "morning");
}

#[test]
fn a_plan_created_after_queueing_is_rechecked_and_preserved_before_automatic_write() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let clock = ManualClock::new("2026-09-27", "08:00");
    let gate = Arc::new(AutomaticTurnGate::default());
    let (application, _, results, _) = new_automatic_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        clock.clone(),
        Some(Arc::clone(&gate)),
    );
    let queued = application
        .update_daily_plan_automation(enabled_automation("06:00"))
        .unwrap();
    let session_id = queued
        .current_run
        .as_ref()
        .and_then(|run| run.session_id.clone())
        .expect("due schedule queues an automatic run");
    gate.wait_until_entered();

    let today = TodayApplication::new(vault.clone(), NoVaultPicker, clock);
    initial_fixture_plan(&today, "user-plan-before-auto", "User's current plan");
    let before = fs::read(record_path(&vault_path)).unwrap();
    gate.release();
    wait_for_finish(&application, &session_id, "vault-a");

    let run = application
        .daily_plan_automation()
        .unwrap()
        .current_run
        .unwrap();
    assert_eq!(run.state, "existingPlan");
    assert_eq!(fs::read(record_path(&vault_path)).unwrap(), before);
    assert!(application
        .session("vault-a", &session_id)
        .unwrap()
        .task_operations
        .is_empty());
    assert!(results.lock().unwrap()[0].success);
}

#[test]
fn damaged_record_and_record_read_failure_are_distinguished_without_overwrite() {
    for (name, kind, expected_state) in [
        ("damaged", "invalid-utf8", "damagedRecord"),
        ("unreadable", "directory", "readError"),
    ] {
        let directory = IsolatedDirectory::new();
        let vault_path = directory.vault(name);
        let target = record_path(&vault_path);
        fs::create_dir_all(target.parent().unwrap()).unwrap();
        if kind == "invalid-utf8" {
            fs::write(&target, [0xff, 0xfe]).unwrap();
        } else {
            fs::create_dir(&target).unwrap();
        }
        let before = if target.is_file() {
            Some(fs::read(&target).unwrap())
        } else {
            None
        };
        let vault = MutableVault::new(&vault_path);
        let clock = ManualClock::new("2026-09-27", "09:00");
        let (application, _, _, _) = new_automatic_application(
            &directory,
            &vault,
            MutableContext::new("vault-a"),
            clock,
            None,
        );

        let view = application
            .update_daily_plan_automation(enabled_automation("06:00"))
            .unwrap();
        assert_eq!(view.current_run.unwrap().state, expected_state);
        assert!(application.list_sessions("2026-09-27").unwrap().is_empty());
        if let Some(before) = before {
            assert_eq!(fs::read(&target).unwrap(), before);
        } else {
            assert!(target.is_dir(), "unreadable target is preserved");
        }
    }
}

#[test]
fn existing_valid_plan_is_preserved_without_starting_an_automatic_session() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let clock = ManualClock::new("2026-09-27", "09:15");
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, clock.clone());
    initial_fixture_plan(&today, "preexisting-plan", "Already saved by the user");
    let record_before = fs::read(record_path(&vault_path)).unwrap();
    let application = new_automatic_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        clock,
        None,
    )
    .0;

    let view = application
        .update_daily_plan_automation(enabled_automation("06:00"))
        .unwrap();
    assert_eq!(view.current_run.unwrap().state, "existingPlan");
    assert!(application.list_sessions("2026-09-27").unwrap().is_empty());
    assert_eq!(fs::read(record_path(&vault_path)).unwrap(), record_before);
}

#[test]
fn selected_vault_change_between_queue_and_tool_write_fails_closed() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let context = MutableContext::new("vault-a");
    let clock = ManualClock::new("2026-09-27", "08:00");
    let gate = Arc::new(AutomaticTurnGate::default());
    let (application, _, results, _) = new_automatic_application(
        &directory,
        &vault,
        context.clone(),
        clock,
        Some(Arc::clone(&gate)),
    );
    let queued = application
        .update_daily_plan_automation(enabled_automation("06:00"))
        .unwrap();
    let session_id = queued
        .current_run
        .as_ref()
        .and_then(|run| run.session_id.clone())
        .expect("due schedule queues an automatic run");
    gate.wait_until_entered();

    context.select("vault-b");
    gate.release();
    wait_for_finish(&application, &session_id, "vault-a");
    context.select("vault-a");

    let run = application
        .daily_plan_automation()
        .unwrap()
        .current_run
        .unwrap();
    assert_eq!(run.state, "needsReview");
    assert!(run.message.contains("Vault changed"));
    assert!(!record_path(&vault_path).exists());
    assert!(!vault_path
        .join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH)
        .exists());
    assert!(!results.lock().unwrap()[0].success);
}

#[test]
fn stopping_a_queued_automatic_run_is_persisted_and_does_not_requeue() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let clock = ManualClock::new("2026-09-27", "08:00");
    let gate = Arc::new(AutomaticTurnGate::default());
    let application = new_automatic_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        clock,
        Some(Arc::clone(&gate)),
    )
    .0;

    let holder = application.create_session("2026-09-27").unwrap();
    application
        .submit_message("vault-a", &holder.id, "2026-09-27", "hold-worker")
        .unwrap();
    gate.wait_until_entered();
    let queued = application
        .update_daily_plan_automation(enabled_automation("06:00"))
        .unwrap();
    let run = queued.current_run.unwrap();
    let auto_session = application
        .session("vault-a", run.session_id.as_deref().unwrap())
        .unwrap();
    let stopped = application
        .stop_run_for_selected_vault(&auto_session.id, auto_session.run_id.as_deref().unwrap())
        .unwrap();
    assert_eq!(stopped.run_state, "stopped");
    gate.release();
    wait_for_finish(&application, &holder.id, "vault-a");

    let checked = application.check_daily_plan_automation().unwrap();
    assert_eq!(checked.current_run.unwrap().state, "stopped");
    assert_eq!(application.list_sessions("2026-09-27").unwrap().len(), 2);
    assert!(!record_path(&vault_path).exists());
}

#[test]
fn valid_empty_daily_record_can_receive_the_single_automatic_initial_plan() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let target = record_path(&vault_path);
    fs::create_dir_all(target.parent().unwrap()).unwrap();
    fs::write(
        &target,
        "---\ntype: daily-record\ndate: 2026-09-27\n---\n# 2026-09-27\n\n## 今天的大致安排\n\n## 计划依据\n\n## 白天更新\n\n## 晚间复盘\n",
    )
    .unwrap();
    let vault = MutableVault::new(&vault_path);
    let clock = ManualClock::new("2026-09-27", "09:15");
    let (application, _, _, _) = new_automatic_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        clock.clone(),
        None,
    );

    let queued = application
        .update_daily_plan_automation(enabled_automation("06:00"))
        .unwrap();
    let session_id = queued
        .current_run
        .as_ref()
        .and_then(|run| run.session_id.clone())
        .expect("valid empty record is eligible for an initial plan");
    wait_for_finish(&application, &session_id, "vault-a");
    let saved = TodayApplication::new(vault, NoVaultPicker, clock)
        .read_date("2026-09-27")
        .unwrap();
    assert_eq!(saved.state, TodayState::Ready);
    assert_eq!(saved.timeline.len(), 2);
    assert!(saved.evidence.iter().any(|group| group.label == "Tasks"));
}
