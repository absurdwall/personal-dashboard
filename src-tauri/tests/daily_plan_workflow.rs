use personal_dashboard_lib::tasks::TaskDataState;
use personal_dashboard_lib::today::{
    daily_plan_effect_fingerprint, BaselineAvailability, DailyPlanBlockInput,
    DailyPlanEvidenceInput, DailyPlanTransition, DailyPlanWriteInput, TodayApplication, TodayClock,
    TodayState, TodayWorkspaceExchange, TodayWorkspacePersistence,
};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

const DATE: &str = "2026-08-10";
static DIRECTORY_SEQUENCE: AtomicU64 = AtomicU64::new(1);

struct TempDirectory(PathBuf);

impl TempDirectory {
    fn new() -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock is after epoch")
            .as_nanos();
        let sequence = DIRECTORY_SEQUENCE.fetch_add(1, Ordering::Relaxed);
        let path = std::env::temp_dir().join(format!(
            "personal-dashboard-daily-plan-{}-{nonce}-{sequence}",
            std::process::id(),
        ));
        fs::create_dir_all(&path).expect("synthetic workspace is created");
        Self(path)
    }

    fn vault(&self, name: &str) -> PathBuf {
        let vault = self.0.join(name);
        fs::create_dir_all(vault.join(".obsidian")).expect("Vault marker is created");
        fs::create_dir_all(vault.join("life/Journal/Daily"))
            .expect("Daily Record directory is created");
        vault
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

struct NoVaultPicker;

impl TodayWorkspaceExchange for NoVaultPicker {
    fn select_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(None)
    }
}

#[derive(Clone, Copy)]
struct FixedClock;

impl TodayClock for FixedClock {
    fn current_date(&self) -> String {
        DATE.into()
    }

    fn current_time_label(&self) -> String {
        "14:10".into()
    }

    fn current_timestamp_label(&self) -> String {
        "2026-08-10T14:10-04:00".into()
    }
}

type App = TodayApplication<SelectedVault, NoVaultPicker, FixedClock>;

fn app(vault: &Path) -> App {
    TodayApplication::new(
        SelectedVault(vault.to_path_buf()),
        NoVaultPicker,
        FixedClock,
    )
}

fn record_path(vault: &Path) -> PathBuf {
    vault.join(format!("life/Journal/Daily/2026/2026-08/{DATE}.md"))
}

fn initial_plan_input(
    target_binding: String,
    expected_revision: Option<String>,
) -> DailyPlanWriteInput {
    let mut input = DailyPlanWriteInput {
        date: DATE.into(),
        target_binding,
        expected_revision,
        operation_id: "plan-initial-1".into(),
        effect_fingerprint: "0000000000000000".into(),
        transition: DailyPlanTransition::InitialPlan,
        arrangement: vec![
            DailyPlanBlockInput {
                period: "上午".into(),
                title: "Prepare the project brief".into(),
                detail: Some("Start with the outline".into()),
            },
            DailyPlanBlockInput {
                period: "下午".into(),
                title: "Review the draft".into(),
                detail: None,
            },
        ],
        evidence: vec![DailyPlanEvidenceInput {
            label: "Tasks and fixed commitments".into(),
            items: vec!["Synthetic report task".into()],
        }],
        calibration_note: None,
        baseline_correction_reason: None,
        event: None,
        original_intent: None,
        change_reason: None,
        revised_direction: None,
    };
    refresh_fingerprint(&mut input);
    input
}

fn refresh_fingerprint(input: &mut DailyPlanWriteInput) {
    input.effect_fingerprint = daily_plan_effect_fingerprint(
        &input.date,
        input.transition,
        &input.arrangement,
        &input.evidence,
        input.calibration_note.as_deref(),
        input.baseline_correction_reason.as_deref(),
        input.event.as_deref(),
        input.original_intent.as_deref(),
        input.change_reason.as_deref(),
        input.revised_direction.as_deref(),
    );
}

fn receipt(vault: &Path, operation_id: &str) -> bool {
    let document = fs::read_to_string(record_path(vault)).expect("daily record is readable");
    document.contains(&format!("id={operation_id} "))
}

fn section_bytes<'a>(document: &'a str, heading: &str, next: &str) -> &'a str {
    let start = document
        .find(&format!("## {heading}"))
        .expect("section exists");
    let end = document[start..]
        .find(&format!("## {next}"))
        .map(|offset| start + offset)
        .expect("next section exists");
    &document[start..end]
}

#[test]
fn initial_plan_is_structured_shared_and_survives_a_fresh_application() {
    let directory = TempDirectory::new();
    let vault = directory.vault("vault");
    let application = app(&vault);
    let empty = application.read_date(DATE).unwrap();
    assert_eq!(empty.state, TodayState::Missing);
    let saved = application
        .save_daily_plan(initial_plan_input(
            empty.target_binding.clone().unwrap(),
            empty.revision.clone(),
        ))
        .unwrap();

    assert_eq!(saved.baseline.availability, BaselineAvailability::Saved);
    assert_eq!(saved.baseline.timeline, saved.timeline);
    assert_eq!(saved.baseline.evidence, saved.evidence);
    assert_eq!(saved.timeline.len(), 2);
    assert_eq!(saved.evidence[0].items, vec!["Synthetic report task"]);
    assert!(saved.time_axis.confirmed_facts.is_empty());
    assert_eq!(saved.tasks.state, TaskDataState::Empty);
    assert!(
        !vault
            .join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH)
            .exists(),
        "saving a plan must not create or mutate the canonical Tasks file"
    );

    let reopened = app(&vault).read_date(DATE).unwrap();
    assert_eq!(reopened.baseline, saved.baseline);
    assert_eq!(reopened.timeline, saved.timeline);
    assert_eq!(reopened.evidence, saved.evidence);
    assert_eq!(reopened.date, DATE);
}

#[test]
fn morning_calibration_updates_current_plan_and_keeps_the_morning_baseline_bytes() {
    let directory = TempDirectory::new();
    let vault = directory.vault("vault");
    let application = app(&vault);
    let missing = application.read_date(DATE).unwrap();
    let initial = application
        .save_daily_plan(initial_plan_input(
            missing.target_binding.unwrap(),
            missing.revision,
        ))
        .unwrap();
    let before = fs::read_to_string(record_path(&vault)).unwrap();
    let morning_baseline = section_bytes(&before, "早间基准", "今天的大致安排").to_owned();
    let mut calibration = initial_plan_input(
        initial.target_binding.clone().unwrap(),
        initial.revision.clone(),
    );
    calibration.operation_id = "plan-calibration-1".into();
    calibration.effect_fingerprint = "1111111111111111".into();
    calibration.transition = DailyPlanTransition::MorningCalibration;
    calibration.calibration_note = Some("The appointment moved to the afternoon".into());
    calibration.arrangement[0].title = "Handle the urgent review".into();
    calibration.evidence[0].items = vec!["The appointment now starts later".into()];
    refresh_fingerprint(&mut calibration);

    let saved = application.save_daily_plan(calibration).unwrap();
    let after = fs::read_to_string(record_path(&vault)).unwrap();
    assert_eq!(
        section_bytes(&after, "早间基准", "今天的大致安排"),
        morning_baseline,
        "calibration cannot rewrite the point-in-time baseline or its evidence"
    );
    assert_eq!(saved.baseline, initial.baseline);
    assert_ne!(saved.timeline, initial.timeline);
    let update = saved
        .daytime
        .updates
        .iter()
        .find(|update| update.title == "早间校准")
        .unwrap();
    assert!(update.neutral.iter().any(|line| line.contains("afternoon")));
    assert!(update.observed_facts.is_empty());
}

#[test]
fn daytime_replan_preserves_the_baseline_and_logs_only_known_change_fields() {
    let directory = TempDirectory::new();
    let vault = directory.vault("vault");
    let application = app(&vault);
    let empty = application.read_date(DATE).unwrap();
    let initial = application
        .save_daily_plan(initial_plan_input(
            empty.target_binding.unwrap(),
            empty.revision,
        ))
        .unwrap();
    let before = fs::read_to_string(record_path(&vault)).unwrap();
    let morning_baseline = section_bytes(&before, "早间基准", "今天的大致安排").to_owned();
    let mut replan = initial_plan_input(
        initial.target_binding.clone().unwrap(),
        initial.revision.clone(),
    );
    replan.operation_id = "plan-replan-1".into();
    replan.effect_fingerprint = "2222222222222222".into();
    replan.transition = DailyPlanTransition::DaytimeReplan;
    replan.arrangement[0].title = "Take a recovery break".into();
    replan.original_intent = Some("Finish the project brief before lunch".into());
    replan.change_reason = Some("Energy is lower than expected".into());
    replan.revised_direction = Some("Move the review after a break".into());
    refresh_fingerprint(&mut replan);

    let saved = application.save_daily_plan(replan).unwrap();
    let after = fs::read_to_string(record_path(&vault)).unwrap();
    assert_eq!(
        section_bytes(&after, "早间基准", "今天的大致安排"),
        morning_baseline
    );
    let update = saved
        .daytime
        .updates
        .iter()
        .find(|update| update.title == "计划调整")
        .unwrap();
    assert_eq!(
        update.original_intent,
        vec!["Finish the project brief before lunch"]
    );
    assert_eq!(update.change_reasons, vec!["Energy is lower than expected"]);
    assert_eq!(
        update.revised_direction,
        vec!["Move the review after a break"]
    );
    assert!(update.observed_facts.is_empty());
}

#[test]
fn explicit_morning_baseline_correction_changes_only_the_baseline_and_keeps_a_trace() {
    let directory = TempDirectory::new();
    let vault = directory.vault("vault");
    let application = app(&vault);
    let empty = application.read_date(DATE).unwrap();
    let initial = application
        .save_daily_plan(initial_plan_input(
            empty.target_binding.unwrap(),
            empty.revision,
        ))
        .unwrap();
    let mut replan = initial_plan_input(
        initial.target_binding.clone().unwrap(),
        initial.revision.clone(),
    );
    replan.operation_id = "plan-before-baseline-correction".into();
    replan.transition = DailyPlanTransition::DaytimeReplan;
    replan.arrangement[0].title = "Current arrangement remains independent".into();
    replan.original_intent = Some("Review the draft".into());
    replan.revised_direction = Some("Keep the later review".into());
    refresh_fingerprint(&mut replan);
    let current = application.save_daily_plan(replan).unwrap();

    let before = fs::read_to_string(record_path(&vault)).unwrap();
    let prior_baseline = section_bytes(&before, "早间基准", "今天的大致安排").to_owned();
    let prior_current = section_bytes(&before, "今天的大致安排", "计划依据").to_owned();
    let prior_current_basis = section_bytes(&before, "计划依据", "白天更新").to_owned();

    let mut missing_reason = initial_plan_input(
        current.target_binding.clone().unwrap(),
        current.revision.clone(),
    );
    missing_reason.operation_id = "baseline-correction-without-reason".into();
    missing_reason.transition = DailyPlanTransition::MorningBaselineCorrection;
    refresh_fingerprint(&mut missing_reason);
    let before_rejection = fs::read(record_path(&vault)).unwrap();
    assert!(application.save_daily_plan(missing_reason).is_err());
    assert_eq!(fs::read(record_path(&vault)).unwrap(), before_rejection);

    let mut correction = initial_plan_input(
        current.target_binding.clone().unwrap(),
        current.revision.clone(),
    );
    correction.operation_id = "baseline-correction-explicit".into();
    correction.transition = DailyPlanTransition::MorningBaselineCorrection;
    correction.arrangement[0].title = "Corrected earlier plan".into();
    correction.evidence[0].items = vec!["Original record had the wrong date".into()];
    correction.baseline_correction_reason =
        Some("The saved baseline was copied from the wrong day".into());
    refresh_fingerprint(&mut correction);

    let saved = application.save_daily_plan(correction).unwrap();
    let after = fs::read_to_string(record_path(&vault)).unwrap();
    assert_ne!(
        section_bytes(&after, "早间基准", "今天的大致安排"),
        prior_baseline,
        "explicit correction replaces the identified wrong baseline"
    );
    assert_eq!(
        section_bytes(&after, "今天的大致安排", "计划依据"),
        prior_current,
        "baseline correction leaves the current arrangement byte-for-byte intact"
    );
    assert_eq!(
        section_bytes(&after, "计划依据", "白天更新"),
        prior_current_basis,
        "baseline correction leaves the current basis byte-for-byte intact"
    );
    assert_eq!(saved.timeline, current.timeline);
    assert_eq!(saved.evidence, current.evidence);
    assert_eq!(saved.baseline.timeline[0].title, "Corrected earlier plan");
    assert_eq!(
        saved.baseline.evidence[0].items,
        vec!["Original record had the wrong date"]
    );
    let trace = saved
        .daytime
        .updates
        .iter()
        .find(|update| update.title == "早间基准纠正")
        .expect("baseline correction leaves a visible trace");
    assert!(trace.neutral.iter().any(|line| line.contains("wrong day")));
    assert!(trace
        .neutral
        .iter()
        .any(|line| line.contains("Existing baseline") || line.contains("Prepare")));
    assert!(receipt(&vault, "baseline-correction-explicit"));
}

#[test]
fn event_only_update_preserves_both_plan_sections_and_keeps_unknown_actual_time_unknown() {
    let directory = TempDirectory::new();
    let vault = directory.vault("vault");
    let application = app(&vault);
    let empty = application.read_date(DATE).unwrap();
    let initial = application
        .save_daily_plan(initial_plan_input(
            empty.target_binding.unwrap(),
            empty.revision,
        ))
        .unwrap();
    let before = fs::read_to_string(record_path(&vault)).unwrap();
    let baseline = section_bytes(&before, "早间基准", "今天的大致安排").to_owned();
    let arrangement = section_bytes(&before, "今天的大致安排", "计划依据").to_owned();
    let basis = section_bytes(&before, "计划依据", "白天更新").to_owned();
    let mut event = DailyPlanWriteInput {
        date: DATE.into(),
        target_binding: initial.target_binding.clone().unwrap(),
        expected_revision: initial.revision.clone(),
        operation_id: "plan-event-1".into(),
        effect_fingerprint: "0000000000000000".into(),
        transition: DailyPlanTransition::DaytimeEvent,
        arrangement: Vec::new(),
        evidence: Vec::new(),
        calibration_note: None,
        baseline_correction_reason: None,
        event: Some("I completed the first review".into()),
        original_intent: None,
        change_reason: None,
        revised_direction: None,
    };
    refresh_fingerprint(&mut event);

    let saved = application.save_daily_plan(event).unwrap();
    let after = fs::read_to_string(record_path(&vault)).unwrap();
    assert_eq!(
        section_bytes(&after, "早间基准", "今天的大致安排"),
        baseline
    );
    assert_eq!(
        section_bytes(&after, "今天的大致安排", "计划依据"),
        arrangement
    );
    assert_eq!(section_bytes(&after, "计划依据", "白天更新"), basis);
    assert!(saved.daytime.updates.iter().any(|update| {
        update
            .observed_facts
            .iter()
            .any(|fact| fact == "I completed the first review")
    }));
    assert!(saved.time_axis.confirmed_facts.is_empty());
    assert!(saved
        .time_axis
        .unlocated_confirmed_facts
        .iter()
        .any(|fact| {
            fact.text.contains("I completed the first review") && fact.start_minute.is_none()
        }));
}

#[test]
fn duplicate_delivery_is_idempotent_but_reusing_an_operation_id_for_new_content_fails() {
    let directory = TempDirectory::new();
    let vault = directory.vault("vault");
    let application = app(&vault);
    let empty = application.read_date(DATE).unwrap();
    let plan = initial_plan_input(empty.target_binding.unwrap(), empty.revision);
    application.save_daily_plan(plan.clone()).unwrap();
    let first_bytes = fs::read(record_path(&vault)).unwrap();

    application.save_daily_plan(plan.clone()).unwrap();
    assert_eq!(fs::read(record_path(&vault)).unwrap(), first_bytes);
    assert!(receipt(&vault, "plan-initial-1"));

    let mut conflicting = plan;
    conflicting.arrangement[0].title = "Different content".into();
    assert!(application.save_daily_plan(conflicting).is_err());
    assert_eq!(fs::read(record_path(&vault)).unwrap(), first_bytes);
}

#[test]
fn stale_revision_vault_switch_and_unrecognized_record_content_fail_closed() {
    let directory = TempDirectory::new();
    let vault = directory.vault("vault-a");
    let other_vault = directory.vault("vault-b");
    let application = app(&vault);
    let empty = application.read_date(DATE).unwrap();
    let initial = application
        .save_daily_plan(initial_plan_input(
            empty.target_binding.unwrap(),
            empty.revision,
        ))
        .unwrap();
    let mut plan = initial_plan_input(
        initial.target_binding.clone().unwrap(),
        initial.revision.clone(),
    );
    plan.transition = DailyPlanTransition::DaytimeReplan;
    plan.operation_id = "plan-stale-1".into();
    plan.effect_fingerprint = "4444444444444444".into();
    plan.original_intent = Some("Keep the draft review".into());
    plan.revised_direction = Some("Review it after lunch".into());
    let baseline_record = fs::read_to_string(record_path(&vault)).unwrap();
    fs::write(
        record_path(&vault),
        format!("{baseline_record}\n## External note\n\nHuman edit.\n"),
    )
    .unwrap();
    let stale = fs::read(record_path(&vault)).unwrap();
    assert!(application.save_daily_plan(plan.clone()).is_err());
    assert_eq!(fs::read(record_path(&vault)).unwrap(), stale);

    let wrong_vault_app = app(&other_vault);
    let mismatched = DailyPlanWriteInput {
        target_binding: initial.target_binding.unwrap(),
        expected_revision: None,
        ..initial_plan_input(
            wrong_vault_app
                .read_date(DATE)
                .unwrap()
                .target_binding
                .unwrap(),
            None,
        )
    };
    assert!(wrong_vault_app.save_daily_plan(mismatched).is_err());
    assert!(!record_path(&other_vault).exists());

    let wrong_date_or_binding = DailyPlanWriteInput {
        target_binding: "wrong-vault-binding".into(),
        expected_revision: None,
        ..initial_plan_input("wrong-vault-binding".into(), None)
    };
    assert!(application.save_daily_plan(wrong_date_or_binding).is_err());
    assert_eq!(fs::read(record_path(&vault)).unwrap(), stale);
}

#[test]
fn incomplete_damaged_and_user_authored_sections_are_not_overwritten() {
    let directory = TempDirectory::new();
    let vault = directory.vault("vault");
    let application = app(&vault);
    let path = record_path(&vault);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let incomplete = "---\ntype: daily-record\ndate: 2026-08-10\n---\n# 2026-08-10\n\n## 早间基准\n\n### 初始安排\n\n- **上午：** Existing baseline\n\n### 初始计划依据\n\n#### Tasks\n\n- Existing task\n\n## 今天的大致安排\n\n\n## 计划依据\n\n\n";
    fs::write(&path, incomplete).unwrap();
    let before = fs::read(&path).unwrap();
    let view = application.read_date(DATE).unwrap();
    let mut calibration = initial_plan_input(view.target_binding.unwrap(), view.revision.clone());
    calibration.transition = DailyPlanTransition::MorningCalibration;
    calibration.calibration_note = Some("An explicit change".into());
    refresh_fingerprint(&mut calibration);
    assert!(application.save_daily_plan(calibration).is_err());
    assert_eq!(fs::read(&path).unwrap(), before);

    let damaged = "---\ntype: daily-record\ndate: 2026-08-10\n---\n# 2026-08-10\n\n## 今天的大致安排\n\n- **上午：** Existing\n\n## 今天的大致安排\n";
    fs::write(&path, damaged).unwrap();
    let before = fs::read(&path).unwrap();
    let view = application.read_date(DATE).unwrap();
    let proposal = initial_plan_input(view.target_binding.unwrap(), view.revision);
    assert!(application.save_daily_plan(proposal).is_err());
    assert_eq!(fs::read(&path).unwrap(), before);

    let user_content = "---\ntype: daily-record\ndate: 2026-08-10\n---\n# 2026-08-10\n\n## 早间基准\n\n### 初始安排\n\n- **上午：** Existing baseline\n\n### 初始计划依据\n\n#### Tasks\n\n- Existing task\n\n## 今天的大致安排\n\n- **上午：** Existing current plan\n\n<!-- user-authored comment -->\n\n## 计划依据\n\n#### Tasks\n\n- Existing current basis\n";
    fs::write(&path, user_content).unwrap();
    let before = fs::read(&path).unwrap();
    let view = application.read_date(DATE).unwrap();
    let mut replan = initial_plan_input(view.target_binding.unwrap(), view.revision);
    replan.transition = DailyPlanTransition::DaytimeReplan;
    replan.original_intent = Some("Keep the existing appointment".into());
    replan.revised_direction = Some("Move the review".into());
    refresh_fingerprint(&mut replan);
    assert!(application.save_daily_plan(replan).is_err());
    assert_eq!(fs::read(&path).unwrap(), before);

    let user_heading = "---\ntype: daily-record\ndate: 2026-08-10\n---\n# 2026-08-10\n\n## 早间基准\n\n### 初始安排\n\n- **上午：** Existing baseline\n\n### 初始计划依据\n\n#### Tasks\n\n- Existing task\n\n## 今天的大致安排\n\n### Keep this note\n\n- User-authored detail\n\n## 计划依据\n\n#### Tasks\n\n- Existing current basis\n";
    fs::write(&path, user_heading).unwrap();
    let before = fs::read(&path).unwrap();
    let view = application.read_date(DATE).unwrap();
    let mut replan = initial_plan_input(view.target_binding.unwrap(), view.revision);
    replan.transition = DailyPlanTransition::DaytimeReplan;
    replan.operation_id = "plan-user-heading-1".into();
    replan.effect_fingerprint = "6666666666666666".into();
    replan.original_intent = Some("Keep the current note".into());
    replan.revised_direction = Some("Review this note first".into());
    refresh_fingerprint(&mut replan);
    assert!(application.save_daily_plan(replan).is_err());
    assert_eq!(
        fs::read(&path).unwrap(),
        before,
        "unknown subheadings and their bodies must never be silently deleted"
    );
}

#[test]
fn manual_plan_time_edit_preserves_other_sources_and_survives_restart() {
    use personal_dashboard_lib::today::PlanTimeEditInput;
    let directory = TempDirectory::new();
    let vault = directory.vault("vault");
    let application = app(&vault);
    let empty = application.read_date(DATE).unwrap();
    let mut initial = initial_plan_input(empty.target_binding.unwrap(), None);
    initial.arrangement[0].period = "08:00–10:00".into();
    refresh_fingerprint(&mut initial);
    application.save_daily_plan(initial).unwrap();
    let path = record_path(&vault);
    let original = format!(
        "{}\n\n### 已发生事件\n\n- 事实：08:45 已经完成阅读\n\n<!-- unrelated 08:00–10:00 -->\n",
        fs::read_to_string(&path).unwrap()
    );
    fs::write(&path, &original).unwrap();
    let loaded = application.read_date(DATE).unwrap();
    assert_eq!(loaded.time_axis.confirmed_facts.len(), 1);
    assert_eq!(loaded.time_axis.confirmed_facts[0].start_minute, Some(525));
    let edit = PlanTimeEditInput {
        date: DATE.into(),
        target_binding: loaded.target_binding.clone().unwrap(),
        expected_revision: loaded.revision.clone().unwrap(),
        plan_id: loaded.time_axis.current_arrangement[0]
            .plan_id
            .clone()
            .unwrap(),
        operation_id: "manual-time-1".into(),
        start_minute: 600,
        end_minute: Some(720),
        precision: None,
    };
    let saved = application
        .edit_plan_time(edit.clone())
        .unwrap()
        .view
        .unwrap();
    assert_eq!(saved.timeline[0].period, "10:00–12:00");
    assert_eq!(saved.baseline, loaded.baseline);
    assert_eq!(saved.evidence, loaded.evidence);
    assert_eq!(
        saved.time_axis.confirmed_facts,
        loaded.time_axis.confirmed_facts
    );
    let document = fs::read_to_string(&path).unwrap();
    assert!(document.contains("<!-- unrelated 08:00–10:00 -->"));
    assert!(document.contains("08:00–10:00 → 10:00–12:00"));
    assert_eq!(
        app(&vault).read_date(DATE).unwrap().timeline,
        saved.timeline
    );
    application.edit_plan_time(edit.clone()).unwrap();
    assert_eq!(fs::read_to_string(&path).unwrap(), document);
    let mut reused = edit;
    reused.start_minute = 601;
    reused.end_minute = Some(721);
    assert!(application.edit_plan_time(reused).is_err());
    assert_eq!(fs::read_to_string(&path).unwrap(), document);
    assert_eq!(
        section_bytes(&document, "早间基准", "今天的大致安排"),
        section_bytes(&original, "早间基准", "今天的大致安排")
    );
    assert!(!vault
        .join(personal_dashboard_lib::tasks::TASK_DOCUMENT_RELATIVE_PATH)
        .exists());
}

#[test]
fn manual_time_edit_rejects_stale_revision_wrong_vault_and_unsafe_sources() {
    use personal_dashboard_lib::today::PlanTimeEditInput;
    let directory = TempDirectory::new();
    let vault = directory.vault("vault");
    let application = app(&vault);
    let empty = application.read_date(DATE).unwrap();
    let mut initial = initial_plan_input(empty.target_binding.unwrap(), None);
    initial.arrangement[0].period = "08:00".into();
    refresh_fingerprint(&mut initial);
    let loaded = application.save_daily_plan(initial).unwrap();
    let edit = PlanTimeEditInput {
        date: DATE.into(),
        target_binding: loaded.target_binding.unwrap(),
        expected_revision: loaded.revision.unwrap(),
        plan_id: loaded.time_axis.current_arrangement[0]
            .plan_id
            .clone()
            .unwrap(),
        operation_id: "manual-stale-1".into(),
        start_minute: 601,
        end_minute: None,
        precision: None,
    };
    let path = record_path(&vault);
    let changed = format!(
        "{}\nUser-authored external note\n",
        fs::read_to_string(&path).unwrap()
    );
    fs::write(&path, &changed).unwrap();
    assert!(application
        .edit_plan_time(edit.clone())
        .unwrap_err()
        .contains("外部"));
    assert_eq!(fs::read_to_string(&path).unwrap(), changed);
    let other = directory.vault("other");
    assert!(app(&other)
        .edit_plan_time(edit)
        .unwrap_err()
        .contains("Vault"));
    let loaded = application.read_date(DATE).unwrap();
    let mut edit = PlanTimeEditInput {
        date: DATE.into(),
        target_binding: loaded.target_binding.unwrap(),
        expected_revision: loaded.revision.unwrap(),
        plan_id: "guessed-title".into(),
        operation_id: "manual-invalid-1".into(),
        start_minute: 601,
        end_minute: None,
        precision: None,
    };
    assert!(application.edit_plan_time(edit.clone()).is_err());
    edit.plan_id = loaded.time_axis.current_arrangement[0]
        .plan_id
        .clone()
        .unwrap();
    edit.end_minute = Some(600);
    assert!(application.edit_plan_time(edit.clone()).is_err());
    edit.end_minute = None;
    let saved = application.edit_plan_time(edit).unwrap().view.unwrap();
    assert_eq!(saved.timeline[0].period, "10:01");
    assert_eq!(saved.time_axis.current_arrangement[0].end_minute, None);
    assert!(fs::read_to_string(&path)
        .unwrap()
        .contains("User-authored external note"));
}

struct ReadbackFailureStore(std::cell::Cell<bool>);
impl personal_dashboard_lib::today::TodayRecordStore for ReadbackFailureStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        use personal_dashboard_lib::today::FileTodayRecordStore;
        if self.0.get() {
            return Err("synthetic readback failure".into());
        }
        FileTodayRecordStore.load(path)
    }
    fn save_if_unchanged(
        &self,
        path: &Path,
        expected: &[u8],
        updated: &[u8],
    ) -> Result<(), String> {
        use personal_dashboard_lib::today::FileTodayRecordStore;
        FileTodayRecordStore.save_if_unchanged(path, expected, updated)?;
        self.0.set(true);
        Ok(())
    }
}

#[test]
fn saved_manual_time_edit_reports_readback_failure_separately_from_write() {
    use personal_dashboard_lib::today::PlanTimeEditInput;
    let directory = TempDirectory::new();
    let vault = directory.vault("vault");
    let application = app(&vault);
    let empty = application.read_date(DATE).unwrap();
    let mut initial = initial_plan_input(empty.target_binding.unwrap(), None);
    initial.arrangement[0].period = "08:00–10:00".into();
    refresh_fingerprint(&mut initial);
    let loaded = application.save_daily_plan(initial).unwrap();
    let edit = PlanTimeEditInput {
        date: DATE.into(),
        target_binding: loaded.target_binding.unwrap(),
        expected_revision: loaded.revision.unwrap(),
        plan_id: loaded.time_axis.current_arrangement[0]
            .plan_id
            .clone()
            .unwrap(),
        operation_id: "manual-readback-1".into(),
        start_minute: 600,
        end_minute: Some(720),
        precision: None,
    };
    let flaky = TodayApplication::with_record_store(
        SelectedVault(vault.clone()),
        NoVaultPicker,
        FixedClock,
        ReadbackFailureStore(std::cell::Cell::new(false)),
    );
    let result = flaky.edit_plan_time(edit).unwrap();
    assert!(result.view.is_none());
    assert!(result.refresh_error.unwrap().contains("文档已保存"));
    let reopened = app(&vault).read_date(DATE).unwrap();
    assert_eq!(
        reopened.revision.as_deref(),
        Some(result.saved_revision.as_str())
    );
    assert_eq!(reopened.timeline[0].period, "10:00–12:00");
}

#[test]
fn broad_approximate_and_exact_plans_keep_their_precision_and_unknown_relative_time() {
    let directory = TempDirectory::new();
    let vault = directory.vault("precision-vault");
    let application = app(&vault);
    let empty = application.read_date(DATE).unwrap();
    let mut initial = initial_plan_input(empty.target_binding.unwrap(), None);
    initial.arrangement = [
        "早晨",
        "中午",
        "午后",
        "傍晚",
        "晚间",
        "约 15:20",
        "16:10",
        "17:00–18:00",
        "半小时后",
        "择机",
    ]
    .into_iter()
    .enumerate()
    .map(|(index, period)| DailyPlanBlockInput {
        period: period.into(),
        title: format!("Synthetic plan {index}"),
        detail: None,
    })
    .collect();
    refresh_fingerprint(&mut initial);
    let loaded = application.save_daily_plan(initial).unwrap();
    let starts: Vec<_> = loaded
        .time_axis
        .current_arrangement
        .iter()
        .map(|entry| entry.start_minute)
        .collect();
    assert_eq!(
        starts,
        vec![
            Some(540),
            Some(720),
            Some(780),
            Some(1080),
            Some(1080),
            Some(920),
            Some(970),
            Some(1020)
        ]
    );
    let observed = serde_json::to_value(&loaded).unwrap();
    let modes: Vec<_> = observed["timeAxis"]["currentArrangement"]
        .as_array()
        .unwrap()
        .iter()
        .map(|entry| entry["planPrecision"].as_str().unwrap())
        .collect();
    assert_eq!(
        modes,
        vec![
            "broad",
            "broad",
            "broad",
            "broad",
            "broad",
            "approximatePoint",
            "exactPoint",
            "exactRange"
        ]
    );
    assert!(loaded.time_axis.current_arrangement[..7]
        .iter()
        .all(|entry| entry.end_minute.is_none()));
    assert_eq!(loaded.time_axis.unlocated_current_arrangement.len(), 2);
    assert_eq!(
        app(&vault).read_date(DATE).unwrap().time_axis,
        loaded.time_axis
    );
    struct LaterClock;
    impl TodayClock for LaterClock {
        fn current_date(&self) -> String {
            DATE.into()
        }
        fn current_time_label(&self) -> String {
            "18:30".into()
        }
        fn current_timestamp_label(&self) -> String {
            "2026-08-10T18:30-04:00".into()
        }
    }
    let later = TodayApplication::new(SelectedVault(vault.clone()), NoVaultPicker, LaterClock)
        .read_date(DATE)
        .unwrap();
    assert_eq!(
        later.time_axis, loaded.time_axis,
        "relative plans must not drift with the refresh clock"
    );
    assert_eq!(loaded.baseline.timeline[0].period, "早晨");
    assert!(loaded.time_axis.confirmed_facts.is_empty());
}

#[test]
fn precision_edits_remain_fuzzy_until_an_explicit_conversion_and_survive_restart() {
    use personal_dashboard_lib::today::PlanTimeEditInput;
    let directory = TempDirectory::new();
    let vault = directory.vault("precision-edit-vault");
    let application = app(&vault);
    let empty = application.read_date(DATE).unwrap();
    let mut initial = initial_plan_input(empty.target_binding.unwrap(), None);
    initial.arrangement[0].period = "午后".into();
    refresh_fingerprint(&mut initial);
    let loaded = application.save_daily_plan(initial).unwrap();
    let input = |view: &personal_dashboard_lib::today::TodayView,
                 op: &str,
                 start: u16,
                 end: Option<u16>,
                 precision: Option<&str>|
     -> PlanTimeEditInput {
        let mut value = serde_json::json!({"date": DATE, "targetBinding": view.target_binding, "expectedRevision": view.revision,
            "planId": view.time_axis.current_arrangement[0].plan_id, "operationId": op, "startMinute": start, "endMinute": end});
        if let Some(precision) = precision {
            value["precision"] = precision.into();
        }
        serde_json::from_value(value).unwrap()
    };
    let fuzzy = application
        .edit_plan_time(input(&loaded, "fuzzy-edit-1", 840, None, None))
        .unwrap()
        .view
        .unwrap();
    assert_eq!(fuzzy.timeline[0].period, "约14:00");
    assert_eq!(fuzzy.baseline, loaded.baseline);
    assert_eq!(
        serde_json::to_value(&fuzzy).unwrap()["timeAxis"]["currentArrangement"][0]["planPrecision"],
        "approximatePoint"
    );
    let exact = application
        .edit_plan_time(input(
            &fuzzy,
            "exact-conversion-1",
            900,
            Some(960),
            Some("exactRange"),
        ))
        .unwrap()
        .view
        .unwrap();
    assert_eq!(exact.timeline[0].period, "15:00–16:00");
    assert_eq!(exact.baseline, loaded.baseline);
    let approximate = application
        .edit_plan_time(input(
            &exact,
            "fuzzy-conversion-1",
            1005,
            None,
            Some("approximatePoint"),
        ))
        .unwrap()
        .view
        .unwrap();
    assert_eq!(approximate.timeline[0].period, "约16:45");
    let overnight = application
        .edit_plan_time(input(
            &approximate,
            "overnight-exact-1",
            1380,
            Some(1500),
            Some("exactRange"),
        ))
        .unwrap()
        .view
        .unwrap();
    assert_eq!(
        overnight.timeline[0].period,
        "2026-08-10 23:00–2026-08-11 01:00"
    );
    assert_eq!(
        overnight.time_axis.current_arrangement[0].start_minute,
        Some(1380)
    );
    assert_eq!(
        overnight.time_axis.current_arrangement[0].end_minute,
        Some(1500)
    );
    assert_eq!(
        app(&vault).read_date(DATE).unwrap().time_axis,
        overnight.time_axis
    );
    let point = application
        .edit_plan_time(input(
            &overnight,
            "exact-point-conversion-1",
            990,
            None,
            Some("exactPoint"),
        ))
        .unwrap()
        .view
        .unwrap();
    assert_eq!(point.timeline[0].period, "16:30");
    assert_eq!(point.time_axis.current_arrangement[0].end_minute, None);
    assert_eq!(
        app(&vault).read_date(DATE).unwrap().time_axis,
        point.time_axis
    );

    assert_eq!(approximate.baseline.timeline[0].period, "午后");
    assert!(approximate.time_axis.confirmed_facts.is_empty());
    assert!(fs::read_to_string(record_path(&vault))
        .unwrap()
        .contains("约14:00 → 15:00–16:00"));
    if let Ok(directory) = std::env::var("PDEX_UI_FIXTURE_DIRECTORY") {
        fs::create_dir_all(&directory).unwrap();
        fs::write(Path::new(&directory).join("plan-time-views.json"), serde_json::to_vec_pretty(&serde_json::json!({"loaded": loaded, "fuzzy": fuzzy, "exact": exact, "approximate": approximate, "overnight": overnight, "point": point})).unwrap()).unwrap();
    }
}

#[test]
fn unique_inherited_plan_heading_is_editable_without_touching_other_headings_or_facts() {
    use personal_dashboard_lib::today::PlanTimeEditInput;
    let directory = TempDirectory::new();
    let vault = directory.vault("inherited-plan-vault");
    let path = record_path(&vault);
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    let original = format!("---\ntype: daily-record\ndate: {DATE}\n---\n# {DATE}\n\n## 早间基准\n\n### 初始安排\n\n- **早晨**：Morning stays unchanged\n\n## 今天的大致安排\n\n### 08:00–10:00\n\n- Inherited synthetic plan\n\n## 计划依据\n\nKeep original basis\n\n## 白天更新\n\n### 已发生事件\n\n- 事实：08:45 已经阅读\n\n## 晚间复盘\n\n<!-- unrelated 08:00–10:00 -->\n");
    fs::write(&path, &original).unwrap();
    let application = app(&vault);
    let loaded = application.read_date(DATE).unwrap();
    let entry = &loaded.time_axis.current_arrangement[0];
    assert!(entry.time_editable);
    let edit: PlanTimeEditInput = serde_json::from_value(serde_json::json!({"date": DATE,
        "targetBinding": loaded.target_binding, "expectedRevision": loaded.revision,
        "planId": entry.plan_id, "operationId": "inherited-edit-1", "startMinute": 600, "endMinute": 720, "precision": "exactRange"})).unwrap();
    let saved = application.edit_plan_time(edit).unwrap().view.unwrap();
    assert_eq!(saved.timeline[0].period, "10:00–12:00");
    assert_eq!(
        saved.time_axis.confirmed_facts,
        loaded.time_axis.confirmed_facts
    );
    let document = fs::read_to_string(&path).unwrap();
    assert!(document.contains("### 10:00–12:00\n"));
    assert!(document.contains("<!-- unrelated 08:00–10:00 -->"));
    assert_eq!(
        section_bytes(&document, "早间基准", "今天的大致安排"),
        section_bytes(&original, "早间基准", "今天的大致安排")
    );
    assert_eq!(
        app(&vault).read_date(DATE).unwrap().timeline,
        saved.timeline
    );
    if let Ok(directory) = std::env::var("PDEX_UI_FIXTURE_DIRECTORY") {
        fs::create_dir_all(&directory).unwrap();
        fs::write(
            Path::new(&directory).join("inherited-plan-views.json"),
            serde_json::to_vec_pretty(&serde_json::json!({"loaded": loaded, "saved": saved}))
                .unwrap(),
        )
        .unwrap();
    }
    // A shared heading cannot identify which of several plans should change.
    let ambiguous = original.replace(
        "- Inherited synthetic plan",
        "- Inherited synthetic plan\n- Another synthetic plan",
    );
    fs::write(&path, ambiguous).unwrap();
    let ambiguous_view = application.read_date(DATE).unwrap();
    assert!(ambiguous_view
        .time_axis
        .current_arrangement
        .iter()
        .all(|entry| entry.plan_id.is_none() && !entry.time_editable));
}

#[test]
fn explicit_body_time_keeps_its_precision_and_cannot_be_replaced_via_a_broad_heading() {
    use personal_dashboard_lib::today::PlanTimeEditInput;
    let directory = TempDirectory::new();
    let vault = directory.vault("body-time-vault");
    let application = app(&vault);
    let empty = application.read_date(DATE).unwrap();
    let mut initial = initial_plan_input(empty.target_binding.unwrap(), None);
    initial.arrangement[0].period = "上午".into();
    initial.arrangement[0].title = "09:30–10:45 Synthetic source time".into();
    refresh_fingerprint(&mut initial);
    let loaded = application.save_daily_plan(initial).unwrap();
    let entry = &loaded.time_axis.current_arrangement[0];
    assert_eq!(entry.start_minute, Some(570));
    assert_eq!(entry.end_minute, Some(645));
    assert_eq!(
        serde_json::to_value(entry).unwrap()["planPrecision"],
        "exactRange"
    );
    assert!(!entry.time_editable);
    let original = fs::read_to_string(record_path(&vault)).unwrap();
    let edit: PlanTimeEditInput = serde_json::from_value(serde_json::json!({"date": DATE,
        "targetBinding": loaded.target_binding, "expectedRevision": loaded.revision,
        "planId": entry.plan_id, "operationId": "unsafe-body-edit", "startMinute": 600, "endMinute": 720, "precision": "exactRange"})).unwrap();
    assert!(application
        .edit_plan_time(edit)
        .unwrap_err()
        .contains("时间字段"));
    assert_eq!(fs::read_to_string(record_path(&vault)).unwrap(), original);
}

#[test]
fn direct_plan_moves_and_end_edits_preserve_duration_precision_and_independent_sources() {
    use personal_dashboard_lib::today::{PlanTimeEditInput, TodayView};
    let directory = TempDirectory::new();
    let vault = directory.vault("drag-plan-vault");
    let application = app(&vault);
    let empty = application.read_date(DATE).unwrap();
    let mut initial = initial_plan_input(empty.target_binding.unwrap(), None);
    initial.arrangement = vec![
        DailyPlanBlockInput {
            period: "08:07–10:11".into(),
            title: "Synthetic drag range".into(),
            detail: None,
        },
        DailyPlanBlockInput {
            period: "早晨".into(),
            title: "Synthetic fuzzy drag".into(),
            detail: None,
        },
        DailyPlanBlockInput {
            period: "11:07".into(),
            title: "Synthetic point drag".into(),
            detail: None,
        },
    ];
    refresh_fingerprint(&mut initial);
    application.save_daily_plan(initial).unwrap();
    let path = record_path(&vault);
    let document = fs::read_to_string(&path).unwrap().replace(
        "## 白天更新",
        "## 白天更新\n\n### 已发生事件\n\n- 事实：08:45 Synthetic confirmed event\n",
    );
    fs::write(&path, &document).unwrap();
    let loaded = application.read_date(DATE).unwrap();
    assert_eq!(
        loaded.time_axis.current_arrangement[0].start_minute,
        Some(487)
    );
    assert_eq!(
        loaded.time_axis.current_arrangement[0].end_minute,
        Some(611)
    );
    assert_eq!(
        fs::read_to_string(&path).unwrap(),
        document,
        "reading never snaps original non-quarter times"
    );
    let edit = |view: &TodayView,
                name: &str,
                operation: &str,
                start: u16,
                end: Option<u16>|
     -> PlanTimeEditInput {
        let entry = view
            .time_axis
            .current_arrangement
            .iter()
            .find(|entry| entry.text == name)
            .unwrap();
        serde_json::from_value(
            serde_json::json!({"date": DATE, "targetBinding": view.target_binding,
            "expectedRevision": view.revision, "planId": entry.plan_id, "operationId": operation,
            "startMinute": start, "endMinute": end}),
        )
        .unwrap()
    };
    let moved = application
        .edit_plan_time(edit(
            &loaded,
            "Synthetic drag range",
            "range-drag-1",
            1080,
            Some(1204),
        ))
        .unwrap()
        .view
        .unwrap();
    assert_eq!(moved.timeline[0].period, "18:00–20:04");
    assert_eq!(
        moved.time_axis.current_arrangement[0].end_minute.unwrap()
            - moved.time_axis.current_arrangement[0].start_minute.unwrap(),
        124
    );
    let resized = application
        .edit_plan_time(edit(
            &moved,
            "Synthetic drag range",
            "range-resize-1",
            1080,
            Some(1245),
        ))
        .unwrap()
        .view
        .unwrap();
    assert_eq!(resized.timeline[0].period, "18:00–20:45");
    let fuzzy = application
        .edit_plan_time(edit(
            &resized,
            "Synthetic fuzzy drag",
            "fuzzy-drag-1",
            1275,
            None,
        ))
        .unwrap()
        .view
        .unwrap();
    assert_eq!(fuzzy.timeline[1].period, "约21:15");
    assert_eq!(fuzzy.time_axis.current_arrangement[1].end_minute, None);
    let point = application
        .edit_plan_time(edit(
            &fuzzy,
            "Synthetic point drag",
            "point-drag-1",
            1335,
            None,
        ))
        .unwrap()
        .view
        .unwrap();
    assert_eq!(point.timeline[2].period, "22:15");
    assert_eq!(point.time_axis.current_arrangement[2].end_minute, None);
    assert_eq!(point.baseline, loaded.baseline);
    assert_eq!(
        point.time_axis.confirmed_facts,
        loaded.time_axis.confirmed_facts
    );
    assert_eq!(point.tasks, loaded.tasks);
    assert_eq!(
        app(&vault).read_date(DATE).unwrap().time_axis,
        point.time_axis
    );
    assert_eq!(
        section_bytes(
            &fs::read_to_string(&path).unwrap(),
            "早间基准",
            "今天的大致安排"
        ),
        section_bytes(&document, "早间基准", "今天的大致安排")
    );
    if let Ok(directory) = std::env::var("PDEX_UI_FIXTURE_DIRECTORY") {
        fs::create_dir_all(&directory).unwrap();
        fs::write(Path::new(&directory).join("plan-drag-views.json"), serde_json::to_vec_pretty(&serde_json::json!({"loaded": loaded, "moved": moved, "resized": resized, "fuzzy": fuzzy, "point": point})).unwrap()).unwrap();
    }
}
