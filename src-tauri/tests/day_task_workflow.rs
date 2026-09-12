use personal_dashboard_lib::habits::FileHabitSnapshotStore;
use personal_dashboard_lib::today::{
    DayTaskAddInput, DayTaskChangeKind, DayTaskCompletionInput, DayTaskDeleteInput,
    DayTaskRenameInput, DayTaskSourceKind, DayTaskState, DayTaskStore, FileTodayRecordStore,
    TodayApplication, TodayClock, TodayWorkspaceExchange, TodayWorkspacePersistence,
};
use std::cell::RefCell;
use std::fs;
use std::path::{Path, PathBuf};
use std::rc::Rc;
use std::time::{SystemTime, UNIX_EPOCH};

struct TempVault(PathBuf);

impl TempVault {
    fn new(label: &str) -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "personal-dashboard-day-task-{label}-{}-{nonce}",
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
        "2026-09-08".into()
    }

    fn current_time_label(&self) -> String {
        "14:10".into()
    }

    fn current_timestamp_label(&self) -> String {
        "2026-09-08T14:10-04:00".into()
    }
}

fn app(vault: &Path) -> TodayApplication<SelectedVault, NoSelection, FixedClock> {
    TodayApplication::new(SelectedVault(vault.to_path_buf()), NoSelection, FixedClock)
}

fn task_path(vault: &Path, date: &str) -> PathBuf {
    vault
        .join("life/.personal-dashboard/day-tasks/v1")
        .join(&date[..4])
        .join(format!("{date}.json"))
}

fn add_input(
    view: &personal_dashboard_lib::today::TodayView,
    task_id: &str,
    text: &str,
) -> DayTaskAddInput {
    DayTaskAddInput {
        date: view.date.clone(),
        target_binding: view.day_tasks.target_binding.clone().unwrap(),
        expected_revision: view.day_tasks.revision.clone(),
        task_id: task_id.into(),
        text: text.into(),
    }
}

#[test]
fn an_old_vault_reads_empty_without_creating_a_record_and_a_manual_task_survives_relaunch() {
    let vault = TempVault::new("create-relaunch");
    let application = app(vault.path());

    let opened = application.open().unwrap();

    assert_eq!(opened.day_tasks.state, DayTaskState::Empty);
    assert!(opened.day_tasks.tasks.is_empty());
    assert_eq!(opened.day_tasks.revision, None);
    assert!(!vault
        .path()
        .join("life/Journal/Daily/2026/2026-09/2026-09-08.md")
        .exists());

    let added = application
        .add_day_task(add_input(&opened, "manual-laundry-1", "洗衣服"))
        .unwrap();
    let relaunched = app(vault.path()).open().unwrap();

    assert_eq!(added.day_tasks.state, DayTaskState::Ready);
    assert_eq!(relaunched.day_tasks.tasks.len(), 1);
    assert_eq!(relaunched.day_tasks.tasks[0].id, "manual-laundry-1");
    assert_eq!(relaunched.day_tasks.tasks[0].text, "洗衣服");
    assert_eq!(
        relaunched.day_tasks.tasks[0].source.kind,
        DayTaskSourceKind::Manual
    );
    assert_eq!(relaunched.day_tasks.tasks[0].source.reference, None);
    assert_eq!(
        relaunched.day_tasks.tasks[0].created_at,
        "2026-09-08T14:10-04:00"
    );
    assert_eq!(
        relaunched.day_tasks.tasks[0].modified_at,
        "2026-09-08T14:10-04:00"
    );
    assert_eq!(relaunched.day_tasks.tasks[0].completed_at, None);
    assert!(!vault
        .path()
        .join("life/Journal/Daily/2026/2026-09/2026-09-08.md")
        .exists());
}

#[test]
fn rename_complete_reopen_and_delete_keep_identity_history_and_unrelated_markdown() {
    let vault = TempVault::new("manual-lifecycle");
    let record = vault
        .path()
        .join("life/Journal/Daily/2026/2026-09/2026-09-08.md");
    fs::create_dir_all(record.parent().unwrap()).unwrap();
    let original_markdown = b"---\ntype: daily-record\ndate: 2026-09-08\n---\n# 2026-09-08\n\n## User section\n\nKeep **exactly**.\n";
    fs::write(&record, original_markdown).unwrap();
    let application = app(vault.path());
    let opened = application.open().unwrap();
    let added = application
        .add_day_task(add_input(&opened, "manual-grocery-1", "买日用品"))
        .unwrap();

    let renamed = application
        .rename_day_task(DayTaskRenameInput {
            date: added.date.clone(),
            target_binding: added.day_tasks.target_binding.clone().unwrap(),
            expected_revision: added.day_tasks.revision.clone().unwrap(),
            task_id: "manual-grocery-1".into(),
            change_id: "rename-grocery-1".into(),
            text: "去超市买日用品".into(),
        })
        .unwrap();
    let completed = application
        .set_day_task_completion(DayTaskCompletionInput {
            date: renamed.date.clone(),
            target_binding: renamed.day_tasks.target_binding.clone().unwrap(),
            expected_revision: renamed.day_tasks.revision.clone().unwrap(),
            task_id: "manual-grocery-1".into(),
            change_id: "complete-grocery-1".into(),
            completed: true,
        })
        .unwrap();
    let reopened = application
        .set_day_task_completion(DayTaskCompletionInput {
            date: completed.date.clone(),
            target_binding: completed.day_tasks.target_binding.clone().unwrap(),
            expected_revision: completed.day_tasks.revision.clone().unwrap(),
            task_id: "manual-grocery-1".into(),
            change_id: "reopen-grocery-1".into(),
            completed: false,
        })
        .unwrap();

    assert_eq!(reopened.day_tasks.tasks[0].id, "manual-grocery-1");
    assert_eq!(reopened.day_tasks.tasks[0].text, "去超市买日用品");
    assert_eq!(reopened.day_tasks.tasks[0].completed_at, None);
    assert_eq!(
        reopened.day_tasks.tasks[0]
            .changes
            .iter()
            .map(|change| change.kind)
            .collect::<Vec<_>>(),
        vec![
            DayTaskChangeKind::Renamed,
            DayTaskChangeKind::Completed,
            DayTaskChangeKind::Reopened,
        ]
    );
    assert_eq!(
        reopened.day_tasks.tasks[0].changes[0]
            .previous_text
            .as_deref(),
        Some("买日用品")
    );
    assert_eq!(
        reopened.day_tasks.tasks[0].changes[0].new_text.as_deref(),
        Some("去超市买日用品")
    );

    let deleted = application
        .delete_day_task(DayTaskDeleteInput {
            date: reopened.date.clone(),
            target_binding: reopened.day_tasks.target_binding.clone().unwrap(),
            expected_revision: reopened.day_tasks.revision.clone().unwrap(),
            task_id: "manual-grocery-1".into(),
            change_id: "delete-grocery-1".into(),
        })
        .unwrap();

    assert_eq!(deleted.day_tasks.state, DayTaskState::Empty);
    assert!(deleted.day_tasks.tasks.is_empty());
    assert_eq!(fs::read(&record).unwrap(), original_markdown);
    let task_document = fs::read_to_string(task_path(vault.path(), "2026-09-08")).unwrap();
    assert!(task_document.contains("\"id\": \"manual-grocery-1\""));
    assert!(task_document.contains("\"deletedAt\": \"2026-09-08T14:10-04:00\""));
    assert!(task_document.contains("\"kind\": \"deleted\""));
}

#[test]
fn retried_mutations_are_idempotent_even_with_the_original_revision() {
    let vault = TempVault::new("idempotent-retry");
    let application = app(vault.path());
    let opened = application.open().unwrap();
    let added = application
        .add_day_task(add_input(&opened, "manual-mail-1", "寄信"))
        .unwrap();
    let input = DayTaskRenameInput {
        date: added.date.clone(),
        target_binding: added.day_tasks.target_binding.clone().unwrap(),
        expected_revision: added.day_tasks.revision.clone().unwrap(),
        task_id: "manual-mail-1".into(),
        change_id: "rename-mail-1".into(),
        text: "寄出信件".into(),
    };

    let first = application.rename_day_task(input.clone()).unwrap();
    let retried = application.rename_day_task(input).unwrap();

    assert_eq!(retried.day_tasks.revision, first.day_tasks.revision);
    assert_eq!(retried.day_tasks.tasks[0].text, "寄出信件");
    assert_eq!(retried.day_tasks.tasks[0].changes.len(), 1);
}

#[test]
fn two_vaults_keep_independent_task_sets_across_reloads() {
    let first = TempVault::new("isolated-first");
    let second = TempVault::new("isolated-second");
    let first_application = app(first.path());
    let second_application = app(second.path());

    let first_opened = first_application.open().unwrap();
    first_application
        .add_day_task(add_input(&first_opened, "manual-first-1", "第一库任务"))
        .unwrap();
    let second_opened = second_application.open().unwrap();
    second_application
        .add_day_task(add_input(&second_opened, "manual-second-1", "第二库任务"))
        .unwrap();

    let first_reloaded = app(first.path()).open().unwrap();
    let second_reloaded = app(second.path()).open().unwrap();
    assert_eq!(first_reloaded.day_tasks.tasks.len(), 1);
    assert_eq!(first_reloaded.day_tasks.tasks[0].id, "manual-first-1");
    assert_eq!(second_reloaded.day_tasks.tasks.len(), 1);
    assert_eq!(second_reloaded.day_tasks.tasks[0].id, "manual-second-1");
}

#[test]
fn malformed_or_unsupported_task_data_is_an_error_and_cannot_be_overwritten_as_empty() {
    for (label, document) in [
        ("malformed", b"{not-json".as_slice()),
        (
            "unsupported",
            br#"{"schemaVersion":2,"date":"2026-09-08","tasks":[]}"#.as_slice(),
        ),
    ] {
        let vault = TempVault::new(label);
        let path = task_path(vault.path(), "2026-09-08");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(&path, document).unwrap();
        let application = app(vault.path());

        let opened = application.open().unwrap();
        assert_eq!(opened.day_tasks.state, DayTaskState::Error);
        assert!(opened.day_tasks.tasks.is_empty());
        assert!(opened.day_tasks.message.contains(if label == "malformed" {
            "有效 JSON"
        } else {
            "不支持"
        }));

        let error = application
            .add_day_task(add_input(&opened, "manual-new-1", "不能覆盖"))
            .expect_err("invalid canonical data must fail closed");
        assert!(error.contains(if label == "malformed" {
            "有效 JSON"
        } else {
            "不支持"
        }));
        assert_eq!(fs::read(path).unwrap(), document);
    }
}

#[test]
fn inconsistent_task_history_fails_closed() {
    let vault = TempVault::new("invalid-history");
    let path = task_path(vault.path(), "2026-09-08");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let document = r#"{
  "schemaVersion": 1,
  "date": "2026-09-08",
  "tasks": [{
    "id": "manual-invalid-1",
    "text": "未完成任务",
    "source": { "kind": "manual", "reference": null },
    "createdAt": "2026-09-08T14:00-04:00",
    "modifiedAt": "2026-09-08T14:10-04:00",
    "completedAt": null,
    "deletedAt": null,
    "changes": [{
      "id": "complete-invalid-1",
      "kind": "completed",
      "changedAt": "2026-09-08T14:10-04:00",
      "previousText": "不应出现",
      "newText": null
    }]
  }]
}"#
    .as_bytes();
    fs::write(&path, document).unwrap();

    let opened = app(vault.path()).open().unwrap();

    assert_eq!(opened.day_tasks.state, DayTaskState::Error);
    assert!(opened
        .day_tasks
        .message
        .contains("完成、取消完成或删除记录不能携带任务文字"));
    assert_eq!(fs::read(path).unwrap(), document);
}

#[test]
fn impossible_task_timestamps_fail_closed() {
    let vault = TempVault::new("invalid-timestamp");
    let path = task_path(vault.path(), "2026-09-08");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let document = r#"{
  "schemaVersion": 1,
  "date": "2026-09-08",
  "tasks": [{
    "id": "manual-invalid-time",
    "text": "invalid time",
    "source": { "kind": "manual", "reference": null },
    "createdAt": "2026-99-99T99:99+99:99",
    "modifiedAt": "2026-99-99T99:99+99:99",
    "completedAt": null,
    "deletedAt": null,
    "changes": []
  }]
}"#
    .as_bytes();
    fs::write(&path, document).unwrap();

    let opened = app(vault.path()).open().unwrap();

    assert_eq!(opened.day_tasks.state, DayTaskState::Error);
    assert!(opened.day_tasks.message.contains("无效时间戳"));
    assert_eq!(fs::read(path).unwrap(), document);
}

#[test]
fn duplicate_daily_flow_references_fail_closed() {
    let vault = TempVault::new("duplicate-producer-reference");
    let path = task_path(vault.path(), "2026-09-08");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let task = |id: &str, text: &str| {
        format!(
            r#"{{"id":"{id}","text":"{text}","source":{{"kind":"daily-flow","reference":"plan-item-1"}},"createdAt":"2026-09-08T14:00-04:00","modifiedAt":"2026-09-08T14:00-04:00","completedAt":null,"deletedAt":null,"changes":[]}}"#
        )
    };
    let document = format!(
        r#"{{"schemaVersion":1,"date":"2026-09-08","tasks":[{},{}]}}"#,
        task("flow-one", "first"),
        task("flow-two", "second")
    );
    fs::write(&path, &document).unwrap();

    let opened = app(vault.path()).open().unwrap();

    assert_eq!(opened.day_tasks.state, DayTaskState::Error);
    assert!(opened.day_tasks.message.contains("重复 producer 来源标识"));
    assert_eq!(fs::read_to_string(path).unwrap(), document);
}

#[test]
fn stale_task_revision_preserves_an_external_edit_and_other_dates_do_not_carry_over() {
    let vault = TempVault::new("stale-and-date");
    let application = app(vault.path());
    let opened = application.open().unwrap();
    let added = application
        .add_day_task(add_input(&opened, "manual-laundry-1", "洗衣服"))
        .unwrap();
    let path = task_path(vault.path(), "2026-09-08");
    let external = fs::read_to_string(&path)
        .unwrap()
        .replace("洗衣服", "外部编辑保留");
    fs::write(&path, &external).unwrap();

    let error = application
        .set_day_task_completion(DayTaskCompletionInput {
            date: added.date.clone(),
            target_binding: added.day_tasks.target_binding.clone().unwrap(),
            expected_revision: added.day_tasks.revision.clone().unwrap(),
            task_id: "manual-laundry-1".into(),
            change_id: "complete-after-external-edit".into(),
            completed: true,
        })
        .expect_err("a stale task write must conflict");

    assert!(error.contains("外部发生变化"));
    assert_eq!(fs::read_to_string(path).unwrap(), external);
    let previous_day = application.open_date("2026-09-07").unwrap();
    assert_eq!(previous_day.day_tasks.state, DayTaskState::Empty);
    assert!(previous_day.day_tasks.tasks.is_empty());
}

#[derive(Clone)]
struct SwitchingVault(Rc<RefCell<PathBuf>>);

impl TodayWorkspacePersistence for SwitchingVault {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(self.0.borrow().clone()))
    }

    fn save_selected_vault(&self, vault: &Path) -> Result<(), String> {
        *self.0.borrow_mut() = vault.to_path_buf();
        Ok(())
    }
}

#[test]
fn a_task_operation_cannot_cross_into_a_newly_selected_vault() {
    let first = TempVault::new("first-vault");
    let second = TempVault::new("second-vault");
    let selected = Rc::new(RefCell::new(first.path().to_path_buf()));
    let application =
        TodayApplication::new(SwitchingVault(selected.clone()), NoSelection, FixedClock);
    let opened = application.open().unwrap();
    *selected.borrow_mut() = second.path().to_path_buf();

    let error = application
        .add_day_task(add_input(&opened, "manual-wrong-vault", "不能写错 Vault"))
        .expect_err("the old target binding must not write to the new Vault");

    assert!(error.contains("Vault 或任务日期已经变化"));
    assert!(!task_path(first.path(), "2026-09-08").exists());
    assert!(!task_path(second.path(), "2026-09-08").exists());
}

struct FailingDayTaskStore;

impl DayTaskStore for FailingDayTaskStore {
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
        Err("synthetic day-task write failure".into())
    }

    fn create_new(&self, _path: &Path, _document: &[u8]) -> Result<(), String> {
        Err("synthetic day-task create failure".into())
    }
}

#[test]
fn a_failed_first_task_create_leaves_no_document_and_can_be_retried() {
    let vault = TempVault::new("create-failure");
    let application = TodayApplication::with_all_stores(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        FixedClock,
        FileTodayRecordStore,
        FileHabitSnapshotStore,
        FailingDayTaskStore,
    );
    let opened = application.open().unwrap();
    let input = add_input(&opened, "manual-create-failed", "保留新增操作");

    let error = application
        .add_day_task(input.clone())
        .expect_err("the synthetic create failure must be returned");

    assert!(error.contains("synthetic day-task create failure"));
    assert!(!task_path(vault.path(), "2026-09-08").exists());
    let retried = app(vault.path()).add_day_task(input).unwrap();
    assert_eq!(retried.day_tasks.tasks[0].id, "manual-create-failed");
}

#[test]
fn a_failed_task_write_leaves_the_confirmed_document_unchanged() {
    let vault = TempVault::new("write-failure");
    let added = {
        let application = app(vault.path());
        let opened = application.open().unwrap();
        application
            .add_day_task(add_input(&opened, "manual-clean-1", "收拾屋子"))
            .unwrap()
    };
    let path = task_path(vault.path(), "2026-09-08");
    let before = fs::read(&path).unwrap();
    let application = TodayApplication::with_all_stores(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        FixedClock,
        FileTodayRecordStore,
        FileHabitSnapshotStore,
        FailingDayTaskStore,
    );

    let error = application
        .rename_day_task(DayTaskRenameInput {
            date: added.date,
            target_binding: added.day_tasks.target_binding.unwrap(),
            expected_revision: added.day_tasks.revision.unwrap(),
            task_id: "manual-clean-1".into(),
            change_id: "rename-clean-failed".into(),
            text: "收拾客厅".into(),
        })
        .expect_err("the store failure must be returned");

    assert!(error.contains("synthetic day-task write failure"));
    assert_eq!(fs::read(path).unwrap(), before);
}
