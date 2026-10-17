# Collaboration layout recovery and page-heading consistency

> Canonical tracker: [PDEX-FOLLOWUP-04 · GitHub #75](https://github.com/absurdwall/personal-dashboard/issues/75). Migrated and verified 2026-10-17. This file retains historical supporting evidence; GitHub owns current state.


ID: PDEX-FOLLOWUP-04  
Type: spec  
Status: resolved
Lifecycle: closed
Triage: ready-for-agent  
Date: 2026-10-11  
Product baseline: 9cafeca  
Working branch: codex/dashboard-experience-integration  
Authorization: direct user request in the current task to implement the reported layout repair, add a bounded local ticket, retain all history, and use Computer Use virtual mouse for native visual checks.

This is a narrow repair follow-up to the 2026-10-11 installed Collaboration shell. It preserves PDEX-09 behavior and all unrelated PDEX tickets. The direct human report supersedes any earlier inference that the Collaboration visuals in the installed 9cafeca App were accepted. PDEX-16 and the parent experience spec stay in progress until their own current acceptance evidence exists.

## PDEX-17 — readable Collaboration layout and shared page-heading hierarchy

- Restore a clear page structure for Collaboration: a compact destination heading and controls belong to the same normal reading/scroll flow; session history, conversation and current work have visible, distinct surfaces and retained functional headings/status. Preserve the accepted reduction in redundant chrome and the existing session, draft, composer, submit, context and resizer behavior.
- At 795×720, 874×756 and 1280×720 logical points, keep the composer reachable in both an empty-session state and a selected long-session state with a retained failure status. Long conversation content must scroll inside the message list without pushing the composer below the initial usable chat region. The context may continue below the conversation and remain reachable by the page scroll; keep scroll ownership visually clear.
- Use synthetic sessions, long synthetic messages/context, a synthetic background image and synthetic retained-failure status. Do not load, copy or commit user profile/Vault/session content or screenshots.
- Align Calendar, Habits and Collaboration destination-title typography with the established Today/Tasks hierarchy at the same viewport sizes. Keep Calendar's accepted compact month geometry and narrow summary expansion behavior unchanged.
- Move the single Today daytime aside/count control to the right side of the “Timeline + records” heading row. Preserve zero-count recovery, accessible name, focus, expanded state and docked sidebar behavior. Do not move the global brand/navigation control or change Tasks.
- Use production HTML/CSS and the production Collaboration panel initializer in a real macOS WKWebView layout regression. Cover initial and scrolled states, 795×720, 874×756, 1280×720 and a 1280×756 reference; measure rects, clipping/overlap, scroll extents, composer reachability, and computed page-title family/size/line-height. Keep screenshot artifacts in a private `.noindex` directory. Use Computer Use virtual mouse on an isolated synthetic candidate for native visual/interaction review.
- Keep implementation, independent review, package installation and direct human acceptance separate. Do not replace the installed normal App until independent review is satisfied and fresh App/profile/Vault protection exists. No backend work, profile writes, messages, new dependencies, GitHub operation, push, or main merge.

## Diagnosis checkpoint

The first red loop uses production HTML/CSS and `collaboration-panels.ts` with synthetic state only. At 874×756, the empty-session composer begins at y=807.9 with a 640px chat pane; the selected long-session composer begins at y=903.0 and the production message list has 4,406px scroll height within a 423px viewport. At scrollTop 80, the activity-date control has only 1.8px inside the information scrollport when the global workspace header remains outside it. The chat pane's computed background is transparent on a ready background image. A one-property surface override changes its computed background without changing geometry.

The 40rem minimum-height existed before the current shell commit, so this record does not attribute the whole off-screen composer behavior to 9cafeca. A single-variable WK check shows that removing it helps the empty state, but has no effect for a selected long conversation. The repair must fit the conversation and its independently scrolling message list to the available workspace while keeping the composer reachable.

WK computed typography at 874×756 is 34.96px Georgia for Today, Tasks and Habits, 20px Georgia for Calendar, and 26px system sans for the Collaboration global title. The accepted reference is the established Today/Tasks heading hierarchy.

## Local records

- [PDEX-17 ticket](issues/17-collaboration-layout-recovery.md)
- [Synthetic red evidence](evidence/pdex17-layout-red-2026-10-11.md)



## Human acceptance closeout — 2026-10-11

The installed experience checkpoint `d518332` was accepted by the user on 2026-10-11. This closes the current follow-up delivery with the qualifications in [the human closeout record](evidence/human-closeout-followups-2026-10-11.md). Unchecked historical criteria and earlier failure/evidence records remain unchanged; no unverified checklist item is represented as passed.
