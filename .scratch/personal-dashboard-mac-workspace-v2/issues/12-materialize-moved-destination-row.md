# 12 — 将 changed destination 呈现为独立可记录 row

**Review comment:** #6 — fixture 保存 change-time 后只更新原 row 的 `movedTo` 文本，目标 Saturday row 仍是 generic Available，没有可记录的目标活动。

**What to build:** 按 v2 exception contract，在 change-time 成功后保留原 row 的 adjustment result，并 materialize 一个独立的 moved-destination activity row。

**Blocked by:** 08 — 将默认 prototype 入口指向 v2 A 方案

**Type:** task

**Status:** resolved

- [x] 保存 change-time 后，原 row 保留 `Changed this week` 等文字和非颜色信号，不被替换或删除。
- [x] 目标星期/时间新增独立 activity row，明确显示 moved destination 语义，而不是继续显示 generic `Available`。
- [x] 目标 row 在符合 direct-record eligibility 时提供 `Record workout`，并将记录关联到 moved occurrence；不得静默绑定回原 row。
- [x] future target 在尚未到期时遵守 future-plan action contract，到期后才进入 direct-record eligibility。
- [x] repeating routine 不被改写；现有 conflict preview/confirmation、reminder intent、Undo/返回 This Week 行为保持不变。

## Comments

- Review comment: #6 — fixture 保存 change-time 后只更新原 row 的 `movedTo` 文本，目标 Saturday row 仍是 generic Available，没有可记录的目标活动。
- Implementation follow-up: the v2 A fixture now materializes a separate moved destination occurrence and removes the exact destination slot from generic open capacity.

## Answer

已在批准的 v2 A `ticket-08-week-flow` fixture 中补齐 moved-destination
occurrence：change-time 保存后，Monday 原 row 保留 `Changed this week · Saturday · 4:00 PM`
与 `↪` 非颜色信号，同时在 `Changed this week` 分组新增独立 Saturday activity row。
目标 row 使用 `exceptionKind: "changed-destination"`、`sourceId` 和自己的 slot id；
目标时间尚未到期时不显示 action，进入 direct-record eligibility 后只显示
`Record workout`，保存的 record 绑定目标 row 的 `sourceSlotId`，不会回写 Monday。
对应的 Saturday capacity row 不再继续显示 generic `Available`。生产 Rust/UI seam
本来已提供 adjusted departure、source 关系、future gating、recording 和 relaunch
语义，因此本票没有重复改动 domain 或新增依赖。

## Verification

- Playwright fixture：默认 A → Monday → `Change to another time` → Saturday · 4:00 PM → `Save new time` 后，同时看到原始 Monday adjustment row、独立 Saturday `Moved workout` row 和 Sunday-only open capacity；打开 target detail 显示 `Moved destination`、`From Monday · 4:00 PM`，且 future target 没有 record/exception actions。
- `node --check .scratch/personal-dashboard-mac-workspace/prototype/ticket-08-week-flow/app.js` 通过；`git diff --check` 通过。
- `npm run check` 通过。
- `cargo test --manifest-path src-tauri/Cargo.toml change_time_preserves_original_creates_recordable_target_and_leaves_routine_unchanged` 通过，覆盖 source preservation、独立 adjusted target、future gating、到期 direct record、target source record、progress 和 relaunch。
- packaged acceptance 未重复运行；既有 production semantic seam 已由上述 application workflow 覆盖，未新增测试 seam、依赖或 domain 代码。
