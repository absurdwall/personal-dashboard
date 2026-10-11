# 06: 保存 Task 计划执行时间段并兼容现有入口

**What to build:** 用户从真实 Task 编辑入口设置计划执行的起止时间，重开后仍保留；三个页面读同一 Task，现有对话和离线入口更新任务也不会丢失时段。

**Blocked by:** None

**Status:** ready-for-agent

**ID:** PDEX-06
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** in-progress
**Implementation:** implemented; packaged UI acceptance pending
**Owner:** implementer PDEX-06
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.
**Start:** Can start immediately once implementation is requested; not claimed.

## Acceptance criteria

- [ ] Task 编辑可以设置、调整、明确清除可选执行区间；真实保存和重开后起止日期/时间一致。
- [x] 无日期、只有日期、单时间点的旧 Task 继续有效，没有虚构结束时间或数据重标。
- [x] 跨午夜区间明确保留结束所属日期，非法区间不截断或翻转；现有 Task date 语义保持。
- [ ] Task、Today 和 Calendar 读取同一身份和区间；区间不变成 deadline、完成状态或实际耗时。
- [x] Collaboration 与 daily-flow adapter 的读写契约兼容新能力；遗漏新字段保留既有值，明确清除才移除；旧调用修改内容/状态/清单不会丢失区间。
- [x] 扩展保留绿色中间状态、已有身份与历史；共享任务和 adapter 集成测试验证保存、重复投递、旧入口更新和新实例读回。
- [ ] 对新的时段字段提供当前真实编辑入口，不仅落盘一个无法使用的 schema。

## Verification

stories 28, 31–37, 63–67.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-06; isolated worktree /tmp/pdex-06; based on codex/dashboard-experience-integration from 8960c80. Q4 application/persistence and actual UI seams already confirmed.

- 2026-10-10: Implementation increments retain `b701562`, `fa7c059`,
  `5cd2ad8`, `48fefa6` plus the subsequent Collaboration/evidence increment.
  The optional end contract uses existing Task date/time as start; omission
  preserves, null clears, and explicit end dates support overnight ranges.
  The real shared Task editor includes end date/time and clear controls.
- 2026-10-10: Isolated synthetic verification: 156 scoped Rust tests and 389
  frontend tests passed; frontend build passed. Evidence:
  [PDEX-06 checks and acceptance boundary](../evidence/pdex-06.md).
  Backend/operation checks prove save/read/restart, interval mutation,
  old content/list/state updates, history and current-revision replay without
  new Task identities. The actual packaged UI criteria remain unchecked for
  PDEX-11; this record does not claim installation or full user acceptance.
