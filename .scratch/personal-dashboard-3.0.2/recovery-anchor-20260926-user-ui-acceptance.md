# Recovery Anchor — 2026-09-26 UI Acceptance Gaps

## Current truth

The prior completion claim is retracted. Personal Dashboard 3.0.2 is installed at `/Applications/Personal Dashboard.app`, but the user's real-app UI acceptance is not complete. Finder-scoped search was verified after a targeted LaunchServices repair; global Spotlight overlay search/launch remains unverified. No claim of no-blocker delivery is valid until the user confirms the global Spotlight check.

## User-reported UI failures to reproduce

1. Today, Tasks, and Habits do not follow Calendar's page structure. Repeated labels and nested containers remain: Habits (`习惯…频次…`, `习惯本周来源快照`, `本周习惯`), Tasks (`任务·独立正本`, `任务`, `任务独立清单`), Today (`今天`, `Daily Record`, `今天/当日进展`). Preserve required meaning and controls while removing repeated decorative headings and nested frames.
2. The upper-left/page header area remains cramped compared with Calendar; increase its breathing room based on direct comparison with the installed app.
3. Today has a `时间未明确的内容` panel near the right/timeline that obscures other content. Reproduce on a synthetic Vault, add a meaningful regression check, and fix the actual layout/stacking cause.

## Scope and preservation

- Reopen the original owning ticket for the shared page frame (expected Ticket 04) and associate any other original tickets only when repository evidence supports it. Keep ticket state open until the actual acceptance passes.
- Use the installed 3.0.2 app to capture current-state screenshots for all four pages at the same sizes and to reproduce the Today overlap. Use synthetic data only.
- Make the smallest code changes that address the three reported failures. Preserve the existing search-entry repair and report the CUA global-Spotlight limitation honestly.
- Validate a formal packaged app at 960×720, 800×640, and 640×520 for Today, Tasks, Calendar, and Habits; also cover the Today overlap, scrolling, interactions, long task titles, and task actions. Inspect each screenshot and compare the pages directly with Calendar.
- After acceptance: review, scope the code commit, push/create or update a PR, merge, and install the authorized fixed version while preserving old app recovery copies and real Application Support/Vault data. State version and executable hash accurately.
- Do not modify external skill contracts, unrelated `CONTEXT.md`, or the Codex collaboration plan. Do not start an unrelated ticket.

## Work state at anchor

No product code changes have been made for these newly reported UI failures in this round. The previously confirmed Finder search repair and Management summary remain evidence only for their stated scope; neither substitutes for this UI acceptance.
