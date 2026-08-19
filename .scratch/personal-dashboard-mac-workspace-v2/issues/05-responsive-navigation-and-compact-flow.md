# 05 — 完成中等窗口与 640x520 compact flow

**What to build:** 把已完成的 This Week 普通记录和例外操作整合到三种窗口尺度：`960x720` 保持完整 agenda，中等窄窗口收缩导航并使用有边界的 temporary sheet，`640x520` 使用有文字的目的地切换器和全窗口 drill-in。

**Blocked by:** 03 — 完成 selected scheduled 与 unscheduled workout recording；04 — 完成 change-time 与 skip 例外流程

**Type:** task

**Status:** resolved

- [x] `960x720` 仍然是 list-first 工作区；选中详情覆盖 agenda 而不是永久占用第三栏。
- [x] 中等窄窗口在不压缩 agenda 文本的前提下收缩导航；选中详情使用有边界的 overlay sheet，agenda 仍然可辨认。
- [x] `640x520` 使用有文字的 This Week、History、Settings destination switcher；agenda 和详情一次只显示一个。
- [x] `640x520` 详情占满窗口并提供键盘可达的 Back；Back 返回 agenda 并恢复来源行选中和焦点。
- [x] 所有支持尺寸都不自动打开详情；启动、到期、刷新和 resize 不会夺取用户当前焦点。
- [x] resize 过程中保留 destination、selected row、pending exception 和 workout draft；普通滚动只发生在当前 active surface，body/document 保持固定。
- [x] This Week、History、Settings 三个目的地在桌面和 compact navigation 中都可达；未重设计的 History/Settings 内容不被隐藏。
- [x] packaged viewport/accessibility checks 在 `960x720`、一个 intermediate narrow viewport 和 `640x520` 已加入 acceptance workflow；完整 Accessibility 执行受当前锁定桌面会话阻塞。

## Answer

- Added explicit desktop/intermediate/compact viewport modes without changing the Rust domain seam. Desktop keeps the list-first agenda and temporary overlay; intermediate widths use a compact icon rail while keeping the agenda readable; compact mode uses labeled destination navigation and a full-window drill-in.
- Added responsive state synchronization so resize changes only presentation. The selected destination, selected row, exception editor, workout draft, and source focus remain intact; compact detail changes Close to a keyboard-accessible Back and hides the agenda from the active accessibility surface while open.
- Added the packaged `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=responsive` workflow and Accessibility window-resize support for `960x720`, `800x640`, and `640x520`.

## Verification

- `npm run build`
- `npm run check`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `bash -n scripts/acceptance/macos-ipc-workflow.sh`
- `swiftc scripts/acceptance/macos-ui-driver.swift -framework ApplicationServices -framework AppKit`
- `npm run build:mac`
- `npm run accept:mac` (relocated packaged launch, isolated app data, arm64/native-process checks passed)
- `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=responsive scripts/acceptance/macos-ipc-workflow.sh` (attempted; blocked before rendered UI text exposure because the current desktop session is locked, so full packaged viewport/accessibility execution is not claimed as passed)
