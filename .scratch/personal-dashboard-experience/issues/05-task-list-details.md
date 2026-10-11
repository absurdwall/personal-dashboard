# 05: Tasks 使用清晰勾选列表与所选详情

**What to build:** 用户在保留清单侧栏的简洁任务列表中勾选完成，点击任务查看和编辑详情；长内容与次要操作集中于详情，窄窗口仍可使用。

**Blocked by:** None

**Triage:** ready-for-agent

**Status:** in-progress

**ID:** PDEX-05
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** in-progress
**Implementation:** implemented
**Acceptance:** partial — automatic checks passed; packaged acceptance remains PDEX-11
**Owner:** implementer PDEX-05
**Assignee:** implementer PDEX-05
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.
**Start:** Authorized and claimed in this implement-spec run; see Execution below.

## Acceptance criteria

- [x] 清单侧栏与既有范围导航保留，列表行以名字和明确完成勾选为中心。
- [ ] 点击任务选择/查看详情与勾选完成互不误触；任务完成真实保存并在相关页面反映。
- [x] 内容、日期、时间和清单归属可编辑；放弃、删除、重开和历史仍可访问。
- [x] 详情编辑未改变的业务数据保持原值；不会因新的简洁显示丢失已有字段。
- [x] 在窄窗口使用可返回详情或下方详情，不挤成固定多列工作台。
- [ ] 基于现有任务即可独立演示和检验，验证真实保存/读回与选择状态，而非只检查源码字符串。

## Verification

stories 38–44, 63, 65–67.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-05, worktree /tmp/pdex-05; base integration 96182199cb0162db38a5e5184b621d2d17901564. Dependency implementation/evidence inspected before start; packaged acceptance remains separately tracked.

- 2026-10-10: PDEX-05 implementation on `codex/pdex-05` in `/tmp/pdex-05` started from `768c68d`. Retained increments `7b242c9` and `6880893`; merged current integration `393d7ea` as `4093ee1`. Compact rows and one selected canonical full detail retain the sidebar, scope/state filters, keyboard completion/reopen, history, management controls, deep links and drafts. Detail is below the list at narrow sizes.
- 2026-10-10: Production build, 424 frontend checks, seven actual Chrome production-page Task interaction cases and 43 public Rust Task/Today/Calendar persistence checks passed with synthetic data. No Task backend contract changes; existing restart, interval preservation, same identity, state/history, damaged source and stale revision workflows remain green. [Full evidence](../evidence/pdex-05.md).
- Acceptance remains partial: external Tauri IPC is mocked only for the Chrome interactions; native application/file storage tests independently verify persistence. Packaged native checkbox/detail interactions and final Task/Today/Calendar plus Collaboration-return acceptance remain PDEX-11. This ticket is implemented, not closed, and does not close PDEX-SPEC-01.

- 2026-10-10: Final integration `b2eae26` (PDEX-04) merged as `c8d8d9d`, preserving both append-only CSS changes. Production build and 424 frontend checks green; combined actual Chrome Task-detail/Task-axis/plan-axis checks all 23 green. Native 43 checks independently rerun at preceding `4093ee1`; packaged acceptance unchanged.
