# 06: Habits 本地打勾与来源合并

**What to build:** 用户在紧凑习惯行内记录本地完成，合并外部证据后正确展示勾选、来源与周次数，并保留独立正本。

**Blocked by:** None (can start immediately)

**Status:** resolved

Type: task

- [x] 保留左摘要、每日锚点、紧凑周列表、近七天及展开历史；完成型行中间加入小勾选框，使用 catalog 稳定 key，不写死示例习惯／目标。
- [x] 本地完成独立存于 Vault，绑定 lived date，重启及快照替换不丢失；取消只撤回本地。外部仍完成时保持合并勾选并轻量解释，区分本地状态与合并状态。
- [x] 每来源先选最新有效观察，再以任一有效完成合并，同日最多一次；明确替代旧跨来源冲突计零并更新相关领域／契约说明，保留日期、来源资格等旧约束。
- [x] 时刻、Short record、threshold-only、partial 不自动计完成；无证据为未知。周目标分母与时间型分组不变，不引入创建／编辑目标或时间编辑器。
- [x] 新快照替代其外部投影而不永久累积旧外部完成，不删除本地；缺失、损坏、过期及未覆盖区别呈现；本地历史不随十二周窗口被清理。
- [x] 应用操作测试覆盖本地有无×外部完成／未完成／未知、重启、取消、快照更新、错误保留、窗口滚动、并发与双 Vault 隔离；UI 有来源解释与双语固定标签。

## 执行上下文

先读同一 effort 的父规格与 map、项目领域术语和 ADR-0002／0003，核对前置票的完成证据及代码已在当前 checkout；仅有状态文字不够。原型入口及来源由 map 提供。若绝对路径打开的 ticket 来自主 checkout 而代码在 worktree，应将依赖成果带入所工作的 checkout，不能在缺前置的旧代码上继续。

按 implement 使用已约定的应用操作 seam 做行为测试，必要时沿用前端异步测试；各票保留自身可演示结果，不把基础验证推迟到整体验收。完成后按 code-review 审查、提交本票相关改动到当前分支，保留其他工作。认领／完成时更新本票与 map，附测试、提交、限制的 Answer；不关闭或修改父规格。

不新增外部服务／依赖，不复活退役 Exercise/Profile；不修改或运行日常 skill、Dida365、自动化。合成测试与 packaged 验收不得操作真实个人记录。

## Answer

Habits 的 completion 型行现在使用 catalog 稳定 key 提供紧凑本地勾选框，并将本地状态与外部来源分开呈现。合并规则先在单一来源内选最新有效观察，再对来源执行完成 OR；本地完成和外部完成同日只计一次，撤回本地不会撤回或遮蔽外部完成。时刻、Short record、threshold-only、partial 和无证据仍不被推断为完成，目标分母、时间型分组及既有历史结构保持不变。

本地正本采用 schema v1，保存于 Selected Vault 的 `life/.personal-dashboard/habit-completions/v1/completions.json`。记录绑定 lived date、habit key、operation ID、target binding 与 revision，保留 append-only change history 和幂等 no-op receipt；重启及外部快照替换后仍可重读。外部快照只替代外部投影，不累积旧外部证据，也不清理十二周窗口以外的本地记录。损坏或不支持的本地正本不会被当作空数据覆盖；同一应用生命周期保留上一个有效合并视图，重启后 fail closed。条件写、冲突恢复、双 Vault 隔离、未来时间戳及倒序历史均在应用 seam 验证。

验证通过：51 项完整 frontend 测试、199 项完整 Rust 测试、`npm run check`、Rust format、shell syntax 与 diff whitespace 检查；双重 Standards／Spec 审查最终均无 actionable findings。release `.app` 重新构建后，隔离合成 Vault 的 `local-habit-completion` packaged Mac 场景通过，覆盖本地完成、文件持久化、重启、外部快照替换、合并来源、仅撤回本地、640×520 紧凑布局和中英固定文案，并验证 rebuildable 外部快照逐字节不变。

提交：`feat(habits): add Vault-local completion`。限制：本票只允许在当前 Habits 视图记录 catalog completion 型习惯；历史日期更正属于 07，跨客户端 Drive 兼容与完整原型对照仍分别属于 08／09。本地写入沿用同卷条件替换与 recovery 边界，不宣称消除所有不合作外部 writer 的竞态；未修改或运行真实 Vault 个人记录、日常 skill、Dida365 或自动化。
