# 05: Calendar 任务摘要与右侧操作

**What to build:** 用户在月历扫描任务和 Review 状态，在右侧查看并操作同一天的完整任务。

**Blocked by:** 02 任务状态与可恢复历史, 03 清单分类、归档与恢复

**Status:** resolved

Type: task

- [x] 保留现有月历与 Review 的无记录／未复盘／已复盘／读取错误语义；月格显示约两条任务摘要和 +N，窄窗口可减为一条并截断，但不退化为纯色点。
- [x] 点击日期或 +N 均选中该日并更新现有右侧完整列表，不增加独立浮窗；保留进入 Daily Record 的入口，键盘可操作，选中状态明确。
- [x] 右侧能查看详情、新建及使用同一 Task 操作编辑／状态更正／改期；新建默认所选日期与 Inbox。用 Tasks 验证共享身份，无需依赖 Today 页改造完成。
- [x] 按 Task date 放置，晚完成不移动，显式改期才移动且不重复；完成与放弃可区分，归档任务仍可在历史日历查到。
- [x] 未来无日记日期可有任务，无日期任务不放月历；浏览空日期不创建日记，任务保存不改已有 Review。快速切日／月／Vault 及失败不污染另一目标。
- [x] 通过合成密集日、历史归档日、晚完成、未来日验证月格与右侧一致、重启和日期更正；实际 UI 检查宽窄布局、摘要、键盘及双语，保留现有日历结构。

## 执行上下文

先读本 effort 的父规格、map、原型核对、项目领域词汇及适用 ADR；父规格保持不变。使用已包含全部前置实现的 checkout；仅有 resolved 状态不足以证明代码依赖已集成。认可原型是设计来源，不是可直接提升的生产代码。

沿用用户确认的应用操作测试边界及必要前端异步检查，每票保留自己的可演示结果；新增固定文案同步覆盖中英文。使用合成隔离资料，保留真实个人数据、旧文件及其他未提交工作。不新增依赖／外部服务，不复活 Exercise runtime。

本次票发布不启动实现。后续执行时按项目流程记录认领、验证、完成证据和限制，更新本票及 map；不因合成测试通过就声称 packaged 或真实个人流程验收完成。仅 08 的范围允许定点修改实际 daily-loop 指引和接线，所有票均不授权运行真实个人流程、写滴答或改变自动化时间。

## Answer

已将 Calendar 接入共享 Tasks 正本，同时保留原有月历、Review 状态和 Daily Record 入口。后端 `calendar_month` 为每个日期返回最多两条未删除任务摘要及 `+N` 溢出数量；摘要包含任务状态，归档清单任务仍可在历史日期出现，未安排任务没有月历位置。月格保留可读任务文字，窄窗口至少保留一条文字并支持截断；完成与放弃通过样式和状态标签区分。

选中日期或月格内的 `+N` 都沿用现有日期按钮、键盘导航和右侧 Calendar panel，不创建浮窗。右栏从 `read_daily_view` 读取所选日期的完整 dated task set，并复用 Tasks／Today 已有的 task id、target binding、revision 与创建、编辑、改期、完成、放弃、恢复、删除、完成记录更正命令；新建默认选中日期和 Inbox。切日期、切月、切 Vault 或离开 Calendar 会失效旧请求并保留可恢复草稿，读写失败不会覆盖另一目标。

验证证据：

- `npm run check` 通过；`node --test tests/frontend/task-presentation.test.ts tests/frontend/task-surface.test.ts` 通过（19 项）。
- `cargo test --manifest-path src-tauri/Cargo.toml --test calendar_workflow calendar_month_includes_bounded_task_summaries_and_archived_history` 通过；合成 Vault 覆盖密集日期、归档历史、未来任务、未安排任务、晚完成与完成日期更正、重启读取、右栏日期读取和不创建 Daily Record。
- `rustfmt --edition 2021 --check src-tauri/tests/calendar_workflow.rs` 与 `git diff --check` 通过。

范围限制：本票未运行 packaged macOS Accessibility／真实个人 Vault／Google Drive／Dida365／真实 daily-loop，因此宽窄窗口、键盘和双语的生产演示仍由 ticket 09 做最终 packaged 验收；没有写入真实 Daily Record、滴答或改变自动化时间。`tortilla-flat-management` 的本地 skill/helper 仍未安装，发布后的管理面板 reconcile 为 setup required，未创建 Registry 或推断工作区绑定。
