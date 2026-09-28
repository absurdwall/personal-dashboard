# Personal Dashboard 3.0.2 — Today 任务时间轴、刷新一致性与四页布局

Status: claimed
Reopened: 2026-09-26

Publication: published — 产品范围已由 Grill-with-docs Q8 确认，测试边界已由 to-spec Q9 确认。本次仅发布规格，不代表授权拆票、实施或发布 App。

## Problem Statement

用户在 Tasks 创建的任务已经能出现在 Today 右侧，但有时更新不及时，用户报告点击 Today 刷新后仍未同步。现有源码的刷新链路已经读取共享 Tasks，因此当前不能把根因写成“刷新按钮未接任务”；需要复现和定位实际读取、异步响应或呈现失效。

另一个独立问题是当天有时刻的 Task 尚未进入 Today 时间轴。现有时间轴只投影 Daily Record 的 Current arrangement 与已确认事实，右侧任务可见并不能证明时间轴已经接通。此前截图中的旧日期任务不能作为当天时间轴漏项的证明。

用户为任务填写的时刻可能表示截止，也可能表示事情发生或开始。用户不愿增加分类操作，统一将它解释为开始或截止都会误导。当前代码把当日已过时刻的未完成任务算作逾期，也不能准确表达这种混合用途。

Today 右侧任务卡片把标题、元信息和多个操作按钮横排，严重挤压文字。四页的顶部留白、标题字号、重复标题和容器层级不一致。用户需要可读且一致的日常界面，并要求正式 Mac App 的实际视觉结果符合规格。

## Solution

Today 手动刷新后，Daily Record、右侧共享任务及时间轴展示应反映所选 Vault 和日期下已经成功读取的最新数据；读取失败应明确反馈，不能把陈旧展示宣称为刷新成功。不新增定时轮询要求，保留已有 App 内操作与切页读取行为。

当天有具体时刻的 Task 同时在右侧任务区和时间轴出现，身份与状态仍来自同一条 Task。时间轴采用“17:00 · 任务名”这样的中性时刻标记，不增加开始/截止选择，不生成虚构时长。没有具体时刻的今日任务继续只放在右侧「Today 任务」。无日期任务不自动进入今天，过去日期的未完成任务继续单列，不移动到今天的时间轴。

当日过了设定时刻但尚未完成，显示“已过设定时间”，仍留在当天任务组；不称为逾期。完成后在原设定时刻保留已完成标记，不将它误当作实际完成时间或耗时事实。Task 和 Daily Record 的同名安排分别显示并标注来源，不凭名称合并。

任务卡片采用标题与元信息在上、操作在下的纵向结构。四页统一页面边距、标题层级和同层容器：结构参考日历，字号参考今天/任务；保留有意义的区域标题，移除重复的页面大标题及无意义的外层白框。最终通过正式 Mac App 同窗口尺寸对照验收。

## User Stories

1. As a Personal Dashboard user, I want Today 的刷新包含右侧任务, so that 我不需要猜哪个区域被刷新。
2. As a Personal Dashboard user, I want 时间轴与任务列表使用同一份已读取的任务状态, so that 同一任务不会在一页上显示矛盾信息。
3. As a Personal Dashboard user, I want 外部已保存的任务修改在手动刷新后出现, so that 我可以主动获得最新内容。
4. As a Personal Dashboard user, I want 刷新失败时看到明确反馈, so that 我不会把旧数据误认为最新结果。
5. As a Personal Dashboard user, I want App 内修改任务后各入口继续保持一致, so that 我无需重复编辑同一行动。
6. As a Personal Dashboard user, I want 旧请求不能覆盖更新的日期、Vault 或任务结果, so that 我不会看到错位或倒退的数据。
7. As a Personal Dashboard user, I want 今天有时刻的任务出现在时间轴对应位置, so that 我能直接看见当天需要关注的事情。
8. As a Personal Dashboard user, I want 时间轴直接显示任务名与设定时刻, so that 我不必先打开详情才能知道是什么任务。
9. As a Personal Dashboard user, I want 继续只填写一个任务时刻, so that 我不用额外区分开始时间与截止时间。
10. As a Personal Dashboard user, I want Task 的时刻标记不暗示持续时长, so that 界面不会编造我尚未提供的信息。
11. As a Personal Dashboard user, I want 无具体时刻的今日任务保留在右侧, so that 它不会占用狭窄的时间轴空间。
12. As a Personal Dashboard user, I want 无日期任务保持未安排状态, so that 它不会自动成为今天的任务。
13. As a Personal Dashboard user, I want 过去日期的未完成任务单独可见, so that 我能处理遗漏而不混淆今天的时间安排。
14. As a Personal Dashboard user, I want 当天过时刻的任务显示“已过设定时间”, so that 发生时刻不会被误读为截止期限。
15. As a Personal Dashboard user, I want 时间经过不会自动完成任务, so that 只有我的明确操作改变完成状态。
16. As a Personal Dashboard user, I want 完成的任务保留在原设定时刻并标示完成, so that 当天安排仍可回看。
17. As a Personal Dashboard user, I want 设定时刻与实际完成记录保持不同含义, so that 完成任务不会制造不真实的活动事实。
18. As a Personal Dashboard user, I want 撤回完成后同一任务恢复未完成显示, so that 我能纠正误操作而不产生副本。
19. As a Personal Dashboard user, I want 改名、改时刻与改日期反映在共享展示中, so that 原位置不会遗留幽灵任务。
20. As a Personal Dashboard user, I want 放弃、删除和归档沿用现有日常视图筛选, so that 时间轴不会重新暴露已退出待办的任务。
21. As a Personal Dashboard user, I want Task 与同名日记安排分别标明来源, so that 我能理解两条内容为何同时出现。
22. As a Personal Dashboard user, I want 多个同时刻项目保持现有可读的重叠处理, so that 新增 Task 不会破坏已经接受的时间轴体验。
23. As a Personal Dashboard user, I want 任务标题使用卡片可用宽度, so that 普通中文标题不会被横排按钮挤成逐字竖排。
24. As a Personal Dashboard user, I want 操作按钮位于标题与元信息下方, so that 阅读和操作都不争抢同一行空间。
25. As a Personal Dashboard user, I want 长中文和中英混合标题正常换行, so that 无需缩小字体也能读懂任务。
26. As a Personal Dashboard user, I want 日期和来源等元信息正常横向阅读并按需要换行, so that 它们不会变成难读的窄列。
27. As a Personal Dashboard user, I want 今天、任务、日历、习惯拥有一致的顶部与左侧留白, so that 切页时不会感觉内容贴边。
28. As a Personal Dashboard user, I want 四页采用一致的页面标题层级, so that 我不会在同一页重复看到占空间的大标题。
29. As a Personal Dashboard user, I want 同层内容使用一致容器样式, so that 页面不会出现无意义的大白框套内容框。
30. As a Personal Dashboard user, I want 窄窗口下仍可读可操作, so that 我不必放大窗口才能使用任务。
31. As a Personal Dashboard user, I want 中英文界面的新增状态与来源标记一致, so that 切换语言不会改变任务语义。
32. As a Personal Dashboard user, I want 这些改进在真实 Mac App 中通过验证, so that 原型或测试通过不会掩盖实际界面问题。

## Implementation Decisions

1. 继续使用现有 Tauri、Rust 应用服务和 TypeScript/HTML/CSS 呈现架构。Tasks 正本、Task identity、Task date、Selected vault、Daily Record 等术语遵循现有领域词汇；不复活旧 Day task 写入或已退役 Exercise/Profile runtime。
2. 以共享任务读取结果构建 Today 的任务列表与时间轴 Task 投影，不建立 Today 专属任务存储，不将 Task 复制写入 Daily Record。Task 与日记安排使用不同来源身份，任务身份不可由标题推断。
3. 延用单一可选日期与时刻；不新增开始/截止分类字段，不要求数据迁移去猜测旧时刻含义。原则上只扩展读取投影与展示信息，具体类型形状由实施决定，持久化任务身份和已有数据保持兼容。
4. Task 投影使用中性时刻点而非具有虚构结束时间的区间。任务名、时刻、来源和完成状态可见；完成标记附着原 Task 投影，不作为 Daily Record 的 confirmed fact 或实际用时。
5. 日期/状态规则：今日有时刻的有效 Task 进入当天时间轴；今日无时刻只在右侧；无日期不自动进入 Today；过去日期 pending Task 保持单独待处理组；未来日期任务不进入今天。完成的当天 Task 保留标记，放弃/删除/归档遵循既有日常视图排除规则。恢复、改期、撤回完成仍按相同身份重新投影。
6. 当日时刻已过且仍 pending，使用“已过设定时间”，不进入过去日期的逾期待办组。到达恰好设定时刻不算“已过”；刷新时以已有 lived date、受控时钟与时区约定判定。此决定替代旧 Tasks 阶段“按当日时刻判为逾期”的部分契约；共享状态、分组与计数不能在 Tasks、Today、Calendar 中互相矛盾。没有时刻的当日任务不获得该标记。
7. 不新增定时轮询。手动刷新触发页面所有相关数据重读并正确重绘；刷新成功意味着页面各相关区域展示最新成功读取的结果。失败明确反馈，不能静默保留旧任务却宣称整页刷新成功；不要求跨不同正本建立新数据库事务。
8. 刷新修复先复现并形成能失败的回归，再定位与修正实际问题。检查读取、绑定、revision、异步结果失效和呈现的完整链路，不预设根因。保留已有任务写入后缓存协调、切页读取和窗口获焦行为；这些不是新增后台同步承诺。
9. Task 与 Daily Record 安排即使同名同时刻也分别保留，显示“任务”与“日记安排”。复用已接受的单列时间轴和重叠展开行为，不横向增加一条任务专属泳道，不重做已有计划/事实的语义。
10. 任务卡片正文与按钮纵向排列。标题先占卡片内容宽度，元信息位于标题下方，操作再位于元信息下方；按钮组宽度不足时正常换行，不把正文挤成窄列。不通过调小现有正文字号、隐藏任务名或仅依赖悬停修复可读性。
11. 四页采用共同的页面框架与同层标题尺度，日历作为结构参考、今天/任务作为字号方向。每页保留一个有效页面级标题或已有等效页面标识，区域级标题保留其语义，消除重复页面标题和无功能的嵌套外框；语义可访问名称不得随视觉去重丢失。
12. 留白、字号及容器令牌的具体数值属于实施细节，不在本规格臆定现有四页已达到的 CSS 状态。下面的正式 App 视觉条件是必须满足的结果约束。
13. 新增固定文案提供中英文；用户输入和个人资料不自动翻译。默认保留现有编辑入口与任务动作，不新增时间轴编辑系统、智能去重或 AI 分类。

## Testing Decisions

已确认测试边界：复用现有应用工作流入口作为自动化主边界，再以同一产品的真实 Mac 窗口操作验收 UI；不新增框架、依赖或服务。用户已在 Q9 明确确认。

### 自动化主边界：应用操作与返回视图

- 从 TaskApplication 创建/修改 Task，再由 TodayApplication 读取，以隔离的文件 Vault 与受控时钟检验身份、日期、状态和时间轴投影。优先扩展现有共享 Today Tasks、Task 工作流及 Today 时间轴工作流用例，不分别为多个私有辅助函数建立镜像测试。
- 好的测试从用户动作出发，断言最终可观察任务位置、名称、状态、来源与存储不变量；允许内部重构，不依赖函数调用顺序、CSS 文本正则或实现字符串。
- 验证 Today 刷新问题时，先建立可失败的回归证据。后端重读正确并不足以证明按钮正确；前端的按钮、异步结果与最终呈现链路在真实窗口验收中覆盖。若竞态需自动化隔离，优先复用已有任务操作/LatestRequest 测试入口，只有现有入口无法重现时才在页面操作层增加最小可注入命令边界，不全面改造前端。
- 现有 task-presentation 与 latest-request 测试可补充共享分组、计数、过时刻文案和旧响应失效。现有 task-surface 的源码静态断言仅作辅助，不能作为刷新或视觉修复的核心证据。

| 场景 | 主要预期 |
| --- | --- |
| 今日 17:00 pending Task，无同名日记 | 右侧和时间轴出现同一 Task；时间轴可直接读到名称及 17:00，无虚构时长 |
| 17:00 与 17:05 读取 | 恰好时刻不标已过；17:05 仍 pending 则显示“已过设定时间”，仍归当天 |
| 今日有日期无时刻 / 无日期 / 明日任务 | 分别只在今日右侧 / 不自动进入 Today / 不进入今天 |
| 昨日未完成任务 | 过去日期待处理组可见，不放在今天时间轴、不改日期 |
| 完成 / 撤回完成 | 原设定时刻保留完成标记 / 恢复未完成；不创建事实或耗时 |
| 改名、改时刻、改到明天 | 各共享入口一致，旧名称和旧位置不残留 |
| 放弃、删除、归档及恢复 | 延用共享任务的可见性与历史规则，不出现额外副本 |
| 同名同时刻的 Task 与日记安排 | 各保留一条、来源可区分；重叠仍可展开阅读 |
| 仅有 Tasks 而当日 Daily Record 缺失 | Task 投影仍可显示，读取不制造 Daily Record |
| 外部有效修改 Task 与 Daily Record 后点刷新 | 当前页面相关区域读取新内容；不要求前台定时自动更新 |
| 读取失败后重试 | 明确失败反馈，重试可恢复；不把陈旧状态称为刷新成功 |
| 连续刷新、切页、切 Vault、较慢旧响应返回 | 旧结果不能覆盖最新绑定及任务状态，不串日期或 Vault |
| 跨午夜后刷新、重启后读取 | 按现有 lived date/时区重新归组，无重复任务或错误完成 |

### 正式 Mac App：真实窗口行为与视觉验收

- 复用现有 packaged IPC 验收脚本及 macOS Accessibility 驱动，使用构建出的产品 App、隔离资料和明确的包身份。受控测试包的操作证据与最终正式 App 视觉验收分别记录；浏览器预览和 prototype 不替代正式 App。
- 沿用现有窗口矩阵：960×720、800×640、640×520。在每个相同尺寸下分别捕获今天、任务、日历、习惯四页；记录实际窗口尺寸，不能拿不同尺寸截图证明一致。
- 使用合成标题“签续租合同”、较长中文任务，以及“准备 interview coding：复习动态规划并整理 follow-up notes”；覆盖日期、来源、详情/完成/放弃/删除按钮同时可见的卡片。
- 在正常两列布局下，短标题不得因横排按钮而逐字换行；长标题占正文宽度自然换行，日期与来源不能被挤成竖列。按钮位于正文下方，无相互遮挡、横向溢出、不可达动作或字体缩小补救。
- 最窄窗口允许沿用现有响应式堆叠，但任务仍属于原 Today 任务区域，不新增“无时刻任务”的时间轴区；所有动作可滚动到达，页面不出现非预期整体横向溢出。
- 四页的主内容起始边距和标题层级一致；日期/说明不贴顶部与左边；不出现重复页面主标题或无意义大白框套圆角内容框。保留必要区域标题、键盘焦点与可访问名称。
- 实际操作覆盖“Tasks 新建今天有时刻任务 → Today → 手动刷新”、外部修改后刷新、改期、完成与撤回，核对时间轴和右侧同时变化；刷新根因未复现时应报告未复现及证据边界，不伪称修复。
- 通过条件包含自动化结果、真实操作结果和截图逐项判定。保留已接受时间轴的计划/事实区分、当前时间标记和重叠处理。自动测试通过不自动通过视觉验收；工具权限或环境阻碍需作为未完成的验收项记录。
- 本次只编写规格，不运行上述测试，不访问或修改真实个人 Vault，也不安装或替换 App。

## Out of Scope

- AI/Codex 登录、App 内早间规划及用户暂称 4.0 的后续功能。
- prototype、独立设计探索、重建已接受时间轴、重做习惯领域行为。
- 开始/截止类型选择、额外截止字段、自动语义推断、自动完成、耗时推算、自动合并同名事项。
- 无时刻任务的新时间轴区域，无日期或逾期任务自动改期到今天。
- 定时轮询、新同步服务、App 管理云同步或外部任务服务写回。
- 新依赖、新框架、部署配置、旧 Exercise/Profile 恢复及旧 Day task 写入。
- Git/worktree/App cleanup，旧 Tasks effort 重命名覆盖，发布版本或安装升级操作。
- 把本规格发布视为授权自动拆票或实施。

## Further Notes

- 来源：已确认的 [Grill-with-docs 决策记录](../personal-dashboard-3.0.2-grill/session.md)，尤其 Q4–Q8；[既有反馈草稿](../personal-dashboard-usage-feedback/2026-09-24-next-iteration.md) 提供原始问题背景，不覆盖后续澄清。
- 既有 [Today 共享任务票](../personal-dashboard-4/issues/04-today-shared-tasks.md) 是复用契约；其当日过时刻的逾期行为由本规格明确修正，其他身份与存储边界继续保留。
- ADR 的 Tauri 基础、退役旧运行时和桌面客户端负责云同步的边界继续适用。当前代码核实不等于已查看四页正式 App，也不等于用户所遇刷新问题已复现。
- 本规格采用“3.0.2”作为本轮工作名称，不修改历史 Tasks effort 的 4.0 名称，也不在规格编写阶段更新 App 版本。
- 测试边界已确认，本规格已发布为 ready-for-agent；下一阶段为 To Ticket，再进入 implement，各阶段不自动跳转。规格发布不表示任何验收已执行或通过。

## Execution and release addendum — 2026-09-26

四张实施票及其最终集成验收已完成。随后用户明确授权执行本规格初始 Out of Scope 中未授权的 release-version、macOS 安装升级和重复启动入口处理；本补充记录该后续授权，不回写为原规格阶段已获授权。

- Release PR #6 已合并至 `main`，版本提交 `a66235fa056995f094721cdfb37c6e1f5ff03166`，合并提交 `efa5847ac81e463ba499f2a01ba81a5a6a979940`。改动仅同步应用版本声明与对应版本断言。
- 3.0.2 候选包通过签名校验；影响路径 `interface-language` 的隔离 packaged acceptance 通过。04 的组合路径和 12 张四页矩阵已在最终集成 3.0.1 包上通过，见 map 的最终交付记录；release 仅改版本元数据，因此没有重新声称 3.0.2 包完成新的四页矩阵。
- `/Applications/Personal Dashboard.app` 已安装并正常启动为 3.0.2。5 个应用支持配置文件安装前后哈希一致；未编辑真实 Vault 内容。旧 3.0.1 应用保存在本地图中的 recovery 目录。
- LaunchServices 与 Spotlight 稳定查询均只发现 `/Applications/Personal Dashboard.app`。仅对生成的 build 输出目录应用了可逆 Spotlight 排除；没有全局重建索引。完整路径、哈希、已知测试限制及 Management 回执见同目录 `delivery-recovery.md` 与 map。
