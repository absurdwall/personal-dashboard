# Personal Dashboard 4.0 — ticket map

用户已批准九票拆分与依赖；正式发布，01–08 已完成实现，09 的上一轮本地 packaged candidate 已通过，复核 follow-up 需在解锁的 macOS 交互会话重跑，Drive fixture 仍需人验收。

父规格：[spec](spec.md)。设计来源：[原型认可与固定捕获](prototype-review.md)、[设计问答](design-discussion.md)。认可原型本地分支 `codex/personal-dashboard-4-prototype`，提交 `501e5f7`；不要将原型直接合入产品。

| Ticket | Blocked by | Status |
| --- | --- | --- |
| [01 Tasks 入口与持久化收集箱](issues/01-persistent-task-inbox.md) | None | resolved |
| [02 任务状态与可恢复历史](issues/02-task-state-history.md) | 01 | resolved |
| [03 清单分类、归档与恢复](issues/03-task-lists-archive.md) | 01 | resolved |
| [04 今日自动视图与 Today 任务栏](issues/04-today-shared-tasks.md) | 02, 03 | resolved |
| [05 Calendar 任务摘要与右侧操作](issues/05-calendar-task-panel.md) | 02, 03 | resolved |
| [06 Habit 名称中英切换](issues/06-habit-localized-names.md) | None | resolved |
| [07 外部任务读写与幂等规划接收](issues/07-external-task-adapter.md) | 02, 03 | resolved |
| [08 真实早晚流程接线与权限边界](issues/08-daily-flow-integration.md) | 07 | resolved |
| [09 Packaged Mac 整体验收与交付核对](issues/09-packaged-acceptance.md) | 04, 05, 06, 08 | ready-for-human |
| [10 Prototype 视觉对齐返工](issues/10-prototype-visual-parity.md) | 01–09 | resolved |
| [11 Review 功能与双语修复](issues/11-review-follow-up.md) | 01–08, 10 | resolved |

01、06 无前置；可按 01–09 顺序逐票执行。新执行任务须包含已完成前置代码，尤其不要从缺少依赖的旧默认分支起步。02 与 03、04 与 05 并无互相硬依赖，但共享模块修改仍需协调。08 已将 07 的任务适配器接入 canonical daily-loop；09 经传递依赖覆盖全体。

01 先确定可被后续状态和清单操作复用的原子保存边界；仅做必要保持行为的整理，不单列大重构。07 已提供真实外部入口，08 才接入真实 daily-loop；09 分开记录行为测试、适配器合成演练、Drive 与 packaged Mac 证据。

4.1 Habit 创建／目标管理不在本批票中。任何阶段不自动授权替换日常安装或操作真实记录。父规格未修改。

共享管理连接：发布时未找到用户本地 tortilla-flat-management skill／helper，setup required；未创建 Registry、未推断工作区绑定，也未宣称管理面板已同步。本地票可正常使用。
