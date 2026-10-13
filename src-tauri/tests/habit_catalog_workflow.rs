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
    vault.join("life/.personal-dashboard/derived/habits-v1.json")
}

fn completion_path(vault: &Path) -> PathBuf {
    vault.join("life/.personal-dashboard/habit-completions/v1/completions.json")
}

fn write_snapshot(vault: &Path, document: &str) {
    let path = snapshot_path(vault);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, document).unwrap();
}


use personal_dashboard_lib::habit_catalog::{HabitDefinitionMutationInput, HabitGoal, HabitSettings};

#[test]
fn create_local_habit_without_snapshot_complete_and_reopen_with_stable_identity() {
    let vault = TempVault::new("catalog-create");
    let application = app(vault.path());
    let opened = application.habits().unwrap();
    let input = HabitDefinitionMutationInput {
        habit_key: "local-reading".into(), change_id: "create-reading".into(),
        target_binding: opened.catalog_target_binding.unwrap(), expected_revision: opened.catalog_revision,
        settings: HabitSettings { name: "Reading".into(), emoji: Some("📖".into()), group: None,
            start_date: "2026-09-08".into(), goal: HabitGoal::DailyCompletion },
    };
    let created = application.save_habit_definition(input.clone()).unwrap();
    let retry = application.save_habit_definition(input).unwrap();
    assert_eq!(retry.habits.len(), 1);
    let saved = application.set_local_habit_completion(HabitCompletionMutationInput {
        habit_key: "local-reading".into(), lived_date: "2026-09-08".into(), completed: true,
        change_id: "reading-completed".into(), target_binding: created.completion_target_binding.unwrap(),
        expected_revision: created.completion_revision,
    }).unwrap();
    assert!(saved.habit("local-reading").unwrap().today.counts_as_completion);
    let reopened = app(vault.path()).habits().unwrap();
    assert_eq!(reopened.habit("local-reading").unwrap().name, "Reading");
    assert!(reopened.habit("local-reading").unwrap().today.counts_as_completion);
    assert!(!snapshot_path(vault.path()).exists());
}
