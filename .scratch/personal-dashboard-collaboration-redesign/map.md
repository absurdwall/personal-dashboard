# Collaboration redesign — local tracker

ID: PDCR-MAP
Type: map
Date: 2026-10-09
Canonical: this local tracker, explicitly selected by the user
Stage: specification
Implementation: not-started
Working branch: codex/collaboration-redesign-spec

## Records

| ID | Type | Body | Triage | Lifecycle | Dependencies | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| PDCR-SPEC-01 | spec | [Spec](spec.md) | ready-for-agent | open | none | Test boundary confirmed; [prototype review](prototype-review.md); ADR 0005/0006 |

No implementation tickets exist for this iteration. The spec's triage role
does not claim implementation, authorize ticket breakdown or establish delivery.

## Decisions so far

- 以持续对话为主；一个 Dashboard usage skill 集中指导，复用现有业务能力，不新增 Dashboard MCP。
- 过程来自实际生成内容和工具事件；完成后工作历史默认折叠，可回看失败及恢复。
- Local、external、snapshot、page 和 history persistence 结果分别核验。
- 普通消息排队，不 steer；停止后队列暂停，用户可先发送纠正。已完成修改保留，未知结果先核对。
- Personal retro 在 Dashboard，workflow retro 在 Codex 开发环境；本轮不要求 Desktop 完整 Dashboard 业务调用。
- 2026-10-09 用户认可 app 壳内 prototype，并确认主要测试边界。
- 本轮 spec、之后获授权的 tickets 与执行全部本地追踪、在 codex/ 分支提交；不写 GitHub，不自动合入 main。

## Next stage

After the user's separate request, create complete implementation tickets with
stable IDs and an explicit dependency graph, then record the authorized
execution procedure. Do not treat this section as a queued implementation task.

## Local tracking conventions

- Spec ID is PDCR-SPEC-01. Allocate ticket IDs PDCR-01, PDCR-02, etc. only when
  actual tickets are created; never recycle an ID. Keep complete ticket bodies
  linked from this table, with the parent spec and blockers inside each body.
- Triage uses needs-triage, needs-info, ready-for-agent, ready-for-human or wontfix.
  Track lifecycle separately as open/in-progress/blocked/closed and preserve
  implementation, acceptance and release distinctions.
- An eligible ticket has open lifecycle, ready-for-agent triage, no assignee
  and all blockers closed with their required evidence. A claim is recorded
  in its local body and map before work starts, together with owner and branch.
- Record transitions with date, evidence and commit references; commit durable
  ticket/map/evidence changes. Use execution records for ongoing notes rather
  than rewriting the spec to pretend it was always implemented.
- Close a ticket only when its stated acceptance criteria are met. Separate
  local code/test completion, native app acceptance, external-source acceptance
  and release/merge status. Missing external access is not a successful test.
- Store real personal data/credentials only outside version control; checked-in
  evidence uses synthetic or redacted examples. Main stays protected. GitHub
  migration, pushing, merging and installing require the relevant later scope.

## Publication history

- 2026-10-09: User invoked to-spec and selected local-only tracking. This batch
  publishes the spec, prototype verdict, source inventory, vocabulary/ADR and
  scoped tracker rules. No product implementation or tickets were started.
- The Git commit containing this batch is the local publication receipt; use
  Git history for its hash rather than self-referencing a hash inside that commit.
