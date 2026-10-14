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
- The native readback at source revision `092d68265875e9b4` confirmed all four
  ticket Status values as `claimed` with active lifecycle. Its derived
  `queueState` remains `blocked` because PDEX-19/PDEX-24 are still active while
  packaged acceptance is reserved for PDEX-26. The implementation dependencies
  are integrated; their ticket blocker declarations remain intact and were
  not cleared or treated as full ticket completion.
- 2026-10-13: Created four clean local worktrees from integration tip
  `7099c0949d61e50254bb6e9fa4e8e61d8dd08f29`, then attached named local
  branches `codex/pdex-20-refinement-reimplementation`,
  `codex/pdex-21-refinement-reimplementation`,
  `codex/pdex-22-refinement-reimplementation`, and
  `codex/pdex-25-refinement-reimplementation`. Before implementation handoff,
  each branch was fast-forwarded to the then-current integration tip
  `ad697e01cf5a51a619fb97bbad174ebb50161d91`; each worktree was clean at that
  exact commit. The claim-frontier table records the handoff bases and paths.

## Original local implementation integration — 2026-10-14

The remaining four implementation branches were integrated locally with
`--no-ff`; each implementation, evidence commit, and branch refresh remains
reachable. No ticket was closed, no PR or remote operation was made, and no
normal App was installed.

| Ticket | Working branch and final tip | Implementation and evidence commits | Integration merge |
| --- | --- | --- | --- |
| PDEX-20 | `codex/pdex-20-refinement-reimplementation` — `0c19fdfc51a32454c07b25d1833c0fff6c792149` | implementation `38ff29bd961baed78ec11c75627069936bcc1ba2`; evidence `0c19fdfc51a32454c07b25d1833c0fff6c792149`; branch refresh `40871c8105dae24af721139a73b2e34fb2020e26` | `7c65fbcc3276abd2d5879fe5613c10a2b6872d44` |
| PDEX-21 | `codex/pdex-21-refinement-reimplementation` — `784aafb2b94d9cd3295311673b86e343b33b6617` | implementation `e4fe69fdf2518b7fb98b96339013c3ff3bed50f1` and `34a6361469b0427298dbc608ea553569dfb1879a`; branch refreshes `9728d29d4f95b17d106035bc79b16284ca1db2f7` and `784aafb2b94d9cd3295311673b86e343b33b6617` | `2209343d648862b7477e9949cabffbdd05dd3d52` |
| PDEX-22 | `codex/pdex-22-refinement-reimplementation` — `cd49d52315e825538da690992d495b05af86a97b` | implementation `16a0b4592f307b94f21c1a38dbac850f5df2b97d`; evidence `0c85c7f30c606d0a4da83d19287d179d9b88dd05` and `cd49d52315e825538da690992d495b05af86a97b`; branch refreshes `f6c319d77d5239bac9c30767ee4157239f569e1b` and `c05c366d36650cc71e3d65139e714c70c70e81ed` | `2f530eb92c743e4f29dfb7f10f35285d93b77af0` |
| PDEX-25 | `codex/pdex-25-refinement-reimplementation` — `fca60c7b89b446e7fc133e243e5646e507a98290` | implementation `cb527de02e8373ccbb30014b0be0a6c369c13841`; evidence `ceb59200b5264a7ddca56f4bcbedc357129dc17c`; theme-token correction `3c6a1d7194470cc8a18cb10e83c773f83ba2f063`; branch refreshes `82a3586318f30ab8e8313b925bb1f26bdff8ab0d` and `fca60c7b89b446e7fc133e243e5646e507a98290` | `f50ae2df167e53d9707b0b6105a093446b9a5cec` |

The final integration tip is `f50ae2df167e53d9707b0b6105a093446b9a5cec`;
the integration checkout was clean after all four merges. PDEX-26 packaged
acceptance remains open. PDEX-22 leaves China 2027 holiday data unspecified
because the verified official source set has no published 2027 schedule.

## Independent review repair integration — 2026-10-13

The review fixes were made on the existing per-ticket branches, preserving
their earlier implementation commits. Both ticket branches were refreshed
from integration tip `e92f1a764f3c4b48a8a1ca6d491f518a271fb43f` with no-ff
merges before the fixes, then merged back with `--no-ff`.

| Ticket | Working branch | Refresh merge | Review repair commits | Branch tip after repair | Integration merge |
| --- | --- | --- | --- | --- | --- |
| PDEX-20 | `codex/pdex-20-refinement-reimplementation` | `caebc0249860b3ed4e4993eda53848da3f1a45bb` | `8cdfd9a2bf8f817521c373092432dc0e8e6591c9`, `d25ab0c0d11d568c5d73c4a6c6e438098120f7fe` | `d25ab0c0d11d568c5d73c4a6c6e438098120f7fe` | `b62db46480f2f858a46d77b50c92dcd1b734810e` |
| PDEX-25 | `codex/pdex-25-refinement-reimplementation` | `ab87d36b94a64179b2ca699dae4cd685f6961963` | `1ef70ccb388a804e776a5746b607ddcc3ea4f0da` | `1ef70ccb388a804e776a5746b607ddcc3ea4f0da` | `54677b47be16d08428c26171023222becb5459f2` |

The integration checkout was clean at `e92f1a764f3c4b48a8a1ca6d491f518a271fb43f`
before these merges. After both merges, the integrated source tip was
`54677b47be16d08428c26171023222becb5459f2` before this ledger update.

Verification on the integrated source: PDEX-20 `task-surface.test.ts` passed
12/12; PDEX-25 Rust statistics tests passed 5/5, Habit definition workflow
tests passed 10/10, Habit detail panel test passed 1/1, and Node parsed
`frontend/main.ts` with type stripping. `git diff --check` passed. The
production build could not run TypeScript compilation because `tsc` is
unavailable in this environment; no dependency was installed.

The repairs address the deep Task nesting cue and move Habit detail statistics
into Rust while preserving cumulative local completion counts after a forward
start-date change. PDEX-25 still cannot show sourced/provenance observations
older than the snapshot schema's rolling 12-week window. PDEX-22 still lacks
verified official China 2027 holiday data. PDEX-26 packaged acceptance remains
open; no ticket was closed, and no remote Git operation or normal App install
was made.


## First visual acceptance and bounded repairs — 2026-10-14

The user requested a first-pass review of the second implementation, obvious
repairs, then a real App preview for aesthetic feedback. This is not the full
PDEX-26 release gate or user acceptance. Reviewed branch
`codex/dashboard-experience-refinement-reimplementation`, exact reported tip
`fba6f5b3017fead89861ab42dfb36b08825cbd4e`, fixed point
`918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
Captured comparison: `git diff 918e7e0...HEAD`; both independent review axes
used the pinned fba6f5b tip. The local tracker exception was followed.

### Standards

- P2: Habit definition status/error paths bypassed retained translation metadata;
  repaired with the existing fixed-copy/error setters and paired diagnostics.
- P3: Task schema documentation claimed version 3 while source writes version 4;
  corrected compatibility and parent/folder contract paragraphs.
- P3 heuristic: possible duplicated folder/tag mutation orchestration. Deferred;
  it does not justify a broad refactor in this first visual pass.

### Spec

- P2: Today popup kept the old large property form, duplicated title and Name
  focus. Reused Content-first compact editor, retained ordinary Today inline
  details, updated draft summaries, and aligned Save/Cancel.
- P2: Explicit parent/child navigation could lose its target to priority/tag
  filters. Only filters excluding the requested object are reset.
- P2: Calendar More exposed inert parent/child controls. Replaced them with an
  explicit Open in Tasks action on the same Task identity.
- P2, observed in packaged App: overview cards collapsed into unreadable strips.
  parseFloat on an unresolved CSS clamp returned NaN; geometry now derives the
  resolved plot height. Cards retain complete two-row labels and source/status.
- P2, observed in packaged App: Calendar detail displayed an empty backdrop
  because its form retained the inline editor hidden flag. Modal forms are now
  visible; ordinary collapsed Today inline editors retain their behavior.

### Verification and handoff boundary

- Production TypeScript build, macOS release App build/sign, and diff whitespace
  check passed. No dependency, service, main merge, push, or normal installation.
- Related localization, Task presentation and Habit checks: 46/46 passed.
  Adding the axis suite gave 56/57: the remaining source-markup expectation for
  the unlocated shortcut aria-controls also failed in the original full run.
- The broad frontend run during this review produced 457/510 passed, 53 failed.
  It is not a clean regression gate. Failures include source-extraction fixture
  ReferenceErrors and retained assertions; they remain recorded for later work.
  A clean 918e7e0 snapshot independently reproduced the two slash/help failures
  (45/47 across command completion and draft-refresh suites). Do not classify
  every remaining failure as inherited or waived.
- Real final candidate launched under a separate bundle id and profile in
  `/tmp/pdex-review-20261014.noindex`, using only a synthetic Vault and fixed
  September 8 fixture clock. User Vault/profile and installed App were preserved.
- Native pointer/keyboard checks covered default 960x720 and an OS-zoomed larger
  window: Tasks compact rows, Content focus and same-row Save/Cancel; Habit
  default summary/today list; Calendar month and selected date context; Today
  readable overview and compact nearby popup. These were qualitative first-pass
  checks, not every requested PDEX-26 width or exact same-data baseline capture.
- A Task content edit was saved through real Tauri IPC; canonical disk readback
  retained id, date, interval, priority and tags. Calendar displayed the same
  value; a quit/relaunch retained it in Today and its Task popup.
- Final native checks verified visible Calendar form, More → Open in Tasks,
  and High-priority parent → Low-priority child resetting the excluding filter.
- PDEX-26 and PDEX-SPEC-02 remain open. Full upgrade/conflict/drag/voice/IME and
  runtime coverage, remaining automated failures, China 2027 holiday coverage,
  exact-window baseline comparison and final human aesthetic feedback remain.

Review total: Standards 3 findings (worst: untranslated retained Habit errors);
Spec 5 findings (worst: blank Calendar Task editor); two Standards fixes and all
five bounded Spec fixes implemented. This record does not assert release acceptance.

## Today axis scale repair and isolated Collaboration diagnosis — 2026-10-14

This bounded follow-up started from clean integration branch
`codex/dashboard-experience-refinement-reimplementation` at
`902fc032ab232e34feb218b766f8b123a1a8fc57`. It repairs only Today timeline
geometry in the integrated source and records the Collaboration send-state
diagnosis; no Task, Calendar, Habit, Collaboration, or shared-shell product code
was changed. The earlier PDEX-21 implementation and merge history above remain
intact; this is an integration-branch repair, not a rewritten ticket branch.

The user clarified that window resizing should preserve the accepted large
window's default hour scale and base track width, using scroll at smaller sizes
while retaining explicit zoom. The accepted reference is the previously
previewed macOS Window → Zoom state: its screenshot is 3840 physical px wide,
while the default 960×720 window screenshot is 1920×1440 physical px, a 2×
Retina mapping. The large state is therefore about 1920 CSS px wide. A
1914×1518 CSS WebKit viewport closely matches it; before the repair it measured
a natural 578.47px plot track and 18px/hour. The CSS now fixes the defaults at
580px and 18px/hour. At smaller widths the plot keeps at least the reference
width and scrolls horizontally; at 680×560 the constrained axis scrolls
vertically. Zoom-in still reaches 28px/hour and zoom-out restores the default.
No time data or pointer behavior changed.

The isolated review App's disabled Send state was a profile connection state,
not a product defect: its synthetic profile showed Codex CLI detected but
ChatGPT disconnected, and Send remained disabled with a non-empty synthetic
draft for the explicit reason that ChatGPT must be connected. The draft was
cleared without sending. The installed App showed ChatGPT connected; its Send
button was disabled only while the composer was empty. No credentials or
profile files were inspected, no message was sent, and no Collaboration source
change was needed.

Verification: the targeted macOS WebKit geometry test passed across
1914×1518 (reference), 1280×800, 1280×720, 830×758, and 680×560, including the
fixed reference scale, stable minimum width, horizontal scrolling, short-window
vertical scrolling, and explicit zoom/reset. `npm run build` and `git diff
--check` passed. The broader `unified-today-axis.test.ts` run remains 6/10: four
fixture expectations fail for read-only tag/anchor output and folded
early/late/after-midnight disclosures. Those failures were not broadened into
this visual repair. Source commit and candidate package identity are appended
after they are verified.

The implementation commit is on the integration branch above and retains
`902fc032ab232e34feb218b766f8b123a1a8fc57` as its direct parent. Candidate
build uses the production bundle identifier and full source commit revision,
without profile, Vault, or fixed-clock overrides. It remains uninstalled and
unlaunched for the separate reviewer.
