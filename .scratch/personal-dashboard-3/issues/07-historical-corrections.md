# 07: Calendar 历史任务与习惯更正

**What to build:** 用户从 Calendar 打开过去日期，更正任务和本地习惯记录，保存到该日且保留原复盘与更正痕迹。

**Blocked by:** 04 Today 右侧当天任务, 06 Habits 本地打勾与来源合并

**Status:** resolved

Type: task

- [x] 复用日阅读界面支持历史任务增删改／完成取消、历史本地习惯补勾取消；始终显示目标日期，不误存到今天。
- [x] 记录事件归属日期与实际修改时间、对象及可追溯变化，保留已有复盘正文，点击不自动运行 Agent。
- [x] 习惯沿用 OR 合并和取消解释；窗口外已保存本地记录可按日更正，缺少可验证 catalog／外部覆盖显示未知，不臆造历史目标。
- [x] 选择空日期不写空记录；显式操作才进行有边界的写入。未来日期不记录已发生完成。
- [x] 测试快速切日／Vault 切换晚到请求、并发更改、失败恢复、重启与无关正文保留；真实 UI 演示过去日期更正后 Today 不受污染，新增文案提供双语。

## 执行上下文

先读同一 effort 的父规格与 map、项目领域术语和 ADR-0002／0003，核对前置票的完成证据及代码已在当前 checkout；仅有状态文字不够。原型入口及来源由 map 提供。若绝对路径打开的 ticket 来自主 checkout 而代码在 worktree，应将依赖成果带入所工作的 checkout，不能在缺前置的旧代码上继续。

按 implement 使用已约定的应用操作 seam 做行为测试，必要时沿用前端异步测试；各票保留自身可演示结果，不把基础验证推迟到整体验收。完成后按 code-review 审查、提交本票相关改动到当前分支，保留其他工作。认领／完成时更新本票与 map，附测试、提交、限制的 Answer；不关闭或修改父规格。

不新增外部服务／依赖，不复活退役 Exercise/Profile；不修改或运行日常 skill、Dida365、自动化。合成测试与 packaged 验收不得操作真实个人记录。

## Answer

Calendar 打开的过去日期现在复用完整 Today 任务区，并新增该日的本地习惯更正区。任务增添、改名、完成、取消完成和删除始终绑定所选 lived date；历史视图展示实际修改时间与 append-only change history，删除后保留只读 tombstone 和删除 trace。返回 Today 会重新打开当前日期，不会把历史任务带到今天；这些操作不接收或运行 Agent，也不改写已有 Daily Record 复盘。

历史习惯沿用 completion 型 catalog stable key 与既有 OR 合并规则。补记或撤回只改变 Vault 内的本地 completion 正本；外部仍完成时合并勾选保持完成并解释来源。过去周只使用精确 `goalHistory.weekOf`，否则明确显示目标未知；快照覆盖外明确显示外部未知。运行期快照／本地正本损坏时保留上个有效历史读数；重启后若 catalog 缺失，已持久化的 habit/date 仍以“显示名称未知 · 稳定 key”呈现并可更正，但不会凭空创建新 key/date。空白日期仅阅读不创建文件，显式任务或习惯操作只创建各自 versioned JSON，未来事实写入被拒绝。

验证通过：55 项完整 frontend 测试、207 项完整 Rust 测试、`npm run check`、Rust format、shell syntax 与 diff whitespace 检查；最终 Standards／Spec 双重审查均无 actionable findings。release `.app` 重建后，隔离合成 Vault 的 `historical-corrections` packaged Mac 场景通过：从 Calendar 打开 2026-09-07，在 UI 完成任务全生命周期与习惯补记／撤回，逐条验证 2026-09-08 的实际修改时间、可见删除 tombstone、中英文案、重启持久化及 Today 无污染，并验证原复盘和外部 Habits 快照字节不变。

提交：`feat(calendar): add historical corrections`。限制：本票只更正 Dashboard-owned 任务与本地 habit completion，不修改外部来源、目标或实际日常 skill；Google Drive 客户端兼容和最终整体原型对照仍分别属于 08／09。条件替换与 recovery 缩小并保留并发失败的恢复边界，但不宣称消除不合作外部 writer 的最终文件系统竞态；未修改或运行真实个人 Vault、Dida365、自动化或 Agent 流程。
