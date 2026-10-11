# Dashboard shell and Collaboration repair

ID: PDEX-FOLLOWUP-05  
Type: spec  
Status: open  
Lifecycle: in-progress  
Triage: ready-for-agent  
Date: 2026-10-11  
Base: 3c19010  
Working branch: codex/dashboard-experience-integration  
Authorization: direct user messages `01a129e5-6777-7d90-b3a5-faa0d4a3483c`, `01a12a18-f5e8-7000-8624-5cf1a930b1da`, `01a12a40-9e54-79e2-a8e4-c13c31263805` and `01a12a52-28e4-7122-a0c8-1bb5b2bf9a67` in review chat `01a128ff-8865-7493-9698-cc48c19d7939`. The user directly authorized replacing the normal local App for visual inspection; installation remains after independent review and fresh protection copies, with direct human acceptance separate.

This follow-up records current corrections to PDEX-14/15/16/17 without rewriting their implementation and installation history or reopening PDEX-01–11. The user likes the compact Task schedule picker but asked for a wider, readable date value; clarified that Today must show its docked aside toggle at the right side of the “Timeline + records” heading without a visible zero; wants Calendar's summary toggle to stay on the right in narrow windows; and asked to keep the product mark at the far left before the navigation toggle. The user reports that Collaboration's page spacing, pane padding and overall layout remain confusing and that message input is difficult to click. Habits wide-window layout was explicitly accepted and stays out of this scope.

## PDEX-18 — visible shell controls and Collaboration recovery

- Give Tasks and Today quick-add schedule controls enough width to show “Today” or the localized selected date, with an optional selected time. Keep the existing one-row name, schedule and Add structure, localized accessible name, date defaults, clear/change behavior, draft retention and unresolved-save recovery. Let the name field yield space before truncating the date.
- Place the single Today aside toggle beside the right edge of the “Timeline + records” heading, above the timeline. Remove the visible zero count; preserve the same docked aside, its empty-state recovery, expanded state, keyboard focus and accessible explanation. Do not add a second control or move it beside Refresh.
- Keep Calendar's existing summary/side pane and toggle on the right at narrow supported window sizes. The month view may give up width, but dates, previews, selection and the full summary remain usable; do not move the toggle below the month.
- Keep the Personal Dashboard mark/name at the far left of the global toolbar and put the sidebar toggle immediately after it and a divider. Keep all five destinations reachable and prevent overlap or overflow at 640px.
- Align Collaboration's top and side spacing, page-heading scale and main-frame boundary with the established Today/Tasks page frame and Calendar's shared hierarchy. Reduce redundant card borders and excess chrome while preserving a small comfortable inset around Sessions, the conversation, composer and Current work. Keep useful session/chat/context headings, the selected state, focus boundaries, status, error/recovery, resizers and independent scroll ownership.
- Verify that visible Collaboration session, composer and control targets receive pointer hits and keyboard focus when enabled. Use synthetic session/message data and a synthetic isolated profile/Vault; do not send a model turn or write personal data. The user specifically asked to test the native Dashboard rather than opening repeated Chrome/prototype pages.
- Keep Habits unchanged. Preserve the business behavior of the previous PDEX-14/15/16/17 implementations. No backend, dependency, service, GitHub, remote, push or main change.

## Verification and release boundary

Use focused production-DOM macOS WebKit layout and hit-test checks for shared header spacing, toolbar order/overflow, schedule-label width, Today and Calendar toggle position, narrow Calendar month/summary usability, and Collaboration visible bounds/focus/scroll. Use Computer Use's virtual mouse on an isolated candidate with synthetic data for native interaction checks; keep artifacts in a private `.noindex` directory and do not open Chrome for this work. Do not repeat unrelated full Rust, quota or IME suites. Send a fixed source commit for independent Standards and Spec review. After review, make fresh App/profile/Vault protection copies before replacing the normal local App for the user's visual inspection. Keep direct human acceptance as a separate state.

## Local record

- [PDEX-18 ticket](issues/18-dashboard-shell-and-collaboration-repair.md)
- Prior checkpoint: [PDEX-17 regression evidence](evidence/pdex17-layout-red-2026-10-11.md)
