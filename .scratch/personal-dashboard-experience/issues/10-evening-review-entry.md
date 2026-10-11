# 10: Evening 一键进入带日期的复盘草稿

**What to build:** 用户从 Evening 开始所查看日期的复盘，进入适合的 Collaboration session，看到带正确上下文的可编辑草稿并自行发送。

**Blocked by:** None

**Triage:** ready-for-agent

**Status:** in-progress

**ID:** PDEX-10
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** in-progress
**Implementation:** in progress
**Owner:** implementer PDEX-10
**Assignee:** implementer PDEX-10
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.
**Start:** Can start immediately once implementation is requested; not claimed.

## Acceptance criteria

- [ ] 当前日与过去日期都有准确的入口措辞、session 目标日期与权威记录上下文。
- [ ] 适合会话可复用，重复点击不创建重复消息，不自动发送或标记已复盘。
- [ ] 已有草稿保留且继续方式清楚，不静默覆盖；草稿和目标日期遵循现有会话保存行为。
- [ ] 复盘沿用现有 skill 与业务操作，不复制 Daily Record，不推导实际活动。
- [ ] 用真实 session/draft 和 Calendar 状态读回验证进入前后及重复进入的外部行为。

## Verification

stories 59–62.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-10, worktree /tmp/pdex-10; base integration 06c0d0b54440766c222da063a330dd53364e3e84. Dependency implementation/evidence inspected before start; packaged acceptance remains separately tracked.
