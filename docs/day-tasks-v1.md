# Day-task document v1

Personal Dashboard stores day tasks as a versioned, Vault-owned document. It does not add task state to the Daily Record Markdown file.

## Location and ownership

For lived date `YYYY-MM-DD`, the canonical file is:

```text
life/.personal-dashboard/day-tasks/v1/YYYY/YYYY-MM-DD.json
```

The selected Vault and the date are part of the write target. Reading an old Vault or a date with no task document returns an empty list and creates no file. A task from one date is never carried to another date automatically.

Dashboard is the schema owner. Ticket 05's daily-flow producer may merge imported planning tasks into this document only after following the identity and concurrency rules below; it must not replace the document wholesale.

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

## Concurrent writes and recovery

Every read returns a byte-derived revision and a target binding derived from the canonical Vault path and date. A write must present both. Dashboard re-reads the file, rejects a stale revision, and uses the same atomic conditional replacement and recovery machinery as bounded Daily Record writes. An external edit is preserved and the caller must refresh before retrying.

The target binding prevents an async result or queued operation from crossing into a newly selected Vault or a different date. The UI also suppresses stale responses, but that presentation guard is not the data-integrity boundary.

If activation cannot complete safely, recovery snapshots may remain under the Vault's `.personal-dashboard-recovery/today` area and the error identifies the remaining recovery state. This mechanism narrows the replacement race and preserves recoverable bytes; it does not claim that unrelated writers cooperating with no locking protocol can never race the final filesystem operation.
