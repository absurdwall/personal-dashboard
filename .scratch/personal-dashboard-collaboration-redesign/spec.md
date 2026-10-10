# Personal Dashboard — Skill-led Collaboration、工作过程与 Retro

ID: PDCR-SPEC-01
Status: ready-for-agent
Lifecycle: closed
Stage: human-accepted delivery closeout
Implementation: accepted iteration; remaining scope explicitly deferred
Date: 2026-10-09
Closed: 2026-10-10
Canonical tracker: [local map](map.md)
Test boundary: confirmed by the user on 2026-10-09
Execution boundary: 原始发布阶段仅发布设计；后续用户授权本地实现、复审及更新安装。2026-10-10 用户接受本轮交付并延期剩余范围；不进行 GitHub 操作、push 或 main merge。

## Accepted closeout and explicit scope deferral

The user accepted the overall interaction for their current examples and
explicitly requested closure after the typography correction, independent
review and local App update. That work is complete at reviewed/installed
product `499cdc1`; durable local records are committed on
`codex/collaboration-redesign-integration`. [Typography/install evidence](evidence/typography-follow-up.md)
and [remote handoff](remote-handoff.md) retain exact identities and receipts.

Parent closure is a **human acceptance and scope-deferral decision**, not a
claim that every original criterion passed. PDCR-03 unknown-Dida scope,
PDCR-11 human voice/affected native acceptance and PDCR-12 live Dida remain
unverified follow-up records outside this closed iteration. The separate
automatic InitialPlan retries also require later work. See the explicit
[deferred scope](deferred-follow-ups.md); unchecked criteria and historical
native evidence retain their original meanings and source qualifications.

Authorization was directly verified from review chat
`01a1229c-6bc2-7472-9dc9-16f3daccb6d3`, user messages
`01a126b1-9ca8-7861-90b0-2940759d2c0f` and
`01a126b1-a45b-7562-9856-2f7741586402`. Original requirements below remain as
published; this closeout records the later decision rather than rewriting them.

## Problem Statement

用户希望在 Personal Dashboard 中像在正常 Codex 会话中一样持续交流：告诉 Agent 今天发生了什么、计划如何变化、任务是否完成，Agent 自然判断需要读取和更新什么，并把实际工作完成。现有实现已经具有大量可复用的业务能力，但能力、指导内容、执行过程与展示方式没有形成一致的体验。

用户难以从当前对话看清 Agent 是否仍在工作、调用了什么、失败后怎样恢复，以及最终回复是否等于实际保存。一条简单的 Habit 更新可能出现大量技术细节和重复刷新报告；本地保存、Dida 操作、Habit snapshot 与页面显示的结果又可能不同。最终成功也可能掩盖重复失败、额外 token 消耗或不正确的覆盖。

现有交互缺少两个不同目的的复盘能力：用户需要基于过去的计划、Task、Daily Record 与 Habit 事实进行 personal retro；开发者需要在 Codex 中基于执行证据和 app 代码进行 workflow retro，以改善工具、skill 和协作流程。两者的角色、资料和可执行行为必须分开。

本轮重新组合已有能力并补齐过程与证据，不以查明某一次旧故障为前提，也不以重新搭建一套个人数据系统为目标。

## Solution

以 Collaboration session 的持续对话为主界面。Codex 依据完整交流和当前事实决定如何工作；一个完整的 Dashboard usage skill 包集中组织协作指导、能力描述、必要参考和确定性辅助脚本。App 复用现有业务操作提供执行能力，承担运行、保存、事件传递与界面呈现。不会新建 Personal Dashboard MCP。

对话有三个可见层次：当次生成的过程说明、可展开的 Collaboration work history，以及最终回复。工作历史保留实际工具活动、运行时提供的可读思考摘要、失败和恢复；完成后默认折叠。最终回复说明具体做了什么，必要时采用 checklist，并链接到实际对象或记录。保存、失败、未确认和展示仍旧分别表达。

用户执行中继续发送的普通消息排队；需要改变当前工作时先停止，再发新消息。停止不撤销已完成修改，不把在途结果变成已取消，也不自动重放旧请求。

在 Dashboard 中通过 /retro 或自然语言请求 personal retro。另提供开发侧 workflow retro skill，在 Codex 中检查 app 留存的执行证据和代码，找出重复失败、不必要的工作、错误修改和反馈偏差。Dashboard 仍是用户进行个人管理的地方。

本轮交付 Dashboard 内完整使用及 Codex 内 workflow retro。Usage skill 结构保持可复用，但 Codex Desktop 完整访问 Dashboard 业务能力不属于本轮验收要求。

## User Stories

1. As a Dashboard 用户, I want 在一条持续会话里说明我的情况和要求, so that 我不必先把话分成固定类别或手动选择工作流程。
2. As a Dashboard 用户, I want Agent 理解同一段话里多个相关意图, so that Task、计划、白天记录与 Habit 能按实际需要分别处理。
3. As a Dashboard 用户, I want 明确要求被直接执行, so that 我不必重复确认已经授权的保存。
4. As a Dashboard 用户, I want 真正含糊的对象或要求得到简短澄清, so that Agent 不会改错记录或把讨论当成执行。
5. As a Dashboard 用户, I want 要求先看建议时得到 proposal, so that 我可以在保存之前审阅具体内容。
6. As a Dashboard 用户, I want Agent 读取当前事实而不是只依赖旧对话, so that 它不会根据过时任务或习惯状态执行。
7. As a Dashboard 用户, I want 新增、编辑、改期、完成、放弃、重开与删除 Task, so that 对话能完成现有 Task 管理工作。
8. As a Dashboard 用户, I want 对话使用现有 Task list 与归属管理能力, so that 不产生聊天专属任务副本。
9. As a Dashboard 用户, I want Task 日期和实际完成日期分别维护, so that 补记完成不会擅自改动计划日期。
10. As a Dashboard 用户, I want 制定早间计划或白天重排, so that 当前安排能跟上我的情况，同时保留 morning baseline。
11. As a Dashboard 用户, I want 只记录发生的事实也可以, so that 不需要为一次白天记录重新编造整天安排。
12. As a Dashboard 用户, I want 保存或修正晚间复盘与 dated short record, so that 真实活动及必要纠正可以留在相应 Daily Record。
13. As a Dashboard 用户, I want 为今天或过去日期补记、撤回 Habit completion, so that 历史记录可以准确维护。
14. As a Dashboard 用户, I want 本地与映射外部 Habit 的结果分别保留, so that 一端失败不掩盖另一端已完成的修改。
15. As a Dashboard 用户, I want 明确要求只记本地时不调用外部写入, so that 我能控制这次修改的范围。
16. As a Dashboard 用户, I want 未连接或不可用的可选工具被如实说明, so that 本地能力不会因无关连接失败而消失。
17. As a Dashboard 用户, I want 工具不覆盖的普通文档更新仍可在许可范围内完成, so that 固定操作不会成为日常协作的死板边界。
18. As a Dashboard 用户, I want Agent 保留无关文字和现有历史, so that 小修改不会悄悄覆盖其他记录。
19. As a Dashboard 用户, I want 看见消息已接收、排队或正在执行, so that 等待时知道它有没有开始处理。
20. As a Dashboard 用户, I want 看到当次实际生成的过程说明, so that 能理解 Agent 为什么正在读取或处理某件事。
21. As a Dashboard 用户, I want 有可读思考摘要时可以查看, so that 能了解可公开的过程，而没有摘要时不会看到编造的解释。
22. As a Dashboard 用户, I want 工具活动默认用自然语言展示, so that 无需阅读 JSON 和内部对象 ID 也能理解工作。
23. As a Dashboard 用户, I want 必要时展开某次工具活动的实际状态与细节, so that 可以核查失败或未确认的结果。
24. As a Dashboard 用户, I want 过程说明和最终回复分开, so that 中途的一句话不会被误认为任务已经结束。
25. As a Dashboard 用户, I want 完成后的工作过程自动折叠且仍可展开, so that 日常对话简洁，同时能回看失败与恢复。
26. As a Dashboard 用户, I want 最终回复报告具体名字、日期及改动内容, so that 知道究竟做成了什么。
27. As a Dashboard 用户, I want 多项结果必要时呈现为 checklist, so that 能快速区分已完成、失败和待澄清事项。
28. As a Dashboard 用户, I want 从回复打开对应 Task、Daily Record 或 Habit, so that 可以直接查看真实结果。
29. As a Dashboard 用户, I want 保存结果和 snapshot、页面刷新结果独立显示, so that 不会把旧画面误认为保存失败。
30. As a Dashboard 用户, I want 成功变更及时反映在相应页面, so that 不需要等整个 Agent turn 结束才看到已完成的本地工作。
31. As a Dashboard 用户, I want 普通补充消息按队列处理, so that 新消息不会偷偷改变当前执行。
32. As a Dashboard 用户, I want 停止当前工作后发送纠正, so that 可以明确改变方向。
33. As a Dashboard 用户, I want 停止时保留已完成修改与未知结果, so that 不会误以为停止等于撤销。
34. As a Dashboard 用户, I want 核对未知结果后继续未完成的部分, so that 恢复不会重复已确认写入。
35. As a Dashboard 用户, I want 重新打开 app 后能查看会话、结果和已保存的工作历史, so that 中断不会丢失已经记录的过程。
36. As a Dashboard 用户, I want 输入草稿、听写、快捷发送与历史会话保持可用, so that 新展示不会破坏现有输入体验。
37. As a Dashboard 用户, I want 通过 /retro 或自然语言复盘一个时期, so that 能查看计划与实际活动的差异。
38. As a Dashboard 用户, I want personal retro 分析 Task 与 Habit 记录并指出资料缺口, so that 建议有事实依据。
39. As a Dashboard 用户, I want 资料不足时不被断言浪费了多少时间或习惯失败, so that 复盘不会把未知变成负面判断。
40. As a Dashboard 用户, I want 复盘建议与数据修改分开, so that 分析不会自动重排计划或改写历史。
41. As a Dashboard 开发者, I want 在 Codex 运行 workflow retro, so that 可以结合运行证据和代码改善协作系统。
42. As a Dashboard 开发者, I want 查看最终成功之前的失败和重试, so that 隐藏在成功回复后的工具问题可以被发现。
43. As a Dashboard 开发者, I want 检查不正确的日期、对象、覆盖和来源结果, so that 能定位实际修改与用户意图之间的偏差。
44. As a Dashboard 开发者, I want 根据可用 usage 和耗时发现不必要的工作, so that 简单任务不会长期使用昂贵的绕行方案。
45. As a Dashboard 开发者, I want retro 结论链接到具体执行和变更证据, so that 推断可以核查，缺失证据不会被假装补齐。
46. As a Dashboard 开发者, I want skill、工具描述和报告指导集中维护, so that 不会在 host 与 skill 中积累相互冲突的行为规则。
47. As a Dashboard 开发者, I want 新旧会话兼容且真实验收独立记录, so that prototype、测试通过和实际交付不会混为一谈。
48. As a Dashboard 用户, I want 已启用的自动早间计划保持原有受限范围, so that 手动协作增强不会扩大后台写入权限。

## Implementation Decisions

### 1. 复用已有业务与执行边界

- 保留本地 Codex App Server、现有连接和模型设置、selected vault、现有 Collaboration session 与 Task/Today 业务层。调整组合与接口，不重新建立 Task、Habit 或 Daily Record 数据库。
- 复用现有动态工具与 app-owned 操作处理受管数据。Skill 指导 Codex 如何使用能力；host 负责注册可执行能力、校验参数与调用业务层。App 手动操作继续使用相同业务实现。
- Codex 从完整对话判断用户意图；不添加关键词路由、第二个语义授权判断器、强制分类流程或每次保存必须经过的 proposal。参数、stable ID、selected vault、revision、重复防护仍由机械约束负责。
- Human turn 与 automatic morning-plan turn 的能力分别提供。自动轮只执行原有的一次 initial plan、保留已有计划、读取来源；不新增 Task、Habit、背景或普通文件写入权限。

### 2. 一个 Dashboard usage skill 包

- 扩充现有 collaboration skill 为完整 usage 包，覆盖现有 Tasks/lists、Daily Record phases、short records、local/mapped Habit、许可文档与背景更新、personal retro，以及独立来源结果的报告方法。
- 由包集中维护协作行为指导、工具描述、相关参考和有实际用途的确定性辅助脚本。固定脚本用于确定的数据处理和重复动作；内容理解、工作选择与建议由 Codex 负责。
- 整合当前散落在 host、每轮输入和能力说明中的重复行为指导。Host 保留执行与权限配置，不形成第二套创作或个人管理规则。不为旧 wrapper 再叠加同义 wrapper。
- 工具 schema 与业务 adapter 是真实能力；不能把文本 skill 描述当成已注册工具。每轮仅广告实际可用的能力，记录使用的 skill 版本与工具集合版本。包中资源如何装载属于 app 集成契约。
- 复用 existing daily-flow 规则中的 lived day、morning baseline 和事实区分；不制造冲突版本。Skill 保持可被其他 Codex 环境复用的结构，完整 Desktop 业务调用不作为本轮要求。

### 3. 工具、可选来源与结果

- 受管 Task、Daily Record transition、short record、Habit completion 与背景更新使用现有 app 操作。普通文档 fallback 仅在既有 selected-vault 权限范围内进行，先读、窄改、保留无关内容并读回；不会用任意文件覆盖绕过受管格式、revision 或对象约束。
- Dida MCP 与其他已经配置且获授权的连接按需要使用。无关连接缺失不阻塞可完成的本地工作；不可用的被请求来源必须报告未完成或未确认。
- Existing completion-type Habit 沿用既有 local + 唯一解析的映射 Dida counterpart 默认范围。明确 local-only 时只改本地；外部关联含糊时澄清对象。撤回按原作用来源核对，避免以名称相似推断同一对象。
- 对每个 effect 保存具体来源、对象身份、日期、操作、核验状态与 receipt。Tool call 完成或返回文本不直接等于业务保存成功。失败、未确认、已确认效果以及未请求来源分开。
- Habit canonical completion、外部 completion、Habit snapshot publication 与页面数据刷新是独立结果。刷新失败保留先前有效 projection，不改写 canonical 保存结论。相关页面在已确认效果后针对实际变更失效并重读，避免重复写入来修复显示。
- 不要求模型为一次简单补记手工重新组织重复的全量历史证据。优先把确定的查询覆盖、映射校验和 snapshot 生成留在现有 producer/adapter 内部，保持来源身份、覆盖验证和旧 snapshot 保留规则。

### 4. 实际事件驱动工作过程

- 扩充运行消费与 session 投影，保存有稳定身份的 turn/item 事件。使用 execution、runtime thread/turn、item/call 身份、顺序与时间将事件关联到原始请求；晚到的事件不能进入其他 session 或新 selected vault。
- 区分 agent commentary、final reply、运行时公开的 readable reasoning summary、工具开始/结束/失败、业务 receipt、错误、停止与 turn terminal state。工具 label 可由 UI 映射；自然语言过程说明与思考摘要取自实际运行输出。
- 不预编某种思考或固定业务阶段，不在摘要缺失时补写思考，不展示原始隐藏推理。接收、排队、等待连接等客观系统状态可以使用固定 UI 文案，并与 Agent 生成的说明区分。
- 过程可以在读取、解释、工具和回复之间往返。出现 final reply 文本不单独结束执行；实际 turn 终态和已知效果共同决定展示。多个 message item 保持边界，不把全部 delta 拼成一条最终正文。
- 完成 item 作为该 item 的权威最终内容；重复投递、delta 与完成快照要合并，不能重复追加。保留失败尝试，恢复只更新对应结果，不删除原历史。
- 优先复用现有 session 查询与 watch 入口，以可增量读取的事件投影向 UI 交付过程。允许有节制地批量合并 token delta；关键结果和终态需可靠持久化。避免每个 token 重写整个会话或给每个工具建立独立 UI 通道。
- 以实际安装的 runtime 能力验证事件 schema 与 phase/summary 可用性。缺少 optional 元数据时降级为可用工具活动和过程说明，不用新文档字段虚构已支持能力。

### 5. 会话持久化、队列、停止与恢复

- 原始消息在执行前保存。捕获消息提交时的 selected vault、target date、当地时间与 lived-day 背景；排队越过午夜或用户浏览其他日期不改变原请求目标。执行时再读当前业务事实。
- 普通消息在当前执行后按现有队列顺序处理，不调用 steer。执行中正常完成可继续下一条；用户停止后队列暂停并保留待处理消息，纠正作为新消息先处理。队列可明确继续或移除尚未执行的消息。
- 请求停止后尽快向 runtime interrupt 并阻止尚未开始的新 action；真实停止确认与 pending stop 区分。已发出的文件或外部操作可能完成，不宣称撤回，也不自动做补偿写入。
- 已确认效果保留；未知效果通过原 receipt 与当前来源只读核对。核对后只继续未完成的部分，不重放原始整段请求。未知 effect 不阻塞无关读取或其他对象，但不得盲目重试同一可能已完成的修改。
- 保留现有 total/inactivity timeout 与 bounded interruption 修复，不回退为短的固定 whole-turn deadline。超时、transport 失败或 app 重启后恢复真实状态与未知结果，不能把未收到最终事件等同于未写入。
- 以可兼容的版本化存储保存工作历史与 evidence，复用现有 session/operation source of truth。旧会话仍可读，原文与已保存 receipt 保留；没有的过程、usage 和变更证据标记不可用，不重新生成历史。
- 历史与效果的保存故障单独报告。业务写入成功但历史落盘失败时，保留现有 saved-result 核对机制；不能为了重建聊天记录再次执行写入。
- 完全退出 app 后不新启动后台协作；保留已有自动早间计划的 app-running/当日补生成行为，不新增常驻服务。界面切页本身不停止执行。

### 6. App 内的对话呈现

- 使用用户已通过的 Dashboard app 壳内 Collaboration 原型为基线，保留 app 导航、session 列表与日期背景；不交付一个孤立的聊天网页替代 app，不新增固定编辑工作区。
- 显示当前执行状态、可见过程说明、可展开的工作历史和最终回复。结束后工作历史默认折叠，用户可查看完整顺序、失败和恢复；用户正在阅读或手动展开时避免刷新不断夺走阅读位置。
- 工具活动默认显示易读动作、对象和结果。较深详情按需展开真实 tool、状态、经筛选的参数和诊断；凭据、认证数据及无关原始输出不进入普通对话。
- 支持必要的 Markdown 段落、列表、checklist 与可信内部链接，正文仍由 Codex 生成，不强制每个答复套固定模板。内部导航按 stable object/date 解析，不以模型生成 URL 决定业务写入。
- 最终报告围绕具体对象、日期和改动。多来源或多项任务可以 checklist；对话与建议可以普通文本。UI 从结构化 receipt 补充实际效果，不把生成正文解析成执行命令，也不让生成文字覆盖核验结果。
- 仅涉及未完成外部动作或旧展示时准确说明，不把完整技术诊断与多次 producer stage 重复贴到正文。Source read activity 与失败恢复可在工作历史查看。
- 保留 Send 在 microphone 右侧、Cmd+Enter 接收后清空已消费草稿、发送失败可保留输入、较新编辑不被晚到刷新覆盖、听写可编辑与 session/date/vault 切换的现有边界。

### 7. Personal retro

- /retro 是同一个 usage skill 的可发现入口，普通自然语言也能启动；不添加独立 Agent、硬编码意图 classifier 或另一套数据系统。
- 支持用户指定近期或历史期间；无明确期间时采用最近一个完整 lived-day 周期的七天并说明具体起止日期，用户可直接调整。不是反复确认才能开始的门槛。
- 读取该期间和相关 baseline/current arrangement、dated facts/reviews、Tasks 的日期及实际完成信息、local/mapped Habit 和 provenance。若 canonical/projection 覆盖不同，明确资料范围与 freshness。
- 报告有依据的计划与实际差异、Task 完成/延期情况、Habit 模式、可能有帮助的下一步建议，并给出来源链接。没有记录保持未知，short record 不充当 Habit completion，threshold check-in 不充当真实起床时间。
- 仅在有实际时间资料时分析具体时间分配；不能凭未完成 Task 或空白记录断言时间浪费。外部资料按可用性选用，不为了提供复盘强制新增来源或 computer use。
- 默认是对话内报告，不自动重写历史、保存独立 retro 文档或执行建议。用户随后要求采取某个建议时，按普通协作指令完成相关变化，不添加新的统一确认层。

### 8. Workflow retro 与可核验证据

- 单独提供开发侧 workflow retro skill，在 Codex 中读取本地执行 evidence 和 repo。Dashboard 不新增开发 command，也不让 app 内 Agent 修改产品代码。
- 每轮记录原请求及捕获目标、runtime/skill/tool-set/model/reasoning 配置、turn/item/call 关联、尝试与时间、结果核验、错误/重试/恢复、来源效果、刷新状态及最终回复。个人证据只保留在本机现有 app 私有存储，不进 Git。
- 受管写入记录足以核验变更范围的原 revision 与结果 revision、目标和 before/after 或受限 diff。普通 Vault 文件 fallback 尽可能通过同一许可读写边界捕获实际变更证据；native file-change 事件有实际 diff 时可关联，但不能把 Agent 的文字当成文件审计。
- 无法捕获的直接写入、来源历史或旧版本信息必须有 evidence-gap 标记。不能承诺查明所有旧覆盖或未观测删除，也不引入全 Vault watcher/完整备份系统来掩盖缺失。
- 有 runtime usage 时保存其实际口径，区分可用 input/output/cached/总量字段；没有时保持 unavailable。聚合 turn usage 不伪装成精确 per-tool 成本；耗时和调用次数是独立观察，不凭它们编造 token 数或金额。
- Workflow retro 可以按 session、period 或执行身份查阅，发现重复失败后成功、异常重试、冗余读取、绕行、冲突与错误对象/日期、证据中的意外覆盖、未知结果重放及报告与实际效果不一致。
- 输出 findings、引用的执行/变更证据、可能原因、受影响能力和改进建议；事实与推断分开。复盘本身不自动改 app/skill；用户在 Codex 要求开发改动时再进入正常工程流程。
- 不新增远程 observability 服务。留存与体积管理保持本地、有界：可批量合并 delta 或省略大型无关输出，但不能静默丢弃失败、终态、关键变更 receipt；截断、清理或 evidence 缺口要显式可见。

## Testing Decisions

### 已确认的主要验收入口

主要使用现有 Collaboration application 的消息提交与 session 查询接口，通过真实业务 adapter 和隔离数据，验证“发送消息 → 数据修改与独立来源结果 → 工作历史/最终回复 → 页面更新 → 重启回读”。同一批保存的 evidence 用于开发侧 workflow retro 验证。用户已于 2026-10-09 确认这个边界。

不为每个内部 helper 建立独立测试缝。现有可替换 App Server transport 是注入真实形状事件、失败和延迟的主要边界；新事件 observer 如有必要只加在这个边界，业务执行继续走原 application 与 persistence。Frontend 验证用户可观察的呈现与输入行为，而非匹配函数名字、文件拆分或 JSON 内部布局。

### 现有先例与需覆盖的行为

- 沿用 existing Collaboration workflow tests 的 synthetic vault、file-backed store、fixed clock、queue/stop/recovery 先例；复用 Task operation、Daily Plan、evening review、Habit completion 与 snapshot 的业务集成测试。
- 沿用 stdio App Server 消费的 timeout/delayed-save 先例，验证 item/delta/完成快照的顺序与重放，不以仅调用 mock 高层 run 方法代替传输边界覆盖。
- 沿用 frontend composer/draft-refresh、conversation regressions、action-results、habit/native-file refresh 的行为验证方式；对本次新增事件和 Markdown 展示运行实际 production renderer/handlers。
- Workflow retro 使用已保存的标准执行 evidence fixture 和实际读取入口。验证能指出指定失败/重试/变更偏差、引用依据并保留未知；不把某一句模型文案写成 brittle snapshot，也不以 skill 文件存在证明复盘有效。

| 场景 | 必须观察到的结果 |
| --- | --- |
| 普通白天事实与一个 mixed-intent 请求 | 正确对象/日期分别保存，未要求重排时 current arrangement 不被编造，其他字段和历史保留 |
| 用户要求先看 proposal 后确认 | 请求 review 时不写入；随后明确确认直接执行，不再要求重复授权 |
| 真实形状 commentary、summary、工具、final item 交错 | 工作历史有序且保留 item 边界；final 文本到达不提前结束 turn |
| 无 reasoning summary 或旧 phase 元数据 | 不生成假摘要，仍展示真实可用过程和工具活动 |
| 重复 item、完成快照、刷新/reopen | 无重复正文或 receipt，历史与 terminal state 一致 |
| 首次工具失败、修复后成功 | 失败仍可回看，最终效果只计一次，第二次读取使用当前 revision |
| local 保存成功、Dida 失败或 unavailable | 本地成功独立成立，不因外部失败重复本地写入 |
| local-only Habit completion | 不发生 Dida 写入，相关页面展示正确本地证据 |
| completion 已保存但 snapshot/page 刷新失败 | 保存状态不回退；旧展示有准确标记，单独刷新不重写 completion |
| 普通消息排队与正常完成 | 不 steer，按捕获的原 target 顺序处理，界面不阻塞浏览 |
| 停止前无写入、停止时已确认或正在写入 | 分别保留未执行/已确认/未知；队列暂停，纠正可以新轮处理 |
| readback 确认在途请求实际完成 | 更新核验结果而不重放 mutation，停止历史仍可查看 |
| 跨 04:00、排队跨天、Vault/date 切换 | 原请求目标不漂移，晚到事件不显示在另一 Vault/session |
| 历史落盘失败或 app 重启 | 已保存业务效果不重复，旧会话可读，缺失过程明确 unavailable |
| 异步 draft refresh 与 Cmd+Enter/听写 | 已发送输入不复活，新编辑/日期草稿不丢失，Send 布局保持 |
| Personal retro 的 incomplete/sparse 历史 | 报告正确期间和来源，计划/实际分开，未知不被写成失败或时间浪费，无自动写入 |
| Workflow retro 的成功前失败、冗余调用、usage 缺失、错误 diff | 指出有证据的问题并可定位；不可观察的信息保持未知，无自动产品修改 |
| 自动早间计划回归 | 只写初始 plan，不覆盖已有 plan，无新增 Task/Habit/背景/文件修改；延迟保存仍可被消费 |

### 真实与模拟验收分开

- Prototype 只证明交互方向获认可，不证明 runtime 事件接入、持久化、权限或外部写入。
- Deterministic tests 用模拟 runtime/source events 覆盖竞争、失败、未知与重复；验证实际业务存储，不只验证回复文字。
- 真实 Codex 验收使用隔离 synthetic vault 与实际 app/runtime，覆盖至少白天记录保存、混合操作、工具失败后的恢复、停止及重新打开后的工作历史；同时核对 canonical 文件和 app 页面。
- Live Dida read/write/readback 与 snapshot/source coverage 单独记录。在尚未得到授权隔离对象或连接不可用时记未验收，不以 fixture 替代真实成功。
- 使用实际 app 壳的 packaged/native 验收核对展开历史、最终报告导航、队列/停止、草稿和听写回归。Build/test 通过不单独把整体 spec 标为完成。
- Workflow retro 至少对一组已保存 synthetic 完整链路和一组新的实际执行 evidence 进行人工可核查的复盘；真实 usage 缺失仍可验收诚实降级，不接受编造消耗。

## Out of Scope

- 新 Personal Dashboard MCP、Agents API、额外服务或依赖，以及本轮 Codex Desktop 完整业务读写 adapter。
- Steer、并行修改同一 selected vault、协作多用户/云同步体系，或替代 Task/Daily Record/Habit 的数据系统。
- 固定共享编辑工作区、每个操作必须先 proposal、第二个语义授权/意图分类器。
- Computer use 集成、模型隐藏推理展示、预编或事后虚构思考过程。
- 在 Dashboard 内进行 app development、运行 workflow retro 开发命令，或让 retro 自动修改产品/skill。
- 新的定时 personal/workflow retro、后台常驻 app 服务或扩大自动早间计划权限。
- 完整 Vault/外部历史备份、通用 undo/跨来源 transaction、保证找回旧版本未记录的删除或覆盖，以及无法取得的精确 token/成本审计。
- 本次发 spec 同时拆实施票、开始实现、修改真实个人数据、安装发布、GitHub 上传或本地合入 main。

## Further Notes

- 本轮 local spec、后续 tickets 和 execution tracking 是用户主动指定的正本，遵循现有 triage vocabulary。GitHub 其他历史规格不变；本轮相关方向冲突以本 spec 与 ADR 0005/0006 为准，不反向声称旧实现已经符合新规格。
- [Map](map.md) 保存唯一执行入口、阶段与状态；后续拆票需要单独授权。Ticket ID、依赖、claim、完成证据与 commit 回执均保留在同一个本地 tracker，之后恢复 GitHub 也不自动迁移。
- [Prototype review](prototype-review.md) 记录实际 app 内原型与用户认可边界；原型本身在独立 throwaway branch 留作 primary source，不能当作产品代码合入。
- [Source inventory](source-inventory.md) 是 2026-10-09 的实现与测试入口快照。这里允许具体路径帮助后续 agent 定位；implementation decisions 不依赖这些路径保持不变。
- 推荐实施顺序是先整理 skill/能力与结果契约，然后跑通一条白天记录的真实事件、保存、报告、页面与 reopen 链路，再扩展 Tasks/Habits/optional sources 与个人 retro、workflow evidence/retro，最后完成回归与真实验收。这个顺序不是已经发布的 ticket graph。
- 工作量主要集中在 runtime 事件持久化/恢复、frontend 增量呈现、证据与两个 retro，而不是重写已有业务操作。待拆成有依赖和验收的 tickets 后估算，不把早期讨论的天数当交付承诺。
