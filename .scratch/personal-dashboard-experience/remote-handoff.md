# Dashboard experience — retained local history and remote handoff

Date: 2026-10-10
Canonical tracker: [local map](map.md)
Specification: PDEX-SPEC-01
Working branch: codex/dashboard-experience-integration

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


## Implementation handoff — 2026-10-10

Exact requested base `8960c80bc81ae35a7dcd871dd104f4b3d04497de` is retained as an ancestor. Ten implementation merges and all bounded repairs remain unsquashed on `codex/dashboard-experience-integration`; frozen product source is `256ecd01aab9e92ef6bf139d7d83ccc2ae671aee`. Documentation merge `4fecefd7ad7cacf0b0e33b13d69f3c1f60102c3d` precedes this final local closeout commit, whose exact identity is available in branch history.

Nine component tickets are resolved; PDEX-09/PDEX-11 have explicit native acceptance blockers. Parent PDEX-SPEC-01 stays open. Full automated checks and independent reviews passed; [candidate evidence](evidence/pdex-11.md) retains actual native results, source hashes and missing gates. Worker cleanup does not remove the isolated candidate or synthetic fixture. Reopen only with `/tmp/pdex-final-launch.py`, whose clean-tree/product-source checks and private environment avoid default-profile access. Do not install or launch it through Finder.

No push, GitHub operation, protected-main merge or installation occurred. Future tracker migration or remote integration still requires the existing handoff workflow above.

## Review repair handoff — 2026-10-11

No-ff merge `51f728782db3b1e376e8d540ce368a98a8e8a5f6` retains all four bounded repair/test commits and worker evidence tip `3660baa`. Product source `4a0c272` passed build, 432 frontend, 23 browser and 523 native checks (six existing ignores); independent fix review is pending. The earlier `256ecd0` package is historical and does not contain these fixes; the safe launcher rejects this source difference. PDEX-09/PDEX-11 blockers and parent state remain unchanged. No remote/main/install operation occurred.


## Repair closeout — 2026-10-11

Frozen product checkpoint `6656041b518fe979c1318a7e7f87a2c14503cd42` independently cleared both review axes. Manual Task retry identity and Evening localized date/guard copy repairs retain full history. Build plus 21 focused final tests passed; native source matches the 523-pass checkpoint, earlier 432 frontend/23 browser totals are historical. [Exact independent verdict and artifacts](evidence/code-review.md). PDEX-09/PDEX-11 remain blocked and parent remains open. Previous package is historical; no main merge, remote publication, installation or real-data change. Only the owned repair worker is eligible for cleanup after clean inventory/reachability checks; unrelated branches remain intact.


## Rebuilt B repair handoff — 2026-10-11

Final reviewed checkpoint `f82ef664961b4f01066bd05c4b4fd8a0bea92350` retains all original implementation, repair, evidence and no-ff merge history from requested `8960c80`. Frozen B product source `ffa1b85056fe3f2bc3ab68ce652001b3b6f9537e` is identical to final code/test `20515dd`; subsequent closeout is docs-only. Both independent axes and review root are satisfied with the bounded repair scope. Current build/focused checks pass 43/43; earlier full-suite results retain their exact historical ranges.

[Source-bound B native report](evidence/native-acceptance-2026-10-11-b.md) and immutable A/B indices distinguish actual native results, seeded history and missing gates. Both temporary candidates are stopped/unregistered, retained under `.noindex`; do not launch via Finder or a default profile. Candidate B's guarded `/tmp/pdex-acceptance-20261011-b.noindex/launch.py` binds the exact executable, synthetic profile/Vault/clock and root source checks. A's older source remains historical. Fresh B narrow-window, real IME, held-edge/active resize and authenticated quota checks are still unverified; PDEX-09/11 remain blocked, parent open. Installed App and unrelated branches are retained. Main/remote/install operations remain separate authorized outcomes.


## Authorized normal local installation — 2026-10-11

The human explicitly authorized replacing the daily installation so manual acceptance can continue. `/Applications/Personal Dashboard.app` is now a fresh production-config build of reviewed `6af1198`, product-identical to B `ffa1b85`, executable `a6a277f68b25002f88c4958ed56a93c19b7497dc36eb49fa571a2f7b85b3d833`. Normal identifier/title/profile/clock and existing real connection are retained; recoverable old bundle and complete private profile backup were verified before swap. [Installed provenance and preservation](evidence/local-install-2026-10-11.md) distinguish JSON serialization/runtime metadata from unchanged personal content. Sole searchable installation is the Applications path. Earlier no-install checkpoints remain historical.

[Current human/environment unblock guide](manual-acceptance.md) supersedes stale pending summaries without erasing them: real Sogou composition, held edge/active resize and fresh final-installed 830×758 need manual checks; authenticated quota exhaustion requires a naturally exhausted account, with no artificial spending. PDEX-09/PDEX-11 stay blocked, parent open, other nine tickets resolved. No main merge, remote publication or personal-record edit occurred.
