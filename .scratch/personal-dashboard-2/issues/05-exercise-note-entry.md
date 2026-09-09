# 05: 从 Habits 记录健身短句

**What to build:** 点开 Habits 的健身日期格就能新增或更正一句记录，并与同日 Today 和复盘同步呈现。

**Blocked by:** 03 — 在当天或历史日期补记与更正, 04 — 通过按需快照展示 Habits

**Status:** resolved

- [x] Habits 输入预设选中日期和健身关联，无必填时长、距离、心率或 Strava 链接。
- [x] 复用已验证的日记录写入工作流；两入口使用同一条目标识，交叉更正、刷新和重启不产生副本。
- [x] 文字记录不触发滴答写入、不自动增加完成次数；点阵明确表示有记录，格内区分文字和快照完成来源。
- [x] 保留 FINAL 行内历史位置与字体密度，不添加独立健身页面，不修改原型使其迁就实现。
- [x] 工作流与 packaged Habits → Calendar → Today → 更正回看完整路径通过，包括冲突和无文件的显式创建。

## Handoff notes

先读取 [实施交接约定](../implementation-handoff.md) 和 [2.0 spec](../spec.md)，再执行本票。原型入口与冻结约定见交接文档。

以用户认可的最终修正版 FINAL 为冻结视觉基准。用户已确认这七张票的划分与依赖；父 spec 中较早的 needs-info／待体验文字属于收尾前状态，不是重新开始设计的理由。若发现真正未解决的契约矛盾，报告具体问题，不自行扩展产品范围。

每票限自身范围；前置票不仅需要标记完成，其实现提交还必须存在于当前工作区。遵循 implement：既定工作流边界上的 TDD、适当检查、最终完整测试、独立 code-review、提交当前分支。保留 unrelated dirty changes。未授权 live skill、Dida365、自动化操作不因本票发布而自动获准。

## Answer

Habits 的 Exercise 日期格现在沿用原有行内历史详情：打开格子后日期和健身关联已预设，只需输入一句自由文本。已有健身短句可在同处更正，并显示 append-only 修改记录；没有 Daily Record 的过去／当天日期只在明确保存时 exclusive-create 最小记录，未来日期保持不可写。

Today 与 Habits 共用 typed dated-note command seam 和 Rust `TodayApplication` 写入边界。Habits 投影携带 Daily Record 的 stable entry ID，因此任一入口更正后仍是同一条记录；刷新、Calendar／Today／Evening 跨入口阅读和 app 重启都不生成副本。Calendar 的 reviewed／unreviewed 分类由 Rust 提供，单有短记录不会被误报成已有晚间复盘。

健身短句只写 canonical Daily Record，不调用 Dida365、不改变 derived snapshot 或完成次数。点阵仍表示“有来源记录”，详情同时显示文字来源及“有文字记录 · 不计次”；FINAL 的 Habits 行内位置和紧凑字体保持不变，未新增独立页面，也未修改冻结原型。

验证：

- TDD 回归覆盖 stable identity、跨入口更正／重启、snapshot bytes 与计数不变、supplement-only 的 unreviewed 分类，以及两入口共享 typed IPC command seam。
- 最终完整 Rust suite 133 passed；frontend suite 4 passed；`npm run check`、Rust format、Swift driver typecheck、acceptance shell syntax 与 diff check 通过。
- 从更新源码构建的 signed local `.app` 通过 packaged `habits` 场景：Habits 外部编辑冲突保留草稿和外部内容；显式创建缺失日期；Habits 新增、Today 更正、重启、Habits 再更正；Calendar、Today 和 Evening 读取同一 stable entry 与两次修改痕迹；3 / 15 与 1 / 3 均不变；960×720、640×520 和畸形快照保留通过。
- 独立 Standards／Spec review 的 Rust 领域分类、共享 dated-note seam、Habits 内更正和 Evening packaged 覆盖 findings 已修复；最终两轴无剩余 actionable finding。
- 未修改 live skill、Dida365、自动化、冻结原型、依赖、服务或部署配置；未执行 push、merge 或 ticket 06。
