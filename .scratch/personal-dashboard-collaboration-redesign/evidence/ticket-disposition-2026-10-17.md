# PDCR remaining-ticket disposition — 2026-10-17

## Direct user decision

During remote-publication planning, the user explicitly requested local ticket
updates before GitHub migration:

- **PDCR-03:** close and defer the remaining Dida unknown-effect object-scope
  work. Dida's future role may change, so no further implementation is scheduled.
  This ticket includes a product limitation, not only a test: unresolved native
  Dida effects can still disable unrelated external writes in the selected Vault.
  Existing reads, local operations and verified queue/recovery behavior remain.
- **PDCR-12:** close and defer the dedicated same-candidate live Dida acceptance
  effort. No isolated external test objects or live mutations are requested.
- **PDCR-11:** retire and close the old complete-candidate acceptance ticket.
  The user no longer requires this ticket's remaining acceptance work and does
  not intend to resume it. This is cancellation of the remaining acceptance
  obligation, not deferral and not evidence that the unchecked tests passed.

All three tickets have closed lifecycle and `wontfix` triage (not currently
actionable). Their implementation state, historical evidence and acceptance
checkboxes remain unchanged. The closed PDCR-SPEC-01 stays closed.

## Answer and migration contract

| Ticket | Current disposition | GitHub state | GitHub state reason |
| --- | --- | --- | --- |
| PDCR-03 | closed; remaining work deferred | closed | not_planned |
| PDCR-11 | closed; remaining acceptance retired as unnecessary | closed | not_planned |
| PDCR-12 | closed; dedicated live acceptance deferred | closed | not_planned |

`not_planned` describes why the remaining work is closed. It does not label the
already integrated implementation as absent or failed. For PDCR-11 it expresses
the user's permitted choice to close as no longer needed, rather than reporting
the old native matrix as completed. Keep these distinctions in migrated bodies.

Original parent/blocking links remain historical provenance. Closed deferred or
retired tickets do not automatically unlock new work or start an acceptance run.
If Dida work is later resumed, reread current product behavior and the user's
current source decision, then explicitly scope a new or reopened issue.

This record performs local lifecycle updates only. GitHub migration, archive
publication, protected-main PR merges and branch deletion are separate steps.
