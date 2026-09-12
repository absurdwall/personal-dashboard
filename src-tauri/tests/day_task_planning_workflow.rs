use personal_dashboard_lib::habits::FileHabitSnapshotStore;
use personal_dashboard_lib::today::{
    DayTaskCompletionInput, DayTaskDeleteInput, DayTaskRenameInput, DayTaskSourceKind,
    DayTaskState, DayTaskStore, FileDayTaskStore, FileTodayRecordStore, PlanningDayTaskStatus,
    TodayApplication, TodayClock, TodayWorkspaceExchange, TodayWorkspacePersistence,
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
            "personal-dashboard-day-task-planning-{label}-{}-{nonce}",
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

fn plan_path(vault: &Path, date: &str) -> PathBuf {
    vault
        .join("life/.personal-dashboard/day-task-plans/v1")
        .join(&date[..4])
        .join(format!("{date}.json"))
}

fn task_path(vault: &Path, date: &str) -> PathBuf {
    vault
        .join("life/.personal-dashboard/day-tasks/v1")
        .join(&date[..4])
        .join(format!("{date}.json"))
}

fn write_plan(vault: &Path, date: &str, candidates: &str) {
    let plan = plan_path(vault, date);
    fs::create_dir_all(plan.parent().unwrap()).unwrap();
    fs::write(
        plan,
        format!(
            "{{\n  \"schemaVersion\": 1,\n  \"date\": \"{date}\",\n  \"candidates\": [\n{candidates}\n  ]\n}}"
        ),
    )
    .unwrap();
}

#[test]
fn structured_actions_enter_today_suggestions_do_not_and_rereading_is_idempotent() {
    let vault = TempVault::new("action-suggestion");
    let record = vault
        .path()
        .join("life/Journal/Daily/2026/2026-09/2026-09-08.md");
    fs::create_dir_all(record.parent().unwrap()).unwrap();
    let original_markdown = "---\ntype: daily-record\ndate: 2026-09-08\n---\n# 2026-09-08\n\n## 晚间复盘\n\nKeep this review exactly.\n"
        .as_bytes();
    fs::write(&record, original_markdown).unwrap();
    let plan = plan_path(vault.path(), "2026-09-08");
    fs::create_dir_all(plan.parent().unwrap()).unwrap();
    fs::write(
        &plan,
        r#"{
  "schemaVersion": 1,
  "date": "2026-09-08",
  "candidates": [
    {
      "kind": "action",
      "taskId": "flow-laundry-1",
      "sourceReference": "morning-plan-laundry-1",
      "text": "洗衣服"
    },
    {
      "kind": "suggestion",
      "sourceReference": "morning-plan-walk-idea",
      "text": "如果有空可以散步"
    }
  ]
}"#,
    )
    .unwrap();
    let application = app(vault.path());

    let first = application.open().unwrap();
    let second = application.open().unwrap();

    assert_eq!(first.day_tasks.tasks.len(), 1);
    assert_eq!(first.day_tasks.tasks[0].id, "flow-laundry-1");
    assert_eq!(first.day_tasks.tasks[0].text, "洗衣服");
    assert_eq!(
        first.day_tasks.tasks[0].source.kind,
        DayTaskSourceKind::DailyFlow
    );
    assert_eq!(
        first.day_tasks.tasks[0].source.reference.as_deref(),
        Some("morning-plan-laundry-1")
    );
    assert_eq!(second.day_tasks.tasks.len(), 1);
    assert_eq!(second.day_tasks.revision, first.day_tasks.revision);
    assert_eq!(fs::read(&record).unwrap(), original_markdown);
}

#[test]
fn replanning_reorders_only_unconfirmed_flow_tasks_and_never_resurrects_a_tombstone() {
    let vault = TempVault::new("replan-preservation");
    write_plan(
        vault.path(),
        "2026-09-08",
        r#"    {"kind":"action","taskId":"flow-a","sourceReference":"plan-a","text":"原始 A"},
    {"kind":"action","taskId":"flow-b","sourceReference":"plan-b","text":"原始 B"},
    {"kind":"action","taskId":"flow-c","sourceReference":"plan-c","text":"原始 C"}"#,
    );
    let application = app(vault.path());
    let opened = application.open().unwrap();
    let renamed = application
        .rename_day_task(DayTaskRenameInput {
            date: opened.date.clone(),
            target_binding: opened.day_tasks.target_binding.clone().unwrap(),
            expected_revision: opened.day_tasks.revision.clone().unwrap(),
            task_id: "flow-a".into(),
            change_id: "rename-flow-a".into(),
            text: "用户保留的 A 改名".into(),
        })
        .unwrap();
    let completed = application
        .set_day_task_completion(DayTaskCompletionInput {
            date: renamed.date.clone(),
            target_binding: renamed.day_tasks.target_binding.clone().unwrap(),
            expected_revision: renamed.day_tasks.revision.clone().unwrap(),
            task_id: "flow-b".into(),
            change_id: "complete-flow-b".into(),
            completed: true,
        })
        .unwrap();

    write_plan(
        vault.path(),
        "2026-09-08",
        r#"    {"kind":"action","taskId":"flow-c","sourceReference":"plan-c","text":"上游 C 新文字"},
    {"kind":"action","taskId":"flow-a","sourceReference":"plan-a","text":"上游 A 新文字"},
    {"kind":"action","taskId":"flow-b","sourceReference":"plan-b","text":"上游 B 新文字"}"#,
    );
    let replanned = application.open().unwrap();

    assert_eq!(
        replanned
            .day_tasks
            .tasks
            .iter()
            .map(|task| task.id.as_str())
            .collect::<Vec<_>>(),
        vec!["flow-c", "flow-b", "flow-a"]
    );
    assert_eq!(replanned.day_tasks.tasks[2].text, "用户保留的 A 改名");
    assert!(replanned.day_tasks.tasks[1].completed_at.is_some());

    let deleted = application
        .delete_day_task(DayTaskDeleteInput {
            date: replanned.date.clone(),
            target_binding: replanned.day_tasks.target_binding.clone().unwrap(),
            expected_revision: replanned.day_tasks.revision.clone().unwrap(),
            task_id: "flow-c".into(),
            change_id: "delete-flow-c".into(),
        })
        .unwrap();
    assert!(deleted
        .day_tasks
        .tasks
        .iter()
        .all(|task| task.id != "flow-c"));
    assert!(application
        .open()
        .unwrap()
        .day_tasks
        .tasks
        .iter()
        .all(|task| task.id != "flow-c"));

    write_plan(
        vault.path(),
        "2026-09-08",
        r#"    {"kind":"action","taskId":"flow-c-2","sourceReference":"plan-c","text":"不能借旧来源复活"}"#,
    );
    let rejected_reuse = application.open().unwrap();
    assert!(rejected_reuse
        .day_tasks
        .message
        .contains("来源身份已绑定到另一任务"));
    assert!(rejected_reuse
        .day_tasks
        .tasks
        .iter()
        .all(|task| task.id != "flow-c" && task.id != "flow-c-2"));

    write_plan(
        vault.path(),
        "2026-09-08",
        r#"    {"kind":"action","taskId":"flow-c-2","sourceReference":"plan-c-2","text":"明确重新安排 C"},
    {"kind":"action","taskId":"flow-c","sourceReference":"plan-c","text":"旧候选 C"}"#,
    );
    let rearranged = application.open().unwrap();
    assert!(rearranged
        .day_tasks
        .tasks
        .iter()
        .any(|task| task.id == "flow-c-2" && task.text == "明确重新安排 C"));
    assert!(rearranged
        .day_tasks
        .tasks
        .iter()
        .all(|task| task.id != "flow-c"));
    assert_eq!(completed.day_tasks.tasks[1].id, "flow-b");
}

#[test]
fn a_partial_candidate_rejects_the_whole_plan_without_hiding_or_changing_existing_tasks() {
    let vault = TempVault::new("partial-plan");
    write_plan(
        vault.path(),
        "2026-09-08",
        r#"    {"kind":"action","taskId":"flow-existing","sourceReference":"plan-existing","text":"保留已有任务"}"#,
    );
    let application = app(vault.path());
    let accepted = application.open().unwrap();
    assert_eq!(accepted.day_tasks.tasks.len(), 1);
    let canonical = task_path(vault.path(), "2026-09-08");
    let before = fs::read(&canonical).unwrap();
    fs::write(
        plan_path(vault.path(), "2026-09-08"),
        r#"{
  "schemaVersion": 1,
  "date": "2026-09-08",
  "candidates": [
    {"kind":"action","taskId":"flow-must-not-appear","sourceReference":"plan-new","text":"不能部分接收"},
    {"kind":"action","taskId":"flow-partial","sourceReference":"plan-partial"}
  ]
}"#,
    )
    .unwrap();

    let rejected = application.open().unwrap();

    assert_eq!(rejected.day_tasks.state, DayTaskState::Ready);
    assert_eq!(rejected.day_tasks.tasks.len(), 1);
    assert_eq!(rejected.day_tasks.tasks[0].id, "flow-existing");
    assert!(rejected.day_tasks.message.contains("规划任务输入"));
    assert_eq!(fs::read(canonical).unwrap(), before);
}

#[test]
fn a_local_task_mutation_does_not_receive_a_new_plan_until_explicit_refresh() {
    let vault = TempVault::new("mutation-refresh-boundary");
    write_plan(
        vault.path(),
        "2026-09-08",
        r#"    {"kind":"action","taskId":"flow-a","sourceReference":"plan-a","text":"任务 A"}"#,
    );
    let application = app(vault.path());
    let opened = application.open().unwrap();
    write_plan(
        vault.path(),
        "2026-09-08",
        r#"    {"kind":"action","taskId":"flow-a","sourceReference":"plan-a","text":"上游 A"},
    {"kind":"action","taskId":"flow-b","sourceReference":"plan-b","text":"任务 B"}"#,
    );

    let renamed = application
        .rename_day_task(DayTaskRenameInput {
            date: opened.date.clone(),
            target_binding: opened.day_tasks.target_binding.clone().unwrap(),
            expected_revision: opened.day_tasks.revision.clone().unwrap(),
            task_id: "flow-a".into(),
            change_id: "rename-with-pending-plan".into(),
            text: "用户改名 A".into(),
        })
        .unwrap();

    assert_eq!(renamed.day_tasks.tasks.len(), 1);
    assert_eq!(renamed.day_tasks.tasks[0].text, "用户改名 A");
    assert!(renamed
        .day_tasks
        .tasks
        .iter()
        .all(|task| task.id != "flow-b"));

    let refreshed = application.open().unwrap();
    assert_eq!(refreshed.day_tasks.tasks.len(), 2);
    assert_eq!(refreshed.day_tasks.tasks[0].text, "用户改名 A");
    assert_eq!(refreshed.day_tasks.tasks[1].id, "flow-b");
}

#[test]
fn calendar_and_other_summary_reads_do_not_receive_pending_planning_input() {
    let vault = TempVault::new("summary-read-boundary");
    write_plan(
        vault.path(),
        "2026-09-08",
        r#"    {"kind":"action","taskId":"flow-summary","sourceReference":"plan-summary","text":"摘要读取不能接收"}"#,
    );
    let application = app(vault.path());

    let summary = application.read_date("2026-09-08").unwrap();
    let month = application.calendar_month(2026, 9).unwrap();

    assert!(summary.day_tasks.tasks.is_empty());
    assert!(!task_path(vault.path(), "2026-09-08").exists());
    assert_eq!(month.days.len(), 42);
    assert!(!task_path(vault.path(), "2026-09-08").exists());

    let explicitly_opened = application.open().unwrap();
    assert_eq!(explicitly_opened.day_tasks.tasks.len(), 1);
    assert_eq!(explicitly_opened.day_tasks.tasks[0].id, "flow-summary");
}

#[test]
fn planning_reader_exposes_yesterdays_completed_and_unconfirmed_tasks_without_carryover() {
    let vault = TempVault::new("planning-reader");
    write_plan(
        vault.path(),
        "2026-09-07",
        r#"    {"kind":"action","taskId":"flow-done","sourceReference":"yesterday-done","text":"昨日已确认"},
    {"kind":"action","taskId":"flow-unknown","sourceReference":"yesterday-unknown","text":"昨日未确认"}"#,
    );
    let application = app(vault.path());
    let yesterday = application.open_date("2026-09-07").unwrap();
    application
        .set_day_task_completion(DayTaskCompletionInput {
            date: yesterday.date.clone(),
            target_binding: yesterday.day_tasks.target_binding.clone().unwrap(),
            expected_revision: yesterday.day_tasks.revision.clone().unwrap(),
            task_id: "flow-done".into(),
            change_id: "complete-yesterday".into(),
            completed: true,
        })
        .unwrap();

    let context = application.planning_day_task_context("2026-09-07").unwrap();

    assert_eq!(context.schema_version, 1);
    assert_eq!(context.date, "2026-09-07");
    assert_eq!(context.tasks.len(), 2);
    assert_eq!(context.tasks[0].status, PlanningDayTaskStatus::Completed);
    assert_eq!(context.tasks[1].status, PlanningDayTaskStatus::Unconfirmed);
    assert_eq!(
        context.tasks[1].source.reference.as_deref(),
        Some("yesterday-unknown")
    );
    let today = application.open().unwrap();
    assert!(today.day_tasks.tasks.is_empty());
    assert!(!task_path(vault.path(), "2026-09-08").exists());
    assert!(!vault
        .path()
        .join("life/Journal/Daily/2026/2026-09/2026-09-08.md")
        .exists());
}

struct InterleavingDayTaskStore {
    interleave_next_save: Cell<bool>,
}

impl DayTaskStore for InterleavingDayTaskStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        FileDayTaskStore.load(path)
    }

    fn save_if_unchanged(
        &self,
        path: &Path,
        expected: &[u8],
        updated: &[u8],
    ) -> Result<(), String> {
        if self.interleave_next_save.replace(false) {
            let external = String::from_utf8(expected.to_vec())
                .unwrap()
                .replace("原始任务", "外部编辑保留");
            fs::write(path, external).unwrap();
        }
        FileDayTaskStore.save_if_unchanged(path, expected, updated)
    }

    fn create_new(&self, path: &Path, document: &[u8]) -> Result<(), String> {
        FileDayTaskStore.create_new(path, document)
    }
}

#[test]
fn producer_merge_conflict_preserves_the_external_document_and_is_retryable() {
    let vault = TempVault::new("producer-conflict");
    write_plan(
        vault.path(),
        "2026-09-08",
        r#"    {"kind":"action","taskId":"flow-original","sourceReference":"plan-original","text":"原始任务"}"#,
    );
    app(vault.path()).open().unwrap();
    write_plan(
        vault.path(),
        "2026-09-08",
        r#"    {"kind":"action","taskId":"flow-original","sourceReference":"plan-original","text":"原始任务"},
    {"kind":"action","taskId":"flow-new","sourceReference":"plan-new","text":"重读后加入"}"#,
    );
    let application = TodayApplication::with_all_stores(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        FixedClock,
        FileTodayRecordStore,
        FileHabitSnapshotStore,
        InterleavingDayTaskStore {
            interleave_next_save: Cell::new(true),
        },
    );

    let conflicted = application.open().unwrap();

    assert_eq!(conflicted.day_tasks.state, DayTaskState::Ready);
    assert!(conflicted.day_tasks.message.contains("外部发生变化"));
    assert_eq!(conflicted.day_tasks.tasks.len(), 1);
    assert_eq!(conflicted.day_tasks.tasks[0].text, "外部编辑保留");
    let after_conflict = fs::read_to_string(task_path(vault.path(), "2026-09-08")).unwrap();
    assert!(after_conflict.contains("外部编辑保留"));
    assert!(!after_conflict.contains("flow-new"));

    let retried = app(vault.path()).open().unwrap();
    assert_eq!(retried.day_tasks.tasks.len(), 2);
    assert_eq!(retried.day_tasks.tasks[0].text, "外部编辑保留");
    assert_eq!(retried.day_tasks.tasks[1].id, "flow-new");
}
