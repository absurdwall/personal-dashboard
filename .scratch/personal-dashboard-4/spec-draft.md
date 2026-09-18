# Personal Dashboard 4.0 — 独立任务与日历日常闭环

Status: superseded
Stage: 历史草稿；已由用户确认测试边界后的 [正式规格](spec.md) 替代，后续实施依据以正式规格为准
Date: 2026-09-17

## Problem Statement

现有任务属于单个 lived day，缺少未安排、未来安排、清单归类、归档及跨日稳定身份。用户需要在已有 Dashboard 中管理个人行动，从 Today 执行，从 Calendar 回看，并让早晚流程使用同一份状态，避免手动复制和重复维护。现有 Habit 名称不会随界面语言切换。

## Solution

保留现有 Mac 产品壳层及 Today、Calendar、Habits，增加独立 Tasks。任务保存一份，三入口共享；支持可选日期／时刻、单层清单、完成／放弃与历史。Calendar 月格显示 Review 状态与任务摘要，选日看完整信息。外部日常流程读取 Dashboard 和滴答，按已确认权限更新 Dashboard；习惯名称增加双语映射。创建习惯与修改目标留到 4.1。

## User Stories

1. As a user, I want the existing navigation and visual style preserved, so that adding Tasks does not require relearning the app.
2. As a user, I want an independent Tasks destination, so that all my personal actions have a stable home.
3. As a user, I want a required name and optional content, so that quick capture stays simple.
4. As a user, I want no date, a date only, or a date with time, so that unscheduled actions are valid.
5. As a user, I want one task date rather than separate start and deadline fields, so that scheduling stays lightweight.
6. As a user, I want named single-level lists, so that I can organize related actions.
7. As a user, I want an Inbox as default membership, so that every task has a predictable home.
8. As a user, I want Today within Tasks to aggregate by date across lists, so that it does not become a competing list.
9. As a user, I want creation inside a list to default to that list, so that I do not repeatedly assign it.
10. As a user, I want creation from Today to default to today and Inbox, so that it appears where I started.
11. As a user, I want to edit content, list and date without changing identity, so that changes do not duplicate an action.
12. As a user, I want to complete and reopen a task, so that accidental completion is recoverable.
13. As a user, I want to abandon and restore a task, so that deciding not to act is distinct from completion.
14. As a user, I want recoverable deletion, so that unwanted tasks can be removed without being recreated by old plans.
15. As a user, I want overdue tasks visible without automatic date changes, so that I retain scheduling control.
16. As a user, I want unconfirmed completion treated honestly, so that an unchecked box is not an accusation of failure.
17. As a user, I want completed and abandoned history available, so that prior decisions remain understandable.
18. As a user, I want to archive and restore a list, so that dormant work leaves everyday views without being erased.
19. As a user, I want unfinished archived tasks to retain their state, so that archiving never fabricates completion or abandonment.
20. As a user, I want archived tasks visible in historical Calendar, so that past months remain meaningful.
21. As a user, I want Tasks, Today and Calendar to update together, so that I maintain one action only once.
22. As a user, I want late completion to preserve task date, so that calendar placement changes only through explicit rescheduling.
23. As a user, I want actual completion date and correction time distinguished, so that retrospective reports remain truthful.
24. As a user, I want Review status and short task titles in month cells, so that I can scan a month before opening a day.
25. As a user, I want +N to reveal the full date list, so that dense days do not expand every month cell.
26. As a user, I want a selected-date side panel with full task information and Daily Record access, so that task management and life history remain connected.
27. As a user, I want narrow windows to retain some task text, so that the calendar does not turn into unexplained dots.
28. As a user, I want future tasks without a Daily Record, so that planning does not invent a lived day.
29. As a user, I want reading blank dates to create no records, so that browsing stays non-destructive.
30. As a user, I want changes to survive restart and Vault switching, so that the module is dependable.
31. As a user, I want conflicts and failed saves reported with recoverable edits, so that external changes are not silently overwritten.
32. As a daily planner, I want both task sources read with clear provenance, so that existing Dida work is not forgotten.
33. As a daily planner, I want new explicit actions written to Dashboard, so that I do not copy the plan manually.
34. As a user, I want optional suggestions excluded from task creation, so that ideas do not become obligations.
35. As a user, I want proposed rescheduling to wait for my agreement, so that Agent optimization does not override my dates.
36. As a user, I want explicit conversational completion, abandonment or rescheduling applied to an unambiguous task, so that I do not perform a second manual update.
37. As a user, I want repeat planning to preserve edits and terminal states, so that repeated runs neither duplicate nor revive tasks.
38. As a user, I want partial source access called out, so that an incomplete planning run is not presented as fully grounded.
39. As a reviewer of my day, I want completion evidence selected by actual completion date, so that late completions appear in the correct review.
40. As a bilingual user, I want a Habit display name appropriate to the interface language, so that a fixed habit can be understood in either language.
41. As a user, I want missing translations to fall back to the existing name, so that no habit becomes blank or disappears.
42. As a user, I want Habit identity and history preserved across language changes, so that translations do not create duplicate habits.
43. As a user, I want my diary and task content left unchanged by language switching, so that personal writing is not rewritten.

## Implementation Decisions

### Product and view model

- Keep the existing toolbar, sidebar, Today phase views and compact Habits. Add Tasks between Today and Calendar. The accepted prototype is an incremental layout reference; its simplified Habits, debug descriptions and redundant headings do not override established production behavior.
- A Task has stable identity, name, optional content, optional date and time, list membership, source reference, state and attributable change history. One date field; a time requires a date. Clearing the date also clears its time.
- A Task list is single-level; support create, rename, archive and restore. Inbox is a permanent default list; Today is a derived view and cannot be a membership target. Inbox may contain dated or undated tasks.
- Ordinary list creation defaults to that list and no date. Tasks Today and current Today default to current lived date and Inbox. A selected historical/future day defaults to the selected date and Inbox. Global/Inbox defaults to Inbox with no date. Users can change these values before saving.
- Provide All, Today, Inbox, user lists and archived access with pending/completed/abandoned filters. Undated tasks remain discoverable in their owning lists and All; they are not all forced into Inbox. Show overdue pending tasks separately in Today, without moving their dates. Counts must match their displayed filter scope.
- Pending means unconfirmed, completed requires explicit evidence, abandoned means an explicit decision not to pursue. Complete/reopen and abandon/restore preserve history. Deletion hides the task but retains recoverable state and producer protection; no permanent purge UI is required.
- Archiving a list excludes its tasks from everyday pending/overdue views but not historical lookup. It does not batch change task states. Restoring a task alone does not restore its list; restoring the list re-enables ordinary visibility according to task states.

### Dates, history and Calendar

- Calendar placement is Task date. Completing a September 17 task on September 19 leaves it on September 17; the actual completion date is September 19. Manual/explicitly authorized rescheduling changes placement and records the before/after date without leaving duplicate active tasks behind.
- Separate actual completion time/date from the time of recording or correction. A normal checkbox uses the current time; a report such as “yesterday” records known date precision without inventing a minute. Provide a bounded completion-date correction in task details using existing historical-correction patterns.
- Use a consistent lived-date/timezone context across views and external flow. Date-only tasks become overdue after their date; timed tasks after their specified time. Preserve date-only semantics rather than silently shifting dates through UTC conversion.
- Month cells keep the existing Daily Record availability semantics. Show about two task title previews with ellipsis and +N overflow; narrower cells may show one preview but not only dots. Completion and abandonment must be visually distinguishable.
- Clicking +N or selecting a date selects that date and shows its complete task list in the existing right panel. No separate overflow popup is required. The panel uses the shared task identity and editing operation, remains keyboard accessible, and retains access to existing Daily Record views.
- Undated tasks have no Calendar placement. Future tasks need no Daily Record and may be edited; no automatic completion inference. Normal completion means completion now, even if a task was planned for a future date; this does not create future completion evidence. Explicit correction to a future completion date is rejected.
- Browsing a month or empty date is read-only. A task mutation creates only task data, never an empty journal or automatic Review. Review status is not itself a task.

### Storage and application boundary

- Keep Tauri/Rust application operations with TypeScript presentation. Reuse the existing application, selected-Vault, clock and protected file-write boundaries; introduce a cohesive Task module rather than duplicating independent task stores per page.
- Task/list state is versioned canonical Vault data, not a derived snapshot or app-cache-only state. A read returns target binding and revision; writes validate both and reject stale/conflicting targets. Late results cannot cross Vault or date selections.
- Task moves, state changes and list archive operations must not leave half-applied identities or memberships after a failed save. Define a recoverable atomic persistence unit and error behavior before implementing cross-file changes. Unknown versions/damaged records fail explicitly, never as empty state to overwrite.
- Old per-day task files remain preserved. No bulk migration project is required by the user's current usage; if legacy records are encountered, keep a labeled legacy reading path and do not silently convert lived dates to deadlines or overwrite old files. Do not keep the old producer creating a competing active task list after 4.0 cutover.
- Reuse existing filesystem preservation/recovery machinery, retaining its stated limitations. Local-save success is not cloud-upload evidence. No new services, dependencies or cloud protocol.

### Real daily-flow integration

- Implement the external daily-flow adapter as part of 4.0, not merely a mock. The application does not start an Agent when rendering a screen. Provide a bounded read/write interface usable by the existing external flow even when the app is closed; it uses the same validation and persistence operations as the UI.
- Morning reads relevant Dashboard dated/overdue tasks and relevant undated candidates plus existing Dida context. Evening reads actual completed actions for the lived day, including completion-date corrections, and records source coverage. Archived pending tasks are not reintroduced as daily obligations.
- New explicitly arranged actions are created in Dashboard with stable source identity and deterministic repeat handling. Options remain suggestions. Existing Dida tasks are source-marked references, not silently mirrored, fuzzily merged by title or made locally checkable.
- Preserve user renames, manual moves, completed/abandoned/deleted states across repeated plans. Omitting an action does not delete it. Recreating or reopening a prior action requires explicit new intent, not replay of old planning input.
- Rescheduling defaults to a suggestion pending confirmation. Direct application is permitted when user intent, task and target date are clear. Agent confidence in its own better schedule is not consent. Explicit conversational completion/abandonment can update a unique Dashboard task; ambiguous identity, conflicting statements or unknown dates require clarification.
- Change history records the origin and recording time. Do not infer completion from elapsed time, repeated prose, or unchecked status. Do not overwrite morning baseline, unrelated Markdown or an existing evening review through a task checkbox.
- Update the canonical daily-flow guidance and authority documentation narrowly during implementation: Dashboard owns its local Tasks; Dida remains authoritative for its external records and read-only under this scope. Preserve its existing bounded source fallback and incomplete-run reporting. No changes to automation schedule or broad Dida migration.

### Habit bilingual names

- Localized display names attach to the same stable Habit identity and are stored with Vault configuration, separate from replaceable external observations. Snapshot refresh must not erase configured names.
- Render one appropriate name for current interface language, falling back to existing source/original name when unavailable. Do not translate runtime user text or invent an online translation dependency.
- Existing habit catalog/configuration is the naming surface for this iteration; no habit creation or goal-editing UI. Preserve current completion merge, compact layout, evidence and historical semantics. New fixed copy is bilingual.

## Testing Decisions

Proposed boundary, pending user confirmation for 4.0:

1. Primary automated seam: application operations against isolated synthetic Vaults and a controlled clock. Extend existing day-task, planning-input, historical-correction, Calendar, Habit and Vault-isolation workflow precedents. Verify externally observable reads, writes, restart persistence, date semantics, archive/restore, idempotency, conflict recovery and unrelated Markdown preservation; do not test private decomposition.
2. Real adapter contract: external daily-flow read/write entry point calls the same Task operations. Exercise initial morning, repeat morning, suggestion versus authorized reschedule, explicit completion/abandonment, late completion and evening reading. Simulate Dida reads and source failures; prove no Dida writes and no optional suggestion becoming a task. Add a bounded end-to-end rehearsal through the actual adapter with synthetic records, distinguishing it from a real personal daily run.
3. Packaged Mac acceptance: compare the accepted layout with the real app; verify Today/Inbox defaulting, three-view consistency, +N and side-panel operations, archived history, bilingual names, narrow windows, keyboard interaction and saved state after restart. Targeted frontend async regressions cover stale responses and modal/navigation behavior where needed.
4. Keep prior 3.0 evidence as baseline. Recheck changed task/config persistence in an isolated real Drive-client fixture where relevant; do not rerun an unrelated full cloud investigation. Missing real-environment evidence remains explicitly pending.
5. Tests use synthetic temporary data only. No personal Dida mutation, no real Daily Record overwrite, no automatic replacement of the user's active installation. Automated, browser, real-adapter and packaged evidence remain separate; an accepted prototype is design evidence only.

## Out of Scope

- Habit creation and goal modification (4.1); additional sleep/wake check-in features.
- Repeating tasks, reminders, subtasks, priorities, nested folders, attachments, drag scheduling and a full calendar service.
- In-app Agent chat, account systems, mobile rollout, Google direct authorization, new cloud sync, Strava or broad theme redesign.
- Automatic Dida migration/copy/write-back, bulk legacy-task migration, changing the daily automation schedule.
- Direct promotion of throwaway code into production, interpreting prototype acceptance as tested production readiness.

## Further Notes

The latest accepted prototype and direct review are indexed in the adjacent prototype-review document. User-confirmed iteration decisions take precedence over earlier variants. The user explicitly accepted right-panel expansion for +N, superseding the earlier floating-panel proposal. Requirements not implemented in the sketch, including shared task editing and the real daily-flow adapter, remain required.

Implementation tickets should deliver complete usable slices, each with its own persistence and behavior checks; final packaged acceptance integrates those slices rather than deferring all verification to the end. This document is a reviewable draft, not an instruction to implement now.
