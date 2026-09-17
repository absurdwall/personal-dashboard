# 08: 真实早晚流程接线与权限边界

**What to build:** 实际 daily-loop 使用 Dashboard 任务与滴答参考，按用户意图完成规划、日间状态更新和复盘读取。

**Blocked by:** 07 外部任务读写与幂等规划接收

**Status:** resolved

Type: task

- [x] 核实 canonical daily-loop 的真实路径及父 Workspace 规则，定点接入 07 实际入口，不能只新增一个未被调用的样例脚本。依赖位于不同 Git 边界时分别保留工作区和提交证据，不顺带提交其他项目。
- [x] Morning 读 Dashboard 当日／逾期／相关未安排候选及滴答参考，明确新行动写 Dashboard；Evening 按实际完成日期读取，并保留所需 Habit 与其他来源流程。归档待办不变成新义务。
- [x] 滴答现有任务只作标注来源的参考，不自动复制、按名称模糊合并、写回或赋予本地勾选能力。来源缺失／局部覆盖明确说明，不把失败当空集。
- [x] 改期优先建议并等待确认；明确且可唯一匹配的用户意图可直接执行。明确完成／放弃可更新 Dashboard，歧义／矛盾才问。不从已过时间、计划文字或未勾选推断完成／失败。
- [x] 重复规划不重复建任务，不覆盖用户编辑／终态；保留早间基准、现有日间／复盘边界与无关 Markdown。仅更新必要工作流、入口契约和任务权威说明，不改变自动化时间。
- [x] 用合成 Vault 与模拟滴答读取，通过实际适配器完整演练初次／重复早间、建议与确认改期、明确完成／放弃、晚完成／补记和晚间读取，以及来源失败／冲突。运行既有 skill 文档检查、标准 validator 与必要 dry run；不写真实记录或执行个人流程。
- [x] 记录真实入口接线和合成演练的可复核证据，并明确个人实跑与生产运行情况尚未证明；如规范要求不可用环境，保留精确限制而不宣称全部通过。

## 执行上下文

先读本 effort 的父规格、map、原型核对、项目领域词汇及适用 ADR；父规格保持不变。使用已包含全部前置实现的 checkout；仅有 resolved 状态不足以证明代码依赖已集成。认可原型是设计来源，不是可直接提升的生产代码。

沿用用户确认的应用操作测试边界及必要前端异步检查，每票保留自己的可演示结果；新增固定文案同步覆盖中英文。使用合成隔离资料，保留真实个人数据、旧文件及其他未提交工作。不新增依赖／外部服务，不复活 Exercise runtime。

本票已执行。后续仍不得把合成测试通过提升为 packaged 或真实个人流程验收；仅 08 的范围允许定点修改实际 daily-loop 指引和接线，所有票均不授权运行真实个人流程、写滴答或改变自动化时间。

## Answer

- Personal Dashboard 子仓库提交 `2230a6b`，父 Workspace（日常流程规则）提交 `1279b07`；两个 Git 边界分别保留提交证据。
- canonical `life-daily-loop` 已直接调用真实的 `personal-dashboard --daily-flow-tasks` JSON stdin/stdout 入口，`everyday` 的 Life Companion 早晚流程已接入同一契约，并统一写入 `life/Journal/Daily/...`；standalone `everyday/Diary/...` diary-synthesis 路径保持独立。Dashboard local Tasks 是本地行动正本；Dida365 仅作标注来源的只读参考，不复制、模糊合并或写回。
- 接线保留 lived date、target binding、revision、显式确认、幂等重复规划、用户编辑／终态、建议改期、实际完成日期、补记／纠正／放弃及失败与空集的区分；Daily Record 仍只由原有边界维护，归档任务不成为新义务。
- 可复核演练位于 `src-tauri/tests/daily_flow_integration_workflow.rs`，前端契约测试位于 `tests/frontend/daily-flow-integration.test.ts`，使用合成 Vault 与模拟 Dida365，覆盖初次／重复早间、逾期／未安排／归档筛选、用户 Markdown／Daily Record 保留、建议与确认改期及幂等、完成／放弃、晚间读取、来源失败和 revision 冲突；未写真实 Daily Record、Dida365 或自动化。
- `npm run test:frontend`、`npm run check`、Ticket 07 回归、Ticket 08 Rust 演练及 life-daily-loop `dry_run.py` 已通过。标准 validator 在可用 skill／workspace 路径中未找到；`cargo clippy -D warnings` 仍被既有 lint baseline 阻断，非本票新增问题。Packaged Mac 验收留给 09，真实个人流程仍未实跑。
