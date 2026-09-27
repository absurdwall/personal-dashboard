use personal_dashboard_lib::collaboration::{
    AppServerTransport, CollaborationApplication, CollaborationClock, CollaborationContextSource,
    CollaborationContextView, CollaborationState, CollaborationStore, ContextPaneView,
    DashboardContextReader, ExternalAppOptionView, ExternalAppToolView, ExternalToolActionView,
    FileCollaborationStore, ModelOptionView, RuntimeConnectionView, RuntimeDynamicToolCall,
    RuntimeDynamicToolHandler, RuntimeDynamicToolResult, RuntimeRunReconciliation,
    RuntimeTurnRequest, RuntimeTurnResult, StoredCollaborationMessage, StoredCollaborationSession,
};
use personal_dashboard_lib::collaboration_memory::{
    CollaborationMemoryService, CollaborationMemorySources, LongTermMemoryDocumentView,
    RoutineMemoryReferenceView,
};
use personal_dashboard_lib::tasks::{FileTaskStore, TaskApplication, TaskCreateInput};
use personal_dashboard_lib::today::{TodayClock, TodayWorkspacePersistence};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

static ISOLATED_DIRECTORY_SEQUENCE: AtomicU64 = AtomicU64::new(1);

struct IsolatedDirectory(PathBuf);

impl IsolatedDirectory {
    fn new() -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock should be after epoch")
            .as_nanos();
        let sequence = ISOLATED_DIRECTORY_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "personal-dashboard-collaboration-{}-{nonce}-{sequence}",
            std::process::id(),
        ));
        fs::create_dir_all(&path).expect("isolated directory should be created");
        Self(path)
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for IsolatedDirectory {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
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

#[derive(Clone)]
struct SyntheticMemoryService {
    document: Arc<Mutex<(u64, String)>>,
}

impl SyntheticMemoryService {
    fn new() -> Self {
        Self {
            document: Arc::new(Mutex::new((1, "# Synthetic profile\n".into()))),
        }
    }

    fn content(&self) -> String {
        self.document.lock().unwrap().1.clone()
    }

    fn set_external_content(&self, content: &str) {
        let mut document = self.document.lock().unwrap();
        document.0 += 1;
        document.1 = content.to_owned();
    }

    fn long_term_view(version: u64, content: &str) -> LongTermMemoryDocumentView {
        LongTermMemoryDocumentView {
            state: "ready".into(),
            source_path: "everyday/wiki/Life Operating Principles.md".into(),
            content: content.to_owned(),
            revision: Some(format!("synthetic-memory-v{version}")),
            message: "Synthetic long-term background loaded.".into(),
        }
    }
}

impl CollaborationMemoryService for SyntheticMemoryService {
    fn read(&self, expected_vault_key: Option<&str>) -> Result<CollaborationMemorySources, String> {
        if expected_vault_key != Some("synthetic-vault") {
            return Err("Synthetic memory is isolated to synthetic-vault.".into());
        }
        let document = self.document.lock().unwrap();
        Ok(CollaborationMemorySources {
            long_term: Self::long_term_view(document.0, &document.1),
            routine_reference: RoutineMemoryReferenceView {
                state: "ready".into(),
                source_path: "everyday/.agents/skills/life-companion/SKILL.md".into(),
                content: "Synthetic daily routine reference.".into(),
                message: "Synthetic routine reference loaded.".into(),
            },
        })
    }

    fn save_long_term(
        &self,
        expected_vault_key: &str,
        expected_revision: &str,
        content: &str,
    ) -> Result<LongTermMemoryDocumentView, String> {
        if expected_vault_key != "synthetic-vault" {
            return Err("Synthetic memory is isolated to synthetic-vault.".into());
        }
        let mut document = self.document.lock().unwrap();
        if expected_revision != format!("synthetic-memory-v{}", document.0) {
            return Err("Synthetic background changed outside Personal Dashboard.".into());
        }
        document.0 += 1;
        document.1 = content.to_owned();
        Ok(Self::long_term_view(document.0, &document.1))
    }
}

struct FixtureContext;

impl CollaborationContextSource for FixtureContext {
    fn current_vault_key(&self) -> Result<Option<String>, String> {
        Ok(Some("synthetic-vault".into()))
    }

    fn read_context(
        &self,
        expected_vault_key: Option<&str>,
        date: &str,
    ) -> Result<CollaborationContextView, String> {
        assert_eq!(expected_vault_key, Some("synthetic-vault"));
        Ok(CollaborationContextView {
            date: date.into(),
            vault_name: Some("synthetic".into()),
            daily_record: ContextPaneView {
                state: "ready".into(),
                message: "Current Daily Record loaded".into(),
                items: vec!["Morning baseline: synthetic walk".into()],
            },
            tasks: ContextPaneView {
                state: "ready".into(),
                message: "Current Tasks loaded".into(),
                items: vec!["Task: synthetic appointment".into()],
            },
            task_revision: Some("synthetic-task-revision".into()),
            task_target_binding: Some("synthetic-task-binding".into()),
            task_records: Vec::new(),
            task_lists: Vec::new(),
            habits: ContextPaneView {
                state: "ready".into(),
                message: "Current habits loaded".into(),
                items: vec!["Habit: synthetic stretch".into()],
            },
        })
    }
}

#[derive(Clone)]
struct FakeAppServer {
    prompts: Arc<Mutex<Vec<RuntimeTurnRequest>>>,
    calls: Arc<Mutex<Vec<&'static str>>>,
    read_only_text_turns_available: bool,
    external_apps: Vec<ExternalAppOptionView>,
    external_apps_for_thread: Option<Vec<ExternalAppOptionView>>,
    switch_vault_on_inspect: Option<Arc<AtomicBool>>,
    turn_gate: Option<Arc<FakeTurnGate>>,
    reconciliations: Arc<Mutex<HashMap<String, RuntimeRunReconciliation>>>,
    memory_call: Option<RuntimeDynamicToolCall>,
    memory_tool_results: Arc<Mutex<Vec<RuntimeDynamicToolResult>>>,
}

#[derive(Default)]
struct FakeTurnGate {
    state: Mutex<FakeTurnGateState>,
    changed: Condvar,
}

#[derive(Default)]
struct FakeTurnGateState {
    started: Vec<String>,
    confirmed_stops: Vec<String>,
    events: Vec<String>,
    release_all: bool,
    ignore_cancellation: bool,
    confirm_cancellation: bool,
}

impl FakeTurnGate {
    fn configure_cancellation(&self, ignore: bool, confirm: bool) {
        let mut state = self.state.lock().unwrap();
        state.ignore_cancellation = ignore;
        state.confirm_cancellation = confirm;
    }

    fn wait_for_started(&self, count: usize) -> Vec<String> {
        let deadline = std::time::Instant::now() + Duration::from_secs(3);
        let mut state = self.state.lock().unwrap();
        while state.started.len() < count {
            let remaining = deadline.saturating_duration_since(std::time::Instant::now());
            assert!(
                !remaining.is_zero(),
                "controlled turn did not start in time"
            );
            let (next, timeout) = self.changed.wait_timeout(state, remaining).unwrap();
            state = next;
            assert!(!timeout.timed_out() || state.started.len() >= count);
        }
        state.started.clone()
    }

    fn release_all(&self) {
        let mut state = self.state.lock().unwrap();
        state.release_all = true;
        self.changed.notify_all();
    }

    fn confirmed_stops(&self) -> Vec<String> {
        self.state.lock().unwrap().confirmed_stops.clone()
    }

    fn started_len(&self) -> usize {
        self.state.lock().unwrap().started.len()
    }

    fn events(&self) -> Vec<String> {
        self.state.lock().unwrap().events.clone()
    }

    fn wait_for_confirmed_stop(&self) {
        let deadline = std::time::Instant::now() + Duration::from_secs(3);
        let mut state = self.state.lock().unwrap();
        while state.confirmed_stops.is_empty() {
            let remaining = deadline.saturating_duration_since(std::time::Instant::now());
            assert!(
                !remaining.is_zero(),
                "controlled stop was not confirmed in time"
            );
            let (next, timeout) = self.changed.wait_timeout(state, remaining).unwrap();
            state = next;
            assert!(!timeout.timed_out() || !state.confirmed_stops.is_empty());
        }
    }
}

impl AppServerTransport for FakeAppServer {
    fn inspect(&mut self) -> Result<RuntimeConnectionView, String> {
        if let Some(switch) = &self.switch_vault_on_inspect {
            switch.store(true, Ordering::SeqCst);
        }
        Ok(RuntimeConnectionView {
            executable_path: Some("/synthetic/codex".into()),
            version: Some("codex-cli synthetic".into()),
            experimental: true,
            read_only_text_turns_available: self.read_only_text_turns_available,
            text_turn_unavailable_reason: (!self.read_only_text_turns_available).then(|| {
                "Synthetic runtime cannot guarantee that local filesystem tools are disabled."
                    .into()
            }),
            authenticated: true,
            auth_mode: Some("chatgpt".into()),
            account_email: Some("fixture@example.invalid".into()),
            plan_type: Some("test".into()),
            models: vec![ModelOptionView {
                id: "synthetic-model".into(),
                display_name: "Synthetic model".into(),
                default_reasoning_effort: Some("synthetic-default".into()),
                reasoning_efforts: vec!["synthetic-light".into(), "synthetic-deep".into()],
                is_default: true,
            }],
            external_apps: self.external_apps.clone(),
            external_discovery_error: None,
            selected_model: Some("synthetic-model".into()),
            selected_reasoning_effort: None,
            error: None,
        })
    }

    fn inspect_external_apps_for_thread(
        &mut self,
        _thread_id: &str,
    ) -> Result<(Vec<ExternalAppOptionView>, Option<String>), String> {
        Ok((
            self.external_apps_for_thread
                .clone()
                .unwrap_or_else(|| self.external_apps.clone()),
            None,
        ))
    }

    fn start_chatgpt_login(&mut self) -> Result<(), String> {
        Err("login is intentionally not used in this test".into())
    }

    fn start_thread(
        &mut self,
        _model: Option<&str>,
        _instructions: &str,
    ) -> Result<String, String> {
        self.calls.lock().unwrap().push("start-thread");
        Ok("runtime-thread-1".into())
    }

    fn resume_thread(&mut self, thread_id: &str) -> Result<(), String> {
        self.calls.lock().unwrap().push("resume-thread");
        assert_eq!(thread_id, "runtime-thread-1");
        Ok(())
    }

    fn send_turn(&mut self, request: RuntimeTurnRequest) -> Result<RuntimeTurnResult, String> {
        self.calls.lock().unwrap().push("send-turn");
        self.prompts.lock().unwrap().push(request);
        Ok(RuntimeTurnResult {
            text: "Synthetic reply based on current context.".into(),
            runtime_turn_id: Some("runtime-turn-1".into()),
            stopped: false,
            external_actions: Vec::new(),
        })
    }

    fn send_turn_cancellable(
        &mut self,
        request: RuntimeTurnRequest,
        cancellation: Arc<AtomicBool>,
    ) -> Result<RuntimeTurnResult, String> {
        let Some(gate) = &self.turn_gate else {
            return self.send_turn(request);
        };
        self.calls.lock().unwrap().push("send-turn");
        self.prompts.lock().unwrap().push(request.clone());
        let mut state = gate.state.lock().unwrap();
        state.started.push(request.execution_id.clone());
        state
            .events
            .push(format!("started:{}", request.execution_id));
        gate.changed.notify_all();
        while !state.release_all
            && (state.ignore_cancellation || !cancellation.load(Ordering::SeqCst))
        {
            let (next, _) = gate
                .changed
                .wait_timeout(state, Duration::from_millis(10))
                .unwrap();
            state = next;
        }
        if cancellation.load(Ordering::SeqCst) && state.confirm_cancellation {
            state.confirmed_stops.push(request.execution_id.clone());
            state
                .events
                .push(format!("stopped:{}", request.execution_id));
            gate.changed.notify_all();
            return Ok(RuntimeTurnResult {
                text: String::new(),
                runtime_turn_id: Some(format!("turn-{}", request.execution_id)),
                stopped: true,
                external_actions: Vec::new(),
            });
        }
        if cancellation.load(Ordering::SeqCst) {
            state
                .events
                .push(format!("unconfirmed-stop:{}", request.execution_id));
            gate.changed.notify_all();
            return Err("synthetic runtime did not confirm its shutdown outcome".into());
        }
        Ok(RuntimeTurnResult {
            text: format!("Synthetic reply for {}.", request.user_text),
            runtime_turn_id: Some(format!("turn-{}", request.execution_id)),
            stopped: false,
            external_actions: Vec::new(),
        })
    }

    fn send_turn_with_dynamic_tools(
        &mut self,
        request: RuntimeTurnRequest,
        cancellation: Arc<AtomicBool>,
        tool_handler: Option<RuntimeDynamicToolHandler>,
    ) -> Result<RuntimeTurnResult, String> {
        if let Some(call) = self.memory_call.take() {
            if let Some(handler) = tool_handler {
                self.memory_tool_results.lock().unwrap().push(handler(call));
                return self.send_turn(request);
            }
        }
        self.send_turn_cancellable(request, cancellation)
    }

    fn reconcile_turn(
        &mut self,
        thread_id: &str,
        execution_id: &str,
    ) -> Result<RuntimeRunReconciliation, String> {
        assert_eq!(thread_id, "runtime-thread-1");
        Ok(self
            .reconciliations
            .lock()
            .unwrap()
            .get(execution_id)
            .cloned()
            .unwrap_or(RuntimeRunReconciliation::NotFound))
    }
}

fn new_application(
    directory: &IsolatedDirectory,
    prompts: Arc<Mutex<Vec<RuntimeTurnRequest>>>,
) -> CollaborationApplication {
    new_application_with_turn_capability(directory, prompts, true)
}

fn new_application_with_turn_capability(
    directory: &IsolatedDirectory,
    prompts: Arc<Mutex<Vec<RuntimeTurnRequest>>>,
    read_only_text_turns_available: bool,
) -> CollaborationApplication {
    new_application_with_call_log(
        directory,
        prompts,
        read_only_text_turns_available,
        Arc::new(Mutex::new(Vec::new())),
    )
}

fn new_application_with_call_log(
    directory: &IsolatedDirectory,
    prompts: Arc<Mutex<Vec<RuntimeTurnRequest>>>,
    read_only_text_turns_available: bool,
    calls: Arc<Mutex<Vec<&'static str>>>,
) -> CollaborationApplication {
    new_application_with_call_log_and_apps(
        directory,
        prompts,
        read_only_text_turns_available,
        calls,
        Vec::new(),
    )
}

fn new_application_with_call_log_and_apps(
    directory: &IsolatedDirectory,
    prompts: Arc<Mutex<Vec<RuntimeTurnRequest>>>,
    read_only_text_turns_available: bool,
    calls: Arc<Mutex<Vec<&'static str>>>,
    external_apps: Vec<ExternalAppOptionView>,
) -> CollaborationApplication {
    new_application_with_call_log_and_thread_apps(
        directory,
        prompts,
        read_only_text_turns_available,
        calls,
        external_apps,
        None,
    )
}

fn new_application_with_call_log_and_thread_apps(
    directory: &IsolatedDirectory,
    prompts: Arc<Mutex<Vec<RuntimeTurnRequest>>>,
    read_only_text_turns_available: bool,
    calls: Arc<Mutex<Vec<&'static str>>>,
    external_apps: Vec<ExternalAppOptionView>,
    external_apps_for_thread: Option<Vec<ExternalAppOptionView>>,
) -> CollaborationApplication {
    CollaborationApplication::with_adapters(
        Arc::new(FileCollaborationStore::new(
            directory
                .path()
                .join("collaboration")
                .join("collaboration.json"),
        )),
        Box::new(FakeAppServer {
            prompts,
            calls,
            read_only_text_turns_available,
            external_apps,
            external_apps_for_thread,
            switch_vault_on_inspect: None,
            turn_gate: None,
            reconciliations: Arc::new(Mutex::new(HashMap::new())),
            memory_call: None,
            memory_tool_results: Arc::new(Mutex::new(Vec::new())),
        }),
        Arc::new(FixtureContext),
        Arc::new(FixedClock),
        directory.path().to_path_buf(),
        "Only use supplied read-only Dashboard context.".into(),
    )
}

fn new_application_with_synthetic_memory(
    directory: &IsolatedDirectory,
    prompts: Arc<Mutex<Vec<RuntimeTurnRequest>>>,
    memory: SyntheticMemoryService,
    memory_call: Option<RuntimeDynamicToolCall>,
    memory_tool_results: Arc<Mutex<Vec<RuntimeDynamicToolResult>>>,
) -> CollaborationApplication {
    CollaborationApplication::with_adapters(
        Arc::new(FileCollaborationStore::new(
            directory
                .path()
                .join("collaboration")
                .join("collaboration.json"),
        )),
        Box::new(FakeAppServer {
            prompts,
            calls: Arc::new(Mutex::new(Vec::new())),
            read_only_text_turns_available: true,
            external_apps: Vec::new(),
            external_apps_for_thread: None,
            switch_vault_on_inspect: None,
            turn_gate: None,
            reconciliations: Arc::new(Mutex::new(HashMap::new())),
            memory_call,
            memory_tool_results,
        }),
        Arc::new(FixtureContext),
        Arc::new(FixedClock),
        directory.path().to_path_buf(),
        "Only use supplied read-only Dashboard context.".into(),
    )
    .with_memory_service(Arc::new(memory))
}

fn new_application_with_controls(
    directory: &IsolatedDirectory,
    prompts: Arc<Mutex<Vec<RuntimeTurnRequest>>>,
    calls: Arc<Mutex<Vec<&'static str>>>,
    turn_gate: Option<Arc<FakeTurnGate>>,
    reconciliations: Arc<Mutex<HashMap<String, RuntimeRunReconciliation>>>,
) -> CollaborationApplication {
    CollaborationApplication::with_adapters(
        Arc::new(FileCollaborationStore::new(
            directory
                .path()
                .join("collaboration")
                .join("collaboration.json"),
        )),
        Box::new(FakeAppServer {
            prompts,
            calls,
            read_only_text_turns_available: true,
            external_apps: Vec::new(),
            external_apps_for_thread: None,
            switch_vault_on_inspect: None,
            turn_gate,
            reconciliations,
            memory_call: None,
            memory_tool_results: Arc::new(Mutex::new(Vec::new())),
        }),
        Arc::new(FixtureContext),
        Arc::new(FixedClock),
        directory.path().to_path_buf(),
        "Only use supplied read-only Dashboard context.".into(),
    )
}

struct SwitchAfterRuntimeInspection(Arc<AtomicBool>);

impl CollaborationContextSource for SwitchAfterRuntimeInspection {
    fn current_vault_key(&self) -> Result<Option<String>, String> {
        Ok(Some(if self.0.load(Ordering::SeqCst) {
            "switched-vault".into()
        } else {
            "synthetic-vault".into()
        }))
    }

    fn read_context(
        &self,
        expected_vault_key: Option<&str>,
        date: &str,
    ) -> Result<CollaborationContextView, String> {
        assert_eq!(expected_vault_key, Some("synthetic-vault"));
        FixtureContext.read_context(expected_vault_key, date)
    }
}

fn wait_until_finished(application: &CollaborationApplication, session_id: &str) {
    for _ in 0..100 {
        let session = application.session("synthetic-vault", session_id).unwrap();
        if matches!(session.run_state.as_str(), "completed" | "error") {
            return;
        }
        thread::sleep(Duration::from_millis(10));
    }
    panic!("the controlled collaboration turn did not finish");
}

fn wait_for_run_state(
    application: &CollaborationApplication,
    session_id: &str,
    expected: &str,
) -> personal_dashboard_lib::collaboration::CollaborationSessionView {
    for _ in 0..300 {
        let session = application.session("synthetic-vault", session_id).unwrap();
        if session.run_state == expected {
            return session;
        }
        thread::sleep(Duration::from_millis(10));
    }
    panic!("collaboration session did not reach run state `{expected}`");
}

fn synthetic_external_app(id: &str) -> ExternalAppOptionView {
    ExternalAppOptionView {
        id: id.into(),
        display_name: format!("Synthetic {id}"),
        description: "Synthetic connector".into(),
        accessible: true,
        enabled: true,
        callable: true,
        tools: vec![ExternalAppToolView {
            id: "search".into(),
            title: "Search".into(),
            description: "Synthetic read".into(),
            enabled: true,
            read_only: true,
        }],
    }
}

#[test]
fn selected_external_app_is_saved_with_the_message_and_only_selected_apps_enter_the_turn() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let application = new_application_with_call_log_and_apps(
        &directory,
        Arc::clone(&prompts),
        true,
        Arc::new(Mutex::new(Vec::new())),
        vec![
            synthetic_external_app("calendar"),
            synthetic_external_app("drive"),
        ],
    );
    let session = application.create_session("2026-09-27").unwrap();
    let queued = application
        .submit_message_with_external_apps(
            "synthetic-vault",
            &session.id,
            "2026-09-27",
            "Check the selected calendar for my appointment",
            &["calendar".into()],
        )
        .unwrap();
    wait_until_finished(&application, &queued.id);

    let saved = application.session("synthetic-vault", &session.id).unwrap();
    let user_message = saved
        .messages
        .iter()
        .find(|message| message.role == "user")
        .unwrap();
    assert_eq!(user_message.external_app_ids, vec!["calendar"]);
    assert_eq!(user_message.delivery_state, "completed");
    let turn_requests = prompts.lock().unwrap();
    assert_eq!(turn_requests.len(), 1);
    assert_eq!(
        turn_requests[0]
            .external_apps
            .iter()
            .map(|app| app.id.as_str())
            .collect::<Vec<_>>(),
        vec!["calendar"]
    );
}

#[test]
fn resumed_thread_rechecks_effective_app_availability_before_sending() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let calls = Arc::new(Mutex::new(Vec::new()));
    let application = new_application_with_call_log_and_thread_apps(
        &directory,
        Arc::clone(&prompts),
        true,
        Arc::clone(&calls),
        vec![synthetic_external_app("calendar")],
        Some(Vec::new()),
    );
    let session = application.create_session("2026-09-27").unwrap();
    let first = application
        .submit_message(
            "synthetic-vault",
            &session.id,
            "2026-09-27",
            "Start a conversation",
        )
        .unwrap();
    wait_until_finished(&application, &first.id);

    let queued = application
        .submit_message_with_external_apps(
            "synthetic-vault",
            &session.id,
            "2026-09-27",
            "Use the selected calendar",
            &["calendar".into()],
        )
        .unwrap();
    wait_until_finished(&application, &queued.id);

    let saved = application.session("synthetic-vault", &session.id).unwrap();
    let failed_request = saved
        .messages
        .iter()
        .rev()
        .find(|message| message.role == "user")
        .unwrap();
    assert_eq!(failed_request.external_app_ids, vec!["calendar"]);
    assert_eq!(failed_request.delivery_state, "error");
    assert!(saved.progress.contains("no longer available"));
    assert_eq!(prompts.lock().unwrap().len(), 1);
    assert_eq!(
        *calls.lock().unwrap(),
        ["start-thread", "send-turn", "resume-thread"]
    );
}

#[test]
fn unavailable_external_app_is_refused_before_the_message_is_queued() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let calls = Arc::new(Mutex::new(Vec::new()));
    let application =
        new_application_with_call_log(&directory, Arc::clone(&prompts), true, Arc::clone(&calls));
    let session = application.create_session("2026-09-27").unwrap();
    let error = application
        .submit_message_with_external_apps(
            "synthetic-vault",
            &session.id,
            "2026-09-27",
            "Use calendar",
            &["calendar".into()],
        )
        .unwrap_err();
    assert!(error.contains("no longer available"));
    let unchanged = application.session("synthetic-vault", &session.id).unwrap();
    assert!(unchanged.messages.is_empty());
    assert!(prompts.lock().unwrap().is_empty());
    assert!(calls.lock().unwrap().is_empty());
}

#[test]
fn user_and_assistant_messages_survive_reopening_the_application_service() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let application = new_application(&directory, Arc::clone(&prompts));
    let session = application.create_session("2026-09-27").unwrap();
    application
        .select_reasoning_effort(Some("synthetic-deep"))
        .unwrap();

    application
        .submit_message(
            "synthetic-vault",
            &session.id,
            "2026-09-20",
            "What was planned?",
        )
        .unwrap();
    wait_until_finished(&application, &session.id);

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let history_directory = directory.path().join("collaboration");
        let history_file = history_directory.join("collaboration.json");
        assert_eq!(
            fs::metadata(&history_directory)
                .unwrap()
                .permissions()
                .mode()
                & 0o777,
            0o700
        );
        assert_eq!(
            fs::metadata(&history_file).unwrap().permissions().mode() & 0o777,
            0o600
        );
    }

    let prompt = prompts.lock().unwrap().first().cloned().unwrap();
    assert_eq!(prompt.user_text, "What was planned?");
    assert_eq!(prompt.reasoning_effort.as_deref(), Some("synthetic-deep"));
    assert_eq!(prompt.context.date, "2026-09-20");
    assert_eq!(prompt.context.tasks.items, ["Task: synthetic appointment"]);
    assert_eq!(
        prompt.context.daily_record.items,
        ["Morning baseline: synthetic walk"]
    );
    assert_eq!(prompt.context.habits.items, ["Habit: synthetic stretch"]);

    let reopened = new_application(&directory, prompts);
    let recovered = reopened.session("synthetic-vault", &session.id).unwrap();
    assert_eq!(
        reopened.connection().selected_reasoning_effort.as_deref(),
        Some("synthetic-deep")
    );
    assert_eq!(recovered.activity_dates, ["2026-09-20", "2026-09-27"]);
    assert_eq!(recovered.messages.len(), 2);
    assert_eq!(recovered.messages[0].role, "user");
    assert_eq!(recovered.messages[0].text, "What was planned?");
    assert_eq!(recovered.messages[0].message_date, "2026-09-27");
    assert_eq!(recovered.messages[0].target_date, "2026-09-20");
    assert_eq!(recovered.messages[1].role, "assistant");
    assert_eq!(recovered.messages[1].message_date, "2026-09-27");
    assert_eq!(recovered.messages[1].target_date, "2026-09-20");
    assert_eq!(
        recovered.messages[1].text,
        "Synthetic reply based on current context."
    );
    assert_eq!(
        recovered.runtime_thread_id.as_deref(),
        Some("runtime-thread-1")
    );
    assert_eq!(reopened.list_sessions("2026-09-20").unwrap().len(), 1);
    assert_eq!(reopened.list_sessions("2026-09-27").unwrap().len(), 1);
}

#[test]
fn session_drafts_target_dates_and_activity_history_survive_reopening() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let application = new_application(&directory, Arc::clone(&prompts));
    let first = application.create_session("2026-09-27").unwrap();
    let second = application.create_session("2026-09-27").unwrap();

    application
        .save_draft_for_selected_vault(&first.id, "2026-09-27", "First date draft")
        .unwrap();
    application
        .set_target_date_for_selected_vault(&first.id, "2026-09-20")
        .unwrap();
    application
        .save_draft_for_selected_vault(&first.id, "2026-09-20", "Historical date draft")
        .unwrap();
    let late_transcript = application
        .save_draft_for_selected_vault(
            &first.id,
            "2026-09-27",
            "First date draft with a late voice transcript",
        )
        .unwrap();
    assert_eq!(late_transcript.target_date, "2026-09-20");
    assert_eq!(late_transcript.draft, "Historical date draft");
    application
        .save_draft_for_selected_vault(&second.id, "2026-09-27", "Independent second draft")
        .unwrap();

    let reopened = new_application(&directory, prompts);
    let restored_first = reopened.session("synthetic-vault", &first.id).unwrap();
    let restored_second = reopened.session("synthetic-vault", &second.id).unwrap();
    assert_eq!(restored_first.draft, "Historical date draft");
    assert_eq!(
        restored_first
            .drafts_by_date
            .get("2026-09-27")
            .map(String::as_str),
        Some("First date draft with a late voice transcript")
    );
    assert_eq!(
        restored_first
            .drafts_by_date
            .get("2026-09-20")
            .map(String::as_str),
        Some("Historical date draft")
    );
    assert_eq!(restored_second.draft, "Independent second draft");
    assert_eq!(restored_first.target_date, "2026-09-20");
    assert_eq!(restored_first.created_date, "2026-09-27");
    assert_eq!(restored_first.activity_dates, ["2026-09-20", "2026-09-27"]);
    let historical_sessions = reopened.list_sessions("2026-09-20").unwrap();
    assert_eq!(historical_sessions.len(), 1);
    assert_eq!(historical_sessions[0].id, first.id);
    let switched_back = reopened
        .set_target_date_for_selected_vault(&first.id, "2026-09-27")
        .unwrap();
    assert_eq!(
        switched_back.draft,
        "First date draft with a late voice transcript"
    );
}

#[test]
fn same_vault_requests_from_different_sessions_run_in_fifo_order() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let calls = Arc::new(Mutex::new(Vec::new()));
    let gate = Arc::new(FakeTurnGate::default());
    let application = new_application_with_controls(
        &directory,
        Arc::clone(&prompts),
        calls,
        Some(Arc::clone(&gate)),
        Arc::new(Mutex::new(HashMap::new())),
    );
    let first_session = application.create_session("2026-09-27").unwrap();
    let second_session = application.create_session("2026-09-27").unwrap();

    let _first = application
        .submit_message(
            "synthetic-vault",
            &first_session.id,
            "2026-09-27",
            "First queued request",
        )
        .unwrap();
    gate.wait_for_started(1);
    let second = application
        .submit_message(
            "synthetic-vault",
            &second_session.id,
            "2026-09-20",
            "Second queued request",
        )
        .unwrap();
    assert_eq!(second.run_state, "queued");
    assert_eq!(
        application
            .workspace("2026-09-27")
            .unwrap()
            .active_run
            .unwrap()
            .session_id,
        first_session.id
    );
    assert_eq!(
        gate.wait_for_started(1).len(),
        1,
        "the second request must wait"
    );

    gate.release_all();
    wait_for_run_state(&application, &first_session.id, "completed");
    wait_for_run_state(&application, &second_session.id, "completed");
    let prompts = prompts.lock().unwrap();
    assert_eq!(prompts.len(), 2);
    assert_eq!(prompts[0].user_text, "First queued request");
    assert_eq!(prompts[0].context.date, "2026-09-27");
    assert_eq!(prompts[1].user_text, "Second queued request");
    assert_eq!(prompts[1].context.date, "2026-09-20");
}

#[test]
fn next_vault_request_waits_until_the_active_stop_is_confirmed() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let calls = Arc::new(Mutex::new(Vec::new()));
    let gate = Arc::new(FakeTurnGate::default());
    gate.configure_cancellation(false, true);
    let application = new_application_with_controls(
        &directory,
        Arc::clone(&prompts),
        calls,
        Some(Arc::clone(&gate)),
        Arc::new(Mutex::new(HashMap::new())),
    );
    let active_session = application.create_session("2026-09-27").unwrap();
    let queued_session = application.create_session("2026-09-27").unwrap();
    let active = application
        .submit_message(
            "synthetic-vault",
            &active_session.id,
            "2026-09-27",
            "Request to stop",
        )
        .unwrap();
    gate.wait_for_started(1);
    application
        .submit_message(
            "synthetic-vault",
            &queued_session.id,
            "2026-09-27",
            "Replacement request",
        )
        .unwrap();

    let stopping = application
        .stop_run_for_selected_vault(&active_session.id, active.run_id.as_deref().unwrap())
        .unwrap();
    assert_eq!(stopping.run_state, "stopping");
    gate.wait_for_confirmed_stop();
    assert_eq!(gate.started_len(), 1);
    gate.release_all();

    let stopped = wait_for_run_state(&application, &active_session.id, "stopped");
    wait_for_run_state(&application, &queued_session.id, "completed");
    assert_eq!(stopped.messages[0].delivery_state, "stopped");
    assert_eq!(gate.confirmed_stops(), [active.run_id.unwrap()]);
    let events = gate.events();
    assert_eq!(events.len(), 3);
    assert!(events[0].starts_with("started:"));
    assert!(events[1].starts_with("stopped:"));
    assert!(events[2].starts_with("started:"));
}

#[test]
fn exit_shutdown_returns_promptly_and_restart_reconciles_without_replaying_queue() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let calls = Arc::new(Mutex::new(Vec::new()));
    let gate = Arc::new(FakeTurnGate::default());
    gate.configure_cancellation(true, false);
    let application = new_application_with_controls(
        &directory,
        Arc::clone(&prompts),
        calls,
        Some(Arc::clone(&gate)),
        Arc::new(Mutex::new(HashMap::new())),
    );
    let active_session = application.create_session("2026-09-27").unwrap();
    let queued_session = application.create_session("2026-09-27").unwrap();
    let active = application
        .submit_message(
            "synthetic-vault",
            &active_session.id,
            "2026-09-27",
            "Active request during exit",
        )
        .unwrap();
    gate.wait_for_started(1);
    application
        .submit_message(
            "synthetic-vault",
            &queued_session.id,
            "2026-09-27",
            "Queued request during exit",
        )
        .unwrap();

    let started = std::time::Instant::now();
    application.shutdown().unwrap();
    assert!(
        started.elapsed() < Duration::from_secs(1),
        "the exit callback must not wait for the runtime turn mutex"
    );
    let during_shutdown = application
        .session("synthetic-vault", &active_session.id)
        .unwrap();
    assert_eq!(during_shutdown.run_id.as_deref(), active.run_id.as_deref());
    assert_eq!(during_shutdown.run_state, "thinking");

    gate.release_all();
    let unconfirmed = wait_for_run_state(&application, &active_session.id, "stop-unconfirmed");
    assert_eq!(unconfirmed.messages[0].delivery_state, "stop-unconfirmed");
    assert_eq!(gate.started_len(), 1);
    assert_eq!(
        gate.events()
            .iter()
            .filter(|event| event.starts_with("started:"))
            .count(),
        1,
        "shutdown must not start the queued request"
    );

    let restarted = new_application_with_controls(
        &directory,
        Arc::clone(&prompts),
        Arc::new(Mutex::new(Vec::new())),
        None,
        Arc::new(Mutex::new(HashMap::new())),
    );
    let interrupted = restarted
        .session("synthetic-vault", &active_session.id)
        .unwrap();
    assert_eq!(interrupted.run_state, "interrupted");
    assert_eq!(interrupted.messages[0].delivery_state, "interrupted");
    assert!(!interrupted.messages[0].result_checked);
    let queued = restarted
        .session("synthetic-vault", &queued_session.id)
        .unwrap();
    assert_eq!(queued.messages[0].delivery_state, "not-started");
    assert!(restarted.workspace("2026-09-27").unwrap().recovery_required);
    assert_eq!(prompts.lock().unwrap().len(), 1);

    let reconciled = restarted
        .reconcile_run_for_selected_vault(&active_session.id, active.run_id.as_deref().unwrap())
        .unwrap();
    assert_eq!(reconciled.run_state, "interrupted");
    assert_eq!(reconciled.messages[0].delivery_state, "interrupted");
    assert!(reconciled.messages[0].result_checked);
    assert_eq!(prompts.lock().unwrap().len(), 1);
    assert_eq!(gate.started_len(), 1);
}

#[test]
fn restart_checks_saved_result_and_never_replays_unstarted_queue_automatically() {
    let directory = IsolatedDirectory::new();
    let store = FileCollaborationStore::new(
        directory
            .path()
            .join("collaboration")
            .join("collaboration.json"),
    );
    let mut state = CollaborationState::default();
    state.next_queue_order = 3;
    state.sessions.push(StoredCollaborationSession {
        id: "session-recovery".into(),
        vault_key: Some("synthetic-vault".into()),
        title: "Recovery fixture".into(),
        created_date: "2026-09-27".into(),
        activity_dates: vec!["2026-09-27".into()],
        last_activity_at: "2026-09-27T09:10:00-04:00".into(),
        target_date: "2026-09-27".into(),
        run_id: Some("execution-active-1".into()),
        run_state: "thinking".into(),
        progress: "Controlled running state".into(),
        runtime_thread_id: Some("runtime-thread-1".into()),
        task_tool_registered: false,
        daily_plan_tool_registered: false,
        daily_record_tool_registered: false,
        memory_tool_registered: false,
        messages: vec![
            StoredCollaborationMessage {
                id: "message-active-1".into(),
                role: "user".into(),
                text: "Request whose result must be checked".into(),
                message_date: "2026-09-27".into(),
                target_date: "2026-09-27".into(),
                created_at: "2026-09-27T09:10:00-04:00".into(),
                execution_id: Some("execution-active-1".into()),
                runtime_turn_id: None,
                delivery_state: "in-progress".into(),
                queue_order: Some(1),
                result_checked: false,
                automatic_plan: false,
                external_app_ids: vec!["calendar".into()],
                external_actions: Vec::new(),
                pending_external_approval: None,
            },
            StoredCollaborationMessage {
                id: "message-pending-2".into(),
                role: "user".into(),
                text: "Request that was still queued".into(),
                message_date: "2026-09-27".into(),
                target_date: "2026-09-20".into(),
                created_at: "2026-09-27T09:11:00-04:00".into(),
                execution_id: Some("execution-pending-2".into()),
                runtime_turn_id: None,
                delivery_state: "queued".into(),
                queue_order: Some(2),
                result_checked: false,
                automatic_plan: false,
                external_app_ids: Vec::new(),
                external_actions: Vec::new(),
                pending_external_approval: None,
            },
        ],
        task_operations: Vec::new(),
        memory_proposals: Vec::new(),
        draft: "Recovered draft".into(),
        drafts_by_date: HashMap::new(),
    });
    store.save(&state).unwrap();
    let history_path = directory
        .path()
        .join("collaboration")
        .join("collaboration.json");
    let mut legacy_history: serde_json::Value =
        serde_json::from_slice(&fs::read(&history_path).unwrap()).unwrap();
    legacy_history["sessions"][0]
        .as_object_mut()
        .unwrap()
        .remove("draftsByDate");
    fs::write(&history_path, serde_json::to_vec(&legacy_history).unwrap()).unwrap();

    let prompts = Arc::new(Mutex::new(Vec::new()));
    let reconciliations = Arc::new(Mutex::new(HashMap::from([(
        "execution-active-1".into(),
        RuntimeRunReconciliation::Completed {
            text: "Recovered synthetic result".into(),
            runtime_turn_id: "runtime-turn-recovered".into(),
            external_actions: vec![ExternalToolActionView {
                action_id: "thread-1:call-1".into(),
                source_id: "calendar".into(),
                source_name: "Synthetic Calendar".into(),
                tool_id: "create_event".into(),
                status: "completed".into(),
                target_scope: "unknown".into(),
                input_summary: "{\"eventId\":\"evt-7\"}".into(),
                result_summary: "{\"status\":\"created\"}".into(),
            }],
        },
    )])));
    let application = new_application_with_controls(
        &directory,
        Arc::clone(&prompts),
        Arc::new(Mutex::new(Vec::new())),
        None,
        Arc::clone(&reconciliations),
    );
    let interrupted = application
        .session("synthetic-vault", "session-recovery")
        .unwrap();
    assert_eq!(interrupted.run_state, "interrupted");
    assert_eq!(interrupted.draft, "Recovered draft");
    assert_eq!(
        interrupted
            .drafts_by_date
            .get("2026-09-27")
            .map(String::as_str),
        Some("Recovered draft")
    );
    assert!(
        application
            .workspace("2026-09-27")
            .unwrap()
            .recovery_required
    );
    assert_eq!(interrupted.messages[0].delivery_state, "interrupted");
    assert_eq!(interrupted.messages[1].delivery_state, "not-started");
    assert!(
        prompts.lock().unwrap().is_empty(),
        "startup must not replay work"
    );

    let recovered = application
        .reconcile_run_for_selected_vault("session-recovery", "execution-active-1")
        .unwrap();
    assert_eq!(recovered.messages[0].delivery_state, "completed");
    assert_eq!(
        recovered.messages[0].runtime_turn_id.as_deref(),
        Some("runtime-turn-recovered")
    );
    assert_eq!(recovered.messages[2].text, "Recovered synthetic result");
    assert_eq!(
        recovered.messages[2].execution_id.as_deref(),
        Some("execution-active-1")
    );
    assert_eq!(recovered.messages[0].external_actions.len(), 1);
    assert_eq!(
        recovered.messages[0].external_actions[0].target_scope,
        "2026-09-27"
    );
    assert!(
        !application
            .workspace("2026-09-27")
            .unwrap()
            .recovery_required
    );
    assert!(
        prompts.lock().unwrap().is_empty(),
        "reconciliation must not resend the recovered turn"
    );

    application
        .requeue_not_started_for_selected_vault("session-recovery", "execution-pending-2")
        .unwrap();
    let completed = wait_for_run_state(&application, "session-recovery", "completed");
    assert!(completed.messages.iter().any(|message| {
        message.execution_id.as_deref() == Some("execution-pending-2")
            && message.delivery_state == "completed"
    }));
    let sent = prompts.lock().unwrap();
    assert_eq!(sent.len(), 1);
    assert_eq!(sent[0].execution_id, "execution-pending-2");
    assert_eq!(sent[0].user_text, "Request that was still queued");
}

#[test]
fn unavailable_reasoning_efforts_are_rejected_before_persistence() {
    let directory = IsolatedDirectory::new();
    let application = new_application(&directory, Arc::new(Mutex::new(Vec::new())));

    let error = application
        .select_reasoning_effort(Some("invented-effort"))
        .unwrap_err();
    assert!(error.contains("no longer available"));
    assert_eq!(application.connection().selected_reasoning_effort, None);
}

#[test]
fn unsupported_local_tool_isolation_fails_closed_before_starting_a_thread_or_turn() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let calls = Arc::new(Mutex::new(Vec::new()));
    let application =
        new_application_with_call_log(&directory, Arc::clone(&prompts), false, Arc::clone(&calls));
    let session = application.create_session("2026-09-27").unwrap();

    application
        .submit_message(
            "synthetic-vault",
            &session.id,
            "2026-09-27",
            "Read my notes",
        )
        .unwrap();
    wait_until_finished(&application, &session.id);

    let blocked = application.session("synthetic-vault", &session.id).unwrap();
    assert_eq!(blocked.run_state, "error");
    assert!(blocked.progress.contains("cannot guarantee"));
    assert!(blocked.runtime_thread_id.is_none());
    assert_eq!(blocked.messages.len(), 1);
    assert!(prompts.lock().unwrap().is_empty());
    assert!(calls.lock().unwrap().is_empty());
}

#[test]
fn selected_vault_is_rechecked_immediately_before_sending_context() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let calls = Arc::new(Mutex::new(Vec::new()));
    let switched = Arc::new(AtomicBool::new(false));
    let application = CollaborationApplication::with_adapters(
        Arc::new(FileCollaborationStore::new(
            directory
                .path()
                .join("collaboration")
                .join("collaboration.json"),
        )),
        Box::new(FakeAppServer {
            prompts: Arc::clone(&prompts),
            calls: Arc::clone(&calls),
            read_only_text_turns_available: true,
            external_apps: Vec::new(),
            external_apps_for_thread: None,
            switch_vault_on_inspect: Some(Arc::clone(&switched)),
            turn_gate: None,
            reconciliations: Arc::new(Mutex::new(HashMap::new())),
            memory_call: None,
            memory_tool_results: Arc::new(Mutex::new(Vec::new())),
        }),
        Arc::new(SwitchAfterRuntimeInspection(Arc::clone(&switched))),
        Arc::new(FixedClock),
        directory.path().join("collaboration-runtime"),
        "Only use supplied read-only Dashboard context.".into(),
    );
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message(
            "synthetic-vault",
            &session.id,
            "2026-09-27",
            "Read my notes",
        )
        .unwrap();
    wait_until_finished(&application, &session.id);

    let finished = application.session("synthetic-vault", &session.id).unwrap();
    assert_eq!(finished.run_state, "error");
    assert!(finished.progress.contains("before the model turn was sent"));
    assert_eq!(*calls.lock().unwrap(), ["start-thread"]);
    assert!(prompts.lock().unwrap().is_empty());
}

#[test]
fn explicit_memory_updates_wait_for_approval_and_reappear_as_cross_session_context() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let memory_results = Arc::new(Mutex::new(Vec::new()));
    let memory = SyntheticMemoryService::new();
    let memory_call = RuntimeDynamicToolCall {
        thread_id: "runtime-thread-1".into(),
        turn_id: "runtime-turn-1".into(),
        call_id: "memory-call-1".into(),
        tool: "dashboard_memory_update".into(),
        arguments: serde_json::json!({
            "operation": "proposeLongTermUpdate",
            "basis": "explicitUserInstruction",
            "authorizationQuote": "Please remember that I prefer early planning.",
            "change": "Prefers early planning.",
            "replaces": null
        }),
    };
    let application = new_application_with_synthetic_memory(
        &directory,
        Arc::clone(&prompts),
        memory.clone(),
        Some(memory_call),
        Arc::clone(&memory_results),
    );
    let first_session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message(
            "synthetic-vault",
            &first_session.id,
            "2026-09-27",
            "Please remember that I prefer early planning.",
        )
        .unwrap();
    wait_until_finished(&application, &first_session.id);

    let proposed = application
        .session("synthetic-vault", &first_session.id)
        .unwrap();
    assert_eq!(
        memory_results.lock().unwrap().len(),
        1,
        "the synthetic App Server should dispatch its memory tool callback"
    );
    assert!(
        memory_results.lock().unwrap()[0].success,
        "memory tool failed: {:?}",
        memory_results.lock().unwrap()[0].text
    );
    let proposal = proposed
        .memory_proposals
        .first()
        .expect("tool call should create a proposal");
    assert_eq!(proposal.status, "awaitingApproval");
    assert_eq!(
        memory.content(),
        "# Synthetic profile\n",
        "a tool call alone must not write long-term background"
    );
    let first_request = prompts.lock().unwrap()[0].clone();
    assert!(first_request
        .memory
        .long_term
        .content
        .contains("Synthetic profile"));
    assert!(first_request
        .memory
        .routine_reference
        .content
        .contains("Synthetic daily routine"));
    assert!(first_request.context.daily_record.items[0].contains("synthetic walk"));
    assert!(first_request.context.tasks.items[0].contains("synthetic appointment"));
    assert!(first_request.context.habits.items[0].contains("synthetic stretch"));

    let applied = application
        .approve_memory_proposal_for_selected_vault(&first_session.id, &proposal.id)
        .unwrap();
    assert_eq!(applied.memory_proposals[0].status, "applied");
    assert!(memory.content().contains("Prefers early planning."));

    let second_session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message(
            "synthetic-vault",
            &second_session.id,
            "2026-09-27",
            "Continue with current planning context.",
        )
        .unwrap();
    wait_until_finished(&application, &second_session.id);

    let requests = prompts.lock().unwrap();
    assert_eq!(requests.len(), 2);
    assert!(requests[1]
        .memory
        .long_term
        .content
        .contains("Prefers early planning."));
    assert!(requests[1]
        .memory
        .recent
        .iter()
        .any(|entry| entry.session_id == first_session.id));
    assert!(requests[1].context.daily_record.items[0].contains("synthetic walk"));
    drop(requests);
    let original = application
        .session("synthetic-vault", &first_session.id)
        .unwrap();
    assert_eq!(
        original.messages.len(),
        2,
        "source conversation messages remain available after memory updates"
    );
    assert_eq!(
        original.messages[0].text,
        "Please remember that I prefer early planning."
    );
}

#[test]
fn memory_approval_conflict_preserves_an_external_source_edit() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let memory_results = Arc::new(Mutex::new(Vec::new()));
    let memory = SyntheticMemoryService::new();
    let memory_call = RuntimeDynamicToolCall {
        thread_id: "runtime-thread-1".into(),
        turn_id: "runtime-turn-1".into(),
        call_id: "memory-conflict-call-1".into(),
        tool: "dashboard_memory_update".into(),
        arguments: serde_json::json!({
            "operation": "proposeLongTermUpdate",
            "basis": "explicitUserInstruction",
            "authorizationQuote": "Please remember that I prefer early planning.",
            "change": "Prefers early planning.",
            "replaces": null
        }),
    };
    let application = new_application_with_synthetic_memory(
        &directory,
        prompts,
        memory.clone(),
        Some(memory_call),
        Arc::clone(&memory_results),
    );
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message(
            "synthetic-vault",
            &session.id,
            "2026-09-27",
            "Please remember that I prefer early planning.",
        )
        .unwrap();
    wait_until_finished(&application, &session.id);
    let proposal_id = application
        .session("synthetic-vault", &session.id)
        .unwrap()
        .memory_proposals[0]
        .id
        .clone();
    assert!(memory_results.lock().unwrap()[0].success);

    memory.set_external_content("# External synthetic correction\n");
    let reviewed = application
        .approve_memory_proposal_for_selected_vault(&session.id, &proposal_id)
        .unwrap();

    assert_eq!(reviewed.memory_proposals[0].status, "conflict");
    assert!(reviewed.memory_proposals[0]
        .result_message
        .as_deref()
        .unwrap_or_default()
        .contains("No content was overwritten"));
    assert_eq!(memory.content(), "# External synthetic correction\n");
}

#[test]
fn memory_editors_reject_stale_vault_bindings_and_revisions() {
    let directory = IsolatedDirectory::new();
    let memory = SyntheticMemoryService::new();
    let application = new_application_with_synthetic_memory(
        &directory,
        Arc::new(Mutex::new(Vec::new())),
        memory.clone(),
        None,
        Arc::new(Mutex::new(Vec::new())),
    );

    let stale_vault = application
        .save_long_term_memory_for_selected_vault(
            "previous-vault",
            "synthetic-memory-v1",
            "# Must not reach another Vault\n",
        )
        .unwrap_err();
    assert!(stale_vault.contains("selected Vault changed"));
    assert_eq!(memory.content(), "# Synthetic profile\n");

    application
        .save_long_term_memory_for_selected_vault(
            "synthetic-vault",
            "synthetic-memory-v1",
            "# Approved synthetic background\n",
        )
        .unwrap();
    let stale_revision = application
        .save_long_term_memory_for_selected_vault(
            "synthetic-vault",
            "synthetic-memory-v1",
            "# Must not overwrite the newer revision\n",
        )
        .unwrap_err();
    assert!(stale_revision.contains("changed outside"));
    assert_eq!(memory.content(), "# Approved synthetic background\n");

    let stale_note_vault = application
        .save_continuity_note_for_selected_vault("previous-vault", 0, "Wrong Vault note")
        .unwrap_err();
    assert!(stale_note_vault.contains("selected Vault changed"));

    let saved_note = application
        .save_continuity_note_for_selected_vault("synthetic-vault", 0, "Synthetic correction")
        .unwrap();
    assert_eq!(saved_note.correction_note, "Synthetic correction");
    assert_eq!(saved_note.correction_revision, 1);

    let stale_note_revision = application
        .save_continuity_note_for_selected_vault("synthetic-vault", 0, "Stale correction")
        .unwrap_err();
    assert!(stale_note_revision.contains("changed in another Dashboard view"));
}

struct SelectedVault(PathBuf);

impl TodayWorkspacePersistence for SelectedVault {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(self.0.clone()))
    }

    fn save_selected_vault(&self, _vault: &Path) -> Result<(), String> {
        Ok(())
    }
}

struct ContextClock;

impl TodayClock for ContextClock {
    fn current_date(&self) -> String {
        "2026-09-08".into()
    }

    fn current_time_label(&self) -> String {
        "14:10".into()
    }

    fn current_timestamp_label(&self) -> String {
        "2026-09-08T14:10-04:00".into()
    }
}

#[test]
fn dashboard_context_reader_uses_canonical_read_services_without_mutating_source_files() {
    let directory = IsolatedDirectory::new();
    let vault = directory.path().join("synthetic-vault");
    fs::create_dir_all(vault.join(".obsidian")).unwrap();
    let daily_record = vault.join("life/Journal/Daily/2026/2026-09/2026-09-08.md");
    fs::create_dir_all(daily_record.parent().unwrap()).unwrap();
    fs::write(
        &daily_record,
        "---\ntype: daily-record\ndate: 2026-09-08\n---\n# 2026-09-08\n\n## 早间基准\n\n### 初始安排\n\nCanonical synthetic baseline.\n\n## 今天的大致安排\n\n- **上午：** Canonical synthetic plan.\n\n## 白天更新\n\n## 晚间复盘\n",
    )
    .unwrap();
    let habit_snapshot = vault.join(".personal-dashboard/derived/habits-v1.json");
    fs::create_dir_all(habit_snapshot.parent().unwrap()).unwrap();
    fs::write(
        &habit_snapshot,
        include_str!("fixtures/habits-v1-complete.json"),
    )
    .unwrap();
    let daily_record_before = fs::read(&daily_record).unwrap();
    let habit_snapshot_before = fs::read(&habit_snapshot).unwrap();

    let task_application =
        TaskApplication::new(SelectedVault(vault.clone()), ContextClock, FileTaskStore);
    let opened_tasks = task_application.read().unwrap();
    let task_context = task_application
        .create(TaskCreateInput {
            target_binding: opened_tasks.target_binding.unwrap(),
            expected_revision: opened_tasks.revision,
            task_id: "collaboration-context-task".into(),
            name: "Canonical synthetic task".into(),
            content: Some("Synthetic task detail".into()),
            date: Some("2026-09-08".into()),
            time: Some("15:00".into()),
            list_id: None,
        })
        .unwrap();
    assert_eq!(task_context.tasks.len(), 1);

    let workspace_file = directory.path().join("today-workspace.json");
    fs::write(
        &workspace_file,
        serde_json::to_vec(&serde_json::json!({
            "schemaVersion": 1,
            "selectedVault": vault
        }))
        .unwrap(),
    )
    .unwrap();
    let reader = DashboardContextReader::new(workspace_file);
    let vault_key = reader.current_vault_key().unwrap().unwrap();
    let context = reader.read_context(Some(&vault_key), "2026-09-08").unwrap();

    assert_eq!(context.daily_record.state, "ready");
    assert!(context
        .daily_record
        .items
        .iter()
        .any(|item| item.contains("Canonical synthetic plan")));
    assert_eq!(context.tasks.state, "ready");
    assert!(context
        .tasks
        .items
        .iter()
        .any(|item| item.contains("Canonical synthetic task")));
    assert_eq!(context.habits.state, "stale");
    assert!(context.habits.items.is_empty());
    assert!(context.habits.message.contains("过期"));
    assert_eq!(fs::read(&daily_record).unwrap(), daily_record_before);
    assert_eq!(fs::read(&habit_snapshot).unwrap(), habit_snapshot_before);
}
