# 12: Tasks 顶部快捷创建与就地 New Task 浮窗

> Canonical tracker: [PDEX-12 · GitHub #101](https://github.com/absurdwall/personal-dashboard/issues/101). Migrated and verified 2026-10-17. This file retains historical supporting evidence; GitHub owns current state.


**ID:** PDEX-12
**Type:** ticket
**Parent:** [PDEX-FOLLOWUP-01](../followup-spec-2026-10-11.md)
**Blocked by:** None
**Triage:** ready-for-agent
**Status:** resolved
**Lifecycle:** closed
**Owner:** implementer PDEX-12
**Assignee:** implementer PDEX-12
**Implementation:** implemented; installed checkpoint `d518332` accepted by the user on 2026-10-11 with qualifications in the human closeout record
**What to build:** Restore R's name-only quick input and viewport-local creation modal through the existing real Task creation boundary.

## Acceptance criteria

- [x] Name input is at visible list top; Add/Enter confirms and clears only after authoritative success, with continuous-input focus.
- [x] Only name required; actual-list defaults, aggregate Inbox fallback, Tasks Today lived-date default and no inferred time; optional full fields remain available.
- [x] New Task opens a focused viewport-local modal without scroll-to-bottom; cancel/close/Escape never saves and returns focus.
- [x] Composition Enter/blank/pending double submission do not create; failed/unconfirmed writes preserve exact original draft/id/payload for guarded readback/retry without duplicate creation.
- [x] Existing details/completion/archive/delete and Today selection creation preserve behavior; no new dependency/store/Calendar or navigation changes.
- [x] Production behavior/real synthetic persistence and frozen package evidence retained; independent review before authorized installation; installed human acceptance separately pending.


## Verification

Use the approved Q4 public seams: actual production WebKit input/geometry and existing real create/revision/readback/persistence boundaries with synthetic data. Confirm implementation and automated/native evidence separately from review, normal installation and final human acceptance. Keep current logs/immutable candidate identity.

## Execution

2026-10-11: Direct human authorized implementation, independent review/repair, then reviewed normal App replacement followed by human acceptance. Initial base d4f23999e6b82fcadc4533b04004da1113ee8f71 is clean. Claim is recorded locally; no GitHub operation.

## Current reviewed installation checkpoint — 2026-10-11

Final product source `2c6b8aa`, normal installed executable `ade6a1c…`, Standards/Spec zero unresolved and explicit installation release. Production/native evidence and fresh data protection are retained in [installation record](../evidence/followup-local-install-2026-10-11.md). Checked criteria denote implementation/verification; lifecycle remains in-progress.

- [ ] Direct human acceptance of this follow-up in the installed normal App.

## Later human requirement correction

PDEX-FOLLOWUP-02/14/15 explicitly supersede prior drawer/sidebar target and add compact lived-day schedule creation. Prior checks/install remainhistorical and do not imply newtarget acceptance; see [current installed requirements](../sidebar-schedule-spec-2026-10-11.md). Original ticket remains humanacceptance pending.


## Human acceptance closeout — 2026-10-11

The user accepted the installed experience checkpoint `d518332`. This closes the ticket for the accepted round, with residual feedback recorded in [the closeout record](../evidence/human-closeout-followups-2026-10-11.md). Existing unchecked checklist items and prior failure/evidence history are preserved as written and are not claimed as verified.
