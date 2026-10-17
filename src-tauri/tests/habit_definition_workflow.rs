use personal_dashboard_lib::habit_catalog::{
    HabitDefinitionMutationInput, HabitGoalTarget, HabitLifecycleMutationInput,
    HabitMutationOutcome,
};
use personal_dashboard_lib::habits::DayRelation;
use personal_dashboard_lib::today::{
    HabitCompletionMutationInput, TodayApplication, TodayClock,
    TodayClockView, TodayWorkspaceExchange, TodayWorkspacePersistence,
};
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
            "personal-dashboard-habit-definition-{label}-{}-{nonce}",
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
struct WednesdayClock;

impl TodayClock for WednesdayClock {
    fn current_date(&self) -> String {
        "2026-10-14".into()
    }

    fn current_time_label(&self) -> String {
        "09:15".into()
    }

    fn current_timestamp_label(&self) -> String {
        "2026-10-14T09:15-04:00".into()
    }
}

#[derive(Clone)]
struct FixedDateClock(String);

impl TodayClock for FixedDateClock {
    fn current_date(&self) -> String {
        self.0.clone()
    }

    fn current_time_label(&self) -> String {
        "09:15".into()
    }

    fn current_timestamp_label(&self) -> String {
        format!("{}T09:15:00-04:00", self.0)
    }
}

fn app(vault: &Path) -> TodayApplication<SelectedVault, NoSelection, WednesdayClock> {
    TodayApplication::new(
        SelectedVault(vault.to_path_buf()),
        NoSelection,
        WednesdayClock,
    )
}

fn app_at(
    vault: &Path,
    date: &str,
) -> TodayApplication<SelectedVault, NoSelection, FixedDateClock> {
    TodayApplication::new(
        SelectedVault(vault.to_path_buf()),
        NoSelection,
        FixedDateClock(date.to_string()),
    )
}

#[derive(Clone, Copy)]
struct LivedBoundaryClock {
    date: &'static str,
    time: &'static str,
}

impl TodayClock for LivedBoundaryClock {
    fn current_date(&self) -> String {
        self.date.into()
    }

    fn current_time_label(&self) -> String {
        self.time.into()
    }

    fn current_timestamp_label(&self) -> String {
        format!("{}T{}-04:00", self.date, self.time)
    }

    fn current_local_time(&self) -> TodayClockView {
        TodayClockView {
            date: self.date.into(),
            time: self.time.into(),
        }
    }
}

#[test]
fn a_new_local_habit_is_recordable_and_survives_a_fresh_application_without_a_snapshot() {
    let vault = TempVault::new("local-relaunch");
    let application = app(vault.path());
    let before = application.habits().unwrap();
    assert!(before.habits.is_empty());
    assert_eq!(before.catalog_revision, None);

    let saved = application
        .save_habit_definition(HabitDefinitionMutationInput {
            operation_id: "create-water-2026-10-14".into(),
            target_binding: before.catalog_target_binding.unwrap(),
            expected_revision: before.catalog_revision,
            habit_key: None,
            language: "en".into(),
            name: "Drink water".into(),
            emoji: Some("💧".into()),
            group: Some("Health".into()),
            start_date: Some("2026-10-14".into()),
            goal: Some(HabitGoalTarget::DailyCompletion),
        })
        .unwrap();

    assert_eq!(saved.outcome, HabitMutationOutcome::Created);
    let habit = saved.snapshot.habit(&saved.habit_key).unwrap();
    assert_eq!(habit.name, "Drink water");
    assert_eq!(habit.goal_kind, "daily-completion");
    assert!(habit.can_record_completion);
    assert_eq!(
        habit.definition.as_ref().unwrap().emoji.as_deref(),
        Some("💧")
    );
    assert_eq!(
        habit.definition.as_ref().unwrap().group.as_deref(),
        Some("Health")
    );
    assert_eq!(
        habit.definition.as_ref().unwrap().start_date.as_deref(),
        Some("2026-10-14")
    );

    let completed = application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: saved.habit_key.clone(),
            lived_date: "2026-10-14".into(),
            completed: true,
            change_id: "complete-water-2026-10-14".into(),
            target_binding: saved.snapshot.completion_target_binding.unwrap(),
            expected_revision: saved.snapshot.completion_revision,
        })
        .unwrap();
    assert!(
        completed
            .habit(&saved.habit_key)
            .unwrap()
            .today
            .counts_as_completion
    );

    let reopened = app(vault.path()).habits().unwrap();
    let habit = reopened.habit(&saved.habit_key).unwrap();
    assert_eq!(habit.name, "Drink water");
    assert!(habit.today.counts_as_completion);
    assert_eq!(
        habit.today.completion_source_labels,
        vec!["Personal Dashboard local"]
    );
}

#[test]
fn deactivation_preserves_the_same_habit_and_local_history_across_reopen_and_restore() {
    let vault = TempVault::new("lifecycle-reopen");
    let monday = app_at(vault.path(), "2026-10-12");
    let before = monday.habits().unwrap();
    let created = monday
        .save_habit_definition(HabitDefinitionMutationInput {
            operation_id: "create-lifecycle-read".into(),
            target_binding: before.catalog_target_binding.unwrap(),
            expected_revision: before.catalog_revision,
            habit_key: None,
            language: "en".into(),
            name: "Read".into(),
            emoji: Some("📚".into()),
            group: None,
            start_date: Some("2026-10-12".into()),
            goal: Some(HabitGoalTarget::DailyCompletion),
        })
        .unwrap();
    for (date, change_id) in [
        ("2026-10-12", "read-oct-12"),
        ("2026-10-13", "read-oct-13"),
    ] {
        let day = app_at(vault.path(), date);
        let before_completion = day.habits().unwrap();
        day
            .set_local_habit_completion(HabitCompletionMutationInput {
                habit_key: created.habit_key.clone(),
                lived_date: date.into(),
                completed: true,
                change_id: change_id.into(),
                target_binding: before_completion
                    .completion_target_binding
                    .clone()
                    .unwrap(),
                expected_revision: before_completion.completion_revision.clone(),
            })
            .unwrap();
    }

    let wednesday = app_at(vault.path(), "2026-10-14");
    let before_deactivation = wednesday.habits().unwrap();
    let deactivated = wednesday
        .set_habit_active(HabitLifecycleMutationInput {
            operation_id: "deactivate-read-oct-14".into(),
            target_binding: before_deactivation
                .catalog_target_binding
                .clone()
                .unwrap(),
            expected_revision: before_deactivation.catalog_revision.clone(),
            habit_key: created.habit_key.clone(),
            active: false,
        })
        .unwrap();
    let repeated = wednesday
        .set_habit_active(HabitLifecycleMutationInput {
            operation_id: "deactivate-read-oct-14".into(),
            target_binding: before_deactivation
                .catalog_target_binding
                .clone()
                .unwrap(),
            expected_revision: before_deactivation.catalog_revision.clone(),
            habit_key: created.habit_key.clone(),
            active: false,
        })
        .unwrap();
    assert_eq!(repeated.revision, deactivated.revision);
    assert!(wednesday
        .set_habit_active(HabitLifecycleMutationInput {
            operation_id: "stale-restore-read-oct-14".into(),
            target_binding: before_deactivation
                .catalog_target_binding
                .clone()
                .unwrap(),
            expected_revision: before_deactivation.catalog_revision.clone(),
            habit_key: created.habit_key.clone(),
            active: true,
        })
        .is_err());
    assert!(!wednesday
        .habits()
        .unwrap()
        .habit(&created.habit_key)
        .unwrap()
        .active);
    let inactive = deactivated.snapshot.habit(&created.habit_key).unwrap();
    assert!(!inactive.active);
    assert!(inactive.cell("2026-10-12").unwrap().counts_as_completion);
    assert!(inactive.cell("2026-10-13").unwrap().counts_as_completion);
    assert!(inactive.definition.as_ref().unwrap().lifecycle_history.iter().any(
        |entry| !entry.active && entry.effective_from == "2026-10-14"
    ));

    let reopened_while_inactive = app_at(vault.path(), "2026-10-15").habits().unwrap();
    let inactive_after_reopen = reopened_while_inactive.habit(&created.habit_key).unwrap();
    assert!(!inactive_after_reopen.active);
    assert_eq!(inactive_after_reopen.name, "Read");
    assert!(inactive_after_reopen.cell("2026-10-12").unwrap().counts_as_completion);
    assert!(inactive_after_reopen.cell("2026-10-15").unwrap().counts_as_completion == false);
    assert!(inactive_after_reopen.cell("2026-10-15").unwrap().coverage == "unknown");
    assert!(app_at(vault.path(), "2026-10-15")
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: created.habit_key.clone(),
            lived_date: "2026-10-15".into(),
            completed: true,
            change_id: "read-during-inactive-period".into(),
            target_binding: reopened_while_inactive
                .completion_target_binding
                .clone()
                .unwrap(),
            expected_revision: reopened_while_inactive.completion_revision.clone(),
        })
        .is_err());

    let friday = app_at(vault.path(), "2026-10-16");
    let before_restore = friday.habits().unwrap();
    let restored = friday
        .set_habit_active(HabitLifecycleMutationInput {
            operation_id: "restore-read-oct-16".into(),
            target_binding: before_restore.catalog_target_binding.unwrap(),
            expected_revision: before_restore.catalog_revision,
            habit_key: created.habit_key.clone(),
            active: true,
        })
        .unwrap();
    let active_again = restored.snapshot.habit(&created.habit_key).unwrap();
    assert!(active_again.active);
    assert_eq!(active_again.name, "Read");
    assert!(active_again.cell("2026-10-12").unwrap().counts_as_completion);
    assert!(active_again.cell("2026-10-13").unwrap().counts_as_completion);
    assert_eq!(active_again.cell("2026-10-16").unwrap().coverage, "unknown");
    let lifecycle = &active_again.definition.as_ref().unwrap().lifecycle_history;
    assert!(lifecycle.iter().any(|entry| !entry.active && entry.effective_from == "2026-10-14"));
    assert!(lifecycle.iter().any(|entry| entry.active && entry.effective_from == "2026-10-16"));
}

#[test]
fn selected_habit_detail_reads_canonical_history_older_than_the_twelve_week_projection() {
    let vault = TempVault::new("full-detail-history");
    let application = app_at(vault.path(), "2026-10-14");
    let before = application.habits().unwrap();
    let created = application
        .save_habit_definition(HabitDefinitionMutationInput {
            operation_id: "create-old-history-detail".into(),
            target_binding: before.catalog_target_binding.unwrap(),
            expected_revision: before.catalog_revision,
            habit_key: None,
            language: "en".into(),
            name: "Read before breakfast".into(),
            emoji: None,
            group: None,
            start_date: Some("2026-01-01".into()),
            goal: Some(HabitGoalTarget::DailyCompletion),
        })
        .unwrap();
    let before_completion = application.habits().unwrap();
    application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: created.habit_key.clone(),
            lived_date: "2026-01-05".into(),
            completed: true,
            change_id: "old-read-completion".into(),
            target_binding: before_completion
                .completion_target_binding
                .clone()
                .unwrap(),
            expected_revision: before_completion.completion_revision.clone(),
        })
        .unwrap();

    let before_start_edit = application.habits().unwrap();
    application
        .save_habit_definition(HabitDefinitionMutationInput {
            operation_id: "move-start-date-after-old-completion".into(),
            target_binding: before_start_edit.catalog_target_binding.unwrap(),
            expected_revision: before_start_edit.catalog_revision,
            habit_key: Some(created.habit_key.clone()),
            language: "en".into(),
            name: "Read before breakfast".into(),
            emoji: None,
            group: None,
            start_date: Some("2026-10-14".into()),
            goal: None,
        })
        .unwrap();

    let detail = application
        .habit_detail_history(&created.habit_key)
        .unwrap();
    assert_eq!(detail.canonical_state, "ready");
    assert_eq!(detail.canonical_target_binding, before_completion.completion_target_binding);
    assert_eq!(detail.local_completions.len(), 1);
    assert_eq!(detail.local_completions[0].lived_date, "2026-01-05");
    assert_eq!(detail.local_completions[0].state, personal_dashboard_lib::habits::HabitLocalCompletionState::Completed);
    assert_eq!(
        serde_json::to_value(&detail).unwrap()["statistics"]["cumulativeAttainedDays"],
        1
    );
    assert!(detail.habit.history.iter().all(|cell| cell.date != "2026-01-05"));

    let reopened = app_at(vault.path(), "2026-10-14")
        .habit_detail_history(&created.habit_key)
        .unwrap();
    assert_eq!(reopened.local_completions.len(), 1);
    assert_eq!(reopened.local_completions[0].lived_date, "2026-01-05");
    assert_eq!(
        serde_json::to_value(&reopened).unwrap()["statistics"]["cumulativeAttainedDays"],
        1
    );
}

#[test]
fn weekly_goal_edits_keep_the_current_week_then_apply_on_monday_after_reopen() {
    let vault = TempVault::new("weekly-cycle");
    let wednesday = app_at(vault.path(), "2026-10-14");
    let initial = wednesday.habits().unwrap();
    let created = wednesday
        .save_habit_definition(HabitDefinitionMutationInput {
            operation_id: "create-reading-2026-10-14".into(),
            target_binding: initial.catalog_target_binding.unwrap(),
            expected_revision: initial.catalog_revision,
            habit_key: None,
            language: "en".into(),
            name: "Read".into(),
            emoji: Some("📚".into()),
            group: None,
            start_date: Some("2026-10-12".into()),
            goal: Some(HabitGoalTarget::WeeklyCount { standard: 3 }),
        })
        .unwrap();
    let created_habit = created.snapshot.habit(&created.habit_key).unwrap();
    let completion_view = wednesday
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: created.habit_key.clone(),
            lived_date: "2026-10-14".into(),
            completed: true,
            change_id: "read-wednesday".into(),
            target_binding: created.snapshot.completion_target_binding.clone().unwrap(),
            expected_revision: created.snapshot.completion_revision.clone(),
        })
        .unwrap();
    assert!(
        completion_view
            .habit(&created.habit_key)
            .unwrap()
            .today
            .counts_as_completion
    );
    assert_eq!(created_habit.weekly_target, Some(3));

    let edited = wednesday
        .save_habit_definition(HabitDefinitionMutationInput {
            operation_id: "read-goal-five".into(),
            target_binding: created.snapshot.catalog_target_binding.clone().unwrap(),
            expected_revision: created.snapshot.catalog_revision.clone(),
            habit_key: Some(created.habit_key.clone()),
            language: "en".into(),
            name: "Read".into(),
            emoji: Some("📚".into()),
            group: None,
            start_date: Some("2026-10-12".into()),
            goal: Some(HabitGoalTarget::WeeklyCount { standard: 5 }),
        })
        .unwrap();
    let current = edited.snapshot.habit(&created.habit_key).unwrap();
    assert_eq!(current.weekly_target, Some(3));
    assert_eq!(current.completed_count, Some(1));
    assert_eq!(
        current.definition.as_ref().unwrap().pending_goal,
        Some(HabitGoalTarget::WeeklyCount { standard: 5 })
    );
    assert_eq!(
        current
            .definition
            .as_ref()
            .unwrap()
            .pending_goal_effective_from
            .as_deref(),
        Some("2026-10-19")
    );

    let monday = app_at(vault.path(), "2026-10-19").habits().unwrap();
    let reopened = monday.habit(&created.habit_key).unwrap();
    assert_eq!(reopened.weekly_target, Some(5));
    assert_eq!(reopened.completed_count, Some(0));
    assert_eq!(reopened.today.counts_as_completion, false);
    assert_eq!(reopened.definition.as_ref().unwrap().pending_goal, None);
    assert!(reopened.cell("2026-10-14").unwrap().counts_as_completion);
}

#[test]
fn definition_retries_are_idempotent_and_stale_revisions_do_not_overwrite() {
    let vault = TempVault::new("idempotent-conflict");
    let application = app(vault.path());
    let before = application.habits().unwrap();
    let input = HabitDefinitionMutationInput {
        operation_id: "create-journal".into(),
        target_binding: before.catalog_target_binding.clone().unwrap(),
        expected_revision: before.catalog_revision.clone(),
        habit_key: None,
        language: "en".into(),
        name: "Journal".into(),
        emoji: None,
        group: None,
        start_date: Some("2026-10-14".into()),
        goal: Some(HabitGoalTarget::DailyCompletion),
    };
    let first = application.save_habit_definition(input.clone()).unwrap();
    let retry = application.save_habit_definition(input.clone()).unwrap();
    assert_eq!(first.habit_key, retry.habit_key);
    assert_eq!(first.revision, retry.revision);
    assert_eq!(retry.snapshot.habits.len(), 1);

    let stale_result = application.save_habit_definition(HabitDefinitionMutationInput {
        operation_id: "stale-edit-journal".into(),
        expected_revision: before.catalog_revision,
        habit_key: Some(first.habit_key.clone()),
        target_binding: first.snapshot.catalog_target_binding.unwrap(),
        language: "en".into(),
        name: "Changed".into(),
        emoji: None,
        group: None,
        start_date: Some("2026-10-14".into()),
        goal: Some(HabitGoalTarget::DailyCompletion),
    });
    assert!(stale_result.is_err());
    let after_stale = application.habits().unwrap();
    assert_eq!(
        after_stale.catalog_revision.as_deref(),
        Some(first.revision.as_str())
    );
    assert_eq!(after_stale.habit(&first.habit_key).unwrap().name, "Journal");
}

#[test]
fn daily_time_goal_preserves_next_day_relation_after_reopen() {
    let vault = TempVault::new("next-day-time");
    let application = app(vault.path());
    let before = application.habits().unwrap();
    let saved = application
        .save_habit_definition(HabitDefinitionMutationInput {
            operation_id: "create-sleep".into(),
            target_binding: before.catalog_target_binding.unwrap(),
            expected_revision: before.catalog_revision,
            habit_key: None,
            language: "en".into(),
            name: "Sleep before".into(),
            emoji: Some("🌙".into()),
            group: Some("Rest".into()),
            start_date: Some("2026-10-14".into()),
            goal: Some(HabitGoalTarget::DailyTime {
                standard: "23:00".into(),
                day_relation: DayRelation::NextDay,
            }),
        })
        .unwrap();

    let reopened = app(vault.path()).habits().unwrap();
    let habit = reopened.habit(&saved.habit_key).unwrap();
    assert_eq!(
        habit.goal_target,
        Some(HabitGoalTarget::DailyTime {
            standard: "23:00".into(),
            day_relation: DayRelation::NextDay,
        })
    );
    assert!(!habit.can_record_completion);
}

#[test]
fn a_daily_goal_change_waits_until_the_next_lived_day_at_four_am() {
    let vault = TempVault::new("daily-cycle-boundary");
    let initial = app_at(vault.path(), "2026-10-14");
    let before = initial.habits().unwrap();
    let created = initial
        .save_habit_definition(HabitDefinitionMutationInput {
            operation_id: "create-daily-stretch".into(),
            target_binding: before.catalog_target_binding.unwrap(),
            expected_revision: before.catalog_revision,
            habit_key: None,
            language: "en".into(),
            name: "Stretch".into(),
            emoji: None,
            group: None,
            start_date: Some("2026-10-14".into()),
            goal: Some(HabitGoalTarget::DailyCompletion),
        })
        .unwrap();
    let changed = initial
        .save_habit_definition(HabitDefinitionMutationInput {
            operation_id: "stretch-weekly".into(),
            target_binding: created.snapshot.catalog_target_binding.clone().unwrap(),
            expected_revision: created.snapshot.catalog_revision.clone(),
            habit_key: Some(created.habit_key.clone()),
            language: "en".into(),
            name: "Stretch".into(),
            emoji: None,
            group: None,
            start_date: Some("2026-10-14".into()),
            goal: Some(HabitGoalTarget::WeeklyCount { standard: 2 }),
        })
        .unwrap();
    let habit = changed.snapshot.habit(&created.habit_key).unwrap();
    assert_eq!(habit.goal_target, Some(HabitGoalTarget::DailyCompletion));
    assert_eq!(
        habit
            .definition
            .as_ref()
            .unwrap()
            .pending_goal_effective_from
            .as_deref(),
        Some("2026-10-15")
    );

    let before_boundary = TodayApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        LivedBoundaryClock {
            date: "2026-10-15",
            time: "03:59",
        },
    )
    .habits()
    .unwrap();
    assert_eq!(before_boundary.lived_date.as_deref(), Some("2026-10-14"));
    assert_eq!(
        before_boundary
            .habit(&created.habit_key)
            .unwrap()
            .goal_target,
        Some(HabitGoalTarget::DailyCompletion)
    );

    let after_boundary = TodayApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        LivedBoundaryClock {
            date: "2026-10-15",
            time: "04:00",
        },
    )
    .habits()
    .unwrap();
    assert_eq!(after_boundary.lived_date.as_deref(), Some("2026-10-15"));
    assert_eq!(
        after_boundary
            .habit(&created.habit_key)
            .unwrap()
            .goal_target,
        Some(HabitGoalTarget::WeeklyCount { standard: 2 })
    );
}

#[test]
fn source_refresh_updates_source_evidence_without_replacing_local_definition_overrides() {
    let vault = TempVault::new("source-refresh");
    let snapshot_path = vault
        .path()
        .join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);
    fs::create_dir_all(snapshot_path.parent().unwrap()).unwrap();
    let mut source: serde_json::Value =
        serde_json::from_slice(include_bytes!("fixtures/habits-v1-complete.json")).unwrap();
    fs::write(&snapshot_path, serde_json::to_vec_pretty(&source).unwrap()).unwrap();

    let application = app(vault.path());
    let before = application.habits().unwrap();
    let source_goal = before
        .habit("exercise")
        .unwrap()
        .goal_target
        .clone()
        .unwrap();
    let saved = application
        .save_habit_definition(HabitDefinitionMutationInput {
            operation_id: "edit-exercise-name".into(),
            target_binding: before.catalog_target_binding.clone().unwrap(),
            expected_revision: before.catalog_revision.clone(),
            habit_key: Some("exercise".into()),
            language: "en".into(),
            name: "Movement".into(),
            emoji: Some("🏃".into()),
            group: Some("Health".into()),
            start_date: None,
            goal: Some(source_goal),
        })
        .unwrap();
    assert_eq!(saved.snapshot.habit("exercise").unwrap().name, "Exercise");
    assert_eq!(
        saved
            .snapshot
            .habit("exercise")
            .unwrap()
            .localized_names
            .en
            .as_deref(),
        Some("Movement")
    );

    source["habits"][0]["name"] = serde_json::Value::String("Source movement".into());
    source["habits"][0]["goal"]["standard"] = serde_json::Value::from(4);
    fs::write(&snapshot_path, serde_json::to_vec_pretty(&source).unwrap()).unwrap();

    let refreshed = app(vault.path()).habits().unwrap();
    let habit = refreshed.habit("exercise").unwrap();
    assert_eq!(habit.name, "Source movement");
    assert_eq!(habit.localized_names.en.as_deref(), Some("Movement"));
    assert_eq!(
        habit.goal_target,
        Some(HabitGoalTarget::WeeklyCount { standard: 4 })
    );
    assert_eq!(
        habit.definition.as_ref().unwrap().emoji.as_deref(),
        Some("🏃")
    );
    assert_eq!(
        habit.definition.as_ref().unwrap().group.as_deref(),
        Some("Health")
    );
    assert!(habit.cell("2026-09-08").is_some());
}

#[test]
fn editing_a_sourced_habit_without_a_recognized_goal_preserves_its_source_goal() {
    let vault = TempVault::new("source-without-goal");
    let snapshot_path = vault
        .path()
        .join(personal_dashboard_lib::habits::SNAPSHOT_RELATIVE_PATH);
    fs::create_dir_all(snapshot_path.parent().unwrap()).unwrap();
    let mut source: serde_json::Value =
        serde_json::from_slice(include_bytes!("fixtures/habits-v1-complete.json")).unwrap();
    source["habits"][0]["goal"] = serde_json::Value::Null;
    fs::write(&snapshot_path, serde_json::to_vec_pretty(&source).unwrap()).unwrap();

    let application = app(vault.path());
    let before = application.habits().unwrap();
    assert_eq!(before.habit("exercise").unwrap().goal_target, None);
    let saved = application
        .save_habit_definition(HabitDefinitionMutationInput {
            operation_id: "edit-source-without-goal".into(),
            target_binding: before.catalog_target_binding.unwrap(),
            expected_revision: before.catalog_revision,
            habit_key: Some("exercise".into()),
            language: "en".into(),
            name: "Movement".into(),
            emoji: Some("🏃".into()),
            group: Some("Health".into()),
            start_date: None,
            goal: None,
        })
        .unwrap();

    let habit = saved.snapshot.habit("exercise").unwrap();
    assert_eq!(habit.goal_target, None);
    assert_eq!(habit.localized_names.en.as_deref(), Some("Movement"));
    assert_eq!(
        habit.definition.as_ref().unwrap().emoji.as_deref(),
        Some("🏃")
    );
    let catalog_path = vault
        .path()
        .join(personal_dashboard_lib::habit_catalog::CATALOG_RELATIVE_PATH);
    let catalog: serde_json::Value =
        serde_json::from_slice(&fs::read(catalog_path).unwrap()).unwrap();
    assert_eq!(
        catalog["habits"]["exercise"]["goalRevisions"],
        serde_json::json!([])
    );
    assert_eq!(
        catalog["habits"]["exercise"]["sourceGoalTarget"],
        serde_json::Value::Null
    );
}

#[test]
fn damaged_catalog_is_reported_and_never_replaced_by_a_new_empty_document() {
    let vault = TempVault::new("damaged-catalog");
    let application = app(vault.path());
    let initial = application.habits().unwrap();
    let created = application
        .save_habit_definition(HabitDefinitionMutationInput {
            operation_id: "create-stretch-before-damage".into(),
            target_binding: initial.catalog_target_binding.unwrap(),
            expected_revision: initial.catalog_revision,
            habit_key: None,
            language: "en".into(),
            name: "Stretch".into(),
            emoji: None,
            group: None,
            start_date: Some("2026-10-14".into()),
            goal: Some(HabitGoalTarget::DailyCompletion),
        })
        .unwrap();
    let catalog_path = vault
        .path()
        .join(personal_dashboard_lib::habit_catalog::CATALOG_RELATIVE_PATH);
    fs::write(&catalog_path, b"{ damaged user data\n").unwrap();
    let damaged_bytes = fs::read(&catalog_path).unwrap();

    let damaged_view = app(vault.path()).habits().unwrap();
    assert!(damaged_view.catalog_error.is_some());
    assert!(damaged_view.catalog_revision.is_some());
    let attempted = app(vault.path()).save_habit_definition(HabitDefinitionMutationInput {
        operation_id: "create-another-after-damage".into(),
        target_binding: damaged_view.catalog_target_binding.unwrap(),
        expected_revision: damaged_view.catalog_revision,
        habit_key: None,
        language: "en".into(),
        name: "Another".into(),
        emoji: None,
        group: None,
        start_date: Some("2026-10-14".into()),
        goal: Some(HabitGoalTarget::DailyCompletion),
    });
    assert!(attempted.is_err());
    assert_eq!(fs::read(catalog_path).unwrap(), damaged_bytes);
    assert!(app(vault.path()).habits().unwrap().catalog_error.is_some());
    assert!(created.snapshot.habit(&created.habit_key).is_some());
}
