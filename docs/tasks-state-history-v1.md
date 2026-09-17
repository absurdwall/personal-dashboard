# Task state and history v1

Ticket 02 extends the task source from `docs/tasks-v1.md`. The source remains
Vault-owned and independent from Daily Record Markdown. The stable path is
still the `v1` task source path, but lifecycle fields require schema version
`2`. The reader accepts a legacy schema-1 document with defaulted lifecycle
fields and upgrades it in memory; the next successful write emits schema 2.

## State operations

Tasks have three active states: `pending`, `completed`, and `abandoned`.
The application exposes `set_task_state`, `delete_task`, `restore_task`, and
`correct_task_completion`. Every mutating input carries the selected target
binding, expected revision, stable task id, and stable change id. The operation
updates the task and appends its history entry in one protected conditional
save.

`completed` is distinct from `abandoned`: completing a task records completion
evidence, while abandoning it clears the current completion evidence. Restoring
an abandoned task returns it to `pending`. Reopening a completed task also
returns it to `pending` and does not rewrite the task's scheduled date or time.

## Completion evidence

The current completion record contains:

- `completedOn`: the date the user says the task was completed;
- `completedTime`: an optional `HH:MM` value;
- `recordedAt`: the actual local timestamp at which the app recorded the
  operation;
- `source`: `checkbox`, `date-correction`, or `daily-flow`.

Normal checkbox completion uses the current local timestamp. A late completion
therefore leaves the task's scheduled `date` and `time` unchanged. A correction
may provide a date without a time, never invents a minute, and cannot describe a
future date or future time. A future scheduled task may be completed now; its
Calendar placement remains the scheduled date.

## Deletion and recovery

Deletion sets `deletedAt` and appends a `deleted` history entry. The UI excludes
the tombstoned task from active state filters and exposes it in the `deleted`
filter for recovery. `restore_task` clears only the tombstone, retaining the
stable id, source, list, schedule, state, completion record, and history. There
is no permanent purge operation. A create or edit using an old producer/task
identity cannot reactivate a tombstoned task.

History entries carry a `source` (`user` or `daily-flow`) and, for lifecycle
changes, the previous and new state, deletion marker, and completion evidence.
Missing optional fields in older schema-1 history entries default to the
ticket-01 shape; malformed lifecycle combinations are rejected rather than
treated as empty data.

## Evidence boundary

The contract is covered by isolated Rust workflow tests and frontend seam/static
tests using synthetic Vaults. Those checks do not prove packaged macOS Tauri
acceptance, real Vault/Drive synchronization, or later Daily Flow, list, Today,
or Calendar integrations.
