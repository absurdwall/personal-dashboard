# 04: 通过按需快照展示 Habits

**What to build:** Habits 从有来源和更新时间的本地快照展示周次数、每日时刻及可展开历史点阵。

**Blocked by:** 01 — 保留早间基准，展示当前安排

**Status:** ready-for-agent

- [ ] 实现 G3 bounded、versioned snapshot 读取与验证，提供完整合成生产样例及供外部 Agent 使用的生成契约；不直连或轮询 Dida365。
- [ ] 逐 Habit 的身份、来源、覆盖范围、更新时间与 actual-time 证据明确；刷新失败保留上个有效读数并显示状态。
- [ ] 周一至周日计数，标准目标作为分母；同日完成去重、来源冲突暂不计入、partial／baseline 不擅自折算，未知不等于未完成。
- [ ] 配置目标、当前分母与历史 context 按 G3 处理；精确起睡时刻及次日入睡按 G4 lived-day 规则展示，不从阈值打卡编造分钟。
- [ ] FINAL 周摘要、目标分组、近期点阵、12 周展开和日期记录展示完整；有记录点与完成次数区别可见。
- [ ] 无快照、无目标、部分覆盖、过期／畸形读数可读且不生成数据；合成来源生产到 app 显示全链路可验证。
- [ ] 现有 live skill 暂不修改；快照生产端激活契约移交切换任务，工作流与 packaged Habits 验证通过。

## Handoff notes

先读取 [实施交接约定](../implementation-handoff.md) 和 [2.0 spec](../spec.md)，再执行本票。原型入口与冻结约定见交接文档。

以用户认可的最终修正版 FINAL 为冻结视觉基准。用户已确认这七张票的划分与依赖；父 spec 中较早的 needs-info／待体验文字属于收尾前状态，不是重新开始设计的理由。若发现真正未解决的契约矛盾，报告具体问题，不自行扩展产品范围。

每票限自身范围；前置票不仅需要标记完成，其实现提交还必须存在于当前工作区。遵循 implement：既定工作流边界上的 TDD、适当检查、最终完整测试、独立 code-review、提交当前分支。保留 unrelated dirty changes。未授权 live skill、Dida365、自动化操作不因本票发布而自动获准。
