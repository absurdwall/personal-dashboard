# 08: Restore FINAL shell and destination presentation

Type: task
Status: resolved
Blocked by: none (verify existing 01–07 implementation is present)

## What to build

Restore the selected FINAL product toolbar, sidebar relationship and Today / Calendar / Habits composition in the installed Mac app. Read ../repair-decisions.md, ../spec.md and ../prototype/README.md first. Scope is confirmed; execute when the user invokes implementation, not during this planning discussion.

## Acceptance criteria

- [x] Before editing, run the frozen FINAL locally and directly compare it with the current Mac app using matched logical sizes, dates, phases, synthetic content and expansion states. Record deviations with paired images; neither old reports nor AX checks substitute for looking.
- [x] Restore the full-width product toolbar and shared shell. Preserve its elastic space and extension positions even when unused. Settings provides existing Vault selection; refresh remains on relevant pages. The more-menu may remain a clearly indicated placeholder with no data-changing behavior, as explicitly accepted by the user. Do not substitute the native title bar or restore retired settings.
- [x] Restore Today hierarchy, timeline, update rail, text scale and reading density; remove unapproved repeated headings and intrusive implementation explanations while preserving the baseline/current/fact distinctions.
- [x] Restore Habits left padding, heading hierarchy, lightweight summary, recent-day marks and expanded history layout. No narrow squeezed history column, accidental heading wraps or large empty area beside vertically centered row content.
- [x] Check Calendar structure and selected-day summary against FINAL; historical pages must accurately name the selected day rather than claim it is today.
- [x] Inventory every intentional difference. Preserve explicitly agreed functional extensions, including both short-record entry points and correction traces, in FINAL's visual language. Unapproved design differences remain open; do not redesign FINAL or copy synthetic goals into real data.
- [x] Verify all three Today phases, Calendar reviewed/unreviewed/empty dates, Habits collapsed/expanded/detail/edit states, long text and focus at 1180x820, 800x640 and 640x520 logical window sizes. Account for Retina/capture scale explicitly.
- [x] Run appropriate existing behavior checks and packaged Mac checks; preserve data-writing safeguards and snapshot semantics. No changes to real records, producer skills, Dida365, automations or legacy cleanup.

## Handoff

Use the existing implementation workflow. Keep the frozen prototype unchanged. Record commit and bundle identity, paired evidence and outstanding differences. Do not claim overall 2.0 closure here; ticket 09 owns fresh final review.

## Answer

Implemented on 2026-09-11 from base commit `a38869073a0a389d7107fb79ab659c842459294e`.

### Implementation

- Restored the full-width product toolbar, elastic action space, Vault-selection Settings bridge, explicit unavailable More placeholder, and shared sidebar context for Today, Calendar, and Habits.
- Restored the selected FINAL composition for Today, including the baseline timeline, Daytime fact/current-plan/revision split, update rail, compact reading hierarchy, and Evening content before the bounded update form.
- Restored Calendar selected-day naming and summary context, plus the FINAL Habits summary, recent marks, and expanded-detail layout.
- When a Today phase is revealed, the active panel is re-attached after its hidden state changes. This is a narrow WebKit AX workaround: the packaged window showed the Evening content visually, but its dynamic AX subtree stopped at the tab heading until this change.
- Extended the dashboard-2 packaged driver contract to cover the new shell, phase states, active-surface scrolling, and all three required logical window sizes. The frozen prototype and real vault data were not changed.

### Evidence

- Direct pre-edit comparison used the frozen FINAL Today, Calendar, and Habits references at matched logical sizes and the packaged app's synthetic 2026-09-08 record. Post-edit inspection confirmed the product toolbar and the complete Evening review were visually present; native title-bar chrome and prototype-only notices remain intentionally outside the product surface.
- `npm run build` — passed.
- `npm run test:frontend` — 7 tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` — 142 tests passed; doc-tests passed.
- `npm run build:mac` — produced Personal Dashboard 2.0.0. Packaged executable SHA-256: `ac19a7de661193fd74a33c6a374b1ff0b9c485dcc54405fbfc7f1f3445448c46`.
- `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=dashboard-2 PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=300 scripts/acceptance/macos-ipc-workflow.sh` — passed. The isolated scenario preserved source and Habits snapshot hashes while checking Today, Calendar, and Habits at 1180x820, 800x640, and 640x520, including the Evening account, lower summary, selected-day state, expanded habit detail, and correction-entry surfaces.

Implementation commit: final delivery commit reported with the task result below.

Ticket 09 remains responsible for an independent fresh paired visual review and overall 2.0 closure. This ticket does not claim that closure.

## 2026-09-11 follow-up repair

The independent 09 review found five concrete parity defects. They were repaired
in implementation commit `8910d96abe914c873d1bca2ecf27bc2d8118c210` (`fix(dashboard): restore final secondary
destination parity`), without changing the frozen prototype or the existing
untracked `repair-decisions.md`.

- The final scoped cascade now keeps text destinations visible at 800×640 and
  640×520, removes the hidden icon track, and keeps Calendar/Habits in the
  three-destination shell.
- Vault reselection invalidates Calendar and Habits request generations and
  clears their selected month/date, snapshot, detail, drafts, and visible
  projection before refreshing the active destination.
- Calendar now uses the FINAL flat selected-day summary, serif heading, quiet
  status treatment, and month-first narrow ordering.
- Habits now exposes the right-side `3 / 15` / `本周已知` metric, restores the
  subdued `WEEK OF · SOURCED SNAPSHOT` hierarchy, and constrains intermediate
  rows so the history/detail columns remain readable.
- Calendar and Habits packaged scenarios now start from `Today` and use the
  live 2.0 destination controls; their targeted slices no longer wait for the
  retired `Log workout now` surface. The scenarios also cover reviewed,
  unreviewed, malformed, empty, edit, correction, relaunch, and retained
  snapshot states.

## Follow-up evidence

- `npm run build` — passed.
- `npm run test:frontend` — 12 tests passed, including the new FINAL parity
  source regressions.
- `cargo test --manifest-path src-tauri/Cargo.toml` — passed across the Rust
  unit, workflow, and doc-test suites.
- `bash -n scripts/acceptance/macos-ipc-workflow.sh` and
  `swift -frontend -parse scripts/acceptance/macos-ui-driver.swift` — passed.
- `npm run build:mac` — produced Personal Dashboard `2.0.0` / build `2.0.0`;
  the reviewed executable SHA-256 is
  `fab01e5905809bf6119e6331e23308a4664b6a11e3274c6d5dcda30657cd0675`.
- The final bundle was opened in an isolated temporary profile and compared
  with the frozen FINAL prototype at 1180×820, 800×640, and 640×520. The
  ignored paired capture set is under
  `output/playwright/final-acceptance/ticket09-final-product-*.png`; the
  additional state captures are the `ticket09-repair-product-*` files.
- The final packaged Calendar scenario passed for reviewed, unreviewed,
  malformed, empty, and current dates at 960×720 and 640×520. The final
  packaged Habits scenario passed on its diagnosed rerun, including the
  conflict draft, two correction paths, relaunch, and 640×520 retention check.
  One earlier rerun hit a post-relaunch Accessibility readiness timeout; a
  direct isolated launch of the same final bundle succeeded, and the complete
  scenario then passed without changing the product timeout or relaxing an
  assertion.

This implementation ticket remains `resolved`; final visual/product sign-off
continues to belong to ticket 09.

## 2026-09-11 final recovery and matrix reconciliation

The remaining 09 engineering findings were closed without changing the frozen
FINAL or the accepted presentation. The executable behavior repair is in
`0799c34` (`fix(dashboard): reconcile Vault selection failures`); the final
state-size evidence extension is in `5e4ddf4` (`test(dashboard): expand final
state matrix evidence`).

- The app-owned Today workspace setting now distinguishes missing,
  recoverable malformed/unsupported JSON, and hard filesystem I/O errors.
  Explicit native Vault selection repairs recoverable settings; an arbitrary
  read error is not treated as an empty setting.
- A selected Vault is opened and validated before persistence. Failed new-Vault
  reads or failed setting commits leave the previously committed selection
  intact. The frontend separates global Vault-selection freshness from Today
  presentation freshness, waits for an in-flight Habits save, and reports
  Calendar failures in the visible active destination.
- Packaged `vault-recovery` covered malformed-setting recovery, initial active
  Calendar failure, unreadable-new-Vault failure with the setting still on A,
  and subsequent recovery to B. Packaged `vault-selection` rechecked cancel,
  same-Vault, and real-switch state boundaries.
- Packaged `final-state-matrix` executed Calendar reviewed/unreviewed/empty
  summaries, Habits edit/correction states, long Today text, and Daytime focus
  at 1180x820, 800x640, and 640x520. AX assertions for these new checks are
  scoped to visible active-destination content.

The visual/product acceptance decision remains owned by ticket 09 and the
user; this ticket records implementation and evidence closure, not final
product sign-off.

## 2026-09-11 follow-up repair — unchanged Vault selection state

The final 09 review found one remaining behavior boundary: the backend already
returned the current view when the native Vault picker was cancelled, but the
frontend unconditionally reset Today, Calendar, Habits, drafts, corrections,
and browsing state. The pre-fix packaged scenario reproduced this by losing the
selected `Daytime` phase immediately after picker cancellation.

Implementation commit `4bef154ef2688eab019673afea525d0a81ed6fe0`
(`fix(dashboard): preserve state on unchanged Vault selection`) now returns a
serialized `{ view, changed }` result from `select_today_vault`. Cancellation
and reselecting the persisted Vault return `changed: false`; the frontend
leaves the current view, phase, selected Calendar date, Habits date, drafts,
and correction state untouched. A real path change returns `changed: true`,
clears all Vault-scoped state including `currentTodayView`, renders the new
Today view, and refreshes only the active Calendar or Habits destination.

Behavior evidence is executable rather than source-only: Rust workflow tests
cover cancel, same-path reselect, and old/new Vault isolation; frontend tests
execute the unchanged and changed branches for Today, Calendar, and Habits;
and the packaged `vault-selection` scenario uses the native picker to verify
Daytime draft/correction preservation, Habits draft and selected-history-date
preservation, B-Vault Calendar/Today content, and byte-identical synthetic
Daily Records.

Final validation:

- `npm run test:frontend` — 16 tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` — all 145 Rust tests and doc-tests passed; the focused Today workflow contains 41 passing tests.
- `bash -n scripts/acceptance/macos-ipc-workflow.sh`, Swift parser validation,
  and `cargo fmt --check` — passed.
- `npm run build:mac` — passed. Final packaged executable SHA-256:
  `19c4e20b4f17c760475871f64abbd4290ce830733ae0cbe32b9c9621c1681a3f`.
- On that final bundle, packaged `vault-selection`, `calendar`, `habits`, and
  `dashboard-2` scenarios passed. The Calendar/Habits paths retained their
  reviewed, unreviewed, malformed, empty, edit/correction, relaunch, retained
  snapshot, and narrow-window checks; the new Vault path also verified native
  cancellation and same-Vault reselect.

The frozen FINAL prototype, real vault data, producer skills, TickTick,
automations, and user-owned `.scratch/personal-dashboard-2/repair-decisions.md`
were not changed. Ticket 08 remains `resolved`; final product acceptance is
still owned by ticket 09 and the user.
