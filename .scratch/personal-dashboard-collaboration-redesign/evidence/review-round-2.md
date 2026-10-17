# Independent review round 2 — repairs accepted; native/live gates retained

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

## Final diagnostic repair and separate review outcomes

The diagnostic repair `d26de52` was integrated at
`ac65cfafe2b20fa19e41b1223a521f27b875eca5`. The merge tree equals `d8b437e`.
Typed, serde-default `diagnosticOrigin` follows the actual validation versus
external RPC branch. Four exact application messages use paired language
entries; identical external text and unknown-origin legacy records stay
verbatim. Recovery and public exports preserve the diagnostic's origin.

Independent **Standards** round3 at `ac65cfa`: zero remaining findings and zero
smells; the host-source diagnostic P2 is resolved. The reviewer passed17 real
work-history renderer checks, including Chinese/English and application,
external-same-text and legacy controls.

Independent **Spec** round3 at `ac65cfa`: zero new actionable findings; all three
previous repairs remain resolved. Production renderer and actual application
validation-failure/success/external-same-text, persisted snapshot and exported
origin regressions passed. The reviewer also repeated100 reordered/Unicode
reader differential comparisons. Review satisfaction covers these repairs;
the known PDCR-03 scope criterion and PDCR-11/12 gates remain unmet.

Root's final full checks at the unchanged `ac65cfa` product source all exited0:

- `cargo test --manifest-path src-tauri/Cargo.toml`:495 passed,0 failed,
  six existing explicit native/live environment gates ignored,26 groups.
- `npm run test:frontend`:388 passed,0 failed/skipped/cancelled.
- `python3 tests/developer/workflow_retro_reader_test.py`:7 passed.
- `npm run build`:passed.

Private logs: `/tmp/pdcr-review-final-{rust,frontend,reader,build}.log`.
These checks do not stand in for the ignored environment/native gates.
PDCR-02/09 close after this accepted repair/check combination; parent remains
open, PDCR-03/11 blocked and PDCR-12 open/unclaimed without isolated objects.
New Rust recovery/retention and source diagnostic changes require affected
native acceptance. Historical actual native/model observations keep their
original `7b3dc8` / `c5be634` identities and are not relabeled new-source runs.

## Cleanup and local closeout receipt

After reachability and file inventory, the owned review-fix worktree was
archived through the app and confirmed as `archived_worktree`; Git lists only
the canonical checkout. Its tip `d8b437e` is reachable from integration; the
merged owned branch was removed with `git branch -d`. The worktree had no
tracked or non-ignored untracked changes. Its ignored dist/gen/Python cache
were reproducible build artifacts; no needed private evidence was stored there.
Earlier private native fixtures/bundles remain at their recorded locations.

Canonical tracked files are clean. The unrelated untracked prototype is
preserved with SHA256
`66e7b27204fcec1980fd334f3cf1456148bb255151ec91710529d0e7cf61a622`.
Hooks remain `.githooks`. Only durable local tracker/evidence changed after
the reviewed and fully tested `ac65cfa` product source.

Management helper1.0.3 discover after the actual closeout reconfirmed the bound
`product-personal-dashboard` canonical workspace. The redesign local source
is still unregistered/pending; no Registry write or GitHub fetch was performed.
Private receipt: `/tmp/pdcr-exploration/management-discover-final-review.json`.
No main merge, push, installation or new real-profile/live-source operation
was performed in this repair round. The historical routing incident/passive
history uncertainty remains recorded in the earlier checkpoint.
