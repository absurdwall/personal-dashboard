# PDEX-SPEC-02 — 本地 ticket 拆分草案

Date: 2026-10-11
Stage: proposal awaiting breakdown approval; not ticket publication
Parent: PDEX-SPEC-02
Canonical specification: [完整正文](refinement-spec-2026-10-11.md)
Frozen spec snapshot: `0b0d727b23166ba1ccf9708656ab2bf00f6188ed`
Working branch: `codex/dashboard-experience-refinement-spec`
Proposed IDs: PDEX-19–35; not yet allocated as tracker Work Items
Implementation: not started

## 拆分原则

每张功能票是一条从用户操作到真实保存/读回、再到界面与测试的完整路径。
复用既有 Task、Daily Record、Habit application 边界及现有测试，不先造水平
schema/API/UI 队列。没有发现必须单独先完成的广泛机械重构；必要小型抽取在
对应垂直切片中完成，避免为未知实施方案建立前置工程。

依赖只表示交付所需能力：共享任务详情让 Today/Calendar 可复用；完整父子
操作菜单需要父子关系；Habit 后续功能需要持久定义与目标周期历史。仅修改
同一模块不构成阻塞，可在执行阶段安排先后并解决合并冲突。

每张票都要求：稳定身份、旧数据兼容、真实业务结果读回、适用的冲突/失败
处理及重开验证；变化区域有界，不改未要求的全局外壳、字体、配色、导航。
实现前固定实际 App 基线，后续检查保留区域。单张票的检查不替代最终整合
验收，也不授权安装正常 App 或关闭父 spec。

## 提议的完整切片

### PDEX-19：紧凑 Task 编辑与单行快速添加

**Blocked by:** None (can start immediately).

**What it delivers:** Tasks 保留列表和右栏；单一可编辑标题，已有任务默认聚焦
Content，更大的内容区，紧凑清单/排期入口及同行 Save/Cancel。新建和修改共用
可在右栏或浮窗承载的编辑行为，单行快速添加在创建前可选日期、目标清单。

**验收重点：** 保存后重开一致；Cancel/冲突保留规则正确；开始/结束和清除
结束在同一区域；窄窗口可操作；原列表密度不变。不开始 Today/Calendar 的
详情入口迁移，不引入自动保存。创建后原状态/来源/历史继续保留。

### PDEX-20：普通 Task 的父子关联和嵌套

**Blocked by:** None (can start immediately).

**What it delivers:** 添加子任务、关联/换/解除父任务、父详情的直属子任务列表
形成完整持久化路径；子任务可继续嵌套，仍按自己的清单、日期和状态参与各视图。

**验收重点：** 独立完成不级联；禁止自引用、循环和无效身份；父删除不删子，
恢复不覆盖子后来换掉的关联。旧调用更新其他属性不清父关系。右栏按已完成的
编辑宿主整合；本票不要求先重做该宿主才能证明关系、保存和列表行为。

### PDEX-21：清单文件夹及分组汇总

**Blocked by:** None (can start immediately).

**What it delivers:** 创建/改名文件夹，移动清单，箭头展开收起，点名称按原清单
汇总任务；文件夹汇总中创建任务的目标清单明确可选，清单可在文件夹外。

**验收重点：** 一层文件夹；删除分组不删清单/Task；归档清单不重新进入日常
待办；Inbox/All/Today 含义保留；组内添加仍是单行入口；保存重开后身份和
分组一致。不改变 Task 日期/状态，不引入清单副本。

### PDEX-22：Task 优先级及排序筛选

**Blocked by:** None (can start immediately).

**What it delivers:** 高/中/低/无可设置、保存、读回，并可按优先级排序和筛选。

**验收重点：** 旧 Task 默认无；默认排序保留，同档顺序稳定；状态和归档入口
不丢；其他入口更新不会清掉优先级。与标签组合的最终行为在整合票核对，不
要求标签先存在。没有四象限或紧急/重要字段。

### PDEX-23：Task 标签及跨清单筛选

**Blocked by:** None (can start immediately).

**What it delivers:** 创建/复用多个标签、关联/移除、按标签筛选；标签改名保留
关联，删除标签只解除标签关系。任务跨清单仍用同一标签身份。

**验收重点：** 重复名称和空值处理、旧数据缺省、保存/重开、其他调用不误清；
筛选不搬移或删 Task，不引入标签树。与优先级筛选组合在整合票验证。

### PDEX-24：Today 日间概览与就近任务详情

**Blocked by:** PDEX-19 — 使用同一套紧凑 Task 编辑行为承载详情浮窗。

**What it delivers:** 大窗口默认紧凑概览、精细放大与完整 lived-day 入口；点击
时间轴 Task 就近看/改，不跳到底部，保存或关闭保持背景位置。长标题省略但
卡片边界/点击区域完整，重叠项目可选。

**验收重点：** 1280×800/720、830×758、680×560 的概览与可读性；旧 Task
时间点/区间、已有拖动和空白拖选仍可用。仅去掉底部重复详情，不删普通任务
或事实区、不按原型把当日任务列表搬到右侧，不改变 Morning/Evening。

### PDEX-25：宽泛安排的原措辞、拖动与当前安排保存

**Blocked by:** None (can start immediately).

**What it delivers:** 未拖动的“下午”仍显示“下午”；主动拖到16点后保存为
“约16:00”。精确区间移动保留时长，可靠绑定的近似/宽泛安排都能拖动；编辑
或取消 Daily Record 的当前安排保留 Morning baseline。

**验收重点：** 默认 anchor 没有保存副作用；实际记录读回；不生成事实/完成；
冲突和取消恢复；无法可靠绑定时不猜写。与 PDEX-24 的新密度组合由最终整合
验证，不把视觉高度改动当成本票的逻辑前置。

### PDEX-26：取消 Task 时间与统一右键/More 操作

**Blocked by:** PDEX-19 — 共享详情及紧凑排期入口；PDEX-20 — 完整父子操作。

**What it delivers:** 行右键和详情 More 共用排期、移动清单、状态、删除、讨论
与父子动作；“取消时间安排”清 time/end 而保留日期，Task 仍在当日列表和
Calendar，删除是另一动作。

**验收重点：** 每个菜单动作保存/读回同一 Task、按状态启用且可发现；未设置
结束时间不出现大清除按钮；历史和恢复行为保留，不扩展 TickTick 全菜单。

### PDEX-27：Calendar 所选日新建与 Task 浮窗

**Blocked by:** PDEX-19 — 复用紧凑创建/详情编辑行为。

**What it delivers:** 先选日期，再用顶部加号新建，日期带入且可改；点 Task
在月历上方打开编辑浮窗。关闭/保存保持月份、所选日期和滚动位置。

**验收重点：** 三处视图是同一 Task，创建不补造 Daily Record；点日期仍右侧
回顾并可 Open full Today。仅移除被顶部入口替代的大新建表单；原月历、标记、
回顾及下方当日任务保留，无新增周视图/双击/右键创建。

### PDEX-28：中国和美国节日轻量标注

**Blocked by:** None (can start immediately).

**What it delivers:** 月历可同时显示中、美节日，有总开关及地区选择；本地显示
设置重开保留，节日不会挤占任务或增高日期格。

**验收重点：** 本地数据/规则带核验来源与覆盖，至少当年和下一年，覆盖不足
不编造；不建 Task/Daily Record，不加服务/依赖/提醒。不更改既有月份布局。

### PDEX-29：Collaboration 背景、输入和语音的窗口配合

**Blocked by:** None (can start immediately).

**What it delivers:** 保留 A/C 的聊天空间，以限高、独立滚动、就地收起的背景
浮层改善长 context；输入、发送和语音停止可操作，转写按需在输入下方出现，
停止后进草稿再由用户发送。

**验收重点：** 特别验证1280×720的背景＋转写裁断情境及窄窗口长内容；使用
真实 dictation/草稿流程而非原型模拟，保留字体、模型/effort、会话和排队语义，
不改全局外壳或加审批层。

### PDEX-30：Slash 多候选上下键选择

**Blocked by:** None (can start immediately).

**What it delivers:** 先核实已存在的上下键处理与真实候选供给，只修多候选
selection 缺口；保留 Enter/Tab 补全、Esc、输入法和现有视觉样式。

**验收重点：** 两个以上合法测试候选可选择且不发送；旧参数/光标保留；真实
仅有 `/retro` 不冒充多个生产命令。不新增虚构 command 或另一执行模型。

### PDEX-31：新增本地 Habit 并直接打卡

**Blocked by:** None (can start immediately).

**What it delivers:** 顶部加号创建本地 Habit，设置名称、每日/每周目标、开始
日期及可选 emoji/分组后，立即在原今日列表打卡；本地定义和完成在重开后仍在。

**验收重点：** stable key、旧 sourced Habit/阈值兼容、同日和双来源去重、
撤回本地不抹外部、创建重试不重复；snapshot 刷新不移除本地定义，不要求先
去 TickTick 创建。既有汇总与今日列表保持，新能力不是写入 derived snapshot。

### PDEX-32：Habit 编辑与下周期目标修订

**Blocked by:** PDEX-31 — 复用真实本地定义、创建表单和打卡路径。

**What it delivers:** 已有 Habit 可通过可发现的编辑入口和右键进入与新增相同的
设置窗口；改名/图标/分组保持身份，目标以 revision 从下个周期生效。

**验收重点：** 周目标下周、日目标次日；current/pending 清楚；待生效目标可
再改或撤回；真实跨日/周和重开后生效，旧周期用旧目标。频率切换和开始日期
不重写历史，外部刷新不覆盖设置。单项详情里的编辑入口由下一票接入。

### PDEX-33：按选中 Habit 显示完整历史详情与统计

**Blocked by:** PDEX-32 — 使用保留的身份、完成和适用周期目标历史。

**What it delivers:** 默认仍是原汇总/今日列表；点左侧 Habit 才在右侧看详情，
可返回。展示本月/累计达标天、当前/最高连续达标、记录和已有编辑入口。

**验收重点：** 历史读取突破主面板12周限制；daily 按天、weekly 按达标周，
旧周期用当时目标；完整与有限覆盖、未知、已知下界区分。重开一致，不把
未勾选或缺来源当作已知失败，不默认进入新统计工作台。

### PDEX-34：Habit 停用、历史保留与恢复

**Blocked by:** PDEX-33 — 在已可用的单项详情和历史统计中完成生命周期操作。

**What it delivers:** 详情可停用，日常区收起；从停用入口查看历史和恢复同一
Habit，目标与完成保留。停用期不要求打卡，恢复后的连续段有清楚边界。

**验收重点：** 跨周期、待生效目标、刷新和重开后一致；停用不删除/填失败，
连续不穿过停用间隔，历史最高保留。不加入永久删除历史或外部生命周期写回。

### PDEX-35：跨功能整合、真实打包验收及保留区域核对

**Blocked by:** PDEX-21、22、23、24、25、26、27、28、29、30、34。

这些是最终功能叶节点，已间接覆盖19、20、31、32、33，不重复声明传递边。

**What it delivers:** 将本轮已验证切片整合为源码绑定的实际 App 候选，完成真实
保存/重开、拖动、跨视图、旧数据兼容以及宽窄窗口检查，提供用户可审阅的验收
记录和已知限制。未要求变化区域与原 App 基线比较，证明没有顺带换肤。

**验收重点：** 父子/文件夹/标签/优先级/菜单组合、Today/Calendar共同Task、
Habit目标/停用/历史/来源刷新、context＋voice＋slash；失败/重试及未知统计。
记录准确 base/branch/commits、构建来源、自动检查、真实界面证据与缺口。使用
私有 synthetic profile/Vault，不因票发布自动安装 App、合并 main 或关闭父 spec。

## User Story 覆盖对照

| PDEX ticket | 主覆盖的 PDEX-SPEC-02 stories |
| --- | --- |
| 19 | 4–14 |
| 20 | 16–23 |
| 21 | 15、24–29 |
| 22 | 30–31 |
| 23 | 32 |
| 24 | 35–39、46–47 |
| 25 | 40–45、50 |
| 26 | 33–34、48–49 |
| 27 | 61–65 |
| 28 | 66–67 |
| 29 | 51–57 |
| 30 | 58–60 |
| 31 | 68–72、77–79、87 |
| 32 | 69、75–76、83–85 |
| 33 | 73–74、80–82 |
| 34 | 86–87 |
| 35 | 1–3、88–91，以及所有切片的组合验收 |

全票共同保留来源绑定、revision/失败结果、重开及未要求区域边界；不能只把
这些责任放到最后一张票。最终票另核对组合行为，不重复实现各票功能。

## 依赖与发布边界

共有17张拟议票、19条直接依赖，无循环和冗余传递边。初始可执行 frontier 为
19、20、21、22、23、25、28、29、30、31；“可执行”仅说明没有票间 blocker，
当前尚未发布、claim 或授权实施，不是要求并行开十个任务。

用户确认后：沿用既有本地 tracker，每张票一个独立完整 body，编号从19继续，
Triage `ready-for-agent`，Lifecycle `open`，parent PDEX-SPEC-02，直接 blockers
写入票体及 map。保留这份提案、发布 commit、source readback 与后续 Git
branch/base/commit 对应。GitHub 不查询，旧票不重开。

本提案不修改父 spec 正文或其索引，也不创建17条占位 tracker 记录。批准票的
拆分与发布仍不同于请求开始实现，后续执行按明确请求进入 claim/implementation。
