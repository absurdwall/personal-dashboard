# Personal Dashboard Mac workspace implementation map

## 2026-09-26 当前收尾状态

本 effort 已退役：01–07 保留 resolved，08–14 为 wontfix（被后续产品取代）。没有当前 frontier 或阻塞队列。下面依赖关系仅为历史。

## Historical ticket list

- [07 — Respond to a pending departure without losing context](issues/07-respond-to-pending-departure-without-losing-context.md) — resolved
- [08 — Record any workout in the contextual pane](issues/08-record-any-workout-in-contextual-pane.md) — wontfix
- [09 — Review and correct historical weeks](issues/09-review-and-correct-historical-weeks.md) — wontfix
- [10 — Adjust this week or the repeating routine in context](issues/10-adjust-this-week-or-repeating-routine-in-context.md) — wontfix
- [11 — Manage profile and authority under Profile & Data](issues/11-manage-profile-and-authority-under-profile-data.md) — wontfix
- [12 — Inspect reminder readiness under Notifications](issues/12-inspect-reminder-readiness-under-notifications.md) — wontfix

## Retired dependent tickets

- [13 — Preserve every workflow in the compact window](issues/13-preserve-every-workflow-in-compact-window.md) — wontfix（历史依赖已失效）
- [14 — Prove the accessible production Mac workspace](issues/14-prove-accessible-production-mac-workspace.md) — wontfix（历史依赖已失效）

## Dependency notes

- Tickets 01 and 04 are the initial frontier and may proceed independently.
- Tickets 02 and 03 both reuse the schedule-reminder reconciliation established by 01.
- Production presentation begins only after all four correctness prerequisites, 01 through 04, are resolved.
- Tickets 07 and 08 may proceed independently after the This Week agenda is established by 06.
- Tickets 09 through 12 may proceed independently after the workspace navigation is established by 05.
- Ticket 13 integrates every completed destination and action flow into the compact-window contract.
- Ticket 14 is the final Mac production acceptance gate; mobile work remains outside this effort.
