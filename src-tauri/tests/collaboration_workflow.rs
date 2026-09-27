use personal_dashboard_lib::collaboration::{
    AppServerTransport, CollaborationApplication, CollaborationClock, CollaborationContextSource,
    CollaborationContextView, ContextPaneView, DashboardContextReader, FileCollaborationStore,
    ModelOptionView, RuntimeConnectionView, RuntimeTurnRequest, RuntimeTurnResult,
};
use personal_dashboard_lib::tasks::{FileTaskStore, TaskApplication, TaskCreateInput};
use personal_dashboard_lib::today::{TodayClock, TodayWorkspacePersistence};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
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
    switch_vault_on_inspect: Option<Arc<AtomicBool>>,
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
        })
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
