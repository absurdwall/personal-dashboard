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

#[derive(Clone)]
struct MutableClock(std::rc::Rc<std::cell::RefCell<(String, String)>>);
impl TodayClock for MutableClock {
    fn current_date(&self) -> String { self.0.borrow().0.clone() }
    fn current_time_label(&self) -> String { self.0.borrow().1.clone() }
    fn current_timestamp_label(&self) -> String { format!("{}T{}-04:00", self.current_date(), self.current_time_label()) }
}
fn save_settings<P: TodayWorkspacePersistence, E: TodayWorkspaceExchange, C: TodayClock>(application: &TodayApplication<P,E,C>, key: &str, change: &str, settings: HabitSettings) -> personal_dashboard_lib::habits::HabitSnapshotView {
    let view = application.habits().unwrap();
    application.save_habit_definition(HabitDefinitionMutationInput {
        habit_key: key.into(), change_id: change.into(), target_binding: view.catalog_target_binding.unwrap(),
        expected_revision: view.catalog_revision, settings,
    }).unwrap()
}
#[test]
fn weekly_goal_edits_preserve_current_cycle_and_replace_or_cancel_pending_revision_across_reopen() {
    let vault = TempVault::new("weekly-cycles");
    let moment = std::rc::Rc::new(std::cell::RefCell::new(("2026-09-09".into(), "14:00".into())));
    let clock = MutableClock(moment.clone());
    let application = TodayApplication::new(SelectedVault(vault.path().into()), NoSelection, clock.clone());
    let initial = HabitSettings { name: "Exercise".into(), emoji: None, group: None, start_date: "2026-09-07".into(), goal: HabitGoal::WeeklyDays { days: 3 } };
    save_settings(&application, "local-exercise", "create-three", initial.clone());
    let mut edited = initial.clone(); edited.name = "Movement".into(); edited.goal = HabitGoal::WeeklyDays { days: 5 };
    let saved = save_settings(&application, "local-exercise", "schedule-five", edited.clone());
    let habit = saved.habit("local-exercise").unwrap();
    assert_eq!(habit.weekly_target, Some(3));
    assert_eq!(habit.name, "Movement");
    assert_eq!(habit.pending_goal.as_ref().unwrap().effective_date, "2026-09-14");
    assert_eq!(habit.settings.as_ref().unwrap().goal, HabitGoal::WeeklyDays { days: 5 });
    edited.goal = HabitGoal::WeeklyDays { days: 4 };
    let replaced = save_settings(&application, "local-exercise", "replace-five", edited.clone());
    assert_eq!(replaced.habit("local-exercise").unwrap().goal_revisions.len(), 2);
    let cancelled = save_settings(&application, "local-exercise", "cancel-pending", initial);
    assert!(cancelled.habit("local-exercise").unwrap().pending_goal.is_none());
    edited.goal = HabitGoal::WeeklyDays { days: 5 };
    save_settings(&application, "local-exercise", "reschedule-five", edited);
    *moment.borrow_mut() = ("2026-09-14".into(), "03:59".into());
    let reopened = TodayApplication::new(SelectedVault(vault.path().into()), NoSelection, clock.clone());
    assert_eq!(reopened.habits().unwrap().habit("local-exercise").unwrap().weekly_target, Some(3));
    moment.borrow_mut().1 = "04:00".into();
    let advanced = reopened.habits().unwrap();
    assert_eq!(advanced.habit("local-exercise").unwrap().weekly_target, Some(5));
    assert!(advanced.habit("local-exercise").unwrap().pending_goal.is_none());
    assert_eq!(advanced.habit("local-exercise").unwrap().goal_revisions[0].goal, HabitGoal::WeeklyDays { days: 3 });
}

#[test]
fn editing_sourced_habit_preserves_goal_segments_languages_mapping_and_refresh_evidence() {
    let vault = TempVault::new("source-overlay");
    let mut snapshot: serde_json::Value = serde_json::from_str(include_str!("fixtures/habits-v1-complete.json")).unwrap();
    snapshot["sources"].as_array_mut().unwrap().push(serde_json::json!({"key":"dida-exercise", "kind":"dida365", "label":"Dida365 explicit mapping exercise=external-exercise"}));
    write_snapshot(vault.path(), &snapshot.to_string());
    let names = vault.path().join(personal_dashboard_lib::habits::HABIT_NAMES_RELATIVE_PATH);
    fs::create_dir_all(names.parent().unwrap()).unwrap();
    fs::write(&names, r#"{"schemaVersion":1,"habits":{"exercise":{"zh":"运动","en":"Exercise"}}}"#).unwrap();
    let application = app(vault.path());
    let initial = application.habits().unwrap();
    let mut settings = initial.habit("exercise").unwrap().settings.clone().unwrap();
    settings.goal = HabitGoal::WeeklyDays { days: 5 };
    let edited = save_settings(&application, "exercise", "edit-existing-goal", settings.clone());
    assert_eq!(edited.habit("exercise").unwrap().weekly_target, Some(3));
    assert_eq!(edited.habit("exercise").unwrap().localized_names.zh.as_deref(), Some("运动"));
    assert!(edited.habit("exercise").unwrap().goal_revisions.iter().any(|revision| revision.effective_date == "2026-08-31" && revision.goal == HabitGoal::WeeklyDays { days: 2 }));
    settings.name = "Movement".into(); settings.emoji = Some("🚶".into()); settings.group = Some("Health".into());
    save_settings(&application, "exercise", "rename-existing", settings);
    snapshot["habits"][0]["name"] = "Producer rename".into();
    snapshot["habits"][0]["goal"]["standard"] = 7.into();
    snapshot["habits"][0]["days"].as_array_mut().unwrap().push(serde_json::json!({"livedDate":"2026-09-06", "coverage":"complete", "observations":[{"source":"dida","observedAt":"2026-09-06T18:00:00-04:00","status":"completed","evidence":"check-in"}]}));
    write_snapshot(vault.path(), &snapshot.to_string());
    let refreshed = app(vault.path()).habits().unwrap();
    let habit = refreshed.habit("exercise").unwrap();
    assert_eq!(habit.name, "Movement");
    assert_eq!(habit.weekly_target, Some(3));
    assert_eq!(habit.pending_goal.as_ref().unwrap().goal, HabitGoal::WeeklyDays { days: 5 });
    assert!(habit.cell("2026-09-06").unwrap().has_external_completion);
    assert!(habit.source_labels.iter().any(|s| s.contains("external-exercise")));
    assert_eq!(fs::read_to_string(names).unwrap(), r#"{"schemaVersion":1,"habits":{"exercise":{"zh":"运动","en":"Exercise"}}}"#);
}
