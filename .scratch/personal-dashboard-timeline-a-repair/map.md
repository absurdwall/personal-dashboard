# A 时间轴视觉还原修复 — 实现票

用户已批准两票拆分与 01 → 02 依赖。范围与来源：[spec](spec.md)。原型 A 已定，不再迭代。

| Ticket | Blocked by | Status |
| --- | --- | --- |
| [01 恢复 A 的直接可读双栏时间轴](issues/01-restore-readable-a-cards.md) | None | claimed |
| [02 单列叠放卡片在重叠与窄窗口下保持可读](issues/02-readable-overlap-and-narrow-layout.md) | 01 | claimed |

当前处理项：02 的单列 packaged 候选已打开给用户查看，仍保持 `claimed`、等待本人决定是否接受；01 也仍为 `claimed`。本轮不将任何票标为用户接受或 resolved。

## 用户查看 packaged 候选后的方向修订

用户实际打开前一版候选后指出双栏中的事实栏常被窗口截断，并要求将当前安排与已确认事实合并成单列；同刻／交叉事项应轻微叠放，以小型 `∨` 控件逐张前翻，使用不同颜色区分计划和事实。此前双栏候选的测试／截图／复核保留为历史工程证据，但已被用户的新方向覆盖，不视为当前验收通过。单列 r8 候选与当前复核见下方，用户观感仍待本人确认；02 状态继续为 `claimed`。

旧时间轴票曾 resolved，但用户提供的画面未达到 A 的视觉要求；旧票状态不得作为通过凭据。保留历史习惯功能和现有时间解析，不重建整套应用。

每票包含 packaged 图像对照与独立视觉复核。工程完成与用户接受分开记录，候选未获用户接受前不得表述为用户验收通过。本次只发布，不改动或提交正在进行的产品代码，不替换日常安装，不推送。

> 上述“不改动或提交”记录属于此前发布／复核阶段；下方 2026-09-23 记录更新为本次用户显式 `/implement` 授权后的实际修复与本地提交状态。

## 方向变更历史：单列叠放

用户查看双栏 packaged 候选后明确要求安排和事实共用一条时间轴、以颜色区分；同刻或时间区间相交的卡片轻微叠放，并能逐张前翻。该方向覆盖旧双栏候选的预期。下方 r8 记录当前候选身份、自动检查及复核结果；最终是否接受仍由用户本人决定。

- 初版单列候选 r6 曾在原生窗口展示本机 Today；独立读图随后发现现在线穿过卡片文字等问题，r6 不再作为最终候选证据。修正与新复核见 r8。

### 2026-09-23 r8 视觉修订（最新候选）

- 修复后代码提交 `7d9f464`；候选 executable SHA-256 `31a4b1f9c8578ff7bda0603af433b900e8414c2e58056a264638ab1b422e8781`，路径 `/tmp/pd-timeline-a-ticket02-visual-final-r3/release/bundle/macos/Personal Dashboard.app`；未 notarize，未替换已安装 App 或发布。
- packaged 场景 r8 在 13:00／13:01／13:59 中英文宽／窄视图通过，隔离 Daily Record hash 保持 `7c77925b9c05a7905cc78babadc01972ab59f4ff47e5e06dffeb175e4149dbe4`。截图位于 `/tmp/pd-timeline-a-evidence/single-lane-run-r8/`。
- 独立视觉复核未发现实质问题；当前时间线避开卡片文字，类型样式清楚。候选已通过原生窗口展示真实 Today 页面，未编辑记录。票 02 仍 `claimed`，等待用户本人确认最终观感。

## Management 登记

已通过安装的 tortilla-flat-management helper 确认 canonical source 注册：`source-personal-dashboard-timeline-a-repair`，Project `product-personal-dashboard`；Registry revision `6a18107cb83f1c38`。无 pending recovery。登记仅对应本轮修复来源，不代表旧票及其他 effort 已全面调和，不修改 Project 的用户 focus 或 review。

登记后重读确认 source revision：`e55f4de4af97aefa`，两张票已可读取。

## 79fdcd3 复核与执行修订

两票继续基线更新为 `79fdcd3`：已有任务名、卡片配色、红线和标签分轨应复用，避免重做。01 聚焦普通 45 分钟事件的起止／底色、未知时间区布局以及 A 实包对照；02 聚焦整点标签避让、密集／窄窗口实际可读性与点击几何。两票范围与 01 → 02 依赖不变，保持 ready-for-agent，未宣称已通过视觉验收。

本轮运行聚焦时间轴测试 6/6 通过；进行独立代码审阅，未启动 App 或替换安装，未核验 79fdcd3 的 packaged 截图。当前未提交产品代码为空；无关 3.0.1 scratch 改动及其他未跟踪文档保持原样。

本轮修订后 Management 重读 source revision：`5fb5044e6e8a8654`。独立审查额外确认短区间与后续长区间的分轨遗漏，已纳入 02。

## 2026-09-23 票 01 packaged 实施证据

票 01 从 `79fdcd394357936f17c2a5aca489a82e65ff6050` 实施；状态仍为 `claimed`，候选待用户验收。当前工作树未提交，没有发布或替换日常安装。新 rendered UI 回归在原始 `79fdcd3` 包上确认 45 分钟卡片起点偏移、普通卡片和未知时间内容不可见；候选包修正后通过相同回归。候选 packaged 可执行文件 SHA-256 为 `17e22930af44758b02b3166391b0f403c79ac78b4e0c8f1796f6a92255886b58`。精确 A 卡片截图 `/tmp/pd-timeline-a-evidence/final-candidate-5/today-time-axis-a-cards.png`，基线失败截图 `/tmp/pd-timeline-a-evidence/baseline-final-current-script/today-time-axis-a-cards.png`，完整时间轴 packaged 截图位于 `/tmp/pd-timeline-a-evidence/full-axis-final-5/`。独立复核确认目标卡片与未知时间区域符合 A；差异为候选显示约 10:00–18:00 而 A 约 11:00–16:00，未知时间侧栏较窄导致事实描述换行但仍完整可见。此复核不是用户验收。票 02 仍等待票 01 的用户验收与状态更新。

## 2026-09-23 票 02 双栏候选历史（已被单列方向覆盖）

当前 checkout `codex/historical-habit-corrections`，实现基于 `79fdcd394357936f17c2a5aca489a82e65ff6050`。ticket 02 与 ticket 01 合并于同一 packaged 候选；实现 commit 为 `6166fcaa7d8d015e30f152ae0fbff5522d3cfdbe`。两票状态继续为 `claimed`，用户验收待办。本节是后续状态：用户随后明确要求实现票 02；前节“等待”描述的是当时状态。

- 构建：`CARGO_TARGET_DIR=/tmp/pd-timeline-a-ticket02-final npm run build:mac`。候选 executable SHA-256 `ad32ff10db1901dcc872d60fc8cb29afb3a59a3e693ead53cf7b5b9f5cb48153`，Contents manifest SHA-256 `cf82702ddd7fb13adee336d3fcae16fc50a83436b42a596a27fce64fada33791`。未 notarize（缺少 Apple 签名凭据）；没有替换已安装 App 或发布。
- Ticket 02 packaged 结果：合成记录 13:00／13:01／13:59 场景通过中英文宽／窄视图，检查布局／点击目标、真实时间区间、Now 与小时标签、鼠标和键盘详情、事实栏横向滚动及两种语言窄屏定位后的未定时项跳转。隔离 Daily Record SHA-256 `7c77925b9c05a7905cc78babadc01972ab59f4ff47e5e06dffeb175e4149dbe4` 未变化。截图目录 `/tmp/pd-timeline-a-evidence/ticket02-candidate-20/`。
- 正式前后对照限定为两组同一隔离 fixture、同窗口同固定时刻的图：中文 1120×760、13:00（基线 `ticket02-baseline-final/today-time-axis-overlap-zh-wide-13-00.png`，候选 `ticket02-candidate-20/today-time-axis-overlap-zh-wide-13-00.png`）；英文 640×520、13:01（基线 `ticket02-baseline-final/today-time-axis-overlap-en-narrow-13-01.png`，候选 `ticket02-candidate-20/today-time-axis-overlap-en-narrow-13-01.png`）。英文宽屏和中文窄屏属于额外候选矩阵验证，无匹配基线图，不作为前后对照声明。A 原型参照为 `/tmp/pd-timeline-a-evidence/prototype-A-1120x760-14-10.png`，保留原型自带示例数据，供视觉层次参照。
- 独立 Spec 复核读图确认候选与 A 的两栏语义、色彩、共同轴和侧栏处理相符，密集卡片与窄屏信息可达没有实质差异；复核者另确认两组指定前后对照满足代表场景要求，其他两图明确为候选矩阵补充。复核仅代表候选视觉意见，不代表用户验收。独立 Standards 复核未发现硬性标准问题。
- 检查：Rust 全套 `cargo test --manifest-path src-tauri/Cargo.toml` 通过；`npm run build`、聚焦 9 项时间轴测试、Shell 语法、macOS AX driver Swift 编译和票 01／02 packaged 场景均通过。完整前端套件另有一个与本票无关的 canonical life-daily-loop skill 标题契约断言失败，详见 ticket 02。构建跳过 notarization。实现 commit `6166fcaa7d8d015e30f152ae0fbff5522d3cfdbe` 已创建，回填记录在随后的文档提交。
