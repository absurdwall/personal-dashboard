use personal_dashboard_lib::collaboration::{
    AppServerTransport, CollaborationApplication, CollaborationClock, CollaborationContextSource,
    CollaborationContextView, CollaborationState, CollaborationStore, ContextPaneView,
    DashboardContextReader, ExternalToolActionView, FileCollaborationStore, ModelOptionView,
    RuntimeConnectionView, RuntimeDynamicToolCall, RuntimeDynamicToolHandler,
    RuntimeDynamicToolResult, RuntimeRunReconciliation, RuntimeTurnRequest, RuntimeTurnResult,
    StoredCollaborationMessage, StoredCollaborationSession,
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
            source_path: "life/Self.md".into(),
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
                source_path: ".agents/skills/life-daily-loop/SKILL.md".into(),
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
                items: vec!["Current arrangement · synthetic walk".into()],
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

struct OtherVaultContext;

impl CollaborationContextSource for OtherVaultContext {
    fn current_vault_key(&self) -> Result<Option<String>, String> {
        Ok(Some("other-synthetic-vault".into()))
    }

    fn read_context(
        &self,
        _expected_vault_key: Option<&str>,
        _date: &str,
    ) -> Result<CollaborationContextView, String> {
        Err("This identity-binding test does not read context.".into())
    }
}

#[derive(Clone)]
struct FakeAppServer {
    prompts: Arc<Mutex<Vec<RuntimeTurnRequest>>>,
    calls: Arc<Mutex<Vec<&'static str>>>,
    read_only_text_turns_available: bool,
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
            selected_model: Some("synthetic-model".into()),
            selected_reasoning_effort: None,
            error: None,
        })
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
        ["Current arrangement · synthetic walk"]
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
fn retrying_a_saved_creation_identity_after_a_lost_response_recovers_the_same_session_and_draft() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let identity = "collaboration-session-request-123";
    let draft = "Synthetic draft saved with the session before the response was lost.";
    let application = new_application(&directory, Arc::clone(&prompts));

    // The service call persisted successfully, but the caller discards its
    // response to model an IPC result that was saved and then lost.
    application
        .create_session_with_identity(Some("2026-09-27"), identity, draft)
        .unwrap();
    drop(application);

    let reopened = new_application(&directory, prompts);
    let recovered = reopened
        .create_session_with_identity(Some("2026-09-27"), identity, draft)
        .unwrap();
    assert_eq!(recovered.id, identity);
    assert_eq!(recovered.created_date, "2026-09-27");
    assert_eq!(recovered.target_date, "2026-09-27");
    assert_eq!(recovered.draft, draft);
    assert_eq!(recovered.drafts_by_date.get("2026-09-27").map(String::as_str), Some(draft));
    assert!(recovered.messages.is_empty(), "recovering a draft never submits it");
    assert_eq!(reopened.list_sessions("2026-09-27").unwrap().len(), 1);
}

#[test]
fn creation_identity_cannot_be_reused_for_a_different_date_binding() {
    let directory = IsolatedDirectory::new();
    let application = new_application(&directory, Arc::new(Mutex::new(Vec::new())));
    let original = application
        .create_session_with_identity(Some("2026-09-27"), "collaboration-request-binding", "Original draft")
        .unwrap();

    let mismatch = application
        .create_session_with_identity(Some("2026-09-26"), "collaboration-request-binding", "Other draft")
        .unwrap_err();
    assert!(mismatch.contains("another Vault or date"));
    let sessions = application.list_sessions("2026-09-27").unwrap();
    assert_eq!(sessions.len(), 1);
    assert_eq!(sessions[0].id, original.id);
    assert_eq!(sessions[0].draft, "Original draft");
    assert!(application.list_sessions("2026-09-26").unwrap().is_empty());
}

#[test]
fn creation_identity_cannot_be_reused_after_the_selected_vault_changes() {
    let directory = IsolatedDirectory::new();
    let application = new_application(&directory, Arc::new(Mutex::new(Vec::new())));
    let original = application
        .create_session_with_identity(Some("2026-09-27"), "collaboration-request-vault", "Original draft")
        .unwrap();

    let switched_vault = CollaborationApplication::with_adapters(
        Arc::new(FileCollaborationStore::new(
            directory
                .path()
                .join("collaboration")
                .join("collaboration.json"),
        )),
        Box::new(FakeAppServer {
            prompts: Arc::new(Mutex::new(Vec::new())),
            calls: Arc::new(Mutex::new(Vec::new())),
            read_only_text_turns_available: true,
            switch_vault_on_inspect: None,
            turn_gate: None,
            reconciliations: Arc::new(Mutex::new(HashMap::new())),
            memory_call: None,
            memory_tool_results: Arc::new(Mutex::new(Vec::new())),
        }),
        Arc::new(OtherVaultContext),
        Arc::new(FixedClock),
        directory.path().to_path_buf(),
        "Only use supplied read-only Dashboard context.".into(),
    );
    let mismatch = switched_vault
        .create_session_with_identity(Some("2026-09-27"), "collaboration-request-vault", "Other draft")
        .unwrap_err();

    assert!(mismatch.contains("another Vault or date"));
    assert_eq!(application.list_sessions("2026-09-27").unwrap().len(), 1);
    assert_eq!(application.session("synthetic-vault", &original.id).unwrap().draft, "Original draft");
    assert!(switched_vault.list_sessions("2026-09-27").unwrap().is_empty());
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

// Completion is draft editing; /retro follows the same persisted conversation
// path as a typed request and remains editable until the user submits it.
#[test]
fn retro_draft_survives_restart_without_running_until_explicit_submission() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let application = new_application(&directory, Arc::clone(&prompts));
    let session = application.create_session("2026-09-27").unwrap();
    application
        .save_draft_for_selected_vault(&session.id, "2026-09-20", "/retro ")
        .unwrap();
    drop(application);

    let reopened = new_application(&directory, Arc::clone(&prompts));
    let draft = reopened.session("synthetic-vault", &session.id).unwrap();
    assert_eq!(draft.drafts_by_date.get("2026-09-20").map(String::as_str), Some("/retro "));
    assert!(draft.messages.is_empty());
    assert!(prompts.lock().unwrap().is_empty());
    let edited = "/retro 请复盘 2026-09-20 的安排";
    reopened.save_draft_for_selected_vault(&session.id, "2026-09-20", edited).unwrap();
    reopened.submit_message("synthetic-vault", &session.id, "2026-09-20", edited).unwrap();
    wait_until_finished(&reopened, &session.id);
    drop(reopened);

    let restarted = new_application(&directory, Arc::clone(&prompts));
    let saved = restarted.session("synthetic-vault", &session.id).unwrap();
    assert_eq!(saved.messages.len(), 2);
    assert_eq!(saved.messages[0].text, edited);
    assert_eq!(saved.messages[0].target_date, "2026-09-20");
    assert_eq!(saved.drafts_by_date.get("2026-09-20").map(String::as_str).unwrap_or(""), "");
    let sent = prompts.lock().unwrap();
    assert_eq!(sent.len(), 1);
    assert_eq!(sent[0].user_text, edited);
    assert_eq!(sent[0].context.date, "2026-09-20");
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
fn stopping_pauses_older_requests_and_fresh_correction_runs_first() {
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
    let pending = application.session("synthetic-vault", &queued_session.id).unwrap();
    assert_eq!(pending.messages[0].delivery_state, "paused", "stop must retain older pending work without executing it");
    assert_eq!(gate.started_len(), 1);
    application.submit_message("synthetic-vault", &active_session.id, "2026-09-20", "Correction after stop").unwrap();
    let corrected = wait_for_run_state(&application, &active_session.id, "completed");
    assert_eq!(corrected.messages.last().unwrap().target_date, "2026-09-20");
    assert_eq!(application.session("synthetic-vault", &queued_session.id).unwrap().messages[0].delivery_state, "paused");
    assert_eq!(prompts.lock().unwrap().last().unwrap().user_text, "Correction after stop");
    assert_eq!(stopped.messages[0].delivery_state, "stopped");
    assert_eq!(gate.confirmed_stops(), [active.run_id.unwrap()]);
    let events = gate.events();
    assert_eq!(events.len(), 3);
    assert!(events[0].starts_with("started:"));
    assert!(events[1].starts_with("stopped:"));
    assert!(events[2].starts_with("started:"));
}

#[test]
fn paused_requests_reopen_and_can_be_explicitly_removed_or_resumed_at_the_original_date() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let gate = Arc::new(FakeTurnGate::default());
    gate.configure_cancellation(false, true);
    let application = new_application_with_controls(&directory, prompts.clone(), Arc::new(Mutex::new(Vec::new())),
        Some(gate.clone()), Arc::new(Mutex::new(HashMap::new())));
    let session = application.create_session("2026-09-27").unwrap();
    let first = application.submit_message("synthetic-vault", &session.id, "2026-09-27", "Stopped work").unwrap();
    gate.wait_for_started(1);
    application.submit_message("synthetic-vault", &session.id, "2026-09-19", "Remove this pending request").unwrap();
    application.submit_message("synthetic-vault", &session.id, "2026-09-20", "Resume at the original date").unwrap();
    application.stop_run_for_selected_vault(&session.id, first.run_id.as_deref().unwrap()).unwrap();
    gate.wait_for_confirmed_stop(); gate.release_all();
    wait_for_run_state(&application, &session.id, "stopped");
    let reopened = new_application(&directory, prompts.clone());
    let paused = reopened.session("synthetic-vault", &session.id).unwrap();
    assert_eq!(paused.messages[1].delivery_state, "paused");
    assert_eq!(paused.messages[2].delivery_state, "paused");
    let removed = reopened.remove_pending_request_for_selected_vault(&session.id, paused.messages[1].execution_id.as_deref().unwrap()).unwrap();
    assert_eq!(removed.messages[1].delivery_state, "removed");
    reopened.requeue_not_started_for_selected_vault(&session.id, paused.messages[2].execution_id.as_deref().unwrap()).unwrap();
    let finished = wait_for_run_state(&reopened, &session.id, "completed");
    assert_eq!(finished.messages[1].delivery_state, "removed");
    let sent = prompts.lock().unwrap();
    assert_eq!(sent.len(), 2);
    assert_eq!(sent[1].context.date, "2026-09-20");
    assert_eq!(sent[1].user_text, "Resume at the original date");
    assert!(reopened.remove_pending_request_for_selected_vault(&session.id, first.run_id.as_deref().unwrap()).is_err());
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
fn saved_result_check_does_not_wait_for_a_busy_runtime() {
    let directory = IsolatedDirectory::new();
    let gate = Arc::new(FakeTurnGate::default());
    gate.configure_cancellation(true, false);
    let application = new_application_with_controls(&directory, Arc::new(Mutex::new(Vec::new())),
        Arc::new(Mutex::new(Vec::new())), Some(Arc::clone(&gate)), Arc::new(Mutex::new(HashMap::new())));
    let session = application.create_session("2026-09-27").unwrap();
    let queued = application.submit_message("synthetic-vault", &session.id, "2026-09-27", "Synthetic action").unwrap();
    gate.wait_for_started(1);
    // Simulate the saved stop-unconfirmed state while the transport still owns
    // its mutex. The same condition occurs with a slow source/recovery call.
    let store = FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json"));
    let mut state = store.load().unwrap();
    let stored = state.sessions.iter_mut().find(|s|s.id==session.id).unwrap();
    stored.messages[0].delivery_state="stop-unconfirmed".into();
    stored.run_state="stop-unconfirmed".into();
    store.save(&state).unwrap();
    let (tx, rx) = std::sync::mpsc::channel();
    let checker=application.clone();
    let worker=thread::spawn(move || tx.send(checker.reconcile_run_for_selected_vault(&session.id, queued.run_id.as_deref().unwrap())).unwrap());
    let result=rx.recv_timeout(Duration::from_millis(250));
    gate.release_all();
    worker.join().unwrap();
    assert!(result.is_ok(), "saved-result checking must return promptly instead of blocking behind the runtime mutex");
    assert!(result.unwrap().unwrap_err().contains("busy"));
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
        title_generation: None,
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
        runtime_tool_schema_fingerprint: None,
        usage_bindings: Vec::new(),
        work_history: Vec::new(),
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
        last_habit_refresh: None,
        habit_refresh_receipts: Vec::new(),
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
            work_history: None,
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
                verification: None,
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
fn interruption_before_thread_id_is_saved_can_be_reviewed_without_replay() {
    let directory = IsolatedDirectory::new();
    let store = FileCollaborationStore::new(
        directory
            .path()
            .join("collaboration")
            .join("collaboration.json"),
    );
    let mut state = CollaborationState::default();
    state.sessions.push(StoredCollaborationSession {
        title_generation: None,
        id: "session-no-thread".into(),
        vault_key: Some("synthetic-vault".into()),
        title: "Interrupted before thread start completed".into(),
        created_date: "2026-09-27".into(),
        activity_dates: vec!["2026-09-27".into()],
        last_activity_at: "2026-09-27T09:10:00-04:00".into(),
        target_date: "2026-09-27".into(),
        run_id: Some("execution-no-thread".into()),
        run_state: "interrupted".into(),
        progress: "The app closed before this request was confirmed.".into(),
        runtime_thread_id: None,
        runtime_tool_schema_fingerprint: None,
        usage_bindings: Vec::new(),
        work_history: Vec::new(),
        task_tool_registered: false,
        daily_plan_tool_registered: false,
        daily_record_tool_registered: false,
        memory_tool_registered: false,
        messages: vec![StoredCollaborationMessage {
            id: "message-no-thread".into(),
            role: "user".into(),
            text: "Do not replay this interrupted synthetic request".into(),
            message_date: "2026-09-27".into(),
            target_date: "2026-09-27".into(),
            created_at: "2026-09-27T09:10:00-04:00".into(),
            execution_id: Some("execution-no-thread".into()),
            runtime_turn_id: None,
            delivery_state: "interrupted".into(),
            queue_order: Some(1),
            result_checked: false,
            automatic_plan: false,
            external_app_ids: Vec::new(),
            external_actions: Vec::new(),
            pending_external_approval: None,
        }],
        task_operations: Vec::new(),
        memory_proposals: Vec::new(),
        last_habit_refresh: None,
        habit_refresh_receipts: Vec::new(),
        draft: String::new(),
        drafts_by_date: HashMap::new(),
    });
    store.save(&state).unwrap();

    let prompts = Arc::new(Mutex::new(Vec::new()));
    let application = new_application_with_controls(
        &directory,
        Arc::clone(&prompts),
        Arc::new(Mutex::new(Vec::new())),
        None,
        Arc::new(Mutex::new(HashMap::new())),
    );

    state.sessions[0].run_state = "stop-unconfirmed".into();
    state.sessions[0].messages[0].delivery_state = "stop-unconfirmed".into();
    store.save(&state).unwrap();
    let still_running = application
        .reconcile_run_for_selected_vault("session-no-thread", "execution-no-thread")
        .unwrap_err();
    assert!(still_running.contains("may still be active"));
    assert!(
        application
            .workspace("2026-09-27")
            .unwrap()
            .recovery_required
    );

    state.sessions[0].run_state = "interrupted".into();
    state.sessions[0].messages[0].delivery_state = "interrupted".into();
    store.save(&state).unwrap();
    assert!(
        application
            .workspace("2026-09-27")
            .unwrap()
            .recovery_required
    );

    let reviewed = application
        .reconcile_run_for_selected_vault("session-no-thread", "execution-no-thread")
        .unwrap();
    assert_eq!(reviewed.run_state, "interrupted");
    assert_eq!(reviewed.messages[0].delivery_state, "interrupted");
    assert!(reviewed.messages[0].result_checked);
    assert!(reviewed.progress.contains("No model turn was sent"));
    assert!(
        !application
            .workspace("2026-09-27")
            .unwrap()
            .recovery_required
    );
    assert!(
        prompts.lock().unwrap().is_empty(),
        "review must not replay the request"
    );

    application
        .submit_message(
            "synthetic-vault",
            "session-no-thread",
            "2026-09-27",
            "A new explicit request after recovery",
        )
        .unwrap();
    let completed = wait_for_run_state(&application, "session-no-thread", "completed");
    assert!(completed.messages.iter().any(|message| {
        message.text == "Do not replay this interrupted synthetic request"
            && message.delivery_state == "interrupted"
            && message.result_checked
    }));
    let sent = prompts.lock().unwrap();
    assert_eq!(sent.len(), 1);
    assert_eq!(sent[0].user_text, "A new explicit request after recovery");
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
fn explicit_memory_updates_apply_without_a_second_approval_and_reappear_as_cross_session_context() {
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
            "executionMode": "execute",
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
    assert_eq!(proposal.status, "applied");
    assert!(
        memory.content().contains("Prefers early planning."),
        "the explicit durable instruction is saved during the current turn"
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
fn direct_memory_update_waits_when_the_user_asks_to_review_before_saving() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let memory_results = Arc::new(Mutex::new(Vec::new()));
    let memory = SyntheticMemoryService::new();
    let memory_call = RuntimeDynamicToolCall {
        thread_id: "runtime-thread-1".into(),
        turn_id: "runtime-turn-1".into(),
        call_id: "memory-call-review-first".into(),
        tool: "dashboard_memory_update".into(),
        arguments: serde_json::json!({
            "operation": "proposeLongTermUpdate",
            "basis": "explicitUserInstruction",
            "executionMode": "prepareProposal",
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
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message(
            "synthetic-vault",
            &session.id,
            "2026-09-27",
            "Please remember that I prefer early planning, but show me the exact proposed change for review before saving.",
        )
        .unwrap();
    wait_until_finished(&application, &session.id);

    let finished = application.session("synthetic-vault", &session.id).unwrap();
    assert_eq!(finished.memory_proposals.len(), 1);
    assert_eq!(finished.memory_proposals[0].status, "awaitingApproval");
    assert_eq!(memory.content(), "# Synthetic profile\n");
    assert_eq!(memory_results.lock().unwrap().len(), 1);
    assert!(memory_results.lock().unwrap()[0].success);
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
            "executionMode": "prepareProposal",
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
        "---\ntype: daily-record\ndate: 2026-09-08\n---\n# 2026-09-08\n\n## 早间基准\n\n### 初始安排\n\n- **08:00–10:00：** Canonical synthetic baseline.\n\n## 今天的大致安排\n\n- **18:00–20:30：** Canonical synthetic plan.\n\n## 白天更新\n\n## 晚间复盘\n\n### 用户补充\n\n- Synthetic current evening addition.\n",
    )
    .unwrap();
    let habit_snapshot = vault.join("life/.personal-dashboard/derived/habits-v1.json");
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
            execution_end: None,
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
    assert_eq!(reader.selected_vault_path(&vault_key).unwrap(), Some(vault.canonicalize().unwrap()));
    assert!(reader.selected_vault_path("unselected-vault").unwrap_err().contains("selected Vault changed"));
    let context = reader.read_context(Some(&vault_key), "2026-09-08").unwrap();

    assert_eq!(context.daily_record.state, "ready");
    assert!(context.daily_record.items.iter().any(|item| {
        item.starts_with("Current arrangement · 18:00–20:30 ·")
            && item.contains("Canonical synthetic plan")
    }));
    assert!(context.daily_record.items.iter().all(|item| {
        !item.contains("Canonical synthetic baseline") && !item.starts_with("Morning ·")
    }), "the current context shows one current arrangement, not a second baseline plan: {:?}", context.daily_record.items);
    assert!(context
        .daily_record
        .items
        .iter()
        .any(|item| item.contains("Canonical synthetic plan")));
    assert!(context
        .daily_record
        .items
        .iter()
        .any(|item| item.contains("Synthetic current evening addition")));
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

#[test]
fn queued_submit_clears_only_its_exact_snapshot_and_preserves_newer_saved_dictation() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let application = new_application(&directory, Arc::clone(&prompts));
    let session = application.create_session("2026-09-27").unwrap();
    let submitted = "  original composer snapshot  ";
    let newest = "  original composer snapshot  \nnewer dictation";
    application.save_draft_for_selected_vault(&session.id, "2026-09-27", newest).unwrap();
    let queued = application.submit_message("synthetic-vault", &session.id, "2026-09-27", submitted).unwrap();
    assert_eq!(queued.draft, newest);
    assert_eq!(queued.drafts_by_date.get("2026-09-27").map(String::as_str), Some(newest));
    assert_eq!(queued.messages[0].text, submitted.trim());
    wait_until_finished(&application, &session.id);
    let reopened = new_application(&directory, prompts);
    assert_eq!(reopened.session("synthetic-vault", &session.id).unwrap().draft, newest);
    let second = reopened.create_session("2026-09-27").unwrap();
    reopened.save_draft_for_selected_vault(&second.id, "2026-09-27", submitted).unwrap();
    let sent = reopened.submit_message("synthetic-vault", &second.id, "2026-09-27", submitted).unwrap();
    assert!(sent.draft.is_empty());assert!(!sent.drafts_by_date.contains_key("2026-09-27"));
    wait_until_finished(&reopened, &second.id);
}

#[derive(Default)]
struct DidaSourceFixture {
    objects: HashMap<String, String>,
    writes: usize,
    reads: usize,
    readable: bool,
    last_action: Option<ExternalToolActionView>,
    last_execution: Option<String>,
    scopes: Vec<bool>,
}

struct DidaWorkflowTransport {
    base: FakeAppServer,
    source: Arc<Mutex<DidaSourceFixture>>,
    writes_allowed: bool,
}

impl AppServerTransport for DidaWorkflowTransport {
    fn inspect(&mut self) -> Result<RuntimeConnectionView, String> { self.base.inspect() }
    fn start_chatgpt_login(&mut self) -> Result<(), String> { self.base.start_chatgpt_login() }
    fn start_thread(&mut self, model: Option<&str>, instructions: &str) -> Result<String, String> { self.base.start_thread(model,instructions) }
    fn resume_thread(&mut self, thread: &str) -> Result<(), String> { self.base.resume_thread(thread) }
    fn configure_external_writes(&mut self, allowed: bool) {
        self.writes_allowed = allowed;
        self.source.lock().unwrap().scopes.push(allowed);
    }
    fn reconcile_external_action(&mut self, mut action: ExternalToolActionView) -> ExternalToolActionView {
        let mut source = self.source.lock().unwrap();
        source.reads += 1;
        if source.readable && source.objects.get("external-owned-id").is_some_and(|title| title == "Owned Task") {
            action.status = "saved".into();
            action.result_summary = "Current source confirms the same external-owned-id; no creation replayed.".into();
        } else {
            action.status = "unknown".into();
            action.result_summary = "Current source unavailable or later changed; creation must not be repeated.".into();
        }
        if let Some(verification) = action.verification.as_mut() {
            verification["sourceObserved"] = serde_json::json!(source.readable);
        }
        action
    }
    fn send_turn(&mut self, request: RuntimeTurnRequest) -> Result<RuntimeTurnResult, String> {
        self.base.prompts.lock().unwrap().push(request.clone());
        assert!(!request.prior_external_actions.iter().any(|a| a.status == "unknown" && a.verification.as_ref().and_then(|v|v.get("sourceObserved")).and_then(serde_json::Value::as_bool) != Some(true)) || !self.writes_allowed);
        Ok(RuntimeTurnResult {text:"Current local work remains available; external outcomes reported separately.".into(),runtime_turn_id:Some("read-turn".into()),stopped:false,external_actions:Vec::new()})
    }
    fn send_turn_with_external_actions(
        &mut self,
        request: RuntimeTurnRequest,
        _cancel: Arc<AtomicBool>,
        _tools: Option<RuntimeDynamicToolHandler>,
        actions: Option<personal_dashboard_lib::collaboration::RuntimeExternalActionHandler>,
        _approvals: Option<personal_dashboard_lib::collaboration::RuntimeExternalApprovalHandler>,
    ) -> Result<RuntimeTurnResult, String> {
        if request.user_text != "create-owned" { return self.send_turn(request); }
        assert!(self.writes_allowed,"Explicit manual fixture request must receive write capability");
        let action = ExternalToolActionView {action_id:format!("{}:external-create-1",request.thread_id),source_id:"dida365".into(),source_name:"Dida".into(),tool_id:"create_task".into(),status:"unknown".into(),target_scope:request.context.date.clone(),input_summary:"external-owned-id".into(),result_summary:"Receipt lost; source readback required.".into(),verification:Some(serde_json::json!({"checks":[{"tool":"get_task_by_id","arguments":{"task_id":"external-owned-id"}}]}))};
        {
            let mut source = self.source.lock().unwrap();
            source.objects.insert("external-owned-id".into(),"Owned Task".into());
            source.writes += 1;
            source.last_action = Some(action.clone());
            source.last_execution = Some(request.execution_id.clone());
        }
        if let Some(handler) = actions { handler(action); }
        Err("Synthetic transport lost the native mutation receipt after external source save".into())
    }
    fn reconcile_turn(&mut self, _thread: &str, execution: &str) -> Result<RuntimeRunReconciliation, String> {
        let action = {
            let source = self.source.lock().unwrap();
            assert_eq!(source.last_execution.as_deref(),Some(execution));
            source.last_action.clone().unwrap()
        };
        let checked = self.reconcile_external_action(action);
        Ok(RuntimeRunReconciliation::Interrupted {work_history:None,runtime_turn_id:"external-turn".into(),external_actions:vec![checked]})
    }
}

fn dida_workflow_application(directory: &IsolatedDirectory, source: Arc<Mutex<DidaSourceFixture>>) -> CollaborationApplication {
    CollaborationApplication::with_adapters(
        Arc::new(FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json"))),
        Box::new(DidaWorkflowTransport {
            base: FakeAppServer {prompts:Arc::new(Mutex::new(Vec::new())),calls:Arc::new(Mutex::new(Vec::new())),read_only_text_turns_available:true,switch_vault_on_inspect:None,turn_gate:None,reconciliations:Arc::new(Mutex::new(HashMap::new())),memory_call:None,memory_tool_results:Arc::new(Mutex::new(Vec::new()))},
            source,
            writes_allowed:false,
        }),
        Arc::new(FixtureContext),Arc::new(FixedClock),directory.path().to_path_buf(),"Synthetic external workflow".into(),
    )
}

#[test]
fn external_receipt_loss_recovers_current_source_before_write_capability_without_duplicate_creation() {
    let directory = IsolatedDirectory::new();
    let source = Arc::new(Mutex::new(DidaSourceFixture::default()));
    let application = dida_workflow_application(&directory,Arc::clone(&source));
    let session = application.create_session("2026-09-27").unwrap();
    let submitted = application.submit_message("synthetic-vault",&session.id,"2026-09-27","create-owned").unwrap();
    let execution = submitted.messages.iter().find_map(|m| m.execution_id.clone()).unwrap();
    let lost = wait_for_session(&application,&session.id,|s| s.run_state == "stop-unconfirmed" || s.run_state == "interrupted");
    assert_eq!(source.lock().unwrap().writes,1);
    assert_eq!(lost.messages[0].external_actions[0].status,"unknown");
    drop(application);
    let reopened = dida_workflow_application(&directory,Arc::clone(&source));
    reopened.reconcile_run_for_selected_vault(&session.id,&execution).unwrap();
    reopened.submit_message("synthetic-vault",&session.id,"2026-09-27","continue-owned").unwrap();
    let unavailable = wait_for_session(&reopened,&session.id,|s| s.run_state == "completed");
    assert_eq!(unavailable.messages[0].external_actions[0].status,"unknown");
    assert_eq!(source.lock().unwrap().scopes.last(),Some(&false));
    assert_eq!(source.lock().unwrap().objects.len(),1);
    source.lock().unwrap().readable = true;
    reopened.submit_message("synthetic-vault",&session.id,"2026-09-27","continue-owned").unwrap();
    let confirmed = wait_for_session(&reopened,&session.id,|s| s.run_state == "completed" && s.messages.len() >= 5);
    assert_eq!(confirmed.messages[0].external_actions[0].status,"saved");
    let remote = source.lock().unwrap();
    assert_eq!(remote.scopes.last(),Some(&true),"Current source confirmation unlocks the still-authorized current manual round");
    assert_eq!(remote.writes,1,"Neither checking/reopening nor continuing replays creation");
    assert_eq!(remote.objects.len(),1);
    assert!(remote.reads >= 3);
    drop(remote);
    reopened.submit_message("synthetic-vault",&session.id,"2026-09-27","先给我看方案，再决定滴答修改").unwrap();
    wait_for_session(&reopened,&session.id,|s| s.run_state == "completed" && s.messages.len() >= 7);
    assert_eq!(source.lock().unwrap().writes,1,"The model fixture sends no mutation when the user asks for review; the host does not classify prose.");
}

#[test]
fn later_source_edit_does_not_replay_old_effect_or_block_unrelated_current_request() {
    let directory = IsolatedDirectory::new();
    let source = Arc::new(Mutex::new(DidaSourceFixture::default()));
    let application = dida_workflow_application(&directory,Arc::clone(&source));
    let session = application.create_session("2026-09-27").unwrap();
    let submitted = application.submit_message("synthetic-vault",&session.id,"2026-09-27","create-owned").unwrap();
    let _execution = submitted.messages.iter().find_map(|m|m.execution_id.clone()).unwrap();
    wait_for_session(&application,&session.id,|s|s.run_state == "stop-unconfirmed" || s.run_state == "interrupted");
    {
        let mut remote = source.lock().unwrap();
        remote.readable = true;
        remote.objects.insert("external-owned-id".into(),"Later user edit".into());
    }
    // An unresolved older execution must not block unrelated current work.
    assert!(application.workspace("2026-09-27").unwrap().recovery_required);
    application.submit_message("synthetic-vault",&session.id,"2026-09-27","continue an unrelated explicitly authorized current request").unwrap();
    let result = wait_for_session(&application,&session.id,|s|s.run_state == "completed");
    assert_eq!(result.messages[0].external_actions[0].status,"unknown","Later source state does not reconstruct the old effect");
    let remote = source.lock().unwrap();
    assert_eq!(remote.scopes.last(),Some(&true),"Successful current read resolves source uncertainty for this current request");
    assert_eq!(remote.objects["external-owned-id"],"Later user edit");
    assert_eq!(remote.writes,1,"Old create/effect is never replayed to match stale expectations");
}

fn wait_for_session(
    application: &CollaborationApplication,
    id: &str,
    condition: impl Fn(&personal_dashboard_lib::collaboration::CollaborationSessionView) -> bool,
) -> personal_dashboard_lib::collaboration::CollaborationSessionView {
    for _ in 0..300 {
        let session = application.session("synthetic-vault",id).unwrap();
        if condition(&session) { return session; }
        thread::sleep(Duration::from_millis(10));
    }
    panic!("Controlled external workflow failed to reach expected state");
}

struct FailStopSaveOnce {
    inner: FileCollaborationStore,
    failures: Arc<AtomicU64>,
}
impl CollaborationStore for FailStopSaveOnce {
    fn load(&self) -> Result<CollaborationState, String> {
        self.inner.load()
    }
    fn save(&self, state: &CollaborationState) -> Result<(), String> {
        if state.sessions.iter().any(|s| {
            s.messages
                .iter()
                .any(|m| matches!(m.delivery_state.as_str(), "stopping" | "stopped"))
        }) && self
            .failures
            .fetch_update(Ordering::SeqCst, Ordering::SeqCst, |remaining| {
                remaining.checked_sub(1)
            })
            .is_ok()
        {
            return Err("Synthetic stop history save failed".into());
        }
        self.inner.save(state)
    }
}

fn stop_save_failure_application(
    directory: &IsolatedDirectory,
    gate: &Arc<FakeTurnGate>,
    failures: &Arc<AtomicU64>,
) -> CollaborationApplication {
    CollaborationApplication::with_adapters(
        Arc::new(FailStopSaveOnce {
            inner: FileCollaborationStore::new(
                directory.path().join("collaboration/collaboration.json"),
            ),
            failures: failures.clone(),
        }),
        Box::new(FakeAppServer {
            prompts: Arc::new(Mutex::new(Vec::new())),
            calls: Arc::new(Mutex::new(Vec::new())),
            read_only_text_turns_available: true,
            switch_vault_on_inspect: None,
            turn_gate: Some(gate.clone()),
            reconciliations: Arc::new(Mutex::new(HashMap::new())),
            memory_call: None,
            memory_tool_results: Arc::new(Mutex::new(Vec::new())),
        }),
        Arc::new(FixtureContext),
        Arc::new(FixedClock),
        directory.path().to_path_buf(),
        "Synthetic context".into(),
    )
}

#[test]
fn failed_stop_history_save_still_cancels_the_running_turn() {
    for failure_count in [1, 2] {
        let directory = IsolatedDirectory::new();
        let gate = Arc::new(FakeTurnGate::default());
        gate.configure_cancellation(false, true);
        let failures = Arc::new(AtomicU64::new(0));
        let application = stop_save_failure_application(&directory, &gate, &failures);
        let session = application.create_session("2026-09-27").unwrap();
        application
            .submit_message(
                "synthetic-vault",
                &session.id,
                "2026-09-27",
                "Stop even if history cannot be saved",
            )
            .unwrap();
        let execution = gate.wait_for_started(1)[0].clone();
        application
            .submit_message(
                "synthetic-vault",
                &session.id,
                "2026-09-20",
                "Older queued request must stay paused",
            )
            .unwrap();
        failures.store(failure_count, Ordering::SeqCst);
        let result = application.stop_run_for_selected_vault(&session.id, &execution);
        if failure_count == 1 {
            result.unwrap();
        } else {
            assert!(result.unwrap_err().contains("Stop was requested"));
        }
        let deadline = std::time::Instant::now() + Duration::from_secs(1);
        while gate.confirmed_stops().is_empty() && std::time::Instant::now() < deadline {
            thread::sleep(Duration::from_millis(10));
        }
        let stopped = gate.confirmed_stops();
        gate.release_all();
        assert_eq!(
            stopped,
            vec![execution],
            "Stop must reach the runtime independently of a history save"
        );
        let saved = wait_for_run_state(&application, &session.id, "stopped");
        assert_eq!(saved.messages[1].delivery_state, "paused");
        assert_eq!(
            gate.started_len(),
            1,
            "Failed stop saves never release the older queue"
        );
    }
}

#[test]
fn old_result_check_uses_its_original_thread_and_preserves_newer_execution_and_prior_history() { recovery_case("same-diff"); }
#[test]
fn recovered_available_diff_is_additive_to_an_original_observed_witness_without_diff() { recovery_case("new-diff"); }
#[test]
fn recovered_optional_budget_counts_prior_retained_payload_and_qualifies_its_provenance() { recovery_case("budget"); }
#[test]
fn recovered_changed_diff_respects_capacity_of_immutable_prior_witness() { recovery_case("prior-diff-budget"); }
fn recovery_case(mode: &str) {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let calls = Arc::new(Mutex::new(Vec::new()));
    let reconciliations = Arc::new(Mutex::new(HashMap::new()));
    let application = new_application_with_controls(
        &directory,
        prompts.clone(),
        calls.clone(),
        None,
        reconciliations.clone(),
    );
    let session = application.create_session("2026-09-20").unwrap();
    application
        .submit_message(
            "synthetic-vault",
            &session.id,
            "2026-09-20",
            "Older request with missing final receipt",
        )
        .unwrap();
    let original = wait_for_run_state(&application, &session.id, "completed");
    let execution = original.messages[0].execution_id.clone().unwrap();
    let store =
        FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json"));
    let mut state = store.load().unwrap();
    let saved = &mut state.sessions[0];
    saved.run_state = "stop-unconfirmed".into();
    saved.messages[0].delivery_state = "stop-unconfirmed".into();
    saved.messages[0].result_checked = false;
    let mut old_history: personal_dashboard_lib::collaboration::CollaborationWorkHistory = serde_json::from_value(serde_json::json!({
        "evidenceVersion":1,"executionId":execution,"threadId":"runtime-thread-1","turnId":"old-turn","sequence":12,"status":"history-save-failed",
        "observedAtMs":10,"updatedAtMs":20,"runtimeStartedAtMs":null,"runtimeCompletedAtMs":null,"tokenUsage":null,
        "items":[{"itemId":"attempt-1","callId":"old-call","kind":"dynamicToolCall","phase":null,"text":"Original failed attempt","summary":[],"tool":"dashboard_tasks","status":"failed",
          "firstSequence":1,"lastSequence":12,"observedAtMs":10,"updatedAtMs":20,"runtimeStartedAtMs":null,"runtimeCompletedAtMs":null,"runtimeEmittedAtMs":null,"authoritative":true,"parameters":[],"diagnostic":"Original error retained"}]
    })).unwrap();
    let mut pending = old_history.items[0].clone();
    pending.item_id = "recovered-file".into(); pending.call_id = None; pending.kind = "fileChange".into();
    pending.status = "inProgress".into(); pending.authoritative = false; pending.diagnostic = None;
    pending.first_sequence = 2; pending.observed_at_ms = 30;
    pending.changes = vec![serde_json::from_str(r#"{"id":"original-witness","source":"nativeFileChange","objectId":null,"path":"life/ordinary.md","operation":"update","receiptId":null,"targetDate":null,"beforeRevision":null,"afterRevision":"original-observed-revision","diff":"-Original fact\n+Updated fact","verification":"sourceObserved","observedAtMs":40,"gaps":[]}"#).unwrap()];
    if mode == "new-diff" { pending.changes[0].diff = None; }
    if mode == "budget" { pending.text = "p".repeat(8192); }
    if mode == "prior-diff-budget" { pending.text.clear(); pending.changes[0].diff = Some("o".repeat(60*1024)); }
    old_history.items.push(pending);
    let mut missing=old_history.items[1].clone();missing.item_id="missing-completion".into();missing.changes.clear();missing.first_sequence=3;
    old_history.items.push(missing);
    saved.work_history = vec![old_history.clone()];
    store.save(&state).unwrap();
    application
        .submit_message(
            "synthetic-vault",
            &session.id,
            "2026-09-21",
            "New unrelated request",
        )
        .unwrap();
    let newer = wait_for_run_state(&application, &session.id, "completed");
    assert_ne!(newer.run_id, Some(execution.clone()));
    assert!(
        application
            .workspace("2026-09-21")
            .unwrap()
            .active_run
            .is_none(),
        "An older unconfirmed outcome is not the current execution owner"
    );
    assert_eq!(
        calls
            .lock()
            .unwrap()
            .iter()
            .filter(|call| **call == "start-thread")
            .count(),
        2,
        "An uncertain prior turn is never resumed for fresh work"
    );
    // The transport's newer thread pointer may differ after schema/source rotation.
    // Original execution binding must survive that update.
    let mut state = store.load().unwrap();
    state.sessions[0].runtime_thread_id = Some("newer-runtime-thread".into());
    store.save(&state).unwrap();
    reconciliations.lock().unwrap().insert(
        execution.clone(),
        RuntimeRunReconciliation::Completed {
            work_history: Some({ let mut history: personal_dashboard_lib::collaboration::CollaborationWorkHistory = serde_json::from_str(r#"{
                "evidenceVersion":1,"executionId":"untrusted-runtime-identity","threadId":"runtime-thread-1","turnId":"old-turn","sequence":1,"status":"completed",
                "observedAtMs":500,"updatedAtMs":600,"runtimeStartedAtMs":100,"runtimeCompletedAtMs":600,"tokenUsage":null,
                "items":[{"itemId":"recovered-file","callId":null,"kind":"fileChange","phase":null,"text":"","summary":[],"tool":null,"status":"completed",
                  "firstSequence":1,"lastSequence":1,"observedAtMs":500,"updatedAtMs":600,"runtimeStartedAtMs":null,"runtimeCompletedAtMs":600,"runtimeEmittedAtMs":null,"authoritative":true,"parameters":[],
                  "changes":[{"id":"recovered-file:native:0","source":"nativeFileChange","objectId":null,"path":"life/ordinary.md","operation":"update","receiptId":null,"targetDate":null,"beforeRevision":null,"afterRevision":null,"diff":"-Original fact\n+Updated fact","verification":"unobserved","observedAtMs":null,"gaps":["Before bytes/revision were not observed; item start may occur after the write."]}]}]
            }"#).unwrap();
            if mode == "budget" { history.items[0].text = "n".repeat(65537); history.items[0].summary = vec!["s".repeat(60*1024)]; }
            if mode == "prior-diff-budget" { history.items[0].changes[0].diff = Some("n".repeat(60*1024)); }
            history }),
            text: String::new(),
            runtime_turn_id: "old-turn".into(),
            external_actions: Vec::new(),
        },
    );
    let checked = application
        .reconcile_run_for_selected_vault(&session.id, &execution)
        .unwrap();
    assert!(checked.messages[0].result_checked);
    assert_eq!(
        checked.messages[0].delivery_state, "completed",
        "A completed turn without final text is still a confirmed terminal result"
    );
    assert_eq!(checked.run_id, newer.run_id);
    assert_eq!(checked.run_state, newer.run_state);
    assert_eq!(checked.progress, newer.progress);
    assert_eq!(
        checked.work_history[0].items[0], old_history.items[0],
        "Readback preserves errors, tools and observed times"
    );
    assert!(checked.work_history[0].sequence > old_history.sequence);
    assert_eq!(checked.work_history[0].execution_id, execution);
    assert_eq!(checked.work_history[0].items.len(), 3, "available snapshots and original unmatched skeletons are retained");
    assert_eq!(checked.work_history[0].items[2].status,"inProgress","missing authoritative item completion is never fabricated");
    assert!(checked.work_history[0].gaps.iter().any(|gap|gap.contains("statuses remain unconfirmed")));
    assert_eq!(checked.work_history[0].items[1].status, "completed");
    assert_eq!(checked.work_history[0].items[1].first_sequence, 2);
    assert_eq!(checked.work_history[0].items[1].observed_at_ms, 30);
    if mode != "prior-diff-budget" { assert_eq!(checked.work_history[0].items[1].changes[0].diff.as_deref(), Some("-Original fact\n+Updated fact")); }
    if mode == "new-diff" {
        assert_eq!(checked.work_history[0].items[1].changes.len(),2);
        assert_eq!(checked.work_history[0].items[1].changes[1],old_history.items[1].changes[0]);
        assert!(checked.work_history[0].items[1].changes[0].after_revision.is_none());
    } else { assert_eq!(checked.work_history[0].items[1].changes,old_history.items[1].changes); }
    if mode == "prior-diff-budget" {
        let item=&checked.work_history[0].items[1];
        let bytes=item.text.len()+item.summary.iter().map(String::len).sum::<usize>()+item.changes.iter().filter_map(|change|change.diff.as_ref()).map(String::len).sum::<usize>();
        assert!(bytes<=65536,"immutable prior diff must consume item capacity: {bytes}");
        assert!(item.payload_omissions.iter().any(|omission|omission.field.contains("/diff") && omission.original_bytes==60*1024));
    }
    if mode == "budget" {
        let item=&checked.work_history[0].items[1];
        let bytes=item.text.len()+item.summary.iter().map(String::len).sum::<usize>()+item.changes.iter().filter_map(|change|change.diff.as_ref()).map(String::len).sum::<usize>();
        assert!(bytes<=65536,"prior retained text must consume item capacity: {bytes}");
        assert_eq!(item.text,"p".repeat(8192));
        let omissions=serde_json::to_value(&item).unwrap();
        assert!(omissions["payloadOmissions"].as_array().unwrap().iter().any(|omission|omission["field"]=="text" && omission["retainedFromPriorObservation"]==true));
    }
    assert!(checked.work_history[0].items[1].change_gap.as_deref().is_some_and(|gap| gap.contains("recovered")));
    assert_eq!(checked.work_history[0].status, "completed");
    assert_eq!(
        prompts.lock().unwrap().len(),
        2,
        "Readback never sends another turn"
    );
    assert!(application
        .reconcile_run_for_selected_vault(&session.id, &execution)
        .is_err());
}


#[test]
fn never_dispatched_older_request_can_be_reviewed_after_newer_thread_starts() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let application = new_application(&directory, prompts.clone());
    let session = application.create_session("2026-09-20").unwrap();
    let store =
        FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json"));
    let mut state = store.load().unwrap();
    let saved = &mut state.sessions[0];
    saved.run_id = Some("never-dispatched".into());
    saved.run_state = "interrupted".into();
    saved.messages.push(serde_json::from_value(serde_json::json!({
        "id":"message-before-thread","role":"user","text":"Never dispatched original","messageDate":"2026-09-20","targetDate":"2026-09-20",
        "createdAt":"2026-09-20T03:50:00-04:00","executionId":"never-dispatched","runtimeTurnId":null,"deliveryState":"interrupted",
        "queueOrder":1,"resultChecked":false,"automaticPlan":false,"externalAppIds":[],"externalActions":[],"pendingExternalApproval":null
    })).unwrap());
    state.next_queue_order = 2;
    store.save(&state).unwrap();
    application
        .submit_message(
            "synthetic-vault",
            &session.id,
            "2026-09-21",
            "Fresh unrelated request",
        )
        .unwrap();
    let newer = wait_for_run_state(&application, &session.id, "completed");
    let checked = application
        .reconcile_run_for_selected_vault(&session.id, "never-dispatched")
        .unwrap();
    assert!(checked.messages[0].result_checked);
    assert_eq!(checked.run_id, newer.run_id);
    assert_eq!(checked.run_state, newer.run_state);
    assert_eq!(
        prompts.lock().unwrap().len(),
        1,
        "No original turn is sent or fabricated from the newer thread"
    );
}

#[test]
fn another_chat_reads_the_original_unknown_external_receipt_without_replaying_it() {
    let directory = IsolatedDirectory::new();
    let source = Arc::new(Mutex::new(DidaSourceFixture::default()));
    let application = dida_workflow_application(&directory, source.clone());
    let original = application.create_session("2026-09-27").unwrap();
    application
        .submit_message(
            "synthetic-vault",
            &original.id,
            "2026-09-27",
            "create-owned",
        )
        .unwrap();
    wait_for_session(&application, &original.id, |session| {
        session.run_state == "interrupted"
    });
    let store = FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json"));
    let mut state = store.load().unwrap();
    state.sessions[0].run_state = "stop-unconfirmed".into();
    state.sessions[0].messages[0].delivery_state = "stop-unconfirmed".into();
    store.save(&state).unwrap();
    let other = application.create_session("2026-09-26").unwrap();
    application
        .submit_message(
            "synthetic-vault",
            &other.id,
            "2026-09-26",
            "Unrelated current local work",
        )
        .unwrap();
    wait_for_run_state(&application, &other.id, "completed");
    assert_eq!(
        source.lock().unwrap().scopes.last(),
        Some(&false),
        "Opening another chat cannot bypass unknown native source receipts"
    );
    assert!(application.workspace("2026-09-26").unwrap().active_run.is_none(), "An older unconfirmed turn is a recovery result, not the current work owner");
    assert_eq!(source.lock().unwrap().writes, 1);
    source.lock().unwrap().readable = true;
    application
        .submit_message(
            "synthetic-vault",
            &other.id,
            "2026-09-26",
            "Read the original source before continuing",
        )
        .unwrap();
    wait_for_session(&application, &other.id, |session| {
        session.run_state == "completed" && session.messages.len() == 4
    });
    let checked = application
        .session("synthetic-vault", &original.id)
        .unwrap();
    assert_eq!(checked.messages[0].external_actions[0].status, "saved");
    assert_eq!(checked.messages[0].target_date, "2026-09-27");
    assert_eq!(
        checked.run_state, "stop-unconfirmed",
        "Source readback updates its effect, not the older whole turn"
    );
    assert_eq!(source.lock().unwrap().scopes.last(), Some(&true));
    assert_eq!(source.lock().unwrap().writes, 1);
}

#[test]
fn failed_history_save_of_queued_stop_never_dispatches_that_request() {
    let directory = IsolatedDirectory::new();
    let gate = Arc::new(FakeTurnGate::default());
    let failures = Arc::new(AtomicU64::new(0));
    let application = stop_save_failure_application(&directory, &gate, &failures);
    let session = application.create_session("2026-09-27").unwrap();
    application
        .submit_message(
            "synthetic-vault",
            &session.id,
            "2026-09-27",
            "Current running request",
        )
        .unwrap();
    gate.wait_for_started(1);
    let queued = application
        .submit_message(
            "synthetic-vault",
            &session.id,
            "2026-09-20",
            "Queued request to stop",
        )
        .unwrap();
    let pending = queued.messages[1].execution_id.clone().unwrap();
    failures.store(2, Ordering::SeqCst);
    assert!(application
        .stop_run_for_selected_vault(&session.id, &pending)
        .unwrap_err()
        .contains("Stop was requested"));
    gate.release_all();
    let completed = wait_for_run_state(&application, &session.id, "completed");
    assert_eq!(completed.messages[1].delivery_state, "paused");
    assert_eq!(gate.started_len(), 1);
}

#[test]
fn evening_entry_prepares_selected_date_draft_once_and_restores_it_after_restart() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let app = new_application(&directory, Arc::clone(&prompts));
    for date in ["2026-09-27", "2026-09-20"] {
        let draft = format!("/retro Review {date}: dashboard://record/{date}?phase=evening");
        let opened = app.prepare_evening_review(date, &draft).unwrap();
        assert_eq!(opened.session.target_date, date);
        assert_eq!(opened.session.draft, draft);
        assert!(!opened.preserved_draft);
        let again = app.prepare_evening_review(date, "do not overwrite").unwrap();
        assert_eq!(again.session.id, opened.session.id);
        assert_eq!(again.session.draft, draft);
        assert!(again.preserved_draft);
        assert_eq!(app.list_sessions(date).unwrap().len(), 1);
        assert!(again.session.messages.is_empty());
    }
    drop(app);
    let restored = new_application(&directory, Arc::clone(&prompts));
    for date in ["2026-09-27", "2026-09-20"] {
        let saved = restored.list_sessions(date).unwrap();
        assert_eq!(saved.len(), 1);
        assert_eq!(saved[0].target_date, date);
        assert!(saved[0].draft.contains(&format!("dashboard://record/{date}?phase=evening")));
        assert!(saved[0].messages.is_empty());
    }
    assert!(prompts.lock().unwrap().is_empty());
}

#[test]
fn evening_entry_reuses_date_matched_session_without_retargeting_or_losing_other_drafts() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let app = new_application(&directory, Arc::clone(&prompts));
    let past = app.create_session("2026-09-20").unwrap();
    app.save_draft_for_selected_vault(&past.id, "2026-09-20", "用户尚未发出的复盘草稿").unwrap();
    app.save_draft_for_selected_vault(&past.id, "2026-09-19", "另一天的未完成草稿").unwrap();
    let today = app.create_session("2026-09-27").unwrap();
    app.save_draft_for_selected_vault(&today.id, "2026-09-27", "今天的其他工作").unwrap();
    let opened = app.prepare_evening_review("2026-09-20", "new review request").unwrap();
    assert_eq!(opened.session.id, past.id);
    assert_eq!(opened.session.draft, "用户尚未发出的复盘草稿");
    assert_eq!(opened.session.drafts_by_date["2026-09-19"], "另一天的未完成草稿");
    assert!(opened.preserved_draft);
    let unchanged = app.session("synthetic-vault", &today.id).unwrap();
    assert_eq!(unchanged.target_date, "2026-09-27");
    assert_eq!(unchanged.draft, "今天的其他工作");
    assert!(prompts.lock().unwrap().is_empty());
}

#[test]
fn concurrent_evening_entry_clicks_create_one_saved_session_without_runtime_requests() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let app = Arc::new(new_application(&directory, Arc::clone(&prompts)));
    let workers: Vec<_> = (0..4).map(|_| {
        let app = Arc::clone(&app);
        thread::spawn(move || app.prepare_evening_review("2026-09-20", "/retro Review 2026-09-20").unwrap().session.id)
    }).collect();
    let ids: Vec<_> = workers.into_iter().map(|worker| worker.join().unwrap()).collect();
    assert!(ids.iter().all(|id| id == &ids[0]));
    assert_eq!(app.list_sessions("2026-09-20").unwrap().len(), 1);
    assert!(prompts.lock().unwrap().is_empty());
    assert!(app.prepare_evening_review("2026-09-28", "future").is_err());
    assert!(app.list_sessions("2026-09-28").unwrap().is_empty());
}

#[test]
fn evening_entry_leaves_active_same_date_work_running_in_its_original_session() {
    let directory = IsolatedDirectory::new();
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let gate = Arc::new(FakeTurnGate::default());
    let app = new_application_with_controls(&directory, Arc::clone(&prompts), Arc::new(Mutex::new(Vec::new())), Some(Arc::clone(&gate)), Arc::new(Mutex::new(HashMap::new())));
    let active = app.create_session("2026-09-20").unwrap();
    app.submit_message("synthetic-vault", &active.id, "2026-09-20", "Existing work").unwrap();
    gate.wait_for_started(1);
    let review = app.prepare_evening_review("2026-09-20", "/retro Review selected date").unwrap();
    assert_ne!(review.session.id, active.id);
    assert!(review.session.messages.is_empty());
    assert_eq!(app.prepare_evening_review("2026-09-20", "repeat").unwrap().session.id, review.session.id);
    gate.release_all();
    wait_until_finished(&app, &active.id);
    assert_eq!(prompts.lock().unwrap().len(), 1);
    assert!(app.session("synthetic-vault", &review.session.id).unwrap().messages.is_empty());
}


#[derive(Default)]
struct TitleControl {
    requests: Mutex<Vec<personal_dashboard_lib::collaboration::RuntimeSessionTitleRequest>>,
    result: Mutex<Option<Result<String, String>>>,
    changed: Condvar,
}
impl TitleControl {
    fn release(&self, result: Result<&str, &str>) {
        *self.result.lock().unwrap() = Some(result.map(str::to_owned).map_err(str::to_owned));
        self.changed.notify_all();
    }
    fn wait_started(&self, count: usize) {
        let deadline = std::time::Instant::now() + Duration::from_secs(5);
        while self.requests.lock().unwrap().len() < count {
            assert!(std::time::Instant::now() < deadline, "title request was not started");
            thread::sleep(Duration::from_millis(5));
        }
    }
}
struct TitleRuntime { base: FakeAppServer, title: Arc<TitleControl>, fail_next_reply: bool }
impl AppServerTransport for TitleRuntime {
    fn inspect(&mut self) -> Result<RuntimeConnectionView, String> { self.base.inspect() }
    fn start_chatgpt_login(&mut self) -> Result<(), String> { self.base.start_chatgpt_login() }
    fn start_thread(&mut self, model: Option<&str>, instructions: &str) -> Result<String, String> { self.base.start_thread(model, instructions) }
    fn resume_thread(&mut self, id: &str) -> Result<(), String> { self.base.resume_thread(id) }
    fn send_turn(&mut self, request: RuntimeTurnRequest) -> Result<RuntimeTurnResult, String> {
        if std::mem::take(&mut self.fail_next_reply) { Err("Synthetic first reply failed".into()) } else { self.base.send_turn(request) }
    }
    fn send_turn_cancellable(&mut self, request: RuntimeTurnRequest, cancellation: Arc<AtomicBool>) -> Result<RuntimeTurnResult, String> {
        let result = self.base.send_turn_cancellable(request, cancellation);
        if std::mem::take(&mut self.fail_next_reply) { Err("Synthetic first reply failed".into()) } else { result }
    }
    fn reconcile_turn(&mut self, thread_id: &str, execution_id: &str) -> Result<RuntimeRunReconciliation, String> {
        self.base.reconcile_turn(thread_id, execution_id)
    }
    fn session_title_generator(&self) -> Option<personal_dashboard_lib::collaboration::RuntimeSessionTitleGenerator> {
        let control = self.title.clone();
        Some(Box::new(move |request| {
            control.requests.lock().unwrap().push(request);
            let mut result = control.result.lock().unwrap();
            while result.is_none() { result = control.changed.wait(result).unwrap(); }
            result.clone().unwrap()
        }))
    }
}
fn title_application(directory: &IsolatedDirectory, title: Arc<TitleControl>, fail_reply: bool) -> CollaborationApplication {
    title_application_with_gate(directory, title, fail_reply, None)
}
fn title_application_with_gate(directory: &IsolatedDirectory, title: Arc<TitleControl>, fail_reply: bool, gate: Option<Arc<FakeTurnGate>>) -> CollaborationApplication {
    CollaborationApplication::with_adapters(
        Arc::new(FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json"))),
        Box::new(TitleRuntime { title, fail_next_reply: fail_reply, base: FakeAppServer {
            prompts: Arc::new(Mutex::new(Vec::new())), calls: Arc::new(Mutex::new(Vec::new())),
            read_only_text_turns_available: true, switch_vault_on_inspect: None, turn_gate: gate,
            reconciliations: Arc::new(Mutex::new(HashMap::new())), memory_call: None,
            memory_tool_results: Arc::new(Mutex::new(Vec::new())),
        }}), Arc::new(FixtureContext), Arc::new(FixedClock), directory.path().to_path_buf(), "Synthetic instructions".into())
}
fn wait_for_title(application: &CollaborationApplication, id: &str, expected: &str) {
    let deadline = std::time::Instant::now() + Duration::from_secs(5);
    loop {
        if application.session("synthetic-vault", id).unwrap().title == expected { break; }
        assert!(std::time::Instant::now() < deadline, "saved title did not update to {expected}");
        thread::sleep(Duration::from_millis(5));
    }
}
#[test]
fn first_reply_title_is_async_saved_once_and_keeps_the_opening_and_reply_intact() {
    let directory = IsolatedDirectory::new();
    let title = Arc::new(TitleControl::default());
    let app = title_application(&directory, title.clone(), false);
    let session = app.create_session("2026-09-27").unwrap();
    let opening = "讨论今天如何安排阅读与散步";
    let queued = app.submit_message("synthetic-vault", &session.id, "2026-09-27", opening).unwrap();
    assert_eq!(queued.title, opening, "temporary name is persisted with the first message");
    wait_until_finished(&app, &session.id);
    title.wait_started(1);
    assert_eq!(app.session("synthetic-vault", &session.id).unwrap().messages.len(), 2, "body completes before slow naming");
    app.submit_message("synthetic-vault", &session.id, "2026-09-27", "再加一个阅读建议").unwrap();
    wait_until_finished(&app, &session.id);
    assert_eq!(title.requests.lock().unwrap().len(), 1, "later chat proceeds without another naming request");
    title.release(Ok("阅读与散步安排"));
    wait_for_title(&app, &session.id, "阅读与散步安排");
    let saved = app.session("synthetic-vault", &session.id).unwrap();
    assert_eq!(saved.messages[0].text, opening);
    assert_eq!(saved.messages[1].text, "Synthetic reply based on current context.");
    assert_eq!(app.list_sessions("2026-09-27").unwrap().iter().find(|s| s.id == session.id).unwrap().title, saved.title);
    let request = title.requests.lock().unwrap()[0].clone();
    assert_eq!(request.opening_message, opening);
    assert_eq!(request.first_reply, saved.messages[1].text);
    let reopened = title_application(&directory, title.clone(), false);
    assert_eq!(reopened.session("synthetic-vault", &session.id).unwrap().title, saved.title);
    reopened.submit_message("synthetic-vault", &session.id, "2026-09-27", "继续").unwrap();
    wait_until_finished(&reopened, &session.id);
    assert_eq!(title.requests.lock().unwrap().len(), 1);
}

#[test]
fn title_failure_or_empty_result_keeps_temporary_name_without_retry_after_reopen() {
    for outcome in [Err("Synthetic naming failure"), Ok("  \n ")] {
        let directory = IsolatedDirectory::new();
        let title = Arc::new(TitleControl::default());
        let app = title_application(&directory, title.clone(), false);
        let session = app.create_session("2026-09-27").unwrap();
        app.submit_message("synthetic-vault", &session.id, "2026-09-27", "Opening remains recognisable").unwrap();
        wait_until_finished(&app, &session.id);
        title.wait_started(1);
        assert!(app.session("synthetic-vault", &session.id).unwrap().title_generation_pending);
        title.release(outcome);
        let deadline = std::time::Instant::now() + Duration::from_secs(5);
        while app.session("synthetic-vault", &session.id).unwrap().title_generation_pending {
            assert!(std::time::Instant::now() < deadline);
            thread::sleep(Duration::from_millis(5));
        }
        assert_eq!(app.session("synthetic-vault", &session.id).unwrap().title, "Opening remains recognisable");
        let reopened = title_application(&directory, title.clone(), false);
        reopened.submit_message("synthetic-vault", &session.id, "2026-09-27", "Follow-up after failed naming").unwrap();
        wait_until_finished(&reopened, &session.id);
        assert_eq!(title.requests.lock().unwrap().len(), 1);
        assert_eq!(reopened.session("synthetic-vault", &session.id).unwrap().title, "Opening remains recognisable");
    }
}

#[test]
fn late_title_targets_original_chat_and_cannot_replace_an_existing_name_or_restart_after_reopen() {
    let directory = IsolatedDirectory::new();
    let title = Arc::new(TitleControl::default());
    let app = title_application(&directory, title.clone(), false);
    let first = app.create_session("2026-09-27").unwrap();
    app.submit_message("synthetic-vault", &first.id, "2026-09-27", "Opening for the first chat").unwrap();
    wait_until_finished(&app, &first.id);
    title.wait_started(1);
    let second = app.create_session("2026-09-27").unwrap();
    assert_eq!(app.session("synthetic-vault", &second.id).unwrap().title, "");
    title.release(Ok("First chat title\nwith a line break"));
    wait_for_title(&app, &first.id, "First chat title with a line break");
    assert_eq!(app.session("synthetic-vault", &second.id).unwrap().title, "");

    // A saved human/legacy title has precedence; model result must not replace it.
    let third = app.create_session("2026-09-27").unwrap();
    let store = FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json"));
    let mut state = store.load().unwrap();
    state.sessions.iter_mut().find(|s| s.id == third.id).unwrap().title = "Existing chosen name".into();
    store.save(&state).unwrap();
    app.submit_message("synthetic-vault", &third.id, "2026-09-27", "Do not rename this existing session").unwrap();
    wait_until_finished(&app, &third.id);
    assert_eq!(app.session("synthetic-vault", &third.id).unwrap().title, "Existing chosen name");
    assert_eq!(title.requests.lock().unwrap().len(), 1);
}

#[test]
fn reopening_during_naming_prevents_a_late_result_and_never_replays_the_title_request() {
    let directory = IsolatedDirectory::new();
    let title = Arc::new(TitleControl::default());
    let app = title_application(&directory, title.clone(), false);
    let first = app.create_session("2026-09-27").unwrap();
    app.submit_message("synthetic-vault", &first.id, "2026-09-27", "Retain this temporary title").unwrap();
    wait_until_finished(&app, &first.id);
    title.wait_started(1);
    let reopened = title_application(&directory, title.clone(), false);
    assert!(!reopened.session("synthetic-vault", &first.id).unwrap().title_generation_pending);
    title.release(Ok("Discard late title"));
    reopened.submit_message("synthetic-vault", &first.id, "2026-09-27", "Continue without replay").unwrap();
    wait_until_finished(&reopened, &first.id);
    assert_eq!(reopened.session("synthetic-vault", &first.id).unwrap().title, "Retain this temporary title");
    assert_eq!(title.requests.lock().unwrap().len(), 1);
}

#[test]
fn unsuccessful_first_reply_does_not_start_title_generation() {
    let directory = IsolatedDirectory::new();
    let title = Arc::new(TitleControl::default());
    let app = title_application(&directory, title.clone(), true);
    let session = app.create_session("2026-09-27").unwrap();
    app.submit_message("synthetic-vault", &session.id, "2026-09-27", "Failed opening keeps its name").unwrap();
    wait_for_run_state(&app, &session.id, "interrupted");
    assert!(title.requests.lock().unwrap().is_empty());
    assert_eq!(app.session("synthetic-vault", &session.id).unwrap().title, "Failed opening keeps its name");
}

#[test]
fn a_name_saved_while_generation_is_pending_wins_over_the_late_model_result() {
    let directory = IsolatedDirectory::new();
    let title = Arc::new(TitleControl::default());
    let app = title_application(&directory, title.clone(), false);
    let session = app.create_session("2026-09-27").unwrap();
    app.submit_message("synthetic-vault", &session.id, "2026-09-27", "Temporary opening").unwrap();
    wait_until_finished(&app, &session.id);
    title.wait_started(1);
    let store = FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json"));
    let mut state = store.load().unwrap();
    state.sessions.iter_mut().find(|stored| stored.id == session.id).unwrap().title = "Already chosen name".into();
    store.save(&state).unwrap();
    title.release(Ok("Late model title"));
    let deadline = std::time::Instant::now() + Duration::from_secs(5);
    while app.session("synthetic-vault", &session.id).unwrap().title_generation_pending {
        assert!(std::time::Instant::now() < deadline);
        thread::sleep(Duration::from_millis(5));
    }
    assert_eq!(app.session("synthetic-vault", &session.id).unwrap().title, "Already chosen name");
}

#[test]
fn opening_reply_keeps_title_completion_observable_when_another_session_is_selected() {
    let directory = IsolatedDirectory::new();
    let title = Arc::new(TitleControl::default());
    let gate = Arc::new(FakeTurnGate::default());
    let app = title_application_with_gate(&directory, title.clone(), false, Some(gate.clone()));
    let first = app.create_session("2026-09-27").unwrap();
    app.submit_message("synthetic-vault", &first.id, "2026-09-27", "Opening still running").unwrap();
    gate.wait_for_started(1);
    let second = app.create_session("2026-09-27").unwrap();
    let pending = app.list_sessions("2026-09-27").unwrap().into_iter().find(|s|s.id == first.id).unwrap().title_generation_pending;
    // Release before asserting so the real transport worker never leaks on RED.
    gate.release_all();
    wait_until_finished(&app, &first.id);
    title.wait_started(1);
    title.release(Ok("Opening completed title"));
    wait_for_title(&app, &first.id, "Opening completed title");
    assert!(pending, "the opening reply must expose pending title work before its first reply completes");
    assert!(!app.session("synthetic-vault", &first.id).unwrap().title_generation_pending);
    assert!(app.session("synthetic-vault", &second.id).unwrap().messages.is_empty());
    app.submit_message("synthetic-vault", &first.id, "2026-09-27", "Later message").unwrap();
    wait_until_finished(&app, &first.id);
    assert_eq!(title.requests.lock().unwrap().len(), 1);
    assert_eq!(app.session("synthetic-vault", &first.id).unwrap().title, "Opening completed title");
}

#[test]
fn failed_opening_waits_without_polling_or_replaying_until_a_new_success_after_reopen() {
    let directory = IsolatedDirectory::new();
    let title = Arc::new(TitleControl::default());
    let gate = Arc::new(FakeTurnGate::default());
    let app = title_application_with_gate(&directory, title.clone(), true, Some(gate.clone()));
    let first = app.create_session("2026-09-27").unwrap();
    app.submit_message("synthetic-vault", &first.id, "2026-09-27", "Failed opening name").unwrap();
    gate.wait_for_started(1);
    let pending = app.session("synthetic-vault", &first.id).unwrap().title_generation_pending;
    gate.release_all();
    wait_for_run_state(&app, &first.id, "interrupted");
    assert!(pending);
    assert!(!app.session("synthetic-vault", &first.id).unwrap().title_generation_pending);
    let later_gate = Arc::new(FakeTurnGate::default());
    let reopened = title_application_with_gate(&directory, title.clone(), false, Some(later_gate.clone()));
    assert!(!reopened.session("synthetic-vault", &first.id).unwrap().title_generation_pending);
    assert_eq!(later_gate.started_len(), 0, "reopening must not replay a request");
    assert!(title.requests.lock().unwrap().is_empty(), "reopening alone must not start naming");
    title.release(Ok("Recovered opening title"));
    reopened.submit_message("synthetic-vault", &first.id, "2026-09-27", "A later successful reply").unwrap();
    later_gate.wait_for_started(1);
    let later_pending = reopened.list_sessions("2026-09-27").unwrap().into_iter()
        .find(|session| session.id == first.id).unwrap().title_generation_pending;
    later_gate.release_all();
    wait_until_finished(&reopened, &first.id);
    assert!(later_pending, "the first successful reply must remain observable across chat selection");
    wait_for_title(&reopened, &first.id, "Recovered opening title");
    let requests = title.requests.lock().unwrap();
    assert_eq!(requests.len(), 1);
    assert_eq!(requests[0].opening_message, "Failed opening name");
    assert_eq!(requests[0].first_reply, "Synthetic reply for A later successful reply.");
    assert!(!reopened.session("synthetic-vault", &first.id).unwrap().title_generation_pending);
}


#[test]
fn first_successful_reply_after_a_failed_request_names_the_original_opening_once() {
    let directory = IsolatedDirectory::new();
    let title = Arc::new(TitleControl::default());
    // Pre-release the synthetic generator so RED cannot leave a naming worker blocked.
    title.release(Ok("Recovered reading and walking plan"));
    let app = title_application(&directory, title.clone(), true);
    let session = app.create_session("2026-09-27").unwrap();
    let opening = "请保留原始开场的完整内容：今天想讨论阅读与散步安排。\n还有下周如何继续这一计划的背景。";
    let failed = app.submit_message("synthetic-vault", &session.id, "2026-09-27", opening).unwrap();
    wait_for_run_state(&app, &session.id, "interrupted");
    assert!(title.requests.lock().unwrap().is_empty());
    app.reconcile_run_for_selected_vault(&session.id, failed.run_id.as_deref().unwrap()).unwrap();
    app.submit_message("synthetic-vault", &session.id, "2026-09-27", "请继续，给出第一个建议").unwrap();
    wait_until_finished(&app, &session.id);
    wait_for_title(&app, &session.id, "Recovered reading and walking plan");
    let saved = app.session("synthetic-vault", &session.id).unwrap();
    assert_eq!(saved.messages[0].text, opening);
    assert_eq!(saved.messages[0].delivery_state, "interrupted");
    assert_eq!(saved.messages[2].text, "Synthetic reply based on current context.");
    let requests = title.requests.lock().unwrap();
    assert_eq!(requests.len(), 1);
    assert_eq!(requests[0].opening_message, opening);
    assert_eq!(requests[0].first_reply, "Synthetic reply based on current context.");
    drop(requests);
    app.submit_message("synthetic-vault", &session.id, "2026-09-27", "Another successful reply").unwrap();
    wait_until_finished(&app, &session.id);
    let reopened = title_application(&directory, title.clone(), false);
    assert_eq!(reopened.session("synthetic-vault", &session.id).unwrap().title, saved.title);
    reopened.submit_message("synthetic-vault", &session.id, "2026-09-27", "Continue after reopening").unwrap();
    wait_until_finished(&reopened, &session.id);
    assert_eq!(title.requests.lock().unwrap().len(), 1, "later successful replies and reopening never rename again");
    assert_eq!(reopened.list_sessions("2026-09-27").unwrap().into_iter().find(|s| s.id == session.id).unwrap().title, saved.title);
}

#[test]
fn recovering_a_saved_first_reply_does_not_replay_naming_or_name_from_a_later_reply() {
    let directory = IsolatedDirectory::new();
    let title = Arc::new(TitleControl::default());
    title.release(Ok("Must not replace the temporary title"));
    let app = title_application(&directory, title.clone(), true);
    let session = app.create_session("2026-09-27").unwrap();
    let failed = app.submit_message("synthetic-vault", &session.id, "2026-09-27", "Recover this original opening").unwrap();
    wait_for_run_state(&app, &session.id, "interrupted");
    let prompts = Arc::new(Mutex::new(Vec::new()));
    let reconciliations = Arc::new(Mutex::new(HashMap::from([(
        failed.run_id.clone().unwrap(),
        RuntimeRunReconciliation::Completed {
            text: "The actual first successful reply was already saved by the runtime.".into(),
            runtime_turn_id: "runtime-turn-recovered".into(),
            external_actions: Vec::new(), work_history: None,
        },
    )])));
    let recovery = new_application_with_controls(&directory, prompts.clone(), Arc::new(Mutex::new(Vec::new())), None, reconciliations);
    let recovered = recovery.reconcile_run_for_selected_vault(&session.id, failed.run_id.as_deref().unwrap()).unwrap();
    assert_eq!(recovered.messages[1].text, "The actual first successful reply was already saved by the runtime.");
    assert!(prompts.lock().unwrap().is_empty(), "checking the saved result must not send a new runtime request");
    assert!(title.requests.lock().unwrap().is_empty());
    let reopened = title_application(&directory, title.clone(), false);
    reopened.submit_message("synthetic-vault", &session.id, "2026-09-27", "This is a later reply, not the first reply").unwrap();
    wait_until_finished(&reopened, &session.id);
    assert!(!reopened.session("synthetic-vault", &session.id).unwrap().title_generation_pending);
    assert!(title.requests.lock().unwrap().is_empty(), "a later reply must not trigger naming after the first reply was recovered");
    assert_eq!(reopened.session("synthetic-vault", &session.id).unwrap().title, "Recover this original opening");
}

#[test]
fn an_existing_successful_reply_with_stale_waiting_state_is_not_renamed_by_a_later_reply() {
    let directory = IsolatedDirectory::new();
    let original = new_application(&directory, Arc::new(Mutex::new(Vec::new())));
    let session = original.create_session("2026-09-27").unwrap();
    original.submit_message("synthetic-vault", &session.id, "2026-09-27", "Existing completed conversation").unwrap();
    wait_until_finished(&original, &session.id);
    let store = FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json"));
    let mut state = store.load().unwrap();
    let stored = state.sessions.iter_mut().find(|s| s.id == session.id).unwrap();
    stored.title_generation.as_mut().unwrap().status = personal_dashboard_lib::collaboration::SessionTitleStatus::WaitingForReply;
    store.save(&state).unwrap();
    let title = Arc::new(TitleControl::default());
    title.release(Ok("Must not rename an existing successful conversation"));
    let reopened = title_application(&directory, title.clone(), false);
    reopened.submit_message("synthetic-vault", &session.id, "2026-09-27", "A later reply cannot become the first reply").unwrap();
    wait_until_finished(&reopened, &session.id);
    assert!(!reopened.session("synthetic-vault", &session.id).unwrap().title_generation_pending);
    assert!(title.requests.lock().unwrap().is_empty());
    assert_eq!(reopened.session("synthetic-vault", &session.id).unwrap().title, "Existing completed conversation");
}

#[test]
fn queued_followup_does_not_replace_the_opening_or_first_reply_used_for_naming() {
    let directory = IsolatedDirectory::new();
    let title = Arc::new(TitleControl::default());
    title.release(Ok("Opening and first reply only"));
    let gate = Arc::new(FakeTurnGate::default());
    let app = title_application_with_gate(&directory, title.clone(), false, Some(gate.clone()));
    let session = app.create_session("2026-09-27").unwrap();
    app.submit_message("synthetic-vault", &session.id, "2026-09-27", "Original opening while still running").unwrap();
    gate.wait_for_started(1);
    app.submit_message("synthetic-vault", &session.id, "2026-09-27", "Queued followup before the first reply").unwrap();
    gate.release_all();
    wait_until_finished(&app, &session.id);
    wait_for_title(&app, &session.id, "Opening and first reply only");
    assert_eq!(app.session("synthetic-vault", &session.id).unwrap().messages.len(), 4);
    let requests = title.requests.lock().unwrap();
    assert_eq!(requests.len(), 1);
    assert_eq!(requests[0].opening_message, "Original opening while still running");
    assert_eq!(requests[0].first_reply, "Synthetic reply for Original opening while still running.");
}

#[test]
fn a_name_chosen_after_a_failed_request_is_preserved_when_the_first_success_arrives() {
    let directory = IsolatedDirectory::new();
    let title = Arc::new(TitleControl::default());
    title.release(Ok("Must not overwrite the chosen name"));
    let app = title_application(&directory, title.clone(), true);
    let session = app.create_session("2026-09-27").unwrap();
    app.submit_message("synthetic-vault", &session.id, "2026-09-27", "Failed original opening").unwrap();
    wait_for_run_state(&app, &session.id, "interrupted");
    let store = FileCollaborationStore::new(directory.path().join("collaboration/collaboration.json"));
    let mut state = store.load().unwrap();
    state.sessions.iter_mut().find(|stored| stored.id == session.id).unwrap().title = "Human chosen name".into();
    store.save(&state).unwrap();
    app.submit_message("synthetic-vault", &session.id, "2026-09-27", "First successful reply after the chosen name").unwrap();
    wait_until_finished(&app, &session.id);
    assert_eq!(app.session("synthetic-vault", &session.id).unwrap().title, "Human chosen name");
    assert!(title.requests.lock().unwrap().is_empty());
}
