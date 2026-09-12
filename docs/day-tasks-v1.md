# Day-task document v1

Personal Dashboard stores day tasks as a versioned, Vault-owned document. It does not add task state to the Daily Record Markdown file.

## Location and ownership

For lived date `YYYY-MM-DD`, the canonical file is:

```text
life/.personal-dashboard/day-tasks/v1/YYYY/YYYY-MM-DD.json
```

The selected Vault and the date are part of the write target. Reading an old Vault or a date with no task document returns an empty list and creates no file. A task from one date is never carried to another date automatically.

Dashboard is the schema owner. A daily-flow producer never replaces this document. It publishes the separate compatible planning input below; Dashboard validates and incrementally merges that input when the target date is opened or refreshed.

## Schema

```json
{
  "schemaVersion": 1,
  "date": "2026-09-08",
  "tasks": [
    {
      "id": "manual-task-550e8400-e29b-41d4-a716-446655440000",
      "text": "Buy groceries",
      "source": { "kind": "manual", "reference": null },
      "createdAt": "2026-09-08T14:10-04:00",
      "modifiedAt": "2026-09-08T14:18-04:00",
      "completedAt": null,
      "deletedAt": null,
      "changes": [
        {
          "id": "rename-task-550e8400-e29b-41d4-a716-446655440001",
          "kind": "renamed",
          "changedAt": "2026-09-08T14:18-04:00",
          "previousText": "Groceries",
          "newText": "Buy groceries"
        }
      ]
    }
  ]
}
```

`schemaVersion` is exactly `1`, and `date` must match the filename. Unknown fields, duplicate task IDs, duplicate change IDs, invalid timestamps, invalid identifiers, and unsupported versions fail closed instead of being treated as an empty list.

## Identity and history

- `id` is the task identity. Display text is mutable and is never an identity key.
- Manual tasks use `source.kind = "manual"` with a null reference.
- Producer tasks use `source.kind = "daily-flow"` and a stable producer reference. Re-running a producer must resolve the same task by that reference and stable task ID.
- `completedAt` is present only after explicit confirmation. An unchecked task means unconfirmed, not known incomplete.
- Deletion sets `deletedAt` and appends a `deleted` change. The tombstone remains in the document so a producer cannot silently recreate a task the user deleted.
- Mutations append a unique change ID with one of `renamed`, `completed`, `reopened`, or `deleted`. Repeating the same operation ID with the same intent is idempotent.

## Daily-flow planning input v1

For the same lived date, the compatible producer input is:

```text
life/.personal-dashboard/day-task-plans/v1/YYYY/YYYY-MM-DD.json
```

The producer must publish the complete input with an atomic same-volume replacement. The input is derived planning output, not task state and not a second canonical task list. Dashboard does not delete it after reading; repeated reads are intentionally idempotent.

```json
{
  "schemaVersion": 1,
  "date": "2026-09-08",
  "candidates": [
    {
      "kind": "action",
      "taskId": "flow-laundry-2026-09-08-v1",
      "sourceReference": "morning-plan-laundry-2026-09-08-v1",
      "text": "洗衣服"
    },
    {
      "kind": "suggestion",
      "sourceReference": "morning-plan-walk-idea-2026-09-08",
      "text": "如果有空可以散步"
    }
  ]
}
```

- `schemaVersion` is exactly `1`, and `date` must match the path and selected lived date.
- Every candidate has a stable ASCII `sourceReference`. References are unique within the input.
- An `action` also has a stable ASCII `taskId`; action IDs are unique within the input. Re-reading the same ID and reference addresses the same task regardless of text or order.
- A `suggestion` has no `taskId` and is validated but never inserted into the canonical task document.
- Unknown fields, missing fields, invalid identities, invalid text, duplicate identities, a wrong date, malformed JSON, or an unsupported version rejects the complete input. No valid prefix is partially applied, and the existing canonical task list remains visible and writable with a producer error.

The order of action candidates reorders only active, unconfirmed `daily-flow` task slots. Manual tasks, completed tasks, and tombstones remain outside that reorder set and retain their relative order and state. An existing task keeps its stored text, so a user rename wins over later producer wording. Omitting an existing action does not delete it. A deleted task ignores its exact old task/reference pair; pairing the old reference with a new task ID is rejected. A deliberately rearranged action must use both a new task ID and a new source reference.

Dashboard reads this structured document only when the date is explicitly opened in Today or Today is explicitly refreshed. Calendar and Habits summaries use a read-only date view and never receive planning input. Local task or Daily Record saves reload confirmed state without receiving the input; an existing producer diagnostic remains visible until the next explicit Today refresh. Dashboard never guesses tasks from Daily Record prose, calls an Agent, polls Dida365, or rewrites an evening review.

## Planning reader context

The public `planning_day_task_context` application operation returns schema version, lived date, canonical revision, target binding, and every canonical task with its stable identity, source, current text, modification time, and one explicit status:

- `unconfirmed`: active and not explicitly completed; this is not evidence that the action was not done.
- `completed`: explicitly completed.
- `deleted`: retained tombstone; an old producer candidate must not recreate it.

A missing document returns an empty context without creating a task document or Daily Record. A future daily-flow adapter can read the previous lived date through this operation before preparing suggestions for today, but the context itself creates no new obligation and performs no carryover. This ticket does not modify or activate the real daily skill, Dida365, MCP, or automation wiring.

## Concurrent writes and recovery

Every read returns a byte-derived revision and a target binding derived from the canonical Vault path and date. A write must present both. Dashboard re-reads the file, rejects a stale revision, and uses the same atomic conditional replacement and recovery machinery as bounded Daily Record writes. An external edit is preserved and the caller must refresh before retrying.

The target binding prevents an async result or queued operation from crossing into a newly selected Vault or a different date. The UI also suppresses stale responses, but that presentation guard is not the data-integrity boundary.

If activation cannot complete safely, recovery snapshots may remain under the Vault's `.personal-dashboard-recovery/today` area and the error identifies the remaining recovery state. This mechanism narrows the replacement race and preserves recoverable bytes; it does not claim that unrelated writers cooperating with no locking protocol can never race the final filesystem operation.
