use personal_dashboard_lib::cutover::{
    CutoverApplication, CutoverPaths, CutoverPhase, LegacyCutoverRuntime, ReviewedCandidateIdentity,
};
use personal_dashboard_lib::exercise::ExerciseClock;
use personal_dashboard_lib::exercise::ExercisePersistence;
use personal_dashboard_lib::migration::{
    BaselineMigrationApplication, BaselinePersistence, CompleteProfileAdoption,
    CompleteProfileDocuments,
};
use personal_dashboard_lib::profile::ProfilePersistence;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

const COMPLETED_BASELINE: &[u8] =
    include_bytes!("../../tests/fixtures/completed-python-baseline-state.json");

#[derive(Clone, Default)]
struct MemoryDocument(Arc<Mutex<Option<Vec<u8>>>>);

impl ProfilePersistence for MemoryDocument {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(self.0.lock().unwrap().clone())
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        *self.0.lock().unwrap() = Some(document.to_vec());
        Ok(())
    }
}

impl ExercisePersistence for MemoryDocument {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(self.0.lock().unwrap().clone())
    }

    fn save(&self, document: &[u8]) -> Result<(), String> {
        *self.0.lock().unwrap() = Some(document.to_vec());
        Ok(())
    }
}

#[derive(Clone)]
struct MemoryBaseline;

impl BaselinePersistence for MemoryBaseline {
    fn load(&self) -> Result<Option<Vec<u8>>, String> {
        Ok(Some(COMPLETED_BASELINE.to_vec()))
    }
}

#[derive(Clone)]
struct MemoryAdoption {
    profile: MemoryDocument,
    exercise: MemoryDocument,
}

impl CompleteProfileAdoption for MemoryAdoption {
    fn adopt_complete(&self, documents: &CompleteProfileDocuments) -> Result<(), String> {
        ProfilePersistence::save(&self.profile, documents.profile())?;
        ExercisePersistence::save(&self.exercise, documents.exercise())
    }
}

#[derive(Clone, Copy)]
struct FixedClock;

impl ExerciseClock for FixedClock {
    fn now_epoch_millis(&self) -> i64 {
        1_787_686_200_000
    }

    fn utc_offset_minutes_at(&self, _epoch_millis: i64) -> i32 {
        -4 * 60
    }
}

#[derive(Clone, Default)]
struct FakeRuntime {
    stopped: Arc<Mutex<usize>>,
    job_loaded: Arc<Mutex<bool>>,
    cancelled: Arc<Mutex<Vec<String>>>,
    pending: Arc<Mutex<Vec<String>>>,
    fail_once: Arc<Mutex<Option<String>>>,
}

impl FakeRuntime {
    fn failing_once(id: String) -> Self {
        Self {
            fail_once: Arc::new(Mutex::new(Some(id))),
            ..Self::default()
        }
    }
}

impl LegacyCutoverRuntime for FakeRuntime {
    fn python_reminder_job_is_loaded(&self, _plist: &Path) -> Result<bool, String> {
        Ok(*self.job_loaded.lock().unwrap())
    }

    fn stop_python_reminder_job(&self, _plist: &Path) -> Result<(), String> {
        *self.stopped.lock().unwrap() += 1;
        *self.job_loaded.lock().unwrap() = false;
        Ok(())
    }

    fn cancel_notification(&self, id: &str) -> Result<(), String> {
        if self.fail_once.lock().unwrap().as_deref() == Some(id) {
            *self.fail_once.lock().unwrap() = None;
            return Err("simulated cancellation failure".into());
        }
        self.cancelled.lock().unwrap().push(id.to_string());
        self.pending.lock().unwrap().retain(|pending| pending != id);
        Ok(())
    }

    fn pending_notification_ids(&self, ids: &[String]) -> Result<Vec<String>, String> {
        let pending = self.pending.lock().unwrap();
        Ok(ids
            .iter()
            .filter(|id| pending.contains(id))
            .cloned()
            .collect())
    }
}

fn candidate() -> ReviewedCandidateIdentity {
    ReviewedCandidateIdentity::new(
        "2f2ef0c".into(),
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".into(),
    )
    .unwrap()
}

fn temporary_directory(label: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_nanos();
    std::env::temp_dir().join(format!(
        "personal-dashboard-cutover-{label}-{}-{nonce}",
        std::process::id()
    ))
}

fn prepared_paths(label: &str) -> (PathBuf, CutoverPaths) {
    let root = temporary_directory(label);
    let app_data = root.join("app-data");
    let python_data = root.join("python-data");
    fs::create_dir_all(&app_data).unwrap();
    fs::create_dir_all(&python_data).unwrap();

    let profile = MemoryDocument::default();
    let exercise = MemoryDocument::default();
    let result = BaselineMigrationApplication::new(
        MemoryBaseline,
        profile.clone(),
        exercise.clone(),
        MemoryAdoption {
            profile: profile.clone(),
            exercise: exercise.clone(),
        },
        FixedClock,
    )
    .launch();
    assert!(!result.blocks_profile);
    let mut profile_value: serde_json::Value =
        serde_json::from_slice(&ProfilePersistence::load(&profile).unwrap().unwrap()).unwrap();
    profile_value["pending_notification_cancellations"] =
        serde_json::json!(["exercise-profile-pending"]);
    fs::write(
        app_data.join("profile.json"),
        serde_json::to_vec_pretty(&profile_value).unwrap(),
    )
    .unwrap();
    let mut exercise_value: serde_json::Value =
        serde_json::from_slice(&ExercisePersistence::load(&exercise).unwrap().unwrap()).unwrap();
    exercise_value["pending_reminder_reconciliation"] = serde_json::json!({
        "cancel_notification_ids": ["exercise-reconciliation-cancel"],
        "desired_notification_ids": ["exercise-reconciliation-desired"]
    });
    fs::write(
        app_data.join("exercise.json"),
        serde_json::to_vec_pretty(&exercise_value).unwrap(),
    )
    .unwrap();
    fs::write(
        app_data.join("today-workspace.json"),
        br#"{"schemaVersion":1,"selectedVault":"/tmp/synthetic-vault"}"#,
    )
    .unwrap();
    fs::write(python_data.join("state.json"), b"python-state").unwrap();
    fs::write(
        python_data.join("com.tortillaflat.exercise-habit-tracker.reminders.plist"),
        b"plist",
    )
    .unwrap();
    (root, CutoverPaths::new(app_data, python_data))
}

#[test]
fn preflight_blocks_unknown_files_without_touching_runtime_or_state() {
    let (root, paths) = prepared_paths("unknown");
    fs::write(paths.app_data_dir().join("keep-me.txt"), b"unknown").unwrap();
    let runtime = FakeRuntime::default();
    let application = CutoverApplication::new(paths.clone(), runtime.clone());

    let inspection = application.inspect(&candidate()).unwrap();
    assert_eq!("2f2ef0c", inspection.candidate_commit);
    assert_eq!(64, inspection.bundle_sha256.len());
    assert_eq!(
        Some("/tmp/synthetic-vault".to_string()),
        inspection.selected_vault
    );
    assert!(!inspection.python_reminder_job_loaded);
    assert!(inspection
        .unknown_paths
        .contains(&"app-data/keep-me.txt".to_string()));

    let error = application.preflight(&candidate()).unwrap_err();

    assert!(error.contains("keep-me.txt"));
    assert_eq!(0, *runtime.stopped.lock().unwrap());
    assert!(runtime.cancelled.lock().unwrap().is_empty());
    assert!(paths.app_data_dir().join("profile.json").exists());
    assert!(paths.app_data_dir().join("exercise.json").exists());
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn cutover_removes_only_owned_legacy_state_and_is_idempotent() {
    let (root, paths) = prepared_paths("success");
    let runtime = FakeRuntime::default();
    let application = CutoverApplication::new(paths.clone(), runtime.clone());

    let preflight = application.preflight(&candidate()).unwrap();
    assert!(preflight.notification_ids.len() >= 15);
    assert!(preflight
        .notification_ids
        .contains(&"exercise-profile-pending".to_string()));
    assert!(preflight
        .notification_ids
        .contains(&"exercise-reconciliation-cancel".to_string()));
    assert!(preflight
        .notification_ids
        .contains(&"exercise-reconciliation-desired".to_string()));
    *runtime.pending.lock().unwrap() = preflight.notification_ids.clone();

    let completed = application
        .execute(&candidate(), 1_789_000_000_000)
        .unwrap();

    assert_eq!(CutoverPhase::Completed, completed.phase);
    assert!(!paths.app_data_dir().join("profile.json").exists());
    assert!(!paths.app_data_dir().join("exercise.json").exists());
    assert!(paths.app_data_dir().join("today-workspace.json").exists());
    assert!(!paths.python_data_dir().join("state.json").exists());
    assert!(!paths
        .python_data_dir()
        .join("com.tortillaflat.exercise-habit-tracker.reminders.plist")
        .exists());
    assert!(paths.completion_marker().exists());
    assert!(runtime.pending.lock().unwrap().is_empty());
    let calls_after_first_run = runtime.cancelled.lock().unwrap().len();

    let repeated = application
        .execute(&candidate(), 1_789_000_000_999)
        .unwrap();
    assert_eq!(CutoverPhase::Completed, repeated.phase);
    assert_eq!(
        calls_after_first_run,
        runtime.cancelled.lock().unwrap().len()
    );
    assert_eq!(1, *runtime.stopped.lock().unwrap());
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn malformed_old_state_blocks_before_runtime_changes() {
    let (root, paths) = prepared_paths("malformed");
    fs::write(paths.app_data_dir().join("exercise.json"), b"not-json").unwrap();
    let runtime = FakeRuntime::default();
    let application = CutoverApplication::new(paths.clone(), runtime.clone());

    let error = application.preflight(&candidate()).unwrap_err();

    assert!(error.contains("exercise state is not valid"));
    assert_eq!(0, *runtime.stopped.lock().unwrap());
    assert!(runtime.cancelled.lock().unwrap().is_empty());
    assert!(!paths.progress_record().exists());
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn unknown_transaction_child_blocks_the_whole_cleanup() {
    let (root, paths) = prepared_paths("transaction-unknown");
    let transaction = paths.app_data_dir().join(".profile-restore-transaction");
    fs::create_dir_all(&transaction).unwrap();
    fs::write(transaction.join("prepared"), b"prepared").unwrap();
    fs::write(transaction.join("unrecognized.backup"), b"preserve").unwrap();
    let runtime = FakeRuntime::default();

    let error = CutoverApplication::new(paths.clone(), runtime)
        .preflight(&candidate())
        .unwrap_err();

    assert!(error.contains("unrecognized.backup"));
    assert!(paths.app_data_dir().join("profile.json").exists());
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn cancellation_failure_keeps_source_state_and_reentry_resumes() {
    let (root, paths) = prepared_paths("resume");
    let initial = CutoverApplication::new(paths.clone(), FakeRuntime::default())
        .preflight(&candidate())
        .unwrap();
    let failed_id = initial.notification_ids[0].clone();
    let runtime = FakeRuntime::failing_once(failed_id.clone());
    *runtime.pending.lock().unwrap() = initial.notification_ids.clone();
    let application = CutoverApplication::new(paths.clone(), runtime.clone());

    let error = application
        .execute(&candidate(), 1_789_000_000_000)
        .unwrap_err();

    assert!(error.contains("simulated cancellation failure"));
    assert!(paths.app_data_dir().join("profile.json").exists());
    assert!(paths.app_data_dir().join("exercise.json").exists());
    assert!(paths.progress_record().exists());
    assert!(!paths.completion_marker().exists());

    let completed = application
        .execute(&candidate(), 1_789_000_001_000)
        .unwrap();
    assert_eq!(CutoverPhase::Completed, completed.phase);
    assert!(!paths.app_data_dir().join("exercise.json").exists());
    assert!(!runtime.pending.lock().unwrap().contains(&failed_id));
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn resume_reparses_source_and_blocks_if_notification_inventory_changed() {
    let (root, paths) = prepared_paths("changed-source");
    let initial = CutoverApplication::new(paths.clone(), FakeRuntime::default())
        .preflight(&candidate())
        .unwrap();
    let runtime = FakeRuntime::failing_once(initial.notification_ids[0].clone());
    *runtime.pending.lock().unwrap() = initial.notification_ids.clone();
    let application = CutoverApplication::new(paths.clone(), runtime);

    application
        .execute(&candidate(), 1_789_000_000_000)
        .unwrap_err();
    let exercise_path = paths.app_data_dir().join("exercise.json");
    let mut exercise: serde_json::Value =
        serde_json::from_slice(&fs::read(&exercise_path).unwrap()).unwrap();
    exercise["pending_reminder_reconciliation"]["desired_notification_ids"] =
        serde_json::json!(["exercise-new-after-preflight"]);
    fs::write(
        &exercise_path,
        serde_json::to_vec_pretty(&exercise).unwrap(),
    )
    .unwrap();

    let error = application
        .execute(&candidate(), 1_789_000_001_000)
        .unwrap_err();

    assert!(error.contains("source state changed after preflight"));
    assert!(paths.app_data_dir().join("profile.json").exists());
    assert!(exercise_path.exists());
    assert!(!paths.completion_marker().exists());
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn resume_reparses_source_before_starting_cleanup() {
    let (root, paths) = prepared_paths("changed-before-cleanup");
    let application = CutoverApplication::new(paths.clone(), FakeRuntime::default());
    let initial = application.preflight(&candidate()).unwrap();
    fs::write(
        paths.progress_record(),
        serde_json::to_vec_pretty(&serde_json::json!({
            "schemaVersion": 1,
            "phase": "notifications_cancelled",
            "candidateCommit": candidate().commit(),
            "bundleSha256": candidate().bundle_sha256(),
            "selectedVault": initial.selected_vault,
            "notificationIds": initial.notification_ids,
            "pendingNotificationIds": [],
            "ownedPaths": initial.owned_paths
        }))
        .unwrap(),
    )
    .unwrap();
    let exercise_path = paths.app_data_dir().join("exercise.json");
    let mut exercise: serde_json::Value =
        serde_json::from_slice(&fs::read(&exercise_path).unwrap()).unwrap();
    exercise["pending_reminder_reconciliation"]["desired_notification_ids"] =
        serde_json::json!(["exercise-new-before-cleanup"]);
    fs::write(
        &exercise_path,
        serde_json::to_vec_pretty(&exercise).unwrap(),
    )
    .unwrap();

    let error = application
        .execute(&candidate(), 1_789_000_001_000)
        .unwrap_err();

    assert!(error.contains("source state changed after preflight"));
    assert!(paths.app_data_dir().join("profile.json").exists());
    assert!(exercise_path.exists());
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn completion_marker_reentry_rechecks_pending_notifications() {
    let (root, paths) = prepared_paths("marker-verification");
    let runtime = FakeRuntime::default();
    let application = CutoverApplication::new(paths.clone(), runtime.clone());
    let initial = application.preflight(&candidate()).unwrap();
    *runtime.pending.lock().unwrap() = initial.notification_ids.clone();
    application
        .execute(&candidate(), 1_789_000_000_000)
        .unwrap();
    *runtime.pending.lock().unwrap() = vec![initial.notification_ids[0].clone()];

    let error = application
        .execute(&candidate(), 1_789_000_001_000)
        .unwrap_err();

    assert!(error.contains("old notifications remain pending"));
    assert!(paths.completion_marker().exists());
    runtime.pending.lock().unwrap().clear();
    *runtime.job_loaded.lock().unwrap() = true;
    let error = application
        .execute(&candidate(), 1_789_000_002_000)
        .unwrap_err();
    assert!(error.contains("legacy reminder job is loaded"));
    fs::remove_dir_all(root).unwrap();
}

#[test]
fn resumed_cutover_stops_a_reloaded_runner_and_recancels_its_notifications() {
    let (root, paths) = prepared_paths("reloaded-runner");
    let runtime = FakeRuntime::default();
    let application = CutoverApplication::new(paths.clone(), runtime.clone());
    let initial = application.preflight(&candidate()).unwrap();
    let regenerated_id = initial.notification_ids[0].clone();
    fs::write(
        paths.progress_record(),
        serde_json::to_vec_pretty(&serde_json::json!({
            "schemaVersion": 1,
            "phase": "cleanup_started",
            "candidateCommit": candidate().commit(),
            "bundleSha256": candidate().bundle_sha256(),
            "selectedVault": initial.selected_vault,
            "notificationIds": initial.notification_ids,
            "pendingNotificationIds": [],
            "ownedPaths": initial.owned_paths
        }))
        .unwrap(),
    )
    .unwrap();
    *runtime.job_loaded.lock().unwrap() = true;
    *runtime.pending.lock().unwrap() = vec![regenerated_id.clone()];

    let error = application
        .execute(&candidate(), 1_789_000_001_000)
        .unwrap_err();

    assert!(error.contains("reappeared before cleanup"));
    assert_eq!(1, *runtime.stopped.lock().unwrap());
    assert!(paths.app_data_dir().join("profile.json").exists());
    assert!(paths.app_data_dir().join("exercise.json").exists());

    let completed = application
        .execute(&candidate(), 1_789_000_002_000)
        .unwrap();
    assert_eq!(CutoverPhase::Completed, completed.phase);
    assert!(runtime.cancelled.lock().unwrap().contains(&regenerated_id));
    fs::remove_dir_all(root).unwrap();
}
