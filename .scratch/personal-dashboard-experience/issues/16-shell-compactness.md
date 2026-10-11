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

- [ ] Tasks and Today schedule buttons show a localized date summary at useful width, including Today/current default date or the selected date and optional time, while preserving accessible naming, one-line layout and existing picker/create/recovery behavior.
- [ ] Today daytime aside toggle/count sits beside the Timeline + records heading near the top; existing docked geometry, count, zero-count access, aria/focus and no-write behavior remain intact.
- [ ] Global toolbar places the P brand/name at the far left and sidebar toggle after a divider; all destinations remain reachable without overflow at 640px.
- [ ] Collaboration displays one destination heading, keeps meaningful session/chat/context headings, shortens pane/card chrome and gives the session list and main conversation comfortable width; long help stays on demand.
- [ ] Public production DOM/WebKit layout and native Computer Use smoke verify labels, geometry, focus, sidebar, toolbar destinations, and preserved Collaboration session/composer interaction using only synthetic data.
- [ ] Build and focused checks pass; fixed-source evidence is sent for independent review. Review, normal installation and direct human acceptance are tracked separately.

## Execution

2026-10-11: directly authorized by the user in the current follow-up conversation. Source archaeology was sent to reviewer `01a128ff-8865-7493-9698-cc48c19d7939`; reviewer confirmed the bounded chrome work is distinct from PDEX-09's already-completed heading/help criteria and requested computed visibility plus preservation of functional subheadings/resizer/context controls. Root implementer claimed this ticket on the existing integration branch. No subagents, GitHub, main, dependency, personal-data, or normal-installation action.

## Verification

Pending implementation and fixed-head review package. Reuse approved production-DOM and WebKit seams; native interaction uses Computer Use virtual mouse and a synthetic profile.
