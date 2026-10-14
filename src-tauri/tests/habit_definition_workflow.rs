use personal_dashboard_lib::habits::LocalHabitGoal;
use personal_dashboard_lib::today::{
    HabitCompletionMutationInput, HabitDefinitionMutationInput, TodayApplication, TodayClock,
    TodayWorkspaceExchange, TodayWorkspacePersistence,
};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

struct TempVault(PathBuf);

impl TempVault {
    fn new() -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "personal-dashboard-habit-definition-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir_all(path.join(".obsidian")).unwrap();
        fs::create_dir_all(path.join("life/Journal/Daily")).unwrap();
        Self(path)
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
struct FixedClock(&'static str);

impl TodayClock for FixedClock {
    fn current_date(&self) -> String {
        self.0.into()
    }

    fn current_time_label(&self) -> String {
        "14:10".into()
    }

    fn current_timestamp_label(&self) -> String {
        format!("{}T14:10:00-04:00", self.0)
    }
}

type App = TodayApplication<SelectedVault, NoSelection, FixedClock>;

fn app(vault: &TempVault, date: &'static str) -> App {
    App::new(SelectedVault(vault.0.clone()), NoSelection, FixedClock(date))
}

#[test]
fn locally_created_habit_can_be_checked_and_read_after_a_new_application_instance() {
    let vault = TempVault::new();
    let application = app(&vault, "2026-09-08");
    let empty = application.habits().unwrap();
    let created = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "create".into(),
            key: "local-water".into(),
            name: "Drink water".into(),
            emoji: Some("💧".into()),
            group: Some("Health".into()),
            start_date: Some("2026-09-08".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 3 }),
            change_id: "create-water-habit".into(),
            target_binding: empty.definition_target_binding.unwrap(),
            expected_revision: empty.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();

    let habit = created.habit("local-water").unwrap();
    assert_eq!(habit.name, "Drink water");
    assert_eq!(habit.emoji.as_deref(), Some("💧"));
    assert_eq!(habit.group.as_deref(), Some("Health"));
    assert_eq!(habit.start_date.as_deref(), Some("2026-09-08"));
    assert!(habit.is_local_definition);
    assert!(habit.can_record_completion);

    let checked = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-water".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "complete-water-today".into(),
            target_binding: created.completion_target_binding.clone().unwrap(),
            expected_revision: created.completion_revision.clone(),
        })
        .unwrap();
    assert!(
        checked
            .habit("local-water")
            .unwrap()
            .today
            .counts_as_completion
    );

    drop(application);
    let reopened = app(&vault, "2026-09-08").habits().unwrap();
    let habit = reopened.habit("local-water").unwrap();
    assert_eq!(habit.goal_kind, "weekly-count");
    assert_eq!(habit.weekly_target, Some(3));
    assert_eq!(habit.completed_count, Some(1));
    assert!(habit.today.counts_as_completion);
    assert!(vault
        .0
        .join("life/.personal-dashboard/habits/v1/catalog.json")
        .is_file());
    assert!(vault
        .0
        .join("life/.personal-dashboard/habit-completions/v1/completions.json")
        .is_file());
    assert!(!vault
        .0
        .join("life/.personal-dashboard/derived/habits-v1.json")
        .exists());
}

#[test]
fn daily_count_goal_and_next_week_revision_survive_readback_without_changing_identity_or_history() {
    let vault = TempVault::new();
    let application = app(&vault, "2026-09-08");
    let empty = application.habits().unwrap();
    let created = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "create".into(),
            key: "local-reading".into(),
            name: "Read".into(),
            emoji: None,
            group: None,
            start_date: Some("2026-09-08".into()),
            goal: Some(LocalHabitGoal::DailyCount),
            change_id: "create-reading-habit".into(),
            target_binding: empty.definition_target_binding.unwrap(),
            expected_revision: empty.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    assert_eq!(created.habit("local-reading").unwrap().goal_kind, "daily-count");

    let completed = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-reading".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "complete-reading-tuesday".into(),
            target_binding: created.completion_target_binding.clone().unwrap(),
            expected_revision: created.completion_revision.clone(),
        })
        .unwrap();
    let before_edit = completed.habit("local-reading").unwrap();
    let stable_key = before_edit.key.clone();
    let current_completion = before_edit.today.counts_as_completion;

    let revised = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "local-reading".into(),
            name: "Read a little".into(),
            emoji: Some("📖".into()),
            group: Some("Quiet".into()),
            start_date: Some("2026-09-08".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 5 }),
            change_id: "revise-reading-weekly-goal".into(),
            target_binding: completed.definition_target_binding.clone().unwrap(),
            expected_revision: completed.definition_revision.clone(),
            expected_snapshot_revision: None,
        })
        .unwrap();
    let after_edit = revised.habit("local-reading").unwrap();
    assert_eq!(after_edit.key, stable_key);
    assert_eq!(after_edit.name, "Read a little");
    assert_eq!(after_edit.weekly_target, Some(1), "daily goal remains in force today");
    assert_eq!(after_edit.pending_goal_label.as_deref(), Some("每周 5 天"));
    assert_eq!(after_edit.today.counts_as_completion, current_completion);
    assert_eq!(after_edit.start_date.as_deref(), Some("2026-09-08"));

    let reopened_next_week = app(&vault, "2026-09-14").habits().unwrap();
    let next_week = reopened_next_week.habit("local-reading").unwrap();
    assert_eq!(next_week.weekly_target, Some(5));
    assert_eq!(next_week.name, "Read a little");
    assert!(next_week.history.iter().any(|cell| {
        cell.date == "2026-09-08" && cell.counts_as_completion
    }));
}
