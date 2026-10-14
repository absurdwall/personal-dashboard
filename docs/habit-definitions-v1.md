# Local Habit definitions v1

Personal Dashboard stores local Habit identity and settings in the selected
Vault at:

```text
life/.personal-dashboard/habit-definitions/v1/catalog.json
```

This strict, versioned document is the canonical owner of locally created
Habits and local edits to sourced Habit presentation and goal settings. It is
separate from the rebuildable [Habit snapshot](habit-snapshot-v1.md), which
continues to own bounded external observations and provenance, and from
[local completions](habit-completions-v1.md), which own dated completion
changes. A missing snapshot does not prevent local Habit creation or local
check-in. A damaged catalog is reported and is never treated as an empty
document.

## Identity and boundary

- A local Habit receives one stable lowercase semantic key derived from its
  accepted create-operation identity. Names, emoji, group, and goals never
  establish or change identity.
- Editing a sourced Habit uses its existing snapshot key. It does not create,
  rename, map, or write an external Habit. A sourced Habit's source observations,
  mapping, and actual-time evidence continue to come from their existing sources.
- `origin` distinguishes `local` from `sourced`. Source-localized names and
  goal-history context are retained as a fallback when a sourced Habit has no
  current snapshot row. User-selected language overrides are stored separately
  from that source context.
- `startDate` controls when a definition can accept completion. Changing it does
  not remove dated completion facts or claim earlier coverage.
- Daily-time targets retain both their `HH:mm` standard and `dayRelation`
  (`same-day`, `next-day`, or `unresolved`). They do not gain a checkbox-based
  completion path or fabricated activity time.

## Schema

The document is strict schema-v1 JSON. Unknown fields, invalid keys or dates,
unsupported goal targets, duplicate revisions/operation IDs, and unsupported
schema versions reject the whole document without replacing its bytes.

```json
{
  "schemaVersion": 1,
  "habits": {
    "local-0123456789abcdef": {
      "key": "local-0123456789abcdef",
      "origin": "local",
      "baseName": "Read",
      "sourceLocalizedNames": { "zh": null, "en": null },
      "nameOverrides": { "zh": null, "en": "Read" },
      "emoji": "📚",
      "group": "Learning",
      "startDate": "2026-10-13",
      "sourceGoalTarget": null,
      "sourceGoalHistory": [],
      "goalRevisions": [
        {
          "id": "goal-0123456789abcdef",
          "effectiveFrom": "2026-10-13",
          "goal": { "kind": "weekly-count", "standard": 3 },
          "status": "active"
        }
      ],
      "createdAt": "2026-10-13T09:00-04:00",
      "modifiedAt": "2026-10-13T09:00-04:00"
    }
  },
  "operations": [
    {
      "id": "habit-definition-example",
      "fingerprint": "0123456789abcdef",
      "habitKey": "local-0123456789abcdef",
      "outcome": "created",
      "acceptedAt": "2026-10-13T09:00-04:00"
    }
  ]
}
```

Supported goals are `daily-completion`, `weekly-count` with an integer
standard from 1 to 7, and `daily-time` with a valid local time and a retained
day relation. Local definitions remain separate from the snapshot's current
external source envelope; a snapshot refresh can replace source evidence
without replacing local names, goal revisions, or local Habit identities.

## Goal cycles and writes

Each goal revision records its requested target, effective lived date, stable
revision ID, and status (`active`, `superseded`, or `cancelled`). The current
goal remains in effect through its current cycle: a weekly target change becomes
effective on the next Monday, and a daily-target change on the next lived day.
The form shows an upcoming target and date separately from the current target.
Changing a pending target replaces that future plan while retaining its
superseded revision; selecting the current target cancels the pending revision.
An incomplete first or changed cycle is marked partial rather than scaled or
counted as a complete streak.

Every write is bound to the selected Vault catalog path and exact catalog
revision. The operation ID and mutation fingerprint make retries idempotent;
reusing an ID for different fields fails. Existing bytes are conditionally
replaced through the shared atomic-file-write boundary, then read back and
checked against the operation receipt, Habit key, and revision before the
application reports success. A changed Vault, stale revision, damaged file,
or failed readback never becomes a displayed success. The local completion
document remains independently revision-checked and read back through its
existing workflow.

No schema migration rewrites snapshot, name, or completion files, and opening
the page performs no external write.
