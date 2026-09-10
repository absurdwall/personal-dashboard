# 07: 切换 2.0，退役旧 Exercise 功能与数据

**What to build:** 在已验收候选基础上切换 2.0，旧运动入口、旧数据和通知按已批准范围退役，新的每日数据流程可实际使用。

**Blocked by:** 06 — 完成 FINAL 的整体验收

**Status:** claimed

- [x] 核对实际前置验收和候选提交，保留 FINAL 三入口，删除旧 History／Settings／Profile 管理与重复运动提醒界面，不删除 vault 能力。
- [x] 按当前实现枚举明确 app-owned 的旧 Exercise/Profile 数据与通知；仅清理这些对象，保留 vault、Daily Records、其他位置导出文件及未识别内容。
- [x] 用户已明确旧数据无需保留，无迁移要求；清理幂等，记录完成标识，重启不再导回旧数据，旧 app 管理的提醒不再发送。
- [x] 通过隔离切换演练证明安全范围、失败状态与重启结果；完成该代码的 review 和提交后才触及真实安装。
- [ ] 落实前置基准写入与按需快照生产契约。现有会话禁止修改 live skill／运行 Dida365／自动化的边界仍有效：若实际切换必须改变这些，先说明具体变更并取得明确授权；不得静默激活。
- [ ] 必要的尚未授权运行操作未完成时保持 ticket 未完成，并交代可执行代码与实际运行验收的区别；不以合成 evidence 宣称真实闭环完成。
- [ ] 切换后重新检查 installed app、三入口、刷新、数据生成兼容、旧数据清理和通知停用；记录结果与最终独立 review。

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

本票仍保持 `claimed`：live daily-loop writer、12 周 snapshot producer、Dida365、
自动化、真实安装替换、真实旧数据删除、真实 launchd job 与真实通知均未触碰。
后三项验收只能在用户分别授权 producer/外部系统变更并确认 exact installed 1.0
bundle 后执行；此前 isolated/package evidence 不等于 live cutover 完成。
