# Dashboard experience improvements — local tracker

ID: PDEX-MAP
Type: map
Date: 2026-10-10
Canonical: this local tracker, explicitly selected by the user
Stage: authorized implementation in progress
Implementation: in progress
Working branch: codex/dashboard-experience-integration
Management source: source-personal-dashboard-experience

## Records

| ID | Type | Body | Triage | Lifecycle | Dependencies | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| PDEX-SPEC-01 | spec | [Complete specification](spec.md) | ready-for-agent | open | none | [Prototype R](prototype/README.md), [Q1–Q4](design-review.md), [publication](publication.md) |
| PDEX-01 | ticket | [01: 在白天手动编辑具体计划并可靠保存](issues/01-current-plan-time-editor.md) | ready-for-agent | in-progress | none | code merged 32b3678; 11 native workflows; UI acceptance pending |
| PDEX-02 | ticket | [02: 将模糊计划定位并编辑时间精度](issues/02-approximate-plan-times.md) | ready-for-agent | in-progress | PDEX-01 | code merged a77603e; 69 native + five full-page modal checks; packaged pending |
| PDEX-03 | ticket | [03: 保持早间文字与可读的统一白天时间轴](issues/03-unified-readable-today.md) | ready-for-agent | in-progress | none | code merged 06c0d0b; 406 frontend + nine rendered WebKit checks; packaged pending |
| PDEX-04 | ticket | [04: 拖动计划并调整结束时间](issues/04-plan-drag-and-resize.md) | ready-for-agent | in-progress | PDEX-02 | claimed: implementer PDEX-04; codex/pdex-04 |
| PDEX-05 | ticket | [05: Tasks 使用清晰勾选列表与所选详情](issues/05-task-list-details.md) | ready-for-agent | in-progress | none | claimed: implementer PDEX-05; codex/pdex-05 |
| PDEX-06 | ticket | [06: 保存 Task 计划执行时间段并兼容现有入口](issues/06-task-execution-intervals.md) | ready-for-agent | in-progress | none | code merged 61c12cd; 156 native + merged 397 frontend/121 native checks; UI pending |
| PDEX-07 | ticket | [07: 在白天时间轴选区创建与移动 Task](issues/07-task-timeline-create-move.md) | ready-for-agent | in-progress | PDEX-06 | code merged 9618219; 416 frontend + eight real pointer + 53 native checks; packaged pending |
| PDEX-08 | ticket | [08: Calendar 完整紧凑月历与记录状态](issues/08-compact-calendar.md) | ready-for-agent | in-progress | none | code merged a4fb8ce; 424 frontend + 127 native source/state checks; packaged pending |
| PDEX-09 | ticket | [09: Collaboration 减负与 slash 命令补全](issues/09-collaboration-command-completion.md) | ready-for-agent | in-progress | none | code merged f400013; 396 frontend + serialized native pass; packaged/IME pending |
| PDEX-10 | ticket | [10: Evening 一键进入带日期的复盘草稿](issues/10-evening-review-entry.md) | ready-for-agent | in-progress | none | code merged 684ac8b; 138 native + five WebKit entry checks; packaged pending |
| PDEX-11 | ticket | [11: 验证同一打包版本的完整日常流程](issues/11-packaged-daily-flow-acceptance.md) | ready-for-agent | open | PDEX-03, PDEX-04, PDEX-05, PDEX-07, PDEX-08, PDEX-09, PDEX-10 | unassigned; not started |

The spec and eleven approved tickets are published locally. Every ticket retains its complete body and separate acceptance criteria.
Current claim and implementation states are recorded per row and ticket. The Work Item index [00-spec](issues/00-spec.md) refers to
this full body and the same PDEX-SPEC-01 identity; it is not an implementation
ticket or a second specification. Do not renumber existing PDEX records.

## Frontier and execution boundary

The initial eligible frontier is PDEX-01, PDEX-03, PDEX-05, PDEX-06,
PDEX-08, PDEX-09 and PDEX-10. PDEX-02/04/07/11 are gated by the declared
dependencies. There are ten direct blocking edges with no cycles or redundant
transitive edges. Read each full ticket before a later authorized claim.

[Execution record](execution.md) retains claim/branch/commit/verification
conventions. Breakdown approval authorized publication. The subsequent implement-spec
request authorizes ticket implementation; installation and parent-spec closure
remain separate boundaries.

## Decisions so far

- Use the accepted prototype R and B-style Task list, with the confirmed
  compact Calendar, Morning text, shared Daytime axis and temporary overlap lanes.
- Q1: display and corresponding source document must agree.
- Q2: Task intervals represent planned execution time, not deadlines or facts.
- Q3: ordinary Daytime dragging updates Current arrangement, not Morning baseline.
- Q4: reuse application/persistence workflows and packaged App acceptance with
  synthetic data; prototype memory and source-string checks are insufficient.
- The user selected local spec/tickets/execution with complete Git commit history
  while GitHub is unavailable. This initiative's project rule now records that choice.

## Local tracking conventions

- The spec ID is PDEX-SPEC-01. Allocate PDEX-01, PDEX-02, etc. only when actual
  implementation tickets are requested and created. Never reuse or renumber IDs.
- Each ticket retains its full body, parent spec, direct blockers, triage,
  lifecycle, owner, working branch, acceptance criteria and evidence links.
- Use the five-role triage vocabulary. Track open/in-progress/blocked/closed
  lifecycle separately from triage; ready-for-agent is not delivery or a claim.
- Record authorized claims in the ticket and this map before execution;
  an eligible ticket must have its dependencies satisfied with the required evidence.
- Record dated transitions, reviews, tests and failure/recovery outcomes, and
  commit coherent increments. No silently rewritten or discarded history.
- Close only with its own acceptance evidence. Keep code completion, automated
  checks, packaged UI acceptance, installation and remote integration separate.
- Keep personal data/credentials outside version control. Use synthetic or redacted
  evidence and preserve unrelated dirty work.
- Retain code and durable records on codex/ branches. Main stays protected;
  local tracking does not authorize main merge, remote push or installation.

## Commit history and remote handoff

[Remote handoff](remote-handoff.md) records the retained base, branch and
prototype/specification commits. Future implementation uses a coherent local
commit chain that can be pushed as a branch after remote access returns, without
losing planning or review history.

GitHub Issues migration is separate from Git branch push. Preserve complete
records and local-ID-to-Issue mappings; keep one declared canonical tracker,
avoid duplicate open queues, and do not migrate automatically.

## Publication history

- 2026-10-10: Prototype R and Q1–Q3 confirmed; first non-template draft recorded
  at 14df60e, then explicitly deleted and replaced under to-spec at ae191ee.
- 2026-10-10: Q4 testing boundary confirmed; all seven sections and 68 user stories
  complete. Initial GitHub preflight was unavailable; no Issue was created.
- 2026-10-10: User explicitly selected local-only spec/tickets/execution.
  PDEX-SPEC-01 is published with ready-for-agent/open, no tickets or implementation.
  The commit containing this entry is its local publication receipt.
- 2026-10-10: Installed Management helper confirmed local source registration
  and a fresh readback: source-personal-dashboard-experience is current and exposes
  exactly one spec index, no implementation tickets. Source revision 4210d09f1153d1bf.
- 2026-10-10: User approved the eleven-slice breakdown and ten direct blocking
  edges. Published PDEX-01–11, each ready-for-agent/open/unassigned with its own
  full body and acceptance criteria. The parent spec and spec index are unchanged.
  The commit containing this batch is the ticket-publication receipt.
- 2026-10-10: Fresh Management inspect confirmed twelve local records, no
  malformed references and the seven-ticket frontier declared above. Ten
  blocking edges resolve; source revision 66ea1fd9c206de45.

## Implementation authorization

- 2026-10-10: User invoked implement-spec for all linked local tickets, specifying integration branch codex/dashboard-experience-integration from prototype 8960c80. Initial inventory clean; retained prototype/spec/ticket history. PDEX-01, PDEX-06 and PDEX-09 claimed on independent worktrees. Previous planning-only statements above describe the publication checkpoint.
