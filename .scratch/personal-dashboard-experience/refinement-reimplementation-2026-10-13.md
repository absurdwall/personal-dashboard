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

| Ticket | Working branch | Authorized source baseline | Implementation commits |
| --- | --- | --- | --- |
| PDEX-19 | `codex/pdex-19-refinement-reimplementation` | `918e7e0d9c4b2c524c429bfd309482e328bc4c91` | `2b321c881e5db8c2161ca86f2fb2dcc9a1e5e528`, `8ad5ba279911a8cecd23ac1f01a5b8b667824e04`, `5c40b6830155981104d88fdaca07247fad09717b`, `60fc6d93d2a1cc556e1b259f6bef1e4c5ddfcdf2` |
| PDEX-23 | `codex/pdex-23-refinement-reimplementation` | `918e7e0d9c4b2c524c429bfd309482e328bc4c91` | `81c0c5dc25975564e403e71f3366442b341ed101`, `606ead3d6f92c6d75083204b8d2917f98e448b14`, `41a2fd98cbafa5860641a9e587af292601a3ca6a`, `00e518d7e2c2f4b92333b863f7a54fb364c98bd8` |
| PDEX-24 | `codex/pdex-24-refinement-reimplementation` | `918e7e0d9c4b2c524c429bfd309482e328bc4c91` | `b7fc4f3e118f17fc47f34fdee3be16474108a2a9`, `38214160d23b70f57b68c79363839816ad9758cb`, `5b436f5539995a025046a72d702a71bb63ed50d4`, `8ff52054948897b03f737bb7cc3ed36ae87049ba`, `befded5be81bca8aabf698c80051da98dfe3b9f0`, `6b6edd485a7c73021fc588198351b1ed3ab7f24e`, `fdc401c58e1ba094dca5b47721ef74333dd34613` |

Each worker worktree must start from the integration branch's current tip
immediately before implementation; record that exact tip with its handoff.

## Verification boundary

The accepted spec defines the seams: existing application business operations,
real persistence readback/reopen, and actual DOM/pointer behavior. Packaged App
acceptance is tracked separately under PDEX-26 and uses an isolated synthetic
profile/Vault. Prototype memory, source-string checks, mocks and save toasts do
not substitute for these seams.

## Reimplementation claim frontier

The Management helper confirmed each native claim before the local branch was
created. All four ticket branches start at the exact integration commit below;
their worktrees were clean at handoff.

| Ticket | Working branch | Start commit | Worktree | Claim operation |
| --- | --- | --- | --- | --- |
| PDEX-20 | `codex/pdex-20-refinement-reimplementation` | `ad697e01cf5a51a619fb97bbad174ebb50161d91` | `/Users/tingranwang/.codex/worktrees/pdex-20-refinement-reimplementation/personal-dashboard` | `pdex-20-reimplementation-claim-2026-10-13` |
| PDEX-21 | `codex/pdex-21-refinement-reimplementation` | `ad697e01cf5a51a619fb97bbad174ebb50161d91` | `/Users/tingranwang/.codex/worktrees/pdex-21-refinement-reimplementation/personal-dashboard` | `pdex-21-reimplementation-claim-2026-10-13` |
| PDEX-22 | `codex/pdex-22-refinement-reimplementation` | `ad697e01cf5a51a619fb97bbad174ebb50161d91` | `/Users/tingranwang/.codex/worktrees/pdex-22-refinement-reimplementation/personal-dashboard` | `pdex-22-reimplementation-claim-2026-10-13` |
| PDEX-25 | `codex/pdex-25-refinement-reimplementation` | `ad697e01cf5a51a619fb97bbad174ebb50161d91` | `/Users/tingranwang/.codex/worktrees/pdex-25-refinement-reimplementation/personal-dashboard` | `pdex-25-reimplementation-claim-2026-10-13` |

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
- 2026-10-13: Integrated PDEX-19 from `codex/pdex-19-refinement-reimplementation`
  with `--no-ff` into `codex/dashboard-experience-refinement-reimplementation`.
  Feature commits were preserved in order: `2b321c881e5db8c2161ca86f2fb2dcc9a1e5e528`,
  `8ad5ba279911a8cecd23ac1f01a5b8b667824e04`,
  `5c40b6830155981104d88fdaca07247fad09717b`, and
  `60fc6d93d2a1cc556e1b259f6bef1e4c5ddfcdf2`. Integration merge commit:
  `5603d7ced3fa7325f1ea7c2bc83f9c475de938eb`. PDEX-19 remains claimed and
  `in-progress` pending final packaged acceptance under PDEX-26.
- 2026-10-14: Integrated PDEX-24 from `codex/pdex-24-refinement-reimplementation`
  with `--no-ff`. The integration checkout was clean at
  `14bd7629f8961516eab7b534703d52f0e9622ae8`; the clean feature tip was
  `fdc401c58e1ba094dca5b47721ef74333dd34613`. The feature branch retains its
  original implementation commits `b7fc4f3e118f17fc47f34fdee3be16474108a2a9`
  and `38214160d23b70f57b68c79363839816ad9758cb`, PDEX-19 dependency merge
  `befded5be81bca8aabf698c80051da98dfe3b9f0`, and focused integration fix
  `6b6edd485a7c73021fc588198351b1ed3ab7f24e`. Integration merge commit:
  `36a13077a3d58dbe90bcf38a0c9230d0b27d6efb`. PDEX-24 remains claimed and
  `in-progress`; packaged acceptance remains gated under PDEX-26.
- 2026-10-14: On the integrated source, `npm run build`, the focused Habit
  frontend tests (8 passed), and the focused Habit definition workflow (8
  passed) passed. Full `cargo test --manifest-path src-tauri/Cargo.toml` exited
  0; all unit, integration and doc-test groups passed, with 6 environment-gated
  tests ignored. The exact commands and inherited limitations are recorded in
  [PDEX-24 implementation evidence](evidence/pdex-24-reimplementation-2026-10-13.md).
- 2026-10-14: Integrated PDEX-23 from
  `codex/pdex-23-refinement-reimplementation` with `--no-ff`. The clean
  integration checkout was at `53a7495dcade91e979ef0e3acb58202af7f8e5e3`;
  the clean feature tip was `00e518d7e2c2f4b92333b863f7a54fb364c98bd8`.
  The feature history retains source commit
  `81c0c5dc25975564e403e71f3366442b341ed101`, implementation evidence commit
  `606ead3d6f92c6d75083204b8d2917f98e448b14`, dependency merge
  `41a2fd98cbafa5860641a9e587af292601a3ca6a` (whose second parent is the exact
  integration tip `53a7495dcade91e979ef0e3acb58202af7f8e5e3`), and branch-check
  commit `00e518d7e2c2f4b92333b863f7a54fb364c98bd8`. Integration merge commit:
  `968746ad4a3b2ab9722befe7bc160bfee07c15a9`, with parents
  `53a7495dcade91e979ef0e3acb58202af7f8e5e3` and
  `00e518d7e2c2f4b92333b863f7a54fb364c98bd8`. Production build and focused
  layout/panel tests passed; command-completion retained its two documented
  base failures. See [PDEX-23 integration evidence](evidence/pdex-23-reimplementation-2026-10-13.md).
- 2026-10-13: After PDEX-19, PDEX-23, and PDEX-24 were integrated, the installed
  Management helper confirmed local native claims for PDEX-20, PDEX-21,
  PDEX-22, and PDEX-25 in `source-personal-dashboard-experience`. Their native
  statuses changed from `ready-for-agent` to `claimed`; the original dependency
  declarations remain in each ticket. PDEX-19/PDEX-24 packaged acceptance is
  still gated under PDEX-26. Operation IDs are `pdex-20-reimplementation-claim-2026-10-13`,
  `pdex-21-reimplementation-claim-2026-10-13`,
  `pdex-22-reimplementation-claim-2026-10-13`, and
  `pdex-25-reimplementation-claim-2026-10-13`. Working branches are
  `codex/pdex-20-refinement-reimplementation`,
  `codex/pdex-21-refinement-reimplementation`,
  `codex/pdex-22-refinement-reimplementation`, and
  `codex/pdex-25-refinement-reimplementation`. Their exact worktree paths and
  start commits are recorded in the claim-frontier table above.
- 2026-10-13: Created four clean local worktrees from integration tip
  `7099c0949d61e50254bb6e9fa4e8e61d8dd08f29`, then attached named local
  branches `codex/pdex-20-refinement-reimplementation`,
  `codex/pdex-21-refinement-reimplementation`,
  `codex/pdex-22-refinement-reimplementation`, and
  `codex/pdex-25-refinement-reimplementation`. Before implementation handoff,
  each branch was fast-forwarded to the then-current integration tip
  `ad697e01cf5a51a619fb97bbad174ebb50161d91`; each worktree was clean at that
  exact commit. The claim-frontier table records the handoff bases and paths.
