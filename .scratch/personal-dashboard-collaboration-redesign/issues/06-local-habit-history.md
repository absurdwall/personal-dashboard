# 06: 本地 Habit 补记、撤回与历史查询

> Canonical tracker: [PDCR-06 · GitHub #83](https://github.com/absurdwall/personal-dashboard/issues/83). Migrated and verified 2026-10-17. This file retains historical supporting evidence; GitHub owns current state.


**What to build:** 用户指定 local-only 后可补记或撤回今天/历史 Habit completion，
相关页面准确显示本地证据，回复可以打开相应 Habit/date。

**Blocked by:** [PDCR-02: 显示并保存真实工作过程与最终回复](02-observable-work-history.md)

**Status:** ready-for-agent

**ID:** PDCR-06
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** closed
**Implementation:** complete
**Assignee:** Codex implementer PDCR-06
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [x] 明确 local-only 时不调用 Dida 写入，completion 的 stable identity 和来源保留。
- [x] 阈值达标与真实事件时间分开；dated notes 不被当作 completion。
- [x] 指定历史期间读取 local completions、unknown 与可用 provenance；陈旧 projection
  与 canonical 事实分开，为个人查询和 retro 提供有范围的事实。
- [x] local 保存、snapshot 和页面刷新分别报告；单独修复显示不重复补记。
- [x] before/after 或原/结果 revision 可关联到 effect，重试/撤回不覆盖其他日期。

## Verification

用既有 Habit completion/history 与页面入口，核对 local-only 无外部 mutation、canonical/projection 区分及改动范围。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。

## Execution

- 2026-10-09: Claimed after required blockers closed, for authorized implement-spec. Owner: Codex implementer PDCR-06; branch: `codex/pdcr-06`; integration: `codex/collaboration-redesign-integration`. Tests use spec-confirmed seams.

- 2026-10-09: Completed at the spec-confirmed real Today/Collaboration/file-backed adapters and production frontend. Implementation `76ef192`; merged integration `a87945f` in `773e7c0`; supplemental production receipt fix and exact-link tests `957a701`. See [PDCR-06 evidence](../pdcr-06-evidence.md). All five child criteria are met. Native and live Dida acceptance remain PDCR-11/12; the parent specification remains open.
