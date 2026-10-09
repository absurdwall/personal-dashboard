# 06: 本地 Habit 补记、撤回与历史查询

**What to build:** 用户指定 local-only 后可补记或撤回今天/历史 Habit completion，
相关页面准确显示本地证据，回复可以打开相应 Habit/date。

**Blocked by:** [PDCR-02: 显示并保存真实工作过程与最终回复](02-observable-work-history.md)

**Status:** ready-for-agent

**ID:** PDCR-06
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** open
**Implementation:** not-started
**Assignee:** unassigned
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [ ] 明确 local-only 时不调用 Dida 写入，completion 的 stable identity 和来源保留。
- [ ] 阈值达标与真实事件时间分开；dated notes 不被当作 completion。
- [ ] 指定历史期间读取 local completions、unknown 与可用 provenance；陈旧 projection
  与 canonical 事实分开，为个人查询和 retro 提供有范围的事实。
- [ ] local 保存、snapshot 和页面刷新分别报告；单独修复显示不重复补记。
- [ ] before/after 或原/结果 revision 可关联到 effect，重试/撤回不覆盖其他日期。

## Verification

用既有 Habit completion/history 与页面入口，核对 local-only 无外部 mutation、canonical/projection 区分及改动范围。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。
