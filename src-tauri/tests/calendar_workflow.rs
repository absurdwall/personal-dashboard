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
