# Personal Dashboard This Week 工作区 v2 implementation map

Spec: [spec.md](spec.md)

## Resolved tickets

- [01 — 让计划锻炼可以直接记录](issues/01-directly-record-planned-workout.md) — resolved
- [02 — 建立 list-first This Week 与 temporary sheet](issues/02-list-first-this-week-temporary-sheet.md) — resolved
- [03 — 完成 selected scheduled 与 unscheduled workout recording](issues/03-record-selected-and-unscheduled-workouts.md) — resolved
- [04 — 完成 change-time 与 skip 例外流程](issues/04-change-time-and-skip-exceptions.md) — resolved
- [05 — 完成中等窗口与 640x520 compact flow](issues/05-responsive-navigation-and-compact-flow.md) — resolved
- [06 — 完成 packaged Mac This Week acceptance gate](issues/06-packaged-this-week-acceptance-gate.md) — resolved
- [08 — 将默认 prototype 入口指向 v2 A 方案](issues/08-route-default-prototype-to-v2.md) — resolved
- [09 — 在 v2 This Week 中补充独立的 Log workout now 入口](issues/09-add-independent-unscheduled-entry.md) — resolved
- [10 — 让 future row 只显示计划与状态](issues/10-hide-exception-actions-for-future-rows.md) — resolved
- [11 — 恢复准确且可操作的 workout recording controls](issues/11-restore-exact-workout-recording-controls.md) — resolved

## Current frontier

- None — Ticket 06 is the final v2 workspace gate; full rendered Accessibility execution remains environment-blocked by the locked desktop session.

## Blocked tickets


## Dependency notes

- This is a new ticket graph for the v2 This Week workspace. The earlier
  `personal-dashboard-mac-workspace` spec, map, and 01–14 issue files are not
  parents and are not modified by this graph.
- The new graph assumes the already-delivered Tauri 2 foundation, shared Rust
  application core, versioned local persistence, recoverable reminder
  reconciliation, profile/migration behavior, and packaged Mac acceptance seam.
- Tickets 03 and 04 can be worked independently after 02; both must complete
  before the responsive integration ticket 05.
- Ticket 06 is the final packaged delivery gate. No mobile implementation,
  feature expansion, or new dependency is part of this graph.
