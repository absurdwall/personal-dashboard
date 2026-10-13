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

## Slice 8 — shared create/edit draft controller

Red: the public Habit settings controller did not exist.
Green: new draft defaults to the supplied lived date and daily completion; stable creation key and operation identity survive failure/reread. Existing edits load the stored pending target, preserve the sourced identity and start date, and changed payloads receive a new operation identity. Reread of another Vault rejects retargeting. Two controller tests passed; they complement the real application persistence checks.

## Slice 10 — read consistency at a real day boundary

Red: a boundary clock that advances from Monday03:59 (Sunday lived date) to Monday04:00 during one Habit read caused an overlay panic.
Green: the application captures one local date/lived day per read and passes it into source projection and local overlays. One read stays on Sunday, and a subsequent read advances to Monday. This is a source/application seam test with time as the system boundary.

## Slice 9 — actual DOM shared form and application command

Red: the production settings dialog was absent, so real browser form probes failed.
Green: one create/edit dialog exposes name, optional emoji/group, start date and connected daily/weekly/threshold controls. Existing pending targets and next-day relation carry into editing. Wide (1200px) and narrow (560px) DOM probes retain drafts after failed saves, reread the revision and retry the same key/operation; existing edits show current/pending targets independently. Saved response must read back the same definition before closing. Three browser probes passed; synthetic screenshots were inspected at `/private/tmp/pdex24-ui.noindex/`.

The original Habits summary/today/history layout stays in place. A top plus and row edit button/context-menu entry invoke the same editor. Typed weekly labels use distinct attained days in both zh/en. The `save_habit_definition` desktop command delegates to the same application service. The form/controller IPC doubles are UI evidence only; they do not replace the real Vault tests or native acceptance.

## Slices 11–13 — fresh local endpoints, selected Vault and bounded old goals

Red: a local completion saved after a retained source-refresh failure still displayed the older local endpoint. Green: the existing cell projection now replaces only its canonical local endpoint while preserving external evidence, source observations, coverage and actual activity time. Local withdrawal shows the fresh withdrawn state without deleting external facts. Retained projections extend into the new bounded week without a missing-today panic.

Red: a selected-Vault change during a Habit read mixed source evidence from the first Vault with the second Vault's catalog. Green: one captured selected Vault supplies all three reads; another public read can then move to the next Vault. Saves separately recheck their source/catalog binding and selected Vault before atomic activation.

Red: inherited goal-history entries lacked an explicit end to their known coverage. Green: each old source goalHistory week retains `validThrough` at its Sunday; unknown intervening weeks are not silently assigned the preceding target. `HabitGoalRevision::applies_on` is available for PDEX-25 history statistics. Accepted current/local goal segments remain effective until the next revision.

Additional producer regression: `TodayApplication::refresh_habit_snapshot` performs real source publication in the synthetic Vault using captured host read evidence. Catalog bytes remain unchanged; refreshed source completion/mapping and the stable local identity/name/current/pending targets survive a new application instance. No real external query or write is performed by this test.

## Verification disposition

- Catalog application suite: 11 passed, including actual source publication, real canonical file writes/readback, fresh-instance reads, selection changes and cycle progression.
- Canonical completion/source projection regressions: 12 + 15 passed.
- Habit frontend/controller regressions: 22 passed; actual DOM form probes: 3 passed; frontend TypeScript build passed.
- Earlier broad Rust run: 533 passed, 6 pre-existing ignored, across 27 binaries. Final integration rerun recorded below.
- Broad pre-integration frontend run: 452/492 passed, 40 failed. The one Habit localized-name source assertion was corrected by retaining the existing display-name seam; current focused Habit suite passes. Other failures concern pre-existing Today/Collaboration/Tasks probes. Representative failures reproduce at exact base `1906b87` in `/private/tmp/pdex24-regression-base.noindex`: `compactScheduleTransactions`/`todaySideRegion` VM fixture references, Daytime rail parser assertion, selected slash contrast, empty795 composer assertion, and native plan-editor timeout. Baseline comparison logs are `/private/tmp/pdex24-baseline-regressions.log`, `/private/tmp/pdex24-baseline-layout-regressions.log`, `/private/tmp/pdex24-baseline-plan-regression.log`. The full frontend run is not reported green.

Native packaged save/reopen acceptance and PDEX-25 detail/statistics/lifecycle remain separately pending. No normal App install, remote Git, external write, main merge or dependency change occurred.


## Integration synchronization and final checks

- Merged integration tip `b96b77d` (PDEX-19 + PDEX-23 and verified claims) into the worker branch, preserving both histories. The sole conflict was disjoint appended CSS; all scoped Task/Collaboration/Habit rules were retained.
- Post-merge `npm run build`: passed.
- Post-merge focused frontend checks (Habit/controller/localized-name/canonical navigation + Task refinement + Collaboration context): 29 passed.
- Post-merge actual DOM Habit form: 3 passed at wide/narrow widths and pending-threshold editing.
- Post-merge integration workflow binaries: 440 passed, 0 failed (24 binaries).
- Parallel unit run: 101 passed, 6 ignored, one `DirectoryNotEmpty` cleanup failure in the unchanged `collaboration::history_tests::later_full_history_snapshots_preserve_first_native_readback`. That exact test passed on isolated rerun (1 passed); its function is unchanged from `1906b87`. The whole parallel unit run is not claimed green. Logs: `/private/tmp/pdex24-postmerge-rust.log`, `/private/tmp/pdex24-postmerge-workflows.log`.
- No unresolved merge markers or whitespace errors. Native packaged acceptance remains pending.


## Final preservation guard — unconfigured sourced weekly Habit

Red: editing only the name of a sourced weekly Habit without a configured goal converted its displayed frequency to daily and disabled its existing check-in behavior.
Green: catalog defaults retain the source tracking kind, known-day count and local check-in capability. Giving that existing weekly Habit a target schedules it for the next Monday; once it activates, the summary's unconfigured-goal exclusion clears. Source tracking kind is validated and defaults safely when absent in older catalog data. Final targeted application checks: 12 catalog + 12 canonical completion + 15 snapshot tests passed (39 total). This final change does not alter the settings UI or unrelated domains.
