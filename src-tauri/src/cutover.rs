use serde::{Deserialize, Serialize};
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
#[cfg(target_os = "macos")]
use std::process::Command;

const CUTOVER_SCHEMA_VERSION: u32 = 1;
const PROFILE_FILE: &str = "profile.json";
const EXERCISE_FILE: &str = "exercise.json";
const TODAY_WORKSPACE_FILE: &str = "today-workspace.json";
const PROGRESS_FILE: &str = "personal-dashboard-2-cutover-progress.json";
const COMPLETION_FILE: &str = "personal-dashboard-2-cutover.json";
const PYTHON_STATE_FILE: &str = "state.json";
const PYTHON_REMINDER_PLIST: &str = "com.tortillaflat.exercise-habit-tracker.reminders.plist";

const RESTORE_TRANSACTION: &str = ".profile-restore-transaction";
const RESTORE_CHILDREN: [&str; 3] = [
    "profile.previous.json",
    "exercise.previous.json",
    "prepared",
];
const MIGRATION_TRANSACTION: &str = ".baseline-migration-transaction";
const MIGRATION_CHILDREN: [&str; 3] = [
    "profile.migrated.json",
    "exercise.migrated.json",
    "prepared",
];

#[derive(Clone, Debug)]
pub struct CutoverPaths {
    app_data_dir: PathBuf,
    python_data_dir: PathBuf,
}

impl CutoverPaths {
    pub fn new(app_data_dir: PathBuf, python_data_dir: PathBuf) -> Self {
        Self {
            app_data_dir,
            python_data_dir,
        }
    }

    pub fn app_data_dir(&self) -> &Path {
        &self.app_data_dir
    }

    pub fn python_data_dir(&self) -> &Path {
        &self.python_data_dir
    }

    pub fn progress_record(&self) -> PathBuf {
        self.app_data_dir.join(PROGRESS_FILE)
    }

    pub fn completion_marker(&self) -> PathBuf {
        self.app_data_dir.join(COMPLETION_FILE)
    }

    fn profile(&self) -> PathBuf {
        self.app_data_dir.join(PROFILE_FILE)
    }

    fn exercise(&self) -> PathBuf {
        self.app_data_dir.join(EXERCISE_FILE)
    }

    fn python_state(&self) -> PathBuf {
        self.python_data_dir.join(PYTHON_STATE_FILE)
    }

    fn python_plist(&self) -> PathBuf {
        self.python_data_dir.join(PYTHON_REMINDER_PLIST)
    }
}

pub trait LegacyCutoverRuntime: Send + Sync {
    fn python_reminder_job_is_loaded(&self, plist: &Path) -> Result<bool, String>;
    fn stop_python_reminder_job(&self, plist: &Path) -> Result<(), String>;
    fn cancel_notification(&self, id: &str) -> Result<(), String>;
    fn pending_notification_ids(&self, ids: &[String]) -> Result<Vec<String>, String>;
}

#[cfg(target_os = "macos")]
#[derive(Clone, Copy, Default)]
pub struct MacLegacyCutoverRuntime;

#[cfg(target_os = "macos")]
impl LegacyCutoverRuntime for MacLegacyCutoverRuntime {
    fn python_reminder_job_is_loaded(&self, _plist: &Path) -> Result<bool, String> {
        let service = python_reminder_service()?;
        let output = Command::new("/bin/launchctl")
            .args(["print", &service])
            .output()
            .map_err(|error| format!("Could not inspect the legacy reminder job: {error}"))?;
        if output.status.success() {
            return Ok(true);
        }
        if output.status.code() == Some(113) {
            return Ok(false);
        }
        let diagnostic = String::from_utf8_lossy(&output.stderr);
        Err(format!(
            "Could not verify the legacy reminder job (launchctl exit {:?}): {}",
            output.status.code(),
            diagnostic.trim()
        ))
    }

    fn stop_python_reminder_job(&self, plist: &Path) -> Result<(), String> {
        let domain = current_user_launchctl_domain()?;
        let service = python_reminder_service()?;
        if self.python_reminder_job_is_loaded(plist)? {
            let mut command = Command::new("/bin/launchctl");
            command.arg("bootout");
            if plist.exists() {
                command.arg(&domain).arg(plist);
            } else {
                command.arg(&service);
            }
            let output = command
                .output()
                .map_err(|error| format!("Could not stop the legacy reminder job: {error}"))?;
            if !output.status.success() {
                return Err(format!(
                    "Could not stop the legacy reminder job (launchctl exit {:?}): {}",
                    output.status.code(),
                    String::from_utf8_lossy(&output.stderr).trim()
                ));
            }
        }
        if self.python_reminder_job_is_loaded(plist)? {
            Err("The legacy Python reminder job is still loaded.".into())
        } else {
            Ok(())
        }
    }

    fn cancel_notification(&self, id: &str) -> Result<(), String> {
        use crate::notification::NotificationPlatform;
        crate::notification_platform::NativeNotificationPlatform::new().cancel(id)
    }

    fn pending_notification_ids(&self, ids: &[String]) -> Result<Vec<String>, String> {
        crate::notification_platform::NativeNotificationPlatform::new()
            .pending_notification_ids(ids)
    }
}

#[cfg(target_os = "macos")]
fn current_user_launchctl_domain() -> Result<String, String> {
    let uid_output = Command::new("/usr/bin/id")
        .arg("-u")
        .output()
        .map_err(|error| format!("Could not determine the current user id: {error}"))?;
    if !uid_output.status.success() {
        return Err("Could not determine the current user id.".into());
    }
    let uid = String::from_utf8(uid_output.stdout)
        .map_err(|_| "The current user id was not valid UTF-8.".to_string())?;
    let uid = uid.trim();
    if uid.is_empty() || !uid.chars().all(|character| character.is_ascii_digit()) {
        return Err("The current user id was not valid.".into());
    }
    Ok(format!("gui/{uid}"))
}

#[cfg(target_os = "macos")]
fn python_reminder_service() -> Result<String, String> {
    Ok(format!(
        "{}/com.tortillaflat.exercise-habit-tracker.reminders",
        current_user_launchctl_domain()?
    ))
}

#[derive(Clone, Debug, PartialEq)]
pub struct ReviewedCandidateIdentity {
    commit: String,
    bundle_sha256: String,
}

impl ReviewedCandidateIdentity {
    pub fn new(commit: String, bundle_sha256: String) -> Result<Self, String> {
        validate_hex("candidate commit", &commit, 7, 64)?;
        validate_hex("bundle SHA-256", &bundle_sha256, 64, 64)?;
        Ok(Self {
            commit,
            bundle_sha256,
        })
    }

    pub fn commit(&self) -> &str {
        &self.commit
    }

    pub fn bundle_sha256(&self) -> &str {
        &self.bundle_sha256
    }
}

#[derive(Clone, Copy, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CutoverPhase {
    PreflightRecorded,
    PythonReminderStopped,
    NotificationsCancelled,
    CleanupStarted,
    Completed,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CutoverView {
    pub schema_version: u32,
    pub phase: CutoverPhase,
    pub candidate_commit: String,
    pub bundle_sha256: String,
    pub selected_vault: Option<String>,
    pub python_reminder_job_loaded: bool,
    pub completed_at_epoch_millis: Option<i64>,
    pub notification_ids: Vec<String>,
    pub owned_paths: Vec<String>,
    pub unknown_paths: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct CutoverProgress {
    schema_version: u32,
    phase: CutoverPhase,
    candidate_commit: String,
    bundle_sha256: String,
    selected_vault: Option<String>,
    notification_ids: Vec<String>,
    pending_notification_ids: Vec<String>,
    owned_paths: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct CutoverCompletion {
    schema_version: u32,
    phase: CutoverPhase,
    completed_at_epoch_millis: i64,
    candidate_commit: String,
    bundle_sha256: String,
    selected_vault: Option<String>,
    notification_ids: Vec<String>,
    owned_paths: Vec<String>,
}

pub struct CutoverApplication<R> {
    paths: CutoverPaths,
    runtime: R,
}

impl<R: LegacyCutoverRuntime> CutoverApplication<R> {
    pub fn new(paths: CutoverPaths, runtime: R) -> Self {
        Self { paths, runtime }
    }

    pub fn inspect(&self, candidate: &ReviewedCandidateIdentity) -> Result<CutoverView, String> {
        let inventory = inventory(&self.paths)?;
        let selected_vault = selected_vault(&self.paths)?;
        let python_reminder_job_loaded = self
            .runtime
            .python_reminder_job_is_loaded(&self.paths.python_plist())?;

        if self.paths.completion_marker().exists() {
            let marker = read_completion(&self.paths.completion_marker())?;
            require_matching_candidate(&marker.candidate_commit, &marker.bundle_sha256, candidate)?;
            if !inventory.owned_paths.is_empty() {
                return Err(
                    "The completion marker exists but retired Exercise/Profile state is present."
                        .into(),
                );
            }
            return Ok(CutoverView {
                schema_version: marker.schema_version,
                phase: marker.phase,
                candidate_commit: marker.candidate_commit,
                bundle_sha256: marker.bundle_sha256,
                selected_vault: marker.selected_vault,
                python_reminder_job_loaded,
                completed_at_epoch_millis: Some(marker.completed_at_epoch_millis),
                notification_ids: marker.notification_ids,
                owned_paths: marker.owned_paths,
                unknown_paths: inventory.unknown_paths,
            });
        }

        if self.paths.progress_record().exists() {
            let progress = read_progress(&self.paths.progress_record())?;
            require_matching_candidate(
                &progress.candidate_commit,
                &progress.bundle_sha256,
                candidate,
            )?;
            return Ok(progress_view(
                &progress,
                python_reminder_job_loaded,
                inventory.unknown_paths,
            ));
        }

        let profile_exists = self.paths.profile().is_file();
        let exercise_exists = self.paths.exercise().is_file();
        if profile_exists != exercise_exists {
            return Err(
                "Cutover requires both profile.json and exercise.json before initial retirement."
                    .into(),
            );
        }

        let notification_ids = if profile_exists {
            notification_ids_from_source(&self.paths)?
        } else {
            Vec::new()
        };

        Ok(CutoverView {
            schema_version: CUTOVER_SCHEMA_VERSION,
            phase: CutoverPhase::PreflightRecorded,
            candidate_commit: candidate.commit().to_string(),
            bundle_sha256: candidate.bundle_sha256().to_string(),
            selected_vault,
            python_reminder_job_loaded,
            completed_at_epoch_millis: None,
            notification_ids,
            owned_paths: inventory.owned_paths,
            unknown_paths: inventory.unknown_paths,
        })
    }

    pub fn preflight(&self, candidate: &ReviewedCandidateIdentity) -> Result<CutoverView, String> {
        let view = self.inspect(candidate)?;
        if !view.unknown_paths.is_empty() {
            return Err(format!(
                "Cutover stopped because unrecognized paths must be preserved: {}",
                view.unknown_paths.join(", ")
            ));
        }
        Ok(view)
    }

    pub fn execute(
        &self,
        candidate: &ReviewedCandidateIdentity,
        completed_at_epoch_millis: i64,
    ) -> Result<CutoverView, String> {
        if completed_at_epoch_millis < 0 {
            return Err("The cutover timestamp must not be negative.".into());
        }
        let view = self.preflight(candidate)?;
        if view.phase == CutoverPhase::Completed {
            if view.python_reminder_job_loaded {
                return Err(
                    "The completion marker exists but the legacy reminder job is loaded.".into(),
                );
            }
            let still_pending = self
                .runtime
                .pending_notification_ids(&view.notification_ids)?;
            if !still_pending.is_empty() {
                return Err(format!(
                    "The completion marker exists but old notifications remain pending: {}",
                    still_pending.join(", ")
                ));
            }
            return Ok(view);
        }

        let mut progress = if self.paths.progress_record().exists() {
            read_progress(&self.paths.progress_record())?
        } else {
            let progress = CutoverProgress {
                schema_version: CUTOVER_SCHEMA_VERSION,
                phase: CutoverPhase::PreflightRecorded,
                candidate_commit: candidate.commit().to_string(),
                bundle_sha256: candidate.bundle_sha256().to_string(),
                selected_vault: view.selected_vault.clone(),
                pending_notification_ids: view.notification_ids.clone(),
                notification_ids: view.notification_ids,
                owned_paths: view.owned_paths,
            };
            write_json_atomically(&self.paths.progress_record(), &progress)?;
            progress
        };

        if progress.phase != CutoverPhase::PreflightRecorded
            && self
                .runtime
                .python_reminder_job_is_loaded(&self.paths.python_plist())?
        {
            self.runtime
                .stop_python_reminder_job(&self.paths.python_plist())?;
        }

        if matches!(
            progress.phase,
            CutoverPhase::PreflightRecorded
                | CutoverPhase::PythonReminderStopped
                | CutoverPhase::NotificationsCancelled
        ) {
            let current_notification_ids = notification_ids_from_source(&self.paths)?;
            if current_notification_ids != progress.notification_ids {
                return Err(
                    "Retired source state changed after preflight; run a fresh reviewed cutover."
                        .into(),
                );
            }
        }

        if progress.phase == CutoverPhase::PreflightRecorded {
            self.runtime
                .stop_python_reminder_job(&self.paths.python_plist())?;
            progress.phase = CutoverPhase::PythonReminderStopped;
            write_json_atomically(&self.paths.progress_record(), &progress)?;
        }

        if progress.phase == CutoverPhase::PythonReminderStopped {
            while let Some(notification_id) = progress.pending_notification_ids.first().cloned() {
                self.runtime.cancel_notification(&notification_id)?;
                progress
                    .pending_notification_ids
                    .retain(|pending| pending != &notification_id);
                write_json_atomically(&self.paths.progress_record(), &progress)?;
            }
            let still_pending = self
                .runtime
                .pending_notification_ids(&progress.notification_ids)?;
            if !still_pending.is_empty() {
                progress.pending_notification_ids = still_pending.clone();
                write_json_atomically(&self.paths.progress_record(), &progress)?;
                return Err(format!(
                    "Old notifications remain pending: {}",
                    still_pending.join(", ")
                ));
            }
            progress.phase = CutoverPhase::NotificationsCancelled;
            write_json_atomically(&self.paths.progress_record(), &progress)?;
        }

        if progress.phase == CutoverPhase::NotificationsCancelled {
            progress.phase = CutoverPhase::CleanupStarted;
            write_json_atomically(&self.paths.progress_record(), &progress)?;
        }

        if progress.phase == CutoverPhase::CleanupStarted {
            if self
                .runtime
                .python_reminder_job_is_loaded(&self.paths.python_plist())?
            {
                self.runtime
                    .stop_python_reminder_job(&self.paths.python_plist())?;
            }
            let regenerated_notifications = self
                .runtime
                .pending_notification_ids(&progress.notification_ids)?;
            if !regenerated_notifications.is_empty() {
                progress.phase = CutoverPhase::PythonReminderStopped;
                progress.pending_notification_ids = regenerated_notifications.clone();
                write_json_atomically(&self.paths.progress_record(), &progress)?;
                return Err(format!(
                    "Old notifications reappeared before cleanup: {}",
                    regenerated_notifications.join(", ")
                ));
            }
            remove_owned_state(&self.paths)?;
            let remaining = inventory(&self.paths)?;
            if !remaining.unknown_paths.is_empty() || !remaining.owned_paths.is_empty() {
                return Err("Retired state cleanup could not be verified.".into());
            }
            let marker = CutoverCompletion {
                schema_version: CUTOVER_SCHEMA_VERSION,
                phase: CutoverPhase::Completed,
                completed_at_epoch_millis,
                candidate_commit: candidate.commit().to_string(),
                bundle_sha256: candidate.bundle_sha256().to_string(),
                selected_vault: progress.selected_vault.clone(),
                notification_ids: progress.notification_ids.clone(),
                owned_paths: progress.owned_paths.clone(),
            };
            write_json_atomically(&self.paths.completion_marker(), &marker)?;
            fs::remove_file(self.paths.progress_record()).map_err(|error| {
                format!("Could not remove the cutover progress record: {error}")
            })?;
            sync_directory(&self.paths.app_data_dir)?;
            return Ok(CutoverView {
                schema_version: marker.schema_version,
                phase: marker.phase,
                candidate_commit: marker.candidate_commit,
                bundle_sha256: marker.bundle_sha256,
                selected_vault: marker.selected_vault,
                python_reminder_job_loaded: false,
                completed_at_epoch_millis: Some(marker.completed_at_epoch_millis),
                notification_ids: marker.notification_ids,
                owned_paths: marker.owned_paths,
                unknown_paths: Vec::new(),
            });
        }

        Err("The cutover progress phase is not resumable.".into())
    }
}

struct Inventory {
    owned_paths: Vec<String>,
    unknown_paths: Vec<String>,
}

fn inventory(paths: &CutoverPaths) -> Result<Inventory, String> {
    let mut owned_paths = Vec::new();
    let mut unknown_paths = Vec::new();
    inspect_app_data(paths, &mut owned_paths, &mut unknown_paths)?;
    inspect_python_data(paths, &mut owned_paths, &mut unknown_paths)?;
    owned_paths.sort();
    unknown_paths.sort();
    Ok(Inventory {
        owned_paths,
        unknown_paths,
    })
}

fn inspect_app_data(
    paths: &CutoverPaths,
    owned_paths: &mut Vec<String>,
    unknown_paths: &mut Vec<String>,
) -> Result<(), String> {
    if !paths.app_data_dir.exists() {
        return Ok(());
    }
    for entry in read_directory(&paths.app_data_dir)? {
        let name = file_name(&entry.path())?;
        let file_type = entry
            .file_type()
            .map_err(|error| format!("Could not inspect {}: {error}", entry.path().display()))?;
        match name.as_str() {
            PROFILE_FILE | EXERCISE_FILE if file_type.is_file() => {
                owned_paths.push(relative("app-data", &name));
            }
            TODAY_WORKSPACE_FILE | PROGRESS_FILE | COMPLETION_FILE => {}
            RESTORE_TRANSACTION if file_type.is_dir() => {
                inspect_transaction(&entry.path(), RESTORE_CHILDREN, owned_paths, unknown_paths)?
            }
            MIGRATION_TRANSACTION if file_type.is_dir() => inspect_transaction(
                &entry.path(),
                MIGRATION_CHILDREN,
                owned_paths,
                unknown_paths,
            )?,
            _ if file_type.is_file()
                && (is_owned_temporary(&name) || is_cutover_record_temporary(&name)) =>
            {
                owned_paths.push(relative("app-data", &name));
            }
            _ => unknown_paths.push(relative("app-data", &name)),
        }
    }
    Ok(())
}

fn inspect_python_data(
    paths: &CutoverPaths,
    owned_paths: &mut Vec<String>,
    unknown_paths: &mut Vec<String>,
) -> Result<(), String> {
    if !paths.python_data_dir.exists() {
        return Ok(());
    }
    for entry in read_directory(&paths.python_data_dir)? {
        let name = file_name(&entry.path())?;
        let file_type = entry
            .file_type()
            .map_err(|error| format!("Could not inspect {}: {error}", entry.path().display()))?;
        match name.as_str() {
            PYTHON_STATE_FILE | PYTHON_REMINDER_PLIST if file_type.is_file() => {
                owned_paths.push(relative("python-data", &name));
            }
            _ => unknown_paths.push(relative("python-data", &name)),
        }
    }
    Ok(())
}

fn inspect_transaction(
    directory: &Path,
    allowed_children: [&str; 3],
    owned_paths: &mut Vec<String>,
    unknown_paths: &mut Vec<String>,
) -> Result<(), String> {
    if !directory.is_dir() {
        unknown_paths.push(directory.display().to_string());
        return Ok(());
    }
    let directory_name = file_name(directory)?;
    for entry in read_directory(directory)? {
        let name = file_name(&entry.path())?;
        let file_type = entry
            .file_type()
            .map_err(|error| format!("Could not inspect {}: {error}", entry.path().display()))?;
        if allowed_children.contains(&name.as_str()) && file_type.is_file() {
            owned_paths.push(format!("app-data/{directory_name}/{name}"));
        } else {
            unknown_paths.push(format!("app-data/{directory_name}/{name}"));
        }
    }
    owned_paths.push(format!("app-data/{directory_name}/"));
    Ok(())
}

fn remove_owned_state(paths: &CutoverPaths) -> Result<(), String> {
    for path in [
        paths.profile(),
        paths.exercise(),
        paths.python_state(),
        paths.python_plist(),
    ] {
        remove_file_if_present(&path)?;
    }
    if paths.app_data_dir.exists() {
        for entry in read_directory(&paths.app_data_dir)? {
            let name = file_name(&entry.path())?;
            if is_owned_temporary(&name) || is_cutover_record_temporary(&name) {
                remove_file_if_present(&entry.path())?;
            }
        }
    }
    remove_transaction(
        &paths.app_data_dir.join(RESTORE_TRANSACTION),
        RESTORE_CHILDREN,
    )?;
    remove_transaction(
        &paths.app_data_dir.join(MIGRATION_TRANSACTION),
        MIGRATION_CHILDREN,
    )?;
    sync_directory(&paths.app_data_dir)?;
    if paths.python_data_dir.exists() {
        sync_directory(&paths.python_data_dir)?;
    }
    Ok(())
}

fn remove_transaction(directory: &Path, allowed_children: [&str; 3]) -> Result<(), String> {
    if !directory.exists() {
        return Ok(());
    }
    for name in allowed_children {
        remove_file_if_present(&directory.join(name))?;
    }
    fs::remove_dir(directory)
        .map_err(|error| format!("Could not remove {}: {error}", directory.display()))
}

fn remove_file_if_present(path: &Path) -> Result<(), String> {
    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("Could not remove {}: {error}", path.display())),
    }
}

fn read_directory(directory: &Path) -> Result<Vec<fs::DirEntry>, String> {
    fs::read_dir(directory)
        .map_err(|error| format!("Could not inspect {}: {error}", directory.display()))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not inspect {}: {error}", directory.display()))
}

fn file_name(path: &Path) -> Result<String, String> {
    path.file_name()
        .and_then(|name| name.to_str())
        .map(str::to_string)
        .ok_or_else(|| format!("Path is not valid UTF-8: {}", path.display()))
}

fn relative(root: &str, name: &str) -> String {
    format!("{root}/{name}")
}

fn is_owned_temporary(name: &str) -> bool {
    ["profile.json.tmp-", "exercise.json.tmp-"]
        .iter()
        .any(|prefix| {
            name.strip_prefix(prefix).is_some_and(|pid| {
                !pid.is_empty() && pid.chars().all(|character| character.is_ascii_digit())
            })
        })
}

fn is_cutover_record_temporary(name: &str) -> bool {
    [
        "personal-dashboard-2-cutover-progress.json.tmp-",
        "personal-dashboard-2-cutover.json.tmp-",
    ]
    .iter()
    .any(|prefix| {
        name.strip_prefix(prefix).is_some_and(|pid| {
            !pid.is_empty() && pid.chars().all(|character| character.is_ascii_digit())
        })
    })
}

fn validate_hex(label: &str, value: &str, minimum: usize, maximum: usize) -> Result<(), String> {
    if !(minimum..=maximum).contains(&value.len())
        || !value.chars().all(|character| character.is_ascii_hexdigit())
    {
        Err(format!(
            "The {label} must contain {minimum} to {maximum} hexadecimal characters."
        ))
    } else {
        Ok(())
    }
}

fn require_matching_candidate(
    recorded_commit: &str,
    recorded_bundle_sha256: &str,
    requested: &ReviewedCandidateIdentity,
) -> Result<(), String> {
    if recorded_commit == requested.commit() && recorded_bundle_sha256 == requested.bundle_sha256()
    {
        Ok(())
    } else {
        Err(format!(
            "Cutover candidate mismatch: recorded commit {recorded_commit} and bundle {recorded_bundle_sha256}."
        ))
    }
}

fn progress_view(
    progress: &CutoverProgress,
    python_reminder_job_loaded: bool,
    unknown_paths: Vec<String>,
) -> CutoverView {
    CutoverView {
        schema_version: progress.schema_version,
        phase: progress.phase,
        candidate_commit: progress.candidate_commit.clone(),
        bundle_sha256: progress.bundle_sha256.clone(),
        selected_vault: progress.selected_vault.clone(),
        python_reminder_job_loaded,
        completed_at_epoch_millis: None,
        notification_ids: progress.notification_ids.clone(),
        owned_paths: progress.owned_paths.clone(),
        unknown_paths,
    }
}

fn notification_ids_from_source(paths: &CutoverPaths) -> Result<Vec<String>, String> {
    let mut notification_ids = crate::profile::legacy_notification_ids(
        &fs::read(paths.profile())
            .map_err(|error| format!("Could not read profile.json: {error}"))?,
    )?;
    notification_ids.extend(crate::exercise::legacy_notification_ids(
        &fs::read(paths.exercise())
            .map_err(|error| format!("Could not read exercise.json: {error}"))?,
    )?);
    notification_ids.sort();
    notification_ids.dedup();
    Ok(notification_ids)
}

fn selected_vault(paths: &CutoverPaths) -> Result<Option<String>, String> {
    let path = paths.app_data_dir.join(TODAY_WORKSPACE_FILE);
    if !path.exists() {
        return Ok(None);
    }
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct TodayWorkspaceSelection {
        selected_vault: String,
    }
    let selection: TodayWorkspaceSelection = read_json(&path, "Today workspace")?;
    if selection.selected_vault.trim().is_empty() {
        return Err("The Today workspace selected vault is empty.".into());
    }
    Ok(Some(selection.selected_vault))
}

fn read_progress(path: &Path) -> Result<CutoverProgress, String> {
    let progress: CutoverProgress = read_json(path, "cutover progress")?;
    if progress.schema_version != CUTOVER_SCHEMA_VERSION
        || progress.phase == CutoverPhase::Completed
    {
        return Err("The cutover progress record is not supported.".into());
    }
    Ok(progress)
}

fn read_completion(path: &Path) -> Result<CutoverCompletion, String> {
    let marker: CutoverCompletion = read_json(path, "cutover completion marker")?;
    if marker.schema_version != CUTOVER_SCHEMA_VERSION || marker.phase != CutoverPhase::Completed {
        return Err("The cutover completion marker is not supported.".into());
    }
    Ok(marker)
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &Path, label: &str) -> Result<T, String> {
    let document =
        fs::read(path).map_err(|error| format!("Could not read the {label}: {error}"))?;
    serde_json::from_slice(&document).map_err(|_| format!("The {label} is not valid."))
}

fn write_json_atomically(path: &Path, value: &impl Serialize) -> Result<(), String> {
    let parent = path
        .parent()
        .ok_or_else(|| "The cutover record path has no parent directory.".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("Could not create the cutover record directory: {error}"))?;
    let document = serde_json::to_vec_pretty(value)
        .map_err(|error| format!("Could not encode the cutover record: {error}"))?;
    let temporary = path.with_extension(format!("json.tmp-{}", std::process::id()));
    let mut output = OpenOptions::new()
        .create(true)
        .truncate(true)
        .write(true)
        .open(&temporary)
        .map_err(|error| format!("Could not prepare the cutover record: {error}"))?;
    output
        .write_all(&document)
        .and_then(|_| output.sync_all())
        .map_err(|error| format!("Could not write the cutover record: {error}"))?;
    fs::rename(&temporary, path)
        .map_err(|error| format!("Could not activate the cutover record: {error}"))?;
    sync_directory(parent)
}

fn sync_directory(directory: &Path) -> Result<(), String> {
    File::open(directory)
        .and_then(|directory| directory.sync_all())
        .map_err(|error| format!("Could not sync {}: {error}", directory.display()))
}
