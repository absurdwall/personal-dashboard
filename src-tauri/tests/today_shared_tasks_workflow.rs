use personal_dashboard_lib::habits::FileHabitSnapshotStore;
use personal_dashboard_lib::tasks::{
    FileTaskStore, TaskApplication, TaskCreateInput, TaskDeleteInput, TaskListArchiveInput,
    TaskListCreateInput, TaskListRestoreInput, TaskRestoreInput, TaskState, TaskStateInput,
    TaskUpdateInput, TaskView, TasksView,
};
use personal_dashboard_lib::today::{
    FileTodayRecordStore, TodayApplication, TodayClock, TodayClockView, TodayView,
    TodayWorkspaceExchange, TodayWorkspacePersistence,
};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

struct TempVault(PathBuf);

impl TempVault {
    fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "personal-dashboard-today-shared-{label}-{}-{nonce}",
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

struct FixedClock;

impl TodayClock for FixedClock {
    fn current_date(&self) -> String {
        "2026-09-17".into()
    }

    fn current_time_label(&self) -> String {
        "17:05".into()
    }

    fn current_timestamp_label(&self) -> String {
        "2026-09-17T17:05-04:00".into()
    }
}

#[derive(Clone)]
struct MutableClock(Arc<Mutex<TodayClockView>>);

impl MutableClock {
    fn new(date: &str, time: &str) -> Self {
        Self(Arc::new(Mutex::new(TodayClockView {
            date: date.into(),
            time: time.into(),
        })))
    }

    fn set(&self, date: &str, time: &str) {
        *self.0.lock().unwrap() = TodayClockView {
            date: date.into(),
            time: time.into(),
        };
    }
}

impl TodayClock for MutableClock {
    fn current_date(&self) -> String {
        self.0.lock().unwrap().date.clone()
    }

    fn current_time_label(&self) -> String {
        self.0.lock().unwrap().time.clone()
    }

    fn current_timestamp_label(&self) -> String {
        let clock = self.0.lock().unwrap();
        format!("{}T{}-04:00", clock.date, clock.time)
    }
}

fn task_app(vault: &Path) -> TaskApplication<SelectedVault, FixedClock> {
    TaskApplication::new(
        SelectedVault(vault.to_path_buf()),
        FixedClock,
        FileTaskStore,
    )
}

fn today_app(vault: &Path) -> TodayApplication<SelectedVault, NoSelection, FixedClock> {
    TodayApplication::with_stores(
        SelectedVault(vault.to_path_buf()),
        NoSelection,
        FixedClock,
        FileTodayRecordStore,
        FileHabitSnapshotStore,
    )
}

fn create_task<C: TodayClock>(
    application: &TaskApplication<SelectedVault, C>,
    opened: &TasksView,
    task_id: &str,
    name: &str,
    date: Option<&str>,
    time: Option<&str>,
    list_id: Option<&str>,
) -> TasksView {
    application
        .create(TaskCreateInput {
            parent_id: None,
            tag_ids: Vec::new(),
            priority: personal_dashboard_lib::tasks::TaskPriority::None,
            execution_end: None,
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone(),
            task_id: task_id.into(),
            name: name.into(),
            content: None,
            date: date.map(str::to_owned),
            time: time.map(str::to_owned),
            list_id: list_id.map(str::to_owned),
        })
        .unwrap()
}

fn task_in_today<'a>(today: &'a TodayView, task_id: &str) -> &'a TaskView {
    today
        .tasks
        .tasks
        .iter()
        .find(|task| task.id == task_id)
        .unwrap()
}

#[test]
fn today_reads_shared_tasks_with_date_and_archive_semantics_without_legacy_plan_writes() {
    let vault = TempVault::new("read-shared");
    let tasks = task_app(vault.path());
    let mut opened = tasks.read().unwrap();

    opened = tasks
        .create_list(TaskListCreateInput {
            folder_id: None,
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone(),
            list_id: "work".into(),
            name: "工作".into(),
        })
        .unwrap();
    opened = create_task(
        &tasks,
        &opened,
        "overdue-date-only",
        "逾期日期任务",
        Some("2026-09-16"),
        None,
        Some("work"),
    );
    opened = create_task(
        &tasks,
        &opened,
        "past-time-timed",
        "已过设定时刻任务",
        Some("2026-09-17"),
        Some("13:00"),
        Some("inbox"),
    );
    opened = create_task(
        &tasks,
        &opened,
        "today-date-only",
        "今天日期任务",
        Some("2026-09-17"),
        None,
        Some("inbox"),
    );
    opened = create_task(
        &tasks,
        &opened,
        "today-time-boundary",
        "当前时刻任务",
        Some("2026-09-17"),
        Some("17:05"),
        Some("inbox"),
    );
    opened = create_task(
        &tasks,
        &opened,
        "future-task",
        "未来任务",
        Some("2026-09-18"),
        None,
        Some("inbox"),
    );
    opened = create_task(
        &tasks,
        &opened,
        "undated-task",
        "未安排任务",
        None,
        None,
        Some("inbox"),
    );
    opened = create_task(
        &tasks,
        &opened,
        "completed-task",
        "已完成任务",
        Some("2026-09-17"),
        Some("17:00"),
        Some("inbox"),
    );
    opened = tasks
        .set_state(TaskStateInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone().unwrap(),
            task_id: "completed-task".into(),
            change_id: "complete-shared-task".into(),
            state: TaskState::Completed,
        })
        .unwrap();
    opened = create_task(
        &tasks,
        &opened,
        "abandoned-task",
        "已放弃任务",
        Some("2026-09-17"),
        None,
        Some("inbox"),
    );
    opened = tasks
        .set_state(TaskStateInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone().unwrap(),
            task_id: "abandoned-task".into(),
            change_id: "abandon-shared-task".into(),
            state: TaskState::Abandoned,
        })
        .unwrap();
    opened = tasks
        .create_list(TaskListCreateInput {
            folder_id: None,
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone(),
            list_id: "dormant".into(),
            name: "休眠工作".into(),
        })
        .unwrap();
    opened = create_task(
        &tasks,
        &opened,
        "archived-task",
        "归档任务",
        Some("2026-09-17"),
        None,
        Some("dormant"),
    );
    let archived = tasks
        .archive_list(TaskListArchiveInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone().unwrap(),
            list_id: "dormant".into(),
        })
        .unwrap();

    let legacy_plan = vault
        .path()
        .join("life/.personal-dashboard/day-task-plans/v1/2026/2026-09-17.json");
    fs::create_dir_all(legacy_plan.parent().unwrap()).unwrap();
    fs::write(
        &legacy_plan,
        r#"{"schemaVersion":1,"date":"2026-09-17","candidates":[{"kind":"action","taskId":"legacy-plan-task","sourceReference":"legacy-source","text":"旧流程候选"}]}"#,
    )
    .unwrap();

    let today = today_app(vault.path()).read().unwrap();
    assert_eq!(today.tasks.target_binding, archived.target_binding);
    assert_eq!(today.tasks.current_date.as_deref(), Some("2026-09-17"));
    assert_eq!(today.tasks.tasks.len(), 9);
    assert!(
        today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "overdue-date-only")
            .unwrap()
            .overdue
    );
    assert!(
        !today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "overdue-date-only")
            .unwrap()
            .time_passed
    );
    assert!(
        !today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "today-date-only")
            .unwrap()
            .overdue
    );
    assert!(
        !today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "today-date-only")
            .unwrap()
            .time_passed
    );
    assert!(
        !today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "today-time-boundary")
            .unwrap()
            .overdue
    );
    assert!(
        !today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "today-time-boundary")
            .unwrap()
            .time_passed,
        "the exact scheduled minute is not past"
    );
    assert!(
        today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "past-time-timed")
            .unwrap()
            .time_passed
    );
    assert!(
        !today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "past-time-timed")
            .unwrap()
            .overdue,
        "a same-day scheduled time does not make the task overdue"
    );
    assert!(
        !today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "future-task")
            .unwrap()
            .overdue
    );
    assert!(
        !today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "undated-task")
            .unwrap()
            .overdue
    );
    assert!(
        !today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "completed-task")
            .unwrap()
            .overdue
    );
    assert!(
        !today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "completed-task")
            .unwrap()
            .time_passed,
        "completion remains a separate state from the scheduled time"
    );
    assert!(
        !today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "abandoned-task")
            .unwrap()
            .overdue
    );
    assert!(
        !today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "archived-task")
            .unwrap()
            .overdue
    );
    assert!(today.day_tasks.tasks.is_empty());
    assert!(!vault
        .path()
        .join("life/.personal-dashboard/day-tasks/v1/2026/2026-09-17.json")
        .exists());
    let daily_record = vault
        .path()
        .join("life/Journal/Daily/2026/2026-09/2026-09-17.md");
    assert!(
        !daily_record.exists(),
        "reading Tasks must not create a Daily Record"
    );

    let reopened = tasks
        .set_state(TaskStateInput {
            target_binding: archived.target_binding.clone().unwrap(),
            expected_revision: archived.revision.clone().unwrap(),
            task_id: "completed-task".into(),
            change_id: "reopen-scheduled-task".into(),
            state: TaskState::Pending,
        })
        .unwrap();
    let reopened_today = today_app(vault.path()).read().unwrap();
    let reopened_task = reopened_today
        .tasks
        .tasks
        .iter()
        .find(|task| task.id == "completed-task")
        .unwrap();
    assert_eq!(
        reopened_task.id,
        reopened
            .tasks
            .iter()
            .find(|task| task.id == "completed-task")
            .unwrap()
            .id
    );
    assert_eq!(reopened_task.state, TaskState::Pending);
    assert_eq!(reopened_task.date.as_deref(), Some("2026-09-17"));
    assert_eq!(reopened_task.time.as_deref(), Some("17:00"));
    assert!(reopened_task.time_passed);
    assert!(!reopened_task.overdue);
    assert!(
        !daily_record.exists(),
        "completing and reopening a Task must not write facts"
    );

    let rescheduled = tasks
        .update(TaskUpdateInput {
            parent_id: None,
            tag_ids: None,
            priority: None,
            execution_end: None,
            target_binding: reopened.target_binding.clone().unwrap(),
            expected_revision: reopened.revision.clone().unwrap(),
            task_id: "completed-task".into(),
            change_id: "reschedule-shared-task".into(),
            name: "改期后的共享任务".into(),
            content: None,
            date: Some("2026-09-17".into()),
            time: Some("17:30".into()),
            list_id: Some("inbox".into()),
        })
        .unwrap();
    let rescheduled_today = today_app(vault.path()).read().unwrap();
    let rescheduled_task = rescheduled_today
        .tasks
        .tasks
        .iter()
        .find(|task| task.id == "completed-task")
        .unwrap();
    assert_eq!(rescheduled_task.id, "completed-task");
    assert_eq!(
        rescheduled_task.name, "改期后的共享任务",
        "the Today read returns the updated source entry"
    );
    assert_eq!(rescheduled_task.date.as_deref(), Some("2026-09-17"));
    assert_eq!(rescheduled_task.time.as_deref(), Some("17:30"));
    assert!(!rescheduled_task.time_passed);
    assert!(!rescheduled_task.overdue);
    assert_eq!(
        rescheduled
            .tasks
            .iter()
            .find(|task| task.id == "completed-task")
            .unwrap()
            .id,
        rescheduled_task.id
    );
    assert!(
        !daily_record.exists(),
        "rescheduling a Task must not write facts"
    );
}

#[test]
fn today_and_tasks_keep_one_identity_after_a_task_state_change_and_old_day_file_is_read_only() {
    let vault = TempVault::new("shared-identity");
    let tasks = task_app(vault.path());
    let opened = tasks.read().unwrap();
    let created = create_task(
        &tasks,
        &opened,
        "shared-task",
        "共享任务",
        Some("2026-09-17"),
        None,
        None,
    );

    let legacy_path = vault
        .path()
        .join("life/.personal-dashboard/day-tasks/v1/2026/2026-09-17.json");
    fs::create_dir_all(legacy_path.parent().unwrap()).unwrap();
    fs::write(
        &legacy_path,
        r#"{"schemaVersion":1,"date":"2026-09-17","tasks":[{"id":"legacy-history","text":"保留旧历史","source":{"kind":"manual","reference":null},"createdAt":"2026-09-17T08:00-04:00","modifiedAt":"2026-09-17T08:00-04:00","completedAt":null,"deletedAt":null,"changes":[]}]}"#,
    )
    .unwrap();
    let before = fs::read(&legacy_path).unwrap();

    let today = today_app(vault.path()).read().unwrap();
    assert_eq!(today.tasks.tasks[0].id, "shared-task");
    assert_eq!(today.day_tasks.tasks[0].id, "legacy-history");
    assert_eq!(fs::read(&legacy_path).unwrap(), before);

    let completed = tasks
        .set_state(TaskStateInput {
            target_binding: created.target_binding.clone().unwrap(),
            expected_revision: created.revision.clone().unwrap(),
            task_id: "shared-task".into(),
            change_id: "complete-from-shared-surface".into(),
            state: TaskState::Completed,
        })
        .unwrap();
    let refreshed_today = today_app(vault.path()).read().unwrap();
    assert_eq!(refreshed_today.tasks.tasks[0].id, completed.tasks[0].id);
    assert_eq!(refreshed_today.tasks.tasks[0].state, TaskState::Completed);
    assert_eq!(refreshed_today.tasks.tasks[0].changes.len(), 1);
    assert_eq!(refreshed_today.day_tasks.tasks[0].id, "legacy-history");
    assert_eq!(fs::read(&legacy_path).unwrap(), before);
}

#[test]
fn today_reloads_one_shared_task_after_schedule_lifecycle_and_midnight_changes() {
    let vault = TempVault::new("task-axis-lifecycle");
    let clock = MutableClock::new("2026-09-17", "17:05");
    let tasks = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        clock.clone(),
        FileTaskStore,
    );
    let today = TodayApplication::with_stores(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        clock.clone(),
        FileTodayRecordStore,
        FileHabitSnapshotStore,
    );
    let mut opened = tasks.read().unwrap();
    opened = tasks
        .create_list(TaskListCreateInput {
            folder_id: None,
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone(),
            list_id: "work".into(),
            name: "工作".into(),
        })
        .unwrap();
    opened = create_task(
        &tasks,
        &opened,
        "shared-task",
        "续约确认",
        Some("2026-09-17"),
        Some("17:30"),
        Some("work"),
    );
    opened = create_task(
        &tasks,
        &opened,
        "prior-day-task",
        "前一天任务",
        Some("2026-09-17"),
        Some("17:30"),
        Some("inbox"),
    );
    let initial_today = today.read().unwrap();
    assert_eq!(
        initial_today.tasks.current_date.as_deref(),
        Some("2026-09-17")
    );
    assert_eq!(
        task_in_today(&initial_today, "shared-task").id,
        "shared-task"
    );
    assert_eq!(initial_today.tasks.tasks.len(), 2);

    clock.set("2026-09-17", "17:06");
    let moved = tasks
        .update(TaskUpdateInput {
            parent_id: None,
            tag_ids: None,
            priority: None,
            execution_end: None,
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone().unwrap(),
            task_id: "shared-task".into(),
            change_id: "move-shared-task-date".into(),
            name: "改期后的续约确认".into(),
            content: None,
            date: Some("2026-09-18".into()),
            time: Some("09:00".into()),
            list_id: Some("work".into()),
        })
        .unwrap();
    let moved_today = today.read().unwrap();
    let moved_task = task_in_today(&moved_today, "shared-task");
    assert_eq!(moved_task.id, "shared-task");
    assert_eq!(moved_task.name, "改期后的续约确认");
    assert_eq!(moved_task.date.as_deref(), Some("2026-09-18"));
    assert_eq!(moved_task.time.as_deref(), Some("09:00"));
    assert_eq!(
        moved_today
            .tasks
            .tasks
            .iter()
            .filter(|task| task.id == "shared-task")
            .count(),
        1
    );

    clock.set("2026-09-17", "17:07");
    opened = tasks
        .update(TaskUpdateInput {
            parent_id: None,
            tag_ids: None,
            priority: None,
            execution_end: None,
            target_binding: moved.target_binding.clone().unwrap(),
            expected_revision: moved.revision.clone().unwrap(),
            task_id: "shared-task".into(),
            change_id: "return-shared-task-to-today".into(),
            name: "改期后的续约确认".into(),
            content: None,
            date: Some("2026-09-17".into()),
            time: Some("17:30".into()),
            list_id: Some("work".into()),
        })
        .unwrap();
    let restored_date_today = today.read().unwrap();
    assert_eq!(
        task_in_today(&restored_date_today, "shared-task").id,
        "shared-task"
    );
    assert_eq!(
        task_in_today(&restored_date_today, "shared-task")
            .date
            .as_deref(),
        Some("2026-09-17")
    );
    assert_eq!(
        task_in_today(&restored_date_today, "shared-task")
            .time
            .as_deref(),
        Some("17:30")
    );

    clock.set("2026-09-17", "17:08");
    opened = tasks
        .archive_list(TaskListArchiveInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone().unwrap(),
            list_id: "work".into(),
        })
        .unwrap();
    let archived_today = today.read().unwrap();
    assert!(
        archived_today
            .tasks
            .lists
            .iter()
            .find(|list| list.id == "work")
            .unwrap()
            .archived
    );
    assert_eq!(
        task_in_today(&archived_today, "shared-task").id,
        "shared-task"
    );

    clock.set("2026-09-17", "17:09");
    opened = tasks
        .restore_list(TaskListRestoreInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone().unwrap(),
            list_id: "work".into(),
        })
        .unwrap();
    let active_list_today = today.read().unwrap();
    assert!(
        !active_list_today
            .tasks
            .lists
            .iter()
            .find(|list| list.id == "work")
            .unwrap()
            .archived
    );
    assert_eq!(
        task_in_today(&active_list_today, "shared-task").id,
        "shared-task"
    );

    clock.set("2026-09-17", "17:10");
    opened = tasks
        .set_state(TaskStateInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone().unwrap(),
            task_id: "shared-task".into(),
            change_id: "abandon-shared-task".into(),
            state: TaskState::Abandoned,
        })
        .unwrap();
    let abandoned_today = today.read().unwrap();
    assert_eq!(
        task_in_today(&abandoned_today, "shared-task").state,
        TaskState::Abandoned
    );
    assert_eq!(
        task_in_today(&abandoned_today, "shared-task").id,
        "shared-task"
    );

    clock.set("2026-09-17", "17:11");
    opened = tasks
        .set_state(TaskStateInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone().unwrap(),
            task_id: "shared-task".into(),
            change_id: "reopen-abandoned-shared-task".into(),
            state: TaskState::Pending,
        })
        .unwrap();
    let pending_today = today.read().unwrap();
    assert_eq!(
        task_in_today(&pending_today, "shared-task").state,
        TaskState::Pending
    );
    assert_eq!(
        task_in_today(&pending_today, "shared-task").id,
        "shared-task"
    );

    clock.set("2026-09-17", "17:12");
    opened = tasks
        .delete(TaskDeleteInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone().unwrap(),
            task_id: "shared-task".into(),
            change_id: "delete-shared-task".into(),
        })
        .unwrap();
    let deleted_today = today.read().unwrap();
    assert!(task_in_today(&deleted_today, "shared-task")
        .deleted_at
        .is_some());
    assert_eq!(
        task_in_today(&deleted_today, "shared-task").id,
        "shared-task"
    );

    clock.set("2026-09-17", "17:13");
    let restored = tasks
        .restore(TaskRestoreInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone().unwrap(),
            task_id: "shared-task".into(),
            change_id: "restore-shared-task".into(),
        })
        .unwrap();
    assert_eq!(
        restored
            .tasks
            .iter()
            .filter(|task| task.id == "shared-task")
            .count(),
        1
    );
    let restored_today = today.read().unwrap();
    assert!(task_in_today(&restored_today, "shared-task")
        .deleted_at
        .is_none());
    assert_eq!(
        task_in_today(&restored_today, "shared-task").id,
        "shared-task"
    );
    assert_eq!(
        restored_today
            .tasks
            .tasks
            .iter()
            .filter(|task| task.id == "shared-task")
            .count(),
        1
    );

    clock.set("2026-09-18", "00:05");
    let midnight_today = today.read().unwrap();
    assert_eq!(
        midnight_today.tasks.current_date.as_deref(),
        Some("2026-09-18")
    );
    let moved_task = task_in_today(&midnight_today, "shared-task");
    assert_eq!(moved_task.id, "shared-task");
    assert_eq!(moved_task.date.as_deref(), Some("2026-09-17"));
    assert!(moved_task.overdue);
    assert!(!moved_task.time_passed);
    let prior_day_task = task_in_today(&midnight_today, "prior-day-task");
    assert!(prior_day_task.overdue);
    assert!(!prior_day_task.time_passed);
    assert_eq!(midnight_today.tasks.tasks.len(), 2);
    assert!(!vault
        .path()
        .join("life/Journal/Daily/2026/2026-09/2026-09-17.md")
        .exists());
    assert!(
        !vault
            .path()
            .join("life/Journal/Daily/2026/2026-09/2026-09-18.md")
            .exists(),
        "cross-midnight Task reads must not create a Daily Record"
    );
}

#[test]
fn planned_task_interval_survives_restart_shared_views_and_legacy_update() {
    let vault = TempVault::new("planned-interval");
    let app = task_app(vault.path());
    let opened = app.read().unwrap();
    let create: TaskCreateInput = serde_json::from_value(serde_json::json!({
        "targetBinding": opened.target_binding, "expectedRevision": opened.revision,
        "taskId": "interval-task", "name": "Synthetic overnight task", "content": null,
        "date": "2026-09-17", "time": "23:30", "listId": "inbox",
        "executionEnd": {"date": "2026-09-18", "time": "00:30"}
    })).unwrap();
    let saved = app.create(create.clone()).unwrap();
    let duplicate = app.create(create).unwrap();
    assert_eq!(duplicate.tasks.len(), 1);
    assert_eq!(duplicate.revision, saved.revision);
    let end = serde_json::json!({"date": "2026-09-18", "time": "00:30"});
    assert_eq!(serde_json::to_value(&saved.tasks[0]).unwrap()["executionEnd"], end);
    let legacy: TaskUpdateInput = serde_json::from_value(serde_json::json!({
        "targetBinding": saved.target_binding, "expectedRevision": saved.revision,
        "taskId": "interval-task", "changeId": "legacy-content-edit", "name": "Updated synthetic task",
        "content": "Old caller still works", "date": "2026-09-17", "time": "23:30", "listId": "inbox"
    })).unwrap();
    let edited = app.update(legacy).unwrap();
    let listed = app.create_list(TaskListCreateInput {
            folder_id: None,
        target_binding: edited.target_binding.unwrap(), expected_revision: edited.revision,
        list_id: "interval-list".into(), name: "Synthetic interval list".into(),
    }).unwrap();
    let moved: TaskUpdateInput = serde_json::from_value(serde_json::json!({
        "targetBinding": listed.target_binding, "expectedRevision": listed.revision,
        "taskId": "interval-task", "changeId": "legacy-list-move", "name": "Updated synthetic task",
        "content": "Old caller still works", "date": "2026-09-17", "time": "23:30", "listId": "interval-list"
    })).unwrap();
    app.update(moved).unwrap();
    let reopened = task_app(vault.path()).read().unwrap();
    assert_eq!(reopened.tasks[0].list_id, "interval-list");
    assert_eq!(serde_json::to_value(&reopened.tasks[0]).unwrap()["executionEnd"], end);
    let today = today_app(vault.path()).read_date("2026-09-17").unwrap();
    assert_eq!(today.tasks.tasks[0].id, "interval-task");
    assert_eq!(serde_json::to_value(&today.tasks.tasks[0]).unwrap()["executionEnd"], end);
    let completed = app.set_state(TaskStateInput {
        target_binding: reopened.target_binding.unwrap(), expected_revision: reopened.revision.unwrap(),
        task_id: "interval-task".into(), change_id: "interval-complete".into(), state: TaskState::Completed,
    }).unwrap();
    let pending = app.set_state(TaskStateInput {
        target_binding: completed.target_binding.unwrap(), expected_revision: completed.revision.unwrap(),
        task_id: "interval-task".into(), change_id: "interval-reopen".into(), state: TaskState::Pending,
    }).unwrap();
    assert_eq!(serde_json::to_value(&pending.tasks[0]).unwrap()["executionEnd"], end);
    assert_eq!(pending.tasks[0].date.as_deref(), Some("2026-09-17"));
}

#[test]
fn task_interval_changes_reject_invalid_ranges_and_clear_only_on_explicit_null() {
    let vault = TempVault::new("interval-edit");
    let app = task_app(vault.path());
    let opened = app.read().unwrap();
    let saved = app.create(serde_json::from_value(serde_json::json!({
        "targetBinding": opened.target_binding, "taskId": "interval-edit", "name": "Synthetic", "date": "2026-09-17", "time": "08:00",
        "executionEnd": {"date": "2026-09-17", "time": "10:00"}
    })).unwrap()).unwrap();
    let update = serde_json::json!({"targetBinding":saved.target_binding, "expectedRevision":saved.revision,
        "taskId":"interval-edit", "changeId":"invalid-range", "name":"Synthetic", "date":"2026-09-17", "time":"11:00",
        "executionEnd":{"date":"2026-09-17","time":"10:00"}});
    assert!(app.update(serde_json::from_value(update).unwrap()).is_err());
    assert_eq!(app.read().unwrap(), saved, "invalid input never writes a truncated or flipped interval");
    let moved = serde_json::json!({"targetBinding":saved.target_binding, "expectedRevision":saved.revision,
        "taskId":"interval-edit", "changeId":"move-range", "name":"Synthetic", "date":"2026-09-17", "time":"10:00",
        "executionEnd":{"date":"2026-09-17","time":"12:00"}});
    let moved_input: TaskUpdateInput = serde_json::from_value(moved).unwrap();
    let moved = app.update(moved_input.clone()).unwrap();
    assert_eq!(app.update(moved_input).unwrap().revision, moved.revision);
    assert_eq!(serde_json::to_value(&moved.tasks[0].changes[0]).unwrap()["previousExecutionEnd"], serde_json::json!({"date":"2026-09-17","time":"10:00"}));
    let edited = app.update(serde_json::from_value(serde_json::json!({"targetBinding":moved.target_binding, "expectedRevision":moved.revision,
        "taskId":"interval-edit", "changeId":"edit-end", "name":"Synthetic", "date":"2026-09-17", "time":"10:00",
        "executionEnd":{"date":"2026-09-17","time":"12:45"}})).unwrap()).unwrap();
    assert_eq!(serde_json::to_value(&edited.tasks[0]).unwrap()["executionEnd"]["time"], "12:45");
    let cleared = app.update(serde_json::from_value(serde_json::json!({"targetBinding":edited.target_binding, "expectedRevision":edited.revision,
        "taskId":"interval-edit", "changeId":"clear-range", "name":"Synthetic", "date":"2026-09-17", "time":"10:00", "executionEnd":null})).unwrap()).unwrap();
    assert!(serde_json::to_value(&task_app(vault.path()).read().unwrap().tasks[0]).unwrap()["executionEnd"].is_null());
    assert_eq!(cleared.tasks[0].time.as_deref(), Some("10:00"));
    assert_eq!(cleared.tasks[0].state, TaskState::Pending);
}

#[test]
fn legacy_task_time_modes_never_gain_a_fabricated_execution_end() {
    let vault = TempVault::new("legacy-interval-modes");
    let app = task_app(vault.path());
    let mut opened = app.read().unwrap();
    for (id, date, time) in [("undated", None, None), ("date-only", Some("2026-09-17"), None), ("point", Some("2026-09-17"), Some("09:30"))] {
        opened = create_task(&app, &opened, id, "Synthetic legacy Task", date, time, None);
    }
    let restarted = task_app(vault.path()).read().unwrap();
    assert_eq!(restarted.tasks.len(), 3);
    assert!(restarted.tasks.iter().all(|task| task.execution_end.is_none()));
    assert_eq!(restarted.tasks[0].date, None);
    assert_eq!(restarted.tasks[1].date.as_deref(), Some("2026-09-17"));
    assert_eq!(restarted.tasks[1].time, None);
    assert_eq!(restarted.tasks[2].time.as_deref(), Some("09:30"));
    let orphan = serde_json::from_value(serde_json::json!({"targetBinding": restarted.target_binding, "expectedRevision": restarted.revision,
        "taskId":"orphan-time", "name":"Synthetic invalid time", "date":null,"time":"09:30"})).unwrap();
    assert!(app.create(orphan).is_err());
    assert_eq!(app.read().unwrap().tasks.len(), 3);
}

#[test]
fn timeline_task_payloads_keep_natural_calendar_dates_and_never_change_the_daily_record() {
    let vault = TempVault::new("timeline-create-move");
    let app = task_app(vault.path());
    let before = today_app(vault.path()).read_date("2026-09-17").unwrap();
    let opened = app.read().unwrap();
    let create: TaskCreateInput = serde_json::from_value(serde_json::json!({
        "targetBinding": opened.target_binding, "expectedRevision": opened.revision, "taskId":"axis-selected-task", "name":"Synthetic selected interval",
        "date":"2026-09-17", "time":"23:45", "executionEnd":{"date":"2026-09-18","time":"00:15"}
    })).unwrap();
    let created = app.create(create.clone()).unwrap();
    assert_eq!(app.create(create).unwrap().tasks.len(), 1);
    let movement: TaskUpdateInput = serde_json::from_value(serde_json::json!({
        "targetBinding": created.target_binding, "expectedRevision":created.revision,
        "taskId":"axis-selected-task","changeId":"axis-move-selected","name":"Synthetic selected interval",
        "date":"2026-09-18","time":"01:15","executionEnd":{"date":"2026-09-18","time":"01:45"}
    })).unwrap();
    let moved = app.update(movement.clone()).unwrap();
    assert_eq!(app.update(movement).unwrap().revision, moved.revision);
    let reopened = task_app(vault.path()).read().unwrap();
    assert_eq!(reopened.tasks[0].id, "axis-selected-task");
    assert_eq!(reopened.tasks[0].date.as_deref(), Some("2026-09-18"));
    assert_eq!(reopened.tasks[0].time.as_deref(), Some("01:15"));
    assert_eq!(reopened.tasks[0].execution_end.as_ref().unwrap().time, "01:45");
    let after = today_app(vault.path()).read_date("2026-09-17").unwrap();
    assert_eq!(after.tasks.tasks[0], reopened.tasks[0]);
    assert_eq!(after.baseline, before.baseline);
    assert_eq!(after.time_axis, before.time_axis);
    assert_eq!(after.daily_record_availability, before.daily_record_availability);
    let calendar = today_app(vault.path()).calendar_month(2026, 9).unwrap();
    assert!(calendar.day("2026-09-17").unwrap().task_summaries.is_empty());
    assert_eq!(calendar.day("2026-09-18").unwrap().task_summaries[0].id, "axis-selected-task");
    let stale: TaskUpdateInput = serde_json::from_value(serde_json::json!({
        "targetBinding": reopened.target_binding, "expectedRevision":"stale-source-revision",
        "taskId":"axis-selected-task","changeId":"axis-conflicted-move","name":"Synthetic selected interval",
        "date":"2026-09-18","time":"02:00","executionEnd":{"date":"2026-09-18","time":"02:30"}
    })).unwrap();
    assert!(app.update(stale).is_err());
    assert_eq!(app.read().unwrap(), reopened);
}

#[test]
fn cancelling_time_arrangement_keeps_same_dated_task_in_today_and_calendar() {
    let vault=TempVault::new("cancel-time");
    let application=task_app(vault.path());
    let opened=application.read().unwrap();
    let saved=application.create(serde_json::from_value(serde_json::json!({"targetBinding":opened.target_binding,"expectedRevision":opened.revision,"taskId":"cancel-timed","name":"Synthetic dated task","date":"2026-09-17","time":"18:00","executionEnd":{"date":"2026-09-17","time":"18:45"},"priority":"medium"})).unwrap()).unwrap();
    let before=today_app(vault.path()).read_date("2026-09-17").unwrap();
    application.update(serde_json::from_value(serde_json::json!({"targetBinding":saved.target_binding,"expectedRevision":saved.revision,"taskId":"cancel-timed","changeId":"cancel-time-arrangement","name":"Synthetic dated task","date":"2026-09-17","time":null,"executionEnd":null})).unwrap()).unwrap();
    let reopened=task_app(vault.path()).read().unwrap();
    assert_eq!(reopened.tasks[0].id,"cancel-timed");
    assert_eq!(reopened.tasks[0].date.as_deref(),Some("2026-09-17"));
    assert_eq!(reopened.tasks[0].time,None);
    assert_eq!(reopened.tasks[0].execution_end,None);
    assert_eq!(serde_json::to_value(&reopened.tasks[0]).unwrap()["priority"],"medium");
    let today=today_app(vault.path()).read_date("2026-09-17").unwrap();
    assert_eq!(today.tasks.tasks[0],reopened.tasks[0]);
    assert_eq!(today.baseline,before.baseline);
    assert_eq!(today.daily_record_availability,before.daily_record_availability);
    let calendar=today_app(vault.path()).calendar_month(2026,9).unwrap();
    assert_eq!(calendar.day("2026-09-17").unwrap().task_summaries[0].id,"cancel-timed");
}

#[test]
fn refined_task_relations_groups_properties_and_date_views_survive_combined_writes() {
    let vault = TempVault::new("refinement-combination");
    let app = task_app(vault.path());
    let mut view = app.read().unwrap();
    view = app.manage_folder(serde_json::from_value(serde_json::json!({"targetBinding":view.target_binding,"expectedRevision":view.revision,"folderId":"projects","changeId":"group-create","action":"create","name":"Projects"})).unwrap()).unwrap();
    view = app.create_list(serde_json::from_value(serde_json::json!({"targetBinding":view.target_binding,"expectedRevision":view.revision,"listId":"work","name":"Work","folderId":"projects"})).unwrap()).unwrap();
    view = app.manage_tag(serde_json::from_value(serde_json::json!({"targetBinding":view.target_binding,"expectedRevision":view.revision,"tagId":"review","changeId":"tag-create","action":"create","name":"Review"})).unwrap()).unwrap();
    view = app.create(serde_json::from_value(serde_json::json!({"targetBinding":view.target_binding,"expectedRevision":view.revision,"taskId":"parent","name":"Other-date parent","date":"2026-09-18"})).unwrap()).unwrap();
    view = app.create(serde_json::from_value(serde_json::json!({"targetBinding":view.target_binding,"expectedRevision":view.revision,"taskId":"child","name":"Independent child","date":"2026-09-17","time":"18:00","executionEnd":{"date":"2026-09-17","time":"18:45"},"parentId":"parent","listId":"work","priority":"high","tagIds":["review"]})).unwrap()).unwrap();
    let before = today_app(vault.path()).read_date("2026-09-17").unwrap();
    let calendar = today_app(vault.path()).calendar_month(2026, 9).unwrap();
    assert_eq!(calendar.day("2026-09-17").unwrap().task_summaries[0].id,"child");
    assert_eq!(calendar.day("2026-09-18").unwrap().task_summaries[0].id,"parent");
    assert_eq!(before.tasks.lists.iter().find(|list|list.id=="work").unwrap().folder_id.as_deref(),Some("projects"));
    let cancellation = serde_json::json!({"targetBinding":view.target_binding,"expectedRevision":view.revision,"taskId":"child","changeId":"cancel-child-time","name":"Independent child","date":"2026-09-17","time":null,"executionEnd":null});
    view = app.update(serde_json::from_value(cancellation.clone()).unwrap()).unwrap();
    view = app.delete(serde_json::from_value(serde_json::json!({"targetBinding":view.target_binding,"expectedRevision":view.revision,"taskId":"parent","changeId":"delete-parent"})).unwrap()).unwrap();
    let child = view.tasks.iter().find(|task|task.id=="child").unwrap().clone();
    assert_eq!(child.parent_id.as_deref(),Some("parent"));
    assert_eq!(child.list_id,"work");
    assert_eq!(child.tag_ids,vec!["review"]);
    assert_eq!(serde_json::to_value(&child).unwrap()["priority"],"high");
    assert_eq!(child.time,None);assert_eq!(child.execution_end,None);assert_eq!(child.state,TaskState::Pending);
    view = app.manage_folder(serde_json::from_value(serde_json::json!({"targetBinding":view.target_binding,"expectedRevision":view.revision,"folderId":"projects","changeId":"group-delete","action":"delete"})).unwrap()).unwrap();
    assert_eq!(view.tasks.iter().find(|task|task.id=="child").unwrap(),&child);
    view = app.restore(serde_json::from_value(serde_json::json!({"targetBinding":view.target_binding,"expectedRevision":view.revision,"taskId":"parent","changeId":"restore-parent"})).unwrap()).unwrap();
    // An uncertain original cancellation retry after unrelated writes never reapplies it.
    assert_eq!(app.update(serde_json::from_value(cancellation).unwrap()).unwrap().revision,view.revision);
    let reopened = task_app(vault.path()).read().unwrap();
    assert_eq!(reopened,view);assert!(reopened.folders.is_empty());
    assert_eq!(reopened.lists.iter().find(|list|list.id=="work").unwrap().folder_id,None);
    let today = today_app(vault.path()).read_date("2026-09-17").unwrap();
    assert_eq!(task_in_today(&today,"child"),&child);
    assert_eq!(today.baseline,before.baseline);assert_eq!(today.time_axis,before.time_axis);
    assert_eq!(today.daily_record_availability,before.daily_record_availability);
    let calendar = today_app(vault.path()).calendar_month(2026,9).unwrap();
    assert_eq!(calendar.day("2026-09-17").unwrap().task_summaries[0].id,"child");
    assert_eq!(calendar.day("2026-09-18").unwrap().task_summaries[0].id,"parent");
}
