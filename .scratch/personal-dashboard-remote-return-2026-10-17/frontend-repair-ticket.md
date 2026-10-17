# 前端回归维护：修复 40 个失败并核查三个布局场景

## Problem

The current InitialPlan repair version's full frontend run reports 496 passing
and 40 failing tests, not four failures. Before GitHub product publication, make
the frontend checks trustworthy and resolve any confirmed bounded UI defect.
The user explicitly authorized one maintenance ticket and implementation in a
new GPT-6.1 Sol / High session. No additional feature specification is required
for the currently known scope.

## Existing diagnosis

Investigation checkpoint: local commit `80f839b`, descended from the accepted
product and InitialPlan repair. Remote main is still older; do not reset or
start implementation from remote main and lose the local work.

Relevant frontend, frontend-test and build-input Git objects are identical to
pre-InitialPlan `e2102da`. Thirty original failures were individually reproduced
on that baseline; ten additional plan cases share a demonstrably obsolete
bootstrap and were not individually rerun after an SDK mismatch. Classification:

- **19 incomplete test harnesses:** extracted functions lack fake VM globals,
  helpers or realistic DOM methods. Examples include Vault reset's missing
  calendar-draft helper, popup helpers, task-history focus state and a folder
  selector returning a value-only object. Some exceptions are swallowed by
  fake error handlers. Preserve the intended behavioral checks and ensure
  corrected setup does not merely conceal subsequent failures.
- **12 obsolete UI paths:** eleven plan tests wait for retired inline detail
  buttons. The current editable marker is a button opening the plan-time modal;
  a direct baseline DOM probe confirms opening without captured JS errors. One
  startup-language test incorrectly expects an anchor href. Restore meaningful
  save/readback, precision, retry, conflict, language and source-binding checks
  through the current UI.
- **6 obsolete/invalid assertions:** help disclosure nesting, exact old class
  string, fixed context offset, old rail/toggle structure and a contrast test
  treating a transparent option as black while its parent is opaque white.
  Verify current intended behavior, including actual composited contrast.
- **3 unresolved layout scenarios:** 640x756 expanded Collaboration history
  clips the composer in the isolated fixture; two 640px quick-schedule fixtures
  fail same-row/readability/width expectations. Reproduce through the complete
  current page/controller and distinguish stale fixtures from product defects.
  Only make bounded product changes for a confirmed defect. If this requires a
  new interaction design or broad redesign, report the finding for a scope
  decision instead of silently expanding this ticket.

The repository contains the complete diagnosis and exact 40-case inventory at
`.scratch/personal-dashboard-remote-return-2026-10-17/frontend-failure-audit.md`
and `frontend-failure-inventory.json`. These are committed locally and will
become remotely reachable during the later publication flow. They are supporting
evidence; this GitHub issue is the canonical new work item.

## Acceptance criteria

- [ ] Account for all 40 original failures with a specific disposition and
  meaningful passing regression coverage; inspect any newly exposed failure.
- [ ] Repair harnesses and obsolete UI paths without deleting, skipping or
  weakening the business protection to get a green result. A function being
  absent only from the fake VM is not a production defect.
- [ ] Exercise current plan-marker/modal behavior for the original timing,
  precision, save/readback, uncertain/failed-save, retry and source-binding
  scenarios rather than claiming success from opening one modal.
- [ ] Reassess the three layout scenarios against the complete current page,
  retaining usable composer/action targets and readable accessible scheduling
  controls. Record any confirmed product fix with before/after evidence.
- [ ] Run the production frontend build, focused tests during repair, and the
  full frontend suite at the end with zero unexpected failures. Report pass,
  fail and skip counts and source identity; retain existing legitimate platform
  qualifications. Verify a matching Swift compiler/SDK for macOS WebKit probes;
  change only the test command environment when necessary, not global tools.
- [ ] If production behavior changes, run relevant adjacent checks and perform
  the repository's Standards and Spec code review. Keep accepted product
  behavior and personal-data boundaries intact.
- [ ] Commit coherent changes on a `codex/` branch with a source-bound repair
  report. Leave the original 46-record migration manifest intact; this is a
  separate new maintenance issue, not an invented replacement PDEX/PDCR ID.
- [ ] Report readiness and any remaining limitations. No product push, PR merge,
  branch deletion or App installation is part of this repair ticket; the owning
  publication flow resumes after this repair is verified.

## Scope and execution

Use the existing implementation/TDD/review workflow at the appropriate seams.
Maintain tests first where the failure is in the harness; retain a red/green
reproduction for genuine product defects. One bounded maintenance iteration is
the intended scope, not a guarantee that unforeseen layout issues are trivial.

No new dependency, external service, Dida test, personal Vault/profile mutation,
microphone capture, App replacement, broad redesign or retired PDCR-11 matrix
is authorized. PDCR-03/12 remain closed-deferred and PDCR-11 closed-retired.
Follow the project-local minimum two-second interval between GitHub writes.

## Blocked by

None. The existing diagnosis is ready for implementation.
