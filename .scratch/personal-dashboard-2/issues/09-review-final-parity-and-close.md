# 09: Independently verify FINAL parity and close 2.0

Type: task
Status: resolved
Blocked by: none; user visual acceptance is recorded and all implementation/evidence follow-up is complete

## What to verify

Latest disposition: user visual acceptance has been received. Independent final review found remaining recovery/transition and evidence gaps; see [final review follow-up](../final-review-follow-up.md) and ticket 10. Historical ready-for-human statements below predate this disposition. Do not ask again for unchanged visual acceptance.

Directly inspect the rebuilt Mac candidate against the frozen FINAL after ticket 08. Read ../repair-decisions.md. Prior PASS reports are historical evidence, not this review's conclusion.

## Acceptance criteria

- [x] Confirm ticket 08 implementation is present and identify the actual reviewed commit, executable hash and version.
- [x] Independently open both prototype and packaged product, then walk the ticket 08 state/size matrix with matched synthetic content. Compare toolbar, sidebar, margins, typography, hierarchy, timeline, forms, dots and expanded panels.
- [x] Produce a concise paired deviation ledger: restored, explicitly accepted difference, unresolved defect, or not checked. Separate subjective alternatives from confirmed departures; never silently mark an unapproved departure PASS.
- [x] Verify relevant behavior regressions and packaged operations in isolated data. Report visual evidence separately from AX/tests and from real-data observations.
- [x] Present the resulting product comparison to the user. Close the 2.0 visual acceptance only after the user accepts remaining intentional differences and no required unchecked/failed items remain.
- [x] Update the map and append a dated correction to prior acceptance documentation without erasing historical results. If blocked, leave the ticket unresolved with concrete findings.

No prototype changes, real-data writes, producer changes, Dida365 calls, automation changes or repeat cutover are authorized by this review ticket.

## Review result

The fresh review is complete but 2.0 is not closed. Ticket 08 is present at
commit `b8bf3808d4bdc86e68b8301acf9eb47b38aba0e1`. The rebuilt packaged
candidate is Personal Dashboard `2.0.0` / build `2.0.0`, with executable
SHA-256
`ac19a7de661193fd74a33c6a374b1ff0b9c485dcc54405fbfc7f1f3445448c46`.

The frozen FINAL prototype was opened from the existing local prototype URL.
The packaged candidate was launched against the dashboard-2 isolated synthetic
2026-09-08 vault and snapshot. Fresh paired window captures are in the ignored
local evidence set `output/playwright/final-acceptance/ticket09-product-*.png`.

| Ledger | Fresh finding |
| --- | --- |
| Restored / confirmed | Shared toolbar, three destinations, Today timeline/update rail, Calendar grid and selected-day summary, Habits snapshot/recent marks/expanded detail, and the complete synthetic content are present. Fresh packaged AX coverage passed at 1180x820, 800x640, and 640x520. |
| Explicitly accepted | Native macOS title-bar chrome; the production caption `本地` instead of prototype `本地原型`; and the prototype-only FINAL synthetic-data notice are packaging/prototype differences, not product parity requirements. |
| Unresolved | At 800x640 the packaged candidate renders an icon-only 68px sidebar while FINAL keeps the dated context and text destinations. At 640x520 the visible date/destination navigation row is absent even though AX still exposes the hidden `Destination` control. Calendar also shows production-only selection/reassurance status, renders the selected-day summary as a card, and moves that summary before the month grid at narrow width; FINAL keeps a flat side summary and month view first. Habits lacks FINAL's top-right `3 / 15 · 本周已知` metric and uses a stronger sourced-snapshot heading in place of FINAL's subdued week meta. |
| Not checked | Fresh visual captures for Calendar unreviewed/empty dates and Habits edit/correction states were not completed. The legacy `calendar` and `habits` shell scenarios still wait for the retired `Log workout now` startup text, so they were not used as fresh pass evidence. |

These are confirmed rendered departures, not subjective alternatives. The fresh
dashboard-2 AX run and source tests pass, but AX success does not erase the
visual findings. No real vault, producer, Dida365, automation, or cutover state
was touched. The ticket remains `ready-for-human` pending a decision on the
unresolved parity items and the required user acceptance; the overall 2.0
visual acceptance remains open.

## 2026-09-11 repair follow-up — still ready-for-human

Ticket 08's five reported departures were rechecked against the frozen FINAL
prototype and the new packaged Mac bundle from implementation commit
`8910d96abe914c873d1bca2ecf27bc2d8118c210`. The reviewed executable is Personal Dashboard `2.0.0` / build
`2.0.0`, SHA-256
`fab01e5905809bf6119e6331e23308a4664b6a11e3274c6d5dcda30657cd0675`.

| Ledger | Follow-up result |
| --- | --- |
| Restored / confirmed | Text Today/Calendar/Habits navigation at 800×640 and 640×520; Vault-scoped Calendar/Habits invalidation and active-destination refresh; flat Calendar summary with month-first narrow ordering; Habits `3 / 15 · 本周已知` metric and restored heading hierarchy; and non-retired Calendar/Habits startup semantics. |
| State coverage | Calendar reviewed, unreviewed, malformed, empty, and current days; Habits collapsed, expanded, sourced-conflict, edit, correction, relaunch, and malformed-snapshot-retention states. |
| Explicitly accepted | Native macOS title-bar chrome, production `本地` in place of prototype `本地原型`, and the prototype-only FINAL synthetic-data notice remain packaging/prototype differences. |
| Unresolved | No new defect from the five reported findings was confirmed after the repair. Final visual/product acceptance is intentionally still open for the user's direct sign-off; this agent does not mark the product accepted. |

The frozen FINAL route opened directly from the existing local prototype server:

`http://127.0.0.1:4174/?variant=FINAL&screen=today&date=2026-09-08&month=2026-09&phase=progress`

The packaged app was launched in disposable synthetic profiles with the same
content and logical sizes. The ignored visual evidence remains under
`output/playwright/final-acceptance/`, with the final-repair page captures named
`ticket09-final-product-*` and state captures named `ticket09-repair-product-*`.
The final bundle's direct packaged checks passed for Calendar and Habits; the
first Habits rerun had a diagnosed post-relaunch AX readiness timeout, while a
single complete rerun then passed. No acceptance assertion was removed or
broadened to accommodate it.

### Code review

Using `a76f3b4` as the fixed review point:

- Standards axis: no blocking finding. The implementation stays within the
  existing frontend, native acceptance driver, regression-test, and issue-doc
  seams; it adds no dependency, service, prototype, real-data, producer,
  Dida365, skill, TickTick, automation, or cutover change.
- Spec axis: the five reported departures are covered by source regressions,
  direct FINAL/package inspection, and the isolated Calendar/Habits runs.
  The review does not change the ticket's `ready-for-human` status or claim
  final product acceptance.

### Separate evidence

- `npm run test:frontend` — 12 tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` — passed.
- `npm run build:mac` — passed; executable hash recorded above.
- Calendar packaged scenario — passed at 960×720 and 640×520 across reviewed,
  unreviewed, malformed, empty, and current states.
- Habits packaged scenario — passed on the diagnosed rerun across conflict,
  create, two corrections, relaunch, narrow layout, and malformed snapshot
  retention.

Ticket 09 remains `ready-for-human`. The final product acceptance and closure
decision remain with the user.

## 2026-09-11 closure — Calendar pending-save failure is visible

The last review finding was reproduced in the real built frontend: when a
pending Habits save failed after the user had moved to Calendar, the active
Calendar status had `data-state="error"` but the FINAL cascade clipped the
element to a 1×1 pixel. The repair is in commit `4cd9a4c`:

- Calendar keeps the existing compact hidden status for normal states, while
  the error state alone returns to normal flow with automatic dimensions and
  visible overflow. Normal Calendar layout is unchanged.
- The fallback message no longer repeats the `Habits 保存失败` prefix when
  the invalidated Habits request cannot update its old page status.
- The deferred cross-page behavior regression executes the sequence, asserts
  the native picker callback is not invoked, and preserves the draft,
  correction identity, selected date, phase, current Vault view, and visible
  failure destination.

Direct browser validation against the rebuilt frontend (actual DOM and layout,
not source matching or AX text presence alone) completed the requested path:
Habits correction input was entered, Vault selection was started, the page was
moved to Calendar, the pending save was rejected, and the Calendar error was
measured at `position: static`, `overflow: visible`, `clip: auto`, and about
`922×18` pixels. The test picker counter stayed `0`. Returning to Habits kept
`更正记录 · 2026-09-08`, the input `延迟失败后仍保留的更正`, and the visible
`保存更正` action.

The rebuilt packaged candidate is Personal Dashboard `2.0.0` / build `2.0.0`,
arm64 executable SHA-256
`e346644c084f1845c6d10b08ecd354afe16ed9e053044c59d3e03936a3fd868d`.
Packaged `vault-selection` and `vault-recovery` passed through the native
folder picker with disposable synthetic Vaults; packaged launch acceptance
also passed. The first recovery attempt hit the known native AX focus timing
boundary; one controlled isolated rerun with the explicit scenario and an
awake interactive session passed end to end. No acceptance assertion was
removed or broadened.

### Code review

The Standards and Spec review of `7c021eb..4cd9a4c` found no blocking issue.
The CSS override is scoped to Calendar's error state and is paired with an
executable deferred behavior regression plus direct browser layout evidence;
no prototype, real data, producer, Dida365, TickTick, automation, dependency,
skill, or cutover state changed.

Final verification:

- `npm run test:frontend` — 22 passed.
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check` and
  `cargo test --manifest-path src-tauri/Cargo.toml` — 152 Rust tests passed;
  doc-tests passed.
- `npm run build:mac` and `scripts/acceptance/macos-packaged-launch.sh` —
  passed.
- Packaged `vault-selection` and `vault-recovery` — passed.
- Shell/Swift syntax checks and `git diff --check` — passed.

The user's existing visual acceptance remains valid and was not re-requested.
Ticket 09 is now `resolved`; final product sign-off remains user-owned.

## 2026-09-11 final behavior follow-up — unchanged Vault selection

The remaining review finding was reproduced before the repair: cancelling the
native Vault picker caused the packaged frontend to reset the selected
`Daytime` phase, which also cleared the unsaved Daytime/Habits composer and
correction state. The backend response was not enough because the frontend
treated every `select_today_vault` result as a changed Vault.

Implementation commit `4bef154ef2688eab019673afea525d0a81ed6fe0` changes the
command contract to `{ view, changed }` and moves the frontend behavior into an
executable `selectVaultAndRefresh` seam. `changed: false` is a no-op for UI
state; `changed: true` invalidates and clears Vault-scoped projections before
rendering Today and refreshing the active secondary destination. The reset also
clears `currentTodayView` so an old Vault composer cannot be re-stashed while a
new Vault view is rendered.

### Behavior and packaged evidence

- Rust tests: cancel returns the current view without persistence, same-Vault
  reselect does not persist, and a real switch persists once and reads only the
  new Vault.
- Frontend behavior tests: four executable paths pass for cancel, same-Vault
  reselect, Calendar switch, and Habits switch; the tests assert state values
  and callback order, not source strings.
- Final packaged executable:
  `19c4e20b4f17c760475871f64abbd4290ce830733ae0cbe32b9c9621c1681a3f`.
- Final packaged `vault-selection` passed through the real native folder picker:
  cancellation preserved Today draft, correction, Habits draft, and selected
  history date; reselecting the current Vault preserved the Daytime draft and
  phase; switching to B cleared old projections before Calendar/Today read B;
  both synthetic Daily Records remained byte-identical.
- Final packaged Calendar, Habits, and dashboard-2 scenarios also passed on the
  same bundle. Full frontend and Rust suites, shell/Swift syntax checks, and
  Mac packaging passed.

The review found no new Standards- or Spec-axis blocking issue against fixed
point `7e5be6765aa6ced8b2c00ecb8be66701e5c2067d`. Ticket 08 remains `resolved`.
Ticket 09 remains `ready-for-human`: no implementation finding from this repair
is left open, but the final visual/product acceptance and closure decision are
still intentionally left to the user.

## 2026-09-11 final recovery/evidence follow-up — ready-for-human

Ticket 10's recovery and evidence gaps are complete. The implementation commits
are `0799c34` (`fix(dashboard): reconcile Vault selection failures`) and
`5e4ddf4` (`test(dashboard): expand final state matrix evidence`); the packaged
Mac executable reviewed for these checks is Personal Dashboard 2.0.0/build
2.0.0 with SHA-256
`d93c586aaaf5fbd0a23b66215b2e6a05094cef7618c830e87b91506ba14e9e0c`.

The new executable behavior tests cover recoverable malformed/unsupported
workspace settings, hard workspace I/O errors, read-before-commit and commit
failure semantics, superseded presentation results, in-flight Habits saves,
and the existing stale-binding rejection. The isolated packaged checks passed
for native malformed-setting recovery, active Calendar errors, failed new-Vault
selection without persistence drift, subsequent recovery, and cancel/same-Vault
state preservation.

The missing state/size evidence was then executed rather than inferred:
Calendar empty and unreviewed summaries, Habits edit/correction composers,
long Today text, and Daytime focus all passed in the visible active destination
at 1180x820, 800x640, and 640x520. The old `Log workout now` path was not
reintroduced or used.

Independent review of `ee0467d..5e4ddf4` found no blocking Standards- or
Spec-axis issue. Full regression, packaged build, and the targeted packaged
scenarios passed. Ticket 09 remains `ready-for-human` because the unchecked
product-acceptance criterion and final closure decision remain with the user;
the agent does not claim final product acceptance.

## 2026-09-11 final recovery follow-up — failed pending Habits save

The final Ticket 10 review replayed one remaining Vault-switch loss path:
`waitForPendingHabitSave()` waited for a pending Habits save but ignored a
`false` result, allowing the picker and a later Vault reset to discard the
unsaved draft and correction state.

Commit `a728ddf` carries that result through the frontend behavior seam. A
failed deferred save now aborts the selection before the picker is invoked,
keeps the Habits draft, correction, selected date, phase, and current Vault
view, and displays an error in the active page. A successful deferred save
continues to the picker and preserves the established real-switch refresh
order. The two paths are executable behavior regressions, not source-string
checks.

The final check set passed: 20 frontend tests; 152 Rust tests plus doc-tests;
Rust formatting, shell syntax, and diff checks; Mac packaging; and packaged
`vault-selection` on executable SHA-256
`cdad1c24bb0970ea5791c515366007fe8db33538d20a6543ec42489b96a69744`.
Packaged coverage revalidated cancellation, same-Vault reselect, and real
cross-Vault isolation; the deferred failed/successful save paths remain
honestly attributed to the frontend behavior tests because the packaged
scenario does not synthesize a delayed save failure.

The Standards- and Spec-axis review of `55ad50d..a728ddf` found no blocking
finding. Ticket 08 remains `resolved`; Ticket 10 remains `resolved`; Ticket 09
stays `ready-for-human`. Final visual/product acceptance and closure remain the
user's responsibility, as requested.
