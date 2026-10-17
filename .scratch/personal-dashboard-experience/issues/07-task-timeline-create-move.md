# 07: 在白天时间轴选区创建与移动 Task

> Canonical tracker: [PDEX-07 · GitHub #96](https://github.com/absurdwall/personal-dashboard/issues/96). Migrated and verified 2026-10-17. This file retains historical supporting evidence; GitHub owns current state.


**What to build:** 用户从空白时间选区创建带执行时段的 Task，再拖到另一时段保持计划时长；三个页面呈现同一保存结果。

**Blocked by:** 06 — 保存 Task 计划执行时间段并兼容现有入口

**Triage:** ready-for-agent

**Status:** resolved

**ID:** PDEX-07
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** closed
**Implementation:** complete; component acceptance verified
**Owner:** implementer PDEX-07
**Assignee:** implementer PDEX-07
**Acceptance:** component verified; full packaged/OS gates retained in PDEX-11
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.

## Acceptance criteria

- [x] 选取时间范围后进入可编辑 Task 创建入口并保存真实日期、起止和同一 Task 身份。
- [x] 整体拖动区间保持时长，结束时间可以通过 Task 时间编辑调整；时间点任务保持时点。
- [x] 边缘滚动、吸附、午夜后的日期和无效范围处理符合规格。
- [x] 保存后 Tasks、Today 和 Calendar 一致，重开不丢时间段；不创建 Diary 计划副本或实际活动事实。
- [x] 已完成/放弃等状态继续按现有任务语义处理，不因为时间经过或卡片被移动改变状态。
- [x] 真实指针交互和任务读回覆盖选区、移时、跨日、失败/冲突，复用已有持久化结果恢复。

## Verification

stories 12, 24, 28–36, 65–67.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-07, worktree /tmp/pdex-07; base integration 61c12cdedfcd4f2728ccb10c8b5ce3d24f40685f. Dependency implementation/evidence inspected before start; packaged acceptance remains separately tracked.

- 2026-10-10: Implemented editable blank-range Task creation, direct Task
  movement, optional interval projection, 15-minute snapping, edge scrolling,
  cancellation and visible bounds feedback through one shared pointer owner.
  Exact natural dates and stable Task IDs remain in the existing Task store;
  Task completion/abandonment and Daily Record data stay independent.
- 2026-10-10: Retained coherent increments `11ecb10`, `6be7eac`, and merge
  `1491c57` of integration `6bd91ad`. Resolved additive merge conflicts while
  keeping broad plan editing, Morning text and Task details. Evidence:
  [PDEX-07 pointer/persistence checks](../evidence/pdex-07.md).
- 2026-10-10: Real production-DOM Chrome mouse/keyboard scenarios: 8 passed;
  Tauri IPC is the mocked system boundary. Independent real FileTaskStore/
  TaskApplication/Calendar tests: 53 scoped tests passed. Frontend suite 411
  passed and build passed. Saved-state recovery, current content preservation
  and explicit retry have actual pointer checks; no uncertain write replays
  automatically. Native packaged IPC and final cross-page human acceptance
  remain explicitly pending PDEX-11 rather than inferred from these checks.
- 2026-10-10: Last synchronization includes integration `9d4bcd7`; combined
  build, 416 frontend tests and all 8 real Chrome pointer scenarios passed.
  Packaged native IPC acceptance remains distinct and pending PDEX-11.

## Answer and local resolution

- 2026-10-10: Final virtual blank selection created a real 30-minute Task, movement retained its duration and ID, detail changes persisted, and the same saved object appears in Task/Today/Calendar and restart. Daily Record bytes stayed identical throughout. Public persistence and actual browser pointer scenarios retain bounds, edge-scroll, conflict/cancel and cross-day evidence.
- Final integrated checks: build, 431 frontend, 23 browser and 519 Rust passed (six pre-existing native ignores); independent Standards and Spec reviews have no unresolved findings. [Final packaged observations and limits](../evidence/pdex-11.md) supplement this ticket’s retained original evidence. Status resolved/lifecycle closed applies to this component only; PDEX-09/PDEX-11 and parent PDEX-SPEC-01 remain open. Earlier pending statements above record historical checkpoints.
