# 03: 在当天或历史日期补记与更正

**What to build:** 在所选日期写一句记录或更正已有条目，并在当前正文、修改痕迹和复盘补充区看到一致结果。

**Blocked by:** 02 — 通过 Calendar 回看某一天

**Status:** resolved

- [x] Today 日间栏支持普通／健身短句；日期、类别和加载 revision 绑定保存目标，导航或跨午夜不误写其他天。
- [x] 按 G2 写入同一 Daily Record，稳定条目标识与追加修改痕迹保留原文、新文和有 offset 的修改时刻。
- [x] 只有明确保存才能 exclusive-create 缺失的过去／当日日记录；不创建虚构基准／复盘，不给未来日期记录已发生事实。
- [x] 复盘展示补充与更正及后续修订提示，不自动替换 Agent 正文；已有任意 Markdown 均保留。
- [x] 冲突保留外部修改及用户草稿；并发创建、重复点击、未知条目、恢复失败均有可验证结果。
- [x] 沿用冻结 FINAL 小字号与 composer 样式；工作流与 packaged 新增、更正、重启后持久性验证通过。

## Handoff notes

先读取 [实施交接约定](../implementation-handoff.md) 和 [2.0 spec](../spec.md)，再执行本票。原型入口与冻结约定见交接文档。

以用户认可的最终修正版 FINAL 为冻结视觉基准。用户已确认这七张票的划分与依赖；父 spec 中较早的 needs-info／待体验文字属于收尾前状态，不是重新开始设计的理由。若发现真正未解决的契约矛盾，报告具体问题，不自行扩展产品范围。

每票限自身范围；前置票不仅需要标记完成，其实现提交还必须存在于当前工作区。遵循 implement：既定工作流边界上的 TDD、适当检查、最终完整测试、独立 code-review、提交当前分支。保留 unrelated dirty changes。未授权 live skill、Dida365、自动化操作不因本票发布而自动获准。

## Answer

Today 的 Daytime rail 现在可在当天或历史日期新增“日常记录”／“健身”短句，并可从稳定条目标识进入更正。保存请求同时携带加载时的日期、opaque vault/date binding 和 revision；跨午夜、日期导航或切换 Vault 都不会把草稿写到另一个目标。草稿按 target binding 隔离，冲突失败不会清空。

G2 写入保留在同一 Daily Record 的 `白天更新 / 简短记录` 与 `白天更新 / 修改记录`。新增记录包含稳定本地 ID、目标日期、类别和带 UTC offset 的记录时刻；每次更正保留同一 ID，并追加修改 ID、修改时刻、原文和新文。保留区内非 app Markdown 继续可读，其他 frontmatter、章节与 Agent 复盘正文按字节边界保留。

缺失的过去／当日日记录只在明确保存时通过 exclusive create 建立最小 frontmatter、日期标题和短句，不补造早间基准或晚间复盘；未来日期拒绝写入已发生事实。Evening 独立显示“补充与更正”，`needs-review` 元数据只为复盘之后发生的新增／更正显示后续修订提示，后续 Agent 整合后可明确清除该状态。

验证：

- 新增 5 个 `TodayApplication` 工作流测试，覆盖历史目标跨午夜、连续更正与 offset 痕迹、最小 exclusive create／并发创建、未来拒绝、revision 与 Vault 冲突、重复新增／更正及未知条目。
- 完整 Rust suite：122 passed；前端异步请求测试：2 passed；`npm run check`、Rust formatting、acceptance shell syntax 与 `git diff --check` 通过。
- signed local `.app` 的 `today-write` packaged 场景通过真实 Tauri IPC 与 AX：外部冲突保留草稿和外部内容，新增、更正、重启后持久性、Evening 补充／后续修订提示及 Exercise destination isolation 均验证通过。
- 独立 Standards／Spec review 的 trait 默认、重复插入逻辑、reserved subsection 非 app 内容、跨 Vault 草稿、复盘修订状态与历史记录时刻展示 findings 均已修复；复审两轴均无剩余 finding。
