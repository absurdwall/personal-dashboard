use personal_dashboard_lib::tasks::{
    FileTaskStore, TaskApplication, TaskCompletionCorrectionInput, TaskCreateInput,
    TaskListArchiveInput, TaskListCreateInput, TaskState, TaskStateInput, TasksView,
};
use personal_dashboard_lib::today::{
    DailyPhase, DailyRecordAvailability, TodayApplication, TodayClock, TodayState,
    TodayWorkspaceExchange, TodayWorkspacePersistence,
};
use std::cell::RefCell;
use std::fs;
use std::path::{Path, PathBuf};
use std::rc::Rc;
use std::time::{SystemTime, UNIX_EPOCH};

struct TempDirectory(PathBuf);

impl TempDirectory {
    fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after the epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "personal-dashboard-{label}-{}-{nonce}",
            std::process::id()
        ));
        fs::create_dir_all(&path).expect("temporary directory should be created");
        Self(path)
    }

    fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TempDirectory {
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

#[derive(Clone)]
struct MutableClock(Rc<RefCell<String>>);

impl TodayClock for MutableClock {
    fn current_date(&self) -> String {
        self.0.borrow().clone()
    }

    fn current_time_label(&self) -> String {
        "23:59".into()
    }

    fn current_timestamp_label(&self) -> String {
        format!("{}T23:59-04:00", self.current_date())
    }
}

fn record_path(vault: &Path, date: &str) -> PathBuf {
    let year = &date[..4];
    let month = &date[5..7];
    vault
        .join("life/Journal/Daily")
        .join(year)
        .join(format!("{year}-{month}"))
        .join(format!("{date}.md"))
}

fn write_record(vault: &Path, date: &str, body: &str) -> PathBuf {
    fs::create_dir_all(vault.join(".obsidian")).expect("synthetic Vault marker should be created");
    let path = record_path(vault, date);
    fs::create_dir_all(path.parent().expect("record parent should exist"))
        .expect("record directory should be created");
    fs::write(
        &path,
        format!("---\ntype: daily-record\ndate: {date}\n---\n# {date}\n\n{body}"),
    )
    .expect("daily record should be written");
    path
}

#[test]
fn explicit_date_refresh_stays_bound_to_the_selected_day_across_midnight() {
    let vault = TempDirectory::new("calendar-selected-date-midnight");
    let selected_path = write_record(
        vault.path(),
        "2026-09-08",
        "## 今天的大致安排\n\n- **下午：** 历史日期的当前安排。\n",
    );
    let original = fs::read(&selected_path).expect("selected record should be readable");
    let date = Rc::new(RefCell::new("2026-09-08".to_string()));
    let application = TodayApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        MutableClock(date.clone()),
    );

    let first = application
        .open_date("2026-09-08")
        .expect("selected date should open");
    *date.borrow_mut() = "2026-09-09".into();
    let refreshed = application
        .open_date("2026-09-08")
        .expect("selected date should remain stable after midnight");

    assert_eq!(first.state, TodayState::Ready);
    assert_eq!(refreshed.date, "2026-09-08");
    assert_eq!(refreshed.timeline[0].title, "历史日期的当前安排。");
    assert_eq!(
        fs::read(&selected_path).expect("selected record should remain readable"),
        original
    );
    assert!(!record_path(vault.path(), "2026-09-09").exists());
}

#[test]
fn selected_days_recommend_evening_only_when_a_review_exists() {
    let vault = TempDirectory::new("calendar-selected-date-default-phase");
    write_record(
        vault.path(),
        "2026-09-07",
        "## 今天的大致安排\n\n- **下午：** 已回顾的一天。\n\n## 晚间复盘\n\n### 今天发生了什么\n\n- 有明确记录。\n",
    );
    write_record(
        vault.path(),
        "2026-09-08",
        "## 今天的大致安排\n\n- **下午：** 尚未复盘的一天。\n\n## 白天更新\n\n### 14:10 — 有意义的事件\n\n- 观察事实：完成明确工作。\n",
    );
    let application = TodayApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        MutableClock(Rc::new(RefCell::new("2026-09-09".into()))),
    );

    let reviewed = application.open_date("2026-09-07").unwrap();
    let unreviewed = application.open_date("2026-09-08").unwrap();
    let today = application.open().unwrap();

    assert!(!reviewed.is_today);
    assert_eq!(reviewed.default_phase, DailyPhase::Evening);
    assert!(!unreviewed.is_today);
    assert_eq!(unreviewed.default_phase, DailyPhase::Daytime);
    assert!(today.is_today);
    assert_eq!(today.default_phase, DailyPhase::Morning);
}

#[test]
fn month_projection_is_bounded_to_real_dates_and_isolates_record_errors() {
    let vault = TempDirectory::new("calendar-month-projection");
    let reviewed_path = write_record(
        vault.path(),
        "2026-09-05",
        "## 今天的大致安排\n\n- **下午：** 有复盘。\n\n## 晚间复盘\n\n### 今天发生了什么\n\n- 明确记录。\n",
    );
    let unreviewed_path = write_record(
        vault.path(),
        "2026-09-07",
        "## 今天的大致安排\n\n- **下午：** 无复盘。\n",
    );
    let malformed_path = record_path(vault.path(), "2026-09-08");
    fs::create_dir_all(malformed_path.parent().unwrap()).unwrap();
    fs::write(&malformed_path, "not a daily record").unwrap();
    let before = [
        fs::read(&reviewed_path).unwrap(),
        fs::read(&unreviewed_path).unwrap(),
        fs::read(&malformed_path).unwrap(),
    ];
    let application = TodayApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        MutableClock(Rc::new(RefCell::new("2026-09-09".into()))),
    );

    let month = application
        .calendar_month(2026, 9)
        .expect("valid calendar month should load");

    assert_eq!(month.days.len(), 42);
    assert_eq!(month.days.first().unwrap().date, "2026-08-30");
    assert_eq!(month.days.last().unwrap().date, "2026-10-10");
    assert_eq!(
        month.day("2026-09-05").unwrap().availability,
        DailyRecordAvailability::Reviewed
    );
    assert_eq!(
        month.day("2026-09-07").unwrap().availability,
        DailyRecordAvailability::Unreviewed
    );
    assert_eq!(
        month.day("2026-09-08").unwrap().availability,
        DailyRecordAvailability::Error
    );
    assert_eq!(
        month.day("2026-09-09").unwrap().availability,
        DailyRecordAvailability::Missing
    );
    assert!(month.day("2026-09-09").unwrap().is_today);
    assert!(!month.day("2026-08-30").unwrap().in_month);
    assert!(month.day("2026-09-05").unwrap().in_month);
    assert_eq!(
        [
            fs::read(&reviewed_path).unwrap(),
            fs::read(&unreviewed_path).unwrap(),
            fs::read(&malformed_path).unwrap(),
        ],
        before
    );
}

#[test]
fn impossible_or_malformed_selected_dates_are_rejected_before_file_access() {
    let vault = TempDirectory::new("calendar-invalid-date");
    let application = TodayApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        MutableClock(Rc::new(RefCell::new("2026-09-09".into()))),
    );

    for date in ["2026-02-29", "2026-13-01", "2026-09-31", "../../secret"] {
        assert!(
            application.open_date(date).is_err(),
            "{date} should be rejected"
        );
    }
    assert!(fs::read_dir(vault.path()).unwrap().next().is_none());
}

fn create_task(
    application: &TaskApplication<SelectedVault, MutableClock, FileTaskStore>,
    view: TasksView,
    id: &str,
    name: &str,
    date: Option<&str>,
    list_id: Option<&str>,
) -> TasksView {
    application
        .create(TaskCreateInput {
            target_binding: view.target_binding.expect("task target should be bound"),
            expected_revision: view.revision,
            task_id: id.into(),
            name: name.into(),
            content: None,
            date: date.map(str::to_owned),
            time: None,
            list_id: list_id.map(str::to_owned),
        })
        .expect("synthetic task should be created")
}

#[test]
fn calendar_month_includes_bounded_task_summaries_and_archived_history() {
    let vault = TempDirectory::new("calendar-task-summary");
    fs::create_dir_all(vault.path().join(".obsidian")).expect("Vault marker should exist");
    fs::create_dir_all(vault.path().join("life/Journal/Daily"))
        .expect("Daily Record directory should exist");
    let clock = MutableClock(Rc::new(RefCell::new("2026-09-09".into())));
    let persistence = SelectedVault(vault.path().to_path_buf());
    let task_application = TaskApplication::new(persistence.clone(), clock.clone(), FileTaskStore);
    let mut tasks = task_application
        .read()
        .expect("task source should be empty");
    let binding = tasks
        .target_binding
        .clone()
        .expect("task target should exist");
    tasks = task_application
        .create_list(TaskListCreateInput {
            target_binding: binding,
            expected_revision: tasks.revision.clone(),
            list_id: "archive".into(),
            name: "Archived work".into(),
        })
        .expect("archive list should be created");
    tasks = create_task(
        &task_application,
        tasks,
        "alpha",
        "Alpha",
        Some("2026-09-05"),
        None,
    );
    tasks = create_task(
        &task_application,
        tasks,
        "beta",
        "Beta",
        Some("2026-09-05"),
        None,
    );
    tasks = create_task(
        &task_application,
        tasks,
        "gamma",
        "Gamma",
        Some("2026-09-05"),
        None,
    );
    tasks = create_task(
        &task_application,
        tasks,
        "late",
        "Late completion",
        Some("2026-09-05"),
        None,
    );
    tasks = create_task(
        &task_application,
        tasks,
        "archived",
        "Archived history",
        Some("2026-09-05"),
        Some("archive"),
    );
    tasks = create_task(
        &task_application,
        tasks,
        "future",
        "Future plan",
        Some("2026-09-25"),
        None,
    );
    tasks = create_task(
        &task_application,
        tasks,
        "undated",
        "Unscheduled",
        None,
        None,
    );
    tasks = create_task(
        &task_application,
        tasks,
        "abandoned",
        "Abandoned history",
        Some("2026-09-05"),
        None,
    );

    let late = tasks
        .tasks
        .iter()
        .find(|task| task.id == "late")
        .expect("late task should exist");
    tasks = task_application
        .set_state(TaskStateInput {
            target_binding: tasks.target_binding.clone().unwrap(),
            expected_revision: tasks.revision.clone().unwrap(),
            task_id: late.id.clone(),
            change_id: "complete-late".into(),
            state: TaskState::Completed,
        })
        .expect("late task should be completed");
    tasks = task_application
        .correct_completion(TaskCompletionCorrectionInput {
            target_binding: tasks.target_binding.clone().unwrap(),
            expected_revision: tasks.revision.clone().unwrap(),
            task_id: "late".into(),
            change_id: "correct-late".into(),
            completed_on: "2026-09-07".into(),
            completed_time: None,
        })
        .expect("late completion should be correctable without rescheduling");
    let abandoned = tasks
        .tasks
        .iter()
        .find(|task| task.id == "abandoned")
        .expect("abandoned task should exist");
    tasks = task_application
        .set_state(TaskStateInput {
            target_binding: tasks.target_binding.clone().unwrap(),
            expected_revision: tasks.revision.clone().unwrap(),
            task_id: abandoned.id.clone(),
            change_id: "abandon-history".into(),
            state: TaskState::Abandoned,
        })
        .expect("task should be abandoned");
    let _tasks = task_application
        .archive_list(TaskListArchiveInput {
            target_binding: tasks.target_binding.clone().unwrap(),
            expected_revision: tasks.revision.clone().unwrap(),
            list_id: "archive".into(),
        })
        .expect("archive list should be archived");

    let restarted = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        MutableClock(Rc::new(RefCell::new("2026-09-09".into()))),
        FileTaskStore,
    )
    .read()
    .expect("restarted task application should read the same source");
    assert!(restarted.tasks.iter().any(|task| {
        task.id == "archived" && task.list_id == "archive" && task.deleted_at.is_none()
    }));

    let application = TodayApplication::new(persistence, NoSelection, clock);
    let month = application
        .calendar_month(2026, 9)
        .expect("calendar month should load");
    let dense = month.day("2026-09-05").expect("dense date should exist");
    assert_eq!(
        dense
            .task_summaries
            .iter()
            .map(|task| task.id.as_str())
            .collect::<Vec<_>>(),
        vec!["alpha", "beta"]
    );
    assert_eq!(dense.task_overflow_count, 4);
    assert_eq!(dense.task_summaries[0].state, TaskState::Pending);
    assert_eq!(
        month
            .day("2026-09-25")
            .expect("future date should exist")
            .task_overflow_count,
        0
    );
    assert_eq!(
        month.day("2026-09-25").unwrap().task_summaries[0].id,
        "future"
    );
    assert!(month.day("2026-09-09").unwrap().task_summaries.is_empty());

    let selected = application
        .read_date("2026-09-05")
        .expect("selected date should read");
    assert_eq!(selected.date, "2026-09-05");
    assert!(selected.tasks.tasks.iter().any(|task| {
        task.id == "archived" && task.list_id == "archive" && task.deleted_at.is_none()
    }));
    assert!(selected.tasks.tasks.iter().any(|task| {
        task.id == "late"
            && task.date.as_deref() == Some("2026-09-05")
            && task.state == TaskState::Completed
            && task
                .completion
                .as_ref()
                .is_some_and(|completion| completion.completed_on == "2026-09-07")
    }));
    assert!(!record_path(vault.path(), "2026-09-05").exists());
    assert!(!record_path(vault.path(), "2026-09-25").exists());
}
