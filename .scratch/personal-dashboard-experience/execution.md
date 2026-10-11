# Dashboard experience — local execution record

Date: 2026-10-10
Canonical tracker: [map](map.md)
Parent specification: PDEX-SPEC-01
Stage: authorized implementation in progress
Working branch at publication: codex/dashboard-experience-prototype

## Publication checkpoint state (historical)

PDEX-01–11 are ready-for-agent/open/unassigned, with all acceptance boxes
unchecked. No ticket has been claimed. Eligible frontier: PDEX-01, PDEX-03,
PDEX-05, PDEX-06, PDEX-08, PDEX-09 and PDEX-10. Eligibility does not itself
authorize starting implementation.

## Later authorized execution

1. Read the current full ticket, parent domain decisions and direct blockers.
2. Record the claim's owner, date, branch/worktree and base in the ticket and map
   before implementation; preserve unrelated dirty work.
3. Keep the vertical slice usable, and commit coherent code and record increments.
   Preserve complete local history, including fixes and reviews.
4. Verify its external behavior through Q4's existing application/persistence
   and actual UI boundary. Retain synthetic-data identities, commit/candidate,
   checks, readback, failure/recovery and packaged acceptance evidence.
5. Record unmet criteria as incomplete or blocked. Close only with the ticket's
   required evidence, and reconcile map/body together. Do not infer installation,
   remote integration or closure of the parent from ticket completion.
6. Use [remote handoff](remote-handoff.md) to preserve identities for later
   branch push and any separately requested tracker migration.

## Publication checkpoint

- 2026-10-10: User approved the eleven-ticket graph. Full PDEX-01–11 bodies are
  published with ten direct blocking edges and 68 unchecked acceptance criteria.
  Parent spec and index remain unchanged. No implementation, installation,
  remote push or parent closure occurred.

## Implementation run

- 2026-10-10: Authorized full local implementation. Integration: codex/dashboard-experience-integration; exact base 8960c80bc81ae35a7dcd871dd104f4b3d04497de. Working tree initially clean. Individual implementers use codex/pdex-NN worktrees and merge integration before reporting. All merges preserve complete history. Parent spec closure, installation, main merge and remote publication remain separate boundaries.

- 2026-10-10: Installed tortilla-flat-management connect/discover/inspect confirmed canonical product-personal-dashboard and source-personal-dashboard-experience; 12 records, current, no malformed references, source revision a46f6fedb8e9e08b. Inspection scoped only to this local source. Frontend pre-implementation baseline: 388 tests passed. Rust baseline runs independently before changes.

- 2026-10-10: Initial Rust baseline invalidated by concurrent shared-target binary replacement: canonical suite executed PDEX-06 new test absent from canonical sources. This is orchestration evidence contamination, not an established baseline product failure. Workers moved to isolated Cargo targets; final integrated suite will be run serially after merges. Frontend baseline remains valid.

- 2026-10-10: Claimed ticket metadata now exposes Triage separately from native Status and Assignee so the installed local source reader can observe work-in-progress instead of treating claimed records as unassigned ready work. Lifecycle/acceptance remain independent; stable IDs, bodies and map triage are retained.

- 2026-10-10: PDEX-01 code integrated at 32b3678, with 11 isolated business workflows and frontend build green. PDEX-02 starts against this verified implementation prerequisite; acceptance/closure of PDEX-01 remains open until actual UI and packaged evidence. Implementation dependency readiness and delivery acceptance are recorded separately; no blocker has been falsely closed.

- 2026-10-10: PDEX-06 code integrated at 61c12cd with isolated persistence/adapter/Collaboration evidence. PDEX-07 now starts against the verified Task interval prerequisite; PDEX-06 UI/delivery acceptance remains open and is not inferred from code integration.

- 2026-10-10: PDEX-03 integrated at 06c0d0b; nine real WebKit cases at approved widths/heights and 406 merged frontend tests passed. PDEX-10 receives an exclusive serialized lease on the canonical Cargo cache for native session/draft tests; all other native workers use their own isolated caches, and root performs no Cargo build until this lease is released. This does not re-enable concurrent shared-target verification.

- 2026-10-10: PDEX-02 integrated at a77603e. Precision/source compatibility and five actual production-page modal cases verified. PDEX-04 starts against this verified editing prerequisite; PDEX-07 supplies the shared pointer controller when integrated. Delivery acceptance remains independently pending.

- 2026-10-10: PDEX-10 integrated at 684ac8b, with 138 native and five real WebKit entry workflows verified. Canonical Cargo cache lease released with no owned native process remaining; subsequent root checks may run serialized. PDEX-08 is claimed for compact Calendar source/state/layout verification.
