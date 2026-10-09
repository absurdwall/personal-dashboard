# Collaboration redesign — local tracker

ID: PDCR-MAP
Type: map
Date: 2026-10-09
Canonical: this local tracker, explicitly selected by the user
Stage: tickets-published, awaiting implementation request
Implementation: not-started
Working branch: codex/collaboration-redesign-spec

## Records

| ID | Type | Body | Triage | Lifecycle | Dependencies | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| PDCR-SPEC-01 | spec | [Spec](spec.md) | ready-for-agent | open | none | Test boundary confirmed; [prototype review](prototype-review.md); ADR 0005/0006 |
| PDCR-01 | ticket | [01: 用统一 usage skill 完成并核验一条白天记录](issues/01-skill-daytime-record.md) | ready-for-agent | open | none | unassigned; not-started; breakdown approved 2026-10-09 |
| PDCR-02 | ticket | [02: 显示并保存真实工作过程与最终回复](issues/02-observable-work-history.md) | ready-for-agent | open | PDCR-01 | unassigned; not-started; breakdown approved 2026-10-09 |
| PDCR-03 | ticket | [03: 排队、停止、纠正与未知结果恢复](issues/03-queue-stop-recovery.md) | ready-for-agent | open | PDCR-02 | unassigned; not-started; breakdown approved 2026-10-09 |
| PDCR-04 | ticket | [04: Task 与清单协作反映到真实对象和页面](issues/04-task-list-collaboration.md) | ready-for-agent | open | PDCR-02 | unassigned; not-started; breakdown approved 2026-10-09 |
| PDCR-05 | ticket | [05: 计划、晚间复盘与历史记录协作](issues/05-daily-record-collaboration.md) | ready-for-agent | open | PDCR-02 | unassigned; not-started; breakdown approved 2026-10-09 |
| PDCR-06 | ticket | [06: 本地 Habit 补记、撤回与历史查询](issues/06-local-habit-history.md) | ready-for-agent | open | PDCR-02 | unassigned; not-started; breakdown approved 2026-10-09 |
| PDCR-07 | ticket | [07: 映射 Dida Habit 与 snapshot 的独立结果](issues/07-mapped-dida-habit-results.md) | ready-for-agent | open | PDCR-06 | unassigned; not-started; breakdown approved 2026-10-09 |
| PDCR-08 | ticket | [08: 许可文档与背景更新保留可核验的修改](issues/08-document-background-evidence.md) | ready-for-agent | open | PDCR-02 | unassigned; not-started; breakdown approved 2026-10-09 |
| PDCR-09 | ticket | [09: 在 Codex 完成一次有证据的 workflow retro](issues/09-workflow-retro.md) | ready-for-agent | open | PDCR-08 | unassigned; not-started; breakdown approved 2026-10-09 |
| PDCR-10 | ticket | [10: 在 Dashboard 完成 personal retro](issues/10-personal-retro.md) | ready-for-agent | open | PDCR-04, PDCR-05, PDCR-06 | unassigned; not-started; breakdown approved 2026-10-09 |
| PDCR-11 | ticket | [11: 真实 Codex 与 app 内完整交互验收](issues/11-native-codex-acceptance.md) | ready-for-agent | open | PDCR-03, PDCR-07, PDCR-09, PDCR-10 | unassigned; not-started; breakdown approved 2026-10-09 |
| PDCR-12 | ticket | [12: 同一候选版本的 live Dida 核验](issues/12-live-dida-acceptance.md) | ready-for-agent | open | PDCR-11 | unassigned; not-started; breakdown approved 2026-10-09 |

Twelve approved tickets are published, each with its own body and acceptance
criteria. All remain unassigned and not started. Ready-for-agent describes the
triage role; it does not start implementation or establish delivery.

## Decisions so far

- 以持续对话为主；一个 Dashboard usage skill 集中指导，复用现有业务能力，不新增 Dashboard MCP。
- 过程来自实际生成内容和工具事件；完成后工作历史默认折叠，可回看失败及恢复。
- Local、external、snapshot、page 和 history persistence 结果分别核验。
- 普通消息排队，不 steer；停止后队列暂停，用户可先发送纠正。已完成修改保留，未知结果先核对。
- Personal retro 在 Dashboard，workflow retro 在 Codex 开发环境；本轮不要求 Desktop 完整 Dashboard 业务调用。
- 2026-10-09 用户认可 app 壳内 prototype，并确认主要测试边界。
- 2026-10-09 用户同意 [12-ticket breakdown](ticket-breakdown-proposal.md) 的粒度和依赖；正式每票一文件发布，尚未授权实施。
- 本轮 spec、之后获授权的 tickets 与执行全部本地追踪、在 codex/ 分支提交；不写 GitHub，不自动合入 main。

## Next stage

Await the user's implementation request. Then follow [execution tracking](execution.md),
claim an eligible ticket locally, and work the dependency frontier. The current
frontier is **PDCR-01 only**. No claim or product work has been started.

The graph has 12 tickets and 16 direct blocking edges. Direct blockers are shown
above and in each ticket body; after PDCR-02 closes, PDCR-03/04/05/06/08 become
eligible if still unassigned. PDCR-10 does not wait for optional external writes.
PDCR-12 validates the same complete candidate as PDCR-11.

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

- 2026-10-09: User approved the proposed 12-ticket graph. Published PDCR-01–12
  with 16 direct blocking edges and [execution conventions](execution.md).
  All tickets are ready-for-agent/open/unassigned; no implementation or release
  was performed. The parent spec remains unchanged and open.
