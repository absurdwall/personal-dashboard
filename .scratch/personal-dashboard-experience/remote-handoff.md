# Dashboard experience — retained local history and remote handoff

Date: 2026-10-10
Canonical tracker: [local map](map.md)
Specification: PDEX-SPEC-01
Working branch: codex/dashboard-experience-prototype

## Retained identities

- Product/source base before prototype work: 45dceaef.
- Prototype history: 458b766 (A/B/C), 6944768 (F), ed82aa0 (R),
  fbd367a (Morning text/compact month), e0e339b (accepted R decision).
- 14df60e recorded the first specification draft and domain vocabulary.
- ae191ee deleted/replaced that draft with the requested to-spec format,
  preserving the user's correction and Q4 rather than rewriting commit history.
- The commit containing the local tracker publication is the next durable checkpoint.
  Its hash is obtained from Git history; future implementation adds coherent commits.
- Local specification publication was committed at 430b486; the reviewed
  ticket-breakdown proposal at 11440a5. The subsequent approved PDEX-01–11
  publication commit adds full bodies, dependencies and execution conventions
  while preserving the parent specification unchanged.

## Local execution convention

Subsequent authorized tickets are complete local records with stable PDEX IDs,
parents and dependencies. Record claim, branch/base, implementation commits,
review commits, checks, native acceptance and unresolved blockers. Commit durable
changes as they happen. Preserve unrelated files and do not squash away the
retained history.

Prototype sources are throwaway design evidence. Keep them reachable, but build
production changes against the real product modules; the prototype overlay is
not itself production implementation.

## When remote access returns

1. Verify remote access and the then-current protected-main state. Preserve the
   local branches and commits before reconciliation.
2. Push the retained feature/integration branch through the ordinary project
   workflow and use a PR for protected-main integration. Do not force-push,
   reset main or collapse retained history just to look like earlier remote work.
3. If tracker migration is requested, create/update GitHub Issues from full local
   bodies and retain a mapping of PDEX ID, local path, Issue number/URL, parent,
   dependencies, triage, lifecycle, comments, claim and acceptance evidence.
4. Reread remote results and only then record the canonical handoff. Keep links
   from local records; never discard their commit and review history or leave
   two ambiguous active queues.

Git push transfers Git commits; it does not turn Markdown records into GitHub
Issues. Remote push/PR integration, tracker migration, installation and acceptance
are separate future outcomes. This local publication does not perform them.
