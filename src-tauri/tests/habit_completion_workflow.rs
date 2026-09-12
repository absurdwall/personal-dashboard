use personal_dashboard_lib::habits::FileHabitSnapshotStore;
use personal_dashboard_lib::today::{
    FileDayTaskStore, FileHabitCompletionStore, FileTodayRecordStore, HabitCompletionMutationInput,
    HabitCompletionStore, HabitLocalCompletionState, HabitSnapshotState, TodayApplication,
    TodayClock, TodayWorkspaceExchange, TodayWorkspacePersistence,
};
use std::cell::Cell;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

struct TempVault(PathBuf);

impl TempVault {
    fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "personal-dashboard-habit-completion-{label}-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir_all(path.join(".obsidian")).unwrap();
        fs::create_dir_all(path.join("life/Journal/Daily")).unwrap();
        Self(path)
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

#[test]
fn withdrawing_local_completion_keeps_external_completion_and_the_local_trace_distinct() {
    let vault = TempVault::new("withdraw-external");
    write_snapshot(
        vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let application = app(vault.path());
    let opened = application.habits().unwrap();
    let locally_completed = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "exercise".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "complete-exercise-locally".into(),
            target_binding: opened.completion_target_binding.clone().unwrap(),
            expected_revision: opened.completion_revision.clone(),
        })
        .unwrap();
    let withdrawn = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "exercise".into(),
            lived_date: "2026-09-08".into(),
            completed: false,
            change_id: "withdraw-exercise-locally".into(),
            target_binding: locally_completed.completion_target_binding.clone().unwrap(),
            expected_revision: locally_completed.completion_revision.clone(),
        })
        .unwrap();
    let exercise = withdrawn.habit("exercise").unwrap();

    assert!(exercise.today.counts_as_completion);
    assert_eq!(
        exercise.today.local_completion_state,
        HabitLocalCompletionState::Withdrawn
    );
    assert!(exercise
        .today
        .completion_source_labels
        .contains(&"Dida365 打卡".to_string()));
    assert!(!exercise
        .today
        .completion_source_labels
        .contains(&"Personal Dashboard local".to_string()));

    let repeated = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "exercise".into(),
            lived_date: "2026-09-08".into(),
            completed: false,
            change_id: "withdraw-exercise-locally".into(),
            target_binding: locally_completed.completion_target_binding.unwrap(),
            expected_revision: locally_completed.completion_revision,
        })
        .unwrap();
    assert_eq!(
        repeated
            .habit("exercise")
            .unwrap()
            .today
            .local_completion_state,
        HabitLocalCompletionState::Withdrawn
    );
    let document = fs::read_to_string(completion_path(vault.path())).unwrap();
    assert_eq!(document.matches("complete-exercise-locally").count(), 1);
    assert_eq!(document.matches("withdraw-exercise-locally").count(), 1);
}

#[test]
fn an_accepted_no_op_receipt_cannot_later_withdraw_a_new_local_completion() {
    let vault = TempVault::new("no-op-receipt");
    write_snapshot(
        vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let application = app(vault.path());
    let opened = application.habits().unwrap();
    let external_only = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "exercise".into(),
            lived_date: "2026-09-08".into(),
            completed: false,
            change_id: "withdraw-external-only".into(),
            target_binding: opened.completion_target_binding.unwrap(),
            expected_revision: opened.completion_revision,
        })
        .unwrap();
    assert!(
        external_only
            .habit("exercise")
            .unwrap()
            .today
            .counts_as_completion
    );
    assert!(fs::read_to_string(completion_path(vault.path()))
        .unwrap()
        .contains("withdraw-external-only"));

    let locally_completed = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "exercise".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "complete-after-no-op".into(),
            target_binding: external_only.completion_target_binding.clone().unwrap(),
            expected_revision: external_only.completion_revision.clone(),
        })
        .unwrap();
    let retried_old_request = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "exercise".into(),
            lived_date: "2026-09-08".into(),
            completed: false,
            change_id: "withdraw-external-only".into(),
            target_binding: external_only.completion_target_binding.unwrap(),
            expected_revision: external_only.completion_revision,
        })
        .unwrap();

    assert_eq!(
        locally_completed
            .habit("exercise")
            .unwrap()
            .today
            .local_completion_state,
        HabitLocalCompletionState::Completed
    );
    assert_eq!(
        retried_old_request
            .habit("exercise")
            .unwrap()
            .today
            .local_completion_state,
        HabitLocalCompletionState::Completed
    );
}

impl Drop for TempVault {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[derive(Clone)]
struct SelectedVault(PathBuf);

impl TodayWorkspacePersistence for SelectedVault {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(self.0.clone()))
    }

    fn save_selected_vault(&self, _vault: &Path) -> Result<(), String> {
        Ok(())
    }
}

struct NoSelection;

impl TodayWorkspaceExchange for NoSelection {
    fn select_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(None)
    }
}

#[derive(Clone, Copy)]
struct FixedClock;

impl TodayClock for FixedClock {
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

#[derive(Clone, Copy)]
struct FollowingMondayClock;

impl TodayClock for FollowingMondayClock {
    fn current_date(&self) -> String {
        "2026-09-14".into()
    }

    fn current_time_label(&self) -> String {
        "08:00".into()
    }

    fn current_timestamp_label(&self) -> String {
        "2026-09-14T08:00-04:00".into()
    }
}

fn app(vault: &Path) -> TodayApplication<SelectedVault, NoSelection, FixedClock> {
    TodayApplication::new(SelectedVault(vault.to_path_buf()), NoSelection, FixedClock)
}

fn snapshot_path(vault: &Path) -> PathBuf {
    vault.join(".personal-dashboard/derived/habits-v1.json")
}

fn completion_path(vault: &Path) -> PathBuf {
    vault.join("life/.personal-dashboard/habit-completions/v1/completions.json")
}

fn write_snapshot(vault: &Path, document: &str) {
    let path = snapshot_path(vault);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, document).unwrap();
}

#[test]
fn a_local_completion_uses_the_catalog_key_counts_once_and_survives_relaunch() {
    let vault = TempVault::new("relaunch");
    write_snapshot(
        vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let snapshot_before = fs::read(snapshot_path(vault.path())).unwrap();
    let application = app(vault.path());
    let opened = application.habits().unwrap();
    let reset = opened.habit("reset").unwrap();
    assert_eq!(reset.completed_count, Some(0));
    assert!(reset.can_record_completion);

    let saved = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "complete-reset-2026-09-08".into(),
            target_binding: opened.completion_target_binding.clone().unwrap(),
            expected_revision: opened.completion_revision.clone(),
        })
        .unwrap();
    let saved_reset = saved.habit("reset").unwrap();

    assert_eq!(saved_reset.completed_count, Some(1));
    assert!(saved_reset.today.counts_as_completion);
    assert_eq!(
        saved_reset.today.local_completion_state,
        HabitLocalCompletionState::Completed
    );
    assert!(saved_reset
        .today
        .completion_source_labels
        .contains(&"Personal Dashboard local".to_string()));
    assert!(saved_reset
        .source_labels
        .contains(&"Personal Dashboard local".to_string()));

    let saved_without_external_day = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-06".into(),
            completed: true,
            change_id: "complete-reset-without-external-day".into(),
            target_binding: saved.completion_target_binding.clone().unwrap(),
            expected_revision: saved.completion_revision.clone(),
        })
        .unwrap();
    let unknown_external_cell = saved_without_external_day
        .habit("reset")
        .unwrap()
        .cell("2026-09-06")
        .unwrap();
    assert_eq!(unknown_external_cell.coverage, "unknown");
    assert!(unknown_external_cell.counts_as_completion);
    assert_eq!(
        unknown_external_cell.completion_source_labels,
        vec!["Personal Dashboard local"]
    );

    let relaunched = app(vault.path()).habits().unwrap();
    let relaunched_reset = relaunched.habit("reset").unwrap();
    assert_eq!(relaunched_reset.completed_count, Some(1));
    assert_eq!(
        relaunched_reset.today.local_completion_state,
        HabitLocalCompletionState::Completed
    );
    assert!(completion_path(vault.path()).is_file());
    assert_eq!(
        fs::read(snapshot_path(vault.path())).unwrap(),
        snapshot_before
    );
}

#[test]
fn a_replacement_snapshot_replaces_external_projection_but_keeps_local_completion_by_key() {
    let vault = TempVault::new("snapshot-replacement");
    let original = include_str!("fixtures/habits-v1-complete.json");
    write_snapshot(vault.path(), original);
    let application = app(vault.path());
    let opened = application.habits().unwrap();
    let locally_completed = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "complete-reset-before-replacement".into(),
            target_binding: opened.completion_target_binding.unwrap(),
            expected_revision: opened.completion_revision,
        })
        .unwrap();
    assert_eq!(
        locally_completed.habit("exercise").unwrap().completed_count,
        Some(2)
    );

    let replacement = original
        .replace(
            "\"key\": \"reset\", \"name\": \"Reset living space\"",
            "\"key\": \"reset\", \"name\": \"Home reset\"",
        )
        .replace(
            "2026-09-08T08:30:00-04:00\", \"status\": \"completed\"",
            "2026-09-08T08:30:00-04:00\", \"status\": \"not-done\"",
        )
        .replace(
            "2026-09-08T08:35:00-04:00\", \"status\": \"completed\"",
            "2026-09-08T08:35:00-04:00\", \"status\": \"not-done\"",
        )
        .replace(
            "2026-09-08T08:36:00-04:00\", \"status\": \"completed\"",
            "2026-09-08T08:36:00-04:00\", \"status\": \"not-done\"",
        )
        .replace(
            "2026-09-08T09:00:00-04:00\", \"status\": \"partial\"",
            "2026-09-08T09:00:00-04:00\", \"status\": \"not-done\"",
        );
    write_snapshot(vault.path(), &replacement);

    let refreshed = application.habits().unwrap();
    let exercise = refreshed.habit("exercise").unwrap();
    let reset = refreshed.habit("reset").unwrap();
    assert_eq!(exercise.completed_count, Some(1));
    assert!(!exercise.today.counts_as_completion);
    assert_eq!(reset.name, "Home reset");
    assert_eq!(reset.completed_count, Some(1));
    assert!(reset.today.counts_as_completion);
    assert_eq!(
        reset.today.completion_source_labels,
        vec!["Personal Dashboard local"]
    );
    assert_eq!(
        reset.today.local_completion_state,
        HabitLocalCompletionState::Completed
    );
}

#[test]
fn only_catalog_completion_habits_and_non_future_dates_are_writable() {
    let vault = TempVault::new("eligibility");
    write_snapshot(
        vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let application = app(vault.path());
    let opened = application.habits().unwrap();
    let binding = opened.completion_target_binding.unwrap();

    let time_error = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "wake".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "invalid-time-completion".into(),
            target_binding: binding.clone(),
            expected_revision: None,
        })
        .unwrap_err();
    assert!(time_error.contains("不是 completion 型"));
    let future_error = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-09".into(),
            completed: true,
            change_id: "invalid-future-completion".into(),
            target_binding: binding,
            expected_revision: None,
        })
        .unwrap_err();
    assert!(future_error.contains("未来日期"));
    assert!(!completion_path(vault.path()).exists());
}

#[test]
fn malformed_local_state_retains_the_last_valid_view_but_fails_closed_after_relaunch() {
    let vault = TempVault::new("malformed-retention");
    write_snapshot(
        vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let application = app(vault.path());
    let opened = application.habits().unwrap();
    let saved = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "complete-before-damage".into(),
            target_binding: opened.completion_target_binding.unwrap(),
            expected_revision: opened.completion_revision,
        })
        .unwrap();
    fs::write(completion_path(vault.path()), br#"{"schemaVersion":2}"#).unwrap();

    let retained = application.habits().unwrap();
    assert_eq!(retained.state, HabitSnapshotState::Retained);
    assert_eq!(retained.habits, saved.habits);
    assert!(retained.message.contains("继续显示上个有效快照"));

    let restarted = app(vault.path()).habits().unwrap();
    assert_eq!(restarted.state, HabitSnapshotState::Error);
    assert!(restarted.habits.is_empty());
}

#[test]
fn future_and_reversed_local_change_timestamps_are_rejected() {
    let future_documents = [
        (
            "future-modified-at",
            r#"{
  "schemaVersion": 1,
  "completions": [{
    "habitKey": "reset",
    "livedDate": "2026-09-08",
    "completedAt": "2026-09-08T13:00-04:00",
    "modifiedAt": "2026-09-08T23:59-04:00",
    "changes": [{"id":"future-modified","kind":"completed","changedAt":"2026-09-08T13:00-04:00"}]
  }],
  "noOpReceipts": []
}"#,
        ),
        (
            "future-completed-at",
            r#"{
  "schemaVersion": 1,
  "completions": [{
    "habitKey": "reset",
    "livedDate": "2026-09-08",
    "completedAt": "2026-09-08T23:59-04:00",
    "modifiedAt": "2026-09-08T13:00-04:00",
    "changes": [{"id":"future-completed","kind":"completed","changedAt":"2026-09-08T13:00-04:00"}]
  }],
  "noOpReceipts": []
}"#,
        ),
        (
            "future-changed-at",
            r#"{
  "schemaVersion": 1,
  "completions": [{
    "habitKey": "reset",
    "livedDate": "2026-09-08",
    "completedAt": "2026-09-08T13:00-04:00",
    "modifiedAt": "2026-09-08T13:00-04:00",
    "changes": [{"id":"future-changed","kind":"completed","changedAt":"2026-09-08T23:59-04:00"}]
  }],
  "noOpReceipts": []
}"#,
        ),
        (
            "future-accepted-at",
            r#"{
  "schemaVersion": 1,
  "completions": [],
  "noOpReceipts": [{
    "id": "future-receipt",
    "habitKey": "reset",
    "livedDate": "2026-09-08",
    "completed": false,
    "acceptedAt": "2026-09-08T23:59-04:00"
  }]
}"#,
        ),
    ];
    for (label, document) in future_documents {
        let future_vault = TempVault::new(label);
        write_snapshot(
            future_vault.path(),
            include_str!("fixtures/habits-v1-complete.json"),
        );
        let future_path = completion_path(future_vault.path());
        fs::create_dir_all(future_path.parent().unwrap()).unwrap();
        fs::write(&future_path, document).unwrap();

        let future = app(future_vault.path()).habits().unwrap();
        assert_eq!(future.state, HabitSnapshotState::Error, "{label}");
        assert!(future.message.contains("未来修改时间"), "{label}");
    }

    let reversed_vault = TempVault::new("reversed-local-time");
    write_snapshot(
        reversed_vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let reversed_path = completion_path(reversed_vault.path());
    fs::create_dir_all(reversed_path.parent().unwrap()).unwrap();
    fs::write(
        &reversed_path,
        br#"{
  "schemaVersion": 1,
  "completions": [{
    "habitKey": "reset",
    "livedDate": "2026-09-08",
    "completedAt": null,
    "modifiedAt": "2026-09-08T08:00-04:00",
    "changes": [
      {"id":"first-change","kind":"completed","changedAt":"2026-09-08T09:00-04:00"},
      {"id":"second-change","kind":"withdrawn","changedAt":"2026-09-08T08:00-04:00"}
    ]
  }],
  "noOpReceipts": []
}"#,
    )
    .unwrap();
    let reversed = app(reversed_vault.path()).habits().unwrap();
    assert_eq!(reversed.state, HabitSnapshotState::Error);
    assert!(reversed.message.contains("时间顺序倒置"));
}

#[test]
fn target_binding_and_revision_isolate_two_vaults_and_preserve_external_changes() {
    let vault_a = TempVault::new("vault-a");
    let vault_b = TempVault::new("vault-b");
    write_snapshot(
        vault_a.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    write_snapshot(
        vault_b.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let app_a = app(vault_a.path());
    let app_b = app(vault_b.path());
    let opened_a = app_a.habits().unwrap();
    let opened_b = app_b.habits().unwrap();
    app_a
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "vault-a-completion".into(),
            target_binding: opened_a.completion_target_binding.unwrap(),
            expected_revision: opened_a.completion_revision,
        })
        .unwrap();
    let crossed = app_b
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "crossed-completion".into(),
            target_binding: app_a.habits().unwrap().completion_target_binding.unwrap(),
            expected_revision: None,
        })
        .unwrap_err();
    assert!(crossed.contains("目标已经变化"));
    assert!(!completion_path(vault_b.path()).exists());

    app_b
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "vault-b-completion".into(),
            target_binding: opened_b.completion_target_binding.unwrap(),
            expected_revision: opened_b.completion_revision,
        })
        .unwrap();
    assert!(fs::read_to_string(completion_path(vault_a.path()))
        .unwrap()
        .contains("vault-a-completion"));
    assert!(fs::read_to_string(completion_path(vault_b.path()))
        .unwrap()
        .contains("vault-b-completion"));
}

struct InterleavingCompletionStore {
    interleave_next_save: Cell<bool>,
}

impl HabitCompletionStore for InterleavingCompletionStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        FileHabitCompletionStore.load(path)
    }

    fn save_if_unchanged(
        &self,
        path: &Path,
        expected: &[u8],
        updated: &[u8],
    ) -> Result<(), String> {
        if self.interleave_next_save.replace(false) {
            let external = String::from_utf8(expected.to_vec())
                .unwrap()
                .replace("complete-before-conflict", "external-valid-change");
            fs::write(path, external).unwrap();
        }
        FileHabitCompletionStore.save_if_unchanged(path, expected, updated)
    }

    fn create_new(&self, path: &Path, document: &[u8]) -> Result<(), String> {
        FileHabitCompletionStore.create_new(path, document)
    }
}

#[test]
fn concurrent_completion_change_preserves_external_bytes_and_is_retryable() {
    let vault = TempVault::new("concurrent");
    write_snapshot(
        vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let initial_app = app(vault.path());
    let opened = initial_app.habits().unwrap();
    initial_app
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "complete-before-conflict".into(),
            target_binding: opened.completion_target_binding.unwrap(),
            expected_revision: opened.completion_revision,
        })
        .unwrap();
    let application = TodayApplication::with_every_store(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        FixedClock,
        FileTodayRecordStore,
        FileHabitSnapshotStore,
        FileDayTaskStore,
        InterleavingCompletionStore {
            interleave_next_save: Cell::new(true),
        },
    );
    let before = application.habits().unwrap();
    let error = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "nutrition".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "nutrition-conflicted".into(),
            target_binding: before.completion_target_binding.unwrap(),
            expected_revision: before.completion_revision,
        })
        .unwrap_err();
    assert!(error.contains("并发变化") || error.contains("外部发生变化"));
    let after_conflict = fs::read_to_string(completion_path(vault.path())).unwrap();
    assert!(after_conflict.contains("external-valid-change"));
    assert!(!after_conflict.contains("nutrition-conflicted"));

    let retry_app = app(vault.path());
    let refreshed = retry_app.habits().unwrap();
    let retried = retry_app
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "nutrition".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "nutrition-retried".into(),
            target_binding: refreshed.completion_target_binding.unwrap(),
            expected_revision: refreshed.completion_revision,
        })
        .unwrap();
    assert_eq!(
        retried
            .habit("nutrition")
            .unwrap()
            .today
            .local_completion_state,
        HabitLocalCompletionState::Completed
    );
}

#[test]
fn a_local_record_outside_the_new_twelve_week_window_is_not_deleted() {
    let vault = TempVault::new("window-roll");
    let original = include_str!("fixtures/habits-v1-complete.json");
    write_snapshot(vault.path(), original);
    let initial_app = app(vault.path());
    let opened = initial_app.habits().unwrap();
    initial_app
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-06-22".into(),
            completed: true,
            change_id: "historical-window-completion".into(),
            target_binding: opened.completion_target_binding.unwrap(),
            expected_revision: opened.completion_revision,
        })
        .unwrap();
    let local_before = fs::read(completion_path(vault.path())).unwrap();
    let rolled_snapshot =
        original.replace("2026-09-08T14:10:00-04:00", "2026-09-13T14:10:00-04:00");
    write_snapshot(vault.path(), &rolled_snapshot);

    let rolled = TodayApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        FollowingMondayClock,
    )
    .habits()
    .unwrap();
    assert_eq!(rolled.state, HabitSnapshotState::Stale);
    assert_eq!(
        rolled.display_range_label.as_deref(),
        Some("2026-06-29 — 2026-09-20")
    );
    assert_eq!(
        fs::read(completion_path(vault.path())).unwrap(),
        local_before
    );
    assert!(fs::read_to_string(completion_path(vault.path()))
        .unwrap()
        .contains("historical-window-completion"));
}
