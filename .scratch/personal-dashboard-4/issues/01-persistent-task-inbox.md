# 01: Tasks 入口与持久化收集箱

**What to build:** 在现有 Dashboard 壳层新增 Tasks，让用户在 Inbox／All 创建、编辑并可靠保存独立任务。

**Blocked by:** None (can start immediately)

**Status:** resolved

Type: task

- [x] 保留现有 toolbar、sidebar 与其他页面；Tasks 位于 Today 与 Calendar 之间，使用现有视觉及导航。提供真实 Inbox／All 列表和轻量新建／编辑表单，不直接提升 throwaway 代码。
- [x] 名称必填、内容可空；支持无日期、仅日期、日期加时刻。时刻必须有日期，清除日期同时清除时刻；全局／Inbox 新建默认 Inbox 且无日期。未来任务不依赖 Daily Record。
- [x] 任务身份在改名、改内容和改期后保持，显式改期留下前后日期与实际操作时间；读任务或空列表不创建日记。
- [x] 在 Vault 内保存版本化任务正本，定义状态、来源与清单操作可复用的原子保存边界；预留稳定身份而不以显示名作为键。此票不实现其余票的状态／清单 UI。
- [x] 读取提供 Vault target binding 和 revision；写入拒绝过期版本／错误目标。缺失为空，损坏或未知版本明确报错，不按空状态覆盖。失败保留可恢复编辑与已有受保护写入的恢复语义。
- [x] 合成双 Vault 验证创建→编辑→重读→重启、无日期／未来日期、改期不重复、并发冲突、失败及晚到响应隔离。提供实际界面演示和新增固定文案中英对应；旧按日任务与 Markdown 保持不变。

## 执行上下文

先读本 effort 的父规格、map、原型核对、项目领域词汇及适用 ADR；父规格保持不变。使用已包含全部前置实现的 checkout；仅有 resolved 状态不足以证明代码依赖已集成。认可原型是设计来源，不是可直接提升的生产代码。

沿用用户确认的应用操作测试边界及必要前端异步检查，每票保留自己的可演示结果；新增固定文案同步覆盖中英文。使用合成隔离资料，保留真实个人数据、旧文件及其他未提交工作。不新增依赖／外部服务，不复活 Exercise runtime。

本次票发布不启动实现。后续执行时按项目流程记录认领、验证、完成证据和限制，更新本票及 map；不因合成测试通过就声称 packaged 或真实个人流程验收完成。仅 08 的范围允许定点修改实际 daily-loop 指引和接线，所有票均不授权运行真实个人流程、写滴答或改变自动化时间。

## Answer

已在现有 Dashboard 壳层加入 Tasks 页面，入口位于 Today 与 Calendar 之间；All／Inbox 范围、名称必填的新建表单、可选内容、无日期／日期／日期加时刻，以及内联编辑均沿用现有页面的视觉和导航。日期被清除时前端与 Rust 边界都会清除时刻，未来任务不读取或创建 Daily Record。

新增 `life/.personal-dashboard/tasks/v1/tasks.json` 作为 Vault 内 schema v1 任务正本。任务、列表、来源、状态、稳定身份和 append-only 变更记录共用现有受保护的条件原子写入边界；读返回 target binding／revision，错 Vault、过期 revision、损坏 JSON、未知 schema 和无效历史均 fail closed。写后会复核当前 Vault，避免把一个 Vault 的结果标记为另一个 Vault；晚到或未确认的前端写入保留可重试身份与草稿。

验证通过：`npm run build`、`npm run test:frontend`（67 项）、`cargo check --manifest-path src-tauri/Cargo.toml`、Tasks 合成 Rust 工作流（9 项）、修改文件 Rust format check 及 `git diff --check`。合成测试覆盖双 Vault、创建／编辑／重启读取、未来与无日期、改期历史与幂等、revision 冲突、并发外部内容、写入失败、Vault 在写后切换和旧 Markdown 保留；前端测试覆盖 Tasks surface、日期时刻约束、双语错误和 Vault／晚到响应边界。

范围限制：本票没有运行 packaged Mac Accessibility 演示，也没有触碰真实 Vault、Daily Record、Dida365 或 Drive；最终 packaged 验收由 09，状态／清单管理和 Today／Calendar 接线由后续票负责。共享 `tortilla-flat-management` reconcile 仍因用户本地 helper 未安装而是 setup required，未创建 Registry 或推断绑定。
