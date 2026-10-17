# Experience specification publication

Date: 2026-10-10
Specification: PDEX-SPEC-01
Canonical destination: [spec.md](spec.md), indexed by [map.md](map.md)
Triage: ready-for-agent
Lifecycle: open
Publication: complete locally
Implementation: not started

## Confirmed publication

The user explicitly selected local-only spec, tickets and subsequent execution
for this initiative. The complete seven-section to-spec body with 68 user
stories is published at the canonical local destination. Q1–Q4 are answered;
the test boundary was confirmed directly by the user. The map and registered
Work Item index refer to the same specification, not a duplicate body.

The Git commit containing this publication batch is the local receipt. Resolve
its hash from Git history rather than inserting a self-reference. The preserved
commit chain and future migration rules are recorded in [remote handoff](remote-handoff.md).

## Earlier remote attempt

Before the user's local-tracker instruction, issue-list preflight returned
HTTP 403 and “Sorry. Your account was suspended”. No GitHub Issue was created
and no remote label applied. That attempt remains historical; GitHub publication
is not the current canonical workflow or a blocker for this local specification.

## Management connection

Installed tortilla-flat-management 1.0.3 confirmed the existing tortilla-flat
workspace and product-personal-dashboard identity. Operation
management-pdex-local-spec-source-20261010 confirmed registration of
source-personal-dashboard-experience at the initiative's issues directory.
A fresh inspect confirmed current read state, no malformed references and one
spec Work Item index (00-spec.md) with open lifecycle; source revision
4210d09f1153d1bf. The index points to the complete canonical spec body.

Registration used the existing Registry and did not change user-owned focus or
Project lifecycle. Its Registry change lives in the parent vault repository,
outside this standalone project's Git scope; this project retains the source
identity and confirmed readback here. Unrelated parent changes are not committed
by this publication. The specification stays canonical regardless of display refresh.

## Boundary

The user subsequently approved the to-tickets breakdown. Eleven implementation
tickets are published locally but none is claimed or started. No production
implementation, main merge, remote push or App installation is implied by the
specification or ticket publication.

## Ticket publication

- Approval: the user's “可以” confirmed the eleven slices and their granularity
  and dependencies on 2026-10-10.
- Published: PDEX-01–11, one complete file per ticket under the local issues
  directory, in dependency order; ready-for-agent/open/unassigned.
- Graph: ten direct blocking edges; initial frontier PDEX-01/03/05/06/08/09/10.
- Content: each approved What to build, explicit Blocked by and acceptance
  criteria retained; 68 unchecked acceptance criteria across eleven tickets.
- Parent: the complete PDEX-SPEC-01 body and its Work Item index remain byte-for-byte
  unchanged. Publishing children does not change or close that parent.
- Evidence: [approved proposal](ticket-breakdown-proposal.md), [tracker](map.md)
  and [execution boundary](execution.md). The commit containing this batch is
  the durable local publication receipt; no GitHub operation was performed.
- Management readback: source-personal-dashboard-experience is current at
  revision 66ea1fd9c206de45, with twelve records (one spec index and eleven
  tickets), no malformed references, seven ready tickets and four gated by
  their declared dependencies. All ten blocking references resolve to actual
  local ticket records; none is an unresolved or fabricated review gate.
- File verification: eleven complete bodies, 68 unchecked acceptance criteria,
  links and dependency graph validated; parent spec/body index byte hashes
  match the pre-publication values.
