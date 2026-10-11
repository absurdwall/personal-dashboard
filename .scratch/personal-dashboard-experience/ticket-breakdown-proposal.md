# Dashboard experience — ticket breakdown proposal

Date: 2026-10-10
Parent: PDEX-SPEC-01, [complete specification](spec.md)
Status: approved by the user on 2026-10-10
Publication: eleven tickets published locally; unclaimed and not started
Scope: approved slices retained below; allocated PDEX-01–11 bodies are in the local map

## Slicing and prerequisites

Each functional slice delivers a visible behavior through the existing
application/persistence/UI boundary and verifies its own result. The final
slice checks the integrated packaged App; it does not defer all testing until
the end. Q1–Q4 stay settled.

No separate broad prefactoring ticket is needed at this point. Targeted source
binding and deterministic edit handling belong to the first usable plan-edit
slice. Task interval expansion preserves old callers and is delivered with
its editor and compatibility checks, rather than exposing a broken intermediate
API. If implementation later discovers an actual wide-refactor blocker, report
the concrete incompatibility before changing this graph.

Shared files or expected merge conflicts do not by themselves create blocking
edges. The readable-axis, list, Calendar and conversation changes each work
against existing sources. Dragging depends on the save semantics it invokes;
Evening entry does not depend on slash completion because it uses the existing
draft/session capabilities.

## 1: 在白天手动编辑具体计划并可靠保存

**What to build:** 用户点击 Current arrangement 的具体时间项目，使用时间编辑改变时点、起止或结束时间；保存到对应 Daily Record 后界面读回一致，重开仍正确。普通修改只更新当前安排和白天修订。

**Blocked by:** None (can start immediately).

Candidate acceptance:

- [ ] 精确时点和具体区间都有可操作的时间编辑；08:00–10:00 改为 10:00–12:00 后文件和重新读取的视图一致。
- [ ] 修改绑定可靠的计划身份、Selected vault 与修订，不靠同名标题、渲染下标或全局时间文字替换定位。
- [ ] 只改 Current arrangement 和白天修订，Morning baseline、事实、Task 和无关 Markdown 保持不变。
- [ ] 明确早间纠正及事实纠正继续走各自既有来源流程，原始证据与纠正痕迹保留，不把普通时间编辑变成双写。
- [ ] 兼容可安全识别的旧文档；遇到无法安全定位、外部修订、损坏或 Vault 切换时说明结果，不猜目标覆盖。
- [ ] 写入与修订一致保存；失败恢复已保存状态，未确认结果可重新核对，页面刷新失败不冒充文档保存失败。
- [ ] 合成 Vault、读回与新 application 实例验证上述行为；修改无需模型额度。

Coverage: stories 3–7, 20, 23, 25, 27, 63–67.

## 2: 将模糊计划定位并编辑时间精度

**What to build:** “午后”等宽泛计划在白天时间轴有明确的近似位置；用户可以编辑近似时间或显式切换为具体时点/区间，并保存原本或新选择的精度。

**Blocked by:** 1 — 在白天手动编辑具体计划并可靠保存.

Candidate acceptance:

- [ ] 早晨/中午/午后/傍晚或晚间按已定参考规则定位，显示原词或“约”，卡片高度不成为时长。
- [ ] 原始措辞、近似时点、精确时点和精确区间可区别读取；无法可靠定位的内容仍未定位。
- [ ] 相对时间只在有可靠记录上下文时定位，不随刷新时刻移动。
- [ ] 编辑近似时间仍落盘为近似时间；模糊与具体之间的转换只有在用户明确选择时发生。
- [ ] Morning 文字保留其自身来源的措辞，白天精度编辑不修改早间部分或事实。
- [ ] 真文档读回和重开保持精度，沿用第一票的身份、冲突与保存结果契约。

Coverage: stories 2, 14–18, 21–23, 26, 66.

## 3: 保持早间文字与可读的统一白天时间轴

**What to build:** Morning 是文字安排；Daytime 的计划、定时 Task 与事实使用一条刻度，冲突时临时并排，不冲突时整行，在常用和窄窗口里都能阅读、定位和选中。

**Blocked by:** None (can start immediately).

Candidate acceptance:

- [ ] Morning 仍为文字安排，不新增晨间时间轴，展示对应来源。
- [ ] Current arrangement、Task 与 Confirmed facts 同轴、有来源标记，不固定按来源分三列。
- [ ] 冲突条目临时并排且可选，无冲突条目占整行，卡片不会互相遮住主要操作目标。
- [ ] Lived day 边界、午夜后的日期标签和折叠时段内容可发现；已有内容不被折叠机制隐藏。
- [ ] 时间轴独立滚动，在常用和窄窗口可读；时间过去不把安排变成事实。
- [ ] 在真实渲染界面用既有精确计划、时间点 Task 和事实独立验证；后续新时间类型可以沿相同区间/精度契约接入。

Coverage: stories 1, 3, 8–13, 26–27.

## 4: 拖动计划并调整结束时间

**What to build:** 用户直接拖动白天计划或具体区间的结束边界，时间预览与实际保存一致；近似计划移动后保持近似，长拖动能从上午移到下午或晚间。

**Blocked by:** 2 — 将模糊计划定位并编辑时间精度 (which already requires 1).

Candidate acceptance:

- [ ] 具体区间整体移动保留时长，结束边界单独调整时长；时点不会自动变成区间。
- [ ] 模糊计划拖动后保存为新的近似时间，不产生精确时长。
- [ ] 采用已定吸附规则并支持边缘滚动；现存非整刻时间不会在读取时被改写。
- [ ] 拖动先预览，真实保存并读回后成为正式结果，沿用冲突、失败和未确认结果的恢复行为。
- [ ] 默认只改 Current arrangement；Confirmed facts 不具有此拖动写入行为，Morning 与 Task 不被联动修改。
- [ ] 同一操作具有非拖动替代编辑方式；通过实际指针操作及文件读回验证上午到晚间、重开、冲突失败的结果。

Coverage: stories 4, 19–27, 63–67.

## 5: Tasks 使用清晰勾选列表与所选详情

**What to build:** 用户在保留清单侧栏的简洁任务列表中勾选完成，点击任务查看和编辑详情；长内容与次要操作集中于详情，窄窗口仍可使用。

**Blocked by:** None (can start immediately).

Candidate acceptance:

- [ ] 清单侧栏与既有范围导航保留，列表行以名字和明确完成勾选为中心。
- [ ] 点击任务选择/查看详情与勾选完成互不误触；任务完成真实保存并在相关页面反映。
- [ ] 内容、日期、时间和清单归属可编辑；放弃、删除、重开和历史仍可访问。
- [ ] 详情编辑未改变的业务数据保持原值；不会因新的简洁显示丢失已有字段。
- [ ] 在窄窗口使用可返回详情或下方详情，不挤成固定多列工作台。
- [ ] 基于现有任务即可独立演示和检验，验证真实保存/读回与选择状态，而非只检查源码字符串。

Coverage: stories 38–44, 63, 65–67.

## 6: 保存 Task 计划执行时间段并兼容现有入口

**What to build:** 用户从真实 Task 编辑入口设置计划执行的起止时间，重开后仍保留；三个页面读同一 Task，现有对话和离线入口更新任务也不会丢失时段。

**Blocked by:** None (can start immediately).

Candidate acceptance:

- [ ] Task 编辑可以设置、调整、明确清除可选执行区间；真实保存和重开后起止日期/时间一致。
- [ ] 无日期、只有日期、单时间点的旧 Task 继续有效，没有虚构结束时间或数据重标。
- [ ] 跨午夜区间明确保留结束所属日期，非法区间不截断或翻转；现有 Task date 语义保持。
- [ ] Task、Today 和 Calendar 读取同一身份和区间；区间不变成 deadline、完成状态或实际耗时。
- [ ] Collaboration 与 daily-flow adapter 的读写契约兼容新能力；遗漏新字段保留既有值，明确清除才移除；旧调用修改内容/状态/清单不会丢失区间。
- [ ] 扩展保留绿色中间状态、已有身份与历史；共享任务和 adapter 集成测试验证保存、重复投递、旧入口更新和新实例读回。
- [ ] 对新的时段字段提供当前真实编辑入口，不仅落盘一个无法使用的 schema。

Coverage: stories 28, 31–37, 63–67.

## 7: 在白天时间轴选区创建与移动 Task

**What to build:** 用户从空白时间选区创建带执行时段的 Task，再拖到另一时段保持计划时长；三个页面呈现同一保存结果。

**Blocked by:** 6 — 保存 Task 计划执行时间段并兼容现有入口.

Candidate acceptance:

- [ ] 选取时间范围后进入可编辑 Task 创建入口并保存真实日期、起止和同一 Task 身份。
- [ ] 整体拖动区间保持时长，结束时间可以通过 Task 时间编辑调整；时间点任务保持时点。
- [ ] 边缘滚动、吸附、午夜后的日期和无效范围处理符合规格。
- [ ] 保存后 Tasks、Today 和 Calendar 一致，重开不丢时间段；不创建 Diary 计划副本或实际活动事实。
- [ ] 已完成/放弃等状态继续按现有任务语义处理，不因为时间经过或卡片被移动改变状态。
- [ ] 真实指针交互和任务读回覆盖选区、移时、跨日、失败/冲突，复用已有持久化结果恢复。

Coverage: stories 12, 24, 28–36, 65–67.

## 8: Calendar 完整紧凑月历与记录状态

**What to build:** 用户在当前窗口看到整月等高日期格和最多四行预览，通过日期旁的小标记区分记录/复盘状态，并能进入完整日期详情。

**Blocked by:** None (can start immediately).

Candidate acceptance:

- [ ] 五行与六行月份在参考窗口中完整可见，日期格等高，不随任务数增高。
- [ ] 默认最多四行单行预览，更多数量位于日期行，预览不覆盖标记或溢出；完整项目仍可查看。
- [ ] 日期旁的小型“记/复”不占单独一行，缺失和读取失败区分；不以任务完成数推断复盘。
- [ ] 用户进入日期详情仍看到真实 Daily Record 和 Tasks，不创建另一份历史库。
- [ ] 检验常用窗口与窄窗口的真实布局，以及已有 Calendar 状态来源；新 Task 区间沿已扩展的共享读取契约显示。

Coverage: stories 45–50.

## 9: Collaboration 减负与 slash 命令补全

**What to build:** 用户在更简洁的持续会话界面输入 slash，发现并补全真正可用的命令，编辑后自行发送；现有协作输入与执行能力保持。

**Blocked by:** None (can start immediately).

Candidate acceptance:

- [ ] 删除重复标题，长背景说明按需显示，session 列表与主对话仍清楚。
- [ ] slash 显示真实命令，至少有已有 /retro；继续输入筛选，上下键/点击选择，Tab/Enter 补全，Escape 关闭。
- [ ] 候选开启时 Enter 不发送；选择命令仅插入可编辑草稿，不新增硬编码执行流程或虚构命令。
- [ ] 中文组合输入与普通含斜杠文本不误提交；Workflow Retro 不出现在 Dashboard 命令中。
- [ ] 草稿、听写、停止、排队、会话历史和工作历史沿用现有能力，减负不隐藏真实失败/恢复结果。
- [ ] 实际输入交互和已有会话/草稿行为验证，不以命令常量或 CSS 文本存在证明通过。

Coverage: stories 51–58.

## 10: Evening 一键进入带日期的复盘草稿

**What to build:** 用户从 Evening 开始所查看日期的复盘，进入适合的 Collaboration session，看到带正确上下文的可编辑草稿并自行发送。

**Blocked by:** None (can start immediately).

Candidate acceptance:

- [ ] 当前日与过去日期都有准确的入口措辞、session 目标日期与权威记录上下文。
- [ ] 适合会话可复用，重复点击不创建重复消息，不自动发送或标记已复盘。
- [ ] 已有草稿保留且继续方式清楚，不静默覆盖；草稿和目标日期遵循现有会话保存行为。
- [ ] 复盘沿用现有 skill 与业务操作，不复制 Daily Record，不推导实际活动。
- [ ] 用真实 session/draft 和 Calendar 状态读回验证进入前后及重复进入的外部行为。

Coverage: stories 59–62.

## 11: 验证同一打包版本的完整日常流程

**What to build:** 在同一个打包 App 中完成计划阅读/调整、Task 时间分配与勾选、整月查看、命令补全和晚间复盘入口的一次可核对流程，保留落盘、重开与实际 UI 证据。

**Blocked by:** 3 — 保持早间文字与可读的统一白天时间轴; 4 — 拖动计划并调整结束时间; 5 — Tasks 使用清晰勾选列表与所选详情; 7 — 在白天时间轴选区创建与移动 Task; 8 — Calendar 完整紧凑月历与记录状态; 9 — Collaboration 减负与 slash 命令补全; 10 — Evening 一键进入带日期的复盘草稿.

Candidate acceptance:

- [ ] 验收固定候选身份，使用隔离 Profile、合成 Vault 和受控时间，覆盖三个阶段与相关页面。
- [ ] 修改当前计划后文档/视图/重开一致，早间基准和事实独立；精确与模糊计划符合各自含义。
- [ ] Task 选区、移动、区间读回与完成状态一致，旧任务及旧对话/离线调用的保存兼容性保持。
- [ ] 五/六行月历、重叠条目、长拖动、清晰勾选和详情在常用及窄窗口可操作。
- [ ] slash 键盘/点击/中文输入法、草稿保留、目标日期与晚间入口验证通过，补全与入口均不自动发消息。
- [ ] 文档冲突、写入失败和未确认结果真实表达；正常模型额度耗尽不阻止确定性编辑。
- [ ] 各功能票自己的测试证据仍保留；汇总独立代码检查、自动测试和打包 UI 验收，不把未验证项目写成通过。
- [ ] 不修改个人真实数据，不从此票推断安装或远端发布已获授权，不关闭父 spec。

Coverage: story 68 and integrated regressions across stories 1–67.

## Candidate dependency graph

- 2 is blocked by 1.
- 4 is blocked by 2, which already requires 1.
- 7 is blocked by 6.
- 11 is blocked by 3, 4, 5, 7, 8, 9 and 10.

There are ten direct blocking edges. The proposed initial frontier is
1, 3, 5, 6, 8, 9 and 10. These are candidates only, not published or claimed
Work Items. Independent page changes are not artificially chained.

## Requested breakdown decision

Review the eleven slices, their size and the genuine blocking prerequisites.
Suggest merges/splits if useful. After the user approves, publish one full body
per ticket with the approved numbering, parent, triage, lifecycle and acceptance
criteria in the local tracker. Do not modify or close the parent specification.

## Approval and publication

2026-10-10: The user replied “可以” to the proposed eleven tickets, granularity
and blocking graph. Published one complete file per ticket as PDEX-01–11 with
ten direct blocking edges. The candidate wording above preserves the reviewed
proposal; the [map](map.md) and individual ticket bodies are current canonical
records. No implementation or parent-spec change was performed.
