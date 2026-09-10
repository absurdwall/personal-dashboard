# 07: 切换 2.0，退役旧 Exercise 功能与数据

**What to build:** 在已验收候选基础上切换 2.0，旧运动入口、旧数据和通知按已批准范围退役，新的每日数据流程可实际使用。

**Blocked by:** 06 — 完成 FINAL 的整体验收

**Status:** resolved

- [x] 核对实际前置验收和候选提交，保留 FINAL 三入口，删除旧 History／Settings／Profile 管理与重复运动提醒界面，不删除 vault 能力。
- [x] 按当前实现枚举明确 app-owned 的旧 Exercise/Profile 数据与通知；仅清理这些对象，保留 vault、Daily Records、其他位置导出文件及未识别内容。
- [x] 用户已明确旧数据无需保留，无迁移要求；清理幂等，记录完成标识，重启不再导回旧数据，旧 app 管理的提醒不再发送。
- [x] 通过隔离切换演练证明安全范围、失败状态与重启结果；完成该代码的 review 和提交后才触及真实安装。
- [x] 落实前置基准写入与按需快照生产契约。用户明确授权后，live skill 以独立提交 `2171410` 激活；Dida365 仅只读，两个旧自动化保持 PAUSED。
- [x] 在明确授权后执行真实 preflight、旧进程退出、live cutover、marker 重入和无 cutover 环境变量的正常重启；合成 evidence 与真实运行结果继续分开记录。
- [x] 切换后重新检查实际 2.0 bundle、三入口、快照刷新、旧数据清理、launchd／通知停用和正常重启；记录结果与最终独立 review。

## Handoff notes

先读取 [实施交接约定](../implementation-handoff.md) 和 [2.0 spec](../spec.md)，再执行本票。原型入口与冻结约定见交接文档。

以用户认可的最终修正版 FINAL 为冻结视觉基准。用户已确认这七张票的划分与依赖；父 spec 中较早的 needs-info／待体验文字属于收尾前状态，不是重新开始设计的理由。若发现真正未解决的契约矛盾，报告具体问题，不自行扩展产品范围。

每票限自身范围；前置票不仅需要标记完成，其实现提交还必须存在于当前工作区。遵循 implement：既定工作流边界上的 TDD、适当检查、最终完整测试、独立 code-review、提交当前分支。保留 unrelated dirty changes。未授权 live skill、Dida365、自动化操作不因本票发布而自动获准。

## Answer

已从 ticket 06 的已提交 packaged acceptance 基线 `2f2ef0c` 实现 2.0
retirement candidate。正常启动现在只注册 Today、Calendar、Habits 及其
Daily Record 命令；shipping HTML 与 TypeScript 中的 This Week、History、
Settings、Profile、旧 Exercise dashboard 和重复提醒界面／调用均已删除，
vault selection 与 Daily Record/Habits 能力保持。

新增 cutover application seam，以显式 `preflight`／`execute` 模式运行。
候选身份由有效 commit 与 64 位 bundle SHA-256 组成；只读 preflight 输出
selected vault、精确 owned/unknown inventory、旧 launchd 状态和通过既有
Profile/Exercise parser 重建的完整通知 ID union。未知对象、缺一份旧状态、
坏 JSON 或 launchctl 非“not found”的检查错误全部 fail closed，且不写 progress。

执行路径只处理计划列出的 app-data 与 Python 文件、transaction children 和
canonical temporaries。它先精确检查／停止 current-user launchd service，再逐项
取消并查询旧通知；progress journal 在每个可恢复阶段原子落盘。失败重入会重新
解析尚存 source，通知 inventory 改变时阻止删除；`CleanupStarted` 允许部分删除
安全续跑。completion marker 只在清理核验后原子写入，marker 重入仍重新检查
launchd 与 pending notifications，而不是仅凭 marker 宣称完成。

[隔离 cutover 证据](../../../docs/acceptance/personal-dashboard-2-cutover.md)
记录了 TDD seam 与 packaged macOS rehearsal：unknown-file 预检不变更状态，
完整只读 artifact 可捕获，精确对象被移除，`today-workspace.json` 与 Daily Record
hash 不变，正常重启不重建旧数据，Accessibility 仅见 FINAL 三入口。ADR 0002
记录当前 Daily Records/Habits 单一上下文，并明确 supersede ADR 0001 的旧
Exercise-first／自动迁移决定。最终 Standards review 无剩余 finding；Spec review
提出的 stale resume、marker-only success、preflight 字段、launchctl 错误分类、
缺 plist bootout 与恢复期 runner reload 问题均已修复。

用户随后明确授权直接退役 1.0，并在同一 release bundle 路径直接使用 2.0。
live `life-daily-loop` 在父 vault 提交 `2171410` 中加入早间基准保存和严格、原子
Habits v1 writer，并在 `61c33b3` 要求调用方声明完整 source／habit scope 及每个
习惯的完整日期范围；隔离 dry run 证明 material replan／晚间复盘不覆盖基准，
空或坏候选不会替换最后一份有效快照。Dida365 只进行了只读的 habit catalog 与
有界 check-in 读取；生成结果覆盖声明的完整语义目录与日期窗口，有来源的观察被
保留，缺失仍为 unknown。具体习惯名称、数量与完成数据只保存在私有 vault 中。

真实只读 preflight 对候选 `00bd65f` 与 bundle SHA-256
`498c1d4252a8745e1ed1590d4e4a1bd302dd6e908d6d7d5a26562f168fec4a42`
报告仅有预期的 owned paths、没有 unknown path、完整重建的旧通知标识、缺席的
Python runner 目录与未加载的 launchd job，且没有写 progress／marker。随后旧
1.0 进程退出；execute 只删除 live app-data 下的 `exercise.json`、`profile.json`
并写入 completed marker。`today-workspace.json` 与 Habits snapshot 前后 hash
不变，vault 与 Daily Records 未被切换流程写入。

完成 marker 的 execute 重入再次通过 launchd／pending notification 检查，精确
launchd label 仍报告不存在。无 cutover 环境变量正常重启后，运行中 bundle 为
2.0.0；Accessibility 只见 Today、
Calendar、Habits，不见 This Week 或 Profile & data。进入 Habits 并按“刷新快照”
后仍显示 `Life Daily Loop · agent-derived` 且来源覆盖一致。两个已弃用的 Morning
planning／Evening review 自动化维持 PAUSED，未创建替代自动化。

授权的一次真实 Morning generation 读取了 Dida365 Today 与一条 overdue Task
（标题只保留在私有 Daily Record），并复用已成功读取的相关 Habits/check-ins；它创建
`2026-09-10.md`，同时写入相符的 `早间基准` 与当前计划，未把缺失打卡推断为
未完成。正常 2.0 重启后 Today 显示 5 个时间块与初始计划依据，Calendar 将当天
识别为有 Daily Record、无晚间复盘，Habits 仍可刷新原快照。

同一 live 2.0 executable 随后在可删除的隔离 app-data／vault root 完成 dated
Exercise 验收：从 Habits 为 2026-09-10 新增明确标注的合成短句 v1，再更正为 v2；
Markdown 仍只有一个 stable entry，并保留原文／新文修改记录。Calendar 与 Today
读取更正结果，重启后 Habits 继续显示 v2 和一条修改记录，snapshot hash 不变。
隔离 root 随后删除，真实 Daily Record 未写入该合成 Exercise 内容。最后恢复无
环境变量的正常 2.0 进程并保持运行。
