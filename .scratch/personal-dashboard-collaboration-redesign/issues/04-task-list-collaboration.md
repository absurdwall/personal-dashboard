# 04: Task 与清单协作反映到真实对象和页面

> Canonical tracker: [PDCR-04 · GitHub #81](https://github.com/absurdwall/personal-dashboard/issues/81). Migrated and verified 2026-10-17. This file retains historical supporting evidence; GitHub owns current state.


**What to build:** 用户通过对话维护 Task/list，含新增、修改、改期、完成、放弃、重开、
归属与已有删除/归档能力；回复和 Tasks/Today/Calendar 显示同一对象。

**Blocked by:** [PDCR-02: 显示并保存真实工作过程与最终回复](02-observable-work-history.md)

**Status:** ready-for-agent

**ID:** PDCR-04
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** closed
**Implementation:** complete
**Assignee:** Codex implementer PDCR-04
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [x] 复用已有操作，不复制 Task store；对象 stable ID、revision 与原始目标保持。
- [x] Task date 和实际完成日期分开；保留无关字段/历史，冲突后重新读取而非覆盖。
- [x] 成功 receipt 包含具体名字、日期与改动，链接打开正确对象，相关页面按效果更新。
- [x] 可读取指定时期相关 Task、状态和实际完成信息，为个人查询和后续 retro 提供事实。
- [x] mixed-intent 请求的 Task 与记录分别形成结果；请求 review 时保留 proposal 行为。

## Verification

用既有 Task/list 与 Collaboration 集成入口，核对 canonical 状态、revision、日期和 Tasks/Today/Calendar 的实际渲染。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。

## Execution

- 2026-10-09: Claimed after required blockers closed, for authorized implement-spec. Owner: Codex implementer PDCR-04; branch: `codex/pdcr-04`; integration: `codex/collaboration-redesign-integration`. Tests use spec-confirmed seams.

## Completion receipt

- 2026-10-09: PDCR-04 acceptance verified through the spec-confirmed actual
  file-backed Collaboration/Task adapters and production frontend seams.
  [Evidence](../pdcr-04-evidence.md) records canonical revisions/completion
  history, bounded source gaps, stable navigation and early page refresh.
- Shared history capability/guidance: `62f10ea`; frontend/evidence changes are
  carried by this closeout commit. 92 Collaboration Task tests, 3 shared
  Task/Today tests, 342 frontend tests and frontend build passed.
- Parent/map/execution reconciliation belongs to the integration owner. Native
  packaged/runtime and live Dida acceptance remain PDCR-11/12, without implied
  app installation, personal writes, release or parent-spec completion.
