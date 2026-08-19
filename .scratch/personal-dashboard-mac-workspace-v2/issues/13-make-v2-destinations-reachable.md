# 13 — 让 v2 的 History、Settings 与 compact destination 可达

**Review comment:** #7 — v2 fixture 的 desktop nav buttons 和 compact destination select 都没有 handler；History/Settings 与 compact route 实际不可达。

**What to build:** 保持 v2 只 redesign This Week，同时让共享壳层的 This Week、History、Settings destination 在桌面、中等窗口和 `640x520` compact flow 中真实可达。

**Blocked by:** 08 — 将默认 prototype 入口指向 v2 A 方案

**Type:** task

**Status:** resolved

- [x] desktop nav buttons 能切换 destination，并以 `aria-current`/等价语义暴露当前 destination。
- [x] compact destination switcher 能切换 This Week、History、Settings；select/change 不再是 no-op。
- [x] History 和 Settings 在 fixture 中至少显示明确的 destination surface；生产中保留现有内容，不在本 ticket 重设计其内部工作流。
- [x] 从 History/Settings 返回 This Week 时，This Week 的 destination、selection、焦点和进行中的 v2 flow 按 spec 保持可预测。
- [x] `640x520` 使用有文字的 destination switcher，详情仍然是单表面 drill-in，并保留可达的 Back。
- [x] 不增加新的产品 area、mobile implementation、dependency 或 cloud/service path。

## Verification

- fixture 在 `960x720`、中等窄窗口和 `640x520` 完成三处 destination switching，并检查当前状态和返回路径。
- packaged acceptance 通过 Accessibility 操作验证 nav/select、current destination、compact route 和 focus restoration。
- 现有 History/Settings 行为与 v2 的共享壳层 contract 继续通过。

## Comments

- Review comment: #7 — v2 fixture 的 desktop nav buttons 和 compact destination select 都没有 handler；History/Settings 与 compact route 实际不可达。
- Implementation follow-up: the v2 A fixture now routes all three shared destinations, exposes the current desktop destination semantically, and keeps the This Week selection/detail flow intact across destination changes.

## Answer

已在批准的 v2 A `ticket-08-week-flow` fixture 中接通共享壳层的 This Week、History、Settings。
桌面与中等窗口使用带 `aria-label` 的 nav buttons，并只为当前 destination 输出
`aria-current="page"`；`640x520` 使用带 value 的文字 destination select，三项均会
切换到明确的 fixture surface。History 显示当前 fixture 的 recorded-workout surface，
Settings 显示 local profile/data surface；production 的既有 History/Settings 内容没有改动。
destination 切换只改变 destination，不重置 selected row、detail mode 或进行中的 recording
draft，返回 This Week 会恢复原 v2 flow；compact summary detail 也保留了可达的 Back。
本票没有增加新的产品 area、移动端实现、依赖或 cloud/service path。

## Verification

- Playwright fixture：在 `960x720`、`800x720` 中用 desktop nav 完成 This Week → History → Settings → This Week；在 `640x520` 用文字 select 完成 This Week → History → Settings → This Week。
- Playwright compact detail：`640x520` 打开 Monday detail，确认单表面 `Back to This Week` 可达并恢复源控件焦点；在 detail 打开时切换到 History 再返回 This Week，selected Monday 与 detail flow 保留。
- Playwright accessibility：确认 desktop destination controls 的 accessible names、current destination 的 `aria-current="page"`、compact select 的 selected option 与 focus restoration。
- Packaged Accessibility attempt：`PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=responsive scripts/acceptance/macos-ipc-workflow.sh` 在当前 locked desktop session 等待 production bundle 的 `Log workout now` 时超时；fixture 的 Playwright coverage 通过，且本票没有改动 production bundle seam。
- `node --check .scratch/personal-dashboard-mac-workspace/prototype/ticket-08-week-flow/app.js` 通过；`git diff --check` 通过。
- `npm run check` 通过；完整 `cargo test --manifest-path src-tauri/Cargo.toml` 通过（70 tests passed）。
