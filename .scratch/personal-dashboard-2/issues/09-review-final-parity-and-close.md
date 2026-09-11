# 09: Independently verify FINAL parity and close 2.0

Type: task
Status: ready-for-human
Blocked by: none (08 resolved)

## What to verify

Directly inspect the rebuilt Mac candidate against the frozen FINAL after ticket 08. Read ../repair-decisions.md. Prior PASS reports are historical evidence, not this review's conclusion.

## Acceptance criteria

- [x] Confirm ticket 08 implementation is present and identify the actual reviewed commit, executable hash and version.
- [x] Independently open both prototype and packaged product, then walk the ticket 08 state/size matrix with matched synthetic content. Compare toolbar, sidebar, margins, typography, hierarchy, timeline, forms, dots and expanded panels.
- [x] Produce a concise paired deviation ledger: restored, explicitly accepted difference, unresolved defect, or not checked. Separate subjective alternatives from confirmed departures; never silently mark an unapproved departure PASS.
- [x] Verify relevant behavior regressions and packaged operations in isolated data. Report visual evidence separately from AX/tests and from real-data observations.
- [ ] Present the resulting product comparison to the user. Close the 2.0 visual acceptance only after the user accepts remaining intentional differences and no required unchecked/failed items remain.
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
