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
- [x] Final corrected-source Standards and Spec review and fresh protected normal installation are confirmed together.
- [ ] Direct human acceptance of the installed normal App remains pending.

## Execution

2026-10-11: claimed and implemented on `codex/dashboard-experience-integration` at base `3c19010` under direct user messages recorded in [PDEX-FOLLOWUP-05](../followup-spec-2026-10-11-dashboard-shell-repair.md). Production WebKit suites and `npm run build` pass. An isolated signed macOS candidate was inspected with Computer Use virtual input and synthetic profile/Vault; no Chrome page, model turn or personal Vault write occurred. See [candidate evidence](../evidence/pdex18-native-candidate-2026-10-11.md). PDEX-14/15/16/17 history is unchanged.

## Verification

The preceding installation evidence is historical for `dc12b10`: its empty/current-date composer was disabled. It does not satisfy the latest human input correction. The corrected implementation `7cee9d8`, including merged `e1cae53` and retained schedule-control polish, enables local empty-session text editing, preserves explicit creation/send and scoped drafts, binds retries to the same session identity, and obtains the default date from the application lived-day clock. Sending and starting dictation retain their connection requirements.

Independent review found and repaired whole-month clipping, unknown-result duplicate creation, the pending-clock midnight fallback, and missing bilingual creation diagnostics. The corrected Calendar tests include an initially selected day with a populated task panel, long independently scrolling summary, truthful preview overflow, resize/navigation/language changes, and minimum-window reachability. Supporting checks include the merged frontend checks, four voice-controller tests, three persisted creation-identity Rust tests, and the final 90-case focused run. Final corrected-source review and native package/installation checks are pending at this checkpoint; direct human acceptance remains pending. Earlier IME/quota waivers remain accepted and are not reopened.


## Current final installation checkpoint — 2026-10-11

The latest production source `d4e2b54` is independently reviewed with zero remaining Standards/Spec findings and freshly protected/installed with normal configuration. Actual populated-session inspection additionally found and repaired the `eb0f497` composer clipping, then verified the corrected synthetic and normal App surfaces. [Final source/package/native/preservation evidence](../evidence/pdex18-final-review-install-2026-10-11.md) retains all qualifications. Existing content and authority readback pass; no model turn or microphone was requested. This supersedes earlier pending-final-review/install statements, without discarding historical evidence. Direct human acceptance remains pending; ticket and parent stay in-progress.
