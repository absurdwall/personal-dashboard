# Local habit completions v1

Personal Dashboard stores explicit local completion changes in the selected Vault at:

```text
<selected Tortilla Flat vault>/life/.personal-dashboard/habit-completions/v1/completions.json
```

This is the canonical Dashboard-owned completion record. It is independent of the rebuildable external [habit snapshot](habit-snapshot-v1.md): recording or withdrawing a local completion never changes `habits-v1.json`, and replacing that snapshot never removes this document.

## Identity and write boundary

- `habitKey` is the stable lowercase semantic key from the current valid or stale snapshot catalog. Display names and goals are not copied into this document; optional bilingual display names live in the separate [Vault name configuration](habit-names-v1.md).
- `livedDate` is the day the completion belongs to. Today and past dates are valid; future facts are rejected.
- Only catalog habits with `trackingKind: "weekly-count"` accept this operation. Daily-time targets, threshold evidence, and Short records have separate meanings.
- The selected-Vault path is bound into `targetBinding`, and an existing document revision must match `expectedRevision`. A changed target, stale revision, or concurrent external write fails without silently overwriting the current bytes.
- `changeId` makes a retry idempotent. Reusing it for a different operation is rejected.

The document is strict schema-v1 JSON:

```json
{
  "schemaVersion": 1,
  "completions": [
    {
      "habitKey": "reset",
      "livedDate": "2026-09-12",
      "completedAt": null,
      "modifiedAt": "2026-09-12T09:35-04:00",
      "changes": [
        {
          "id": "habit-completion-example",
          "kind": "completed",
          "changedAt": "2026-09-12T09:30-04:00"
        },
        {
          "id": "habit-withdrawal-example",
          "kind": "withdrawn",
          "changedAt": "2026-09-12T09:35-04:00"
        }
      ]
    }
  ],
  "noOpReceipts": [
    {
      "id": "external-only-withdrawal-example",
      "habitKey": "exercise",
      "livedDate": "2026-09-12",
      "completed": false,
      "acceptedAt": "2026-09-12T09:36-04:00"
    }
  ]
}
```

Each habit/date pair appears once. `changes` is append-only and alternates between `completed` and `withdrawn`; `completedAt` is the latest active completion timestamp or `null`, and `modifiedAt` equals the final change timestamp. Accepted operations that do not change local state are retained in `noOpReceipts`, so retrying the same `changeId` cannot acquire a different meaning after later state changes. Duplicate identities, reversed change chronology, damaged history, invalid or future timestamps, unsupported schemas, and future lived dates invalidate the whole document instead of turning it into empty state.

## Merge and retention

For each catalog habit and lived date, Dashboard first reduces each external source to its latest valid observation. The merged checkbox and weekly count are complete when either:

- at least one eligible external source has a valid `completed` observation; or
- the local record's current state is `completed`.

The pair contributes at most one count. An external `not-done` does not veto a valid completion from another eligible source or an active local completion. Withdrawing a local completion only appends the local withdrawal: if external evidence still completes the day, the merged checkbox remains selected and the UI explains why.

Snapshot refresh replaces the entire external projection, so removed external evidence does not accumulate. Local records remain keyed by habit/date across app restarts, snapshot renames, snapshot replacement, stale snapshots, and 12-week display-window movement. The reader does not delete records merely because their date leaves the visible window.

## Historical corrections

Calendar can open a past date in Today and expose completion-type habits for that exact lived date. The merged checkbox still follows the same OR rule, while the UI separately explains external evidence, current Dashboard-local state, and every local completion or withdrawal with its actual `changedAt` time. Withdrawing a historical local completion therefore does not erase or rewrite external evidence, and an external completion can keep the merged checkbox selected.

The current week uses the catalog's current goal. An earlier week uses only an exact matching `goalHistory.weekOf`; if none exists, the UI says that the historical goal is unknown and does not backfill one. Outside snapshot coverage, external state remains unknown even when a retained local completion is still correctable by stable habit key. If no catalog survives a restart, persisted local habit/date pairs remain visible under their stable keys and may be completed or withdrawn, while their display name, external state, and historical goal remain explicitly unknown; no new habit/date pair may be created without a verifiable catalog. Merely opening an empty past date creates no completion document or Daily Record; an explicit local correction creates only the versioned completion document. Future lived-date completions are rejected.

If a refresh damages or makes the local document unreadable, an already-running application retains its last valid merged view and reports the error. After restart, an invalid local document fails closed rather than hiding the damage. Recovery snapshots from conditional atomic writes live outside the canonical path and are never interpreted as current completion state.
