# 01 — 让计划锻炼可以直接记录

**What to build:** 让用户选中一个到期或已过去但尚未记录的计划锻炼后，直接通过现有 click-only 记录流程完成锻炼记录，不需要先完成 Leaving for gym 或选择 departure reason。

**Blocked by:** None — can start immediately；依赖已有的 Tauri、Rust、版本化持久化、提醒和 packaged acceptance 基线。

**Status:** resolved

- [x] 语义视图能区分 future planned 与 due/past unrecorded；后者提供直接的 Record workout action。
- [x] 计划锻炼不再要求 Leaving for gym、departure reason 或其他 pre-departure response 才能进入记录流程。
- [x] 记录流程保留 Elliptical、Weight training、Other exercise、完整 duration presets 和五个 perceived-effort 选项，并且全程无需输入文字。
- [x] 保存后记录仍然关联原计划 occurrence；Under 20 被保存但不增加 qualifying progress，qualifying record 只增加一次进度。
- [x] 关闭并重新打开 packaged app 后，保存的记录、原计划行状态和进度仍然可见。
- [x] 现有 exercise workflow、reminder eligibility、history 和 profile 行为保持通过；本 ticket 不实现 change-time 或 skip 例外。

## Answer

已在共享 Rust application seam 和现有 This Week agenda 上实现直接记录：到期/过去的 primary occurrence，以及已分配的 fallback occurrence，现在暴露语义化的 `Record workout` action；未来计划不会暴露该 action。记录仍复用现有 click-only activity、duration、effort 流程，并通过既有 `WorkoutRecord`/`source_slot_id` 持久化，因此不需要 schema migration。完成后会清理该 occurrence 的 reminder eligibility，Under 20 保留记录但不增加 progress，重复记录被拒绝。

验证通过：`cargo test --manifest-path src-tauri/Cargo.toml`、`npm run check`、`cargo fmt -- --check`、`npm run build:mac` 和 `npm run accept:mac`。同时增加了 `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=direct scripts/acceptance/macos-ipc-workflow.sh` 的 packaged direct-record 场景；当前桌面会话中的 relocated app 没有创建可访问窗口，因此该 Accessibility UI 场景暂时只能报告环境限制，Rust persistence/relaunch seam 已覆盖同一行为。follow-up 到期状态继续保留既有 `Unresolved` 语义，但不阻止直接记录。
