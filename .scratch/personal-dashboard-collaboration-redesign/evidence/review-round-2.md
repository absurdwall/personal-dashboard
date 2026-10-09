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

## Retention clarification from independent reviewer

The reviewer supplied pure synthetic oversized source and a production-function
Habit navigation probe under `/tmp/pdcr-review-d180ad1/`. Root reproduced the
legacy reader exit2 for `small-run` in the 33 MiB archive. All fixtures are
synthetic; no personal profile was read or modified for this reproduction.

The repair must include a **prospective aggregate optional-evidence budget**
across stored histories/sessions, in addition to per-item/per-execution bounds.
Existing optional bytes consume available capacity but legacy evidence is not
evicted or retroactively trimmed. Once full, new optional copies retain explicit
omission bytes/fingerprint/gaps; failed-attempt, terminal, key receipt and source
identity metadata remain. Total essential metadata/original messages can
accumulate without automatic deletion; this must be disclosed rather than
called a global archive cap. Fixed-working-set streaming reading independently
handles existing large archives while preserving original SHA/pointers.

## Fixed candidate and independent re-review

Four repairs were integrated at `8a37b38d4e341ffc3306f27fe9d9c86c000d9fc5`,
source slices `dfb981a`, `e8c4224`, `8a9d048`, `370f46b`. The merge tree equals
the implementer tip `cf790b9`; tracked files are clean and the unrelated
prototype hash is unchanged. [Repair evidence](review-fixes.md) retains the
real application/recovery/renderer/reader red and green regressions, including
retained-old text and immutable diff capacity accounting/provenance.

Independent **Spec** re-review at this candidate reported zero new actionable
findings and resolved the three previous Spec defects. The reviewer independently
passed production Habit navigation (three cases), reader differential comparisons
(100 reordered/Unicode archives), 33 MiB small-selection SHA/pointer verification,
seven reader tests and three application recovery checks. Original PDCR-03/11/12
gates and historical native source qualification remain.

Independent **Standards** re-review resolved the original localization finding
but found another P2: fixed native Habit producer diagnostics enter
`hostSourceRead` and bypass the paired narrow formatter. Example:
`Native Habit source coverage is partial, paginated, failed or unavailable`.
The same sole implementer is repairing mechanical app-origin provenance and
paired fixed grammar, retaining unknown external/runtime/legacy text verbatim.
This finding remains open until fixed-source independent re-review.

At `8a37b38`, full Rust495 passed/0 failed/six existing explicit native/live
environment gates ignored; frontend386 passed/0 failed/0 skipped; public
reader7 and build passed. All four commands exited0. Private full logs:
`/tmp/pdcr-review-round2-full-{rust,frontend,reader,build}.log`.
The remaining diagnostic repair and independent review still prevent closure.
New recovery/retention Rust source has no packaged native acceptance run.
