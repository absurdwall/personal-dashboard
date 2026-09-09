# 01: 保留早间基准，展示当前安排

**What to build:** 新生成的每日记录独立保留早间起点，Today 展示当前安排与真实日间信息，同时保持旧记录可读。

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] 新旧 Daily Record 均可读取；缺失独立基准明确显示缺失，不把旧主计划复制成原始打算。
- [x] 按 G1 保留四章节语义并增加独立基准及初始依据；早间校准同步基准和当前安排，日间重排不覆盖基准。
- [x] 通过现有 TodayApplication 入口贯通文件读取、原生日用接口和 FINAL Today 三阶段展示；时间过去、首次回复或无回复不推断事实。
- [x] 提供经合成样例验证的生成／更新约定与转换示例，覆盖早起、晚起、工作后首次回复、纯记录和纯重排。当前 live skill 不修改；生成端激活明确作为切换依赖，不用 reader-only 成果宣称 live 闭环完成。
- [x] 保留 Markdown、修订校验与文件恢复回归；隔离 vault 工作流及本切片 packaged Today 验证通过。
- [x] 未改变正在使用的 1.0 安装、真实日记、自动化和旧 Exercise 数据；新行为在开发／验收环境中验证。

## Handoff notes

先读取 [实施交接约定](../implementation-handoff.md) 和 [2.0 spec](../spec.md)，再执行本票。原型入口与冻结约定见交接文档。

以用户认可的最终修正版 FINAL 为冻结视觉基准。用户已确认这七张票的划分与依赖；父 spec 中较早的 needs-info／待体验文字属于收尾前状态，不是重新开始设计的理由。若发现真正未解决的契约矛盾，报告具体问题，不自行扩展产品范围。

每票限自身范围；前置票不仅需要标记完成，其实现提交还必须存在于当前工作区。遵循 implement：既定工作流边界上的 TDD、适当检查、最终完整测试、独立 code-review、提交当前分支。保留 unrelated dirty changes。未授权 live skill、Dida365、自动化操作不因本票发布而自动获准。

## Answer

已通过现有 `TodayApplication` 完成 G1 的兼容读取与展示切片：新记录把 `早间基准`（`初始安排`、`初始计划依据`）和当前安排分开解析；旧记录明确标为缺失基准，不从当前计划反推；空白、缺失和已保存基准均有独立状态。FINAL Today 的 Morning 展示早间基准，Daytime 展示当前安排、显式进展与有边界的更新入口，Evening 保留复盘流程。

新增的生成／转换约定记录了早间校准与日间重排的写入边界，并用隔离 vault 的合成记录覆盖早起、晚起、工作后首次回复、纯记录和纯重排。日间有界写入测试还验证早间基准字节不变；现有 Markdown、修订冲突和恢复回归继续通过。live skill、Dida365、自动化、真实日记与已安装 1.0 均未修改，writer 激活仍是后续切换依赖。

验证：

- `cargo test --manifest-path src-tauri/Cargo.toml`：113 passed。
- `cargo test --manifest-path src-tauri/Cargo.toml --test today_workflow`：38 passed。
- `npm run check`、`cargo fmt --check`、Swift driver typecheck、shell syntax check、`git diff --check`：通过。
- 隔离打包 app 的 `today` 与 `today-write` 场景：通过；覆盖真实 IPC 写入、外部刷新、旧记录兼容和 960x720／800x640／640x520 三档 Today 布局。
