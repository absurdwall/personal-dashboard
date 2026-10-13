use personal_dashboard_lib::today::{
    HabitCompletionMutationInput, TodayApplication, TodayClock, TodayWorkspaceExchange,
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
            "personal-dashboard-habit-completion-{label}-{}-{nonce}",
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

#[derive(Clone, Copy)]
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

fn snapshot_path(vault: &Path) -> PathBuf {
    vault.join("life/.personal-dashboard/derived/habits-v1.json")
}

fn write_snapshot(vault: &Path, document: &str) {
    let path = snapshot_path(vault);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(path, document).unwrap();
}

use personal_dashboard_lib::habit_catalog::{
    HabitDefinitionMutationInput, HabitGoal, HabitSettings,
};

#[test]
fn full_local_history_beyond_twelve_weeks_counts_distinct_days_and_reopens_without_claiming_missing_days(
) {
    let vault = TempVault::new("long-detail-history");
    let application = app(vault.path());
    let opened = application.habits().unwrap();
    application
        .save_habit_definition(HabitDefinitionMutationInput {
            habit_key: "local-reading".into(),
            change_id: "create-history".into(),
            target_binding: opened.catalog_target_binding.unwrap(),
            expected_revision: opened.catalog_revision,
            settings: HabitSettings {
                name: "Reading".into(),
                emoji: None,
                group: None,
                start_date: "2026-01-01".into(),
                goal: HabitGoal::DailyCompletion,
            },
        })
        .unwrap();
    for (index, date) in [
        "2026-01-01",
        "2026-05-02",
        "2026-09-07",
        "2026-09-08",
        "2026-09-08",
    ]
    .iter()
    .enumerate()
    {
        let view = application.habits().unwrap();
        application
            .set_local_habit_completion(HabitCompletionMutationInput {
                habit_key: "local-reading".into(),
                lived_date: (*date).into(),
                completed: true,
                change_id: format!("long-{index}"),
                target_binding: view.completion_target_binding.unwrap(),
                expected_revision: view.completion_revision,
            })
            .unwrap();
    }
    let detail = application.habit_details("local-reading", 0, 20).unwrap();
    assert_eq!(detail.statistics.total_attained_days, 4);
    assert_eq!(detail.statistics.month_attained_days, 2);
    assert!(!detail.statistics.total_exact);
    assert_eq!(detail.statistics.current_streak, 2);
    assert_eq!(detail.statistics.highest_known_streak, 2);
    assert!(!detail.statistics.highest_confirmed);
    assert!(detail
        .records
        .iter()
        .any(|record| record.cell.date == "2026-01-01"));
    let reopened = app(vault.path())
        .habit_details("local-reading", 0, 20)
        .unwrap();
    assert_eq!(reopened.statistics.total_attained_days, 4);
    assert_eq!(
        application
            .habits()
            .unwrap()
            .habit("local-reading")
            .unwrap()
            .history
            .len(),
        84
    );
}

use personal_dashboard_lib::habit_catalog::HabitLifecycleMutationInput;
#[derive(Clone)]
struct DetailClock(std::rc::Rc<std::cell::RefCell<String>>);
impl TodayClock for DetailClock {
    fn current_date(&self) -> String {
        self.0.borrow().clone()
    }
    fn current_time_label(&self) -> String {
        "14:10".into()
    }
    fn current_timestamp_label(&self) -> String {
        format!("{}T14:10-04:00", self.current_date())
    }
}
#[test]
fn deactivate_restore_reopens_same_identity_breaks_streaks_and_keeps_old_completion_and_pending_goals(
) {
    let vault = TempVault::new("lifecycle");
    let moment = std::rc::Rc::new(std::cell::RefCell::new("2026-09-01".into()));
    let clock = DetailClock(moment.clone());
    let application = TodayApplication::new(
        SelectedVault(vault.path().into()),
        NoSelection,
        clock.clone(),
    );
    let opened = application.habits().unwrap();
    application
        .save_habit_definition(HabitDefinitionMutationInput {
            habit_key: "local-reading".into(),
            change_id: "create-life".into(),
            target_binding: opened.catalog_target_binding.unwrap(),
            expected_revision: opened.catalog_revision,
            settings: HabitSettings {
                name: "Reading".into(),
                emoji: None,
                group: None,
                start_date: "2026-09-01".into(),
                goal: HabitGoal::DailyCompletion,
            },
        })
        .unwrap();
    for date in ["2026-09-01", "2026-09-02"] {
        *moment.borrow_mut() = date.into();
        let view = application.habits().unwrap();
        application
            .set_local_habit_completion(HabitCompletionMutationInput {
                habit_key: "local-reading".into(),
                lived_date: date.into(),
                completed: true,
                change_id: format!("life-{date}"),
                target_binding: view.completion_target_binding.unwrap(),
                expected_revision: view.completion_revision,
            })
            .unwrap();
    }
    *moment.borrow_mut() = "2026-09-03".into();
    let view = application.habits().unwrap();
    let input = HabitLifecycleMutationInput {
        habit_key: "local-reading".into(),
        change_id: "deactivate-life".into(),
        target_binding: view.catalog_target_binding.unwrap(),
        expected_revision: view.catalog_revision,
        active: false,
    };
    let inactive = application.set_habit_active(input.clone()).unwrap();
    assert!(!inactive.habit("local-reading").unwrap().active);
    application.set_habit_active(input).unwrap();
    *moment.borrow_mut() = "2026-09-08".into();
    let reopened = TodayApplication::new(
        SelectedVault(vault.path().into()),
        NoSelection,
        clock.clone(),
    );
    let inactive_detail = reopened.habit_details("local-reading", 0, 20).unwrap();
    assert_eq!(inactive_detail.statistics.total_attained_days, 2);
    assert_eq!(inactive_detail.statistics.highest_known_streak, 2);
    let view = reopened.habits().unwrap();
    reopened
        .set_habit_active(HabitLifecycleMutationInput {
            habit_key: "local-reading".into(),
            change_id: "restore-life".into(),
            target_binding: view.catalog_target_binding.unwrap(),
            expected_revision: view.catalog_revision,
            active: true,
        })
        .unwrap();
    let view = reopened.habits().unwrap();
    reopened
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-reading".into(),
            lived_date: "2026-09-08".into(),
            completed: true,
            change_id: "after-restore".into(),
            target_binding: view.completion_target_binding.unwrap(),
            expected_revision: view.completion_revision,
        })
        .unwrap();
    let detail = reopened.habit_details("local-reading", 0, 20).unwrap();
    assert_eq!(detail.statistics.total_attained_days, 3);
    assert_eq!(detail.statistics.current_streak, 1);
    assert_eq!(detail.statistics.highest_known_streak, 2);
    assert!(detail.statistics.total_exact);
    assert_eq!(detail.activity_changes.len(), 2);
    let final_read = TodayApplication::new(SelectedVault(vault.path().into()), NoSelection, clock)
        .habit_details("local-reading", 0, 20)
        .unwrap();
    assert!(final_read.habit.active);
    assert_eq!(final_read.activity_changes.len(), 2);
}

#[test]
fn weekly_achieved_open_cycle_keeps_old_peak_on_pause_and_historical_correction_uses_old_goal() {
    let vault = TempVault::new("weekly-lifecycle");
    let moment = std::rc::Rc::new(std::cell::RefCell::new("2026-08-03".into()));
    let clock = DetailClock(moment.clone());
    let application = TodayApplication::new(
        SelectedVault(vault.path().into()),
        NoSelection,
        clock.clone(),
    );
    let opened = application.habits().unwrap();
    application
        .save_habit_definition(HabitDefinitionMutationInput {
            habit_key: "local-exercise".into(),
            change_id: "weekly-create".into(),
            target_binding: opened.catalog_target_binding.unwrap(),
            expected_revision: opened.catalog_revision,
            settings: HabitSettings {
                name: "Movement".into(),
                emoji: None,
                group: None,
                start_date: "2026-08-03".into(),
                goal: HabitGoal::WeeklyDays { days: 3 },
            },
        })
        .unwrap();
    for date in [
        "2026-08-03",
        "2026-08-04",
        "2026-08-05",
        "2026-08-10",
        "2026-08-11",
        "2026-08-12",
    ] {
        *moment.borrow_mut() = date.into();
        let view = application.habits().unwrap();
        application
            .set_local_habit_completion(HabitCompletionMutationInput {
                habit_key: "local-exercise".into(),
                lived_date: date.into(),
                completed: true,
                change_id: format!("weekly-{date}"),
                target_binding: view.completion_target_binding.unwrap(),
                expected_revision: view.completion_revision,
            })
            .unwrap();
    }
    let achieved = application.habit_details("local-exercise", 0, 20).unwrap();
    assert_eq!(achieved.statistics.current_streak, 2);
    assert_eq!(achieved.statistics.highest_known_streak, 2);
    let view = application.habits().unwrap();
    let mut settings = view
        .habit("local-exercise")
        .unwrap()
        .settings
        .clone()
        .unwrap();
    settings.goal = HabitGoal::WeeklyDays { days: 5 };
    application
        .save_habit_definition(HabitDefinitionMutationInput {
            habit_key: "local-exercise".into(),
            change_id: "next-five".into(),
            target_binding: view.catalog_target_binding.unwrap(),
            expected_revision: view.catalog_revision,
            settings,
        })
        .unwrap();
    *moment.borrow_mut() = "2026-08-13".into();
    let view = application.habits().unwrap();
    application
        .set_habit_active(HabitLifecycleMutationInput {
            habit_key: "local-exercise".into(),
            change_id: "pause-weekly".into(),
            target_binding: view.catalog_target_binding.unwrap(),
            expected_revision: view.catalog_revision,
            active: false,
        })
        .unwrap();
    let paused = application.habit_details("local-exercise", 0, 20).unwrap();
    assert_eq!(paused.statistics.highest_known_streak, 2);
    assert_eq!(paused.statistics.current_streak, 0);
    let view = application.habits().unwrap();
    application
        .set_historical_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-exercise".into(),
            lived_date: "2026-08-12".into(),
            completed: false,
            change_id: "historical-week-withdraw".into(),
            target_binding: view.completion_target_binding.unwrap(),
            expected_revision: view.completion_revision,
        })
        .unwrap();
    assert_eq!(
        application
            .habit_details("local-exercise", 0, 20)
            .unwrap()
            .statistics
            .highest_known_streak,
        1
    );
    *moment.borrow_mut() = "2026-08-17".into();
    let view = application.habits().unwrap();
    application
        .set_habit_active(HabitLifecycleMutationInput {
            habit_key: "local-exercise".into(),
            change_id: "restore-weekly".into(),
            target_binding: view.catalog_target_binding.unwrap(),
            expected_revision: view.catalog_revision,
            active: true,
        })
        .unwrap();
    let resumed = application.habit_details("local-exercise", 0, 20).unwrap();
    assert_eq!(resumed.habit.weekly_target, Some(5));
    assert_eq!(resumed.statistics.current_streak, 0);
    assert_eq!(resumed.statistics.highest_known_streak, 1);
}

#[test]
fn source_publication_retains_provenance_before_twelve_week_replacement_and_new_instance_reads_it()
{
    use personal_dashboard_lib::habit_producer::{native_source_read, HabitRefreshInput};
    let vault = TempVault::new("archive-source");
    let mut snapshot: serde_json::Value =
        serde_json::from_str(include_str!("fixtures/habits-v1-complete.json")).unwrap();
    snapshot["habits"][0]["days"].as_array_mut().unwrap().push(serde_json::json!({"livedDate":"2026-06-22","coverage":"complete","observations":[{"source":"dida","observedAt":"2026-06-22T13:00:00-04:00","status":"completed","evidence":"check-in"}]}));
    write_snapshot(vault.path(), &snapshot.to_string());
    let moment = std::rc::Rc::new(std::cell::RefCell::new("2026-09-14".into()));
    let clock = DetailClock(moment.clone());
    let application = TodayApplication::new(
        SelectedVault(vault.path().into()),
        NoSelection,
        clock.clone(),
    );
    let catalog = serde_json::json!({"type":"mcpToolCall","server":"dida365","tool":"list_habits","status":"completed","arguments":{},"result":{"structuredContent":{"result":[{"id":"synthetic-exercise","name":"Exercise"}]}}});
    let checkins = serde_json::json!({"type":"mcpToolCall","server":"dida365","tool":"get_habit_checkins","status":"completed","arguments":{"habit_ids":["synthetic-exercise"],"from_stamp":20260620,"to_stamp":20260915},"result":{"structuredContent":{"result":[]}}});
    let report = application.refresh_habit_snapshot(HabitRefreshInput {
        mappings: std::collections::BTreeMap::from([(
            "exercise".into(),
            "synthetic-exercise".into(),
        )]),
        authorization_quote: "Refresh synthetic source".into(),
        execution_mode: "execute".into(),
        host_source_reads: [catalog, checkins]
            .iter()
            .filter_map(native_source_read)
            .collect(),
        host_query_error: None,
    });
    assert_eq!(report.publication, "published", "{}", report.message);
    let reopened = TodayApplication::new(SelectedVault(vault.path().into()), NoSelection, clock);
    let detail = reopened.habit_details("exercise", 0, 60).unwrap();
    let last = reopened
        .habit_details("exercise", detail.record_count.saturating_sub(1), 20)
        .unwrap();
    assert!(last
        .records
        .iter()
        .any(|record| record.cell.date == "2026-06-22" && record.cell.has_external_completion));
    assert!(!detail.statistics.total_exact);
    assert!(!detail.statistics.highest_confirmed);
    assert!(detail
        .sources
        .iter()
        .any(|source| source.generated_at.starts_with("2026-09-08")));
    assert!(reopened
        .habits()
        .unwrap()
        .habit("exercise")
        .unwrap()
        .history
        .iter()
        .all(|cell| cell.date >= "2026-06-29".to_string()));
}

#[test]
fn known_daily_history_is_exact_but_unknown_gap_and_open_today_never_become_zero_or_bridge_streaks()
{
    let vault = TempVault::new("daily-confidence");
    let moment = std::rc::Rc::new(std::cell::RefCell::new("2026-09-01".into()));
    let clock = DetailClock(moment.clone());
    let application = TodayApplication::new(SelectedVault(vault.path().into()), NoSelection, clock);
    let opened = application.habits().unwrap();
    application
        .save_habit_definition(HabitDefinitionMutationInput {
            habit_key: "local-daily".into(),
            change_id: "confidence-create".into(),
            target_binding: opened.catalog_target_binding.unwrap(),
            expected_revision: opened.catalog_revision,
            settings: HabitSettings {
                name: "Read".into(),
                emoji: None,
                group: None,
                start_date: "2026-09-01".into(),
                goal: HabitGoal::DailyCompletion,
            },
        })
        .unwrap();
    for (date, completed) in [
        ("2026-09-01", true),
        ("2026-09-02", true),
        ("2026-09-03", false),
    ] {
        *moment.borrow_mut() = date.into();
        if !completed {
            let before = application.habits().unwrap();
            application
                .set_local_habit_completion(HabitCompletionMutationInput {
                    habit_key: "local-daily".into(),
                    lived_date: date.into(),
                    completed: true,
                    change_id: "day3-before-withdraw".into(),
                    target_binding: before.completion_target_binding.unwrap(),
                    expected_revision: before.completion_revision,
                })
                .unwrap();
        }
        let view = application.habits().unwrap();
        application
            .set_local_habit_completion(HabitCompletionMutationInput {
                habit_key: "local-daily".into(),
                lived_date: date.into(),
                completed,
                change_id: format!("daily-{date}"),
                target_binding: view.completion_target_binding.unwrap(),
                expected_revision: view.completion_revision,
            })
            .unwrap();
    }
    let exact = application.habit_details("local-daily", 0, 20).unwrap();
    assert!(exact.statistics.total_exact);
    assert!(exact.statistics.month_exact);
    assert!(exact.statistics.highest_confirmed);
    assert_eq!(exact.statistics.highest_known_streak, 2);
    *moment.borrow_mut() = "2026-09-05".into();
    let unknown = application.habit_details("local-daily", 0, 20).unwrap();
    assert_eq!(unknown.statistics.total_attained_days, 2);
    assert!(!unknown.statistics.total_exact);
    assert!(!unknown.statistics.current_confirmed);
    assert_eq!(unknown.statistics.current_streak, 0);
    assert!(!unknown.statistics.highest_confirmed);
    let view = application.habits().unwrap();
    application
        .set_local_habit_completion(HabitCompletionMutationInput {
            habit_key: "local-daily".into(),
            lived_date: "2026-09-05".into(),
            completed: true,
            change_id: "gap-day5".into(),
            target_binding: view.completion_target_binding.unwrap(),
            expected_revision: view.completion_revision,
        })
        .unwrap();
    let with_gap = application.habit_details("local-daily", 0, 20).unwrap();
    assert_eq!(with_gap.statistics.current_streak, 1);
    assert!(!with_gap.statistics.current_confirmed);
    assert_eq!(with_gap.statistics.highest_known_streak, 2);
    let view = application.habits().unwrap();
    let mut settings = view.habit("local-daily").unwrap().settings.clone().unwrap();
    settings.start_date = "2026-09-05".into();
    application
        .save_habit_definition(HabitDefinitionMutationInput {
            habit_key: "local-daily".into(),
            change_id: "move-start".into(),
            target_binding: view.catalog_target_binding.unwrap(),
            expected_revision: view.catalog_revision,
            settings,
        })
        .unwrap();
    let retained = application.habit_details("local-daily", 0, 20).unwrap();
    assert_eq!(retained.statistics.total_attained_days, 3);
    assert_eq!(retained.statistics.highest_known_streak, 2);
    assert_eq!(retained.statistics.coverage_from, "2026-09-01");
}

#[test]
fn source_actual_times_without_historical_target_are_unknown_and_current_goal_is_not_backdated() {
    let vault = TempVault::new("source-unknown-target");
    write_snapshot(
        vault.path(),
        include_str!("fixtures/habits-v1-complete.json"),
    );
    let detail = app(vault.path()).habit_details("wake", 0, 20).unwrap();
    assert_eq!(detail.statistics.total_attained_days, 1);
    assert!(!detail.statistics.total_exact);
    assert!(!detail.statistics.month_exact);
    assert!(!detail.statistics.highest_confirmed);
    assert!(detail
        .goal_revisions
        .iter()
        .all(|revision| revision.effective_date >= "2026-09-08".to_string()));
    assert_eq!(
        detail
            .records
            .iter()
            .find(|record| record.cell.date == "2026-09-05")
            .unwrap()
            .cell
            .counts_as_completion,
        false
    );
}
