use personal_dashboard_lib::today::{
    BaselineAvailability, DaytimeUpdateInput, DaytimeUpdateKind, EveningUpdateInput,
    EveningUpdateMode, FileTodayRecordStore, TodayApplication, TodayClock, TodayRecordStore,
    TodayState, TodayWorkspaceExchange, TodayWorkspacePersistence,
};
use std::cell::RefCell;
use std::fs;
#[cfg(target_os = "macos")]
use std::io::Write;
#[cfg(target_os = "macos")]
use std::os::unix::fs::MetadataExt;
use std::path::{Path, PathBuf};
use std::rc::Rc;
#[cfg(target_os = "macos")]
use std::sync::atomic::{AtomicBool, Ordering};
#[cfg(target_os = "macos")]
use std::sync::Arc;
#[cfg(target_os = "macos")]
use std::thread;
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

    fn current_timestamp_label(&self) -> String {
        "2026-08-10T14:10-04:00".to_owned()
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
fn new_record_exposes_an_independent_morning_baseline_and_current_plan() {
    let vault = TempDirectory::new("today-independent-baseline");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 早间基准

### 初始安排

- **上午：** 先完成原定项目。
- **下午：** 留出安静工作块。

### 初始计划依据

#### 固定安排

- 10:00 check-in

## 今天的大致安排

- **下午：** 先处理紧急工作。
- **晚上：** 保护恢复空间。

## 计划依据

### 当前约束

- 紧急工作需要 17:00 前完成

## 白天更新

### 14:10 — 重大调整

- 原计划意图：下午推进原定项目。
- 修订方向：先处理紧急工作。

## 晚间复盘
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("new-format record should open");

    assert_eq!(view.baseline.availability, BaselineAvailability::Saved);
    assert_eq!(view.baseline.timeline[0].title, "先完成原定项目。");
    assert_eq!(view.baseline.evidence[0].label, "固定安排");
    assert_eq!(view.timeline[0].title, "先处理紧急工作。");
    assert_eq!(view.evidence[0].label, "当前约束");
}

#[test]
fn old_record_keeps_its_current_plan_without_inventing_a_baseline() {
    let vault = TempDirectory::new("today-old-record-no-baseline");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 今天的大致安排

- **下午：** 这是旧记录仍然可读的主计划。

## 计划依据

### Tasks（任务）

- 旧记录里的任务

## 白天更新

## 晚间复盘
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("old four-section record should open");

    assert_eq!(view.state, TodayState::Ready);
    assert_eq!(view.baseline.availability, BaselineAvailability::Missing);
    assert!(view.baseline.timeline.is_empty());
    assert!(view.baseline.evidence.is_empty());
    assert!(view.baseline.message.contains("未独立保存早间基准"));
    assert_eq!(view.timeline[0].title, "这是旧记录仍然可读的主计划。");
    assert_eq!(view.evidence[0].items, vec!["旧记录里的任务"]);
}

#[test]
fn blank_baseline_is_distinct_from_missing_and_saved_baselines() {
    let vault = TempDirectory::new("today-blank-baseline");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 早间基准

### 初始安排

### 初始计划依据

## 今天的大致安排

- **下午：** 当前安排仍然可读。
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("blank baseline should remain readable");

    assert_eq!(view.baseline.availability, BaselineAvailability::Empty);
    assert!(view.baseline.timeline.is_empty());
    assert!(view.baseline.evidence.is_empty());
    assert_eq!(view.timeline[0].title, "当前安排仍然可读。");
}

#[test]
fn evidence_headings_without_items_do_not_make_a_baseline_saved() {
    let vault = TempDirectory::new("today-heading-only-baseline");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 早间基准

### 初始安排

### 初始计划依据

#### 固定安排

#### Tasks（任务）

## 今天的大致安排

- **下午：** 当前安排仍然可读。
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("heading-only baseline should remain readable");

    assert_eq!(view.baseline.availability, BaselineAvailability::Empty);
    assert!(view.baseline.timeline.is_empty());
    assert!(view.baseline.evidence.is_empty());
}

#[test]
fn synthetic_day_contexts_only_project_explicit_baseline_current_and_fact_content() {
    struct Example {
        label: &'static str,
        baseline: &'static str,
        current: &'static str,
        daytime: &'static str,
        expected_baseline: &'static str,
        expected_current: &'static str,
        expected_fact_count: usize,
        expected_direction_count: usize,
    }

    let examples = [
        Example {
            label: "planning-after-waking-early",
            baseline: "- **上午：** 07:00 起床后确认先做重要工作。",
            current: "- **上午：** 07:00 起床后确认先做重要工作。",
            daytime: "",
            expected_baseline: "07:00 起床后确认先做重要工作。",
            expected_current: "07:00 起床后确认先做重要工作。",
            expected_fact_count: 0,
            expected_direction_count: 0,
        },
        Example {
            label: "planning-after-waking-late",
            baseline: "- **上午：** 11:00 起床后从早餐开始。",
            current: "- **上午：** 11:00 起床后从早餐开始。",
            daytime: "### 11:00 — 有意义的事件\n\n- 观察事实：11:00 起床。",
            expected_baseline: "11:00 起床后从早餐开始。",
            expected_current: "11:00 起床后从早餐开始。",
            expected_fact_count: 1,
            expected_direction_count: 0,
        },
        Example {
            label: "first-reply-after-working-all-morning",
            baseline: "- **上午：** 自动安排的学习块。",
            current: "- **下午：** 接下来先处理紧急工作。",
            daytime: "### 11:00 — 有意义的事件\n\n- 观察事实：上午已完成明确报告的工作。\n- 修订方向：下午先处理紧急工作。",
            expected_baseline: "自动安排的学习块。",
            expected_current: "接下来先处理紧急工作。",
            expected_fact_count: 1,
            expected_direction_count: 1,
        },
        Example {
            label: "event-only",
            baseline: "- **下午：** 保留原来的下午安排。",
            current: "- **下午：** 保留原来的下午安排。",
            daytime: "### 14:10 — 有意义的事件\n\n- 观察事实：收到一个包裹。",
            expected_baseline: "保留原来的下午安排。",
            expected_current: "保留原来的下午安排。",
            expected_fact_count: 1,
            expected_direction_count: 0,
        },
        Example {
            label: "pure-replan",
            baseline: "- **下午：** 推进原定项目。",
            current: "- **下午：** 改为阅读，不需要说明原因。",
            daytime: "### 14:10 — 重大调整\n\n下午想换个方向。\n\n- 原计划意图：推进原定项目。\n- 修订方向：改为阅读。",
            expected_baseline: "推进原定项目。",
            expected_current: "改为阅读，不需要说明原因。",
            expected_fact_count: 0,
            expected_direction_count: 1,
        },
    ];

    for example in examples {
        let vault = TempDirectory::new(example.label);
        let document = format!(
            "---\ntype: daily-record\ndate: 2026-08-10\n---\n# 2026-08-10\n\n## 早间基准\n\n### 初始安排\n\n{}\n\n### 初始计划依据\n\n## 今天的大致安排\n\n{}\n\n## 计划依据\n\n## 白天更新\n\n{}\n\n## 晚间复盘\n",
            example.baseline, example.current, example.daytime
        );
        write_record(vault.path(), &document);

        let view = application_for(vault.path())
            .open()
            .unwrap_or_else(|error| panic!("{} should open: {error}", example.label));

        assert_eq!(
            view.baseline.timeline[0].title, example.expected_baseline,
            "{} baseline",
            example.label
        );
        assert_eq!(
            view.timeline[0].title, example.expected_current,
            "{} current arrangement",
            example.label
        );
        let fact_count = view
            .daytime
            .updates
            .iter()
            .map(|update| update.observed_facts.len())
            .sum::<usize>();
        let direction_count = view
            .daytime
            .updates
            .iter()
            .map(|update| update.revised_direction.len())
            .sum::<usize>();
        assert_eq!(
            fact_count, example.expected_fact_count,
            "{} facts",
            example.label
        );
        assert_eq!(
            direction_count, example.expected_direction_count,
            "{} directions",
            example.label
        );
    }
}

#[test]
fn bounded_daytime_write_preserves_the_independent_baseline_bytes() {
    let vault = TempDirectory::new("today-baseline-write-preservation");
    let original = r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 早间基准

### 初始安排

- **上午：** 原始起点必须保留。

### 初始计划依据

#### 固定安排

- 10:00 check-in

## 今天的大致安排

- **下午：** 当前安排。

## 白天更新

## 晚间复盘
"#;
    write_record(vault.path(), original);
    let app = application_for(vault.path());
    let opened = app.open().expect("record should open");

    app.append_daytime_update(DaytimeUpdateInput {
        expected_revision: opened.revision.expect("revision should exist"),
        kind: DaytimeUpdateKind::MaterialChange,
        content: "下午改为阅读。".into(),
        habit_name: None,
        habit_outcome: None,
    })
    .expect("bounded update should save");

    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("record should remain readable");
    let original_baseline = original
        .split_once("## 早间基准")
        .and_then(|(_, rest)| rest.split_once("## 今天的大致安排"))
        .map(|(baseline, _)| baseline)
        .expect("fixture should contain a baseline");
    let saved_baseline = saved
        .split_once("## 早间基准")
        .and_then(|(_, rest)| rest.split_once("## 今天的大致安排"))
        .map(|(baseline, _)| baseline)
        .expect("saved record should contain a baseline");
    assert_eq!(saved_baseline, original_baseline);
    assert!(saved.contains("调整后方向：下午改为阅读。"));
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
        refreshed.daytime.updates[1].observed_facts,
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
    assert!(
        saved.contains("### 14:10 — 有意义的事件\n\n- 观察事实：确认下午可以继续推进主要工作。")
    );
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
fn evening_write_ignores_heading_like_text_inside_multiline_frontmatter() {
    let vault = TempDirectory::new("today-frontmatter-heading");
    let original = r#"---
type: daily-record
date: 2026-08-10
notes: |
  ## 晚间复盘
  ### 用户修正
  这些只是 YAML multiline scalar 的内容。
future-field: keep-byte-for-byte
---
# 2026-08-10

## 晚间复盘

### 用户修正

- 旧修正。

## 用户自己的段落

<!-- keep-byte-for-byte -->
"#;
    write_record(vault.path(), original);
    let app = application_for(vault.path());
    let opened = app.open().expect("record should open");

    let refreshed = app
        .update_evening_review(EveningUpdateInput {
            expected_revision: opened.revision.expect("revision should exist"),
            mode: EveningUpdateMode::Correction,
            content: "新修正。".into(),
        })
        .expect("body correction should save");

    assert_eq!(refreshed.state, TodayState::Ready);
    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("record should remain readable");
    let expected_frontmatter = original.split_once("# 2026-08-10").unwrap().0;
    assert!(saved.starts_with(expected_frontmatter));
    assert!(saved.contains("future-field: keep-byte-for-byte\n---\n"));
    assert!(saved.ends_with("## 用户自己的段落\n\n<!-- keep-byte-for-byte -->\n"));
    assert_eq!(saved.matches("## 晚间复盘").count(), 2);
    assert!(saved.contains("### 用户修正\n\n- 新修正。"));
}

#[test]
fn evening_correction_preserves_an_indented_unfamiliar_body_subsection() {
    let vault = TempDirectory::new("today-indented-evening-subsection");
    let original = r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 晚间复盘

### 用户修正

旧修正。

  ### 用户自己的记录

必须保留的用户内容。

## 用户自己的段落

<!-- keep-byte-for-byte -->
"#;
    write_record(vault.path(), original);
    let app = application_for(vault.path());
    let opened = app.open().expect("record should open");

    let refreshed = app
        .update_evening_review(EveningUpdateInput {
            expected_revision: opened.revision.expect("revision should exist"),
            mode: EveningUpdateMode::Correction,
            content: "新修正。".into(),
        })
        .expect("correction should preserve an unfamiliar body subsection");

    assert_eq!(refreshed.state, TodayState::Ready);
    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("record should remain readable");
    assert!(saved.contains("### 用户修正\n\n- 新修正。"));
    assert!(saved.contains("  ### 用户自己的记录\n\n必须保留的用户内容。"));
    assert!(saved.ends_with("## 用户自己的段落\n\n<!-- keep-byte-for-byte -->\n"));
}

#[test]
fn evening_correction_preserves_an_unfamiliar_heading_with_an_attached_hash() {
    let vault = TempDirectory::new("today-attached-hash-evening-subsection");
    let original = r#"---
type: daily-record
date: 2026-08-10
future-field: keep-byte-for-byte
---
# 2026-08-10

## 晚间复盘

### 用户修正#

必须保留的用户内容。

## 用户自己的段落

<!-- keep-byte-for-byte -->
"#;
    write_record(vault.path(), original);
    let app = application_for(vault.path());
    let opened = app.open().expect("record should open");

    let refreshed = app
        .update_evening_review(EveningUpdateInput {
            expected_revision: opened.revision.expect("revision should exist"),
            mode: EveningUpdateMode::Correction,
            content: "新修正。".into(),
        })
        .expect("correction should preserve the unfamiliar subsection");

    assert_eq!(refreshed.state, TodayState::Ready);
    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("record should remain readable");
    assert!(saved.starts_with(
        "---\ntype: daily-record\ndate: 2026-08-10\nfuture-field: keep-byte-for-byte\n---\n"
    ));
    assert!(saved.contains("### 用户修正#\n\n必须保留的用户内容。"));
    assert!(saved.contains("### 用户修正\n\n- 新修正。"));
    assert!(saved.ends_with("## 用户自己的段落\n\n<!-- keep-byte-for-byte -->\n"));
}

#[test]
fn evening_correction_ignores_a_heading_inside_a_backtick_fence() {
    let vault = TempDirectory::new("today-backtick-fenced-evening-example");
    let original = r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 晚间复盘

### 我的示例

```markdown
### 用户修正

必须保留的示例内容。
```

### 事件回顾

真实回顾。
"#;
    write_record(vault.path(), original);
    let app = application_for(vault.path());
    let opened = app.open().expect("record should open");

    assert!(opened.evening.corrections.is_empty());
    assert_eq!(opened.evening.other[0].heading, "我的示例");
    assert_eq!(
        opened.evening.other[0].lines,
        vec!["### 用户修正", "必须保留的示例内容。"]
    );

    let refreshed = app
        .update_evening_review(EveningUpdateInput {
            expected_revision: opened.revision.expect("revision should exist"),
            mode: EveningUpdateMode::Correction,
            content: "新修正。".into(),
        })
        .expect("fenced example should not become the correction target");

    assert_eq!(refreshed.state, TodayState::Ready);
    assert_eq!(refreshed.evening.corrections, vec!["新修正。"]);
    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("record should remain readable");
    assert!(
        saved.contains("### 我的示例\n\n```markdown\n### 用户修正\n\n必须保留的示例内容。\n```")
    );
    assert!(saved.contains("### 事件回顾\n\n真实回顾。"));
    assert_eq!(saved.matches("### 用户修正\n").count(), 2);
    assert!(saved.contains("### 用户修正\n\n- 新修正。"));
}

#[test]
fn canonical_headings_inside_an_indented_tilde_fence_are_literal_content() {
    let vault = TempDirectory::new("today-tilde-fenced-canonical-headings");
    let original = r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 今天的大致安排

- **上午：** 完成主要工作。

  ~~~~markdown
## 晚间复盘
### 用户修正
  ~~~
  ~~~~ 不是 closing fence
## 白天更新
## 今天的大致安排
## 计划依据
仍然属于代码示例。
   ~~~~~

## 晚间复盘

### 事件回顾

真实回顾。
"#;
    write_record(vault.path(), original);
    let app = application_for(vault.path());
    let opened = app
        .open()
        .expect("canonical-looking headings inside a tilde fence should be literal");

    assert_eq!(opened.state, TodayState::Ready);
    assert_eq!(opened.timeline.len(), 1);
    assert_eq!(opened.evening.other.len(), 1);
    assert_eq!(opened.evening.other[0].heading, "事件回顾");

    let refreshed = app
        .update_evening_review(EveningUpdateInput {
            expected_revision: opened.revision.expect("revision should exist"),
            mode: EveningUpdateMode::Correction,
            content: "新修正。".into(),
        })
        .expect("fenced canonical headings should not become write targets");

    assert_eq!(refreshed.state, TodayState::Ready);
    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("record should remain readable");
    assert!(saved.contains(
        "  ~~~~markdown\n## 晚间复盘\n### 用户修正\n  ~~~\n  ~~~~ 不是 closing fence\n## 白天更新\n## 今天的大致安排\n## 计划依据\n仍然属于代码示例。\n   ~~~~~"
    ));
    assert_eq!(saved.matches("## 晚间复盘\n").count(), 2);
    assert_eq!(saved.matches("### 用户修正\n").count(), 2);
    assert!(saved.contains("### 用户修正\n\n- 新修正。"));
}

#[test]
fn evening_correction_refuses_an_unclosed_fence_without_changing_the_record() {
    let vault = TempDirectory::new("today-unclosed-evening-fence");
    let original = r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 晚间复盘

### 我的示例

````markdown
### 用户修正

必须保留的示例内容。
```
```` 不是 closing fence
"#;
    write_record(vault.path(), original);
    let app = application_for(vault.path());
    let opened = app.open().expect("record should remain readable");

    let error = app
        .update_evening_review(EveningUpdateInput {
            expected_revision: opened.revision.expect("revision should exist"),
            mode: EveningUpdateMode::Correction,
            content: "新修正。".into(),
        })
        .expect_err("an unclosed fence must refuse an unsafe append");

    assert!(error.contains("代码围栏"), "{error}");
    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("record should remain readable");
    assert_eq!(saved, original);
}

#[test]
fn form_input_is_persisted_as_literal_content_without_creating_a_section() {
    let vault = TempDirectory::new("today-literal-input");
    write_record(
        vault.path(),
        "---\ntype: daily-record\ndate: 2026-08-10\n---\n# 2026-08-10\n\n## 白天更新\n\n## 晚间复盘\n",
    );
    let app = application_for(vault.path());
    let opened = app.open().expect("record should open");

    let refreshed = app
        .append_daytime_update(DaytimeUpdateInput {
            expected_revision: opened.revision.expect("revision should exist"),
            kind: DaytimeUpdateKind::MeaningfulEvent,
            content: "## 晚间复盘".into(),
            habit_name: None,
            habit_outcome: None,
        })
        .expect("heading-like user input should save as literal content");

    assert_eq!(refreshed.state, TodayState::Ready);
    assert_eq!(refreshed.daytime.updates.len(), 1);
    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("record should remain readable");
    assert_eq!(
        saved.lines().filter(|line| *line == "## 晚间复盘").count(),
        1
    );
    assert!(saved.contains("观察事实：## 晚间复盘"));
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

#[cfg(target_os = "macos")]
#[test]
fn retained_external_descriptor_never_loses_its_late_write() {
    let vault = TempDirectory::new("today-retained-descriptor");
    let path = vault.path().join("life/Journal/Daily/record.md");
    fs::create_dir_all(path.parent().expect("record should have a parent"))
        .expect("record directory should be created");
    let original = b"original daily record\n";
    fs::write(&path, original).expect("original should be written");
    let original_inode = fs::metadata(&path).expect("metadata should exist").ino();
    let mut external_descriptor = fs::OpenOptions::new()
        .write(true)
        .open(&path)
        .expect("external editor should retain the original descriptor");
    let allow_external_write = Arc::new(AtomicBool::new(false));
    let writer_allowed = Arc::clone(&allow_external_write);
    let observed_path = path.clone();
    let writer = thread::spawn(move || {
        while fs::metadata(&observed_path)
            .expect("canonical metadata should remain readable")
            .ino()
            == original_inode
        {
            thread::yield_now();
        }
        while !writer_allowed.load(Ordering::SeqCst) {
            thread::yield_now();
        }
        external_descriptor
            .write_all(b"external descriptor edit\n")
            .expect("external descriptor write should complete");
        external_descriptor
            .sync_all()
            .expect("external descriptor write should sync");
    });

    let candidate = b"dashboard candidate\n";
    let result = FileTodayRecordStore.save_if_unchanged(&path, original, candidate);
    allow_external_write.store(true, Ordering::SeqCst);
    writer.join().expect("external writer should finish");

    let recovery_directory = vault.path().join(".personal-dashboard-recovery/today");
    let external_edit_is_recoverable = fs::read_dir(recovery_directory)
        .expect("temporary workspace should remain readable")
        .filter_map(Result::ok)
        .filter(|entry| entry.path().is_file())
        .any(|entry| {
            fs::read(entry.path())
                .map(|bytes| bytes.starts_with(b"external descriptor edit\n"))
                .unwrap_or(false)
        });
    assert!(
        external_edit_is_recoverable,
        "{result:?} must not unlink the inode edited through the retained descriptor"
    );
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
fn unavailable_recovery_storage_fails_closed_before_a_daily_record_write() {
    let vault = TempDirectory::new("today-recovery-failure");
    let original = "---\ntype: daily-record\ndate: 2026-08-10\n---\n# 2026-08-10\n\n## 白天更新\n";
    write_record(vault.path(), original);
    fs::write(
        vault.path().join(".personal-dashboard-recovery"),
        b"blocked",
    )
    .expect("a conflicting recovery path should be created");
    let app = application_for(vault.path());
    let opened = app.open().expect("record should open");

    let error = app
        .append_daytime_update(DaytimeUpdateInput {
            expected_revision: opened.revision.expect("revision should exist"),
            kind: DaytimeUpdateKind::MeaningfulEvent,
            content: "不能在无 recovery 时写入。".into(),
            habit_name: None,
            habit_outcome: None,
        })
        .expect_err("a write without durable recovery must fail closed");

    assert!(error.contains("recovery directory"));
    let saved = fs::read_to_string(
        vault
            .path()
            .join("life/Journal/Daily/2026/2026-08/2026-08-10.md"),
    )
    .expect("record should remain readable");
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
    assert_eq!(
        saved.daytime.updates[0].observed_facts,
        vec!["Habit：Exercise；结果：baseline；说明：今天做了轻量版本。"]
    );
    assert!(saved.daytime.updates[0].revised_direction.is_empty());
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
fn flexible_list_markers_and_today_review_alias_remain_visible() {
    let vault = TempDirectory::new("today-flexible-markdown");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 今天的大致安排

* **上午：** 星号列表也属于有效计划。
+ **下午：** 加号列表也属于有效计划。

## 计划依据

### 固定安排

* 10:00 check-in

## 晚间复盘

### 今日回顾

* Agent 记录的主要事实。
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("flexible record should open");

    assert_eq!(view.timeline.len(), 2);
    assert_eq!(view.timeline[0].title, "星号列表也属于有效计划。");
    assert_eq!(view.timeline[1].title, "加号列表也属于有效计划。");
    assert_eq!(view.evidence[0].items, vec!["10:00 check-in"]);
    assert_eq!(view.evening.account, vec!["Agent 记录的主要事实。"]);
}

#[test]
fn numbered_morning_items_and_unclassified_evening_content_remain_visible() {
    let vault = TempDirectory::new("today-conservative-primary-content");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 今天的大致安排

1. **上午：** 主要工作。
2. **下午：** 休息和恢复。

## 晚间复盘

### 事件回顾

完成了主要工作，下午恢复。
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("valid primary content should open");

    assert_eq!(view.state, TodayState::Ready);
    assert_eq!(view.timeline.len(), 2);
    assert_eq!(view.timeline[0].period, "上午");
    assert_eq!(view.timeline[0].title, "主要工作。");
    assert_eq!(view.timeline[1].period, "下午");
    assert_eq!(view.timeline[1].title, "休息和恢复。");
    assert_eq!(view.evening.other.len(), 1);
    assert_eq!(view.evening.other[0].heading, "事件回顾");
    assert_eq!(
        view.evening.other[0].lines,
        vec!["完成了主要工作，下午恢复。"]
    );
}

#[test]
fn prose_morning_blocks_and_multiline_list_continuations_remain_visible() {
    let vault = TempDirectory::new("today-prose-morning-plan");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 今天的大致安排

### 上午

完成主要工作，之后休息。

### 下午

散步并保留恢复时间。

- **晚上：** 整理当天记录，
  然后准备休息。
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("prose-based morning plan should open");

    assert_eq!(view.state, TodayState::Ready);
    assert_eq!(view.timeline.len(), 3);
    assert_eq!(view.timeline[0].period, "上午");
    assert_eq!(view.timeline[0].title, "完成主要工作，之后休息。");
    assert_eq!(view.timeline[1].period, "下午");
    assert_eq!(view.timeline[1].title, "散步并保留恢复时间。");
    assert_eq!(view.timeline[2].period, "晚上");
    assert_eq!(view.timeline[2].title, "整理当天记录，然后准备休息。");
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
        view.daytime.updates[0].neutral,
        vec![
            "17:00 前完成紧急工作；",
            "Exercise 改为 low-energy baseline：步行 10 分钟；",
            "晚饭后用于恢复。",
        ]
    );
    assert!(view.daytime.updates[0].revised_direction.is_empty());
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
fn daytime_preserves_fact_intent_reason_and_direction_roles() {
    let vault = TempDirectory::new("today-daytime-semantics");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 白天更新

### 12:00 — 有意义的事件

- 已确认：Exercise 达到 baseline。

### 14:10 — Material replan

- **原计划意图：** 下午推进主要工作。
- **变化原因：** 出现紧急工作。
- **修订方向：** 先完成紧急工作，再保护恢复时间。
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("semantic daytime record should open");

    assert_eq!(
        view.daytime.updates[0].observed_facts,
        vec!["Exercise 达到 baseline。"]
    );
    assert!(view.daytime.updates[0].revised_direction.is_empty());
    assert_eq!(
        view.daytime.updates[1].original_intent,
        vec!["下午推进主要工作。"]
    );
    assert_eq!(
        view.daytime.updates[1].change_reasons,
        vec!["出现紧急工作。"]
    );
    assert_eq!(
        view.daytime.updates[1].revised_direction,
        vec!["先完成紧急工作，再保护恢复时间。"]
    );
}

#[test]
fn material_replan_keeps_unrecognized_items_neutral() {
    let vault = TempDirectory::new("today-neutral-material-replan");
    write_record(
        vault.path(),
        r#"---
type: daily-record
date: 2026-08-10
---
# 2026-08-10

## 白天更新

### 14:10 — 重大调整

- 已完成上午工作。
- 原计划：下午继续工作。
- 原因：身体疲劳。
- 调整方向：改为恢复。
"#,
    );

    let view = application_for(vault.path())
        .open()
        .expect("material replan should open");
    let update = &view.daytime.updates[0];

    assert_eq!(update.neutral, vec!["已完成上午工作。"]);
    assert_eq!(update.original_intent, vec!["下午继续工作。"]);
    assert_eq!(update.change_reasons, vec!["身体疲劳。"]);
    assert_eq!(update.revised_direction, vec!["改为恢复。"]);
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
    assert!(view.can_record);
    assert!(view.target_binding.is_some());
    assert!(view.message.contains("明确保存"));
    assert!(!vault
        .path()
        .join("life/Journal/Daily/2026/2026-08/2026-08-10.md")
        .exists());
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
