use personal_dashboard_lib::today::{
    collaboration_evening_review_fingerprint, CollaborationEveningReviewInput,
    CollaborationEveningReviewMode, TodayApplication, TodayClock, TodayWorkspaceExchange,
    TodayWorkspacePersistence,
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
            "personal-dashboard-evening-review-{}-{nonce}-{sequence}",
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
        "21:15".into()
    }

    fn current_timestamp_label(&self) -> String {
        "2026-08-10T21:15-04:00".into()
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

fn write_record(vault: &Path, document: &str) {
    let path = record_path(vault);
    fs::create_dir_all(path.parent().expect("Daily Record parent exists"))
        .expect("Daily Record parent is created");
    fs::write(path, document).expect("synthetic Daily Record is written");
}

fn complete_record(evening: &str) -> String {
    format!(
        "---\ntype: daily-record\ndate: {DATE}\n---\n# {DATE}\n\n## 早间基准\n\n### 初始安排\n\n- **上午：** 初始工作块。\n\n### 初始计划依据\n\n- 初始依据，必须保留。\n\n## 今天的大致安排\n\n- **下午：** 当前工作块。\n\n## 计划依据\n\n- 当前依据，必须保留。\n\n## 白天更新\n\n### 11:00 — 更新记录，不作为事实时间\n\n- 观察事实：完成第一版。\n\n## 晚间复盘\n\n{evening}\n\n## 私人扩展\n\n保留此未知章节。\n"
    )
}

fn review_input(
    target_binding: String,
    expected_revision: String,
    operation_id: &str,
    mode: CollaborationEveningReviewMode,
    content: &str,
) -> CollaborationEveningReviewInput {
    CollaborationEveningReviewInput {
        date: DATE.into(),
        target_binding,
        expected_revision,
        operation_id: operation_id.into(),
        effect_fingerprint: collaboration_evening_review_fingerprint(DATE, mode, content),
        mode,
        content: content.into(),
    }
}

fn section<'a>(document: &'a str, heading: &str, next: &str) -> &'a str {
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
fn date_bound_review_addition_and_correction_append_with_receipts_and_preserve_baseline() {
    let directory = TempDirectory::new();
    let vault = directory.vault("vault");
    let original = complete_record(
        "### 今天发生了什么\n\n- 我亲自记录的复盘原文。\n\n### 用户补充\n\n- 之前已经补充的内容。\n",
    );
    write_record(&vault, &original);

    let application = app(&vault);
    let opened = application.read_date(DATE).unwrap();
    let binding = opened.target_binding.clone().unwrap();
    let baseline = section(&original, "早间基准", "今天的大致安排").to_owned();
    let initial_evening = section(&original, "晚间复盘", "私人扩展").to_owned();

    let added = application
        .update_collaboration_evening_review(review_input(
            binding.clone(),
            opened.revision.clone().unwrap(),
            "review-add-1",
            CollaborationEveningReviewMode::Addition,
            "完成了晚间整理。",
        ))
        .unwrap();
    assert!(added
        .evening
        .additions
        .iter()
        .any(|line| line == "晚间复盘补充：完成了晚间整理。"));
    let after_addition = fs::read_to_string(record_path(&vault)).unwrap();
    assert_eq!(
        section(&after_addition, "早间基准", "今天的大致安排"),
        baseline
    );
    assert!(section(&after_addition, "晚间复盘", "私人扩展")
        .contains(&initial_evening["## 晚间复盘".len()..]));
    assert_eq!(after_addition.matches("id=review-add-1 ").count(), 1);
    assert!(!added
        .evening
        .other
        .iter()
        .any(|entry| entry.heading == "协作写入收据"));
    assert!(application
        .collaboration_evening_review_operation_applied(
            DATE,
            &binding,
            "review-add-1",
            &collaboration_evening_review_fingerprint(
                DATE,
                CollaborationEveningReviewMode::Addition,
                "完成了晚间整理。",
            ),
        )
        .unwrap());

    let correction = application
        .update_collaboration_evening_review(review_input(
            binding.clone(),
            added.revision.clone().unwrap(),
            "review-correct-1",
            CollaborationEveningReviewMode::Correction,
            "修正：整理实际发生在午后。",
        ))
        .unwrap();
    assert!(correction
        .evening
        .corrections
        .iter()
        .any(|line| line.contains("review-2026-08-10") && line.contains("整理实际发生在午后")));
    assert!(correction
        .evening
        .additions
        .iter()
        .any(|line| line == "之前已经补充的内容。"));
    assert!(correction
        .evening
        .additions
        .iter()
        .any(|line| line == "晚间复盘补充：完成了晚间整理。"));
    let after_correction = fs::read_to_string(record_path(&vault)).unwrap();
    assert_eq!(
        section(&after_correction, "早间基准", "今天的大致安排"),
        baseline
    );
    assert!(after_correction.contains("保留此未知章节。"));

    let reopened = app(&vault).read_date(DATE).unwrap();
    assert_eq!(reopened.evening, correction.evening);
    assert!(app(&vault)
        .collaboration_evening_review_operation_applied(
            DATE,
            &binding,
            "review-correct-1",
            &collaboration_evening_review_fingerprint(
                DATE,
                CollaborationEveningReviewMode::Correction,
                "修正：整理实际发生在午后。",
            ),
        )
        .unwrap());

    let duplicate = app(&vault)
        .update_collaboration_evening_review(review_input(
            binding,
            "stale-revision-is-allowed-only-for-exact-receipt-replay".into(),
            "review-correct-1",
            CollaborationEveningReviewMode::Correction,
            "修正：整理实际发生在午后。",
        ))
        .unwrap();
    assert_eq!(duplicate.evening, reopened.evening);
    assert_eq!(
        fs::read_to_string(record_path(&vault))
            .unwrap()
            .matches("id=review-correct-1 ")
            .count(),
        1
    );
}

#[test]
fn review_refuses_stale_revision_switched_vault_and_unknown_receipt_content() {
    let directory = TempDirectory::new();
    let vault_a = directory.vault("vault-a");
    let vault_b = directory.vault("vault-b");
    let original = complete_record("");
    write_record(&vault_a, &original);
    write_record(&vault_b, &original);

    let app_a = app(&vault_a);
    let read_a = app_a.read_date(DATE).unwrap();
    let binding_a = read_a.target_binding.unwrap();
    let input_a = review_input(
        binding_a.clone(),
        read_a.revision.unwrap(),
        "review-stale-1",
        CollaborationEveningReviewMode::Addition,
        "新补充。",
    );
    let after_external_change = format!("{original}\n<!-- outside edit -->\n");
    fs::write(record_path(&vault_a), &after_external_change).unwrap();
    assert!(app_a
        .update_collaboration_evening_review(input_a.clone())
        .unwrap_err()
        .contains("刷新"));
    assert_eq!(
        fs::read_to_string(record_path(&vault_a)).unwrap(),
        after_external_change
    );

    let app_b = app(&vault_b);
    assert!(app_b
        .update_collaboration_evening_review(input_a)
        .unwrap_err()
        .contains("Vault"));
    assert_eq!(fs::read_to_string(record_path(&vault_b)).unwrap(), original);

    let malformed = complete_record("### 协作写入收据\n\n保留的用户说明，不能当作应用收据覆盖。\n");
    write_record(&vault_a, &malformed);
    let fresh = app_a.read_date(DATE).unwrap();
    let malformed_before = fs::read_to_string(record_path(&vault_a)).unwrap();
    assert!(app_a
        .update_collaboration_evening_review(review_input(
            fresh.target_binding.unwrap(),
            fresh.revision.unwrap(),
            "review-malformed-1",
            CollaborationEveningReviewMode::Addition,
            "新补充。",
        ))
        .unwrap_err()
        .contains("收据"));
    assert_eq!(
        fs::read_to_string(record_path(&vault_a)).unwrap(),
        malformed_before
    );
}
