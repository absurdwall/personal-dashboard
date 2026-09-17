# 02: 任务状态与可恢复历史

**What to build:** 用户可完成、放弃或删除任务，并恢复状态与回看真实时间和变更历史。

**Blocked by:** 01 Tasks 入口与持久化收集箱

**Status:** resolved

Type: task

- [x] 在 Tasks 提供完成／重开、放弃／恢复、删除／撤销或恢复入口及待办／已完成／已放弃筛选；完成和放弃清楚区分。未勾选仅为未确认，不推断失败。
- [x] 删除隐藏对象但保留恢复资料和防止旧规划输入复活的标记；恢复保留身份和原归属。无需永久清除入口。
- [x] 普通打勾记录当前完成时间，晚完成不改 Task date；历史详情区分任务日期、实际完成日期／时刻、实际补记时间与变更来源。
- [x] 提供有边界的完成日期更正；仅知日期不虚构分钟，拒绝未来完成日期。未来安排的任务允许现在提前完成，但其 Calendar 归属日期不变。
- [x] 通过同一应用操作保存状态与历史；重复同一操作幂等，失败不出现只改状态未记历史的半份结果。保留对后续 producer 的稳定来源关联与终态保护。
- [x] 验证重启后状态／历史、重复操作、放弃与完成差异、删除恢复、晚完成／补记／提前完成、冲突与失败；新增 UI 可演示且固定文案双语。

## 执行上下文

先读本 effort 的父规格、map、原型核对、项目领域词汇及适用 ADR；父规格保持不变。使用已包含全部前置实现的 checkout；仅有 resolved 状态不足以证明代码依赖已集成。认可原型是设计来源，不是可直接提升的生产代码。

沿用用户确认的应用操作测试边界及必要前端异步检查，每票保留自己的可演示结果；新增固定文案同步覆盖中英文。使用合成隔离资料，保留真实个人数据、旧文件及其他未提交工作。不新增依赖／外部服务，不复活 Exercise runtime。

本次票发布不启动实现。后续执行时按项目流程记录认领、验证、完成证据和限制，更新本票及 map；不因合成测试通过就声称 packaged 或真实个人流程验收完成。仅 08 的范围允许定点修改实际 daily-loop 指引和接线，所有票均不授权运行真实个人流程、写滴答或改变自动化时间。

## Answer

已完成本票实现：

- Tasks 现在支持完成／重开、放弃／恢复、删除／撤销删除，以及待办、已完成、已放弃、已删除筛选；已删除任务保留 tombstone、稳定身份、来源、归属、安排和历史，不提供永久清除入口。
- 完成记录分开保存任务日期、实际完成日期／可选时刻、实际补记时间和完成来源；普通打勾不改 Task date，日期更正不补造分钟，也拒绝未来完成证据。
- 每个状态／删除／完成更正操作在同一受保护保存边界内更新任务和 append-only history；稳定 change id 幂等但不能在逆向操作后重放，放弃任务必须先恢复为待办才能完成。
- 任务正本从 schema 1 原地迁移到 schema 2，稳定路径仍为 `life/.personal-dashboard/tasks/v1/tasks.json`；新增中英文固定文案、响应确认 seam、失败草稿保留和响应边界保护。
- 规则与边界记录在 `docs/tasks-state-history-v1.md`，父级 `docs/tasks-v1.md` 同步说明 schema 迁移。

验证通过：

- `npm run test:frontend`：70 passed
- `npm run check`：frontend build、TypeScript、`cargo check` 通过
- `cargo test --manifest-path src-tauri/Cargo.toml`：231 passed
- 变更 Rust 文件 `rustfmt --edition 2021 --check`、`git diff --check` 通过

本次证据为合成隔离 Vault 的 Rust／前端回归；未运行 packaged macOS Accessibility、真实 Vault／Drive 同步、Daily Record、Dida365 或后续 Today／Calendar 集成验收。
