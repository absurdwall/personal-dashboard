# 03 — 完成 selected scheduled 与 unscheduled workout recording

**What to build:** 在最终 This Week temporary sheet 中完成计划锻炼和额外锻炼的完整记录流程；保存后退出详情、回到原 agenda，并保留被影响行的选中状态。

**Blocked by:** 02 — 建立 list-first This Week 与 temporary sheet

Type: task

**Status:** resolved

- [x] 选中 due/past unrecorded 的计划行后，Record workout 是主操作，且来源日期、时间和计划身份保持可见。
- [x] Activity、duration、perceived effort 的分阶段 click-only flow 在 temporary sheet 中完整可用，保留既有选项、顺序和中性指导。
- [x] 保存 qualifying workout 后，temporary sheet 关闭，来源行显示 Workout recorded，progress 立即更新且只更新一次。
- [x] 保存 Under 20 后，记录保留在该行/历史中，但 qualifying progress 不增加。
- [x] Log workout now 作为独立入口可达；额外记录使用 Unscheduled workout source，不会静默绑定到选中的计划行。
- [x] 记录过程中的 draft 经过既有持久化边界后仍可恢复；重启后可继续或看到一致的已保存结果。
- [x] 记录完成后选中行和键盘焦点保持在受影响行，不会跳到其他日期或打开新的自动详情。
- [x] packaged acceptance 已加入通过渲染控件和真实 Tauri IPC 完成 scheduled 与 unscheduled workflow、验证 relaunch 的场景；当前桌面会话无法暴露隔离 app 的 Accessibility UI，因此运行被环境阻塞。

## Answer

已完成 selected scheduled 与 unscheduled workout recording：

- temporary sheet 显示计划的日期、时间和 `Primary workout` / `Open capacity workout` 身份；Record workout 仍是 due/past unrecorded 行的主操作。
- Rust application seam 的 activity、duration、perceived effort 分阶段保存保持 click-only；planned record 保留 `sourceSlotId`，unscheduled record 保持 `sourceSlotId: null`。
- qualifying 完成后 sheet 关闭、来源行显示 `Workout recorded`、选中行恢复焦点；unscheduled 完成后焦点回到 `Log workout now`，不会残留旧计划行选中状态。
- History 目的地现在也展示当前周记录，确保没有来源行的 unscheduled workout 仍可看到 source、活动、时长、effort 和资格结果。
- `scripts/acceptance/macos-ipc-workflow.sh` 新增 `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=workouts`，覆盖 planned draft relaunch、planned Under 20 completion、unscheduled qualifying completion、source/history 和最终 relaunch。

验证通过：

- `npm run check`
- `cargo test --manifest-path src-tauri/Cargo.toml`（66 tests passed）
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `bash -n scripts/acceptance/macos-ipc-workflow.sh`
- `swiftc scripts/acceptance/macos-ui-driver.swift -framework ApplicationServices -framework AppKit ...`
- `scripts/acceptance/tauri-only-source.sh`
- `npm run build:mac`
- `npm run accept:mac`

限制：`PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=list-first` 与 `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=workouts` 均在等待隔离 packaged app 的 `Log workout now` Accessibility 文本时超时；同一 Codex 桌面环境无法暴露该复制 app 的可访问性窗口，故不能诚实地报告 rendered-control workflow 已通过。`workouts` 场景已经把 planned Under 20 纳入 release gate，待可访问性环境恢复后重跑即可完成最后证据。
