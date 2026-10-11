# PDEX-17: Readable Collaboration layout and shared page-heading hierarchy

ID: PDEX-17  
Type: ticket  
Parent: [PDEX-FOLLOWUP-04](../followup-spec-2026-10-11-collaboration-layout.md)  
Related: PDEX-16 remains in progress; this ticket repairs its reported visual gaps but does not close it.  
Blocked by: None  
Triage: ready-for-agent  
Status: in-progress  
Lifecycle: in-progress  
Owner: primary implementer (current Codex task)  
Assignee: primary implementer (current Codex task)  
Base: 9cafeca  
Working branch: codex/dashboard-experience-integration

## User-reported failure

The installed Collaboration view shows an oversized separate page-title band, weak pane boundaries over a ready background, and a composer pushed below the usable window. Scrolling the information region independently from the outer header makes the activity controls clip at the top boundary. Calendar and Collaboration title styles also differ from Today/Tasks. The Today daytime aside toggle is before its heading instead of at the heading row's right.

The earlier 9cafeca source review, installed read-only check and candidate screenshots remain historical evidence. They do not establish current human visual acceptance. PDEX-16 and its parent remain open.

## Acceptance criteria

- [ ] Collaboration has one clear destination heading, placed in the same normal content/scroll flow as its controls. The page title does not remain as an external band that competes with or clips the Collaboration controls during scrolling.
- [ ] Session history, the conversation, the composer and Current work have legible, visible boundaries on a ready background. Restore comfortable padding and functional pane headings without recreating redundant nested decorative cards or duplicating page titles.
- [ ] At logical sizes 795×720, 874×756, 1280×720 and reference 1280×756, both empty and selected-long-session states show a usable composer in the initial chat region. Long messages scroll inside the message list; scrolling them does not move the composer out of its chat panel. A retained synthetic failure status remains visible and readable.
- [ ] Initial and scrolled states use synthetic background, context and session data in a macOS WKWebView loaded from the production page/CSS and initialized by `initializeCollaborationPanels()`. Regression output covers relevant rectangles, hit testing/clipping, scroll ownership/extents, composer reachability, and computed heading styles. Screenshots stay outside version control in a `.noindex` directory.
- [ ] Calendar, Habits and Collaboration destination headings follow the same computed font family, size and line-height scale as Today/Tasks at each shared viewport. Calendar month rows, narrow summary expansion, and summary ordering stay unchanged.
- [ ] The single Today daytime aside/count control is at the right side of the “Timeline + records” heading row. Zero count remains recoverable; aria/focus, expanded state, and sidebar geometry remain intact. The global brand/navigation toggle and Tasks layout stay unchanged.
- [ ] Existing session selection, context, draft retention, composer, submission, stop, dictation, slash-command and resizer semantics remain unchanged. Existing production Collaboration interaction checks pass; no backend or personal-data writes are introduced.
- [ ] Candidate receives independent Standards and Spec review. Do not install until that review is satisfied and current protection backups are made. Direct human acceptance remains a separate state.

## Execution

2026-10-11: claimed by the primary implementer on `codex/dashboard-experience-integration` after direct user authorization. The initial production-DOM red loop and one-variable diagnosis are recorded in [red evidence](../evidence/pdex17-layout-red-2026-10-11.md). Do not replace the installed normal App while implementing or reviewing this repair.

## Verification

Pending implementation, regression, independent review and isolated synthetic native Computer Use review.

