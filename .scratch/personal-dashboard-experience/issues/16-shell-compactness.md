# PDEX-16: Compact, legible workspace shell

ID: PDEX-16  
Type: ticket  
Parent: [PDEX-FOLLOWUP-03](../followup-spec-2026-10-11-shell-compactness.md)  
Blocked by: None  
Triage: ready-for-agent  
Status: in-progress  
Lifecycle: in-progress  
Owner: primary implementer (current Codex task)  
Assignee: primary implementer (current Codex task)  
Base: a963eb4  
Working branch: codex/dashboard-experience-integration

## Acceptance criteria

- [x] Tasks and Today schedule buttons show a localized date summary at useful width, including Today/current default date or the selected date and optional time, while preserving accessible naming, one-line layout and existing picker/create/recovery behavior. Final-candidate native Computer Use entered and committed all time segments, then verified `Today · 15:30` and a date/time accessible name after Apply.
- [x] Today daytime aside toggle/count sits beside the Timeline + records heading near the top; existing docked geometry, count, zero-count access, aria/focus and no-write behavior remain intact.
- [x] Global toolbar places the P brand/name at the far left and sidebar toggle after a divider; all destinations remain reachable without overflow at 640px.
- [x] Collaboration displays one destination heading, keeps meaningful session/chat/context headings, shortens pane/card chrome and gives the session list and main conversation comfortable width; long help stays on demand.
- [x] Public production DOM/WebKit layout and native Computer Use smoke verify labels, geometry, focus, sidebar, and toolbar destinations using only synthetic data. Candidate layout, headings, help, and pane frames passed; the independent reviewer also confirmed those shell details in the normal installed App by read-only Computer Use.
- [x] Preserve the existing Collaboration session/composer behavior. No session, composer, or submit logic changed in this visual-only follow-up; focused production-DOM Collaboration interaction suites passed 69/69, and the independent reviewer accepted that evidence alongside the native visual check. The final normal-App read-only pass did not type into the composer or submit a message.
- [x] Build and focused checks pass; fixed-source evidence is sent for independent review. Review, normal installation and direct human acceptance are tracked separately.

## Execution

2026-10-11: directly authorized by user message `01a129e5-6777-7d90-b3a5-faa0d4a3483c` in review chat `01a128ff-8865-7493-9698-cc48c19d7939`. Source archaeology was sent to the reviewer; the reviewer confirmed the bounded chrome work is distinct from PDEX-09's already-completed heading/help criteria and requested computed visibility plus preservation of functional subheadings/resizer/context controls. Root implementer claimed this ticket on the existing integration branch. Do not replace the normal App before independent review release; the previously authorized post-review installation path remains available with fresh protection. No subagents, GitHub, main, dependency or personal-data action.

## Verification

2026-10-11: source commit 9cafeca passed independent Standards 0 / Spec 0 review. `npm run build` passed; docked-sidebars 18/18 and focused Collaboration suites 69/69 passed. The isolated candidate built from this source exited 0, passed strict ad-hoc signature verification, and launched as the unique shell202610119cafeca bundle. Computer Use virtual-mouse screenshots verified the leftmost P identity/divider/sidebar-toggle order, the Today sidebar control beside Timeline + records, and the single visible Collaboration page heading with collapsed help on the earlier same-source candidate. The final rebuilt candidate showed the same toolbar/Today heading and a one-row Tasks form with Today visibly labeled. A complete native segmented time entry on the exact final candidate showed the selected date/time in the button's accessible name before Apply and `Today · 15:30` plus the date/time name after Apply. The earlier date-only observation is retained as an incomplete native-field commit; see the candidate receipt for both observations. No task was submitted. See [candidate receipt](../evidence/followup-candidate-2026-10-11.json).

The date/time label behavior is verified on the exact candidate after complete native segmented entry. The normal checked-in-config bundle was independently released and installed at `/Applications/Personal Dashboard.app` from source `9cafeca`; its binary matches the released package and passes strict signature verification. The independent reviewer used read-only Computer Use on the normal App to confirm the brand/toggle order, Today toggle placement, visible Today date summary, and reduced Collaboration chrome. Post-startup readback found the Collaboration JSON semantically identical (41 sessions and settings), and `life/` plus `.obsidian/` exactly match their protected copies. The App launch added only runtime logs/cache metadata and temporary process files in the private profile. The final normal-App pass did not type into the composer; the reviewer accepted the existing 69/69 production-DOM Collaboration interaction suite plus source/native visual evidence for this visual-only change. Direct human acceptance remains pending, so PDEX-16 and its parent stay in-progress. See [normal installed readback](../evidence/pdex16-normal-install-readback-2026-10-11.json) and the private install-protection manifest.
