use crate::clock::SystemClock;
use crate::habits::{HabitSnapshotState, HabitSnapshotView};
use crate::platform::FileTodayWorkspacePersistence;
use crate::tasks::{FileTaskStore, TaskApplication, TaskDataState, TasksView};
use crate::today::{
    TodayApplication, TodayClock, TodayState, TodayView, TodayWorkspaceExchange,
    TodayWorkspacePersistence,
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::hash_map::DefaultHasher;
use std::collections::{HashMap, HashSet, VecDeque};
use std::fs::{self, OpenOptions};
use std::hash::{Hash, Hasher};
use std::io::{BufRead, BufReader, Write};
#[cfg(unix)]
use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::thread;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

const COLLABORATION_SCHEMA_VERSION: u32 = 1;
const MAX_MESSAGE_CHARACTERS: usize = 12_000;
const APP_SERVER_REQUEST_TIMEOUT: Duration = Duration::from_secs(90);
const COLLABORATION_SKILL: &str =
    include_str!("../../.agents/skills/personal-dashboard-collaboration/SKILL.md");

static IDENTIFIER_SEQUENCE: AtomicU64 = AtomicU64::new(1);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ContextPaneView {
    pub state: String,
    pub message: String,
    pub items: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationContextView {
    pub date: String,
    pub vault_name: Option<String>,
    pub daily_record: ContextPaneView,
    pub tasks: ContextPaneView,
    pub habits: ContextPaneView,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationMessageView {
    pub id: String,
    pub role: String,
    pub text: String,
    pub message_date: String,
    pub target_date: String,
    pub created_at: String,
    pub execution_id: Option<String>,
    pub runtime_turn_id: Option<String>,
    pub delivery_state: String,
    pub result_checked: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationSessionView {
    pub id: String,
    pub title: String,
    pub created_date: String,
    pub activity_dates: Vec<String>,
    pub last_activity_at: String,
    pub target_date: String,
    pub run_id: Option<String>,
    pub run_state: String,
    pub progress: String,
    pub runtime_thread_id: Option<String>,
    pub messages: Vec<CollaborationMessageView>,
    pub draft: String,
    pub drafts_by_date: HashMap<String, String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModelOptionView {
    pub id: String,
    pub display_name: String,
    pub default_reasoning_effort: Option<String>,
    pub reasoning_efforts: Vec<String>,
    pub is_default: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeConnectionView {
    pub executable_path: Option<String>,
    pub version: Option<String>,
    pub experimental: bool,
    pub read_only_text_turns_available: bool,
    pub text_turn_unavailable_reason: Option<String>,
    pub authenticated: bool,
    pub auth_mode: Option<String>,
    pub account_email: Option<String>,
    pub plan_type: Option<String>,
    pub models: Vec<ModelOptionView>,
    pub selected_model: Option<String>,
    pub selected_reasoning_effort: Option<String>,
    pub error: Option<String>,
}

impl RuntimeConnectionView {
    fn unavailable(error: impl Into<String>) -> Self {
        Self {
            executable_path: None,
            version: None,
            experimental: true,
            read_only_text_turns_available: false,
            text_turn_unavailable_reason: Some(
                "The local Codex connection is unavailable, so text turns cannot start.".into(),
            ),
            authenticated: false,
            auth_mode: None,
            account_email: None,
            plan_type: None,
            models: Vec::new(),
            selected_model: None,
            selected_reasoning_effort: None,
            error: Some(error.into()),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeTurnRequest {
    pub thread_id: String,
    pub execution_id: String,
    pub model: Option<String>,
    pub reasoning_effort: Option<String>,
    pub user_text: String,
    pub context: CollaborationContextView,
    pub working_directory: PathBuf,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeTurnResult {
    pub text: String,
    pub runtime_turn_id: Option<String>,
    pub stopped: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RuntimeRunReconciliation {
    Completed {
        text: String,
        runtime_turn_id: String,
    },
    InProgress,
    Interrupted {
        runtime_turn_id: String,
    },
    NotFound,
}

pub trait CollaborationClock: Send + Sync {
    fn current_timestamp(&self) -> String;
    fn current_date(&self) -> String;
}

impl CollaborationClock for SystemClock {
    fn current_timestamp(&self) -> String {
        self.current_timestamp_label()
    }

    fn current_date(&self) -> String {
        TodayClock::current_date(self)
    }
}

pub trait CollaborationContextSource: Send + Sync {
    fn current_vault_key(&self) -> Result<Option<String>, String>;

    fn read_context(
        &self,
        expected_vault_key: Option<&str>,
        date: &str,
    ) -> Result<CollaborationContextView, String>;
}

pub trait AppServerTransport: Send {
    fn inspect(&mut self) -> Result<RuntimeConnectionView, String>;
    fn start_chatgpt_login(&mut self) -> Result<(), String>;
    fn start_thread(&mut self, model: Option<&str>, instructions: &str) -> Result<String, String>;
    fn resume_thread(&mut self, thread_id: &str) -> Result<(), String>;
    fn send_turn(&mut self, request: RuntimeTurnRequest) -> Result<RuntimeTurnResult, String>;
    fn send_turn_cancellable(
        &mut self,
        request: RuntimeTurnRequest,
        _cancel_requested: Arc<AtomicBool>,
    ) -> Result<RuntimeTurnResult, String> {
        self.send_turn(request)
    }
    fn reconcile_turn(
        &mut self,
        _thread_id: &str,
        _execution_id: &str,
    ) -> Result<RuntimeRunReconciliation, String> {
        Err("This Codex runtime cannot check saved turn results.".into())
    }
    fn shutdown_handle(&self) -> RuntimeShutdownHandle {
        RuntimeShutdownHandle::default()
    }
}

#[derive(Clone, Default)]
pub struct RuntimeShutdownHandle {
    requested: Arc<AtomicBool>,
    child: Arc<Mutex<Option<Arc<Mutex<Child>>>>>,
}

impl RuntimeShutdownHandle {
    pub fn request_shutdown(&self) {
        self.requested.store(true, Ordering::SeqCst);
        let child = self
            .child
            .try_lock()
            .ok()
            .and_then(|child| child.as_ref().cloned());
        if let Some(child) = child {
            if let Ok(mut child) = child.try_lock() {
                let _ = child.kill();
            }
        }
    }

    fn is_requested(&self) -> bool {
        self.requested.load(Ordering::SeqCst)
    }

    fn register_child(&self, child: Arc<Mutex<Child>>) {
        if let Ok(mut current) = self.child.lock() {
            *current = Some(Arc::clone(&child));
        }
        if self.is_requested() {
            if let Ok(mut child) = child.lock() {
                let _ = child.kill();
            }
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationWorkspaceView {
    pub date: String,
    pub vault_name: Option<String>,
    pub selected_model: Option<String>,
    pub context: CollaborationContextView,
    pub sessions: Vec<CollaborationSessionView>,
    pub active_run: Option<CollaborationRunOwnerView>,
    pub recovery_required: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationRunOwnerView {
    pub session_id: String,
    pub session_title: String,
    pub run_id: String,
    pub run_state: String,
    pub progress: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationSettings {
    pub selected_model: Option<String>,
    #[serde(default)]
    pub selected_reasoning_effort: Option<String>,
}

impl Default for CollaborationSettings {
    fn default() -> Self {
        Self {
            selected_model: None,
            selected_reasoning_effort: None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredCollaborationMessage {
    pub id: String,
    pub role: String,
    pub text: String,
    pub message_date: String,
    pub target_date: String,
    pub created_at: String,
    #[serde(default)]
    pub execution_id: Option<String>,
    #[serde(default)]
    pub runtime_turn_id: Option<String>,
    #[serde(default = "default_message_delivery_state")]
    pub delivery_state: String,
    #[serde(default)]
    pub queue_order: Option<u64>,
    #[serde(default)]
    pub result_checked: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredCollaborationSession {
    pub id: String,
    pub vault_key: Option<String>,
    pub title: String,
    pub created_date: String,
    pub activity_dates: Vec<String>,
    pub last_activity_at: String,
    pub target_date: String,
    pub run_id: Option<String>,
    pub run_state: String,
    pub progress: String,
    pub runtime_thread_id: Option<String>,
    pub messages: Vec<StoredCollaborationMessage>,
    #[serde(default)]
    pub draft: String,
    #[serde(default)]
    pub drafts_by_date: HashMap<String, String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CollaborationState {
    pub schema_version: u32,
    pub settings: CollaborationSettings,
    pub sessions: Vec<StoredCollaborationSession>,
    #[serde(default = "default_next_queue_order")]
    pub next_queue_order: u64,
}

impl Default for CollaborationState {
    fn default() -> Self {
        Self {
            schema_version: COLLABORATION_SCHEMA_VERSION,
            settings: CollaborationSettings::default(),
            sessions: Vec::new(),
            next_queue_order: 1,
        }
    }
}

fn default_next_queue_order() -> u64 {
    1
}

fn default_message_delivery_state() -> String {
    "completed".into()
}

pub trait CollaborationStore: Send + Sync {
    fn load(&self) -> Result<CollaborationState, String>;
    fn save(&self, state: &CollaborationState) -> Result<(), String>;
}

pub struct FileCollaborationStore {
    path: PathBuf,
}

impl FileCollaborationStore {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }
}

impl CollaborationStore for FileCollaborationStore {
    fn load(&self) -> Result<CollaborationState, String> {
        let parent = self
            .path
            .parent()
            .ok_or_else(|| "Collaboration history has no parent directory.".to_string())?;
        ensure_private_directory(parent, "collaboration history")?;
        secure_existing_history_file(&self.path)?;
        let bytes = match fs::read(&self.path) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(CollaborationState::default())
            }
            Err(error) => return Err(format!("Could not read collaboration history: {error}")),
        };
        let mut state: CollaborationState = serde_json::from_slice(&bytes)
            .map_err(|error| format!("Collaboration history is invalid: {error}"))?;
        if state.schema_version != COLLABORATION_SCHEMA_VERSION {
            return Err("Collaboration history uses an unsupported schema version.".into());
        }
        for session in &mut state.sessions {
            if !session.draft.is_empty() {
                session
                    .drafts_by_date
                    .entry(session.target_date.clone())
                    .or_insert_with(|| session.draft.clone());
            }
            session.draft = session
                .drafts_by_date
                .get(&session.target_date)
                .cloned()
                .unwrap_or_default();
        }
        Ok(state)
    }

    fn save(&self, state: &CollaborationState) -> Result<(), String> {
        if state.schema_version != COLLABORATION_SCHEMA_VERSION {
            return Err(
                "Cannot save collaboration history with an unsupported schema version.".into(),
            );
        }
        let parent = self
            .path
            .parent()
            .ok_or_else(|| "Collaboration history has no parent directory.".to_string())?;
        ensure_private_directory(parent, "collaboration history")?;
        let bytes = serde_json::to_vec_pretty(state)
            .map_err(|error| format!("Could not encode collaboration history: {error}"))?;
        let nonce = IDENTIFIER_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let temporary = self
            .path
            .with_extension(format!("tmp-{}-{nonce}", std::process::id()));
        let mut options = OpenOptions::new();
        options.create_new(true).write(true);
        #[cfg(unix)]
        options.mode(0o600);
        let mut file = options
            .open(&temporary)
            .map_err(|error| format!("Could not prepare collaboration history: {error}"))?;
        #[cfg(unix)]
        if let Err(error) = fs::set_permissions(&temporary, std::fs::Permissions::from_mode(0o600))
        {
            let _ = fs::remove_file(&temporary);
            return Err(format!("Could not secure collaboration history: {error}"));
        }
        if let Err(error) = file.write_all(&bytes).and_then(|_| file.sync_all()) {
            let _ = fs::remove_file(&temporary);
            return Err(format!("Could not persist collaboration history: {error}"));
        }
        drop(file);
        if let Err(error) = fs::rename(&temporary, &self.path) {
            let _ = fs::remove_file(&temporary);
            return Err(format!("Could not activate collaboration history: {error}"));
        }
        Ok(())
    }
}

#[derive(Clone)]
pub struct CollaborationApplication {
    store: Arc<dyn CollaborationStore>,
    runtime: Arc<Mutex<Box<dyn AppServerTransport>>>,
    context_source: Arc<dyn CollaborationContextSource>,
    clock: Arc<dyn CollaborationClock>,
    working_directory: PathBuf,
    skill_instructions: Arc<str>,
    state_lock: Arc<Mutex<()>>,
    active_vault_workers: Arc<Mutex<HashSet<String>>>,
    run_cancellations: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
    shutting_down: Arc<AtomicBool>,
    runtime_shutdown: RuntimeShutdownHandle,
}

#[derive(Clone)]
struct QueuedCollaborationTurn {
    vault_key: String,
    session_id: String,
    execution_id: String,
    target_date: String,
    user_text: String,
    queue_order: u64,
}

impl CollaborationApplication {
    pub fn with_adapters(
        store: Arc<dyn CollaborationStore>,
        runtime: Box<dyn AppServerTransport>,
        context_source: Arc<dyn CollaborationContextSource>,
        clock: Arc<dyn CollaborationClock>,
        working_directory: PathBuf,
        skill_instructions: String,
    ) -> Self {
        let runtime_shutdown = runtime.shutdown_handle();
        let application = Self {
            store,
            runtime: Arc::new(Mutex::new(runtime)),
            context_source,
            clock,
            working_directory,
            skill_instructions: Arc::from(skill_instructions),
            state_lock: Arc::new(Mutex::new(())),
            active_vault_workers: Arc::new(Mutex::new(HashSet::new())),
            run_cancellations: Arc::new(Mutex::new(HashMap::new())),
            shutting_down: Arc::new(AtomicBool::new(false)),
            runtime_shutdown,
        };
        let _ = application.mark_incomplete_runs_interrupted();
        application
    }

    pub fn new_local(app_data_dir: PathBuf, workspace_file: PathBuf) -> Self {
        Self::with_adapters(
            Arc::new(FileCollaborationStore::new(
                app_data_dir
                    .join("collaboration")
                    .join("collaboration-v1.json"),
            )),
            Box::new(CodexAppServerRuntime::new(app_data_dir.clone())),
            Arc::new(DashboardContextReader::new(workspace_file)),
            Arc::new(SystemClock),
            app_data_dir.join("collaboration-runtime"),
            COLLABORATION_SKILL.to_owned(),
        )
    }

    pub fn connection(&self) -> RuntimeConnectionView {
        let (selected_model, selected_reasoning_effort) = match self.read_state(|state| {
            (
                state.settings.selected_model.clone(),
                state.settings.selected_reasoning_effort.clone(),
            )
        }) {
            Ok(settings) => settings,
            Err(error) => return RuntimeConnectionView::unavailable(error),
        };
        match self.runtime.lock() {
            Ok(mut runtime) => match runtime.inspect() {
                Ok(mut view) => {
                    view.selected_model = selected_model;
                    view.selected_reasoning_effort = selected_reasoning_effort;
                    view
                }
                Err(error) => RuntimeConnectionView::unavailable(error),
            },
            Err(_) => RuntimeConnectionView::unavailable("Codex runtime state is unavailable."),
        }
    }

    pub fn start_chatgpt_login(&self) -> Result<(), String> {
        self.runtime
            .lock()
            .map_err(|_| "Codex runtime state is unavailable.".to_string())?
            .start_chatgpt_login()
    }

    pub fn shutdown(&self) -> Result<(), String> {
        self.shutting_down.store(true, Ordering::SeqCst);
        if let Ok(cancellations) = self.run_cancellations.try_lock() {
            for cancellation in cancellations.values() {
                cancellation.store(true, Ordering::SeqCst);
            }
        }
        self.runtime_shutdown.request_shutdown();
        Ok(())
    }

    pub fn select_model(&self, model_id: Option<&str>) -> Result<RuntimeConnectionView, String> {
        let mut runtime = self
            .runtime
            .lock()
            .map_err(|_| "Codex runtime state is unavailable.".to_string())?;
        let connection = runtime.inspect()?;
        if let Some(model_id) = model_id {
            if !connection.models.iter().any(|model| model.id == model_id) {
                return Err("The selected model is no longer available. Refresh Codex connection status and choose a listed model.".into());
            }
        }
        drop(runtime);
        self.update_state(|state| {
            if state.settings.selected_model.as_deref() != model_id {
                state.settings.selected_reasoning_effort = None;
            }
            state.settings.selected_model = model_id.map(str::to_owned);
            Ok(())
        })?;
        let mut connection = self.connection();
        connection.selected_model = model_id.map(str::to_owned);
        Ok(connection)
    }

    pub fn select_reasoning_effort(
        &self,
        reasoning_effort: Option<&str>,
    ) -> Result<RuntimeConnectionView, String> {
        let selected_model = self.read_state(|state| state.settings.selected_model.clone())?;
        let mut runtime = self
            .runtime
            .lock()
            .map_err(|_| "Codex runtime state is unavailable.".to_string())?;
        let connection = runtime.inspect()?;
        let model = match selected_model.as_deref() {
            Some(model_id) => connection.models.iter().find(|model| model.id == model_id),
            None => connection.models.iter().find(|model| model.is_default),
        };
        if let Some(effort) = reasoning_effort {
            if !model.is_some_and(|model| {
                model
                    .reasoning_efforts
                    .iter()
                    .any(|available| available == effort)
            }) {
                return Err("The selected reasoning effort is no longer available for this model. Refresh Codex connection status and choose a listed effort.".into());
            }
        }
        drop(runtime);
        self.update_state(|state| {
            state.settings.selected_reasoning_effort = reasoning_effort.map(str::to_owned);
            Ok(())
        })?;
        let mut connection = self.connection();
        connection.selected_reasoning_effort = reasoning_effort.map(str::to_owned);
        Ok(connection)
    }

    pub fn context(&self, date: &str) -> Result<CollaborationContextView, String> {
        validate_date(date)?;
        let vault_key = self.context_source.current_vault_key()?;
        self.context_source.read_context(vault_key.as_deref(), date)
    }

    pub fn workspace(&self, date: &str) -> Result<CollaborationWorkspaceView, String> {
        validate_date(date)?;
        let vault_key = self.context_source.current_vault_key()?;
        let context = self
            .context_source
            .read_context(vault_key.as_deref(), date)?;
        let (selected_model, sessions, active_run, recovery_required) =
            self.read_state(|state| {
                let visible_sessions = state
                    .sessions
                    .iter()
                    .filter(|session| {
                        session.vault_key == vault_key
                            && session
                                .activity_dates
                                .iter()
                                .any(|activity| activity == date)
                    })
                    .map(session_view)
                    .collect::<Vec<_>>();
                (
                    state.settings.selected_model.clone(),
                    visible_sessions,
                    active_run_for_vault(state, vault_key.as_deref()),
                    recovery_required_for_vault(state, vault_key.as_deref()),
                )
            })?;
        Ok(CollaborationWorkspaceView {
            date: date.to_owned(),
            vault_name: context.vault_name.clone(),
            selected_model,
            context,
            sessions,
            active_run,
            recovery_required,
        })
    }

    pub fn create_session(&self, date: &str) -> Result<CollaborationSessionView, String> {
        validate_date(date)?;
        let vault_key = self.context_source.current_vault_key()?.ok_or_else(|| {
            "Choose a Vault in Settings before starting a collaboration session.".to_string()
        })?;
        let now = self.clock.current_timestamp();
        let session = StoredCollaborationSession {
            id: next_identifier("session"),
            vault_key: Some(vault_key),
            title: String::new(),
            created_date: date.to_owned(),
            activity_dates: vec![date.to_owned()],
            last_activity_at: now,
            target_date: date.to_owned(),
            run_id: None,
            run_state: "waiting".into(),
            progress: "Waiting for a message.".into(),
            runtime_thread_id: None,
            messages: Vec::new(),
            draft: String::new(),
            drafts_by_date: HashMap::new(),
        };
        let saved = session.clone();
        self.update_state(|state| {
            state.sessions.insert(0, saved.clone());
            Ok(())
        })?;
        Ok(session_view(&session))
    }

    pub fn list_sessions(&self, date: &str) -> Result<Vec<CollaborationSessionView>, String> {
        validate_date(date)?;
        let vault_key = self.context_source.current_vault_key()?;
        self.read_state(|state| {
            state
                .sessions
                .iter()
                .filter(|session| {
                    session.vault_key == vault_key
                        && session
                            .activity_dates
                            .iter()
                            .any(|activity| activity == date)
                })
                .map(session_view)
                .collect()
        })
    }

    pub fn session(
        &self,
        vault_key: &str,
        session_id: &str,
    ) -> Result<CollaborationSessionView, String> {
        self.read_state(|state| {
            state
                .sessions
                .iter()
                .find(|session| {
                    session.id == session_id && session.vault_key.as_deref() == Some(vault_key)
                })
                .map(session_view)
                .ok_or_else(|| {
                    "This collaboration session is not available in the selected Vault.".into()
                })
        })?
    }

    pub fn session_for_selected_vault(
        &self,
        session_id: &str,
    ) -> Result<CollaborationSessionView, String> {
        let vault_key = self.context_source.current_vault_key()?.ok_or_else(|| {
            "Choose a Vault in Settings before opening collaboration history.".to_string()
        })?;
        self.session(&vault_key, session_id)
    }

    pub fn save_draft_for_selected_vault(
        &self,
        session_id: &str,
        target_date: &str,
        draft: &str,
    ) -> Result<CollaborationSessionView, String> {
        validate_date(target_date)?;
        if draft.chars().count() > MAX_MESSAGE_CHARACTERS {
            return Err(format!(
                "Drafts are limited to {MAX_MESSAGE_CHARACTERS} characters."
            ));
        }
        let vault_key = self.context_source.current_vault_key()?.ok_or_else(|| {
            "Choose a Vault in Settings before saving a collaboration draft.".to_string()
        })?;
        self.update_state(|state| {
            let session = matching_session_mut(state, &vault_key, session_id)?;
            session
                .drafts_by_date
                .insert(target_date.to_owned(), draft.to_owned());
            if session.target_date == target_date {
                session.draft = draft.to_owned();
            }
            Ok(session_view(session))
        })
    }

    pub fn set_target_date_for_selected_vault(
        &self,
        session_id: &str,
        target_date: &str,
    ) -> Result<CollaborationSessionView, String> {
        validate_date(target_date)?;
        let vault_key = self.context_source.current_vault_key()?.ok_or_else(|| {
            "Choose a Vault in Settings before selecting a collaboration target date.".to_string()
        })?;
        let now = self.clock.current_timestamp();
        self.update_state(|state| {
            let session = matching_session_mut(state, &vault_key, session_id)?;
            session.target_date = target_date.to_owned();
            session.draft = session
                .drafts_by_date
                .get(target_date)
                .cloned()
                .unwrap_or_default();
            session.last_activity_at = now;
            if !session
                .activity_dates
                .iter()
                .any(|date| date == target_date)
            {
                session.activity_dates.push(target_date.to_owned());
                session.activity_dates.sort();
            }
            Ok(session_view(session))
        })
    }

    pub fn submit_message_for_selected_vault(
        &self,
        session_id: &str,
        target_date: &str,
        text: &str,
    ) -> Result<CollaborationSessionView, String> {
        let vault_key = self.context_source.current_vault_key()?.ok_or_else(|| {
            "Choose a Vault in Settings before starting a collaboration session.".to_string()
        })?;
        self.submit_message(&vault_key, session_id, target_date, text)
    }

    pub fn submit_message(
        &self,
        vault_key: &str,
        session_id: &str,
        target_date: &str,
        text: &str,
    ) -> Result<CollaborationSessionView, String> {
        validate_date(target_date)?;
        let trimmed = text.trim();
        if trimmed.is_empty() {
            return Err("Enter a message before sending it.".into());
        }
        if trimmed.chars().count() > MAX_MESSAGE_CHARACTERS {
            return Err(format!(
                "Messages are limited to {MAX_MESSAGE_CHARACTERS} characters."
            ));
        }
        if self.context_source.current_vault_key()?.as_deref() != Some(vault_key) {
            return Err(
                "The selected Vault changed. Refresh the workspace before sending this message."
                    .into(),
            );
        }

        let now = self.clock.current_timestamp();
        let message_date = self.clock.current_date();
        let execution_id = next_identifier("run");
        let target_date_owned = target_date.to_owned();
        let text_owned = trimmed.to_owned();
        let session = self.update_state(|state| {
            if state.sessions.iter().any(|candidate| {
                candidate.vault_key.as_deref() == Some(vault_key)
                    && candidate.messages.iter().any(|message| {
                        matches!(message.delivery_state.as_str(), "interrupted" | "stop-unconfirmed")
                            && !message.result_checked
                    })
            }) {
                return Err("A previous Codex request needs a saved-result check before more work can start in this Vault.".into());
            }
            let queue_order = state.next_queue_order.max(1);
            state.next_queue_order = queue_order.saturating_add(1);
            let session = state
                .sessions
                .iter_mut()
                .find(|session| {
                    session.id == session_id
                        && session.vault_key.as_deref() == Some(vault_key)
                })
                .ok_or_else(|| "This collaboration session is not available in the selected Vault.".to_string())?;
            let already_working = matches!(
                session.run_state.as_str(),
                "queued" | "reading" | "thinking" | "stopping" | "stop-unconfirmed"
            );
            session.target_date = target_date_owned.clone();
            session.drafts_by_date.remove(&target_date_owned);
            session.draft = session
                .drafts_by_date
                .get(&target_date_owned)
                .cloned()
                .unwrap_or_default();
            session.last_activity_at = now.clone();
            if !already_working {
                session.run_id = Some(execution_id.clone());
                session.run_state = "queued".into();
                session.progress = "Saved in this Vault's queue; current context will be read when this request starts.".into();
            }
            if session.title.is_empty() {
                session.title = summarize_title(&text_owned);
            }
            for activity_date in [&target_date_owned, &message_date] {
                if !session.activity_dates.iter().any(|date| date == activity_date) {
                    session.activity_dates.push(activity_date.to_owned());
                    session.activity_dates.sort();
                }
            }
            session.draft.clear();
            session.messages.push(StoredCollaborationMessage {
                id: next_identifier("message"),
                role: "user".into(),
                text: text_owned.clone(),
                message_date: message_date.clone(),
                target_date: target_date_owned.clone(),
                created_at: now.clone(),
                execution_id: Some(execution_id.clone()),
                runtime_turn_id: None,
                delivery_state: "queued".into(),
                queue_order: Some(queue_order),
                result_checked: false,
            });
            Ok(session_view(session))
        })?;

        if let Err(error) = self.schedule_vault_worker(vault_key.to_owned()) {
            self.finish_error(vault_key, session_id, &execution_id, error.clone());
            return Err(error);
        }
        Ok(session)
    }

    pub fn stop_run_for_selected_vault(
        &self,
        session_id: &str,
        execution_id: &str,
    ) -> Result<CollaborationSessionView, String> {
        let vault_key = self.context_source.current_vault_key()?.ok_or_else(|| {
            "Choose a Vault in Settings before stopping collaboration work.".to_string()
        })?;
        let (session, cancellation) = self.update_state(|state| {
            let delivery_state = state
                .sessions
                .iter()
                .find(|session| {
                    session.id == session_id && session.vault_key.as_deref() == Some(&vault_key)
                })
                .and_then(|session| {
                    session.messages.iter().find(|message| {
                        message.execution_id.as_deref() == Some(execution_id)
                    })
                })
                .map(|message| message.delivery_state.clone())
                .ok_or_else(|| {
                    "This collaboration request is not available in the selected Vault."
                        .to_string()
                })?;
            let cancellation = if matches!(delivery_state.as_str(), "in-progress" | "stopping") {
                Some(
                    self.run_cancellations
                        .lock()
                        .map_err(|_| "Codex runtime state is unavailable.".to_string())?
                        .get(execution_id)
                        .cloned()
                        .ok_or_else(|| {
                            "The active Codex request could not be reached to confirm a stop."
                                .to_string()
                        })?,
                )
            } else {
                None
            };
            let session = matching_session_mut(state, &vault_key, session_id)?;
            let message = session
                .messages
                .iter_mut()
                .find(|message| message.execution_id.as_deref() == Some(execution_id))
                .ok_or_else(|| "This collaboration request is not available in the selected Vault.".to_string())?;
            match message.delivery_state.as_str() {
                "queued" => {
                    message.delivery_state = "stopped".into();
                    message.result_checked = true;
                    if session.run_id.as_deref() == Some(execution_id) {
                        session.run_state = "stopped".into();
                        session.progress = "The queued request was stopped before it started.".into();
                    }
                }
                "in-progress" | "stopping" => {
                    message.delivery_state = "stopping".into();
                    session.run_id = Some(execution_id.to_owned());
                    session.run_state = "stopping".into();
                    session.progress = "Waiting for Codex to confirm that this turn has stopped. Queued requests will wait.".into();
                }
                "stop-unconfirmed" | "interrupted" => {
                    return Err("Check the saved Codex result before continuing this request.".into());
                }
                _ => return Err("This collaboration request is no longer running.".into()),
            }
            Ok((session_view(session), cancellation))
        })?;
        if let Some(cancellation) = cancellation {
            cancellation.store(true, Ordering::SeqCst);
        }
        Ok(session)
    }

    pub fn requeue_not_started_for_selected_vault(
        &self,
        session_id: &str,
        execution_id: &str,
    ) -> Result<CollaborationSessionView, String> {
        let vault_key = self.context_source.current_vault_key()?.ok_or_else(|| {
            "Choose a Vault in Settings before continuing collaboration work.".to_string()
        })?;
        let (session, queue_order) = self.update_state(|state| {
            let queue_order = state.next_queue_order.max(1);
            state.next_queue_order = queue_order.saturating_add(1);
            let session = matching_session_mut(state, &vault_key, session_id)?;
            let message = session
                .messages
                .iter_mut()
                .find(|message| message.execution_id.as_deref() == Some(execution_id))
                .ok_or_else(|| {
                    "This collaboration request is not available in the selected Vault.".to_string()
                })?;
            if message.delivery_state != "not-started" {
                return Err(
                    "Only a request confirmed as not started can be resumed directly.".into(),
                );
            }
            message.delivery_state = "queued".into();
            message.queue_order = Some(queue_order);
            message.result_checked = false;
            session.run_id = Some(execution_id.to_owned());
            session.run_state = "queued".into();
            session.progress =
                "Continued by the user; waiting for its place in the Vault queue.".into();
            Ok((session_view(session), queue_order))
        })?;
        let _ = queue_order;
        self.schedule_vault_worker(vault_key)?;
        Ok(session)
    }

    pub fn reconcile_run_for_selected_vault(
        &self,
        session_id: &str,
        execution_id: &str,
    ) -> Result<CollaborationSessionView, String> {
        let vault_key = self.context_source.current_vault_key()?.ok_or_else(|| {
            "Choose a Vault in Settings before checking a saved Codex result.".to_string()
        })?;
        let (thread_id, target_date) = self.read_state(|state| {
            let session = state
                .sessions
                .iter()
                .find(|session| {
                    session.id == session_id && session.vault_key.as_deref() == Some(&vault_key)
                })
                .ok_or_else(|| "This collaboration session is not available in the selected Vault.".to_string())?;
            let message = session
                .messages
                .iter()
                .find(|message| message.execution_id.as_deref() == Some(execution_id))
                .ok_or_else(|| "This collaboration request is not available in the selected Vault.".to_string())?;
            if !matches!(message.delivery_state.as_str(), "interrupted" | "stop-unconfirmed")
                || message.result_checked
            {
                return Err(String::from("This request does not need a saved-result check."));
            }
            let thread_id = session.runtime_thread_id.clone().ok_or_else(|| {
                "No Codex thread was recorded for this request. Nothing was replayed; review it before continuing.".to_string()
            })?;
            Ok((thread_id, message.target_date.clone()))
        })??;

        let reconciliation = self
            .runtime
            .lock()
            .map_err(|_| "Codex runtime state is unavailable.".to_string())?
            .reconcile_turn(&thread_id, execution_id)?;
        if self.context_source.current_vault_key()?.as_deref() != Some(&vault_key) {
            return Err("The selected Vault changed while the saved Codex result was being checked. Refresh the workspace before continuing.".into());
        }
        let now = self.clock.current_timestamp();
        let message_date = self.clock.current_date();
        let session = self.update_state(|state| {
            let session = matching_session_mut(state, &vault_key, session_id)?;
            let message = session
                .messages
                .iter_mut()
                .find(|message| message.execution_id.as_deref() == Some(execution_id))
                .ok_or_else(|| "This collaboration request is no longer available.".to_string())?;
            match reconciliation {
                RuntimeRunReconciliation::Completed { ref text, ref runtime_turn_id }
                    if !text.trim().is_empty() => {
                        message.delivery_state = "completed".into();
                        message.runtime_turn_id = Some(runtime_turn_id.clone());
                        message.result_checked = true;
                        session.messages.push(StoredCollaborationMessage {
                            id: next_identifier("message"),
                            role: "assistant".into(),
                            text: text.clone(),
                            message_date: message_date.clone(),
                            target_date: target_date.clone(),
                            created_at: now.clone(),
                            execution_id: Some(execution_id.to_owned()),
                            runtime_turn_id: Some(runtime_turn_id.clone()),
                            delivery_state: "completed".into(),
                            queue_order: None,
                            result_checked: true,
                        });
                        if session.run_id.as_deref() == Some(execution_id) {
                            session.run_state = "completed".into();
                            session.progress = "The saved App Server result was recovered and attached to this request. No turn was resent.".into();
                        }
                    }
                RuntimeRunReconciliation::Completed { .. } => {
                    message.delivery_state = "interrupted".into();
                    message.result_checked = false;
                    if session.run_id.as_deref() == Some(execution_id) {
                        session.run_state = "interrupted".into();
                        session.progress = "The saved turn completed without a text reply that can be restored. Review the App Server conversation before continuing.".into();
                    }
                }
                RuntimeRunReconciliation::Interrupted { ref runtime_turn_id } => {
                    message.delivery_state = "interrupted".into();
                    message.runtime_turn_id = Some(runtime_turn_id.clone());
                    message.result_checked = true;
                    if session.run_id.as_deref() == Some(execution_id) {
                        session.run_state = "interrupted".into();
                        session.progress = "The saved App Server turn is confirmed interrupted. Nothing was replayed; review the conversation before sending another request.".into();
                    }
                }
                RuntimeRunReconciliation::InProgress => {
                    message.delivery_state = "stop-unconfirmed".into();
                    message.result_checked = false;
                    if session.run_id.as_deref() == Some(execution_id) {
                        session.run_state = "stop-unconfirmed".into();
                        session.progress = "Codex still reports this request in progress. No queued request was started; check again after it stops.".into();
                    }
                }
                RuntimeRunReconciliation::NotFound => {
                    message.delivery_state = "interrupted".into();
                    message.result_checked = true;
                    if session.run_id.as_deref() == Some(execution_id) {
                        session.run_state = "interrupted".into();
                        session.progress = "No matching saved App Server turn was found. Nothing was resent; review this request before continuing.".into();
                    }
                }
            }
            session.last_activity_at = now.clone();
            Ok(session_view(session))
        })?;
        if !recovery_required_for_vault_state(
            &self.read_state(|state| state.clone())?,
            Some(&vault_key),
        ) {
            self.schedule_vault_worker(vault_key)?;
        }
        Ok(session)
    }

    fn schedule_vault_worker(&self, vault_key: String) -> Result<(), String> {
        if self.shutting_down.load(Ordering::SeqCst) {
            return Ok(());
        }
        let mut active = self
            .active_vault_workers
            .lock()
            .map_err(|_| "Collaboration queue state is unavailable.".to_string())?;
        if !active.insert(vault_key.clone()) {
            return Ok(());
        }
        drop(active);

        let application = self.clone();
        let worker_vault_key = vault_key.clone();
        if let Err(error) = thread::Builder::new()
            .name("dashboard-collaboration-queue".into())
            .spawn(move || application.drain_vault_queue(&worker_vault_key))
        {
            if let Ok(mut active) = self.active_vault_workers.lock() {
                active.remove(&vault_key);
            }
            return Err(format!("Could not start the collaboration queue: {error}"));
        }
        Ok(())
    }

    fn drain_vault_queue(&self, vault_key: &str) {
        loop {
            if self.shutting_down.load(Ordering::SeqCst) {
                if let Ok(mut active) = self.active_vault_workers.lock() {
                    active.remove(vault_key);
                }
                return;
            }
            match self.next_queued_turn(vault_key) {
                Ok(Some(turn)) => self.run_queued_turn(turn),
                Ok(None) => {
                    let Ok(mut active) = self.active_vault_workers.lock() else {
                        return;
                    };
                    match self.next_queued_turn(vault_key) {
                        Ok(Some(_)) => {
                            drop(active);
                            continue;
                        }
                        _ => {
                            active.remove(vault_key);
                            return;
                        }
                    }
                }
                Err(_) => {
                    if let Ok(mut active) = self.active_vault_workers.lock() {
                        active.remove(vault_key);
                    }
                    return;
                }
            }
        }
    }

    fn next_queued_turn(&self, vault_key: &str) -> Result<Option<QueuedCollaborationTurn>, String> {
        self.read_state(|state| {
            if self.shutting_down.load(Ordering::SeqCst)
                || recovery_required_for_vault_state(state, Some(vault_key))
            {
                return None;
            }
            state
                .sessions
                .iter()
                .filter(|session| session.vault_key.as_deref() == Some(vault_key))
                .flat_map(|session| {
                    session.messages.iter().filter_map(move |message| {
                        if message.role != "user" || message.delivery_state != "queued" {
                            return None;
                        }
                        Some((session, message))
                    })
                })
                .filter_map(|(session, message)| {
                    Some((
                        message.queue_order?,
                        QueuedCollaborationTurn {
                            vault_key: vault_key.to_owned(),
                            session_id: session.id.clone(),
                            execution_id: message.execution_id.clone()?,
                            target_date: message.target_date.clone(),
                            user_text: message.text.clone(),
                            queue_order: message.queue_order?,
                        },
                    ))
                })
                .min_by_key(|(order, _)| *order)
                .map(|(_, turn)| turn)
        })
    }

    fn run_queued_turn(&self, turn: QueuedCollaborationTurn) {
        if self.shutting_down.load(Ordering::SeqCst) {
            return;
        }
        let cancellation = Arc::new(AtomicBool::new(false));
        if let Ok(mut controls) = self.run_cancellations.lock() {
            controls.insert(turn.execution_id.clone(), Arc::clone(&cancellation));
        } else {
            self.finish_error(
                &turn.vault_key,
                &turn.session_id,
                &turn.execution_id,
                "Collaboration stop controls are unavailable.".into(),
            );
            return;
        }
        if self.shutting_down.load(Ordering::SeqCst) {
            cancellation.store(true, Ordering::SeqCst);
            if let Ok(mut controls) = self.run_cancellations.lock() {
                controls.remove(&turn.execution_id);
            }
            return;
        }
        let started = self.mark_queued_turn_started(&turn);
        match started {
            Ok(true) => self.execute_turn(
                &turn.vault_key,
                &turn.session_id,
                &turn.execution_id,
                &turn.target_date,
                &turn.user_text,
                cancellation,
            ),
            Ok(false) => {}
            Err(error) => {
                self.finish_error(&turn.vault_key, &turn.session_id, &turn.execution_id, error)
            }
        }
        if let Ok(mut controls) = self.run_cancellations.lock() {
            controls.remove(&turn.execution_id);
        }
    }

    fn mark_queued_turn_started(&self, turn: &QueuedCollaborationTurn) -> Result<bool, String> {
        if self.shutting_down.load(Ordering::SeqCst) {
            return Ok(false);
        }
        self.update_state(|state| {
            if self.shutting_down.load(Ordering::SeqCst) {
                return Ok(false);
            }
            let session = matching_session_mut(state, &turn.vault_key, &turn.session_id)?;
            let Some(message) = session
                .messages
                .iter_mut()
                .find(|message| message.execution_id.as_deref() == Some(&turn.execution_id))
            else {
                return Ok(false);
            };
            if message.delivery_state != "queued" {
                return Ok(false);
            }
            message.delivery_state = "in-progress".into();
            session.target_date = turn.target_date.clone();
            session.run_id = Some(turn.execution_id.clone());
            session.run_state = "queued".into();
            session.progress = format!(
                "Request {} is starting from the latest available context.",
                turn.queue_order
            );
            session.last_activity_at = self.clock.current_timestamp();
            Ok(true)
        })
    }

    fn execute_turn(
        &self,
        vault_key: &str,
        session_id: &str,
        run_id: &str,
        target_date: &str,
        user_text: &str,
        cancellation: Arc<AtomicBool>,
    ) {
        if cancellation.load(Ordering::SeqCst) {
            if !self.shutting_down.load(Ordering::SeqCst) {
                self.finish_stopped(vault_key, session_id, run_id, None);
            }
            return;
        }
        if let Err(error) = self.set_progress(
            vault_key,
            session_id,
            run_id,
            "reading",
            "Reading current Daily Record, Tasks, and habit context.",
        ) {
            self.finish_error(vault_key, session_id, run_id, error);
            return;
        }

        let context = match self
            .context_source
            .read_context(Some(vault_key), target_date)
        {
            Ok(context) => context,
            Err(error) => {
                self.finish_error(vault_key, session_id, run_id, error);
                return;
            }
        };
        if cancellation.load(Ordering::SeqCst) {
            if !self.shutting_down.load(Ordering::SeqCst) {
                self.finish_stopped(vault_key, session_id, run_id, None);
            }
            return;
        }
        if self
            .context_source
            .current_vault_key()
            .ok()
            .flatten()
            .as_deref()
            != Some(vault_key)
        {
            self.finish_error(
                vault_key,
                session_id,
                run_id,
                "The selected Vault changed while current context was being read. Refresh the workspace and retry.".into(),
            );
            return;
        }
        if let Err(error) = self.set_progress(
            vault_key,
            session_id,
            run_id,
            "thinking",
            "Current context is ready; Codex is preparing a text reply.",
        ) {
            self.finish_error(vault_key, session_id, run_id, error);
            return;
        }

        let mut runtime = match self.runtime.lock() {
            Ok(runtime) => runtime,
            Err(_) => {
                self.finish_error(
                    vault_key,
                    session_id,
                    run_id,
                    "Codex runtime state is unavailable.".into(),
                );
                return;
            }
        };
        let connection = match runtime.inspect() {
            Ok(connection) => connection,
            Err(error) => {
                drop(runtime);
                self.finish_error(vault_key, session_id, run_id, error);
                return;
            }
        };
        if !connection.authenticated || connection.auth_mode.as_deref() != Some("chatgpt") {
            drop(runtime);
            self.finish_error(
                vault_key,
                session_id,
                run_id,
                "Sign in to ChatGPT through the Codex connection in Settings before starting a text turn.".into(),
            );
            return;
        }
        if !connection.read_only_text_turns_available {
            let reason = connection.text_turn_unavailable_reason.unwrap_or_else(|| {
                "This Codex App Server configuration cannot guarantee that built-in filesystem and shell tools are disabled. No model turn was sent.".into()
            });
            drop(runtime);
            self.finish_error(vault_key, session_id, run_id, reason);
            return;
        }
        let state = match self.read_state(|state| state.clone()) {
            Ok(state) => state,
            Err(error) => {
                drop(runtime);
                self.finish_error(vault_key, session_id, run_id, error);
                return;
            }
        };
        let Some(session) = state
            .sessions
            .iter()
            .find(|session| session.id == session_id)
        else {
            drop(runtime);
            return;
        };
        let selected_model = state.settings.selected_model.clone();
        let selected_reasoning_effort = state.settings.selected_reasoning_effort.clone();
        if let Some(model) = selected_model.as_deref() {
            if !connection
                .models
                .iter()
                .any(|candidate| candidate.id == model)
            {
                drop(runtime);
                self.finish_error(
                    vault_key,
                    session_id,
                    run_id,
                    "The selected Codex model is no longer available. Refresh Settings and choose a listed model.".into(),
                );
                return;
            }
        }
        if let Some(effort) = selected_reasoning_effort.as_deref() {
            let model = selected_model
                .as_deref()
                .and_then(|model_id| connection.models.iter().find(|model| model.id == model_id))
                .or_else(|| connection.models.iter().find(|model| model.is_default));
            if !model.is_some_and(|model| {
                model
                    .reasoning_efforts
                    .iter()
                    .any(|available| available == effort)
            }) {
                drop(runtime);
                self.finish_error(
                    vault_key,
                    session_id,
                    run_id,
                    "The selected reasoning effort is no longer available for this model. Refresh Settings and choose a listed effort.".into(),
                );
                return;
            }
        }

        let thread_id = match session.runtime_thread_id.as_deref() {
            Some(thread_id) => runtime
                .resume_thread(thread_id)
                .map(|_| thread_id.to_owned()),
            None => runtime.start_thread(selected_model.as_deref(), &self.skill_instructions),
        };
        let thread_id = match thread_id {
            Ok(thread_id) => thread_id,
            Err(error) => {
                drop(runtime);
                self.finish_error(vault_key, session_id, run_id, error);
                return;
            }
        };
        if let Err(error) = self.save_runtime_thread(vault_key, session_id, run_id, &thread_id) {
            drop(runtime);
            self.finish_error(vault_key, session_id, run_id, error);
            return;
        }
        let selected_vault = match self.context_source.current_vault_key() {
            Ok(selected_vault) => selected_vault,
            Err(error) => {
                drop(runtime);
                self.finish_error(
                    vault_key,
                    session_id,
                    run_id,
                    format!("Could not verify the selected Vault before sending this turn: {error}. No context was sent."),
                );
                return;
            }
        };
        if selected_vault.as_deref() != Some(vault_key) {
            drop(runtime);
            self.finish_error(
                vault_key,
                session_id,
                run_id,
                "The selected Vault changed before the model turn was sent. Refresh the workspace and retry; no context was sent.".into(),
            );
            return;
        }
        if cancellation.load(Ordering::SeqCst) {
            drop(runtime);
            if !self.shutting_down.load(Ordering::SeqCst) {
                self.finish_stopped(vault_key, session_id, run_id, None);
            }
            return;
        }
        let request = RuntimeTurnRequest {
            thread_id,
            execution_id: run_id.to_owned(),
            model: selected_model,
            reasoning_effort: selected_reasoning_effort,
            user_text: user_text.to_owned(),
            context,
            working_directory: self.working_directory.clone(),
        };
        let result = runtime.send_turn_cancellable(request, Arc::clone(&cancellation));
        drop(runtime);

        match result {
            Ok(result) if !result.text.trim().is_empty() => {
                if result.stopped {
                    self.finish_stopped(
                        vault_key,
                        session_id,
                        run_id,
                        result.runtime_turn_id.as_deref(),
                    );
                } else if let Err(error) = self.finish_success(
                    vault_key,
                    session_id,
                    run_id,
                    &result.text,
                    result.runtime_turn_id.as_deref(),
                ) {
                    self.finish_error(vault_key, session_id, run_id, error);
                }
            }
            Ok(result) if result.stopped => self.finish_stopped(
                vault_key,
                session_id,
                run_id,
                result.runtime_turn_id.as_deref(),
            ),
            Ok(_) => self.finish_error(
                vault_key,
                session_id,
                run_id,
                "Codex completed the turn without a text reply.".into(),
            ),
            Err(error) if cancellation.load(Ordering::SeqCst) => {
                self.finish_stop_unconfirmed(vault_key, session_id, run_id, error)
            }
            Err(error) => self.finish_unconfirmed(vault_key, session_id, run_id, error),
        }
    }

    fn set_progress(
        &self,
        vault_key: &str,
        session_id: &str,
        run_id: &str,
        run_state: &str,
        progress: &str,
    ) -> Result<(), String> {
        self.update_state(|state| {
            let session = matching_session_mut(state, vault_key, session_id)?;
            if session.run_id.as_deref() != Some(run_id) {
                return Err("This collaboration run is no longer current.".into());
            }
            if session.run_state != "stopping" {
                session.run_state = run_state.to_owned();
                session.progress = progress.to_owned();
            }
            if let Some(message) = session
                .messages
                .iter_mut()
                .find(|message| message.execution_id.as_deref() == Some(run_id))
            {
                if message.delivery_state != "stopping" {
                    message.delivery_state = "in-progress".into();
                }
            }
            session.last_activity_at = self.clock.current_timestamp();
            Ok(())
        })
    }

    fn save_runtime_thread(
        &self,
        vault_key: &str,
        session_id: &str,
        run_id: &str,
        thread_id: &str,
    ) -> Result<(), String> {
        self.update_state(|state| {
            let session = matching_session_mut(state, vault_key, session_id)?;
            if session.run_id.as_deref() != Some(run_id) {
                return Err("This collaboration run is no longer current.".into());
            }
            session.runtime_thread_id = Some(thread_id.to_owned());
            if let Some(message) = session
                .messages
                .iter_mut()
                .find(|message| message.execution_id.as_deref() == Some(run_id))
            {
                message.delivery_state = "in-progress".into();
            }
            Ok(())
        })
    }

    fn finish_success(
        &self,
        vault_key: &str,
        session_id: &str,
        run_id: &str,
        text: &str,
        runtime_turn_id: Option<&str>,
    ) -> Result<(), String> {
        let now = self.clock.current_timestamp();
        let today = self.clock.current_date();
        self.update_state(|state| {
            let session = matching_session_mut(state, vault_key, session_id)?;
            if session.run_id.as_deref() != Some(run_id) {
                return Err("This collaboration run is no longer current.".into());
            }
            let target_date = session
                .messages
                .iter()
                .find(|message| {
                    message.role == "user" && message.execution_id.as_deref() == Some(run_id)
                })
                .map(|message| message.target_date.clone())
                .unwrap_or_else(|| session.target_date.clone());
            if !session.activity_dates.iter().any(|date| date == &today) {
                session.activity_dates.push(today.clone());
                session.activity_dates.sort();
            }
            session.messages.push(StoredCollaborationMessage {
                id: next_identifier("message"),
                role: "assistant".into(),
                text: text.to_owned(),
                message_date: today,
                target_date,
                created_at: now.clone(),
                execution_id: Some(run_id.to_owned()),
                runtime_turn_id: runtime_turn_id.map(str::to_owned),
                delivery_state: "completed".into(),
                queue_order: None,
                result_checked: true,
            });
            if let Some(message) = session.messages.iter_mut().find(|message| {
                message.execution_id.as_deref() == Some(run_id) && message.role == "user"
            }) {
                message.delivery_state = "completed".into();
                message.runtime_turn_id = runtime_turn_id.map(str::to_owned);
                message.result_checked = true;
            }
            session.last_activity_at = now;
            let next_queued = session
                .messages
                .iter()
                .filter(|message| message.role == "user" && message.delivery_state == "queued")
                .filter_map(|message| Some((message.queue_order?, message.execution_id.as_ref()?)))
                .min_by_key(|(order, _)| *order)
                .map(|(_, execution_id)| execution_id.clone());
            if let Some(next_execution_id) = next_queued {
                session.run_id = Some(next_execution_id);
                session.run_state = "queued".into();
                session.progress =
                    "The previous reply is saved; the next message is waiting in the Vault queue."
                        .into();
            } else {
                session.run_state = "completed".into();
                session.progress =
                    "Codex returned a text reply. No Dashboard data was changed.".into();
            }
            Ok(())
        })
    }

    fn finish_error(&self, vault_key: &str, session_id: &str, run_id: &str, error: String) {
        let now = self.clock.current_timestamp();
        let _ = self.update_state(|state| {
            let session = matching_session_mut(state, vault_key, session_id)?;
            if session.run_id.as_deref() != Some(run_id) {
                return Ok(());
            }
            session.run_state = "error".into();
            session.progress = error;
            if let Some(message) = session
                .messages
                .iter_mut()
                .find(|message| message.execution_id.as_deref() == Some(run_id))
            {
                message.delivery_state = "error".into();
                message.result_checked = true;
            }
            session.last_activity_at = now.clone();
            Ok(())
        });
    }

    fn finish_stopped(
        &self,
        vault_key: &str,
        session_id: &str,
        run_id: &str,
        runtime_turn_id: Option<&str>,
    ) {
        let now = self.clock.current_timestamp();
        let _ = self.update_state(|state| {
            let session = matching_session_mut(state, vault_key, session_id)?;
            let message = session
                .messages
                .iter_mut()
                .find(|message| message.execution_id.as_deref() == Some(run_id))
                .ok_or_else(|| "This collaboration request is no longer available.".to_string())?;
            if !matches!(message.delivery_state.as_str(), "stopping" | "in-progress" | "queued") {
                return Ok(());
            }
            message.delivery_state = "stopped".into();
            message.runtime_turn_id = runtime_turn_id.map(str::to_owned);
            message.result_checked = true;
            if session.run_id.as_deref() == Some(run_id) {
                session.run_state = "stopped".into();
                session.progress = "Codex confirmed this request stopped. No replacement request was sent before confirmation.".into();
                session.last_activity_at = now.clone();
            }
            Ok(())
        });
    }

    fn finish_unconfirmed(&self, vault_key: &str, session_id: &str, run_id: &str, error: String) {
        self.finish_unconfirmed_state(
            vault_key,
            session_id,
            run_id,
            "interrupted",
            format!("The request outcome could not be confirmed: {error}. Check the saved Codex result before continuing; the request will not be replayed."),
        );
    }

    fn finish_stop_unconfirmed(
        &self,
        vault_key: &str,
        session_id: &str,
        run_id: &str,
        error: String,
    ) {
        self.finish_unconfirmed_state(
            vault_key,
            session_id,
            run_id,
            "stop-unconfirmed",
            format!("Codex has not confirmed that this request stopped: {error}. Queued requests remain paused until the saved result is checked."),
        );
    }

    fn finish_unconfirmed_state(
        &self,
        vault_key: &str,
        session_id: &str,
        run_id: &str,
        state_name: &str,
        progress: String,
    ) {
        let now = self.clock.current_timestamp();
        let _ = self.update_state(|state| {
            let session = matching_session_mut(state, vault_key, session_id)?;
            if session.run_id.as_deref() != Some(run_id) {
                return Ok(());
            }
            session.run_state = state_name.to_owned();
            session.progress = progress.clone();
            if let Some(message) = session
                .messages
                .iter_mut()
                .find(|message| message.execution_id.as_deref() == Some(run_id))
            {
                message.delivery_state = state_name.to_owned();
                message.result_checked = false;
            }
            session.last_activity_at = now.clone();
            Ok(())
        });
    }

    fn mark_incomplete_runs_interrupted(&self) -> Result<(), String> {
        self.update_state(|state| {
            for session in &mut state.sessions {
                let was_running = matches!(
                    session.run_state.as_str(),
                    "queued" | "reading" | "thinking" | "stopping" | "stop-unconfirmed"
                );
                if was_running {
                    if let Some(run_id) = session.run_id.clone() {
                        if !session.messages.iter().any(|message| {
                            message.execution_id.as_deref() == Some(&run_id)
                        }) {
                            if let Some(message) = session
                                .messages
                                .iter_mut()
                                .rev()
                                .find(|message| message.role == "user")
                            {
                                message.execution_id = Some(run_id);
                                message.delivery_state = "interrupted".into();
                                message.result_checked = false;
                            }
                        }
                    }
                }
                for message in &mut session.messages {
                    if message.role != "user" {
                        continue;
                    }
                    match message.delivery_state.as_str() {
                        "queued" => {
                            message.delivery_state = "not-started".into();
                            message.result_checked = true;
                        }
                        "in-progress" | "stopping" | "stop-unconfirmed" => {
                            message.delivery_state = "interrupted".into();
                            message.result_checked = false;
                        }
                        _ => {}
                    }
                }
                if was_running {
                    session.run_state = if session.run_state == "stopping" {
                        "stop-unconfirmed".into()
                    } else {
                        "interrupted".into()
                    };
                    session.progress = "The app closed before this request was confirmed. Check the saved App Server result before continuing; no request is replayed automatically.".into();
                }
            }
            Ok(())
        })
    }

    fn update_state<T>(
        &self,
        operation: impl FnOnce(&mut CollaborationState) -> Result<T, String>,
    ) -> Result<T, String> {
        let _guard = self
            .state_lock
            .lock()
            .map_err(|_| "Collaboration history is unavailable.".to_string())?;
        let mut state = self.store.load()?;
        let result = operation(&mut state)?;
        self.store.save(&state)?;
        Ok(result)
    }

    fn read_state<T>(&self, operation: impl FnOnce(&CollaborationState) -> T) -> Result<T, String> {
        let _guard = self
            .state_lock
            .lock()
            .map_err(|_| "Collaboration history is unavailable.".to_string())?;
        Ok(operation(&self.store.load()?))
    }
}

fn matching_session_mut<'a>(
    state: &'a mut CollaborationState,
    vault_key: &str,
    session_id: &str,
) -> Result<&'a mut StoredCollaborationSession, String> {
    state
        .sessions
        .iter_mut()
        .find(|session| session.id == session_id && session.vault_key.as_deref() == Some(vault_key))
        .ok_or_else(|| "This collaboration session is not available in the selected Vault.".into())
}

fn recovery_required_for_vault_state(state: &CollaborationState, vault_key: Option<&str>) -> bool {
    state.sessions.iter().any(|session| {
        session.vault_key.as_deref() == vault_key
            && ((session.run_state == "interrupted"
                && session.run_id.as_ref().is_some_and(|run_id| {
                    session
                        .messages
                        .iter()
                        .find(|message| message.execution_id.as_ref() == Some(run_id))
                        .is_none_or(|message| {
                            message.delivery_state == "interrupted" && !message.result_checked
                        })
                }))
                || session.messages.iter().any(|message| {
                    matches!(
                        message.delivery_state.as_str(),
                        "interrupted" | "stop-unconfirmed"
                    ) && !message.result_checked
                }))
    })
}

fn recovery_required_for_vault(state: &CollaborationState, vault_key: Option<&str>) -> bool {
    recovery_required_for_vault_state(state, vault_key)
}

fn active_run_for_vault(
    state: &CollaborationState,
    vault_key: Option<&str>,
) -> Option<CollaborationRunOwnerView> {
    state
        .sessions
        .iter()
        .filter(|session| {
            session.vault_key.as_deref() == vault_key
                && matches!(
                    session.run_state.as_str(),
                    "queued" | "reading" | "thinking" | "stopping" | "stop-unconfirmed"
                )
        })
        .filter_map(|session| {
            let run_id = session.run_id.as_ref()?;
            let queue_order = session
                .messages
                .iter()
                .find(|message| message.execution_id.as_ref() == Some(run_id))
                .and_then(|message| message.queue_order)
                .unwrap_or(u64::MAX);
            Some((
                queue_order,
                CollaborationRunOwnerView {
                    session_id: session.id.clone(),
                    session_title: session.title.clone(),
                    run_id: run_id.clone(),
                    run_state: session.run_state.clone(),
                    progress: session.progress.clone(),
                },
            ))
        })
        .min_by_key(|(order, _)| *order)
        .map(|(_, run)| run)
}

fn session_view(session: &StoredCollaborationSession) -> CollaborationSessionView {
    CollaborationSessionView {
        id: session.id.clone(),
        title: session.title.clone(),
        created_date: session.created_date.clone(),
        activity_dates: session.activity_dates.clone(),
        last_activity_at: session.last_activity_at.clone(),
        target_date: session.target_date.clone(),
        run_id: session.run_id.clone(),
        run_state: session.run_state.clone(),
        progress: session.progress.clone(),
        runtime_thread_id: session.runtime_thread_id.clone(),
        messages: session
            .messages
            .iter()
            .map(|message| CollaborationMessageView {
                id: message.id.clone(),
                role: message.role.clone(),
                text: message.text.clone(),
                message_date: message.message_date.clone(),
                target_date: message.target_date.clone(),
                created_at: message.created_at.clone(),
                execution_id: message.execution_id.clone(),
                runtime_turn_id: message.runtime_turn_id.clone(),
                delivery_state: message.delivery_state.clone(),
                result_checked: message.result_checked,
            })
            .collect(),
        draft: session
            .drafts_by_date
            .get(&session.target_date)
            .cloned()
            .unwrap_or_else(|| session.draft.clone()),
        drafts_by_date: session.drafts_by_date.clone(),
    }
}

fn summarize_title(text: &str) -> String {
    let title: String = text.chars().take(42).collect();
    if text.chars().count() > 42 {
        format!("{title}…")
    } else {
        title
    }
}

fn next_identifier(prefix: &str) -> String {
    let epoch = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_nanos())
        .unwrap_or_default();
    let sequence = IDENTIFIER_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    format!("{prefix}-{epoch:x}-{sequence:x}")
}

fn validate_date(date: &str) -> Result<(), String> {
    let parts: Vec<_> = date.split('-').collect();
    if parts.len() != 3 || parts[0].len() != 4 || parts[1].len() != 2 || parts[2].len() != 2 {
        return Err("Choose a date in YYYY-MM-DD format.".into());
    }
    let year = parts[0].parse::<u32>().ok();
    let month = parts[1].parse::<u32>().ok();
    let day = parts[2].parse::<u32>().ok();
    let (Some(year), Some(month), Some(day)) = (year, month, day) else {
        return Err("Choose a valid calendar date.".into());
    };
    let leap = year % 4 == 0 && (year % 100 != 0 || year % 400 == 0);
    let days_in_month = match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 if leap => 29,
        2 => 28,
        _ => return Err("Choose a valid calendar date.".into()),
    };
    if day == 0 || day > days_in_month {
        return Err("Choose a valid calendar date.".into());
    }
    Ok(())
}

pub struct DashboardContextReader {
    workspace_file: PathBuf,
}

impl DashboardContextReader {
    pub fn new(workspace_file: PathBuf) -> Self {
        Self { workspace_file }
    }

    fn persistence(&self) -> FileTodayWorkspacePersistence {
        FileTodayWorkspacePersistence::new(self.workspace_file.clone())
    }
}

struct NoVaultPicker;

impl TodayWorkspaceExchange for NoVaultPicker {
    fn select_vault(&self) -> Result<Option<PathBuf>, String> {
        Err("Vault selection is not available from the collaboration reader.".into())
    }
}

impl CollaborationContextSource for DashboardContextReader {
    fn current_vault_key(&self) -> Result<Option<String>, String> {
        let Some(path) = self.persistence().load_selected_vault()? else {
            return Ok(None);
        };
        Ok(Some(vault_key(&path)))
    }

    fn read_context(
        &self,
        expected_vault_key: Option<&str>,
        date: &str,
    ) -> Result<CollaborationContextView, String> {
        validate_date(date)?;
        let persistence = self.persistence();
        let selected_vault = persistence.load_selected_vault()?;
        let current_key = selected_vault.as_deref().map(vault_key);
        if current_key.as_deref() != expected_vault_key {
            return Err("The selected Vault changed before the collaboration context could be read. Refresh the workspace and retry.".into());
        }
        let Some(vault) = selected_vault else {
            return Ok(CollaborationContextView {
                date: date.to_owned(),
                vault_name: None,
                daily_record: unconfigured_pane(
                    "Choose a Vault in Settings to read the Daily Record.",
                ),
                tasks: unconfigured_pane("Choose a Vault in Settings to read current Tasks."),
                habits: unconfigured_pane("Choose a Vault in Settings to read current habits."),
            });
        };
        let today = TodayApplication::new(persistence.clone(), NoVaultPicker, SystemClock);
        let tasks = TaskApplication::new(persistence, SystemClock, FileTaskStore);
        let daily_record = match today.read_date(date) {
            Ok(view) => daily_record_pane(&view),
            Err(error) => error_pane("Daily Record", error),
        };
        let task_context = match tasks.read() {
            Ok(view) => tasks_pane(&view),
            Err(error) => error_pane("Tasks", error),
        };
        let habit_context = match today.habits() {
            Ok(view) => habits_pane(&view, date),
            Err(error) => error_pane("Habits", error),
        };
        Ok(CollaborationContextView {
            date: date.to_owned(),
            vault_name: vault
                .file_name()
                .map(|name| name.to_string_lossy().into_owned()),
            daily_record,
            tasks: task_context,
            habits: habit_context,
        })
    }
}

fn vault_key(path: &Path) -> String {
    let canonical = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    let mut hasher = DefaultHasher::new();
    canonical.hash(&mut hasher);
    format!("vault-{:016x}", hasher.finish())
}

fn unconfigured_pane(message: &str) -> ContextPaneView {
    ContextPaneView {
        state: "unconfigured".into(),
        message: message.to_owned(),
        items: Vec::new(),
    }
}

fn error_pane(label: &str, error: String) -> ContextPaneView {
    ContextPaneView {
        state: "error".into(),
        message: format!("Could not read the current {label}: {error}"),
        items: Vec::new(),
    }
}

fn serialized_state(value: &impl Serialize) -> String {
    serde_json::to_value(value)
        .ok()
        .and_then(|value| value.as_str().map(str::to_owned))
        .unwrap_or_else(|| "unknown".into())
}

fn daily_record_pane(view: &TodayView) -> ContextPaneView {
    let state = serialized_state(&view.state);
    if view.state != TodayState::Ready {
        return ContextPaneView {
            state,
            message: view.message.clone(),
            items: vec![format!(
                "Daily Record state: {} · current record facts are not available",
                serialized_state(&view.state)
            )],
        };
    }
    let mut items = vec![
        format!("Daily Record state: {state}"),
        format!(
            "Record availability: {}",
            serialized_state(&view.daily_record_availability)
        ),
        format!("Morning baseline: {}", view.baseline.message),
    ];
    items.extend(
        view.timeline
            .iter()
            .map(|block| match block.detail.as_deref() {
                Some(detail) if !detail.is_empty() => {
                    format!("Morning · {} · {} · {detail}", block.period, block.title)
                }
                _ => format!("Morning · {} · {}", block.period, block.title),
            }),
    );
    items.extend(view.time_axis.current_arrangement.iter().map(|entry| {
        format!(
            "Current arrangement · {} · {}",
            entry.period.as_deref().unwrap_or("time not specified"),
            entry.text
        )
    }));
    items.extend(
        view.time_axis
            .unlocated_current_arrangement
            .iter()
            .map(|entry| format!("Current arrangement · time not specified · {}", entry.text)),
    );
    items.extend(view.time_axis.confirmed_facts.iter().map(|entry| {
        format!(
            "Confirmed fact · {} · {}",
            entry.period.as_deref().unwrap_or("time not specified"),
            entry.text
        )
    }));
    items.extend(
        view.time_axis
            .unlocated_confirmed_facts
            .iter()
            .map(|entry| format!("Confirmed fact · time not specified · {}", entry.text)),
    );
    for update in &view.daytime.updates {
        items.push(format!("Daytime update · {}", update.title));
        items.extend(
            update
                .observed_facts
                .iter()
                .map(|fact| format!("Observed · {fact}")),
        );
        items.extend(
            update
                .revised_direction
                .iter()
                .map(|direction| format!("Revised direction · {direction}")),
        );
    }
    items.extend(
        view.daytime
            .short_records
            .iter()
            .map(|record| format!("Short record · {}", record.text)),
    );
    items.extend(
        view.evening
            .summary
            .iter()
            .map(|line| format!("Evening review · {line}")),
    );
    items.extend(
        view.evening
            .account
            .iter()
            .map(|line| format!("Evening account · {line}")),
    );
    items.extend(
        view.evening
            .corrections
            .iter()
            .map(|line| format!("Evening correction · {line}")),
    );
    ContextPaneView {
        state: serialized_state(&view.state),
        message: view.message.clone(),
        items,
    }
}

fn tasks_pane(view: &TasksView) -> ContextPaneView {
    if !matches!(view.state, TaskDataState::Ready | TaskDataState::Empty) {
        return ContextPaneView {
            state: task_data_state(view.state),
            message: view.message.clone(),
            items: Vec::new(),
        };
    }
    let list_names: HashMap<&str, &str> = view
        .lists
        .iter()
        .map(|list| (list.id.as_str(), list.name.as_str()))
        .collect();
    let mut items = Vec::new();
    for task in &view.tasks {
        if task.deleted_at.is_some() {
            continue;
        }
        let list = list_names
            .get(task.list_id.as_str())
            .copied()
            .unwrap_or("unknown list");
        let date = task.date.as_deref().unwrap_or("undated");
        let time = task.time.as_deref().unwrap_or("");
        let schedule = if time.is_empty() {
            date.to_owned()
        } else {
            format!("{date} {time}")
        };
        items.push(format!(
            "{} · {} · list: {} · {}",
            task.name,
            serialized_state(&task.state),
            list,
            schedule
        ));
        if let Some(content) = task.content.as_deref() {
            if !content.trim().is_empty() {
                items.push(format!("Task note · {}: {content}", task.name));
            }
        }
    }
    ContextPaneView {
        state: task_data_state(view.state),
        message: view.message.clone(),
        items,
    }
}

fn task_data_state(state: TaskDataState) -> String {
    serialized_state(&state)
}

fn habits_pane(view: &HabitSnapshotView, date: &str) -> ContextPaneView {
    if view.state != HabitSnapshotState::Ready {
        return ContextPaneView {
            state: serialized_state(&view.state),
            message: view.message.clone(),
            items: Vec::new(),
        };
    }
    let mut items = vec![format!(
        "Known weekly completions: {} / {} · {}",
        view.summary.known_completions, view.summary.target_completions, view.summary.coverage_note
    )];
    for habit in view.habits.iter().filter(|habit| habit.active) {
        match habit.cell(date) {
            Some(cell) => {
                items.push(format!(
                    "{} · goal: {} · {date}: {} · coverage: {} · recorded: {} · counts as completion: {}",
                    habit.name,
                    habit.goal_label,
                    serialized_state(&cell.status),
                    cell.coverage,
                    cell.has_record,
                    cell.counts_as_completion
                ));
                if let Some(actual_time) = cell.actual_time_label.as_deref() {
                    items.push(format!(
                        "{} · recorded actual time: {actual_time}",
                        habit.name
                    ));
                }
                for record in &cell.local_records {
                    items.push(format!(
                        "{} · {}: {}",
                        habit.name, record.source_label, record.text
                    ));
                }
            }
            None => items.push(format!(
                "{} · goal: {} · {date}: no cell in the current snapshot range; status unknown",
                habit.name, habit.goal_label
            )),
        }
    }
    ContextPaneView {
        state: serialized_state(&view.state),
        message: view.message.clone(),
        items,
    }
}

pub struct CodexAppServerRuntime {
    app_data_dir: PathBuf,
    codex_home_dir: PathBuf,
    working_directory: PathBuf,
    executable: Option<PathBuf>,
    version: Option<String>,
    capability_probe_version: Option<(PathBuf, String)>,
    restricted_read_sandbox_policy: Option<Value>,
    text_turn_unavailable_reason: Option<String>,
    client: Option<StdioJsonlClient>,
    shutdown_handle: RuntimeShutdownHandle,
}

fn generate_restricted_read_policy(
    executable: &Path,
    codex_home_dir: &Path,
    app_data_dir: &Path,
    working_directory: &Path,
) -> Result<Option<Value>, String> {
    ensure_private_codex_home(codex_home_dir)?;
    ensure_empty_working_directory(working_directory)?;
    fs::create_dir_all(app_data_dir)
        .map_err(|error| format!("Could not prepare the local protocol check: {error}"))?;
    let nonce = IDENTIFIER_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let schema_directory = app_data_dir.join(format!(
        ".collaboration-protocol-schema-{}-{nonce}",
        std::process::id()
    ));
    fs::create_dir(&schema_directory)
        .map_err(|error| format!("Could not create the local protocol check directory: {error}"))?;
    let generated = isolated_codex_command(executable, codex_home_dir)
        .args(["app-server", "generate-json-schema", "--out"])
        .arg(&schema_directory)
        .output()
        .map_err(|error| format!("Could not inspect the local App Server protocol: {error}"));
    let result = match generated {
        Ok(output) if output.status.success() => (|| {
            let schema_path = schema_directory.join("v2/TurnStartParams.json");
            let bytes = fs::read(&schema_path).map_err(|error| {
                format!("The CLI did not generate v2/TurnStartParams.json: {error}")
            })?;
            let schema: Value = serde_json::from_slice(&bytes).map_err(|error| {
                format!("The generated App Server turn schema is invalid: {error}")
            })?;
            Ok(restricted_read_policy_from_schema(
                &schema,
                working_directory,
            ))
        })(),
        Ok(output) => Err(format!(
            "The CLI could not generate its App Server schema ({}): {}",
            output.status,
            String::from_utf8_lossy(&output.stderr).trim()
        )),
        Err(error) => Err(error),
    };
    let _ = fs::remove_dir_all(&schema_directory);
    result
}

fn restricted_read_policy_from_schema(schema: &Value, working_directory: &Path) -> Option<Value> {
    let sandbox = schema
        .pointer("/definitions/SandboxPolicy/oneOf")?
        .as_array()?
        .iter()
        .find(|variant| {
            variant
                .pointer("/properties/type/enum")
                .and_then(Value::as_array)
                .is_some_and(|values| values.iter().any(|value| value == "readOnly"))
        })?;
    if sandbox
        .pointer("/properties/networkAccess/type")
        .and_then(Value::as_str)
        != Some("boolean")
    {
        return None;
    }
    let access_schema = sandbox.pointer("/properties/access")?;
    let access_schema = resolve_schema_reference(schema, access_schema)?;
    let access_type = access_schema
        .pointer("/properties/type/enum")
        .and_then(Value::as_array)?;
    if !access_type.iter().any(|value| value == "restricted") {
        return None;
    }
    if access_schema
        .pointer("/properties/readableRoots/items/type")
        .and_then(Value::as_str)
        != Some("string")
        || access_schema
            .pointer("/properties/includePlatformDefaults/type")
            .and_then(Value::as_str)
            != Some("boolean")
    {
        return None;
    }

    Some(json!({
        "type": "readOnly",
        "networkAccess": false,
        "access": {
            "type": "restricted",
            "includePlatformDefaults": false,
            "readableRoots": [working_directory.to_string_lossy()]
        }
    }))
}

fn resolve_schema_reference<'a>(root: &'a Value, schema: &'a Value) -> Option<&'a Value> {
    match schema.get("$ref").and_then(Value::as_str) {
        Some(reference) => root.pointer(reference.strip_prefix('#')?),
        None => Some(schema),
    }
}

#[cfg(test)]
mod capability_tests {
    use super::{
        ensure_empty_working_directory, ensure_private_codex_home, ensure_private_directory,
        isolated_codex_command, restricted_read_policy_from_schema, ISOLATED_CODEX_CONFIG,
    };
    use serde_json::{json, Value};
    use std::fs;
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn restricted_read_policy_requires_the_verified_access_fields() {
        let unsupported = json!({
            "definitions": {
                "SandboxPolicy": {
                    "oneOf": [{ "properties": { "type": { "enum": ["readOnly"] } } }]
                }
            }
        });
        assert_eq!(
            restricted_read_policy_from_schema(&unsupported, Path::new("/isolated")),
            None,
            "legacy read-only sandbox without restricted roots must fail closed"
        );
    }

    #[test]
    fn restricted_read_policy_limits_roots_and_disables_network_when_supported() {
        let supported = json!({
            "definitions": {
                "SandboxPolicy": {
                    "oneOf": [{
                        "properties": {
                            "type": { "enum": ["readOnly"] },
                            "networkAccess": { "type": "boolean" },
                            "access": { "$ref": "#/definitions/ReadOnlyAccess" }
                        }
                    }]
                },
                "ReadOnlyAccess": {
                    "properties": {
                        "type": { "enum": ["restricted", "full"] },
                        "includePlatformDefaults": { "type": "boolean" },
                        "readableRoots": { "type": "array", "items": { "type": "string" } },
                    }
                }
            }
        });
        let expected = json!({
            "type": "readOnly",
            "networkAccess": false,
            "access": {
                "type": "restricted",
                "includePlatformDefaults": false,
                "readableRoots": ["/isolated"]
            }
        });
        assert_eq!(
            restricted_read_policy_from_schema(&supported, Path::new("/isolated")),
            Some(expected)
        );

        let without_network_toggle: Value = json!({
            "definitions": {
                "SandboxPolicy": {
                    "oneOf": [{
                        "properties": {
                            "type": { "enum": ["readOnly"] },
                            "access": { "$ref": "#/definitions/ReadOnlyAccess" }
                        }
                    }]
                },
                "ReadOnlyAccess": {
                    "properties": {
                        "type": { "enum": ["restricted"] },
                        "includePlatformDefaults": { "type": "boolean" },
                        "readableRoots": { "type": "array", "items": { "type": "string" } }
                    }
                }
            }
        });
        assert_eq!(
            restricted_read_policy_from_schema(&without_network_toggle, Path::new("/isolated")),
            None,
            "network isolation must also be explicitly controllable"
        );
    }

    #[test]
    fn app_owned_profile_is_private_and_runtime_environment_is_isolated() {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock should be after epoch")
            .as_nanos();
        let root = std::env::temp_dir().join(format!(
            "personal-dashboard-codex-profile-{}-{nonce}",
            std::process::id()
        ));
        let profile = root.join("codex-profile");
        let working_directory = root.join("collaboration-runtime");
        fs::create_dir_all(&root).expect("temporary test directory should be created");
        ensure_private_codex_home(&profile).expect("app-owned Codex profile should be secured");
        ensure_empty_working_directory(&working_directory)
            .expect("runtime directory should be secured and empty");

        let config = profile.join("config.toml");
        assert_eq!(fs::read_to_string(&config).unwrap(), ISOLATED_CODEX_CONFIG);
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                fs::metadata(&profile).unwrap().permissions().mode() & 0o777,
                0o700
            );
            assert_eq!(
                fs::metadata(&working_directory)
                    .unwrap()
                    .permissions()
                    .mode()
                    & 0o777,
                0o700
            );
            assert_eq!(
                fs::metadata(&config).unwrap().permissions().mode() & 0o777,
                0o600
            );
        }
        assert!(ensure_empty_working_directory(&working_directory).is_ok());
        fs::write(working_directory.join("unexpected.txt"), "synthetic only").unwrap();
        assert!(ensure_empty_working_directory(&working_directory)
            .unwrap_err()
            .contains("not empty"));

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            use std::process::Stdio;

            let probe = root.join("environment-probe.sh");
            fs::write(
                &probe,
                "#!/bin/sh\nif [ \"${OPENAI_API_KEY+x}\" = x ]; then printf inherited; else printf isolated; fi\nprintf '|%s|%s' \"$CODEX_HOME\" \"$HOME\"\n",
            )
            .unwrap();
            fs::set_permissions(&probe, fs::Permissions::from_mode(0o700)).unwrap();
            let output = isolated_codex_command(&probe, &profile)
                .stdout(Stdio::piped())
                .output()
                .expect("environment probe should run");
            assert!(output.status.success());
            assert_eq!(
                String::from_utf8(output.stdout).unwrap(),
                format!("isolated|{}|{}", profile.display(), profile.display())
            );
        }

        fs::remove_dir_all(PathBuf::from(root)).unwrap();
    }

    #[cfg(unix)]
    #[test]
    fn app_owned_profile_refuses_a_redirected_config_file() {
        use std::os::unix::fs::symlink;

        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock should be after epoch")
            .as_nanos();
        let root = std::env::temp_dir().join(format!(
            "personal-dashboard-codex-config-link-{}-{nonce}",
            std::process::id()
        ));
        let profile = root.join("codex-profile");
        let target = root.join("unrelated-config.toml");
        fs::create_dir_all(&root).unwrap();
        ensure_private_directory(&profile, "test Codex profile").unwrap();
        fs::write(&target, "preserve this unrelated file").unwrap();
        symlink(&target, profile.join("config.toml")).unwrap();

        assert!(ensure_private_codex_home(&profile)
            .unwrap_err()
            .contains("regular file"));
        assert_eq!(
            fs::read_to_string(&target).unwrap(),
            "preserve this unrelated file"
        );
        fs::remove_dir_all(root).unwrap();
    }
}

impl CodexAppServerRuntime {
    pub fn new(app_data_dir: PathBuf) -> Self {
        Self {
            working_directory: app_data_dir.join("collaboration-runtime"),
            codex_home_dir: app_data_dir.join("codex-profile"),
            app_data_dir,
            executable: None,
            version: None,
            capability_probe_version: None,
            restricted_read_sandbox_policy: None,
            text_turn_unavailable_reason: None,
            client: None,
            shutdown_handle: RuntimeShutdownHandle::default(),
        }
    }

    fn inspect_read_only_capability(&mut self, executable: &Path, version: &str) {
        if self.capability_probe_version.as_ref()
            == Some(&(executable.to_path_buf(), version.to_owned()))
        {
            return;
        }
        self.capability_probe_version = Some((executable.to_path_buf(), version.to_owned()));
        self.restricted_read_sandbox_policy = None;
        let capability = generate_restricted_read_policy(
            executable,
            &self.codex_home_dir,
            &self.app_data_dir,
            &self.working_directory,
        );
        match capability {
            Ok(Some(policy)) => {
                self.restricted_read_sandbox_policy = Some(policy);
                self.text_turn_unavailable_reason = None;
            }
            Ok(None) => {
                self.text_turn_unavailable_reason = Some(format!(
                    "Installed {version} does not advertise the restricted read-only access fields this app requires. Text turns are blocked; no user message is sent to the model."
                ));
            }
            Err(error) => {
                self.text_turn_unavailable_reason = Some(format!(
                    "Could not verify restricted read-only access for {version}: {error}. Text turns are blocked; no user message is sent to the model."
                ));
            }
        }
    }

    fn ensure_client(&mut self) -> Result<&mut StdioJsonlClient, String> {
        if self.shutdown_handle.is_requested() {
            return Err("The Codex App Server is shutting down.".into());
        }
        ensure_empty_working_directory(&self.working_directory)?;
        ensure_private_codex_home(&self.codex_home_dir)?;
        let executable = discover_codex_cli()?;
        if self.executable.as_deref() != Some(executable.as_path()) || self.client.is_none() {
            self.client = None;
            let output = isolated_codex_command(&executable, &self.codex_home_dir)
                .arg("--version")
                .output()
                .map_err(|error| format!("Could not read the Codex CLI version: {error}"))?;
            if !output.status.success() {
                return Err("Codex CLI could not report its version. Reinstall or update Codex CLI and retry.".into());
            }
            let version = String::from_utf8_lossy(&output.stdout).trim().to_owned();
            if version.is_empty() {
                return Err(
                    "Codex CLI returned an empty version. Reinstall or update Codex CLI and retry."
                        .into(),
                );
            }
            self.version = Some(version);
            self.client = Some(StdioJsonlClient::spawn(
                &executable,
                &self.codex_home_dir,
                self.shutdown_handle.clone(),
            )?);
            self.executable = Some(executable);
        }
        let client = self.client.as_mut().expect("client was started above");
        if !client.initialized {
            client.initialize()?;
        }
        Ok(client)
    }

    fn identity(&mut self) -> Result<(PathBuf, String), String> {
        ensure_empty_working_directory(&self.working_directory)?;
        ensure_private_codex_home(&self.codex_home_dir)?;
        let executable = discover_codex_cli()?;
        if self.executable.as_deref() != Some(executable.as_path()) || self.version.is_none() {
            self.executable = Some(executable.clone());
            let output = isolated_codex_command(&executable, &self.codex_home_dir)
                .arg("--version")
                .output()
                .map_err(|error| format!("Could not read the Codex CLI version: {error}"))?;
            if !output.status.success() {
                return Err("Codex CLI could not report its version. Reinstall or update Codex CLI and retry.".into());
            }
            let version = String::from_utf8_lossy(&output.stdout).trim().to_owned();
            if version.is_empty() {
                return Err(
                    "Codex CLI returned an empty version. Reinstall or update Codex CLI and retry."
                        .into(),
                );
            }
            self.version = Some(version);
        }
        Ok((executable, self.version.clone().unwrap_or_default()))
    }
}

impl AppServerTransport for CodexAppServerRuntime {
    fn shutdown_handle(&self) -> RuntimeShutdownHandle {
        self.shutdown_handle.clone()
    }

    fn inspect(&mut self) -> Result<RuntimeConnectionView, String> {
        let (executable, version) = self.identity()?;
        self.inspect_read_only_capability(&executable, &version);
        let client = self.ensure_client()?;
        let account = client.request("account/read", json!({ "refreshToken": false }))?;
        let model_list = client.request(
            "model/list",
            json!({ "limit": 100, "includeHidden": false }),
        )?;
        let account = account.get("account").filter(|account| !account.is_null());
        let auth_mode = account
            .and_then(|account| account.get("type"))
            .and_then(Value::as_str)
            .map(str::to_owned);
        let account_email = account
            .and_then(|account| account.get("email"))
            .and_then(Value::as_str)
            .map(str::to_owned);
        let plan_type = account
            .and_then(|account| account.get("planType"))
            .and_then(Value::as_str)
            .map(str::to_owned);
        let models = model_list
            .get("data")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
            .filter_map(|model| {
                let id = model
                    .get("id")
                    .or_else(|| model.get("model"))
                    .and_then(Value::as_str)?;
                if model.get("hidden").and_then(Value::as_bool) == Some(true) {
                    return None;
                }
                Some(ModelOptionView {
                    id: id.to_owned(),
                    display_name: model
                        .get("displayName")
                        .and_then(Value::as_str)
                        .unwrap_or(id)
                        .to_owned(),
                    default_reasoning_effort: model
                        .get("defaultReasoningEffort")
                        .and_then(Value::as_str)
                        .map(str::to_owned),
                    reasoning_efforts: model
                        .get("supportedReasoningEfforts")
                        .and_then(Value::as_array)
                        .into_iter()
                        .flatten()
                        .filter_map(|effort| {
                            effort
                                .get("reasoningEffort")
                                .and_then(Value::as_str)
                                .map(str::to_owned)
                        })
                        .collect(),
                    is_default: model
                        .get("isDefault")
                        .and_then(Value::as_bool)
                        .unwrap_or(false),
                })
            })
            .collect();
        Ok(RuntimeConnectionView {
            executable_path: Some(executable.to_string_lossy().into_owned()),
            version: Some(version),
            experimental: true,
            read_only_text_turns_available: self.restricted_read_sandbox_policy.is_some(),
            text_turn_unavailable_reason: self.text_turn_unavailable_reason.clone(),
            authenticated: auth_mode.is_some(),
            auth_mode,
            account_email,
            plan_type,
            models,
            selected_model: None,
            selected_reasoning_effort: None,
            error: None,
        })
    }

    fn start_chatgpt_login(&mut self) -> Result<(), String> {
        let auth_url = self
            .ensure_client()?
            .request(
                "account/login/start",
                json!({
                    "type": "chatgpt",
                    "useHostedLoginSuccessPage": true,
                    "appBrand": "chatgpt"
                }),
            )?
            .get("authUrl")
            .and_then(Value::as_str)
            .ok_or_else(|| "Codex App Server did not provide a ChatGPT sign-in URL. Refresh the connection status and try again.".to_string())?
            .to_owned();
        open_chatgpt_login(&auth_url)
    }

    fn start_thread(&mut self, model: Option<&str>, instructions: &str) -> Result<String, String> {
        if self.restricted_read_sandbox_policy.is_none() {
            return Err(self.text_turn_unavailable_reason.clone().unwrap_or_else(|| {
                "Restricted read-only access has not been verified. No Codex thread was started.".into()
            }));
        }
        ensure_empty_working_directory(&self.working_directory)?;
        let working_directory = self.working_directory.to_string_lossy().into_owned();
        let client = self.ensure_client()?;
        let result = client.request(
            "thread/start",
            json!({
                "model": model,
                "cwd": working_directory,
                "approvalPolicy": "never",
                "sandbox": "readOnly",
                "developerInstructions": instructions,
                "serviceName": "personal-dashboard"
            }),
        )?;
        result
            .get("thread")
            .and_then(|thread| thread.get("id"))
            .and_then(Value::as_str)
            .map(str::to_owned)
            .ok_or_else(|| "Codex App Server did not return a thread id.".into())
    }

    fn resume_thread(&mut self, thread_id: &str) -> Result<(), String> {
        if self.restricted_read_sandbox_policy.is_none() {
            return Err(self.text_turn_unavailable_reason.clone().unwrap_or_else(|| {
                "Restricted read-only access has not been verified. No Codex thread was resumed.".into()
            }));
        }
        ensure_empty_working_directory(&self.working_directory)?;
        let working_directory = self.working_directory.to_string_lossy().into_owned();
        self.ensure_client()?.request(
            "thread/resume",
            json!({
                "threadId": thread_id,
                "cwd": working_directory,
                "sandbox": "readOnly",
                "approvalPolicy": "never"
            }),
        )?;
        Ok(())
    }

    fn send_turn(&mut self, request: RuntimeTurnRequest) -> Result<RuntimeTurnResult, String> {
        self.send_turn_cancellable(request, Arc::new(AtomicBool::new(false)))
    }

    fn send_turn_cancellable(
        &mut self,
        request: RuntimeTurnRequest,
        cancel_requested: Arc<AtomicBool>,
    ) -> Result<RuntimeTurnResult, String> {
        if self.restricted_read_sandbox_policy.is_none() {
            return Err(self
                .text_turn_unavailable_reason
                .clone()
                .unwrap_or_else(|| {
                    "Restricted read-only access has not been verified. No model turn was sent."
                        .into()
                }));
        }
        let sandbox_policy = self
            .restricted_read_sandbox_policy
            .clone()
            .expect("checked above");
        if request.working_directory != self.working_directory {
            return Err("The Codex working directory did not match the isolated collaboration directory. No model turn was sent.".into());
        }
        ensure_empty_working_directory(&self.working_directory)?;
        let context = serde_json::to_string_pretty(&json!({
            "dashboardExecutionId": request.execution_id,
            "context": request.context,
        }))
        .map_err(|error| format!("Could not prepare current Dashboard context: {error}"))?;
        let input_text = format!(
            "{}\n\n--- Current read-only Personal Dashboard context for {} ---\n{}\n--- End current Dashboard context ---\nUse only supplied current context. Use Dashboard facts only when that section is ready; an empty Tasks section is a confirmed empty list. For missing, stale, retained, unconfigured, or error sections, say the current data is unavailable and do not fill gaps from prior messages.",
            request.user_text, request.context.date, context
        );
        let working_directory = self.working_directory.to_string_lossy().into_owned();
        let client = self.ensure_client()?;
        let mut params = json!({
            "threadId": request.thread_id,
            "input": [{ "type": "text", "text": input_text }],
            "model": request.model,
            "cwd": working_directory,
            "approvalPolicy": "never",
            "sandboxPolicy": sandbox_policy
        });
        if let Some(effort) = request.reasoning_effort {
            params["effort"] = json!(effort);
        }
        let started = client.request("turn/start", params)?;
        let turn_id = started
            .get("turn")
            .and_then(|turn| turn.get("id"))
            .and_then(Value::as_str)
            .ok_or_else(|| "Codex App Server did not start the requested turn.".to_string())?;
        let (text, stopped) =
            client.wait_for_turn(&request.thread_id, turn_id, &cancel_requested)?;
        Ok(RuntimeTurnResult {
            text,
            runtime_turn_id: Some(turn_id.to_owned()),
            stopped,
        })
    }

    fn reconcile_turn(
        &mut self,
        thread_id: &str,
        execution_id: &str,
    ) -> Result<RuntimeRunReconciliation, String> {
        ensure_empty_working_directory(&self.working_directory)?;
        let result = self.ensure_client()?.request(
            "thread/read",
            json!({ "threadId": thread_id, "includeTurns": true }),
        )?;
        let thread = result
            .get("thread")
            .filter(|thread| thread.get("id").and_then(Value::as_str) == Some(thread_id))
            .ok_or_else(|| {
                "Codex App Server returned a different thread while checking the saved result."
                    .to_string()
            })?;
        let execution_marker = format!("\"dashboardExecutionId\": \"{execution_id}\"");
        for turn in thread
            .get("turns")
            .and_then(Value::as_array)
            .into_iter()
            .flatten()
        {
            let items = turn.get("items").and_then(Value::as_array);
            let matches_execution = items.into_iter().flatten().any(|item| {
                item.get("type").and_then(Value::as_str) == Some("userMessage")
                    && item
                        .get("content")
                        .and_then(Value::as_array)
                        .into_iter()
                        .flatten()
                        .filter_map(|part| part.get("text").and_then(Value::as_str))
                        .any(|text| text.contains(&execution_marker))
            });
            if !matches_execution {
                continue;
            }
            let runtime_turn_id = turn
                .get("id")
                .and_then(Value::as_str)
                .ok_or_else(|| "Codex App Server returned a turn without an id.".to_string())?
                .to_owned();
            let status = turn
                .get("status")
                .and_then(Value::as_str)
                .unwrap_or("unknown");
            return match status {
                "completed" => {
                    let text = items
                        .into_iter()
                        .flatten()
                        .filter(|item| {
                            item.get("type").and_then(Value::as_str) == Some("agentMessage")
                        })
                        .filter_map(|item| item.get("text").and_then(Value::as_str))
                        .collect::<Vec<_>>()
                        .join("\n");
                    if text.trim().is_empty() {
                        Ok(RuntimeRunReconciliation::Completed {
                            text: String::new(),
                            runtime_turn_id,
                        })
                    } else {
                        Ok(RuntimeRunReconciliation::Completed {
                            text,
                            runtime_turn_id,
                        })
                    }
                }
                "inProgress" => Ok(RuntimeRunReconciliation::InProgress),
                "interrupted" => Ok(RuntimeRunReconciliation::Interrupted { runtime_turn_id }),
                "failed" => Ok(RuntimeRunReconciliation::Interrupted { runtime_turn_id }),
                _ => Err(format!(
                    "Codex App Server returned an unknown saved turn status `{status}`."
                )),
            };
        }
        Ok(RuntimeRunReconciliation::NotFound)
    }
}

fn discover_codex_cli() -> Result<PathBuf, String> {
    let mut candidates = Vec::new();
    if let Some(path) = std::env::var_os("PATH") {
        candidates.extend(std::env::split_paths(&path).map(|directory| directory.join("codex")));
    }
    if let Some(home) = std::env::var_os("HOME") {
        candidates.push(PathBuf::from(home).join(".local/bin/codex"));
    }
    candidates.extend([
        PathBuf::from("/opt/homebrew/bin/codex"),
        PathBuf::from("/usr/local/bin/codex"),
    ]);
    candidates.dedup();
    for candidate in candidates {
        if candidate.is_file() {
            return candidate.canonicalize().map_err(|error| {
                format!(
                    "Could not resolve Codex CLI at {}: {error}",
                    candidate.display()
                )
            });
        }
    }
    Err("Codex CLI was not found. Install Codex CLI or add its `codex` executable to PATH, then refresh the connection.".into())
}

#[cfg(target_os = "macos")]
fn open_chatgpt_login(url: &str) -> Result<(), String> {
    if !(url.starts_with("https://chatgpt.com/") || url.starts_with("https://auth.openai.com/")) {
        return Err(
            "Codex returned an unexpected sign-in URL. Refresh the connection and try again."
                .into(),
        );
    }
    Command::new("/usr/bin/open")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|error| format!("Could not open the ChatGPT sign-in page: {error}"))
}

#[cfg(not(target_os = "macos"))]
fn open_chatgpt_login(_url: &str) -> Result<(), String> {
    Err("Opening the Codex-managed ChatGPT sign-in page is currently supported by the Mac app only.".into())
}

struct StdioJsonlClient {
    child: Arc<Mutex<Child>>,
    stdin: ChildStdin,
    output: mpsc::Receiver<Result<String, String>>,
    next_id: u64,
    initialized: bool,
    pending_messages: VecDeque<Value>,
}

impl StdioJsonlClient {
    fn spawn(
        executable: &Path,
        codex_home_dir: &Path,
        shutdown_handle: RuntimeShutdownHandle,
    ) -> Result<Self, String> {
        ensure_private_codex_home(codex_home_dir)?;
        let mut child = isolated_codex_command(executable, codex_home_dir)
            .arg("app-server")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|error| {
                format!("Could not start the isolated local Codex App Server: {error}")
            })?;
        let stdin = child
            .stdin
            .take()
            .ok_or_else(|| "Codex App Server stdin was unavailable.".to_string())?;
        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Codex App Server stdout was unavailable.".to_string())?;
        let child = Arc::new(Mutex::new(child));
        shutdown_handle.register_child(Arc::clone(&child));
        let (sender, output) = mpsc::channel();
        if let Err(error) = thread::Builder::new()
            .name("codex-app-server-stdout".into())
            .spawn(move || {
                for line in BufReader::new(stdout).lines() {
                    match line {
                        Ok(line) => {
                            if sender.send(Ok(line)).is_err() {
                                break;
                            }
                        }
                        Err(error) => {
                            let _ = sender.send(Err(format!(
                                "Could not read Codex App Server output: {error}"
                            )));
                            break;
                        }
                    }
                }
            })
        {
            if let Ok(mut child) = child.lock() {
                let _ = child.kill();
                let _ = child.wait();
            }
            return Err(format!(
                "Could not monitor Codex App Server output: {error}"
            ));
        }
        Ok(Self {
            child,
            stdin,
            output,
            next_id: 1,
            initialized: false,
            pending_messages: VecDeque::new(),
        })
    }

    fn initialize(&mut self) -> Result<(), String> {
        self.request(
            "initialize",
            json!({
                "clientInfo": {
                    "name": "personal_dashboard",
                    "title": "Personal Dashboard",
                    "version": env!("CARGO_PKG_VERSION")
                }
            }),
        )?;
        self.notify("initialized", json!({}))?;
        self.initialized = true;
        Ok(())
    }

    fn request(&mut self, method: &str, params: Value) -> Result<Value, String> {
        if !self.initialized && method != "initialize" {
            return Err("Codex App Server connection has not been initialized.".into());
        }
        let request_id = self.next_id;
        self.next_id += 1;
        self.write_json(&json!({ "id": request_id, "method": method, "params": params }))?;
        loop {
            let value = self.receive_value(APP_SERVER_REQUEST_TIMEOUT)?;
            if value.get("id").and_then(Value::as_u64) == Some(request_id) {
                if let Some(error) = value.get("error") {
                    return Err(format!(
                        "Codex App Server rejected {method}: {}",
                        error
                            .get("message")
                            .and_then(Value::as_str)
                            .unwrap_or("unknown protocol error")
                    ));
                }
                return value
                    .get("result")
                    .cloned()
                    .ok_or_else(|| format!("Codex App Server returned no result for {method}."));
            }
            let server_request =
                value.get("id").is_some() && value.get("method").and_then(Value::as_str).is_some();
            self.reject_server_request(&value)?;
            if !server_request {
                self.pending_messages.push_back(value);
            }
        }
    }

    fn notify(&mut self, method: &str, params: Value) -> Result<(), String> {
        self.write_json(&json!({ "method": method, "params": params }))
    }

    fn write_json(&mut self, value: &Value) -> Result<(), String> {
        serde_json::to_writer(&mut self.stdin, value)
            .map_err(|error| format!("Could not encode a Codex App Server request: {error}"))?;
        self.stdin
            .write_all(b"\n")
            .and_then(|_| self.stdin.flush())
            .map_err(|error| format!("Could not send a request to Codex App Server: {error}"))
    }

    fn receive_value(&mut self, timeout: Duration) -> Result<Value, String> {
        if let Some(message) = self.pending_messages.pop_front() {
            return Ok(message);
        }
        let line = self
            .output
            .recv_timeout(timeout)
            .map_err(|error| match error {
                mpsc::RecvTimeoutError::Timeout => {
                    String::from("Codex App Server did not respond in time. Refresh the connection and retry.")
                }
                mpsc::RecvTimeoutError::Disconnected => {
                    String::from("Codex App Server closed its local stdio connection. Refresh the connection and retry.")
                }
            })??;
        serde_json::from_str(&line)
            .map_err(|error| format!("Codex App Server returned invalid JSONL: {error}"))
    }

    fn reject_server_request(&mut self, message: &Value) -> Result<(), String> {
        let Some(id) = message.get("id") else {
            return Ok(());
        };
        if let Some(method) = message.get("method").and_then(Value::as_str) {
            self.write_json(&json!({
                "id": id,
                "error": { "code": -32601, "message": format!("Personal Dashboard does not provide `{method}`.") }
            }))?;
        }
        Ok(())
    }

    fn wait_for_turn(
        &mut self,
        thread_id: &str,
        turn_id: &str,
        cancel_requested: &AtomicBool,
    ) -> Result<(String, bool), String> {
        let mut text = String::new();
        let mut interrupt_requested = false;
        let deadline = std::time::Instant::now() + APP_SERVER_REQUEST_TIMEOUT;
        loop {
            if cancel_requested.load(Ordering::SeqCst) && !interrupt_requested {
                interrupt_requested = true;
                let _ = self.request(
                    "turn/interrupt",
                    json!({ "threadId": thread_id, "turnId": turn_id }),
                );
            }
            let remaining = deadline.saturating_duration_since(std::time::Instant::now());
            if remaining.is_zero() {
                return Err("Codex App Server did not confirm the turn before its timeout.".into());
            }
            let message = match self.receive_value(Duration::from_millis(200).min(remaining)) {
                Ok(message) => message,
                Err(error) if error.contains("did not respond in time") => continue,
                Err(error) => return Err(error),
            };
            if message.get("method").and_then(Value::as_str) == Some("item/agentMessage/delta") {
                let params = message.get("params").unwrap_or(&Value::Null);
                if params.get("threadId").and_then(Value::as_str) == Some(thread_id) {
                    if let Some(delta) = params.get("delta").and_then(Value::as_str) {
                        text.push_str(delta);
                    }
                }
            }
            if message.get("method").and_then(Value::as_str) == Some("turn/completed") {
                let params = message.get("params").unwrap_or(&Value::Null);
                if params.get("threadId").and_then(Value::as_str) != Some(thread_id)
                    || params
                        .get("turn")
                        .and_then(|turn| turn.get("id"))
                        .and_then(Value::as_str)
                        != Some(turn_id)
                {
                    continue;
                }
                let status = params
                    .get("turn")
                    .and_then(|turn| turn.get("status"))
                    .and_then(Value::as_str)
                    .unwrap_or("unknown");
                if status != "completed" {
                    if status == "interrupted" && interrupt_requested {
                        return Ok((text, true));
                    }
                    return Err(format!("Codex turn ended with status `{status}`."));
                }
                if text.trim().is_empty() {
                    return Err("Codex completed the turn without a text reply.".into());
                }
                return Ok((text, false));
            }
            self.reject_server_request(&message)?;
        }
    }
}

impl Drop for StdioJsonlClient {
    fn drop(&mut self) {
        if let Ok(mut child) = self.child.lock() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

const ISOLATED_CODEX_CONFIG: &str = "mcp_servers = {}\n";

fn ensure_private_codex_home(codex_home_dir: &Path) -> Result<(), String> {
    ensure_private_directory(codex_home_dir, "Dashboard Codex profile")?;

    let config_path = codex_home_dir.join("config.toml");
    match fs::symlink_metadata(&config_path) {
        Ok(metadata) if metadata.file_type().is_symlink() || !metadata.is_file() => {
            return Err("Dashboard Codex profile config must be a regular file.".into());
        }
        Ok(_) => {}
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => {
            return Err(format!(
                "Could not inspect Dashboard Codex profile config: {error}"
            ));
        }
    }
    let mut options = OpenOptions::new();
    options.create(true).truncate(true).write(true);
    #[cfg(unix)]
    options.mode(0o600);
    let mut config = options.open(&config_path).map_err(|error| {
        format!("Could not prepare the Dashboard Codex profile config: {error}")
    })?;
    #[cfg(unix)]
    fs::set_permissions(&config_path, std::fs::Permissions::from_mode(0o600))
        .map_err(|error| format!("Could not secure the Dashboard Codex profile config: {error}"))?;
    config
        .write_all(ISOLATED_CODEX_CONFIG.as_bytes())
        .and_then(|_| config.sync_all())
        .map_err(|error| format!("Could not write the Dashboard Codex profile config: {error}"))
}

fn ensure_private_directory(path: &Path, purpose: &str) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|error| format!("Could not prepare {purpose}: {error}"))?;
    let metadata = fs::symlink_metadata(path)
        .map_err(|error| format!("Could not inspect {purpose}: {error}"))?;
    if metadata.file_type().is_symlink() || !metadata.is_dir() {
        return Err(format!("{purpose} must be a real directory."));
    }
    #[cfg(unix)]
    fs::set_permissions(path, std::fs::Permissions::from_mode(0o700))
        .map_err(|error| format!("Could not secure {purpose}: {error}"))?;
    Ok(())
}

fn ensure_empty_working_directory(path: &Path) -> Result<(), String> {
    ensure_private_directory(path, "isolated Codex working directory")?;
    let mut entries = fs::read_dir(path).map_err(|error| {
        format!("Could not verify the isolated Codex working directory: {error}")
    })?;
    match entries.next() {
        Some(Ok(_)) => Err(
            "The isolated Codex working directory is not empty. Text turns are blocked until it is empty.".into(),
        ),
        Some(Err(error)) => Err(format!(
            "Could not verify the isolated Codex working directory: {error}"
        )),
        None => Ok(()),
    }
}

fn secure_existing_history_file(path: &Path) -> Result<(), String> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_symlink() => {
            return Err("Collaboration history cannot be a symbolic link.".into());
        }
        Ok(metadata) if !metadata.is_file() => {
            return Err("Collaboration history path is not a regular file.".into());
        }
        Ok(_) => {
            #[cfg(unix)]
            fs::set_permissions(path, std::fs::Permissions::from_mode(0o600))
                .map_err(|error| format!("Could not secure collaboration history: {error}"))?;
        }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(format!("Could not inspect collaboration history: {error}")),
    }
    Ok(())
}

fn isolated_codex_command(executable: &Path, codex_home_dir: &Path) -> Command {
    let mut command = Command::new(executable);
    command.env_clear();
    for name in [
        "PATH",
        "USER",
        "LOGNAME",
        "LANG",
        "LC_ALL",
        "TERM",
        "TMPDIR",
        "TMP",
        "TEMP",
        "SYSTEMROOT",
    ] {
        if let Some(value) = std::env::var_os(name) {
            command.env(name, value);
        }
    }
    command
        .env("CODEX_HOME", codex_home_dir)
        .env("HOME", codex_home_dir)
        .env("XDG_CONFIG_HOME", codex_home_dir.join("xdg-config"))
        .env("XDG_DATA_HOME", codex_home_dir.join("xdg-data"))
        .env("XDG_CACHE_HOME", codex_home_dir.join("xdg-cache"));
    command
}
