# 09: 在 Codex 完成一次有证据的 workflow retro

**What to build:** 开发者在 Codex 选 session、期间或执行身份，读取本地真实执行与变更
证据，生成可核查的 workflow retro，并联系现有代码提出改进。

**Blocked by:** [PDCR-08: 许可文档与背景更新保留可核验的修改](08-document-background-evidence.md)

**Status:** ready-for-agent

**ID:** PDCR-09
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** open
**Implementation:** not-started
**Assignee:** unassigned
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [ ] 补齐 evidence 的原请求/目标、配置版本、attempt、结果、时间、刷新、终态与
  实际可用 usage。隐私数据留在 app 私有本地存储，历史缺口和截断显式可见。
- [ ] 有可重复使用的 evidence 读取入口与 developer skill；不是只创建 SKILL 文件。
- [ ] 可发现成功前失败、冗余调用、错误日期/对象、可观察的覆盖、未知结果重放与
  报告/receipt 偏差，并引用具体执行及变更证据；事实和原因推断分开。
- [ ] 聚合 usage 不伪装成 per-tool 成本，没有 token 数据不估造数字或金额。
- [ ] 一组完整 synthetic evidence 与一次新的 actual execution 可由开发者核查。
- [ ] 不在 Dashboard 增加开发 command，不自动改 app/skill，不依赖 Desktop 完整业务 adapter。

## Verification

通过真实 evidence 读取入口运行 developer skill，核查 synthetic 完整链路和新的实际执行，不以 skill 文件存在或措辞快照作验收。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。
