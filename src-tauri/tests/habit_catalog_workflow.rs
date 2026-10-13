use personal_dashboard_lib::habits::FileHabitSnapshotStore;
use personal_dashboard_lib::today::{
    FileDayTaskStore, FileHabitCompletionStore, FileTodayRecordStore, HabitCompletionMutationInput,
    HabitCompletionStore, HabitLocalCompletionState, TodayApplication, TodayClock,
    TodayWorkspaceExchange, TodayWorkspacePersistence,
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

fn write_snapshot(vault: &Path, document: &str) {
    let path = snapshot_path(vault);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, document).unwrap();
}

use personal_dashboard_lib::habit_catalog::{
    HabitDefinitionMutationInput, HabitGoal, HabitSettings,
};

#[test]
fn create_local_habit_without_snapshot_complete_and_reopen_with_stable_identity() {
    let vault = TempVault::new("catalog-create");
    let application = app(vault.path());
    let opened = application.habits().unwrap();
    let input = HabitDefinitionMutationInput {
        habit_key: "local-reading".into(),
        change_id: "create-reading".into(),
        target_binding: opened.catalog_target_binding.unwrap(),
        expected_revision: opened.catalog_revision,
        settings: HabitSettings {
            name: "Reading".into(),
            emoji: Some("📖".into()),
            group: None,
            start_date: "2026-09-08".into(),
            goal: HabitGoal::DailyCompletion,
        },
    };
    let created = application.save_habit_definition(input.clone()).unwrap();
    let retry = application.save_habit_definition(input).unwrap();
    assert_eq!(retry.habits.len(), 1);
    let saved = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-reading".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "reading-completed".into(),
            target_binding: created.completion_target_binding.unwrap(),
            expected_revision: created.completion_revision,
        })
        .unwrap();
    assert!(
        saved
            .habit("local-reading")
            .unwrap()
            .today
            .counts_as_completion
    );
    let reopened = app(vault.path()).habits().unwrap();
    assert_eq!(reopened.habit("local-reading").unwrap().name, "Reading");
    assert!(
        reopened
            .habit("local-reading")
            .unwrap()
            .today
            .counts_as_completion
    );
    assert!(!snapshot_path(vault.path()).exists());
}

#[derive(Clone)]
struct MutableClock(std::rc::Rc<std::cell::RefCell<(String, String)>>);
impl TodayClock for MutableClock {
    fn current_date(&self) -> String {
        self.0.borrow().0.clone()
    }
    fn current_time_label(&self) -> String {
        self.0.borrow().1.clone()
    }
    fn current_timestamp_label(&self) -> String {
        format!(
            "{}T{}-04:00",
            self.current_date(),
            self.current_time_label()
        )
    }
}
fn save_settings<P: TodayWorkspacePersistence, E: TodayWorkspaceExchange, C: TodayClock>(
    application: &TodayApplication<P, E, C>,
    key: &str,
    change: &str,
    settings: HabitSettings,
) -> personal_dashboard_lib::habits::HabitSnapshotView {
    let view = application.habits().unwrap();
    application
        .save_habit_definition(HabitDefinitionMutationInput {
            habit_key: key.into(),
            change_id: change.into(),
            target_binding: view.catalog_target_binding.unwrap(),
            expected_revision: view.catalog_revision,
            settings,
        })
        .unwrap()
}
#[test]
fn weekly_goal_edits_preserve_current_cycle_and_replace_or_cancel_pending_revision_across_reopen() {
    let vault = TempVault::new("weekly-cycles");
    let moment = std::rc::Rc::new(std::cell::RefCell::new((
        "2026-09-09".into(),
        "14:00".into(),
    )));
    let clock = MutableClock(moment.clone());
    let application = TodayApplication::new(
        SelectedVault(vault.path().into()),
        NoSelection,
        clock.clone(),
    );
    let initial = HabitSettings {
        name: "Exercise".into(),
        emoji: None,
        group: None,
        start_date: "2026-09-07".into(),
        goal: HabitGoal::WeeklyDays { days: 3 },
    };
    save_settings(
        &application,
        "local-exercise",
        "create-three",
        initial.clone(),
    );
    let mut edited = initial.clone();
    edited.name = "Movement".into();
    edited.goal = HabitGoal::WeeklyDays { days: 5 };
    let saved = save_settings(
        &application,
        "local-exercise",
        "schedule-five",
        edited.clone(),
    );
    let habit = saved.habit("local-exercise").unwrap();
    assert_eq!(habit.weekly_target, Some(3));
    assert_eq!(habit.name, "Movement");
    assert_eq!(
        habit.pending_goal.as_ref().unwrap().effective_date,
        "2026-09-14"
    );
    assert_eq!(
        habit.settings.as_ref().unwrap().goal,
        HabitGoal::WeeklyDays { days: 5 }
    );
    edited.goal = HabitGoal::WeeklyDays { days: 4 };
    let replaced = save_settings(
        &application,
        "local-exercise",
        "replace-five",
        edited.clone(),
    );
    assert_eq!(
        replaced
            .habit("local-exercise")
            .unwrap()
            .goal_revisions
            .len(),
        2
    );
    let cancelled = save_settings(&application, "local-exercise", "cancel-pending", initial);
    assert!(cancelled
        .habit("local-exercise")
        .unwrap()
        .pending_goal
        .is_none());
    edited.goal = HabitGoal::WeeklyDays { days: 5 };
    save_settings(&application, "local-exercise", "reschedule-five", edited);
    *moment.borrow_mut() = ("2026-09-14".into(), "03:59".into());
    let reopened = TodayApplication::new(
        SelectedVault(vault.path().into()),
        NoSelection,
        clock.clone(),
    );
    assert_eq!(
        reopened
            .habits()
            .unwrap()
            .habit("local-exercise")
            .unwrap()
            .weekly_target,
        Some(3)
    );
    moment.borrow_mut().1 = "04:00".into();
    let advanced = reopened.habits().unwrap();
    assert_eq!(
        advanced.habit("local-exercise").unwrap().weekly_target,
        Some(5)
    );
    assert!(advanced
        .habit("local-exercise")
        .unwrap()
        .pending_goal
        .is_none());
    assert_eq!(
        advanced.habit("local-exercise").unwrap().goal_revisions[0].goal,
        HabitGoal::WeeklyDays { days: 3 }
    );
}

#[test]
fn editing_sourced_habit_preserves_goal_segments_languages_mapping_and_refresh_evidence() {
    let vault = TempVault::new("source-overlay");
    let mut snapshot: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/habits-v1-complete.json")).unwrap();
    snapshot["sources"].as_array_mut().unwrap().push(serde_json::json!({"key":"dida-exercise", "kind":"dida365", "label":"Dida365 explicit mapping exercise=external-exercise"}));
    write_snapshot(vault.path(), &snapshot.to_string());
    let names = vault
        .path()
        .join(personal_dashboard_lib::habits::HABIT_NAMES_RELATIVE_PATH);
    fs::create_dir_all(names.parent().unwrap()).unwrap();
    fs::write(
        &names,
        r#"{"schemaVersion":1,"habits":{"exercise":{"zh":"运动","en":"Exercise"}}}"#,
    )
    .unwrap();
    let application = app(vault.path());
    let initial = application.habits().unwrap();
    let mut settings = initial.habit("exercise").unwrap().settings.clone().unwrap();
    settings.goal = HabitGoal::WeeklyDays { days: 5 };
    let edited = save_settings(
        &application,
        "exercise",
        "edit-existing-goal",
        settings.clone(),
    );
    assert_eq!(edited.habit("exercise").unwrap().weekly_target, Some(3));
    assert_eq!(
        edited
            .habit("exercise")
            .unwrap()
            .localized_names
            .zh
            .as_deref(),
        Some("运动")
    );
    assert!(edited
        .habit("exercise")
        .unwrap()
        .goal_revisions
        .iter()
        .any(|revision| revision.effective_date == "2026-08-31"
            && revision.goal == HabitGoal::WeeklyDays { days: 2 }));
    let historical = edited
        .habit("exercise")
        .unwrap()
        .goal_revisions
        .iter()
        .find(|revision| revision.effective_date == "2026-08-31")
        .unwrap();
    assert_eq!(historical.valid_through.as_deref(), Some("2026-09-06"));

    settings.name = "Movement".into();
    settings.emoji = Some("🚶".into());
    settings.group = Some("Health".into());
    save_settings(&application, "exercise", "rename-existing", settings);
    snapshot["habits"][0]["name"] = "Producer rename".into();
    snapshot["habits"][0]["goal"]["standard"] = 7.into();
    snapshot["habits"][0]["days"].as_array_mut().unwrap().push(serde_json::json!({"livedDate":"2026-09-06", "coverage":"complete", "observations":[{"source":"dida","observedAt":"2026-09-06T18:00:00-04:00","status":"completed","evidence":"check-in"}]}));
    write_snapshot(vault.path(), &snapshot.to_string());
    let refreshed = app(vault.path()).habits().unwrap();
    let habit = refreshed.habit("exercise").unwrap();
    assert_eq!(habit.name, "Movement");
    assert_eq!(habit.weekly_target, Some(3));
    assert_eq!(
        habit.pending_goal.as_ref().unwrap().goal,
        HabitGoal::WeeklyDays { days: 5 }
    );
    assert!(habit.cell("2026-09-06").unwrap().has_external_completion);
    assert!(habit
        .source_labels
        .iter()
        .any(|s| s.contains("external-exercise")));
    assert_eq!(
        fs::read_to_string(names).unwrap(),
        r#"{"schemaVersion":1,"habits":{"exercise":{"zh":"运动","en":"Exercise"}}}"#
    );
}

#[test]
fn daily_threshold_revisions_advance_at_four_am_and_frequency_switch_marks_partial_week() {
    use personal_dashboard_lib::habits::DayRelation;
    let vault = TempVault::new("daily-frequency");
    let moment = std::rc::Rc::new(std::cell::RefCell::new((
        "2026-09-08".into(),
        "23:00".into(),
    )));
    let clock = MutableClock(moment.clone());
    let application = TodayApplication::new(
        SelectedVault(vault.path().into()),
        NoSelection,
        clock.clone(),
    );
    let initial = HabitSettings {
        name: "Sleep".into(),
        emoji: None,
        group: None,
        start_date: "2026-09-08".into(),
        goal: HabitGoal::DailyTime {
            time: "00:30".into(),
            day_relation: DayRelation::NextDay,
        },
    };
    save_settings(&application, "local-sleep", "create-sleep", initial.clone());
    let mut settings = initial;
    settings.goal = HabitGoal::DailyTime {
        time: "01:00".into(),
        day_relation: DayRelation::NextDay,
    };
    let edited = save_settings(
        &application,
        "local-sleep",
        "change-sleep-threshold",
        settings.clone(),
    );
    assert_eq!(
        edited.habit("local-sleep").unwrap().goal_label,
        "每日 次日 00:30"
    );
    *moment.borrow_mut() = ("2026-09-09".into(), "03:59".into());
    assert_eq!(
        application
            .habits()
            .unwrap()
            .habit("local-sleep")
            .unwrap()
            .goal_label,
        "每日 次日 00:30"
    );
    moment.borrow_mut().1 = "04:00".into();
    let reopened = TodayApplication::new(
        SelectedVault(vault.path().into()),
        NoSelection,
        clock.clone(),
    );
    assert_eq!(
        reopened
            .habits()
            .unwrap()
            .habit("local-sleep")
            .unwrap()
            .goal_label,
        "每日 次日 01:00"
    );
    settings.goal = HabitGoal::WeeklyDays { days: 5 };
    let switching = save_settings(&reopened, "local-sleep", "switch-to-weekly", settings);
    assert_eq!(
        switching
            .habit("local-sleep")
            .unwrap()
            .pending_goal
            .as_ref()
            .unwrap()
            .effective_date,
        "2026-09-10"
    );
    *moment.borrow_mut() = ("2026-09-10".into(), "04:00".into());
    let partial = reopened.habits().unwrap();
    assert_eq!(partial.habit("local-sleep").unwrap().weekly_target, Some(5));
    assert!(partial.habit("local-sleep").unwrap().partial_cycle);
    *moment.borrow_mut() = ("2026-09-14".into(), "04:00".into());
    assert!(
        !reopened
            .habits()
            .unwrap()
            .habit("local-sleep")
            .unwrap()
            .partial_cycle
    );
}

#[test]
fn sourced_sleep_threshold_keeps_next_day_evidence_and_local_withdrawal_never_erases_external_attainment(
) {
    use personal_dashboard_lib::habits::DayRelation;
    let vault = TempVault::new("threshold-evidence");
    let mut snapshot: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/habits-v1-complete.json")).unwrap();
    snapshot["habits"][4]["goal"] =
        serde_json::json!({"kind":"daily-time", "standard":"00:30", "dayRelation":"next-day"});
    write_snapshot(vault.path(), &snapshot.to_string());
    let application = app(vault.path());
    let opened = application.habits().unwrap();
    let settings = opened.habit("sleep").unwrap().settings.clone().unwrap();
    assert_eq!(
        settings.goal,
        HabitGoal::DailyTime {
            time: "00:30".into(),
            day_relation: DayRelation::NextDay
        }
    );
    let configured = save_settings(&application, "sleep", "configure-sourced-sleep", settings);
    assert!(
        configured
            .habit("sleep")
            .unwrap()
            .today
            .counts_as_completion
    );
    assert!(configured
        .habit("sleep")
        .unwrap()
        .today
        .actual_time_label
        .is_none());
    let saved = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "sleep".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "sleep-local".into(),
            target_binding: configured.completion_target_binding.unwrap(),
            expected_revision: configured.completion_revision,
        })
        .unwrap();
    let withdrawn = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "sleep".into(),
            lived_date: "2026-09-08".into(),
            completed: false,
            change_id: "sleep-withdraw".into(),
            target_binding: saved.completion_target_binding.unwrap(),
            expected_revision: saved.completion_revision,
        })
        .unwrap();
    let cell = &withdrawn.habit("sleep").unwrap().today;
    assert!(cell.counts_as_completion);
    assert!(cell.has_external_completion);
    assert!(cell.actual_time_label.is_none());
    assert_eq!(
        cell.local_completion_state,
        HabitLocalCompletionState::Withdrawn
    );
    let mut unknown = withdrawn.habit("sleep").unwrap().settings.clone().unwrap();
    unknown.goal = HabitGoal::DailyTime {
        time: "00:30".into(),
        day_relation: DayRelation::Unresolved,
    };
    save_settings(&application, "sleep", "unknown-relation", unknown);
    let next = TodayApplication::new(
        SelectedVault(vault.path().into()),
        NoSelection,
        FollowingMondayClock,
    )
    .habits()
    .unwrap();
    assert!(!next.habit("sleep").unwrap().can_record_completion);
}

#[test]
fn local_habit_remains_recordable_when_source_refresh_is_invalid() {
    let vault = TempVault::new("invalid-source");
    let application = app(vault.path());
    save_settings(
        &application,
        "local-independent",
        "independent-create",
        HabitSettings {
            name: "Independent".into(),
            emoji: None,
            group: None,
            start_date: "2026-09-08".into(),
            goal: HabitGoal::DailyCompletion,
        },
    );
    write_snapshot(vault.path(), "not-json");
    let reopened = app(vault.path());
    let view = reopened.habits().unwrap();
    let saved = reopened
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-independent".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "independent-complete".into(),
            target_binding: view.completion_target_binding.unwrap(),
            expected_revision: view.completion_revision,
        })
        .unwrap();
    assert!(
        saved
            .habit("local-independent")
            .unwrap()
            .today
            .counts_as_completion
    );
    assert_eq!(
        fs::read_to_string(snapshot_path(vault.path())).unwrap(),
        "not-json"
    );
}

#[derive(Clone)]
struct AmbiguousSave(std::rc::Rc<Cell<bool>>);
impl HabitCompletionStore for AmbiguousSave {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        FileHabitCompletionStore.load(path)
    }
    fn create_new(&self, path: &Path, bytes: &[u8]) -> Result<(), String> {
        FileHabitCompletionStore.create_new(path, bytes)?;
        if self.0.replace(false) {
            Err("Synthetic readback interruption after actual durable write".into())
        } else {
            Ok(())
        }
    }
    fn save_if_unchanged(&self, path: &Path, expected: &[u8], bytes: &[u8]) -> Result<(), String> {
        FileHabitCompletionStore.save_if_unchanged(path, expected, bytes)
    }
}
#[test]
fn failed_save_retry_keeps_identity_after_reread_and_stale_or_corrupt_catalog_is_never_overwritten()
{
    let vault = TempVault::new("retry-conflict");
    let application = TodayApplication::with_every_store(
        SelectedVault(vault.path().into()),
        NoSelection,
        FixedClock,
        FileTodayRecordStore,
        FileHabitSnapshotStore,
        FileDayTaskStore,
        AmbiguousSave(std::rc::Rc::new(Cell::new(true))),
    );
    let opened = application.habits().unwrap();
    let mut input = HabitDefinitionMutationInput {
        habit_key: "local-safe".into(),
        change_id: "create-safe".into(),
        target_binding: opened.catalog_target_binding.unwrap(),
        expected_revision: opened.catalog_revision,
        settings: HabitSettings {
            name: "Safe".into(),
            emoji: None,
            group: None,
            start_date: "2026-09-08".into(),
            goal: HabitGoal::DailyCompletion,
        },
    };
    assert!(application.save_habit_definition(input.clone()).is_err());
    let reread = app(vault.path()).habits().unwrap();
    assert_eq!(reread.habits.len(), 1);
    input.expected_revision = reread.catalog_revision;
    let retried = application.save_habit_definition(input.clone()).unwrap();
    assert_eq!(retried.habits.len(), 1);
    let mut collision = input.clone();
    collision.settings.name = "Wrong".into();
    assert!(application.save_habit_definition(collision).is_err());
    let path = vault
        .path()
        .join(personal_dashboard_lib::habit_catalog::HABIT_CATALOG_RELATIVE_PATH);
    let before = fs::read(&path).unwrap();
    let mut stale = input.clone();
    stale.change_id = "stale-edit".into();
    stale.expected_revision = None;
    stale.settings.name = "Lost".into();
    assert!(application.save_habit_definition(stale).is_err());
    assert_eq!(fs::read(&path).unwrap(), before);
    let other = TempVault::new("other-target");
    assert!(app(other.path())
        .save_habit_definition(input.clone())
        .is_err());
    assert!(!other
        .path()
        .join(personal_dashboard_lib::habit_catalog::HABIT_CATALOG_RELATIVE_PATH)
        .exists());
    fs::write(&path, b"corrupt personal file").unwrap();
    input.change_id = "do-not-repair-corruption".into();
    assert!(application.save_habit_definition(input).is_err());
    assert_eq!(fs::read(&path).unwrap(), b"corrupt personal file");
}

struct RolloverClock(Cell<bool>);
impl TodayClock for RolloverClock {
    fn current_date(&self) -> String {
        "2026-09-14".into()
    }
    fn current_time_label(&self) -> String {
        "04:00".into()
    }
    fn current_timestamp_label(&self) -> String {
        "2026-09-14T04:00-04:00".into()
    }
    fn current_local_time(&self) -> personal_dashboard_lib::today::TodayClockView {
        personal_dashboard_lib::today::TodayClockView {
            date: "2026-09-14".into(),
            time: if self.0.replace(false) {
                "03:59"
            } else {
                "04:00"
            }
            .into(),
        }
    }
}
#[test]
fn one_read_crossing_four_am_keeps_a_consistent_lived_day_projection() {
    let vault = TempVault::new("rollover-captured-read");
    write_snapshot(
        vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let application = app(vault.path());
    let settings = application
        .habits()
        .unwrap()
        .habit("exercise")
        .unwrap()
        .settings
        .clone()
        .unwrap();
    save_settings(&application, "exercise", "configure-rollover", settings);
    let crossing = TodayApplication::new(
        SelectedVault(vault.path().into()),
        NoSelection,
        RolloverClock(Cell::new(true)),
    );
    let view = crossing.habits().unwrap();
    assert_eq!(view.habit("exercise").unwrap().today.date, "2026-09-13");
    let following = crossing.habits().unwrap();
    assert_eq!(
        following.habit("exercise").unwrap().today.date,
        "2026-09-14"
    );
}

#[test]
fn local_completion_after_retained_source_refresh_uses_fresh_canonical_evidence() {
    let vault = TempVault::new("retained-source-local-write");
    write_snapshot(
        vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let application = app(vault.path());
    let settings = application
        .habits()
        .unwrap()
        .habit("reset")
        .unwrap()
        .settings
        .clone()
        .unwrap();
    let configured = save_settings(&application, "reset", "configure-retained", settings);
    write_snapshot(vault.path(), "invalid source refresh");
    let saved = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "complete-retained-source".into(),
            target_binding: configured.completion_target_binding.unwrap(),
            expected_revision: configured.completion_revision,
        })
        .unwrap();
    assert!(saved.habit("reset").unwrap().today.counts_as_completion);
    assert_eq!(
        saved.habit("reset").unwrap().today.local_completion_state,
        HabitLocalCompletionState::Completed
    );
    let withdrawn = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-08".into(),
            completed: false,
            change_id: "withdraw-retained-source".into(),
            target_binding: saved.completion_target_binding.unwrap(),
            expected_revision: saved.completion_revision,
        })
        .unwrap();
    assert!(!withdrawn.habit("reset").unwrap().today.counts_as_completion);
    assert_eq!(
        withdrawn
            .habit("reset")
            .unwrap()
            .today
            .local_completion_state,
        HabitLocalCompletionState::Withdrawn
    );
}

#[test]
fn actual_snapshot_publication_updates_evidence_without_touching_catalog_or_local_identity() {
    use personal_dashboard_lib::habit_producer::{native_source_read, HabitRefreshInput};
    let vault = TempVault::new("published-source-overlay");
    write_snapshot(
        vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let application = app(vault.path());
    let mut settings = application
        .habits()
        .unwrap()
        .habit("exercise")
        .unwrap()
        .settings
        .clone()
        .unwrap();
    settings.name = "Movement".into();
    settings.goal = HabitGoal::WeeklyDays { days: 5 };
    save_settings(
        &application,
        "exercise",
        "edit-before-publication",
        settings,
    );
    save_settings(
        &application,
        "local-reading",
        "create-before-publication",
        HabitSettings {
            name: "Reading".into(),
            emoji: None,
            group: None,
            start_date: "2026-09-08".into(),
            goal: HabitGoal::DailyCompletion,
        },
    );
    let catalog_path = vault
        .path()
        .join(personal_dashboard_lib::habit_catalog::HABIT_CATALOG_RELATIVE_PATH);
    let before = fs::read(&catalog_path).unwrap();
    let catalog = serde_json::json!({"type":"mcpToolCall","server":"dida365","tool":"list_habits","status":"completed","arguments":{},"result":{"structuredContent":{"result":[{"id":"synthetic-exercise","name":"Producer object name"}]}}});
    let checkins = serde_json::json!({"type":"mcpToolCall","server":"dida365","tool":"get_habit_checkins","status":"completed","arguments":{"habit_ids":["synthetic-exercise"],"from_stamp":20260621,"to_stamp":20260909,"client_timezone":"America/New_York"},"result":{"structuredContent":{"result":[{"habitId":"synthetic-exercise","year":2026,"checkins":[{"id":"external-confirmed","stamp":20260908,"status":2,"opTime":"2026-09-08T13:00:00-04:00"}]}]}}});
    let report = application.refresh_habit_snapshot(HabitRefreshInput {
        mappings: std::collections::BTreeMap::from([(
            "exercise".into(),
            "synthetic-exercise".into(),
        )]),
        authorization_quote: "Refresh synthetic exercise mapping".into(),
        execution_mode: "execute".into(),
        host_source_reads: [catalog, checkins]
            .iter()
            .filter_map(native_source_read)
            .collect(),
        host_query_error: None,
    });
    assert_eq!(report.publication, "published", "{}", report.message);
    assert_eq!(fs::read(catalog_path).unwrap(), before);
    let reopened = app(vault.path()).habits().unwrap();
    let exercise = reopened.habit("exercise").unwrap();
    assert_eq!(exercise.name, "Movement");
    assert_eq!(exercise.weekly_target, Some(3));
    assert_eq!(
        exercise.pending_goal.as_ref().unwrap().goal,
        HabitGoal::WeeklyDays { days: 5 }
    );
    assert!(exercise.today.has_external_completion);
    assert!(reopened.habit("local-reading").is_some());
}

struct ChangingSelection {
    first: PathBuf,
    following: PathBuf,
    first_read: Cell<bool>,
}
impl TodayWorkspacePersistence for ChangingSelection {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(if self.first_read.replace(false) {
            self.first.clone()
        } else {
            self.following.clone()
        }))
    }
    fn save_selected_vault(&self, _: &Path) -> Result<(), String> {
        Ok(())
    }
}
#[test]
fn a_read_does_not_mix_source_evidence_from_one_vault_with_another_local_catalog() {
    let a = TempVault::new("selection-a");
    let b = TempVault::new("selection-b");
    write_snapshot(a.path(), include_str!("fixtures/habits-v1-complete.json"));
    for (vault, key) in [(a.path(), "local-a"), (b.path(), "local-b")] {
        save_settings(
            &app(vault),
            key,
            "create-selected",
            HabitSettings {
                name: key.into(),
                emoji: None,
                group: None,
                start_date: "2026-09-08".into(),
                goal: HabitGoal::DailyCompletion,
            },
        );
    }
    let crossing = TodayApplication::new(
        ChangingSelection {
            first: a.path().into(),
            following: b.path().into(),
            first_read: Cell::new(true),
        },
        NoSelection,
        FixedClock,
    );
    let first = crossing.habits().unwrap();
    assert!(first.habit("local-a").is_some());
    assert!(first.habit("local-b").is_none());
    let following = crossing.habits().unwrap();
    assert!(following.habit("local-b").is_some());
    assert!(following.habit("local-a").is_none());
    assert_ne!(
        first.catalog_target_binding,
        following.catalog_target_binding
    );
}

#[test]
fn editing_an_unconfigured_sourced_weekly_habit_retains_tracking_then_activates_target_next_monday()
{
    let vault = TempVault::new("no-goal-source-edit");
    let mut snapshot: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/habits-v1-complete.json")).unwrap();
    snapshot["habits"][2]["goal"] = serde_json::Value::Null;
    write_snapshot(vault.path(), &snapshot.to_string());
    let application = app(vault.path());
    let mut settings = application
        .habits()
        .unwrap()
        .habit("reset")
        .unwrap()
        .settings
        .clone()
        .unwrap();
    settings.name = "Space".into();
    let edited = save_settings(&application, "reset", "name-no-goal", settings.clone());
    let habit = edited.habit("reset").unwrap();
    assert_eq!(habit.goal_kind, "weekly-count");
    assert!(habit.can_record_completion);
    assert_eq!(habit.completed_count, Some(0));
    let completed = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "complete-no-goal".into(),
            target_binding: edited.completion_target_binding.unwrap(),
            expected_revision: edited.completion_revision,
        })
        .unwrap();
    assert_eq!(completed.habit("reset").unwrap().completed_count, Some(1));
    assert_eq!(completed.summary.excluded_no_goal, 1);
    settings.goal = HabitGoal::WeeklyDays { days: 5 };
    let planned = save_settings(&application, "reset", "configure-no-goal-target", settings);
    assert_eq!(
        planned
            .habit("reset")
            .unwrap()
            .pending_goal
            .as_ref()
            .unwrap()
            .effective_date,
        "2026-09-14"
    );
    let following = TodayApplication::new(
        SelectedVault(vault.path().into()),
        NoSelection,
        FollowingMondayClock,
    )
    .habits()
    .unwrap();
    assert_eq!(following.habit("reset").unwrap().weekly_target, Some(5));
    assert_eq!(following.summary.excluded_no_goal, 0);
}

#[test]
fn eighty_chinese_name_characters_exceed_byte_limit_without_writing_catalog() {
    let vault = TempVault::new("catalog-name-byte-limit");
    let application = app(vault.path());
    let opened = application.habits().unwrap();
    let error = application.save_habit_definition(HabitDefinitionMutationInput {
        habit_key: "local-byte-limit".into(),
        change_id: "byte-limit-attempt".into(),
        target_binding: opened.catalog_target_binding.unwrap(),
        expected_revision: opened.catalog_revision.clone(),
        settings: HabitSettings {
            name: "习".repeat(80), emoji: None, group: None,
            start_date: "2026-09-08".into(), goal: HabitGoal::DailyCompletion,
        },
    }).unwrap_err();
    assert_eq!(error, "习惯名称缺失或过长。");
    let fresh = app(vault.path()).habits().unwrap();
    assert_eq!(fresh.catalog_revision, opened.catalog_revision);
    assert!(fresh.habit("local-byte-limit").is_none());
}
