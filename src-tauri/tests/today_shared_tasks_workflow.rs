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
