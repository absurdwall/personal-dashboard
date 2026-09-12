# 05: 规划任务增量接收与重排保留

**What to build:** 兼容规划生产者提供的明确行动进入真实任务界面，重排和重复读取保留用户完成、修改及删除意图。

**Blocked by:** 04 Today 右侧当天任务

**Status:** resolved

Type: task

- [x] 定义并验证 producer/reader 兼容输入与稳定来源身份；明确行动进入任务，建议不进入，拒绝非法或部分候选而不破坏已有正本。
- [x] 合成 producer 输入经实际接收／重读入口显示在 Today；重复输入幂等，不靠每次渲染解析自由文本推断任务。
- [x] 重排保留完成与手动改名；删除后旧候选不能复活。之后明确重新安排采用可区分新身份，不借重复旧候选绕过删除。
- [x] 提供昨日任务及未确认状态供后续规划读取，不自动生成今日义务；点击不触发 Agent 或改写已存在的复盘。
- [x] 对合成输入执行往返、重排、删除、再次明确安排、并发更改测试，真实界面展示保留结果；本票不修改或激活真实 skill、Dida365 或自动化，交付说明明确真实接线尚未实施。

## 执行上下文

先读同一 effort 的父规格与 map、项目领域术语和 ADR-0002／0003，核对前置票的完成证据及代码已在当前 checkout；仅有状态文字不够。原型入口及来源由 map 提供。若绝对路径打开的 ticket 来自主 checkout 而代码在 worktree，应将依赖成果带入所工作的 checkout，不能在缺前置的旧代码上继续。

按 implement 使用已约定的应用操作 seam 做行为测试，必要时沿用前端异步测试；各票保留自身可演示结果，不把基础验证推迟到整体验收。完成后按 code-review 审查、提交本票相关改动到当前分支，保留其他工作。认领／完成时更新本票与 map，附测试、提交、限制的 Answer；不关闭或修改父规格。

不新增外部服务／依赖，不复活退役 Exercise/Profile；不修改或运行日常 skill、Dida365、自动化。合成测试与 packaged 验收不得操作真实个人记录。

## Answer

已交付 schema v1 的规划任务交换契约。daily-flow producer 只写独立的 `life/.personal-dashboard/day-task-plans/v1/YYYY/YYYY-MM-DD.json`，Dashboard 在 Today 明确打开／刷新时先完整验证，再以 stable `taskId` 与 `sourceReference` 增量合并到任务正本。action 进入 Today，suggestion 只验证不入库；错误日期、版本、字段、文字或重复身份会整批拒绝，已有任务仍可见、可编辑且正本不被部分改写。Calendar、Habits 摘要和本地 Today 保存使用不接收计划的读取路径，生产者错误会保留到下一次明确刷新。

重排仅占用 active、unconfirmed daily-flow task 的槽位；manual、completed 和 tombstone 保留状态及相对边界，用户改名不会被上游文字覆盖。删除后的原身份不能复活，旧来源换新 task ID 会被拒绝；再次明确安排必须同时使用新 task ID 和新来源。公开 `planning_day_task_context` reader 返回日期、revision、target binding、稳定身份、来源及 `unconfirmed`／`completed`／`deleted`，可供未来流程读取昨日事实，但不会自动顺延或创建今日义务。

验证通过：43 项 frontend 测试、完整 Rust 179 项测试、`npm run check`、Rust format、shell syntax 与 staged diff 检查；双重 Standards／Spec 审查最终均无 actionable findings。release `.app` 重新构建后，隔离合成 Vault 的 `planning-tasks` packaged Mac 场景通过，覆盖 action／suggestion、重复读取、用户改名、完成、重排、删除 tombstone、非法旧来源、新身份再次安排、输入错误期间本地改名、显式刷新、重启、中英来源文案及 Daily Record hash 不变。

提交：`feat(dashboard): merge structured planning tasks`。限制：本票只交付兼容文件契约、Dashboard 接收端和 reader；没有修改或激活真实 daily skill、Dida365、MCP 或自动化接线。生产者必须使用同卷原子替换发布完整输入；Dashboard 的条件写与 recovery 缩小冲突窗口，但不宣称消除所有不合作外部 writer 的竞态。
