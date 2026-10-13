# PDEX-SPEC-02 — three confirmed P2 review repairs, 2026-10-13

Review source: code-review against base `918e7e0`, examined HEAD `16f5e2d256fddc1a773486051ae255035d0b9edd`. The review chat delegated the three confirmed issues back for implementation, targeted validation and subsequent recheck. Acceptance/installation/main/remote boundaries remain unchanged.

Working integration: `codex/dashboard-experience-refinement-integration`.
Implementer: `/root/pdex19`, one worker for all three review findings.
Worker branch: `codex/dashboard-experience-refinement-review-fixes`.
Worker starting tip: `16f5e2d256fddc1a773486051ae255035d0b9edd`.

| Finding | Required correction | Current state |
| --- | --- | --- |
| Standards P2 | Route new Habit settings/details and Task tag/folder fixed labels/messages/diagnostics through docs/interface-language.md; preserve user text/raw diagnostics. | in progress |
| Spec P2 | Include Calendar draft parentId in create/save/readback/exact retry. | in progress |
| Spec P2 | Explicit read/rebase path for retained Task drafts after document revision changes; retain draft and protect simultaneous same-Task changes. | in progress |

Existing full frontend baseline remains 540 tests: 510 pass, 28 fail, 2 skip. This work uses the authorized real application/public production-DOM seams for the three repros, not source-string checks. No full native evaluation, new dependency, normal App installation or external operation is requested. Completion returns exact commits, targeted checks and unresolved findings to the review workflow; it does not close native acceptance or the parent spec.

Earlier implementation handoff/evidence remain historical. This record supersedes their no-active-code-repair state only for these confirmed findings. Detailed repair results will be recorded in `evidence/pdex-review-fixes-implementation-2026-10-13.md`.
