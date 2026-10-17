# Frontend failure investigation — 2026-10-17

## What the 40 means

The InitialPlan repair's full frontend run reported 496 passes and 40 failures
on the repaired source. The result is not an uncommitted-code inventory and is
not evidence of 40 independent product defects. The code and result summary
were already committed. This investigation diagnoses those failures; it does
not fix product code or tests and does not claim a green suite.

Investigated head: `579f0ab`; pre-InitialPlan baseline: `e2102da`.
The Git object identities for `frontend/`, `tests/frontend/`, `package.json`,
`package-lock.json`, `tsconfig.json` and `scripts/prepare-frontend.mjs` are
identical between them. Thus the failing frontend/test source predates the
InitialPlan repair; this does not imply those tests pass in the current product.

[Exact 40-case inventory and source object identities](frontend-failure-inventory.json).

## Findings and next actions

| Category | Count | Diagnosis | Next action |
| --- | ---: | --- | --- |
| Incomplete isolated test harnesses | 19 | Extracted production functions reference real globals/functions or DOM methods absent from their fake VM/DOM setup. | Repair test fixtures/dependency setup, preserving behavior assertions; rerun to expose any further failure underneath. |
| Obsolete UI test paths | 12 | Eleven plan tests wait for a retired inline detail-button path. One language test expects an anchor `href` after editable markers became buttons. | Exercise the current marker/modal UI while retaining the save/readback/recovery/date assertions. |
| Obsolete or invalid test assertions | 6 | Old help nesting, exact class string, fixed context offset, old rail/toggle structure, and contrast calculation ignoring transparent-background compositing. | Update assertions to the current intended behavior, including actual accessible targets and composited contrast. |
| Layout scenarios requiring current-behavior review | 3 | A 640×756 expanded-history fixture clips the composer; two 640px quick-schedule fixtures fail geometry/readability expectations. | Reproduce against the complete current page/controller, then distinguish outdated fixture/expectation from a product layout defect. Change product CSS/behavior only if the issue is real under the intended current flow. |

These are 37 test-maintenance diagnoses and three unresolved layout scenarios.
They are not a promise that editing 37 tests will make all of them green: several
harness failures prevent later behavioral assertions from running at all.
Real behavioral checks must remain meaningful after maintenance.

### Incomplete harness details (19)

- `collaboration-draft-refresh` (6): the copied Vault-reset function calls
  `stashCalendarTaskCreateDraft`, absent from the VM. The production error
  handler is stubbed to silence, so assertions misleadingly report uncleared
  Collaboration state. A diagnostic-only copy exposed that exact ReferenceError.
  Adding the missing entry stubs reaches another missing fake global,
  `habitDefinitionDialog`; a superficial first green assertion is insufficient.
- `collaboration-native-file-refresh` (1): missing `compactScheduleTransactions`.
- `collaboration-short-record` (1): missing `closeTodayAxisFactPopup`.
- `lived-day-rendering-regressions` (3): the fake `querySelector` returns a
  value-only object for a folder selector; production expects an actual element
  with its own `querySelector`.
- `task-history-editing` (2) and `task-history-render` (6): missing popup or
  `taskHistoryFocusDisclosureRequest` dependencies in extracted renderer setup.

The missing runtime names exist in the production module. These failures are
not proof that the complete application lacks those functions or globals.

### Current UI path and contrast probes

The unmodified baseline production page was built in a private temporary
archive. A diagnostic probe observed:

- no `.today-axis-entry-detail` nodes, despite that being the plan tests'
  bootstrap wait condition;
- editable plan marker is a `BUTTON`;
- clicking that current marker opens `dialog.plan-time-editor[open]`, with no
  captured JavaScript errors.

This demonstrates the old test bootstrap is invalid, not that all eleven
save/retry scenarios have been freshly accepted through the replacement path.

The slash-menu contrast test measured a transparent option background as black.
The actual menu parent is opaque white (`rgb(255, 255, 255)`), with option text
`rgb(35, 39, 36)`. Its reported 1.39 ratio does not describe the composited text
contrast. This probe does not separately accept the selected-option highlight.

The long-help test assumes two independent `details` nodes, but the current
privacy text is inside the same help disclosure that the test opens. The
context test hardcodes 42px while current geometry yields 38px. Other static
tests expect an exact old class string or prior rail/toggle arrangement.

### Three layout findings retained

- Expanded-history Collaboration at 640×756: the isolated fixture reports
  composer bounds approximately 738–893px while the viewport ends at 756px.
  This is a concrete failing fixture geometry, not an installed-App verdict.
- Today quick schedule at 640px: the name input measures only 14px wide and
  the name/schedule/submit centers do not satisfy the same-row test tolerance.
- Tasks quick schedule at 640px: the schedule control measures about 100px
  against an old 124px minimum, with label content 110px inside 64px. The full
  date/time remains in title/aria text; intended truncation versus insufficient
  visible readability still needs a current-flow decision.

## Reproduction and evidence limits

- `node --test tests/frontend/collaboration-draft-refresh.test.ts` on the
  current checkout reproduces its six original failures.
- On an isolated `git archive e2102da`, nine fast test files reproduce 20
  original failures (104 tests: 84 pass / 20 fail).
- The baseline note/editor tests reproduce their three original fixture errors.
- Six native-rendered failures were individually reproduced with an explicit
  matching Xcode SDK: help, contrast, expanded-history layout, two quick-schedule
  layouts and startup-language selector failure.
- The first original plan test reproduces the WebKit timeout on the baseline.
  The other ten share its bootstrap, which the direct DOM probe disproves;
  they were not individually rerun to the original timeout after SDK pinning.
- An initial native baseline batch encountered a Swift 6.3.3 / CLT SDK 6.4
  mismatch. Those compiler failures are an environment confound, not counted as
  reproductions of the original UI assertions. Pinning the matching Xcode SDK
  resolved that confound for subsequent targeted runs. No global toolchain
  preference was changed.

Original run log: `/private/tmp/pd-initial-plan-frontend-tests.log` (SHA-256 in
the inventory). New private scratch/evidence is under
`/private/tmp/pd-frontend-failure-audit-k_sw4ku_.noindex/`, including baseline
TAP results and diagnostic-only copies. Product source and production tests
were not edited. No installed App, personal profile/Vault, Dida object or
GitHub state was changed.

## Publication action item

Before claiming green verification for the product PR, maintain the outdated
tests, investigate the three layout cases on the complete current page, and
rerun the affected checks followed by the full frontend suite. If a real
product defect remains, give it a bounded repair scope and meaningful evidence.
This is current test maintenance and targeted regression investigation; it
does not resume the retired PDCR-11 historical acceptance matrix.

Archive preservation and draft PR publication can proceed with these findings
disclosed. Final merge readiness still requires an honest check disposition;
neither accepting old tickets nor having committed the code makes tests pass.
