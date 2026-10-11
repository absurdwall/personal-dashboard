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
**Implementation:** implemented, independently reviewed, installed; human acceptance pending
**What to build:** Free the Today axis at medium narrow widths while keeping unlocated content discoverable through a scoped toggle/drawer.

## Acceptance criteria

- [x] Explicit toolbar show/hide control, visible count and truthful expanded state; original source/content retained.
- [x] Wide auto shows panel; medium/narrow auto collapses it before left navigation, visibly increasing axis/records width.
- [x] Narrow manual show uses drawer/overlay without shrinking axis; close/Escape restores trigger focus and all content is readable.
- [x] Transient manual override/responsive rules are documented/simple; resize/navigation creates no business write and preserves timeline save/selection.
- [x] Actual wide/medium narrow geometry, count/contents/focus/resize checks use production UI; no Calendar, left-navigation or global layout change.
- [x] Frozen isolated package evidence and independent review retained before installation; final human acceptance pending.


## Verification

Use the approved Q4 public seams: actual production WebKit input/geometry and existing real create/revision/readback/persistence boundaries with synthetic data. Confirm implementation and automated/native evidence separately from review, normal installation and final human acceptance. Keep current logs/immutable candidate identity.

## Execution

2026-10-11: Direct human authorized implementation, independent review/repair, then reviewed normal App replacement followed by human acceptance. Initial base d4f23999e6b82fcadc4533b04004da1113ee8f71 is clean. Claim is recorded locally; no GitHub operation.


2026-10-11 implementation checkpoint: feature9850b9b, current integration0414a23 merged unsquashed in worker69dc6f1. Scoped1100px automatic collapse, count/toggle, retained-content drawer and focus return implemented; same-selection transient override/reset rules documented. Isolated build passed,42 focused Today/axis and441 full frontend regressions passed;16 public-input browser gesture regressions passed. Actual WebKit client geometry1000/960/830 retains vertical navigation and unchanged axis width on manual drawer expansion. See [PDEX-13 evidence](../evidence/pdex-13.md) and [artifact hashes](../evidence/pdex-13-artifacts.json). Native packaged review, normal replacement and human acceptance remain pending; lifecycle remainsin-progress. Historical completed tickets unchanged.

## Current reviewed installation checkpoint — 2026-10-11

Final product source `2c6b8aa`, normal installed executable `ade6a1c…`, Standards/Spec zero unresolved and explicit installation release. Production/native evidence and fresh data protection are retained in [installation record](../evidence/followup-local-install-2026-10-11.md). Checked criteria denote implementation/verification; lifecycle remains in-progress.

- [ ] Direct human acceptance of this follow-up in the installed normal App.

## Later human requirement correction

PDEX-FOLLOWUP-02/14/15 explicitly supersede prior drawer/sidebar target and add compact lived-day schedule creation. Prior checks/install remainhistorical and do not imply newtarget acceptance; see [current installed requirements](../sidebar-schedule-spec-2026-10-11.md). Original ticket remains humanacceptance pending.
