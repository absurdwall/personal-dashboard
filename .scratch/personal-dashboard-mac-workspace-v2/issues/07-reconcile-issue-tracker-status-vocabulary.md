# 07 — 统一 issue tracker status vocabulary

**Review comment:** #1 — historical follow-up issues use `Status: ready-for-agent`, while the issue-tracker guide only documented `claimed` and `resolved`.

**What to build:** 让 issue tracker 文档同时表达 triage 状态和执行生命周期，并保持历史 issue 文件可读；本 ticket 不改变旧 effort 的产品范围或 ticket 内容。

**Blocked by:** None

**Type:** task

**Status:** resolved

- [x] `docs/agents/issue-tracker.md` 明确允许 `needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human` 和 `wontfix` 作为开始执行前的 triage 状态。
- [x] 文档继续定义 `claimed` 为执行中、`resolved` 为已完成，并保留 claim/resolve 的操作规则。
- [x] 不重写上一轮 `personal-dashboard-mac-workspace` 的历史 issue 文件，也不把历史 issue 当作 v2 设计来源。

## Answer

已将 issue tracker 规则改为：ticket 开始执行前使用 `triage-labels.md` 的 canonical triage 状态；开始执行后改为 `claimed`，完成后改为 `resolved`。这样历史文件中的 `ready-for-agent` 与新 v2 follow-up tickets 都有明确且一致的含义。

## Verification

- `docs/agents/issue-tracker.md` 与 `docs/agents/triage-labels.md` 的状态词汇一致。
- 本轮新增 v2 tickets 使用 `ready-for-agent`，完成后再按规则改为 `claimed`/`resolved`。
