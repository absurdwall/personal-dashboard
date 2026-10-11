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


## Human quota acceptance decision — 2026-10-11

The human explicitly accepted the quota-exhaustion criterion and waived further actual exhaustion testing in review chat `01a128ff-8865-7493-9698-cc48c19d7939` (direct user reply `01a12969-8b59-76a3-a544-d67411f4656f`). The quota subgate is **accepted by human waiver on existing evidence**, not an observed exhaustion result. No controlled injection, new model request or artificial quota spending is required or performed. Historical statements that actual exhaustion was not established remain true observations; their pending-test/blocker status is superseded by this explicit decision.

PDEX-11's conflict/write-failure/unconfirmed-result combined criterion is now checked: existing qualified source/persistence/production native evidence supports those constituents, and the quota constituent is explicitly accepted by the human. Remaining required gates are real Sogou composition, sustained native edge/active resize cancellation and fresh final-installed 830×758 narrow-window behavior. PDEX-09/PDEX-11 remain blocked, parent open, and nine other tickets resolved. [Current manual checks](manual-acceptance.md) no longer asks for quota exhaustion. Installation remains confirmed and does not by itself close the remaining gates.


## Human IME acceptance and PDEX-09 resolution — 2026-10-11

The direct human message `01a1296a-888d-7193-9c10-77ca83962f5f` in review chat explicitly accepts the real Chinese IME criterion on existing evidence and waives dedicated native composition testing; normal daily Chinese use will supply future issue feedback. This is **human acceptance/test waiver**, not an observed OS composition result. Existing keyboard/completion/ordinary-slash/draft checks and independent review are complete, so PDEX-09 is now locally resolved/closed with all acceptance criteria accounted for. The same shared IME subgate is accepted for PDEX-11. No additional test message, input-source change or model request is required.

Current tracker: ten resolved, one blocked (PDEX-11), parent open. PDEX-11's slash/draft/date/Evening combined criterion is checked using existing qualified behavior evidence plus the explicit IME waiver; its quota/conflict/failure criterion is already accepted as recorded above. Only sustained native edge dragging/active gesture cancellation and resize, plus fresh final-installed 830×758 narrow-window behavior remain required. [Current two manual check categories](manual-acceptance.md) supersede earlier pending-IME/quota lists without erasing historical observations. Installation is confirmed; full native acceptance and parent closure remain pending these two categories.


## Direct human acceptance and initiative closeout — 2026-10-11

The human confirms plan time-bar drag with visible plan-time revisions, timeline drag-selection to create a Task, narrowed Calendar usability and correct-looking overlap entries in the actual installed normal App. The reviewer additionally observed saved-and-readback-verified feedback and revision records through read-only UI inspection, and accepts the round on existing implementation/automated/native evidence plus these direct human results. [Final local acceptance record](evidence/human-acceptance-2026-10-11.md) retains exact message/provenance pointers and evidence qualifications.

Today narrow-window time-axis compression/partial occlusion from the retained Items without a precise time side column is explicitly accepted by the human as an interface limitation; optional improvement does not block this round. Sustained held-edge auto-scroll, active-drag resize/cancel and exact final-installed 830×758 geometry were not separately observed: no claim of per-step performance or a direct human waiver is made. IME/quota retain their separate explicit acceptance/test waivers.

PDEX-11 is now resolved/closed; all eleven tickets and PDEX-SPEC-01 are locally resolved/closed, with no current initiative blocker. Earlier parent holds prevented acceptance inferred solely from automatic checks; this direct human installed-App acceptance and independent reviewer overall conclusion provide the missing basis for parent closure. No product changes, live UI action, personal-data write or new model/test request were performed by implementation closeout. Product diff from reviewed `ffa1b85` is zero. Historical records remain; no main/remote publication or tracker migration is inferred.
