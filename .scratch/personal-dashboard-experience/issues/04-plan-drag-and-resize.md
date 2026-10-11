# 04: 拖动计划并调整结束时间

**What to build:** 用户直接拖动白天计划或具体区间的结束边界，时间预览与实际保存一致；近似计划移动后保持近似，长拖动能从上午移到下午或晚间。

**Blocked by:** 02 — 将模糊计划定位并编辑时间精度

**Triage:** ready-for-agent

**Status:** in-progress

**ID:** PDEX-04
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** in-progress
**Implementation:** in progress
**Owner:** implementer PDEX-04
**Assignee:** implementer PDEX-04
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.

## Acceptance criteria

- [ ] 具体区间整体移动保留时长，结束边界单独调整时长；时点不会自动变成区间。
- [ ] 模糊计划拖动后保存为新的近似时间，不产生精确时长。
- [ ] 采用已定吸附规则并支持边缘滚动；现存非整刻时间不会在读取时被改写。
- [ ] 拖动先预览，真实保存并读回后成为正式结果，沿用冲突、失败和未确认结果的恢复行为。
- [ ] 默认只改 Current arrangement；Confirmed facts 不具有此拖动写入行为，Morning 与 Task 不被联动修改。
- [ ] 同一操作具有非拖动替代编辑方式；通过实际指针操作及文件读回验证上午到晚间、重开、冲突失败的结果。

## Verification

stories 4, 19–27, 63–67.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-04, worktree /tmp/pdex-04; base integration a77603ec3f857f8a05a747b802c632f6aa269525. Dependency implementation/evidence inspected before start; packaged acceptance remains separately tracked.
