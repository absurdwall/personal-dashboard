use personal_dashboard_lib::habits::{DayRelation, LocalHabitGoal};
use personal_dashboard_lib::today::{
    HabitCompletionMutationInput, HabitDefinitionMutationInput, TodayApplication, TodayClock,
    TodayWorkspaceExchange, TodayWorkspacePersistence,
};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

static TEMP_VAULT_SEQUENCE: AtomicU64 = AtomicU64::new(0);

struct TempVault(PathBuf);

impl TempVault {
    fn new() -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "personal-dashboard-habit-definition-{}-{nonce}-{}",
            std::process::id(),
            TEMP_VAULT_SEQUENCE.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir(&path).unwrap();
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
    app_with_clock(vault, FixedClock(date))
}

fn app_with_clock<C: TodayClock>(
    vault: &TempVault,
    clock: C,
) -> TodayApplication<SelectedVault, NoSelection, C> {
    TodayApplication::new(SelectedVault(vault.0.clone()), NoSelection, clock)
}

#[derive(Clone, Copy)]
struct EarlyClock {
    date: &'static str,
    time: &'static str,
}

impl TodayClock for EarlyClock {
    fn current_date(&self) -> String {
        self.date.into()
    }

    fn current_time_label(&self) -> String {
        self.time.into()
    }

    fn current_timestamp_label(&self) -> String {
        format!("{}T{}:00-04:00", self.date, self.time)
    }
}

fn snapshot_path(vault: &TempVault) -> PathBuf {
    vault
        .0
        .join("life/.personal-dashboard/derived/habits-v1.json")
}

fn write_source_snapshot(vault: &TempVault, contents: &str) {
    let path = snapshot_path(vault);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, contents).unwrap();
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
            name_changed: false,
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
    assert!(
        vault
            .0
            .join("life/.personal-dashboard/habits/v1/catalog.json")
            .is_file()
    );
    assert!(
        vault
            .0
            .join("life/.personal-dashboard/habit-completions/v1/completions.json")
            .is_file()
    );
    assert!(
        !vault
            .0
            .join("life/.personal-dashboard/derived/habits-v1.json")
            .exists()
    );
}

#[test]
fn daily_count_goal_revision_takes_effect_on_the_next_lived_day_and_survives_reopen() {
    let vault = TempVault::new();
    let application = app(&vault, "2026-09-08");
    let empty = application.habits().unwrap();
    let created = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "create".into(),
            key: "local-reading".into(),
            name: "Read".into(),
            name_changed: false,
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
    assert_eq!(
        created.habit("local-reading").unwrap().goal_kind,
        "daily-count"
    );

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
            name_changed: true,
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
    assert_eq!(
        after_edit.weekly_target,
        Some(1),
        "daily goal remains in force today"
    );
    assert_eq!(after_edit.pending_goal_label.as_deref(), Some("每周 5 天"));
    assert_eq!(after_edit.today.counts_as_completion, current_completion);
    assert_eq!(after_edit.start_date.as_deref(), Some("2026-09-08"));

    let reopened_next_day = app(&vault, "2026-09-09").habits().unwrap();
    let next_day = reopened_next_day.habit("local-reading").unwrap();
    assert_eq!(next_day.weekly_target, Some(5));
    assert_eq!(
        next_day.completed_count,
        Some(0),
        "the Tuesday daily completion must not carry into the new weekly cycle"
    );
    assert_eq!(next_day.weekly_period_start.as_deref(), Some("2026-09-09"));
    assert!(next_day.weekly_period_partial);
    assert_eq!(reopened_next_day.summary.target_completions, 0);
    assert_eq!(reopened_next_day.summary.known_completions, 0);
    assert_eq!(reopened_next_day.summary.partial_weeks_excluded, 1);
    assert_eq!(next_day.name, "Read a little");
    assert!(
        next_day
            .history
            .iter()
            .any(|cell| { cell.date == "2026-09-08" && cell.counts_as_completion })
    );

    let partial_app = app(&vault, "2026-09-09");
    partial_app
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-reading".into(),
            lived_date: "2026-09-09".into(),
            completed: true,
            change_id: "complete-first-weekly-day".into(),
            target_binding: reopened_next_day.completion_target_binding.clone().unwrap(),
            expected_revision: reopened_next_day.completion_revision.clone(),
        })
        .unwrap();
    let partial_week_readback = app(&vault, "2026-09-10").habits().unwrap();
    let partial_week_habit = partial_week_readback.habit("local-reading").unwrap();
    assert_eq!(partial_week_habit.completed_count, Some(1));
    assert_eq!(
        partial_week_habit.weekly_period_start.as_deref(),
        Some("2026-09-09")
    );
    assert!(partial_week_habit.weekly_period_partial);
    assert_eq!(partial_week_readback.summary.known_completions, 0);
    assert_eq!(partial_week_readback.summary.target_completions, 0);
    assert_eq!(partial_week_readback.summary.partial_weeks_excluded, 1);

    let next_full_week = app(&vault, "2026-09-14").habits().unwrap();
    let full_week_habit = next_full_week.habit("local-reading").unwrap();
    assert_eq!(
        full_week_habit.weekly_period_start.as_deref(),
        Some("2026-09-14")
    );
    assert!(!full_week_habit.weekly_period_partial);
    assert_eq!(next_full_week.summary.target_completions, 5);
    assert_eq!(next_full_week.summary.partial_weeks_excluded, 0);
}

#[test]
fn daily_to_weekly_revision_at_the_four_am_monday_boundary_starts_a_full_week() {
    let vault = TempVault::new();
    let before_boundary = app_with_clock(
        &vault,
        EarlyClock {
            date: "2026-09-14",
            time: "03:30",
        },
    );
    let empty = before_boundary.habits().unwrap();
    assert_eq!(empty.current_lived_date.as_deref(), Some("2026-09-13"));
    let created = before_boundary
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "create".into(),
            key: "local-boundary-reading".into(),
            name: "Read".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-13".into()),
            goal: Some(LocalHabitGoal::DailyCount),
            change_id: "create-boundary-reading".into(),
            target_binding: empty.definition_target_binding.unwrap(),
            expected_revision: empty.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    let completed = before_boundary
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-boundary-reading".into(),
            lived_date: "2026-09-13".into(),
            completed: true,
            change_id: "complete-sunday-reading".into(),
            target_binding: created.completion_target_binding.unwrap(),
            expected_revision: created.completion_revision,
        })
        .unwrap();
    let revised = before_boundary
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "local-boundary-reading".into(),
            name: "Read".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-13".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 3 }),
            change_id: "schedule-weekly-at-boundary".into(),
            target_binding: completed.definition_target_binding.unwrap(),
            expected_revision: completed.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    assert_eq!(
        revised.habit("local-boundary-reading").unwrap().goal_kind,
        "daily-count"
    );
    assert_eq!(
        revised
            .habit("local-boundary-reading")
            .unwrap()
            .completed_count,
        Some(1)
    );

    let still_sunday = app_with_clock(
        &vault,
        EarlyClock {
            date: "2026-09-14",
            time: "03:59",
        },
    )
    .habits()
    .unwrap();
    assert_eq!(
        still_sunday.current_lived_date.as_deref(),
        Some("2026-09-13")
    );
    assert_eq!(
        still_sunday
            .habit("local-boundary-reading")
            .unwrap()
            .goal_kind,
        "daily-count"
    );

    let monday = app_with_clock(
        &vault,
        EarlyClock {
            date: "2026-09-14",
            time: "04:00",
        },
    )
    .habits()
    .unwrap();
    let habit = monday.habit("local-boundary-reading").unwrap();
    assert_eq!(
        habit.current_goal,
        Some(LocalHabitGoal::WeeklyCount { days: 3 })
    );
    assert_eq!(habit.weekly_period_start.as_deref(), Some("2026-09-14"));
    assert!(!habit.weekly_period_partial);
    assert_eq!(habit.completed_count, Some(0));
    assert_eq!(monday.summary.known_completions, 0);
    assert_eq!(monday.summary.target_completions, 3);
    assert_eq!(monday.summary.partial_weeks_excluded, 0);
}

#[test]
fn weekly_start_date_excludes_earlier_completions_from_partial_week() {
    let vault = TempVault::new();
    let application = app(&vault, "2026-09-08");
    let empty = application.habits().unwrap();
    let created = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "create".into(),
            key: "local-start-date-walk".into(),
            name: "Walk".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-07".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 3 }),
            change_id: "create-start-date-walk".into(),
            target_binding: empty.definition_target_binding.unwrap(),
            expected_revision: empty.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    let completed = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-start-date-walk".into(),
            lived_date: "2026-09-07".into(),
            completed: true,
            change_id: "complete-before-start-date".into(),
            target_binding: created.completion_target_binding.clone().unwrap(),
            expected_revision: created.completion_revision,
        })
        .unwrap();
    application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "local-start-date-walk".into(),
            name: "Walk".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-09".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 3 }),
            change_id: "move-start-date-forward".into(),
            target_binding: completed.definition_target_binding.unwrap(),
            expected_revision: completed.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();

    let reopened = app(&vault, "2026-09-09").habits().unwrap();
    let habit = reopened.habit("local-start-date-walk").unwrap();
    assert_eq!(habit.completed_count, Some(0));
    assert_eq!(habit.weekly_period_start.as_deref(), Some("2026-09-09"));
    assert!(habit.weekly_period_partial);
    assert_eq!(reopened.summary.target_completions, 0);
    assert_eq!(reopened.summary.partial_weeks_excluded, 1);
    assert!(
        habit
            .history
            .iter()
            .any(|cell| { cell.date == "2026-09-07" && cell.counts_as_completion })
    );
}

#[test]
fn weekly_target_revision_keeps_the_partial_week_start_from_frequency_transition() {
    let vault = TempVault::new();
    let monday = app(&vault, "2026-09-07");
    let empty = monday.habits().unwrap();
    let created = monday
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "create".into(),
            key: "local-revised-frequency".into(),
            name: "Read".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-07".into()),
            goal: Some(LocalHabitGoal::DailyCount),
            change_id: "create-revised-frequency".into(),
            target_binding: empty.definition_target_binding.unwrap(),
            expected_revision: empty.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    let monday_completion = monday
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-revised-frequency".into(),
            lived_date: "2026-09-07".into(),
            completed: true,
            change_id: "complete-daily-monday".into(),
            target_binding: created.completion_target_binding.unwrap(),
            expected_revision: created.completion_revision,
        })
        .unwrap();
    monday
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "local-revised-frequency".into(),
            name: "Read".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-07".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 3 }),
            change_id: "schedule-weekly-three".into(),
            target_binding: monday_completion.definition_target_binding.unwrap(),
            expected_revision: monday_completion.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();

    let thursday = app(&vault, "2026-09-10");
    let weekly_view = thursday.habits().unwrap();
    let habit = weekly_view.habit("local-revised-frequency").unwrap();
    assert_eq!(habit.weekly_period_start.as_deref(), Some("2026-09-08"));
    assert_eq!(habit.completed_count, Some(0));
    let tuesday_completion = thursday
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-revised-frequency".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "complete-weekly-tuesday".into(),
            target_binding: weekly_view.completion_target_binding.unwrap(),
            expected_revision: weekly_view.completion_revision,
        })
        .unwrap();
    thursday
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "local-revised-frequency".into(),
            name: "Read".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-07".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 5 }),
            change_id: "schedule-weekly-five".into(),
            target_binding: tuesday_completion.definition_target_binding.unwrap(),
            expected_revision: tuesday_completion.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();

    let catalog_path = vault
        .0
        .join("life/.personal-dashboard/habits/v1/catalog.json");
    let mut catalog: serde_json::Value =
        serde_json::from_slice(&fs::read(&catalog_path).unwrap()).unwrap();
    let revisions = catalog["habits"][0]["goalRevisions"]
        .as_array_mut()
        .unwrap();
    let weekly_target_revision = revisions
        .iter_mut()
        .find(|revision| revision["goal"]["days"] == 5)
        .unwrap();
    weekly_target_revision["effectiveOn"] = "2026-09-10".into();
    fs::write(&catalog_path, serde_json::to_vec_pretty(&catalog).unwrap()).unwrap();

    let friday = app(&vault, "2026-09-11").habits().unwrap();
    let habit = friday.habit("local-revised-frequency").unwrap();
    assert_eq!(
        habit.current_goal,
        Some(LocalHabitGoal::WeeklyCount { days: 5 })
    );
    assert_eq!(habit.weekly_period_start.as_deref(), Some("2026-09-08"));
    assert!(habit.weekly_period_partial);
    assert_eq!(habit.completed_count, Some(1));
    assert_eq!(friday.summary.known_completions, 0);
    assert_eq!(friday.summary.target_completions, 0);
    assert_eq!(friday.summary.partial_weeks_excluded, 1);
    assert!(
        habit
            .history
            .iter()
            .any(|cell| { cell.date == "2026-09-07" && cell.counts_as_completion })
    );
    assert!(
        habit
            .history
            .iter()
            .any(|cell| { cell.date == "2026-09-08" && cell.counts_as_completion })
    );
}

#[test]
fn daily_time_next_day_relation_survives_a_new_application_instance() {
    let vault = TempVault::new();
    let application = app(&vault, "2026-09-08");
    let empty = application.habits().unwrap();
    let created = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "create".into(),
            key: "local-sleep-window".into(),
            name: "Be in bed".into(),
            name_changed: false,
            emoji: Some("🌙".into()),
            group: Some("Rest".into()),
            start_date: Some("2026-09-08".into()),
            goal: Some(LocalHabitGoal::DailyTime {
                standard: "22:30".into(),
                day_relation: DayRelation::NextDay,
            }),
            change_id: "create-next-day-time-habit".into(),
            target_binding: empty.definition_target_binding.unwrap(),
            expected_revision: empty.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();

    let habit = created.habit("local-sleep-window").unwrap();
    assert_eq!(habit.goal_kind, "daily-time");
    assert_eq!(habit.goal_label, "每日 次日 22:30");
    assert!(!habit.can_record_completion);
    drop(application);

    let reopened = app(&vault, "2026-09-09").habits().unwrap();
    let habit = reopened.habit("local-sleep-window").unwrap();
    assert_eq!(
        habit.current_goal,
        Some(LocalHabitGoal::DailyTime {
            standard: "22:30".into(),
            day_relation: DayRelation::NextDay,
        })
    );
    assert_eq!(habit.goal_label, "每日 次日 22:30");
}

#[test]
fn weekly_goal_revision_keeps_this_week_and_records_its_historical_goal() {
    let vault = TempVault::new();
    let application = app(&vault, "2026-09-09");
    let empty = application.habits().unwrap();
    let created = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "create".into(),
            key: "local-walk".into(),
            name: "Walk".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-09".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 3 }),
            change_id: "create-weekly-walk".into(),
            target_binding: empty.definition_target_binding.unwrap(),
            expected_revision: empty.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    let completed = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-walk".into(),
            lived_date: "2026-09-09".into(),
            completed: true,
            change_id: "complete-walk-wednesday".into(),
            target_binding: created.completion_target_binding.unwrap(),
            expected_revision: created.completion_revision,
        })
        .unwrap();
    let changed = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "local-walk".into(),
            name: "Walk".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-09".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 5 }),
            change_id: "change-walk-to-five-days".into(),
            target_binding: completed.definition_target_binding.unwrap(),
            expected_revision: completed.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    let this_week = changed.habit("local-walk").unwrap();
    assert_eq!(this_week.weekly_target, Some(3));
    assert_eq!(this_week.pending_goal_label.as_deref(), Some("每周 5 天"));

    let next_week = app(&vault, "2026-09-14").habits().unwrap();
    let next_week_habit = next_week.habit("local-walk").unwrap();
    assert_eq!(next_week_habit.weekly_target, Some(5));
    assert!(
        next_week_habit
            .history
            .iter()
            .any(|cell| { cell.date == "2026-09-09" && cell.counts_as_completion })
    );
    assert!(
        next_week_habit
            .goal_history
            .iter()
            .any(|goal| { goal.week_of == "2026-09-07" && goal.goal_label == "每周 3 天" })
    );
}

#[test]
fn weekly_revision_at_0330_waits_for_the_next_lived_week_boundary() {
    let vault = TempVault::new();
    let before_boundary = app_with_clock(
        &vault,
        EarlyClock {
            date: "2026-09-14",
            time: "03:30",
        },
    );
    let empty = before_boundary.habits().unwrap();
    assert_eq!(empty.current_lived_date.as_deref(), Some("2026-09-13"));
    let created = before_boundary
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "create".into(),
            key: "local-sunday-walk".into(),
            name: "Sunday walk".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-13".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 3 }),
            change_id: "create-sunday-walk".into(),
            target_binding: empty.definition_target_binding.unwrap(),
            expected_revision: empty.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    let revised = before_boundary
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "local-sunday-walk".into(),
            name: "Sunday walk".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-13".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 5 }),
            change_id: "change-sunday-walk-to-five".into(),
            target_binding: created.definition_target_binding.unwrap(),
            expected_revision: created.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    assert_eq!(
        revised.habit("local-sunday-walk").unwrap().weekly_target,
        Some(3)
    );
    assert_eq!(
        revised
            .habit("local-sunday-walk")
            .unwrap()
            .pending_goal_label
            .as_deref(),
        Some("每周 5 天")
    );

    let after_boundary = app_with_clock(
        &vault,
        EarlyClock {
            date: "2026-09-14",
            time: "04:00",
        },
    )
    .habits()
    .unwrap();
    let habit = after_boundary.habit("local-sunday-walk").unwrap();
    assert_eq!(habit.weekly_target, Some(5));
    assert!(habit.pending_goal.is_none());
    assert!(
        habit
            .goal_history
            .iter()
            .any(|goal| { goal.week_of == "2026-09-07" && goal.goal_label == "每周 3 天" })
    );
}

#[test]
fn changing_a_pending_weekly_goal_replaces_or_cancels_only_the_future_revision() {
    let vault = TempVault::new();
    let application = app(&vault, "2026-09-09");
    let empty = application.habits().unwrap();
    let created = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "create".into(),
            key: "local-stretch".into(),
            name: "Stretch".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-09".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 3 }),
            change_id: "create-stretch".into(),
            target_binding: empty.definition_target_binding.unwrap(),
            expected_revision: empty.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    let five_days = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "local-stretch".into(),
            name: "Stretch".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-09".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 5 }),
            change_id: "stretch-to-five".into(),
            target_binding: created.definition_target_binding.unwrap(),
            expected_revision: created.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    let six_days = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "local-stretch".into(),
            name: "Stretch".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-09".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 6 }),
            change_id: "stretch-to-six".into(),
            target_binding: five_days.definition_target_binding.unwrap(),
            expected_revision: five_days.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    assert_eq!(
        six_days.habit("local-stretch").unwrap().weekly_target,
        Some(3)
    );
    assert_eq!(
        six_days
            .habit("local-stretch")
            .unwrap()
            .pending_goal_label
            .as_deref(),
        Some("每周 6 天")
    );

    let cancelled = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "local-stretch".into(),
            name: "Stretch".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-09".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 3 }),
            change_id: "stretch-back-to-three".into(),
            target_binding: six_days.definition_target_binding.unwrap(),
            expected_revision: six_days.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    assert_eq!(
        cancelled.habit("local-stretch").unwrap().weekly_target,
        Some(3)
    );
    assert!(
        cancelled
            .habit("local-stretch")
            .unwrap()
            .pending_goal
            .is_none()
    );
    let stored: serde_json::Value = serde_json::from_slice(
        &fs::read(
            vault
                .0
                .join("life/.personal-dashboard/habits/v1/catalog.json"),
        )
        .unwrap(),
    )
    .unwrap();
    let revisions = stored["habits"][0]["goalRevisions"].as_array().unwrap();
    assert!(revisions.iter().any(|revision| {
        revision["disposition"] == "superseded" && revision["goal"]["days"] == 5
    }));
    assert!(revisions.iter().any(|revision| {
        revision["disposition"] == "cancelled" && revision["goal"]["days"] == 6
    }));
    assert_eq!(
        revisions
            .iter()
            .filter(|revision| revision["disposition"] == "scheduled")
            .count(),
        0
    );
    assert_eq!(
        next_goal_after_reopen(&vault),
        LocalHabitGoal::WeeklyCount { days: 3 }
    );
}

fn next_goal_after_reopen(vault: &TempVault) -> LocalHabitGoal {
    app(vault, "2026-09-14")
        .habits()
        .unwrap()
        .habit("local-stretch")
        .unwrap()
        .current_goal
        .as_ref()
        .unwrap()
        .clone()
}

#[test]
fn source_habit_non_name_edit_keeps_canonical_name_and_localized_names_across_refresh() {
    let vault = TempVault::new();
    write_source_snapshot(&vault, include_str!("fixtures/habits-v1-complete.json"));
    let names_path = vault
        .0
        .join("life/.personal-dashboard/habit-names/v1/names.json");
    fs::create_dir_all(names_path.parent().unwrap()).unwrap();
    fs::write(
        &names_path,
        r#"{"schemaVersion":1,"habits":{"exercise":{"zh":"锻炼","en":"Exercise"}}}"#,
    )
    .unwrap();
    let original_snapshot = fs::read(snapshot_path(&vault)).unwrap();
    let application = app(&vault, "2026-09-08");
    let before = application.habits().unwrap();
    let source = before.habit("exercise").unwrap();
    assert_eq!(source.name, "Exercise");
    let unchanged_goal = source.current_goal.clone();

    let edited = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "exercise".into(),
            name: "锻炼".into(),
            name_changed: false,
            emoji: None,
            group: Some("Movement".into()),
            start_date: None,
            goal: unchanged_goal,
            change_id: "edit-source-exercise-group-only".into(),
            target_binding: before.definition_target_binding.unwrap(),
            expected_revision: before.definition_revision,
            expected_snapshot_revision: before.snapshot_revision,
        })
        .unwrap();

    let habit = edited.habit("exercise").unwrap();
    assert_eq!(habit.name, "Exercise");
    assert!(!habit.local_name_override);
    assert_eq!(habit.localized_names.zh.as_deref(), Some("锻炼"));
    assert_eq!(habit.localized_names.en.as_deref(), Some("Exercise"));
    assert_eq!(habit.group.as_deref(), Some("Movement"));
    assert_eq!(fs::read(snapshot_path(&vault)).unwrap(), original_snapshot);
    let catalog: serde_json::Value = serde_json::from_slice(
        &fs::read(
            vault
                .0
                .join("life/.personal-dashboard/habits/v1/catalog.json"),
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(catalog["habits"][0]["name"], "Exercise");
    assert!(catalog["habits"][0].get("nameOverride").is_none());

    let mut refreshed_snapshot: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/habits-v1-complete.json")).unwrap();
    let refreshed_exercise = refreshed_snapshot["habits"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|habit| habit["key"] == "exercise")
        .unwrap();
    refreshed_exercise["name"] = "Source exercise refreshed".into();
    write_source_snapshot(&vault, &serde_json::to_string(&refreshed_snapshot).unwrap());
    let reopened = app(&vault, "2026-09-08").habits().unwrap();
    let refreshed = reopened.habit("exercise").unwrap();
    assert_eq!(refreshed.name, "Source exercise refreshed");
    assert_eq!(refreshed.localized_names.zh.as_deref(), Some("锻炼"));
    assert_eq!(refreshed.localized_names.en.as_deref(), Some("Exercise"));
}

#[test]
fn source_habit_edit_and_snapshot_refresh_preserve_local_overlay_and_evidence_identity() {
    let vault = TempVault::new();
    write_source_snapshot(&vault, include_str!("fixtures/habits-v1-complete.json"));
    let names_path = vault
        .0
        .join("life/.personal-dashboard/habit-names/v1/names.json");
    fs::create_dir_all(names_path.parent().unwrap()).unwrap();
    fs::write(
        &names_path,
        r#"{"schemaVersion":1,"habits":{"exercise":{"zh":"锻炼","en":"Exercise"}}}"#,
    )
    .unwrap();
    let source_snapshot_before = fs::read(snapshot_path(&vault)).unwrap();
    let application = app(&vault, "2026-09-08");
    let before = application.habits().unwrap();
    let source = before.habit("exercise").unwrap();
    assert!(!source.created_locally);
    assert_eq!(source.localized_names.zh.as_deref(), Some("锻炼"));
    assert_eq!(source.localized_names.en.as_deref(), Some("Exercise"));
    let original_status = source.today.status;
    let original_source_labels = source.source_labels.clone();

    let input = HabitDefinitionMutationInput {
        mode: "edit".into(),
        key: "exercise".into(),
        name: "Strength walk".into(),
        name_changed: true,
        emoji: Some("🚶".into()),
        group: Some("Movement".into()),
        start_date: None,
        goal: Some(LocalHabitGoal::WeeklyCount { days: 5 }),
        change_id: "edit-source-exercise".into(),
        target_binding: before.definition_target_binding.clone().unwrap(),
        expected_revision: before.definition_revision.clone(),
        expected_snapshot_revision: before.snapshot_revision.clone(),
    };
    let edited = application.save_habit_definition(input.clone()).unwrap();
    let local = edited.habit("exercise").unwrap();
    assert_eq!(local.key, source.key);
    assert_eq!(local.name, "Strength walk");
    assert!(local.local_name_override);
    let catalog: serde_json::Value = serde_json::from_slice(
        &fs::read(
            vault
                .0
                .join("life/.personal-dashboard/habits/v1/catalog.json"),
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(catalog["habits"][0]["name"], "Strength walk");
    assert_eq!(catalog["habits"][0]["nameOverride"], true);
    assert_eq!(local.localized_names, source.localized_names);
    assert_eq!(
        fs::read(snapshot_path(&vault)).unwrap(),
        source_snapshot_before
    );
    assert_eq!(local.emoji.as_deref(), Some("🚶"));
    assert_eq!(local.group.as_deref(), Some("Movement"));
    assert_eq!(local.source_labels, original_source_labels);
    assert_eq!(local.today.status, original_status);
    assert_eq!(local.weekly_target, Some(3));
    assert_eq!(local.pending_goal_label.as_deref(), Some("每周 5 天"));
    assert!(
        local
            .goal_history
            .iter()
            .any(|goal| { goal.week_of == "2026-08-31" && goal.goal_label == "每周 2 天" })
    );

    let replayed = application.save_habit_definition(input).unwrap();
    assert_eq!(
        replayed
            .habits
            .iter()
            .filter(|habit| habit.key == "exercise")
            .count(),
        1
    );

    let mut refreshed: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/habits-v1-complete.json")).unwrap();
    let refreshed_exercise = refreshed["habits"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|habit| habit["key"] == "exercise")
        .unwrap();
    refreshed_exercise["name"] = "Source renamed externally".into();
    let today = refreshed_exercise["days"]
        .as_array_mut()
        .unwrap()
        .iter_mut()
        .find(|day| day["livedDate"] == "2026-09-08")
        .unwrap();
    today["observations"][1]["note"] = "Refreshed source evidence".into();
    write_source_snapshot(&vault, &serde_json::to_string(&refreshed).unwrap());

    let refreshed = app(&vault, "2026-09-08").habits().unwrap();
    let habit = refreshed.habit("exercise").unwrap();
    assert_eq!(habit.key, "exercise");
    assert_eq!(habit.name, "Strength walk");
    assert!(habit.local_name_override);
    assert_eq!(habit.localized_names.zh.as_deref(), Some("锻炼"));
    assert_eq!(habit.localized_names.en.as_deref(), Some("Exercise"));
    assert_eq!(habit.goal_label, "每周 3 天");
    assert_eq!(habit.pending_goal_label.as_deref(), Some("每周 5 天"));
    assert_eq!(habit.source_labels, original_source_labels);
    assert_ne!(habit.today.details, source.today.details);
    assert!(
        habit
            .today
            .details
            .iter()
            .any(|detail| format!("{detail:?}").contains("Refreshed source evidence"))
    );
}

#[test]
fn historical_corrections_merge_local_definitions_by_key_and_effective_date() {
    let vault = TempVault::new();
    let application = app(&vault, "2026-09-08");
    let empty = application.habits().unwrap();
    let created = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "create".into(),
            key: "local-history-walk".into(),
            name: "History walk".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-08".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 2 }),
            change_id: "create-history-walk".into(),
            target_binding: empty.definition_target_binding.unwrap(),
            expected_revision: empty.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    let revised = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "local-history-walk".into(),
            name: "History walk".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: Some("2026-09-08".into()),
            goal: Some(LocalHabitGoal::WeeklyCount { days: 4 }),
            change_id: "revise-history-walk".into(),
            target_binding: created.definition_target_binding.unwrap(),
            expected_revision: created.definition_revision,
            expected_snapshot_revision: None,
        })
        .unwrap();
    assert_eq!(
        revised
            .habit("local-history-walk")
            .unwrap()
            .pending_goal_label
            .as_deref(),
        Some("每周 4 天")
    );

    let before_start = application.read_date("2026-09-07").unwrap();
    assert!(
        before_start
            .habit_corrections
            .habit("local-history-walk")
            .is_none()
    );
    let before_revision = application.read_date("2026-09-13").unwrap();
    let habit = before_revision
        .habit_corrections
        .habit("local-history-walk")
        .expect("local Habit should appear in historical correction by stable key");
    assert!(habit.name_known);
    assert_eq!(habit.name, "History walk");
    assert_eq!(habit.goal_label.as_deref(), Some("每周 2 天"));
    assert!(habit.can_record_completion);

    let opened = application.read_date("2026-09-08").unwrap();
    let completed = application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-history-walk".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "complete-history-walk".into(),
            target_binding: opened.habit_corrections.completion_target_binding.unwrap(),
            expected_revision: opened.habit_corrections.completion_revision,
        })
        .unwrap();
    let readback = completed
        .habit_corrections
        .habit("local-history-walk")
        .unwrap();
    assert!(readback.cell.counts_as_completion);
    assert_eq!(readback.local_change_count, 1);

    let after_revision = application.read_date("2026-09-14").unwrap();
    assert_eq!(
        after_revision
            .habit_corrections
            .habit("local-history-walk")
            .unwrap()
            .goal_label
            .as_deref(),
        Some("每周 4 天")
    );
}

#[test]
fn source_habit_goal_revision_changes_historical_correction_on_its_effective_date() {
    let vault = TempVault::new();
    write_source_snapshot(&vault, include_str!("fixtures/habits-v1-complete.json"));
    let application = app(&vault, "2026-09-08");
    let before = application.habits().unwrap();
    let edited = application
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "exercise".into(),
            name: "Exercise".into(),
            name_changed: false,
            emoji: None,
            group: None,
            start_date: None,
            goal: Some(LocalHabitGoal::WeeklyCount { days: 5 }),
            change_id: "schedule-exercise-goal-for-next-week".into(),
            target_binding: before.definition_target_binding.unwrap(),
            expected_revision: before.definition_revision,
            expected_snapshot_revision: before.snapshot_revision,
        })
        .unwrap();
    assert_eq!(
        edited
            .habit("exercise")
            .unwrap()
            .pending_goal_label
            .as_deref(),
        Some("每周 5 天")
    );

    let previous_source_week = application.read_date("2026-09-06").unwrap();
    assert_eq!(
        previous_source_week
            .habit_corrections
            .habit("exercise")
            .unwrap()
            .goal_label
            .as_deref(),
        Some("每周 2 次")
    );
    let current_source_week = application.read_date("2026-09-13").unwrap();
    assert_eq!(
        current_source_week
            .habit_corrections
            .habit("exercise")
            .unwrap()
            .goal_label
            .as_deref(),
        Some("每周 3 次")
    );
    let effective_week = application.read_date("2026-09-14").unwrap();
    assert_eq!(
        effective_week
            .habit_corrections
            .habit("exercise")
            .unwrap()
            .goal_label
            .as_deref(),
        Some("每周 5 天")
    );
}

#[test]
fn source_habit_weekly_to_time_threshold_revision_updates_historical_correction() {
    let vault = TempVault::new();
    write_source_snapshot(&vault, include_str!("fixtures/habits-v1-complete.json"));
    let editing_app = app(&vault, "2026-09-08");
    let before = editing_app.habits().unwrap();
    let revised = editing_app
        .save_habit_definition(HabitDefinitionMutationInput {
            mode: "edit".into(),
            key: "exercise".into(),
            name: "Local Exercise".into(),
            name_changed: true,
            emoji: None,
            group: None,
            start_date: None,
            goal: Some(LocalHabitGoal::DailyTime {
                standard: "22:30".into(),
                day_relation: DayRelation::NextDay,
            }),
            change_id: "schedule-exercise-time-threshold".into(),
            target_binding: before.definition_target_binding.unwrap(),
            expected_revision: before.definition_revision,
            expected_snapshot_revision: before.snapshot_revision,
        })
        .unwrap();
    assert_eq!(
        revised
            .habit("exercise")
            .unwrap()
            .pending_goal_label
            .as_deref(),
        Some("每日 次日 22:30")
    );

    let last_old_cycle = editing_app.read_date("2026-09-13").unwrap();
    let old_goal = last_old_cycle.habit_corrections.habit("exercise").unwrap();
    assert_eq!(old_goal.name, "Local Exercise");
    assert_eq!(old_goal.goal_label.as_deref(), Some("每周 3 次"));
    assert!(old_goal.can_record_completion);

    let effective_app = app(&vault, "2026-09-15");
    let effective_day = effective_app.read_date("2026-09-14").unwrap();
    let effective_goal = effective_day
        .habit_corrections
        .habit("exercise")
        .expect("source Habit remains present in historical correction");
    assert_eq!(effective_goal.name, "Local Exercise");
    assert_eq!(
        effective_goal.goal_label.as_deref(),
        Some("每日 次日 22:30")
    );
    assert!(!effective_goal.can_record_completion);

    let attempt = effective_app.set_historical_habit_completion(HabitCompletionMutationInput {
        habit_key: "exercise".into(),
        lived_date: "2026-09-14".into(),
        completed: true,
        change_id: "threshold-correction-must-not-check-in".into(),
        target_binding: effective_day
            .habit_corrections
            .completion_target_binding
            .unwrap(),
        expected_revision: effective_day.habit_corrections.completion_revision,
    });
    let error = attempt
        .err()
        .expect("time-threshold target must reject checkbox completion");
    assert!(
        error.contains("时刻和阈值证据不能用本地完成框记录"),
        "{error}"
    );
    assert!(
        !vault
            .0
            .join("life/.personal-dashboard/habit-completions/v1/completions.json")
            .exists(),
        "threshold correction must not write a checkbox completion"
    );
}

#[test]
fn created_locally_definition_cannot_claim_a_source_habit_key() {
    let vault = TempVault::new();
    write_source_snapshot(&vault, include_str!("fixtures/habits-v1-complete.json"));
    let catalog_path = vault
        .0
        .join("life/.personal-dashboard/habits/v1/catalog.json");
    fs::create_dir_all(catalog_path.parent().unwrap()).unwrap();
    fs::write(
        &catalog_path,
        r#"{"schemaVersion":1,"habits":[{"key":"exercise","name":"Hijacked","createdLocally":true,"baseGoal":{"kind":"weekly-count","days":2},"sourceGoalHistory":[],"goalRevisions":[]}],"operations":[]}"#,
    )
    .unwrap();

    let view = app(&vault, "2026-09-08").habits().unwrap();
    assert_eq!(
        view.state,
        personal_dashboard_lib::habits::HabitSnapshotState::Error
    );
    assert!(view.habits.is_empty());
    assert!(view.message.contains("exercise"), "{}", view.message);
}
