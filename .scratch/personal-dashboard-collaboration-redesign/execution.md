# Collaboration redesign — local execution tracking

Date: 2026-10-09
Status: implementation authorized; PDCR-01 claimed
Canonical tracker: [map](map.md)
Parent: [PDCR-SPEC-01](spec.md)
Approved breakdown: [review record](ticket-breakdown-proposal.md)

## Entry and authorization

The user approved the 12-ticket breakdown and local publication. This is not
an implementation request. Wait for that request before claiming PDCR-01 or
starting product changes. Existing release, data and main-protection boundaries
remain applicable; no GitHub operation is required for this phase.

At publication, all tickets are ready-for-agent/open/unassigned/not-started.
The initial dependency frontier is PDCR-01 only. Ready-for-agent is a triage
role, not an assertion that every blocker has completed or that work is running.

## Before a claim

1. Read the current map, full ticket body, parent spec and declared blockers.
   Use project domain language, applicable ADRs and repository instructions.
2. Verify current branch/status and preserve unrelated changes, including the
   accepted prototype's local working copy. Use a codex/ branch; do not infer
   main merge, remote publication or release permission from local tracking.
3. A ticket is eligible when it is open, ready-for-agent, unassigned, and all
   direct blockers are closed with their required evidence. Inspect actual
   ticket state; do not use an old chat or proposal as the execution queue.
4. Record the owner, working branch, claim date and in-progress lifecycle in
   the ticket and map, and commit that claim as part of authorized local work.

## During work

- Keep the ticket's observable behavior and acceptance criteria as the scope.
  Do necessary narrow prefactoring before its new behavior; revise the graph
  rather than silently absorbing a large refactor or extra feature.
- Use existing application/transport/persistence seams. Include appropriate
  behavior verification in the slice; do not defer all tests to ticket 11.
- Append short dated progress/evidence notes to the ticket or a linked local
  evidence record. Commit durable work and record relevant implementation/check
  commits. Do not invent completion, ownership or a live tracker operation.
- After actual claim, completion or blockage, follow the installed Management
  skill against the bound workspace. The new local source connection remains a
  separate pending operation until registered; do not create another Registry.
- Independent graph branches do not authorize concurrent edits in one checkout
  or parallel writes to a user's selected Vault. Any later parallel execution
  needs appropriate isolation and integration verification.

## Completion and blockage

- Check every criterion against actual evidence. Unchecked criteria remain
  unmet; if a criterion proves unnecessary or changes, record the reason and
  obtain the applicable scope decision rather than silently deleting it.
- Record results, evidence location and candidate/revision/runtime identities;
  mark the ticket closed only when its acceptance is satisfied. Update its map
  row and commit both together. Then recompute the frontier from actual state.
- Code/tests, native app acceptance, external source acceptance and release are
  different states. Tickets 11 and 12 retain their real-environment requirements.
  Candidate changes after an acceptance run require reassessing affected evidence.
- A missing external connection or authorized test object is a named blocker,
  not success. Preserve completed local work and identify the exact unmet gate.
- Never place credentials, personal Vault text or raw personal execution logs
  into Git. Store private evidence locally; commit only synthetic/redacted
  summaries and stable references suitable for the repository.
- Do not close or rewrite the parent specification merely because child tickets
  were published or code tests passed. Final acceptance and release/merge remain
  separate from ticket execution and follow the later authorized scope.

## Current checkpoint

- Specification publication: 61bd09d.
- Reviewed proposal: 71193fa; user approval: 2026-10-09.
- Approved tickets: PDCR-01–12, 16 direct blocking edges.
- Claims: none. Product implementation: not started.
- Formal ticket publication receipt: the Git commit adding these tickets.
- Management connection: existing project binding verified during spec work;
  this new source registration remains pending and does not block local work.

## Authorized implementation run

- 2026-10-09: User invoked implement-spec with `codex/collaboration-redesign-spec` as baseline and local tracker/normal commits. Integration base: `9939c23`. Work proceeds through isolated ticket branches/worktrees and TDD at the previously confirmed seams. No GitHub, main merge, formal installation or personal-data writes are included.
