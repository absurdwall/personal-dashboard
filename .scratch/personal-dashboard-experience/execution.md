# Dashboard experience — local execution record

Date: 2026-10-10
Canonical tracker: [map](map.md)
Parent specification: PDEX-SPEC-01
Stage: implementation/reviews complete; native acceptance partially blocked
Working branch at publication: codex/dashboard-experience-prototype

## Publication checkpoint state (historical)

PDEX-01–11 are ready-for-agent/open/unassigned, with all acceptance boxes
unchecked. No ticket has been claimed. Eligible frontier: PDEX-01, PDEX-03,
PDEX-05, PDEX-06, PDEX-08, PDEX-09 and PDEX-10. Eligibility does not itself
authorize starting implementation.

## Later authorized execution

1. Read the current full ticket, parent domain decisions and direct blockers.
2. Record the claim's owner, date, branch/worktree and base in the ticket and map
   before implementation; preserve unrelated dirty work.
3. Keep the vertical slice usable, and commit coherent code and record increments.
   Preserve complete local history, including fixes and reviews.
4. Verify its external behavior through Q4's existing application/persistence
   and actual UI boundary. Retain synthetic-data identities, commit/candidate,
   checks, readback, failure/recovery and packaged acceptance evidence.
5. Record unmet criteria as incomplete or blocked. Close only with the ticket's
   required evidence, and reconcile map/body together. Do not infer installation,
   remote integration or closure of the parent from ticket completion.
6. Use [remote handoff](remote-handoff.md) to preserve identities for later
   branch push and any separately requested tracker migration.

## Publication checkpoint

- 2026-10-10: User approved the eleven-ticket graph. Full PDEX-01–11 bodies are
  published with ten direct blocking edges and 68 unchecked acceptance criteria.
  Parent spec and index remain unchanged. No implementation, installation,
  remote push or parent closure occurred.

## Implementation run

- 2026-10-10: Authorized full local implementation. Integration: codex/dashboard-experience-integration; exact base 8960c80bc81ae35a7dcd871dd104f4b3d04497de. Working tree initially clean. Individual implementers use codex/pdex-NN worktrees and merge integration before reporting. All merges preserve complete history. Parent spec closure, installation, main merge and remote publication remain separate boundaries.

- 2026-10-10: Installed tortilla-flat-management connect/discover/inspect confirmed canonical product-personal-dashboard and source-personal-dashboard-experience; 12 records, current, no malformed references, source revision a46f6fedb8e9e08b. Inspection scoped only to this local source. Frontend pre-implementation baseline: 388 tests passed. Rust baseline runs independently before changes.

- 2026-10-10: Initial Rust baseline invalidated by concurrent shared-target binary replacement: canonical suite executed PDEX-06 new test absent from canonical sources. This is orchestration evidence contamination, not an established baseline product failure. Workers moved to isolated Cargo targets; final integrated suite will be run serially after merges. Frontend baseline remains valid.

- 2026-10-10: Claimed ticket metadata now exposes Triage separately from native Status and Assignee so the installed local source reader can observe work-in-progress instead of treating claimed records as unassigned ready work. Lifecycle/acceptance remain independent; stable IDs, bodies and map triage are retained.

- 2026-10-10: PDEX-01 code integrated at 32b3678, with 11 isolated business workflows and frontend build green. PDEX-02 starts against this verified implementation prerequisite; acceptance/closure of PDEX-01 remains open until actual UI and packaged evidence. Implementation dependency readiness and delivery acceptance are recorded separately; no blocker has been falsely closed.

- 2026-10-10: PDEX-06 code integrated at 61c12cd with isolated persistence/adapter/Collaboration evidence. PDEX-07 now starts against the verified Task interval prerequisite; PDEX-06 UI/delivery acceptance remains open and is not inferred from code integration.

- 2026-10-10: PDEX-03 integrated at 06c0d0b; nine real WebKit cases at approved widths/heights and 406 merged frontend tests passed. PDEX-10 receives an exclusive serialized lease on the canonical Cargo cache for native session/draft tests; all other native workers use their own isolated caches, and root performs no Cargo build until this lease is released. This does not re-enable concurrent shared-target verification.

- 2026-10-10: PDEX-02 integrated at a77603e. Precision/source compatibility and five actual production-page modal cases verified. PDEX-04 starts against this verified editing prerequisite; PDEX-07 supplies the shared pointer controller when integrated. Delivery acceptance remains independently pending.

- 2026-10-10: PDEX-10 integrated at 684ac8b, with 138 native and five real WebKit entry workflows verified. Canonical Cargo cache lease released with no owned native process remaining; subsequent root checks may run serialized. PDEX-08 is claimed for compact Calendar source/state/layout verification.

- 2026-10-10: PDEX-07 integrated at 9618219, shared pointer controller available to PDEX-04. PDEX-05 claimed for compact Task list/details with existing persisted interval contract. PDEX-08 currently holds the exclusive canonical native cache lease; all other native builds remain isolated.

- 2026-10-10: PDEX-08 integrated at a4fb8ce, including natural five/six-week source contract, four previews/true overflow and real WebKit layout at reference windows. Native cache lease released. Remaining feature code: PDEX-04 and PDEX-05; PDEX-11 remains unclaimed until these verified implementation prerequisites are integrated.

- 2026-10-10: All ten feature implementations are integrated with complete retained commits (PDEX-04 b2eae26; PDEX-05 a12e79f). PDEX-11 is now claimed against code-complete, individually verified implementation prerequisites. Acceptance/lifecycle closure remains open until the integrated evidence gate. Packaging uses only isolated synthetic Profile/Vault/time; original installed App and private data remain outside this run. Parent specification is not closed.

- 2026-10-10: Frozen integrated feature source 9561954 passed the full frontend suite (424/424) and all three real Chromium suites (23/23), using already installed browser tooling and no dependency installation. Full serialized canonical native suite is in progress; PDEX-11 builds its private release target, so test artifacts cannot cross-contaminate. Native packaged UI acceptance remains separately pending.

- 2026-10-10: Serialized canonical native suite completed successfully: 518 passed across 26 suites, zero failures, six existing ignored tests. This supplements 424 frontend and 23 browser checks on the integrated feature candidate; packaged application evidence remains independent.

- 2026-10-10: Independent two-axis review of 8960c80...7672698 found one P2 Standards reschedule retry-payload identity issue and one P2 Spec plan failure-recovery issue. Actual packaged QA separately exposed last-row Calendar clipping caused by native window chrome. All three fixes are assigned to the single PDEX-11 implementer; pre-fix test/packaged evidence remains qualified. See evidence/code-review.md.

- 2026-10-10: User requested Computer Use Virtual Mouse to avoid taking the physical pointer. All subsequent live native UI input uses cua_repl; the previous native-driver pointer evidence is explicitly pre-steering. No input-source change had occurred. Root owns subsequent UI input while PDEX-11 continues source fixes/builds. The isolated unauthenticated Profile uses an explicitly synthetic inspect-only transport for OS/draft tests, refusing every message submission; real authenticated execution remains outside this evidence.

- 2026-10-10: Repair integration `b7b0ba0` and follow-up `3a0935d` preserve all coherent commits. Both independent review axes confirm no unresolved findings. Initial repaired frontend/browser run was invalidated because root omitted the frontend rebuild and the actual-page harness read old dist assets; no product failure conclusion was taken from that run. After an explicit build, full frontend suite passes 431/431 at `3a0935d`. Serialized native suite passes 519 tests across 26 suites, zero failures/six existing ignored tests at `b7b0ba0`; subsequent `07119c9` changes only frontend source/test, so native product source is identical. Browser final checks and final packaged acceptance remain in progress.


## Final native readback and closeout — 2026-10-10

- Root used only Computer Use Virtual Mouse for final live native input. Same frozen source `256ecd01aab9e92ef6bf139d7d83ccc2ae671aee` / binary `32132f656be31fc6f8ecd3b1b2dc5aea20436ab3460f493d8933629321dd5845` passed actual editor/conflict/PermissionDenied/retry, point movement, Task range creation/move/detail/list/clear/complete/reopen, Calendar state/overflow, slash keyboard/click/Escape and current/past Evening checks. Same-binary restart retained real source hashes and both dated drafts with zero messages/work. Installed App is unchanged; candidate was quit through Computer Use.
- Final browser rerun passed 23/23 after explicit frontend build; 431 frontend and 519 Rust tests also passed, zero failures/six existing native ignores. Both review axes are clear. Retained original evidence and invalidated baseline runs are not rewritten.
- Resolved PDEX-01–08 and PDEX-10 through local Answer, Status resolved and Lifecycle closed. PDEX-09/PDEX-11 Status/Lifecycle blocked retain unchecked native gates: real Sogou composition, exact final native reference windows/held long drag, safely induced saved-but-readback-failed and actual authenticated quota exhaustion. [Full final evidence](evidence/pdex-11.md) distinguishes supporting WebKit/browser/application seams from actual package observations. Parent specification remains open.

- Final installed `tortilla-flat-management` helper 1.0.3 connect/discover and inspect with explicit project/source confirmed the existing binding, source `source-personal-dashboard-experience` current at revision `753aa9282bf2dd15`, twelve records and no malformed references. Native states reread: nine resolved, two blocked, one open parent. Registry-provided cached/historical states for other sources are outside this verification; no progress-summary write, new Registry or tracker migration was performed.

## Independent review repair pass — 2026-10-11

- Review chat `01a128ff-8865-7493-9698-cc48c19d7939` independently reviewed `8960c80...c63c805` and reported two P2 findings: manual Task update loses original omitted/null/object execution-end patch identity on change-ID retry, and a language refresh overwrites the past-date Evening label while preserving its past-date click target; its status/error paths also bypass retained copy metadata.
- Existing single PDEX-11 implementer owns both bounded fixes on `codex/pdex-review-repairs`, based on `c63c805`; public TaskApplication/FileTaskStore and actual production-rendered language switching are the authorized regression seams. Canonical debug Cargo lease is exclusive to this worker. Root owns tracker records and reviewer notification. PDEX-09/PDEX-11 native acceptance blockers and open parent are unchanged. No remote/main/install/real-data action is authorized or performed.


## Review repair integration — 2026-10-11

- Integrated the single implementer’s clean tip `3660baa209c0e4f621c3101ddd28f67024910457` with no-ff merge `51f728782db3b1e376e8d540ce368a98a8e8a5f6`. Retained repairs: `4379593` original manual Task update/tri-state retry identity, `e7823ec` dated Evening localized copy/status/error metadata, `361d315` frontend history payload type alignment, and fixture-only teardown synchronization `4a0c272`.
- Exact verified product source is `4a0c272dea10f01e2ef99b16c25e1b341837d02b`; integration product/dependency tree is identical. Build, 432 frontend, 23 browser and 523 Rust passed, zero failures/six existing native ignores. Root verified all retained log hashes and all 26 native result sections. [Repair evidence](evidence/review-repairs-2026-10-11.md) records both red reproductions and the initial full-native failed fixture cleanup separately from final success.
- The native failure was OS66 on removing the synthetic test root after every receipt/source assertion passed. Terminal receipt precedes actual queue-worker teardown; the focused synchronized test observed worker ownership still active. A bounded fixture-only wait preserves the intentional history-write fault and additionally verifies unchanged canonical Task bytes. No production lifecycle change.
- Previous native candidate `256ecd0` and its source/binary checks remain historical. These newer source changes have no new packaged, real Sogou IME or authenticated quota acceptance; PDEX-09/PDEX-11 remain blocked and parent remains open. The old safe launcher rejects the current changed product source rather than silently treating the earlier binary as current.
- Independent review chat `01a128ff-8865-7493-9698-cc48c19d7939` will be notified of the exact integrated head for fix verification; its new review result remains pending at this checkpoint. All worker history remains reachable; worker cleanup follows final review.


## Evening guard follow-up — 2026-10-11

Independent review confirmed the two P2 repairs and zero remaining Spec findings, then identified a P3 duplicate-wrapper/literal-placeholder error in three Evening guard paths. Retained product `ff913083` and worker/evidence `e7da264` are integrated without squashing through `a6f948736ff1d6274bf1c6c8f5eeb7689779b7a4`. Typed guard catalog copy fixes concrete zh/en causes and refresh while preserving draft, date and Vault protections. Build and 21 focused checks passed; all four retained log hashes verified. Rust remains byte-identical to the 523-pass checkpoint. Earlier 432 frontend/23 browser totals are historical before this frontend-only follow-up. Final independent verification is pending; no package/install/native acceptance is added.


### Independent repair closeout — 2026-10-11

At frozen `6656041b518fe979c1318a7e7f87a2c14503cd42`, the independent review chat confirmed zero unresolved Standards and Spec findings and explicit satisfaction with the repair scope. All original P2 and introduced P3 findings are resolved; [full independent evidence](evidence/code-review.md) retains the exact checks and range. Build/21 focused final checks passed; 523 native checks remain an identical-Rust checkpoint, while 432 frontend/23 browser remain earlier full-suite results. PDEX-09/PDEX-11 remain blocked and parent remains open.

Installed Management helper 1.0.3 confirmed the existing canonical workspace/project/source binding. Scoped readback of `source-personal-dashboard-experience` at revision `606b4d82a4aeebb0` confirmed twelve records: nine resolved, two blocked and one open, with no malformed references. No new Registry or summary write was performed; cached states for other sources are outside this verification.

- Final Management readback after the independent verdict was appended: source revision `8b244e7ff955b103`, twelve records, nine resolved/two blocked/one open, no malformed references. Earlier scoped reads above remain historical checkpoints.


## Native continuation checkpoint — 2026-10-11

Human authorized the remaining PDEX-09/PDEX-11 native checks and independent rereview. Root CUA pass uses fresh frozen `bc99cf2` / binary `76f12c68…`, synthetic data and a unique temporary bundle. Exact native reference windows and genuine saved-but-reload-failed/no-replay recovery are now established, alongside fresh Task/Calendar/slash/Evening/conflict/write/restart checks. [Source-bound report and artifact index](evidence/native-acceptance-2026-10-11.md) preserve unsuccessful attempts and prior evidence. Real IME, sustained edge gesture/active resize, and authenticated quota exhaustion remain unverified. Native restart found dynamic axis startup language application missing retained copy metadata; bounded repair is assigned on `codex/pdex-native-followups` from `bc99cf2`, with a production startup regression. Nine component tickets remain resolved, PDEX-09/PDEX-11 blocked, parent open. No installation/main/remote/real-data change.


## Rebuilt native continuation B — 2026-10-11

Bounded native-discovered frontend repairs are integrated through `ffa1b85056fe3f2bc3ab68ce652001b3b6f9537e`, followed by a non-vacuous startup scroll regression integrated at `20515dd3ec99e27ddce0b0b49668da4b17c2fb47`. Product files are identical at those commits; all worker and merge history is retained. A fresh isolated package is bound to frozen `ffa1b85`, binary SHA-256 `f76ad9b2460bda459a3c7b68aac6f2e3bdeed71da8aa032944a7df9841523bab`. [B report and exact artifact identities](evidence/native-acceptance-2026-10-11-b.md) retain 23 native captures and real saved-but-readback-failed recovery, persisted-English startup/restart, hidden point End, readable slash selection, natural five/six-row Calendar and dated unsent Evening drafts. Canonical build and five focused files pass 43/43; historical full-suite counts remain qualified. Rust is unchanged from A.

B resize attempts did not establish a narrow window; A's actual narrow-window evidence remains explicitly source-A evidence. Real Sogou composition, sustained native edge dragging/active resize cancellation and authenticated quota exhaustion remain unverified. Nine component tickets stay resolved, PDEX-09/PDEX-11 blocked, and parent open. The candidate was stopped/unregistered; installed App and real profiles/Vaults remain unchanged. Final independent review is pending; the new evidence supersedes neither source-A history nor its limitations.


### Final independent B repair closeout — 2026-10-11

At `f82ef664961b4f01066bd05c4b4fd8a0bea92350`, both independent review axes and the review root returned zero unresolved/actionable findings and explicit satisfaction with the bounded implementation/native-discovered repairs. [Retained verdict](evidence/code-review.md) distinguishes this from full native acceptance. The source-B narrow-window check remains unverified alongside real Sogou composition, held edge/active resize and authenticated quota exhaustion. Nine resolved/two blocked/open parent states are unchanged. All product files remain identical to frozen B source `ffa1b85`; later closeout commits change records only.

Installed Management helper 1.0.3 scoped inspection of the existing canonical experience source confirmed revision `d2cba8285153e830`, twelve records (nine resolved, two blocked, one open), no malformed references and current source state. [Filtered readback](evidence/management-native-b-2026-10-11.json) contains only this source; cached unrelated sources are outside this verification. No new Registry or global summary write was performed.

The owned native-repair managed worktree is now safely archived after clean/ignored-file inventory, complete tip reachability and independent satisfaction; its fully merged worker branch was deleted. [Archive/reachability record](evidence/worktree-closeout.md) retains exact identities. Only the canonical integration checkout remains; all unrelated branches and historical A/B raw evidence are preserved.


## Authorized normal local installation — 2026-10-11

The human explicitly authorized replacing the daily installation so manual acceptance can continue. `/Applications/Personal Dashboard.app` is now a fresh production-config build of reviewed `6af1198`, product-identical to B `ffa1b85`, executable `a6a277f68b25002f88c4958ed56a93c19b7497dc36eb49fa571a2f7b85b3d833`. Normal identifier/title/profile/clock and existing real connection are retained; recoverable old bundle and complete private profile backup were verified before swap. [Installed provenance and preservation](evidence/local-install-2026-10-11.md) distinguish JSON serialization/runtime metadata from unchanged personal content. Sole searchable installation is the Applications path. Earlier no-install checkpoints remain historical.

[Current human/environment unblock guide](manual-acceptance.md) supersedes stale pending summaries without erasing them: real Sogou composition, held edge/active resize and fresh final-installed 830×758 need manual checks; authenticated quota exhaustion requires a naturally exhausted account, with no artificial spending. PDEX-09/PDEX-11 stay blocked, parent open, other nine tickets resolved. No main merge, remote publication or personal-record edit occurred.


## Human quota acceptance decision — 2026-10-11

The human explicitly accepted the quota-exhaustion criterion and waived further actual exhaustion testing in review chat `01a128ff-8865-7493-9698-cc48c19d7939` (direct user reply `01a12969-8b59-76a3-a544-d67411f4656f`). The quota subgate is **accepted by human waiver on existing evidence**, not an observed exhaustion result. No controlled injection, new model request or artificial quota spending is required or performed. Historical statements that actual exhaustion was not established remain true observations; their pending-test/blocker status is superseded by this explicit decision.

PDEX-11's conflict/write-failure/unconfirmed-result combined criterion is now checked: existing qualified source/persistence/production native evidence supports those constituents, and the quota constituent is explicitly accepted by the human. Remaining required gates are real Sogou composition, sustained native edge/active resize cancellation and fresh final-installed 830×758 narrow-window behavior. PDEX-09/PDEX-11 remain blocked, parent open, and nine other tickets resolved. [Current manual checks](manual-acceptance.md) no longer asks for quota exhaustion. Installation remains confirmed and does not by itself close the remaining gates.


## Human IME acceptance and PDEX-09 resolution — 2026-10-11

The direct human message `01a1296a-888d-7193-9c10-77ca83962f5f` in review chat explicitly accepts the real Chinese IME criterion on existing evidence and waives dedicated native composition testing; normal daily Chinese use will supply future issue feedback. This is **human acceptance/test waiver**, not an observed OS composition result. Existing keyboard/completion/ordinary-slash/draft checks and independent review are complete, so PDEX-09 is now locally resolved/closed with all acceptance criteria accounted for. The same shared IME subgate is accepted for PDEX-11. No additional test message, input-source change or model request is required.

Current tracker: ten resolved, one blocked (PDEX-11), parent open. PDEX-11's slash/draft/date/Evening combined criterion is checked using existing qualified behavior evidence plus the explicit IME waiver; its quota/conflict/failure criterion is already accepted as recorded above. Only sustained native edge dragging/active gesture cancellation and resize, plus fresh final-installed 830×758 narrow-window behavior remain required. [Current two manual check categories](manual-acceptance.md) supersede earlier pending-IME/quota lists without erasing historical observations. Installation is confirmed; full native acceptance and parent closure remain pending these two categories.


## Installed release Management readback — 2026-10-11

The installed helper confirmed the existing Project summary update and a fresh canonical readback: Registry `4e69892e9c986090`, summary `4981ce4399878143`, experience source `01525760c6c0e6bd`, twelve records (ten resolved, one blocked, one open), no malformed experience references. [Sanitized source/summary receipt](evidence/management-local-install-2026-10-11.json) records the actual installed production release, human quota/IME acceptances and only two remaining manual gate categories. Project lifecycle, focus, review, source configuration, working directory and repository fields are unchanged.

The installed helper was invoked with a system-only child PATH that excludes GitHub CLI, honoring local-only tracker scope; unrelated available local source revisions were validated, unavailable GitHub/malformed legacy sources explicitly uncovered. This updates only the existing Project's source-backed progress summary, not its native ticket lifecycle or a new Registry. No remote query, tracker migration, main merge or artificial model request occurred. The independent review chat also confirmed the running installed executable/signature/bundle identities and recoverable backup. Product files remain identical to frozen reviewed B `ffa1b85`; closeout remains docs-only.


## Direct human acceptance and initiative closeout — 2026-10-11

The human confirms plan time-bar drag with visible plan-time revisions, timeline drag-selection to create a Task, narrowed Calendar usability and correct-looking overlap entries in the actual installed normal App. The reviewer additionally observed saved-and-readback-verified feedback and revision records through read-only UI inspection, and accepts the round on existing implementation/automated/native evidence plus these direct human results. [Final local acceptance record](evidence/human-acceptance-2026-10-11.md) retains exact message/provenance pointers and evidence qualifications.

Today narrow-window time-axis compression/partial occlusion from the retained Items without a precise time side column is explicitly accepted by the human as an interface limitation; optional improvement does not block this round. Sustained held-edge auto-scroll, active-drag resize/cancel and exact final-installed 830×758 geometry were not separately observed: no claim of per-step performance or a direct human waiver is made. IME/quota retain their separate explicit acceptance/test waivers.

PDEX-11 is now resolved/closed; all eleven tickets and PDEX-SPEC-01 are locally resolved/closed, with no current initiative blocker. Earlier parent holds prevented acceptance inferred solely from automatic checks; this direct human installed-App acceptance and independent reviewer overall conclusion provide the missing basis for parent closure. No product changes, live UI action, personal-data write or new model/test request were performed by implementation closeout. Product diff from reviewed `ffa1b85` is zero. Historical records remain; no main/remote publication or tracker migration is inferred.


## Final acceptance Management confirmation — 2026-10-11

Installed Management helper updated the existing Project summary and confirmed a fresh canonical readback: Registry `b69ca519f2f43084`, summary `747bdb6a386c2741`, experience source `df799cdc1855fe0b`; all twelve local records are resolved (eleven tickets plus parent spec), no malformed references and no initiative blocker/next-work entry. [Scoped receipt](evidence/management-human-acceptance-2026-10-11.json) retains all record states, source-backed acceptance summary and observation qualifications.

Project lifecycle, focus, review, registered sources, working directory and repository fields remain unchanged. A system-only helper child PATH excludes GitHub CLI; unavailable remote/malformed legacy sources remain explicitly uncovered, rather than being claimed as accepted. No new Registry, remote tracker query or migration was performed. This closes only the local Dashboard experience initiative. The normal installed App/product is unchanged; all history and unrelated changes remain retained.


## Approved follow-up — 2026-10-11

New [PDEX-FOLLOWUP-01 addendum](followup-spec-2026-10-11.md) and PDEX-12/13 retain direct user authorization and local claims from clean d4f2399. Implementation/TDD follows previously approved production WebKit/public Task persistence seams. Independent review and explicit review release precede already-authorized normal installation; human acceptance remains separate. Previous initiative closure is retained. Separate implementer worktrees/branches and unsquashed merger history will be recorded; Calendar/navigation/real data are outside edits.


## Current follow-up installation checkpoint — 2026-10-11

PDEX-12/13 final product `2c6b8aa` is independently reviewed with zero unresolved Standards/Spec findings, expressly released and installed with normal production config. [Installation and preservation](evidence/followup-local-install-2026-10-11.md) and [final isolated native receipt](evidence/followup-native-final-2026-10-11.json) retain source/package identity, qualified checks and fresh recovery backups. Full history and unrelated changes are preserved. Follow-up spec remains open and PDEX-12/13 in-progress pending direct human acceptance; original eleven tickets and original parent remain resolved. No GitHub/main operation.


## Revised sidebar/schedule authorized claim — 2026-10-11

Direct human 01a129b1-8fa7-7033-a532-52fc86d1056b in reviewer chat corrects sidebar semantics and authorizes global navigation/Calendar existing-summary toggles and compact Task schedule rows. Clean base fc4c8185a9b7e029a945662754a2131b21bfb3d8. PDEX-14/15 independently locally claimed; all prior history retained. Calendar narrow sidebar was a normal-flow summary moved below, not hidden; modify only that existing summary. Reviewer date-default preference pending; sidebar proceeds. Two implementer worktrees and unsquashed merger; new reviews/native package before normal replacement/human acceptance.


2026-10-11 source clarification: direct human reply01a129b4-587d-7891-afd5-2bd86c98056c selects both entries default day; Tasks local livedday/Today selected livedday, never defaulttime. Whole existing Today right .today-side-region is the sidebar toggle target, including TodayTasks/records; zero untimed count never hides restore icon. Prior pending-default note is superseded.


## Revised current installation — 2026-10-11

Final reviewed71059a3 normal App installed with fresh currentuser protection. [Installed provenance/current checks](evidence/sidebar-schedule-local-install-2026-10-11.md). All source/worker merge history retained; only owned workercheckouts removed after unique files/history protection. Revised14/15 remainin-progress andnewparentopenpendingdirecthumanacceptance; olddrawer evidence does not satisfy reviseddock. Original01–11closed. NoGitHub/main/deps/personaltestwrite.
# PDEX-FOLLOWUP-03 claim — 2026-10-11

User message `01a129e5-6777-7d90-b3a5-faa0d4a3483c` in review chat `01a128ff-8865-7493-9698-cc48c19d7939` directly authorizes one additional implementation round on the existing `codex/dashboard-experience-integration` branch. The source-backed summary was sent to the independent reviewer before editing. PDEX-16 is claimed by the root implementer from clean integration tip `a963eb4`. Do not replace the normal App before independent review release; after reviewer satisfaction, follow the user's existing installation authorization with fresh App/profile/Vault protection. Verification is bounded to build, production DOM/WebKit geometry and visible behavior, and synthetic native Computer Use smoke.

## PDEX-16 fixed source and candidate — 2026-10-11

Source commit `9cafecad03deeb3b4b6f98b41a844e0a39d1cad7` (tree `1d895618cd1f20938e9422ae1a094b84e4bcf040`) passed independent review with Standards 0 / Spec 0. `npm run build` passed; focused frontend suites passed 18/18 docked-sidebar and 69/69 Collaboration checks. A separate synthetic candidate build from this source exited 0 and passed `codesign --verify --deep --strict`; bundle identity is `com.tortillaflat.personal-dashboard.shell202610119cafeca`, executable SHA-256 `da62999e6649336dd276d29a6f897c693d306af82c7f99beeea05a2e4002f5c5`, bundle tree SHA-256 `beda391c89c468a785f860f39e2c30e3cefcc6d8bdb517d17c6d0ffab7e9d5d9`.

Computer Use with its virtual mouse opened the final rebuilt candidate at PID 43680 from that exact executable. Screenshots showed the P identity at the far left, divider then navigation toggle, Today sidebar control beside Timeline + records, and Tasks' default Today label on a single row. Earlier same-source synthetic CUA also confirmed the selected-date label and the single Collaboration heading with on-demand help. Setting a time and applying the picker in that earlier candidate left the closed schedule button showing only the date; this time-label behavior is recorded as an open acceptance gap. Final candidate tasks JSON SHA-256 stayed `58c92cdafb69ac01689686e787387b95aadc9e6f375e5e77a7ff8a7c31c4eaf3`; no task was submitted.

The reviewer is preparing the checked-in normal production package for independent source/binary/config readback. This root did not install or replace `/Applications/Personal Dashboard.app`; installation remains gated on the reviewer's explicit release and fresh protection checks. PDEX-16 and its parent remain in-progress pending the time-label gap, package review, installation and direct human acceptance. Full candidate provenance is in [followup-candidate-2026-10-11.json](evidence/followup-candidate-2026-10-11.json).


## PDEX-16 normal release and protected installation — 2026-10-11

The reviewer explicitly released the exact normal configuration bundle after source, package, and candidate native verification. Before replacement, Computer Use closed the installed App with no unsaved composer text. The old App executable SHA-256 `97ef078177c6c31e8c25b0b8f89b1703fdd090799281d0e2e4a2da201c8d576f` is both copied and archived outside `/Applications`. The complete local app profile copy passed `diff -qr` with zero differences. A narrow full `life/` and `.obsidian/` Vault protection copy passed readback: all 48 `.md`/`.json` files in `life/` match by relative path, byte count and SHA-256, and `.obsidian/` matches by `diff -qr`. The private protection manifest is under `/Users/tingranwang/Documents/Codex/personal-dashboard-release-2026-10-11.noindex/install-protection.json` (0700 directory, `.metadata_never_index`). A broader clone of the entire Codex vault was interrupted after four minutes to avoid copying unrelated project repositories; it is explicitly labeled incomplete in that manifest and is not treated as a recovery copy. No source Vault files were changed.

Installed the reviewer-approved checked-in-config bundle at `/Applications/Personal Dashboard.app`: source `9cafecad03deeb3b4b6f98b41a844e0a39d1cad7`, version `4.0.7`, bundle ID `com.tortillaflat.personal-dashboard`, binary SHA-256 `0c9eecf85b9531243d07e7b4cff81924b7b02cd666f6df5be89c7f1982eb78e0`. Strict code-sign verification passed, the installed bundle compared equal to the released build, and Launch Services reports only the normal `/Applications` installation. The installer did not launch or interact with the installed App; normal-package read-only Computer Use and composer smoke are handed to the independent reviewer. PDEX-16 and the parent remain in-progress until that check and direct human acceptance.


## PDEX-16 normal-installed readback — 2026-10-11

The independent reviewer used read-only Computer Use with the virtual mouse on the normal installed App and confirmed the brand/navigation-toggle order, Today toggle beside the Timeline + records heading, the visible Today schedule label, and reduced Collaboration page/pane chrome. No personal Task was created and no Collaboration message was sent. The earlier date-only candidate observation remains an incomplete native segmented-field entry; a complete native hour/minute/PM entry on the exact final candidate visibly produced `Today · 15:30` and a date/time accessible name after Apply. Do not describe the normal read-only check as a composer interaction test.

After the reviewer left the App on Tasks, post-startup readback found the current Collaboration JSON semantically equal to the protected copy (41 sessions, 37 daily-plan automation runs, and the same settings), all 267 `life/` files and all six `.obsidian/` files matching their protected copies, with no removals. The private profile also contains 52 new Codex diagnostic log rows without thread IDs, a refreshed model-cache `fetched_at`, SQLite runtime sidecars and temporary process files; those are runtime effects of launch, not Task or Collaboration writes. The pre-launch full profile backup and private manifest remain outside the repository. The normal executable hash is `0c9eecf85b9531243d07e7b4cff81924b7b02cd666f6df5be89c7f1982eb78e0`; strict signature and the sole `/Applications/Personal Dashboard.app` Launch Services result were rechecked. [Sanitized normal-install receipt](evidence/pdex16-normal-install-readback-2026-10-11.json) retains the exact readback.

The installed Management helper confirmed a typed `submitSummary` against the existing `product-personal-dashboard` Project and canonical reread. Registry revision advanced from `c5f2efeb94fd4f87` to `90a7c3ce9e418cc1`; summary revision is `0d86d16563428874`. The Project lifecycle, user-owned focus/review, sources, working directory, and repository fields are unchanged. Five current local sources are covered; the malformed experience and older Collaboration Markdown sources plus unavailable GitHub source are explicitly uncovered. The existing source gaps remain visible; no GitHub query, source repair, or Registry creation occurred. See [Management receipt](evidence/management-pdex16-installed-readback-2026-10-11.json). PDEX-16 and PDEX-FOLLOWUP-03 stay in-progress pending the bounded synthetic Collaboration composer check and direct human acceptance.
