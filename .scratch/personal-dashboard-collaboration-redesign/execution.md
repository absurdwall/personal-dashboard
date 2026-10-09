# Collaboration redesign — local execution tracking

Date: 2026-10-09
Status: review repairs accepted; nine tickets closed; PDCR-03/11/12 acceptance gates retained
Canonical tracker: [map](map.md)
Parent: [PDCR-SPEC-01](spec.md)
Approved breakdown: [review record](ticket-breakdown-proposal.md)

## Entry and authorization

The initial approval covered the 12-ticket breakdown and local publication,
without starting implementation. The later implement-spec authorization below
started this run. Existing release, data and main-protection boundaries remain
applicable; no GitHub operation is required for this phase.

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

## Publication checkpoint

- Specification publication: 61bd09d.
- Reviewed proposal: 71193fa; user approval: 2026-10-09.
- Approved tickets: PDCR-01–12, 16 direct blocking edges.
- Claims: none. Product implementation: not started.
- Formal ticket publication receipt: the Git commit adding these tickets.
- Management connection: existing project binding verified during spec work;
  this new source registration remains pending and does not block local work.

## Authorized implementation run

- 2026-10-09: User invoked implement-spec with `codex/collaboration-redesign-spec` as baseline and local tracker/normal commits. Integration base: `9939c23`. Work proceeds through isolated ticket branches/worktrees and TDD at the previously confirmed seams. No GitHub, main merge, formal installation or personal-data writes are included.

- 2026-10-09: User confirmed isolated Dida test objects are not prepared. PDCR-12 live acceptance remains unmet; continue other implementation. Baseline frontend: 331 tests passed before product edits (`npm run test:frontend`, private log `/tmp/pdcr-exploration/frontend-baseline.log`). Management skill 1.0.3 connect/discover confirmed existing project/workspace; redesign source registration remains pending, independently of local claims.

- 2026-10-09: PDCR-01 implementation `1d656cb`, closeout `05bf9ef`, integration `288f14f`; 224 passed, 0 failed, 6 explicit native/live gates ignored. Evidence: [usage package](evidence/01-usage-package.md). Frontier advanced to PDCR-02.

- 2026-10-09: PDCR-02 implementation `77a1951`, closeout `819bbc6`, integration `1feeb31c`. [Work history evidence](evidence/02-work-history.md). Raw equal deltas without offsets cannot be uniquely identified; completed snapshots remain authoritative. Real isolated connection prerequisite observed CLI 0.160.0 / authenticated ChatGPT / text turns available; no model/native acceptance claimed from that probe.

- 2026-10-09: PDCR-04 integrated at `d2157330`, implementation `62f10ea` / `8cf2344`. [Task evidence](pdcr-04-evidence.md): 92 Collaboration Task checks, 3 shared Task/Today checks, 342 frontend checks and build passed. One bounded domain-history capability is now available. PDCR-05 claimed next from this integrated API; PDCR-03/08 remain active.

- 2026-10-09: PDCR-08 integrated `669346c4`, products `137e41c` / `1b8503a`; [document evidence](pdcr-08-evidence.md). PDCR-05 integrated `6070afa5`, product `7994d87`; [Daily Record evidence](pdcr-05-evidence.md). Combined build, 20 targeted frontend checks and 188 Rust checks passed / 6 explicit environment gates ignored. PDCR-06 and PDCR-09 now claimed; PDCR-03 remains active. PDCR-09 requires a new actual instrumented execution before closure.

- 2026-10-09: PDCR-03 integrated `b1799b86`, product `f9fb2bf`, [queue/recovery evidence](evidence/03-queue-stop-recovery.md). Combined TypeScript, 354 frontend and 215 Rust checks passed; 6 explicit pre-existing environment gates remain ignored. Paused queues, correction priority and per-execution read-only recovery are application-accepted. Native MCP has no per-object pre-dispatch interception point; existing external capability bounds remain explicit, and already-dispatched effects remain unknown until readback.

- 2026-10-09: PDCR-06 integrated `34a253a8`, products `76ef192` / `957a701`; [Habit evidence](pdcr-06-evidence.md). 100 Collaboration, 12 completion, 15 snapshot and 361 frontend checks plus build passed. Canonical local success and failed snapshot result remain independent; history does not depend on projection coverage. PDCR-07 and PDCR-10 claimed; PDCR-09 continues.

- 2026-10-09: PDCR-10 integrated `a520c64d`, product `b7e26ca`; [personal retro evidence](evidence/10-personal-retro.md). 217 Rust checks / 6 explicit existing gates, 361 frontend checks and TypeScript passed. Actual three-domain history consumption, no report-time canonical mutation, captured complete-day range and production source navigation are application-accepted; actual model/native complete-candidate verification remains PDCR-11. PDCR-07/09 continue.

- 2026-10-09: PDCR-09 integrated `dbe5adba`, [workflow retro evidence](pdcr-09-evidence.md). New actual execution at `d5235cd` / CLI 0.160.0 / observed gpt-6.1-sol saved and independently verified a synthetic daytime fact; failed `8af2032` startup remains separate. The absent-Dida transport-only override was fixed. Complete synthetic chain and actual developer skill reports retain resolvable refs/hash/provenance. Actual effective effort and headless page refresh stay unavailable; final-candidate native UI remains PDCR-11. 95 Rust / 6 explicit existing gates, 362 frontend, build and 4 reader checks passed.

- 2026-10-09: PDCR-07 integrated `90e495a2`; [producer evidence](pdcr-07-evidence.md). 99 default-parallel library checks, 102 Collaboration, 27 Habit, 362 frontend, 4 reader and build checks passed. Initial atomic-test failures remain documented; a separate clock probe observed duplicate timestamps, and test-only directory counters now guarantee uniqueness without changing the production writer. Attribution to the original failures remains inference. PDCR-01–10 are closed; PDCR-11 claimed for complete-candidate real app/runtime/model acceptance. Independent Standards/Spec review starts against baseline `9939c23`; PDCR-12 remains unmet without isolated Dida objects.

- 2026-10-09: Independent review at `88315b9` found delayed cross-Vault
  projection responses, refresh evidence attributed to the active rather than
  effect-owning execution, and overly broad unknown-Dida mutation blocking.
  PDCR-03 reopened; one implementer owns all review fixes on
  `codex/pdcr-review-fixes`. Standards found no documented-standard violations
  and two narrow nonblocking maintainability suggestions. Native PDCR-11
  continues independent evidence collection; its final closure requires the
  reopened blocker and reassessment against the repaired candidate.

- 2026-10-09: Review repairs integrated at `7b3dc8`; independent repair review
  resolved the two frontend defects and two P3 suggestions. Final combination:
  490 Rust checks passed / six explicit gates ignored, 371 frontend, four
  reader checks and build passed; one selected native sandbox permission gate
  separately passed, with no model/live-source mutation. [Verification](evidence/final-combination-checks.md).
  Actual synthetic native hook probing demonstrated exact object/date veto but
  permissive hook failures and broad trust-bypass scope; no probe hook was
  installed in product code. PDCR-03 remains unmet pending the explicit
  [scope decision](evidence/unknown-dida-scope-decision.md). PDCR-11 is rebuilding
  the repaired candidate and retains the real spoken-transcript requirement.

- 2026-10-09: Native legacy inspection found the old-text renderer omitted the
  missing-process marker. The single review-fix implementer repaired this in
  `505fdb3`, integrated `c5be634`; 32 targeted and 378 full frontend tests plus
  build passed. Independent Standards/Spec re-review found no new issue. A new
  no-auth exact-PID native check observed English/Chinese markers, original
  text/list and unchanged four canonical hashes, with no new execution/auth;
  evidence `789f093` integrated `c1a9cb6`. Prior actual business/model evidence
  keeps its original `7b3dc8` qualification, reassessed against the pure UI diff.
  PDCR-11 is blocked on human voice and PDCR-03; PDCR-12 remains open/unclaimed
  because the user has no isolated Dida objects. No policy answer was received,
  so the native restriction remains and PDCR-03 is not closed.
  [Checkpoint](evidence/implementation-checkpoint.md) retains the routing
  incident/passive-history uncertainty and cleanup; no release is claimed.

- 2026-10-09: Continued under explicit human authorization for two-chat fix/review
  iteration. Reopened PDCR-02/09 and claimed all four P2 review findings in a
  single isolated review-fix implementer; base `d180ad1`, branch
  `codex/pdcr-review-fixes`. [Round2 record](evidence/review-round-2.md).
  No other acceptance/lifecycle or release boundary changed.

- 2026-10-09: Round2 repairs integrated `8a37b38`; final diagnostic provenance
  fix `d26de52` integrated `ac65cfa`. Independent Standards and Spec reviews
  are satisfied, recorded separately in [round2](evidence/review-round-2.md).
  Final full495 Rust/0 failed/6 explicit native-live gates ignored,388 frontend,
 7 reader and build pass. PDCR-02/09 reclosed; nine total closed. New Rust/UI/
  reader source requires affected native reassessment, so PDCR-11 criteria
 1/2/4/5 are unchecked for this candidate while historical evidence is retained.
  PDCR-03/11 remain blocked,12 open/unclaimed, parent open; no eligible frontier.
