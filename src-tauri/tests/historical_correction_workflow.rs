use personal_dashboard_lib::habits::{FileHabitSnapshotStore, HabitSnapshotState};
use personal_dashboard_lib::today::{
    DayTaskAddInput, DayTaskChangeKind, DayTaskCompletionInput, DayTaskDeleteInput,
    DayTaskRenameInput, FileDayTaskStore, FileHabitCompletionStore, FileTodayRecordStore,
    HabitCompletionMutationInput, HabitLocalCompletionState, PlanningDayTaskStatus,
    TodayApplication, TodayClock, TodayWorkspaceExchange, TodayWorkspacePersistence,
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
            "personal-dashboard-history-{label}-{}-{nonce}",
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

fn app(
    vault: &Path,
) -> TodayApplication<
    SelectedVault,
    NoSelection,
    FixedClock,
    FileTodayRecordStore,
    FileHabitSnapshotStore,
    FileDayTaskStore,
    FileHabitCompletionStore,
> {
    TodayApplication::with_every_store(
        SelectedVault(vault.to_path_buf()),
        NoSelection,
        FixedClock,
        FileTodayRecordStore,
        FileHabitSnapshotStore,
        FileDayTaskStore,
        FileHabitCompletionStore,
    )
}

fn write_snapshot(vault: &Path) {
    let path = vault.join(".personal-dashboard/derived/habits-v1.json");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, include_str!("fixtures/habits-v1-complete.json")).unwrap();
}

fn record_path(vault: &Path, date: &str) -> PathBuf {
    vault
        .join("life/Journal/Daily")
        .join(&date[..4])
        .join(format!("{}-{}", &date[..4], &date[5..7]))
        .join(format!("{date}.md"))
}

fn task_path(vault: &Path, date: &str) -> PathBuf {
    vault
        .join("life/.personal-dashboard/day-tasks/v1")
        .join(&date[..4])
        .join(format!("{date}.json"))
}

fn completion_path(vault: &Path) -> PathBuf {
    vault.join("life/.personal-dashboard/habit-completions/v1/completions.json")
}

fn write_reviewed_record(vault: &Path, date: &str) -> Vec<u8> {
    let path = record_path(vault, date);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let bytes = format!(
        "---\ntype: daily-record\ndate: {date}\n---\n# {date}\n\n## 今天的大致安排\n\n- **下午：** 原来的安排。\n\n## 晚间复盘\n\n### 今天发生了什么\n\n- 原来的复盘正文必须逐字保留。\n"
    )
    .into_bytes();
    fs::write(&path, &bytes).unwrap();
    bytes
}

#[test]
fn a_past_day_projects_its_catalog_cell_without_inventing_a_missing_historical_goal() {
    let vault = TempVault::new("past-habit-projection");
    write_snapshot(vault.path());

    let view = app(vault.path()).read_date("2026-09-01").unwrap();
    let exercise = view.habit_corrections.habit("exercise").unwrap();
    let nutrition = view.habit_corrections.habit("nutrition").unwrap();

    assert_eq!(view.habit_corrections.date, "2026-09-01");
    assert!(view.habit_corrections.can_record);
    assert_eq!(exercise.goal_label.as_deref(), Some("每周 2 次"));
    assert_eq!(exercise.cell.coverage, "unknown");
    assert_eq!(nutrition.goal_label, None);
    assert_eq!(nutrition.cell.coverage, "unknown");
}

#[test]
fn past_task_and_habit_corrections_keep_the_lived_day_review_and_append_only_trace() {
    let vault = TempVault::new("past-correction-round-trip");
    write_snapshot(vault.path());
    let original_review = write_reviewed_record(vault.path(), "2026-09-07");
    let application = app(vault.path());
    let opened = application.read_date("2026-09-07").unwrap();

    let added = application
        .add_day_task(DayTaskAddInput {
            date: "2026-09-07".into(),
            target_binding: opened.day_tasks.target_binding.unwrap(),
            expected_revision: opened.day_tasks.revision,
            task_id: "historical-laundry".into(),
            text: "洗床单".into(),
        })
        .unwrap();
    let renamed = application
        .rename_day_task(DayTaskRenameInput {
            date: "2026-09-07".into(),
            target_binding: added.day_tasks.target_binding.clone().unwrap(),
            expected_revision: added.day_tasks.revision.clone().unwrap(),
            task_id: "historical-laundry".into(),
            change_id: "rename-historical-laundry".into(),
            text: "洗床单和枕套".into(),
        })
        .unwrap();
    let completed = application
        .set_day_task_completion(DayTaskCompletionInput {
            date: "2026-09-07".into(),
            target_binding: renamed.day_tasks.target_binding.clone().unwrap(),
            expected_revision: renamed.day_tasks.revision.clone().unwrap(),
            task_id: "historical-laundry".into(),
            change_id: "complete-historical-laundry".into(),
            completed: true,
        })
        .unwrap();
    let reopened = application
        .set_day_task_completion(DayTaskCompletionInput {
            date: "2026-09-07".into(),
            target_binding: completed.day_tasks.target_binding.clone().unwrap(),
            expected_revision: completed.day_tasks.revision.clone().unwrap(),
            task_id: "historical-laundry".into(),
            change_id: "reopen-historical-laundry".into(),
            completed: false,
        })
        .unwrap();
    let disposable = application
        .add_day_task(DayTaskAddInput {
            date: "2026-09-07".into(),
            target_binding: reopened.day_tasks.target_binding.clone().unwrap(),
            expected_revision: reopened.day_tasks.revision.clone(),
            task_id: "historical-disposable".into(),
            text: "临时历史任务".into(),
        })
        .unwrap();
    let deleted = application
        .delete_day_task(DayTaskDeleteInput {
            date: "2026-09-07".into(),
            target_binding: disposable.day_tasks.target_binding.clone().unwrap(),
            expected_revision: disposable.day_tasks.revision.clone().unwrap(),
            task_id: "historical-disposable".into(),
            change_id: "delete-historical-disposable".into(),
        })
        .unwrap();
    let task = &deleted.day_tasks.tasks[0];
    assert_eq!(deleted.date, "2026-09-07");
    assert_eq!(task.text, "洗床单和枕套");
    assert_eq!(task.modified_at, "2026-09-08T14:10-04:00");
    assert_eq!(task.completed_at, None);
    assert_eq!(task.changes.len(), 3);
    let deleted_task = deleted
        .day_tasks
        .tasks
        .iter()
        .find(|task| task.id == "historical-disposable")
        .unwrap();
    assert!(deleted_task.deleted_at.is_some());
    assert_eq!(
        deleted_task.changes.last().unwrap().kind,
        DayTaskChangeKind::Deleted
    );

    let completed_habit = application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-07".into(),
            completed: true,
            change_id: "complete-historical-reset".into(),
            target_binding: reopened
                .habit_corrections
                .completion_target_binding
                .clone()
                .unwrap(),
            expected_revision: reopened.habit_corrections.completion_revision.clone(),
        })
        .unwrap();
    let withdrawn_habit = application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-07".into(),
            completed: false,
            change_id: "withdraw-historical-reset".into(),
            target_binding: completed_habit
                .habit_corrections
                .completion_target_binding
                .clone()
                .unwrap(),
            expected_revision: completed_habit
                .habit_corrections
                .completion_revision
                .clone(),
        })
        .unwrap();
    let reset = withdrawn_habit.habit_corrections.habit("reset").unwrap();
    assert_eq!(withdrawn_habit.date, "2026-09-07");
    assert_eq!(
        reset.cell.local_completion_state,
        HabitLocalCompletionState::Withdrawn
    );
    assert_eq!(reset.local_change_count, 2);
    assert_eq!(
        reset
            .local_changes
            .iter()
            .map(|change| (change.state, change.changed_at.as_str()))
            .collect::<Vec<_>>(),
        vec![
            (
                HabitLocalCompletionState::Completed,
                "2026-09-08T14:10-04:00"
            ),
            (
                HabitLocalCompletionState::Withdrawn,
                "2026-09-08T14:10-04:00"
            ),
        ]
    );
    assert_eq!(reset.cell.coverage, "partial");
    let planning_context = application.planning_day_task_context("2026-09-07").unwrap();
    assert_eq!(planning_context.tasks.len(), 2);
    assert_eq!(
        planning_context
            .tasks
            .iter()
            .find(|candidate| candidate.id == "historical-disposable")
            .unwrap()
            .status,
        PlanningDayTaskStatus::Deleted
    );

    assert_eq!(
        fs::read(record_path(vault.path(), "2026-09-07")).unwrap(),
        original_review
    );
    let today = application.open().unwrap();
    assert_eq!(today.date, "2026-09-08");
    assert!(today.day_tasks.tasks.is_empty());
    assert_eq!(
        today
            .habit_corrections
            .habit("reset")
            .unwrap()
            .cell
            .local_completion_state,
        HabitLocalCompletionState::None
    );

    let relaunched = app(vault.path()).read_date("2026-09-07").unwrap();
    assert_eq!(relaunched.day_tasks.tasks[0].changes.len(), 3);
    assert!(relaunched
        .day_tasks
        .tasks
        .iter()
        .any(|task| task.id == "historical-disposable" && task.deleted_at.is_some()));
    assert_eq!(
        relaunched
            .habit_corrections
            .habit("reset")
            .unwrap()
            .local_change_count,
        2
    );
}

#[test]
fn withdrawing_a_historical_local_completion_keeps_external_completion_visible() {
    let vault = TempVault::new("historical-or-merge");
    write_snapshot(vault.path());
    let application = app(vault.path());
    let opened = application.read_date("2026-09-07").unwrap();
    let external = opened.habit_corrections.habit("exercise").unwrap();
    assert!(external.cell.counts_as_completion);
    assert!(external.cell.has_external_completion);

    let completed = application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "exercise".into(),
            lived_date: "2026-09-07".into(),
            completed: true,
            change_id: "complete-past-exercise".into(),
            target_binding: opened
                .habit_corrections
                .completion_target_binding
                .clone()
                .unwrap(),
            expected_revision: opened.habit_corrections.completion_revision.clone(),
        })
        .unwrap();
    let withdrawn = application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "exercise".into(),
            lived_date: "2026-09-07".into(),
            completed: false,
            change_id: "withdraw-past-exercise".into(),
            target_binding: completed
                .habit_corrections
                .completion_target_binding
                .clone()
                .unwrap(),
            expected_revision: completed.habit_corrections.completion_revision.clone(),
        })
        .unwrap();
    let exercise = withdrawn.habit_corrections.habit("exercise").unwrap();

    assert!(exercise.cell.counts_as_completion);
    assert!(exercise.cell.has_external_completion);
    assert_eq!(
        exercise.cell.local_completion_state,
        HabitLocalCompletionState::Withdrawn
    );
    assert_eq!(exercise.local_change_count, 2);
}

#[test]
fn an_out_of_window_local_record_remains_correctable_with_unknown_external_state_and_goal() {
    let vault = TempVault::new("outside-window");
    write_snapshot(vault.path());
    let application = app(vault.path());
    let opened = application.read_date("2026-05-01").unwrap();
    let reset = opened.habit_corrections.habit("reset").unwrap();
    assert_eq!(reset.goal_label, None);
    assert_eq!(reset.cell.coverage, "unknown");
    assert!(!reset.cell.has_external_completion);

    let saved = application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-05-01".into(),
            completed: true,
            change_id: "complete-outside-window".into(),
            target_binding: opened
                .habit_corrections
                .completion_target_binding
                .clone()
                .unwrap(),
            expected_revision: opened.habit_corrections.completion_revision.clone(),
        })
        .unwrap();
    let reset = saved.habit_corrections.habit("reset").unwrap();
    assert!(reset.cell.counts_as_completion);
    assert_eq!(
        reset.cell.local_completion_state,
        HabitLocalCompletionState::Completed
    );
    assert_eq!(reset.cell.coverage, "unknown");
    assert_eq!(reset.goal_label, None);

    let relaunched = app(vault.path()).read_date("2026-05-01").unwrap();
    assert_eq!(
        relaunched
            .habit_corrections
            .habit("reset")
            .unwrap()
            .cell
            .local_completion_state,
        HabitLocalCompletionState::Completed
    );
}

#[test]
fn opening_a_blank_day_is_read_only_and_future_fact_mutations_are_rejected() {
    let vault = TempVault::new("blank-and-future");
    write_snapshot(vault.path());
    let application = app(vault.path());
    let blank = application.read_date("2026-09-06").unwrap();

    assert!(!record_path(vault.path(), "2026-09-06").exists());
    assert!(!task_path(vault.path(), "2026-09-06").exists());
    assert!(!completion_path(vault.path()).exists());
    assert!(blank.day_tasks.tasks.is_empty());

    let task_written = application
        .add_day_task(DayTaskAddInput {
            date: "2026-09-06".into(),
            target_binding: blank.day_tasks.target_binding.clone().unwrap(),
            expected_revision: blank.day_tasks.revision.clone(),
            task_id: "blank-day-explicit-task".into(),
            text: "明确补记的历史任务".into(),
        })
        .unwrap();
    application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-06".into(),
            completed: true,
            change_id: "blank-day-explicit-habit".into(),
            target_binding: task_written
                .habit_corrections
                .completion_target_binding
                .unwrap(),
            expected_revision: task_written.habit_corrections.completion_revision,
        })
        .unwrap();
    assert!(task_path(vault.path(), "2026-09-06").exists());
    assert!(completion_path(vault.path()).exists());
    assert!(!record_path(vault.path(), "2026-09-06").exists());

    let future = application.read_date("2026-09-09").unwrap();
    assert!(!future.can_record);
    assert!(!future.habit_corrections.can_record);
    assert!(!future
        .habit_corrections
        .message
        .contains("仍按稳定习惯 key 保存"));
    assert!(application
        .add_day_task(DayTaskAddInput {
            date: "2026-09-09".into(),
            target_binding: future.day_tasks.target_binding.unwrap(),
            expected_revision: None,
            task_id: "future-task".into(),
            text: "未来事实".into(),
        })
        .is_err());
    assert!(application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-09".into(),
            completed: true,
            change_id: "future-habit".into(),
            target_binding: future.habit_corrections.completion_target_binding.unwrap(),
            expected_revision: None,
        })
        .is_err());
    assert!(!record_path(vault.path(), "2026-09-09").exists());
    assert!(!task_path(vault.path(), "2026-09-09").exists());
    assert!(completion_path(vault.path()).exists());
}

#[test]
fn historical_projection_retains_the_last_valid_view_after_snapshot_or_local_damage() {
    let vault = TempVault::new("historical-retained-errors");
    write_snapshot(vault.path());
    let application = app(vault.path());
    let opened = application.read_date("2026-09-05").unwrap();
    let saved = application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-05".into(),
            completed: true,
            change_id: "retained-history-completion".into(),
            target_binding: opened.habit_corrections.completion_target_binding.unwrap(),
            expected_revision: opened.habit_corrections.completion_revision,
        })
        .unwrap();
    assert_eq!(
        saved
            .habit_corrections
            .habit("reset")
            .unwrap()
            .local_change_count,
        1
    );

    fs::write(
        vault
            .path()
            .join(".personal-dashboard/derived/habits-v1.json"),
        b"{\"schemaVersion\":2}",
    )
    .unwrap();
    let retained_snapshot = application.read_date("2026-09-05").unwrap();
    assert_eq!(
        retained_snapshot.habit_corrections.state,
        HabitSnapshotState::Retained
    );
    assert_eq!(
        retained_snapshot
            .habit_corrections
            .habit("reset")
            .unwrap()
            .local_change_count,
        1
    );
    assert!(retained_snapshot
        .habit_corrections
        .message
        .contains("继续显示上个有效历史读数"));

    write_snapshot(vault.path());
    let refreshed = application.read_date("2026-09-05").unwrap();
    assert_eq!(refreshed.habit_corrections.state, HabitSnapshotState::Ready);
    fs::write(completion_path(vault.path()), b"not-json").unwrap();
    let retained_local = application.read_date("2026-09-05").unwrap();
    assert_eq!(
        retained_local.habit_corrections.state,
        HabitSnapshotState::Retained
    );
    assert_eq!(
        retained_local
            .habit_corrections
            .habit("reset")
            .unwrap()
            .local_change_count,
        1
    );
}

#[test]
fn a_persisted_local_history_remains_visible_and_withdrawable_without_a_catalog_after_restart() {
    let vault = TempVault::new("historical-uncatalogued-restart");
    write_snapshot(vault.path());
    let application = app(vault.path());
    let opened = application.read_date("2026-09-05").unwrap();
    application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-05".into(),
            completed: true,
            change_id: "uncatalogued-history-completion".into(),
            target_binding: opened.habit_corrections.completion_target_binding.unwrap(),
            expected_revision: opened.habit_corrections.completion_revision,
        })
        .unwrap();
    drop(application);
    fs::remove_file(
        vault
            .path()
            .join(".personal-dashboard/derived/habits-v1.json"),
    )
    .unwrap();

    let relaunched = app(vault.path());
    let uncatalogued = relaunched.read_date("2026-09-05").unwrap();
    let reset = uncatalogued.habit_corrections.habit("reset").unwrap();
    assert_eq!(
        uncatalogued.habit_corrections.state,
        HabitSnapshotState::Missing
    );
    assert!(uncatalogued.habit_corrections.can_record);
    assert_eq!(reset.name, "reset");
    assert!(!reset.name_known);
    assert_eq!(reset.goal_label, None);
    assert_eq!(reset.cell.coverage, "unknown");
    assert_eq!(
        reset.cell.local_completion_state,
        HabitLocalCompletionState::Completed
    );

    let withdrawn = relaunched
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-05".into(),
            completed: false,
            change_id: "uncatalogued-history-withdrawal".into(),
            target_binding: uncatalogued
                .habit_corrections
                .completion_target_binding
                .unwrap(),
            expected_revision: uncatalogued.habit_corrections.completion_revision,
        })
        .unwrap();
    assert_eq!(
        withdrawn.habit_corrections.state,
        HabitSnapshotState::Missing
    );
    assert_eq!(
        withdrawn
            .habit_corrections
            .habit("reset")
            .unwrap()
            .cell
            .local_completion_state,
        HabitLocalCompletionState::Withdrawn
    );
}

#[test]
fn stale_historical_revisions_preserve_external_task_and_completion_documents() {
    let vault = TempVault::new("historical-stale-revisions");
    write_snapshot(vault.path());
    let application = app(vault.path());
    let opened = application.read_date("2026-09-05").unwrap();
    let added = application
        .add_day_task(DayTaskAddInput {
            date: "2026-09-05".into(),
            target_binding: opened.day_tasks.target_binding.unwrap(),
            expected_revision: None,
            task_id: "stale-history-task".into(),
            text: "旧文字".into(),
        })
        .unwrap();
    let external_task = fs::read(task_path(vault.path(), "2026-09-05")).unwrap();
    let external_task = String::from_utf8(external_task)
        .unwrap()
        .replace("旧文字", "外部文字");
    fs::write(task_path(vault.path(), "2026-09-05"), &external_task).unwrap();
    assert!(application
        .rename_day_task(DayTaskRenameInput {
            date: "2026-09-05".into(),
            target_binding: added.day_tasks.target_binding.unwrap(),
            expected_revision: added.day_tasks.revision.unwrap(),
            task_id: "stale-history-task".into(),
            change_id: "stale-history-rename".into(),
            text: "用户文字".into(),
        })
        .is_err());
    assert_eq!(
        fs::read_to_string(task_path(vault.path(), "2026-09-05")).unwrap(),
        external_task
    );

    let habit_opened = application.read_date("2026-09-05").unwrap();
    let completed = application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-05".into(),
            completed: true,
            change_id: "initial-history-completion".into(),
            target_binding: habit_opened
                .habit_corrections
                .completion_target_binding
                .clone()
                .unwrap(),
            expected_revision: habit_opened.habit_corrections.completion_revision.clone(),
        })
        .unwrap();
    let external_completion = fs::read_to_string(completion_path(vault.path()))
        .unwrap()
        .replace("initial-history-completion", "external-history-completion");
    fs::write(completion_path(vault.path()), &external_completion).unwrap();
    assert!(application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "reset".into(),
            lived_date: "2026-09-05".into(),
            completed: false,
            change_id: "stale-history-withdraw".into(),
            target_binding: completed
                .habit_corrections
                .completion_target_binding
                .unwrap(),
            expected_revision: completed.habit_corrections.completion_revision,
        })
        .is_err());
    assert_eq!(
        fs::read_to_string(completion_path(vault.path())).unwrap(),
        external_completion
    );
}
