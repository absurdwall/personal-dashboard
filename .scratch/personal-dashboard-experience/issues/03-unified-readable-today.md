# 03: 保持早间文字与可读的统一白天时间轴

**What to build:** Morning 是文字安排；Daytime 的计划、定时 Task 与事实使用一条刻度，冲突时临时并排，不冲突时整行，在常用和窄窗口里都能阅读、定位和选中。

**Blocked by:** None

**Triage:** ready-for-agent

**Status:** resolved

**ID:** PDEX-03
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** closed
**Implementation:** complete; component acceptance verified
**Owner:** implementer PDEX-03
**Assignee:** implementer PDEX-03
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.
**Start:** Authorized and claimed on 2026-10-10; no direct blockers.

## Acceptance criteria

- [x] Morning 仍为文字安排，不新增晨间时间轴，展示对应来源。
- [x] Current arrangement、Task 与 Confirmed facts 同轴、有来源标记，不固定按来源分三列。
- [x] 冲突条目临时并排且可选，无冲突条目占整行，卡片不会互相遮住主要操作目标。
- [x] Lived day 边界、午夜后的日期标签和折叠时段内容可发现；已有内容不被折叠机制隐藏。
- [x] 时间轴独立滚动，在常用和窄窗口可读；时间过去不把安排变成事实。
- [x] 在真实渲染界面用既有精确计划、时间点 Task 和事实独立验证；后续新时间类型可以沿相同区间/精度契约接入。

## Verification

stories 1, 3, 8–13, 26–27.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-03, worktree /tmp/pdex-03; base integration f400013d8b27800f8397e24769ae6c153a149cfc. Dependency implementation/evidence inspected before start; packaged acceptance remains separately tracked.

- 2026-10-10: Production presentation implemented in `ed10038`; synchronized integration via `d83e24b` and refined real window-size verification in `669968c`. Nine compiled-production WebKit interaction/geometry tests passed, with source distinctions, point Tasks, exact plan ranges and facts; full frontend suite passed 406 tests. [Evidence](../evidence/pdex-03.md) retains TDD failures, common dimensions, source/scroll behavior and the remaining packaged acceptance boundary. No native persistence path was added or altered by this ticket.

## Remaining acceptance

- Code and automated rendered-UI criteria are verified. Common packaged Tauri candidate and human usability acceptance remain pending under PDEX-11; lifecycle stays in-progress and this does not close the parent specification.
- Fuzzy plan semantics and Task execution-interval projection retain their owning tickets and unchanged source identity; the shared renderer consumes their existing start/end and precision contracts when integrated.

## Answer and local resolution

- 2026-10-10: Independent Morning text and the unified source-marked axis passed final production WebKit checks at common/narrow clients; final native Today/Collaboration correctly read the immutable baseline. Overlap, lived-day bounds, folded content and independent scroll have actual rendered interaction evidence. Subsequent saved Task/plan values use this shared contract.
- Final integrated checks: build, 431 frontend, 23 browser and 519 Rust passed (six pre-existing native ignores); independent Standards and Spec reviews have no unresolved findings. [Final packaged observations and limits](../evidence/pdex-11.md) supplement this ticket’s retained original evidence. Status resolved/lifecycle closed applies to this component only; PDEX-09/PDEX-11 and parent PDEX-SPEC-01 remain open. Earlier pending statements above record historical checkpoints.
