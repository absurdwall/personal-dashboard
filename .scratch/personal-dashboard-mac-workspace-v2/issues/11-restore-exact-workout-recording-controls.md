# 11 — 恢复准确且可操作的 workout recording controls

**What to build:** 让 v2 recording surface 与现有 workout domain contract 完全一致，并让每个 click-only choice 真正参与 staged flow 和保存结果。

**Blocked by:** 08 — 将默认 prototype 入口指向 v2 A 方案

**Type:** task

**Status:** resolved

- [x] Activity 严格使用并按既有顺序显示 `Elliptical`、`Weight training`、`Other exercise`。
- [x] Duration 严格使用并按既有顺序显示 `Under 20`、`20`、`30`、`45`、`60+ minutes`。
- [x] Perceived effort 严格使用并按既有顺序显示 `Very easy`、`Easy`、`Moderate`、`Hard`、`Very hard`，并保留 “Harder is not better.” 的中性指导。
- [x] 每个阶段只在用户 click 后更新 selected state；下一阶段和 Save workout 使用实际选择，而不是 fixture 固定值。
- [x] 全流程无需 typing；Under 20 的保存语义保留但不增加 qualifying progress，其他 qualifying duration 只增加一次 progress。
- [x] fixture 只作为 design evidence；生产验证继续穿过现有 Rust application seam 和 packaged Tauri acceptance，不新增测试 seam 或依赖。

## Comments

- Review comment: #5 — fixture 显示了错误的 Activity/Duration/Effort 选项，而且 choice buttons 没有改变选择或保存所选值。
- Review follow-up: scheduled fixture saves now retain all three selected values and show them again from the saved row detail.

## Answer

本票要求的 staged recording flow 已随 issue 09 的独立 workout 入口一并落在
`36e9cde`：fixture 使用 Rust domain contract 的三组 exact choices，点击后把
选择写入 `recordingDraft`，推进到下一阶段，并在 Save workout review 中显示实际
activity、duration、effort。本票补齐了 scheduled row 的保存边界：保存时保留三项
选择，并在返回详情时显示已保存摘要。`Under 20` 保留为 recorded-short，不增加
qualifying progress；其他时长只完成一次 qualifying progress。生产 Rust seam 未改动。

## Verification

- Playwright fixture：选择 `Other exercise` → `Under 20` → `Very hard`，逐阶段进入下一步；最终 review 显示这三个实际选择，保存后重新打开 Monday 详情仍显示三项已保存值，且 short effort 进度保持 `0 of 3`。
- `node --check .scratch/personal-dashboard-mac-workspace/prototype/ticket-08-week-flow/app.js` 通过。
- `npm run check` 通过；`cargo test --manifest-path src-tauri/Cargo.toml` 通过（70 tests passed），覆盖既有 choice-order、qualification、persistence 和 relaunch seam。
- 本票没有新增测试 seam、依赖或生产/domain 代码；packaged IPC acceptance 未重复运行，生产 semantic seam 保持不变。
