# Personal Dashboard

This context defines the product language for the private, local-first Personal Dashboard 2.0 and its boundary with the user's Tortilla Flat vault and external daily flow.

## Language

**Personal Dashboard**:
The installed application for reading and making bounded updates to Daily Records, reviewing calendar history, and merging explicit local habit completions with sourced habit evidence.
_Avoid_: Exercise Habit Tracker, generic habit engine

**Selected vault**:
The Tortilla Flat Obsidian vault explicitly chosen as the source of canonical Daily Records, canonical local habit completions, and the derived habit snapshot. It remains user-owned data outside the application-data directory.
_Avoid_: App database, imported vault

**Daily Record**:
The canonical Markdown record for one lived day in the selected vault.
_Avoid_: App note, dashboard ledger

**Lived day**:
The personal day used to group daily planning, review and local habit completions, named for the calendar date on which it begins. It runs from 04:00 local time through, but excluding, 04:00 the following calendar date; the actual timestamp of an event remains unchanged.
_Avoid_: Calendar day, shifted event timestamp

**Today**:
The Personal Dashboard destination that presents the selected day's Daily Record as morning, daytime, and evening phases and permits only bounded documented updates.
_Avoid_: Exercise dashboard, daily planner

**Calendar**:
The Personal Dashboard destination for locating and opening a dated Daily Record without creating a second history store.
_Avoid_: Exercise history, event calendar

**Habits**:
The Personal Dashboard destination for reviewing sourced habit evidence and dated exercise context across current and bounded historical periods. Local and explicitly mapped external completion evidence retain separate identities and count once when either confirms completion.
_Avoid_: Exercise tracker, automatic external check-in, generic habit framework

**Habit snapshot**:
A rebuildable, bounded projection of habit evidence with explicit provenance, generation date, and source coverage. Its freshness and publication result are separate from canonical local completion facts.
_Avoid_: Habit database, live sync, Dida365 mirror

**Short record**:
A dated free-text Daily Record entry with a stable identity, an optional exercise association, and an append-only correction trace. It can provide visible context but is not habit-completion evidence.
_Avoid_: Habit completion, workout log, check-in

**Morning baseline**:
The independently retained initial arrangement and its contemporaneous basis for a lived day.
_Avoid_: Current plan, reconstructed plan

**Current arrangement**:
The latest explicit arrangement for the lived day; daytime replanning may change it while preserving the morning baseline.
_Avoid_: Morning baseline, inferred schedule

**Daily-flow producer**:
The daily workflow that creates compatible Daily Records and rebuilds validated Habit snapshots from observed source evidence. Its generated projections retain source coverage and leave uncertain activity unknown.
_Avoid_: Dashboard sync, background poller

**Retired Exercise runtime**:
The former Profile, weekly exercise planner, workout history, backup/move, baseline-migration, and reminder behavior retained only for historical validation and bounded cutover parsing.
_Avoid_: Current feature area, fallback UI

**2.0 cutover**:
The explicitly authorized, idempotent retirement of the exact old app-owned Exercise/Profile state and reminders before the reviewed 2.0 candidate becomes the active installation.
_Avoid_: Automatic migration, broad cleanup

**Native app behavior**:
Operating-system installation, launch, local file access, and lifecycle integration without requiring each interface element to use native visual controls.
_Avoid_: Fully native UI

## 3.0 design vocabulary

**Day task**:
A concrete action intended for one lived day, such as doing laundry or buying groceries, whose completion can be recorded. It is not automatically carried into the next day; later planning may suggest it again.
_Avoid_: Backlog item, recurring habit, automatic carry-over

**Local habit completion**:
An explicit dated habit-completion record made by the user in Personal Dashboard, distinct from completion evidence read from Dida365.
_Avoid_: Short record, habit snapshot, Dida365 write-back

**Mapped habit completion**:
A dated completion action for an existing local Habit and its explicitly confirmed external Habit identity. Each endpoint keeps its own result; withdrawing one endpoint can leave completion supported by the other.
_Avoid_: Name matching, synchronized Habit database

**Habit threshold check-in**:
An explicit record that a habit's time target was met, such as getting up before a target time. It does not establish the actual time of the activity.
_Avoid_: Actual time, timestamp of waking

## 4.0 design vocabulary

These terms describe the shipped Dashboard 4.0 task workflow and its agreed
boundary with the earlier lived-day model.

**Task**:
A persistent personal action with a name, optional content and one optional date/time, whose identity continues across edits, rescheduling and completion. Tasks, Today and Calendar present the same action.
_Avoid_: Daily Record, copied day task, development ticket

**Task list**:
A named collection used to organize personal Tasks. Archiving a list retains its task history for later viewing.
_Avoid_: Daily Record section, deleted collection

**Inbox**:
The default Task list for actions not assigned to another list. Inbox tasks may be dated or undated; Inbox is not a synonym for today or unscheduled work.
_Avoid_: Today's list, all undated tasks

**Today task view**:
A date-based view aggregating Tasks across unarchived lists for the current lived date. It is a view, not a list a Task can belong to.
_Avoid_: Today list, Inbox

**Abandoned task**:
A Task the user has explicitly decided not to pursue, retained as history rather than counted as completed. It is distinct from an unchecked Task whose completion remains unconfirmed.
_Avoid_: Completed task, deleted task, inferred failure

**Archived task list**:
A Task list removed from everyday pending-work views while retaining its tasks and their existing states for historical viewing. Archiving does not complete or abandon its unfinished tasks.
_Avoid_: Deleted list, batch completion, batch abandonment

**Task date**:
The single optional date, with an optional time, assigned to a Task and used for its Calendar placement; late completion does not change it. An undated Task remains a valid action without placement on a calendar date.
_Avoid_: Separate start and deadline fields, completion time

**Habit display name**:
A language-specific name for the same Habit identity. Switching its displayed language does not duplicate the Habit or its completion history.
_Avoid_: Translated diary, separate language-specific habit

## 5.0 collaboration vocabulary

**Collaboration workspace**:
An independent Personal Dashboard destination for ongoing personal-management conversations with Codex. Its primary surface is the saved conversation, with an expandable work history and observed outcomes from the same selected-Vault and Task sources used by the rest of the app.
_Avoid_: Persistent shared editing workspace, parallel Task or Daily Record store, app-development environment

**Collaboration session**:
A persisted user-Codex work thread with its own messages, activity dates, target dates, drafts, and operation history. It may continue across lived dates; its history is not current business state.
_Avoid_: Single-day conversation, Task list

**Collaboration proposal**:
A concrete proposed change presented for the user's requested review before it is saved. It is distinct from an instruction to apply a change directly.
_Avoid_: Mandatory authorization step, saved change

**Collaboration outcome**:
The observed result of a requested change to a Task, Daily Record, Habit, document, background memory, or connected external app. Saving the conversation is a separate result; changes to different sources retain independent outcomes.
_Avoid_: Saved reply, proposal, combined success

**Collaboration dictation**:
A user's spoken input captured as editable draft text for a Collaboration session and target date. The user submits that text as a message separately.
_Avoid_: Voice conversation, automatic request

**Collaboration memory**:
Selected-Vault long-term background and read-only workflow reference, supplemented by expiring continuity notes derived from saved sessions. It provides background and pointers; each turn reads current Tasks, Daily Records, and habit facts separately.
_Avoid_: Current business state, replacement for saved sessions

**Connected external app**:
An available external source whose actions retain stable source and object identities with independently verifiable results. External and selected-Vault effects remain separate even when one user instruction authorizes both.
_Avoid_: Dashboard data source, automatic two-way sync

## Collaboration redesign vocabulary

These terms record the agreed redesign direction; they do not assert that the
corresponding features have shipped.

**Collaboration work history**:
The retained, ordered account of a Collaboration turn's visible progress, available reasoning summaries, and attempted actions, including failures followed by recovery. It is distinct from the final reply and from the observed results of data changes.
_Avoid_: Hidden reasoning transcript, final reply, success-only activity log

**Personal retro**:
A review of the user's plans, recorded activity, Tasks, and Habit evidence over a chosen period, used to identify patterns and suggest personal adjustments. Missing evidence remains unknown; suggestions are distinct from requested changes to personal data.
_Avoid_: Workflow retro, automatic replanning, inferred time accounting

**Workflow retro**:
A developer's review of Collaboration execution evidence, implementation, and checks to identify failed attempts, unnecessary work, incorrect changes, or misleading feedback. It belongs to development work in Codex, separate from personal management in Dashboard.
_Avoid_: Personal retro, Dashboard app development, automatic self-modification

## Agreed experience-prototype vocabulary

These terms describe the accepted experience prototype, not shipped behavior.

**Approximate plan time**:
A plan's stated broad period or approximate time, such as afternoon or about 14:00. Its position on a timeline does not establish an exact start, end, duration, or observed activity.
_Avoid_: Confirmed time, exact time range, activity evidence

**Exact plan time range**:
An explicitly chosen start and end for a planned activity. It expresses an arrangement, not evidence that the activity occurred.
_Avoid_: Observed activity interval, completion record

**Task execution interval**:
An optional planned start and end for executing a Task, retained across rescheduling. It describes intended time allocation, not a deadline, actual activity duration or completion evidence; a Task with only a time point remains valid.
_Avoid_: Deadline, actual work interval, completed activity
