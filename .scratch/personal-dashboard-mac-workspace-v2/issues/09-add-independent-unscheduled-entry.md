# 09 — 在 v2 This Week 中补充独立的 Log workout now 入口

**What to build:** 按 v2 spec 的 normal recording contract，把 `Log workout now` 放入 This Week 的可见工作区，并保持它与选中的 scheduled row 独立。

**Blocked by:** 08 — 将默认 prototype 入口指向 v2 A 方案

**Type:** task

**Status:** resolved

- [x] 默认 This Week 在没有选中 row 时也能找到 `Log workout now`，且它不是某个 Saturday/Sunday capacity row 的别名。
- [x] 入口打开与 scheduled workout 相同的分阶段 click-only recording flow，不要求 Leaving for gym、departure reason 或文字输入。
- [x] 保存 unscheduled workout 使用独立的 unscheduled source，不改变任何 scheduled row 的状态或选中关系。
- [x] Under 20 record 被保留但不增加 qualifying progress；qualifying record 只增加一次 progress，并在返回 This Week 后可见。
- [x] fixture 的状态变化与生产 semantic view/packaged acceptance 对齐；如果生产 seam 已满足语义，只补齐证据和入口，不重复改 Rust domain。

## Comments

- Review comment: #3 — approved v2 fixture 的 agenda 没有独立的 unscheduled workout entry point。

## Answer

已在批准的 v2 A fixture 中增加独立的 `Extra workout` 区块和 `Log workout now`
按钮。它不复用 Saturday/Sunday capacity row，也不改写当前 selected scheduled
row；保存后 fixture 单独保留 `Unscheduled workout` source，并只把 qualifying
记录计入 This Week progress。入口复用同一套 activity → duration → effort 的
click-only staged flow，包含 Under 20 和中性 effort 指导；现有生产
Rust/application semantic seam 已支持 Under 20 的保留但不计 qualifying，以及
unscheduled 的 `sourceSlotId: null`，本票没有重复修改 domain 或 IPC。

## Verification

- fixture 鼠标流程：默认 This Week → `Log workout now` → Elliptical → 30 → Moderate → `Save workout`，返回列表后显示 `Unscheduled workout`、`Counts toward weekly progress` 和 `1 of 3 qualifying workouts completed`。
- fixture Under 20 流程：选择 Weight training → `Under 20` → Easy 后保存，记录显示 `Short effort — does not count toward weekly progress`，This Week 仍为 `0 of 3`。
- fixture 键盘流程：Tab 聚焦 `Log workout now`，Enter 打开 `Unscheduled workout` detail；选中 Wednesday 后完成相同流程，Wednesday 仍保持 selected、Scheduled，未显示 scheduled workout evidence。
- fixture viewport 检查：`960x720` 和 `640x520` 均保持 body/document fixed，且入口可见；`node --check`、`git diff --check`、`npm run check` 通过。
- Rust/application workflow：`cargo test --manifest-path src-tauri/Cargo.toml`（70 tests passed），包括现有 unscheduled qualifying、Under 20、source 和 relaunch 语义。
- packaged IPC acceptance 已尝试运行 `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=workouts scripts/acceptance/macos-ipc-workflow.sh`；当前 Codex desktop 隔离 packaged app 未暴露 Accessibility 文本，在等待 `Log workout now` 时超时，因此保留为环境限制，未冒充通过。
