# Collaboration, toolbar and compact schedule polish

ID: PDEX-FOLLOWUP-03  
Type: spec  
Status: open  
Lifecycle: in-progress  
Triage: ready-for-agent  
Date: 2026-10-11  
Base: a963eb4  
Working branch: codex/dashboard-experience-integration  
Authorization: direct user follow-up in the current implementation conversation, 2026-10-11.

This bounded follow-up preserves all prior accepted and closed records, including PDEX-SPEC-01/PDEX-01–11 and the independent PDEX-FOLLOWUP-01/02 tickets. It creates PDEX-16 for a small visible-shell adjustment grounded in the accepted experience Spec stories 51–52 and implementation decision at line 119, plus the user's direct Task/Today/global-toolbar corrections. It does not reopen PDEX-09 or PDEX-14/15.

## PDEX-16 — compact, legible workspace shell

- Task quick entry in Tasks and Today keeps the existing one-row name, schedule and Add structure. Widen the schedule control enough to show a localized compact date value: the applicable Today/default date when selected, or the chosen date; append the selected time when present. An explicitly undated entry remains legible. Preserve the full localized accessible name/tooltip, current picker behavior, clear/default choices, draft/recovery semantics, and user-authored text. Allow the task-name input to yield width while the row remains one line at supported widths.
- Move the existing Today daytime right-sidebar toggle/count from the lower time-axis toolbar to the top of the normal daytime content, beside the “Timeline + records” heading where it is easy to discover. Preserve one trigger, icon/count, accessible name, expanded state, focus, full docked aside geometry, zero-count reachability and no-write behavior. It must not sit beside Refresh or far down the page.
- Place the Personal Dashboard/P brand at the far left of the global toolbar; put the navigation sidebar toggle after the brand and a visual divider. Keep all five destinations reachable and prevent toolbar/page overflow at the supported 640px narrow width.
- Further lighten Collaboration without redoing PDEX-09: remove only the redundant destination heading inside the page when the visible workspace title already supplies the page heading; preserve headings for sessions, selected conversation, work/context, and all live status. Keep long background/help content disclosed on demand. Reduce nested pane/card borders and excess padding, and allocate more comfortable width to session history and the main conversation. Keep meaningful selected, focus, input, error/recovery, and resizer boundaries. Preserve existing session, context, history, message, draft, queue, stop, dictation and slash-command behavior.

## Verification and release boundary

Use the already-approved public production-DOM and WebKit layout/interaction seams. Focus checks on build, visible schedule labels and one-row geometry, translated aria/title, Today toggle location/focus/full sidebar geometry and no-write behavior, toolbar order/640px overflow/all destinations, and Collaboration session/chat/context and composer interaction smoke. Use Computer Use virtual mouse for native packaged visual/interaction checks with synthetic data. Do not repeat the old full Rust, quota-exhaustion or IME acceptance suites. No new dependency, service, model request, personal-data mutation, GitHub operation, main merge or normal App replacement is in scope. Send the frozen source/diff/build/native evidence to the independent reviewer before any release decision; human acceptance remains separate.
