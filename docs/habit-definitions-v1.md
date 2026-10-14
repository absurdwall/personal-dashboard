# Local Habit definitions v1

Personal Dashboard stores its editable Habit catalog in the selected Vault at:

```text
life/.personal-dashboard/habits/v1/catalog.json
```

This is Dashboard-owned state, separate from the rebuildable source snapshot,
the optional bilingual display-name sidecar, and local completion history. A
stable `key` associates a source Habit overlay with its source; new local
Habits use independent `local-` keys. A name never establishes identity.

## Document shape

The file is JSON with this shape (nullable fields are written as `null`):

```json
{
  "schemaVersion": 1,
  "habits": [{
    "key": "exercise",
    "name": "Strength walk",
    "nameOverride": true,
    "emoji": null,
    "group": null,
    "startDate": null,
    "createdLocally": false,
    "baseGoal": { "kind": "weekly-count", "days": 3 },
    "sourceGoalHistory": [],
    "goalRevisions": []
  }],
  "operations": [{
    "id": "habit-definition-example",
    "fingerprint": "0123456789abcdef"
  }]
}
```

`nameOverride` is optional, defaults to `false`, and is serialized only when
true. For a source overlay without an override, `name` is the last saved
canonical fallback. While the source Habit is present, the current snapshot
supplies its canonical name and the Vault's localized-name configuration
supplies the active language. An explicit
local rename sets `nameOverride: true`, so the saved name takes precedence in
both languages. Source translations and snapshot bytes remain separately owned.
For a locally created Habit, `name` is its canonical display name.

Goals are tagged `daily-count`, `weekly-count` (`days` 1–7), or `daily-time`
(`standard` as `HH:mm` and `dayRelation` as `same-day`, `next-day`, or
`unresolved`). `baseGoal` may be `null`. `sourceGoalHistory` entries contain a
Monday `weekOf`, source `label`, and typed `goal`. A `goalRevisions` entry has
an `id`, nullable target `goal`, `effectiveOn`, offset-bearing `changedAt`,
and `disposition` (`scheduled`, `superseded`, or `cancelled`).

## Revision and receipt retention

Ordinary edits append goal revisions. Replacing a pending goal marks the old
revision `superseded`; returning to the current goal marks the pending revision
`cancelled`. Both remain in the catalog. Source goal history is retained with
the overlay. Each write carries an operation receipt with its `id` and
fingerprint; the application returns success only after reading the catalog
back and confirming that receipt. A retry with the same ID cannot acquire a
new meaning. The current implementation applies no pruning cutoff to
revisions, source history, or operation receipts.

## Read and upgrade boundary

Schema version must be exactly `1`. The v1 document and nested records reject
unknown fields; invalid data and unknown versions fail closed. A read or edit
error does not replace the catalog with an empty document. There is no automatic
conversion from an unknown version or field set. In particular, an older app
that does not recognize the optional `nameOverride` field may reject a catalog
written by a newer app, but will not silently discard it or write over it.
Keep a Vault backup before manual migration or downgrade, and use a reader that
understands the fields already present. A future schema change that cannot be
read under v1 requires an explicit versioned migration; it must not be handled
by dropping unknown data.
