# PDEX-03 — Readable Morning and shared Daytime axis

Date: 2026-10-10
Branch: `codex/pdex-03`
Worktree: `/tmp/pdex-03`
Authorized base: integration `40c7c22` (claim following `f400013`)
Implementation: `ed10038`
Integration synchronization: `d83e24b` incorporates `d10cad6`, including PDEX-01
plan identity/editability and PDEX-06 Task execution-end contracts.
Window-dimension verification refinement: `669968c`

## Production behavior

Morning retains `view.baseline.timeline` as original text sections and explicitly
labels its Daily Record morning-baseline source. It has no second clock axis.
Broad wording, titles and details remain unchanged.

Daytime keeps one shared time scale. Current arrangement, Task and Confirmed
fact labels identify their sources independently. Colliding cards occupy
separate temporary columns; interval components reuse a column when a prior
reading target ends. Solitary entries fill the row. These columns arise from
actual collisions rather than a fixed column for each source.

Dense collisions retain useful target widths, with horizontal scrolling inside
the same axis. Dates, titles and provenance have separate reading rows, so a
next-day date does not consume a card's title width. Full text remains in each
selectable entry's existing detail disclosure. The original next-item control
continues to focus the next member of a collision group.

The existing `#today-axis-scroll-surface` now owns bounded vertical and horizontal
scrolling. Quiet-hour toggles preserve its reading position rather than moving
the surrounding page; Locate now changes only this inner viewport. The lived-day
04:00–next-day 04:00 bounds remain unchanged. Existing quiet-hour entries expand
on initial date selection; deliberate folds advertise the number of entries and
retain their details. Next-day labels keep the actual displayed date.

Card reading height never supplies an end time. Existing point Tasks still have
`endMinute: null`; plans do not become Confirmed facts when the clock advances.
The renderer consumes the shared start/end contract, leaving incoming fuzzy
precision and Task interval projection to their owning PDEX-02/PDEX-07 tickets.

## Verification

- `npm run build`: passed after integration synchronization.
- `npm run test:frontend`: 406 tests passed, zero failed/skipped.
- Nine actual macOS WebKit tests execute compiled production rendering, geometry,
  Task projection and language code against the shipped HTML/CSS. The first test
  checks the actual viewport height at 1280×720, 830×758 and 680×758 rather than
  only changing the width of a 900px-tall test surface.
- They verify plan/range, point Task and fact source labels; separate click
  targets; solitary full width; detail selection; column reuse; dense horizontal
  scrolling; independent vertical scrolling and reading anchors; quiet-period
  discovery/counts; next-day dates; Morning's original text/source; Locate now;
  and plans/pending Tasks remaining distinct from facts after the clock advances.
- Existing Today regressions retain quiet disclosure endpoints, source anchors,
  details/focus, complete multilingual text, pending editor drafts and 04:00
  rollover protection. Existing geometry unit tests remain supporting evidence.
- The common WebKit helper accepts an optional height while retaining its 900px
  default for existing callers.

## TDD evidence

Real WebKit failures first showed three collision targets covering one another,
an axis with equal 1875px client/scroll heights and no inner scrolling, hidden
quiet-hour entries, dense 72px-wide targets and an 8px-wide after-midnight title.
Each corresponding implementation slice followed its failing behavioral check.
A viewport check also caught the old helper silently retaining a 900px height
when the caller requested 720px; the refined driver now verifies actual sizes.

## Remaining acceptance

These are real WebKit DOM click/scroll and geometry checks with synthetic view
inputs, not packaged Tauri or physical pointer/OS acceptance. PDEX-11 still owns
the common packaged candidate and human usability evidence. This presentation
slice adds no native persistence path; native plan/Task readback and restart
checks belong to the retained PDEX-01/PDEX-06 evidence and root's serialized
integration verification. No new native build was run for PDEX-03. No user data,
App installation, protected-main or remote state changed. The ticket and parent
specification are not closed by this automated evidence.
