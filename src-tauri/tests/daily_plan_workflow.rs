use personal_dashboard_lib::tasks::TaskDataState;
use personal_dashboard_lib::today::{
    daily_plan_effect_fingerprint, BaselineAvailability, DailyPlanBlockInput,
    DailyPlanEvidenceInput, DailyPlanTransition, DailyPlanWriteInput, TodayApplication, TodayClock,
    TodayState, TodayWorkspaceExchange, TodayWorkspacePersistence,
};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

const DATE: &str = "2026-08-10";

struct TempDirectory(PathBuf);

impl TempDirectory {
    fn new() -> Self {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock is after epoch")
            .as_nanos();
        let path = std::env::temp_dir().join(format!(
            "personal-dashboard-daily-plan-{}-{nonce}",
            std::process::id()
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
