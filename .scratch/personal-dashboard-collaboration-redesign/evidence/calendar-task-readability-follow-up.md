# Task card responsive readability — in progress

2026-10-10, baseline `46fdaec2f3008d500274f5082a2fd5a909635ae2` on
`codex/collaboration-redesign-integration`. The previously reviewed typography
product `499cdc1` is installed and accepted; parent closure by human acceptance
and explicit deferral remains valid.

The user added a narrow follow-up before ending this run: Calendar's
"Tasks for this day" shows task names/content in an extremely thin tall column
with large unused space next to it. User message
`01a126bf-f846-7451-ac32-b44eb2e608d9` in review chat
`01a1229c-6bc2-7472-9dc9-16f3daccb6d3` provides the native screenshot and
authorizes choosing the appropriate layout fix. Review remains read-only;
the original implementation chat owns the change, local update and commits.

One isolated implementer measures the actual Calendar frame/summary/Task card,
main body and controls before changing scoped layout. Validate production
rendering with synthetic Chinese/English long titles/content, pending/completed
states and controls at wide/narrow windows. Personal screenshot contents are
source feedback only and are not copied into fixtures or repository records.
Task body needs readable width; controls must not consume the body column.
Preserve forms/events/date targeting/drafts and Today's existing robust single-column behavior.

## Subsequent shared-surface clarification

The user's second screenshot/message
`01a126c0-fe1e-7123-b007-111280224fb9` confirms the same issue in Tasks, not
only Calendar. The directly authorized rule is based on actual card width:
use right-side actions only with enough room for readable body text, otherwise
put all actions below it. Implement the shared Tasks/Calendar rule with a clear
threshold derived from body and controls width budgets; preserve Today's
deliberate stacked layout. Test both sides of the threshold (including +/-1px),
Chinese/English long text and pending/completed/abandoned controls. First fix
the shared card rule and remeasure Calendar's surrounding layout; do not
restructure the whole Calendar solely on the earlier provisional suggestion.

Return a fixed candidate, diff, before/after computed values/screenshots and
appropriate existing checks/build for independent review. After acceptance,
repeat private App/profile backup, signed local replacement and verification.
Update source/handoff and normal local commits, then clean owned resources.
No workflow/schema/business-data change, GitHub/main merge/push, new dependency,
or change to the accepted parent/deferred criteria is included.

## Implementation and synthetic verification

Product changes are limited to CSS and moving the intact Calendar task section
one container level: `#calendar-task-panel` is now the full-width third child of
`.calendar-frame`, after the month and selected-day summary. IDs, controls,
forms and event/draft/date guards remain intact. No renderer/business logic,
content or task data changed. Collaboration's accepted typography is unchanged.

Shared task rows use an inline-size container. Below `34rem` (544px at the current
16px root), controls wrap below the full-width body with a thin separator; at
544px and above, controls sit on the right within 190px, leaving at least 342px
for the body after the 12px gap. Old viewport-only row overrides were removed.
Today keeps its existing always-stacked rule. Browsers without container-query
support retain the safe default stacked layout; this fixture does not claim
native WebKit acceptance.

Actual measurements established both causes. Calendar's 900px shell provided a
200.1px task card; actions took 188.1px and body width was 0. Shared stacking alone
restored 200.1px but left long content confined to the summary rail. The narrow
outer adjustment lets the task section use the frame's available width. Final
body widths (same synthetic content/production renderer and shell):

| Surface / viewport | Before body | Final body / control placement |
| --- | --- | --- |
| Calendar / 900px | 0px | 439.8px / right |
| Calendar / 1400px | 77.1px | 801.2px / right |
| Calendar / 620px | 533px | 533px / below |
| Tasks / 900px | 269.8px | 471.8px / below |
| Tasks / 1400px | 599.2px | 599.2px / right |
| Tasks / 620px | 533px | 533px / below |

The private fixture runs production `taskEditor`, `renderCalendarTasks`,
`renderCalendarGrid`, label/schedule helpers, the checked-in shell DOM and real
CSS. Chinese/English long titles/content and pending/completed/abandoned controls
were captured separately at 1400/900/620px. Every case resets fixture-owned
editor dialogs, so normal captures have no earlier overlay; `*-edit.png` cases
use an actual Details-button click and retain the actual inline/modal editor.
Calendar markers use the same production catalog keys. Inputs are entirely
synthetic and no mutation or real application/profile access occurs.

All 12 normal cases have no document/card overflow and retain visible enabled
controls; all four 900px edit cases have readable, non-overflowing forms. The
543/544/545px threshold was exercised at both 620px and 1400px viewports, across
both surfaces/languages/three states: all 72 cards obey their actual width,
with no overflow; Today at 800px remains stacked. Controls also retain focus
access. Before/after screenshots were visually inspected.

Private reproducible artifacts are under `/tmp/pdcr-calendar-readability-oct10`:
`prepare.mjs`, `capture.js`, `threshold.js`, `before-computed.json`,
`after-computed.json`, `threshold-computed.json`, `focus-report.log` and
`before-/after-{calendar,tasks}-{zh,en}-{1400,900,620}.png`, plus independent
900px edit screenshots. The existing cached browser CLI required no installation.
Existing Task/Calendar presentation/editor suites pass 45 tests
(`frontend-targeted.log`); existing-dependency build passes (`build.log`).
No mirrored CSS unit tests or new dependencies were added. Root owns independent
review, full checks and any separately authorized native build/install/acceptance.

### Exact fixed-source visual rerun

The first fixture's CSS had the same declarations but placed `padding-top: 7px`
and `border-top` in the earlier action rule. After those declarations were moved
to the final production rule, the fixture copy was not regenerated. Its SHA256
was `8358cb6581be37205e7db4f1154d168a9e7ec831eedab83158f4fda93261ba83`;
that first run is supporting diagnosis, not an exact final-source acceptance.

The fixture was regenerated from fixed candidate `cb3d09f5e2a7d7ee156a81afbfc057d54cbefbc7`.
CSS bytes now exactly equal `git show cb3d09f:frontend/styles.css`, 190099 bytes,
SHA256 `9bd308d7742e479ade3bb26d349599adc62b4fef10b105cb3dec176db0ed42a6`.
The page was reloaded with `styles.css?fixed=cb3d09f-9bd308d7742e`; browser-side
response hashing matched this SHA and the active stylesheet parsed 1262 rules
(`browser-source-hash.log`). After that verified reload, all 12 normal cases,
four actual edit cases, 72 threshold cards and four focus cases passed again;
after screenshots were recaptured. Corrected reports are
`after-exact-source-computed.json`, `threshold-exact-source-computed.json` and
`focus-exact-source-computed.json` in the same private artifact directory.
No product source changed during this correction; existing source tests need
no rerun for the fixture-byte repair. This remains browser supporting evidence,
with native installation/acceptance owned separately by root.
