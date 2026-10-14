# PDEX-SPEC-02 reimplementation — 2026-10-13

This local run restarts implementation from the verified pre-implementation
checkpoint. It does not rewrite or delete the rejected implementation history.

## Lineage

- Specification: `PDEX-SPEC-02`, unchanged at `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- Starting state: PDEX-19–26 were `ready-for-agent`, lifecycle `open`, unassigned,
  and marked not started in the map and their complete ticket bodies.
- Integration branch: `codex/dashboard-experience-refinement-reimplementation`.
- Integration base: `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- Previous branch preserved: `codex/dashboard-experience-refinement-integration`;
  it is not an ancestor of this reimplementation branch.
- Local Git only. No GitHub, remote push, main merge, normal App installation,
  or parent-spec closure is authorized by this record.

## Scope and design boundary

Implement only the accepted specification and its eight complete tickets.
Keep the shipped Dashboard shell, fonts, colors, navigation and unaffected
surfaces as they are at the starting commit. Use the prototype only for the
per-surface choices recorded in the specification and its prototype review;
do not copy its demo shell, broad restyling, or out-of-scope layout changes.
Use existing application workflows and persistence seams, preserve old data,
and add no dependency, external service, or deployment configuration.

## Initial claim frontier

The dependency graph at the starting commit declares PDEX-19, PDEX-23 and
PDEX-24 eligible. They are claimed here; the other tickets remain open and
unclaimed until their blockers are integrated with evidence.

| Ticket | Working branch | Starting integration tip | Implementation commits |
| --- | --- | --- | --- |
| PDEX-19 | `codex/pdex-19-refinement-reimplementation` | `918e7e0d9c4b2c524c429bfd309482e328bc4c91` | pending |
| PDEX-23 | `codex/pdex-23-refinement-reimplementation` | `918e7e0d9c4b2c524c429bfd309482e328bc4c91` | pending |
| PDEX-24 | `codex/pdex-24-refinement-reimplementation` | `918e7e0d9c4b2c524c429bfd309482e328bc4c91` | pending |

## Verification boundary

The accepted spec defines the seams: existing application business operations,
real persistence readback/reopen, and actual DOM/pointer behavior. Packaged App
acceptance is tracked separately under PDEX-26 and uses an isolated synthetic
profile/Vault. Prototype memory, source-string checks, mocks and save toasts do
not substitute for these seams.

## History

- 2026-10-13: Created fresh integration branch at the exact PDEX-SPEC-02
  publication checkpoint after confirming the ticket map and ticket bodies.
- 2026-10-13: Claimed the initial eligible frontier above; no source changes
  were present at claim time.
- 2026-10-13: The installed Management helper confirmed native local claims for
  all three tickets in `source-personal-dashboard-experience`. Ticket Status is
  `claimed`; triage remains `ready-for-agent`; lifecycle is `in-progress`.
  Operation IDs: `pdex-19-reimplementation-claim-2026-10-13`,
  `pdex-23-reimplementation-claim-2026-10-13`, and
  `pdex-24-reimplementation-claim-2026-10-13`. No summary write or GitHub
  operation was made.
