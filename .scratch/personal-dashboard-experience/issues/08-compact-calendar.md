# 08: Calendar 完整紧凑月历与记录状态

**What to build:** 用户在当前窗口看到整月等高日期格和最多四行预览，通过日期旁的小标记区分记录/复盘状态，并能进入完整日期详情。

**Blocked by:** None

**Triage:** ready-for-agent

**Status:** in-progress

**ID:** PDEX-08
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** in-progress
**Implementation:** in progress
**Owner:** implementer PDEX-08
**Assignee:** implementer PDEX-08
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.
**Start:** Can start immediately once implementation is requested; not claimed.

## Acceptance criteria

- [ ] 五行与六行月份在参考窗口中完整可见，日期格等高，不随任务数增高。
- [ ] 默认最多四行单行预览，更多数量位于日期行，预览不覆盖标记或溢出；完整项目仍可查看。
- [ ] 日期旁的小型“记/复”不占单独一行，缺失和读取失败区分；不以任务完成数推断复盘。
- [ ] 用户进入日期详情仍看到真实 Daily Record 和 Tasks，不创建另一份历史库。
- [ ] 检验常用窗口与窄窗口的真实布局，以及已有 Calendar 状态来源；新 Task 区间沿已扩展的共享读取契约显示。

## Verification

stories 45–50.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-08, worktree /tmp/pdex-08; base integration 684ac8be3014a1ff920d97c1e93b54d1bb9eb5a5. Dependency implementation/evidence inspected before start; packaged acceptance remains separately tracked.
