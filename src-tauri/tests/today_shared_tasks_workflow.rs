use personal_dashboard_lib::habits::FileHabitSnapshotStore;
use personal_dashboard_lib::tasks::{
    FileTaskStore, TaskApplication, TaskCreateInput, TaskListArchiveInput, TaskListCreateInput,
    TaskState, TaskStateInput, TasksView,
};
use personal_dashboard_lib::today::{
    FileTodayRecordStore, TodayApplication, TodayClock, TodayWorkspaceExchange,
    TodayWorkspacePersistence,
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
        "14:10".into()
    }

    fn current_timestamp_label(&self) -> String {
        "2026-09-17T14:10-04:00".into()
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

fn create_task(
    application: &TaskApplication<SelectedVault, FixedClock>,
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
        "overdue-timed",
        "逾期时刻任务",
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
        Some("14:10"),
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
        Some("2026-09-16"),
        None,
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
            .find(|task| task.id == "today-date-only")
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
            .overdue
    );
    assert!(
        today
            .tasks
            .tasks
            .iter()
            .find(|task| task.id == "overdue-timed")
            .unwrap()
            .overdue
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
