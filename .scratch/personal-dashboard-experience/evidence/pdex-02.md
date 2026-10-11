# PDEX-02 implementation evidence

Date: 2026-10-10
Branch: `codex/pdex-02`
Initial integration base: `b547bd9` (claim atop `32b3678`).
Implementation: `8400b9f`, `6740e5d`.
Integration merges retained: `e71e876` includes `d10cad6`; latest merge includes `2275bf1` (PDEX-03).
State: code-ready; application and production WebKit seams verified; packaged IPC acceptance pending PDEX-11.

## Contract and behavior

`TimeAxisEntryView.planPrecision` reads `broad`, `approximatePoint`, `exactPoint`,
`exactRange`, or `unlocated` for plans; fact precision remains absent. Broad
references are 09:00 for early/morning, 12:00 noon, 13:00 afternoon, and 18:00
late/evening. They retain original period text and have no end. The UI shows
original broad wording with an “约” reference, or an approximate point label.
Explicit source times take precedence over a broad category heading.

`PlanTimeEditInput.precision` is optional for compatibility. An omitted value
keeps broad/approximate edits approximate and uses the prior exact edit contract
for exact sources. Explicit values select approximate point, exact point or
exact range. Range ends are required; points have no inferred end. Omitting
precision is skipped in serialization so existing receipt fingerprints remain
compatible. Relative expressions without a reliable fixed record context stay
unlocated; refreshing from 14:10 to 18:30 does not move them.

The production modal offers the three explicit choices, preserves approximate
semantics by default, and emits the captured revision-bound source ID. An
unlocated plan with a safely bound field can be explicitly located. A uniquely
inherited time heading covering one plan is editable; shared/category headings
and a body-only exact time cannot be patched through another field. Source
period edits still atomically preserve the Morning section, facts, unrelated
Markdown, identity conflicts, and operation receipts from PDEX-01. Cross-midnight
ranges save both endpoint dates and round-trip as the complete range.

## Evidence and red-green sequence

- Broad/approximate reading initially returned only three explicit plans,
  failing the eight located plan expectation. After implementation all five
  prescribed broad words and approximate/exact cases retain their precision.
- Fuzzy editing initially failed PDEX-01's exact-only source guard; after the
  bounded edit extension, `午后 → 约14:00 → 15:00–16:00 → 约16:45` is persisted,
  read back and reopened. Explicit point conversion and midnight range readback
  are also verified. Baseline and facts retain their independent values.
- A uniquely inherited time heading initially lacked editability. The public
  application test now edits its heading while preserving an unrelated time
  comment, exact Morning bytes and confirmed facts. A shared heading remains
  unsafe. A body-only exact range retains its timing and refuses a conflicting
  broad-field edit without changing any bytes.
- A midnight range initially saved `23:00–2026-08-11 01:00`, failing the expected
  dated endpoints; saving both dates restored complete range readback.
- The real production fuzzy modal test initially failed “Precision choice
  missing”. After the UI increment it passes through the full shipped page,
  stylesheet, `main.js` and imported production modules in macOS WebKit.
- `npm run build`: passes after the latest PDEX-03 integration merge.
- `npm run test:frontend`: 402 passed at integration `d10cad6` plus PDEX-02;
  zero failed or skipped. Latest PDEX-03 integration was then built and the five
  production modal tests rerun successfully.
- Isolated `cargo test --manifest-path src-tauri/Cargo.toml --test
  daily_plan_workflow --test today_workflow`: 15 + 54 passed after `d10cad6`
  integration; zero failures. The latest PDEX-03 merge changes no Rust sources.
  `CARGO_TARGET_DIR=/tmp/pdex-01/src-tauri/target CARGO_BUILD_JOBS=2`; no canonical
  target substitution was used.

The five WebKit tests cover approximate save/readback, explicit point/range
choices and required end validation, inherited heading identity/revision,
uncertain-save retained inputs and duplicate prevention, and an exact point
opened in a fresh page. Only the system IPC boundary uses synthetic responses;
no production function is replaced or extracted. Serialized synthetic views
come from genuine public `TodayApplication` workflow results. Regenerate them:

```sh
PDEX_UI_FIXTURE_DIRECTORY=/tmp/pdex-ui-fixtures \
CARGO_TARGET_DIR=/tmp/pdex-01/src-tauri/target CARGO_BUILD_JOBS=2 \
cargo test --manifest-path src-tauri/Cargo.toml --test daily_plan_workflow
```

Copy the two resulting JSON files into `tests/frontend/fixtures/` and run
`npm run build` followed by `node --test tests/frontend/plan-time-editor.test.ts`.
The tests host only this synthetic compiled page on an ephemeral loopback port.

## Acceptance boundary

Application persistence/readback/reopen and actual production DOM interaction
are verified. This does not claim a packaged Tauri IPC write, installation,
release, personal-record operation, or user acceptance. Full broad-card visual
acceptance and packaged-app editing/save/reopen remain PDEX-11 work. PDEX-01's
historical evidence stays intact; this ticket adds real production-modal WebKit
coverage of its inherited exact editor, while its packaged acceptance remains
pending. No remote, main, dependency, model quota, or installation change occurred.
