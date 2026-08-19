# 10 — 让 future row 只显示计划与状态

**What to build:** 让 This Week 的 row detail 按语义状态显示操作：future planned 只显示计划和状态；due/past unrecorded 才显示直接记录和两项例外操作。

**Blocked by:** 08 — 将默认 prototype 入口指向 v2 A 方案

**Type:** task

**Status:** resolved

- [x] 选中 future planned row 时，只看到日期、时间、活动角色和计划状态，不出现 Record workout、Change to another time 或 Skip this session。
- [x] 选中 due/past unrecorded row 时，`Record workout` 是主操作，`Change to another time` 与 `Skip this session` 是例外操作。
- [x] 任何状态都不重新引入 Leaving for gym、departure reason 或旧 departure-response decision tree。
- [x] moved destination 只有在符合 direct-record eligibility 时提供 Record workout；future 状态仍遵守 future-plan contract。
- [x] fixture 文案、按钮可见性、semantic state 与生产 packaged acceptance 使用同一状态模型，而不是解析显示文案决定操作。

## Comments

- Review comment: #4 — v2 fixture 对未来的 Wednesday/Friday row 暴露了 `Change to another time` 和 `Skip this session`，违反 future-plan contract。

## Answer

默认 v2 A fixture 现在按 semantic slot state 渲染详情操作：`scheduled` future
row 只保留日期、时间、活动角色和 `Scheduled` 状态；`due` 与 `moved` row
继续提供 `Record workout`、`Change to another time` 和 `Skip this session`。
已记录、已跳过和 available capacity 仍保留各自的编辑、撤销或 capacity 说明，
没有恢复 Leaving for gym、departure reason 或 departure-response decision tree。
生产 TypeScript 已经从 semantic view 的 `recordWorkoutAction` 与 exception
fields 决定控件，因此本票只修复 fixture，不重复改 Rust domain 或 IPC。

## Verification

- Playwright fixture：分别选中 Monday due、Wednesday future、Friday future 和 Saturday available；Monday 显示三项操作，Wednesday/Friday 详情只显示计划信息与 `Scheduled`，Saturday 只显示 capacity 说明。
- `node --check .scratch/personal-dashboard-mac-workspace/prototype/ticket-08-week-flow/app.js` 通过；`git diff --check` 通过。
- `npm run check` 通过；`cargo test --manifest-path src-tauri/Cargo.toml` 通过（70 tests passed）。
- 本票没有生产代码或 domain 变更，未重复运行 packaged IPC acceptance；生产 semantic seam 保持不变。
