# Personal Dashboard 3.0 — Mac 日常操作与基础体验

Status: ready-for-agent
Stage: 用户已确认测试边界；正式规格已发布，供后续 to-tickets 使用
Date: 2026-09-12

## Problem Statement

2.0 已是可日常使用的 Mac 应用，但固定中文界面、空泛的设置入口和不清晰的 Vault 加载方式，使它还不够方便推荐给拥有自己 Vault 与 Codex 工作流的朋友。用户希望自己的整个 Obsidian Vault 有客户端同步的保存路径，而不要求 Dashboard 建设云端数据服务。

日常使用中，习惯记录需要在滴答与晚间复盘之间来回查看；早间安排中的洗衣、购物、收拾屋子等小事缺少可直接操作的结构化入口。补上这些操作时，必须保留现有紧凑阅读体验、明确的事实来源和历史更正边界。

## Solution

在现有 Today、Calendar、Habits 和 Tauri Mac 应用基础上增量完善：固定界面中英文切换；包含外观、数据与 Vault 的设置；Google Drive 桌面客户端同步目录的选择引导；Vault 内独立的 Local habit completion；Today 右侧常驻的 Day task。

采用用户已基本认可的独立原型作为设计基线：B 任务布局、紧凑 Habits 行内小勾选框、顶部语言按钮、预设颜色和淡背景图。连接兼容 Vault 即可使用，无应用账号。滴答保留其现有职责，Dashboard 不直接连接滴答或调用 Agent。

## User Stories

1. As a Mac user, I want the existing Today, Calendar and Habits structure preserved, so that upgrading does not require relearning my daily workflow.
2. As a reader, I want day tasks always visible on the right, so that my main reading area remains available.
3. As a reader, I want the compact Habits summary, anchors and history retained, so that completion controls do not crowd out evidence.
4. As a Chinese-speaking user, I want fixed interface labels in Chinese, so that navigation remains comfortable.
5. As an English-speaking user, I want fixed interface labels in English, so that I can use the same application.
6. As a bilingual user, I want a language switch beside Settings, so that I can switch without opening a settings page.
7. As a journal owner, I want my diary, task text and habit names left in their original language, so that switching the interface never rewrites my records.
8. As a user, I want language changes to preserve my date, edits and task state, so that switching language does not interrupt work.
9. As a user, I want language preferences remembered on this Mac, so that I do not repeat the choice after launch.
10. As a user, I want Appearance and Data & Vault settings, so that their purposes are clear.
11. As a new user, I want to select my compatible local Vault without an app account, so that I can begin using my own data.
12. As a Vault owner, I want the selected location visible in settings, so that I know which records I am editing.
13. As a Vault owner, I want to change Vault in settings, so that a rare setup action does not occupy my daily reading area.
14. As a user with an unavailable Vault, I want a direct recovery or selection entry, so that I am not stranded on an empty page.
15. As a Google Drive user, I want guidance to select the whole Vault already synchronized by the desktop client, so that I can use the same local files with other tools.
16. As an offline user, I want available local records to remain usable, so that a network outage alone does not prevent local work.
17. As a user, I want local-save status distinguished from cloud synchronization, so that I am not misled about remote durability.
18. As a user changing Vault, I want records and cached evidence isolated by Vault, so that data from one workspace never appears in another.
19. As a user, I want a few preset accent colors, so that I can adjust the interface without configuring a theme system.
20. As a user, I want to select a local background image, so that the application feels personal.
21. As a reader, I want the same image tone across pages and lightly separated content panels, so that the background remains visible without obscuring content.
22. As a user, I want to remove the image or restore default appearance, so that experimentation is reversible.
23. As a user, I want an imported background to survive moving the original file, so that my preference remains reliable.
24. As a user, I want appearance stored on this Mac independently of Vault, so that changing data does not change my interface preferences.
25. As a habit user, I want to mark an existing completion-type habit in its compact row, so that I can record completion without visiting another app.
26. As a habit user, I want local completion saved independently in my Vault, so that refreshing an external snapshot does not erase it.
27. As a habit user, I want completion from either local records or valid external evidence to count, so that I can record in either place.
28. As a habit user, I want both sources on the same day counted once, so that weekly totals are not inflated.
29. As a habit user, I want to cancel my local completion, so that I can correct an accidental click.
30. As a habit user, I want an explanation when external completion keeps a checkbox completed after local cancellation, so that the result is understandable.
31. As a habit user, I want source freshness and unknown coverage visible, so that missing evidence is not treated as failure.
32. As a habit user, I want actual wake and sleep times kept distinct from completion checks, so that the app does not invent an activity time.
33. As a habit user, I want local records to survive the rolling history window, so that a display limit does not delete my history.
34. As a daily planner, I want explicit planned actions supplied as day tasks, so that I can act on the plan without copying each item.
35. As a daily planner, I want optional suggestions excluded from automatic tasks, so that recommendations do not become commitments.
36. As a user, I want to add, rename, delete and toggle day tasks, so that I can adjust small daily actions directly.
37. As a user, I want task completion and edits preserved during replanning, so that a refreshed plan does not undo my work.
38. As a user, I want repeated plan ingestion to avoid duplicates and deleted-task resurrection, so that reading the same plan is safe.
39. As a user, I want unchecked tasks to mean unconfirmed, so that an unchecked box is not a claim that I failed to act.
40. As a user, I want no automatic carryover, so that yesterday's tasks do not silently become today's obligations.
41. As a daily planner, I want yesterday's tasks available to the next planning flow, so that it can recommend a deliberate new arrangement.
42. As a history reader, I want to edit the selected day's tasks and local habit completion with a correction trace, so that later corrections remain attributable to the right day.
43. As a history reader, I want the original evening narrative retained after a checkbox edit, so that an action does not silently trigger a rewritten review.
44. As a user, I want failed or conflicting writes reported without discarding my edit, so that I can recover safely.
45. As a user, I want saved changes to survive relaunch, so that real application behavior matches the prototype's interaction promise.
46. As a user, I want important dated updates kept separate from unrelated journal content, so that bounded edits preserve my writing.
47. As a friend with a compatible Vault and Codex flow, I want to use my own records and configured habit identities, so that demonstration data is never imposed on me.

## Implementation Decisions

以下区分已确认的产品决定与为实现这些决定规定的工程约束；不声称其已实现或经真实同步验证。

### 应用与数据边界

- 保持 Tauri、Rust 应用行为层及 TypeScript 展示层。沿用 TodayApplication 操作入口及已有文件、时钟、Vault 选择适配边界，新增任务／习惯操作通过同一应用边界编排。不得复活已退役的 Exercise/Profile runtime。
- Selected vault 继续承载 Daily Record、Day task 和 Local habit completion。任务与本地完成属于正本；Habit snapshot 是外部派生证据，不能反向覆盖正本。具体序列化布局由实施设计选择，必须版本化、可验证，禁止把本机应用缓存当作唯一保存位置。
- 现有 Daily Record 的 Morning baseline、Current arrangement、Short record 及 bounded write 语义保持。新增数据不得重写无关 Markdown 或把晚间复盘变成自动生成结果。
- 旧 Vault 没有新增记录时显示空的新增功能，不要求重写旧日记或批量迁移。读取不创建空日记录。损坏或不支持的新数据版本须明确报错，不当作空数据覆盖。

### Day task 与 Daily-flow producer

- Today 使用 B：任务在右侧常驻，不在左侧正文插入任务区、不默认折叠。Calendar 打开的同一日界面复用其任务操作。
- Daily-flow producer 将明确安排的行动提供为结构化任务；Dashboard 不通过每次渲染自由文本来猜测任务，也不自动调用 Agent。建议不进入任务集合。
- 任务契约至少保留稳定身份、归属 lived date、文本、来源关联、完成状态，以及手动修改／删除／更正所需信息。身份不由显示文字决定；改名保留身份。生产者必须支持按稳定身份增量更新，而非整份覆盖。
- 同一候选重复输入是幂等的；重排不能清除手动编辑或完成状态。删除后保留足以防止旧候选复活的标记；之后明确重新安排须作为可区分的新安排处理，不能靠再次输入旧候选绕过删除。
- “未勾选”表示未确认；取消任务完成可恢复未确认。历史编辑写入所选 lived date，并记录修改时间与修改对象；未来日期不能误记为已发生的完成。
- 无自动顺延。次日 producer 可读取昨日任务，提出是否重排的建议；建议本身不是新任务承诺。Dashboard 的点击不启动早晚间流程、不改写已有复盘。
- 规格要求 producer/reader 有兼容契约与合成往返验证；实际接入外部日常工作流仍须后续明确实施范围。本轮不修改或运行 skill、Dida365、自动化。

### Local habit completion 与合并

- 以稳定习惯 key 和 lived date 关联本地记录及外部证据；显示名称变化不改变关联，不进行模糊名称匹配。采用真实兼容 catalog，不写死原型的八个习惯或目标值。
- 完成型习惯才有新增勾选操作。每日实际时刻继续按原有来源展示；Short record、threshold-only、partial 等不自动成为完成证据。3.0 不提供习惯创建、删除、目标调整或时刻编辑器。
- 在每个来源内部先采用其最新有效观察；随后只要任一有效来源完成或本地完成存在，合并即完成，同日最多计一次。另一来源的 not-done 不否决有效完成。
- 此规则明确替代 2.0 中跨来源 completed/not-done 冲突计零的完成型汇总规则；原有日期合法性、来源资格、同来源替换、无证据为未知等约束保留。不是把每份旧快照的历史完成永久做 OR 累积。
- 本地取消只撤回本地完成，不写回滴答、不建立跨来源否决权。外部仍完成时保持合并勾选，并提供简短来源解释；本地有无记录与最终是否完成必须可辨别。
- 新有效外部快照更新其派生覆盖内容，绝不删除本地完成。缺失、损坏、过期和未覆盖是不同状态；沿用最近有效读取保留与 freshness 提示。重启后不能把进程缓存当作已持久恢复。
- 本地正本不因十二周显示窗口滚动而删除。窗口外已保存记录可供按日历史更正；没有可验证历史 catalog 或外部覆盖时明确表示未知，不臆造目标／外部完成。
- 周统计保持周一至周日、有效当前目标分母和实际已知完成次数语义；时间型目标不混入完成型分母。

### 并发、日期与切换

- 所有 mutation 明确绑定 Vault、目标 lived date、稳定对象身份与所基于的数据版本；不能由完成请求时的当前页面反推归属。跨日或切换 Vault 后到达的旧响应不能污染新页面。
- 沿用现有受保护写入与恢复设施；外部 producer、编辑器或同步客户端的更改不能被静默覆盖。冲突时保留用户操作及可恢复资料，显示失败／需重载，成功只在本地持久写入成功后确认。不得声称额外读取或一次 rename 消除了所有竞争。
- 明确重读入口继续可用；进入目标页面及完成写入后读取相应最新本地状态。重读不得覆盖未保存输入；不增加后台滴答或 Agent 轮询。外部文件变化的具体通知方式可用现有设施实现，不强制新增 watcher。
- Vault 切换复用等待在途写入与隔离缓存的既有行为；失败不伪装成功切换、不静默丢弃未保存修改。语言和颜色变化仅影响展示。

### 语言、设置与外观

- 固定界面中英对应，包括导航、操作、日期界面标签、设置、固定状态与错误提示。个人 Markdown、任务文本、习惯名称与来源内容不翻译；切换入口固定在右上角设置旁。
- Settings 分为 Appearance 与 Data & Vault；日常更换 Vault 在设置，未配置／不可用状态保留直接选择。展示所选位置及本地可用性，不新增账号、密码或会员。
- Google Drive 引导遵守 ADR-0003：用户先用桌面客户端让整个 Obsidian Vault 在本地可用，再选择该文件夹。任意 Obsidian 文件夹不自动变为兼容数据。普通本地 Vault 仍可使用。
- Dashboard 不管理 OAuth、上传下载或跨设备冲突，不宣称本地保存即云端保存。沿用 Drive 版本／回收站恢复思路，不承诺整 Vault 时间点恢复；具体兼容行为是后续实测验收项。
- 语言、颜色、本地背景副本归 Mac 应用偏好，跨 Vault 保持，重启保留，不写入 Vault。导入图片保留应用本地副本；取消选择保留当前设置，导入失败不损坏当前图片，移除只移除应用自己的副本／引用。
- 预设颜色、选择图片、移除图片和恢复默认外观均可用；恢复外观不清除 Vault 数据或语言偏好。默认无图片。
- 图片下方底色在 Today、Calendar、Habits 一致，内容面板略不透明以保持分层；日历内部避免叠白遮图。认可原型的图片层 10%、面板白底 32% 是视觉参考值，最终以阅读效果及原型对照为准。
- 保留 Habits 左摘要、右侧锚点／紧凑列表、近七天与行内十二周历史，勾选框置于行中间。Habits 较平而 Today／Calendar 有边框的差异留待细调；不为统一容器而牺牲其密度。

## Testing Decisions

用户已确认以下测试边界并授权发布规格。本轮只写规格，不运行测试或真实来源。

- 主行为 seam：现有 TodayApplication 及其公开操作。复用可注入 clock、Vault exchange、record store、snapshot store 的 workflow 测试，新增任务／本地完成测试经应用入口驱动；检查返回视图、重读及持久数据，不测试私有函数调用次序。
- 现有先例：today_workflow、calendar_workflow、dated_notes_workflow、habit_snapshot_workflow；这些覆盖选定日期、bounded writes、来源投影和错误保留。新功能在同一层扩展，避免每个模块各建重复测试体系。
- 使用临时合成 Vault 和固定 clock；验证创建→修改→重读→重启、两个 Vault 隔离、历史归属，以及无关 Markdown 字节保留。不得使用真实个人记录作为可修改 fixture。
- 任务矩阵：明确行动／建议；手动增删改／取消；重复 producer 输入；重排保留手动状态；删除不复活；次日不自动顺延；缺失／损坏数据；旧请求与外部并发修改。
- 习惯矩阵：本地有／无 × 外部完成／未完成／未知；同日去重；取消后外部仍完成；新快照替换旧证据而保留本地；跨来源新 OR 规则；时刻与短句不计完成；滚动窗口与历史更正；损坏快照保留及无有效快照状态。
- 仅在应用入口无法观察 UI 时序时补充已有 frontend 行为测试模式：vault-selection、latest-request、dated-note-command。验证异步切换、错误呈现、输入保留和晚到响应，避免纯 CSS 字符串或复刻实现的断言。
- 最高验收 seam：真实 packaged Mac 应用。扩展现有 macos-ipc-workflow 及 UI driver 路径，通过用户操作核对选择 Vault、导入图片、重启偏好、保存失败和历史操作；应用行为测试与浏览器原型均不能替代此验收。
- 视觉验收对照认可原型，检查接近现用 Mac 窗口及较宽窗口，中英长文案、Today 三阶段、Calendar、Habits 展开历史、各颜色、无图片／浅图／较复杂图片。重点确认 B 位置、紧凑密度、三页相同底色与内容分层。
- 同步兼容性使用隔离的客户端同步测试 Vault，验证本地可用、离线保存、外部更新后的重读、文件替换／冲突、重启与实际文件恢复。报告本地成功与云端证据的区别；未验证的同步模式不能标为支持。真实账号／客户端环境不足时明确列为待验收，不用普通临时目录冒充通过。

## Out of Scope

- 手机、跨设备交互设计、应用自建同步、Google 账号直连、GitHub 存储、独立登录账号、会员或支付。
- 完整取代滴答、向滴答写回、应用直接运行 Dida365 MCP、后台轮询、应用内 Agent 对话或自动复盘重写。
- 习惯创建／目标编辑／删除、时间编辑器与目标阈值打卡；保留后续候选，不预定 3.1／3.5／4.0 版本号。
- 自动任务顺延、通用 backlog、重复任务系统、从任意文本猜测承诺、双语日记生成或内容翻译。
- 完整皮肤系统、背景图云端同步、Strava、新 dashboard 联动、面向任意用户的工作流教程。
- 重新设计 2.0、重新激活退役 Profile/Exercise、复杂备份系统或整 Vault 一键恢复。
- 本次 to-spec 不生成 implementation tickets，不修改生产代码、skill 或自动化，不运行真实每日流程。

## Further Notes

- 设计输入：[收敛稿](../../../.scratch/personal-dashboard-3/design-summary.md)、[讨论 Q1–Q15 与原型反馈](../../../.scratch/personal-dashboard-3/design-discussion.md)、[认可原型](../../../.scratch/personal-dashboard-3/prototype/README.md)。这些相对链接按正式 tracker 位置编写。
- 既有约束：[领域术语](../../CONTEXT.md)、[ADR-0002](../../docs/adr/0002-retire-exercise-profile-runtime.md)、[ADR-0003](../../docs/adr/0003-use-desktop-client-for-vault-cloud-sync.md)、[现行快照契约](../../docs/habit-snapshot-v1.md)。CONTEXT 中 Habits“不记录完成”描述属于 2.0；本规格新增独立本地完成。实施时须同步更新对应领域描述及被替代的完成型合并条款，不能让两套语义并行宣称有效。
- 后续 to-tickets 可细化序列化格式与接口命名，但不得推翻本文身份、数据所有权、增量合并、日期、错误恢复及来源边界。无需在 UI 暴露工程格式。
- 用户已基本认可整体 prototype，Habits 容器细调不是当前阻塞项。原型使用合成资料和内存状态，不构成持久化或 packaged Mac 交付证据。
- 发布 ready-for-agent 表示规格已可供下一阶段使用，不自动授权执行 implement、外部 producer 接入或安装切换。
