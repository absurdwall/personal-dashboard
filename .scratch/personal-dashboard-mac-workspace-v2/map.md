# Personal Dashboard This Week 工作区 v2 — fixture/design history map

Spec: [spec.md](spec.md)

## Scope boundary

This effort records the approved v2 design contract and the fixture/prototype work that made that contract concrete. Tickets 08–13 are resolved within their declared fixture/design scope. They do not mean that the real production app is complete.

The production implementation has its own fresh namespace and dependency graph:

[Open the production delivery map](../personal-dashboard-mac-workspace-v2-production/map.md)

Use that map for all remaining work. Do not reopen or append production work to this historical effort, and do not continue with ticket 14.

## Resolved fixture/design tickets

- [01 — 让计划锻炼可以直接记录](issues/01-directly-record-planned-workout.md) — resolved
- [02 — 建立 list-first This Week 与 temporary sheet](issues/02-list-first-this-week-temporary-sheet.md) — resolved
- [03 — 完成 selected scheduled 与 unscheduled workout recording](issues/03-record-selected-and-unscheduled-workouts.md) — resolved
- [04 — 完成 change-time 与 skip 例外流程](issues/04-change-time-and-skip-exceptions.md) — resolved
- [05 — 完成中等窗口与 640x520 compact flow](issues/05-responsive-navigation-and-compact-flow.md) — resolved
- [06 — 完成 packaged Mac This Week acceptance gate](issues/06-packaged-this-week-acceptance-gate.md) — resolved as historical baseline/evidence; not the final production parity gate
- [07 — 统一 issue tracker status vocabulary](issues/07-reconcile-issue-tracker-status-vocabulary.md) — resolved
- [08 — 将默认 prototype 入口指向 v2 A 方案](issues/08-route-default-prototype-to-v2.md) — resolved
- [09 — 在 v2 This Week 中补充独立的 Log workout now 入口](issues/09-add-independent-unscheduled-entry.md) — resolved
- [10 — 让 future row 只显示计划与状态](issues/10-hide-exception-actions-for-future-rows.md) — resolved
- [11 — 恢复准确且可操作的 workout recording controls](issues/11-restore-exact-workout-recording-controls.md) — resolved
- [12 — 将 changed destination 呈现为独立可记录 row](issues/12-materialize-moved-destination-row.md) — resolved
- [13 — 让 v2 的 History、Settings 与 compact destination 可达](issues/13-make-v2-destinations-reachable.md) — resolved

## What “resolved” means here

These tickets establish the v2 fixture/reference behavior and the review history. They are not a claim that frontend/, src-tauri/, or the packaged Mac application now match the prototype. The production map owns that claim and requires a fresh packaged-app gate.

## Historical dependency notes

- The earlier personal-dashboard-mac-workspace spec, map, and 01–14 issue files remain historical and are not parents of the production effort.
- The approved A fixture remains read-only reference material for production implementation.
- The production effort must preserve the existing Tauri 2, Rust, persistence, reminder, profile/migration, and packaged-acceptance boundaries while closing the real frontend/application gaps.
