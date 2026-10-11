# 13: Today 未定位条目栏自动收起与手动抽屉

**ID:** PDEX-13
**Type:** ticket
**Parent:** [PDEX-FOLLOWUP-01](../followup-spec-2026-10-11.md)
**Blocked by:** None
**Triage:** ready-for-agent
**Status:** in-progress
**Lifecycle:** in-progress
**Owner:** implementer PDEX-13
**Assignee:** implementer PDEX-13
**Implementation:** authorized and locally claimed; acceptance pending
**What to build:** Free the Today axis at medium narrow widths while keeping unlocated content discoverable through a scoped toggle/drawer.

## Acceptance criteria

- [ ] Explicit toolbar show/hide control, visible count and truthful expanded state; original source/content retained.
- [ ] Wide auto shows panel; medium/narrow auto collapses it before left navigation, visibly increasing axis/records width.
- [ ] Narrow manual show uses drawer/overlay without shrinking axis; close/Escape restores trigger focus and all content is readable.
- [ ] Transient manual override/responsive rules are documented/simple; resize/navigation creates no business write and preserves timeline save/selection.
- [ ] Actual wide/medium narrow geometry, count/contents/focus/resize checks use production UI; no Calendar, left-navigation or global layout change.
- [ ] Frozen isolated package evidence and independent review retained before installation; final human acceptance pending.


## Verification

Use the approved Q4 public seams: actual production WebKit input/geometry and existing real create/revision/readback/persistence boundaries with synthetic data. Confirm implementation and automated/native evidence separately from review, normal installation and final human acceptance. Keep current logs/immutable candidate identity.

## Execution

2026-10-11: Direct human authorized implementation, independent review/repair, then reviewed normal App replacement followed by human acceptance. Initial base d4f23999e6b82fcadc4533b04004da1113ee8f71 is clean. Claim is recorded locally; no GitHub operation.
