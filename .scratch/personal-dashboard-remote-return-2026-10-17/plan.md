# Personal Dashboard — GitHub return plan · 2026-10-17

Status: archive preservation and 46-record GitHub migration verified. PRs #67/#68 are merged; final integration and branch cleanup follow [PR #69](https://github.com/absurdwall/personal-dashboard/pull/69). See the [publication receipt](publication-receipt.json) and [canonical issue mapping](github-issue-mapping.md).

## Confirmed decisions

- Keep three cumulative product PRs and preserve original commits with merge
  commits. Main remains protected. Include the finished InitialPlan repair and
  these authorized record updates in PR 3.
- Preserve all inventoried feature-branch tips remotely as annotated archive
  tags, plus the existing local-only Collaboration prototype archive tag.
  Delete feature branches only after remote preservation and main integration
  are verified. End with `main` as the only local and remote branch; tags remain.
- Migrate exactly 46 existing records: 8 specs/addenda and 38 tickets. Preserve
  IDs, full bodies, parent/blocker links, current dispositions, historical
  comments/answers and evidence. A spec index and its full body are one issue.
- PDCR-03/12 are closed-deferred because Dida work is not urgent and its future
  role may change. PDCR-11 is closed-retired: its remaining old acceptance
  matrix is no longer required, rather than deferred or reported as passed.
  [User decision](../personal-dashboard-collaboration-redesign/evidence/ticket-disposition-2026-10-17.md).
- Use at least two seconds between successive GitHub writes within this
  project's publication/update batch, as defined in
  [Issue Tracker](../../docs/agents/issue-tracker.md#write-pacing). No shared
  cross-project queue or local hourly write counter is requested.

## Prepared inventories

- [Branch/archive manifest](branch-archive-manifest.json): 38 branches at the
  inventory checkpoint (main plus 37 feature tips). Refresh before execution
  if work advances; retain both the inventoried tips and final published head.
- [Issue migration manifest](issue-migration-manifest.json): exact 46 identities,
  38 parent links and 35 historical direct blocking edges. GitHub number/URL
  fields remain empty until publication is confirmed.
- At inventory head `f9e194e`, the product line has 448 commits beyond remote
  main `a4594a1`; other branches retain 216 more. A local-only prototype tag
  retains one additional commit, the stash three, and Codex recovery refs two
  more: 670 commits across local refs absent from advertised remote history.
  These preparation commits add to those counts; recompute before publication.

## Execution sequence and completion criteria

1. **Freeze and preserve.** Recheck account/repository, remote refs, branch tips,
   worktrees and dirty files. Create and verify a private all-ref Git bundle,
   with the stash and Codex recovery refs. Preserve ignored private artifacts
   separately. Inventory and inspect unpublished history/evidence for personal
   data or credentials before public upload; the current repository is public.
   Completion: recoverable backup and explicit publication ref list verified.
2. **Archive historical branches.** Create annotated tags from the manifest,
   carrying original branch name/SHA and whether the line is accepted,
   prototype or superseded. Publish explicit tag refspecs and the existing
   local-only prototype tag. Read back exact remote tag objects/peeled commits
   and verify a fresh fetch can reach every inventoried feature tip. Keep the
   stash, raw recovery snapshots and private runtime exports in private backup.
   Completion: all 37 feature identities and their unique histories recoverable
   from remote archives; no superseded tree merged into the product.
3. **Publish three product PRs.** Proposed checkpoints:

   | PR | Scope | Retained checkpoint |
   | --- | --- | --- |
   | 1 | Collaboration redesign and preceding repairs | `45dceae` |
   | 2 | First experience round and accepted follow-ups | `8a0dba0` |
   | 3 | Accepted refinement, workflow repair, InitialPlan repair and publication records | final prepared head, descendant of `f9e194e` |

   Publish on `codex/` branches, review cumulative differences in order and
   merge through protected-main PRs using merge commits. Original checkpoint
   increments are 112 / 218 / 118 commits, before these preparation records.
   Run required checks on the appropriate isolated source; do not replay the
   retired PDCR-11 acceptance matrix. The InitialPlan record reports 40 full
   frontend failures (496 passes). The subsequent [failure investigation](frontend-failure-audit.md)
   identifies 19 incomplete test harnesses, 12 obsolete UI paths, six obsolete
   or invalid assertions and three layout scenarios needing current-page
   review. Relevant frontend/test inputs are identical to pre-repair `e2102da`.
   Maintain the tests, review those three layouts and rerun before claiming
   green verification or merge readiness. Keep repairs scoped rather than
   silently turning publication into a new product iteration.
4. **Migrate the 46 records.** Deduplicate against GitHub, publish full bodies
   in parent/blocker order, resolve all local references, and record returned
   numbers/URLs immediately. Preserve authored history and original unrun
   checkboxes; add current disposition so old dated states are not mistaken for
   current state. Finish with all 46 closed: 43 retain accepted closeout and
   three use `not_planned` (PDCR-03/12 deferred; PDCR-11 retired). Preserve parent
   and blocker relationships as historical graph, not an active frontier.
   Verify every body/state/relationship, then commit the ID-to-Issue mapping
   and update tracker pointers to GitHub. Local files become historical support.
   The InitialPlan repair is linked from the owning spec/current evidence; this
   batch does not invent a 47th issue. Completion: exactly 46 verified mappings
   and one canonical live tracker. Publication/mapping may need follow-up
   pushes to PR 3; three PRs is not a promise of exactly three push commands.
5. **Reconcile Management and clean branches.** Use the installed Management
   helper and existing workspace/Registry binding, preserving the canonical
   GitHub source and historical local sources. Confirm native publication and
   summary outcomes separately. Before deletion, verify main reaches the
   accepted final product commits and remote archive tags reach every other
   inventoried tip. Recheck dirty/untracked files and recoverability. Remove
   feature branches only within that verified inventory. Completion: local and
   remote branches contain only main, archive tags remain, working tree clean,
   all unique history recoverable and any Management gaps explicitly reported.

## Boundaries retained

- Preparation verified the installed Management helper 1.0.3 and the existing
  canonical project/workspace binding through connect/discover/reconcile. Its
  read-only reconciliation reports `summary-needs-reconciliation` and
  `source-source-personal-dashboard-codex-collaboration-malformed`. Preserve
  these existing gaps for the migration handoff; no new Registry, source
  identity substitution or summary write is part of local preparation.
- Existing 18 open GitHub issues are a separate historical reconciliation set.
  They are not part of the 46 new records and are not automatically closed or
  reimplemented by this migration. Classify overlap and remaining evidence
  separately; keep their current state until that disposition is authorized.
- No dependency/service/deployment addition, App replacement, personal data
  write, Dida test, voice capture or extra acceptance round is part of this
  publication/cleanup plan.
- The sequence above retains the original execution plan. Archives and issue
  migration are now confirmed, and GitHub is canonical. PR #69 and final native
  refs provide the authoritative final integration/cleanup state; this record
  is committed before that PR merges.

## Verified execution checkpoint

The repair #66 is closed under direct user authorization. Its final report
confirms 537 frontend passes, zero failures/skips and independent Standards/Spec
reviews with no findings. The actual archive inventory expanded to 38 feature
branches after that repair; 39 remote archive tags (including the existing
local prototype tag) were verified through a fresh fetch. All 46 historical
records are published, closed and fully mapped with native relationships.
Later publication-record changes do not alter the verified product objects.
