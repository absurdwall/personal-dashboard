use personal_dashboard_lib::today::{
    HabitCellStatus, HabitSnapshotState, TodayApplication, TodayClock, TodayWorkspaceExchange,
    TodayWorkspacePersistence,
};
use std::fs;
use std::path::{Path, PathBuf};
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
struct SelectedVault(Option<PathBuf>);

impl TodayWorkspacePersistence for SelectedVault {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(self.0.clone())
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
        "2026-09-08T14:10:00-04:00".into()
    }
}

struct NextDayClock;

impl TodayClock for NextDayClock {
    fn current_date(&self) -> String {
        "2026-09-09".into()
    }

    fn current_time_label(&self) -> String {
        "08:00".into()
    }

    fn current_timestamp_label(&self) -> String {
        "2026-09-09T08:00:00-04:00".into()
    }
}

fn snapshot_path(vault: &Path) -> PathBuf {
    vault.join(".personal-dashboard/derived/habits-v1.json")
}

fn write_snapshot(vault: &Path, document: &str) {
    let path = snapshot_path(vault);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, document).unwrap();
}

fn write_exercise_note(vault: &Path, date: &str, text: &str) {
    let path = vault
        .join("life/Journal/Daily")
        .join(&date[..4])
        .join(&date[..7])
        .join(format!("{date}.md"));
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(
        path,
        format!(
            "---\ntype: daily-record\ndate: {date}\n---\n# {date}\n\n## 白天更新\n\n### 简短记录\n\n<!-- personal-dashboard:short-record id=run-1 category=exercise created-at={date}T19:00:00-04:00 needs-review=false -->\n- {text}\n"
        ),
    )
    .unwrap();
}

fn application(vault: Option<&Path>) -> TodayApplication<SelectedVault, NoSelection, FixedClock> {
    TodayApplication::new(
        SelectedVault(vault.map(Path::to_path_buf)),
        NoSelection,
        FixedClock,
    )
}

#[test]
fn sourced_snapshot_projects_correct_week_counts_time_evidence_and_record_dots() {
    let vault = TempDirectory::new("habit-snapshot-happy-path");
    write_snapshot(
        vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    write_exercise_note(vault.path(), "2026-09-07", "只是文字记录，不自动计次");

    let view = application(Some(vault.path()))
        .habits()
        .expect("valid snapshot should project through the application boundary");

    assert_eq!(view.state, HabitSnapshotState::Ready);
    assert_eq!(
        view.generated_at.as_deref(),
        Some("2026-09-08T14:10:00-04:00")
    );
    assert_eq!(view.range_label.as_deref(), Some("2026-06-22 — 2026-09-08"));
    assert_eq!(view.summary.known_completions, 3);
    assert_eq!(view.summary.target_completions, 15);
    assert!(view.summary.coverage_note.contains("下界"));

    let exercise = view.habit("exercise").expect("exercise habit");
    assert_eq!(exercise.completed_count, Some(1));
    assert_eq!(exercise.goal_label, "每周 3 次");
    assert!(exercise.source_labels.contains(&"Dida365 打卡".to_string()));
    let monday = exercise.cell("2026-09-07").expect("Monday history cell");
    assert!(monday.has_record);
    assert!(!monday.counts_as_completion);
    assert_eq!(monday.status, HabitCellStatus::Conflict);
    assert!(monday
        .details
        .iter()
        .any(|line| line.contains("Dashboard") && line.contains("只是文字记录")));
    let tuesday = exercise.cell("2026-09-08").expect("Tuesday history cell");
    assert!(tuesday.counts_as_completion);

    let wake = view.habit("wake").expect("wake habit");
    assert_eq!(wake.today.actual_time_label.as_deref(), Some("07:18"));
    assert!(wake
        .today
        .details
        .iter()
        .any(|line| line.contains("明确时刻")));
    let sleep = view.habit("sleep").expect("sleep habit");
    assert_eq!(sleep.today.actual_time_label, None);
    assert!(sleep.today.details.iter().any(|line| line.contains("阈值")));

    assert_eq!(exercise.history.len(), 84);
    assert_eq!(exercise.recent.len(), 7);
}

#[test]
fn malformed_refresh_retains_the_last_valid_snapshot_and_never_writes() {
    let vault = TempDirectory::new("habit-snapshot-retained");
    write_snapshot(
        vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let application = application(Some(vault.path()));
    let first = application.habits().expect("first valid read");
    let path = snapshot_path(vault.path());

    fs::write(&path, br#"{"schemaVersion":2}"#).unwrap();
    let retained = application.habits().expect("failed refresh stays readable");

    assert_eq!(first.state, HabitSnapshotState::Ready);
    assert_eq!(retained.state, HabitSnapshotState::Retained);
    assert_eq!(retained.summary, first.summary);
    assert_eq!(retained.habits, first.habits);
    assert!(retained.message.contains("继续显示上个有效快照"));
    assert_eq!(fs::read(&path).unwrap(), br#"{"schemaVersion":2}"#);
}

#[test]
fn absent_unconfigured_stale_and_malformed_snapshots_are_explicit_empty_states() {
    let unconfigured = application(None).habits().unwrap();
    assert_eq!(unconfigured.state, HabitSnapshotState::Unconfigured);
    assert!(unconfigured.habits.is_empty());

    let missing_vault = TempDirectory::new("habit-snapshot-missing");
    let missing = application(Some(missing_vault.path())).habits().unwrap();
    assert_eq!(missing.state, HabitSnapshotState::Missing);
    assert!(missing.message.contains("不会自动生成"));

    let malformed_vault = TempDirectory::new("habit-snapshot-malformed");
    write_snapshot(malformed_vault.path(), "not json");
    let malformed = application(Some(malformed_vault.path())).habits().unwrap();
    assert_eq!(malformed.state, HabitSnapshotState::Error);
    assert!(malformed.message.contains("没有可保留的旧读数"));

    let stale_vault = TempDirectory::new("habit-snapshot-stale");
    write_snapshot(
        stale_vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let stale = TodayApplication::new(
        SelectedVault(Some(stale_vault.path().to_path_buf())),
        NoSelection,
        NextDayClock,
    )
    .habits()
    .unwrap();
    assert_eq!(stale.state, HabitSnapshotState::Stale);
    assert!(stale.message.contains("不是实时"));
}

#[test]
fn next_day_sleep_is_attributed_to_the_lived_day_and_no_goal_is_excluded() {
    let vault = TempDirectory::new("habit-snapshot-lived-day");
    let document = include_str!("fixtures/habits-v1-complete.json")
        .replace(
            "\"key\": \"sleep\", \"name\": \"睡觉\", \"active\": true, \"trackingKind\": \"daily-time\",\n      \"goal\": { \"kind\": \"daily-time\", \"standard\": \"23:30\", \"dayRelation\": \"same-day\" },",
            "\"key\": \"sleep\", \"name\": \"睡觉\", \"active\": true, \"trackingKind\": \"daily-time\",\n      \"goal\": null,",
        )
        .replace(
            "{ \"source\": \"dida\", \"observedAt\": \"2026-09-08T14:00:00-04:00\", \"status\": \"threshold-met\", \"evidence\": \"threshold-check-in\", \"note\": \"threshold cannot establish an exact minute\" }",
            "{ \"source\": \"manual\", \"observedAt\": \"2026-09-09T00:35:00-04:00\", \"status\": \"actual-time\", \"evidence\": \"explicit-time\", \"actualTime\": { \"occurredOn\": \"2026-09-09\", \"localTime\": \"00:30\", \"utcOffsetMinutes\": -240, \"dayRelation\": \"next-day\" } }",
        )
        .replace(
            "2026-09-08T14:10:00-04:00",
            "2026-09-09T08:00:00-04:00",
        );
    write_snapshot(vault.path(), &document);

    let view = TodayApplication::new(
        SelectedVault(Some(vault.path().to_path_buf())),
        NoSelection,
        NextDayClock,
    )
    .habits()
    .unwrap();
    let sleep = view.habit("sleep").unwrap();
    let lived_day = sleep.cell("2026-09-08").unwrap();

    assert_eq!(sleep.goal_label, "未配置目标 · 不计入汇总");
    assert_eq!(lived_day.actual_time_label.as_deref(), Some("次日 00:30"));
    assert_eq!(view.summary.target_completions, 15);
    assert_eq!(view.summary.excluded_no_goal, 1);
}

#[test]
fn future_generated_snapshot_is_rejected_without_synthesizing_data() {
    let vault = TempDirectory::new("habit-snapshot-future-generation");
    let document = include_str!("fixtures/habits-v1-complete.json")
        .replace("2026-09-08T14:10:00-04:00", "2026-09-09T14:10:00-04:00");
    write_snapshot(vault.path(), &document);

    let view = application(Some(vault.path())).habits().unwrap();

    assert_eq!(view.state, HabitSnapshotState::Error);
    assert!(view.habits.is_empty());
    assert!(view.message.contains("generatedAt"));
}

#[test]
fn equal_timestamp_results_from_one_source_are_rejected_as_ambiguous() {
    let vault = TempDirectory::new("habit-snapshot-equal-source-time");
    let document = include_str!("fixtures/habits-v1-complete.json").replace(
        "2026-09-08T08:30:00-04:00\", \"status\": \"completed",
        "2026-09-08T08:35:00-04:00\", \"status\": \"not-done",
    );
    write_snapshot(vault.path(), &document);

    let view = application(Some(vault.path())).habits().unwrap();

    assert_eq!(view.state, HabitSnapshotState::Error);
    assert!(view.message.contains("相同 observedAt"));
}
