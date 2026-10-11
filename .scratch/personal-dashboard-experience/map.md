# Dashboard experience improvements — local tracker

ID: PDEX-MAP
Type: map
Date: 2026-10-10
Canonical: this local tracker, explicitly selected by the user
Stage: PDEX-SPEC-01 and PDEX-01–11 remain closed; PDEX-FOLLOWUP-01–05 and PDEX-12–18 closed after human acceptance of installed d518332
Implementation: installed checkpoint d518332 accepted by the user with qualifications; residual feedback is recorded separately and is not a current blocker
Working branch: codex/dashboard-experience-integration
Management source: source-personal-dashboard-experience

## Records

| ID | Type | Body | Triage | Lifecycle | Dependencies | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| PDEX-SPEC-01 | spec | [Complete specification](spec.md) | ready-for-agent | closed | none | [local human acceptance](evidence/human-acceptance-2026-10-11.md), [retained publication](publication.md) |
| PDEX-01 | ticket | [01: 在白天手动编辑具体计划并可靠保存](issues/01-current-plan-time-editor.md) | ready-for-agent | closed | none | [component resolution + final checks](evidence/pdex-11.md) |
| PDEX-02 | ticket | [02: 将模糊计划定位并编辑时间精度](issues/02-approximate-plan-times.md) | ready-for-agent | closed | PDEX-01 | [component resolution + final checks](evidence/pdex-11.md) |
| PDEX-03 | ticket | [03: 保持早间文字与可读的统一白天时间轴](issues/03-unified-readable-today.md) | ready-for-agent | closed | none | [component resolution + final checks](evidence/pdex-11.md) |
| PDEX-04 | ticket | [04: 拖动计划并调整结束时间](issues/04-plan-drag-and-resize.md) | ready-for-agent | closed | PDEX-02 | [component resolution + final checks](evidence/pdex-11.md) |
| PDEX-05 | ticket | [05: Tasks 使用清晰勾选列表与所选详情](issues/05-task-list-details.md) | ready-for-agent | closed | none | [component resolution + final checks](evidence/pdex-11.md) |
| PDEX-06 | ticket | [06: 保存 Task 计划执行时间段并兼容现有入口](issues/06-task-execution-intervals.md) | ready-for-agent | closed | none | [component resolution + final checks](evidence/pdex-11.md) |
| PDEX-07 | ticket | [07: 在白天时间轴选区创建与移动 Task](issues/07-task-timeline-create-move.md) | ready-for-agent | closed | PDEX-06 | [component resolution + final checks](evidence/pdex-11.md) |
| PDEX-08 | ticket | [08: Calendar 完整紧凑月历与记录状态](issues/08-compact-calendar.md) | ready-for-agent | closed | none | [component resolution + final checks](evidence/pdex-11.md) |
| PDEX-09 | ticket | [09: Collaboration 减负与 slash 命令补全](issues/09-collaboration-command-completion.md) | ready-for-agent | closed | none | [user acceptance and retained evidence](issues/09-collaboration-command-completion.md) |
| PDEX-10 | ticket | [10: Evening 一键进入带日期的复盘草稿](issues/10-evening-review-entry.md) | ready-for-agent | closed | none | [component resolution + final checks](evidence/pdex-11.md) |
| PDEX-11 | ticket | [11: 验证同一打包版本的完整日常流程](issues/11-packaged-daily-flow-acceptance.md) | ready-for-agent | closed | PDEX-03, PDEX-04, PDEX-05, PDEX-07, PDEX-08, PDEX-09, PDEX-10 | [local human acceptance and qualifications](evidence/human-acceptance-2026-10-11.md) |

## Approved follow-up frontier — 2026-10-11

Previous PDEX-SPEC-01/PDEX-01–11 remain accepted and closed. New bounded follow-up: [PDEX-FOLLOWUP-01](followup-spec-2026-10-11.md), closed after human acceptance of installed d518332; see [final closeout](evidence/human-closeout-followups-2026-10-11.md).

| ID | Body | Triage | Lifecycle | Dependencies | Current evidence |
| --- | --- | --- | --- | --- | --- |
| PDEX-FOLLOWUP-01 | [complete addendum](followup-spec-2026-10-11.md) / [index](issues/00-followup-spec.md) | ready-for-agent | closed | none | user accepted installed d518332; qualified closeout recorded |
| PDEX-12 | [Tasks quick create/modal](issues/12-lightweight-task-create.md) | ready-for-agent | closed | none | user accepted installed d518332; historical unchecked criteria preserved |
| PDEX-13 | [Today unlocated toggle/drawer](issues/13-today-unlocated-drawer.md) | ready-for-agent | closed | none | user accepted installed d518332; historical unchecked criteria preserved |

The spec and eleven approved tickets are published locally. Every ticket retains its complete body and separate acceptance criteria.
Current claim and implementation states are recorded per row and ticket. The Work Item index [00-spec](issues/00-spec.md) refers to
this full body and the same PDEX-SPEC-01 identity; it is not an implementation
ticket or a second specification. Do not renumber existing PDEX records.

## Frontier and execution boundary

The initial eligible frontier is PDEX-01, PDEX-03, PDEX-05, PDEX-06,
PDEX-08, PDEX-09 and PDEX-10. PDEX-02/04/07/11 are gated by the declared
dependencies. There are ten direct blocking edges with no cycles or redundant
transitive edges. Read each full ticket before a later authorized claim.

[Execution record](execution.md) retains claim/branch/commit/verification
conventions. Breakdown approval authorized publication. The subsequent implement-spec
request authorizes ticket implementation; installation and parent-spec closure
remain separate boundaries.

## Decisions so far

- Use the accepted prototype R and B-style Task list, with the confirmed
  compact Calendar, Morning text, shared Daytime axis and temporary overlap lanes.
- Q1: display and corresponding source document must agree.
- Q2: Task intervals represent planned execution time, not deadlines or facts.
- Q3: ordinary Daytime dragging updates Current arrangement, not Morning baseline.
- Q4: reuse application/persistence workflows and packaged App acceptance with
  synthetic data; prototype memory and source-string checks are insufficient.
- The user selected local spec/tickets/execution with complete Git commit history
  while GitHub is unavailable. This initiative's project rule now records that choice.

## Local tracking conventions

- The spec ID is PDEX-SPEC-01. Allocate PDEX-01, PDEX-02, etc. only when actual
  implementation tickets are requested and created. Never reuse or renumber IDs.
- Each ticket retains its full body, parent spec, direct blockers, triage,
  lifecycle, owner, working branch, acceptance criteria and evidence links.
- Use the five-role triage vocabulary. Track open/in-progress/blocked/closed
  lifecycle separately from triage; ready-for-agent is not delivery or a claim.
- Record authorized claims in the ticket and this map before execution;
  an eligible ticket must have its dependencies satisfied with the required evidence.
- Record dated transitions, reviews, tests and failure/recovery outcomes, and
  commit coherent increments. No silently rewritten or discarded history.
- Close only with its own acceptance evidence. Keep code completion, automated
  checks, packaged UI acceptance, installation and remote integration separate.
- Keep personal data/credentials outside version control. Use synthetic or redacted
  evidence and preserve unrelated dirty work.
- Retain code and durable records on codex/ branches. Main stays protected;
  local tracking does not authorize main merge, remote push or installation.

## Commit history and remote handoff

[Remote handoff](remote-handoff.md) records the retained base, branch and
prototype/specification commits. Future implementation uses a coherent local
commit chain that can be pushed as a branch after remote access returns, without
losing planning or review history.

GitHub Issues migration is separate from Git branch push. Preserve complete
records and local-ID-to-Issue mappings; keep one declared canonical tracker,
avoid duplicate open queues, and do not migrate automatically.

## Publication history

- 2026-10-10: Prototype R and Q1–Q3 confirmed; first non-template draft recorded
  at 14df60e, then explicitly deleted and replaced under to-spec at ae191ee.
- 2026-10-10: Q4 testing boundary confirmed; all seven sections and 68 user stories
  complete. Initial GitHub preflight was unavailable; no Issue was created.
- 2026-10-10: User explicitly selected local-only spec/tickets/execution.
  PDEX-SPEC-01 is published with ready-for-agent/open, no tickets or implementation.
  The commit containing this entry is its local publication receipt.
- 2026-10-10: Installed Management helper confirmed local source registration
  and a fresh readback: source-personal-dashboard-experience is current and exposes
  exactly one spec index, no implementation tickets. Source revision 4210d09f1153d1bf.
- 2026-10-10: User approved the eleven-slice breakdown and ten direct blocking
  edges. Published PDEX-01–11, each ready-for-agent/open/unassigned with its own
  full body and acceptance criteria. The parent spec and spec index are unchanged.
  The commit containing this batch is the ticket-publication receipt.
- 2026-10-10: Fresh Management inspect confirmed twelve local records, no
  malformed references and the seven-ticket frontier declared above. Ten
  blocking edges resolve; source revision 66ea1fd9c206de45.

## Implementation authorization

- 2026-10-10: User invoked implement-spec for all linked local tickets, specifying integration branch codex/dashboard-experience-integration from prototype 8960c80. Initial inventory clean; retained prototype/spec/ticket history. PDEX-01, PDEX-06 and PDEX-09 claimed on independent worktrees. Previous planning-only statements above describe the publication checkpoint.

## Final implementation checkpoint — 2026-10-10

- Integration `codex/dashboard-experience-integration` retains exact base `8960c80bc81ae35a7dcd871dd104f4b3d04497de`, all original feature/merge/review/repair commits and unrelated branches. Product source is identical to frozen candidate `256ecd01aab9e92ef6bf139d7d83ccc2ae671aee`; subsequent changes are evidence/tracker records only.
- PDEX-01–08 and PDEX-10 are locally resolved with their own answers and component evidence. PDEX-09 and PDEX-11 remain blocked by documented native acceptance limits. PDEX-SPEC-01 remains open; this does not claim full user acceptance.
- Final build, 431 frontend, 23 browser and 519 Rust tests passed; both independent reviews are clear. [Packaged checks and precise limits](evidence/pdex-11.md), [review history](evidence/code-review.md), [worker cleanup](evidence/worktree-closeout.md).
- No main merge, remote operation, installation or real personal-data mutation. All remaining acceptance uses the retained isolated `.noindex` candidate and synthetic fixture.


## Independent review repair checkpoint — 2026-10-11

Manual Task original-payload retry and Evening date/status/error localization findings are repaired with retained commits, integrated via `51f7287`. [Repair evidence](evidence/review-repairs-2026-10-11.md) records 432 frontend, 23 browser and 523 Rust passing checks, the diagnosed fixture-only cleanup race and exact source/log identities. Independent fix review is pending. The preceding 2026-10-10 candidate checkpoint remains historical; PDEX-09/PDEX-11 acceptance blockers and the open parent are unchanged. No new package, installation, remote publication or real personal-data change occurred.


## Evening guard review checkpoint — 2026-10-11

Both original P2 findings are independently confirmed resolved; supplemental Spec findings are zero. An introduced Standards P3 in Evening guard error copy is repaired through no-ff integration `a6f9487`, with build and 21 focused tests passing. [Retained repair evidence](evidence/review-repairs-2026-10-11.md) covers real production guard failures and language refresh. Final independent confirmation is pending. PDEX-09/PDEX-11 remain blocked and parent remains open; no new packaged acceptance.


### Independent repair closeout — 2026-10-11

At frozen `6656041b518fe979c1318a7e7f87a2c14503cd42`, the independent review chat confirmed zero unresolved Standards and Spec findings and explicit satisfaction with the repair scope. All original P2 and introduced P3 findings are resolved; [full independent evidence](evidence/code-review.md) retains the exact checks and range. Build/21 focused final checks passed; 523 native checks remain an identical-Rust checkpoint, while 432 frontend/23 browser remain earlier full-suite results. PDEX-09/PDEX-11 remain blocked and parent remains open.

Installed Management helper 1.0.3 confirmed the existing canonical workspace/project/source binding. Scoped readback of `source-personal-dashboard-experience` at revision `606b4d82a4aeebb0` confirmed twelve records: nine resolved, two blocked and one open, with no malformed references. No new Registry or summary write was performed; cached states for other sources are outside this verification.


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


## Follow-up authorization and local claims — 2026-10-11

Direct human message 01a12986-5de8-7f91-a3b5-a9bca292f4fe approves only Tasks creation and Today right-panel improvements, independent review until satisfied, then normal local App replacement and subsequent human acceptance. Base d4f2399 is clean. PDEX-12/PDEX-13 are locally claimed; prior closed tickets/spec remain intact. Calendar and left navigation excluded. Installed App stays unchanged until explicit reviewer release; no GitHub/main operation.


## Current follow-up installation checkpoint — 2026-10-11

PDEX-12/13 final product `2c6b8aa` is independently reviewed with zero unresolved Standards/Spec findings, expressly released and installed with normal production config. [Installation and preservation](evidence/followup-local-install-2026-10-11.md) and [final isolated native receipt](evidence/followup-native-final-2026-10-11.json) retain source/package identity, qualified checks and fresh recovery backups. Full history and unrelated changes are preserved. Follow-up spec remains open and PDEX-12/13 in-progress pending direct human acceptance; original eleven tickets and original parent remain resolved. No GitHub/main operation.


## Revised sidebar/schedule frontier — 2026-10-11

Direct human sidebar correction supersedes drawer-as-target interpretation; previous source/test/install receipts stay historical. [Full PDEX-FOLLOWUP-02](sidebar-schedule-spec-2026-10-11.md). Both independent tickets claimed on clean fc4c818; human Task default choice pending but sidebar work proceeds. Original accepted tickets remain closed; followup12/13 are not inferred newly accepted.

| ID | Body | Triage | Lifecycle | Dependencies | Evidence |
| --- | --- | --- | --- | --- | --- |
| PDEX-FOLLOWUP-02 | [spec index](issues/00-sidebar-schedule-spec.md) | ready-for-agent | closed | none | user accepted installed d518332; qualified closeout recorded |
| PDEX-14 | [docked sidebars](issues/14-docked-sidebar-toggles.md) | ready-for-agent | closed | none | user accepted installed d518332; historical unchecked criteria preserved |
| PDEX-15 | [compact Task schedule](issues/15-compact-task-schedule.md) | ready-for-agent | closed | none | user accepted installed d518332; historical unchecked criteria preserved |

## Approved follow-up — PDEX-FOLLOWUP-03 — 2026-10-11

New direct-user-authorized, bounded shell polish: [PDEX-FOLLOWUP-03](followup-spec-2026-10-11-shell-compactness.md). Existing PDEX-09 and PDEX-14/15 remain unchanged. PDEX-16 is claimed on the existing integration branch; independent review, any release action and human acceptance remain separate.

| ID | Body | Triage | Lifecycle | Dependencies | Current evidence |
| --- | --- | --- | --- | --- | --- |
| PDEX-FOLLOWUP-03 | [complete addendum](followup-spec-2026-10-11-shell-compactness.md) / [index](issues/00-followup-spec-03.md) | ready-for-agent | closed | none | user accepted installed d518332; qualified closeout recorded |
| PDEX-16 | [compact workspace shell](issues/16-shell-compactness.md) | ready-for-agent | closed | none | user accepted installed d518332; unchecked criteria remain unverified ([readback](evidence/pdex16-normal-install-readback-2026-10-11.json)) |


## Revised current installation — 2026-10-11

Final reviewed71059a3 normal App installed with fresh currentuser protection. [Installed provenance/current checks](evidence/sidebar-schedule-local-install-2026-10-11.md). All source/worker merge history retained; only owned workercheckouts removed after unique files/history protection. Revised14/15 remainin-progress andnewparentopenpendingdirecthumanacceptance; olddrawer evidence does not satisfy reviseddock. Original01–11closed. NoGitHub/main/deps/personaltestwrite.

## Collaboration visual repair frontier — 2026-10-11

Direct user report supersedes the earlier Collaboration visual-acceptance inference for installed source `9cafeca`; that release remains historical and PDEX-16 stays in-progress. New bounded repair: [PDEX-FOLLOWUP-04](followup-spec-2026-10-11-collaboration-layout.md). Red layout metrics and single-variable diagnosis are in [PDEX-17 evidence](evidence/pdex17-layout-red-2026-10-11.md). No normal-App replacement or human acceptance is claimed.

| ID | Body | Triage | Lifecycle | Dependencies | Evidence |
| --- | --- | --- | --- | --- | --- |
| PDEX-FOLLOWUP-04 | [complete addendum](followup-spec-2026-10-11-collaboration-layout.md) / [index](issues/00-followup-spec-04.md) | ready-for-agent | closed | none | user accepted installed d518332; qualified closeout recorded |
| PDEX-17 | [Collaboration layout recovery](issues/17-collaboration-layout-recovery.md) | ready-for-agent | closed | none | user accepted installed d518332; historical evidence retained and unchecked criteria unverified ([prior evidence](evidence/pdex17-layout-red-2026-10-11.md)) |

## New direct human corrections — 2026-10-11

Direct user messages in review chat `01a128ff-8865-7493-9698-cc48c19d7939` authorize a new bounded repair at base `3c19010`. [PDEX-FOLLOWUP-05](followup-spec-2026-10-11-dashboard-shell-repair.md) records the exact corrections: improve the Task date label, remove Today’s visible zero while preserving accessible recovery, keep the Calendar summary on the right at narrow widths, and align Collaboration spacing and clickable controls. The user explicitly keeps Habits unchanged. PDEX-14 through PDEX-17 retain their prior histories and remain separate from PDEX-18 review and direct acceptance.

| ID | Body | Triage | Lifecycle | Dependencies | Evidence |
| --- | --- | --- | --- | --- | --- |
| PDEX-FOLLOWUP-05 | [complete addendum](followup-spec-2026-10-11-dashboard-shell-repair.md) / [index](issues/00-followup-spec-05.md) | ready-for-agent | closed | none | `d518332` installed and accepted by the user; qualified closeout recorded |
| PDEX-18 | [visible shell controls and Collaboration recovery](issues/18-dashboard-shell-and-collaboration-repair.md) | ready-for-agent | closed | none | `d518332` installed and accepted by the user; prior evidence retained, checklist qualifications preserved ([prior evidence](evidence/pdex18-final-review-install-2026-10-11.md)) |

### PDEX-18 review and protected installation — 2026-10-11

Implementation commits `37d71de` and `dc12b10` retain full history from `8960c80`. Independent Standards and Spec reviews are complete with no remaining actionable findings; the Standards suggestion to share schedule assertions is addressed in the second commit. Build and focused suites pass. After fresh App/profile/selected-Vault protection, the reviewed normal-identifier 4.0.7 bundle was installed and visually checked with Computer Use virtual input. [Installation evidence](evidence/pdex18-normal-install-2026-10-11.md) records hashes, protected-copy readback, native-input limitation and the pending direct human acceptance. The ticket and parent remain in-progress; no GitHub, main merge, or remote publication occurred.


## Latest protected normal App checkpoint — 2026-10-11

Current production source `d4e2b54` is independently reviewed and installed at `/Applications/Personal Dashboard.app` with the normal configuration and fresh protection. [Final qualified evidence](evidence/pdex18-final-review-install-2026-10-11.md) includes the actual existing-session composer defect found after `eb0f497`, its repair, native input/control observations and verified data preservation. Standards and Spec have zero unresolved findings. PDEX-FOLLOWUP-05/PDEX-18 remain in-progress pending direct human acceptance; PDEX-14 through PDEX-17 retain their own histories, and original PDEX-01–11 remain closed. Earlier release checkpoints are historical. No GitHub/main operation is inferred.


## Follow-up initiative closeout — 2026-10-11

The user accepted the current installed experience checkpoint `d518332` and closed PDEX-FOLLOWUP-01–05 plus PDEX-12–18 for this round. This is human acceptance of the installed round, not a claim that every historical checklist line was individually observed or passed. Unchecked items, failures and evidence remain intact. [Qualified closeout and residual feedback](evidence/human-closeout-followups-2026-10-11.md) is the current pointer; earlier dated in-progress entries above remain historical snapshots.

There is no active follow-up blocker. Three items are retained for future user-directed work: Up/Down keyboard selection in the `/retro` completion menu; unclear Today Daytime arrangement/task move and delete affordances (not yet diagnosed); and a possible TickTick-like large right-side Task detail pane, explicitly future design only. They are not represented as implemented or as reopened tickets.

Root cleanup completed without touching the installed App, profile, Vault or rollback copies. Only `main` and `codex/dashboard-experience-integration` remain as branches; unique prototype history is protected by tag `archive/collaboration-execution-prototype-20261011` and private bundle `~/Library/Application Support/Personal Dashboard Backups.noindex/closeout-20261011-173514/personal-dashboard-before-cleanup.bundle`. No main merge, remote push or PR occurred. The 3.7 GB `src-tauri/target` and obsolete private test bundle were removed; the sole `/Applications/Personal Dashboard.app` and all personal data/rollback backups were left unchanged. See the private cleanup receipt at `~/Library/Application Support/Personal Dashboard Backups.noindex/closeout-20261011-173514/cleanup-receipt.json`.
