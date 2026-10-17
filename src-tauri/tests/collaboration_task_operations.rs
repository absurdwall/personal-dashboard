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
use personal_dashboard_lib::collaboration_memory::{
    CollaborationMemoryService, CollaborationMemorySources, LongTermMemoryDocumentView,
    SelectedVaultCollaborationMemoryService,
};
use serde_json::{json, Value};
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
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
        "2026-09-27T09:15-04:00".into()
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

// Adapt only the fixture context key; persistence uses the production selected-
// Vault memory service and its real revision/atomic-write checks.
struct FixtureMemoryService {
    inner: SelectedVaultCollaborationMemoryService,
    actual_key: String,
}

impl FixtureMemoryService {
    fn new(directory: &IsolatedDirectory, vault: &MutableVault) -> Self {
        let path = vault.load_selected_vault().unwrap().unwrap();
        fs::create_dir_all(path.join("life")).unwrap();
        if !path.join("life/Self.md").exists() {
            fs::write(
                path.join("life/Self.md"),
                "# Synthetic durable background\n",
            )
            .unwrap();
        }
        let workspace = directory.path().join("memory-workspace.json");
        fs::write(
            &workspace,
            serde_json::to_vec(&json!({"schemaVersion":1, "selectedVault":path})).unwrap(),
        )
        .unwrap();
        let mut hasher = DefaultHasher::new();
        path.canonicalize().unwrap().hash(&mut hasher);
        Self {
            inner: SelectedVaultCollaborationMemoryService::new(workspace),
            actual_key: format!("vault-{:016x}", hasher.finish()),
        }
    }
}

impl CollaborationMemoryService for FixtureMemoryService {
    fn read(&self, expected: Option<&str>) -> Result<CollaborationMemorySources, String> {
        if expected != Some("vault-a") {
            return Err("fixture Vault changed".into());
        }
        self.inner.read(Some(&self.actual_key))
    }

    fn save_long_term(
        &self,
        expected: &str,
        revision: &str,
        content: &str,
    ) -> Result<LongTermMemoryDocumentView, String> {
        if expected != "vault-a" {
            return Err("fixture Vault changed".into());
        }
        self.inner
            .save_long_term(&self.actual_key, revision, content)
    }
}

#[derive(Clone)]
struct DynamicRuntime {
    registered_tools: Arc<Mutex<Vec<Value>>>,
    results: Arc<Mutex<Vec<RuntimeDynamicToolResult>>>,
    requests: Arc<Mutex<Vec<RuntimeTurnRequest>>>,
    automatic_gate: Option<Arc<AutomaticTurnGate>>,
    external_writes_allowed: bool,
    starts: Arc<Mutex<Vec<String>>>,
}

impl AppServerTransport for DynamicRuntime {
    fn configure_external_writes(&mut self, allowed: bool) {
        self.external_writes_allowed = allowed;
    }
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
        instructions: &str,
        dynamic_tools: Vec<Value>,
    ) -> Result<String, String> {
        *self
            .registered_tools
            .lock()
            .map_err(|_| "tool lock poisoned")? = dynamic_tools;
        let mut starts = self.starts.lock().unwrap();
        starts.push(instructions.to_owned());
        Ok(format!("synthetic-thread-{}", starts.len()))
    }

    fn resume_thread(&mut self, thread_id: &str) -> Result<(), String> {
        if thread_id.starts_with("synthetic-thread-") {
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
        if request.user_text == "请先整理白天情况，暂时不要保存：上午已读完报告；晚饭后计划整理书桌，尚未完成。" {
            return Ok(RuntimeTurnResult { text: "待保存白天记录：上午已读完报告；晚饭后计划整理书桌，尚未完成。".into(),
                runtime_turn_id: Some(format!("turn-{}", request.execution_id)), stopped: false, external_actions: Vec::new() });
        }
        if request.user_text.starts_with("请更新此隔离 Vault 的长期背景") || request.user_text.starts_with("不要更新此隔离 Vault 的长期背景") {
            let quote=request.user_text.split("这次不要改").next().unwrap().trim();
            let change="我长期偏好先写简短复盘，再调整计划；未记录的活动保持未知。";
            let result=handler(RuntimeDynamicToolCall{thread_id:request.thread_id.clone(),turn_id:format!("turn-{}",request.execution_id),call_id:"target-qualified-memory".into(),tool:"dashboard_memory_update".into(),arguments:json!({"operation":"proposeLongTermUpdate","basis":"explicitUserInstruction","executionMode":"execute","authorizationQuote":quote,"change":change,"replaces":null})});
            self.results.lock().unwrap().push(result);
            return Ok(RuntimeTurnResult{text:"Verify the existing long-term document; other domains retain their state.".into(),runtime_turn_id:Some(format!("turn-{}",request.execution_id)),stopped:false,external_actions:vec![]});
        }
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
            assert!(request.automatic_morning);
            assert!(!self.external_writes_allowed, "Automatic morning application round must configure native Dida read-only before thread selection");
            if let Some(gate) = &self.automatic_gate {
                gate.block_automatic_turn();
            }
        }
        // External model boundary fixture: its emitted calls consume the real
        // registered history dispatcher and file adapters. No product routing.
        if matches!(request.user_text.as_str(), "/retro" | "请复盘2026-09-26到2026-09-27的计划、实际、Task和Habit，先讨论建议，不要修改。") {
            if !self.starts.lock().unwrap().last().is_some_and(|text| text.contains("# Personal retro")) {
                return Err("Personal retro reference was not loaded in the human usage package".into());
            }
            let dates = serde_json::to_value(&request.dates).unwrap();
            // The scripted model emits a known explicit range for this second
            // request. Natural-language interpretation remains a live11 gate.
            let explicit = json!({"fromDate":"2026-09-26","toDate":"2026-09-27"});
            let period = if request.user_text == "/retro" { &dates["defaultPersonalRetroPeriod"] } else { &explicit };
            if !period["fromDate"].is_string() || !period["toDate"].is_string() {
                return Err("Captured seven-complete-lived-day period is unavailable".into());
            }
            let mut sources = Vec::new();
            for domain in ["tasks", "dailyRecords", "habits"] {
                let result = handler(RuntimeDynamicToolCall {
                    thread_id: request.thread_id.clone(), turn_id: format!("turn-{}", request.execution_id),
                    call_id: format!("retro-{domain}"), tool: "dashboard_read_history".into(),
                    arguments: json!({"domain":domain,"fromDate":period["fromDate"],"toDate":period["toDate"]}),
                });
                self.results.lock().unwrap().push(result.clone());
                if !result.success { return Err(result.text); }
                sources.push(serde_json::from_str::<Value>(&result.text).map_err(|e| e.to_string())?);
            }
            let tasks = &sources[0]; let records = &sources[1]; let habits = &sources[2];
            let record = records["records"].as_array().unwrap().iter().find(|record| record["state"] == "ready").unwrap();
            let task = &tasks["tasks"][0]; let local = &habits["canonical"]["records"][0];
            let text = format!("**Personal retro · {}–{}**\n\n- Morning baseline: {}\n- Current arrangement: {}\n- Recorded actual: {} [Daytime source]({})\n- [Task source](dashboard://task/{}) scheduled {}; completed {} at an unknown time.\n- [Habit source](dashboard://habit/{}?date={}) local state {}; published projection {} ({}).\n\nMissing dates remain unknown; no duration or wasted time inferred. Optional live Dida is unavailable; local evidence remains usable. Suggestions are discussion; no history or plans changed.",
                period["fromDate"].as_str().unwrap(),period["toDate"].as_str().unwrap(),
                record["baseline"]["timeline"][0]["title"].as_str().unwrap(),record["currentArrangement"][0]["title"].as_str().unwrap(),
                record["daytime"]["updates"][0]["observedFacts"][0].as_str().unwrap(),record["links"]["daytime"].as_str().unwrap(),
                task["id"].as_str().unwrap(),task["date"].as_str().unwrap(),task["completion"]["completedOn"].as_str().unwrap(),
                local["habitKey"].as_str().unwrap(),local["livedDate"].as_str().unwrap(),local["state"].as_str().unwrap(),
                habits["projection"]["state"].as_str().unwrap(),habits["projection"]["generatedAt"].as_str().unwrap_or("unavailable"));
            return Ok(RuntimeTurnResult {text,runtime_turn_id:Some(format!("turn-{}",request.execution_id)),stopped:false,external_actions:Vec::new()});
        }
        if request.user_text == "采用刚才的建议：在本地新增下一步 Task，名为 Retro adopted next step，安排2026-09-28。" {
            let result=handler(RuntimeDynamicToolCall {thread_id:request.thread_id.clone(),turn_id:format!("turn-{}",request.execution_id),call_id:"retro-adoption".into(),tool:"dashboard_task_operation".into(),arguments:json!({"operation":"createTask","name":"Retro adopted next step","content":null,"date":"2026-09-28","time":null,"listId":null,"executionMode":"execute"})});
            self.results.lock().unwrap().push(result.clone());
            if !result.success {return Err(result.text);}
            return Ok(RuntimeTurnResult {text:result.text,runtime_turn_id:Some(format!("turn-{}",request.execution_id)),stopped:false,external_actions:Vec::new()});
        }
        if matches!(request.user_text.as_str(), "read task history" | "read record history" | "read habit history") {
            let result = handler(RuntimeDynamicToolCall {
                thread_id: request.thread_id.clone(), turn_id: format!("turn-{}", request.execution_id),
                call_id: "history-read".into(), tool: "dashboard_read_history".into(),
                arguments: json!({"domain":match request.user_text.as_str() { "read task history" => "tasks", "read habit history" => "habits", _ => "dailyRecords" },"fromDate":"2026-09-24","toDate":"2026-09-27"}),
            });
            self.results.lock().unwrap().push(result);
            return Ok(RuntimeTurnResult { text: "History read; missing activity remains unknown.".into(), runtime_turn_id: Some(format!("turn-{}", request.execution_id)), stopped: false, external_actions: Vec::new() });
        }
        if automatic_plan {
            // Even a transport delivering a tool outside the advertised narrow
            // schema cannot expand this automatic round's write authority.
            for (tool, arguments) in [
                ("dashboard_task_operation", json!({"operation":"createTask", "name":"Unauthorized automatic Task", "content":null, "date":null, "time":null, "listId":null})),
                ("dashboard_memory_update", json!({"operation":"proposeLongTermUpdate", "basis":"explicitUserInstruction", "executionMode":"execute", "authorizationQuote":request.user_text, "change":"Unauthorized automatic memory", "replaces":null})),
            ] {
                let rejected = handler(RuntimeDynamicToolCall {
                    thread_id: request.thread_id.clone(), turn_id: format!("turn-{}", request.execution_id),
                    call_id: format!("unauthorized-{tool}"), tool: tool.into(), arguments,
                });
                if rejected.success { return Err("automatic round expanded its write authority".into()); }
            }
        }
        if matches!(request.user_text.as_str(), "补记：昨天洗衣服做完了" | "补记：9月25日18:00洗衣服做完了") {
            let dated = request.user_text.contains("18:00");
            let mut task_id = String::new();
            for (index, mut args) in [
                json!({"operation":"createTask", "name":"洗衣服", "content":null, "date":null, "time":null, "listId":null}),
                json!({"operation":"completeTask", "taskId":"", "targetDate":if dated {"2026-09-25"} else {"2026-09-26"}, "completedTime":if dated {json!("18:00")} else {Value::Null}}),
            ].into_iter().enumerate() {
                args["executionMode"] = json!("execute");
                args["authorizationQuote"] = json!(request.user_text);
                if index == 1 { args["taskId"] = json!(task_id); }
                let call = RuntimeDynamicToolCall {
                    thread_id: request.thread_id.clone(), turn_id: format!("turn-{}", request.execution_id),
                    call_id: format!("historical-task-{index}"), tool: "dashboard_task_operation".into(), arguments: args,
                };
                let first = handler(call.clone());
                let repeated = handler(call);
                if first != repeated { return Err("historical Task duplicate delivery changed its result".into()); }
                if !first.success { return Err(first.text); }
                let receipt: Value = serde_json::from_str(&first.text).map_err(|error| error.to_string())?;
                if index == 0 { task_id = receipt["taskId"].as_str().unwrap().to_owned(); }
                self.results.lock().unwrap().push(first);
            }
            return Ok(RuntimeTurnResult { text: "Synthetic historical Task sequence completed.".into(),
                runtime_turn_id: Some(format!("turn-{}", request.execution_id)), stopped:false, external_actions:Vec::new() });
        }
        // Controlled resolver output exercises the date protocol and persisted
        // results without claiming these fixtures test model language quality.
        let (call_id, tool, mut arguments) = if request.user_text.contains("refresh habits") || (request.user_text.contains("生成发布习惯快照") || request.user_text.contains("生成习惯快照") || request.user_text.contains("刷新习惯")) {
            ("habit-refresh-call", "dashboard_refresh_habits", habit_refresh_fixture(&request.user_text))
        } else if let Some(arguments) = natural_daily_fixture(&request.user_text) {
            ("natural-daily-call", "dashboard_task_operation", arguments)
        } else if let Some(arguments) = request.user_text.strip_prefix("date-fixture:").or_else(|| request.user_text.strip_prefix("single-date-fixture:")) {
            ("resolved-date-call", "dashboard_task_operation", serde_json::from_str(arguments).unwrap())
        } else if let Some(arguments) = request.user_text.strip_prefix("memory-fixture:") {
            ("resolved-memory-call", "dashboard_memory_update", serde_json::from_str(arguments).unwrap())
        } else if matches!(request.user_text.as_str(), "下周五我要买菜" | "也许下周五可以买菜" | "以后再创建买菜任务" | "下周五我要买菜，加到滴答") {
            ("natural-create-task", "dashboard_task_operation", json!({"operation":"createTask", "executionMode":"execute",
                "authorizationQuote":request.user_text, "name":"买菜", "content":null,
                "date":if request.user_text.contains("下周五") {json!("2026-10-02")} else {Value::Null}, "time":null, "listId":null}))
        } else if request.user_text == "我要整理书架，不安排日期" {
            ("natural-undated-task", "dashboard_task_operation", json!({"operation":"createTask", "executionMode":"execute", "authorizationQuote":request.user_text,
                "name":"整理书架", "content":null, "date":null, "time":null, "listId":null}))
        } else if matches!(request.user_text.as_str(), "洗衣服做完了" | "洗衣服没做完" | "滴答里的洗衣服做完了") {
            ("natural-complete-task", "dashboard_task_operation", json!({"operation":"completeTask", "taskId":"laundry-task", "completedTime":null,
                "executionMode":"execute", "authorizationQuote":request.user_text}))
        } else if request.user_text
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
        } else if request.user_text == "create task" || request.user_text == "missing current execution mode" {
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
        } else if request.user_text
            == "Record a daytime event in today's Daily Record: 'Synthetic daytime event for acceptance.' Show the exact proposal and wait for approval before saving."
        {
            (
                "daytime-event-proposal-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "saveDailyPlan",
                    "transition": "daytimeEvent",
                    "arrangement": [],
                    "evidence": [],
                    "calibrationNote": null,
                    "baselineCorrectionReason": null,
                    "event": "Synthetic daytime event for acceptance.",
                    "originalIntent": null,
                    "changeReason": null,
                    "revisedDirection": null,
                    "executionMode": "prepareProposal",
                    "authorizationQuote": request.user_text.clone()
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
        } else if request.user_text == "unsupported note operation" {
            (
                "unsupported-note-operation-call-id",
                "dashboard_task_operation",
                json!({
                    "operation": "appendDailyRecord",
                    "executionMode": "prepareProposal",
                    "authorizationQuote": request.user_text,
                    "targetDate": "2026-09-27",
                    "text": "Synthetic note"
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
        if arguments.get("operation").and_then(Value::as_str)==Some("setLocalHabitCompletion") {
            let scope=if arguments.get("completed")==Some(&json!(false)) {"original"}else{"local"};
            arguments.as_object_mut().unwrap().entry("scope").or_insert(json!(scope));
        }
        if !automatic_plan && request.user_text != "missing current execution mode" {
            arguments.as_object_mut().unwrap().entry("executionMode")
                .or_insert(json!("prepareProposal"));
        }
        let call = RuntimeDynamicToolCall {
            thread_id: request.thread_id.clone(),
            turn_id: format!("turn-{}", request.execution_id),
            call_id: call_id.into(),
            tool: tool.into(),
            arguments,
        };
        let first_delivery = handler(call.clone());
        let duplicate_delivery = if request.user_text.starts_with("single-date-fixture:") {
            first_delivery.clone()
        } else { handler(call) };
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

#[test]
fn collaboration_defaults_share_the_lived_day_and_preserve_explicit_session_history() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    prepare_daily_review_vault(&vault_path, false);
    let vault = MutableVault::new(&vault_path);
    let clock = ManualClock::new("2026-09-27", "03:59");
    let (application, _, _, _) = new_automatic_application(
        &directory, &vault, MutableContext::new("vault-a"), clock.clone(), None,
    );
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, clock.clone());
    let session = application.create_default_session().unwrap();
    assert_eq!(session.target_date, "2026-09-26");
    assert_eq!(today.read().unwrap().date, session.target_date);
    assert_eq!(today.habits().unwrap().habits[0].today.date, session.target_date);
    application.save_draft_for_selected_vault(&session.id, "2026-09-26", "Original late-night draft").unwrap();
    clock.set_time("04:00");
    let next = application.create_default_session().unwrap();
    assert_eq!(next.target_date, "2026-09-27");
    assert_eq!(today.read().unwrap().date, next.target_date);
    assert_eq!(today.habits().unwrap().habits[0].today.date, next.target_date);
    let original = application.session("vault-a", &session.id).unwrap();
    assert_eq!(original.created_date, "2026-09-26");
    assert_eq!(original.target_date, "2026-09-26");
    assert_eq!(original.draft, "Original late-night draft");
    let explicit = application.create_session("2026-09-07").unwrap();
    assert_eq!(explicit.target_date, "2026-09-07");
}

#[test]
fn resolved_record_date_preserves_request_identity_and_writes_the_exact_review_date() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let original_path = prepare_daily_review_vault(&vault_path, false);
    let original = fs::read(&original_path).unwrap();
    let vault = MutableVault::new(&vault_path);
    let clock = ManualClock::new("2026-09-27", "01:00");
    let (application, _, results, requests) = new_automatic_application(
        &directory, &vault, MutableContext::new("vault-a"), clock, None,
    );
    let session = application.create_default_session().unwrap();
    let text = format!("date-fixture:{}", json!({
        "operation": "saveEveningReview", "targetDate": "2026-09-25",
        "executionMode": "prepareProposal", "authorizationQuote": "",
        "mode": "addition", "content": "An explicitly dated historical review."
    }));
    application.submit_message("vault-a", &session.id, &session.target_date, &text).unwrap();
    wait_for_finish(&application, &session.id, "vault-a");
    assert!(results.lock().unwrap()[0].success);
    let proposal = application.session("vault-a", &session.id).unwrap().task_operations[0].clone();
    assert_eq!(proposal.target_date, "2026-09-25");
    let destination = vault_path.join("life/Journal/Daily/2026/2026-09/2026-09-25.md");
    assert!(!destination.exists());
    let sent = requests.lock().unwrap();
    assert_eq!(sent[0].dates.natural_date, "2026-09-27");
    assert_eq!(sent[0].dates.lived_date, "2026-09-26");
    assert_eq!(sent[0].dates.target_date, "2026-09-26");
    assert_eq!(sent[0].context.date, "2026-09-26");
    drop(sent);
    application.approve_task_operation_for_selected_vault(&session.id, &proposal.id).unwrap();
    let saved = fs::read_to_string(destination).unwrap();
    assert!(saved.starts_with("---\ntype: daily-record\ndate: 2026-09-25\n"));
    assert!(saved.contains("An explicitly dated historical review."));
    assert_eq!(fs::read(original_path).unwrap(), original);
    let completed = application.session("vault-a", &session.id).unwrap();
    assert!(completed.messages.iter().all(|message| message.target_date == "2026-09-26"));
    assert!(completed.messages.iter().all(|message| message.message_date == "2026-09-27"));
}

#[test]
fn resolved_habit_date_uses_existing_completion_storage_and_keeps_external_sources_read_only() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    prepare_daily_review_vault(&vault_path, false);
    let snapshot_path = vault_path.join("life/.personal-dashboard/derived/habits-v1.json");
    let snapshot = fs::read(&snapshot_path).unwrap();
    let vault = MutableVault::new(&vault_path);
    let clock = ManualClock::new("2026-09-27", "01:00");
    let (application, _, _, _) = new_automatic_application(
        &directory, &vault, MutableContext::new("vault-a"), clock, None,
    );
    let session = application.create_default_session().unwrap();
    let text = format!("date-fixture:{}", json!({
        "operation": "setLocalHabitCompletion", "targetDate": "2026-09-07",
        "executionMode": "prepareProposal", "authorizationQuote": "",
        "habitKey": "exercise", "completed": true
    }));
    application.submit_message("vault-a", &session.id, &session.target_date, &text).unwrap();
    wait_for_finish(&application, &session.id, "vault-a");
    let proposal = application.session("vault-a", &session.id).unwrap().task_operations[0].clone();
    assert_eq!(proposal.target_date, "2026-09-07");
    let completed = application.approve_task_operation_for_selected_vault(&session.id, &proposal.id).unwrap();
    assert_eq!(completed.task_operations[0].status, "applied");
    let saved: Value = serde_json::from_slice(&fs::read(vault_path.join("life/.personal-dashboard/habit-completions/v1/completions.json")).unwrap()).unwrap();
    assert_eq!(saved["completions"][0]["livedDate"], "2026-09-07");
    assert_eq!(fs::read(snapshot_path).unwrap(), snapshot);
}

#[test]
fn queued_request_keeps_submission_dates_and_task_schedule_across_four_am() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let clock = ManualClock::new("2026-09-27", "03:59");
    let gate = Arc::new(AutomaticTurnGate::default());
    let (application, _, _, requests) = new_automatic_application(
        &directory, &vault, MutableContext::new("vault-a"), clock.clone(), Some(gate.clone()),
    );
    let session = application.create_default_session().unwrap();
    application.submit_message("vault-a", &session.id, &session.target_date, "hold-worker").unwrap();
    gate.wait_until_entered();
    let text = format!("date-fixture:{}", json!({
        "operation": "createTask", "executionMode": "prepareProposal", "authorizationQuote": "",
        "name": "Upcoming morning after sleep", "date": "2026-09-27", "time": "09:30",
        "content": null, "listId": null
    }));
    application.submit_message("vault-a", &session.id, &session.target_date, &text).unwrap();
    clock.set_time("04:00");
    let next_session = application.create_default_session().unwrap();
    assert_eq!(next_session.target_date, "2026-09-27");
    gate.release();
    wait_for_finish(&application, &session.id, "vault-a");
    let sent = requests.lock().unwrap();
    assert_eq!(sent.len(), 2);
    assert_eq!(sent[1].dates.current_local_timestamp, "2026-09-27T04:00:00-04:00");
    assert_eq!(sent[1].dates.natural_date, "2026-09-27");
    assert_eq!(sent[1].dates.lived_date, "2026-09-27");
    assert_eq!(sent[1].dates.request_local_timestamp, "2026-09-27T03:59:00-04:00");
    assert_eq!(sent[1].dates.request_lived_date, "2026-09-26");
    assert_eq!(sent[1].dates.target_date, "2026-09-26");
    drop(sent);
    let original = application.session("vault-a", &session.id).unwrap();
    let proposal = &original.task_operations[0];
    assert_eq!(proposal.target_date, "2026-09-26");
    application.approve_task_operation_for_selected_vault(&session.id, &proposal.id).unwrap();
    let tasks = TaskApplication::new(vault, clock, FileTaskStore).read().unwrap();
    assert_eq!(tasks.tasks.len(), 1);
    assert_eq!(tasks.tasks[0].date.as_deref(), Some("2026-09-27"));
    assert_eq!(tasks.tasks[0].time.as_deref(), Some("09:30"));
    let original = application.session("vault-a", &session.id).unwrap();
    assert_eq!(original.target_date, "2026-09-26");
    assert!(original.messages.iter().all(|message| message.target_date == "2026-09-26"));
    assert!(application.session("vault-a", &next_session.id).unwrap().task_operations.is_empty());
}

// This scripted resolver maps user narratives to known tool effects. The real
// application validates current-message authority and writes the isolated Vault.
// It tests orchestration, not the installed model's language interpretation.
fn habit_refresh_fixture(text: &str) -> Value {
    let catalog = json!({"type":"mcpToolCall","server":"dida365","tool":"list_habits","status":"completed", "arguments":{},
        "result":{"structuredContent":{"result":[{"id":"synthetic-habit","name":"Renamed test behavior"}]}}});
    let mut checkins = json!({"type":"mcpToolCall","server":"dida365","tool":"get_habit_checkins","status":"completed",
        "arguments":{"habit_ids":["synthetic-habit"],"from_stamp":20260705,"to_stamp":20260928,"client_timezone":"America/New_York"},
        "result":{"content":[{"type":"text","text":json!({"result":[{"habitId":"synthetic-habit","year":2026,"checkins":[{"id":"synthetic-checkin","stamp":20260927,"status":if text.contains("invalid status") {9} else {2},"opTime":"2026-09-27T13:00:00-04:00"}]}]}).to_string()}]}});
    if text.contains("现在请求日2026-10-04") {
        checkins["arguments"]["to_stamp"]=json!(20261005);
        let mut payload:Value=serde_json::from_str(checkins["result"]["content"][0]["text"].as_str().unwrap()).unwrap();
        payload["result"][0]["checkins"][0]["stamp"]=json!(20261003);
        checkins["result"]["content"][0]["text"]=json!(payload.to_string());
    }
    if text.contains("source reset") {
        let mut payload:Value=serde_json::from_str(checkins["result"]["content"][0]["text"].as_str().unwrap()).unwrap();
        payload["result"][0]["checkins"].as_array_mut().unwrap().push(json!({"id":"reset-checkin","stamp":20260927,"status":0,"opTime":"2026-09-27T14:00:00-04:00"}));
        checkins["result"]["content"][0]["text"]=json!(payload.to_string());
    }
    if text.contains("empty query") {checkins["result"]=json!({"content":[],"isError":false,"structuredContent":{"result":[]}});}
    let reads:Vec<Value> = if text.contains("failed query") {vec![]} else {[catalog,checkins].iter().filter_map(personal_dashboard_lib::habit_producer::native_source_read).collect()};
    let quote=match text {"我准备明天生成习惯快照。"=>"生成习惯快照","不要刷新习惯。"=>"刷新习惯",_=>text};
    json!({"mappings":{"exercise":"synthetic-habit"},"executionMode":"execute","authorizationQuote":quote,"hostSourceReads":reads})
}

fn natural_daily_fixture(text: &str) -> Option<Value> {
    let plan = |transition: &str, title: &str, event: Option<&str>| json!({
        "operation":"saveDailyPlan", "transition":transition,
        "arrangement": if transition == "daytimeEvent" { json!([]) } else { json!([{"period":"上午", "title":title, "detail":null}]) },
        "evidence":if transition=="daytimeEvent" { json!([]) } else {json!([{"label":"当前用户请求", "items":[text]}])}, "calibrationNote":if transition=="morningCalibration" {Some("上午优先处理急事")} else {None},
        "baselineCorrectionReason":if transition=="morningBaselineCorrection" {Some("早间基准原文写错")} else {None},
        "event":event, "originalIntent":if transition=="daytimeReplan" {Some("下午写报告")} else {None},
        "changeReason":if transition=="daytimeReplan" {Some("今天需要休息")} else {None},
        "revisedDirection":if transition=="daytimeReplan" {Some("报告挪到明天")} else {None}
    });
    let mut value = match text {
        "今天先安排上午写报告，下午散步。" => plan("initialPlan", "写报告", None),
        "校准今天安排，上午优先处理急事。" => plan("morningCalibration", "处理急事", None),
        "今天07:10起床，具体睡觉时刻不知道。" => plan("daytimeEvent", "", Some(text)),
        "把我上一条说的今天经过，记入 2026-10-04 Daily Record 的白天更新"
        | "你把那个东西 update 一下。" | "哦,授权,你就update就可以了" | "授权"
        | "授权？" | "不要保存白天更新" | "授权，先给我看方案"
        | "我授权，但明天再保存" | "授权，改写成已经整理完书桌" => {
            let mut resolved = plan("daytimeEvent", "", Some("上午已读完报告；晚饭后计划整理书桌，尚未完成。"));
            resolved["targetDate"] = json!("2026-10-04");
            if text == "授权，改写成已经整理完书桌" {
                resolved["event"] = json!("上午已读完报告；已经整理完书桌。");
            }
            resolved
        }
        "下午改为休息，报告挪到明天。" => plan("daytimeReplan", "休息", None),
        "早间基准写错了，上午原定看邮件，请更正。" => plan("morningBaselineCorrection", "看邮件", None),
        "今晚复盘：今天已经写完报告，按时起床，睡觉分钟不知道。" => json!({"operation":"saveEveningReview","mode":"addition","content":"今天已经写完报告，按时起床，睡觉分钟不知道。"}),
        "补充复盘，今天完成了散步。" => json!({"operation":"saveEveningReview","mode":"addition","content":"今天完成了散步。"}),
        "更正复盘，报告实际是昨天下午完成的。" => json!({"operation":"saveEveningReview","mode":"correction","content":"报告实际是昨天下午完成的。"}),
        "补记2026-09-25的复盘：当天已经处理完家务。" => json!({"operation":"saveEveningReview","mode":"addition","targetDate":"2026-09-25","content":"当天已经处理完家务。"}),
        "今天已经读完这本书了。" => json!({"operation":"createShortRecord","category":"ordinary","content":text}),
        "补记2026-09-25，锻炼了25分钟。" => json!({"operation":"createShortRecord","category":"exercise","targetDate":"2026-09-25","content":"锻炼了25分钟。"}),
        "先给我看方案，新增简短记录：今天已完成读书。" => json!({"operation":"createShortRecord","category":"ordinary","content":"今天已完成读书。","executionMode":"prepareProposal"}),
        "也许今天锻炼了25分钟。" | "不要记录，今天锻炼了25分钟。" => json!({"operation":"createShortRecord","category":"exercise","content":"今天锻炼了25分钟。"}),
        "明天打算锻炼25分钟。" => plan("daytimeEvent", "", Some(text)),
        "今天07:10起床，请保留原事实。" => json!({"operation":"saveEveningReview","mode":"addition","content":"今天07:10起床"}),
        _ => {
            let (id, content) = text.strip_prefix("更正记录 ")?.split_once('：')?;
            json!({"operation":"correctShortRecord","recordId":id,"content":content})
        }
    };
    value.as_object_mut().unwrap().entry("executionMode").or_insert(json!("execute"));
    value["authorizationQuote"] = json!(text);
    Some(value)
}

#[test]
fn explicit_daytime_save_with_prior_content_reaches_the_real_vault_writer() {
    let dir = IsolatedDirectory::new();
    let path = dir.vault("explicit-daytime-save");
    let fixture = prepare_daily_review_vault(&path, false);
    let target = path.join("life/Journal/Daily/2026/2026-10/2026-10-04.md");
    fs::create_dir_all(target.parent().unwrap()).unwrap();
    fs::write(
        &target,
        fs::read_to_string(fixture)
            .unwrap()
            .replace("2026-09-27", "2026-10-04"),
    )
    .unwrap();
    let vault = MutableVault::new(&path);
    let clock = ManualClock::new("2026-10-04", "17:00");
    let (app, _, results, _) =
        new_automatic_application(&dir, &vault, MutableContext::new("vault-a"), clock, None);
    let chat = app.create_default_session().unwrap();
    app.submit_message(
        "vault-a",
        &chat.id,
        "2026-10-04",
        "请先整理白天情况，暂时不要保存：上午已读完报告；晚饭后计划整理书桌，尚未完成。",
    )
    .unwrap();
    wait_for_finish(&app, &chat.id, "vault-a");
    let before = fs::read(&target).unwrap();
    let instruction = "把我上一条说的今天经过，记入 2026-10-04 Daily Record 的白天更新";
    app.submit_message("vault-a", &chat.id, "2026-10-04", instruction)
        .unwrap();
    wait_for_finish(&app, &chat.id, "vault-a");
    let result = results.lock().unwrap().last().unwrap().clone();
    assert!(result.success, "{}", result.text);
    let record = fs::read_to_string(&target).unwrap();
    assert!(record.contains("## 白天更新"));
    assert!(record.contains("上午已读完报告；晚饭后计划整理书桌，尚未完成。"));
    assert!(record.contains("Synthetic morning baseline."));
    assert!(record.contains("Synthetic current arrangement."));
    assert!(record.contains("用户自有章节原文。"));
    let after = fs::read(&target).unwrap();
    assert_ne!(before, after);
    app.submit_message("vault-a", &chat.id, "2026-10-04", instruction)
        .unwrap();
    wait_for_finish(&app, &chat.id, "vault-a");
    assert_eq!(
        fs::read(&target).unwrap(),
        after,
        "explicit retry must return its receipt, without duplicating the event"
    );
}

#[test]
fn daytime_save_records_the_loaded_usage_and_actual_capabilities_across_reopen() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("usage-package");
    prepare_daily_review_vault(&path, false);
    let vault = MutableVault::new(&path);
    let clock = ManualClock::new("2026-09-27", "17:00");
    let (app, tools, results, _) = new_automatic_application(
        &directory, &vault, MutableContext::new("vault-a"), clock.clone(), None,
    );
    let chat = app.create_default_session().unwrap();
    app.submit_message("vault-a", &chat.id, &chat.target_date,
        "今天07:10起床，具体睡觉时刻不知道。").unwrap();
    wait_for_finish(&app, &chat.id, "vault-a");
    assert!(results.lock().unwrap().last().unwrap().success);
    let saved = serde_json::to_value(app.session("vault-a", &chat.id).unwrap()).unwrap();
    let binding = &saved["usageBindings"][0];
    assert_eq!(binding["skillName"], "personal-dashboard-collaboration");
    assert_eq!(binding["skillVersion"], "1.5.0");
    assert_eq!(binding["toolSetVersion"], "1.4.0");
    assert!(binding["packageFingerprint"].as_str().is_some_and(|s| !s.is_empty()));
    let registered = tools.lock().unwrap().iter().map(|t| t["name"].as_str().unwrap().to_owned()).collect::<Vec<_>>();
    assert_eq!(binding["registeredTools"], json!(registered));
    assert!(!registered.iter().any(|name| name == "dashboard_memory_update"));
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, clock.clone());
    let readback = today.read_date("2026-09-27").unwrap();
    assert!(serde_json::to_string(&readback.daytime.updates).unwrap()
        .contains("今天07:10起床，具体睡觉时刻不知道。"));
    assert!(serde_json::to_string(&readback.baseline).unwrap().contains("Synthetic morning baseline."));
    drop(app);
    let (reopened, _, _, _) = new_automatic_application(
        &directory, &vault, MutableContext::new("vault-a"), clock, None,
    );
    let reopened = serde_json::to_value(reopened.session("vault-a", &chat.id).unwrap()).unwrap();
    assert_eq!(reopened["usageBindings"], saved["usageBindings"]);
}

#[test]
fn automatic_usage_advertises_only_the_existing_initial_plan_capability() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("automatic-usage");
    let vault = MutableVault::new(&path);
    let (app, tools, _, _) = new_automatic_application(
        &directory, &vault, MutableContext::new("vault-a"),
        ManualClock::new("2026-09-27", "07:00"), None,
    );
    let automation = app.update_daily_plan_automation(enabled_automation("07:00")).unwrap();
    let session_id = automation.current_run.unwrap().session_id.unwrap();
    wait_for_finish(&app, &session_id, "vault-a");
    let saved = serde_json::to_value(app.session("vault-a", &session_id).unwrap()).unwrap();
    let binding = &saved["usageBindings"][0];
    assert_eq!(binding["automaticMorning"], true);
    assert_eq!(binding["registeredTools"], json!(["dashboard_task_operation"]));
    assert_eq!(binding["registeredOperations"]["dashboard_task_operation"], json!(["saveDailyPlan"]));
    let tool = &tools.lock().unwrap()[0];
    let variants = tool["inputSchema"]["oneOf"].as_array().unwrap();
    assert_eq!(variants.len(), 1);
    assert_eq!(variants[0]["properties"]["transition"]["enum"], json!(["initialPlan"]));
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
            external_writes_allowed: false,
            starts: Arc::new(Mutex::new(Vec::new())),
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
    fs::create_dir_all(vault_path.join("life/.personal-dashboard/derived")).unwrap();
    fs::write(
        vault_path.join("life/.personal-dashboard/derived/habits-v1.json"),
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
            external_writes_allowed: false,
            starts: Arc::new(Mutex::new(Vec::new())),
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
    assert_eq!(registered.len(), 3);
    assert_eq!(registered[0]["name"], "dashboard_task_operation");
    assert!(
        registered[0]["inputSchema"]["oneOf"]
            .as_array()
            .unwrap()
            .len()
            >= 12
    );
    let task_variants = registered[0]["inputSchema"]["oneOf"].as_array().unwrap();
    let daily_plan = task_variants
        .iter()
        .find(|variant| variant["properties"]["operation"]["const"] == "saveDailyPlan")
        .unwrap();
    let transition_guidance = daily_plan["properties"]["transition"]["description"]
        .as_str()
        .expect("the runtime schema distinguishes event-only daytime updates");
    assert!(
        transition_guidance.contains("daytimeEvent")
            && transition_guidance.contains("event")
            && transition_guidance.contains("arrangement"),
        "{transition_guidance}"
    );
    let daytime_event_guidance = daily_plan["properties"]["event"]["description"]
        .as_str()
        .expect("the runtime schema routes daytime facts to the daytime event field");
    assert!(
        daytime_event_guidance.contains("daytime") && daytime_event_guidance.contains("白天更新"),
        "{daytime_event_guidance}"
    );
    let create_task = task_variants
        .iter()
        .find(|variant| variant["properties"]["operation"]["const"] == "createTask")
        .unwrap();
    assert!(create_task["properties"].get("authorizationQuote").is_none());
    assert_eq!(
        create_task["properties"]["executionMode"]["enum"][0],
        "execute"
    );
    assert!(!create_task["required"]
        .as_array()
        .unwrap()
        .iter()
        .any(|field| field == "authorizationQuote"));
    let evening_review = task_variants
        .iter()
        .find(|variant| variant["properties"]["operation"]["const"] == "saveEveningReview")
        .unwrap();
    let operation_guidance = evening_review["properties"]["operation"]["description"]
        .as_str()
        .expect("the runtime schema explains how a Daily Record note maps to an operation");
    assert!(
        operation_guidance.contains("Daily Record")
            && operation_guidance.contains("note")
            && operation_guidance.contains("mode=addition")
            && operation_guidance.contains("content"),
        "{operation_guidance}"
    );
    let execution_mode_guidance = evening_review["properties"]["executionMode"]["description"]
        .as_str()
        .expect("the model receives explicit proposal-versus-execute guidance");
    assert!(
        execution_mode_guidance.contains("before saving")
            && execution_mode_guidance.contains("confirmation"),
        "{execution_mode_guidance}"
    );
    let addition_mode_guidance = evening_review["properties"]["mode"]["description"]
        .as_str()
        .expect("the runtime schema explains addition mode");
    assert!(
        addition_mode_guidance.contains("evening review"),
        "{addition_mode_guidance}"
    );
    assert!(
        addition_mode_guidance.contains("daytime event"),
        "{addition_mode_guidance}"
    );
    assert!(registered[0]["description"]
        .as_str()
        .unwrap()
        .contains("daytimeEvent"));
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
    assert_eq!(registered.len(), 3, "plan actions retain the shared operation tool beside bounded history and derived refresh");
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
fn legacy_thread_keeps_task_proposals_and_recovers_daily_plans_in_the_same_chat() {
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
    assert!(result.success);
    assert!(result.text.contains("proposal"));
    assert_eq!(
        restarted
            .session("vault-a", &session.id)
            .unwrap()
            .task_operations
            .len(),
        2
    );
    assert!(!vault_path
        .join("life/Journal/Daily/2026/2026-09/2026-09-27.md")
        .exists());

    restarted
        .submit_message("vault-a", &session.id, "2026-09-27", "create task")
        .unwrap();
    wait_for_finish(&restarted, &session.id, "vault-a");
    let after_task_proposal = restarted.session("vault-a", &session.id).unwrap();
    assert_eq!(after_task_proposal.task_operations.len(), 3);
    assert!(after_task_proposal.task_operations.iter().any(|operation| {
        matches!(
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
fn unsupported_daily_record_note_name_explains_the_canonical_operation_without_writing() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let daily_path = vault_path.join("life/Journal/Daily/2026/2026-09/2026-09-27.md");
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
            "unsupported note operation",
        )
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");

    let result = results.lock().unwrap()[0].clone();
    assert!(!result.success);
    assert!(result.text.contains("saveEveningReview"), "{}", result.text);
    assert!(result.text.contains("mode=addition"), "{}", result.text);
    assert!(result.text.contains("content"), "{}", result.text);
    assert!(application
        .session("vault-a", &session.id)
        .unwrap()
        .task_operations
        .is_empty());
    assert!(
        !daily_path.exists(),
        "an unsupported operation must not write"
    );
}

#[test]
fn approved_daytime_event_is_recorded_under_daytime_without_changing_the_plan() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let daily_path = prepare_daily_review_vault(&vault_path, false);
    let original = fs::read_to_string(&daily_path).unwrap();
    let vault = MutableVault::new(&vault_path);
    let (application, _, results) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let prompt = "Record a daytime event in today's Daily Record: 'Synthetic daytime event for acceptance.' Show the exact proposal and wait for approval before saving.";
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
        .expect("the exact daytime update remains pending for review");
    assert!(matches!(
        &proposal.operation,
        CollaborationTaskOperation::SaveDailyPlan {
            transition: DailyPlanTransition::DaytimeEvent,
            event: Some(event),
            ..
        } if event == "Synthetic daytime event for acceptance."
    ));
    assert_eq!(fs::read_to_string(&daily_path).unwrap(), original);

    let saved = application
        .approve_task_operation_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(
        saved
            .task_operations
            .iter()
            .find(|operation| operation.id == proposal.id)
            .unwrap()
            .status,
        "applied"
    );
    let updated = fs::read_to_string(&daily_path).unwrap();
    let daytime = canonical_section(&updated, "白天更新", "晚间复盘");
    assert!(daytime.contains("Synthetic daytime event for acceptance."));
    assert_eq!(
        updated
            .matches("Synthetic daytime event for acceptance.")
            .count(),
        1
    );
    assert_eq!(
        canonical_section(&updated, "早间基准", "今天的大致安排"),
        canonical_section(&original, "早间基准", "今天的大致安排")
    );
    assert_eq!(
        canonical_section(&updated, "今天的大致安排", "计划依据"),
        canonical_section(&original, "今天的大致安排", "计划依据")
    );
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
    let snapshot_path = vault_path.join("life/.personal-dashboard/derived/habits-v1.json");
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
                completed_time: None,
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
fn in_process_scheduler_triggers_an_automatic_plan_in_an_isolated_vault() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let context = MutableContext::new("vault-a");
    let clock = ManualClock::new("2026-09-27", "06:59");
    let (application, _, _, _) =
        new_automatic_application(&directory, &vault, context, clock.clone(), None);

    let before_due = application
        .update_daily_plan_automation(enabled_automation("07:00"))
        .unwrap();
    assert!(before_due.current_run.is_none());
    assert!(application.list_sessions("2026-09-27").unwrap().is_empty());

    clock.set_time("07:00");
    application.start_daily_plan_automation_scheduler().unwrap();
    let deadline = std::time::Instant::now() + Duration::from_secs(3);
    let session_id = loop {
        if let Some(session_id) = application
            .daily_plan_automation()
            .unwrap()
            .current_run
            .and_then(|run| run.session_id)
        {
            break session_id;
        }
        if std::time::Instant::now() >= deadline {
            application.shutdown().unwrap();
            panic!(
                "the in-process scheduler should queue work when the configured local time is due"
            );
        }
        thread::sleep(Duration::from_millis(10));
    };

    wait_for_finish(&application, &session_id, "vault-a");
    let completed = application.daily_plan_automation().unwrap();
    assert_eq!(completed.current_run.unwrap().state, "completed");
    let session = application.session("vault-a", &session_id).unwrap();
    assert!(session.messages[0].automatic_plan);
    assert_eq!(application.list_sessions("2026-09-27").unwrap().len(), 1);
    application.shutdown().unwrap();
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

#[test]
fn automatic_after_midnight_schedule_uses_lived_target_and_does_not_repeat_at_four_am() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let clock = ManualClock::new("2026-09-27", "00:29");
    let (application, _, _, requests) = new_automatic_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        clock.clone(),
        None,
    );
    let before = application
        .update_daily_plan_automation(enabled_automation("00:30"))
        .unwrap();
    assert_eq!(before.date, "2026-09-26");
    assert!(before.current_run.is_none());
    clock.set_time("00:30");
    let queued = application.check_daily_plan_automation().unwrap();
    let session_id = queued.current_run.unwrap().session_id.unwrap();
    wait_for_finish(&application, &session_id, "vault-a");
    let session = application.session("vault-a", &session_id).unwrap();
    assert_eq!(session.target_date, "2026-09-26");
    assert_eq!(session.messages[0].target_date, "2026-09-26");
    assert_eq!(session.messages[0].message_date, "2026-09-27");
    assert!(session.messages[0]
        .created_at
        .starts_with("2026-09-27T00:30"));
    assert_eq!(session.task_operations[0].status, "applied");
    clock.set_time("03:59");
    assert_eq!(
        application
            .check_daily_plan_automation()
            .unwrap()
            .current_run
            .unwrap()
            .state,
        "completed"
    );
    clock.set_time("04:00");
    let next = application.check_daily_plan_automation().unwrap();
    assert_eq!(next.date, "2026-09-27");
    assert!(next.current_run.is_none());
    assert_eq!(requests.lock().unwrap().len(), 1);
    assert!(!record_path(&vault_path).exists());
}

#[test]
fn automatic_morning_schedule_late_open_at_one_am_targets_previous_lived_day() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let clock = ManualClock::new("2026-09-27", "01:00");
    let (application, _, _, requests) = new_automatic_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        clock,
        None,
    );
    let queued = application
        .update_daily_plan_automation(enabled_automation("07:00"))
        .unwrap();
    assert_eq!(queued.date, "2026-09-26");
    let session_id = queued.current_run.unwrap().session_id.unwrap();
    wait_for_finish(&application, &session_id, "vault-a");
    let session = application.session("vault-a", &session_id).unwrap();
    assert_eq!(session.messages[0].target_date, "2026-09-26");
    assert_eq!(session.task_operations[0].status, "applied");
    assert_eq!(requests.lock().unwrap().len(), 1);
    assert!(!record_path(&vault_path).exists());
}

#[test]
fn queued_automatic_plan_is_not_retargeted_after_lived_day_boundary() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let clock = ManualClock::new("2026-09-27", "03:59");
    let gate = Arc::new(AutomaticTurnGate::default());
    let (application, _, _, requests) = new_automatic_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        clock.clone(),
        Some(Arc::clone(&gate)),
    );
    let holder = application.create_session("2026-09-26").unwrap();
    application
        .submit_message("vault-a", &holder.id, "2026-09-26", "hold-worker")
        .unwrap();
    gate.wait_until_entered();
    let run = application
        .update_daily_plan_automation(enabled_automation("00:30"))
        .unwrap()
        .current_run
        .unwrap();
    let session_id = run.session_id.unwrap();
    clock.set_time("04:00");
    gate.release();
    wait_for_finish(&application, &holder.id, "vault-a");
    let deadline = std::time::Instant::now() + Duration::from_secs(3);
    loop {
        let session = application.session("vault-a", &session_id).unwrap();
        if session.run_state == "error" {
            break;
        }
        assert!(
            std::time::Instant::now() < deadline,
            "queued run did not finish safely"
        );
        thread::sleep(Duration::from_millis(10));
    }
    let original = application.session("vault-a", &session_id).unwrap();
    assert_eq!(original.messages[0].target_date, "2026-09-26");
    assert!(original.task_operations.is_empty());
    assert!(original.progress.contains("lived day changed"));
    assert_eq!(
        requests.lock().unwrap().len(),
        1,
        "only the holder reached the model"
    );
    assert!(!record_path(&vault_path).exists());
}

#[test]
fn automatic_session_human_continuation_saves_tasks_records_habits_and_memory_then_reopens() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    fs::create_dir_all(vault_path.join("life/.personal-dashboard/derived")).unwrap();
    let mut snapshot: Value =
        serde_json::from_slice(include_bytes!("fixtures/habits-v1-complete.json")).unwrap();
    snapshot["generatedAt"] = json!("2026-09-27T06:55:00-04:00");
    snapshot["range"]["from"] = json!("2026-07-06");
    snapshot["range"]["to"] = json!("2026-09-26");
    fs::write(
        vault_path.join("life/.personal-dashboard/derived/habits-v1.json"),
        serde_json::to_vec(&snapshot).unwrap(),
    )
    .unwrap();
    let vault = MutableVault::new(&vault_path);
    let context = MutableContext::new("vault-a");
    let clock = ManualClock::new("2026-09-27", "07:00");
    let tasks = TaskApplication::new(vault.clone(), clock.clone(), FileTaskStore);
    let empty = tasks.read().unwrap();
    tasks
        .create(TaskCreateInput {
            target_binding: empty.target_binding.unwrap(),
            expected_revision: empty.revision,
            task_id: "human-task".into(),
            name: "Synthetic report".into(),
            content: None,
            date: Some("2026-09-27".into()),
            time: None,
            list_id: None,
        })
        .unwrap();
    let (application, registered, results, requests) =
        new_automatic_application(&directory, &vault, context.clone(), clock.clone(), None);
    let application =
        application.with_memory_service(Arc::new(FixtureMemoryService::new(&directory, &vault)));
    let run = application
        .update_daily_plan_automation(enabled_automation("07:00"))
        .unwrap();
    let session_id = run.current_run.unwrap().session_id.unwrap();
    wait_for_finish(&application, &session_id, "vault-a");
    let automatic = application.session("vault-a", &session_id).unwrap();
    let native_thread_before = automatic.runtime_thread_id.clone();
    assert!(
        !automatic.task_tool_available
            && !automatic.daily_record_tool_available
            && !automatic.memory_tool_available
    );
    assert_eq!(automatic.task_operations[0].status, "applied");
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, clock.clone());
    let baseline = today.read_date("2026-09-27").unwrap().baseline;
    let operations = [
        json!({"operation":"completeTask", "taskId":"human-task", "executionMode":"execute", "authorizationQuote":"Complete my task Synthetic report."}),
        json!({"operation":"saveDailyPlan", "transition":"daytimeReplan", "executionMode":"execute", "authorizationQuote":"Replan my day.",
            "arrangement":[{"period":"afternoon", "title":"Rest after the report", "detail":null}],
            "evidence":[{"label":"User decision", "items":["Rest after the report"]}],
            "calibrationNote":null, "baselineCorrectionReason":null, "event":null,
            "originalIntent":"Finish the report", "changeReason":"The report is complete", "revisedDirection":"Rest"}),
        json!({"operation":"setLocalHabitCompletion", "habitKey":"exercise", "completed":true,
            "executionMode":"execute", "authorizationQuote":"Mark exercise done."}),
    ];
    for operation in operations {
        application
            .submit_message(
                "vault-a",
                &session_id,
                "2026-09-27",
                &format!("date-fixture:{operation}"),
            )
            .unwrap();
        wait_for_finish(&application, &session_id, "vault-a");
        let current = application.session("vault-a", &session_id).unwrap();
        assert!(
            current.task_tool_available
                && current.daily_record_tool_available
                && current.memory_tool_available
        );
        assert_eq!(
            current.task_operations.last().unwrap().status,
            "applied",
            "{:?}",
            current.task_operations.last()
        );
    }
    let memory = json!({"operation":"proposeLongTermUpdate", "basis":"explicitUserInstruction", "executionMode":"execute",
        "authorizationQuote":"Please remember that I prefer early planning.", "change":"Prefers early planning.", "replaces":null});
    application
        .submit_message(
            "vault-a",
            &session_id,
            "2026-09-27",
            &format!("memory-fixture:{memory}"),
        )
        .unwrap();
    wait_for_finish(&application, &session_id, "vault-a");
    let saved = application.session("vault-a", &session_id).unwrap();
    assert_ne!(
        saved.runtime_thread_id, native_thread_before,
        "upgrade the transport without creating a Dashboard session"
    );
    assert_eq!(saved.id, session_id);
    assert_eq!(saved.messages.len(), 10);
    assert_eq!(saved.memory_proposals[0].status, "applied");
    assert_eq!(saved.usage_bindings.len(), 5);
    let human_usage = saved.usage_bindings.last().unwrap();
    assert!(!human_usage.automatic_morning);
    assert_eq!(human_usage.registered_operations.get("dashboard_memory_update"),
        Some(&vec!["proposeLongTermUpdate".to_owned()]));
    assert_eq!(application.list_sessions("2026-09-27").unwrap().len(), 1);
    assert_eq!(tasks.read().unwrap().tasks[0].state, TaskState::Completed);
    let record = today.read_date("2026-09-27").unwrap();
    assert_eq!(record.baseline, baseline);
    assert_eq!(record.timeline[0].title, "Rest after the report");
    assert_eq!(
        record
            .habit_corrections
            .habit("exercise")
            .unwrap()
            .cell
            .local_completion_state,
        HabitLocalCompletionState::Completed
    );
    assert!(fs::read_to_string(vault_path.join("life/Self.md"))
        .unwrap()
        .contains("Prefers early planning."));
    assert_eq!(
        requests.lock().unwrap().len(),
        5,
        "old requests are never replayed"
    );
    assert!(results.lock().unwrap().iter().all(|result| result.success));
    let tools = registered.lock().unwrap();
    assert_eq!(tools.len(), 4);
    let variants = tools[0]["inputSchema"]["oneOf"].as_array().unwrap();
    for name in [
        "completeTask",
        "createList",
        "restoreList",
        "saveDailyPlan",
        "saveEveningReview",
        "correctShortRecord",
        "setLocalHabitCompletion",
    ] {
        assert!(variants
            .iter()
            .any(|variant| variant["properties"]["operation"]["const"] == name));
    }
    drop(tools);
    drop(application);
    let reopened = new_automatic_application(&directory, &vault, context, clock, None)
        .0
        .with_memory_service(Arc::new(FixtureMemoryService::new(&directory, &vault)));
    let restored = reopened.session("vault-a", &session_id).unwrap();
    assert_eq!(restored.messages, saved.messages);
    assert_eq!(restored.task_operations, saved.task_operations);
    assert_eq!(restored.memory_proposals, saved.memory_proposals);
    assert_eq!(restored.usage_bindings, saved.usage_bindings);
    assert_eq!(tasks.read().unwrap().tasks[0].state, TaskState::Completed);
    assert!(reopened
        .workspace("2026-09-27")
        .unwrap()
        .memory
        .long_term
        .content
        .contains("Prefers early planning."));
}

#[test]
fn missing_current_execution_mode_is_rejected_instead_of_silently_preparing_a_proposal() {
    let directory = IsolatedDirectory::new();
    let vault = MutableVault::new(&directory.vault("vault"));
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
            "missing current execution mode",
        )
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");
    assert!(application
        .session("vault-a", &session.id)
        .unwrap()
        .task_operations
        .is_empty());
    assert!(!results.lock().unwrap()[0].success);
    assert!(results.lock().unwrap()[0]
        .text
        .contains("requires executionMode"));
    assert!(TaskApplication::new(vault, FixedClock, FileTaskStore)
        .read()
        .unwrap()
        .tasks
        .is_empty());
}

#[test]
fn legacy_session_without_registration_fields_upgrades_without_replaying_or_approving_history() {
    let directory = IsolatedDirectory::new();
    let vault = MutableVault::new(&directory.vault("vault"));
    let context = MutableContext::new("vault-a");
    let (application, _, _) = new_application(
        &directory,
        &vault,
        context.clone(),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let old_proposal = submit_for_proposal(&application, &session.id, "create list");
    let old_messages = application
        .session("vault-a", &session.id)
        .unwrap()
        .messages;
    drop(application);
    let path = directory.path().join("collaboration/collaboration.json");
    let mut history: Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
    let legacy = history["sessions"][0].as_object_mut().unwrap();
    for field in [
        "usageBindings",
        "runtimeToolSchemaFingerprint",
        "taskToolRegistered",
        "dailyPlanToolRegistered",
        "dailyRecordToolRegistered",
        "memoryToolRegistered",
    ] {
        legacy.remove(field);
    }
    legacy.insert("runtimeThreadId".into(), json!("legacy-native-thread"));
    fs::write(&path, serde_json::to_vec(&history).unwrap()).unwrap();
    let (reopened, _, results) = new_application(
        &directory,
        &vault,
        context,
        Arc::new(AtomicBool::new(false)),
    );
    reopened
        .submit_message(
            "vault-a",
            &session.id,
            "2026-09-27",
            "Please create a task named Synthetic report.",
        )
        .unwrap();
    wait_for_finish(&reopened, &session.id, "vault-a");
    let upgraded = reopened.session("vault-a", &session.id).unwrap();
    assert_eq!(upgraded.id, session.id);
    assert_eq!(
        &upgraded.messages[..old_messages.len()],
        old_messages.as_slice()
    );
    assert_eq!(upgraded.task_operations[0].id, old_proposal.id);
    assert_eq!(upgraded.task_operations[0].status, "awaitingApproval");
    assert_eq!(upgraded.task_operations[1].status, "applied");
    assert_eq!(
        results.lock().unwrap().len(),
        1,
        "only the new current request was delivered"
    );
    assert_ne!(
        upgraded.runtime_thread_id.as_deref(),
        Some("legacy-native-thread")
    );
    let tasks = TaskApplication::new(vault, FixedClock, FileTaskStore)
        .read()
        .unwrap();
    assert_eq!(tasks.tasks.len(), 1);
    assert_eq!(
        tasks.lists.len(),
        1,
        "the old list proposal was not approved by a new Task instruction"
    );
}

#[test]
fn memory_document_readback_after_history_failure_confirms_effect_without_rewriting_it() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let context = MutableContext::new("vault-a");
    let fail_save = Arc::new(AtomicBool::new(false));
    let (application, _, _) =
        new_application(&directory, &vault, context.clone(), Arc::clone(&fail_save));
    let application =
        application.with_memory_service(Arc::new(FixtureMemoryService::new(&directory, &vault)));
    let session = application.create_session("2026-09-27").unwrap();
    let request = json!({"operation":"proposeLongTermUpdate", "basis":"explicitUserInstruction", "executionMode":"prepareProposal",
        "authorizationQuote":"Please remember that I prefer early planning.", "change":"Prefers early planning.", "replaces":null});
    application
        .submit_message(
            "vault-a",
            &session.id,
            "2026-09-27",
            &format!("memory-fixture:{request}"),
        )
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");
    let proposal = application
        .session("vault-a", &session.id)
        .unwrap()
        .memory_proposals[0]
        .clone();
    fail_save.store(true, Ordering::SeqCst);
    assert!(application
        .approve_memory_proposal_for_selected_vault(&session.id, &proposal.id)
        .unwrap_err()
        .contains("result could not be saved"));
    let bytes = fs::read(vault_path.join("life/Self.md")).unwrap();
    assert!(String::from_utf8_lossy(&bytes).contains("Prefers early planning."));
    drop(application);
    let (reopened, _, _) = new_application(
        &directory,
        &vault,
        context,
        Arc::new(AtomicBool::new(false)),
    );
    let reopened =
        reopened.with_memory_service(Arc::new(FixtureMemoryService::new(&directory, &vault)));
    let confirmed = reopened
        .approve_memory_proposal_for_selected_vault(&session.id, &proposal.id)
        .unwrap();
    assert_eq!(confirmed.memory_proposals[0].status, "applied");
    assert!(confirmed.memory_proposals[0]
        .result_message
        .as_deref()
        .unwrap()
        .contains("readback confirms"));
    assert_eq!(fs::read(vault_path.join("life/Self.md")).unwrap(), bytes);
    assert_eq!(
        String::from_utf8_lossy(&bytes)
            .matches("Prefers early planning.")
            .count(),
        1
    );
}

#[test]
fn natural_daily_conversation_saves_every_transition_review_and_record_without_repeat_save_commands() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("natural-daily");
    let vault = MutableVault::new(&path);
    let (app, _, results, _) = new_automatic_application(&directory, &vault,
        MutableContext::new("vault-a"), ManualClock::new("2026-09-27", "21:00"), None);
    let session = app.create_default_session().unwrap();
    for text in [
        "今天先安排上午写报告，下午散步。", "校准今天安排，上午优先处理急事。",
        "今天07:10起床，具体睡觉时刻不知道。", "下午改为休息，报告挪到明天。",
        "早间基准写错了，上午原定看邮件，请更正。",
        "今晚复盘：今天已经写完报告，按时起床，睡觉分钟不知道。",
        "补充复盘，今天完成了散步。", "更正复盘，报告实际是昨天下午完成的。",
        "今天已经读完这本书了。", "补记2026-09-25，锻炼了25分钟。",
        "补记2026-09-25的复盘：当天已经处理完家务。",
    ] {
        app.submit_message("vault-a", &session.id, &session.target_date, text).unwrap();
        wait_for_finish(&app, &session.id, "vault-a");
        let current = app.session("vault-a", &session.id).unwrap();
        let result = results.lock().unwrap().last().unwrap().clone();
        assert!(result.success, "{text}: {}", result.text);
        assert_eq!(current.task_operations.last().unwrap().status, "applied", "{text}: {}", result.text);
        if text == "下午改为休息，报告挪到明天。" {
            let view = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock).read_date("2026-09-27").unwrap();
            assert_eq!(view.baseline.timeline[0].title, "写报告");
            assert_eq!(view.timeline[0].title, "休息");
        }
    }
    let before = app.session("vault-a", &session.id).unwrap();
    let ordinary = before.task_operations.iter().find(|op| matches!(op.operation,
        CollaborationTaskOperation::CreateShortRecord {category:ShortRecordCategory::Ordinary,..})).unwrap();
    let correction = format!("更正记录 {}：实际读完的是前半本。", ordinary.id);
    app.submit_message("vault-a", &session.id, &session.target_date, &correction).unwrap();
    wait_for_finish(&app, &session.id, "vault-a");
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock);
    let current = today.read_date("2026-09-27").unwrap();
    assert_eq!(current.baseline.timeline[0].title, "看邮件");
    assert_eq!(current.timeline[0].title, "休息", "baseline correction retains the current arrangement");
    assert_eq!(current.daytime.short_records.len(), 1);
    assert_eq!(current.daytime.short_records[0].text, "实际读完的是前半本。");
    assert_eq!(current.daytime.short_records[0].changes.len(), 1);
    assert_eq!(current.daytime.short_records[0].changes[0].old_text, "今天已经读完这本书了。");
    let doc = fs::read_to_string(record_path(&path)).unwrap();
    let daytime = canonical_section(&doc, "白天更新", "晚间复盘");
    assert!(daytime.contains("今天07:10起床，具体睡觉时刻不知道。"));
    assert!(!doc.split("## 晚间复盘").nth(1).unwrap().contains("今天07:10起床，具体睡觉时刻不知道。"));
    assert!(!path.join("life/.personal-dashboard/tasks/v1/tasks.json").exists());
    assert!(!path.join("life/.personal-dashboard/habit-completions/v1/completions.json").exists());
    let past = today.read_date("2026-09-25").unwrap();
    assert_eq!(past.daytime.short_records[0].category, ShortRecordCategory::Exercise);
    assert_eq!(past.daytime.short_records[0].text, "锻炼了25分钟。");
    let historical = fs::read_to_string(path.join("life/Journal/Daily/2026/2026-09/2026-09-25.md")).unwrap();
    assert!(historical.contains("当天已经处理完家务。"));
    let reopened = new_automatic_application(&directory, &vault, MutableContext::new("vault-a"),
        ManualClock::new("2026-09-28", "01:00"), None).0;
    assert_eq!(reopened.session("vault-a", &session.id).unwrap().task_operations.len(), 12);
    assert_eq!(TodayApplication::new(vault, NoVaultPicker, FixedClock).read_date("2026-09-25").unwrap().daytime.short_records.len(), 1);
}

#[test]
fn short_record_review_conflict_receipt_recovery_and_factual_authority_use_real_daily_records() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("short-record");
    let vault = MutableVault::new(&path);
    let (app, _, _results, _) = new_automatic_application(&directory, &vault,
        MutableContext::new("vault-a"), ManualClock::new("2026-09-27", "21:00"), None);
    let session = app.create_default_session().unwrap();
    let text = "先给我看方案，新增简短记录：今天已完成读书。";
    app.submit_message("vault-a", &session.id, &session.target_date, text).unwrap();
    wait_for_finish(&app, &session.id, "vault-a");
    let proposal = app.session("vault-a", &session.id).unwrap().task_operations[0].clone();
    assert_eq!(proposal.status, "awaitingApproval");
    assert!(!record_path(&path).exists());
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock);
    let before = today.read_date("2026-09-27").unwrap();
    today.add_dated_note(DatedNoteInput {date:"2026-09-27".into(), target_binding:before.target_binding.unwrap(),
        expected_revision:before.revision, entry_id:"concurrent-human".into(),category:ShortRecordCategory::Ordinary,
        content:"Unrelated user-authored paragraph".into()}).unwrap();
    let conflict = app.approve_task_operation_for_selected_vault(&session.id, &proposal.id).unwrap();
    assert_eq!(conflict.task_operations[0].status, "conflict");
    app.refresh_task_operation_for_selected_vault(&session.id, &proposal.id).unwrap();
    app.approve_task_operation_for_selected_vault(&session.id, &proposal.id).unwrap();
    app.approve_task_operation_for_selected_vault(&session.id, &proposal.id).unwrap();
    let current = today.read_date("2026-09-27").unwrap();
    assert_eq!(current.daytime.short_records.len(), 2);
    assert!(current.daytime.short_records.iter().any(|record| record.id=="concurrent-human" && record.text=="Unrelated user-authored paragraph"));
    assert_eq!(current.daytime.short_records.iter().filter(|record| record.id==proposal.id).count(), 1);
}

#[test]
fn short_record_creation_readback_recovers_after_history_failure_and_later_correction() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("short-record-recovery");
    let vault = MutableVault::new(&path);
    let failure = Arc::new(AtomicBool::new(false));
    let (app, _, _) = new_application(&directory, &vault, MutableContext::new("vault-a"), failure.clone());
    let session = app.create_default_session().unwrap();
    let proposal = submit_for_proposal(&app, &session.id, "先给我看方案，新增简短记录：今天已完成读书。");
    failure.store(true, Ordering::SeqCst);
    assert!(app.approve_task_operation_for_selected_vault(&session.id, &proposal.id).unwrap_err().contains("saved"));
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock);
    let saved = today.read_date("2026-09-27").unwrap();
    assert_eq!(saved.daytime.short_records.len(), 1);
    assert_eq!(saved.daytime.short_records[0].id, proposal.id);
    today.correct_dated_note(DatedNoteCorrectionInput {
        date:"2026-09-27".into(), target_binding:saved.target_binding.unwrap(), expected_revision:saved.revision.unwrap(),
        entry_id:proposal.id.clone(), change_id:"later-human-correction".into(), content:"实际读的是文章。".into(),
    }).unwrap();
    drop(app);
    let (restarted, _, _) = new_application(&directory, &vault, MutableContext::new("vault-a"), Arc::new(AtomicBool::new(false)));
    let reconciled = restarted.reconcile_task_operation_for_selected_vault(&session.id, &proposal.id).unwrap();
    assert_eq!(reconciled.task_operations[0].status, "applied");
    restarted.approve_task_operation_for_selected_vault(&session.id, &proposal.id).unwrap();
    let after = today.read_date("2026-09-27").unwrap();
    assert_eq!(after.daytime.short_records.len(), 1);
    assert_eq!(after.daytime.short_records[0].text, "实际读的是文章。");
    assert_eq!(after.daytime.short_records[0].changes.len(), 1);
}

#[test]
fn natural_commitments_create_local_future_and_undated_tasks_without_duplicate_requests() {
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
    for text in [
        "下周五我要买菜",
        "下周五我要买菜",
        "我要整理书架，不安排日期",
    ] {
        application
            .submit_message("vault-a", &session.id, "2026-09-27", text)
            .unwrap();
        wait_for_finish(&application, &session.id, "vault-a");
    }
    let tasks = TaskApplication::new(vault.clone(), FixedClock, FileTaskStore)
        .read()
        .unwrap();
    assert_eq!(tasks.tasks.len(), 2);
    let groceries = tasks.tasks.iter().find(|task| task.name == "买菜").unwrap();
    assert_eq!(groceries.date.as_deref(), Some("2026-10-02"));
    assert!(groceries.time.is_none());
    assert_eq!(
        groceries.source.kind,
        personal_dashboard_lib::tasks::TaskSourceKind::Manual
    );
    let shelves = tasks
        .tasks
        .iter()
        .find(|task| task.name == "整理书架")
        .unwrap();
    assert!(shelves.date.is_none() && shelves.time.is_none());
    assert!(results.lock().unwrap().iter().all(|result| result.success));
    assert_eq!(
        application
            .session("vault-a", &session.id)
            .unwrap()
            .task_operations
            .len(),
        2
    );
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock);
    assert_eq!(
        today
            .read_date("2026-09-27")
            .unwrap()
            .tasks
            .tasks
            .iter()
            .find(|task| task.name == "买菜")
            .unwrap()
            .date
            .as_deref(),
        Some("2026-10-02")
    );
    assert!(today
        .calendar_month(2026, 9)
        .unwrap()
        .day("2026-09-27")
        .unwrap()
        .task_summaries
        .iter()
        .all(|task| task.name != "买菜"));
    assert!(today
        .calendar_month(2026, 10)
        .unwrap()
        .day("2026-10-02")
        .unwrap()
        .task_summaries
        .iter()
        .any(|task| task.name == "买菜"));
    assert!(today
        .read_date("2026-10-02")
        .unwrap()
        .tasks
        .tasks
        .iter()
        .any(|task| task.name == "买菜"));
    drop(application);
    let (reopened, _, _) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    reopened
        .submit_message("vault-a", &session.id, "2026-09-27", "下周五我要买菜")
        .unwrap();
    wait_for_finish(&reopened, &session.id, "vault-a");
    assert_eq!(
        TaskApplication::new(vault, FixedClock, FileTaskStore)
            .read()
            .unwrap()
            .tasks
            .len(),
        2
    );
}







#[test]
fn historical_completed_task_compound_work_preserves_actual_date_time_and_reopens_without_debt() {
    for (text, date, time) in [
        ("补记：昨天洗衣服做完了", "2026-09-26", None),
        (
            "补记：9月25日18:00洗衣服做完了",
            "2026-09-25",
            Some("18:00"),
        ),
    ] {
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
        for _ in 0..2 {
            application
                .submit_message("vault-a", &session.id, "2026-09-27", text)
                .unwrap();
            wait_for_finish(&application, &session.id, "vault-a");
        }
        let tasks = TaskApplication::new(vault.clone(), FixedClock, FileTaskStore)
            .read()
            .unwrap();
        assert_eq!(tasks.tasks.len(), 1);
        let task = &tasks.tasks[0];
        assert_eq!(task.state, TaskState::Completed);
        assert!(
            task.date.is_none() && task.time.is_none(),
            "a completion date is not a Task schedule"
        );
        assert!(!task.overdue);
        assert_eq!(task.completion.as_ref().unwrap().completed_on, date);
        assert_eq!(
            task.completion.as_ref().unwrap().completed_time.as_deref(),
            time
        );
        assert!(results.lock().unwrap().iter().all(|result| result.success));
        let stable_id = task.id.clone();
        drop(application);
        let (reopened, _, _) = new_application(
            &directory,
            &vault,
            MutableContext::new("vault-a"),
            Arc::new(AtomicBool::new(false)),
        );
        assert!(reopened
            .session("vault-a", &session.id)
            .unwrap()
            .task_operations
            .iter()
            .all(|operation| operation.status == "applied"));
        let saved = TaskApplication::new(vault, FixedClock, FileTaskStore)
            .read()
            .unwrap();
        assert_eq!(saved.tasks[0].id, stable_id);
        assert_eq!(
            saved.tasks[0].completion.as_ref().unwrap().completed_on,
            date
        );
    }
}

#[test]
fn natural_task_and_list_lifecycle_share_saved_objects_and_preserve_unchanged_fields() {
    let directory = IsolatedDirectory::new();
    let vault = MutableVault::new(&directory.vault("vault"));
    let (application, _, results) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let tasks = TaskApplication::new(vault.clone(), FixedClock, FileTaskStore);
    let submit = |operation: Value| {
        application
            .submit_message(
                "vault-a",
                &session.id,
                "2026-09-27",
                &format!("date-fixture:{operation}"),
            )
            .unwrap();
        wait_for_finish(&application, &session.id, "vault-a");
        let deliveries = results.lock().unwrap();
        assert!(
            deliveries.last().unwrap().success,
            "{}",
            deliveries.last().unwrap().text
        );
        drop(deliveries);
        tasks.read().unwrap()
    };
    let first = submit(
        json!({"operation":"createList", "name":"家务", "executionMode":"execute", "authorizationQuote":"新建家务清单"}),
    );
    let list_id = first
        .lists
        .iter()
        .find(|list| list.name == "家务")
        .unwrap()
        .id
        .clone();
    let second = submit(
        json!({"operation":"createList", "name":"生活", "executionMode":"execute", "authorizationQuote":"建个生活清单"}),
    );
    let destination_id = second
        .lists
        .iter()
        .find(|list| list.name == "生活")
        .unwrap()
        .id
        .clone();
    let created = submit(
        json!({"operation":"createTask", "name":"整理书架", "content":"用户备注", "date":"2026-09-28", "time":"10:00", "listId":list_id,
        "executionMode":"execute", "authorizationQuote":"明天10:00我要整理书架，加到家务清单，备注用户备注"}),
    );
    let task_id = created.tasks[0].id.clone();
    let changed = submit(
        json!({"operation":"updateTask", "taskId":task_id, "name":"整理书架", "content":"用户备注", "date":"2026-10-02", "time":"10:00", "listId":destination_id,
        "executionMode":"execute", "authorizationQuote":"把整理书架挪到下周五，移到生活清单"}),
    );
    assert_eq!(changed.tasks[0].date.as_deref(), Some("2026-10-02"));
    assert_eq!(changed.tasks[0].time.as_deref(), Some("10:00"));
    assert_eq!(changed.tasks[0].list_id, destination_id);
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock);
    assert_eq!(
        today
            .calendar_month(2026, 10)
            .unwrap()
            .day("2026-10-02")
            .unwrap()
            .task_summaries[0]
            .id,
        task_id
    );
    let cleared = submit(
        json!({"operation":"updateTask", "taskId":task_id, "name":"整理书架", "content":"用户备注", "date":null, "time":null, "listId":null,
        "executionMode":"execute", "authorizationQuote":"整理书架取消日期，不安排日期"}),
    );
    assert!(cleared.tasks[0].date.is_none() && cleared.tasks[0].time.is_none());
    assert_eq!(cleared.tasks[0].content.as_deref(), Some("用户备注"));
    assert_eq!(cleared.tasks[0].list_id, destination_id);
    assert!(today
        .calendar_month(2026, 10)
        .unwrap()
        .day("2026-10-02")
        .unwrap()
        .task_summaries
        .is_empty());
    let completed = submit(
        json!({"operation":"completeTask", "taskId":task_id, "completedTime":null,
        "executionMode":"execute", "authorizationQuote":"整理书架做完了"}),
    );
    assert!(completed.tasks[0]
        .completion
        .as_ref()
        .unwrap()
        .completed_time
        .is_none());
    let corrected = submit(
        json!({"operation":"correctCompletion", "taskId":task_id, "completedOn":"2026-09-25", "completedTime":"18:00",
        "executionMode":"execute", "authorizationQuote":"整理书架其实是9月25日18:00完成的，更正完成日期和时间"}),
    );
    assert_eq!(
        corrected.tasks[0].completion.as_ref().unwrap().completed_on,
        "2026-09-25"
    );
    assert_eq!(
        corrected.tasks[0]
            .completion
            .as_ref()
            .unwrap()
            .completed_time
            .as_deref(),
        Some("18:00")
    );
    assert!(corrected.tasks[0].date.is_none());
    assert_eq!(corrected.tasks[0].completion.as_ref().unwrap().source, personal_dashboard_lib::tasks::TaskCompletionSourceKind::DateCorrection);
    for (operation, quote, state, deleted) in [
        (
            "reopenTask",
            "整理书架还没做，重开",
            TaskState::Pending,
            false,
        ),
        ("abandonTask", "整理书架不做了", TaskState::Abandoned, false),
        ("reopenTask", "整理书架恢复待办", TaskState::Pending, false),
        ("deleteTask", "删掉整理书架", TaskState::Pending, true),
        ("restoreTask", "恢复整理书架", TaskState::Pending, false),
    ] {
        let saved = submit(
            json!({"operation":operation, "taskId":task_id, "executionMode":"execute", "authorizationQuote":quote}),
        );
        assert_eq!(saved.tasks[0].state, state);
        assert_eq!(saved.tasks[0].deleted_at.is_some(), deleted);
    }
    let renamed = submit(
        json!({"operation":"renameList", "listId":destination_id, "name":"日常", "executionMode":"execute", "authorizationQuote":"生活清单改名为日常"}),
    );
    assert_eq!(renamed.tasks[0].list_id, destination_id);
    for (operation, quote, archived) in [
        ("archiveList", "把日常清单归档", true),
        ("restoreList", "恢复日常清单", false),
    ] {
        let saved = submit(
            json!({"operation":operation, "listId":destination_id, "executionMode":"execute", "authorizationQuote":quote}),
        );
        assert_eq!(
            saved
                .lists
                .iter()
                .find(|list| list.id == destination_id)
                .unwrap()
                .archived,
            archived
        );
        assert_eq!(saved.tasks[0].state, TaskState::Pending);
    }
    assert_eq!(
        today.read_date("2026-09-27").unwrap().tasks.tasks[0].id,
        task_id
    );
    let disk_before = tasks.read().unwrap();
    assert!(disk_before.tasks[0].changes.len() >= 8);
    drop(application);
    let (reopened, _, _) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    assert!(reopened
        .session("vault-a", &session.id)
        .unwrap()
        .task_operations
        .iter()
        .all(|operation| operation.status == "applied"));
    assert_eq!(tasks.read().unwrap(), disk_before);
}



#[test]
fn queued_natural_completion_keeps_original_lived_day_across_four_am() {
    let directory = IsolatedDirectory::new();
    let vault = MutableVault::new(&directory.vault("vault"));
    let clock = ManualClock::new("2026-09-27", "03:59");
    let tasks = TaskApplication::new(vault.clone(), clock.clone(), FileTaskStore);
    let empty = tasks.read().unwrap();
    tasks
        .create(TaskCreateInput {
            target_binding: empty.target_binding.unwrap(),
            expected_revision: empty.revision,
            task_id: "laundry-task".into(),
            name: "洗衣服".into(),
            content: None,
            date: Some("2026-09-27".into()),
            time: Some("10:00".into()),
            list_id: None,
        })
        .unwrap();
    let gate = Arc::new(AutomaticTurnGate::default());
    let (application, _, results, requests) = new_automatic_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        clock.clone(),
        Some(gate.clone()),
    );
    let session = application.create_default_session().unwrap();
    assert_eq!(session.target_date, "2026-09-26");
    application
        .submit_message("vault-a", &session.id, &session.target_date, "hold-worker")
        .unwrap();
    gate.wait_until_entered();
    application
        .submit_message("vault-a", &session.id, &session.target_date, "洗衣服做完了")
        .unwrap();
    clock.set_time("04:00");
    let next = application.create_default_session().unwrap();
    gate.release();
    wait_for_finish(&application, &session.id, "vault-a");
    assert!(results.lock().unwrap()[0].success);
    let saved = tasks.read().unwrap();
    assert_eq!(
        saved.tasks[0].completion.as_ref().unwrap().completed_on,
        "2026-09-26"
    );
    assert!(saved.tasks[0]
        .completion
        .as_ref()
        .unwrap()
        .completed_time
        .is_none());
    assert_eq!(
        saved.tasks[0].completion.as_ref().unwrap().recorded_at,
        "2026-09-27T04:00-04:00"
    );
    assert_eq!(saved.tasks[0].date.as_deref(), Some("2026-09-27"));
    let sent = requests.lock().unwrap();
    assert_eq!(sent[1].dates.request_lived_date, "2026-09-26");
    assert_eq!(sent[1].dates.lived_date, "2026-09-27");
    assert_eq!(next.target_date, "2026-09-27");
    assert!(application
        .session("vault-a", &next.id)
        .unwrap()
        .task_operations
        .is_empty());
}

struct InterleavedTaskNoteEdit {
    inner: TaskApplicationCollaborationAdapter<MutableVault, FixedClock, FileTaskStore>,
    vault: MutableVault,
    read_once: AtomicBool,
}

impl CollaborationTaskService for InterleavedTaskNoteEdit {
    fn is_available(&self) -> bool {
        true
    }
    fn read(&self) -> Result<personal_dashboard_lib::tasks::TasksView, String> {
        let view = self.inner.read()?;
        if !self.read_once.swap(true, Ordering::SeqCst) {
            let task = &view.tasks[0];
            TaskApplication::new(self.vault.clone(), FixedClock, FileTaskStore).update(
                personal_dashboard_lib::tasks::TaskUpdateInput {
                    target_binding: view.target_binding.clone().unwrap(),
                    expected_revision: view.revision.clone().unwrap(),
                    task_id: task.id.clone(),
                    change_id: "interleaved-user-note-edit".into(),
                    name: task.name.clone(),
                    content: Some("A concurrent user-authored note".into()),
                    date: task.date.clone(),
                    time: task.time.clone(),
                    list_id: None,
                },
            )?;
        }
        Ok(view)
    }
    fn apply(
        &self,
        operation: &CollaborationTaskOperation,
        target_binding: &str,
        expected_revision: Option<&str>,
        operation_id: &str,
    ) -> Result<personal_dashboard_lib::tasks::TasksView, String> {
        self.inner
            .apply(operation, target_binding, expected_revision, operation_id)
    }
}

#[test]
fn interleaved_task_note_edit_is_rechecked_against_the_actual_proposal_baseline() {
    let directory = IsolatedDirectory::new();
    let vault = MutableVault::new(&directory.vault("vault"));
    let tasks = TaskApplication::new(vault.clone(), FixedClock, FileTaskStore);
    let empty = tasks.read().unwrap();
    tasks
        .create(TaskCreateInput {
            target_binding: empty.target_binding.unwrap(),
            expected_revision: empty.revision,
            task_id: "laundry-task".into(),
            name: "洗衣服".into(),
            content: Some("Original note".into()),
            date: Some("2026-09-28".into()),
            time: Some("10:00".into()),
            list_id: None,
        })
        .unwrap();
    let (application, _, results) = new_application(
        &directory,
        &vault,
        MutableContext::new("vault-a"),
        Arc::new(AtomicBool::new(false)),
    );
    let application = application.with_task_service(Arc::new(InterleavedTaskNoteEdit {
        inner: TaskApplicationCollaborationAdapter::new(TaskApplication::new(
            vault.clone(),
            FixedClock,
            FileTaskStore,
        )),
        vault: vault.clone(),
        read_once: AtomicBool::new(false),
    }));
    let session = application.create_session("2026-09-27").unwrap();
    let operation = json!({"operation":"updateTask", "taskId":"laundry-task", "name":"洗衣服", "content":"Original note", "date":"2026-10-02", "time":"10:00", "listId":null,
        "executionMode":"execute", "authorizationQuote":"洗衣服改到下周五"});
    application
        .submit_message(
            "vault-a",
            &session.id,
            "2026-09-27",
            &format!("single-date-fixture:{operation}"),
        )
        .unwrap();
    wait_for_finish(&application, &session.id, "vault-a");
    assert!(!results.lock().unwrap()[0].success);
    assert!(results.lock().unwrap()[0]
        .text
        .contains("Tasks changed"));
    assert!(application
        .session("vault-a", &session.id)
        .unwrap()
        .task_operations
        .is_empty());
    let saved = tasks.read().unwrap();
    assert_eq!(
        saved.tasks[0].content.as_deref(),
        Some("A concurrent user-authored note")
    );
    assert_eq!(saved.tasks[0].date.as_deref(), Some("2026-09-28"));
    assert_eq!(saved.tasks[0].changes.len(), 1);
}

#[test]
fn collaboration_habit_refresh_rebuilds_canonical_time_and_threshold_facts_after_rewrite_and_restart() {
    use personal_dashboard_lib::habits::{HabitCellStatus, HabitSnapshotState};
    use personal_dashboard_lib::today::HabitCompletionMutationInput;
    let directory=IsolatedDirectory::new();
    let path=directory.vault("habit-producer");
    prepare_daily_review_vault(&path,false);
    let vault=MutableVault::new(&path);
    let (app,tools,results,_)=new_automatic_application(&directory,&vault,MutableContext::new("vault-a"),ManualClock::new("2026-09-27","21:00"),None);
    let session=app.create_default_session().unwrap();
    for text in ["今天07:10起床，具体睡觉时刻不知道。".to_string(),
        format!("date-fixture:{}",json!({"operation":"saveEveningReview","mode":"addition","content":"按时睡觉。","executionMode":"execute","authorizationQuote":"补充复盘，按时睡觉。"})),
        "refresh habits exercise=synthetic-habit".into()] {
        app.submit_message("vault-a",&session.id,&session.target_date,&text).unwrap();
        wait_for_finish(&app,&session.id,"vault-a");
        assert!(results.lock().unwrap().last().unwrap().success,"{:?}",results.lock().unwrap().last());
    }
    assert!(tools.lock().unwrap().iter().any(|tool|tool["name"]=="dashboard_refresh_habits"));
    let today=TodayApplication::new(vault.clone(),NoVaultPicker,FixedClock);
    let first=today.habits().unwrap();
    assert_eq!(first.state,HabitSnapshotState::Ready);
    assert_eq!(first.habit("wake").unwrap().today.actual_time_label.as_deref(),Some("07:10"));
    assert_eq!(first.habit("sleep").unwrap().today.status,HabitCellStatus::ThresholdOnly);
    assert_eq!(first.habit("sleep").unwrap().today.actual_time_label,None);
    assert!(first.habit("exercise").unwrap().today.has_external_completion);
    let completed=today.set_local_habit_completion(HabitCompletionMutationInput {
        habit_key:"exercise".into(),lived_date:"2026-09-27".into(),completed:true,change_id:"producer-or-once".into(),
        target_binding:first.completion_target_binding.unwrap(),expected_revision:first.completion_revision,
    }).unwrap();
    assert!(completed.habit("exercise").unwrap().today.counts_as_completion);
    let snapshot_path=path.join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);
    let mut rebuilt:Value=serde_json::from_slice(&fs::read(&snapshot_path).unwrap()).unwrap();
    for habit in rebuilt["habits"].as_array_mut().unwrap() {
        if habit["key"]=="wake" {habit["name"]=json!("Renamed display only");}
        for day in habit["days"].as_array_mut().unwrap() {
            day["observations"].as_array_mut().unwrap().retain(|o|o["source"]!="dashboard-daily-record");
        }
        if habit["key"]=="exercise" {
            let day=habit["days"].as_array_mut().unwrap().iter_mut().find(|d|d["livedDate"]=="2026-09-27").unwrap();
            day["observations"].as_array_mut().unwrap().push(json!({"source":"manual","observedAt":"2026-09-27T20:00:00-04:00","status":"not-done","evidence":"manual-completion","note":"Preserved independent negative source"}));
        }
    }
    fs::write(&snapshot_path,serde_json::to_vec(&rebuilt).unwrap()).unwrap();
    app.shutdown().unwrap();
    let (reopened,_,reopen_results,_)=new_automatic_application(&directory,&vault,MutableContext::new("vault-a"),ManualClock::new("2026-09-27","21:30"),None);
    reopened.submit_message("vault-a",&session.id,&session.target_date,"refresh habits").unwrap();
    wait_for_finish(&reopened,&session.id,"vault-a");
    assert!(reopen_results.lock().unwrap().last().unwrap().success,"{:?}",reopen_results.lock().unwrap().last());
    let regenerated=TodayApplication::new(vault,NoVaultPicker,FixedClock).habits().unwrap();
    assert_eq!(regenerated.habit("wake").unwrap().name,"Renamed display only");
    assert_eq!(regenerated.habit("wake").unwrap().today.actual_time_label.as_deref(),Some("07:10"));
    let exercise=regenerated.habit("exercise").unwrap();
    assert!(exercise.today.counts_as_completion && exercise.today.has_external_completion);
    assert_eq!(exercise.completed_count,Some(1));
    assert_eq!(exercise.today.local_completion_state,HabitLocalCompletionState::Completed);
    let json=serde_json::to_value(exercise).unwrap();
    assert!(json.to_string().contains("Preserved independent negative source"));
    let report:Value=serde_json::from_str(&reopen_results.lock().unwrap().last().unwrap().text).unwrap();
    assert_eq!(report["query"],"verifiedMappedScope");assert_eq!(report["generation"],"validated");assert_eq!(report["publication"],"published");
    assert_eq!(reopened.session("vault-a",&session.id).unwrap().last_habit_refresh.as_ref().unwrap().publication,"published");
    reopened.submit_message("vault-a",&session.id,&session.target_date,"refresh habits source reset").unwrap();
    wait_for_finish(&reopened,&session.id,"vault-a");
    assert!(reopen_results.lock().unwrap().last().unwrap().success);
    let reset=TodayApplication::new(MutableVault::new(&path),NoVaultPicker,ManualClock::new("2026-09-27","21:30")).habits().unwrap();
    assert!(!reset.habit("exercise").unwrap().today.has_external_completion);
    assert!(reset.habit("exercise").unwrap().today.counts_as_completion);
    reopened.submit_message("vault-a",&session.id,&session.target_date,"refresh habits empty query").unwrap();
    wait_for_finish(&reopened,&session.id,"vault-a");
    assert!(reopen_results.lock().unwrap().last().unwrap().success);
    let empty=TodayApplication::new(MutableVault::new(&path),NoVaultPicker,ManualClock::new("2026-09-27","21:30")).habits().unwrap();
    assert!(!empty.habit("exercise").unwrap().today.has_external_completion);
    assert!(empty.habit("exercise").unwrap().today.counts_as_completion); // local OR remains authoritative
    assert_eq!(empty.habit("wake").unwrap().today.actual_time_label.as_deref(),Some("07:10"));

}

#[test]
fn habit_refresh_preserves_old_bytes_on_query_generation_publication_failure_and_retractions_survive_rebuild() {
    let directory=IsolatedDirectory::new();let path=directory.vault("habit-failures");
    let daily=prepare_daily_review_vault(&path,false);let vault=MutableVault::new(&path);
    let (app,_,results)=new_application(&directory,&vault,MutableContext::new("vault-a"),Arc::new(AtomicBool::new(false)));
    let session=app.create_default_session().unwrap();
    let snapshot=path.join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);
    for text in ["refresh habits exercise=synthetic-habit failed query","refresh habits exercise=synthetic-habit invalid status"] {
        let bytes=fs::read(&snapshot).unwrap();
        app.submit_message("vault-a",&session.id,&session.target_date,text).unwrap();wait_for_finish(&app,&session.id,"vault-a");
        assert!(!results.lock().unwrap().last().unwrap().success,"{text}");
        assert_eq!(fs::read(&snapshot).unwrap(),bytes);
    }
    let bytes=fs::read(&snapshot).unwrap();
    let mut current=bytes.clone();current.push(b'\n');fs::write(&snapshot,&current).unwrap();
    assert!(personal_dashboard_lib::habit_producer::publish(&path,&bytes,&bytes).is_err());
    assert_eq!(fs::read(&snapshot).unwrap(),current);
    let record=fs::read_to_string(&daily).unwrap().replace("- 观察事实：完成合成工作块。","- 观察事实：今天07:10起床。")
        .replace("- 已有原始复盘。","- 已有原始复盘。\n\n### 用户修正\n\n- 起床07:10写错了，起床时刻未知。\n- 按时睡觉。\n- 睡觉按时记录撤回，睡觉时刻未知。");
    fs::write(&daily,&record).unwrap();
    for _ in 0..2 {
        app.submit_message("vault-a",&session.id,&session.target_date,"refresh habits exercise=synthetic-habit").unwrap();wait_for_finish(&app,&session.id,"vault-a");
        assert!(results.lock().unwrap().last().unwrap().success,"{:?}",results.lock().unwrap().last());
        let view=TodayApplication::new(vault.clone(),NoVaultPicker,FixedClock).habits().unwrap();
        assert_eq!(view.habit("wake").unwrap().today.actual_time_label,None);
        assert_eq!(view.habit("sleep").unwrap().today.actual_time_label,None);
        assert!(!serde_json::to_value(view.habit("wake").unwrap()).unwrap().to_string().contains("07:10"));
    }
    assert_eq!(fs::read_to_string(daily).unwrap(),record);
}

#[test]
fn habit_refresh_before_four_preserves_generation_natural_date_and_explicit_next_day_actual_time() {
    let directory=IsolatedDirectory::new();let path=directory.vault("habit-early-hours");
    prepare_daily_review_vault(&path,false);let vault=MutableVault::new(&path);
    let clock=ManualClock::new("2026-09-28","01:00");
    let (app,_,results,_)=new_automatic_application(&directory,&vault,MutableContext::new("vault-a"),clock.clone(),None);
    let session=app.create_default_session().unwrap();assert_eq!(session.target_date,"2026-09-27");
    let message=format!("date-fixture:{}",json!({"operation":"createShortRecord","category":"ordinary","content":"次日00:30入睡。","executionMode":"execute","authorizationQuote":"记录次日00:30入睡。"}));
    app.submit_message("vault-a",&session.id,&session.target_date,&message).unwrap();wait_for_finish(&app,&session.id,"vault-a");
    assert!(results.lock().unwrap().last().unwrap().success);
    app.submit_message("vault-a",&session.id,&session.target_date,"refresh habits exercise=synthetic-habit").unwrap();wait_for_finish(&app,&session.id,"vault-a");
    assert!(results.lock().unwrap().last().unwrap().success,"{:?}",results.lock().unwrap().last());
    let report=app.session("vault-a",&session.id).unwrap().last_habit_refresh.unwrap();
    assert_eq!(report.generated_at.as_deref(),Some("2026-09-28T01:00:00-04:00"));
    assert_eq!(report.range_from.as_deref(),Some("2026-07-13"));assert_eq!(report.range_to.as_deref(),Some("2026-09-27"));
    let today=TodayApplication::new(vault.clone(),NoVaultPicker,clock);
    let view=today.habits().unwrap();assert_eq!(view.state,personal_dashboard_lib::habits::HabitSnapshotState::Ready);
    assert_eq!(view.habit("sleep").unwrap().today.actual_time_label.as_deref(),Some("次日 00:30"));
    let date_view=today.read_date("2026-09-27").unwrap();
    assert!(serde_json::to_string(&date_view.habit_corrections).unwrap().contains("次日 00:30"));
}

// Scripted native MCP actor with only an external source fault seam. Local
// writes, receipts, snapshots, restart and consumer reads use production stores.
#[derive(Default)]
struct DualSource {
    checkins: std::collections::BTreeMap<i64, i64>,
    writes: usize,
    reads: usize,
    fail: bool,
    lost_receipt: bool,
    readable: bool,
    projection_fail: bool,
    skip_projection: bool,
    habit_writes_allowed: bool,
    last_execution: Option<String>,
    last_action: Option<personal_dashboard_lib::collaboration::ExternalToolActionView>,
}
struct DualRuntime {
    base: DynamicRuntime,
    source: Arc<Mutex<DualSource>>,
}
impl AppServerTransport for DualRuntime {
    fn inspect(&mut self) -> Result<RuntimeConnectionView, String> {
        self.base.inspect()
    }
    fn start_chatgpt_login(&mut self) -> Result<(), String> {
        self.base.start_chatgpt_login()
    }
    fn start_thread(&mut self, m: Option<&str>, i: &str) -> Result<String, String> {
        self.base.start_thread(m, i)
    }
    fn start_thread_with_dynamic_tools(
        &mut self,
        m: Option<&str>,
        i: &str,
        t: Vec<Value>,
    ) -> Result<String, String> {
        self.base.start_thread_with_dynamic_tools(m, i, t)
    }
    fn resume_thread(&mut self, t: &str) -> Result<(), String> {
        self.base.resume_thread(t)
    }
    fn configure_external_writes(&mut self, a: bool) {
        self.base.configure_external_writes(a)
    }
    fn configure_external_habit_writes(&mut self, a: bool) {
        self.source.lock().unwrap().habit_writes_allowed = a;
    }

    fn send_turn(&mut self, r: RuntimeTurnRequest) -> Result<RuntimeTurnResult, String> {
        self.base.send_turn(r)
    }
    fn reconcile_external_action(
        &mut self,
        mut action: personal_dashboard_lib::collaboration::ExternalToolActionView,
    ) -> personal_dashboard_lib::collaboration::ExternalToolActionView {
        let mut source = self.source.lock().unwrap();
        source.reads += 1;
        let effect = action.verification.as_ref().unwrap()["habitCheckin"].clone();
        if source.readable
            && source.checkins.get(&effect["stamp"].as_i64().unwrap())
                == effect["status"].as_i64().as_ref()
        {
            action.status = "saved".into();
            action.result_summary="Current source readback confirms exact stable Habit and historical stamp, no write replayed.".into();
            action.verification.as_mut().unwrap()["sourceObserved"] = json!(true);
        } else {
            action.status = "unknown".into();
            action.verification.as_mut().unwrap()["sourceObserved"] = json!(source.readable);
        }
        action
    }
    fn reconcile_turn(
        &mut self,
        _: &str,
        execution: &str,
    ) -> Result<RuntimeRunReconciliation, String> {
        let action = {
            let source = self.source.lock().unwrap();
            assert_eq!(source.last_execution.as_deref(), Some(execution));
            source.last_action.clone().unwrap()
        };
        Ok(RuntimeRunReconciliation::Interrupted {
            work_history: None,
            runtime_turn_id: "lost-dual-turn".into(),
            external_actions: vec![self.reconcile_external_action(action)],
        })
    }
    fn send_turn_with_external_actions(
        &mut self,
        request: RuntimeTurnRequest,
        _: Arc<AtomicBool>,
        handler: Option<RuntimeDynamicToolHandler>,
        actions: Option<personal_dashboard_lib::collaboration::RuntimeExternalActionHandler>,
        _: Option<personal_dashboard_lib::collaboration::RuntimeExternalApprovalHandler>,
    ) -> Result<RuntimeTurnResult, String> {
        let handler = handler.unwrap();
        self.base.requests.lock().unwrap().push(request.clone());
        let text = &request.user_text;
        let completed = !(text.contains("撤回")
            || text.contains("撤销")
            || text.contains("只撤")
            || text.to_lowercase().contains("withdraw"));
        let relative_date =
            (text.contains("昨天") || text.to_lowercase().contains("yesterday")).then(|| match request
                .dates
                .request_natural_date
                .as_str()
            {
                "2026-09-27" => "2026-09-26".to_owned(),
                "2026-10-04" => "2026-10-03".to_owned(),
                _ => panic!("Unexpected scripted relative-date fixture"),
            });
        let date = if text.contains("2026-10-02") {
            "2026-10-02"
        } else if text.contains("2026-10-03") {
            "2026-10-03"
        } else if text.contains("2026-09-26") {
            "2026-09-26"
        } else if text.contains("2026-09-25") {
            "2026-09-25"
        } else if text.contains("2026-09-27") {
            "2026-09-27"
        } else if let Some(date) = relative_date.as_deref() {
            date
        } else {
            request.context.date.as_str()
        };
        let stamp = date.replace('-', "").parse::<i64>().unwrap();
        let desired = if completed { 2 } else { 0 };
        let effect_text = text
            .split('。')
            .find(|clause| clause.contains("运动") || clause.contains("锻炼"))
            .unwrap_or(text);
        let mut scope = if effect_text.contains("只记本地") || effect_text.contains("只撤本地")
        {
            "local"
        } else if effect_text.contains("只记滴答") || effect_text.contains("只撤滴答") {
            "external"
        } else {
            "both"
        };
        if !completed && scope == "both" {
            if let Some(original) = request.habit_completion_context["origins"]
                .as_array()
                .unwrap()
                .iter()
                .find(|item| item["habitKey"] == "exercise" && item["date"] == date)
            {
                scope = original["scope"].as_str().unwrap();
            }
        }
        let turn = format!("turn-{}", request.execution_id);
        if scope == "ambiguous" {
            return Ok(RuntimeTurnResult { text: "Original endpoint scope is unconfirmed; clarify before any mutation.".into(), runtime_turn_id: Some(turn), stopped: false, external_actions: vec![] });
        }
        if scope != "local" && !self.source.lock().unwrap().habit_writes_allowed {
            return Ok(RuntimeTurnResult { text: "Native mapped Habit mutation is unavailable in the current scoped catalog; no external effect sent.".into(), runtime_turn_id: Some(turn), stopped: false, external_actions: vec![] });
        }
        if text.contains("买菜") {
            let result = handler(RuntimeDynamicToolCall {
                thread_id: request.thread_id.clone(),
                turn_id: turn.clone(),
                call_id: "independent-local-task".into(),
                tool: "dashboard_task_operation".into(),
                arguments: json!({"operation":"createTask","name":"买菜","content":null,"date":null,"time":null,"listId":null,"executionMode":"execute","authorizationQuote":text.split('。').find(|c|c.contains("买菜")).unwrap()}),
            });
            self.base.results.lock().unwrap().push(result);
        }
        if text.contains("营养药完成了，只记本地") {
            let result = handler(RuntimeDynamicToolCall {
                thread_id: request.thread_id.clone(),
                turn_id: turn.clone(),
                call_id: "independent-local-nutrition".into(),
                tool: "dashboard_task_operation".into(),
                arguments: json!({"operation":"setLocalHabitCompletion","habitKey":"nutrition","completed":true,"targetDate":date,"scope":"local","executionMode":"execute","authorizationQuote":"营养药完成了，只记本地。"}),
            });
            self.base.results.lock().unwrap().push(result);
        }
        let local_state = request.habit_completion_context["targets"]
            .as_array()
            .into_iter()
            .flatten()
            .find(|target| target["habitKey"] == "exercise")
            .and_then(|target| target["localDates"].as_array())
            .and_then(|days| days.iter().find(|day| day["date"] == date))
            .and_then(|day| day["state"].as_str());
        let local_confirmed = if completed {
            local_state == Some("Completed")
        } else {
            local_state == Some("Withdrawn")
        };
        let scope_changed = request.habit_completion_context["origins"].as_array().into_iter().flatten()
            .find(|item| item["habitKey"] == "exercise" && item["date"] == date)
            .is_some_and(|item| item["scope"].as_str() != Some(scope));
        if scope != "external" && (!local_confirmed || (completed && scope_changed)) {
            let call = RuntimeDynamicToolCall {
                thread_id: request.thread_id.clone(),
                turn_id: turn.clone(),
                call_id: "local-dual-effect".into(),
                tool: "dashboard_task_operation".into(),
                arguments: json!({"operation":"setLocalHabitCompletion","habitKey":"exercise","completed":completed,"targetDate":date,"scope":if !completed && !effect_text.contains("只撤本地") && !effect_text.contains("只记本地") {"original"} else if scope=="local" {"local"} else if completed {"both"}else{"original"},"executionMode":if text.contains("先审阅") {"prepareProposal"} else {"execute"},"authorizationQuote":effect_text}),
            };
            let result = handler(call.clone());
            let duplicate = handler(call);
            assert_eq!(
                result, duplicate,
                "Duplicate delivery returns same local receipt"
            );
            self.base.results.lock().unwrap().push(result);
        }
        let mut external_actions = Vec::new();
        if scope != "local" {
            let mut source = self.source.lock().unwrap();
            source.reads += 1;
            if source.checkins.get(&stamp) != Some(&desired) {
                assert!(
                    self.base.external_writes_allowed || source.fail,
                    "Uncertain source reads must not grant native write capability"
                );
                if !source.fail {
                    source.checkins.insert(stamp, desired);
                    source.writes += 1;
                }
                let action=personal_dashboard_lib::collaboration::ExternalToolActionView {action_id:format!("{}:dual-checkin-{}",request.thread_id,request.execution_id),source_id:"dida365".into(),source_name:"Dida".into(),tool_id:"upsert_habit_checkins".into(),status:if source.fail || source.lost_receipt {"unknown"}else{"saved"}.into(),target_scope:date.into(),input_summary:"Exact verified synthetic-habit+stamp, supported status only; no invented minute".into(),result_summary:if source.fail {"External source failed; local success remains."}else if source.lost_receipt {"Native receipt lost; reread before retry."}else{"Current exact source readback confirmed."}.into(),verification:Some(json!({"habitCheckin":{"habitId":"synthetic-habit","stamp":stamp,"status":desired},"sourceObserved":!source.fail && !source.lost_receipt,"checks":[{"tool":"get_habit_checkins","arguments":{"habit_ids":["synthetic-habit"]}}]}))};
                source.last_action = Some(action.clone());
                source.last_execution = Some(request.execution_id.clone());
                if let Some(handler) = &actions {
                    handler(action.clone());
                }
                external_actions.push(action);
                if source.lost_receipt {
                    return Err("Native stream lost after the external write; endpoints must be reconciled independently".into());
                }
            }
        }
        if self.source.lock().unwrap().skip_projection {
            return Ok(RuntimeTurnResult { text: "Requested endpoint results saved; snapshot was not requested.".into(), runtime_turn_id: Some(turn), stopped: false, external_actions });
        }
        // Native reads are freshly generated after the endpoint attempts. The
        // real producer checks identities, range, version and publication.
        let source = self.source.lock().unwrap();
        let catalog = json!({"type":"mcpToolCall","server":"dida365","tool":"get_habit","status":"completed","arguments":{"habit_id":"synthetic-habit"},"result":{"structuredContent":{"id":"synthetic-habit","name":"Owned mapped Habit"}}});
        let checkins = json!({"type":"mcpToolCall","server":"dida365","tool":"get_habit_checkins","status":"completed","arguments":{"habit_ids":["synthetic-habit"],"from_stamp":20260601,"to_stamp":20261031,"client_timezone":"America/New_York"},"result":{"isError":false,"structuredContent":{"result":[{"habitId":"synthetic-habit","year":2026,"checkins":source.checkins.iter().map(|(stamp,status)|json!({"stamp":stamp,"status":status,"opTime":"2026-09-27T21:00:00-04:00"})).collect::<Vec<_>>()}]}}});
        let reads: Vec<_> = if source.projection_fail || !source.readable {
            vec![]
        } else {
            [catalog, checkins]
                .iter()
                .filter_map(personal_dashboard_lib::habit_producer::native_source_read)
                .collect()
        };
        drop(source);
        let refreshed = handler(RuntimeDynamicToolCall {
            thread_id: request.thread_id.clone(),
            turn_id: turn.clone(),
            call_id: "projection-after-endpoints".into(),
            tool: "dashboard_refresh_habits".into(),
            arguments: json!({"mappings":{"exercise":"synthetic-habit"},"executionMode":"execute","authorizationQuote":text,"hostSourceReads":reads}),
        });
        self.base.results.lock().unwrap().push(refreshed);
        Ok(RuntimeTurnResult {text:"Local and Dida endpoints are independent; source readback and snapshot stage report describe current outcomes. OR counts once; no successful endpoint was rolled back.".into(),runtime_turn_id:Some(turn),stopped:false,external_actions})
    }
}

fn new_dual_application(
    directory: &IsolatedDirectory,
    vault: &MutableVault,
    clock: ManualClock,
    source: Arc<Mutex<DualSource>>,
) -> (
    CollaborationApplication,
    Arc<Mutex<Vec<RuntimeDynamicToolResult>>>,
) {
    let results = Arc::new(Mutex::new(Vec::new()));
    let runtime = DualRuntime {
        base: DynamicRuntime {
            registered_tools: Arc::new(Mutex::new(Vec::new())),
            results: Arc::clone(&results),
            requests: Arc::new(Mutex::new(Vec::new())),
            automatic_gate: None,
            external_writes_allowed: false,
            starts: Arc::new(Mutex::new(Vec::new())),
        },
        source,
    };
    let app = CollaborationApplication::with_adapters(
        Arc::new(FileCollaborationStore::new(
            directory.path().join("collaboration/collaboration.json"),
        )),
        Box::new(runtime),
        Arc::new(MutableContext::new("vault-a")),
        Arc::new(clock.clone()),
        directory.path().join("runtime"),
        "Scripted dual-source acceptance, no model language claim".into(),
    )
    .with_task_service(Arc::new(TaskApplicationCollaborationAdapter::new(
        TaskApplication::new(vault.clone(), clock.clone(), FileTaskStore),
    )))
    .with_daily_data_service(Arc::new(
        TodayApplicationCollaborationDailyDataAdapter::new(TodayApplication::new(
            vault.clone(),
            NoVaultPicker,
            clock,
        )),
    ));
    (app, results)
}
fn prepare_dual_vault(path: &Path) {
    prepare_daily_review_vault(path, false);
    let snapshot = path.join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);
    let mut doc: Value = serde_json::from_slice(&fs::read(&snapshot).unwrap()).unwrap();
    doc["sources"].as_array_mut().unwrap().push(json!({"key":"dida-exercise","kind":"dida365","label":"Dida365 explicit mapping exercise=synthetic-habit"}));
    let exercise = doc["habits"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|h| h["key"] == "exercise")
        .unwrap();
    for day in exercise["days"].as_array_mut().unwrap() {
        day["observations"].as_array_mut().unwrap().clear();
    }
    fs::write(snapshot, serde_json::to_vec(&doc).unwrap()).unwrap();
}
fn dual_completion_bytes(path: &Path) -> Value {
    serde_json::from_slice(
        &fs::read(path.join("life/.personal-dashboard/habit-completions/v1/completions.json"))
            .unwrap(),
    )
    .unwrap()
}
fn dual_submit(app: &CollaborationApplication, session: &str, text: &str) {
    app.submit_message("vault-a", session, "2026-09-27", text)
        .unwrap();
    wait_for_finish(app, session, "vault-a");
}

#[test]
fn dual_habit_natural_history_completion_repeat_restart_and_default_withdrawal_count_once() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("dual-history");
    prepare_dual_vault(&path);
    let vault = MutableVault::new(&path);
    let clock = ManualClock::new("2026-09-27", "21:00");
    let source = Arc::new(Mutex::new(DualSource {
        readable: true,
        ..Default::default()
    }));
    let (app, results) =
        new_dual_application(&directory, &vault, clock.clone(), Arc::clone(&source));
    let session = app.create_default_session().unwrap();
    dual_submit(&app, &session.id, "2026-09-26锻炼完成了，具体时刻不知道。");
    assert!(
        results.lock().unwrap().iter().all(|r| r.success),
        "{:?}",
        results.lock().unwrap()
    );
    let saved = app.session("vault-a", &session.id).unwrap();
    assert_eq!(saved.task_operations[0].status, "applied");
    let baseline = serde_json::to_value(&saved.task_operations[0].baseline).unwrap();
    assert_eq!(baseline["destinationScope"], "both");
    assert_eq!(baseline["externalHabitId"], "synthetic-habit");
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, clock.clone());
    let snapshot = today.habits().unwrap();
    let habit = snapshot.habit("exercise").unwrap();
    let cell = habit.cell("2026-09-26").unwrap();
    assert!(cell.has_external_completion && cell.counts_as_completion);
    assert_eq!(
        cell.local_completion_state,
        HabitLocalCompletionState::Completed
    );
    assert_eq!(habit.completed_count, Some(1));
    let original = dual_completion_bytes(&path);
    assert_eq!(original["completions"][0]["livedDate"], "2026-09-26");
    assert!(original["completions"][0]["completedAt"]
        .as_str()
        .unwrap()
        .contains("2026-09-27"));
    dual_submit(&app, &session.id, "2026-09-26锻炼完成了，具体时刻不知道。");
    assert_eq!(source.lock().unwrap().writes, 1);
    assert_eq!(
        dual_completion_bytes(&path),
        original,
        "Confirmed local endpoint is not retried"
    );
    app.shutdown().unwrap();
    let (reopened, _) =
        new_dual_application(&directory, &vault, clock.clone(), Arc::clone(&source));
    dual_submit(
        &reopened,
        &session.id,
        "撤回2026-09-26锻炼完成，这个打卡记错了。",
    );
    let after = TodayApplication::new(vault, NoVaultPicker, clock)
        .habits()
        .unwrap();
    let habit = after.habit("exercise").unwrap();
    let cell = habit.cell("2026-09-26").unwrap();
    assert!(!cell.counts_as_completion && !cell.has_external_completion);
    assert_eq!(
        cell.local_completion_state,
        HabitLocalCompletionState::Withdrawn
    );
    assert_eq!(habit.completed_count, Some(0));
    assert_eq!(source.lock().unwrap().checkins[&20260926], 0);
    assert_eq!(
        dual_completion_bytes(&path)["completions"][0]["changes"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert_eq!(
        reopened
            .session("vault-a", &session.id)
            .unwrap()
            .last_habit_refresh
            .unwrap()
            .publication,
        "published"
    );
}

#[test]
fn dual_habit_single_end_withdrawal_preserves_other_end_or_and_legacy_local_scope() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("dual-single");
    prepare_dual_vault(&path);
    let vault = MutableVault::new(&path);
    let clock = ManualClock::new("2026-09-27", "21:00");
    let source = Arc::new(Mutex::new(DualSource {
        readable: true,
        ..Default::default()
    }));
    let (app, _) = new_dual_application(&directory, &vault, clock.clone(), Arc::clone(&source));
    let session = app.create_default_session().unwrap();
    dual_submit(&app, &session.id, "2026-09-26锻炼完成了。");
    clock.set_time("21:01");
    dual_submit(&app, &session.id, "只撤本地2026-09-26锻炼完成，滴答保留。");
    let snapshot = TodayApplication::new(vault.clone(), NoVaultPicker, clock.clone())
        .habits()
        .unwrap();
    let cell = snapshot
        .habit("exercise")
        .unwrap()
        .cell("2026-09-26")
        .unwrap();
    assert!(cell.counts_as_completion && cell.has_external_completion);
    assert_eq!(
        cell.local_completion_state,
        HabitLocalCompletionState::Withdrawn
    );
    assert_eq!(source.lock().unwrap().writes, 1);
    clock.set_time("21:02");
    dual_submit(
        &app,
        &session.id,
        "只撤滴答2026-09-26锻炼完成，其他记录保留。",
    );
    let snapshot = TodayApplication::new(vault.clone(), NoVaultPicker, clock.clone())
        .habits()
        .unwrap();
    assert!(
        !snapshot
            .habit("exercise")
            .unwrap()
            .cell("2026-09-26")
            .unwrap()
            .counts_as_completion
    );
    clock.set_time("21:03");
    dual_submit(&app, &session.id, "只记本地2026-09-26锻炼完成了。");
    let before = source.lock().unwrap().writes;
    // Simulate a legacy saved receipt that predates explicit scope metadata.
    let state_path = directory.path().join("collaboration/collaboration.json");
    app.shutdown().unwrap();
    let mut state: Value = serde_json::from_slice(&fs::read(&state_path).unwrap()).unwrap();
    let latest = state["sessions"][0]["taskOperations"]
        .as_array_mut()
        .unwrap()
        .last_mut()
        .unwrap();
    latest["baseline"]
        .as_object_mut()
        .unwrap()
        .remove("destinationScope");
    latest["baseline"]
        .as_object_mut()
        .unwrap()
        .remove("externalHabitId");
    fs::write(&state_path, serde_json::to_vec(&state).unwrap()).unwrap();
    let (reopened, _) = new_dual_application(&directory, &vault, clock.clone(), Arc::clone(&source));
    clock.set_time("21:04");
    dual_submit(
        &reopened,
        &session.id,
        "撤回2026-09-26锻炼完成，这个本地事实记错了。",
    );
    assert_eq!(
        source.lock().unwrap().writes,
        before,
        "Legacy local-only completion must not silently withdraw Dida"
    );
    let original_local = dual_completion_bytes(&path);
    clock.set_time("21:05");
    dual_submit(&reopened, &session.id, "只记滴答2026-09-26锻炼完成了。");
    assert_eq!(dual_completion_bytes(&path), original_local);
    clock.set_time("21:06");
    dual_submit(
        &reopened,
        &session.id,
        "撤回2026-09-26锻炼完成，这个打卡记错了。",
    );
    assert_eq!(dual_completion_bytes(&path),original_local,"Latest explicit external-only fact drives original withdrawal scope even after older local-only receipts");
    assert_eq!(source.lock().unwrap().checkins[&20260926], 0);
    let final_state = reopened.session("vault-a", &session.id).unwrap();
    let final_action = final_state
        .messages
        .iter()
        .flat_map(|message| &message.external_actions)
        .last()
        .unwrap();
    assert_eq!(
        final_action.verification.as_ref().unwrap()["habitScope"],
        "external",
        "Withdrawal action retains original external-only scope"
    );
}

#[test]
fn dual_habit_external_failure_projection_failure_and_lost_receipt_keep_local_success() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("dual-faults");
    prepare_dual_vault(&path);
    let vault = MutableVault::new(&path);
    let clock = ManualClock::new("2026-09-27", "21:00");
    let source = Arc::new(Mutex::new(DualSource {
        fail: true,
        readable: false,
        ..Default::default()
    }));
    let (app, _) = new_dual_application(&directory, &vault, clock.clone(), Arc::clone(&source));
    let session = app.create_default_session().unwrap();
    dual_submit(&app, &session.id, "2026-09-26锻炼完成了。");
    let saved = dual_completion_bytes(&path);
    let state = app.session("vault-a", &session.id).unwrap();
    assert_eq!(state.task_operations[0].status, "applied");
    assert_eq!(state.messages[0].external_actions[0].status, "unknown");
    assert_ne!(state.last_habit_refresh.unwrap().publication, "published");
    {
        let mut s = source.lock().unwrap();
        s.fail = false;
        s.readable = true;
        s.lost_receipt = true;
    }
    app.submit_message(
        "vault-a",
        &session.id,
        "2026-09-27",
        "2026-09-26锻炼完成了，继续核对这件事。",
    )
    .unwrap();
    for _ in 0..300 {
        if app.session("vault-a", &session.id).unwrap().run_state == "interrupted" {
            break;
        }
        thread::sleep(Duration::from_millis(10));
    }
    let lost = app.session("vault-a", &session.id).unwrap();
    assert_eq!(lost.run_state, "interrupted");
    let execution = lost
        .messages
        .iter()
        .filter_map(|m| m.execution_id.clone())
        .last()
        .unwrap();
    assert_eq!(source.lock().unwrap().writes, 1);
    assert_eq!(dual_completion_bytes(&path), saved);
    app.shutdown().unwrap();
    let (reopened, _) =
        new_dual_application(&directory, &vault, clock.clone(), Arc::clone(&source));
    {
        let mut s = source.lock().unwrap();
        s.lost_receipt = false;
        s.projection_fail = true;
    }
    reopened
        .reconcile_run_for_selected_vault(&session.id, &execution)
        .unwrap();
    dual_submit(
        &reopened,
        &session.id,
        "2026-09-26锻炼完成了，继续核对记录。",
    );
    assert_eq!(source.lock().unwrap().writes, 1);
    assert_eq!(dual_completion_bytes(&path), saved);
    assert_ne!(
        reopened
            .session("vault-a", &session.id)
            .unwrap()
            .last_habit_refresh
            .unwrap()
            .publication,
        "published"
    );
    source.lock().unwrap().projection_fail = false;
    dual_submit(
        &reopened,
        &session.id,
        "2026-09-26锻炼完成了，继续核对记录。",
    );
    assert_eq!(source.lock().unwrap().writes, 1);
    assert_eq!(dual_completion_bytes(&path), saved);
    assert_eq!(
        TodayApplication::new(vault, NoVaultPicker, clock)
            .habits()
            .unwrap()
            .habit("exercise")
            .unwrap()
            .completed_count,
        Some(1)
    );
}

#[test]
fn dual_habit_local_storage_failure_preserves_external_success_and_original_0400_target() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("dual-local-fault");
    prepare_dual_vault(&path);
    let vault = MutableVault::new(&path);
    let clock = ManualClock::new("2026-09-28", "01:00");
    let source = Arc::new(Mutex::new(DualSource {
        readable: true,
        ..Default::default()
    }));
    let completion = path.join("life/.personal-dashboard/habit-completions/v1/completions.json");
    fs::create_dir_all(completion.parent().unwrap()).unwrap();
    fs::write(&completion, b"invalid local store fixture").unwrap();
    let (app, results) =
        new_dual_application(&directory, &vault, clock.clone(), Arc::clone(&source));
    let session = app.create_default_session().unwrap();
    assert_eq!(session.target_date, "2026-09-27");
    dual_submit(&app, &session.id, "2026-09-26锻炼完成了。");
    assert!(!results.lock().unwrap()[0].success);
    assert_eq!(
        fs::read(&completion).unwrap(),
        b"invalid local store fixture"
    );
    assert_eq!(source.lock().unwrap().checkins[&20260926], 2);
    assert_eq!(source.lock().unwrap().writes, 1);
    let state = app.session("vault-a", &session.id).unwrap();
    assert_eq!(state.messages[0].external_actions[0].status, "saved");
    assert_eq!(state.last_habit_refresh.unwrap().publication, "published");
    fs::remove_file(&completion).unwrap();
    dual_submit(&app, &session.id, "2026-09-26锻炼完成了，继续核对记录。");
    assert_eq!(
        source.lock().unwrap().writes,
        1,
        "Retry only unconfirmed local end"
    );
    let snapshot = TodayApplication::new(vault, NoVaultPicker, clock)
        .habits()
        .unwrap();
    let cell = snapshot
        .habit("exercise")
        .unwrap()
        .cell("2026-09-26")
        .unwrap();
    assert!(cell.counts_as_completion && cell.has_external_completion);
    assert_eq!(
        cell.local_completion_state,
        HabitLocalCompletionState::Completed
    );
}

#[test]
fn dual_habit_mixed_local_task_and_other_local_habit_do_not_narrow_default_dual_exercise() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("dual-mixed-scopes");
    prepare_dual_vault(&path);
    let vault = MutableVault::new(&path);
    let clock = ManualClock::new("2026-09-27", "21:00");
    let source = Arc::new(Mutex::new(DualSource {
        readable: true,
        ..Default::default()
    }));
    let (app, results) =
        new_dual_application(&directory, &vault, clock.clone(), Arc::clone(&source));
    let session = app.create_default_session().unwrap();
    dual_submit(
        &app,
        &session.id,
        "安排买菜只在本地任务里创建。营养药完成了，只记本地。今天运动完成了。",
    );
    assert!(
        results.lock().unwrap().iter().all(|result| result.success),
        "{:?}",
        results.lock().unwrap()
    );
    let tasks = TaskApplication::new(vault.clone(), clock.clone(), FileTaskStore)
        .read()
        .unwrap();
    assert_eq!(tasks.tasks.len(), 1);
    assert_eq!(tasks.tasks[0].name, "买菜");
    let saved = app.session("vault-a", &session.id).unwrap();
    let scopes = saved
        .task_operations
        .iter()
        .filter_map(|operation| {
            let baseline = serde_json::to_value(&operation.baseline).unwrap();
            baseline["key"].as_str().map(|key| {
                (
                    key.to_owned(),
                    baseline["destinationScope"].as_str().unwrap().to_owned(),
                )
            })
        })
        .collect::<std::collections::BTreeMap<_, _>>();
    assert_eq!(scopes["nutrition"], "local");
    assert_eq!(scopes["exercise"], "both");
    assert_eq!(
        saved.messages[0].external_actions[0]
            .verification
            .as_ref()
            .unwrap()["habitScope"],
        "both"
    );
    assert!(
        source.lock().unwrap().habit_writes_allowed,
        "Default exercise still needs the real native Habit mutation schema"
    );
    assert_eq!(source.lock().unwrap().writes, 1);
    let view = TodayApplication::new(vault, NoVaultPicker, clock)
        .habits()
        .unwrap();
    assert!(
        view.habit("exercise")
            .unwrap()
            .today
            .has_external_completion
    );
    assert_eq!(
        view.habit("nutrition")
            .unwrap()
            .today
            .local_completion_state,
        HabitLocalCompletionState::Completed
    );
}


// Change a real synthetic canonical file at the persistence boundary used by
// publication. The CollaborationApplication and Today adapter remain real.
struct PublicationRaceVault {
    vault: PathBuf,
    record: PathBuf,
    replacement: Option<Vec<u8>>,
    armed: Arc<AtomicBool>,
    changed: Arc<AtomicBool>,
    reads: AtomicU64,
    change_on_read: u64,
}

impl TodayWorkspacePersistence for PublicationRaceVault {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        // Count publication checks only. Current-request Habit target reads can
        // precede generation; the real candidate file identifies this boundary.
        let staged = fs::read_dir(self.vault.join("life/.personal-dashboard/derived"))
            .map_err(|e| e.to_string())?
            .filter_map(Result::ok)
            .any(|entry| {
                let name = entry.file_name();
                let name = name.to_string_lossy();
                name.starts_with(".habits-v1-") && name.ends_with(".tmp")
            });
        if self.armed.load(Ordering::SeqCst)
            && staged
            && self.reads.fetch_add(1, Ordering::SeqCst) + 1 == self.change_on_read
        {
            if let Some(bytes) = &self.replacement {
                fs::write(&self.record, bytes).map_err(|e| e.to_string())?;
            } else {
                fs::remove_file(&self.record).map_err(|e| e.to_string())?;
            }
            self.changed.store(true, Ordering::SeqCst);
            self.armed.store(false, Ordering::SeqCst);
        }
        Ok(Some(self.vault.clone()))
    }
    fn save_selected_vault(&self, _vault: &Path) -> Result<(), String> {
        Err("This synthetic race fixture does not change selected Vaults".into())
    }
}

#[test]
fn collaboration_habit_publication_rejects_changed_deleted_or_new_canonical_sources_on_both_boundaries(
) {
    for boundary in [1, 2] {
        // before activation, then after activation
        for change in ["correction", "deletion", "creation"] {
            let directory = IsolatedDirectory::new();
            let path = directory.vault("publication-source-race");
            let record = prepare_daily_review_vault(&path, false);
            let original = fs::read_to_string(&record)
                .unwrap()
                .replace("完成合成工作块。", "今天07:10起床。");
            let replacement = original.replace("07:10", "07:50").into_bytes();
            if change == "creation" {
                fs::remove_file(&record).unwrap();
            } else {
                fs::write(&record, &original).unwrap();
            }
            let snapshot = path.join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);
            let previous = fs::read(&snapshot).unwrap();
            let vault = MutableVault::new(&path);
            let armed = Arc::new(AtomicBool::new(false));
            let changed = Arc::new(AtomicBool::new(false));
            let service =
                TodayApplicationCollaborationDailyDataAdapter::new(TodayApplication::new(
                    PublicationRaceVault {
                        vault: path.clone(),
                        record: record.clone(),
                        replacement: if change == "deletion" {
                            None
                        } else {
                            Some(replacement.clone())
                        },
                        armed: armed.clone(),
                        changed: changed.clone(),
                        reads: AtomicU64::new(0),
                        change_on_read: boundary,
                    },
                    NoVaultPicker,
                    FixedClock,
                ));
            let (app, _, results) = new_application(
                &directory,
                &vault,
                MutableContext::new("vault-a"),
                Arc::new(AtomicBool::new(false)),
            );
            let app = app.with_daily_data_service(Arc::new(service));
            let session = app.create_default_session().unwrap();
            armed.store(true, Ordering::SeqCst);
            app.submit_message(
                "vault-a",
                &session.id,
                &session.target_date,
                "refresh habits exercise=synthetic-habit",
            )
            .unwrap();
            wait_for_finish(&app, &session.id, "vault-a");
            assert!(
                changed.load(Ordering::SeqCst),
                "{change} at boundary {boundary}"
            );
            let result = results.lock().unwrap().last().unwrap().clone();
            assert!(
                !result.success,
                "{change} at boundary {boundary}: {}",
                result.text
            );
            let report: Value = serde_json::from_str(&result.text).unwrap();
            assert_ne!(report["publication"], "published");
            assert!(report["message"]
                .as_str()
                .unwrap()
                .contains("Canonical Daily Record changed"));
            assert_eq!(fs::read(&snapshot).unwrap(), previous);
            if change == "deletion" {
                assert!(!record.exists());
            } else {
                assert_eq!(fs::read(&record).unwrap(), replacement);
            }
            let persisted = app
                .session("vault-a", &session.id)
                .unwrap()
                .last_habit_refresh
                .unwrap();
            assert_ne!(persisted.publication, "published");
            // A subsequent user-requested rebuild consumes the changed source,
            // rather than replaying a rejected candidate or old conversation.
            app.submit_message(
                "vault-a",
                &session.id,
                &session.target_date,
                "refresh habits exercise=synthetic-habit",
            )
            .unwrap();
            wait_for_finish(&app, &session.id, "vault-a");
            assert!(results.lock().unwrap().last().unwrap().success);
            let current = TodayApplication::new(vault, NoVaultPicker, FixedClock)
                .habits()
                .unwrap();
            assert_eq!(
                current
                    .habit("wake")
                    .unwrap()
                    .today
                    .actual_time_label
                    .as_deref(),
                if change == "deletion" {
                    None
                } else {
                    Some("07:50")
                }
            );
            app.shutdown().unwrap();
        }
    }
}

// A model fixture enumerates effects of one supplied natural message. Every
// source write, readback, receipt and UI projection below uses production paths.
struct JourneyRuntime { dual: DualRuntime }
impl AppServerTransport for JourneyRuntime {
    fn start_chatgpt_login(&mut self)->Result<(),String>{self.dual.base.start_chatgpt_login()}
    fn inspect(&mut self)->Result<RuntimeConnectionView,String>{self.dual.inspect()}
    fn start_thread(&mut self,m:Option<&str>,i:&str)->Result<String,String>{self.dual.start_thread(m,i)}
    fn start_thread_with_dynamic_tools(&mut self,m:Option<&str>,i:&str,t:Vec<Value>)->Result<String,String>{self.dual.start_thread_with_dynamic_tools(m,i,t)}
    fn resume_thread(&mut self,t:&str)->Result<(),String>{self.dual.resume_thread(t)}
    fn configure_external_writes(&mut self,a:bool){self.dual.configure_external_writes(a)}
    fn configure_external_habit_writes(&mut self,a:bool){self.dual.configure_external_habit_writes(a)}
    fn send_turn(&mut self,r:RuntimeTurnRequest)->Result<RuntimeTurnResult,String>{self.dual.send_turn(r)}
    fn send_turn_with_external_actions(&mut self,r:RuntimeTurnRequest,cancel:Arc<AtomicBool>,handler:Option<RuntimeDynamicToolHandler>,actions:Option<personal_dashboard_lib::collaboration::RuntimeExternalActionHandler>,approval:Option<personal_dashboard_lib::collaboration::RuntimeExternalApprovalHandler>)->Result<RuntimeTurnResult,String>{
        if r.user_text=="2026-10-03运动完成，只记本地又只记滴答。" {
            return Ok(RuntimeTurnResult{text:"Clarify the destination for this same dated Habit.".into(),runtime_turn_id:Some(format!("turn-{}",r.execution_id)),stopped:false,external_actions:vec![]});
        }
        if r.user_text.starts_with("2026-10-03只改滴答 Habit synthetic-habit") {
            let action=personal_dashboard_lib::collaboration::ExternalToolActionView{action_id:"exact-source-only".into(),source_id:"dida365".into(),source_name:"Dida".into(),tool_id:"upsert_habit_checkins".into(),status:"saved".into(),target_scope:"2026-10-03".into(),input_summary:"Explicit stable source ID/date".into(),result_summary:"Fixture exact current source readback".into(),verification:Some(json!({"habitCheckin":{"habitId":"synthetic-habit","stamp":20261003,"status":2}}))};
            if let Some(h)=actions {h(action.clone());}
            return Ok(RuntimeTurnResult{text:"Only the explicitly named source endpoint.".into(),runtime_turn_id:Some(format!("turn-{}",r.execution_id)),stopped:false,external_actions:vec![action]});
        }
        if r.user_text=="下周五我要买菜" {
            let result=handler.unwrap()(RuntimeDynamicToolCall{thread_id:r.thread_id.clone(),turn_id:format!("turn-{}",r.execution_id),call_id:"future-commitment".into(),tool:"dashboard_task_operation".into(),arguments:json!({"operation":"createTask","name":"买菜","content":null,"date":"2026-10-02","time":null,"listId":null,"executionMode":"execute","authorizationQuote":r.user_text})});
            self.dual.base.results.lock().unwrap().push(result);
            return Ok(RuntimeTurnResult{text:"Check the original stable Task result.".into(),runtime_turn_id:Some(format!("turn-{}",r.execution_id)),stopped:false,external_actions:vec![]});
        }
        if !r.user_text.contains("今天晚间总结") && !r.user_text.starts_with("2026-10-03运动") {
            return self.dual.base.send_turn_with_dynamic_tools(r,cancel,handler);
        }
        let handler=handler.unwrap();
        if r.user_text.contains("今天晚间总结") {
            for (id,args) in [
                ("review",json!({"operation":"saveEveningReview","mode":"addition","content":"今天完成了读书，其他活动未提及。","executionMode":"execute","authorizationQuote":"今天晚间总结：今天完成了读书，其他活动未提及。"})),
                ("task",json!({"operation":"createTask","name":"买菜","content":null,"date":null,"time":null,"listId":null,"executionMode":"execute","authorizationQuote":"买菜只在本地任务里创建。"})),
                ("short",json!({"operation":"createShortRecord","category":"ordinary","content":"今天已经读完这本书了。","executionMode":"execute","authorizationQuote":"今天已经读完这本书了。"})),
            ] {
                let result=handler(RuntimeDynamicToolCall{thread_id:r.thread_id.clone(),turn_id:format!("turn-{}",r.execution_id),call_id:id.into(),tool:"dashboard_task_operation".into(),arguments:args});
                self.dual.base.results.lock().unwrap().push(result);
            }
        }
        let mut all=Vec::new();
        for (index,clause) in r.user_text.split(['。','；']).filter(|c|c.contains("运动")).enumerate() {
            let mut part=r.clone();part.user_text=clause.into();
            let h=handler.clone();
            let part_handler:RuntimeDynamicToolHandler=Arc::new(move|mut call|{call.call_id=format!("journey-{index}-{}",call.call_id);h(call)});
            let source_actions=actions.clone();
            let part_actions:personal_dashboard_lib::collaboration::RuntimeExternalActionHandler=Arc::new(move|mut action|{action.action_id=format!("journey-{index}-{}",action.action_id);if let Some(h)=&source_actions{h(action)}});
            let result=self.dual.send_turn_with_external_actions(part,cancel.clone(),Some(part_handler),Some(part_actions),approval.clone())?;
            all.extend(result.external_actions.into_iter().map(|mut action|{action.action_id=format!("journey-{index}-{}",action.action_id);action}));
        }
        Ok(RuntimeTurnResult{text:"Each source result is independent; any unknown endpoint remains unfinished.".into(),runtime_turn_id:Some(format!("turn-{}",r.execution_id)),stopped:false,external_actions:all})
    }
}

fn new_journey_application(directory:&IsolatedDirectory,vault:&MutableVault,clock:ManualClock,source:Arc<Mutex<DualSource>>,fail:Arc<AtomicBool>)->CollaborationApplication {
    let base=DynamicRuntime{registered_tools:Arc::new(Mutex::new(vec![])),results:Arc::new(Mutex::new(vec![])),requests:Arc::new(Mutex::new(vec![])),automatic_gate:None,external_writes_allowed:false,starts:Arc::new(Mutex::new(vec![]))};
    CollaborationApplication::with_adapters(Arc::new(FailNextSaveStore{inner:FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json")),fail_next_save:fail}),Box::new(JourneyRuntime{dual:DualRuntime{base,source}}),Arc::new(MutableContext::new("vault-a")),Arc::new(clock.clone()),directory.path().join("runtime"),"Model fixture only: no native language-interpretation acceptance claim".into())
        .with_task_service(Arc::new(TaskApplicationCollaborationAdapter::new(TaskApplication::new(vault.clone(),clock.clone(),FileTaskStore))))
        .with_daily_data_service(Arc::new(TodayApplicationCollaborationDailyDataAdapter::new(TodayApplication::new(vault.clone(),NoVaultPicker,clock))))
}

#[test]
fn one_evening_message_keeps_independent_results_prior_review_and_tentative_activity() {
    for external_failed in [false,true] {
        let directory=IsolatedDirectory::new();let path=directory.vault("journey");prepare_dual_vault(&path);
        let vault=MutableVault::new(&path);let clock=ManualClock::new("2026-09-27","21:00");
        let source=Arc::new(Mutex::new(DualSource{readable:true,fail:external_failed,projection_fail:external_failed,..Default::default()}));
        let app=new_journey_application(&directory,&vault,clock.clone(),source.clone(),Arc::new(AtomicBool::new(false)));
        let session=app.create_default_session().unwrap();
        app.submit_message("vault-a",&session.id,&session.target_date,"create task").unwrap();wait_for_finish(&app,&session.id,"vault-a");
        let review=app.session("vault-a",&session.id).unwrap().task_operations[0].id.clone();
        let message="今天晚间总结：今天完成了读书，其他活动未提及。买菜只在本地任务里创建。今天已经读完这本书了。今天运动完成了。也许明天刷墙。";
        app.submit_message("vault-a",&session.id,&session.target_date,message).unwrap();wait_for_finish(&app,&session.id,"vault-a");
        let state=app.session("vault-a",&session.id).unwrap();assert_eq!(state.run_state,"completed");assert!(!state.progress.contains("No Dashboard data was changed"));
        assert_eq!(state.task_operations.iter().find(|p|p.id==review).unwrap().status,"awaitingApproval");
        let current=state.messages.iter().find(|m|m.role=="user" && m.text==message).unwrap();
        assert_eq!(current.action_results.iter().filter(|r|r.source=="Dashboard" && r.status=="applied").count(),4);
        assert!(current.action_results.iter().all(|r|r.id!=review));
        assert!(current.action_results.iter().any(|r|r.source=="Habits page" && r.status==if external_failed{"retainedOrMissing"}else{"ready"}));
        if external_failed {assert!(current.action_results.iter().any(|r|r.source=="Dida" && r.status=="unknown"));}
        let tasks=TaskApplication::new(vault.clone(),clock.clone(),FileTaskStore).read().unwrap();assert_eq!(tasks.tasks.len(),1);assert_eq!(tasks.tasks[0].name,"买菜");
        let today=TodayApplication::new(vault.clone(),NoVaultPicker,clock.clone());let record=today.read_date("2026-09-27").unwrap();
        assert_eq!(record.daytime.short_records.len(),1);assert!(serde_json::to_string(&record.evening).unwrap().contains("完成了读书"));
        let habits=today.habits().unwrap();assert_eq!(habits.habit("exercise").unwrap().today.local_completion_state,HabitLocalCompletionState::Completed);
        assert_eq!(habits.habit("nutrition").unwrap().today.local_completion_state,HabitLocalCompletionState::None);
        let before=fs::read(path.join("life/Journal/Daily/2026/2026-09/2026-09-27.md")).unwrap();
        app.shutdown().unwrap();drop(app);
        let reopened=new_journey_application(&directory,&vault,clock,source.clone(),Arc::new(AtomicBool::new(false)));
        let restored=reopened.session("vault-a",&session.id).unwrap();assert_eq!(restored.messages.iter().find(|m|m.id==current.id).unwrap().action_results,current.action_results);
        reopened.submit_message("vault-a",&session.id,&session.target_date,message).unwrap();wait_for_finish(&reopened,&session.id,"vault-a");
        assert_eq!(fs::read(path.join("life/Journal/Daily/2026/2026-09/2026-09-27.md")).unwrap(),before);
        assert_eq!(TaskApplication::new(vault.clone(),FixedClock,FileTaskStore).read().unwrap().tasks.len(),1);
        let repeated=reopened.session("vault-a",&session.id).unwrap();
        assert_eq!(repeated.messages.iter().rev().find(|m|m.role=="user").unwrap().action_results.iter().filter(|r|r.source=="Dashboard" && r.status=="applied").count(),3);
        assert_eq!(source.lock().unwrap().writes,usize::from(!external_failed));
        reopened.shutdown().unwrap();
    }
}

#[test]
fn same_date_ambiguous_habit_scope_cannot_be_overridden_by_a_shorter_local_quote() {
    let directory=IsolatedDirectory::new();let path=directory.vault("same-date-ambiguous");prepare_dual_vault(&path);
    let vault=MutableVault::new(&path);let clock=ManualClock::new("2026-10-03","21:00");
    let source=Arc::new(Mutex::new(DualSource{readable:true,..Default::default()}));
    let today=TodayApplication::new(vault.clone(),NoVaultPicker,clock.clone());
    let before=today.habits().unwrap();
    let daily=path.join("life/Journal/Daily/2026/2026-10/2026-10-03.md");
    let daily_before=fs::read(&daily).ok();
    let snapshot_before=fs::read(path.join("life/.personal-dashboard/derived/habits-v1.json")).ok();
    let app=new_journey_application(&directory,&vault,clock,source.clone(),Arc::new(AtomicBool::new(false)));
    let session=app.create_default_session().unwrap();
    app.submit_message("vault-a",&session.id,&session.target_date,"2026-10-03运动完成，只记本地又只记滴答。").unwrap();wait_for_finish(&app,&session.id,"vault-a");
    let state=app.session("vault-a",&session.id).unwrap();assert_eq!(state.run_state,"completed");
    assert!(state.task_operations.is_empty());assert!(state.messages.iter().all(|m|m.external_actions.is_empty() && m.action_results.is_empty()));
    assert_eq!(today.habits().unwrap().habit("exercise").unwrap().today.local_completion_state,before.habit("exercise").unwrap().today.local_completion_state);
    assert_eq!(fs::read(&daily).ok(),daily_before);assert_eq!(fs::read(path.join("life/.personal-dashboard/derived/habits-v1.json")).ok(),snapshot_before);
    assert!(source.lock().unwrap().checkins.is_empty());app.shutdown().unwrap();
}

#[test]
fn date_qualified_same_habit_effects_keep_local_and_external_scopes_independent() {
    let directory=IsolatedDirectory::new();let path=directory.vault("multi-date");prepare_dual_vault(&path);
    let vault=MutableVault::new(&path);let clock=ManualClock::new("2026-10-03","21:00");
    let source=Arc::new(Mutex::new(DualSource{readable:true,..Default::default()}));
    let app=new_journey_application(&directory,&vault,clock.clone(),source.clone(),Arc::new(AtomicBool::new(false)));
    let session=app.create_default_session().unwrap();
    let text="2026-10-03运动完成，只记本地；2026-10-02运动完成，只记滴答。";
    app.submit_message("vault-a",&session.id,&session.target_date,text).unwrap();wait_for_finish(&app,&session.id,"vault-a");
    let state=app.session("vault-a",&session.id).unwrap();assert_eq!(state.run_state,"completed");
    let local=state.task_operations.iter().find(|p|matches!(p.operation,CollaborationTaskOperation::SetLocalHabitCompletion{..})).unwrap();assert_eq!(local.status,"applied");assert_eq!(local.target_date,"2026-10-03");
    assert_eq!(serde_json::to_value(&local.baseline).unwrap()["destinationScope"],"local");
    let user=state.messages.iter().find(|m|m.text==text).unwrap();assert_eq!(user.external_actions.len(),1);assert_eq!(user.external_actions[0].verification.as_ref().unwrap()["habitScope"],"external");
    assert_eq!(source.lock().unwrap().checkins.get(&20261002),Some(&2));assert!(!source.lock().unwrap().checkins.contains_key(&20261003));
    let today=TodayApplication::new(vault,NoVaultPicker,clock);let view=today.habits().unwrap();assert_eq!(view.habit("exercise").unwrap().today.local_completion_state,HabitLocalCompletionState::Completed);
    app.shutdown().unwrap();
}

struct HistoryFaultAfterTaskSave {
    inner:TaskApplicationCollaborationAdapter<MutableVault,ManualClock,FileTaskStore>,
    fail:Arc<AtomicBool>, once:AtomicBool,
}
impl CollaborationTaskService for HistoryFaultAfterTaskSave {
    fn read(&self)->Result<personal_dashboard_lib::tasks::TasksView,String>{self.inner.read()}
    fn apply(&self,o:&CollaborationTaskOperation,b:&str,r:Option<&str>,id:&str)->Result<personal_dashboard_lib::tasks::TasksView,String>{
        let saved=self.inner.apply(o,b,r,id)?;
        if !self.once.swap(true,Ordering::SeqCst){self.fail.store(true,Ordering::SeqCst);}
        Ok(saved)
    }
}

#[test]
fn repeated_attempted_task_reads_original_id_after_history_failure_and_preserves_later_user_note() {
    for concurrent_note in [false,true] {
        let directory=IsolatedDirectory::new();let path=directory.vault("history-fault");prepare_dual_vault(&path);
        let vault=MutableVault::new(&path);let clock=ManualClock::new("2026-09-27","21:00");let fail=Arc::new(AtomicBool::new(false));let source=Arc::new(Mutex::new(DualSource::default()));
        let app=new_journey_application(&directory,&vault,clock.clone(),source.clone(),fail.clone()).with_task_service(Arc::new(HistoryFaultAfterTaskSave{inner:TaskApplicationCollaborationAdapter::new(TaskApplication::new(vault.clone(),clock.clone(),FileTaskStore)),fail,once:AtomicBool::new(false)}));
        let session=app.create_default_session().unwrap();app.submit_message("vault-a",&session.id,&session.target_date,"下周五我要买菜").unwrap();wait_for_finish(&app,&session.id,"vault-a");
        let operation=app.session("vault-a",&session.id).unwrap().task_operations[0].clone();assert_eq!(operation.status,"awaitingApproval");
        let tasks=TaskApplication::new(vault.clone(),clock.clone(),FileTaskStore);let view=tasks.read().unwrap();let task=&view.tasks[0];
        if concurrent_note {tasks.update(personal_dashboard_lib::tasks::TaskUpdateInput{target_binding:view.target_binding.clone().unwrap(),expected_revision:view.revision.clone().unwrap(),task_id:task.id.clone(),change_id:"later-user-note".into(),name:task.name.clone(),content:Some("Concurrent user note stays intact".into()),date:task.date.clone(),time:task.time.clone(),list_id:None}).unwrap();}
        let before=fs::read(path.join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH)).unwrap();app.shutdown().unwrap();drop(app);
        let reopened=new_journey_application(&directory,&vault,clock,source,Arc::new(AtomicBool::new(false)));
        reopened.submit_message("vault-a",&session.id,&session.target_date,"下周五我要买菜").unwrap();wait_for_finish(&reopened,&session.id,"vault-a");
        let after=tasks.read().unwrap();assert_eq!(after.tasks.len(),1);assert_eq!(after.tasks[0].id,task.id);assert_eq!(fs::read(path.join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH)).unwrap(),before);
        let state=reopened.session("vault-a",&session.id).unwrap();assert_eq!(state.task_operations.len(),1);assert_eq!(state.task_operations[0].status,if concurrent_note{"conflict"}else{"applied"});
        reopened.shutdown().unwrap();
    }
}



struct HistoryFaultAfterRefresh {
    inner:TodayApplicationCollaborationDailyDataAdapter<MutableVault,NoVaultPicker,FixedClock>,
    fail:Arc<AtomicBool>,
}
impl personal_dashboard_lib::collaboration::CollaborationDailyDataService for HistoryFaultAfterRefresh {
    fn read_date(&self,date:&str)->Result<personal_dashboard_lib::today::TodayView,String>{self.inner.read_date(date)}
    fn save(&self,input:DailyPlanWriteInput)->Result<personal_dashboard_lib::today::TodayView,String>{self.inner.save(input)}
    fn operation_applied(&self,date:&str,binding:&str,id:&str,fingerprint:&str)->Result<bool,String>{self.inner.operation_applied(date,binding,id,fingerprint)}
    fn read_habit_snapshot(&self)->Result<personal_dashboard_lib::habits::HabitSnapshotView,String>{self.inner.read_habit_snapshot()}
    fn refresh_habit_snapshot(&self,input:personal_dashboard_lib::habit_producer::HabitRefreshInput)->personal_dashboard_lib::habit_producer::HabitRefreshReport {
        let report=self.inner.refresh_habit_snapshot(input);self.fail.store(true,Ordering::SeqCst);report
    }
}

#[test]
fn refresh_duplicate_after_successful_publication_and_lost_history_keeps_unknown_result_until_fresh_call() {
    let directory=IsolatedDirectory::new();let path=directory.vault("refresh-history-fault");prepare_daily_review_vault(&path,false);
    let vault=MutableVault::new(&path);let fail=Arc::new(AtomicBool::new(false));
    let (app,_,results)=new_application(&directory,&vault,MutableContext::new("vault-a"),fail.clone());
    let app=app.with_daily_data_service(Arc::new(HistoryFaultAfterRefresh{inner:TodayApplicationCollaborationDailyDataAdapter::new(TodayApplication::new(vault.clone(),NoVaultPicker,FixedClock)),fail}));
    let session=app.create_default_session().unwrap();let text="refresh habits exercise=synthetic-habit";
    app.submit_message("vault-a",&session.id,&session.target_date,text).unwrap();wait_for_finish(&app,&session.id,"vault-a");
    assert!(!results.lock().unwrap().last().unwrap().success);
    let state=app.session("vault-a",&session.id).unwrap();let first=state.messages.iter().find(|m|m.role=="user").unwrap();
    assert_eq!(first.action_results.len(),4);assert!(first.action_results.iter().all(|r|r.status=="unknown"));
    let persisted=FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json")).load().unwrap();
    assert_eq!(persisted.sessions[0].habit_refresh_receipts.len(),1);assert!(persisted.sessions[0].habit_refresh_receipts[0].result.is_none());
    let snapshot=path.join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);let before=fs::read(&snapshot).unwrap();
    assert!(String::from_utf8_lossy(&before).contains("synthetic-habit"));app.shutdown().unwrap();drop(app);
    let (reopened,_,new_results)=new_application(&directory,&vault,MutableContext::new("vault-a"),Arc::new(AtomicBool::new(false)));
    let restored=reopened.session("vault-a",&session.id).unwrap();assert_eq!(restored.messages.iter().find(|m|m.id==first.id).unwrap().action_results,first.action_results);
    // A new intentional call after fresh source reads can rebuild; the old
    // delivered call remains unknown and is never silently converted to success.
    reopened.submit_message("vault-a",&session.id,&session.target_date,text).unwrap();wait_for_finish(&reopened,&session.id,"vault-a");
    assert!(new_results.lock().unwrap().last().unwrap().success);let final_state=reopened.session("vault-a",&session.id).unwrap();
    assert_eq!(final_state.messages.iter().find(|m|m.id==first.id).unwrap().action_results,first.action_results);
    assert!(final_state.messages.iter().rev().find(|m|m.role=="user").unwrap().action_results.iter().any(|r|r.source=="Habits page" && r.status=="ready"));
    reopened.shutdown().unwrap();
}

#[test]
fn planned_header_ranges_survive_unknown_facts_and_diary_comments_stay_hidden_without_source_rewrite() {
    let directory=IsolatedDirectory::new();let path=directory.vault("native-reading");let record=prepare_daily_review_vault(&path,false);
    let original=fs::read_to_string(&record).unwrap();
    let text=original.replace("- **下午：** Synthetic current arrangement.","- **17:00–18:30：** 收拾。实际活动未确认。\n- **18:30–22:30：** 阅读。睡觉分钟不知道。\n- **22:30–23:30：** 休息。23:30 只是计划。").replace("- 观察事实：完成合成工作块。","- 观察事实：今天07:50起床。\n\n<!-- 更正痕迹：原07:10；原事件收据taskop-synthetic -->\n<!-- 多行元数据\n低层收据不显示\n-->\n用户上下文仍可阅读。");
    fs::write(&record,&text).unwrap();let today=TodayApplication::new(MutableVault::new(&path),NoVaultPicker,FixedClock);let view=today.read_date("2026-09-27").unwrap();
    assert_eq!(view.time_axis.current_arrangement.iter().map(|e|(e.start_minute,e.end_minute)).collect::<Vec<_>>(),vec![(Some(1020),Some(1110)),(Some(1110),Some(1350)),(Some(1350),Some(1410))]);
    assert_eq!(view.time_axis.confirmed_facts[0].start_minute,Some(470));
    let context=serde_json::to_string(&view.daytime.updates).unwrap();assert!(context.contains("用户上下文仍可阅读"));assert!(!context.contains("taskop-synthetic"));assert!(!context.contains("低层收据"));
    assert_eq!(fs::read_to_string(&record).unwrap(),text);assert_eq!(view.baseline, today.read_date("2026-09-27").unwrap().baseline);
}

#[test]
fn target_qualified_explicit_memory_instruction_preserves_all_other_domain_sources_and_negation() {
    for declined in [false] {
        let directory=IsolatedDirectory::new();let path=directory.vault("target-memory");let record=prepare_daily_review_vault(&path,false);
        let vault=MutableVault::new(&path);let (app,_,results)=new_application(&directory,&vault,MutableContext::new("vault-a"),Arc::new(AtomicBool::new(false)));
        let memory=FixtureMemoryService::new(&directory,&vault);let self_path=path.join("life/Self.md");let self_before=fs::read(&self_path).unwrap();let record_before=fs::read(&record).unwrap();let snapshot=path.join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);let snapshot_before=fs::read(&snapshot).unwrap();
        let app=app.with_memory_service(Arc::new(memory));let session=app.create_default_session().unwrap();
        let text="请更新此隔离 Vault 的长期背景：我长期偏好先写简短复盘，再调整计划；未记录的活动保持未知。这是我明确确认的长期规划偏好，请通过 Dashboard 长期背景操作保存，保留 Self 原有内容。这次不要改 Daily Record、Tasks、Habits 或任何 Dida 数据。";
        let text=if declined{text.replacen("请更新","不要更新",1)}else{text.into()};
        app.submit_message("vault-a",&session.id,&session.target_date,&text).unwrap();wait_for_finish(&app,&session.id,"vault-a");
        assert_eq!(results.lock().unwrap().last().unwrap().success,!declined);
        let saved=fs::read(&self_path).unwrap();assert!(saved.starts_with(&self_before));
        if declined{assert_eq!(saved,self_before)}else{assert!(String::from_utf8_lossy(&saved).contains("我长期偏好先写简短复盘，再调整计划；未记录的活动保持未知。"));let state=app.session("vault-a",&session.id).unwrap();assert!(state.messages.iter().find(|m|m.text==text).unwrap().action_results.iter().any(|r|r.source=="Long-term background" && r.status=="applied"));}
        assert_eq!(fs::read(&record).unwrap(),record_before);assert_eq!(fs::read(&snapshot).unwrap(),snapshot_before);assert!(!path.join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH).exists());
        app.shutdown().unwrap();
    }
}

struct UnavailableDailyIdentity;
impl personal_dashboard_lib::collaboration::CollaborationDailyDataService for UnavailableDailyIdentity {
    fn is_available(&self)->bool{false}
    fn read_date(&self,_:&str)->Result<personal_dashboard_lib::today::TodayView,String>{Err("Local identity unavailable".into())}
    fn save(&self,_:DailyPlanWriteInput)->Result<personal_dashboard_lib::today::TodayView,String>{Err("No local write".into())}
    fn operation_applied(&self,_:&str,_:&str,_:&str,_:&str)->Result<bool,String>{Err("No local receipt".into())}
}
#[test]
fn exact_native_habit_id_retains_external_only_origin_when_local_catalog_is_unavailable() {
    let directory=IsolatedDirectory::new();let path=directory.vault("only-source-id");prepare_dual_vault(&path);let vault=MutableVault::new(&path);
    let app=new_journey_application(&directory,&vault,ManualClock::new("2026-10-03","21:00"),Arc::new(Mutex::new(DualSource::default())),Arc::new(AtomicBool::new(false))).with_daily_data_service(Arc::new(UnavailableDailyIdentity));
    let session=app.create_default_session().unwrap();app.submit_message("vault-a",&session.id,&session.target_date,"2026-10-03只改滴答 Habit synthetic-habit，记录运动完成。买菜只在本地任务里创建。").unwrap();wait_for_finish(&app,&session.id,"vault-a");
    let state=app.session("vault-a",&session.id).unwrap();assert!(state.task_operations.is_empty());let action=&state.messages.iter().find(|m|m.role=="user").unwrap().external_actions[0];
    assert_eq!(action.verification.as_ref().unwrap()["habitScope"],"external");assert!(!path.join("life/.personal-dashboard/habit-completions/v1/completions.json").exists());
    app.shutdown().unwrap();
}

struct StartupRecoveryRuntime {
    base: DynamicRuntime,
    configs: Arc<Mutex<Vec<(bool, bool, Vec<Value>)>>>,
    probes: Arc<Mutex<Vec<(String, bool)>>>,
    writes: Arc<Mutex<Vec<String>>>,
    recover_after: usize,
    habit_writes: bool,
    unavailable: bool,
}
impl AppServerTransport for StartupRecoveryRuntime {
    fn inspect(&mut self)->Result<RuntimeConnectionView,String>{self.base.inspect()}
    fn start_chatgpt_login(&mut self)->Result<(),String>{self.base.start_chatgpt_login()}
    fn configure_external_writes(&mut self,allowed:bool){self.base.configure_external_writes(allowed)}
    fn configure_external_habit_writes(&mut self,allowed:bool){self.habit_writes=allowed;}
    fn external_capability_fingerprint(&self)->Option<String>{Some("same-selected-native-source".into())}
    fn start_thread(&mut self,m:Option<&str>,i:&str)->Result<String,String>{self.base.start_thread(m,i)}
    fn start_thread_with_dynamic_tools(&mut self,m:Option<&str>,i:&str,t:Vec<Value>)->Result<String,String>{
        self.configs.lock().unwrap().push((self.base.external_writes_allowed,self.habit_writes,t.clone()));
        self.base.start_thread_with_dynamic_tools(m,i,t)
    }
    fn resume_thread(&mut self,t:&str)->Result<(),String>{self.base.resume_thread(t)}
    fn external_source_startup_failed(&mut self,t:&str)->bool{
        self.unavailable=self.base.starts.lock().unwrap().len()<self.recover_after;
        self.probes.lock().unwrap().push((t.into(),self.unavailable));
        self.unavailable
    }
    fn send_turn(&mut self,r:RuntimeTurnRequest)->Result<RuntimeTurnResult,String>{self.base.send_turn(r)}
    fn send_turn_with_external_actions(&mut self,r:RuntimeTurnRequest,_cancel:Arc<AtomicBool>,handler:Option<RuntimeDynamicToolHandler>,actions:Option<personal_dashboard_lib::collaboration::RuntimeExternalActionHandler>,_approval:Option<personal_dashboard_lib::collaboration::RuntimeExternalApprovalHandler>)->Result<RuntimeTurnResult,String>{
        self.base.requests.lock().unwrap().push(r.clone());
        let mut external=vec![];
        if r.user_text=="请创建本地任务买菜" {
            let result=handler.unwrap()(RuntimeDynamicToolCall{thread_id:r.thread_id.clone(),turn_id:format!("turn-{}",r.execution_id),call_id:"current-local".into(),tool:"dashboard_task_operation".into(),arguments:json!({"operation":"createTask","name":"买菜","content":null,"date":null,"time":null,"listId":null,"executionMode":"execute","authorizationQuote":r.user_text})});
            assert!(result.success,"Local work must continue when native recovery fails: {}",result.text);
        } else {
            assert_eq!(r.user_text,"请在滴答创建取包裹任务");
            if !self.unavailable {
                assert!(self.base.external_writes_allowed);
                self.writes.lock().unwrap().push(r.user_text.clone());
                let action=personal_dashboard_lib::collaboration::ExternalToolActionView{action_id:format!("native-current-{}",r.execution_id),source_id:"dida365".into(),source_name:"Dida".into(),tool_id:"create_task".into(),status:"saved".into(),target_scope:"Source-created task".into(),input_summary:"Only the current request; source generates ID".into(),result_summary:"Current source readback confirmed".into(),verification:Some(json!({"sourceCreatedId":"synthetic-source-generated-id"}))};
                if let Some(h)=actions {h(action.clone());}
                external.push(action);
            }
        }
        Ok(RuntimeTurnResult{text:if self.unavailable{"Native source unavailable; supported local work remains saved."}else{"Current native catalog recovered; only current authorized effect executed."}.into(),runtime_turn_id:Some(format!("turn-{}",r.execution_id)),stopped:false,external_actions:external})
    }
}

#[test]
fn failed_native_startup_has_one_same_config_recovery_before_current_turn_and_never_replays_local_success() {
    for recover_after in [3,usize::MAX] {
        let directory=IsolatedDirectory::new();let path=directory.vault("startup-recovery");let vault=MutableVault::new(&path);
        let seed=new_application(&directory,&vault,MutableContext::new("vault-a"),Arc::new(AtomicBool::new(false))).0;
        let session=seed.create_default_session().unwrap();
        seed.submit_message("vault-a",&session.id,&session.target_date,"create task").unwrap();wait_for_finish(&seed,&session.id,"vault-a");
        let prior_review=seed.session("vault-a",&session.id).unwrap().task_operations[0].clone();assert_eq!(prior_review.status,"awaitingApproval");seed.shutdown().unwrap();
        let starts=Arc::new(Mutex::new(vec![]));let requests=Arc::new(Mutex::new(vec![]));let configs=Arc::new(Mutex::new(vec![]));let probes=Arc::new(Mutex::new(vec![]));let writes=Arc::new(Mutex::new(vec![]));
        let runtime=StartupRecoveryRuntime{base:DynamicRuntime{registered_tools:Arc::new(Mutex::new(vec![])),results:Arc::new(Mutex::new(vec![])),requests:requests.clone(),automatic_gate:None,external_writes_allowed:false,starts:starts.clone()},configs:configs.clone(),probes:probes.clone(),writes:writes.clone(),recover_after,habit_writes:true,unavailable:true};
        let app=CollaborationApplication::with_adapters(Arc::new(FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json"))),Box::new(runtime),Arc::new(MutableContext::new("vault-a")),Arc::new(FixedClock),directory.path().join("runtime"),"Current instructions; fixture proves host orchestration, not native model interpretation".into()).with_task_service(Arc::new(TaskApplicationCollaborationAdapter::new(TaskApplication::new(vault.clone(),FixedClock,FileTaskStore))));
        assert_eq!(app.session("vault-a",&session.id).unwrap().id,session.id);
        app.submit_message("vault-a",&session.id,&session.target_date,"请创建本地任务买菜").unwrap();wait_for_finish(&app,&session.id,"vault-a");
        let first=app.session("vault-a",&session.id).unwrap();assert_eq!(first.runtime_thread_id.as_deref(),Some("synthetic-thread-2"));assert_eq!(first.task_operations.len(),2);assert_eq!(first.task_operations[1].status,"applied");assert_eq!(first.task_operations[0],prior_review);
        let operation=first.task_operations[1].clone();assert_eq!(starts.lock().unwrap().len(),2,"Only one recovery despite still failed source");
        app.submit_message("vault-a",&session.id,&session.target_date,"请在滴答创建取包裹任务").unwrap();wait_for_finish(&app,&session.id,"vault-a");
        let final_state=app.session("vault-a",&session.id).unwrap();assert_eq!(final_state.id,session.id);assert_eq!(final_state.runtime_thread_id.as_deref(),Some("synthetic-thread-3"));assert_eq!(final_state.task_operations,vec![prior_review,operation]);
        assert_eq!(requests.lock().unwrap().len(),2,"Each current request reaches model only once");
        let sent=requests.lock().unwrap();assert_eq!(sent[0].thread_id,"synthetic-thread-2");assert_eq!(sent[1].thread_id,"synthetic-thread-3");drop(sent);
        let config=configs.lock().unwrap();assert_eq!(config.len(),3);assert!(config.iter().all(|c|c==&config[0]),"Rotation must not widen current schema/native capability");drop(config);
        let history=starts.lock().unwrap();assert!(history[2].contains("replay"));assert!(history[2].contains("请创建本地任务买菜"));assert!(!history[2].contains("请在滴答创建取包裹任务"));drop(history);
        assert_eq!(probes.lock().unwrap().len(),4,"Initial + one recovery probe per request");
        assert_eq!(writes.lock().unwrap().as_slice(),if recover_after==3 {vec!["请在滴答创建取包裹任务".to_owned()]}else{vec![]}.as_slice());
        let latest=TaskApplication::new(vault,FixedClock,FileTaskStore).read().unwrap();assert_eq!(latest.tasks.len(),1);assert_eq!(latest.tasks[0].name,"买菜");
        assert_eq!(final_state.messages.iter().flat_map(|m|&m.external_actions).count(),usize::from(recover_after==3));
        app.shutdown().unwrap();
        let reloaded=new_application(&directory,&MutableVault::new(&path),MutableContext::new("vault-a"),Arc::new(AtomicBool::new(false))).0;
        let restored=reloaded.session("vault-a",&session.id).unwrap();assert_eq!(restored.id,session.id);assert_eq!(restored.runtime_thread_id,final_state.runtime_thread_id);assert_ne!(restored.runtime_thread_id,session.runtime_thread_id);assert_eq!(restored.task_operations,final_state.task_operations);assert_eq!(serde_json::to_value(&restored.messages).unwrap(),serde_json::to_value(&final_state.messages).unwrap());reloaded.shutdown().unwrap();
    }
}


#[test]
fn exact_combined_native_request_authorizes_snapshot_without_revoking_other_domain_limits() {
    let native="现在请求日2026-10-04。补记昨天：锻炼完成了，实际时刻和时长都没记。按正常本地与已确认映射的测试 Habit 两端规则保存2026-10-03，先回读避免重复，再真实查询完整范围生成发布习惯快照。不要创建任何外部对象。另请读取life/2026-10-plan.md当前内容，保留全部原文和人工补充保留区，在末尾补充本月执行原则：先简短复盘，再调计划，未记录活动保持未知。这是普通个人文档编辑，不是新任务或长期背景更新。其他Tasks、DailyRecord、Self和reviewfirst厨房提案不变。";
    for (text,authorized) in [
        (native.to_owned(),true),
        ("刷新习惯，不要创建任何外部对象。".into(),true),
        ("refresh habits, do not create external objects.".into(),true),
        ("我准备明天创建买菜任务，现在刷新习惯。".into(),true),
    ] {
        let directory=IsolatedDirectory::new();let path=directory.vault("refresh-preservation-clauses");prepare_dual_vault(&path);
        let date=if text.starts_with("现在请求日2026-10-04") {"2026-10-04"} else {"2026-09-27"};
        let vault=MutableVault::new(&path);let clock=ManualClock::new(date,"17:00");
        let month=path.join("life/2026-10-plan.md");let background=path.join("life/Self.md");
        fs::write(&month,"# 月计划\n\n人工补充保留区 · Keep verbatim\n").unwrap();fs::write(&background,"# Self\n\nOriginal durable background\n").unwrap();
        let daily=path.join("life/Journal/Daily/2026/2026-09/2026-09-27.md");
        let preserved=[(&month,fs::read(&month).unwrap()),(&background,fs::read(&background).unwrap()),(&daily,fs::read(&daily).unwrap())];
        let snapshot=path.join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);let before=fs::read(&snapshot).unwrap();
        let (app,_,results,_)=new_automatic_application(&directory,&vault,MutableContext::new("vault-a"),clock.clone(),None);
        let session=app.create_default_session().unwrap();
        app.submit_message("vault-a",&session.id,&session.target_date,"create task").unwrap();wait_for_finish(&app,&session.id,"vault-a");
        let prior=app.session("vault-a",&session.id).unwrap().task_operations;
        assert_eq!(prior[0].status,"awaitingApproval");
        app.submit_message("vault-a",&session.id,&session.target_date,&text).unwrap();wait_for_finish(&app,&session.id,"vault-a");
        let result=results.lock().unwrap().last().unwrap().clone();assert_eq!(result.success,authorized,"{}",result.text);
        let state=app.session("vault-a",&session.id).unwrap();assert_eq!(state.task_operations,prior);assert!(state.memory_proposals.is_empty());assert!(state.messages.iter().all(|m|m.external_actions.is_empty()));
        assert!(TaskApplication::new(vault.clone(),clock,FileTaskStore).read().unwrap().tasks.is_empty());
        for (source,bytes) in preserved {assert_eq!(fs::read(source).unwrap(),bytes);}
        let report=state.last_habit_refresh.unwrap();
        if authorized {assert_eq!(report.generation,"validated");assert_eq!(report.publication,"published");assert_eq!(report.display,"ready");assert_eq!(report.range_to.as_deref(),Some(date));assert_ne!(fs::read(&snapshot).unwrap(),before);}
        else {assert_eq!(report.publication,"notPublished");assert_eq!(fs::read(&snapshot).unwrap(),before);}
        app.shutdown().unwrap();
    }
}


#[test]
fn canonical_habit_actual_time_survives_summary_and_explicit_corrections_ignore_section_order() {
    for (daytime, evening, expected) in [
        ("今天07:10起床。", "按时起床。", Some("07:10")),
        ("今天07:10起床。", "今天07:50起床。", None),
        (
            "更正：今天实际07:50起床。",
            "今天07:10起床。",
            Some("07:50"),
        ),
        (
            "更正：今天实际07:50起床。",
            "更正：今天实际08:00起床。",
            None,
        ),
        (
            "起床07:10写错了，今天实际07:50起床。",
            "今天07:10起床。",
            Some("07:50"),
        ),
        (
            "今天07:10起床。",
            "已有原始复盘。\n\n### 用户修正\n\n- 今天实际07:50起床。",
            Some("07:50"),
        ),
        (
            "今天07:10起床。",
            "已有原始复盘。\n\n### 用户修正\n\n- 起床时刻未知，原起床记录撤回。",
            None,
        ),
    ] {
        let directory = IsolatedDirectory::new();
        let path = directory.vault("fact-specificity");
        let daily = prepare_daily_review_vault(&path, false);
        let original = fs::read_to_string(&daily).unwrap();
        let text = original
            .replace("完成合成工作块。", daytime)
            .replace("已有原始复盘。", evening);
        fs::write(&daily, &text).unwrap();
        let app = TodayApplication::new(MutableVault::new(&path), NoVaultPicker, FixedClock);
        let input = serde_json::from_value(habit_refresh_fixture(
            "refresh habits exercise=synthetic-habit",
        ))
        .unwrap();
        assert_eq!(app.refresh_habit_snapshot(input).publication, "published");
        let snapshot = app.habits().unwrap();
        assert_eq!(
            snapshot
                .habit("wake")
                .unwrap()
                .today
                .actual_time_label
                .as_deref(),
            expected,
            "{daytime} / {evening}"
        );
        assert_eq!(
            fs::read_to_string(&daily).unwrap(),
            text,
            "projection preserves canonical source"
        );
    }
}

#[test]
fn canonical_short_record_intent_is_not_actual_time_but_occurred_dated_facts_are_retained() {
    for (content, wake, sleep) in [
        ("希望明天07:10起床。", None, None),
        ("明天07:10起床。", None, None),
        ("我希望07:10起床。", None, None),
        ("我在考虑07:10起床。", None, None),
        ("希望明天早起并07:10起床。", None, None),
        ("希望明天早起，07:10起床。", None, None),
        ("今天是不是07:10起床？", None, None),
        ("今天是不是07:10起床?", None, None),
        ("如果07:10起床就可以赶上车。", None, None),
        ("如果明天早起，07:10起床就可以赶上车。", None, None),
        ("如果明天早起，今天07:10起床了就有希望。", None, None),
        ("Did I get up at 07:10?", None, None),
        ("If I got up at 07:10 I could catch the bus.", None, None),
        ("07:10起床", None, None),
        ("07:10起床了。", Some("07:10"), None),
        ("Tomorrow I will get up at 07:10.", None, None),
        ("今天07:10起床，希望明天也能早起。", Some("07:10"), None),
        ("希望明天早起，今天07:10起床了。", Some("07:10"), None),
        ("今天07:10起床了。", Some("07:10"), None),
        ("2026-09-27 07:10起床了。", Some("07:10"), None),
        ("2026-09-26 07:10起床了。", None, None),
        ("次日01:20睡觉了。", None, Some("次日 01:20")),
        ("2026-09-28 01:20睡觉了。", None, Some("次日 01:20")),
    ] {
        let directory = IsolatedDirectory::new();
        let path = directory.vault("short-fact-intent");
        let daily = prepare_daily_review_vault(&path, false);
        let app = TodayApplication::new(MutableVault::new(&path), NoVaultPicker, FixedClock);
        let view = app.read_date("2026-09-27").unwrap();
        app.add_dated_note(DatedNoteInput {
            date: "2026-09-27".into(),
            target_binding: view.target_binding.unwrap(),
            expected_revision: view.revision,
            entry_id: "intent-short".into(),
            category: ShortRecordCategory::Ordinary,
            content: content.into(),
        })
        .unwrap();
        let source = fs::read(&daily).unwrap();
        let input = serde_json::from_value(habit_refresh_fixture(
            "refresh habits exercise=synthetic-habit",
        ))
        .unwrap();
        assert_eq!(
            app.refresh_habit_snapshot(input).publication,
            "published",
            "{content}"
        );
        let snapshot = app.habits().unwrap();
        assert_eq!(
            snapshot
                .habit("wake")
                .unwrap()
                .today
                .actual_time_label
                .as_deref(),
            wake,
            "{content}"
        );
        assert_eq!(
            snapshot
                .habit("sleep")
                .unwrap()
                .today
                .actual_time_label
                .as_deref(),
            sleep,
            "{content}"
        );
        assert_eq!(fs::read(&daily).unwrap(), source);
    }
}


#[test]
fn cross_session_default_habit_withdrawal_retains_original_local_scope_after_restart() {
    for restart in [false, true] {
        let dir = IsolatedDirectory::new();
        let path = dir.vault("cross-chat-scope");
        prepare_dual_vault(&path);
        let vault = MutableVault::new(&path);
        let clock = ManualClock::new("2026-09-27", "21:00");
        let source = Arc::new(Mutex::new(DualSource {
            readable: true,
            ..Default::default()
        }));
        source.lock().unwrap().checkins.insert(20260926, 2);
        let (app, _) = new_dual_application(&dir, &vault, clock.clone(), Arc::clone(&source));
        let first = app.create_default_session().unwrap();
        dual_submit(&app, &first.id, "2026-09-26锻炼完成了，只记本地。");
        assert_eq!(source.lock().unwrap().writes, 0);
        let second = app.create_default_session().unwrap();
        let app = if restart {
            app.shutdown().unwrap();
            new_dual_application(&dir, &vault, clock.clone(), Arc::clone(&source)).0
        } else {
            app
        };
        dual_submit(&app, &second.id, "撤回2026-09-26锻炼完成，这个打卡记错了。");
        assert_eq!(source.lock().unwrap().checkins[&20260926], 2);
        assert_eq!(source.lock().unwrap().writes, 0);
        let saved = app.session("vault-a", &second.id).unwrap();
        assert_eq!(
            serde_json::to_value(&saved.task_operations[0].baseline).unwrap()["destinationScope"],
            "local"
        );
        let view = TodayApplication::new(vault, NoVaultPicker, clock)
            .habits()
            .unwrap();
        let cell = view.habit("exercise").unwrap().cell("2026-09-26").unwrap();
        assert_eq!(
            cell.local_completion_state,
            HabitLocalCompletionState::Withdrawn
        );
        assert!(cell.has_external_completion && cell.counts_as_completion);
    }
}

#[test]
fn cross_session_both_scope_and_explicit_single_endpoint_override_preserve_independent_ends() {
    for (first_text, withdraw, local, external) in [
        (
            "2026-09-26锻炼完成了。",
            "撤回2026-09-26锻炼完成，这个打卡记错了。",
            HabitLocalCompletionState::Withdrawn,
            0,
        ),
        (
            "2026-09-26锻炼完成了，只记本地。",
            "撤回2026-09-26锻炼完成，只撤滴答。",
            HabitLocalCompletionState::Completed,
            0,
        ),
    ] {
        let dir = IsolatedDirectory::new();
        let path = dir.vault("cross-chat-both");
        prepare_dual_vault(&path);
        let vault = MutableVault::new(&path);
        let clock = ManualClock::new("2026-09-27", "21:00");
        let source = Arc::new(Mutex::new(DualSource {
            readable: true,
            ..Default::default()
        }));
        source.lock().unwrap().checkins.insert(20260926, 2);
        let (app, results) = new_dual_application(&dir, &vault, clock.clone(), Arc::clone(&source));
        let first = app.create_default_session().unwrap();
        dual_submit(&app, &first.id, first_text);
        app.shutdown().unwrap();
        let (app, _) = new_dual_application(&dir, &vault, clock.clone(), Arc::clone(&source));
        let second = app.create_default_session().unwrap();
        dual_submit(&app, &second.id, withdraw);
        assert!(results.lock().unwrap().iter().all(|result| result.success));
        assert_eq!(source.lock().unwrap().checkins[&20260926], external);
        assert_eq!(source.lock().unwrap().writes, 1);
        let view = TodayApplication::new(vault, NoVaultPicker, clock)
            .habits()
            .unwrap();
        assert_eq!(
            view.habit("exercise")
                .unwrap()
                .cell("2026-09-26")
                .unwrap()
                .local_completion_state,
            local
        );
    }
}

#[test]
fn cross_session_scope_does_not_use_another_canonical_vault_target() {
    use personal_dashboard_lib::today::HabitCompletionMutationInput;
    let dir = IsolatedDirectory::new();
    let a = dir.vault("scope-a");
    let b = dir.vault("scope-b");
    prepare_dual_vault(&a);
    prepare_dual_vault(&b);
    let vault = MutableVault::new(&a);
    let clock = ManualClock::new("2026-09-27", "21:00");
    let source = Arc::new(Mutex::new(DualSource {
        readable: true,
        ..Default::default()
    }));
    source.lock().unwrap().checkins.insert(20260926, 2);
    let (app, _) = new_dual_application(&dir, &vault, clock.clone(), Arc::clone(&source));
    let first = app.create_default_session().unwrap();
    dual_submit(&app, &first.id, "2026-09-26锻炼完成了，只记本地。");
    vault.save_selected_vault(&b).unwrap();
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, clock.clone());
    let view = today.habits().unwrap();
    today
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "exercise".into(),
            lived_date: "2026-09-26".into(),
            completed: true,
            change_id: "independent-user-completion".into(),
            target_binding: view.completion_target_binding.unwrap(),
            expected_revision: view.completion_revision,
        })
        .unwrap();
    let before = dual_completion_bytes(&b);
    let second = app.create_default_session().unwrap();
    dual_submit(&app, &second.id, "撤回2026-09-26锻炼完成，这个打卡记错了。");
    assert_eq!(dual_completion_bytes(&b), before);
    assert_eq!(source.lock().unwrap().checkins[&20260926], 2);
    assert_eq!(source.lock().unwrap().writes, 0);
    assert!(app
        .session("vault-a", &second.id)
        .unwrap()
        .task_operations
        .is_empty());
}

#[test]
fn cross_session_unconfirmed_external_plan_cannot_override_saved_local_origin() {
    for status in ["failed", "unknown"] {
        let dir = IsolatedDirectory::new();
        let path = dir.vault("unconfirmed-origin");
        prepare_dual_vault(&path);
        let vault = MutableVault::new(&path);
        let clock = ManualClock::new("2026-09-27", "21:00");
        let source = Arc::new(Mutex::new(DualSource {
            readable: true,
            ..Default::default()
        }));
        source.lock().unwrap().checkins.insert(20260926, 2);
        let (app, _) = new_dual_application(&dir, &vault, clock.clone(), Arc::clone(&source));
        let first = app.create_default_session().unwrap();
        dual_submit(&app, &first.id, "2026-09-26锻炼完成了，只记本地。");
        app.shutdown().unwrap();
        // Inject only the source fault outcome: an unconfirmed later request is
        // not a saved completion origin even when its identity metadata exists.
        let store =
            FileCollaborationStore::new(dir.path().join("collaboration/collaboration.json"));
        let mut history = serde_json::to_value(store.load().unwrap()).unwrap();
        let mut message = history["sessions"][0]["messages"][0].clone();
        message["createdAt"] = json!("2026-09-27T22:00:00-04:00");
        message["externalActions"] = json!([{"actionId":"unconfirmed-plan","sourceId":"dida365","sourceName":"Dida","toolId":"upsert_habit_checkins","status":status,"targetScope":"2026-09-26","inputSummary":"Owned source fault fixture","resultSummary":"Unconfirmed effect","verification":{"habitCheckin":{"habitId":"synthetic-habit","stamp":20260926,"status":2},"habitScope":"external","sourceObserved":true}}]);
        history["sessions"][0]["messages"]
            .as_array_mut()
            .unwrap()
            .push(message);
        store
            .save(&serde_json::from_value(history).unwrap())
            .unwrap();
        let (app, _) = new_dual_application(&dir, &vault, clock.clone(), Arc::clone(&source));
        let second = app.create_default_session().unwrap();
        dual_submit(&app, &second.id, "撤回2026-09-26锻炼完成，这个打卡记错了。");
        assert_eq!(source.lock().unwrap().checkins[&20260926], 2);
        assert_eq!(source.lock().unwrap().writes, 0);
            assert_eq!(
            TodayApplication::new(vault, NoVaultPicker, clock)
                .habits()
                .unwrap()
                .habit("exercise")
                .unwrap()
                .cell("2026-09-26")
                .unwrap()
                .local_completion_state,
            HabitLocalCompletionState::Withdrawn
        );
    }
}

#[test]
fn cross_session_local_effect_save_time_precedes_old_prepared_request_time() {
    let dir = IsolatedDirectory::new();
    let path = dir.vault("late-approved-origin");
    prepare_dual_vault(&path);
    let vault = MutableVault::new(&path);
    let clock = ManualClock::new("2026-09-27", "20:00");
    let source = Arc::new(Mutex::new(DualSource {
        readable: true,
        ..Default::default()
    }));
    let (app, _) = new_dual_application(&dir, &vault, clock.clone(), Arc::clone(&source));
    let first = app.create_default_session().unwrap();
    dual_submit(&app, &first.id, "2026-09-26锻炼完成了，只记滴答。");
    clock.set_time("21:00");
    let local = app.create_default_session().unwrap();
    dual_submit(&app, &local.id, "2026-09-26锻炼完成了，只记本地。");
    app.shutdown().unwrap();
    let store = FileCollaborationStore::new(dir.path().join("collaboration/collaboration.json"));
    let mut history = serde_json::to_value(store.load().unwrap()).unwrap();
    // Reproduce a request prepared earlier and approved later. The confirmed
    // effect's updatedAt remains 21:00 and must determine the saved origin.
    let local_history = history["sessions"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|s| s["id"] == local.id)
        .unwrap();
    local_history["messages"][0]["createdAt"] = json!("2026-09-27T19:00:00-04:00");
    store
        .save(&serde_json::from_value(history).unwrap())
        .unwrap();
    let (app, _) = new_dual_application(&dir, &vault, clock.clone(), Arc::clone(&source));
    let next = app.create_default_session().unwrap();
    dual_submit(&app, &next.id, "撤回2026-09-26锻炼完成，这个打卡记错了。");
    assert_eq!(
        source.lock().unwrap().writes,
        1,
        "Only the earlier explicit external completion was written"
    );
    assert_eq!(source.lock().unwrap().checkins[&20260926], 2);
    assert_eq!(
        TodayApplication::new(vault, NoVaultPicker, clock)
            .habits()
            .unwrap()
            .habit("exercise")
            .unwrap()
            .cell("2026-09-26")
            .unwrap()
            .local_completion_state,
        HabitLocalCompletionState::Withdrawn
    );
}

#[test]
fn cross_session_equal_saved_origin_times_require_endpoint_clarification() {
    let dir = IsolatedDirectory::new();
    let path = dir.vault("tied-origin-times");
    prepare_dual_vault(&path);
    let vault = MutableVault::new(&path);
    let clock = ManualClock::new("2026-09-27", "21:00");
    let source = Arc::new(Mutex::new(DualSource { readable: true, ..Default::default() }));
    let (app, _) = new_dual_application(&dir, &vault, clock.clone(), Arc::clone(&source));
    let local = app.create_default_session().unwrap();
    dual_submit(&app, &local.id, "2026-09-26锻炼完成了，只记本地。");
    let external = app.create_default_session().unwrap();
    dual_submit(&app, &external.id, "2026-09-26锻炼完成了，只记滴答。");
    let before = dual_completion_bytes(&path);
    app.shutdown().unwrap();
    let (app, _) = new_dual_application(&dir, &vault, clock, Arc::clone(&source));
    let next = app.create_default_session().unwrap();
    dual_submit(&app, &next.id, "撤回2026-09-26锻炼完成，这个打卡记错了。");
    assert_eq!(dual_completion_bytes(&path), before);
    assert_eq!(source.lock().unwrap().checkins[&20260926], 2);
    assert_eq!(source.lock().unwrap().writes, 1);
    assert!(app.session("vault-a", &next.id).unwrap().task_operations.is_empty());
}

#[test]
fn same_chat_direct_habit_scope_sequence_within_one_minute_retains_saved_order_after_restart() {
    for restart in [false, true] {
        let dir = IsolatedDirectory::new();
        let path = dir.vault("same-minute-direct-order");
        prepare_dual_vault(&path);
        let vault = MutableVault::new(&path);
        let clock = ManualClock::new("2026-09-27", "21:00");
        let source = Arc::new(Mutex::new(DualSource {
            readable: true,
            ..Default::default()
        }));
        let (app, _) = new_dual_application(&dir, &vault, clock.clone(), Arc::clone(&source));
        let chat = app.create_default_session().unwrap();
        dual_submit(&app, &chat.id, "2026-09-26锻炼完成了，只记本地。");
        dual_submit(&app, &chat.id, "2026-09-26锻炼完成了。");
        assert_eq!(source.lock().unwrap().checkins[&20260926], 2);
        let app = if restart {
            app.shutdown().unwrap();
            new_dual_application(&dir, &vault, clock.clone(), Arc::clone(&source)).0
        } else {
            app
        };
        dual_submit(&app, &chat.id, "撤回2026-09-26锻炼完成，这个打卡记错了。");
        assert_eq!(
            source.lock().unwrap().checkins[&20260926],
            0,
            "Later confirmed direct Both scope must win within the same minute in one saved chat"
        );
        assert_eq!(source.lock().unwrap().writes, 2);
        let cell = TodayApplication::new(vault, NoVaultPicker, clock)
            .habits()
            .unwrap();
        assert_eq!(
            cell.habit("exercise")
                .unwrap()
                .cell("2026-09-26")
                .unwrap()
                .local_completion_state,
            HabitLocalCompletionState::Withdrawn
        );
    }
}

#[test]
fn same_chat_delayed_review_approval_at_tied_minute_does_not_borrow_request_order() {
    let dir = IsolatedDirectory::new();
    let path = dir.vault("tied-delayed-approval");
    prepare_dual_vault(&path);
    let vault = MutableVault::new(&path);
    let clock = ManualClock::new("2026-09-27", "21:00");
    let source = Arc::new(Mutex::new(DualSource {
        readable: true,
        skip_projection: true,
        ..Default::default()
    }));
    let (app, _) = new_dual_application(&dir, &vault, clock.clone(), Arc::clone(&source));
    let chat = app.create_default_session().unwrap();
    dual_submit(&app, &chat.id, "先审阅2026-09-26锻炼完成了，只记本地。");
    let proposal = app.session("vault-a", &chat.id).unwrap().task_operations[0].clone();
    assert_eq!(proposal.status, "awaitingApproval");
    assert!(!proposal.execution_attempted);
    dual_submit(&app, &chat.id, "2026-09-26锻炼完成了，只记滴答。");
    let approved = app
        .approve_task_operation_for_selected_vault(&chat.id, &proposal.id)
        .unwrap();
    assert_eq!(approved.task_operations[0].status, "applied");
    let before = dual_completion_bytes(&path);
    app.shutdown().unwrap();
    let (app, _) = new_dual_application(&dir, &vault, clock, Arc::clone(&source));
    dual_submit(&app, &chat.id, "撤回2026-09-26锻炼完成，这个打卡记错了。");
    assert_eq!(dual_completion_bytes(&path), before);
    assert_eq!(source.lock().unwrap().checkins[&20260926], 2);
    assert_eq!(source.lock().unwrap().writes, 1);
}



#[test]
fn saved_date_bound_historical_daytime_fact_keeps_exact_relative_past_text_and_actual_minute() {
    for event in ["昨天07:10起床了。", "Yesterday I woke at 07:10."] {
        let dir = IsolatedDirectory::new();
        let path = dir.vault("historical-fact-binding");
        let current = prepare_daily_review_vault(&path, false);
        let historical = current.parent().unwrap().join("2026-09-26.md");
        fs::write(
            &historical,
            fs::read_to_string(&current)
                .unwrap()
                .replace("2026-09-27", "2026-09-26"),
        )
        .unwrap();
        let vault = MutableVault::new(&path);
        let clock = ManualClock::new("2026-09-27", "21:00");
        let (app, _, results, _) = new_automatic_application(
            &dir,
            &vault,
            MutableContext::new("vault-a"),
            clock.clone(),
            None,
        );
        let chat = app.create_default_session().unwrap();
        let mut args = natural_daily_fixture("今天07:10起床，具体睡觉时刻不知道。").unwrap();
        args["targetDate"] = json!("2026-09-26");
        args["event"] = json!(event);
        args["authorizationQuote"] = json!(format!("补记昨天：{event}"));
        args["executionMode"] = json!("execute");
        app.submit_message(
            "vault-a",
            &chat.id,
            "2026-09-27",
            &format!("date-fixture:{args}"),
        )
        .unwrap();
        wait_for_finish(&app, &chat.id, "vault-a");
        assert!(results.lock().unwrap().last().unwrap().success);
        let exact = fs::read(&historical).unwrap();
        assert!(String::from_utf8_lossy(&exact).contains(event));
        app.submit_message(
            "vault-a",
            &chat.id,
            "2026-09-27",
            "refresh habits exercise=synthetic-habit",
        )
        .unwrap();
        wait_for_finish(&app, &chat.id, "vault-a");
        assert!(results.lock().unwrap().last().unwrap().success);
        let snapshot = TodayApplication::new(vault, NoVaultPicker, clock)
            .habits()
            .unwrap();
        assert_eq!(
            snapshot
                .habit("wake")
                .unwrap()
                .cell("2026-09-26")
                .unwrap()
                .actual_time_label
                .as_deref(),
            Some("07:10"),
            "{event}"
        );
        assert_eq!(fs::read(&historical).unwrap(), exact);
    }
}


#[test]
fn conversational_confirmation_executes_selected_review_without_authorization_words_and_preserves_revision() {
    for case in ["success", "concurrent-edit", "wrong-id", "wrong-date", "wrong-payload"] {
        let dir=IsolatedDirectory::new(); let path=dir.vault("conversation-review");
        let record=prepare_daily_review_vault(&path,false); let vault=MutableVault::new(&path);
        let (app,_,results,_)=new_automatic_application(&dir,&vault,MutableContext::new("vault-a"),ManualClock::new("2026-09-27","17:00"),None);
        let chat=app.create_default_session().unwrap(); let before=fs::read(&record).unwrap();
        let mut operation=json!({"operation":"saveDailyPlan","transition":"daytimeEvent","event":"晚饭后收拾屋子，现已完成。","executionMode":"prepareProposal"});
        app.submit_message("vault-a",&chat.id,&chat.target_date,&format!("single-date-fixture:{operation}")).unwrap();
        wait_for_finish(&app,&chat.id,"vault-a"); assert_eq!(fs::read(&record).unwrap(),before);
        let proposal=app.session("vault-a",&chat.id).unwrap().task_operations[0].clone();
        // An intervening turn does not revoke a user-selected saved proposal.
        app.submit_message("vault-a",&chat.id,&chat.target_date,"请先整理白天情况，暂时不要保存：上午已读完报告；晚饭后计划整理书桌，尚未完成。").unwrap();
        wait_for_finish(&app,&chat.id,"vault-a");
        if case=="concurrent-edit" {fs::write(&record,format!("{}\n用户新内容\n",String::from_utf8(before.clone()).unwrap())).unwrap();}
        let current=fs::read(&record).unwrap(); operation["executionMode"]=json!("execute");
        operation["proposalId"]=json!(if case=="wrong-id" {"missing"} else {proposal.id.as_str()});
        if case=="wrong-date" {operation["targetDate"]=json!("2026-09-26");}
        if case=="wrong-payload" {operation["event"]=json!("different event");}
        app.submit_message("vault-a",&chat.id,&chat.target_date,&format!("single-date-fixture:{operation}")).unwrap();
        wait_for_finish(&app,&chat.id,"vault-a");
        let saved=app.session("vault-a",&chat.id).unwrap(); assert_eq!(saved.task_operations.len(),1);
        if case=="success" {
            assert_eq!(saved.task_operations[0].status,"applied");
            assert!(fs::read_to_string(&record).unwrap().contains("晚饭后收拾屋子，现已完成。"));
        } else {
            assert_ne!(saved.task_operations[0].status,"applied"); assert_eq!(fs::read(&record).unwrap(),current);
            if case!="concurrent-edit" {assert!(!results.lock().unwrap().last().unwrap().success);}
        }
    }
}

#[test]
fn an_uncertain_exact_effect_in_another_session_is_read_back_before_any_new_write() {
    let directory = IsolatedDirectory::new();
    let vault_path = directory.vault("vault");
    let vault = MutableVault::new(&vault_path);
    let (application, _, _) = new_application(&directory, &vault, MutableContext::new("vault-a"), Arc::new(AtomicBool::new(false)));
    let original = application.create_session("2026-09-27").unwrap();
    let proposal = submit_for_proposal(&application, &original.id, "create task");
    application.approve_task_operation_for_selected_vault(&original.id, &proposal.id).unwrap();
    let store = FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json"));
    let mut state = store.load().unwrap();
    // Source succeeded but its result acknowledgement was lost. Keep the
    // persisted original stable operation/task ID and attempted execution.
    let mut lost = serde_json::to_value(&state.sessions[0].task_operations[0]).unwrap();
    lost["status"] = json!("awaitingApproval");
    lost["executeAttempted"] = json!(true);
    lost["resultSnapshot"] = Value::Null;
    state.sessions[0].task_operations[0] = serde_json::from_value(lost).unwrap();
    store.save(&state).unwrap();
    let other = application.create_session("2026-09-27").unwrap();
    let repeated = submit_for_proposal(&application, &other.id, "create task");
    let error = application.approve_task_operation_for_selected_vault(&other.id, &repeated.id).unwrap_err();
    assert!(error.contains("original saved effect"), "{error}");
    let tasks = TaskApplication::new(vault, FixedClock, FileTaskStore).read().unwrap();
    assert_eq!(tasks.tasks.len(), 1, "A different session cannot replay the same uncertain create");
    let checked = application.session("vault-a", &original.id).unwrap();
    assert_eq!(checked.task_operations[0].id, proposal.id);
    assert_eq!(checked.task_operations[0].status, "applied");
    assert_eq!(application.session("vault-a", &other.id).unwrap().task_operations[0].status, "conflict");
}

#[test]
fn bounded_task_history_retains_reported_completion_after_reopen_without_rewriting_schedule() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("bounded-history");
    let vault = MutableVault::new(&path);
    let adapter = TaskApplicationCollaborationAdapter::new(TaskApplication::new(vault.clone(), FixedClock, FileTaskStore));
    let view = adapter.read().unwrap();
    let binding = view.target_binding.unwrap();
    let view = adapter.apply(&CollaborationTaskOperation::CreateTask { name: "Send report".into(), content: Some("Keep my notes".into()), date: Some("2026-10-02".into()), time: Some("09:00".into()), list_id: None }, &binding, None, "history-create").unwrap();
    let id = view.tasks[0].id.clone();
    let view = adapter.apply_for_date(&CollaborationTaskOperation::CompleteTask { task_id: id.clone(), completed_time: Some("15:20".into()) }, &binding, view.revision.as_deref(), "history-complete", "2026-09-24").unwrap();
    let view = adapter.apply(&CollaborationTaskOperation::ReopenTask { task_id: id.clone() }, &binding, view.revision.as_deref(), "history-reopen").unwrap();
    let before = fs::read(path.join("life/.personal-dashboard/tasks/v1/tasks.json")).unwrap();
    let (app, _, _) = new_application(&directory, &vault, MutableContext::new("vault-a"), Arc::new(AtomicBool::new(false)));
    let history = app.read_history("vault-a", personal_dashboard_lib::collaboration::CollaborationHistoryRequest { domain: "tasks".into(), from_date: "2026-09-24".into(), to_date: "2026-09-24".into() }).unwrap();
    assert_eq!(history["tasks"][0]["id"], id);
    assert_eq!(history["tasks"][0]["date"], "2026-10-02");
    assert_eq!(history["tasks"][0]["state"], "pending");
    assert_eq!(history["tasks"][0]["content"], "Keep my notes");
    assert_eq!(history["tasks"][0]["changes"][0]["newCompletion"]["completedOn"], "2026-09-24");
    assert_eq!(history["tasks"][0]["changes"][0]["newCompletion"]["completedTime"], "15:20");
    assert_eq!(history["revision"], view.revision.unwrap());
    assert_eq!(fs::read(path.join("life/.personal-dashboard/tasks/v1/tasks.json")).unwrap(), before);
    assert!(app.read_history("other-vault", personal_dashboard_lib::collaboration::CollaborationHistoryRequest { domain: "tasks".into(), from_date: "2026-09-24".into(), to_date: "2026-09-24".into() }).is_err());
}

#[test]
fn collaboration_period_query_reads_tasks_without_business_receipts_or_writes() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("history-round");
    let vault = MutableVault::new(&path);
    let (app, tools, results) = new_application(&directory, &vault, MutableContext::new("vault-a"), Arc::new(AtomicBool::new(false)));
    let session = app.create_session("2026-09-27").unwrap();
    app.submit_message("vault-a", &session.id, "2026-09-27", "read task history").unwrap();
    wait_for_finish(&app, &session.id, "vault-a");
    let saved = app.session("vault-a", &session.id).unwrap();
    assert_eq!(saved.run_state, "completed");
    let result = &results.lock().unwrap()[0];
    assert!(result.success);
    let history: Value = serde_json::from_str(&result.text).unwrap();
    assert_eq!(history["domain"], "tasks");
    assert_eq!(history["fromDate"], "2026-09-24");
    assert_eq!(history["toDate"], "2026-09-27");
    assert_eq!(history["state"], "empty");
    assert!(history["coverage"].as_str().unwrap().contains("unknown"));
    assert!(saved.task_operations.is_empty());
    assert!(!path.join("life/.personal-dashboard/tasks/v1/tasks.json").exists());
    let tools = tools.lock().unwrap();
    let schema = tools.iter().find(|tool| tool["name"] == "dashboard_read_history").unwrap();
    assert_eq!(schema["inputSchema"]["properties"]["domain"]["enum"], json!(["tasks", "dailyRecords", "habits"]));
    assert_eq!(saved.usage_bindings[0].registered_tools.iter().filter(|name| *name == "dashboard_read_history").count(), 1);
}

#[test]
fn bounded_task_history_reports_missing_and_damaged_sources_and_rejects_invalid_ranges() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("history-source-gaps");
    let vault = MutableVault::new(&path);
    let (app, _, _) = new_application(&directory, &vault, MutableContext::new("vault-a"), Arc::new(AtomicBool::new(false)));
    let query = |from: &str, to: &str| app.read_history("vault-a", personal_dashboard_lib::collaboration::CollaborationHistoryRequest { domain: "tasks".into(), from_date: from.into(), to_date: to.into() });
    let empty = query("2026-01-01", "2027-01-01").unwrap();
    assert_eq!(empty["state"], "empty");
    assert_eq!(empty["revision"], Value::Null);
    assert!(empty["targetBinding"].as_str().is_some());
    for (from, to) in [("2026-01-01", "2027-01-02"), ("2026-09-25", "2026-09-24"), ("2026-02-30", "2026-03-01")] {
        assert!(query(from, to).is_err());
    }
    let file = path.join("life/.personal-dashboard/tasks/v1/tasks.json");
    assert!(!file.exists());
    fs::create_dir_all(file.parent().unwrap()).unwrap();
    fs::write(&file, "damaged canonical source").unwrap();
    let result = query("2026-09-24", "2026-09-27").unwrap();
    assert_eq!(result["state"], "error");
    assert_eq!(result["errorKind"], "damaged");
    assert_eq!(fs::read_to_string(file).unwrap(), "damaged canonical source");
}

#[test]
fn daily_record_period_read_retains_original_phases_and_unknown_gaps_without_creating_history() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("dated-history");
    let record = prepare_daily_review_vault(&path, false);
    let original = fs::read(&record).unwrap();
    let vault = MutableVault::new(&path);
    let (app, _, _) = new_application(&directory, &vault, MutableContext::new("vault-a"), Arc::new(AtomicBool::new(false)));
    let result = app.read_history("vault-a", personal_dashboard_lib::collaboration::CollaborationHistoryRequest {
        domain: "dailyRecords".into(), from_date: "2026-09-26".into(), to_date: "2026-09-28".into(),
    }).unwrap();
    assert_eq!(result["domain"], "dailyRecords");
    let dates = result["records"].as_array().unwrap();
    assert_eq!(dates.len(), 3);
    assert_eq!(dates[0]["date"], "2026-09-26");
    assert_eq!(dates[0]["state"], "missing");
    assert_eq!(dates[0]["evidenceAvailability"], "unknown");
    assert_eq!(dates[2]["state"], "missing");
    assert_eq!(dates[1]["baseline"]["timeline"][0]["title"], "Synthetic morning baseline.");
    assert_eq!(dates[1]["currentArrangement"][0]["title"], "Synthetic current arrangement.");
    assert!(dates[1]["daytime"]["updates"][0]["observedFacts"].as_array().unwrap().iter().any(|text| text.as_str().unwrap().contains("完成合成工作块")));
    assert!(dates[1]["evening"]["account"].as_array().unwrap().iter().any(|text| text.as_str().unwrap().contains("已有原始复盘")));
    assert_eq!(dates[1]["links"]["daytime"], "dashboard://record/2026-09-27?phase=daytime");
    assert!(dates[1]["revision"].as_str().is_some());
    assert!(dates[1].get("habitCorrections").is_none());
    assert!(dates[1].get("tasks").is_none());
    assert_eq!(fs::read(&record).unwrap(), original);
    assert!(!path.join("life/Journal/Daily/2026/2026-09/2026-09-26.md").exists());
    assert!(!path.join("life/Journal/Daily/2026/2026-09/2026-09-28.md").exists());
}

#[test]
fn daily_record_period_read_preserves_corrected_short_record_and_damaged_date_independently() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("correction-history");
    let record = prepare_daily_review_vault(&path, true);
    let damaged = path.join("life/Journal/Daily/2026/2026-09/2026-09-26.md");
    fs::write(&damaged, "---\ntype: daily-record\ndate: 2026-09-25\n---\n# Wrong dated source\n").unwrap();
    let damaged_bytes = fs::read(&damaged).unwrap();
    let vault = MutableVault::new(&path);
    let (app, _, _) = new_application(&directory, &vault, MutableContext::new("vault-a"), Arc::new(AtomicBool::new(false)));
    let session = app.create_session("2026-09-27").unwrap();
    let operation = json!({"operation":"correctShortRecord","recordId":"exercise-short-1","content":"Walked outdoors for 25 minutes.","targetDate":"2026-09-27","executionMode":"execute"});
    app.submit_message("vault-a", &session.id, "2026-09-27", &format!("single-date-fixture:{operation}")).unwrap();
    wait_for_finish(&app, &session.id, "vault-a");
    let saved = app.session("vault-a", &session.id).unwrap();
    assert_eq!(saved.task_operations[0].status, "applied");
    let result = app.read_history("vault-a", personal_dashboard_lib::collaboration::CollaborationHistoryRequest { domain: "dailyRecords".into(), from_date: "2026-09-26".into(), to_date: "2026-09-27".into() }).unwrap();
    assert_eq!(result["records"][0]["state"], "error");
    assert_eq!(result["records"][0]["evidenceAvailability"], "unknown");
    assert_eq!(result["records"][0]["baseline"], Value::Null);
    assert_eq!(result["records"][1]["state"], "ready");
    let short = &result["records"][1]["daytime"]["shortRecords"][0];
    assert_eq!(short["id"], "exercise-short-1");
    assert_eq!(short["text"], "Walked outdoors for 25 minutes.");
    assert_eq!(short["changes"][0]["oldText"], "Walked outdoors for 20 minutes.");
    assert_eq!(short["changes"][0]["newText"], "Walked outdoors for 25 minutes.");
    assert_eq!(fs::read(damaged).unwrap(), damaged_bytes);
    assert!(fs::read_to_string(record).unwrap().contains("用户自有章节原文"));
    assert!(!path.join("life/.personal-dashboard/habit-completions/v1/completions.json").exists());
}

#[test]
fn collaboration_daily_record_query_exposes_actual_domain_and_preserves_missing_dates() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("history-registered-dates");
    let record = prepare_daily_review_vault(&path, false);
    let original = fs::read(&record).unwrap();
    let vault = MutableVault::new(&path);
    let (app, tools, results) = new_application(&directory, &vault, MutableContext::new("vault-a"), Arc::new(AtomicBool::new(false)));
    let session = app.create_session("2026-09-27").unwrap();
    app.submit_message("vault-a", &session.id, "2026-09-27", "read record history").unwrap();
    wait_for_finish(&app, &session.id, "vault-a");
    let saved = app.session("vault-a", &session.id).unwrap();
    assert_eq!(saved.run_state, "completed");
    let result = &results.lock().unwrap()[0];
    assert!(result.success);
    let history: Value = serde_json::from_str(&result.text).unwrap();
    assert_eq!(history["domain"], "dailyRecords");
    assert_eq!(history["records"].as_array().unwrap().len(), 4);
    assert_eq!(history["records"][0]["state"], "missing");
    assert_eq!(history["records"][3]["state"], "ready");
    assert!(saved.task_operations.is_empty());
    let tools = tools.lock().unwrap();
    let history_tool = tools.iter().find(|tool| tool["name"] == "dashboard_read_history").unwrap();
    assert!(history_tool["inputSchema"]["properties"]["domain"]["enum"].as_array().unwrap().contains(&json!("dailyRecords")));
    assert_eq!(fs::read(record).unwrap(), original);
}

#[test]
fn habit_period_query_reads_canonical_local_fact_beyond_missing_snapshot_coverage() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("canonical-habit-period");
    prepare_daily_review_vault(&path, false);
    let vault = MutableVault::new(&path);
    let (app, _, results) = new_application(&directory, &vault, MutableContext::new("vault-a"), Arc::new(AtomicBool::new(false)));
    let session = app.create_session("2026-09-27").unwrap();
    let operation = json!({"operation":"setLocalHabitCompletion","habitKey":"exercise","completed":true,"scope":"local","targetDate":"2026-06-02","executionMode":"execute"});
    app.submit_message("vault-a", &session.id, "2026-09-27", &format!("single-date-fixture:{operation}")).unwrap();
    wait_for_finish(&app, &session.id, "vault-a");
    let saved = app.session("vault-a", &session.id).unwrap();
    assert_eq!(saved.task_operations[0].status, "applied");
    assert!(results.lock().unwrap()[0].success);
    assert!(saved.messages.iter().all(|message| message.external_actions.is_empty()));
    fs::remove_file(path.join("life/.personal-dashboard/derived/habits-v1.json")).unwrap();
    let completion_path = path.join("life/.personal-dashboard/habit-completions/v1/completions.json");
    let before = fs::read(&completion_path).unwrap();
    let history = app.read_history("vault-a", personal_dashboard_lib::collaboration::CollaborationHistoryRequest { domain:"habits".into(), from_date:"2026-06-01".into(), to_date:"2026-06-03".into() }).unwrap();
    assert_eq!(history["canonical"]["state"], "ready");
    assert_eq!(history["canonical"]["unrecordedState"], "unknown");
    assert_eq!(history["canonical"]["records"][0]["habitKey"], "exercise");
    assert_eq!(history["canonical"]["records"][0]["livedDate"], "2026-06-02");
    assert_eq!(history["canonical"]["records"][0]["state"], "completed");
    assert_eq!(history["canonical"]["records"][0]["changes"][0]["id"], saved.task_operations[0].id);
    assert_eq!(history["projection"]["state"], "missing");
    assert_eq!(history["requestedDates"], json!(["2026-06-01","2026-06-02","2026-06-03"]));
    assert_eq!(fs::read(completion_path).unwrap(), before);
}

#[test]
fn habit_period_query_keeps_withdrawal_retry_receipts_and_other_dates_independent() {
    use personal_dashboard_lib::today::HabitCompletionMutationInput;
    let directory = IsolatedDirectory::new();
    let path = directory.vault("habit-period-withdrawal");
    prepare_daily_review_vault(&path, false);
    let vault = MutableVault::new(&path);
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, FixedClock);
    let mut snapshot = today.habits().unwrap();
    for (id, date, completed) in [("history-first", "2026-09-24", true), ("history-other", "2026-09-25", true),
        ("history-noop", "2026-09-24", true), ("history-withdraw", "2026-09-24", false)] {
        snapshot = today.set_local_habit_completion(HabitCompletionMutationInput { habit_key:"exercise".into(),
            lived_date:date.into(),completed,change_id:id.into(),target_binding:snapshot.completion_target_binding.clone().unwrap(),
            expected_revision:snapshot.completion_revision.clone() }).unwrap();
    }
    let (app, _, results) = new_application(&directory, &vault, MutableContext::new("vault-a"), Arc::new(AtomicBool::new(false)));
    let history = app.read_history("vault-a", personal_dashboard_lib::collaboration::CollaborationHistoryRequest { domain:"habits".into(), from_date:"2026-09-24".into(), to_date:"2026-09-24".into() }).unwrap();
    assert_eq!(history["canonical"]["records"].as_array().unwrap().len(), 1);
    assert_eq!(history["canonical"]["records"][0]["state"], "withdrawn");
    assert_eq!(history["canonical"]["records"][0]["changes"].as_array().unwrap().len(), 2);
    assert_eq!(history["canonical"]["acceptedNoOpReceipts"][0]["id"], "history-noop");
    assert_eq!(history["canonical"]["revision"], snapshot.completion_revision.unwrap());
    let other = today.read_date("2026-09-25").unwrap();
    assert_eq!(other.habit_corrections.habit("exercise").unwrap().cell.local_completion_state, HabitLocalCompletionState::Completed);
    let source = path.join("life/.personal-dashboard/habit-completions/v1/completions.json");
    let before = fs::read(&source).unwrap();
    let session = app.create_session("2026-09-27").unwrap();
    app.submit_message("vault-a", &session.id,"2026-09-27","read habit history").unwrap();
    wait_for_finish(&app,&session.id,"vault-a");
    assert!(results.lock().unwrap().last().unwrap().success);
    let saved = app.session("vault-a",&session.id).unwrap();
    assert!(saved.task_operations.is_empty());
    assert!(saved.messages.iter().all(|message|message.external_actions.is_empty()));
    assert_eq!(fs::read(source).unwrap(),before);
}

#[test]
fn habit_period_query_retains_published_actual_time_threshold_and_unknown_damaged_local_source() {
    let directory = IsolatedDirectory::new();
    let path = directory.vault("habit-period-sources");
    prepare_daily_review_vault(&path, false);
    let snapshot = path.join("life/.personal-dashboard/derived/habits-v1.json");
    fs::write(&snapshot,include_bytes!("fixtures/habits-v1-complete.json")).unwrap();
    let vault = MutableVault::new(&path);
    let (app, _, _) = new_application(&directory, &vault, MutableContext::new("vault-a"), Arc::new(AtomicBool::new(false)));
    let query = || app.read_history("vault-a",personal_dashboard_lib::collaboration::CollaborationHistoryRequest { domain:"habits".into(),from_date:"2026-09-08".into(),to_date:"2026-09-08".into() }).unwrap();
    let result = query();
    assert_eq!(result["canonical"]["state"],"missing");
    assert_eq!(result["projection"]["state"],"stale");
    let habits = result["projection"]["habits"].as_array().unwrap();
    let sleep = habits.iter().find(|habit|habit["key"]=="sleep").unwrap();
    assert_eq!(sleep["history"][0]["status"],"thresholdOnly");
    assert!(sleep["history"][0]["actualTimeLabel"].is_null());
    let wake = habits.iter().find(|habit|habit["key"]=="wake").unwrap();
    assert_eq!(wake["history"][0]["actualTimeLabel"],"07:18");
    for habit in habits { assert_eq!(habit["history"].as_array().unwrap().len(),1); assert!(habit.get("today").is_none()); }
    let canonical = path.join("life/.personal-dashboard/habit-completions/v1/completions.json");
    fs::create_dir_all(canonical.parent().unwrap()).unwrap();
    fs::write(&canonical,b"{damaged canonical").unwrap();
    let damaged = query();
    assert_eq!(damaged["canonical"]["state"],"error");
    assert_eq!(damaged["canonical"]["errorKind"],"damaged");
    assert_eq!(damaged["canonical"]["unrecordedState"],"unknown");
    assert!(damaged["canonical"]["records"].as_array().unwrap().is_empty());
    assert_eq!(damaged["projection"],result["projection"]);
    assert_eq!(fs::read(&canonical).unwrap(),b"{damaged canonical");
    assert!(app.read_history("other-vault",personal_dashboard_lib::collaboration::CollaborationHistoryRequest { domain:"habits".into(),from_date:"2026-09-08".into(),to_date:"2026-09-08".into() }).is_err());
}

struct SnapshotFaultAfterLocalSave {
    inner: TodayApplicationCollaborationDailyDataAdapter<MutableVault, NoVaultPicker, FixedClock>,
    saved: AtomicBool,
}
impl personal_dashboard_lib::collaboration::CollaborationDailyDataService for SnapshotFaultAfterLocalSave {
    fn read_date(&self, date: &str) -> Result<personal_dashboard_lib::today::TodayView, String> { self.inner.read_date(date) }
    fn save(&self, input: DailyPlanWriteInput) -> Result<personal_dashboard_lib::today::TodayView, String> { self.inner.save(input) }
    fn operation_applied(&self, date: &str, binding: &str, id: &str, fingerprint: &str) -> Result<bool, String> { self.inner.operation_applied(date,binding,id,fingerprint) }
    fn read_habit_snapshot(&self) -> Result<personal_dashboard_lib::habits::HabitSnapshotView, String> {
        if self.saved.load(Ordering::SeqCst) { Err("Snapshot projection read interrupted after canonical save".into()) }
        else { self.inner.read_habit_snapshot() }
    }
    fn set_historical_habit_completion(&self, input: personal_dashboard_lib::today::HabitCompletionMutationInput) -> Result<personal_dashboard_lib::today::TodayView, String> {
        let result = self.inner.set_historical_habit_completion(input);
        if result.is_ok() { self.saved.store(true,Ordering::SeqCst); }
        result
    }
    fn habit_completion_operation_applied(&self, date: &str, binding: &str, id: &str, key: &str, completed: bool) -> Result<bool, String> { self.inner.habit_completion_operation_applied(date,binding,id,key,completed) }
}

#[test]
fn local_habit_receipt_keeps_canonical_success_revision_when_snapshot_read_fails_after_save() {
    let directory=IsolatedDirectory::new();let path=directory.vault("habit-post-save-fault");prepare_daily_review_vault(&path,false);
    let vault=MutableVault::new(&path);
    let (app,_,_)=new_application(&directory,&vault,MutableContext::new("vault-a"),Arc::new(AtomicBool::new(false)));
    let app=app.with_daily_data_service(Arc::new(SnapshotFaultAfterLocalSave {
        inner:TodayApplicationCollaborationDailyDataAdapter::new(TodayApplication::new(vault.clone(),NoVaultPicker,FixedClock)),saved:AtomicBool::new(false),
    }));
    let session=app.create_session("2026-09-27").unwrap();
    let proposal=submit_for_proposal(&app,&session.id,"complete habit");
    let result=app.approve_task_operation_for_selected_vault(&session.id,&proposal.id).unwrap();
    let saved=&result.task_operations[0];assert_eq!(saved.status,"applied");
    let today=TodayApplication::new(vault,NoVaultPicker,FixedClock).read_date("2026-09-27").unwrap();
    assert_eq!(saved.result_revision,today.habit_corrections.completion_revision);
    let receipt=serde_json::to_value(saved).unwrap();
    assert_eq!(receipt["resultSnapshot"]["localState"],"Completed");
    assert_eq!(receipt["resultSnapshot"]["sourceSnapshotState"],"error");
    assert!(receipt["resultSnapshot"]["sourceSnapshotMessage"].as_str().unwrap().contains("Snapshot projection read interrupted"));
    let completion_path=path.join("life/.personal-dashboard/habit-completions/v1/completions.json");
    let before=fs::read(&completion_path).unwrap();
    app.reconcile_task_operation_for_selected_vault(&session.id,&proposal.id).unwrap();
    app.approve_task_operation_for_selected_vault(&session.id,&proposal.id).unwrap();
    assert_eq!(fs::read(completion_path).unwrap(),before);
}


#[test]
fn personal_retro_reads_three_real_histories_for_complete_lived_days_without_business_writes() {
    use personal_dashboard_lib::today::HabitCompletionMutationInput;
    let directory = IsolatedDirectory::new();
    let path = directory.vault("personal-retro");
    let record = prepare_daily_review_vault(&path, false);
    let vault = MutableVault::new(&path);
    let clock = ManualClock::new("2026-09-28", "10:00");
    let tasks = TaskApplicationCollaborationAdapter::new(TaskApplication::new(vault.clone(), clock.clone(), FileTaskStore));
    let opened = tasks.read().unwrap(); let binding = opened.target_binding.unwrap();
    let created = tasks.apply(&CollaborationTaskOperation::CreateTask {name:"Synthetic report".into(),content:None,date:Some("2026-10-02".into()),time:Some("09:00".into()),list_id:None},&binding,None,"retro-create").unwrap();
    let id = created.tasks[0].id.clone();
    tasks.apply_for_date(&CollaborationTaskOperation::CompleteTask {task_id:id.clone(),completed_time:None},&binding,created.revision.as_deref(),"retro-complete","2026-09-26").unwrap();
    let today = TodayApplication::new(vault.clone(), NoVaultPicker, clock.clone());
    let snapshot = today.habits().unwrap();
    today.set_local_habit_completion(HabitCompletionMutationInput {habit_key:"exercise".into(),lived_date:"2026-09-26".into(),completed:true,change_id:"retro-local".into(),target_binding:snapshot.completion_target_binding.unwrap(),expected_revision:snapshot.completion_revision}).unwrap();
    let source_paths = [record, path.join("life/.personal-dashboard/tasks/v1/tasks.json"),path.join("life/.personal-dashboard/habit-completions/v1/completions.json"),path.join("life/.personal-dashboard/derived/habits-v1.json")];
    let before = source_paths.iter().map(|p|fs::read(p).unwrap()).collect::<Vec<_>>();
    let record_before=before[0].clone();let habit_before=before[2].clone();
    let (app,_,results,requests) = new_automatic_application(&directory,&vault,MutableContext::new("vault-a"),clock,None);
    // Browsing an unrelated date must not choose the retro period.
    let session = app.create_session("2026-08-01").unwrap();
    app.submit_message("vault-a",&session.id,"2026-08-01","/retro").unwrap();
    wait_for_finish(&app,&session.id,"vault-a");
    let saved = app.session("vault-a",&session.id).unwrap();
    let read_results = results.lock().unwrap();
    let histories = read_results.iter().map(|r|serde_json::from_str::<Value>(&r.text).unwrap()).collect::<Vec<_>>();
    assert_eq!(histories.iter().map(|h|h["domain"].as_str().unwrap()).collect::<Vec<_>>(),["tasks","dailyRecords","habits"]);
    for h in &histories {assert_eq!(h["fromDate"],"2026-09-21");assert_eq!(h["toDate"],"2026-09-27");}
    assert_eq!(histories[0]["tasks"][0]["id"],id);
    assert_eq!(histories[0]["tasks"][0]["completion"]["completedTime"],Value::Null);
    assert_eq!(histories[1]["records"][0]["evidenceAvailability"],"unknown");
    assert_eq!(histories[2]["projection"]["state"],"stale");
    assert_eq!(histories[2]["canonical"]["unrecordedState"],"unknown");
    assert_eq!(histories[2]["canonical"]["records"][0]["changes"][0]["id"],"retro-local");
    let reply=&saved.messages.last().unwrap().text;
    assert!(reply.contains("2026-09-21–2026-09-27"));
    assert!(reply.contains("Synthetic morning baseline."));
    assert!(reply.contains("Synthetic current arrangement."));
    assert!(reply.contains("完成合成工作块"));
    assert!(reply.contains("scheduled 2026-10-02; completed 2026-09-26 at an unknown time"));
    assert!(reply.contains("Missing dates remain unknown"));
    assert!(saved.task_operations.is_empty()); assert!(saved.memory_proposals.is_empty());
    assert_eq!(requests.lock().unwrap()[0].dates.target_date,"2026-08-01");
    for (file,bytes) in source_paths.iter().zip(before) {assert_eq!(fs::read(file).unwrap(),bytes);}
    assert!(!path.join("life/Journal/Daily/2026/2026-09/2026-09-21.md").exists());
    let persisted:CollaborationState=serde_json::from_slice(&fs::read(directory.path().join("collaboration/collaboration.json")).unwrap()).unwrap();
    assert_eq!(persisted.sessions[0].messages.last().unwrap().text,*reply);
    drop(read_results);
    // Optional projection unavailable: the same registered tool still serves
    // canonical local evidence and the other two domains without a connection.
    fs::remove_file(&source_paths[3]).unwrap();
    let before_explicit=source_paths[..3].iter().map(|p|fs::read(p).unwrap()).collect::<Vec<_>>();
    let natural="请复盘2026-09-26到2026-09-27的计划、实际、Task和Habit，先讨论建议，不要修改。";
    app.submit_message("vault-a",&session.id,"2026-08-01",natural).unwrap();
    wait_for_finish(&app,&session.id,"vault-a");
    let explicit=app.session("vault-a",&session.id).unwrap();
    let explicit_results=results.lock().unwrap();
    for result in &explicit_results[3..] {
        let history:Value=serde_json::from_str(&result.text).unwrap();
        assert_eq!(history["fromDate"],"2026-09-26");assert_eq!(history["toDate"],"2026-09-27");
    }
    let habit:Value=serde_json::from_str(&explicit_results[5].text).unwrap();
    assert_eq!(habit["projection"]["state"],"missing");
    assert_eq!(habit["canonical"]["state"],"ready");
    assert_eq!(requests.lock().unwrap()[1].user_text,natural);
    assert!(explicit.messages.last().unwrap().text.contains("2026-09-26–2026-09-27"));
    assert!(explicit.messages.last().unwrap().text.contains("published projection missing (unavailable)"));
    assert!(explicit.task_operations.is_empty());assert!(explicit.memory_proposals.is_empty());
    assert_eq!(explicit.usage_bindings.len(),2);
    for binding in &explicit.usage_bindings {
        assert_eq!(binding.skill_name,"personal-dashboard-collaboration");
        assert_eq!(binding.skill_version,"1.5.0");
        assert_eq!(binding.registered_tools.iter().filter(|tool|*tool=="dashboard_read_history").count(),1);
    }
    if let Ok(destination)=std::env::var("PDCR_RETRO_EVIDENCE_DIR") {
        fs::create_dir_all(&destination).unwrap();
        fs::write(Path::new(&destination).join("personal-retro-history-reads.json"),serde_json::to_vec_pretty(&explicit_results.iter().map(|result|serde_json::from_str::<Value>(&result.text).unwrap()).collect::<Vec<_>>()).unwrap()).unwrap();
    }
    for (file,bytes) in source_paths[..3].iter().zip(before_explicit) {assert_eq!(fs::read(file).unwrap(),bytes);}
    assert!(!source_paths[3].exists(),"report must not rebuild missing projection");
    drop(explicit_results);
    if let Ok(destination)=std::env::var("PDCR_RETRO_EVIDENCE_DIR") {
        fs::create_dir_all(&destination).unwrap();
        fs::write(Path::new(&destination).join("personal-retro-default.json"),serde_json::to_vec_pretty(&saved).unwrap()).unwrap();
        fs::write(Path::new(&destination).join("personal-retro-explicit.json"),serde_json::to_vec_pretty(&explicit).unwrap()).unwrap();
    }
    app.submit_message("vault-a",&session.id,"2026-08-01","采用刚才的建议：在本地新增下一步 Task，名为 Retro adopted next step，安排2026-09-28。").unwrap();
    wait_for_finish(&app,&session.id,"vault-a");
    let adopted=app.session("vault-a",&session.id).unwrap();
    assert_eq!(adopted.task_operations.len(),1);
    assert_eq!(adopted.task_operations[0].status,"applied");
    let updated=tasks.read().unwrap();
    assert_eq!(updated.tasks.len(),2);
    let added=updated.tasks.iter().find(|task|task.name=="Retro adopted next step").unwrap();
    assert_eq!(added.date.as_deref(),Some("2026-09-28"));
    assert_eq!(updated.tasks.iter().find(|task|task.id==id).unwrap().date.as_deref(),Some("2026-10-02"));
    assert_eq!(fs::read(&source_paths[0]).unwrap(),record_before);
    assert_eq!(fs::read(&source_paths[2]).unwrap(),habit_before);
    drop(app);
    let (reopened,_,new_results)=new_application(&directory,&vault,MutableContext::new("vault-a"),Arc::new(AtomicBool::new(false)));
    let restored=reopened.session("vault-a",&session.id).unwrap();
    for report in [&saved,&explicit] {
        let prior=report.messages.last().unwrap();
        assert_eq!(restored.messages.iter().find(|message|message.id==prior.id).unwrap().text,prior.text);
    }
    assert!(new_results.lock().unwrap().is_empty(),"reopening never replays retro or adoption");
}

#[test]
fn queued_retro_period_keeps_submission_lived_day_across_four_am_and_browsed_dates() {
    let directory=IsolatedDirectory::new();
    let path=directory.vault("retro-four-am");let vault=MutableVault::new(&path);
    let clock=ManualClock::new("2026-09-28","03:59");
    let gate=Arc::new(AutomaticTurnGate::default());
    let (app,_,_,requests)=new_automatic_application(&directory,&vault,MutableContext::new("vault-a"),clock.clone(),Some(gate.clone()));
    let session=app.create_session("2026-08-01").unwrap();
    app.submit_message("vault-a",&session.id,"2026-08-01","hold-worker").unwrap();
    gate.wait_until_entered();
    app.submit_message("vault-a",&session.id,"2026-08-01","read task history").unwrap();
    clock.set_time("04:01");gate.release();
    for _ in 0..300 {
        if requests.lock().unwrap().len()==2 && app.session("vault-a",&session.id).unwrap().run_state=="completed" {break;}
        thread::sleep(Duration::from_millis(10));
    }
    let captured=serde_json::to_value(&requests.lock().unwrap()[1].dates).unwrap();
    assert_eq!(captured["livedDate"],"2026-09-28");
    assert_eq!(captured["requestLivedDate"],"2026-09-27");
    assert_eq!(captured["targetDate"],"2026-08-01");
    assert_eq!(captured["defaultPersonalRetroPeriod"],json!({"fromDate":"2026-09-20","toDate":"2026-09-26"}));
    app.submit_message("vault-a",&session.id,"2026-08-01","read task history").unwrap();
    wait_for_finish(&app,&session.id,"vault-a");
    let after=serde_json::to_value(&requests.lock().unwrap()[2].dates).unwrap();
    assert_eq!(after["defaultPersonalRetroPeriod"],json!({"fromDate":"2026-09-21","toDate":"2026-09-27"}));
    assert!(!path.join("life/.personal-dashboard/tasks/v1/tasks.json").exists());
}
