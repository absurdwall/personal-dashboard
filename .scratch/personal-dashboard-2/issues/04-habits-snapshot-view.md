# 04: 通过按需快照展示 Habits

**What to build:** Habits 从有来源和更新时间的本地快照展示周次数、每日时刻及可展开历史点阵。

**Blocked by:** 01 — 保留早间基准，展示当前安排

**Status:** resolved

- [x] 实现 G3 bounded、versioned snapshot 读取与验证，提供完整合成生产样例及供外部 Agent 使用的生成契约；不直连或轮询 Dida365。
- [x] 逐 Habit 的身份、来源、覆盖范围、更新时间与 actual-time 证据明确；刷新失败保留上个有效读数并显示状态。
- [x] 周一至周日计数，标准目标作为分母；同日完成去重、来源冲突暂不计入、partial／baseline 不擅自折算，未知不等于未完成。
- [x] 配置目标、当前分母与历史 context 按 G3 处理；精确起睡时刻及次日入睡按 G4 lived-day 规则展示，不从阈值打卡编造分钟。
- [x] FINAL 周摘要、目标分组、近期点阵、12 周展开和日期记录展示完整；有记录点与完成次数区别可见。
- [x] 无快照、无目标、部分覆盖、过期／畸形读数可读且不生成数据；合成来源生产到 app 显示全链路可验证。
- [x] 现有 live skill 暂不修改；快照生产端激活契约移交切换任务，工作流与 packaged Habits 验证通过。

## Handoff notes

先读取 [实施交接约定](../implementation-handoff.md) 和 [2.0 spec](../spec.md)，再执行本票。原型入口与冻结约定见交接文档。

以用户认可的最终修正版 FINAL 为冻结视觉基准。用户已确认这七张票的划分与依赖；父 spec 中较早的 needs-info／待体验文字属于收尾前状态，不是重新开始设计的理由。若发现真正未解决的契约矛盾，报告具体问题，不自行扩展产品范围。

每票限自身范围；前置票不仅需要标记完成，其实现提交还必须存在于当前工作区。遵循 implement：既定工作流边界上的 TDD、适当检查、最终完整测试、独立 code-review、提交当前分支。保留 unrelated dirty changes。未授权 live skill、Dida365、自动化操作不因本票发布而自动获准。

## Answer

Habits 现在通过 `TodayApplication` 的只读 adapter 读取 `.personal-dashboard/derived/habits-v1.json`。schema v1 严格验证版本、生成时刻 offset、生成周对应的 12 周范围、稳定 habit/source key、逐日 coverage、目标 context、来源结果及 explicit actual-time；缺失、过期、畸形、刷新失败和未配置状态均明确。有效读数会在后续缺失、读取错误或畸形刷新时保留，Dashboard 不调用或轮询 Dida365，也不生成来源事实。

投影按当前周周一至周日计算已知次数：同来源取唯一最新结果，同日跨来源冲突不计次，partial／baseline／threshold-only 不折算，文字记录只形成记录点。无目标 weekly habit 仍显示已知次数但不进入汇总；当前目标作为分母，历史目标只作为 context。起睡时间只显示 explicit-time，支持 next-day 入睡 lived-day，互相矛盾的精确时间保持 unresolved。

FINAL Habits 页面包含 3 / 15 周摘要、每日锚点／本周习惯分组、来源与 coverage、近 7 天 strip、替换式可展开 12 周月份×周一至周日 grid、持久 today marker 和逐日期详情。显示窗口与快照来源覆盖分开标注，有记录点与完成状态使用不同视觉语义；宽屏和 640×520 compact 布局均可读。

验证：

- 完整 Rust suite：132 passed；frontend tests：2 passed；`npm run check`、Rust format、Swift driver typecheck、acceptance shell syntax 与 diff check 通过。
- 从最终源码重新构建的 signed local `.app` 通过 `habits` packaged 场景：真实 Tauri IPC 与 AX 覆盖 3 / 15、精确／阈值证据、显示／来源范围、冲突与本地文字记录、月份／星期历史 grid、960×720、640×520 和畸形刷新保留；Daily Record hash 未改变。
- 独立 Standards／Spec review 提出的 adapter 边界、日期复用、typed target、刷新保留、跨周 stale、精确时刻冲突、today marker、范围标注、FINAL 展开 geometry、无目标计数与 domain vocabulary findings 均已修复；最终复审两轴无剩余 finding。
- 现有 live skill、Dida365 和自动化均未修改；producer activation 仍移交 ticket 07。
