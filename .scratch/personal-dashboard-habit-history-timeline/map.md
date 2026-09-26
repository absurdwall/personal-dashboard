# 历史习惯补记与连续时间轴 — 实现票

## 2026-09-26 当前收尾状态

本 effort 与后续 timeline-a-repair 均已关闭；后者 01 在本次状态核对中补记 resolved。旧 claimed 说明已不适用于当前队列。

用户于 2026-09-23 批准以下两票拆分与依赖。父规格：[已批准范围](spec.md)。源反馈保持原样，本目录为可执行票的唯一入口。

| Ticket | Blocked by | Status |
| --- | --- | --- |
| [01 历史习惯补记与跨午夜更正](issues/01-historical-habit-corrections.md) | None | resolved |
| [02 按 A 原型实现连续时间轴](issues/02-continuous-today-timeline.md) | None | resolved |

当前 frontier：本 effort 的两张实现票均已完成。实现从 `origin/main` `e654461` 开始，在 `codex/historical-habit-corrections` 完成，PR #4 已合入；最终分支提交为 `95989a8fee25a6d7b8d2a8455d95ebfc090f345b`，合并提交为 `45c27800a9ab36ed711d81fb9d9936c4cf87731b`。另一个 effort 的时间轴修复 ticket 01（[恢复 A 卡片可读性](../personal-dashboard-timeline-a-repair/issues/01-restore-readable-a-cards.md)）已在 2026-09-26 根据后续认可方案及旧票收尾指示补记 `resolved`，详见该票 Answer。

A 原型已经确认，不再重开设计选型。每票包含自己的自动化和 packaged App 验收，不另设最后补测票。版本与日常安装另行安排。

01 候选构建：Personal Dashboard `3.0.1`，bundle id `com.tortillaflat.personal-dashboard`，arm64，ad-hoc 签名；SHA-256 `067e4f2a66589e6765417e6ba2ea2a2d15c8fa23e886bc1424b11cec4b880e7a`。`npm run check`、Rust 全套测试、历史更正与本地／外部合并 packaged IPC 场景通过；全量前端测试有一项依赖工作区 Life Companion 技能标题的外部契约失败，详见 ticket 01。未替换日常安装。

02 候选构建：Personal Dashboard `3.0.1`，bundle id `com.tortillaflat.personal-dashboard`，arm64，ad-hoc 签名；SHA-256 `226ad202aaaa182e7f535460caf2d54d38c43a46f7eebb8a76207681d96fb446`。`npm run check`、Cargo 全套测试与 `today-time-axis` packaged IPC 场景通过；全量前端测试保留同一项 Life Companion 标题外部契约失败，详见 ticket 02。未替换日常安装。
