# Personal Dashboard This Week 工作区 v2

Status: ready-for-agent
Approval: 用户于 2026-08-19 明确批准 spec 与 ticket breakdown

## Problem Statement

当前 Personal Dashboard Mac 工作区仍然一次性暴露了过多的出发响应模型。
默认 This Week 既像计划表，又像永久打开的详情面板；**Leaving for gym**、
**Move to fallback** 和 **Skip** 让一次普通锻炼看起来像用户必须先完成的决策树，
而不是一次锻炼记录。

用户的正常行为更简单：先看到计划，不需要先点击出发；锻炼回来以后，再更新
锻炼记录。如果没有完成锻炼，改时间或跳过本次是例外操作。如果用户没有任何
操作，这次锻炼仍然是未记录状态，不能被算作完成。

工作区还需要一套连贯的窗口模型。在 `960x720` 下，它应该是平静、以 agenda
为主的 Mac 工作区，而不是被压缩的三栏 dashboard。在中等窄窗口下，导航和
agenda 仍然要可用，选中详情只在需要时临时出现。在现有的 `640x520` 最小窗口
下，同一套流程应该变成清晰的 drill-in，而不是把桌面布局硬挤进小窗口。

这是新一轮规划。上一轮 Mac workspace spec 及其 tickets 保留为历史规划记录，
本 spec 不修改它们。

## Solution

以已批准的 **A — List + temporary sheet** 作为生产设计基础。

默认 This Week 工作区只保留理解本周所需的内容：

- 安静的 Personal Dashboard 身份，以及现有的 This Week、History、Settings
  目的地；
- 当前周标签；
- 三次 qualifying workouts 的进度；
- 保留现有的 Next departure 卡片；
- Monday、Wednesday、Friday 的紧凑时间顺序 primary 行；
- 从属的 Open capacity 分组，显示 Saturday、Sunday 可用时段。

默认状态没有永久右侧详情栏，也不会自动打开详情。用户明确选中某一行后，
桌面和中等窗口才出现覆盖在 agenda 上方的临时右侧详情层，不为它永久预留
第三栏。在 `640x520` 下，选中行进入全窗口详情，并提供明确的 Back。成功完成
操作后，临时详情关闭，回到 This Week，被影响的行保持选中并显示更新后的状态。

This Week 使用四层可见状态：

1. **未来计划**：只显示时间安排和状态，不显示出发操作，也不把 Record
   workout 作为主操作。
2. **到期或已过去、尚未记录**：以 **Record workout** 为主操作，
   **Change to another time** 和 **Skip this session** 是例外操作。
3. **已记录锻炼**：显示已保存的锻炼摘要和现有的修改入口。
4. **已改时间或已跳过**：原行保留调整结果；改到的新时段成为独立的可记录
   活动行；跳过的行可以直接撤销。

没有锻炼记录就没有 qualifying completion。周仍开放时，该行保留补记机会；
周关闭后可以被归类为未完成，但界面不能暗示它已经完成。

## User Stories

### 默认 This Week 工作区

1. 作为唯一用户，我希望 Personal Dashboard 打开时进入 This Week，以便首先
   看到当前锻炼计划。
2. 作为唯一用户，我希望应用身份和安静的本地/离线提示仍然可见，以便工作区
   仍然像 Personal Dashboard，同时不再占用 hero 的空间。
3. 作为唯一用户，我希望可见目的地只有 This Week、History、Settings，以便
   导航聚焦于当前产品范围。
4. 作为唯一用户，我希望当前目的地有明确选中状态，以便不用打开额外面板也
   知道自己在哪里。
5. 作为唯一用户，我希望当前周标签无需滚动就能看到，以便所有行都有明确的
   时间上下文。
6. 作为唯一用户，我希望三次 qualifying workouts 的进度无需滚动就能看到，
   以便一眼理解本周状态。
7. 作为唯一用户，我希望保留现有的 Next departure 卡片，以便下一次计划时段
   仍然容易找到。
8. 作为唯一用户，我希望所有 primary workout 行以紧凑的时间顺序 agenda 显示，
   以便无需打开每一行就能扫描 Monday、Wednesday、Friday。
9. 作为唯一用户，我希望默认行显示日期、时间、活动角色和真实文字状态，以便
   基本计划信息不依赖详情层。
10. 作为唯一用户，我希望 Saturday、Sunday 的 Open capacity 作为从属分组显示，
    以便恢复容量可见但不与 primary 计划竞争。
11. 作为唯一用户，我希望无需滚动就能看到可用容量摘要，以便知道是否可以改时间。
12. 作为唯一用户，我希望不可用或已占用的时段与可用时段明确区分，以便 agenda
    不会把不能选择的时段显示成可选。
13. 作为唯一用户，我不希望默认视图出现永久详情栏、解释性面板、出发原因列表
    或内部诊断文字，以便 agenda 保持平静、不冗余。
14. 作为唯一用户，我希望没有选中行时默认视图仍然有用，以便打开应用不会像进入
    一个尚未完成的详情流程。

### 选中与上下文详情

15. 作为唯一用户，我希望只有在选中一行后详情才出现，以便应用不会在我没有要求
    时接管窗口。
16. 作为唯一用户，我希望选中行保持明显选中，以便 agenda 与临时详情的关系清楚。
17. 作为唯一用户，我希望选中详情只显示该行所需的最小信息，以便选择操作增加
    上下文而不是重复整周内容。
18. 作为唯一用户，我希望未来行只显示计划和状态，不出现出发响应操作，以便计划
    不会被呈现为必须手动启动的任务。
19. 作为唯一用户，我希望到期或已过去但未记录的行把 Record workout 作为主操作，
    以便界面反映真实的普通操作路径。
20. 作为唯一用户，我希望已完成行显示锻炼证据和现有编辑路径，以便理解已记录内容。
21. 作为唯一用户，我希望普通锻炼操作使用临时详情而不是 modal，以便 agenda 仍然
    可见，而真正需要确认的操作保留独立确认语义。
22. 作为唯一用户，我希望记录、改时间或跳过成功后临时详情关闭并回到 This Week，
    以便结果在原始上下文中立即可见。
23. 作为唯一用户，我希望操作完成后被影响的行仍然选中，以便焦点和视觉上下文不跳走。
24. 作为唯一用户，我希望桌面窗口可以通过 Escape 或 Close 关闭临时详情，以便查看
    操作可逆且不改变数据。
25. 作为唯一用户，我希望紧凑窗口详情有 Back 回到 agenda，以便单表面流程可逆。
26. 作为唯一用户，我希望 Back 后焦点回到来源行，以便键盘和视觉上下文保持一致。

### 正常锻炼记录

27. 作为唯一用户，我希望按计划出门锻炼时不需要点击出发按钮，以便不用确认一个
    并非正常操作的动作。
28. 作为唯一用户，我希望锻炼记录关联到选中的计划行，以便记录和计划保持连接。
29. 作为唯一用户，我希望 Record workout 流程保持 click-only，以便无需输入文字也能
    快速完成记录。
30. 作为唯一用户，我希望活动选项仍然只有 Elliptical、Weight training、Other
    exercise，以便设计不引入新的锻炼分类。
31. 作为唯一用户，我希望保留完整的时长选项，包括 Under 20 和 60+ minutes，以便
    qualifying 语义不变。
32. 作为唯一用户，我希望保留既有的五个 perceived-effort 选项和中性指导，以便
    界面不暗示越用力越好。
33. 作为唯一用户，我希望记录完成后选中行和本周进度立即更新，以便不用手动刷新。
34. 作为唯一用户，我希望 Under 20 记录被保留但不增加 qualifying progress，以便短时
    锻炼不会被错误表示为 qualifying completion。
35. 作为唯一用户，我希望 qualifying record 只增加一次进度，以便刷新或重启后计数仍然可信。
36. 作为唯一用户，我希望额外锻炼使用独立的 Log workout now 入口，以便未安排的锻炼
    不会被错误绑定到某个计划行。
37. 作为唯一用户，我希望正在进行的记录经过既有持久化边界后仍然存在，以便离开或
    重启应用不会丢失 click-only 流程。

### 例外：改时间和跳过

38. 作为唯一用户，我希望到期或未记录的时段可以使用 Change to another time，以便
    错过计划后仍能恢复，而不用进入出发响应决策树。
39. 作为唯一用户，我希望改时间界面显示所有尚未过去的星期和时间，以便手动调整不被
    限制在某个特殊子集。
40. 作为唯一用户，我希望 Saturday、Sunday 是默认建议，以便常见恢复路径可见，但不隐藏其他有效选择。
41. 作为唯一用户，我希望界面明确显示最终安排的星期和时间，以便知道这次活动现在归属哪里。
42. 作为唯一用户，我不希望改时间界面出现内部术语 fallback，以便内部调度概念不泄漏到用户决策。
43. 作为唯一用户，我希望保存前看到冲突提示，以便知道选定时段是否与另一项锻炼或安排重叠。
44. 作为唯一用户，我希望冲突只有在明确确认后才允许保存，以便有意冲突可以执行，但绝不会静默发生。
45. 作为唯一用户，我希望本周改时间只影响选中的一次 occurrence，以便不会默默改写 repeating routine。
46. 作为唯一用户，我希望原行保留并显示调整结果，以便能理解这次决策的来源。
47. 作为唯一用户，我希望新的目标行成为可记录的活动行，以便实际锻炼后在移动到的时段记录。
48. 作为唯一用户，我希望 Skip this session 是直接的例外操作，以便跳过不需要理由表单或二次确认。
49. 作为唯一用户，我希望跳过后立即提供 Undo，以便误触可以恢复，而不用进入破坏性流程。
50. 作为唯一用户，我希望跳过不增加进度，以便进度不会暗示跳过的锻炼发生过。
51. 作为唯一用户，我不希望被强制选择 Work ran late、Too tired、Another commitment 等原因，
    以便产品不要求对普通例外作无用解释。

### 未解决与完成状态

52. 作为唯一用户，我希望到期或已过去但没有记录的行保持未记录状态，以便沉默不会被解释为完成。
53. 作为唯一用户，我希望周关闭前未记录行仍然可以补记，以便遗漏可以被纠正。
54. 作为唯一用户，我希望周关闭把未完成和已完成区分开，以便进度和历史保持真实。
55. 作为唯一用户，我希望 moved、skipped、recorded、仍未解决的状态都有文字和非颜色信号，
    以便在不同主题和辅助技术下都能理解。
56. 作为唯一用户，我希望本周进度只计算 qualifying workout records，以便调度操作不会伪装成锻炼证据。
57. 作为唯一用户，我希望现有 History 目的地保留这些记录和结果，以便 This Week 仍然是当前工作区，
    而不是另一个历史编辑器。

### 窗口尺寸与导航

58. 作为唯一用户，我希望默认 `960x720` 窗口无需 body 滚动就能显示完整 This Week 骨架，以便工作区
    感觉经过设计而不是被压缩。
59. 作为唯一用户，我希望 `960x720` 使用可读的目的地导航和全宽 agenda，以便列表获得最强视觉权重。
60. 作为唯一用户，我希望 `960x720` 选中详情时出现有边界的临时右侧层，以便列表不会被挤成狭窄的第三栏。
61. 作为唯一用户，我希望中等窄窗口先减少导航装饰，再减少 agenda 可读性，以便主要内容保持可用。
62. 作为唯一用户，我希望中等窄窗口选中详情仍然使用有边界的覆盖层，以便 agenda 在其后仍可辨认，
    而不会被迫 awkward reflow。
63. 作为唯一用户，我希望调整窗口尺寸时保留目的地、选中行和正在进行的例外操作，以便缩放不会重置工作。
64. 作为唯一用户，我希望 `640x520` 把永久导航 rail 换成有文字的目的地切换器，以便窄窗口仍然可理解。
65. 作为唯一用户，我希望 `640x520` 一次显示 agenda 或详情中的一个，以便任何表面都不会被挤到不可读。
66. 作为唯一用户，我希望紧凑详情占满窗口并提供明确 Back，以便 drill-in 是有意的，而不是被裁剪的 sheet。
67. 作为唯一用户，我希望只有当前列表或详情表面滚动，以便所有支持尺寸下 body 和窗口壳层保持固定。
68. 作为唯一用户，我希望 `640x520` 仍然完整支持记录、改时间、跳过、Undo 和额外锻炼，以便紧凑模式不是只读降级版。
69. 作为唯一用户，我希望所有支持尺寸下都不自动打开详情，以便到期或调整窗口不会意外接管屏幕。

### 可访问性与本地优先约束

70. 作为键盘用户，我希望目的地、agenda 行、详情控件、Back、Close、Undo 和冲突确认按逻辑顺序可达，
    以便流程不依赖鼠标。
71. 作为键盘用户，我希望选中状态和当前目的地以语义方式暴露，以便辅助技术理解 agenda 与详情的关系。
72. 作为键盘用户，我希望详情关闭后焦点回到选中行，以便操作结果有可预测的下一焦点。
73. 作为屏幕阅读器用户，我希望 navigation、main、agenda lists、detail、forms、live status 和 warnings
    具有语义角色和名称，以便布局关系被程序化传达。
74. 作为不能依赖颜色的用户，我希望每个锻炼状态都包含可读文字和额外符号或形状，以便状态始终可区分。
75. 作为唯一用户，我希望所有锻炼操作保持 local-first 和 offline，以便新工作区不引入账户、云存储或同步。
76. 作为唯一用户，我希望继续使用 Tauri 2、Rust core、版本化 JSON、plain TypeScript、semantic HTML 和 CSS，
    以便这轮设计不产生未经批准的平台或依赖变化。

## Implementation Decisions

- 已批准的视觉方向是 A — **List + temporary sheet**。B（inline expansion）和 C（two-track board）作为比较证据保留，
  但不作为本轮生产方向。
- This Week 是默认目的地，并采用 list-first。默认状态没有打开的详情表面，也没有永久预留的 contextual column。
- 在 `960x720` 下，壳层提供可读的目的地导航和一个全宽 agenda。选中行后，临时右侧层以有边界的宽度覆盖页面，
  不把 agenda 变成永久三栏布局。
- 在中等窄窗口下，导航可以收缩为紧凑 icon rail，agenda 仍然是主要表面。选中行仍然打开有边界的覆盖层；
  覆盖层不能为了并排显示而迫使 agenda 标签被裁剪或不自然换行。
- 在 `640x520` 下，导航变为有文字的目的地切换器。agenda 与详情一次只显示一个；详情有明确 Back，
  返回后恢复来源行的选中和焦点。
- 窗口壳层和 document 保持固定。普通垂直滚动只由当前 agenda 或临时详情拥有，不能由 document body 拥有。
  调整窗口尺寸时保留目的地、选中行、待处理例外和正在进行的锻炼记录状态。
- 默认 This Week 内容有明确边界：当前周、qualifying progress、Next departure、primary rows 和从属 Open capacity。
  schema number、file operation、长解释、内部调度术语、出发原因和永久详情摘要不进入默认视图。
- 计划中的 departure 不是用户操作。前端不能要求或呈现 **Leaving for gym** 这一步，才能让用户记录锻炼。
- 选中计划行的状态模型是：

  `future plan → due/past unrecorded → workout recorded`

  例外分支是：

  `due/past unrecorded → changed this week`

  `due/past unrecorded → skipped → undo available`

  没有保存 qualifying 或 non-qualifying workout record，就不能进入 completed。没有记录的行要等正常周关闭语义再分类。
- 到期或已过去但未记录的详情以 **Record workout** 为主操作；**Change to another time** 和 **Skip this session** 是次要
  例外操作。未来计划详情不提供 Record workout 主操作。
- 记录操作使用现有的 activity、duration、perceived effort 分阶段选择，并保持 click-only。Under 20 被记录但不增加 qualifying progress。
  额外锻炼使用独立的 unscheduled 入口，不自动绑定到选中的计划行。
- 改时间只调整本周的一次 occurrence。它提供所有尚未过去的星期/时间，Saturday、Sunday 作为默认建议。用户界面直接显示最终星期和时间，
  不显示内部词 fallback。
- 冲突显示可见警告，并且只有明确确认后才能接受。确认后原行保留调整结果，目标活动行成为可记录行；repeating routine 不被改写。
- Skip 是直接操作，并提供立即可用的 Undo。没有强制原因，也没有二次确认；跳过不增加进度。
- 记录、改时间、跳过成功后关闭临时详情，保留被影响行的选中状态，刷新可见状态，并通过现有语义 status 机制报告结果。
- 前端拥有临时 selection、sheet/drill-in presentation、紧凑导航、焦点恢复和用户界面文字；Rust application core 拥有锻炼状态、资格、
  持久化结果、进度、提醒意图和可用语义操作。
- semantic application view 至少要区分 future planned、due/past unrecorded、recorded、moved-original、moved-destination、skipped、
  unresolved 和 available capacity。前端不能通过解析显示文案来决定展示哪些控件。
- 现有 departure-response command surface 及其 `Leaving` gate 不能继续作为本设计的必经路径。生产 domain seam 必须支持从 due 或 past
  unrecorded 的计划 occurrence 直接记录。若表达该语义必须改变持久化状态，必须版本化并迁移；presentation 不能静默重解释存量数据。
- 现有 History、Profile & Data、Routine、Notifications 行为不在本 spec 中重设计。共享目的地导航和紧凑路由必须保持它们可达，
  详细工作可以另行规划。
- 生产仍然使用 Tauri 2、共享 Rust core、版本化 file-backed JSON、平台 adapters、plain TypeScript、semantic HTML 和 CSS。
  不增加新的 frontend framework、service、cloud dependency 或 deployment path。

## Testing Decisions

- 最高价值的测试 seam 是现有 packaged Mac acceptance：启动隔离的 packaged Tauri app，通过 macOS accessibility 操作渲染控件，穿过真实
  Tauri IPC，在需要持久化的场景关闭并重新启动，再断言可见的语义结果。browser fixture 或直接调用 Rust 对象都不能单独作为 release acceptance。
- 现有 Rust application-workflow tests 继续作为快速 domain seam，覆盖 workout choices、duration qualification、effort choices、
  progress recomputation、schedule eligibility、persistence、rollover、history 和 reminder 行为。只有无法可靠通过 packaged UI 证明的
  semantic transition 才增加底层测试。
- 在精确 `960x720` 下，packaged acceptance 必须证明默认 This Week 包含周标签、进度、Next departure、所有 primary rows 和 Open capacity，
  且 body 不滚动、详情没有自动打开。
- Acceptance 必须选中 future row，证明它只显示计划和状态、不出现 departure-response action；再选中 due 或 past unrecorded row，证明
  Record workout 是主操作，同时 Change to another time 和 Skip this session 可用。
- Acceptance 必须通过分阶段 click-only 流程直接记录一次 scheduled workout，验证选中行和 progress 更新，并在 relaunch 后验证保存结果。
  同时覆盖独立的 unscheduled Log workout now 路径。
- Acceptance 必须覆盖直接 Skip、可见 Undo、本周改到 Saturday 或 Sunday 建议、任意尚未过去的选项、冲突警告、明确冲突确认、原行调整结果和新的
  目标可记录行。
- 响应式 acceptance 至少测量 `960x720`、一个中等窄 viewport 和 `640x520`。它必须断言没有 document/body overflow、目的地导航可读、默认状态
  list-first、中等宽度使用有边界临时详情、紧凑宽度使用全窗口详情、Back 有效，以及 resize 后 selection/focus 保持。
- 可访问性 acceptance 覆盖目的地语义、agenda 行名称、选中状态、主/次操作顺序、键盘激活、可见焦点、临时表面关闭、紧凑 Back、冲突警告、
  明确确认、Undo 和 live result status。
- Status acceptance 使用文字和非颜色信号覆盖 future、unrecorded、recorded、moved、skipped、unresolved、available、conflict 和 unavailable。
- 已批准 prototype 和生产应用的截图支持人工视觉审阅，但截图不是唯一 pass/fail 依据。决定性证据是 packaged application boundary 上的语义、
  交互、持久化、可访问性和 viewport-safe 行为。
- 不新增测试依赖或 frontend framework。现有 TypeScript build、Rust checks、application-workflow suite、packaged Mac acceptance、
  source-boundary acceptance 和 whitespace checks 仍然属于生产验证。

## Out of Scope

- 修改上一轮 `personal-dashboard-mac-workspace` spec、map 或其 01–14 issue 文件。
- 在用户明确批准本 spec 之前，从它生成 implementation tickets。
- 把 disposable prototype 的实现直接升格为生产代码。
- 要求用户先点击 Leaving for gym、选择 departure reason 或完成 pre-departure confirmation，才能记录锻炼。
- 改变 weekly qualifying goal、既有 workout choices、duration choices、effort choices、reminder timing、history meaning、backup behavior、
  profile authority 或 local-first/offline 产品边界；只有在 direct recording 语义确实无法在当前 domain 表达时，才允许严格必要的版本化 domain change。
- 除了保持共享壳层和紧凑导航可达，不重设计 History、Profile & Data、Routine 或 Notifications。
- 增加 accounts、authentication、cloud storage、synchronization、analytics、telemetry 或另一个 Personal Dashboard feature area。
- 增加 React、Svelte、其他 frontend framework、未经批准的 dependency 或 deployment service。
- iPad 或 Samsung 实现、mobile layout、mobile notification 或 physical-device acceptance。
- 复制 TickTick 的名称、logo、专有资产、exact iconography 或视觉身份。TickTick 只提供结构灵感。
- dark-mode、custom title-bar chrome、animation polish、final iconography、signing、notarization、public distribution 或 automatic updates。

## Further Notes

- 本轮视觉来源是已批准的 A prototype `ticket-08-week-flow`，并已在 `960x720`、中等宽度和 `640x520` 检查。prototype 只是 fixture-only design evidence。
- 用户于 2026-08-19 认可 A 的视觉方向，并确认不自动打开详情，接受推荐的操作完成后行为：关闭详情，回到 This Week，保留被影响行选中。
- 本 spec 有意替换之前的 departure-response 假设，而不是尝试协调旧 ticket 编号。后续 `/to-tickets` 应在新的 effort slug 下创建全新 ticket 集合，
  并说明它们对已经交付的 Tauri、Rust、persistence、reminder 和 packaged-acceptance 能力的依赖。
- 本 spec 采用的测试 seam 是现有 packaged Tauri UI/IPC acceptance 加现有 Rust application-workflow seam。请在 spec review 时确认这个 seam，
  然后再生成 tickets。
- `/to-tickets` 必须等待用户明确批准本 spec。本轮规划尚未开始生产实现。
