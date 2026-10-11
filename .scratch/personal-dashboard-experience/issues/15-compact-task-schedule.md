# PDEX-15: Compact Task schedule row

ID: PDEX-15
Type: ticket
Parent: [PDEX-FOLLOWUP-02](../sidebar-schedule-spec-2026-10-11.md)
Blocked by: None
Triage: ready-for-agent
Status: in-progress
Lifecycle: in-progress
Owner: schedule implementer
Assignee: schedule implementer
Implementation: implemented, independently reviewed and installed; direct human acceptance pending
Base: fc4c8185a9b7e029a945662754a2131b21bfb3d8

## Acceptance criteria

- [x] Tasks quick add and Today Tasks entry each one row: name, compact schedule control, Add; no permanent large multi-field form.
- [x] Picker supports today/tomorrow/date/optional time; Both default to their day per direct user reply 01a129b4-587d-7891-afd5-2bd86c98056c: Tasks current local lived day, Today selected lived day; no inferred time, explicit clear/change allowed.
- [x] Confirmed create clears/focuses continuous entry; composition/blank/pending no accidental submission.
- [x] Original payload/rawdraft/id/revision/binding retained on failure/unknown, existing readback/retry/end behavior and modal/details remain available.
- [x] Date/time public-command behavior plus real synthetic native persisted readback; picker keyboard/cancel/focus and actual compact geometry retained.
- [x] Independent review, fresh frozen package and reviewed installation before separate human acceptance.

## Execution

2026-10-11: direct human 01a129b1-8fa7-7033-a532-52fc86d1056b corrects/extends requirements. Use complete addendum and previously approved Q4 TDD seams. Claim local; no remote operation.

## Current source checkpoint

2026-10-11: product71059a3 independently reviewed Standards0/Spec0. [Review and source-qualified evidence](../evidence/sidebar-schedule-review-2026-10-11.md). Lifecycle remainsin-progress; new frozen package/native/normal install and direct human acceptance separate.

## Current installed checkpoint

Reviewed71059a3 normal installed, fresh currentdata preserved; [final package/verification/protection](../evidence/sidebar-schedule-local-install-2026-10-11.md). Checked criteria represent implementation/verification only.

- [ ] Direct human acceptance in installed normal App.
