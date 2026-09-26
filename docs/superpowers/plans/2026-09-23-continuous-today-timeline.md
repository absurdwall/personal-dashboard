# 连续 Today 时间轴 Implementation Plan

> **Execution status:** Completed 2026-09-23 on `codex/historical-habit-corrections`. The worktree already contained Ticket 01 on top of `origin/main` `e654461`; the user asked to continue on the newest branch, so no branch switch or synchronization was needed. Both tickets now have their own implementation and packaged acceptance evidence.

**Goal:** 将 Today 的实际 Daily Record 接入已批准的 A 双栏连续时间轴，并让本地“现在”线随应用时钟更新。

**Architecture:** Rust 读取现有 Daily Record 语义并产生单独的、只读的时间轴投影；只映射明确且可验证的本地时刻，其他内容保留在各自的未定位区域。TypeScript 用分钟值映射 00:00–24:00 轴、维护用户浏览与“定位现在”的状态，并通过 Tauri 同一应用时钟更新 Today；既有基准、原文、修订、简短记录和更正入口继续使用原有视图。当前日期首次打开 Today 时进入 Daytime 时间轴并定位到 now，Morning baseline 仍可从原阶段导航打开。

**Tech Stack:** Rust / Tauri 2、serde、TypeScript、原生 HTML/CSS、Node test runner、Cargo 集成测试、macOS Accessibility packaged acceptance。

**Spec:** `.scratch/personal-dashboard-habit-history-timeline/issues/02-continuous-today-timeline.md` and `.scratch/personal-dashboard-habit-history-timeline/spec.md`

## Global Constraints

- 用户已选 A：计划／实际双栏，共享连续时间刻度；不实现 B／C、方案切换器、模拟时间滑块或演示数据。
- 遵守现有领域与 ADR；复用既有本地习惯完成、Daily Record 和 Calendar 能力。
- 保留 Morning baseline、修订记录和用户正文。
- 外部习惯来源只读，Short record 不因出现在时间轴上而变成习惯完成证据。
- 每票独立完成必要的读取／解析、应用操作、UI 和针对性验证；无单独后端、前端、测试横向票，无无关预重构。
- 任何测试均使用合成数据和隔离 Vault。
- 不得改动真实个人记录、Dida365、日常 producer 或自动化，不添加依赖、服务或部署配置。
- 保持原始反馈票不变。
- 候选构建的 packaged Mac 验收与自动化测试分别记录。
- 发布实现票、完成原型、测试通过均不等于用户日常安装验收完成；本轮不替换正式安装、不推送、不关闭既有其他票。
- 原型为视觉与交互参考，按正式工程约定重新实现，不合并 throwaway 页面。

## Review Focus

- 只有“下午”、`17:00 前`、记录时间戳或缺失时间的条目：不得伪造时点／时段；由 Task 1 的 `time_axis_projection_separates_explicit_times_from_unlocated_content` 覆盖。
- 同时开始、仅时点、短时段和长文案：几何锚点与真实时长保持不变；由 Task 2 的 `maps_points_ranges_and_overlaps_without_changing_time_anchors` 覆盖。
- 跨午夜、来源日期不同、夏令时跳过或重复的墙上时间：只呈现可证明的当日片段，歧义显式留在未定位区；由 Task 1 的 `projects_only_explicit_cross_date_segments_and_keeps_ambiguous_times_unlocated` 覆盖。
- 更新时钟期间用户切到历史日、切 Vault 或手动浏览远处：不显示错误的“现在”线、不切走日期、不把滚动抢回；由 Task 2 的 `clock_refresh_preserves_historical_selection_and_user_scroll` 覆盖。
- 窄窗口、English、键盘与辅助技术阅读：仍能分辨计划／事实，且不依赖颜色；由 Task 3 的 `time_axis_markup_keeps_both_lanes_named_and_keyboard_reachable` 覆盖。
- ISO 本地时间戳保留显式 lived date，UTC `Z` 时间戳不冒充本地墙上时间；由 `projects_only_explicit_cross_date_segments_and_keeps_ambiguous_times_unlocated` 覆盖。

---

### Task 0: 核实最新集成分支并保护独立 scratch

**Files:**
- Preserve: `.scratch/personal-dashboard-3-0-1/issues/01-habit-english-and-theme-consistency.md`
- Preserve: `.scratch/personal-dashboard-3-0-1/map.md`
- Preserve the parent spec and Ticket 01; update only Ticket 02 and the effort map with this implementation's evidence.
- Keep untouched: `.scratch/personal-dashboard-usage-feedback/`

**Interfaces:**
- Consumes: current branch `codex/historical-habit-corrections` at `c5aef06` and fetched `origin/main` at `e654461`; unrelated scratch changes are present.
- Produces: implementation on the existing branch, with the latest integrated main as its base and unrelated local work preserved.

- [x] **Step 1: Record the starting worktree without disturbing unrelated work**

Record `git status --short --branch` and identify existing edits and untracked scratch. Preserve `.scratch/personal-dashboard-3-0-1/` and `.scratch/personal-dashboard-usage-feedback/`; do not stage their unrelated files.

- [x] **Step 2: Verify the newest integrated base and the current implementation branch**

Verify `origin/main` at `e654461`, current branch `codex/historical-habit-corrections`, and `git rev-list --left-right --count origin/main...HEAD` showing `0 1`. The current branch already includes the latest fetched main plus Ticket 01, so do not merge, reset, or switch branches.

- [x] **Step 3: Keep unrelated scratch separate from ticket work**

Leave unrelated modified and untracked files in place. Only stage the Ticket 02 source, regression, acceptance, plan, and ticket/map evidence.

- [x] **Step 4: Confirm the implementation base before editing source**

Confirm HEAD `c5aef06`, latest fetched base `e654461`, and clean scoped diff before implementing Ticket 02. Keep the current branch through the final commit.

### Task 1: 建立真实记录来源的时间轴投影

**Files:**
- Modify: `src-tauri/src/today.rs`
- Modify: `src-tauri/src/clock.rs`
- Modify: `src-tauri/tests/today_workflow.rs`
- Create: `src-tauri/tests/fixtures/today-time-axis.md`

**Interfaces:**
- Consumes: `TodayView.timeline`（当前安排）、`DaytimeUpdateView.observed_facts`（明确事实）、Daily Record 的 lived date、`TodayClock` 的本地墙上时刻验证。
- Produces: `TodayView.time_axis: TimeAxisView`，含 `current_arrangement`、`confirmed_facts`、`unlocated_current_arrangement`、`unlocated_confirmed_facts` 四个数组。`TimeAxisEntryView` 字段为 `period: Option<String>`、`text: String`、`source_date: String`、`start_minute: Option<u16>`、`end_minute: Option<u16>`、`continues_from_previous_day: bool` 和 `continues_into_next_day: bool`。分钟范围为 `0..=1440`；点事件只有起始分钟，没有结束分钟。`source_date` 是事项明确开始日期；普通单日事项使用 Daily Record 的 lived date。

- [x] **Step 1: 先在集成测试中写合成 Daily Record 回归场景**

新增 fixture `src-tauri/tests/fixtures/today-time-axis.md`，日期为 `2026-08-10`，内含不同的早间基准和当前安排、`09:30–10:45` 安排、`13:00` 点安排、仅“下午”的安排、`14:20` 明确事实、仅有 subsection 记录时间的事实、`17:00 前` 阈值和一条有 `created_at` 的短记录。于 `today_workflow.rs` 加入以下测试 helper 和 `time_axis_projection_separates_explicit_times_from_unlocated_content`；断言当前安排不从基准／修订历史取值，右侧只含 `observed_facts`，记录／修改时间和阈值不产生事件时间，未定位原文仍完整。

```rust
#[test]
fn time_axis_projection_separates_explicit_times_from_unlocated_content() {
    let view = open_synthetic_time_axis_record(include_str!("fixtures/today-time-axis.md"));
    assert_eq!(view.time_axis.current_arrangement[0].start_minute, Some(570));
    assert_eq!(view.time_axis.current_arrangement[0].end_minute, Some(645));
    assert!(view.time_axis.current_arrangement[1].end_minute.is_none());
    assert_eq!(view.time_axis.confirmed_facts.len(), 1);
    assert!(view.time_axis.unlocated_current_arrangement.iter().any(|entry| entry.text.contains("17:00 前")));
}

fn open_synthetic_time_axis_record(record: &str) -> TodayView {
    let vault = TempDirectory::new("today-time-axis");
    write_record(vault.path(), record);
    application_for(vault.path()).open().expect("synthetic record should open")
}
```

新增 `time_axis_projection_refreshes_after_an_external_record_edit_without_writing`：用同一 fixture 首次 `app.read()`，将 synthetic Daily Record 中 `09:30–10:45` 原文改为 `10:30–11:45`，再次 `app.read()` 后断言新投影的起止分钟为 630／705；再读取文件并与外部写入的完整字符串比较，证明只读投影没有改写 Daily Record。运行这两项回归时使用筛选 `time_axis_projection`。

修改已有 `old_record_keeps_its_current_plan_without_inventing_a_baseline`，对它内联的旧格式记录断言 `state == Ready`、原 `timeline` 保留且四个新时间轴数组为空。测试 helper 如上所示；`TodayView` 从 `personal_dashboard_lib::today` 引入。

- [x] **Step 2: 运行该测试并确认它因缺少投影而失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test today_workflow time_axis_projection -- --nocapture`

Expected: compile/test failure，指出 `TodayView.time_axis` 或目标行为尚不存在。

- [x] **Step 3: 实现只读 Rust 投影和严格时间解析**

在 `today.rs` 新增上述序列化类型，并在 `TodayApplication.reload_vault` 成功调用既有 `parse_daily_record` 后，从已解析的 `timeline` 和明确 `observed_facts` 调用 `project_time_axis(timeline: &[MorningBlockView], daytime: &DaytimeView, expected_date: &str, clock: &impl TodayClock) -> TimeAxisView`；不改动通用 `parse_daily_record` 或写入校验器。解析器仅接受 `H:mm`／`HH:mm` 的 24 小时时点，以及显式的 `HH:mm–HH:mm` 范围；`24:00` 只允许作为范围终点并映射为该日期的 `1440` 边界。跨日期格式接受 `YYYY-MM-DD HH:mm–YYYY-MM-DD HH:mm` 和 ISO 本地墙上时间 `YYYY-MM-DDTHH:mm–YYYY-MM-DDTHH:mm`；带 `Z` 的 UTC instant 不直接按本地时刻绘制。必须验证分钟／日期有效、range end 晚于 start，且点时间确实是独立表达（不匹配 `17:00 前`、`17:00 后`、阈值或类似前后界限）。单一事项含有多个可能发生时刻、无法判断哪一个是事项时间时，整条放入未定位区，不得挑第一个。先把早间／白天更新时间标题排除在 occurrence parsing 之外，再读取源文本内的时刻。不能确定唯一本地时刻、无日期的午夜回绕、只有时段、无效或缺失时刻均保留原文于对应未定位数组。事实仅从 `observed_facts` 构建，不从 subsection 标题、`created_at`、`modified_at`、习惯阈值、neutral 文本、原计划意图或修订方向生成。多日／跨午夜输入只投影被打开 Daily Record 的 lived date 片段，保留事项开始日期和延续标志；不扫描邻接 Daily Record，不复制事实，不更改存储格式或记录字节。

在 `today.rs` 的 `TodayClock` 加 `resolve_local_wall_time(date: &str, minute: u16) -> LocalWallTimeResolution`，类型为 `Unique { utc_offset_minutes: i32 } | Nonexistent | Ambiguous`。`SystemClock` 在 Unix/macOS 用 `mktime` 对 `tm_isdst = -1, 0, 1` 生成候选，再经 `localtime_r` round-trip；零个匹配表示 DST gap，多于一个不同 instant 表示重复时刻，均返回 unresolved；一个匹配返回 unique。范围两端必须唯一且处于相同 UTC offset，否则整条进入未定位区。保留现有固定 UTC offset acceptance override。测试定义 `AmbiguousTimeClock`，其余 `TodayClock` 方法复用 `FixedClock`，只对 fixture 指定墙上时间返回 `Ambiguous`，不改系统时区。

```rust
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LocalWallTimeResolution {
    Unique { utc_offset_minutes: i32 },
    Nonexistent,
    Ambiguous,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeAxisView {
    pub current_arrangement: Vec<TimeAxisEntryView>,
    pub confirmed_facts: Vec<TimeAxisEntryView>,
    pub unlocated_current_arrangement: Vec<TimeAxisEntryView>,
    pub unlocated_confirmed_facts: Vec<TimeAxisEntryView>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TimeAxisEntryView {
    pub period: Option<String>,
    pub text: String,
    pub source_date: String,
    pub start_minute: Option<u16>,
    pub end_minute: Option<u16>,
    pub continues_from_previous_day: bool,
    pub continues_into_next_day: bool,
}
```

- [x] **Step 4: 运行投影回归并确认通过**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test today_workflow time_axis_projection -- --nocapture`

Expected: PASS；同一合成记录中的基准／修订时间不泄漏到当前安排或事实时间。

- [x] **Step 5: 写跨日期与 DST 歧义测试并确认失败**

添加 `projects_only_explicit_cross_date_segments_and_keeps_ambiguous_times_unlocated`，用返回 `Ambiguous` 的合成 clock 验证明确跨日期范围只产生所选 lived date 片段、保留 source date 和延续标志；无日期 `23:30–00:30` 不推断次日；DST 重复时间留在未定位数组。先运行：`cargo test --manifest-path src-tauri/Cargo.toml --test today_workflow projects_only_explicit_cross_date_segments_and_keeps_ambiguous_times_unlocated -- --exact`。Expected: FAIL。

- [x] **Step 6: 实现跨日期片段和 unresolved 时间分流**

比较明确开始／结束日期与 `expected_date`，仅当该日期落在区间内生成对应的 `0..=1440` 片段；source date 和 `continues_from_previous_day`／`continues_into_next_day` 保留。开始结束任一墙上时间 unresolved、跨 offset、日期缺失、日期无效或范围逆序时不产出 segment，原文归入对应未定位数组。

- [x] **Step 7: 运行解析回归并纳入最终实现提交**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --test today_workflow time_axis -- --nocapture`

Expected: 新增来源、点／范围、阈值、短记录、跨午夜和 DST 歧义测试全部 PASS。

- [x] **Step 8: 将服务端投影和合成测试纳入最终实现提交**

Keep the scoped source and fixture changes in the working tree; they will be committed together after all three implementation layers, ticket evidence, and review fixes are complete.

### Task 2: 同步应用时钟、分钟坐标和浏览状态

**Files:**
- Modify: `src-tauri/src/clock.rs`
- Modify: `src-tauri/src/today.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tests/today_workflow.rs`
- Create: `frontend/today-time-axis.ts`
- Modify: `frontend/main.ts`
- Create: `tests/frontend/today-time-axis.test.ts`

**Interfaces:**
- Consumes: Task 1 `TimeAxisView`；现有 `TodayClock` 与 `LatestRequest`。
- Produces: `TodayClockView { date: string; time: string }`、`TodayView.current_time: Option<String>`（与 `is_today` 用同一原子快照）、`today_clock` Tauri command、`hourTickMinutes()`、`minutePosition()` 和可单测的跟随／定位状态。

- [x] **Step 1: 写分钟刻度、区间和点事件单测**

在 `today-time-axis.test.ts` 从 `../../frontend/today-time-axis.ts` 导入 `minuteOfDay`、`minutePosition`、`hourTickMinutes` 和 `axisGeometry`，添加 `maps_points_ranges_and_overlaps_without_changing_time_anchors`。断言 `00:00 → 0`、`12:30 → 750`、`23:59 → 1439`，hour ticks 含 0 至 1440 共 25 个位置；点事件不生成结束高度，1 分钟范围高度精确为 `1 / 1440`，同时开始的区间保留相同 top。`minuteOfDay` 对非 `HH:mm` 或超范围值返回 `null`。

```ts
import assert from 'node:assert/strict';
import test from 'node:test';
import { axisGeometry, clockResultMatchesSession, clockTickDecision, hourTickMinutes, locateNow, minuteOfDay, minutePosition, onManualScroll } from '../../frontend/today-time-axis.ts';
import { LatestRequest } from '../../frontend/latest-request.ts';

test('maps points, ranges, and overlaps without changing time anchors', () => {
  assert.equal(minutePosition(0), 0);
  assert.equal(minuteOfDay('00:00'), 0);
  assert.equal(minuteOfDay('12:30'), 750);
  assert.equal(minuteOfDay('23:59'), 1439);
  assert.equal(minuteOfDay('24:00'), null);
  assert.equal(minutePosition(750), 750 / 1440);
  assert.equal(minutePosition(1440), 1);
  assert.deepEqual(hourTickMinutes(), Array.from({ length: 25 }, (_, hour) => hour * 60));
  assert.deepEqual(axisGeometry({ startMinute: 570, endMinute: null }), {
    top: 570 / 1440, height: 0,
  });
  assert.deepEqual(axisGeometry({ startMinute: 570, endMinute: 571 }), {
    top: 570 / 1440, height: 1 / 1440,
  });
  assert.equal(
    axisGeometry({ startMinute: 570, endMinute: 600 }).top,
    axisGeometry({ startMinute: 570, endMinute: 571 }).top,
  );
});

test('clock ticks respect a historical selection and manual browsing', () => {
  assert.equal(clockTickDecision(null, '2026-08-10', '2026-08-11'), 'reload-today');
  assert.equal(clockTickDecision('2026-08-10', '2026-08-10', '2026-08-11'), 'preserve-history');
  assert.equal(clockTickDecision('2026-08-10', '2026-08-10', '2026-08-10'), 'update-marker');
  assert.equal(onManualScroll('following'), 'manual');
  assert.equal(locateNow('manual'), 'following');
  assert.equal(
    clockResultMatchesSession(
      { date: '2026-08-10', targetBinding: 'vault-a' },
      { date: '2026-08-10', targetBinding: 'vault-b' },
    ),
    false,
  );
  const requests = new LatestRequest();
  const stale = requests.begin();
  requests.invalidate();
  assert.equal(requests.isCurrent(stale), false);
});
```

在 `frontend/today-time-axis.ts` 定义函数输入类型：

```ts
export type TimeAxisEntry = Readonly<{ startMinute: number; endMinute: number | null }>;
export type TodayAxisSession = Readonly<{ date: string; targetBinding: string | null }>;
```

- [x] **Step 2: 运行前端单测并确认失败**

Run: `node --test tests/frontend/today-time-axis.test.ts`

Expected: FAIL，因为 `frontend/today-time-axis.ts` 的投影函数尚不存在。

- [x] **Step 3: 实现纯坐标函数与用户跟随状态**

在 `today-time-axis.ts` 实现分钟分母固定为 1440 的坐标，不按条目密度、最短点击高度或文案长度改变时间锚点；只有范围条有与实际时长相同的比例高度，点事件只渲染一个锚点。导出 `TodayAxisFollowState = "following" | "manual"`、`onManualScroll(state)` 和 `locateNow(state)`；分钟 tick 只在 `following` 状态请求一次定位。导出 `clockTickDecision(selectedDate, viewDate, clockDate)`，返回 `"update-marker" | "reload-today" | "preserve-history"`；当 `viewDate === clockDate` 时返回 `update-marker`，当 view 跟随 Today 且 clock date 已改变时返回 `reload-today`，其余显式历史选择返回 `preserve-history`。导出 `clockResultMatchesSession(requested, current)` 比较 date 与 `targetBinding`，供异步时钟返回后丢弃切 Vault／切日结果。首次进入当天 Daytime 轴只定位一次，初始 `defaultPhase` 对今天使用 Daytime，而 Morning baseline 仍可从原 tab 打开。

```ts
export const TODAY_AXIS_MINUTES = 24 * 60;
export type TimeAxisEntry = Readonly<{ startMinute: number; endMinute: number | null }>;
export type TodayAxisFollowState = "following" | "manual";
export function minutePosition(minute: number): number;
export function minuteOfDay(label: string): number | null;
export function hourTickMinutes(): readonly number[];
export function axisGeometry(entry: TimeAxisEntry): Readonly<{ top: number; height: number }>;
export function onManualScroll(state: TodayAxisFollowState): TodayAxisFollowState;
export function locateNow(state: TodayAxisFollowState): TodayAxisFollowState;
export function clockTickDecision(selectedDate: string | null, viewDate: string, clockDate: string): "update-marker" | "reload-today" | "preserve-history";
export function clockResultMatchesSession(requested: TodayAxisSession, current: TodayAxisSession): boolean;
```

- [x] **Step 4: 先写 Rust 本地时钟快照回归**

在 `clock.rs` 把纯转换函数的目标签名定为 `clock_view_from_epoch_and_offset(epoch_millis: i64, utc_offset_minutes: i32) -> TodayClockView`。新增 `snapshot_keeps_date_and_time_on_the_same_side_of_midnight`，断言 `14_399_000 ms`、UTC-04 得到本地 `1969-12-31 23:59`，`14_400_000 ms` 得到 `1970-01-01 00:00`。在 `today_workflow.rs` 添加 `today_view_uses_one_clock_snapshot_for_date_and_now_marker`，用固定 clock 断言 `TodayView.date`、`is_today`、`current_time` 一致，歷史 `read_date` 的 `current_time` 为 `None`。

```rust
#[test]
fn snapshot_keeps_date_and_time_on_the_same_side_of_midnight() {
    let before = clock_view_from_epoch_and_offset(14_399_000, -240);
    assert_eq!((before.date.as_str(), before.time.as_str()), ("1969-12-31", "23:59"));
    let after = clock_view_from_epoch_and_offset(14_400_000, -240);
    assert_eq!((after.date.as_str(), after.time.as_str()), ("1970-01-01", "00:00"));
}
```

- [x] **Step 5: 运行时钟回归并确认失败**

Run: `cargo test --manifest-path src-tauri/Cargo.toml --lib snapshot_keeps_date_and_time_on_the_same_side_of_midnight -- --exact`

Expected: FAIL，因为纯单次快照函数尚不存在。

- [x] **Step 6: 实现 Rust 快照和只读命令**

定义序列化 `TodayClockView { date: String, time: String }`，扩展 `TodayClock.current_local_time()` 返回它。`SystemClock` 只调用一次 `system_epoch_millis()` 和一次本地 offset，再由纯函数计算日期／分钟；已有 `current_date`、`current_time_label`、`current_timestamp_label` 复用该函数并保留 acceptance 环境变量。`TodayApplication.local_clock()` 返回 clock snapshot。`view_date` 使用同一快照计算 `is_today` 和 `TodayView.current_time` 并传进 ready／missing／error 视图；历史视图 `current_time = None`。于 `lib.rs` 注册只读 `today_clock` 命令。

```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TodayClockView { pub date: String, pub time: String }
```

- [x] **Step 7: 接上分钟边界与恢复前台刷新**

在 `main.ts` 用 `TodayView.currentTime` 初始绘制，在 `today_clock` 命令中读取后续快照，不让浏览器本地钟成为第二个来源。定时刷新最多每分钟一次，并在 `visibilitychange` 变为 visible 与窗口 `focus` 时立即刷新。若 clock date 和正在跟随 Today 的 view date 不同，重新读取 `today_view`，再次校验新 view date 和最新 clock date；若用户明确选择历史日期则保留选择且不绘制 now 线。每次异步时钟读取使用 `todayPresentationRequests.begin()` token，并在结果返回时比较当前 Today `date` 与 `targetBinding`；切页／切 Vault 后忽略晚到响应。计时器只改展示状态，不调用任何写命令。

- [x] **Step 8: 写时钟与浏览状态回归并运行**

新增 `clock_refresh_preserves_historical_selection_and_user_scroll`：用 `clockTickDecision`、`onManualScroll` 和 `locateNow` 模拟前台刷新、跨午夜快照、历史日期选择、手动滚动和 Vault target binding 改变，断言 follow-today 跨日需要 reload、显式历史日返回 preserve-history、旧 binding 的请求不应用、手动滚动不定位而 locator 恢复定位。运行 `node --test tests/frontend/today-time-axis.test.ts` 和 `cargo test --manifest-path src-tauri/Cargo.toml --test today_workflow time_axis -- --nocapture`，预期均 PASS。

- [x] **Step 9: 将时钟与纯前端行为纳入最终实现提交**

Keep these changes with the same final scoped implementation commit.

### Task 3: 交付可访问的 A 双栏时间轴

**Files:**
- Modify: `frontend/index.html`
- Modify: `frontend/main.ts`
- Modify: `frontend/styles.css`
- Modify: `frontend/interface-language.ts`
- Modify: `tests/frontend/today-time-axis.test.ts`

**Interfaces:**
- Consumes: Task 1 `TodayView.timeAxis`；Task 2 的分钟坐标、时钟刷新與跟随状态。
- Produces: 当天 Daytime tab 中可读写分离的 Current arrangement / Confirmed facts 双栏、共享 00:00–24:00 小时刻度、定位现在按钮和两栏各自的未定位区。

- [x] **Step 1: 写实际 shipped markup 的语义回归**

在 `today-time-axis.test.ts` 用本文件内 `elements()` 读取真实 `frontend/index.html`，添加 `time_axis_markup_keeps_both_lanes_named_and_keyboard_reachable`。断言两栏共属一个共享时间轴容器、小时刻度从 00:00 至 24:00、计划与事实各有文字 heading／空状态／未定位区域、“现在”有文字或可读时间且 locator 是原生 button；屏幕阅读器可读每条文本，不以颜色作为 lane 唯一标志。断言短记录、修订依据、原意、原因与更正表单仍在 Daytime 面板可达。

```ts
import { readFileSync } from 'node:fs';

type ElementNode = { tag: string; parent?: ElementNode; attrs: string };
function elements(): ElementNode[] {
  const html = readFileSync(new URL('../../frontend/index.html', import.meta.url), 'utf8');
  const stack: ElementNode[] = [];
  const nodes: ElementNode[] = [];
  for (const token of html.matchAll(/<!--[^]*?-->|<\/?([\w-]+)\b[^>]*>/g)) {
    if (!token[1]) continue;
    const tag = token[1];
    if (token[0].startsWith('</')) { stack.pop(); continue; }
    const node: ElementNode = { tag, parent: stack.at(-1), attrs: token[0] };
    nodes.push(node);
    if (!['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'].includes(tag)) stack.push(node);
  }
  return nodes;
}

test('time axis markup keeps both lanes named and keyboard reachable', () => {
  const nodes = elements();
  const axis = nodes.find((node) => node.attrs.includes('id="today-continuous-axis"'));
  const arrangement = nodes.find((node) => node.attrs.includes('id="today-current-arrangement-lane"'));
  const facts = nodes.find((node) => node.attrs.includes('id="today-confirmed-facts-lane"'));
  assert.ok(axis && arrangement && facts);
  assert.equal(arrangement.parent, axis);
  assert.equal(facts.parent, axis);
  assert.ok(arrangement.attrs.includes('aria-labelledby="today-current-arrangement-heading"'));
  assert.ok(facts.attrs.includes('aria-labelledby="today-confirmed-facts-heading"'));
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-hour-scale"')));
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-hour-ticks"')));
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-current-arrangement-empty"')));
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-confirmed-facts-empty"')));
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-current-arrangement-unlocated"')));
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-confirmed-facts-unlocated"')));
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-current-time"')));
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-daytime-short-records"')));
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-daytime-updates"')));
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-future-directions"')));
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-daytime-form"')));
  assert.ok(nodes.some((node) => node.attrs.includes('id="today-locate-now"') && node.tag === 'button'));
});
```

- [x] **Step 2: 运行 markup 回归并确认失败**

Run: `node --test tests/frontend/today-time-axis.test.ts`

Expected: FAIL，当前 DOM 仍使用分开的事实区、安排区与记录边界，而非 A 的共享连续坐标。

- [x] **Step 3: 更新 Daytime markup、渲染和双语文案**

以共享 24 小时轴容器容纳两个并列 lane；从 `view.timeAxis.currentArrangement` 与 `view.timeAxis.confirmedFacts` 渲染各自的事件，未定位时间内容在对应 lane 下方独立呈现。每个精确范围渲染精确起点／终点、比例时长和来源日期；每个点事件只渲染时刻；跨日片段显示“延续自／延续至”及原始来源。新增 hour labels 与 `today_clock` 生成的 marker。将依据、原始意图、变化原因、修订方向、短记录及其更正入口放在同一 Daytime 阅读流的次级内容中，不丢弃原 `DaytimeView`。在 `interface-language.ts` 给新增标题、定位动作、延续标签、未知时间区和空状态添加中英文案。

使用 `today-continuous-axis` 作为轴根，三列为小时刻度、Current arrangement 和 Confirmed facts；两栏是轴的直接 section children，符合前一步的 DOM contract。轴根内静态保留 00:00 和 24:00 标签，小时行与事件位置由 `main.ts` 依据 25 个 `hourTickMinutes()` 刻度和 Rust 投影生成。

```html
<div id="today-continuous-axis" class="today-continuous-axis" role="group" aria-labelledby="today-daytime-heading">
  <div id="today-hour-scale" aria-label="00:00–24:00">
    <div class="today-axis-heading-spacer" aria-hidden="true"></div>
    <div id="today-hour-ticks"></div>
  </div>
  <section id="today-current-arrangement-lane" aria-labelledby="today-current-arrangement-heading">
    <h4 id="today-current-arrangement-heading" class="today-axis-lane-heading">Current arrangement</h4>
    <div class="today-axis-plot"><ol id="today-current-arrangement-events"></ol></div>
    <p id="today-current-arrangement-empty" hidden></p>
    <div id="today-current-arrangement-unlocated"></div>
  </section>
  <section id="today-confirmed-facts-lane" aria-labelledby="today-confirmed-facts-heading">
    <h4 id="today-confirmed-facts-heading" class="today-axis-lane-heading">Confirmed facts</h4>
    <div class="today-axis-plot"><ol id="today-confirmed-facts-events"></ol></div>
    <p id="today-confirmed-facts-empty" hidden></p>
    <div id="today-confirmed-facts-unlocated"></div>
  </section>
  <time id="today-current-time" aria-label="Current local time">--:--</time>
  <button id="today-locate-now" type="button">Locate now</button>
</div>
```

- [x] **Step 4: 实现固定比例图层和窄屏布局**

在 `styles.css` 以不因内容扩张而改变的 24×小时轴几何定位事件锚点和范围轨道；小时刻度、两栏标题和两个 plot 使用相同的标题高度／plot 原点。由 `TodayView.currentTime` 驱动可读的 `<time>` 标签和两栏同一百分比位置的 now 线；时点、范围起点与 now 线都相对固定 plot 几何，不受长文案或未定位区高度影响。以独立键盘可达的文字卡片／`details` 呈现长文案与重叠条目，卡片最小点击高度不延长事实轨道或移动时间起点。wide／narrow layout 均保留左右计划／事实栏和共同的小时刻度；窄窗口使用紧凑时间标签、可读折行、焦点展开和水平内容滚动，不堆成两个不同 y 原点的独立轴。提供 focus-visible 样式、结构化 list/heading 和标签／图形区分；空内容仍保留刻度及明确空状态。

```css
.today-continuous-axis { position: relative; display: grid; grid-template-columns: 3.5rem minmax(0, 1fr) minmax(0, 1fr); }
.today-axis-heading-spacer, .today-axis-lane-heading { height: var(--today-axis-heading-height); }
.today-axis-plot { position: relative; height: calc(24 * var(--today-axis-hour-height)); }
.today-axis-entry { position: absolute; top: var(--axis-top); height: var(--axis-duration); }
.today-axis-plot.is-today::after { position: absolute; top: var(--today-now-position); left: 0; right: 0; content: ""; }
```

- [x] **Step 5: 运行 UI／坐标回归及项目 typecheck**

Run: `node --test tests/frontend/today-time-axis.test.ts` and `npm run build`

Expected: 新增前端测试 PASS；TypeScript build PASS；旧 morning baseline、Today 记录／更正控件仍在 DOM 和 `renderToday` 渲染路径中。

- [x] **Step 6: 将 UI、双语和布局纳入最终实现提交**

Keep UI, bilingual copy, and layout with the same final scoped implementation commit.

### Task 4: 完成隔离 packaged Mac acceptance 并更新票据

**Files:**
- Modify: `scripts/acceptance/macos-ipc-workflow.sh`
- Modify: `scripts/acceptance/macos-ui-driver.swift`
- Modify: `docs/acceptance/macos-ipc-workflow.md`
- Modify: `.scratch/personal-dashboard-habit-history-timeline/issues/02-continuous-today-timeline.md`
- Modify: `.scratch/personal-dashboard-habit-history-timeline/map.md`

**Interfaces:**
- Consumes: Tasks 1–3 的实际 `today_view`、`daily_view`、`today_clock` 和屏幕上可访问的 A 时间轴。
- Produces: 独立 `today-time-axis` packaged 场景与本票中分开的自动化／packaged evidence。

- [x] **Step 1: 给 packaged 驱动增加合成记录场景**

在 `macos-ipc-workflow.sh` 添加 `run_today_time_axis_scenario`、case `today-time-axis` 并给 `gate` 列表增加此项。创建两份隔离合成 Vault／Daily Record：包含 00:00 与 24:00 边缘刻度、同刻重叠、短范围、点事实、跨日明确日期范围、仅“晚上”的安排、未定位事实、长文案、依据与短记录更正；其中一份留空记录用于验证空轴仍有刻度。保存 Daily Record 原始 SHA-256，整个场景完成后验证字节不变。扩展 `macos-ui-driver.swift` 只通过 packaged window 的 Accessibility 控件读取 Today；不启动浏览器原型或直接构造 Rust application。

- [x] **Step 2: 实现 Desktop／narrow／English／历史／前台证据**

在 `today-time-axis` 场景对实时分钟与前后台检查，driver 等待至下一个本地分钟并验证 packaged now 标签更新；该场景的子进程不设置 `PERSONAL_DASHBOARD_NOW_EPOCH_MILLIS` 或 `PERSONAL_DASHBOARD_UTC_OFFSET_MINUTES`，使用真实 app `SystemClock`。在 1120×760 检查初次打开时当前时刻已在可视区域中央附近，再检查 A 双栏及 now；Locate now 可由键盘激活；手动滚动后等待 tick 不抢回位置；隐藏再恢复 app 后 now/date 一致；以两个相邻日期的固定 epoch 分别 relaunch 同一隔离候选，验证午夜后跟随 Today 的日期和轴一致；进入上一日历史视图时无 now marker，刷新后不切回今天；在 640×520 English 验证 lane 顺序、时刻、空／未定位区和可读文本 frame。每一步检查真实 Accessibility label/value/frame，而非只检查类名或 fixture 输出。

- [x] **Step 3: 更新 packaged 验收说明并运行单场景**

将命令和覆盖边界写入 `docs/acceptance/macos-ipc-workflow.md`。构建候选 `npm run build:mac`，再以 420 秒 timeout 和一个全新 capture directory 运行：

```bash
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=today-time-axis \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=420 \
PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY=/tmp/pd-today-time-axis-acceptance-final-20260923-05 \
scripts/acceptance/macos-ipc-workflow.sh
```

Expected: packaged Tauri app 场景通过；记录候选 `.app` executable SHA-256、bundle identity、截图目录和合成记录 hash 结果。单独记录 `npm run test:frontend`、`cargo test --manifest-path src-tauri/Cargo.toml`、`npm run check` 及 focused tests 输出；不把 browser／prototype 结果写成 packaged 证据。

- [x] **Step 4: 更新 ticket 和 map 的真实完成证据**

票据答案写候选构建身份、自动化命令／结果、packaged 命令／结果和实际限制；全部验收标准均有证据且 packaged 场景通过后，将 02 状态设为 `resolved` 并更新 map。不改票 01、父规格或源反馈票。

- [x] **Step 5: 完成代码审阅、核对 scoped diff 并提交最终证据**

按 `/code-review` 对本分支实现和原 issue 并行审阅，处理并验证有依据的发现。运行 `git diff --check`、`git status --short --branch` 和 `git diff --cached --stat`；只 stage 本计划列出的源、测试、验收和本票路径。保留原样并不提交其他 untracked／local scratch 工作。提交 message：

```bash
git add docs/superpowers/plans/2026-09-23-continuous-today-timeline.md .scratch/personal-dashboard-habit-history-timeline/issues/02-continuous-today-timeline.md .scratch/personal-dashboard-habit-history-timeline/map.md docs/acceptance/macos-ipc-workflow.md frontend/index.html frontend/interface-language.ts frontend/main.ts frontend/styles.css frontend/today-time-axis.ts scripts/acceptance/macos-ipc-workflow.sh scripts/acceptance/macos-ui-driver.swift src-tauri/src/clock.rs src-tauri/src/lib.rs src-tauri/src/today.rs src-tauri/tests/calendar_workflow.rs src-tauri/tests/fixtures/today-time-axis.md src-tauri/tests/today_workflow.rs tests/frontend/daytime-rail-layout.test.ts tests/frontend/today-time-axis.test.ts
git commit -m "feat: add continuous Today timeline"
```

## Spec Coverage Check

- 真实 Daily Record、当前安排与明确事实、既有语义与更正入口：Task 1、Task 3。
- 严格时间解析、点／范围、午夜边缘、未定位原文、旧记录可读、跨日／DST：Task 1、Task 4。
- 00:00–24:00 小时刻度、定位现在、每分钟／恢复前台、切日、保留历史日期和手动滚动：Task 2、Task 3、Task 4。
- 重叠、短事件、长文本、密度、空状态且不移动真实锚点：Task 2、Task 3、Task 4。
- A 双栏、窄窗口、中英文、键盘及辅助技术：Task 3、Task 4。
- 不自动完成／推断／写回、保留 Morning baseline／正文／受控更正、重读与 Vault/请求隔离：Task 1–3 的只读投影与请求代次保护，以及 Task 4 的字节 hash／Vault 验收。
- 自动化与 packaged evidence、候选身份、本票和 map：Task 4。
