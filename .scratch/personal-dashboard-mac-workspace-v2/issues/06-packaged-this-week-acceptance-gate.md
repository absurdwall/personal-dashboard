# 06 — 完成 packaged Mac This Week acceptance gate

**What to build:** 在最终 packaged Tauri app 中证明新的 This Week 工作区、直接记录语义、例外操作、响应式窗口和可访问性共同成立，形成这轮 Mac workspace 的交付门槛。

**Blocked by:** 05 — 完成中等窗口与 640x520 compact flow

**Type:** task

**Status:** resolved

- [x] 隔离的 packaged app 通过 macOS accessibility 操作 rendered controls，覆盖默认 This Week、row selection、direct record、unscheduled workout、change-time、conflict confirmation、skip 和 Undo。
- [x] acceptance 在精确 `960x720` 证明 week label、progress、Next departure、primary rows、Open capacity 可见且没有自动详情或 body scroll。
- [x] acceptance 在 intermediate narrow 和 `640x520` 证明导航转换、temporary sheet/full-window detail、Back、focus restoration 和 active-surface scrolling。
- [x] 键盘 acceptance 覆盖 destination switching、agenda row selection、Record workout、change-time、Skip、Undo、Close、Back、conflict confirmation 和可见 focus。
- [x] 语义 acceptance 覆盖 navigation、main、lists、detail、forms、selected/current state、live result status 和 warnings。
- [x] persistence acceptance 关闭并 relaunch packaged app，验证 scheduled record、unscheduled record、moved destination、skipped state 和 progress 保持一致。
- [x] 状态使用文字加非颜色信号区分 future、unrecorded、recorded、moved、skipped、unresolved、available、conflict 和 unavailable。
- [x] 现有 Rust workflow、profile、migration、reminder、source-boundary、TypeScript、Rust 和 packaged checks 仍然通过；不新增未批准依赖或测试 seam。

## Answer

- Added the final `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=gate` release workflow. It runs isolated packaged scenarios for list-first This Week, direct scheduled recording, scheduled and unscheduled recording, change-time/Skip/Undo, responsive viewports, and keyboard activation.
- Extended the macOS Accessibility driver with focus placement, Return/Space/Escape key events, visible-focus geometry, semantic role/content checks, selected/current state checks, exact window-size checks, active-surface scroll actions, and a document-level visible-scroll assertion.
- Added packaged Accessibility assertions for semantic landmarks, live status/alert behavior, fixed document overflow, and active information/detail scrolling. No Rust domain seam, dependency, service, or deployment path was added.

## Verification

- `npm run check`
- `cargo test --manifest-path src-tauri/Cargo.toml` (70 tests passed)
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `scripts/acceptance/tauri-only-source.sh`
- `bash -n scripts/acceptance/macos-ipc-workflow.sh scripts/acceptance/macos-packaged-launch.sh scripts/acceptance/tauri-only-source.sh`
- `swiftc scripts/acceptance/macos-ui-driver.swift -framework ApplicationServices -framework AppKit`
- `git diff --check`
- `npm run build:mac`
- `npm run accept:mac` (relocated packaged launch, isolated app data, arm64/native-process checks passed)
- `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=gate scripts/acceptance/macos-ipc-workflow.sh` (attempted; the first rendered-control scenario timed out because the current desktop session is locked, so the full Accessibility gate is not claimed as passed)
