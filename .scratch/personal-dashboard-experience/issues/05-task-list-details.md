# 05: Tasks 使用清晰勾选列表与所选详情

**What to build:** 用户在保留清单侧栏的简洁任务列表中勾选完成，点击任务查看和编辑详情；长内容与次要操作集中于详情，窄窗口仍可使用。

**Blocked by:** None

**Status:** ready-for-agent

**ID:** PDEX-05
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** open
**Implementation:** not started
**Owner:** unassigned
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.
**Start:** Can start immediately once implementation is requested; not claimed.

## Acceptance criteria

- [ ] 清单侧栏与既有范围导航保留，列表行以名字和明确完成勾选为中心。
- [ ] 点击任务选择/查看详情与勾选完成互不误触；任务完成真实保存并在相关页面反映。
- [ ] 内容、日期、时间和清单归属可编辑；放弃、删除、重开和历史仍可访问。
- [ ] 详情编辑未改变的业务数据保持原值；不会因新的简洁显示丢失已有字段。
- [ ] 在窄窗口使用可返回详情或下方详情，不挤成固定多列工作台。
- [ ] 基于现有任务即可独立演示和检验，验证真实保存/读回与选择状态，而非只检查源码字符串。

## Verification

stories 38–44, 63, 65–67.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.
