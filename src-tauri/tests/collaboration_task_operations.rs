use personal_dashboard_lib::collaboration::{
    AppServerTransport, CollaborationApplication, CollaborationClock, CollaborationContextSource,
    CollaborationContextView, CollaborationState, CollaborationStore,
    CollaborationTaskListReferenceView, CollaborationTaskOperation, CollaborationTaskService,
    ContextPaneView, FileCollaborationStore, ModelOptionView, RuntimeConnectionView,
    RuntimeDynamicToolCall, RuntimeDynamicToolHandler, RuntimeDynamicToolResult,
    RuntimeRunReconciliation, RuntimeTurnRequest, RuntimeTurnResult,
    TaskApplicationCollaborationAdapter,
};
use personal_dashboard_lib::tasks::{FileTaskStore, TaskApplication, TaskDataState, TaskState};
use personal_dashboard_lib::today::{TodayClock, TodayWorkspacePersistence};
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
    .with_task_service(task_service);
    (application, registered_tools, results)
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
