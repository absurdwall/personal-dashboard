# Collaboration redesign — proposed ticket breakdown

Type: ticket-breakdown-proposal
Status: approved by the user on 2026-10-09
Date: 2026-10-09
Parent: [PDCR-SPEC-01](spec.md)
Spec revision reviewed: 61bd09d
Implementation: not-started
Publication: published as PDCR-01–12; current state is in [local map](map.md)

This file preserves the reviewed breakdown. The user approved it on 2026-10-09;
the numbers now correspond to PDCR-01–12. Full per-ticket bodies and current
state are in the local map, not this review record. Publication does not start
implementation or modify/close the parent specification.

## Slicing approach

- Each implementation slice delivers a user-observable action or developer
  workflow through the existing app facade, persistence and applicable UI.
  It is not a separate backend/schema/skill/UI/test layer project.
- The first slice makes skill/tool loading easier to maintain while retaining
  existing capabilities, and demonstrates the change with an actual saved
  daytime fact. Necessary interface prefactoring precedes the new behavior
  inside the affected slice; no broad rename or structural reorganization.
- The second slice adds compatible work-history data alongside old stored
  messages and exercises it through one complete action. Existing sessions
  remain readable while later slices adopt the common representation.
- Meaningful deterministic verification is part of each slice. The last two
  tickets validate actual Codex/app behavior and live Dida separately; prototype
  or mock success is never substituted for those outcomes.
- Newly needed historical reads are delivered with the corresponding domain
  slices, so personal retro can depend on real Task, Daily Record and local
  Habit read results. Optional external connectivity does not gate local retro.
- Independent branches in the graph represent independent prerequisites, not
  authorization for concurrent edits in one checkout or parallel Vault writes.

## Proposed slices

### 01 — 用统一 usage skill 完成并核验一条白天记录

Blocked by: None

交付：用户自然描述白天发生的事实，Agent 从统一 skill 获得实际可用能力，
使用既有业务操作保存到正确 Daily Record，并如实报告结果。

验收要点：

- 建立 usage 包的装载与版本契约，集中协作指导/工具描述，不丢失既有
  Task、Daily Record、Habit、memory 等能力；只有实际注册的工具可被广告。
- 明确请求直接保存；讨论与请求 proposal 分开；不新增第二个语义授权器。
- 隔离记录可读回，日期正确；只记录事实不重新编造 arrangement，baseline
  与无关内容保持。保存历史失败时不重复写入业务数据。
- 无关的可选连接缺失不影响本地保存；自动早间计划能力范围不扩大。
- 通过现有 Collaboration application 与真实 file-backed adapter 验证。

### 02 — 显示并保存真实工作过程与最终回复

Blocked by: 01

交付：同一条记录执行时能看到实际过程说明、可用思考摘要和工具活动；
完成后工作过程折叠，最终回复可读，重新打开仍能回看。

验收要点：

- 从实际 runtime 事件接入 commentary、summary、tool、receipt、final 与终态；
  保留 item/call 身份、顺序和时间。没有摘要时不补写，系统状态与生成内容区分。
- 完成快照权威合并，重复 item/delta 不重复显示；final 文本不提前结束 turn。
- 实际失败/重试可展开，普通界面无原始 JSON，Markdown 列表和可信内部导航可用。
- 相应 canonical 保存后能更新页面，保存、刷新与聊天落盘结果分开。
- 批量保存增量但可靠保留关键结果；旧会话兼容，reopen 无虚构历史。
- 现有 watch/session 入口贯穿后端与 renderer；不为每类工具另造 UI 通道。

### 03 — 排队、停止、纠正与未知结果恢复

Blocked by: 02

交付：执行中普通消息排队；用户停止后队列暂停，发送纠正成为新轮；
之后可以继续队列并核对未知结果，不重复已经保存的修改。

验收要点：

- 按提交时的 Vault/target/lived-day 上下文处理，执行时读取新事实；跨 04:00
  或切换页面/日期不重定向原请求，不使用 steer。
- pending stop 与已停止区分；阻止尚未开始的动作，已确认效果保留，在途结果未知。
- 纠正先于暂停队列处理；继续/移除待执行消息显式可控，不撤销既有修改。
- receipt/readback 核对只更新对应结果；恢复不整轮重放，未知不阻塞无关工作。
- 超时、transport 失败、历史落盘失败和重启都保留可核对状态；保持 delayed-save
  timeout 修复、draft/Cmd+Enter/听写与 Vault 切换边界。

### 04 — Task 与清单协作反映到真实对象和页面

Blocked by: 02

交付：用户通过对话维护 Task/list，含新增、修改、改期、完成、放弃、重开、
归属与已有删除/归档能力；回复和 Tasks/Today/Calendar 显示同一对象。

验收要点：

- 复用已有操作，不复制 Task store；对象 stable ID、revision 与原始目标保持。
- Task date 和实际完成日期分开；保留无关字段/历史，冲突后重新读取而非覆盖。
- 成功 receipt 包含具体名字、日期与改动，链接打开正确对象，相关页面按效果更新。
- 可读取指定时期相关 Task、状态和实际完成信息，为个人查询和后续 retro 提供事实。
- mixed-intent 请求的 Task 与记录分别形成结果；请求 review 时保留 proposal 行为。

### 05 — 计划、晚间复盘与历史记录协作

Blocked by: 02

交付：早间计划、白天重排、晚间复盘、short record 和历史纠正均通过对话
落到原 Daily Record，并可由回复打开指定日期/phase。

验收要点：

- 重排保留 morning baseline；dated fact、current arrangement 与 review 分开。
- 历史纠正保留原文/纠正痕迹和无关内容；short record 不变成 Habit evidence。
- 指定期间读取能返回日期、baseline/current arrangement、事实与 reviews，
  无记录保持 unknown，而非为 retro 补写历史。
- 结果和页面使用既有正本；明确请求直接执行，requested proposal 不提前保存。
- 自动早间计划仍为 initial-plan-only、不覆盖已有计划、不增加其他写入能力。

### 06 — 本地 Habit 补记、撤回与历史查询

Blocked by: 02

交付：用户指定 local-only 后可补记或撤回今天/历史 Habit completion，
相关页面准确显示本地证据，回复可以打开相应 Habit/date。

验收要点：

- 明确 local-only 时不调用 Dida 写入，completion 的 stable identity 和来源保留。
- 阈值达标与真实事件时间分开；dated notes 不被当作 completion。
- 指定历史期间读取 local completions、unknown 与可用 provenance；陈旧 projection
  与 canonical 事实分开，为个人查询和 retro 提供有范围的事实。
- local 保存、snapshot 和页面刷新分别报告；单独修复显示不重复补记。
- before/after 或原/结果 revision 可关联到 effect，重试/撤回不覆盖其他日期。

### 07 — 映射 Dida Habit 与 snapshot 的独立结果

Blocked by: 06

交付：现有映射 Habit 可按既有默认 scope 分别处理本地与 Dida completion；
一端失败、未知或刷新失败时，另一端成功仍清楚成立。

验收要点：

- 使用当前已配置 native MCP 与唯一 counterpart identity；含糊关联澄清，不靠名称猜。
- 读回验证 external effect；撤回按原来源范围；local-only 回归无外部 mutation。
- 失败、unavailable、未确认与已确认分别保存；不因外部问题重复本地写入。
- producer 负责确定性的 coverage/mapping/生成，简单补记不要求模型重复组装全量证据；
  coverage 不足保留旧 snapshot，不降低校验来制造刷新成功。
- 独立刷新可恢复页面/projection，历史失败保留；本票 deterministic 验证不冒充 live Dida。

### 08 — 许可文档与背景更新保留可核验的修改

Blocked by: 02

交付：已有固定操作不足时，Agent 可在许可 Vault 范围窄改普通文档，或
通过既有 managed 操作更新用户背景；回复、读回和 evidence 能说明实际改了什么。

验收要点：

- 先读、窄改、读回，selected Vault 与 revision 绑定；保留无关文字和历史。
- 普通文件不绕过受管数据约束，app source/settings/其他路径不进入能力范围。
- 按该次请求/目标保存实际 before/after、revision 或受限 diff；相关页面按证据重读。
- 可核验受管变更使用共用 effect 契约；native file-change 的实际 diff 可关联，
  无法获取的证据显式 gap，Agent 文本不作为文件审计。
- 背景与单日事件分开，文档/背景与其他效果独立；不增加全 Vault watcher、
  自动备份、自动 rollback 或新的后台写入权限。

### 09 — 在 Codex 完成一次有证据的 workflow retro

Blocked by: 08

交付：开发者在 Codex 选 session、期间或执行身份，读取本地真实执行与变更
证据，生成可核查的 workflow retro，并联系现有代码提出改进。

验收要点：

- 补齐 evidence 的原请求/目标、配置版本、attempt、结果、时间、刷新、终态与
  实际可用 usage。隐私数据留在 app 私有本地存储，历史缺口和截断显式可见。
- 有可重复使用的 evidence 读取入口与 developer skill；不是只创建 SKILL 文件。
- 可发现成功前失败、冗余调用、错误日期/对象、可观察的覆盖、未知结果重放与
  报告/receipt 偏差，并引用具体执行及变更证据；事实和原因推断分开。
- 聚合 usage 不伪装成 per-tool 成本，没有 token 数据不估造数字或金额。
- 一组完整 synthetic evidence 与一次新的 actual execution 可由开发者核查。
- 不在 Dashboard 增加开发 command，不自动改 app/skill，不依赖 Desktop 完整业务 adapter。

### 10 — 在 Dashboard 完成 personal retro

Blocked by: 04, 05, 06

交付：用户输入 /retro 或自然语言后，得到指定期间的计划/实际、Task 和 Habit
分析、资料缺口、来源链接与可采用的建议。

验收要点：

- 使用同一个 usage skill；默认最近七个完整 lived days，并明确起止，可直接调整。
- 实际消费前三个领域的历史读取结果，不只依据聊天；计划、实际与未记录分开。
- Sparse history、陈旧 projection、无实际时间数据时，unknown 不变成失败或时间浪费。
- 可选来源不可用不阻塞本地分析，明确 coverage/provenance；不强制新连接。
- 默认只在对话报告，不自动改计划/背景/历史；用户随后要求采用某建议可正常执行。
- 无新增独立 Agent 或 keyword classifier；渲染用现有真实输出与内部导航。

### 11 — 真实 Codex 与 app 内完整交互验收

Blocked by: 03, 07, 09, 10

交付：对完整候选 app 进行可回看的本地/packaged 验收，证明真实 Codex 的
工作、保存、页面、reopen、两个 retro 与现有输入功能一致。

验收要点：

- 在隔离 synthetic Vault 使用实际 app/runtime/model，跑白天记录、mixed intent、
  部分失败/恢复、queue/stop/readback 及 reopening，而不是只运行模拟 reducer。
- 核对 canonical 文件与可见页面、折叠/展开/Markdown/导航，保留原型壳的产品体验。
- 旧会话/未知结果/跨 04:00/日期与 Vault 隔离、Cmd+Enter/新编辑/听写回归可核查。
- 真实 runtime optional phase/summary/usage 的支持或降级如实记录；自动早间计划范围
  和 delayed-save 消费不回退。
- 验收候选 revision/runtime/build identities 与 evidence 一致，workflow retro 能
  消费至少一组该候选的实际执行，personal retro 不改写历史。
- 标明本地与 external 验收区分；不因本票通过自动安装正式 app、合入 main、
  关闭父 spec 或声称 live Dida 已通过。

### 12 — 同一候选版本的 live Dida 核验

Blocked by: 11

交付：对已完成本地 native 验收的同一候选版本，在现有连接与获授权的隔离
目标上，核验真正的 Dida 写入、读回与 snapshot/source coverage。

验收要点：

- 只使用已授权测试对象和范围；记录环境与对象准备不足，不通过真实个人数据
  的试写来绕过验收前提。
- local-only 没有 external mutation；映射双端写入/核验、原来源撤回与 snapshot
  coverage 使用真实连接，各端与 projection/page 的结果独立。
- 保存实际身份、结果、读回及候选版本的证据；fixture 与模拟失败不是 live 成功。
- 若连接或隔离目标无法取得，明确记录未验收/阻挡条件并保留本地成功；
  不关闭本票或把完整规格宣称为已交付。
- 本票不是 release 授权；正式安装、merge/push、父 spec closeout 仍按后续范围处理。

## Dependency review

| Proposed number | Direct blockers | Why they gate this slice |
| --- | --- | --- |
| 01 | none | 现有业务与 runtime 可直接形成一条真实本地链路 |
| 02 | 01 | 基于已接入的统一 skill/operation 建立真实事件与结果呈现 |
| 03 | 02 | 停止/恢复需要已保存的 turn/item/effect 身份与可见历史 |
| 04 | 02 | Task 的结果与页面使用已形成的 common history/receipt 展示 |
| 05 | 02 | Daily Record 各 phase 复用同一事件、结果与链接契约 |
| 06 | 02 | Habit 日期/来源结果进入同一工作历史与刷新展示 |
| 07 | 06 | 建立在本地 Habit、local-only 与 canonical/projected distinction 上 |
| 08 | 02 | 文件/背景变更 evidence 关联到同一执行与可见核验结果 |
| 09 | 08 | 实际文档/受管 effect 证据可供复盘，08 已含 02 的执行历史依赖 |
| 10 | 04, 05, 06 | 三类历史读取及来源语义在各自可用行为中落实 |
| 11 | 03, 07, 09, 10 | 覆盖整套行为；其他实现票已由这些依赖传递覆盖 |
| 12 | 11 | 在同一完整候选上验 external，不接受早期候选的陈旧证据 |

Proposed graph has 12 nodes and 16 direct blocking edges. Proposed initial
frontier is 01 only. After 02, the distinct business/interaction slices can be
scheduled from the frontier; no extra linear dependencies are imposed.

## Coverage and closeout

- Skill/capability consolidation: 01, refined by domain slices 04–08 and 10.
- Real generated work/history, richer replies, legacy sessions and refresh: 02;
  competing input/stop/recovery behavior: 03.
- Task/date/list, Daily Record/baseline/history and local Habit: 04, 05, 06.
- Optional Dida and deterministic projection: 07; actual live evidence: 12.
- Narrow document fallback and background/effect evidence: 08.
- Developer evidence/usage/workflow retro: 09; personal retro: 10.
- Real runtime/app, old-history/input/scheduler regression and candidate identity: 11.

No additional horizontal “all schemas”, “all backend”, “all frontend”, generic
test-suite, or full-codebase-refactor tickets are proposed. If implementing a
slice reveals a genuine unbounded mechanical change, revise the graph before
expanding that ticket; do not silently absorb a broad rewrite.

This proposal does not decide Management source registration or final release.
Existing pending registration does not block the local ticket workflow. All approved criteria are retained in per-ticket bodies with stable IDs/blockers.
Record future local claims and evidence-driven state changes in the tracker.
