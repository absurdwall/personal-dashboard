# Task source v1

Personal Dashboard stores persistent Tasks in a versioned, Vault-owned JSON
source. Tasks do not live in Daily Record Markdown, and reading an empty source
does not create a Daily Record.

## Location and schema boundary

The canonical source remains:

```text
life/.personal-dashboard/tasks/v1/tasks.json
```

Ticket 01 first wrote schema version `1`; the current document is schema
version `4` and still contains `lists` and `tasks` at the same stable path.
The reader accepts schema-1, schema-2 and schema-3 documents, supplies absent optional
fields in memory, and the next successful write upgrades them to schema 4.
Every document has a permanent, unarchived system list with id `inbox`. Ticket
03 adds user-owned, single-level lists in the same document. A list has a
stable id, a display name, and an `archived` flag; renaming never changes the
id stored on its tasks. Inbox accepts dated and undated tasks. A new task in a
user list defaults to that list without a date, while global and Inbox entry
points default to Inbox. Lists may belong to a single-level folder; there is no nested folder or list-delete operation.

Schema 3 adds an optional priority (`high`, `medium`, or `low`) and a stable
`tagIds` array to each Task, plus a Vault-wide tag catalog. A missing priority
means `none`; missing tag catalogs or task tag arrays read as empty. Old create
and update commands retain their existing behavior. The additive property
commands accept creation properties and patch updates: omitted priority or tag
fields retain their saved values, explicit priority `null` clears it, and an
explicit tag array replaces the assignments (including an empty array to clear
them). Tag ids are stable across renames and across lists. Names are trimmed,
nonempty and unique without case; deleting a tag only unlinks it from tasks.
Change history records priority and assignment edits. Priority sorting is
stable within each priority; priority and tag filters can be combined without
changing list or task state.

Schema 4 adds a folder catalog, optional `folderId` on lists, and optional
`parentTaskId` on Tasks. Missing catalogs and relationships read as empty.
Folders group lists without moving or copying Tasks. Parent relationships keep
Task identity, list, schedule and completion independent; self-parenting and
cycles are rejected. Deleting a parent retains its children and their relation
for history and recovery.

Each Task has a stable `id`, required `name`, optional `content`, optional
`date` and `time`, `listId`, `source`, `state`, creation and modification
timestamps, and append-only `changes`. A time requires a date. Clearing a date
also clears its time. Manual tasks use `source.kind = "manual"` with a null
reference. The reserved source kind `daily-flow` carries a stable producer
reference.

The v1 state vocabulary is `pending`, `completed`, and `abandoned`. Ticket 01
stores new tasks as `pending`; ticket 02 adds the lifecycle controls and
completion evidence described in `docs/tasks-state-history-v1.md`. Change
entries use stable ids and record the operation timestamp plus the before/after
values for renamed, content-edited, rescheduled, list-moved, or combined edits.
An explicit daily-flow command that is already satisfied records a `noop` history
entry with its operation payload so the same operation id remains idempotent after
later user edits.

## Read and write contract

Reads return the selected Vault's target binding and a byte-derived revision.
A missing file is an `empty` result with no write. Invalid JSON, unknown schema
versions, duplicate identities, missing Inbox, invalid schedules, or invalid
history are explicit errors and are never treated as empty data.

Creates and edits validate both the target binding and expected revision before
using the shared protected atomic file-write boundary. A stale revision or
wrong Vault is rejected without overwriting external bytes. Repeating the same
create by Task id or the same edit by change id is idempotent when its payload
matches; a conflicting reuse is rejected. List creation is similarly keyed by
the stable list id, while rename and archive/restore are convergent retries of
the requested current list metadata. Moving a task records a `list-moved`
history entry without duplicating the task. Failed writes retain the caller's
recoverable draft, and the shared recovery machinery may retain a recovery
snapshot for explicit inspection.

## List visibility

Inbox and active user lists appear in the everyday `All`, `Inbox`, and
user-list scopes. Archiving removes a list's tasks from those active scopes and
exposes them through the `Archived` scope and the list management restore
entry. Archive and restore never complete, abandon, delete, or otherwise
rewrite the tasks. Restoring one deleted task clears only that task's
tombstone; it does not restore the archived list. New tasks and cross-list
moves cannot target an archived list until the list itself is restored.

## Task list and selected details

Tasks retain the list sidebar and scope/state filters. A compact row offers an
accessible completion checkbox, the Task name and its saved schedule. Clicking
the name or row selects one full detail panel independently of completion.
The panel sits beside the list at wide sizes and below it in narrow windows;
closing it returns keyboard focus to the Task name.

The selected panel reuses the shared editor for name, content, list, date,
time and optional execution end. Provenance, completion corrections, change
history, Collaboration entry and abandon/delete/restore controls remain there.
Completed and abandoned history stays folded and paged by thirty, with the
selected or linked identity included even beyond the first page. Navigation
retains drafts; a failed save preserves the selected editor and its submitted
values for explicit refresh/retry. Writes keep the existing revision, stable
operation identity and saved-readback checks, and freeze edit controls while
pending. A Task link selects its actual list before revealing the details.

## Today derived view

Today is a date-based presentation over this same source, not another list or
membership target. It shows active tasks dated for the selected lived date
across unarchived lists. On the current date it also shows pending, unarchived
tasks whose date or explicit time has passed, in a separate overdue group.
Undated tasks, abandoned or deleted tasks, and tasks in archived lists do not
enter the everyday Today view. A task date is never changed merely because it
becomes overdue.

The Tasks destination and Today use the same task id, target binding, revision,
and mutation commands. Today creation defaults to the selected date and Inbox,
but the user may clear or edit the date and choose another active list before
saving. The old per-day `day-tasks` files remain a labeled, read-only historical
read path; Today reads them without accepting the old planning input or writing
those files during normal 4.0 reads.

## Calendar derived view

Calendar keeps its existing Daily Record availability and Review semantics. Its
month response adds up to four dated, non-deleted task title previews per cell
plus an overflow count. The previews retain the task state so completed and
abandoned work can be distinguished; archived-list tasks remain eligible for
historical Calendar lookup. Undated tasks have no month-cell placement, and
late completion does not move a task away from its scheduled date.
The month includes complete Sunday-to-Saturday weeks, using five rows for
compact months and six when needed. Record/Review markers and the true overflow
count sit beside the date; missing records remain unmarked and read errors
retain their separate state. Task completion never implies Review.

Selecting a date, including its `+N` overflow label, reads that date through
the existing `TodayApplication::read_date` boundary and presents the complete
dated task set in the existing detail panel (beside the month at wide widths,
below it at narrow widths). The panel uses the shared
task id, binding, revision and mutation commands for editing, state changes,
completion correction and rescheduling. New tasks default to the selected date
and Inbox. Reading Calendar or saving a task only reads or writes the task
source; it does not create or modify a Daily Record or Review.

This source is independent of Dida365, Google Drive APIs, and Daily Record
Markdown. Local success is not cloud-sync evidence. The bounded daily-flow
adapter is specified in [daily-flow-task-adapter-v1.md](daily-flow-task-adapter-v1.md),
and its canonical daily-loop wiring is documented in
[daily-flow-integration-v1.md](daily-flow-integration-v1.md); packaged acceptance
remains a separate gate.

## Optional planned execution interval (PDEX-06)

Task `date` and `time` continue to identify its scheduled start/calendar
placement. `executionEnd` is an optional `{date, time}` planned execution end;
both endpoints need complete valid dates and `HH:mm` times, and end must be
strictly after start. An overnight end retains its actual calendar date.
Absent or null persisted ends mean the existing point/date/undated Task, with
no inferred duration. An interval is never completion evidence or a deadline.

Create accepts an optional end. Update omitting `executionEnd` retains the
saved end, explicit `null` clears it, and an object replaces it. A start edit
that would invalidate a retained end is rejected atomically; callers moving
an interval pass both the changed start and end. Change history retains both
ends. New changed manual updates also retain their normalized original field
payload and the omitted/null/object end patch in history. Reusing a change id
must match that original payload; a genuine retry remains read-only after later
edits, rather than reapplying an older end. Legacy changes without retained
operation payloads keep their prior result-based retry compatibility. Existing
Task identity and selected-Vault/revision checks remain in use. The shared Task
editor exposes end date/time and an explicit clear action; Tasks, Today and Calendar read that same Task store.

Collaboration's `createTask` and `updateTask` operations accept the same
optional `executionEnd`. Current Task references and proposal/result baselines
retain it. Operation readback checks both endpoints (an omitted update end is
checked against the baseline); an unchanged end cannot be reported as a saved
end edit. Omitted new fields stay omitted in old serialized operation records,
so adding this capability does not change old operation fingerprints.

## Today timeline direct manipulation (PDEX-07)

Blank-axis pointer selection opens an editable Task creation dialog. The start
and end become natural calendar dates and local times (including a next-day
end across midnight) before the existing `create_task` boundary is invoked.
Moving a Task uses its saved start and optional execution end, with 15-minute
snapping of the new start. The saved duration remains unchanged; a point Task
keeps `executionEnd: null`. Minimum card height never supplies a duration.

The gesture controller owns the plot once, uses its existing inner scroll
surface during a held edge drag, and cancels its unsaved preview on Escape.
Facts stay outside its editable targets. Task detail/time editing opens the
same stable Task identity. These operations do not call Daily Record writes
or change completion/abandonment state.

A rejected/unconfirmed move keeps the saved card and the desired timing in a
recovery dialog. Rereading checks the existing Task before an explicit retry;
if retry is needed, only the requested timing is applied to current content,
list and state. A failed creation retains its form and stable Task identity.
No uncertain write is replayed automatically. `today-axis-gestures.ts` is the
single pointer owner; plan gestures may extend its resolver/commit callbacks
rather than installing a second controller.
