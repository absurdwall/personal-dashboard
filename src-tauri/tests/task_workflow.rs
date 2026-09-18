use personal_dashboard_lib::tasks::{
    FileTaskStore, TaskApplication, TaskChangeKind, TaskCompletionCorrectionInput,
    TaskCompletionSourceKind, TaskCreateInput, TaskDataState, TaskDeleteInput,
    TaskListArchiveInput, TaskListCreateInput, TaskListRenameInput, TaskListRestoreInput,
    TaskRestoreInput, TaskState, TaskStateInput, TaskStore, TaskUpdateInput,
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

fn empty_task_document() -> Vec<u8> {
    br#"{"schemaVersion":2,"lists":[{"id":"inbox","name":"Inbox","system":true,"archived":false}],"tasks":[]}
"#
    .to_vec()
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

#[test]
fn a_new_edit_can_revert_an_earlier_payload_after_a_late_operation() {
    let vault = TempVault::new("late-edit-revert");
    let application = app(vault.path());
    let opened = application.read().unwrap();
    let created = application
        .create(create_input(
            &opened,
            "late-edit-task",
            "原始名称",
            Some("2026-09-20"),
            None,
        ))
        .unwrap();

    let first_edit = application
        .update(TaskUpdateInput {
            target_binding: created.target_binding.clone().unwrap(),
            expected_revision: created.revision.clone().unwrap(),
            task_id: "late-edit-task".into(),
            change_id: "late-edit-a".into(),
            name: "第一版".into(),
            content: None,
            date: Some("2026-09-21".into()),
            time: None,
            list_id: None,
        })
        .unwrap();
    let second_edit = application
        .update(TaskUpdateInput {
            target_binding: first_edit.target_binding.clone().unwrap(),
            expected_revision: first_edit.revision.clone().unwrap(),
            task_id: "late-edit-task".into(),
            change_id: "late-edit-b".into(),
            name: "第二版".into(),
            content: None,
            date: Some("2026-09-21".into()),
            time: None,
            list_id: None,
        })
        .unwrap();
    let reverted = application
        .update(TaskUpdateInput {
            target_binding: second_edit.target_binding.clone().unwrap(),
            expected_revision: second_edit.revision.clone().unwrap(),
            task_id: "late-edit-task".into(),
            change_id: "late-edit-c".into(),
            name: "第一版".into(),
            content: None,
            date: Some("2026-09-21".into()),
            time: None,
            list_id: None,
        })
        .unwrap();

    assert_eq!(reverted.tasks[0].name, "第一版");
    assert_eq!(reverted.tasks[0].changes.len(), 3);
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

#[test]
fn task_state_history_keeps_task_date_and_records_actual_completion_context() {
    let vault = TempVault::new("state-history");
    let application = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        SequenceClock::new(&[
            "2026-09-17T14:10-04:00",
            "2026-09-19T18:25-04:00",
            "2026-09-19T18:30-04:00",
            "2026-09-19T18:35-04:00",
            "2026-09-19T18:40-04:00",
        ]),
        FileTaskStore,
    );
    let opened = application.read().unwrap();
    let created = application
        .create(create_input(
            &opened,
            "stateful-task-1",
            "保留原定日期",
            Some("2026-09-17"),
            Some("09:00"),
        ))
        .unwrap();

    let completed = application
        .set_state(TaskStateInput {
            target_binding: created.target_binding.clone().unwrap(),
            expected_revision: created.revision.clone().unwrap(),
            task_id: "stateful-task-1".into(),
            change_id: "complete-stateful-task-1".into(),
            state: TaskState::Completed,
        })
        .unwrap();
    assert_eq!(
        completed.state,
        TaskDataState::Ready,
        "{}",
        completed.message
    );
    let task = &completed.tasks[0];
    assert_eq!(task.state, TaskState::Completed);
    assert_eq!(task.date.as_deref(), Some("2026-09-17"));
    assert_eq!(task.time.as_deref(), Some("09:00"));
    let completion = task.completion.as_ref().unwrap();
    assert_eq!(completion.completed_on, "2026-09-19");
    assert_eq!(completion.completed_time.as_deref(), Some("18:25"));
    assert_eq!(completion.recorded_at, "2026-09-19T18:25-04:00");
    assert_eq!(completion.source, TaskCompletionSourceKind::Checkbox);
    assert_eq!(task.changes[0].kind, TaskChangeKind::Completed);
    assert_eq!(task.changes[0].previous_state, Some(TaskState::Pending));
    assert_eq!(task.changes[0].new_state, Some(TaskState::Completed));
    assert!(task.changes[0].new_completion.is_some());

    let completed_retry = application
        .set_state(TaskStateInput {
            target_binding: completed.target_binding.clone().unwrap(),
            expected_revision: "stale-after-complete".into(),
            task_id: "stateful-task-1".into(),
            change_id: "complete-stateful-task-1".into(),
            state: TaskState::Completed,
        })
        .unwrap();
    assert_eq!(completed_retry.revision, completed.revision);
    assert_eq!(completed_retry.tasks[0].changes.len(), 1);

    let reopened = application
        .set_state(TaskStateInput {
            target_binding: completed.target_binding.clone().unwrap(),
            expected_revision: completed.revision.clone().unwrap(),
            task_id: "stateful-task-1".into(),
            change_id: "reopen-stateful-task-1".into(),
            state: TaskState::Pending,
        })
        .unwrap();
    assert_eq!(reopened.tasks[0].state, TaskState::Pending);
    assert_eq!(reopened.tasks[0].completion, None);

    let abandoned = application
        .set_state(TaskStateInput {
            target_binding: reopened.target_binding.clone().unwrap(),
            expected_revision: reopened.revision.clone().unwrap(),
            task_id: "stateful-task-1".into(),
            change_id: "abandon-stateful-task-1".into(),
            state: TaskState::Abandoned,
        })
        .unwrap();
    assert_eq!(abandoned.tasks[0].state, TaskState::Abandoned);
    let restored = application
        .set_state(TaskStateInput {
            target_binding: abandoned.target_binding.clone().unwrap(),
            expected_revision: abandoned.revision.clone().unwrap(),
            task_id: "stateful-task-1".into(),
            change_id: "restore-stateful-task-1".into(),
            state: TaskState::Pending,
        })
        .unwrap();
    assert_eq!(restored.tasks[0].state, TaskState::Pending);
    assert_eq!(
        restored.tasks[0]
            .changes
            .iter()
            .map(|change| change.kind)
            .collect::<Vec<_>>(),
        vec![
            TaskChangeKind::Completed,
            TaskChangeKind::Reopened,
            TaskChangeKind::Abandoned,
            TaskChangeKind::Restored,
        ]
    );

    let relaunched = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        FileTaskStore,
    )
    .read()
    .unwrap();
    assert_eq!(relaunched.tasks[0].state, TaskState::Pending);
    assert_eq!(relaunched.tasks[0].changes.len(), 4);
    assert_eq!(relaunched.tasks[0].date.as_deref(), Some("2026-09-17"));
}

#[test]
fn task_deletion_keeps_a_tombstone_and_restore_keeps_identity_and_state() {
    let vault = TempVault::new("delete-restore");
    let application = app(vault.path());
    let opened = application.read().unwrap();
    let created = application
        .create(create_input(
            &opened,
            "recoverable-task-1",
            "保留恢复资料",
            Some("2026-09-20"),
            None,
        ))
        .unwrap();
    let deleted = application
        .delete(TaskDeleteInput {
            target_binding: created.target_binding.clone().unwrap(),
            expected_revision: created.revision.clone().unwrap(),
            task_id: "recoverable-task-1".into(),
            change_id: "delete-recoverable-task-1".into(),
        })
        .unwrap();
    assert_eq!(deleted.state, TaskDataState::Ready);
    assert_eq!(deleted.tasks.len(), 1);
    assert!(deleted.tasks[0].deleted_at.is_some());
    assert_eq!(deleted.tasks[0].state, TaskState::Pending);
    assert_eq!(deleted.tasks[0].list_id, "inbox");
    assert_eq!(deleted.tasks[0].changes[0].kind, TaskChangeKind::Deleted);
    assert_eq!(deleted.tasks[0].changes[0].previous_deleted_at, None);
    assert!(deleted.tasks[0].changes[0].new_deleted_at.is_some());
    let deleted_document = fs::read(task_path(vault.path())).unwrap();
    let deleted_retry = application
        .delete(TaskDeleteInput {
            target_binding: deleted.target_binding.clone().unwrap(),
            expected_revision: "stale-after-delete".into(),
            task_id: "recoverable-task-1".into(),
            change_id: "delete-recoverable-task-1".into(),
        })
        .unwrap();
    assert_eq!(deleted_retry.revision, deleted.revision);
    assert_eq!(deleted_retry.tasks[0].changes.len(), 1);
    assert_eq!(fs::read(task_path(vault.path())).unwrap(), deleted_document);

    let old_plan_retry = application
        .create(TaskCreateInput {
            target_binding: deleted.target_binding.clone().unwrap(),
            expected_revision: deleted.revision.clone(),
            task_id: "recoverable-task-1".into(),
            name: "保留恢复资料".into(),
            content: None,
            date: Some("2026-09-20".into()),
            time: None,
            list_id: None,
        })
        .expect_err("old planning input must not reactivate a deleted task");
    assert!(old_plan_retry.contains("删除") || old_plan_retry.contains("激活"));
    assert_eq!(fs::read(task_path(vault.path())).unwrap(), deleted_document);

    let restored = application
        .restore(TaskRestoreInput {
            target_binding: deleted.target_binding.clone().unwrap(),
            expected_revision: deleted.revision.clone().unwrap(),
            task_id: "recoverable-task-1".into(),
            change_id: "restore-recoverable-task-1".into(),
        })
        .unwrap();
    assert_eq!(restored.tasks.len(), 1);
    assert_eq!(restored.tasks[0].id, "recoverable-task-1");
    assert_eq!(restored.tasks[0].deleted_at, None);
    assert_eq!(restored.tasks[0].state, TaskState::Pending);
    assert_eq!(restored.tasks[0].list_id, "inbox");
    assert_eq!(
        restored.tasks[0]
            .changes
            .iter()
            .map(|change| change.kind)
            .collect::<Vec<_>>(),
        vec![TaskChangeKind::Deleted, TaskChangeKind::Undeleted]
    );
    let restored_retry = application
        .restore(TaskRestoreInput {
            target_binding: restored.target_binding.clone().unwrap(),
            expected_revision: "stale-after-restore".into(),
            task_id: "recoverable-task-1".into(),
            change_id: "restore-recoverable-task-1".into(),
        })
        .unwrap();
    assert_eq!(restored_retry.revision, restored.revision);
    assert_eq!(restored_retry.tasks[0].changes.len(), 2);

    let relaunched = app(vault.path()).read().unwrap();
    assert_eq!(relaunched.tasks[0].id, "recoverable-task-1");
    assert_eq!(relaunched.tasks[0].deleted_at, None);
    assert_eq!(relaunched.tasks[0].changes.len(), 2);
}

#[test]
fn task_completion_correction_preserves_schedule_and_rejects_future_evidence() {
    let vault = TempVault::new("completion-correction");
    let application = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        SequenceClock::new(&[
            "2026-09-17T14:10-04:00",
            "2026-09-17T14:20-04:00",
            "2026-09-17T15:10-04:00",
            "2026-09-17T15:20-04:00",
        ]),
        FileTaskStore,
    );
    let opened = application.read().unwrap();
    let created = application
        .create(create_input(
            &opened,
            "correctable-task-1",
            "提前完成的安排",
            Some("2026-09-20"),
            Some("09:00"),
        ))
        .unwrap();
    let completed = application
        .set_state(TaskStateInput {
            target_binding: created.target_binding.clone().unwrap(),
            expected_revision: created.revision.clone().unwrap(),
            task_id: "correctable-task-1".into(),
            change_id: "complete-correctable-task-1".into(),
            state: TaskState::Completed,
        })
        .unwrap();
    assert_eq!(completed.tasks[0].date.as_deref(), Some("2026-09-20"));
    assert_eq!(
        completed.tasks[0].completion.as_ref().unwrap().completed_on,
        "2026-09-17"
    );

    let corrected = application
        .correct_completion(TaskCompletionCorrectionInput {
            target_binding: completed.target_binding.clone().unwrap(),
            expected_revision: completed.revision.clone().unwrap(),
            task_id: "correctable-task-1".into(),
            change_id: "correct-correctable-task-1".into(),
            completed_on: "2026-09-16".into(),
            completed_time: None,
        })
        .unwrap();
    let task = &corrected.tasks[0];
    assert_eq!(task.state, TaskState::Completed);
    assert_eq!(task.date.as_deref(), Some("2026-09-20"));
    let completion = task.completion.as_ref().unwrap();
    assert_eq!(completion.completed_on, "2026-09-16");
    assert_eq!(completion.completed_time, None);
    assert_eq!(completion.recorded_at, "2026-09-17T15:10-04:00");
    assert_eq!(completion.source, TaskCompletionSourceKind::DateCorrection);
    assert_eq!(
        task.changes.last().unwrap().kind,
        TaskChangeKind::CompletionCorrected
    );
    assert_eq!(
        task.changes.last().unwrap().previous_completion.as_ref(),
        completed.tasks[0].completion.as_ref()
    );
    assert_eq!(
        task.changes.last().unwrap().new_completion.as_ref(),
        task.completion.as_ref()
    );
    let corrected_retry = application
        .correct_completion(TaskCompletionCorrectionInput {
            target_binding: corrected.target_binding.clone().unwrap(),
            expected_revision: "stale-after-correction".into(),
            task_id: "correctable-task-1".into(),
            change_id: "correct-correctable-task-1".into(),
            completed_on: "2026-09-16".into(),
            completed_time: None,
        })
        .unwrap();
    assert_eq!(corrected_retry.revision, corrected.revision);
    assert_eq!(corrected_retry.tasks[0].changes.len(), 2);

    let before_future_attempt = fs::read(task_path(vault.path())).unwrap();
    let error = application
        .correct_completion(TaskCompletionCorrectionInput {
            target_binding: corrected.target_binding.clone().unwrap(),
            expected_revision: corrected.revision.clone().unwrap(),
            task_id: "correctable-task-1".into(),
            change_id: "future-correctable-task-1".into(),
            completed_on: "2026-09-18".into(),
            completed_time: Some("08:00".into()),
        })
        .expect_err("future completion evidence must be rejected");
    assert!(error.contains("未来"));
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        before_future_attempt
    );
}

#[test]
fn task_state_store_failure_keeps_state_and_history_together() {
    let vault = TempVault::new("state-failure");
    let initial = app(vault.path());
    let opened = initial.read().unwrap();
    let created = initial
        .create(create_input(
            &opened,
            "state-failure-task",
            "保存失败时仍是待办",
            None,
            None,
        ))
        .unwrap();
    let before = fs::read(task_path(vault.path())).unwrap();
    let failing = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        FailingTaskStore,
    );
    let current = failing.read().unwrap();

    let error = failing
        .set_state(TaskStateInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: current.revision.clone().unwrap(),
            task_id: created.tasks[0].id.clone(),
            change_id: "failed-state-change".into(),
            state: TaskState::Completed,
        })
        .unwrap_err();

    assert!(error.contains("injected task save failure"));
    assert_eq!(fs::read(task_path(vault.path())).unwrap(), before);
    let after = initial.read().unwrap();
    assert_eq!(after.tasks[0].state, TaskState::Pending);
    assert!(after.tasks[0].completion.is_none());
    assert!(after.tasks[0].changes.is_empty());
}

#[test]
fn task_state_rejects_a_stale_external_document_without_partial_history() {
    let vault = TempVault::new("state-conflict");
    let initial = app(vault.path());
    let opened = initial.read().unwrap();
    let created = initial
        .create(create_input(
            &opened,
            "state-conflict-task",
            "不覆盖外部状态",
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
        .set_state(TaskStateInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: created.revision.clone().unwrap(),
            task_id: "state-conflict-task".into(),
            change_id: "state-conflict-change".into(),
            state: TaskState::Completed,
        })
        .unwrap_err();

    assert!(error.contains("外部发生变化"));
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        external_document
    );
}

#[test]
fn task_state_requires_explicit_restore_and_cannot_replay_an_inverse_change() {
    let vault = TempVault::new("state-replay");
    let application = app(vault.path());
    let opened = application.read().unwrap();
    let created = application
        .create(create_input(
            &opened,
            "state-replay-task",
            "需要明确恢复",
            None,
            None,
        ))
        .unwrap();
    let abandoned = application
        .set_state(TaskStateInput {
            target_binding: created.target_binding.clone().unwrap(),
            expected_revision: created.revision.clone().unwrap(),
            task_id: "state-replay-task".into(),
            change_id: "abandon-state-replay-task".into(),
            state: TaskState::Abandoned,
        })
        .unwrap();
    let before_rejected_completion = fs::read(task_path(vault.path())).unwrap();
    let error = application
        .set_state(TaskStateInput {
            target_binding: abandoned.target_binding.clone().unwrap(),
            expected_revision: abandoned.revision.clone().unwrap(),
            task_id: "state-replay-task".into(),
            change_id: "complete-abandoned-state-replay-task".into(),
            state: TaskState::Completed,
        })
        .expect_err("abandoned tasks must be restored before completion");
    assert!(error.contains("恢复"));
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        before_rejected_completion
    );

    let restored = application
        .set_state(TaskStateInput {
            target_binding: abandoned.target_binding.clone().unwrap(),
            expected_revision: abandoned.revision.clone().unwrap(),
            task_id: "state-replay-task".into(),
            change_id: "restore-state-replay-task".into(),
            state: TaskState::Pending,
        })
        .unwrap();
    let deleted = application
        .delete(TaskDeleteInput {
            target_binding: restored.target_binding.clone().unwrap(),
            expected_revision: restored.revision.clone().unwrap(),
            task_id: "state-replay-task".into(),
            change_id: "delete-state-replay-task".into(),
        })
        .unwrap();
    let before_old_restore_replay = fs::read(task_path(vault.path())).unwrap();
    let error = application
        .set_state(TaskStateInput {
            target_binding: deleted.target_binding.clone().unwrap(),
            expected_revision: deleted.revision.clone().unwrap(),
            task_id: "state-replay-task".into(),
            change_id: "restore-state-replay-task".into(),
            state: TaskState::Pending,
        })
        .expect_err("an old restore id must not replay after deletion");
    assert!(error.contains("修改标识"));
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        before_old_restore_replay
    );

    let restored_again = application
        .restore(TaskRestoreInput {
            target_binding: deleted.target_binding.clone().unwrap(),
            expected_revision: deleted.revision.clone().unwrap(),
            task_id: "state-replay-task".into(),
            change_id: "undelete-state-replay-task".into(),
        })
        .unwrap();
    let completed = application
        .set_state(TaskStateInput {
            target_binding: restored_again.target_binding.clone().unwrap(),
            expected_revision: restored_again.revision.clone().unwrap(),
            task_id: "state-replay-task".into(),
            change_id: "complete-state-replay-task".into(),
            state: TaskState::Completed,
        })
        .unwrap();
    let corrected = application
        .correct_completion(TaskCompletionCorrectionInput {
            target_binding: completed.target_binding.clone().unwrap(),
            expected_revision: completed.revision.clone().unwrap(),
            task_id: "state-replay-task".into(),
            change_id: "correct-state-replay-task".into(),
            completed_on: "2026-09-16".into(),
            completed_time: None,
        })
        .unwrap();
    let reopened = application
        .set_state(TaskStateInput {
            target_binding: corrected.target_binding.clone().unwrap(),
            expected_revision: corrected.revision.clone().unwrap(),
            task_id: "state-replay-task".into(),
            change_id: "reopen-state-replay-task".into(),
            state: TaskState::Pending,
        })
        .unwrap();
    let before_old_correction_replay = fs::read(task_path(vault.path())).unwrap();
    let error = application
        .correct_completion(TaskCompletionCorrectionInput {
            target_binding: reopened.target_binding.clone().unwrap(),
            expected_revision: reopened.revision.clone().unwrap(),
            task_id: "state-replay-task".into(),
            change_id: "correct-state-replay-task".into(),
            completed_on: "2026-09-16".into(),
            completed_time: None,
        })
        .expect_err("an old completion correction id must not replay after reopen");
    assert!(error.contains("修改标识"));
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        before_old_correction_replay
    );
}

#[test]
fn legacy_task_schema_is_read_and_upgraded_on_the_next_write() {
    let vault = TempVault::new("legacy-schema");
    let path = task_path(vault.path());
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(
        &path,
        r#"{
  "schemaVersion": 1,
  "lists": [{"id":"inbox","name":"Inbox","system":true,"archived":false}],
  "tasks": [{
    "id":"legacy-task",
    "name":"旧 schema 任务",
    "content":null,
    "date":"2026-09-20",
    "time":null,
    "listId":"inbox",
    "source":{"kind":"manual","reference":null},
    "state":"pending",
    "createdAt":"2026-09-17T14:10-04:00",
    "modifiedAt":"2026-09-17T14:10-04:00",
    "changes":[]
  }]
}
"#,
    )
    .unwrap();

    let application = app(vault.path());
    let legacy = application.read().unwrap();
    assert_eq!(legacy.schema_version, 2);
    assert_eq!(legacy.tasks[0].state, TaskState::Pending);
    assert_eq!(legacy.tasks[0].deleted_at, None);
    assert_eq!(legacy.tasks[0].completion, None);

    let upgraded = application
        .set_state(TaskStateInput {
            target_binding: legacy.target_binding.clone().unwrap(),
            expected_revision: legacy.revision.clone().unwrap(),
            task_id: "legacy-task".into(),
            change_id: "complete-legacy-task".into(),
            state: TaskState::Completed,
        })
        .unwrap();
    assert_eq!(upgraded.schema_version, 2);
    let document: serde_json::Value = serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
    assert_eq!(document["schemaVersion"], serde_json::json!(2));
    assert!(document["tasks"][0].get("deletedAt").is_some());
    assert!(document["tasks"][0].get("completion").is_some());
}

#[test]
fn task_delete_store_failure_preserves_the_existing_document() {
    let vault = TempVault::new("delete-failure");
    let initial = app(vault.path());
    let opened = initial.read().unwrap();
    let created = initial
        .create(create_input(
            &opened,
            "failed-delete-task",
            "删除保存失败",
            None,
            None,
        ))
        .unwrap();
    let before = fs::read(task_path(vault.path())).unwrap();
    let failing = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        FailingTaskStore,
    );
    let current = failing.read().unwrap();
    let error = failing
        .delete(TaskDeleteInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: current.revision.clone().unwrap(),
            task_id: created.tasks[0].id.clone(),
            change_id: "failed-delete-change".into(),
        })
        .unwrap_err();
    assert!(error.contains("injected task save failure"));
    assert_eq!(fs::read(task_path(vault.path())).unwrap(), before);
    let after = initial.read().unwrap();
    assert_eq!(after.tasks[0].deleted_at, None);
    assert!(after.tasks[0].changes.is_empty());
}

#[test]
fn task_delete_rejects_a_stale_external_document_without_partial_history() {
    let vault = TempVault::new("delete-conflict");
    let initial = app(vault.path());
    let opened = initial.read().unwrap();
    let created = initial
        .create(create_input(
            &opened,
            "conflicted-delete-task",
            "删除冲突",
            None,
            None,
        ))
        .unwrap();
    let external_document = empty_task_document();
    let application = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        RacingTaskStore {
            external_document: external_document.clone(),
        },
    );
    let current = application.read().unwrap();
    let error = application
        .delete(TaskDeleteInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: current.revision.clone().unwrap(),
            task_id: created.tasks[0].id.clone(),
            change_id: "conflicted-delete-change".into(),
        })
        .unwrap_err();
    assert!(error.contains("外部发生变化"));
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        external_document
    );
}

#[test]
fn task_restore_store_failure_preserves_the_existing_tombstone() {
    let vault = TempVault::new("restore-failure");
    let initial = app(vault.path());
    let opened = initial.read().unwrap();
    let created = initial
        .create(create_input(
            &opened,
            "failed-restore-task",
            "恢复保存失败",
            None,
            None,
        ))
        .unwrap();
    let deleted = initial
        .delete(TaskDeleteInput {
            target_binding: created.target_binding.clone().unwrap(),
            expected_revision: created.revision.clone().unwrap(),
            task_id: created.tasks[0].id.clone(),
            change_id: "delete-before-failed-restore".into(),
        })
        .unwrap();
    let before = fs::read(task_path(vault.path())).unwrap();
    let failing = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        FailingTaskStore,
    );
    let current = failing.read().unwrap();
    let error = failing
        .restore(TaskRestoreInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: current.revision.clone().unwrap(),
            task_id: deleted.tasks[0].id.clone(),
            change_id: "failed-restore-change".into(),
        })
        .unwrap_err();
    assert!(error.contains("injected task save failure"));
    assert_eq!(fs::read(task_path(vault.path())).unwrap(), before);
    let after = initial.read().unwrap();
    assert!(after.tasks[0].deleted_at.is_some());
    assert_eq!(after.tasks[0].changes.len(), 1);
}

#[test]
fn task_restore_rejects_a_stale_external_document_without_partial_history() {
    let vault = TempVault::new("restore-conflict");
    let initial = app(vault.path());
    let opened = initial.read().unwrap();
    let created = initial
        .create(create_input(
            &opened,
            "conflicted-restore-task",
            "恢复冲突",
            None,
            None,
        ))
        .unwrap();
    let deleted = initial
        .delete(TaskDeleteInput {
            target_binding: created.target_binding.clone().unwrap(),
            expected_revision: created.revision.clone().unwrap(),
            task_id: created.tasks[0].id.clone(),
            change_id: "delete-before-conflicted-restore".into(),
        })
        .unwrap();
    let external_document = empty_task_document();
    let application = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        RacingTaskStore {
            external_document: external_document.clone(),
        },
    );
    let current = application.read().unwrap();
    let error = application
        .restore(TaskRestoreInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: current.revision.clone().unwrap(),
            task_id: deleted.tasks[0].id.clone(),
            change_id: "conflicted-restore-change".into(),
        })
        .unwrap_err();
    assert!(error.contains("外部发生变化"));
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        external_document
    );
}

#[test]
fn task_completion_correction_store_failure_preserves_completion_and_history() {
    let vault = TempVault::new("completion-correction-failure");
    let initial = app(vault.path());
    let opened = initial.read().unwrap();
    let created = initial
        .create(create_input(
            &opened,
            "failed-correction-task",
            "更正保存失败",
            None,
            None,
        ))
        .unwrap();
    let completed = initial
        .set_state(TaskStateInput {
            target_binding: created.target_binding.clone().unwrap(),
            expected_revision: created.revision.clone().unwrap(),
            task_id: created.tasks[0].id.clone(),
            change_id: "complete-before-failed-correction".into(),
            state: TaskState::Completed,
        })
        .unwrap();
    let before = fs::read(task_path(vault.path())).unwrap();
    let failing = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        FailingTaskStore,
    );
    let current = failing.read().unwrap();
    let error = failing
        .correct_completion(TaskCompletionCorrectionInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: current.revision.clone().unwrap(),
            task_id: completed.tasks[0].id.clone(),
            change_id: "failed-correction-change".into(),
            completed_on: "2026-09-16".into(),
            completed_time: None,
        })
        .unwrap_err();
    assert!(error.contains("injected task save failure"));
    assert_eq!(fs::read(task_path(vault.path())).unwrap(), before);
    let after = initial.read().unwrap();
    assert_eq!(after.tasks[0].completion, completed.tasks[0].completion);
    assert_eq!(after.tasks[0].changes.len(), 1);
}

#[test]
fn task_completion_correction_rejects_a_stale_external_document_without_partial_history() {
    let vault = TempVault::new("completion-correction-conflict");
    let initial = app(vault.path());
    let opened = initial.read().unwrap();
    let created = initial
        .create(create_input(
            &opened,
            "conflicted-correction-task",
            "更正冲突",
            None,
            None,
        ))
        .unwrap();
    let completed = initial
        .set_state(TaskStateInput {
            target_binding: created.target_binding.clone().unwrap(),
            expected_revision: created.revision.clone().unwrap(),
            task_id: created.tasks[0].id.clone(),
            change_id: "complete-before-conflicted-correction".into(),
            state: TaskState::Completed,
        })
        .unwrap();
    let external_document = empty_task_document();
    let application = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        RacingTaskStore {
            external_document: external_document.clone(),
        },
    );
    let current = application.read().unwrap();
    let error = application
        .correct_completion(TaskCompletionCorrectionInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: current.revision.clone().unwrap(),
            task_id: completed.tasks[0].id.clone(),
            change_id: "conflicted-correction-change".into(),
            completed_on: "2026-09-16".into(),
            completed_time: None,
        })
        .unwrap_err();
    assert!(error.contains("外部发生变化"));
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        external_document
    );
}

#[test]
fn task_lists_keep_identity_when_created_renamed_moved_and_relaunched() {
    let vault = TempVault::new("lists-identity");
    let application = app(vault.path());
    let opened = application.read().unwrap();

    let created_list = application
        .create_list(TaskListCreateInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone(),
            list_id: "planning".into(),
            name: "计划".into(),
        })
        .unwrap();
    assert_eq!(created_list.lists.len(), 2);
    assert_eq!(
        created_list
            .lists
            .iter()
            .find(|list| list.id == "planning")
            .unwrap()
            .name,
        "计划"
    );

    let created = application
        .create(TaskCreateInput {
            target_binding: created_list.target_binding.clone().unwrap(),
            expected_revision: created_list.revision.clone(),
            task_id: "planning-task".into(),
            name: "整理计划".into(),
            content: None,
            date: None,
            time: None,
            list_id: Some("planning".into()),
        })
        .unwrap();
    assert_eq!(created.tasks[0].list_id, "planning");
    assert_eq!(created.tasks[0].date, None);

    let edited_in_place = application
        .update(TaskUpdateInput {
            target_binding: created.target_binding.clone().unwrap(),
            expected_revision: created.revision.clone().unwrap(),
            task_id: "planning-task".into(),
            change_id: "edit-planning-task-in-place".into(),
            name: "整理计划（更新）".into(),
            content: None,
            date: None,
            time: None,
            list_id: None,
        })
        .unwrap();
    assert_eq!(edited_in_place.tasks[0].list_id, "planning");

    let renamed = application
        .rename_list(TaskListRenameInput {
            target_binding: edited_in_place.target_binding.clone().unwrap(),
            expected_revision: edited_in_place.revision.clone().unwrap(),
            list_id: "planning".into(),
            name: "本周计划".into(),
        })
        .unwrap();
    assert_eq!(renamed.tasks[0].id, "planning-task");
    assert_eq!(renamed.tasks[0].list_id, "planning");
    assert_eq!(renamed.tasks[0].name, "整理计划（更新）");
    assert_eq!(
        renamed
            .lists
            .iter()
            .find(|list| list.id == "planning")
            .unwrap()
            .name,
        "本周计划"
    );
    let renamed_retry = application
        .rename_list(TaskListRenameInput {
            target_binding: renamed.target_binding.clone().unwrap(),
            expected_revision: "stale-after-rename".into(),
            list_id: "planning".into(),
            name: "本周计划".into(),
        })
        .unwrap();
    assert_eq!(renamed_retry.tasks, renamed.tasks);

    let moved = application
        .update(TaskUpdateInput {
            target_binding: renamed_retry.target_binding.clone().unwrap(),
            expected_revision: renamed_retry.revision.clone().unwrap(),
            task_id: "planning-task".into(),
            change_id: "move-planning-task-to-inbox".into(),
            name: "整理计划（更新）".into(),
            content: None,
            date: None,
            time: None,
            list_id: Some("inbox".into()),
        })
        .unwrap();
    assert_eq!(moved.tasks.len(), 1);
    assert_eq!(moved.tasks[0].id, "planning-task");
    assert_eq!(moved.tasks[0].list_id, "inbox");
    assert_eq!(moved.tasks[0].changes.len(), 2);
    assert_eq!(moved.tasks[0].changes[1].kind, TaskChangeKind::ListMoved);
    assert_eq!(
        moved.tasks[0].changes[1].previous_list_id.as_deref(),
        Some("planning")
    );
    assert_eq!(
        moved.tasks[0].changes[1].new_list_id.as_deref(),
        Some("inbox")
    );

    let retried = application
        .create_list(TaskListCreateInput {
            target_binding: moved.target_binding.clone().unwrap(),
            expected_revision: Some("stale-after-list-create".into()),
            list_id: "planning".into(),
            name: "本周计划".into(),
        })
        .unwrap();
    assert_eq!(retried.lists.len(), 2);

    let relaunched = app(vault.path()).read().unwrap();
    assert_eq!(relaunched.tasks.len(), 1);
    assert_eq!(relaunched.tasks[0].id, "planning-task");
    assert_eq!(relaunched.tasks[0].list_id, "inbox");
    assert_eq!(relaunched.tasks[0].changes.len(), 2);
    assert_eq!(
        relaunched
            .lists
            .iter()
            .find(|list| list.id == "planning")
            .unwrap()
            .name,
        "本周计划"
    );
}

#[test]
fn archived_task_lists_preserve_states_history_and_single_task_restore_boundary() {
    let vault = TempVault::new("lists-archive-restore");
    let application = app(vault.path());
    let opened = application.read().unwrap();
    let list = application
        .create_list(TaskListCreateInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone(),
            list_id: "side-project".into(),
            name: "副项目".into(),
        })
        .unwrap();
    let pending = application
        .create(TaskCreateInput {
            target_binding: list.target_binding.clone().unwrap(),
            expected_revision: list.revision.clone(),
            task_id: "side-pending".into(),
            name: "保留待办".into(),
            content: None,
            date: None,
            time: None,
            list_id: Some("side-project".into()),
        })
        .unwrap();
    let completed = application
        .create(TaskCreateInput {
            target_binding: pending.target_binding.clone().unwrap(),
            expected_revision: pending.revision.clone(),
            task_id: "side-completed".into(),
            name: "保留完成".into(),
            content: None,
            date: None,
            time: None,
            list_id: Some("side-project".into()),
        })
        .unwrap();
    let completed = application
        .set_state(TaskStateInput {
            target_binding: completed.target_binding.clone().unwrap(),
            expected_revision: completed.revision.clone().unwrap(),
            task_id: "side-completed".into(),
            change_id: "complete-side-project".into(),
            state: TaskState::Completed,
        })
        .unwrap();
    let abandoned = application
        .create(TaskCreateInput {
            target_binding: completed.target_binding.clone().unwrap(),
            expected_revision: completed.revision.clone(),
            task_id: "side-abandoned".into(),
            name: "保留放弃".into(),
            content: None,
            date: None,
            time: None,
            list_id: Some("side-project".into()),
        })
        .unwrap();
    let abandoned = application
        .set_state(TaskStateInput {
            target_binding: abandoned.target_binding.clone().unwrap(),
            expected_revision: abandoned.revision.clone().unwrap(),
            task_id: "side-abandoned".into(),
            change_id: "abandon-side-project".into(),
            state: TaskState::Abandoned,
        })
        .unwrap();
    let before_archive = abandoned.tasks.clone();

    let archived = application
        .archive_list(TaskListArchiveInput {
            target_binding: abandoned.target_binding.clone().unwrap(),
            expected_revision: abandoned.revision.clone().unwrap(),
            list_id: "side-project".into(),
        })
        .unwrap();
    assert!(
        archived
            .lists
            .iter()
            .find(|list| list.id == "side-project")
            .unwrap()
            .archived
    );
    for task in &before_archive {
        let current = archived
            .tasks
            .iter()
            .find(|candidate| candidate.id == task.id)
            .unwrap();
        assert_eq!(current.state, task.state);
        assert_eq!(current.completion, task.completion);
        assert_eq!(current.changes, task.changes);
        assert_eq!(current.list_id, "side-project");
    }

    let archived_retry = application
        .archive_list(TaskListArchiveInput {
            target_binding: archived.target_binding.clone().unwrap(),
            expected_revision: "stale-archive-retry".into(),
            list_id: "side-project".into(),
        })
        .unwrap();
    assert_eq!(archived_retry.lists, archived.lists);
    assert_eq!(archived_retry.tasks, archived.tasks);

    let deleted = application
        .delete(TaskDeleteInput {
            target_binding: archived.target_binding.clone().unwrap(),
            expected_revision: archived.revision.clone().unwrap(),
            task_id: "side-pending".into(),
            change_id: "delete-archived-pending".into(),
        })
        .unwrap();
    let task_restored = application
        .restore(TaskRestoreInput {
            target_binding: deleted.target_binding.clone().unwrap(),
            expected_revision: deleted.revision.clone().unwrap(),
            task_id: "side-pending".into(),
            change_id: "restore-archived-pending".into(),
        })
        .unwrap();
    assert!(
        task_restored
            .lists
            .iter()
            .find(|list| list.id == "side-project")
            .unwrap()
            .archived,
        "restoring one task must not unarchive its task list"
    );
    assert_eq!(
        task_restored
            .tasks
            .iter()
            .find(|task| task.id == "side-pending")
            .unwrap()
            .deleted_at,
        None
    );

    let restored = application
        .restore_list(TaskListRestoreInput {
            target_binding: task_restored.target_binding.clone().unwrap(),
            expected_revision: task_restored.revision.clone().unwrap(),
            list_id: "side-project".into(),
        })
        .unwrap();
    assert!(
        !restored
            .lists
            .iter()
            .find(|list| list.id == "side-project")
            .unwrap()
            .archived
    );
    assert_eq!(
        restored
            .tasks
            .iter()
            .find(|task| task.id == "side-completed")
            .unwrap()
            .state,
        TaskState::Completed
    );
    assert_eq!(
        restored
            .tasks
            .iter()
            .find(|task| task.id == "side-completed")
            .unwrap()
            .changes,
        before_archive
            .iter()
            .find(|task| task.id == "side-completed")
            .unwrap()
            .changes
    );
    let restored_retry = application
        .restore_list(TaskListRestoreInput {
            target_binding: restored.target_binding.clone().unwrap(),
            expected_revision: "stale-after-restore".into(),
            list_id: "side-project".into(),
        })
        .unwrap();
    assert_eq!(restored_retry.lists, restored.lists);
}

#[test]
fn task_lists_reject_inbox_and_archived_destinations_without_partial_writes() {
    let vault = TempVault::new("lists-boundaries");
    let application = app(vault.path());
    let opened = application.read().unwrap();
    let list = application
        .create_list(TaskListCreateInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone(),
            list_id: "archive-destination".into(),
            name: "归档目标".into(),
        })
        .unwrap();
    let task = application
        .create(create_input(&list, "boundary-task", "边界任务", None, None))
        .unwrap();
    let inbox_rename = application
        .rename_list(TaskListRenameInput {
            target_binding: task.target_binding.clone().unwrap(),
            expected_revision: task.revision.clone().unwrap(),
            list_id: "inbox".into(),
            name: "不能改名".into(),
        })
        .unwrap_err();
    assert!(inbox_rename.contains("Inbox"));
    let inbox_archive = application
        .archive_list(TaskListArchiveInput {
            target_binding: task.target_binding.clone().unwrap(),
            expected_revision: task.revision.clone().unwrap(),
            list_id: "inbox".into(),
        })
        .unwrap_err();
    assert!(inbox_archive.contains("Inbox"));

    let archived = application
        .archive_list(TaskListArchiveInput {
            target_binding: task.target_binding.clone().unwrap(),
            expected_revision: task.revision.clone().unwrap(),
            list_id: "archive-destination".into(),
        })
        .unwrap();
    let before_move = fs::read(task_path(vault.path())).unwrap();
    let move_error = application
        .update(TaskUpdateInput {
            target_binding: archived.target_binding.clone().unwrap(),
            expected_revision: archived.revision.clone().unwrap(),
            task_id: "boundary-task".into(),
            change_id: "move-into-archived-list".into(),
            name: "边界任务".into(),
            content: None,
            date: None,
            time: None,
            list_id: Some("archive-destination".into()),
        })
        .unwrap_err();
    assert!(move_error.contains("归档") || move_error.contains("活动"));
    assert_eq!(fs::read(task_path(vault.path())).unwrap(), before_move);
}

#[test]
fn task_list_writes_preserve_atomic_failure_and_vault_binding_boundaries() {
    let vault = TempVault::new("lists-write-failure");
    let initial = app(vault.path());
    let opened = initial.read().unwrap();
    let _created = initial
        .create_list(TaskListCreateInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone(),
            list_id: "failure-list".into(),
            name: "失败保护".into(),
        })
        .unwrap();
    let before = fs::read(task_path(vault.path())).unwrap();
    let failing = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        FailingTaskStore,
    );
    let current = failing.read().unwrap();
    let error = failing
        .rename_list(TaskListRenameInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: current.revision.clone().unwrap(),
            list_id: "failure-list".into(),
            name: "不应写入".into(),
        })
        .unwrap_err();
    assert!(error.contains("injected task save failure"));
    assert_eq!(fs::read(task_path(vault.path())).unwrap(), before);

    let external_document = empty_task_document();
    let racing = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        RacingTaskStore {
            external_document: external_document.clone(),
        },
    );
    let current = racing.read().unwrap();
    let conflict = racing
        .archive_list(TaskListArchiveInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: current.revision.clone().unwrap(),
            list_id: "failure-list".into(),
        })
        .unwrap_err();
    assert!(conflict.contains("外部发生变化"));
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        external_document
    );

    let first_vault = TempVault::new("lists-first-vault");
    let second_vault = TempVault::new("lists-second-vault");
    let selection = SwitchingVault::new(first_vault.path());
    let isolated = TaskApplication::new(selection.clone(), FixedClock, FileTaskStore);
    let first_opened = isolated.read().unwrap();
    let first_list = isolated
        .create_list(TaskListCreateInput {
            target_binding: first_opened.target_binding.clone().unwrap(),
            expected_revision: first_opened.revision.clone(),
            list_id: "first-only-list".into(),
            name: "只属于第一 Vault".into(),
        })
        .unwrap();
    selection.switch_to(second_vault.path());
    let wrong_target = isolated
        .archive_list(TaskListArchiveInput {
            target_binding: first_list.target_binding.clone().unwrap(),
            expected_revision: first_list.revision.clone().unwrap(),
            list_id: "first-only-list".into(),
        })
        .unwrap_err();
    assert!(wrong_target.contains("绑定") || wrong_target.contains("目标"));
    assert!(!task_path(second_vault.path()).exists());
    assert!(
        !app(first_vault.path())
            .read()
            .unwrap()
            .lists
            .iter()
            .find(|list| list.id == "first-only-list")
            .unwrap()
            .archived
    );
}

#[test]
fn task_list_creation_and_cross_list_move_use_the_same_atomic_write_boundary() {
    let new_vault = TempVault::new("list-create-failure");
    let failing = TaskApplication::new(
        SelectedVault(new_vault.path().to_path_buf()),
        FixedClock,
        FailingTaskStore,
    );
    let opened = failing.read().unwrap();
    let create_error = failing
        .create_list(TaskListCreateInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone(),
            list_id: "never-created".into(),
            name: "不能落盘".into(),
        })
        .unwrap_err();
    assert!(create_error.contains("injected task create failure"));
    assert!(!task_path(new_vault.path()).exists());

    let vault = TempVault::new("list-move-conflict");
    let initial = app(vault.path());
    let opened = initial.read().unwrap();
    let list = initial
        .create_list(TaskListCreateInput {
            target_binding: opened.target_binding.clone().unwrap(),
            expected_revision: opened.revision.clone(),
            list_id: "move-source".into(),
            name: "移动来源".into(),
        })
        .unwrap();
    let task = initial
        .create(TaskCreateInput {
            target_binding: list.target_binding.clone().unwrap(),
            expected_revision: list.revision.clone(),
            task_id: "move-conflict-task".into(),
            name: "不能覆盖外部正本".into(),
            content: None,
            date: None,
            time: None,
            list_id: Some("move-source".into()),
        })
        .unwrap();
    let external_document = empty_task_document();
    let racing = TaskApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        FixedClock,
        RacingTaskStore {
            external_document: external_document.clone(),
        },
    );
    let current = racing.read().unwrap();
    let move_error = racing
        .update(TaskUpdateInput {
            target_binding: current.target_binding.clone().unwrap(),
            expected_revision: current.revision.clone().unwrap(),
            task_id: task.tasks[0].id.clone(),
            change_id: "conflicted-cross-list-move".into(),
            name: task.tasks[0].name.clone(),
            content: None,
            date: None,
            time: None,
            list_id: Some("inbox".into()),
        })
        .unwrap_err();
    assert!(move_error.contains("外部发生变化"));
    assert_eq!(
        fs::read(task_path(vault.path())).unwrap(),
        external_document
    );
}
