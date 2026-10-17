# Collaboration typography follow-up — reviewed, installed and accepted

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

## Fixed candidate checks

Source candidate `499cdc1e33763f4b8f70a466f9d9e71860f92a14` integrates
implementer `e8b925d`; merge trees match, diff check passes and the canonical
checkout is clean. Root inspected Chinese/English before and after screenshots.
Full frontend388 pass,0 fail/skipped/cancelled:
`/tmp/pdcr-typography-oct10/frontend-full.log`. Native build includes its
successful `npm run build`: `build-mac.log`. Signed arm64 bundle passes
`codesign --verify --deep --strict`; the binary contains the full source SHA,
version4.0.7, binary SHA256
`4bd57de7e16c9bdeed3b92ab75e485664a0c7bbd86c30070c9c397bae766618a`.

Relocated packaged-launch check passes with isolated temporary profile, no
baseline, no listening TCP socket or Python runtime: `packaged-launch.log`.
This proves launch only, not the deferred business/model/voice/live gates.
Rust/reader product sources and tests are unchanged from `ac65cfa`; their prior
495 Rust passes/six explicit environment skips and7 reader passes remain
applicable. No duplicate full Rust suite was run for this stylesheet change.

## Independent review and actual installation

At `499cdc1`, independent Standards found0 documented breaches/0 smells and
Spec found0 actionable findings. The reviewer inspected before/after Chinese
and English screenshots, checked fixture CSS bytes against the candidate,48
computed surfaces in4 language/disclosure states, overflow values and actual
renderer/build logs. Source review remains separate from native/live gates.

Root installed `/Applications/Personal Dashboard.app`, version4.0.7, source
`499cdc1`, executable SHA256
`4bd57de7e16c9bdeed3b92ab75e485664a0c7bbd86c30070c9c397bae766618a`.
Old installed App was normally quit before replacement. Its signed bundle,
the retained signed candidate and328 MiB profile backup were archived privately
under `/Users/tingranwang/.codex/app-archives.noindex/personal-dashboard/2026-10-10-typography-wa4xnaqn/`.
`installation-receipt.json` verifies every regular profile file in the backup,
unchanged profile during replacement, matching installed/build bundle files,
signature and embedded full source revision. Private hashes/contents are not
committed here.

Normal launch produced exact installed PID91673. Only
`collaboration/collaboration-v1.json` changed byte hash; parsed JSON leaf
comparison showed0 logical differences, consistent with reserialization.
No profile files were added/removed; all other profile file hashes matched.
No claim of byte-unchanged history or a new business/live acceptance is made.
Spotlight finds only the canonical installation; Launch Services has one existing
canonical bundle and zero existing noncanonical copies. Stale records refer to
already absent temporary launch-check paths; no global database reset was done.

The independent reviewer then read exact-PID native UI: original selected Vault,
Oct10 session and saved baseline displayed without a load error. The same-screen
output, Results, collapsed Work history and enabled composer show consistent
typography. Only navigation/scrolling was performed, with no Send/model/business
operation. This is presentation/native installation verification, not a substitute
for [deferred follow-ups](../deferred-follow-ups.md).

The user's explicit acceptance closes this iteration's parent spec with named
scope deferral; PDCR-03/11 stay blocked and12 open as follow-ups, with unmet
checkboxes unchanged. [Remote handoff](../remote-handoff.md) retains branches,
revisions, prepared PR text, future publication steps and conservative rollback.

## Final cleanup and management boundary

The sole implementer's fixture browser session and HTTP service were stopped by
their exact owner/session; no listener or owned browser remains. Eight synthetic
before/after screenshots, computed reports, fixture scripts and check logs were
also copied from `/tmp/pdcr-typography-oct10` into the retained private installation
archive's `typography-evidence/` directory. Thus temporary-directory expiry does
not remove the review evidence. The installation receipt links that archive.

The managed worktree was inventoried clean (only reproducible ignored dist), its
tip `e8b925d` verified reachable from integration, and the app confirmed it as
`archived_worktree`. Only the canonical checkout remains; the owned merged
typography branch was removed normally. Existing main/spec/integration and
unrelated branches were preserved. All durable authorized project files are
committed; no tracked or untracked dirty files remain. Prototype hash is unchanged.

After actual parent closeout, installed Management helper1.0.3 discover confirms
the bound canonical `product-personal-dashboard`. The redesign's local tracker
source is not registered and remains an explicit pending Management connection;
no Registry write, identity inference or GitHub fetch was performed. Private
receipt: `management-discover-closeout.json` in the retained evidence archive.
This pending connection is separate from the user-accepted local delivery.
