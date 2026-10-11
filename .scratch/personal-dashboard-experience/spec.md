# Personal Dashboard — 日常规划、任务与复盘入口体验改进

ID: PDEX-SPEC-01
Type: spec
Triage: ready-for-agent
Status: resolved
Lifecycle: closed
Stage: local implementation and human acceptance complete
Date: 2026-10-10
Canonical tracker: [local map](map.md)
Implementation: complete; all eleven tickets resolved; local human acceptance with documented qualifications
Test boundary: Q4 confirmed by the user

## Problem Statement

用户已经完成新版 Personal Dashboard 的使用评估，希望把确认过的原型落实为正式产品。当前 Today 中没有精确时间的安排集中在未定位区域，导致明明有“午后做什么”的计划，白天时间轴却经常空白。用户需要像调整日程一样直接移动计划或 Task，同时保证界面和真实文档一致，而不是每次改时间都需要通过语言模型。

现有 Tasks 的完成勾选不够清楚，任务内容和操作容易增加列表阅读负担。Calendar 的窗口空间有限，用户希望看到完整月份、更多任务预览和每天的复盘状态。Collaboration 的重复标题与常驻说明分散注意力，已有 Personal Retro 的 slash 入口缺少补全发现方式。Evening 需要明确的复盘起点并顺畅带入协作会话。

用户已逐轮确认原型 R、B 风格的任务列表，以及 Q1–Q4 的数据归属与测试边界。问题是将这些已确认的行为变成可持久保存、可核对且符合现有领域边界的体验，而不是重新设计整个 Dashboard。

## Solution

Morning 继续用文字呈现早间安排。Daytime 用一条共享时间轴呈现 Current arrangement、定时 Task 和 Confirmed facts；有近似时间的计划也能定位，并明确保留其模糊精度。同一时段的项目临时并排，没有冲突时占整行。

用户可以拖动或通过时间编辑调整安排，也可以在空白时段选取范围创建 Task。App 确定性地保存对应来源、保留修订并读回结果，不依赖语言模型。白天的正常拖动默认更新 Current arrangement；只有明确的早间规划或纠正才修改 Morning baseline。显示和对应文档必须一致，不能无条件双写两个计划段落。

Tasks 保留清单侧栏，用简洁勾选列表和所选任务详情分开阅读与编辑。Task 可保存计划执行时间段，并在 Tasks、Today 和 Calendar 中保持同一身份。Calendar 使用紧凑等高日期格，默认最多四行预览，记录/复盘标记缩小放在日期旁。Collaboration 收敛标题与说明，提供已有命令的 slash 补全；Evening 提供带日期和可编辑草稿的复盘入口。

## User Stories

1. As a Personal Dashboard 用户, I want Morning 仍以文字呈现早间安排, so that 我能自然阅读当天的规划，而不用在早晨再看一张时间表。
2. As a Personal Dashboard 用户, I want 早间安排保留原本的具体时间或宽泛措辞, so that 界面不会把“午后”擅自变成精确承诺。
3. As a Personal Dashboard 用户, I want 早间安排和 Current arrangement 的来源清楚, so that 我知道正在看或修改哪份内容。
4. As a Personal Dashboard 用户, I want 白天正常拖动默认更新 Current arrangement, so that 日间调整不会意外改写早晨的规划。
5. As a Personal Dashboard 用户, I want 明确纠正早间安排时能够修改对应早间内容并保留痕迹, so that 真正的早间纠正与白天重排不会混为一谈。
6. As a Personal Dashboard 用户, I want 界面与修改后对应的 Markdown 文档一致, so that 我可以相信显示的时间确实已经保存。
7. As a Personal Dashboard 用户, I want 调整后的历史仍可查看, so that 我能回顾原来怎么计划、后来怎么改变。
8. As a Personal Dashboard 用户, I want 计划、Task 和 Confirmed facts 共享白天的一条时间轴, so that 我不用在几条不同的时间表间来回对照。
9. As a Personal Dashboard 用户, I want 每个时间轴项目有清楚的来源标记, so that 我能分辨计划、任务与已经发生的事实。
10. As a Personal Dashboard 用户, I want 没有时间冲突的项目占整行, so that 有限空间优先用于阅读内容。
11. As a Personal Dashboard 用户, I want 同一时段的项目临时并排且都能选中, so that 项目不会被另一个卡片压住。
12. As a Personal Dashboard 用户, I want 日内早晚边界和次日时间清楚, so that 午夜附近的安排不会显示在错误的日子。
13. As a Personal Dashboard 用户, I want 折叠的早晚时段仍能发现其中的项目, so that 紧凑显示不会隐藏已有安排。
14. As a Personal Dashboard 用户, I want “早晨”“中午”“午后”“晚间”等有近似含义的计划出现在时间轴, so that 时间不够精确的安排仍有位置感。
15. As a Personal Dashboard 用户, I want 模糊计划标出“约”或原本的时段词, so that 我不会误认为它有精确起止时间。
16. As a Personal Dashboard 用户, I want 模糊计划卡片的阅读高度不被算成时长, so that 显示空间不会变成虚假的计划或实际用时。
17. As a Personal Dashboard 用户, I want 无法可靠定位的记录留在未定位部分, so that App 不会凭空猜出活动时间。
18. As a Personal Dashboard 用户, I want 相对时间不会随每次刷新自行移动, so that 同一份记录的含义保持稳定。
19. As a Personal Dashboard 用户, I want 拖动具体计划时移动整个区间并保持时长, so that 我能直接改到另一段时间。
20. As a Personal Dashboard 用户, I want 调整具体计划的结束时间, so that 我能改变为它留出的时长。
21. As a Personal Dashboard 用户, I want 拖动模糊计划后仍保存为近似时间, so that 移动位置不等于承诺精确时间。
22. As a Personal Dashboard 用户, I want 明确将模糊计划改为具体时间段或反过来, so that 安排可以随我的确定程度变化。
23. As a Personal Dashboard 用户, I want 不通过拖动也能编辑时间, so that 小窗口或不方便拖动时仍能完成相同修改。
24. As a Personal Dashboard 用户, I want 长距离拖动时能继续滚动时间轴, so that 我可以把上午安排移动到下午或晚上。
25. As a Personal Dashboard 用户, I want 修改时间无需调用 LLM, so that 简单调整即时可用且不受模型额度影响。
26. As a Personal Dashboard 用户, I want 时间过去不会把计划变成 Confirmed facts, so that 没有记录的活动仍保持未知。
27. As a Personal Dashboard 用户, I want 事实纠正只改对应事实记录, so that 改计划或拖 Task 不会更改已经记录的实际活动。
28. As a Personal Dashboard 用户, I want 任务可以保存计划执行的起止时间, so that 我为任务预留的时段在重开 App 后仍存在。
29. As a Personal Dashboard 用户, I want 在白天空白时间范围选取一段区域创建 Task, so that 我能直接把可用时间安排给一个任务。
30. As a Personal Dashboard 用户, I want 移动 Task 时保持其计划时长, so that 改开始时间不会意外丢掉结束时间。
31. As a Personal Dashboard 用户, I want 在任务时间编辑中改变结束时间, so that 我能调整计划执行时段。
32. As a Personal Dashboard 用户, I want 原有只含时间点的 Task 保持为时间点, so that 旧数据不会多出虚构的时长。
33. As a Personal Dashboard 用户, I want 无日期和只有日期的 Task 继续有效, so that 新能力不会迫使所有任务进入时间表。
34. As a Personal Dashboard 用户, I want 跨午夜的任务区间明确显示结束日期, so that 我不会误读起止先后。
35. As a Personal Dashboard 用户, I want Task 时段表示计划而不是截止时间或实际用时, so that 安排、完成状态和事实证据保持各自含义。
36. As a Personal Dashboard 用户, I want Tasks、Today 和 Calendar 呈现同一 Task 的保存结果, so that 我不需要维护重复任务。
37. As a Personal Dashboard 用户, I want 更新 Task 时未修改的时间信息保持完整, so that 通过对话或其他已有入口改内容不会丢掉执行时段。
38. As a Personal Dashboard 用户, I want Tasks 保留清单侧栏和自然的列表结构, so that 我能继续按熟悉的方式找到任务。
39. As a Personal Dashboard 用户, I want 清晰且容易点击的完成勾选, so that 我能快速看出状态并完成任务。
40. As a Personal Dashboard 用户, I want 点击任务查看详情与勾选完成互不误触, so that 阅读内容不会意外完成任务。
41. As a Personal Dashboard 用户, I want 列表行保持简洁而完整内容进入所选任务详情, so that 我可以快速浏览较大的任务列表。
42. As a Personal Dashboard 用户, I want 在详情中编辑内容、日期、时间和清单归属, so that 相关操作聚在一个地方。
43. As a Personal Dashboard 用户, I want 放弃、删除、重开和任务历史仍可访问, so that 简化列表不会删除已有管理能力。
44. As a Personal Dashboard 用户, I want 小窗口下列表与详情仍可读并可返回, so that 清单侧栏与内容不会挤成无法使用的多列。
45. As a Personal Dashboard 用户, I want 月历每天的格子等高且整体紧凑, so that 我能在当前窗口看到完整月份。
46. As a Personal Dashboard 用户, I want 五行和六行月份都能合理适配窗口, so that 较长月份不会把最后一周挤到页面外。
47. As a Personal Dashboard 用户, I want 每个日期默认最多四行任务预览, so that 不进入详情也能看到更多安排。
48. As a Personal Dashboard 用户, I want 更多项目有清楚的数量提示并能打开完整列表, so that 被省略的内容不会消失。
49. As a Personal Dashboard 用户, I want 小型记录/复盘标记放在日期旁且不占单独一行, so that 状态仍可见又不浪费格子高度。
50. As a Personal Dashboard 用户, I want 日历区分有记录未复盘、已复盘、没有记录和读取失败, so that 失败或任务完成不会冒充复盘状态。
51. As a Personal Dashboard 用户, I want Collaboration 去掉重复标题并按需展示长说明, so that 主要空间留给会话。
52. As a Personal Dashboard 用户, I want 现有会话列表、草稿、听写、停止、排队和工作历史继续可用, so that 视觉减负不会破坏协作功能。
53. As a Personal Dashboard 用户, I want 输入 slash 时发现当前可用命令, so that 我知道怎样进入已有能力。
54. As a Personal Dashboard 用户, I want 继续输入能筛选候选并用键盘或点击补全, so that 常用命令容易找到。
55. As a Personal Dashboard 用户, I want 选择命令只补全文字而不自动发送, so that 我可以先调整要求再提交。
56. As a Personal Dashboard 用户, I want 中文输入法和普通含斜杠文本保持正常输入, so that 命令提示不会干扰写消息。
57. As a Personal Dashboard 用户, I want /retro 使用已有 Personal Retro skill, so that 补全入口与我已经认可的复盘功能一致。
58. As a Personal Dashboard 用户, I want 候选只列出真正可用的命令, so that 我不会选择不存在的功能或开发侧 Workflow Retro。
59. As a Personal Dashboard 用户, I want Evening 有明确的开始复盘入口, so that 我知道从哪里开始回顾当天。
60. As a Personal Dashboard 用户, I want 复盘入口带入所查看日期与可编辑草稿, so that 当前日或过去日期都不会复盘错对象。
61. As a Personal Dashboard 用户, I want 已有草稿被保留且重复点击不发送重复消息, so that 进入复盘不会丢失正在写的内容。
62. As a Personal Dashboard 用户, I want 进入复盘不会直接把当天标记为已复盘, so that Calendar 状态反映真实保存的复盘记录。
63. As a Personal Dashboard 用户, I want 修改文档时无关内容与原始证据保持完整, so that 一次时间调整不会覆盖其他个人记录。
64. As a Personal Dashboard 用户, I want 外部修订冲突得到说明而不是覆盖, so that App 与外部文档编辑能够安全共存。
65. As a Personal Dashboard 用户, I want 保存失败或结果未确认时明确看到真实状态和恢复方式, so that 我不会把拖动后的临时画面当成已保存结果。
66. As a Personal Dashboard 用户, I want 重开 App 后从真实保存来源读取修改结果, so that 显示不会只在当前内存中正确。
67. As a Personal Dashboard 用户, I want 文档保存结果与页面刷新结果分别可辨认, so that 刷新失败不会让我误认为已落盘的修改丢失。
68. As a Personal Dashboard 用户, I want 通过真实 App 与合成数据检验整条操作链路, so that 原型外观认可能够转化为可靠的正式功能。

## Implementation Decisions

- 复用现有 Today、Task、Calendar 与 Collaboration 模块和持久化能力。保留 Selected vault 的 Daily Record 为 Markdown 权威来源，Task 使用其现有权威存储；页面与会话不建立平行数据副本。原型只提供视觉与交互依据，不把其覆盖脚本整体迁入产品。
- Morning 保持文字视图。Morning baseline 和 Current arrangement 独立保留；普通白天拖动按 Q3 修改 Current arrangement，早间规划或明确的基准纠正按对应既有流程修改早间部分并留痕。不得因名称相同、最初复制或展示相似而自动双写。
- 白天时间轴维持一条刻度，统一呈现当前计划、定时任务与有时间的事实，保留来源标签。冲突项目临时并排，其余整行；不按来源固定分三列。Confirmed facts 的纠正属于记录纠正流程，不提供把事实卡片当计划拖动的操作。
- 保留 Lived day 的 04:00 至次日 04:00 边界与真实日期。可折叠无内容的边缘时段，但已有条目必须可发现、可展开；午夜后的日期明确标识。时间轴拥有自己的滚动区域，长拖动支持边缘滚动。
- 计划时间明确区分模糊时段、近似时点、精确时点与精确起止区间。初始参考位置为早晨约 09:00、中午约 12:00、午后约 13:00、傍晚/晚间约 18:00；这些仅是模糊计划的显示参考，不成为事实或精确承诺。无法可靠定位的内容保持未定位；相对时间不能按每次刷新时刻不断移动。
- 拖动模糊计划保留模糊语义并机械保存新的近似时间，例如约 14:00；阅读高度不产生持续时间。用户可明确在模糊与具体时间之间转换。拖动精确区间保持时长，调整结束边界改变计划时长；精确时点保持时点，除非用户明确补充结束时间。
- 提供与拖动等效的时间编辑入口。拖动默认以 15 分钟吸附，读取既有非整刻时间不自动修改原值。非法起止或超出支持边界的修改需要清楚说明，不静默截断、翻转或改写日期。
- 扩展现有计划读取和修改契约以携带可可靠定位的条目身份、来源归属、时间精度与修订约束。旧 Markdown 需有兼容读取策略；无法安全定位写入对象时给出重新读取或明确编辑路径，不能凭标题猜目标或全局替换相同时间文字。具体字段、身份编码与兼容方式由实现设计决定。
- 计划时间修改由 App 确定性完成，无需语言模型或模型额度。保留目标 Vault、来源、合法参数、修订冲突与重复防护，遵循已有语义授权决策，不新增对话意图审批层。
- 对应时间字段变动与修订痕迹应作为一次一致保存，并保留无关 Markdown 与原始证据。写入后读取确认结果，刷新相关页面；失败恢复已保存状态并保留可重试的编辑值，未确认结果通过重新读取核对，不自动重放。文档已保存与界面刷新失败分开表达。
- 扩展 Task 的持久化及读取/创建/更新契约，支持可选计划执行时间段。旧记录继续支持无日期、日期和单时间点；时段不表示 deadline、实际用时或完成事实，结束时间必须具有明确的日期关系。跨午夜区间保留结束所属日期与次日标记，现有 Task date 含义不被隐式重标。
- Task 选区创建保存日期和区间，整体移动保留时长，时间编辑允许改变结束时间；三个页面使用同一 Task 身份。Card 最小高度不反推时长。拖 Task 不自动改 Diary，改 Diary 不自动改同名 Task。
- 新时段字段兼容现有 Collaboration Task 操作和离线 daily-flow adapter。更新中未传时保留既有值，明确清除才移除；旧调用改内容、清单或状态不会丢失结束时间。迁移及操作重试保留已有 Task 身份与历史。
- Tasks 保留清单侧栏，以简洁任务列表和所选详情组成主要结构。勾选只改完成状态，点击名称/行查看详情；完整内容、日期、时间与清单归属在详情中编辑，放弃/删除等次要操作和历史仍可访问。窄窗口下详情可转到列表下方或可返回的面板，具体尺寸由实现选择。
- Calendar 每个日期格等高，按五行或六行月份与窗口调整紧凑高度，不随某天内容变高。以原型确认过的常用窗口为目标，完整月份可见；默认最多四行单行预览，更多数量放在日期行，完整内容由日期详情查看。
- 记录状态默认缩小放在日期旁：“记”表示有记录而未完成晚间复盘，“复”表示已复盘，没有记录为空；读取失败单独表达。使用现有真实记录状态，不以 Task 完成数推断复盘。原型中的标记位置比较控件不要求成为正式设置。
- Collaboration 保留会话与主对话结构，去掉重复标题，长说明折叠或按需显示；已有草稿、听写、会话历史、工作历史、排队和停止能力保持其业务语义。
- Slash 补全列出现有真实可用命令，至少包括 Personal Retro 的 /retro；输入筛选，上下键选择，Tab/Enter 或点击插入，Escape 关闭。候选打开时 Enter 补全而不提交；兼容中文组合输入，不误处理普通含斜杠文本。补全只生成可编辑草稿，不自动发送，不新增硬编码 Retro 执行模型。
- Evening 的开始复盘入口进入明确目标日期的 Collaboration session，带入可编辑草稿与权威记录引用。允许复用合适会话，保留已有草稿，不复制 Daily Record，不因重复点击重复提交；复盘保存沿用已有 skill 与业务操作。
- 本规格沿用既有领域定义和 ADR，不改变自动早间规划的权限范围，也不把 Workflow Retro 迁入 Dashboard。此处主要修改模块交互与契约，不增加依赖、外部服务或部署配置。

## Testing Decisions

- 用户已在 Q4 确认测试边界：复用现有 App 业务操作与真实持久化，用合成 Vault/Profile 检验修改、落盘、重新读取，再在打包 App 中验收拖动、勾选、月历、命令补全与复盘入口。
- 好的测试验证对用户可观察的行为、保存来源与结果，而不锁死私有函数、内部排布算法或源码字符串。浏览器原型的内存状态、静态字符串检查和编译通过不能证明正式功能通过。
- 主业务测试边界是现有 application 读写操作与持久化的完整链路，不为每个小 helper 新建测试接口。复用 Daily Plan workflow 对合成 Vault、固定时钟、当前安排/早间基准独立更新、修订、重复投递和并发修改的既有测试方式。
- Today 计划测试检验具体区间移动、结束调整、模糊定位与精度转换；读回 Markdown 和新 application 实例视图一致。典型案例为把当前安排 08:00–10:00 移至 10:00–12:00，仅当前安排和白天修订变化，早间与事实保持原值。
- 早间纠正与事实纠正沿用既有对应流程，分别验证修改归属；事件记录不制造计划变化，时间过去不产生事实或 Habit completion。对无可靠定位、未知活动及相对时间的行为使用真实读取结果验证，不以卡片高度作为时间证据。
- Task、Today 与 Calendar 的共享测试沿用既有 shared-task workflow：创建执行区间、移动、编辑结束、跨午夜、完成/重开及重启后保持同一 Task 身份和保存值。旧 Task 的四种有无日期/时间组合、新区间、明确清除与遗漏字段均需覆盖。
- 复用现有 Task adapter 和 Collaboration operation 的集成测试边界，验证新字段的兼容性、旧入口部分更新不丢时段、重复投递不创建副本；读回结果比内部序列化形状更重要。
- 失败场景沿用已有 stale revision、Vault 切换、损坏/用户自定义记录保护及写入失败的测试方式，检验真实文件不被误覆盖、界面不冒充保存成功、未确认结果能够核对。保留无关文本的断言是用户内容保护的外部契约。
- 时间轴与 Task 列表交互通过实际页面输入验证：选择、勾选、详情、时间编辑、长拖动边缘滚动、临时并排与窄窗口均可使用。只增加必要的行为测试；现有几何单元测试可提供辅助证据，但不替代真实交互。
- Calendar 复用既有 calendar workflow 的状态来源测试，并在实际渲染界面验证五行与六行月份、等高日期格、四行预览及更多数量提示；参考窗口包括 1280×720 与约 830×758。加载失败不能显示成没有记录，Task 完成不能变成已复盘。
- Collaboration 复用已有 conversation、draft、queue 与 refresh 回归边界，通过键盘和点击验证 slash 筛选/补全/关闭及中文输入法。补全没有产生消息；只有现有真实命令可选，Personal Retro 继续调用已有能力。标题减负不能破坏听写、停止、草稿和工作历史。
- Evening 验证当前日与过去日期的目标绑定、草稿保留、适合会话的复用及重复点击；进入会话不会创建事实、提交消息或标记复盘完成。
- 最终验收复用现有 macOS packaged IPC 与 UI 驱动方式，在隔离 Profile、合成 Vault 和受控时间下验证真实 Tauri 路径、文件读回与重新启动。UI 可用性和必要的中文输入法/拖动检查留存实际证据；测试受环境限制的项目明确保留未验证状态。
- 测试只使用合成数据，不修改用户真实 Daily Record、Task 或连接的外部数据。无需模型额度的直接时间修改单独验证。自动检查、打包 UI 验收与用户接受分别记录，不能互相替代。

## Out of Scope

- Workflow Retro 报告里的执行失败、参数记录、敏感信息误遮蔽、回复 Markdown 渲染与重复读取等开发改进；这些需要单独根据当前版本证据立项，不混入本次体验规格。
- Personal Retro 的报告内容策略、分析方法或额外模型执行流程；本轮改善已有入口的发现和复盘启动。
- Habits 的新能力、旧快照覆盖范围扩展或新的数据源。
- Codex 账号 quota 的恢复策略、自动重试与换账号流程；额度耗尽本身是正常外部限制。
- Settings 扩展、Task 时间轴工作台、固定来源三列、第二条 Today 时间轴或重新设计整个 Dashboard。
- 新的 Task deadline 系统、推断实际活动时长、时间过去自动完成、日历同步或同名计划与 Task 的自动联动。
- 新外部服务、依赖、部署配置、独立业务数据副本或新的 Dashboard MCP。
- 重开已关闭的 Collaboration redesign 队列或自动迁移任何旧 tracker；本轮采用独立且已获用户明确授权的本地 tracker。
- 实现票拆分、代码实现、main merge、App 安装、发布上线及交付 closeout；本次 to-spec 仅产生并发布规格。

## Further Notes

- 原型 R 与 Tasks 的 B 列表结构已经由用户确认。冲突卡片采用临时并排是用户委托 Agent 作出的选择；没有固定三类来源列。
- Q1 确认显示与对应文档一致；Q2 确认 Task 保存计划执行区间；Q3 确认普通白天拖动默认更新 Current arrangement；Q4 确认上述测试边界。没有待用户决定的重要设计问题，具体字段、兼容与组件实现由 Agent 根据契约选择。
- 原型曾以共享 id 同时修改早间和当前安排的 Markdown 预览；该演示被 Q1/Q3 的来源归属澄清覆盖，不是正式双写要求。原型没有真实 Vault 写入，内存 Task duration 也不代表现有持久化能力。
- 原型定稿位于当前 codex/dashboard-experience-prototype 分支，视觉确认记录为提交 e0e339b，问答记录为其后的本地文档。当前原型入口为 revised.html?page=today&variant=R。原型、问答和证据由本地 tracker 留存引用；个人数据不进入规格或版本控制。
- 本文件按 to-spec 的七章节模板全新编写；此前本轮旧草稿已按用户要求删除，不沿用旧稿格式或旧的发布状态。
- 用户在 2026-10-10 明确指定本轮 Spec、后续 tickets 与执行全部 local。本文件是 PDEX-SPEC-01 的完整 canonical 正文，local map 记录 ready-for-agent triage 与 open lifecycle；无需额外 triage，GitHub 故障不再阻塞本轮规格发布。
- 规划、票据与后续获授权的实施均保留完整本地 commit history；状态、依赖、认领和证据随操作记录，不通过改写历史伪装成远端已发布。远端恢复后的 branch push/PR 与 Issues 迁移分别处理，保留稳定 ID 和映射，不自动迁移或合入 main。
- 规格发布本身不代表代码已实现或 App 已安装，也不开始执行旧工作队列。


## Human quota acceptance decision — 2026-10-11

The human explicitly accepted the quota-exhaustion criterion and waived further actual exhaustion testing in review chat `01a128ff-8865-7493-9698-cc48c19d7939` (direct user reply `01a12969-8b59-76a3-a544-d67411f4656f`). The quota subgate is **accepted by human waiver on existing evidence**, not an observed exhaustion result. No controlled injection, new model request or artificial quota spending is required or performed. Historical statements that actual exhaustion was not established remain true observations; their pending-test/blocker status is superseded by this explicit decision.

PDEX-11's conflict/write-failure/unconfirmed-result combined criterion is now checked: existing qualified source/persistence/production native evidence supports those constituents, and the quota constituent is explicitly accepted by the human. Remaining required gates are real Sogou composition, sustained native edge/active resize cancellation and fresh final-installed 830×758 narrow-window behavior. PDEX-09/PDEX-11 remain blocked, parent open, and nine other tickets resolved. [Current manual checks](manual-acceptance.md) no longer asks for quota exhaustion. Installation remains confirmed and does not by itself close the remaining gates.


## Human IME acceptance and PDEX-09 resolution — 2026-10-11

The direct human message `01a1296a-888d-7193-9c10-77ca83962f5f` in review chat explicitly accepts the real Chinese IME criterion on existing evidence and waives dedicated native composition testing; normal daily Chinese use will supply future issue feedback. This is **human acceptance/test waiver**, not an observed OS composition result. Existing keyboard/completion/ordinary-slash/draft checks and independent review are complete, so PDEX-09 is now locally resolved/closed with all acceptance criteria accounted for. The same shared IME subgate is accepted for PDEX-11. No additional test message, input-source change or model request is required.

Current tracker: ten resolved, one blocked (PDEX-11), parent open. PDEX-11's slash/draft/date/Evening combined criterion is checked using existing qualified behavior evidence plus the explicit IME waiver; its quota/conflict/failure criterion is already accepted as recorded above. Only sustained native edge dragging/active gesture cancellation and resize, plus fresh final-installed 830×758 narrow-window behavior remain required. [Current two manual check categories](manual-acceptance.md) supersede earlier pending-IME/quota lists without erasing historical observations. Installation is confirmed; full native acceptance and parent closure remain pending these two categories.


## Direct human acceptance and initiative closeout — 2026-10-11

The human confirms plan time-bar drag with visible plan-time revisions, timeline drag-selection to create a Task, narrowed Calendar usability and correct-looking overlap entries in the actual installed normal App. The reviewer additionally observed saved-and-readback-verified feedback and revision records through read-only UI inspection, and accepts the round on existing implementation/automated/native evidence plus these direct human results. [Final local acceptance record](evidence/human-acceptance-2026-10-11.md) retains exact message/provenance pointers and evidence qualifications.

Today narrow-window time-axis compression/partial occlusion from the retained Items without a precise time side column is explicitly accepted by the human as an interface limitation; optional improvement does not block this round. Sustained held-edge auto-scroll, active-drag resize/cancel and exact final-installed 830×758 geometry were not separately observed: no claim of per-step performance or a direct human waiver is made. IME/quota retain their separate explicit acceptance/test waivers.

PDEX-11 is now resolved/closed; all eleven tickets and PDEX-SPEC-01 are locally resolved/closed, with no current initiative blocker. Earlier parent holds prevented acceptance inferred solely from automatic checks; this direct human installed-App acceptance and independent reviewer overall conclusion provide the missing basis for parent closure. No product changes, live UI action, personal-data write or new model/test request were performed by implementation closeout. Product diff from reviewed `ffa1b85` is zero. Historical records remain; no main/remote publication or tracker migration is inferred.
