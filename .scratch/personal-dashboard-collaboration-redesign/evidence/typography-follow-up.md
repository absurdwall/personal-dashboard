# Collaboration typography follow-up — in progress

2026-10-10, baseline `989580957e2718f88f7b17f6df74d52801c3fdbd`, local
integration branch `codex/collaboration-redesign-integration`.

## Human feedback and scope

In review chat `01a1229c-6bc2-7472-9dc9-16f3daccb6d3`, user turn
`01a126af-e781-7b00-b763-88cc8f04c94f` accepted the overall interaction for
their current examples and requested more consistent typography: the composer
size/density feels appropriate, output feels larger, and mixed Chinese/English
should share a comfortable rhythm. Further usage may reveal other issues.
The user expressly required the review chat to remain read-only; changes belong
to this original implementation chat and return for independent verification.

This is presentation feedback and a narrow typography follow-up. It does not
close PDCR-03, PDCR-11, PDCR-12 or the parent spec, replace source-qualified
native acceptance, or resolve the separate observed automatic InitialPlan
schema failures. No workflow/tool schema/business operation/personal text change.

## Execution boundary

One implementer uses the restored managed review worktree, with a new owned
`codex/` branch based on integration. Measure actual computed styles first,
then adjust scoped CSS/font inheritance/paragraph and list spacing relative
to the composer. Preserve metadata hierarchy and intentional code glyphs.
Validate real production rendering with synthetic mixed-language/long replies,
paragraphs/lists and expanded/collapsed work history; record before/after computed
values and screenshots. Build and appropriate existing renderer checks apply.
Fixed candidate/evidence must return to the independent reviewer before any
reuse of the user's previous local installation authorization. No GitHub,
main merge, push, new dependencies or services. The unrelated prototype stays.

## Superseding human closeout authorization

The same user turn later includes explicit messages
`01a126b1-9ca8-7861-90b0-2940759d2c0f` and
`01a126b1-a45b-7562-9856-2f7741586402`: after typography repair/review, update
the local Personal Dashboard, commit durable work and finish this iteration by
closing the spec. This supersedes the earlier parent-open boundary. Closure
will mean human acceptance with explicitly deferred remaining scope, not
fictional native/live test passes. PDCR-03 unknown-Dida scope, PDCR-11 voice/new
candidate acceptance, PDCR-12 live objects and the separately observed automatic
InitialPlan retries remain recorded as follow-ups. GitHub is deferred; local
branch/revision and future protected-main PR steps must be reproducible.

The independent reviewer directly observed two Work history disclosures in the
installed app were collapsed by default. The earlier copied failure details
came from intentional expansion; this feedback does not establish a default
diagnostic leakage defect or reject the accepted interaction.

The previously untracked prototype was inspected before the user-authorized
durable commit: embedded demo fixtures/pure in-memory transitions, explicit
simulation/unknown-state labels, no credentials, account identifiers, network
endpoints or personal profile/Vault access. Its original bytes/hash are retained.

## Implementation and synthetic visual evidence

The only product source change is `frontend/styles.css`. Message containers now
use the composer's existing `0.7rem / 1.55`; paragraphs, Markdown lists, Results
headings, Work history summaries/item headings/details inherit that baseline.
Paragraph/list spacing is `0.4rem`, list-item spacing `0.2rem`, and list indent
`1.5em`. Headers keep their smaller `0.56rem` metadata size, item identities
remain smaller text, and inline code/diffs keep monospace. Disclosure behavior,
original text, operations and schemas are unchanged.

Before changing CSS, a real browser fixture ran the production message/outcome
renderers, Markdown/WorkHistory helpers and language catalog with the real
stylesheet. Inputs are synthetic Chinese/English requests, a long multi-paragraph
reply, unordered/ordered/check lists, visible reasoning summary, failed tool and
file diff. Explicit expanded and collapsed states were captured independently;
expanded diagnostics do not imply a change to default collapsed disclosure.

Measured browser values (16px root):

| Surface | Before | After |
| --- | --- | --- |
| Composer | 11.2px / 17.36px | unchanged |
| Message paragraphs | 11.36px / 18.744px | 11.2px / 17.36px |
| Lists, Results heading, outer Work history summary | 16px / normal | 11.2px / 17.36px |
| Work-item headings | 14.4px / normal | 11.2px / 17.36px |
| Tool details/summary | 13.6px / normal | 11.2px / 17.36px |
| Message-header metadata | 8.96px | unchanged size |

All 12 body/title/list surfaces match the composer's computed font family, size
and line height in all four language/disclosure states. At a 620px viewport,
both languages have document width 620px and message/list scroll widths equal
to their client widths. Screenshot inspection confirms the large list/heading
jumps are removed, paragraphs remain distinct and code stays readable.

Private reproducible artifacts: `/tmp/pdcr-typography-oct10/prepare.mjs` extracts
production functions/modules into a synthetic fixture; `capture.js` runs through
the existing cached Playwright CLI (no install). `before-computed.json` and
`after-computed.json` retain full computed values, and
`before-{zh,en}-{expanded,collapsed}.png` / corresponding `after-...png` retain
screenshots. `narrow-report.log` records the 620px check. This Chrome/browser
fixture is visual supporting evidence, not a packaged native acceptance run.

Existing production renderer suites pass 38 tests:
`/tmp/pdcr-typography-oct10/frontend-targeted.log`. The existing-dependency build
passes: `/tmp/pdcr-typography-oct10/build.log`. No mirrored CSS unit tests, new
dependencies, business-state changes or installation were introduced. The fixed
candidate returns for independent review; root owns further validation and any
separately authorized installation/closeout.
