use personal_dashboard_lib::tasks::{
    FileTaskStore, TaskApplication, TaskChangeKind, TaskCreateInput, TaskDataState, TaskState,
    TaskStore, TaskUpdateInput,
};
use personal_dashboard_lib::today::{TodayClock, TodayWorkspacePersistence};
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
            "personal-dashboard-task-{label}-{}-{nonce}",
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

#[derive(Clone)]
struct SwitchingVault(Arc<Mutex<PathBuf>>);

impl SwitchingVault {
    fn new(vault: &Path) -> Self {
        Self(Arc::new(Mutex::new(vault.to_path_buf())))
    }

    fn switch_to(&self, vault: &Path) {
        *self.0.lock().unwrap() = vault.to_path_buf();
    }
}

impl TodayWorkspacePersistence for SwitchingVault {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(self.0.lock().unwrap().clone()))
    }

    fn save_selected_vault(&self, vault: &Path) -> Result<(), String> {
        self.switch_to(vault);
        Ok(())
    }
}

#[derive(Clone)]
struct SwitchingTaskStore {
    selection: SwitchingVault,
    next_vault: PathBuf,
}

impl TaskStore for SwitchingTaskStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        FileTaskStore.load(path)
    }

    fn save_if_unchanged(
        &self,
        path: &Path,
        expected: &[u8],
        updated: &[u8],
    ) -> Result<(), String> {
        FileTaskStore.save_if_unchanged(path, expected, updated)?;
        self.selection.switch_to(&self.next_vault);
        Ok(())
    }

    fn create_new(&self, path: &Path, document: &[u8]) -> Result<(), String> {
        FileTaskStore.create_new(path, document)?;
        self.selection.switch_to(&self.next_vault);
        Ok(())
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

#[derive(Clone)]
struct SequenceClock {
    timestamps: Arc<Mutex<Vec<String>>>,
}

impl SequenceClock {
    fn new(timestamps: &[&str]) -> Self {
        Self {
            timestamps: Arc::new(Mutex::new(
                timestamps.iter().map(|value| (*value).into()).collect(),
            )),
        }
    }
}

impl TodayClock for SequenceClock {
    fn current_date(&self) -> String {
        "2026-09-17".into()
    }

    fn current_time_label(&self) -> String {
        "14:10".into()
    }

    fn current_timestamp_label(&self) -> String {
        self.timestamps.lock().unwrap().remove(0)
    }
}

fn app(vault: &Path) -> TaskApplication<SelectedVault, FixedClock, FileTaskStore> {
    TaskApplication::new(
        SelectedVault(vault.to_path_buf()),
        FixedClock,
        FileTaskStore,
    )
}

fn task_path(vault: &Path) -> PathBuf {
    vault.join("life/.personal-dashboard/tasks/v1/tasks.json")
}

fn create_input(
    opened: &personal_dashboard_lib::tasks::TasksView,
    task_id: &str,
    name: &str,
    date: Option<&str>,
    time: Option<&str>,
) -> TaskCreateInput {
    TaskCreateInput {
        target_binding: opened.target_binding.clone().unwrap(),
        expected_revision: opened.revision.clone(),
        task_id: task_id.into(),
        name: name.into(),
        content: None,
        date: date.map(str::to_owned),
        time: time.map(str::to_owned),
        list_id: None,
    }
}

#[test]
fn empty_read_is_non_destructive_and_a_manual_inbox_task_survives_relaunch() {
    let vault = TempVault::new("create-relaunch");
    let application = app(vault.path());

    let opened = application.read().unwrap();

    assert_eq!(opened.state, TaskDataState::Empty);
    assert!(opened.tasks.is_empty());
    assert_eq!(opened.revision, None);
    assert!(opened.target_binding.is_some());
    assert!(!vault
        .path()
        .join("life/Journal/Daily/2026/2026-09/2026-09-17.md")
        .exists());

    let added = application
        .create(TaskCreateInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone(),
            task_id: "manual-laundry-1".into(),
            name: "洗衣服".into(),
            content: Some("先整理洗衣篮".into()),
            date: None,
            time: None,
            list_id: None,
        })
        .unwrap();
    let relaunched = app(vault.path()).read().unwrap();

    assert_eq!(added.state, TaskDataState::Ready);
    assert_eq!(relaunched.tasks.len(), 1);
    assert_eq!(relaunched.tasks[0].id, "manual-laundry-1");
    assert_eq!(relaunched.tasks[0].name, "洗衣服");
    assert_eq!(relaunched.tasks[0].content.as_deref(), Some("先整理洗衣篮"));
    assert_eq!(relaunched.tasks[0].date, None);
    assert_eq!(relaunched.tasks[0].time, None);
    assert_eq!(relaunched.tasks[0].list_id, "inbox");
    assert_eq!(relaunched.tasks[0].created_at, "2026-09-17T14:10-04:00");
    assert_eq!(relaunched.tasks[0].modified_at, "2026-09-17T14:10-04:00");
    assert_eq!(relaunched.tasks[0].changes.len(), 0);
    assert_eq!(relaunched.lists[0].id, "inbox");
    assert!(relaunched.lists[0].is_system);
    assert_eq!(relaunched.tasks[0].state, TaskState::Pending);
    assert_eq!(
        relaunched.tasks[0].source.kind,
        personal_dashboard_lib::tasks::TaskSourceKind::Manual
    );
    assert!(task_path(vault.path()).exists());
    assert!(!vault
        .path()
        .join("life/Journal/Daily/2026/2026-09/2026-09-17.md")
        .exists());
}

#[test]
fn task_schedule_allows_future_dates_but_never_orphans_a_time() {
    let vault = TempVault::new("schedule");
    let application = app(vault.path());
    let opened = application.read().unwrap();

    let future = application
        .create(create_input(
            &opened,
            "doctor-appointment-1",
            "预约医生",
            Some("2026-12-31"),
            Some("09:30"),
        ))
        .unwrap();
    assert_eq!(future.tasks[0].date.as_deref(), Some("2026-12-31"));
    assert_eq!(future.tasks[0].time.as_deref(), Some("09:30"));
    assert!(!vault
        .path()
        .join("life/Journal/Daily/2026/2026-09/2026-09-17.md")
        .exists());

    let mut invalid = create_input(&future, "orphan-time-1", "无日期时间", None, Some("10:00"));
    invalid.expected_revision = future.revision.clone();
    let error = application.create(invalid).unwrap_err();
    assert!(error.contains("日期"));
    assert_eq!(application.read().unwrap().tasks.len(), 1);
}

#[test]
fn task_identity_survives_edit_and_reschedule_is_explicit_and_idempotent() {
    let vault = TempVault::new("identity");
    let application = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        SequenceClock::new(&[
            "2026-09-17T14:10-04:00",
            "2026-09-18T09:00-04:00",
            "2026-09-18T10:00-04:00",
        ]),
        FileTaskStore,
    );
    let opened = application.read().unwrap();
    let created = application
        .create(TaskCreateInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone(),
            task_id: "stable-study-1".into(),
            name: "读书".into(),
            content: Some("读第三章".into()),
            date: Some("2026-09-20".into()),
            time: Some("08:00".into()),
            list_id: None,
        })
        .unwrap();
    let edited = application
        .update(TaskUpdateInput {
            target_binding: created.target_binding.clone().unwrap(),
            expected_revision: created.revision.clone().unwrap(),
            task_id: "stable-study-1".into(),
            change_id: "edit-stable-study-1".into(),
            name: "读书（第三章）".into(),
            content: Some("读第三章并记三条笔记".into()),
            date: Some("2026-09-21".into()),
            time: Some("08:30".into()),
            list_id: None,
        })
        .unwrap();

    assert_eq!(edited.tasks.len(), 1);
    assert_eq!(edited.tasks[0].id, "stable-study-1");
    assert_eq!(edited.tasks[0].name, "读书（第三章）");
    assert_eq!(edited.tasks[0].date.as_deref(), Some("2026-09-21"));
    assert_eq!(edited.tasks[0].time.as_deref(), Some("08:30"));
    assert_eq!(edited.tasks[0].changes.len(), 1);
    assert_eq!(edited.tasks[0].changes[0].kind, TaskChangeKind::Edited);
    assert_eq!(
        edited.tasks[0].changes[0].previous_date.as_deref(),
        Some("2026-09-20")
    );
    assert_eq!(
        edited.tasks[0].changes[0].new_date.as_deref(),
        Some("2026-09-21")
    );
    assert_eq!(
        edited.tasks[0].changes[0].changed_at,
        "2026-09-18T09:00-04:00"
    );

    let retried = application
        .update(TaskUpdateInput {
            target_binding: edited.target_binding.clone().unwrap(),
            expected_revision: "stale-revision-is-ignored-for-idempotent-retry".into(),
            task_id: "stable-study-1".into(),
            change_id: "edit-stable-study-1".into(),
            name: "读书（第三章）".into(),
            content: Some("读第三章并记三条笔记".into()),
            date: Some("2026-09-21".into()),
            time: Some("08:30".into()),
            list_id: None,
        })
        .unwrap();
    assert_eq!(retried.tasks[0].changes.len(), 1);

    let cleared = application
        .update(TaskUpdateInput {
            target_binding: edited.target_binding.clone().unwrap(),
            expected_revision: edited.revision.clone().unwrap(),
            task_id: "stable-study-1".into(),
            change_id: "clear-schedule-stable-study-1".into(),
            name: "读书（第三章）".into(),
            content: Some("读第三章并记三条笔记".into()),
            date: None,
            time: None,
            list_id: None,
        })
        .unwrap();
    assert_eq!(cleared.tasks[0].date, None);
    assert_eq!(cleared.tasks[0].time, None);
    assert_eq!(cleared.tasks[0].changes.len(), 2);
    assert_eq!(
        cleared.tasks[0].changes[1].kind,
        TaskChangeKind::Rescheduled
    );
    assert_eq!(
        cleared.tasks[0].changes[1].previous_time.as_deref(),
        Some("08:30")
    );
    assert_eq!(cleared.tasks[0].changes[1].new_time, None);
}

#[derive(Clone, Copy)]
struct FailingTaskStore;

impl TaskStore for FailingTaskStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        match fs::read(path) {
            Ok(document) => Ok(Some(document)),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(error.to_string()),
        }
    }

    fn save_if_unchanged(
        &self,
        _path: &Path,
        _expected: &[u8],
        _updated: &[u8],
    ) -> Result<(), String> {
        Err("injected task save failure".into())
    }

    fn create_new(&self, _path: &Path, _document: &[u8]) -> Result<(), String> {
        Err("injected task create failure".into())
    }
}

#[derive(Clone)]
struct RacingTaskStore {
    external_document: Vec<u8>,
}

impl TaskStore for RacingTaskStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        FileTaskStore.load(path)
    }

    fn save_if_unchanged(
        &self,
        path: &Path,
        expected: &[u8],
        updated: &[u8],
    ) -> Result<(), String> {
        fs::write(path, &self.external_document).unwrap();
        FileTaskStore.save_if_unchanged(path, expected, updated)
    }

    fn create_new(&self, path: &Path, document: &[u8]) -> Result<(), String> {
        FileTaskStore.create_new(path, document)
    }
}

#[test]
fn task_write_rejects_a_vault_change_after_activation_without_mislabeled_data() {
    let first_vault = TempVault::new("post-write-first");
    let second_vault = TempVault::new("post-write-second");
    let selection = SwitchingVault::new(first_vault.path());
    let store = SwitchingTaskStore {
        selection: selection.clone(),
        next_vault: second_vault.path().to_path_buf(),
    };
    let application = TaskApplication::new(selection, FixedClock, store);
    let opened = application.read().unwrap();

    let error = application
        .create(create_input(
            &opened,
            "vault-switch-during-write",
            "不应标记为另一个 Vault 的任务",
            None,
            None,
        ))
        .unwrap_err();

    assert!(error.contains("绑定") || error.contains("目标"));
    assert!(task_path(first_vault.path()).exists());
    assert!(!task_path(second_vault.path()).exists());
}

#[test]
fn task_update_conditional_save_preserves_a_concurrent_external_document() {
    let vault = TempVault::new("conditional-save");
    let initial = app(vault.path());
    let opened = initial.read().unwrap();
    let created = initial
        .create(create_input(
            &opened,
            "conditional-save-task",
            "原始任务",
            None,
            None,
        ))
        .unwrap();
    let external_document = br#"{"schemaVersion":1,"lists":[{"id":"inbox","name":"Inbox","system":true,"archived":false}],"tasks":[]}
"#
    .to_vec();
    let application = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        RacingTaskStore {
            external_document: external_document.clone(),
        },
    );
    let current = application.read().unwrap();

    let error = application
        .update(TaskUpdateInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: current.revision.clone().unwrap(),
            task_id: created.tasks[0].id.clone(),
            change_id: "conditional-save-change".into(),
            name: "不应覆盖外部任务正本".into(),
            content: None,
            date: None,
            time: None,
            list_id: None,
        })
        .unwrap_err();

    assert!(error.contains("外部发生变化"));
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        external_document
    );
}

#[test]
fn malformed_task_history_cannot_orphan_a_time() {
    let vault = TempVault::new("history-schedule");
    let path = task_path(vault.path());
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(
        &path,
        r#"{
  "schemaVersion": 1,
  "lists": [{"id":"inbox","name":"Inbox","system":true,"archived":false}],
  "tasks": [{
    "id":"history-task",
    "name":"任务",
    "content":null,
    "date":null,
    "time":null,
    "listId":"inbox",
    "source":{"kind":"manual","reference":null},
    "state":"pending",
    "createdAt":"2026-09-17T14:10-04:00",
    "modifiedAt":"2026-09-17T14:10-04:00",
    "changes":[{
      "id":"history-change",
      "kind":"rescheduled",
      "changedAt":"2026-09-17T14:10-04:00",
      "previousName":null,
      "newName":null,
      "previousContent":null,
      "newContent":null,
      "previousDate":null,
      "newDate":null,
      "previousTime":null,
      "newTime":"09:00",
      "previousListId":null,
      "newListId":null
    }]
  }]
}
"#,
    )
    .unwrap();

    let view = app(vault.path()).read().unwrap();
    assert_eq!(view.state, TaskDataState::Error);
    assert!(view.message.contains("日期"));
}

#[test]
fn task_update_store_failure_preserves_the_existing_document() {
    let vault = TempVault::new("update-failure");
    let initial = app(vault.path());
    let opened = initial.read().unwrap();
    let created = initial
        .create(create_input(
            &opened,
            "failed-update-task",
            "保留原名称",
            None,
            None,
        ))
        .unwrap();
    let before = fs::read(task_path(vault.path())).unwrap();
    let application = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        FailingTaskStore,
    );
    let current = application.read().unwrap();

    let error = application
        .update(TaskUpdateInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: current.revision.clone().unwrap(),
            task_id: created.tasks[0].id.clone(),
            change_id: "failed-update-change".into(),
            name: "不应保存的新名称".into(),
            content: None,
            date: None,
            time: None,
            list_id: None,
        })
        .unwrap_err();

    assert!(error.contains("injected task save failure"));
    assert_eq!(fs::read(task_path(vault.path())).unwrap(), before);
}

#[test]
fn task_target_binding_conflict_and_corruption_never_overwrite_another_vault_or_file() {
    let first_vault = TempVault::new("first-vault");
    let second_vault = TempVault::new("second-vault");
    let selection = SwitchingVault::new(first_vault.path());
    let application = TaskApplication::new(selection.clone(), FixedClock, FileTaskStore);
    let first_opened = application.read().unwrap();
    let _created = application
        .create(create_input(
            &first_opened,
            "conflict-task-1",
            "保留外部内容",
            None,
            None,
        ))
        .unwrap();
    let original_document = fs::read(task_path(first_vault.path())).unwrap();
    let markdown = first_vault.path().join("life/Journal/Daily/keep.md");
    fs::write(
        &markdown,
        "# User-authored Markdown\n\nDo not rewrite me.\n",
    )
    .unwrap();
    let markdown_before = fs::read(&markdown).unwrap();

    selection.switch_to(second_vault.path());
    let second_opened = application.read().unwrap();
    assert_eq!(second_opened.state, TaskDataState::Empty);
    assert_ne!(
        first_opened.target_binding, second_opened.target_binding,
        "each selected Vault must produce a distinct task target"
    );
    let wrong_target = application
        .create(create_input(
            &first_opened,
            "must-not-land-in-second-vault",
            "错误目标",
            None,
            None,
        ))
        .unwrap_err();
    assert!(wrong_target.contains("绑定") || wrong_target.contains("Vault"));
    assert!(!task_path(second_vault.path()).exists());

    selection.switch_to(first_vault.path());
    let stale = application.read().unwrap();
    let externally_changed = br#"{"schemaVersion":1,"lists":[{"id":"inbox","name":"Inbox","system":true,"archived":false}],"tasks":[]}
"#;
    fs::write(task_path(first_vault.path()), externally_changed).unwrap();
    let stale_error = application
        .update(TaskUpdateInput {
            target_binding: stale.target_binding.clone().unwrap(),
            expected_revision: stale.revision.clone().unwrap(),
            task_id: "conflict-task-1".into(),
            change_id: "stale-change-1".into(),
            name: "不应覆盖外部版本".into(),
            content: None,
            date: None,
            time: None,
            list_id: None,
        })
        .unwrap_err();
    assert!(stale_error.contains("外部发生变化"));
    assert_eq!(
        fs::read(task_path(first_vault.path())).unwrap(),
        externally_changed
    );

    fs::write(task_path(first_vault.path()), b"{not-json").unwrap();
    let damaged = application.read().unwrap();
    assert_eq!(damaged.state, TaskDataState::Error);
    let damaged_bytes = fs::read(task_path(first_vault.path())).unwrap();
    let damage_error = application
        .create(TaskCreateInput {
            target_binding: damaged.target_binding.clone().unwrap(),
            expected_revision: damaged.revision.clone(),
            task_id: "must-not-replace-damaged".into(),
            name: "不能把损坏当空白".into(),
            content: None,
            date: None,
            time: None,
            list_id: None,
        })
        .unwrap_err();
    assert!(damage_error.contains("JSON"));
    assert_eq!(
        fs::read(task_path(first_vault.path())).unwrap(),
        damaged_bytes
    );

    fs::write(
        task_path(first_vault.path()),
        br#"{"schemaVersion":99,"lists":[],"tasks":[]}
"#,
    )
    .unwrap();
    let unknown = application.read().unwrap();
    assert_eq!(unknown.state, TaskDataState::Error);
    let unknown_bytes = fs::read(task_path(first_vault.path())).unwrap();
    let unknown_error = application
        .create(TaskCreateInput {
            target_binding: unknown.target_binding.clone().unwrap(),
            expected_revision: unknown.revision.clone(),
            task_id: "must-not-replace-unknown".into(),
            name: "不能把未知版本当空白".into(),
            content: None,
            date: None,
            time: None,
            list_id: None,
        })
        .unwrap_err();
    assert!(unknown_error.contains("schema"));
    assert_eq!(
        fs::read(task_path(first_vault.path())).unwrap(),
        unknown_bytes
    );
    assert_eq!(fs::read(&markdown).unwrap(), markdown_before);
    assert_ne!(original_document, externally_changed);
}

#[test]
fn task_store_failure_does_not_report_a_saved_task() {
    let vault = TempVault::new("failure");
    let application = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        FailingTaskStore,
    );
    let opened = application.read().unwrap();
    let error = application
        .create(create_input(
            &opened,
            "failed-task-1",
            "保存会失败",
            None,
            None,
        ))
        .unwrap_err();
    assert!(error.contains("injected task create failure"));
    assert!(!task_path(vault.path()).exists());
}
