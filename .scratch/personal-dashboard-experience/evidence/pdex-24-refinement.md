# PDEX-24 implementation evidence

Branch: `codex/pdex-24-refinement`; integration ancestry confirmed at `1906b87` (base `918e7e0`). Local Git only. Authorized seams: real TodayApplication with isolated synthetic selected Vault; frontend controller/DOM/WebKit.

## Slice 1 — local creation and canonical completion

Red: `habit_catalog_workflow` failed with the missing catalog API, binding and revision fields after generating the existing frontend distribution.
Green: creation without an external snapshot, exact operation retry, immediate canonical completion and fresh application readback pass (1 test). Catalog uses a separate canonical path and the existing atomic CAS/file-create boundary; no source snapshot is written and no external operation occurs.

Native packaged acceptance is pending; passing application checks do not close this ticket.

## Slice 2 — weekly target effective boundaries

Red: editing 3→5 produced no pending revision (test failed).
Green: Wednesday edit keeps this week at 3, editable settings carry 5, replacing/cancelling pending works, and a fresh instance at Monday 03:59 uses 3 then at 04:00 uses 5. Initial goal segment is retained; accepted operation receipts retain superseded and cancelled edit requests. Application suite: 2 passed.

## Slice 3 — sourced overlays and producer refresh

Red: first edit of an existing sourced Habit immediately changed its current target (3→5).
Green: sourced baseline and typed source goal-history segments are retained before scheduling the pending target. Goal-only edits keep localized display names; explicit renames override display fallback without writing the language configuration. A replacement source snapshot updates external evidence while stable local name/icon/group/current and pending goals survive; explicit external mapping provenance remains. Application suite: 3 passed.
