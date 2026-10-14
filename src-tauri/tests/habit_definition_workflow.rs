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
    vault.0.join("life/.personal-dashboard/derived/habits-v1.json")
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
fn daily_count_goal_revision_takes_effect_on_the_next_lived_day_and_survives_reopen() {
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

    let reopened_next_day = app(&vault, "2026-09-09").habits().unwrap();
    let next_day = reopened_next_day.habit("local-reading").unwrap();
    assert_eq!(next_day.weekly_target, Some(5));
    assert_eq!(next_day.name, "Read a little");
    assert!(next_day.history.iter().any(|cell| {
        cell.date == "2026-09-08" && cell.counts_as_completion
    }));
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
    assert!(next_week_habit.history.iter().any(|cell| {
        cell.date == "2026-09-09" && cell.counts_as_completion
    }));
    assert!(next_week_habit.goal_history.iter().any(|goal| {
        goal.week_of == "2026-09-07" && goal.goal_label == "每周 3 天"
    }));
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
    assert_eq!(revised.habit("local-sunday-walk").unwrap().weekly_target, Some(3));
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
    assert!(habit.goal_history.iter().any(|goal| {
        goal.week_of == "2026-09-07" && goal.goal_label == "每周 3 天"
    }));
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
    assert_eq!(six_days.habit("local-stretch").unwrap().weekly_target, Some(3));
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
    assert_eq!(cancelled.habit("local-stretch").unwrap().weekly_target, Some(3));
    assert!(cancelled
        .habit("local-stretch")
        .unwrap()
        .pending_goal
        .is_none());
    let stored: serde_json::Value = serde_json::from_slice(
        &fs::read(vault.0.join("life/.personal-dashboard/habits/v1/catalog.json")).unwrap(),
    )
    .unwrap();
    let revisions = stored["habits"][0]["goalRevisions"].as_array().unwrap();
    assert!(revisions.iter().any(|revision| {
        revision["disposition"] == "superseded"
            && revision["goal"]["days"] == 5
    }));
    assert!(revisions.iter().any(|revision| {
        revision["disposition"] == "cancelled"
            && revision["goal"]["days"] == 6
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
fn source_habit_edit_and_snapshot_refresh_preserve_local_overlay_and_evidence_identity() {
    let vault = TempVault::new();
    write_source_snapshot(&vault, include_str!("fixtures/habits-v1-complete.json"));
    let application = app(&vault, "2026-09-08");
    let before = application.habits().unwrap();
    let source = before.habit("exercise").unwrap();
    assert!(!source.created_locally);
    let original_status = source.today.status;
    let original_source_labels = source.source_labels.clone();

    let input = HabitDefinitionMutationInput {
        mode: "edit".into(),
        key: "exercise".into(),
        name: "Strength walk".into(),
        emoji: Some("🚶".into()),
        group: Some("Movement".into()),
        start_date: None,
        goal: Some(LocalHabitGoal::WeeklyCount { days: 5 }),
        change_id: "edit-source-exercise".into(),
        target_binding: before.definition_target_binding.clone().unwrap(),
        expected_revision: before.definition_revision.clone(),
        expected_snapshot_revision: before.snapshot_revision.clone(),
    };
    let edited = application
        .save_habit_definition(input.clone())
        .unwrap();
    let local = edited.habit("exercise").unwrap();
    assert_eq!(local.key, source.key);
    assert_eq!(local.name, "Strength walk");
    assert_eq!(local.emoji.as_deref(), Some("🚶"));
    assert_eq!(local.group.as_deref(), Some("Movement"));
    assert_eq!(local.source_labels, original_source_labels);
    assert_eq!(local.today.status, original_status);
    assert_eq!(local.weekly_target, Some(3));
    assert_eq!(local.pending_goal_label.as_deref(), Some("每周 5 天"));
    assert!(local.goal_history.iter().any(|goal| {
        goal.week_of == "2026-08-31" && goal.goal_label == "每周 2 天"
    }));

    let replayed = application.save_habit_definition(input).unwrap();
    assert_eq!(replayed.habits.iter().filter(|habit| habit.key == "exercise").count(), 1);

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
    assert_eq!(habit.goal_label, "每周 3 天");
    assert_eq!(habit.pending_goal_label.as_deref(), Some("每周 5 天"));
    assert_eq!(habit.source_labels, original_source_labels);
    assert_ne!(habit.today.details, source.today.details);
    assert!(habit
        .today
        .details
        .iter()
        .any(|detail| format!("{detail:?}").contains("Refreshed source evidence")));
}
