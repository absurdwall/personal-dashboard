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
