# Personal Dashboard — 本轮体验改善与任务、习惯能力补齐

ID: PDEX-SPEC-02  
Type: spec  
Triage: ready-for-agent  
Status: ready-for-agent  
Lifecycle: open  
Stage: specification published locally; tickets and implementation not started  
Date: 2026-10-11  
Canonical tracker: [local map](map.md)  
Working branch: codex/dashboard-experience-refinement-spec  
Test boundary: 用户确认复用业务操作测试，并用打包 App 验证保存、重开、拖动和保留区域  
Publication: local Git; no GitHub publication

## Problem Statement

用户在上一轮已接受的 Personal Dashboard 4.0.7 上继续实际使用，发现新版解决了一些问题，但部分呈现比旧版更占空间、操作不够自然。需要保留现有 App 已经好用的地方，改善明确指出的局部，而不是以网页版 prototype 为标准给整个 App 换肤。

Tasks 右栏重复显示标题，内容编辑空间被日期、时间、计划执行结束及分散的 Save/Cancel 占用。用户希望打开任务就能写内容，同时补齐任务父子关系、清单文件夹、优先级、标签及自然的操作入口。

Today 时间轴在较大窗口里只能看到约五小时，难以概览一天。点击任务跳到午夜刻度下方的重复详情区，打断所在时间位置；部分宽泛安排看起来在时间轴上却不能像精确安排一样拖动。宽泛措辞被默认位置改成“约十三点”，夸大了用户实际选择的精度；缩小窗口时卡片也会被不自然地裁掉。

Collaboration 的长 context 撑长整页，在输入下方留下大片空白，背景移到底部时收放入口不直观。需要改善空间分配，又要保留“语音先在输入下方预览，停止后进入可编辑草稿”的有意差异。Slash 已有补全和退出，缺的是多候选的上下键选择，而非重新设计整套命令菜单。

Calendar 的日期回顾路径基本合适，用户需要在原结构上增加任务创建与详情浮窗，以及中国、美国节日的轻量提示。Habits 已有汇总、今日列表和打卡，却没有本地新增、完整编辑与单项历史统计入口。用户希望点左侧一个 Habit 后才看详情，并保留当前默认主界面。

本轮讨论、四项关键问答和原型逐页反馈已形成一致方向。GitHub 暂时不可用，因此完整规格、后续 tickets 和授权后的实现都需要在既有本地 tracker 与 Git 中留存可追溯记录。

## Solution

在现有 App 上实施有边界的增量改善。Tasks 保留紧凑清单列表与右栏，采用用户选择的 B 编辑层级：单一可编辑标题、默认聚焦且更大的 Content、紧凑属性入口、同行的保存取消。子任务仍是普通 Task；文件夹只归组清单；优先级与标签用于整理，不引入四象限。

Today 采用用户选择的 A 的紧凑概览和就近详情思路：较大窗口能概览主要日间安排，需要时放大精细操作；点击不改变背景滚动位置；宽泛和精确安排都能拖动。未操作的“下午”保留原措辞，主动拖到 16 点后才变成“约16:00”。取消 Task 的时间安排只清时间和执行区间，保留日期和任务。

Collaboration 保留用户认可的 A/C 聊天空间，并以不挤压输入与语音操作的背景浮层作为本规格的实施选择。这个选择来自评审后的 Agent 建议，不冒充用户逐项选定 C。背景有独立限高、滚动及就地收起；消息、输入、转写合理分配窗口。Slash 只落实多候选上下键选择，保留现有补全、退出和视觉样式。

Calendar 保留月历、右侧日期回顾和下方当日任务。点日期继续看计划与复盘，点 Task 打开可编辑浮窗；顶部加号带入所选日期。中、美节日可以同时轻量显示并关闭，不挤占任务空间。

Habits 保留本周摘要和今日列表。顶部加号创建本地 Habit；点击左侧 Habit 后显示详情、统计、编辑及停用恢复。每日目标按天、每周目标按不同达标天计算；改目标从下个周期生效，历史按当时目标保留。完整历史和有限覆盖分别表达，不能用近期快照冒充累计或最高连续结果。

实施以真实业务操作、稳定身份和保存读回为基础。原型只回答指定区域的呈现问题，其外壳、样式、演示工具和模拟数据不进入产品。所有阶段在本地 Git 留存分支、完整 commit、规格及 ticket 对应关系；main、远程推送和 App 安装保持各自授权边界。

## User Stories

1. As a Personal Dashboard 用户, I want 只改善我明确提出的部分, so that 现有已经顺手的 App 不会因照搬网页原型而被改坏。
2. As a Personal Dashboard 用户, I want 方案选择只作用于讨论过的交互, so that Today 选 A 不会被理解为全 App 都选 A。
3. As a Personal Dashboard 用户, I want 全局导航、配色、字体和设置入口沿用现有 App, so that 新功能融入已有体验。
4. As a Personal Dashboard 用户, I want Tasks 保持紧凑的清单和任务列表, so that 我可以继续快速扫描任务。
5. As a Personal Dashboard 用户, I want 点击任务后仍在右栏编辑, so that 我能同时看到列表和当前任务。
6. As a Personal Dashboard 用户, I want 打开任务后光标进入 Content, so that 我可以立刻写内容。
7. As a Personal Dashboard 用户, I want 顶部标题直接可编辑且只有一处, so that 不会被重复的 Name 字段浪费空间。
8. As a Personal Dashboard 用户, I want Content 靠上且比现在更大, so that 简短补充内容也能自然完成。
9. As a Personal Dashboard 用户, I want 清单、日期和时间平时只显示紧凑值, so that 编辑控件不长期占据右栏。
10. As a Personal Dashboard 用户, I want 点击时间入口在同一区域设置开始与结束, so that 我不用在多个大字段间来回寻找。
11. As a Personal Dashboard 用户, I want 有结束时间时才看到清除结束的操作, so that 空状态不会保留突兀的大按钮。
12. As a Personal Dashboard 用户, I want Save 和 Cancel 在同一行且主次清楚, so that 提交或放弃编辑容易理解。
13. As a Personal Dashboard 用户, I want 保存失败或冲突时草稿仍在, so that 我不会丢掉刚写的内容。
14. As a Personal Dashboard 用户, I want 快速添加继续保持一行并可先选日期和清单, so that 创建前能设置必要属性而不增加常驻高度。
15. As a Personal Dashboard 用户, I want 在文件夹汇总中清楚看到新任务的目标清单, so that 任务不会被放到不确定的位置。
16. As a Personal Dashboard 用户, I want 每个任务可选择一个父任务, so that 大任务可以拆成仍然独立的动作。
17. As a Personal Dashboard 用户, I want 子任务拥有自己的内容、日期、时间和完成状态, so that 它能像普通 Task 一样使用。
18. As a Personal Dashboard 用户, I want 子任务还能有子任务, so that 我可以按实际工作继续拆分。
19. As a Personal Dashboard 用户, I want 父任务详情列出直属子任务并能打开, so that 我能理解当前任务的拆分关系。
20. As a Personal Dashboard 用户, I want 子任务按自己的日期出现在 Today 和 Calendar, so that 排期不依赖父任务是否有日期。
21. As a Personal Dashboard 用户, I want 父子任务完成状态互不级联, so that 勾选一个任务不会意外完成另一个任务。
22. As a Personal Dashboard 用户, I want 关联和解除父任务不复制或删除任务, so that 身份和历史持续保留。
23. As a Personal Dashboard 用户, I want 无效父子关联被拒绝而原数据保留, so that 不会出现任务指向自己或循环嵌套。
24. As a Personal Dashboard 用户, I want 用文件夹归组多个清单, so that 清单多起来仍容易整理。
25. As a Personal Dashboard 用户, I want 清单也能在文件夹外, so that 简单清单不必增加组织层级。
26. As a Personal Dashboard 用户, I want 箭头只展开收起而文件夹名称打开汇总, so that 两种操作各自清楚。
27. As a Personal Dashboard 用户, I want 文件夹汇总按原清单分组, so that 我能知道任务仍属于哪个清单。
28. As a Personal Dashboard 用户, I want 文件夹管理不改变任务状态和历史, so that 组织调整不会成为数据删除。
29. As a Personal Dashboard 用户, I want All、Today、Inbox 等固定入口继续独立, so that 文件夹不会改变这些入口的含义。
30. As a Personal Dashboard 用户, I want 任务有高、中、低、无四档优先级, so that 我能表达先做哪些事项。
31. As a Personal Dashboard 用户, I want 按优先级排序和筛选任务, so that 我可以挑出需要先处理的工作。
32. As a Personal Dashboard 用户, I want 给任务添加和移除标签并按标签筛选, so that 我可以跨清单整理相关事项。
33. As a Personal Dashboard 用户, I want 行右键与详情 More 提供一致操作, so that 不会右键也能找到相关动作。
34. As a Personal Dashboard 用户, I want 菜单中的状态、排期、移动、父子关联和删除都作用于同一个 Task, so that 多个视图不会出现互不一致的副本。
35. As a Personal Dashboard 用户, I want 大窗口能概览一天主要安排, so that 不必频繁上下滚动才能了解当天。
36. As a Personal Dashboard 用户, I want 需要精细调整时可以放大时间尺度, so that 短任务不会因概览而难以操作。
37. As a Personal Dashboard 用户, I want 完整 lived day 的早晚和次日边界仍能查看, so that 概览不会隐藏边界时段的安排。
38. As a Personal Dashboard 用户, I want 点时间轴任务就在附近看完整详情, so that 视线和页面不会跳到午夜下面。
39. As a Personal Dashboard 用户, I want 关闭或保存详情后保持原时间轴位置, so that 我能继续处理附近任务。
40. As a Personal Dashboard 用户, I want 精确和宽泛安排都可拖动, so that 可见项目不会只有一部分能调整。
41. As a Personal Dashboard 用户, I want Task 和精确安排整体移动时保留时长, so that 开始时间变化不会丢掉结束时间。
42. As a Personal Dashboard 用户, I want 未操作的“下午”仍显示“下午”, so that 默认显示位置不被误认为我选择了十三点。
43. As a Personal Dashboard 用户, I want 主动将“下午”拖到十六点后显示“约16:00”, so that 显示准确表达我的新选择且保留近似精度。
44. As a Personal Dashboard 用户, I want 白天重排只更新 Current arrangement, so that Morning baseline 仍可用于回顾。
45. As a Personal Dashboard 用户, I want 时间经过和拖动都不产生完成或事实, so that 没有记录的活动继续保持未知。
46. As a Personal Dashboard 用户, I want 缩小窗口时只省略文字而卡片仍完整可点, so that 不会出现奇怪的边缘裁断。
47. As a Personal Dashboard 用户, I want 重叠项目都能选中且不按来源固定分列, so that 计划、Task 和事实既共用时间轴又不遮挡。
48. As a Personal Dashboard 用户, I want 取消时间安排保留 Task 日期, so that 它离开定时轴但仍在当天任务中。
49. As a Personal Dashboard 用户, I want 删除 Task 与取消排期明确不同, so that 我不会为了取消时间而删掉任务。
50. As a Personal Dashboard 用户, I want 取消 Daily Record 当前安排保留早间基准, so that 改动不抹掉最初规划。
51. As a Personal Dashboard 用户, I want Collaboration 的消息和输入适配窗口, so that 输入及发送始终容易找到。
52. As a Personal Dashboard 用户, I want 长背景在自己的区域滚动, so that 不会把整页撑长或在输入下留下无效留白。
53. As a Personal Dashboard 用户, I want 背景自己的标题旁能收起, so that 不必寻找远处的 toggle。
54. As a Personal Dashboard 用户, I want 背景展开不挤掉语音停止及草稿操作, so that 组合状态下仍能完成输入。
55. As a Personal Dashboard 用户, I want 语音先在输入框下方显示转写, so that 我能分辨实时预览与准备发送的消息。
56. As a Personal Dashboard 用户, I want 停止语音后文字进入可编辑草稿而不自动发送, so that 我能修正后再提交。
57. As a Personal Dashboard 用户, I want 没有转写时预览收起而有内容时可看清, so that 不用空白预留功能空间。
58. As a Personal Dashboard 用户, I want slash 多候选可用上下键选择, so that 不用鼠标也能选命令。
59. As a Personal Dashboard 用户, I want 已有 Enter/Tab 补全和 Esc 退出保持原样, so that 新增选择不会打断已熟悉的输入习惯。
60. As a Personal Dashboard 用户, I want 中文输入法选字不被命令菜单抢走, so that 输入和发送都不发生误触。
61. As a Personal Dashboard 用户, I want Calendar 点日期仍在右侧看当天计划和复盘, so that 现有回顾路径继续可用。
62. As a Personal Dashboard 用户, I want 从日期摘要打开完整 Today, so that 能进一步查看整天情况。
63. As a Personal Dashboard 用户, I want Calendar 点 Task 打开可编辑浮窗, so that 看完整内容时月历位置不改变。
64. As a Personal Dashboard 用户, I want 顶部加号新建任务时默认带入所选日期并可修改, so that 添加到哪一天明确可控。
65. As a Personal Dashboard 用户, I want 创建 Calendar Task 不补造 Daily Record, so that 任务与每日记录保持各自身份。
66. As a Personal Dashboard 用户, I want 同时看到中国和美国节日的轻量标注, so that 安排生活时有日期背景。
67. As a Personal Dashboard 用户, I want 可以关闭节日且任务空间优先, so that 提示不会压过我的事项。
68. As a Personal Dashboard 用户, I want 在 Dashboard 新建本地 Habit 后就能打卡, so that 不必先去 TickTick 建一个同名习惯。
69. As a Personal Dashboard 用户, I want Habit 新增和编辑用同一套设置, so that 名称、频率和目标的位置一致。
70. As a Personal Dashboard 用户, I want Daily、weekly、目标天数及开始日期清楚呈现, so that 能直接设置每天完成或每周三天等目标。
71. As a Personal Dashboard 用户, I want 现有起床和入睡类时间阈值继续可用, so that 新增普通习惯不会丢掉每日锚点。
72. As a Personal Dashboard 用户, I want 可选简单图标和分组, so that 习惯多起来后容易辨认和整理。
73. As a Personal Dashboard 用户, I want Habits 默认仍是本周摘要和今日列表, so that 新功能不替换我已熟悉的主界面。
74. As a Personal Dashboard 用户, I want 点左侧某个 Habit 才显示详情并能返回, so that 我主动选择是否进入细节。
75. As a Personal Dashboard 用户, I want 详情可直接编辑或通过右键进入编辑, so that 不需要重新创建同一个 Habit。
76. As a Personal Dashboard 用户, I want Habit 修改保留身份、映射和打卡历史, so that 统计不会因改名或改目标断开。
77. As a Personal Dashboard 用户, I want 每周三天按不同达标天计算, so that 一天反复打卡不会提前满足整个周目标。
78. As a Personal Dashboard 用户, I want 本地和外部对同一天的完成只算一天, so that 重复来源不会夸大成绩。
79. As a Personal Dashboard 用户, I want 撤回本地完成后仍能看见外部支持的完成, so that 来源独立性不被破坏。
80. As a Personal Dashboard 用户, I want 单项详情显示本月和累计打卡天数, so that 可以看到长期记录。
81. As a Personal Dashboard 用户, I want 每日习惯按连续天、每周习惯按连续达标周统计, so that 连续指标符合目标频率。
82. As a Personal Dashboard 用户, I want 当前和最高连续统计区分未知历史, so that 不会把近期快照当作全历史结论。
83. As a Personal Dashboard 用户, I want 周目标下周生效、日目标次日生效, so that 当前周期不会被临时修改重新判定。
84. As a Personal Dashboard 用户, I want 当前目标和待生效目标都能辨认, so that 我知道本周期按哪个标准打卡。
85. As a Personal Dashboard 用户, I want 历史达标按当时目标计算, so that 以前达标的周期不会因新目标被改写。
86. As a Personal Dashboard 用户, I want 可以停用 Habit 并以后恢复, so that 暂时不做时能从日常区收起而历史保留。
87. As a Personal Dashboard 用户, I want 新增、编辑、停用和统计在重开 App 后仍正确, so that 这些能力不是仅有界面演示。
88. As a Personal Dashboard 用户, I want 写入失败、冲突和重试有明确结果, so that 不会把未确认保存说成成功。
89. As a Personal Dashboard 项目维护者, I want spec、tickets、实现和验收用稳定本地 ID 关联, so that GitHub 不可用时仍有一个完整的工作来源。
90. As a Personal Dashboard 项目维护者, I want 每阶段保留基线、分支及完整 commit, so that GitHub 恢复后可以推送已保存的历史。
91. As a Personal Dashboard 项目维护者, I want 实际 App 验收同时检查改善区域和保留区域, so that 局部功能完成不掩盖意外的全局改动。

## Implementation Decisions

### 1. 范围与设计依据

- 本轮采用领域既有的 Task、Task list、Task date、Task execution interval、Lived day、Morning baseline、Current arrangement、Local habit completion 与 Mapped habit completion 术语。新增术语在同一领域上下文记录，不建立另一套词汇或存储副本。
- Today A 指紧凑概览与就近详情，Tasks B 指 Content 优先右栏。Habits 和 Calendar 主体保留实际 App。不能从这些选择推导统一网页外壳、全局侧栏重排、整套配色或字号更新。
- 实施前固定实际产品视觉及数据基线。每一项布局变化都须能对应本规格中的局部需求；原型多出的当日任务右栏、两行添加栏、演示控制和不同月历比例不构成要求。
- 当前默认保存策略继续是显式 Save/Cancel；本轮不改成自动保存。新增交互复用现有草稿、冲突和异步操作规则，避免无关刷新或切页丢稿。不能以实现新功能为由清除现有完成历史、归档清单或分页编辑行为。
- 新属性和组织关系默认向后兼容：旧 Task 无父任务、无标签、无优先级，旧清单无文件夹。旧 Habit 身份、名称语言及外部映射继续有效，不按同名重建对象。

### 2. Task 编辑与保存接口

- Task 详情保留在右栏。标题本身是唯一名称输入，Content 在下面，正常打开已有 Task 时聚焦 Content；新建窗口先聚焦名称。Content 最小阅读高度增加，但不扩大全局字体或行高。
- 清单、日期、时间及其他属性用可见值的紧凑入口。日期和起止时间可在同一排期面板处理，开始/结束在同一编辑区，未设结束时不常驻清除按钮。跨午夜结束日期仍明确，时长校验沿用已有业务规则。
- 保存/取消同行，保存是主操作。收起属性面板不等于把整个任务保存；最终 Save 才提交 Task 草稿，Cancel 放弃本次编辑。数据刷新不得在存在草稿时悄悄覆盖编辑值。
- 扩展既有 Task application 的创建、更新和读取契约承载 parent、priority、tags，以及清单的 folder 关系。仍使用稳定对象 ID、selected-vault 绑定、expected revision、change/operation identity 和现有写入读回机制。
- 新增字段的更新须区分“不更新”与“显式清除”，避免旧调用方或 Collaboration 更新标题时无意清掉父关系、标签、时长。读取旧文档提供默认值；未知或损坏结构显式报错，不自动覆盖原文件。
- Task execution interval 仍是计划执行起止。只清结束时保留开始日期和时间；“取消时间安排”则清开始时间及整个执行区间，保留日期、状态、清单、内容和身份。无时间的 Task 不进入定时轴，但日期视图保留它。
- 删除沿用既有 Task 删除/恢复及历史保留语义，所有视图反映同一身份。普通删除不能偷偷成为物理删除整个任务树。

### 3. 子任务关系

- 每个 Task 最多一个 parent，parent 是另一个 Task 的稳定 ID；可以无限制表达多层关系，不引入第二种子任务实体。显示按层级递进且窄窗口不因缩进产生横向溢出。
- 后端拒绝自引用、循环、缺失或跨 selected-vault 的 parent。界面隐藏不可选候选是便利，不能代替后端校验。
- 关联、换 parent、解除关联只改变关系，不强制同步日期、时间、清单、优先级、标签或完成状态。父子可在不同清单；子任务在日期视图按自己的日期出现。
- 父任务详情显示直属子任务、状态和打开入口，提供添加子任务。添加出的子任务拥有新 Task 身份，默认清单可沿用父任务但可更改；日期沿用创建入口的日期上下文，不强行继承父任务排期。
- 完成、恢复待办或放弃任何节点仅改变该 Task。父完成后，未完成子任务继续可用；所有子任务完成也不自动完成父任务。
- 删除父任务时不级联删除子任务。保留子任务及其历史关系；默认活动视图将它作为无可见父任务的独立 Task，并能说明父已删除。父恢复后关系可重新显示；子任务如果已主动解除或换 parent，恢复不得覆盖新关系。归档清单同样不使其子任务失去独立可用性。

### 4. 文件夹与清单

- 只做一层文件夹：文件夹包含清单，清单包含 Task。文件夹不直接拥有 Task，不做文件夹套文件夹。一个清单最多属于一个文件夹，也可不属于文件夹。
- 文件夹有独立稳定 ID 和名称；支持创建、改名、展开收起、清单移入/移出。保留现有清单创建、改名、归档及恢复能力，不能为分组引入另一个清单副本。
- 点箭头仅展开收起；点名称显示按原清单分组的聚合视图。筛选、计数和历史规则复用原清单视图，归档清单不因文件夹展开而重新进入日常待办。
- All/Today 是视图，Inbox 是系统清单；这些固定入口在文件夹外。系统 Inbox 不被文件夹移动、删除或改成普通清单。
- 删除空或非空文件夹只解除清单的分组，清单退回顶层，不删除清单和 Task。清单恢复保留可用的原分组；原文件夹不存在时回到顶层。
- 单行快速添加继续保留。日期、目标清单及可选属性是紧凑入口；在具体清单内默认该清单，在 All/Today 等视图沿用现有 Inbox 默认，在文件夹汇总里显示明确目标并允许选择该文件夹中的清单。没有可选清单时提示先建清单，不隐式创建清单。

### 5. 优先级、标签与操作菜单

- priority 为高/中/低/无四档，旧 Task 默认为无。按优先级排序时高到无，同档保持现有日期顺序及稳定并列顺序；默认排序不因加入优先级被改掉。提供单档筛选，并保留已完成/已放弃的原可发现入口。
- 标签用稳定身份与显示名称关联 Task，支持创建、复用、选择多个及移除，空白名称无效，同名标签不重复创建。初始 UI 提供单标签筛选并与优先级筛选组合；跨清单作用于同一 Tag 身份，不替代 Task list 或文件夹。
- 标签改名保留关联；删除标签定义只解除标签关联，不删 Task。筛选不改变任务所属或保存状态。不引入标签树、标签颜色管理或复杂查询语言。
- 每行右键与详情 More 共用业务动作集合：排期、移动到清单、完成/恢复待办、放弃、删除、与 Codex 讨论，以及添加子任务、关联父任务、解除关联。按对象状态隐藏或禁用不适用操作，使用同一业务保存路径。
- 不强行增加复制、固定、复制链接等 TickTick 全菜单能力；不为操作菜单扩大常驻详情按钮面积。原来的可用入口在菜单迁移后仍有可发现替代。

### 6. Today 时间轴密度与详情

- 保留原 Morning 文字、Daytime 共享轴和 Evening 复盘入口。默认让较大窗口概览主要日间安排；紧凑尺度根据实际可用高度适配，减少该区域不必要提示和留白，不挤占 App 全局外壳。
- 大窗口参考 1280×800 和 1280×720：默认日间概览应能看全 06:00–24:00 的时间范围，不需要为了看清同日整体安排频繁滚动。04:00–06:00 和次日 00:00–04:00 仍有明确入口、项目提示和完整视图，正式 lived-day 契约仍为 04:00–次日04:00。
- 精细放大提供可滚动尺度，便于短区间操作。680×560、830×758 等窄/短窗口优先可读、可点击，允许合理滚动，不把所有卡片硬压成不能操作的一屏。自动适配或放大不修改任何保存时间。
- 点击定时 Task 或可编辑安排就近打开详情浮窗，沿用 Content 优先和紧凑属性；背景不 scrollIntoView 到底部、不滚动到选中行。保存后按真实读回刷新，尽量保留时间轴滚动位置；对象已删除等异常仍明确提示。
- 移除承担任务详情入口的底部重复编辑区，不重复显示选中 Task 的标题、状态和整套属性。不因这一改动删除普通当日任务列表、无时刻记录、事实或历史区，也不要求把当日任务列表移到右侧。
- 卡片主要显示标题和时间，长文字省略后点击查看完整内容。卡片边界和点击区域不横向切掉，重叠项目临时并排且都可选，非重叠不按来源固定拆成列。近似卡片为阅读留出的高度不表示时长。

### 7. 拖动、宽泛时间与来源归属

- 精确计划区间、Task 时间点/区间及可靠绑定的宽泛/近似安排可拖动。移动精确区间保留长度；结束时间修改沿用既有编辑能力。已有空白拖选创建 Task、拖动滚动及取消恢复能力保留。
- 单击和拖动按位移阈值区分；拖动结束不额外触发详情跳转。取消、写入失败或 revision 冲突不留假的已保存位置，草稿/临时反馈与持久结果区分清楚。
- Broad plan period 如“下午”可以有默认定位 anchor，但卡片和详情保留原表达，不仅因渲染写成“约13:00”。既有明确 Approximate plan point “约14:00”保持原有表达。
- 用户主动把宽泛安排拖到 16 点后，保存 Current arrangement 的 approximate point “约16:00”；不是精确时刻或精确区间。精确/近似的主动切换在编辑界面明确表达，不由自动摆放或卡片高度推断。
- 安排仍通过既有 Daily Record/current-plan 编辑应用服务保存并保留修订。普通 Daytime 拖动/编辑/取消不更改 Morning baseline；没有确定性的原记录绑定、表达冲突或不支持的跨日情况须说明原因并提供既有文本纠正路径，不猜测写入对象。
- 取消 Daily Record 当前安排只改变该来源，不删除可能相关的独立 Task。删除 Task 不删除相似标题的计划。Confirmed facts 继续不可拖动；事实纠正复用其自己的入口。时间经过、Task 完成或拖动不自动产生实际活动时间。

### 8. Collaboration 窗口、context 与语音

- 保留现有聊天、会话、历史、输入字体及已认可的大输入区，正常输入、发送和快捷键继续参考 Codex。改动只覆盖消息/输入/背景的窗口高度分配和入口清晰度，不重建全局导航或模型执行流程。
- 消息在消息区滚动，输入及发送留在容易操作的位置。展开背景自身限高、内部滚动，标题旁可直接收起。工作历史等现有折叠行为不因布局变化丢失。
- 本规格选择按需 context 浮层，沿用 A/C 收起时用户认可的聊天留白。浮层在聊天工作区内锚定，不把页面撑长，不能遮住输入、语音停止或发送；短窗口根据输入区位置限高。若实施需要窄窗口底部呈现，仍需满足同样的独立滚动、就地收起和不遮输入规则。
- 原型 A 的“背景＋转写”在 1280×720 下会把停止按钮裁出聊天区域，不能复制该布局缺陷。用浮层方案解决这个明确问题，而非进一步改变未讨论的聊天视觉。
- 语音保持“预览 → 停止 → 可编辑草稿 → 用户发送”。空预览不占大片空间；转写和状态出现时可完整阅读或内部滚动，停止入口始终可见。停止不是发送，取消和关闭预览不能误发消息或丢掉已写草稿。
- 保留实际 dictation 服务、连接状态、错误/停止结果与草稿持久化，原型模拟按钮不进入产品。保留真实模型/effort 选择与现有排队、取消、结果和能力边界；ADR 0004/0005/0006 继续适用，不添加语义审批层。

### 9. Slash 的限定改动

- 功能范围仅为多候选时 ArrowUp/ArrowDown 选择，循环选择可复用现有控制器。Enter/Tab 只补全进草稿，Esc 关闭，现有高亮、字号和菜单样式保持。
- 当前代码已有上下键逻辑但实际候选仅有 `/retro`。实现前先验证真实候选供给和 selection 保持；只修缺口，不把需求误写成新增整套命令服务。允许在测试注入两个以上合法候选证明选择，不向实际用户菜单添加虚构命令。
- 保留输入法 composing 状态、光标、已有参数、普通 slash 文本与显式发送语义。上下键只在可见候选菜单且非 composition 状态下处理，不抢正常光标或输入法选字。
- 补全只使现有 skill 命令可发现，不执行、不自动发送、不硬编码新的 retro 模型；Workflow retro 仍在开发环境，不变成 Dashboard 内的新命令。

### 10. Calendar 与节日

- 保留紧凑等高月历、月份导航、记录/复盘标记位置及已有预览密度，保留右侧日期回顾和下方当日 Task。原型的额外滚动、不同边距和标签/折叠样式不得成为调整理由。
- 点日期只选择该日并更新右侧计划与复盘，从摘要能打开完整 Today。点 Task 打开编辑浮窗，不触发父日期格的额外导航，关闭后月份、所选日期和滚动位置保留。
- 创建仅使用顶部加号：当前所选日期为明确默认值，在浮窗显示且可修改，名称先获得焦点。创建复用同一 Task application；写后读回 Calendar/Today/Tasks。选定日没有 Daily Record 时仍可建 Task，不补造每日记录。
- 移除已被顶部入口替代的大型底部新建表单；下方已有当日任务区及状态/历史入口保留。不加日期格双击或右键创建，也不加周视图。
- 中国与美国节日同时可用，默认轻量显示，有总开关并可按地区关闭；用户选择存于既有本地显示设置，不属于 Task 或 Daily Record 内容。任务优先占日期格，过长/过多节日省略并提供完整名称提示，不改变日期格高度。
- 节日信息为只读附加日历数据，带地区、日期、名称和来源/覆盖信息，不创建 Task，不触发提醒，不作为工作日判定。使用本地随包数据/确定性规则，实施时核验官方来源及适用年份；不添加运行时服务或依赖。
- 覆盖不足年份明确不提供该年节日，不能复制上一年或把原型样例当真实数据。初始交付至少覆盖当年及下一年；农历换算若用于具体节日日期须用已核验的年度数据。农历日期常驻显示、节气和调休上班日不是本轮要求。

### 11. 本地 Habit 定义与操作契约

- 在 selected vault 的既有习惯领域增加可持久的本地定义/catalog 和目标修订，复用 Local habit completion 的写入入口与稳定 key，不把 Habit snapshot 变成可写主数据库。存储布局由实施依据既有约定选定，不迁移长期目录或覆盖用户 authored notes。
- 读取层合并既有 sourced Habit 和本地定义，按稳定身份去重。新建仅创建本地 Habit；没有明确外部映射时不创建 TickTick 对象、不按同名自动映射。已有外部身份和来源仍可查看，改本地设置不向外部写回。
- 新增、编辑、停用、恢复使用同一 Habit application 边界，具备 selected-vault 绑定、revision、操作身份和保存读回。创建重试不能产生第二个 Habit；目标更新失败不能呈现为已生效。
- 创建/编辑表单包含名称、可选 emoji、可选分组、频率/目标及开始日期。初始普通目标为每天完成或每周 1–7 个不同达标天；既有时间阈值保留目标时刻和 day relation，特别是次日入睡语义，不降低为通用“当天八点前”。
- 频率和目标是一组连贯设置，“每周3天”在 UI 中直接表达。名称语言配置仍属于同一 Habit，改名、图标和分组不重置 key、来源或历史。图标用简单 emoji，不加入图标库；分组是可选扁平整理，不建 Habit 文件夹树。
- 对旧 sourced Habit，先形成有来源的可编辑本地设置覆盖，保留旧目标、已有 goal history 和证据；读取未知旧历史不能当成已完成迁移。旧快照不能因为本轮新增而丢失来源信息。
- 后续外部 producer/snapshot 刷新只能更新 sourced evidence，不能覆盖已保存的本地名称、目标 revision、停用状态或移除新增本地 Habit。本地定义、证据和 rebuildable snapshot 的权威边界必须在刷新后继续成立。
- 开始日期默认当前 lived date，可修改；编辑开始日期仅影响适用周期/显示，不能删除此前已保存的完成事实或伪造创建前的完整覆盖。历史数据早于当前开始日期时仍可查看并解释，生命周期与打卡事实保持分开。

### 12. Habit 主界面、编辑与停用

- 默认进入 Habits 仍显示左侧本周摘要、右侧每日锚点和今日列表，保留既有近期历史展开、实际时刻未知、source coverage 和刷新状态。不得换成默认单项统计工作台。
- 顶部加号创建；点击左侧一个 Habit 后才在右侧显示单项详情，左侧汇总保留，详情有清楚的“回到今日习惯”。右侧原行内“展开”仍是既有近期历史操作，不暗改为整页切换。
- 单项详情展示名称、目标、开始日期、历史统计、打卡记录和编辑入口。右键菜单可进入同一编辑窗口；创建和编辑共用字段布局，编辑带入当前值以及待生效目标，不用新身份取代原 Habit。
- 停用从日常摘要/待打卡区收起，不删除定义、完成、目标修订或统计。通过“查看停用”找到并恢复；恢复同一身份，不生成新 Habit。
- 停用时段不要求打卡，不自动填成失败或完成，连续达标不穿过停用间隔；恢复开启新的活动连续段，历史最高记录保留。被停用 Habit 的历史仍可查看和按原授权纠正。

### 13. Habit 计数与目标生效

- 用 Habit stable key＋Lived day 去重：一天多个 completion actions，以及本地/映射外部同时完成，仅是一个 Habit attained day。周以现有周一至周日边界统计，周目标叫“达标天数”，不是运动场次。
- 本地撤回不抹掉外部来源，外部仍支持完成时当日继续计为完成。时间阈值的显式达标与实际时刻是不同证据；冲突和未知遵循既有规则，不用一次普通勾选伪造实际时刻。
- 目标更新保存为有有效日期的 revision，而非覆盖唯一 current goal。每日目标次个 lived day 生效，每周目标下一周生效；本周期继续旧目标，之前周期按当时目标计算。时区和 04:00 日界沿用 lived-day 模型。
- 更新前有待生效目标时编辑带入它，保存新值替换同一个未来生效计划并保留修订痕迹；若改回当前目标，可取消待生效项。名称/图标/分组修改可以立即生效，不延迟到目标周期。
- 频率类型改变仍不追溯：以编辑前的目标周期结束作为切换边界。新频率的首个周期若不完整，明示部分周期且不计入完整周期连续达标，也不按比例降低目标。不同频率的连续单位不混加，保留历史目标段及可解释的最高记录。
- 不为修改目标重写过去的完成事实。以后明确纠正一条历史完成时，可以按当时目标重新计算受影响统计；这与把所有过去改用新目标不同。

### 14. Habit 历史统计与覆盖

- 本月打卡数和累计打卡数均为去重后的达标天，不是按钮点击次数。月份按 lived date 的自然月份归组，累计包括保留的历史完成事实，停用不删累计。
- 每日习惯的当前/最高连续为达标 lived days，每周习惯为达到当时目标的连续周。开放的当前周期尚未达标时不提前判失败；一旦本周期已满足目标可计入连续，周期结束后按完整证据结算。
- 只从实际完成及可信覆盖推导统计。一个没有 evidence、也没有完整 coverage 的日或周是未知，不能当失败、成功或零计数。遇到未知缺口不能声称跨缺口连续。
- 新详情从 canonical completion 和有 provenance 的历史来源读取足够范围，不受主面板12周快照上限限制；主面板可以继续有界投影。禁止用12周中的最大值声称“最高连续”或“累计全部”。
- 覆盖完整时显示精确本月/累计/连续；只知道部分时显示“已知至少 N 天”“可确认连续 N 周”或“全历史未知”，带覆盖起止。未知早期可能影响最高值时，“最高已知”与“历史最高已确认”必须区分。
- 当前目标、待生效目标、历史目标段和完整/有限覆盖在详情中可辨认。分页/按需读取可以复用既有历史读取边界，不为统计把所有历史卡片常驻渲染。
- 保留旧 snapshot 的 freshness、来源和局部读取失败提示。新增本地 Habit 的可用性不依赖先运行外部 producer；外部历史暂不可用不阻止本地创建和记录，也不能被写成全历史完整。

### 15. 兼容、更新和数据安全

- 复用现有 application/persistence 业务边界作为唯一写入来源；同一视图 projection 承载新字段，不建立 prototype 状态到产品的数据搬运路径。
- selected-vault 切换、revision 冲突、重复 operation、写失败或保存后读取异常沿用可恢复结果。跨多个来源的动作分别记录结果，不把一个保存成功等同所有来源成功。
- Task、清单、Habit 新字段需要可回读的 schema 升级与旧数据默认处理。升级以保留用户数据为前提，原文件未被确认安全转换前不覆盖；正式备份和恢复程序沿用现有策略。
- 草稿、弹出层、排序/筛选和详情选择属于 UI 状态；业务身份、关系、属性、Habit 目标及生命周期属于真实持久数据。UI 状态不代替保存成功的 revision。
- Collaboration 已能使用的操作仍通过同一业务服务正确读写新增数据，但本轮不扩大自动 morning planning 的能力范围，也不新增永久删除 Habit 历史等外部写能力。

## Testing Decisions

### 1. 用户确认的测试边界

用户确认采用：复用现有业务操作测试，再用正式打包 App 验证保存后重新打开、时间轴拖动和保留区域。prototype 只作设计参考。验收对象是可观察行为，不是函数形状、CSS 文本或原型内存状态。

主测试 seam 为真实 Dashboard application 操作：在隔离 synthetic selected vault 下请求读/写，再重新读取或重新打开，验证同一稳定身份、revision 与投影。前端用现有实际 DOM/WebKit 及交互 controller 测试这些业务结果的呈现。新 Habit 定义/目标服务加入同一 application 边界，不为每个字段造新的测试入口。

### 2. 既有测试基础及应扩展范围

- Tasks 已有业务创建、更新、revision 冲突、历史编辑、删除恢复、执行区间与多视图 projection 测试；扩展到父子关系、文件夹、优先级、标签和缺省字段兼容。使用真实序列化/读回，不以页面上一个临时对象改变证明持久化。
- Today 已有 current-plan 编辑、近似时间、统一时间轴、拖动/结束修改及 Task 时间轴测试；扩展到宽泛原措辞、主动拖动后 approximate point、默认 anchor 不写数据和不跳底部。
- Habits 已有 local completion、historical correction、来源合并、阈值及 names/provenance 测试；在同一业务入口加入 local catalog、目标 revision、生命周期、完整/有限历史读取测试，不另建平行 Habit engine。
- Collaboration 已有 command completion、dictation、draft refresh、queue control、layout/panels 与 outcomes 测试；扩展真实多候选选择和背景＋voice 组合状态，不调用真实模型或花费额度来验证排版。
- Calendar 已有 compact month 和 Task projection 测试；覆盖所选日新建、详情浮窗事件传播、背景位置保持和节日开关，保留原月份和日期回顾行为。

### 3. 必须覆盖的业务场景

1. 用旧格式 Task/list/Habit 数据读取并编辑一个字段，再重开；其余字段和历史不丢失，新字段缺省正确。
2. 新建父、子、孙 Task，各自日期和清单不同，父/子完成互不改变；关联/解除/换 parent 后重开读回；循环、自引用、无效 parent 被拒绝且无部分写入。
3. 删除再恢复父 Task，子仍保留；子期间换 parent 后恢复原父不得覆盖新关联。归档清单不隐式完成或删除任务。
4. 创建文件夹、清单移入/移出、汇总、删除文件夹，Task 身份和清单身份不变；Inbox 不允许移动。优先级/标签筛选只是 view，改名或解除标签不删 Task。
5. 取消 18:00–18:45 的 Task 时间后 date 仍在、time/end 清除；Today 和 Calendar 保留，定时轴消失，保存/重开一致；删除是另一个操作。
6. “下午”默认 anchor13 仍显示“下午”，没有保存副作用；拖到16保存为“约16:00”，Morning baseline 与事实保持原内容；精确区间移动保留时长。
7. 新建本地 Habit 后立即在面板打卡并重开；同日重复及双来源只算一天，撤回本地不抹外部；失败/重试不创建第二个对象。
8. 周三将每周3天改5天，本周仍3天，下一周5天；daily 目标下个 lived day 生效。跨04:00、周日到周一、月界的读取使用正确目标，不只看保存时的 UI 标签。
9. 已存在未来目标时再次修改、改回当前目标、实际周期切换及重开都正确；新频率部分周期不改写旧统计。
10. 完整历史超过12周时累计/最高用完整来源；人为缺失早期和中间覆盖时返回未知或已知下界，不能误判为零或跨缺口连续。
11. 停用、跨周期、恢复后日常区隐藏/恢复，历史和目标revision保留，不自动补打或把停用周判失败；历史纠正按旧目标重算。
12. selected-vault 换源、stale revision、写失败、读取失败及重复 operation 保留数据与草稿，失败前后无不可解释的半成功状态。
13. 在本地新增、编辑目标及停用后刷新外部 snapshot，重新打开读回仍保留本地定义、待生效目标和生命周期，外部 evidence 可独立更新。

### 4. UI 与真实 App 检查

- 直接检查标题唯一、Content 初始焦点、属性面板、Save/Cancel、菜单一致性、单行快速添加及父子/文件夹可发现性。不是只搜索源码中的 class 或文字。
- 在1280×800、1280×720下检查 Today 默认概览、精细放大、重叠、短任务、长标题、全 lived-day 边界；在830×758及680×560检查卡片不横向裁断、点击/拖动区可用、详情关闭后位置保持。
- 用实际指针走 Task、exact plan、broad plan 的点击和拖动，核对对应业务结果；原型的拖动或纯 controller 调用不能替代正式 Tauri UI 操作。保留已有边缘滚动和取消恢复。
- Collaboration 在长消息、长context、背景收起/展开、语音录制/停止/预览滚动、长草稿、窄窗口组合下检查输入、停止、发送和收起都可见可操作。特别覆盖1280×720下原型 A 出现过的裁断状态。
- Slash 用两个以上合法测试候选验证上下选择、Enter/Tab补全、Esc、光标/参数保留与 composition，不在生产增加示例命令。若当前服务仅有一个候选，明确区分“多候选契约通过”与“生产有多个命令”。
- Calendar 先选日期再新增，读回默认和修改日期；点月格 Task 不额外切日，关闭背景不跳；现有月历密度/标记/右侧回顾/下方任务保持。节日关闭和没有覆盖年份不能影响任务。
- Habits 默认仍有汇总/今日列表，点左侧才看详情，返回恢复列表；既有行内历史展开和日期纠正继续可用，新建/编辑/停用在实际 App 重开后可核对。
- 打包候选使用私有 synthetic profile/Vault，与源码 commit 绑定，验证真实 IPC、保存读回、重启和升级兼容。产品安装另行授权；未安装不能写成正常安装版验收。真实麦克风/输入法等环境检查明确记录实测、未测或人工接受，不沿用旧轮 waiver 自动豁免新缺口。

### 5. 保留区域与结果记录

以当前实际 App 基线、同样窗口和合成场景对照：全局导航、外壳、设置、字体配色、Tasks 列表、Habits 默认主体、Calendar 主体以及 Morning/Evening 等未要求变化区域不得出现未解释差异。必要局部高度调整单独标记，不能把整个 prototype 当像素验收图。

每个 ticket 分别留存 commit、运行命令、输入情境、预期/实际、失败和恢复、源码绑定及未覆盖项。单次自动测试通过、截图或打包成功不是完整交付；业务检查、界面验收、安装和用户接受各自有状态。只跑与变化和已有风险相关的检查，不用无效测试扩大工作。

## Out of Scope

- 整 App 换肤、重建全局外壳、修改未讨论的导航/设置/字体/配色、把网页版原型全部复制成正式 UI，以及把原型所有间距当规格。
- 推翻 Habits 默认汇总/今日列表、Calendar 日期回顾主结构、Tasks 紧凑列表/单行添加；Today 未明确要求的当日任务区搬迁。
- Today 周视图、Calendar 新周视图、四象限、独立子任务实体、父子自动完成、文件夹多层嵌套和复杂标签查询系统。
- 给 slash 新增虚构业务命令或新的执行模型；重做现有高亮/补全/Esc；Workflow retro 搬进 Dashboard。
- 自动保存 Task、更广泛的自动计划权限、另一层写入语义审批，以及因时间经过自动推断事实或完成。
- Habit 每日多次数量/运动场次追踪、通知/提醒/计时器、永久删除 Habit 历史、按同名自动外部映射或自动创建 TickTick Habit。
- 节日同步外部日历账户、运行时节日服务、新依赖、农历日期常驻、节气、调休上班日，以及未核验年份的假节日数据。
- 原型数据迁移到真实 Vault、演示状态/比较条/模拟按钮进入产品，或把12周快照当成全历史。
- 本次规格发布自动创建实现 tickets、claim、执行实现、安装 App、合并 main、推送、创建 PR 或迁移 GitHub Issues。这些是之后分别授权的阶段。
- 重新打开上一轮已关闭记录或改写此前未测、人工接受和残余反馈的历史事实。

## Further Notes

### 1. 讨论及原型来源

- [本轮原型任务说明](prototype-brief-2026-10-11.md)汇总 Tasks、Today、Collaboration、Calendar、Habits 的完整需求；[关键问答](requirements-clarifications-2026-10-11.md)记录四项用户明确接受的规则。
- [评审与实施边界](prototype-review-and-scope-2026-10-11.md)记录实际浏览器检查、不能照搬的原型细节，以及用户“没有说要修改的地方别动”的明确要求。
- 原型分支 `codex/dashboard-experience-refinement`；初稿 `a9f2fc4`，错误的整体 A 解释 `a8bf50e`，用户纠正后的当前基准 `e6bdb514c6733a98949012e1d42a9cda3b0e3eec`。错误解释保留为历史，不作为要求。
- 原型逐页记录：Today A、Tasks B、Habits/Calendar 保留原主体。Collaboration 用户认可 A/C 聊天空间，背景原来未选；本规格基于可见性问题选择 C 型浮层作为实施决策，保留这个来源区别。
- 旧 R 是本轮复用基准，不是要求回退全部产品。旧产品舒适度反馈来自用户使用记忆与局部代码比较，不冒充这次重跑旧安装版的证据。

### 2. 产品与规格基线

- 本轮产品语义基线为已接受的4.0.7 / `d5183327fcf66d8c1aa44f6b14f9c4272e4c931c`；新规格分支从 docs-only HEAD `8a0dba083c4cbcb2707e97661a0a23ff82c4f920` 开始，不是从远程 main 重建。
- 原型分支独立保留，不直接整体合并其 throwaway 源码到产品。后续实现从规格所记录的真实产品 lineage 开始，逐项复用已有模块。
- 本规格是新的 PDEX-SPEC-02，原 PDEX-SPEC-01、PDEX-FOLLOWUP-01–05 和 PDEX-01–18 继续 closed。新增 tickets 从未占用编号继续分配，不能复用旧 ID 或以更新旧 body 的方式丢掉已接受轮次。

### 3. 本地发布与后续实施记录

- canonical tracker 仍是现有本地 map，PDEX-SPEC-02 的完整正文是本文件，issues 中只设同一身份的索引。Triage 为 `ready-for-agent`，Lifecycle 为 `open`，无 assignee/claim，tickets 与实现未开始。
- 已确认的测试边界可以直接进入 ticket 编写，不再逐项问用户实现细节；ticket 拆分仍需用户的下一步请求。后续每票记录 parent、direct dependencies、状态、branch、base commit、实现/评审/验收 commits 和 evidence。
- 使用 `codex/` 分支保留本地 commit 链，不 amend、squash 或清理掉本轮设计证据。规格发布 commit、后续 ticket 发布 commit、实现增量和整合 commit 必须可分别定位。
- publication 与 remote-handoff 记录完整哈希及其解析方法，避免正文自引用自己尚未生成的 commit。每次授权推进后核对本地 Git reachability、未提交文件及剩余工作，保留无关变更。
- GitHub 恢复后可推送保留的分支历史，再通过 protected-main PR 处理整合；本轮不预先操作远程。Git push 只转移 Git 历史，不会自动把 Markdown tickets 发布成 GitHub Issues；若以后迁移 tracker，保留完整 body、依赖、状态、评论、验收与本地 ID→Issue 对应，并明确唯一 canonical 位置。
- 本地发布后刷新已注册的 Management 来源，记录读回结果；不新建 Registry，不改变用户 focus/lifecycle，不因远程不可用把本地已发布规格说成未完成。

总结：本规格发布的是全部已确认改善及最小必要的实施决策。实际产品、tickets、安装和接受尚待后续授权与证据。
