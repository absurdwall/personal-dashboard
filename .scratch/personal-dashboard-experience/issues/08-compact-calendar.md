# 08: Calendar 完整紧凑月历与记录状态

> Canonical tracker: [PDEX-08 · GitHub #97](https://github.com/absurdwall/personal-dashboard/issues/97). Migrated and verified 2026-10-17. This file retains historical supporting evidence; GitHub owns current state.


**What to build:** 用户在当前窗口看到整月等高日期格和最多四行预览，通过日期旁的小标记区分记录/复盘状态，并能进入完整日期详情。

**Blocked by:** None

**Triage:** ready-for-agent

**Status:** resolved

**ID:** PDEX-08
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** closed
**Implementation:** complete; component acceptance verified
**Owner:** implementer PDEX-08
**Assignee:** implementer PDEX-08
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.
**Start:** User-authorized local claim on 2026-10-10; implementation/evidence below.

## Acceptance criteria

- [x] 五行与六行月份在参考窗口中完整可见，日期格等高，不随任务数增高。
- [x] 默认最多四行单行预览，更多数量位于日期行，预览不覆盖标记或溢出；完整项目仍可查看。
- [x] 日期旁的小型“记/复”不占单独一行，缺失和读取失败区分；不以任务完成数推断复盘。
- [x] 用户进入日期详情仍看到真实 Daily Record 和 Tasks，不创建另一份历史库。
- [x] 检验常用窗口与窄窗口的真实布局，以及已有 Calendar 状态来源；新 Task 区间沿已扩展的共享读取契约显示。

## Verification

stories 45–50.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-08, worktree /tmp/pdex-08; base integration 684ac8be3014a1ff920d97c1e93b54d1bb9eb5a5. Dependency implementation/evidence inspected before start; packaged acceptance remains separately tracked.

- 2026-10-10: Implemented `5f7f1f6` on `codex/pdex-08`, actual starting tip `22d313a`; latest integration `e7c9af1` merged as `1e20cd9`. Natural five/six-week source projection, four title previews with true overflow, compact equal-height cells, source-derived small inline record/review/error markers and full shared date details are implemented. One independent appended-CSS conflict preserved both Calendar and PDEX-07 rules.
- 2026-10-10: Final merged build + 424/424 frontend checks + 127 native Calendar/day-planning/Collaboration/shared-Task checks passed. Eight new full-production-code WebKit cases cover real 1280×720 and 830×758 frames, five/six weeks, preview/marker/overflow geometry and native-source fixture click/readback with seven Tasks and the cross-midnight interval. Native cache lease explicitly released. See [PDEX-08 evidence](../evidence/pdex-08.md).
- 2026-10-10: Criteria checked at confirmed public source/persistence and actual DOM/geometry seams. Packaged/OS/human acceptance remains with PDEX-11; lifecycle remains in-progress and this ticket does not close the parent specification.

## Answer and local resolution

- 2026-10-10: The native clipping defect is repaired; final production WebKit verifies five/six rows at both reference frames and chrome-adjusted clients. Final native default/wide windows show 35/42 equal-height cells, four previews, true +4/+5 overflow, nine full-detail Tasks and separate source-derived read/review/error states. Exact final native reference-frame sizing remains with PDEX-11, not inferred here.
- Final integrated checks: build, 431 frontend, 23 browser and 519 Rust passed (six pre-existing native ignores); independent Standards and Spec reviews have no unresolved findings. [Final packaged observations and limits](../evidence/pdex-11.md) supplement this ticket’s retained original evidence. Status resolved/lifecycle closed applies to this component only; PDEX-09/PDEX-11 and parent PDEX-SPEC-01 remain open. Earlier pending statements above record historical checkpoints.
