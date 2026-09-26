# 14 — Prove the accessible production Mac workspace

**Type:** task

**What to build:** Complete production confidence for the Agenda-led Mac workspace by proving its behavior, accessibility, persistence, window contracts, and delivery boundaries in the packaged application.

**Blocked by:** 13 — Preserve every workflow in the compact window.

**Status:** wontfix

> 2026-09-26 状态核对：关闭为 wontfix（旧产品已退役），不再执行旧 Exercise／This Week UI 的这张独立票。后续 v2 parity-closure 和 review-fixes 已承接历史交付；personal-dashboard-2/issues/07-cutover-and-retire-exercise.md 记录已完成的真实 2.0 切换和旧 Exercise 退役。本次按用户要求清空历史未结队列，不把已退役功能声称为当前产品能力。 下方旧状态和未勾选项保留为历史，不代表当前待执行队列。

- [ ] Packaged acceptance covers This Week navigation and row selection, pending-action presentation and recovery, one complete workout, History selection and editing, every Settings subsection, and consequential confirmation.
- [ ] Exact `960x720` acceptance proves required weekly state and actions are visible without body scrolling; exact `640x520` acceptance proves compact navigation and active-surface scrolling.
- [ ] Keyboard acceptance covers logical tab order, visible focus, destination switching, row selection, Needs attention, compact Back, action choices, and confirmations.
- [ ] Semantic acceptance covers navigation, main, lists, detail, forms, live status, selected or current state, and dialogs with accessible names.
- [ ] Dialog acceptance covers initial focus, focus containment, safe Escape dismissal, cancellation, and restoration to the triggering control.
- [ ] Complete, upcoming, unresolved, unavailable, inactive, denied, and warning states use meaningful text and a non-color signal.
- [ ] Existing exercise, profile backup, profile move, migration, source-boundary, and packaged Mac acceptance remain passing alongside TypeScript and Rust checks.
- [ ] Screenshots support human review but semantic, interactive, persistence, and viewport assertions determine pass or failure.
- [ ] No mobile implementation or acceptance, new product area, cloud service, dependency, deployment work, schema-only presentation change, or unresolved prototype refinement enters this phase.
 - [ ] The implementation map and acceptance documentation truthfully record the completed Mac workspace and any remaining explicitly deferred limitations.

## Answer

关闭为 wontfix（旧产品已退役），不再执行旧 Exercise／This Week UI 的这张独立票。后续 v2 parity-closure 和 review-fixes 已承接历史交付；personal-dashboard-2/issues/07-cutover-and-retire-exercise.md 记录已完成的真实 2.0 切换和旧 Exercise 退役。本次按用户要求清空历史未结队列，不把已退役功能声称为当前产品能力。

本次仅核对并收尾记录，没有重新运行产品测试或修改 App。
