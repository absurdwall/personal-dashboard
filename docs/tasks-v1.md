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
Every document has a permanent, unarchived system list with id `inbox`; ticket
01 only wrote to that list. The list and membership fields are kept in the
document so later state/list operations can use the same persistence unit.

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
matches; a conflicting reuse is rejected. Failed writes retain the caller's
recoverable draft, and the shared recovery machinery may retain a recovery
snapshot for explicit inspection.

This source is independent of Dida365, Google Drive APIs, and Daily Record
Markdown. Local success is not cloud-sync evidence. The daily-flow adapter,
list management, Today integration, Calendar integration, and packaged
acceptance are later tickets.
