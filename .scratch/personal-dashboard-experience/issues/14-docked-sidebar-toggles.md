# PDEX-14: Docked sidebar toggles

ID: PDEX-14
Type: ticket
Parent: [PDEX-FOLLOWUP-02](../sidebar-schedule-spec-2026-10-11.md)
Blocked by: None
Triage: ready-for-agent
Status: in-progress
Lifecycle: in-progress
Owner: sidebar implementer
Assignee: sidebar implementer
Implementation: implemented, independently reviewed and installed; direct human acceptance pending
Base: fc4c8185a9b7e029a945662754a2131b21bfb3d8

## Acceptance criteria

- [x] Today icon/count toggles whole existing .today-side-region at every supported width, reachable with zero untimed items; original Tasks/short records/details stay retained in dock; no drawer/modal sidebar.
- [x] Primary navigation collapse releases main width; restore stays side docked, trigger reachable across all five destinations.
- [x] Only existing Calendar summary receives accessible collapse/restore; narrow normal-flow summary and month business unchanged.
- [x] Preserve original content/details/reading position/drafts; truthful aria/tooltips/focus; no toggle/resize/navigation business write.
- [x] Actual production geometry640/830/1000/1280 and keyboard/destination behavior evidence retained.
- [x] Independent review, frozen package and reviewed installation before separate human acceptance.

## Execution

2026-10-11: direct human 01a129b1-8fa7-7033-a532-52fc86d1056b corrects/extends requirements. Use complete addendum and previously approved Q4 TDD seams. Claim local; no remote operation.

## Current source checkpoint

2026-10-11: product71059a3 independently reviewed Standards0/Spec0. [Review and source-qualified evidence](../evidence/sidebar-schedule-review-2026-10-11.md). Lifecycle remainsin-progress; new frozen package/native/normal install and direct human acceptance separate.

## Current installed checkpoint

Reviewed71059a3 normal installed, fresh currentdata preserved; [final package/verification/protection](../evidence/sidebar-schedule-local-install-2026-10-11.md). Checked criteria represent implementation/verification only.

- [ ] Direct human acceptance in installed normal App.
