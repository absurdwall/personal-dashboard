# Dashboard experience improvements — local tracker

ID: PDEX-MAP
Type: map
Date: 2026-10-10
Canonical: this local tracker, explicitly selected by the user
Stage: specification published; awaiting the next requested stage
Implementation: not started
Working branch: codex/dashboard-experience-prototype
Management source: source-personal-dashboard-experience

## Records

| ID | Type | Body | Triage | Lifecycle | Dependencies | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| PDEX-SPEC-01 | spec | [Complete specification](spec.md) | ready-for-agent | open | none | [Prototype R](prototype/README.md), [Q1–Q4](design-review.md), [publication](publication.md) |

The spec is published locally. Implementation tickets are not yet created,
claimed or started. The Work Item index [00-spec](issues/00-spec.md) refers to
this full body and the same PDEX-SPEC-01 identity; it is not an implementation
ticket or a second specification. Do not renumber existing PDEX records.

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
