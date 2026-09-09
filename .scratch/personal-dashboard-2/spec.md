# Personal Dashboard 2.0 — FINAL composite incremental spec

Status: needs-info
Stage: focused contract closure; awaiting product decisions and narrow prototype feedback
Date: 2026-09-08

Readiness 已校正：此前按技能发布时的 ready-for-agent 过早。测试边界已确认，但本文尚有用户决定与小范围原型验证未完成；这些完成前不发布可直接开工的实施 tickets。本次只收尾规格和原型，不修改生产功能、skill 或自动化。

## Problem Statement

Personal Dashboard 1.0 已能读取当天 Daily Record、记录日间变化及补充晚间复盘，但重大重排会更新主计划，难以同时看到当天最初打算、当前实际和剩余安排。按日期回看尚未形成主入口，现有 Exercise tracker 的 This Week、History、Settings 结构也不能自然承载其他习惯。

用户需要一个低负担的每日阅读与简短记录界面：既看清下一步，也能回看一天；不需要按时确认计划、持续汇报完成、补齐未知记录或解释每次改变主意。健身只需额外写一句简短记录，详细运动数据可继续留在 Strava。

## Solution

以用户迭代并确认的 FINAL composite 为唯一视觉与页面结构基准。Calendar、Today、Habits 都由左侧栏进入，保持统一 Mac workspace 外壳。

Today 展示同一天的早间基准、当日进展与晚间复盘。早间基准保留起点，当前安排反映后续调整，实际情况只来自证据。Calendar 提供月历、选中日期摘要及完整日记录入口；历史记录可补充或更正并保留简短修改记录。Habits 将周次数和每日目标时刻分组，使用近期点阵与展开历史提供轻量追踪，健身支持自由文本记录。

继续使用 Dida365 管理操作性任务和习惯打卡；Dashboard 不新增直连 Dida365、应用内 Agent 或完整运动日志。1.0 继续实际使用，2.0 按后续批准的增量交付切换。

## User Stories

1. As the sole user, I want Calendar, Today, and Habits in the left sidebar, so that I can move between the three primary destinations predictably.
2. As the sole user, I want the confirmed FINAL composite preserved, so that implementation reflects the prototype I actually chose.
3. As the sole user, I want Today to open the current local day, so that returning from history restores my present context.
4. As the sole user, I want the selected date to remain visible, so that I cannot confuse a historical record with today.
5. As the sole user, I want three directly reachable daily phases, so that I can inspect any perspective without time-based locks.
6. As the sole user, I want an automatically prepared plan to serve as my default morning baseline, so that I do not need a confirmation button.
7. As the sole user, I want to revise that baseline while planning after waking, so that it reflects my initial intention.
8. As the sole user, I want late waking to allow morning calibration, so that the clock alone does not decide my phase.
9. As the sole user, I want the automatic baseline retained if I start my day without revising it, so that later updates do not rewrite my original plan.
10. As the sole user, I want daytime changes to affect the remaining arrangement, so that the morning baseline stays available for comparison.
11. As the sole user, I want known events distinguished from future plans, so that scheduled activity is never mistaken for completed activity.
12. As the sole user, I want necessary past-plan clues shown as unrecorded when evidence is absent, so that uncertainty remains honest.
13. As the sole user, I want to record an event without replanning, so that a short note remains a short note.
14. As the sole user, I want to request a replan without reporting my earlier activity, so that updates do not become reporting obligations.
15. As the sole user, I want a change of preference to count as a valid replan, so that no external constraint or justification is required.
16. As the sole user, I want important changes summarized with their original intent and revised direction, so that I can understand the transition later.
17. As the sole user, I want unknown reasons to remain unknown, so that the system does not invent explanations.
18. As the sole user, I want planning evidence to remain secondary to the plan, so that I can read the day quickly.
19. As the sole user, I want an optional manually triggered evening review, so that review happens when useful.
20. As the sole user, I want the review to reconstruct actual events and broad chronology, so that a future visit tells me how the day unfolded.
21. As the sole user, I want the review to consider both the morning baseline and daytime changes, so that it does not compare reality only with the last plan.
22. As the sole user, I want one light invitation to supplement the review, so that I am not interrogated item by item.
23. As the sole user, I want sparse days and missing reviews to remain valid, so that they create no debt.
24. As the sole user, I want a month calendar and year/month navigation, so that I can find a past day.
25. As the sole user, I want a selected-day summary beside the calendar at a wide window size, so that I can preview the record before opening it.
26. As the sole user, I want historical days to reuse the daily reading surface, so that history needs no separate interaction model.
27. As the sole user, I want a past day with a review to open that review by default, so that I first see its retrospective account.
28. As the sole user, I want a past day without a review to open its progress when available, so that a missing review does not block reading.
29. As the sole user, I want an empty date to remain visibly empty, so that navigation does not manufacture a record.
30. As the sole user, I want to supplement or correct a historical day, so that later recollection can improve it.
31. As the sole user, I want the event date and later modification date distinguished, so that the history remains understandable.
32. As the sole user, I want a short trace of what changed, so that corrections do not silently erase their context.
33. As the sole user, I want Habits to replace the old This Week destination, so that exercise becomes one habit among others.
34. As the sole user, I want weekly count goals and daily time goals presented separately, so that unlike targets are not conflated.
35. As the sole user, I want real configured goals used, so that prototype sample values do not become my settings.
36. As the sole user, I want wake and sleep times shown when known, so that I can compare actual times with daily targets.
37. As the sole user, I want missing habit evidence distinguished from explicit non-completion, so that silence is not scored as failure.
38. As the sole user, I want a small recent-day strip and expandable history, so that the habit list stays compact.
39. As the sole user, I want selecting a history mark to reveal that habit's record for that date, so that I can inspect context without leaving the list.
40. As the sole user, I want to write a short exercise note such as a thirty-minute run, so that recording stays easy.
41. As the sole user, I want exercise detail fields and Strava links to be unnecessary, so that phone-to-computer transfer is not required.
42. As the sole user, I want a local exercise note distinguished from a Dida365 check-in, so that writing prose never silently submits a check-in.
43. As the sole user, I want consistent weekly counts and history marks, so that summary numbers are trustworthy.
44. As the sole user, I want source absence or stale habit readings made clear, so that I do not mistake cached or partial data for current completeness.
45. As the sole user, I want external record changes reflected on refresh, so that Dashboard remains a view of the shared workspace.
46. As the sole user, I want a stale edit rejected without losing my input or another writer's work, so that concurrent use is recoverable.
47. As the sole user, I want unfamiliar Markdown and older records preserved, so that upgrading the interface does not rewrite my notes.
48. As the sole user, I want old Exercise data retired only during the explicit 2.0 cutover, so that unrelated vault data stays untouched.
49. As the sole user, I want the installed Mac app to match FINAL with full content at useful window sizes, so that browser-only success is not mistaken for delivery.
50. As the sole user, I want loading, empty, malformed, and unavailable states to be calm and actionable, so that imperfect data does not prevent using other dates or destinations.

## Implementation Decisions

### Established architecture and ownership

- Retain the accepted Tauri architecture: shared Rust owns product behavior, validation, file access and persistence orchestration; plain TypeScript, semantic HTML and CSS own presentation and temporary UI state. No new dependency, external service or deployment configuration is approved.
- The System Workspace remains the canonical source of Daily Records. Do not repurpose the Exercise tracker Profile JSON as the daily-life model or introduce a second operational habit ledger.
- Dida365 remains authoritative for operational check-ins. Existing configured habit scope and goals supply product meaning; prototype fixtures do not change them. No live Dida365 request is part of writing or validating this spec.
- Continue to use the external Agent channel for interpretation, substantial replanning and review generation. A Dashboard update form is not an embedded Agent: accepting a sentence must not imply that it has interpreted and regenerated the plan.
- Existing Profile, Profile backup and Profile move are technical/domain concepts, not a requirement to preserve the old History and Settings navigation. The user has now explicitly declined retaining their legacy data and interfaces; follow G5 retirement scope.

### FINAL presentation contract

- Freeze the selected composite: Calendar F structure, Today K structure and Habits AG structure as combined in FINAL. Earlier variants are archaeology only, never alternative acceptance baselines.
- Preserve the overall sidebar, top spacing, typography, palette, reading widths, primary/secondary hierarchy and responsive intent demonstrated by FINAL. Prototype-only markers and obsolete copy are not product requirements.
- Calendar uses a month grid, separate year/month selection and a selected-day summary, with an action to open that date's complete daily surface. Selecting a phase keeps the selected date. Returning to Today restores the current local date.
- Today retains the morning plan and secondary evidence; Daytime uses the known/future timeline and update rail. The current-time line must not classify elapsed planned blocks as completed facts.
- Evening is a reading surface for an actual account of the day, including broad chronology and changes, rather than a page dominated by policy slogans.
- Habits groups weekly-count goals and daily-time goals, keeps the short weekly summary and day-focused list, and uses the selected weekday/today marker and expandable history geometry. Point selection reveals date-specific records in context.
- Replace the stale “早间计划” heading on other phases, remove obsolete Exercise tracking labels, and remove FRAME and developer instructions from product copy. Missing review indicators must not read as “pending work”.
- No new Settings design is implicitly authorized by its placeholder in the prototype. Preserve necessary vault access and refresh affordances in the new shell; resolve other retained administration capabilities before removing their old entry points.

### Daily behavior contract

| Input context | Required result |
| --- | --- |
| Planning just after waking at 07:00 | May revise the morning baseline; no confirmation step |
| Planning just after waking at 11:00 | Also morning calibration; waking is a fact, lateness relative to a plan is not assumed |
| First reply at 11:00 after working all morning | Keep automatic baseline; record confirmed events and adjust remaining arrangement |
| Afternoon preference change without external constraints | Daytime replan; no reason or morning activity report required |
| Only afternoon arrangement supplied | Earlier actual activity remains unknown |
| Event-only note | Record the event without automatically replanning or checking a habit in |
| No daytime input | No inferred completion, non-completion or reporting debt |

- One Daily Record belongs to one lived calendar day; morning calibration, daytime updates and review are perspectives rather than clock-gated or persisted workflow states.
- Preserve an independent morning baseline after daily activity has begun. Explicit correction of a wrongly recorded baseline is distinct from replanning and must be traceable, not a route to silently rewrite initial intent.
- Keep current remaining arrangement separate from actual events and meaningful change summaries. Unknown or ambiguous input stays neutral until interpreted; a material-change label alone is not proof that a sentence describes an accomplished event.
- Preserve important original intent, known reason and revised direction briefly; full plan version histories and minor-change logs are unnecessary.
- Review is manually initiated through the existing Agent channel, then read in Dashboard. It may invite supplementation once without requiring a checklist of answers. This spec does not create scheduled review generation.
- The underlying Markdown representation for independent baseline/current arrangement is not yet approved. Current v1 semantics update the main plan on material replan; that is an intentional 2.0 change requiring the contract gate below, not an already implemented capability.
- Old records cannot be relabeled as containing a preserved morning baseline if the only remaining plan may already have been revised. Preserve readable content and show honest availability; do not reconstruct missing original intent.

### Date selection, edits and recovery

- Extend the existing TodayApplication behavior boundary from today's implicit clock date to explicit selected-day operations; continue to distinguish wall-clock modification time from the record's event date. The date must remain associated with the loaded revision and save target, including across midnight or navigation.
- Calendar and Habits are read projections over an explicitly bounded date range and approved sources. Loading, selecting, refreshing or browsing an empty day does not create or modify records.
- Date validation must reject invalid or out-of-vault targets. A malformed date must not prevent viewing a different valid day. Reading and editing keep the selected-vault boundary.
- Preserve the existing revision check, targeted writes, unknown Markdown preservation and recoverable file-activation behavior. A second read or an app-only lock does not eliminate races with external editors; retain tests for displaced inode recovery, rollback and visible failure.
- Historical additions/corrections retain a short modification trace with the recording date and change. Placement, correction trace and explicit missing-record creation semantics are specified in G2 below; UI feedback remains pending.
- The current Evening correction operation replaces a bounded correction subsection and does not by itself fulfill a durable sequence of historical change entries. Implementation must not claim that reusing it unchanged satisfies the new trace requirement.

### Habits and exercise notes

- Weekly goals are configured counts; wake/sleep goals are daily times. Multiple goal tiers for the same wake/sleep behavior must not turn into duplicate independent behaviors or inflated totals.
- Known actual times require actual evidence; a time-threshold check-in cannot establish an exact wake or sleep minute.
- Render known completion, explicit non-completion and unavailable evidence distinctly without requiring the user to select an extra “unknown” state.
- A brief exercise note is sufficient. Structured distance, duration, heart-rate, start/end, sets and repetitions fields are not mandatory. No Strava link or automatic import is required.
- Writing an exercise note never automatically checks in to Dida365. Duplicate representations of the same exercise must not double-count a weekly total. Source matching and deduplication are part of the data contract gate, not permission to infer identity from arbitrary similar prose.
- Weekly summary, individual goals, period boundaries and history cells must agree. The prototype's 9/14 versus component goals 3+7+5 is a fixture defect, not a formula to reproduce. The final numerator/denominator treatment, target changes and partial coverage must be specified before aggregate implementation.
- Source refresh/storage must stay lightweight and explicit. No runtime polling, new connector, background synchronization or automatic Computer Use fallback is approved. A bounded sourced projection may be considered at the contract gate; an exhaustive parallel Dida365 ledger is excluded.

### Contract closure progress

以下技术选择依据既有四章节契约和已确认的产品行为制定；当前仅写入规格，不修改 live Workspace 或 Agent skill。

**G1 — Baseline representation（技术方案已明确；随最终规格审阅）**

- 保留四个既有顶级章节：`今天的大致安排` 继续表示当前可用安排，`计划依据` 继续服务当前安排，`白天更新` 留事实和变化，`晚间复盘` 留回顾。
- 新增可选顶级章节 `早间基准`，内含 `初始安排` 与 `初始计划依据` 两个子章节。一起保存起点，避免原始计划配上后来改过的依据。无额外 workflow 状态、确认按钮或必需 frontmatter。
- 2.0 生成的新一天在最初准备计划时写入基准与当前安排；起床后校准同步更新二者。日间重排只更新当前安排、对应依据和变化摘要。判断阶段依赖明确语境，不能只靠钟点、第一次回复或“事实出现”自动锁定。
- 旧记录没有 `早间基准` 时照常展示其已有计划与日间／晚间内容，早间 tab 明示“未独立保存早间基准”。不将旧主计划复制成虚构的原始基准。缺失、空白与已保存的基准须能区分。
- 写入顺序采用兼容扩展：先支持旧／新两种读取与定向写入，再协调未来的生成流程切换。v1 正在使用的写入方式不在本轮改动；新的生产生成方式没有就绪前，不能宣称独立基准闭环已交付。
- 基准缺失时，日间操作不得反向构造它；只有明确的早间规划或明确历史纠错才能建立或更正，后者留下修改记录。

**G4 — Wake/sleep attribution（沿用现有 lived-day 规则）**

- 起床属于实际起床的本地日期；当晚入睡属于所结束的生活日。例：9 月 8 日早上起床记入 9 月 8 日，9 月 9 日 00:30 为 9 月 8 日晚上的入睡，显示“次日 00:30”。不要仅凭 00:30 就决定归前一天，必须有“当晚入睡”语境或明确选中的生活日。
- 人工历史输入以选中日期为 lived day，并显式保留“次日”或完整发生日期；跨午夜边界不清时保持待解释，不用全局凌晨 cutoff 猜测。
- 入睡目标可跨午夜比较，例如 22:00、次日 00:00、次日 01:00；它们是同一行为的不同目标，不是三份实际记录。Dashboard 默认展示当前标准目标，展开记录可读取其他既有目标说明；不从原型写入新目标。
- 精确时间只来自明确时间证据；“10 点前起床”打勾只证明阈值，不能生成一个精确时刻。
- 新写入的修改时间保留本地日期、时间和 UTC offset；事件保留原始本地日期/时间及已知 offset。历史 offset 未知时保持未知；设备后来旅行不重新分桶已有 lived-day 记录，不把它们批量转换到当前时区。

**G5 — Existing capability inventory（事实已查明，去留待用户决定）**

- 旧 History 展示本周运动及历史周；旧 Settings 包括重复运动安排、Profile 名称、备份／恢复、导出转移／激活、通知许可与能力检查。并非只有一个无内容的设置入口。
- 已提出的轻量方案：保存旧数据文件，2.0 不迁移、不提供上述旧管理页面，仅保留 vault 选择和刷新。等待用户选择；未确定前不删除现有能力、不把旧数据并入新的习惯次数。

**G6 — Concrete review and coherent fixture plan（已拟定，原型更新待 G2 一并进行）**

- 保留 FINAL 页面结构，原型运行标识改成“FINAL · 合成演示”；标题随阶段显示。Calendar 无复盘标记采用中性“记”，不使用“待”。
- 使用同一份合成日程贯穿 Today 和 Calendar，不再让两者各读一套互相矛盾的示例。
- 9 月 8 日 14:10 的日间样例：07:18 起床；上午固定工作与报销已有记录；13:40 出现紧急工作；14:10 调整下午。接下来先处理紧急工作，17:30 取饭，晚间留恢复空间；上午学习仍未知。
- 同日复盘明确是稍后 21:30 的阅读视角，内容例如：“07:18 起床。10:00 参加工作 check-in，上午处理报销。13:40 临时工作打断原安排，14:10 将下午改为先处理急事。17:30 取饭，19:00 跑步 30 分钟，之后休息。原定项目没有继续，早间学习完成量没有记录。”已发生内容只能出现在对应时间视角，不能提前混入 14:10 的日间事实。
- 本周用周一、周二明确已知的每日结果产生数值：健身 1/3、营养药 2/7、整理 0/5，共已知 3/15。9 月 5 日的跑步属于上周，不计入本周；0 表示当前没有已知完成证据，不宣称全周没有做。这里仅是样例，分母从合成配置计算。
- 原型补记／更正例子：在 9 月 8 日补充 9 月 5 日“跑步 30 分钟”，随后更正为“跑步 20 分钟”；保留两条修改时间与目标日期。实际输入路径等 G2 答复后呈现，用户体验前不标记验收完成。

**G2 — Record entry contract（入口已获用户确认；交互待体验）**

- Today 所选日的日间栏提供自由文本记录，类别为普通记录或健身；Habits 的健身日期格提供同一输入，预设日期与健身关联，不要求重复选择。
- 两入口使用同一 Daily Record 中的 `白天更新` / `简短记录` 子章节。每个 app-created 条目有局部稳定标识、可选 Habit semantic key、创建时间和正文；这些是可选条目元数据，不增加 Daily Record 必需 frontmatter。非 app 条目仍保留可读，不自动替它们补标识。
- 更正选中条目，保留条目身份和类别，更新其当前正文，并在 `白天更新` / `修改记录` 中追加对应条目标识、修改时刻、旧文和新文。多次更正不覆盖旧的修改记录；不允许把输入中的 Markdown 标记解释成新的结构。
- 当前和历史日期都允许新增；若所选过去／当日没有记录，只有明确保存操作才以 exclusive-create 创建最小 Daily Record 和该条记录。不创建虚构基准或复盘。外部恰好创建文件则报冲突，不覆盖。未来日不作为已发生事实记录目标。
- UI 展示目标日期，保存绑定加载时的日期、vault 和 revision；切换日期不会把未保存内容写到另一天。保留草稿，遇冲突允许重新读取后由用户决定如何处理。
- 晚间复盘将当前版本的简短记录及更正以独立补充区域展示，不在本地用字符串替换重写 Agent 原有叙述。若原复盘已过时，明确标注存在后续修订；下一次用户触发复盘时 Agent 可整合，保留修改痕迹。
- 原型只存内存，已验证 Today 更正前后痕迹、Habits 新增后同日复盘可见；用户仍需体验该小交互才能关闭 G2。

**G3 — On-demand habit snapshot（数据路径已获用户确认；以下为具体技术方案）**

- 外部 Agent 在用户运行每日流程时按需整理已经读取的 Habit 结果；Dashboard 只读本地快照和 Daily Record，不直连滴答、不轮询、不启动 Agent。本轮不执行快照生产或修改 skill。
- 快照是可替换的 bounded derived artifact，不是第二个操作账本。使用一个版本化 JSON 文档，含 generatedAt（含 offset）、范围 from/to、来源、逐 Habit 的 semantic key/显示名/标准周目标或每日时刻目标，以及每日来源结果和覆盖状态。语义身份来自 Habits catalog 的稳定 key；重命名保留 key，不用模糊字符串自动合并。外部 source ID 如需映射仅留私有 artifact，不进入公开 fixtures。
- 范围为当前周所在窗口向前共 12 周，至本次读取所能证明的日期；未来和未读取日期标 unknown。每项记录带 observedAt 和 source；partial／unavailable 覆盖与明确 not_done 区分。新快照以完整有效候选原子替换，失败保留上个有效版，不用空结果清掉历史。Dashboard 显示更新时间和范围，读取失败显示旧快照或缺失，不能标成实时。
- 一周为 lived-date 周一至周日。周目标默认标准版；理想／底线不作为重复习惯相加。当前周使用当前配置目标，周中改目标后重新计算当前分母；过去记录保留已有 goal context，缺失时不回填历史达标率。
- 周次数先计快照中明确的 Dida365 完成日，每 Habit 每日最多一次；本地短记录只提供上下文，不自动增加次数。用户在 Agent 对话明确补报“这天完成”可形成带来源的 manual completion，同日与 Dida365 completion 去重。来源矛盾保持冲突并暂不计入，不能按更新时间猜胜负；新一次相同来源明确结果替换该来源的旧观察。
- `partial`、`baseline` 或不明确的时长文本不自动折算 normal 完成次数；保留状态与文字，只有明确达到所追踪目标的完成证据才计数。此规则不触发滴答写回。
- 汇总分子为各周习惯已知完成日数之和，分母为有合法目标的 active 周习惯标准目标之和；不把每日时刻目标加进去，不设上限伪装计数，不用补剂等超额次数抵消另一习惯缺口。展示为“已知次数 / 目标次数”，不是总体达标率；缺目标的项保留但排除汇总并说明。覆盖不足仍可展示下界计数，不能宣称零次实际活动。
- 点阵表示“有记录”，包括打卡或本地短记录；打开格子区分其来源与完成状态，因此有文字点不必贡献周次数。每日时刻只取明确的实际时间，不把阈值打卡换算成分钟。
- 路径落在私有 Workspace 内的可重建快照位置，工程落点与 JSON 字段拼写可在 ticket 中确定；上面的范围、身份、覆盖、去重和只读语义不能留给实现者自行改变。

**G5 — Legacy retirement（用户已确认旧数据无需保留）**

- 用户明确选择旧 Exercise 数据无需保留。2.0 不迁移旧运动记录、不提供旧 History、Profile 备份／恢复／转移、重复运动和提醒管理界面；必要的 vault 选择和刷新继续存在。
- 实际清理只在另行启动的 2.0 切换阶段执行，不在本轮执行。仅删除明确属于旧 Exercise/Profile 的 app-owned 数据，停用并取消旧应用管理的运动通知，防止隐藏页面后提醒继续运行。
- 不删除 vault、Daily Records、用户导出的其他位置文件、Dida365/Strava 数据或未识别文件。清理目标须按当前实现枚举，不能以整目录删除替代归属判断；记录切换完成标识，重启不重跑破坏性操作或导回旧 baseline 数据。
- 先保持 1.0 正常使用；2.0 交付切换时明确说明旧数据不保留、无旧备份／转移入口。更新旧验收契约，不再要求这些被用户取消的入口存在；保留与新流程有关的安全写入回归。

### Mandatory completion gates, not delegated product decisions

| Gate | Already fixed | What remains to complete before dependent implementation |
| --- | --- | --- |
| G1: Baseline/current record contract | One Daily Record, independent initial intent, current arrangement, preserved unknown content | Technical representation and transition specified above; review with the completed spec. Future writer coordination remains a delivery dependency; no live skill changes in this task |
| G2: Historical edits and exercise note entry | Both are in scope; small text input and dated trace; overall FINAL layout frozen | Two entries and shared record contract specified; narrow interaction implemented and checked, awaiting user experience feedback |
| G3: Habit sources and statistics | Dida365 check-ins stay operationally authoritative; real goal config; no automatic write-back | On-demand snapshot accepted; technical source/coverage/counting contract specified above for final review |
| G4: Wake/sleep attribution | Daily time targets; actual times only when known | Attribution and evidence rules specified above from the existing lived-day contract; verify examples in final review |
| G5: Old destinations and data | Remove old History/Settings as design baselines; old Exercise data explicitly not required | Retirement scope approved above; execute only at the later authorized 2.0 cutover |
| G6: Final content and acceptance | FINAL is the sole visual baseline | Complete concrete evening content, fix stale labels/fixture arithmetic, exercise the omitted interaction states; test seams have been confirmed by the user |

## Testing Decisions

- **Confirmed primary seam:** extend the existing TodayApplication public workflow boundary, using an isolated selected vault, fixed clock and controllable TodayRecordStore. Assert presentation results and durable file effects. Keep Calendar range projections and habit calculations testable at this application layer rather than building parser-specific mocks throughout the UI. Exact facade decomposition remains an implementation choice after the contracts are specified.
- **User confirmation:** 用户已确认“符合，沿用现有入口”：采用 TodayApplication 工作流边界与 packaged Mac 验收。此确认确定测试方案，不代表本轮启动测试或产品实施。
- **Prior art:** existing Today workflow tests cover targeted day/evening writes, literal input preservation, stale revisions, malformed identities, missing records, external refresh, fact/intent/reason/direction separation, indented/fenced Markdown, file failure, retained external descriptors and recovery. Preserve these protections and extend their observable scenarios instead of replacing them with isolated parser assertions.
- **Native acceptance seam:** reuse the packaged Mac IPC/AX acceptance workflow with isolated synthetic records and controlled clock. Today, Today-write and installed-cycle scenarios are existing foundations. Extend them for Calendar selection, historical edits and Habits only after their contracts are settled. Browser fixtures and Rust checks do not replace installed-app acceptance.
- Good tests verify a user-visible result or preservation guarantee. Do not test private function arrangement, mirror the implementation, snapshot arbitrary full HTML, or claim visual parity merely from successful clicks.

| Scenario group | Required evidence |
| --- | --- |
| Baseline and replanning | All daily boundary examples above; pure event versus pure replan; morning baseline unchanged by daytime replan; ambiguous text does not become a fact |
| Date navigation | Month/year changes, selected-day summary, three phases on the selected date, return to today, no-review and no-record defaults; browsing leaves source bytes untouched |
| Selected-date save | Explicit date/revision association survives midnight and navigation; only target record changes; stale write rejected and unsaved text recoverable |
| Historical changes | Event date and edit date both remain intelligible; multiple additions/corrections retain the agreed trace; established baseline is not silently replaced |
| Habit evidence | Weekly boundaries, actual goal configuration, unknown versus explicit not-done, exact time versus threshold-only evidence, duplicate sources, stale/partial data and coherent summary/history |
| Exercise note | One short sentence suffices; no required structured detail or Strava link; no Dida365 check-in side effect; agreed date/habit association is visible |
| Markdown compatibility | Old four-section records, partial files, unfamiliar prose/headings/frontmatter/fences and conflicting edits remain safe and readable; no invented historical baseline |
| Visual acceptance | Same complete synthetic content as FINAL; sidebar, Calendar summary, Today rail, Habits dots, narrow/intermediate/wide layouts, expanded states, long text and keyboard focus; no clipping or inaccessible primary actions |
| Data preservation | Legacy Exercise/Profile retirement touches only enumerated owned files at cutover; vault and unrelated files unchanged; old managed notifications canceled; no second operational ledger appears |

- Before product handoff, run the relevant frontend build/Rust checks, focused workflow regressions and rebuilt packaged Mac acceptance appropriate to the actual change. Record exact pass/fail and limitations. Tests have not been run during this specification-only task.
- Use only synthetic data in the public Dashboard repo and automated evidence. Private vault examples are contextual input, not fixtures to copy into version control.

## Out of Scope

- Production implementation, skill modification, live Daily Record edits, Dida365 calls or automation changes during this spec task.
- Restarting layout selection, adopting an earlier prototype variant, or treating the old History/Settings pages as compatibility baselines.
- Application-internal Agent execution, task window, direct habit check-in controls, replacing Dida365 or becoming the sole operational entry point.
- Strava integration and scheduled exercise reminders as required 2.0 work; they remain optional future checklist items.
- A complete sports log, mandatory exercise metadata, mandatory daytime reporting, review debt or automatic interpretation of silence.
- Drag-and-drop scheduling, a full calendar service, multi-device synchronization, new dependencies/services, public hosting or external deployment.
- Skins, multilingual UI/content translation, accounts, multi-user support and public product distribution.
- Deleting vault history or unrelated data, migrating unknown records automatically, or silently altering the current Agent workflow to fit a new file shape. Legacy Exercise/Profile data retirement is limited to the explicitly approved later cutover.

## Further Notes

- This is an incremental specification synthesized from user decisions, the FINAL review and current source inspection. It is not evidence that any 2.0 functionality has shipped.
- Source index: [roadmap](../../../.scratch/personal-dashboard-roadmap.md), [design decisions](../../../.scratch/personal-dashboard-2/design-decisions.md), [FINAL prototype and run instructions](prototype/README.md), [v1 specification](../../../.scratch/personal-life-system-v1/spec.md), [original daily-loop decision](../../../.scratch/personal-life-system-v1/issues/05-define-daily-decision-loop.md), [domain vocabulary](../../CONTEXT.md), [accepted Tauri ADR](../../docs/adr/0001-use-tauri-for-the-cross-platform-app.md).
- Tortilla Flat owns the private planning context; Personal Dashboard owns the application and this spec. Relative cross-repo links assume the current adjacent checkout layout. No private Daily Record content has been copied into this spec.
- Existing vocabulary is preserved: Personal Dashboard is the product, Exercise tracker is a feature area, Profile is existing local exercise data, and Daily Record is the shared daily document. The glossary's older exercise-centered descriptions do not override the user's explicit 2.0 scope decisions; vocabulary alignment can accompany the eventual implementation contract, not an unrelated rewrite here.
- No new ADR is created: the accepted Tauri decision is retained, and the still-open representation/migration decisions have not been made yet.
- Next handoff: resolve gates with focused contract work and the small G2 prototype example, update this same spec, then create dependency-ordered implementation tickets. Tickets touching unresolved gates must not be marked ready. Do not automatically start implementation.

### Narrow interaction visual feedback

用户明确拒绝首轮新增区域的视觉：字号过大、层级突兀，与已认可的早间基准和原型不一致。已将新增表单复用原有 daytime composer 样式，并将记录、修改痕迹与晚间补充对齐原有正文／辅助文字尺度；浏览器检查了日间和晚间效果。此修正尚待用户认可，不能把功能可操作等同于视觉验收。FINAL 原有布局与字体层级仍是唯一基准。
