# Independent review round 2 — repair in progress

2026-10-09. Reviewed baseline `9939c23f4f14d0b87dc9949c0ce3850e24e994a2`
and target `d180ad188945d320eb2711263eabd087d401a0ed`. The user authorized
the implementation and independent review chats to iterate fixes/review until
the review is satisfied. Original human authorization is recorded in review
chat `01a1229c-6bc2-7472-9dc9-16f3daccb6d3`, turn `01a122a0-5a1f-7c90-8c5c-5921541274b2`.

## Standards

P2 fixed backend work-history diagnostics/gaps and tagged operation/status
values bypass the paired language catalog. Localize app-authored fixed grammar
while retaining user text, paths, diffs and runtime-owned text verbatim.

## Spec

1. P2 delayed Habit destination callback can restore an old Vault/selection and
   launch a read in the new Vault. Guard Vault generation and newer selection.
2. P2 native reconciliation retains only final text from available authoritative
   snapshots, leaving old tool items in progress and losing completion/diff.
   Merge stable item identities without replaying business writes or erasing
   failed attempts/original observations.
3. P2 unbounded execution/item/text retention eventually exceeds the reader's
   32 MiB whole-source bound before selectors. Introduce a bounded storage or
   verifiable reading strategy with explicit gaps and preserved failures,
   terminal states and key receipts. Do not merely raise the reader limit or
   delete real user history without authorization.

## Repair owner and boundaries

One implementer owns all four review fixes, branch `codex/pdcr-review-fixes`,
based on integration `d180ad1`. TDD at already-confirmed application/file-store,
stdio transport, production frontend-handler and public evidence-reader seams.
Root coordinates local tracker and sends fixed revision/evidence back for an
independent two-axis re-review. No GitHub, main merge, installation, live personal
data change or unknown-Dida policy change. PDCR-03/11 remain blocked, PDCR-12
open/unclaimed; unrelated prototype preserved.
