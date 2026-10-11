# 04: 拖动计划并调整结束时间

**What to build:** 用户直接拖动白天计划或具体区间的结束边界，时间预览与实际保存一致；近似计划移动后保持近似，长拖动能从上午移到下午或晚间。

**Blocked by:** 02 — 将模糊计划定位并编辑时间精度

**Triage:** ready-for-agent

**Status:** resolved

**ID:** PDEX-04
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** closed
**Implementation:** complete; component acceptance verified
**Owner:** implementer PDEX-04
**Assignee:** implementer PDEX-04
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.

## Acceptance criteria

- [x] 具体区间整体移动保留时长，结束边界单独调整时长；时点不会自动变成区间。
- [x] 模糊计划拖动后保存为新的近似时间，不产生精确时长。
- [x] 采用已定吸附规则并支持边缘滚动；现存非整刻时间不会在读取时被改写。
- [x] 拖动先预览，真实保存并读回后成为正式结果，沿用冲突、失败和未确认结果的恢复行为。
- [x] 默认只改 Current arrangement；Confirmed facts 不具有此拖动写入行为，Morning 与 Task 不被联动修改。
- [x] 同一操作具有非拖动替代编辑方式；通过实际指针操作及文件读回验证上午到晚间、重开、冲突失败的结果。

## Verification

stories 4, 19–27, 63–67.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-04, worktree /tmp/pdex-04; base integration a77603ec3f857f8a05a747b802c632f6aa269525. Dependency implementation/evidence inspected before start; packaged acceptance remains separately tracked.

- 2026-10-10: Implemented persisted move/end-edit regression and synthetic public views in `9a55b41`; production plan adapters, shared-owner preview/resize, independent source guards and retained-value recovery in `cd707ea`. History-preserving merges `8199be6` and `2503003` retain PDEX-07/PDEX-08 integration. Public application suites (16 Daily Plan + 54 Today), build, 424 frontend tests and actual Chrome pointer suites (8 plan + 8 existing Task cases) passed. See [evidence](../evidence/pdex-04.md) for seams, commands and red-green observations. Implementation is code-ready; final packaged pointer-to-file/reopen acceptance remains unchecked for PDEX-11. Lifecycle stays in-progress.

## Answer and local resolution

- 2026-10-10: Public persisted move/resize, final browser pointer edge-scroll/cancel tests, original native long movement/resize and final virtual point movement plus explicit editor/conflict/write-failure/restart jointly verify this component. Exact final native held-edge testing remains a separate PDEX-11 gate; it is not claimed as passed here.
- Final integrated checks: build, 431 frontend, 23 browser and 519 Rust passed (six pre-existing native ignores); independent Standards and Spec reviews have no unresolved findings. [Final packaged observations and limits](../evidence/pdex-11.md) supplement this ticket’s retained original evidence. Status resolved/lifecycle closed applies to this component only; PDEX-09/PDEX-11 and parent PDEX-SPEC-01 remain open. Earlier pending statements above record historical checkpoints.
