# 06: 完成 FINAL 的整体验收

**What to build:** 安装后的 2.0 候选应用用完整连续日程呈现与 FINAL 一致的三个入口，并通过真实原生文件操作验收。

**Blocked by:** 02 — 通过 Calendar 回看某一天, 03 — 在当天或历史日期补记与更正, 05 — 从 Habits 记录健身短句

**Status:** resolved

- [x] 从包含全部前置提交的候选分支重新构建 Mac app；不使用旧 bundle 代替当前实现。
- [x] 完整合成日程覆盖基准、纯记录、日间调整、晚间回顾、Calendar 历史／空日、Habits 新增／更正与重启刷新。
- [x] 在窄、中、宽窗口对照冻结 FINAL 的字体、字号、颜色、间距、层级、展开状态与完整内容，不能只凭点击成功判定视觉通过。
- [x] 确认前置 reader/writer、来源生产契约和安全回归均通过；运行规定的完整测试与最终 code-review，记录可重现证据。
- [x] 运行隔离 packaged IPC／AX 验收，失败写明真实状态；不反复重跑未诊断超时，不删除回归或偷改基准通过验收。
- [x] 列出 1.0 到 2.0 的切换步骤、旧数据精确清单、旧通知取消方式、生成端激活所需动作；不在本票执行真实切换。

## Handoff notes

先读取 [实施交接约定](../implementation-handoff.md) 和 [2.0 spec](../spec.md)，再执行本票。原型入口与冻结约定见交接文档。

以用户认可的最终修正版 FINAL 为冻结视觉基准。用户已确认这七张票的划分与依赖；父 spec 中较早的 needs-info／待体验文字属于收尾前状态，不是重新开始设计的理由。若发现真正未解决的契约矛盾，报告具体问题，不自行扩展产品范围。

每票限自身范围；前置票不仅需要标记完成，其实现提交还必须存在于当前工作区。遵循 implement：既定工作流边界上的 TDD、适当检查、最终完整测试、独立 code-review、提交当前分支。保留 unrelated dirty changes。未授权 live skill、Dida365、自动化操作不因本票发布而自动获准。

## Answer

从包含 01–05 全部实现的当前分支重新执行 `npm run build:mac`，生成并 ad-hoc 签名当前 Mac bundle；候选产品提交为 `2d051548fdeadf00e52b1247127c0842ee8d4638`，可执行文件 SHA-256 为 `0eed6ef29378a025f01d5a4caa7c7ed1d3ce81c45c65b8f1b7ae86bb64cc3a5c`。没有用旧 bundle 代替，也没有 notarization 凭证可用。

新增 packaged `dashboard-2` 合成场景，用同一份隔离的 2026-09-08 完整日程贯穿 Today、Calendar 与 Habits：五个早间时间块、完整初始／当前计划依据、显式事实、14:10 日间调整、low-energy Exercise 方向、未知的学习与 Reset 状态、晚间实际记录、Calendar 有复盘日期和 Habits 来源证据均保持区分。场景在 1180×820、800×640、640×520 验证完整内容、语义层级、主要动作和无 document scroll，并用前后 hash 证明 Daily Record 与 habits snapshot source bytes 未被读取流程修改。

[FINAL 视觉验收记录](../../../docs/acceptance/personal-dashboard-2-final-visual.md) 将 AX 行为证据与直接渲染审查分开，逐项记录 Today／Calendar／Habits × 宽／中／窄九个 PASS、参考与产品截图 hash，以及字体、字号、颜色、间距、层级、展开状态、换行和动作可达性。原生宽窗口由 AX 设置并断言为 1180×820；CUA 保存宽图时规范化为 1106×768，文档已明确区分，800×640 与 640×520 保持逐像素尺寸。

最终 packaged gate 在当前 bundle 上连续通过 14 个隔离场景：`list-first direct state-semantics progress workouts exceptions responsive compact keyboard week-close installed-cycle calendar habits dashboard-2`。过程中只在复现并诊断后修复验收基础设施：Settings 使用真实可访问名称；启动、语义、状态、焦点和原生路径框使用有界等待；picker 在前端重绘后重新获取；未匹配菜单只关闭一次；缺失 Daily Record 断言更新为当前产品文案。聚焦场景逐项通过后才重新运行 gate，没有删除回归、放宽期望值或修改冻结原型。

最终完整测试只在收尾运行一次并全部通过：Rust 133 tests、frontend 4 tests、`npm run check`、Rust fmt、acceptance shell syntax、Swift AX driver typecheck，以及基线／工作树 diff check。最终独立 code review 的 Standards 与 Spec 两轴均为 0 个剩余或新增 finding。

[2.0 cutover 计划](../../../docs/acceptance/personal-dashboard-2-cutover-plan.md) 已列出精确旧文件与 transaction child 清单、未知文件 fail-closed 边界、Python launchd job、完整 Tauri notification identifier union／取消与失败重试、idempotent phase marker、安装激活、live daily-loop writer 和 habits snapshot producer 的原子写入步骤及 rollback 语义。本票没有执行真实切换，没有删除旧数据、取消真实通知、激活生成端、修改 live skill、调用 Dida365 或更改自动化；这些仍由 ticket 07 在获得明确授权后执行并重新做 installed visual acceptance。
