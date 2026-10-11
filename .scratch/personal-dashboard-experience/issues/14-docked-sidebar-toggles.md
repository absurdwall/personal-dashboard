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
Implementation: authorized and locally claimed; acceptance pending
Base: fc4c8185a9b7e029a945662754a2131b21bfb3d8

## Acceptance criteria

- [ ] Today icon/count toggles original docked sidebar at every supported width; no drawer/modal sidebar.
- [ ] Primary navigation collapse releases main width; restore stays side docked, trigger reachable across all five destinations.
- [ ] Only existing Calendar summary receives accessible collapse/restore; narrow normal-flow summary and month business unchanged.
- [ ] Preserve original content/details/reading position/drafts; truthful aria/tooltips/focus; no toggle/resize/navigation business write.
- [ ] Actual production geometry640/830/1000/1280 and keyboard/destination behavior evidence retained.
- [ ] Independent review, frozen package and reviewed installation before separate human acceptance.

## Execution

2026-10-11: direct human 01a129b1-8fa7-7033-a532-52fc86d1056b corrects/extends requirements. Use complete addendum and previously approved Q4 TDD seams. Claim local; no remote operation.
