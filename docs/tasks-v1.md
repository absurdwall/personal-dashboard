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
version `2` and still contains `lists` and `tasks` at the same stable path.
The reader accepts a legacy schema-1 document, supplies the new optional
fields in memory, and the next successful write upgrades it to schema 2.
Every document has a permanent, unarchived system list with id `inbox`. Ticket
03 adds user-owned, single-level lists in the same document. A list has a
stable id, a display name, and an `archived` flag; renaming never changes the
id stored on its tasks. Inbox accepts dated and undated tasks. A new task in a
user list defaults to that list without a date, while global and Inbox entry
points default to Inbox. There is no nested folder or list-delete operation.

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
month response adds up to two dated, non-deleted task title previews per cell
plus an overflow count. The previews retain the task state so completed and
abandoned work can be distinguished; archived-list tasks remain eligible for
historical Calendar lookup. Undated tasks have no month-cell placement, and
late completion does not move a task away from its scheduled date.

Selecting a date, including its `+N` overflow label, reads that date through
the existing `TodayApplication::read_date` boundary and presents the complete
dated task set in the existing right-side panel. The panel uses the shared
task id, binding, revision and mutation commands for editing, state changes,
completion correction and rescheduling. New tasks default to the selected date
and Inbox. Reading Calendar or saving a task only reads or writes the task
source; it does not create or modify a Daily Record or Review.

This source is independent of Dida365, Google Drive APIs, and Daily Record
Markdown. Local success is not cloud-sync evidence. The daily-flow adapter and
packaged acceptance remain later tickets.
