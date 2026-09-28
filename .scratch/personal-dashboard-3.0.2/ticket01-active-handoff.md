# Active handoff: finish ticket 01

User's latest instruction in coordinating task 01a0dbea-d99b-73f2-b08c-aa06d7a9ba03: “sounds good. work with that thread (the luna max one) to close the gap and finish ticket 01”. This supersedes the earlier instruction to implement ticket 04 and stop. Ticket 04 is already resolved and is not the active implementation target.

Execution owner: existing task 01a0dc03-e820-7f32-af37-4e4266c7e511, Fix refresh consistency. Coordinator: 01a0dbea-d99b-73f2-b08c-aa06d7a9ba03. The owner must perform the implementation and verification, not forward this work back to the coordinator.

## Resume point

- Resume the uncommitted ticket 01 work: Today refresh coordinator, PendingWriteBarrier integration, coordinator tests and packaged acceptance scenario changes. Preserve unrelated CONTEXT.md and collaboration planning.
- The owner reported a red/green test for navigation back to Today during a pending Tasks write; 37 focused tests plus build and driver checks passed. These are reported results to verify, not authorization to skip remaining work.
- Finish real coordination coverage for slow/overlapping results, date/Vault switching, and midnight/restart. Run latest packaged scenarios; repair outdated selectors as needed. Do not substitute predicate-only tests or old ticket 04 screenshots for these results.
- Establish whether any suspected race is reachable under UI operation locks. Fix demonstrated defects with failing regressions. Do not assert that a new controlled reproduction is necessarily the exact original user incident.
- If all agreed checks pass without reproducing the original incident, the user accepted honest closure as “not reproduced; agreed verification passed”, not a claim of a proven original-incident fix. Missing checks or unexplained ongoing failures prevent closure.
- Complete code review, focused validation, scoped commit, and ticket 01/map/Management closeout. No push, PR, Applications installation, other-ticket implementation, or real personal data edits.

## Context recovery

After compaction, reread this note and ticket 01 before acting. Do not resume ticket 04-only verification or summary reconciliation. Recent turns have repeatedly fallen back to that obsolete objective. Ticket 04 may be mentioned as prior evidence only; the final result must address each remaining ticket 01 gap.
