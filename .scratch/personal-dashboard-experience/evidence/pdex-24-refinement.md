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

## Slice 4 — daily boundary and frequency changes

Red: no partial-cycle contract existed.
Green: next-day sleep threshold retains its day relation and changes only after 04:00. Daily→weekly uses the old daily-cycle boundary; the first weekly cycle is visibly partial with the full target of 5, and the following Monday is complete. Current-week counts exclude dates before the applicable frequency segment. Application suite: 4 passed.

## Slice 5 — threshold attainment with separate source evidence

Red: existing explicit sleep threshold was not represented as an attained day after local configuration.
Green: source threshold retains next-day semantics and unknown actual time; local check-in then withdrawal leaves external attainment intact. Unresolved date relations disable local threshold confirmation. Threshold evidence is evaluated against its known source goal and the applicable local goal; actual times are compared as day-relation minutes without creating an activity timestamp. Application suite: 5 passed.

## Slices 6–7 — local independence and failure safety

Red: an invalid source refresh blocked an otherwise valid local Habit. Red: an interrupted successful durable create followed by reread/retry rejected the same operation because its revision guard changed.
Green: configured local Habits retain check-in availability independently of invalid source evidence. A real file create that then reports interruption is read back by a fresh application; retry uses the same stable key and semantic operation, yielding one object. Changed payload under the same operation identity, stale revision, another selected Vault and corrupt original catalog are rejected without overwriting their bytes. Malformed/future canonical completion files preserve retained/error behavior and disable new writes.

Regression verification: 7 catalog + 12 canonical completion + 15 source snapshot workflow tests passed. The inherited read-only snapshot fallback and weekly no-goal exclusion remain intact.
