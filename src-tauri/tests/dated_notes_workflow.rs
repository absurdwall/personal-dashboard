use personal_dashboard_lib::today::{
    DatedNoteCorrectionInput, DatedNoteInput, ShortRecordCategory, TodayApplication, TodayClock,
    TodayState, TodayWorkspaceExchange, TodayWorkspacePersistence,
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
struct SelectedVault(Rc<RefCell<PathBuf>>);

impl TodayWorkspacePersistence for SelectedVault {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(self.0.borrow().clone()))
    }

    fn save_selected_vault(&self, vault: &Path) -> Result<(), String> {
        *self.0.borrow_mut() = vault.to_path_buf();
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
struct AdjustableClock {
    date: Rc<RefCell<String>>,
    timestamp: Rc<RefCell<String>>,
}

impl AdjustableClock {
    fn new(date: &str, timestamp: &str) -> Self {
        Self {
            date: Rc::new(RefCell::new(date.to_owned())),
            timestamp: Rc::new(RefCell::new(timestamp.to_owned())),
        }
    }
}

impl TodayClock for AdjustableClock {
    fn current_date(&self) -> String {
        self.date.borrow().clone()
    }

    fn current_time_label(&self) -> String {
        self.timestamp.borrow()[11..16].to_owned()
    }

    fn current_timestamp_label(&self) -> String {
        self.timestamp.borrow().clone()
    }
}

fn record_path(vault: &Path, date: &str) -> PathBuf {
    vault
        .join("life/Journal/Daily")
        .join(&date[..4])
        .join(&date[..7])
        .join(format!("{date}.md"))
}

fn write_record(vault: &Path, date: &str, body: &str) {
    let path = record_path(vault, date);
    fs::create_dir_all(path.parent().expect("record parent should exist"))
        .expect("record directory should exist");
    fs::write(
        path,
        format!("---\ntype: daily-record\ndate: {date}\n---\n# {date}\n\n{body}"),
    )
    .expect("record should be written");
}

fn app(
    vault: &Path,
    clock: AdjustableClock,
) -> TodayApplication<SelectedVault, NoSelection, AdjustableClock> {
    TodayApplication::new(
        SelectedVault(Rc::new(RefCell::new(vault.to_path_buf()))),
        NoSelection,
        clock,
    )
}

fn add_input(view: &personal_dashboard_lib::today::TodayView, text: &str) -> DatedNoteInput {
    DatedNoteInput {
        date: view.date.clone(),
        target_binding: view
            .target_binding
            .clone()
            .expect("writable target binding"),
        expected_revision: view.revision.clone(),
        entry_id: "note-1".into(),
        category: ShortRecordCategory::Exercise,
        content: text.into(),
    }
}

#[test]
fn selected_historical_day_stays_the_save_target_across_midnight() {
    let vault = TempDirectory::new("dated-note-midnight");
    write_record(
        vault.path(),
        "2026-08-09",
        "## 白天更新\n\n原有任意 Markdown。\n",
    );
    write_record(
        vault.path(),
        "2026-08-10",
        "## 白天更新\n\n今天原有内容。\n",
    );
    let clock = AdjustableClock::new("2026-08-10", "2026-08-10T23:59-04:00");
    let application = app(vault.path(), clock.clone());
    let loaded = application
        .open_date("2026-08-09")
        .expect("history should load");

    *clock.date.borrow_mut() = "2026-08-11".into();
    *clock.timestamp.borrow_mut() = "2026-08-11T00:01-04:00".into();
    let saved = application
        .add_dated_note(add_input(&loaded, "跑步 30 分钟"))
        .expect("loaded historical target should save");

    assert_eq!(saved.date, "2026-08-09");
    assert_eq!(saved.daytime.short_records[0].text, "跑步 30 分钟");
    assert!(fs::read_to_string(record_path(vault.path(), "2026-08-10"))
        .expect("today record")
        .contains("今天原有内容。"));
    assert!(!fs::read_to_string(record_path(vault.path(), "2026-08-10"))
        .expect("today record")
        .contains("跑步 30 分钟"));
}

#[test]
fn add_and_multiple_corrections_keep_one_id_and_an_append_only_trace() {
    let vault = TempDirectory::new("dated-note-corrections");
    write_record(
        vault.path(),
        "2026-08-10",
        "## 白天更新\n\n保留 **未知段落**。\n\n### 简短记录\n\n- 用户手写短句。\n\n### 修改记录\n\n- 用户手写修改说明。\n\n## 晚间复盘\n\n### 今天发生了什么\n\n- Agent 原文。\n",
    );
    let clock = AdjustableClock::new("2026-08-10", "2026-08-10T14:10-04:00");
    let application = app(vault.path(), clock.clone());
    let opened = application.open().expect("record should load");
    let added = application
        .add_dated_note(add_input(&opened, "跑步 30 分钟"))
        .expect("note should save");

    *clock.timestamp.borrow_mut() = "2026-08-10T15:20-04:00".into();
    let corrected = application
        .correct_dated_note(DatedNoteCorrectionInput {
            date: added.date.clone(),
            target_binding: added.target_binding.clone().unwrap(),
            expected_revision: added.revision.clone().unwrap(),
            entry_id: "note-1".into(),
            change_id: "change-1".into(),
            content: "跑步 20 分钟".into(),
        })
        .expect("first correction should save");
    *clock.timestamp.borrow_mut() = "2026-08-10T16:30-04:00".into();
    let corrected = application
        .correct_dated_note(DatedNoteCorrectionInput {
            date: corrected.date.clone(),
            target_binding: corrected.target_binding.clone().unwrap(),
            expected_revision: corrected.revision.clone().unwrap(),
            entry_id: "note-1".into(),
            change_id: "change-2".into(),
            content: "跑步 25 分钟".into(),
        })
        .expect("second correction should save");

    let note = &corrected.daytime.short_records[0];
    assert!(corrected
        .daytime
        .updates
        .iter()
        .any(|update| update.title == "简短记录" && update.neutral == vec!["用户手写短句。"]));
    assert!(corrected
        .daytime
        .updates
        .iter()
        .any(|update| update.title == "修改记录" && update.neutral == vec!["用户手写修改说明。"]));
    assert_eq!(note.id, "note-1");
    assert_eq!(note.category, ShortRecordCategory::Exercise);
    assert_eq!(note.text, "跑步 25 分钟");
    assert_eq!(note.created_at, "2026-08-10T14:10-04:00");
    assert_eq!(note.changes.len(), 2);
    assert_eq!(note.changes[0].old_text, "跑步 30 分钟");
    assert_eq!(note.changes[0].new_text, "跑步 20 分钟");
    assert_eq!(note.changes[0].modified_at, "2026-08-10T15:20-04:00");
    assert_eq!(note.changes[1].old_text, "跑步 20 分钟");
    assert_eq!(note.changes[1].new_text, "跑步 25 分钟");
    assert_eq!(
        corrected.evening.record_supplements,
        corrected.daytime.short_records
    );
    assert!(corrected.evening.has_later_record_revision);

    let markdown =
        fs::read_to_string(record_path(vault.path(), "2026-08-10")).expect("record should persist");
    assert!(markdown.contains("保留 **未知段落**。"));
    assert!(markdown.contains("- Agent 原文。"));
    assert!(markdown.contains("2026-08-10T15:20-04:00"));
    assert!(markdown.contains("2026-08-10T16:30-04:00"));

    fs::write(
        record_path(vault.path(), "2026-08-10"),
        markdown.replace("needs-review=true", "needs-review=false"),
    )
    .expect("a later Agent review should be able to acknowledge integrated supplements");
    let integrated = application.open().expect("integrated review should reopen");
    assert!(!integrated.evening.has_later_record_revision);
}

#[test]
fn explicit_save_exclusively_creates_a_minimal_past_record_but_never_a_future_fact() {
    let vault = TempDirectory::new("dated-note-create");
    let clock = AdjustableClock::new("2026-08-10", "2026-08-10T14:10-04:00");
    let application = app(vault.path(), clock);
    let missing = application
        .open_date("2026-08-09")
        .expect("missing day should open");
    let concurrent_missing = application
        .open_date("2026-08-09")
        .expect("a concurrent reader should also see the missing day");
    assert_eq!(missing.state, TodayState::Missing);
    let created = application
        .add_dated_note(add_input(&missing, "和家人通话"))
        .expect("explicit save should create the record");
    assert_eq!(created.state, TodayState::Ready);
    let markdown = fs::read_to_string(record_path(vault.path(), "2026-08-09")).unwrap();
    assert!(markdown.contains("type: daily-record\ndate: 2026-08-09"));
    assert!(markdown.contains("## 白天更新"));
    assert!(!markdown.contains("## 早间基准"));
    assert!(!markdown.contains("## 晚间复盘"));
    let mut concurrent_input = add_input(&concurrent_missing, "并发候选");
    concurrent_input.entry_id = "note-2".into();
    let concurrent_error = application
        .add_dated_note(concurrent_input)
        .expect_err("a stale missing-state save must not replace the created record");
    assert!(concurrent_error.contains("已被创建"));
    assert!(!fs::read_to_string(record_path(vault.path(), "2026-08-09"))
        .unwrap()
        .contains("并发候选"));
    assert!(!created.evening.has_later_record_revision);
    let created_path = record_path(vault.path(), "2026-08-09");
    let mut with_later_review = fs::read_to_string(&created_path).unwrap();
    with_later_review.push_str("\n## 晚间复盘\n\n### 今天发生了什么\n\n- Agent 后来整合。\n");
    fs::write(&created_path, with_later_review).unwrap();
    let reviewed = application.open_date("2026-08-09").unwrap();
    assert!(!reviewed.evening.has_later_record_revision);

    let future = application
        .open_date("2026-08-11")
        .expect("future day should open");
    let error = application
        .add_dated_note(add_input(&future, "未来已经完成"))
        .expect_err("future happened fact must be rejected");
    assert!(error.contains("未来日期"));
    assert!(!record_path(vault.path(), "2026-08-11").exists());
}

#[test]
fn stale_revision_and_changed_vault_preserve_external_content() {
    let first = TempDirectory::new("dated-note-first-vault");
    let second = TempDirectory::new("dated-note-second-vault");
    write_record(first.path(), "2026-08-10", "## 白天更新\n\n原文。\n");
    write_record(
        second.path(),
        "2026-08-10",
        "## 白天更新\n\n另一个 Vault。\n",
    );
    let selected = Rc::new(RefCell::new(first.path().to_path_buf()));
    let application = TodayApplication::new(
        SelectedVault(selected.clone()),
        NoSelection,
        AdjustableClock::new("2026-08-10", "2026-08-10T14:10-04:00"),
    );
    let loaded = application.open().expect("first vault should load");
    fs::write(record_path(first.path(), "2026-08-10"), "external edit")
        .expect("external edit should land");
    assert!(application
        .add_dated_note(add_input(&loaded, "用户草稿"))
        .expect_err("stale revision must fail")
        .contains("外部发生变化"));
    assert_eq!(
        fs::read_to_string(record_path(first.path(), "2026-08-10")).unwrap(),
        "external edit"
    );

    write_record(first.path(), "2026-08-10", "## 白天更新\n\n原文。\n");
    let loaded = application.open().expect("first vault should reload");
    *selected.borrow_mut() = second.path().to_path_buf();
    assert!(application
        .add_dated_note(add_input(&loaded, "不能写错 Vault"))
        .expect_err("changed vault must fail")
        .contains("保存目标"));
    assert!(
        !fs::read_to_string(record_path(second.path(), "2026-08-10"))
            .unwrap()
            .contains("不能写错 Vault")
    );
}

#[test]
fn duplicate_add_and_correction_clicks_are_idempotent_and_unknown_ids_fail() {
    let vault = TempDirectory::new("dated-note-idempotency");
    write_record(vault.path(), "2026-08-10", "## 白天更新\n");
    let application = app(
        vault.path(),
        AdjustableClock::new("2026-08-10", "2026-08-10T14:10-04:00"),
    );
    let opened = application.open().unwrap();
    let input = add_input(&opened, "散步 20 分钟");
    let added = application.add_dated_note(input.clone()).unwrap();
    let duplicate = application
        .add_dated_note(input)
        .expect("same entry retry should be idempotent");
    assert_eq!(duplicate.daytime.short_records.len(), 1);

    let correction = DatedNoteCorrectionInput {
        date: added.date.clone(),
        target_binding: added.target_binding.clone().unwrap(),
        expected_revision: added.revision.clone().unwrap(),
        entry_id: "note-1".into(),
        change_id: "change-1".into(),
        content: "散步 25 分钟".into(),
    };
    let corrected = application.correct_dated_note(correction.clone()).unwrap();
    let duplicate = application
        .correct_dated_note(correction)
        .expect("same correction retry should be idempotent");
    assert_eq!(duplicate.daytime.short_records[0].changes.len(), 1);
    assert_eq!(duplicate.daytime.short_records[0].text, "散步 25 分钟");

    let error = application
        .correct_dated_note(DatedNoteCorrectionInput {
            date: corrected.date,
            target_binding: corrected.target_binding.unwrap(),
            expected_revision: corrected.revision.unwrap(),
            entry_id: "missing-note".into(),
            change_id: "change-2".into(),
            content: "不存在".into(),
        })
        .expect_err("unknown record should fail");
    assert!(error.contains("找不到"));
}
