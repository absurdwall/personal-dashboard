# 02: 通过 Calendar 回看某一天

**What to build:** 从左侧 Calendar 选择日期，预览摘要，再阅读该日期的三个阶段，能随时回到今天。

**Blocked by:** 01 — 保留早间基准，展示当前安排

**Status:** resolved

- [x] 采用冻结 FINAL 侧栏、月历、年／月选择、摘要与完整日期入口，不复用探索变体。
- [x] 按明确日期读取及刷新，tab 切换保留日期，Today 恢复当前本地日；跨午夜不会悄悄改写所选日期。
- [x] 有复盘默认晚间，无复盘默认日间；无记录和读取错误分开显示，浏览不创建文件。
- [x] 真实日历日期验证与 vault 边界生效；单日异常不阻断其他日期，历史内容不随当前时间转成完成事实。
- [x] 隔离工作流及 packaged Calendar-to-Today 导航、空状态、窄窗口与键盘操作验证通过。

## Handoff notes

先读取 [实施交接约定](../implementation-handoff.md) 和 [2.0 spec](../spec.md)，再执行本票。原型入口与冻结约定见交接文档。

以用户认可的最终修正版 FINAL 为冻结视觉基准。用户已确认这七张票的划分与依赖；父 spec 中较早的 needs-info／待体验文字属于收尾前状态，不是重新开始设计的理由。若发现真正未解决的契约矛盾，报告具体问题，不自行扩展产品范围。

每票限自身范围；前置票不仅需要标记完成，其实现提交还必须存在于当前工作区。遵循 implement：既定工作流边界上的 TDD、适当检查、最终完整测试、独立 code-review、提交当前分支。保留 unrelated dirty changes。未授权 live skill、Dida365、自动化操作不因本票发布而自动获准。

## Answer

已在现有 `TodayApplication` 工作流边界增加明确日期读取和 42 日月历投影。Calendar 使用 FINAL 的侧栏、独立年／月选择、月份网格与选中日摘要；选中历史日期后复用 Today 三阶段阅读面，但隐藏本票尚未授权的历史写入表单。有晚间内容的日期默认 Evening，无复盘日期默认 Daytime；缺失、损坏和未配置状态分别呈现，月历逐日隔离读取错误且全程不创建 Daily Record。

日期路径现在先通过真实 Gregorian 日历校验，再进入既有 vault 边界。隔离测试用可控时钟跨越午夜，确认所选日期及 phase 在刷新时保持不变，返回 Today 才恢复当前本地日；历史安排和日间记录仍只投影显式内容，不按当前时间推断完成事实。

验证：

- `cargo test --manifest-path src-tauri/Cargo.toml`：117 passed（含 4 个新增 Calendar 工作流测试）。
- `npm run test:frontend`：2 passed；延迟响应测试确认旧 Calendar 选择与已失效的写入响应不能覆盖较新的导航状态。
- `npm run check`、`cargo fmt --check`、Swift driver typecheck、shell syntax check：通过。
- 隔离打包 app 的 `calendar` 场景：通过；覆盖 reviewed／unreviewed／malformed／empty／today、当日已有复盘、历史 refresh、空白历史日三阶段只读面、跨年上／下月和独立年／月选择、960x720 与 640x520、键盘日期移动和 compact Today 返回。
- 文件 hash 验证确认只有验收脚本主动制造的外部更新发生变化；Calendar 浏览没有修改或创建其他 Daily Record。
- 独立 Standards／Spec review 提出的异步竞态、空白历史日、当日复盘状态、重复 Calendar 标题和 period navigation 证据均已修复并重跑相关验证。
