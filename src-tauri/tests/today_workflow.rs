use personal_dashboard_lib::today::{
    DaytimeUpdateInput, DaytimeUpdateKind, EveningUpdateInput, EveningUpdateMode, TodayApplication,
    TodayClock, TodayRecordStore, TodayState, TodayWorkspaceExchange, TodayWorkspacePersistence,
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

struct FixedClock;

impl TodayClock for FixedClock {
    fn current_date(&self) -> String {
        "2026-08-10".to_owned()
    }

    fn current_time_label(&self) -> String {
        "14:10".to_owned()
    }
}

fn write_record(vault: &Path, document: &str) {
    let path = vault.join("life/Journal/Daily/2026/2026-08/2026-08-10.md");
    fs::create_dir_all(path.parent().expect("record parent should exist"))
        .expect("record directory should be created");
    fs::write(path, document).expect("daily record should be written");
}

fn application_for(vault: &Path) -> TodayApplication<SelectedVault, NoSelection, FixedClock> {
    TodayApplication::new(SelectedVault(vault.to_path_buf()), NoSelection, FixedClock)
}

#[test]
fn daytime_save_appends_one_bounded_update_and_returns_the_refreshed_view() {
    let vault = TempDirectory::new("today-daytime-append");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 白天更新

### 10:05 — 有意义的事件

完成了第一轮工作。

## 用户自己的段落

[[保留这个链接]]
"#,
    );
    let app = application_for(vault.path());
    let initial = app.open().expect("record should open");

    let refreshed = app
        .append_daytime_update(DaytimeUpdateInput {
            expected_revision: initial.revision.expect("ready view should have a revision"),
            kind: DaytimeUpdateKind::MeaningfulEvent,
            content: "确认下午可以继续推进主要工作。".into(),
            habit_name: None,
            habit_outcome: None,
        })
        .expect("bounded daytime update should save");

    assert_eq!(refreshed.daytime.updates.len(), 2);
    assert_eq!(refreshed.daytime.updates[1].title, "14:10 — 有意义的事件");
    assert_eq!(
        refreshed.daytime.updates[1].context,
        vec!["确认下午可以继续推进主要工作。"]
    );
    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("updated record should remain readable");
    assert!(saved.contains("[[保留这个链接]]"));
    assert!(saved.ends_with("## 用户自己的段落\n\n[[保留这个链接]]\n"));
    assert!(saved.contains("### 14:10 — 有意义的事件\n\n确认下午可以继续推进主要工作。"));
}

#[test]
fn evening_addition_and_correction_only_touch_their_bounded_subsections() {
    let vault = TempDirectory::new("today-evening-writes");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
custom: keep
---
# 2026-08-10

## 晚间复盘

### 今天发生了什么

- Agent 准备的事实

### 计划与实际

Agent 准备的比较。

## 未知段落

<!-- keep-byte-for-byte -->
"#,
    );
    let app = application_for(vault.path());
    let initial = app.open().expect("record should open");
    let added = app
        .update_evening_review(EveningUpdateInput {
            expected_revision: initial.revision.expect("revision should exist"),
            mode: EveningUpdateMode::Addition,
            content: "补记：和家人通了电话。".into(),
        })
        .expect("evening addition should save");
    assert_eq!(added.evening.additions, vec!["补记：和家人通了电话。"]);

    let corrected = app
        .update_evening_review(EveningUpdateInput {
            expected_revision: added.revision.expect("refreshed revision should exist"),
            mode: EveningUpdateMode::Correction,
            content: "修正：主要工作只完成了一半。".into(),
        })
        .expect("evening correction should save");

    assert_eq!(
        corrected.evening.corrections,
        vec!["修正：主要工作只完成了一半。"]
    );
    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("record should remain readable");
    assert!(saved.contains("Agent 准备的事实"));
    assert!(saved.contains("Agent 准备的比较。"));
    assert!(saved.contains("custom: keep"));
    assert!(saved.contains("## 未知段落\n\n<!-- keep-byte-for-byte -->"));
}

#[test]
fn writes_create_only_the_missing_canonical_sections_in_predictable_order() {
    let vault = TempDirectory::new("today-create-sections");
    write_record(
        vault.path(),
        "---\ntype: daily-record\ndate: 2026-08-10\n---\n# 2026-08-10\n\n## 今天的大致安排\n\n- **上午：** 工作。\n\n## 晚间复盘\n\n### 今天发生了什么\n\n- 已有内容\n",
    );
    let app = application_for(vault.path());
    let opened = app.open().expect("record should open");
    let daytime = app
        .append_daytime_update(DaytimeUpdateInput {
            expected_revision: opened.revision.expect("revision should exist"),
            kind: DaytimeUpdateKind::RememberedBlock,
            content: "补记 13:00–14:00 的专注工作。".into(),
            habit_name: None,
            habit_outcome: None,
        })
        .expect("missing daytime section should be created");
    app.update_evening_review(EveningUpdateInput {
        expected_revision: daytime.revision.expect("revision should refresh"),
        mode: EveningUpdateMode::Addition,
        content: "补充一件小事。".into(),
    })
    .expect("existing evening section should receive bounded subsection");

    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("record should remain readable");
    assert!(saved.find("## 白天更新").unwrap() < saved.find("## 晚间复盘").unwrap());
    assert_eq!(saved.matches("## 白天更新").count(), 1);
    assert_eq!(saved.matches("## 晚间复盘").count(), 1);
}

#[test]
fn stale_revision_reports_a_conflict_and_preserves_the_external_edit() {
    let vault = TempDirectory::new("today-conflict");
    let original = "---\ntype: daily-record\ndate: 2026-08-10\n---\n# 2026-08-10\n\n## 白天更新\n";
    write_record(vault.path(), original);
    let app = application_for(vault.path());
    let opened = app.open().expect("record should open");
    let external = format!("{original}\n外部编辑必须保留。\n");
    write_record(vault.path(), &external);

    let error = app
        .append_daytime_update(DaytimeUpdateInput {
            expected_revision: opened.revision.expect("revision should exist"),
            kind: DaytimeUpdateKind::MeaningfulEvent,
            content: "不能覆盖外部编辑。".into(),
            habit_name: None,
            habit_outcome: None,
        })
        .expect_err("stale write should conflict");

    assert!(error.contains("外部发生变化"));
    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("external edit should remain readable");
    assert_eq!(saved, external);
}

struct FailingRecordStore;

impl TodayRecordStore for FailingRecordStore {
    fn load(&self, path: &Path) -> Result<Option<Vec<u8>>, String> {
        fs::read(path).map(Some).map_err(|error| error.to_string())
    }

    fn save_if_unchanged(
        &self,
        _path: &Path,
        _expected: &[u8],
        _updated: &[u8],
    ) -> Result<(), String> {
        Err("simulated atomic write failure".into())
    }
}

#[test]
fn atomic_write_failure_is_visible_and_leaves_the_record_unchanged() {
    let vault = TempDirectory::new("today-atomic-failure");
    let original = "---\ntype: daily-record\ndate: 2026-08-10\n---\n# 2026-08-10\n\n## 白天更新\n";
    write_record(vault.path(), original);
    let app = TodayApplication::with_record_store(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        FixedClock,
        FailingRecordStore,
    );
    let opened = app.open().expect("record should open");

    let error = app
        .append_daytime_update(DaytimeUpdateInput {
            expected_revision: opened.revision.expect("revision should exist"),
            kind: DaytimeUpdateKind::MeaningfulEvent,
            content: "这条不会落盘。".into(),
            habit_name: None,
            habit_outcome: None,
        })
        .expect_err("write failure should be returned");

    assert!(error.contains("simulated atomic write failure"));
    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("original record should remain readable");
    assert_eq!(saved, original);
}

#[test]
fn habit_outcome_accepts_only_agreed_meanings_and_never_infers_absence() {
    let vault = TempDirectory::new("today-habit-outcome");
    write_record(
        vault.path(),
        "---\ntype: daily-record\ndate: 2026-08-10\n---\n# 2026-08-10\n\n## 白天更新\n",
    );
    let app = application_for(vault.path());
    let opened = app.open().expect("record should open");
    let error = app
        .append_daytime_update(DaytimeUpdateInput {
            expected_revision: opened.revision.clone().expect("revision should exist"),
            kind: DaytimeUpdateKind::HabitOutcome,
            content: "今天做了轻量版本。".into(),
            habit_name: Some("Exercise".into()),
            habit_outcome: None,
        })
        .expect_err("absence must remain unknown instead of being inferred");
    assert!(error.contains("unknown"));

    let saved = app
        .append_daytime_update(DaytimeUpdateInput {
            expected_revision: opened.revision.expect("revision should exist"),
            kind: DaytimeUpdateKind::HabitOutcome,
            content: "今天做了轻量版本。".into(),
            habit_name: Some("Exercise".into()),
            habit_outcome: Some("baseline".into()),
        })
        .expect("agreed outcome should save");
    assert_eq!(saved.daytime.updates.len(), 1);
}

#[test]
fn malformed_identity_and_duplicate_targets_refuse_writes_without_changing_bytes() {
    for (label, original) in [
        (
            "malformed",
            "---\ntype: note\ndate: 2026-08-10\n---\n# 2026-08-10\n\n## 白天更新\n",
        ),
        (
            "duplicate",
            "---\ntype: daily-record\ndate: 2026-08-10\n---\n# 2026-08-10\n\n## 白天更新\n\n## 白天更新\n",
        ),
    ] {
        let vault = TempDirectory::new(label);
        write_record(vault.path(), original);
        let error = application_for(vault.path())
            .append_daytime_update(DaytimeUpdateInput {
                expected_revision: {
                    let mut hash = 0xcbf29ce484222325u64;
                    for byte in original.as_bytes() {
                        hash ^= u64::from(*byte);
                        hash = hash.wrapping_mul(0x100000001b3);
                    }
                    format!("{hash:016x}")
                },
                kind: DaytimeUpdateKind::MeaningfulEvent,
                content: "不应写入。".into(),
                habit_name: None,
                habit_outcome: None,
            })
            .expect_err("invalid record should reject writes");
        assert!(error.contains("身份") || error.contains("多个"));
        let saved = fs::read_to_string(
            vault
                .path()
                .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
        )
        .expect("original record should remain readable");
        assert_eq!(saved, original);
    }
}

#[test]
fn valid_daily_record_returns_a_presentation_ready_morning_plan() {
    let vault = TempDirectory::new("today-valid");
    let record_path = vault
        .path()
        .join("life/Journal/Daily/2026/2026-08/2026-08-10.md");
    fs::create_dir_all(record_path.parent().expect("record parent should exist"))
        .expect("record directory should be created");
    fs::write(
        &record_path,
        r#"---
type: daily-record
date: 2026-08-10
owner: user
---
# 2026-08-10

## 今天的大致安排

- **上午：** 准备 10:00 check-in；之后完成 reimbursement。
- **下午：** 留一块连续时间推进主要工作。

## 计划依据

### 固定安排

- 10:00 check-in

### Tasks（任务）

- [Insurance reimbursement](ticktick://task/123)

### Habits（习惯）

- 深蹲

### Options（可选项）

- 阅读一篇论文

## 用户临时写下的内容

这段内容属于用户，不应破坏 Today。
"#,
    )
    .expect("daily record should be written");

    let app = TodayApplication::new(
        SelectedVault(vault.path().to_path_buf()),
        NoSelection,
        FixedClock,
    );

    let view = app.open().expect("valid daily record should open");

    assert_eq!(view.state, TodayState::Ready);
    assert_eq!(view.date, "2026-08-10");
    assert_eq!(view.timeline.len(), 2);
    assert_eq!(view.timeline[0].period, "上午");
    assert_eq!(view.timeline[0].title, "准备 10:00 check-in");
    assert_eq!(
        view.timeline[0].detail.as_deref(),
        Some("之后完成 reimbursement。")
    );
    assert_eq!(view.evidence.len(), 4);
    assert_eq!(view.evidence[0].label, "固定安排");
    assert_eq!(view.evidence[0].items, vec!["10:00 check-in"]);
    assert_eq!(view.evidence[1].label, "Tasks（任务）");
    assert_eq!(view.evidence[1].items, vec!["Insurance reimbursement"]);
}

#[test]
fn complete_daily_record_projects_daytime_and_evening_reading_views() {
    let vault = TempDirectory::new("today-complete-lifecycle");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 今天的大致安排

- **上午：** 完成主要工作。

## 白天更新

### 14:10 — 重大调整

突然出现紧急工作，同时能量很低。放弃原本的下午安排。

- 17:00 前完成紧急工作；
- Exercise 改为 low-energy baseline：步行 10 分钟；
- 晚饭后用于恢复。

### 16:40 — 有意义的记录

紧急工作已经完成，比预期更早恢复了一点精力。

## 晚间复盘

### 今天发生了什么

- 完成主要工作和紧急工作；
- 步行约 12 分钟；
- living space 是否整理保持 unknown。

### 计划与实际

下午因紧急工作偏离原计划，之后保护了恢复时间。

### 简单总结（可选）

这是受约束的一天，不是失败的一天。

### 开放问题

- 有没有一件重要但尚未记录的事？
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("complete daily record should open");

    assert_eq!(view.state, TodayState::Ready);
    assert_eq!(view.daytime.updates.len(), 2);
    assert_eq!(view.daytime.updates[0].title, "14:10 — 重大调整");
    assert_eq!(
        view.daytime.updates[0].context,
        vec!["突然出现紧急工作，同时能量很低。放弃原本的下午安排。"]
    );
    assert_eq!(
        view.daytime.updates[0].revised_direction,
        vec![
            "17:00 前完成紧急工作；",
            "Exercise 改为 low-energy baseline：步行 10 分钟；",
            "晚饭后用于恢复。",
        ]
    );
    assert_eq!(
        view.evening.account,
        vec![
            "完成主要工作和紧急工作；",
            "步行约 12 分钟；",
            "living space 是否整理保持 unknown。",
        ]
    );
    assert_eq!(
        view.evening.comparison,
        vec!["下午因紧急工作偏离原计划，之后保护了恢复时间。"]
    );
    assert_eq!(
        view.evening.summary,
        vec!["这是受约束的一天，不是失败的一天。"]
    );
    assert_eq!(
        view.evening.questions,
        vec!["有没有一件重要但尚未记录的事？"]
    );
}

#[test]
fn missing_record_returns_an_honest_empty_state() {
    let vault = TempDirectory::new("today-missing");

    let view = application_for(vault.path())
        .open()
        .expect("a missing record should be a presentation state");

    assert_eq!(view.state, TodayState::Missing);
    assert!(view.timeline.is_empty());
    assert!(view.evidence.is_empty());
    assert!(view.message.contains("Codex"));
}

#[test]
fn minimal_valid_record_remains_readable_without_optional_content() {
    let vault = TempDirectory::new("today-minimal");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
owner: user
source: morning-planning
---
# 2026-08-10

## 今天的大致安排

## 计划依据
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("minimal valid record should open");

    assert_eq!(view.state, TodayState::Ready);
    assert!(view.timeline.is_empty());
    assert!(view.evidence.is_empty());
    assert!(view.daytime.updates.is_empty());
    assert!(view.evening.account.is_empty());
    assert!(view.evening.comparison.is_empty());
    assert!(view.evening.summary.is_empty());
    assert!(view.evening.questions.is_empty());
    assert!(view.message.contains("尚未写入"));
}

#[test]
fn malformed_identity_is_a_repairable_presentation_error() {
    let vault = TempDirectory::new("today-malformed-identity");
    write_record(
        vault.path(),
        r#"---
type: meeting-note
date: 2026-08-09
---
## 今天的大致安排
- **上午：** 不应展示
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("identity failure should be presented, not thrown");

    assert_eq!(view.state, TodayState::Error);
    assert!(view.message.contains("修复 type 和 date"));
    assert!(view.timeline.is_empty());
}

#[test]
fn duplicate_canonical_section_is_a_repairable_presentation_error() {
    let vault = TempDirectory::new("today-duplicate-section");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
## 今天的大致安排
- **上午：** 第一份计划
## 今天的大致安排
- **下午：** 第二份计划
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("duplicate section should be presented, not thrown");

    assert_eq!(view.state, TodayState::Error);
    assert!(view.message.contains("合并重复段落"));
}

#[test]
fn duplicate_daytime_or_evening_sections_are_repairable_errors() {
    let vault = TempDirectory::new("today-duplicate-lifecycle-section");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
## 今天的大致安排
- **上午：** 正常计划
## 白天更新
### 12:00 — 记录
第一条。
## 白天更新
### 14:00 — 记录
第二条。
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("duplicate lifecycle section should be presented, not thrown");

    assert_eq!(view.state, TodayState::Error);
    assert!(view.message.contains("白天更新"));
    assert!(view.message.contains("合并重复段落"));
}

#[test]
fn unfamiliar_frontmatter_headings_and_user_prose_do_not_break_today() {
    let vault = TempDirectory::new("today-unfamiliar-content");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
future-field:
  nested: value
---
## 一个未来版本的新段落

任意用户文本。

## 今天的大致安排

- **晚上：** 散步

## 用户临时写下的内容

- 不属于计划的自由文本

## 白天更新

### 12:20 — 用户自己的标题

完成了一次重要通话。

## 晚间复盘

### 一个未来版本的新复盘段落

这段未知内容不应被猜测成总结。

### 今天发生了什么

- 完成重要通话。
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("unfamiliar content should be tolerated");

    assert_eq!(view.state, TodayState::Ready);
    assert_eq!(view.timeline.len(), 1);
    assert_eq!(view.timeline[0].title, "散步");
    assert_eq!(view.daytime.updates.len(), 1);
    assert_eq!(
        view.daytime.updates[0].context,
        vec!["完成了一次重要通话。"]
    );
    assert_eq!(view.evening.account, vec!["完成重要通话。"]);
    assert!(view.evening.summary.is_empty());
}

#[test]
fn reopening_reads_an_external_update_instead_of_caching_the_record() {
    let vault = TempDirectory::new("today-refresh");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
## 今天的大致安排
- **上午：** 初始计划
"#,
    );
    let app = application_for(vault.path());
    assert_eq!(
        app.open().expect("initial record should open").timeline[0].title,
        "初始计划"
    );

    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
## 今天的大致安排
- **上午：** 外部更新后的计划
## 白天更新
### 15:00 — 外部更新
下午方向也已更新。
## 晚间复盘
### 计划与实际
晚间比较也来自同一次刷新。
"#,
    );

    assert_eq!(
        app.open().expect("updated record should open").timeline[0].title,
        "外部更新后的计划"
    );
    let refreshed = app.open().expect("all phase projections should refresh");
    assert_eq!(
        refreshed.daytime.updates[0].context,
        vec!["下午方向也已更新。"]
    );
    assert_eq!(
        refreshed.evening.comparison,
        vec!["晚间比较也来自同一次刷新。"]
    );
}

#[test]
fn opening_the_daily_lifecycle_is_read_only() {
    let vault = TempDirectory::new("today-read-only");
    let document = r#"---
type: daily-record
date: 2026-08-10
---
## 今天的大致安排
- **上午：** 保持原文
## 白天更新
### 14:00 — 记录
只读内容。
## 晚间复盘
### 今天发生了什么
- 保持原文。
"#;
    write_record(vault.path(), document);

    let app = application_for(vault.path());
    let _ = app.open().expect("record should open read-only");
    let _ = app.open().expect("reopening should remain read-only");

    assert_eq!(
        fs::read_to_string(
            vault
                .path()
                .join("life/Journal/Daily/2026/2026-08/2026-08-10.md")
        )
        .expect("record should remain readable"),
        document
    );
}

#[derive(Clone)]
struct MutableSelection(Rc<RefCell<Option<PathBuf>>>);

impl TodayWorkspacePersistence for MutableSelection {
    fn load_selected_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(self.0.borrow().clone())
    }

    fn save_selected_vault(&self, vault: &Path) -> Result<(), String> {
        *self.0.borrow_mut() = Some(vault.to_path_buf());
        Ok(())
    }
}

struct ChosenVault(PathBuf);

impl TodayWorkspaceExchange for ChosenVault {
    fn select_vault(&self) -> Result<Option<PathBuf>, String> {
        Ok(Some(self.0.clone()))
    }
}

#[test]
fn selecting_a_vault_persists_it_and_immediately_reads_today() {
    let vault = TempDirectory::new("today-select");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
## 今天的大致安排
- **上午：** 选择后可见
"#,
    );
    let selected = Rc::new(RefCell::new(None));
    let app = TodayApplication::new(
        MutableSelection(selected.clone()),
        ChosenVault(vault.path().to_path_buf()),
        FixedClock,
    );

    assert_eq!(
        app.open().expect("unconfigured state should open").state,
        TodayState::Unconfigured
    );
    let view = app
        .select_vault()
        .expect("selected vault should be saved and opened");

    assert_eq!(view.state, TodayState::Ready);
    assert_eq!(view.timeline[0].title, "选择后可见");
    assert_eq!(selected.borrow().as_deref(), Some(vault.path()));
}
