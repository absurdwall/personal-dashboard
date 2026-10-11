# PDEX-18: Visible shell controls and Collaboration recovery

ID: PDEX-18  
Type: ticket  
Parent: [PDEX-FOLLOWUP-05](../followup-spec-2026-10-11-dashboard-shell-repair.md)  
Related: PDEX-14, PDEX-15, PDEX-16 and PDEX-17 retain their own source, review and installation checkpoints. This ticket records the latest direct human corrections without rewriting them.  
Blocked by: None  
Triage: ready-for-agent  
Status: in-progress  
Lifecycle: in-progress  
Owner: primary implementer (current Codex task)  
Assignee: primary implementer (current Codex task)  
Base: 3c19010  
Working branch: codex/dashboard-experience-integration

## User-reported failures

The compact Task schedule control remains too small to identify its date at a glance. Today has an unnecessary visible zero beside its aside control. Calendar's existing toggle drops below the month in narrow windows. The product mark and global sidebar toggle do not read as one ordered toolbar group. Collaboration still has inconsistent page spacing and frame treatment, Sessions is too close to its edge, and the user reports difficulty clicking its message area and controls. The user accepts the existing wide Habits view and asks that it remain unchanged.

## Acceptance criteria

- [x] Tasks and Today quick-add rows show a readable localized Today/selected date and optional time in the existing schedule button, remain one row, retain picker and save-recovery behavior, and allow the name field to yield space.
- [x] The one Today right-sidebar toggle sits at the right side of the Timeline + records heading; the zero is not visibly rendered, and zero-item recovery/accessibility and docked sidebar geometry remain intact.
- [x] The Calendar summary toggle remains to the right at narrow supported sizes, while dates, previews, selection and summary stay usable.
- [x] The global toolbar presents the P mark/name first, then a divider and navigation toggle, without overlap at 640px; all destinations still open and sidebar collapse/restore works.
- [x] Collaboration shares the established page frame spacing and heading hierarchy, has a modest Sessions inset, avoids redundant frame/card chrome, and preserves meaningful pane headings and controls.
- [x] Production WebKit measurements prove pointer hit targets, focus, and scroll ownership for enabled Collaboration session/composer controls using synthetic state; no model turn or personal data write occurs.
- [x] Existing PDEX-14/15/16/17 semantics remain unchanged. Habits stays unchanged. Focused frontend checks and `npm run build` pass.
- [x] Independent Standards and Spec review completed; fresh App/profile/Vault protection copies were verified before replacing the normal App for inspection.
- [ ] Direct human acceptance of the installed normal App remains pending.

## Execution

2026-10-11: claimed and implemented on `codex/dashboard-experience-integration` at base `3c19010` under direct user messages recorded in [PDEX-FOLLOWUP-05](../followup-spec-2026-10-11-dashboard-shell-repair.md). Production WebKit suites and `npm run build` pass. An isolated signed macOS candidate was inspected with Computer Use virtual input and synthetic profile/Vault; no Chrome page, model turn or personal Vault write occurred. See [candidate evidence](../evidence/pdex18-native-candidate-2026-10-11.md). PDEX-14/15/16/17 history is unchanged.

## Verification

Implementation, focused verification, independent review and protected normal-App installation are complete. The installed App is open on Collaboration for direct inspection; human acceptance remains pending. The isolated candidate had no ChatGPT connection, so its composer stayed disabled; in the installed normal App, no session is selected for the current date, so its composer is also disabled. Enabled composer hit/focus behavior is covered by synthetic production-WebKit tests. The Sogou native-input probe did not produce Chinese composition and is recorded as an environment/tool limitation in [installation evidence](../evidence/pdex18-normal-install-2026-10-11.md).
