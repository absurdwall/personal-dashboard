# 07: 在白天时间轴选区创建与移动 Task

**What to build:** 用户从空白时间选区创建带执行时段的 Task，再拖到另一时段保持计划时长；三个页面呈现同一保存结果。

**Blocked by:** 06 — 保存 Task 计划执行时间段并兼容现有入口

**Triage:** ready-for-agent

**Status:** in-progress

**ID:** PDEX-07
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** in-progress
**Implementation:** in progress
**Owner:** implementer PDEX-07
**Assignee:** implementer PDEX-07
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.

## Acceptance criteria

- [ ] 选取时间范围后进入可编辑 Task 创建入口并保存真实日期、起止和同一 Task 身份。
- [ ] 整体拖动区间保持时长，结束时间可以通过 Task 时间编辑调整；时间点任务保持时点。
- [ ] 边缘滚动、吸附、午夜后的日期和无效范围处理符合规格。
- [ ] 保存后 Tasks、Today 和 Calendar 一致，重开不丢时间段；不创建 Diary 计划副本或实际活动事实。
- [ ] 已完成/放弃等状态继续按现有任务语义处理，不因为时间经过或卡片被移动改变状态。
- [ ] 真实指针交互和任务读回覆盖选区、移时、跨日、失败/冲突，复用已有持久化结果恢复。

## Verification

stories 12, 24, 28–36, 65–67.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-07, worktree /tmp/pdex-07; base integration 61c12cdedfcd4f2728ccb10c8b5ce3d24f40685f. Dependency implementation/evidence inspected before start; packaged acceptance remains separately tracked.
