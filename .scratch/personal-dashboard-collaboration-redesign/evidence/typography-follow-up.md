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
