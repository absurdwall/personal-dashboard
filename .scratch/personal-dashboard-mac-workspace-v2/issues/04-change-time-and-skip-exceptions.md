# 04 — 完成 change-time 与 skip 例外流程

**What to build:** 让用户从选中的 This Week 行处理两种例外：把本周的一次锻炼改到任意尚未过去的星期/时间，或直接跳过并可撤销；两种操作都不改变 repeating routine。

**Blocked by:** 02 — 建立 list-first This Week 与 temporary sheet

**Type:** task

**Status:** resolved

- [x] due/past unrecorded 详情提供 Change to another time 和 Skip this session 作为例外操作，而不是 departure-response decision tree。
- [x] change-time 显示所有尚未过去的 weekday/time choices；Saturday/Sunday 是默认建议，但不是唯一可选时段。
- [x] 用户界面明确显示最终安排的星期和时间，不显示内部术语 fallback，也不施加额外时间范围限制。
- [x] 发生冲突时显示清楚的 warning；只有用户明确确认后才允许保存有意冲突。
- [x] 确认后原行保留 adjustment result，新目标时段成为独立且可记录的 activity row；repeating routine 不被改写。
- [x] 改时间同时更新当前周可见 agenda、语义状态和 reminder intent，并保持已有 recoverable/idempotent reminder reconciliation 行为。
- [x] Skip 直接执行，不要求原因或二次确认；结果不增加 progress，并立即提供 Undo。
- [x] 成功的 change-time、skip 或 Undo 返回 This Week，保留受影响行的选中状态，并在 packaged UI 中验证持久化结果。

## Answer

- Added schema-10 one-off adjusted departures with explicit semantic exception state, direct Skip/Undo, all-future schedule choices, conflict preview/confirmation, target-row recording, and reminder reconciliation through the Rust application seam.
- Added the This Week temporary-sheet flow and a visible Changed this week group; the UI keeps the original row selected after exception actions and exposes Undo without the old departure-response tree.
- Added application-workflow coverage for Skip/Undo, Saturday/Sunday suggestions, arbitrary future choices, conflict confirmation, persistence, target recording, and repeating-routine isolation.
- Added the packaged acceptance scenario `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=exceptions` covering direct Skip/Undo, logical exception-editor focus, conflict preview, explicit confirmation semantics, an arbitrary Tuesday change-time choice, target recording, and relaunch persistence.

## Verification

- `npm run build`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`
- `bash -n scripts/acceptance/macos-ipc-workflow.sh`
- `npm run build:mac`
- `npm run accept:mac` (relocated packaged launch, isolated app data, arm64/native-process checks passed)
- `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=exceptions scripts/acceptance/macos-ipc-workflow.sh` (the expanded accessibility workflow is wired, but this desktop run was blocked by the current locked/relocated-app accessibility session at the initial rendered-text wait; it is not claimed as passed)
