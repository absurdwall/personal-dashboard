# 07: 外部任务读写与幂等规划接收

**What to build:** 外部日常流程可在 App 关闭时通过真实入口读写同一任务正本，重复运行保持用户意图。

**Blocked by:** 02 任务状态与可恢复历史, 03 清单分类、归档与恢复

**Status:** resolved

Type: task

- [x] 提供可实际调用的有边界读写入口，复用 UI 使用的任务应用操作、校验与保存机制；App 关闭时可运行，再打开 Tasks 能看到同一结果。不得另写一套松散 JSON 后端。
- [x] 按 lived date／时区读取相关日期、逾期、未安排候选及实际完成上下文，排除归档待办义务；明确区分成功空集、损坏与失败，携带身份、来源、状态、revision 和目标绑定。
- [x] 接收稳定来源身份的明确行动；重复输入不重复，建议不生成任务，省略不删除。保留手动改名／改期和完成／放弃／删除意图，旧输入不能复活对象。
- [x] 明确授权的改期、完成、放弃和更正可经入口操作，区分建议与写命令；保留实际操作时间、完成时间精度、来源和幂等操作身份，拒绝错误目标／陈旧版本及不合法输入。
- [x] 通过真实入口和合成 Vault 验证创建→重复→用户编辑→重读、终态保护、再次明确安排、晚完成上下文、并发与保存失败；整个过程不调用 Agent 或滴答。
- [x] 提供入口使用契约与范围说明，给 08 的真实工作流接线使用。本票完成不是已经接上实际 skill，更不是实际个人早晚运行通过。

## 执行上下文

先读本 effort 的父规格、map、原型核对、项目领域词汇及适用 ADR；父规格保持不变。使用已包含全部前置实现的 checkout；仅有 resolved 状态不足以证明代码依赖已集成。认可原型是设计来源，不是可直接提升的生产代码。

沿用用户确认的应用操作测试边界及必要前端异步检查，每票保留自己的可演示结果；新增固定文案同步覆盖中英文。使用合成隔离资料，保留真实个人数据、旧文件及其他未提交工作。不新增依赖／外部服务，不复活 Exercise runtime。

本票已按用户明确的实现请求完成；以下证据仅覆盖合成 Vault、受控时钟、真实
CLI 进程入口、前端双语 seam/static 检查与编译检查。它不构成 packaged
macOS、真实个人 Vault、Google Drive 云同步或 Dida365 验收，也未运行真实个人
流程、写入滴答或改变自动化时间。仅 08 的范围允许定点修改实际 daily-loop
指引和接线。

## Answer

已完成 daily-flow 任务适配器。编译后的 `personal-dashboard` 支持
`--daily-flow-tasks`：从 stdin 接收带 `operation`、`schemaVersion`、显式
`vaultPath` 与 `livedDate` 的 JSON，从 stdout 返回 tagged JSON；该分支在打开
Tauri 窗口前执行，App 关闭时也能读写。入口直接构造 `TaskApplication` 与
`FileTaskStore`，沿用 Tasks 的目标绑定、revision、输入校验和条件原子保存，
没有另建松散 JSON 后端或修改 Dashboard 的选中 Vault。

读取返回 `empty`、`ready`、`damaged`、`failed` 四种结构化状态，并携带 lived
date、当前本地 timestamp/offset、canonical schema、revision、target binding、
Vault 路径和任务完整历史。它按安排日期、当前逾期、未安排待办及实际完成日期
筛选；归档清单中的 pending 义务计数但不返回为规划候选，删除、完成、放弃和
晚完成上下文继续保留。Apply 将建议与明确 action 分开；稳定
`taskId + sourceReference` 重复接收只保留现有对象，不覆盖用户改名、改期、移动、
终态或删除。明确的 reschedule、complete、abandon、correctCompletion 命令均
带稳定 `operationId`，并保存操作来源、实际时间和完成时间精度。

同一命令若已经满足当前状态，会追加带原始 command payload 的 `noop` 历史项；
首次接收可审计，重复 operation id 返回 `idempotent`，即使用户随后编辑也不
会让旧输入再次改变任务。任一候选、命令、目标、revision 或保存边界失败都会
在内存阶段拒绝整个批次，保留外部正本字节；前端已有双语 error catalog 覆盖
本票新增固定诊断，用户任务名称、正文、路径等动态内容不翻译。

验证证据：

- `cargo test --manifest-path src-tauri/Cargo.toml --test task_adapter_workflow`：10 项通过，含真实 CLI 进程跨次读取/写入、真实入口 stale-write 失败且字节不变。
- `cargo test --manifest-path src-tauri/Cargo.toml`：完整 Rust 套件通过；覆盖状态历史、清单、Today/Calendar 共享任务及本票 adapter。
- `npm run test:frontend`：84 项通过；`npm run check`（前端 build/tsc 与 cargo check）通过。
- scoped `rustfmt --edition 2021 --check` 与 `git diff --check` 通过。

范围限制：本票没有接线实际 daily-loop skill，没有读取或写入 Dida365，没有
运行真实个人早晚流程，也没有做 packaged macOS Accessibility/重启验收；这些
分别留给 08 和 09。`cargo clippy --all-targets -- -D warnings` 仍会被仓库已有的
`exercise.rs`、`today.rs` 与既有 Tasks lint 阻断，不能作为本票通过证据。`tortilla-flat-management`
本地 skill/helper 仍未安装，发布后的管理面板 reconcile 为 setup required；
未创建 Registry、推断身份或写入管理面板。
