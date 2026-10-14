# PDEX-SPEC-02 — three confirmed P2 review repairs, 2026-10-13

Review source: code-review against base `918e7e0`, examined HEAD `16f5e2d256fddc1a773486051ae255035d0b9edd`. The review chat delegated the three confirmed issues back for implementation, targeted validation and subsequent recheck. Acceptance/installation/main/remote boundaries remain unchanged.

Working integration: `codex/dashboard-experience-refinement-integration`.
Implementer: `/root/pdex19`, one worker for all three review findings.
Worker branch: `codex/dashboard-experience-refinement-review-fixes`.
Worker starting tip: `16f5e2d256fddc1a773486051ae255035d0b9edd`.

| Finding | Required correction | Current state |
| --- | --- | --- |
| Standards P2 | Route new Habit settings/details and Task tag/folder fixed labels/messages/diagnostics through docs/interface-language.md; preserve user text/raw diagnostics. | implemented; review recheck pending |
| Spec P2 | Include Calendar draft parentId in create/save/readback/exact retry. | implemented; review recheck pending |
| Spec P2 | Explicit read/rebase path for retained Task drafts after document revision changes; retain draft and protect simultaneous same-Task changes. | implemented; review recheck pending |

Existing full frontend baseline remains 540 tests: 510 pass, 28 fail, 2 skip. This work uses the authorized real application/public production-DOM seams for the three repros, not source-string checks. No full native evaluation, new dependency, normal App installation or external operation is requested. Completion returns exact commits, targeted checks and unresolved findings to the review workflow; it does not close native acceptance or the parent spec.

Earlier implementation handoff/evidence remain historical. This record supersedes their no-active-code-repair state only for these confirmed findings. Detailed repair results will be recorded in `evidence/pdex-review-fixes-implementation-2026-10-13.md`.

## Completed implementation handoff

Implementation merge: `50b9ebda202134fd03ee1174e0116920865d00ed` on `codex/dashboard-experience-refinement-integration`, using `git merge --no-ff`. Worker tip `1466b18d043349b412ea5026de83def52d7f47d0`; source commits `e77b79e8da9066713814ca5855cb88c698fbf3f7` (Calendar parent), `a37e41308b2f923cce7dc8080c5c99a8a45a85d1` (shared copy), and `5d98e035d608a2f3ae9f48c0e498de83c89cae9e` (explicit draft recovery and review follow-ups). The worker merged claim `858ca37` with ordinary merge `7ce8918`; all history and every earlier ticket branch remain retained.

All three P2 fixes are implemented. Related review follow-ups are repaired: localized captions no longer destroy controls; Habit weekly progress renders the real count; the two existing Node draft tests load and execute the real implementation; this round's pending-goal, partial-cycle and completion status copy uses the shared catalog. The first return was handed off for independent recheck; the two confirmed follow-ups below now require another bounded implementation iteration. Native acceptance remains pending.

Worker results: Calendar WebKit 3/3 and application 1/1; Habit browser 6/6 and byte-limit application 1/1; recovery DOM 12 scenarios at each of two widths; locale DOM 2/2; Node focused 8/8; real Task application receipt/CAS/Vault 3/3. Exact commands, fixture limitations and initial failures are retained in [implementation evidence](evidence/pdex-review-fixes-implementation-2026-10-13.md).

Root performed one bounded post-merge check on `50b9ebd`: `npm run build`, both production DOM scripts (recovery 24/24 and locale 2/2), and `git diff --check` all passed. DOM checks use synthetic IPC boundaries; real filesystem/application results are separately identified above. The reviewed full frontend baseline (540 total: 510 pass, 28 fail, 2 skip) was not rerun, and is not claimed green.

The five affected ticket statuses return to `implementation-complete/acceptance-pending`. PDEX-26 and the parent remain open; this is an implementation handoff, not review acceptance or installation. No full evaluation, native acceptance, main, remote, dependency or normal App operation occurred.

The owned review worker was clean and its tip reachable before removal. Generated schema files were preserved privately, reproducible dist discarded, canonical node_modules retained; the review branch and all commits remain. [Cleanup receipt](evidence/refinement-review-fixes-cleanup-2026-10-13.json). The unrelated prototype worktree and all earlier private fixtures remain untouched.

## Second independent recheck return — implemented; recheck pending

Rechecked worker `1466b18` / integrated product `50b9ebd`. The accepting workflow confirms all earlier fixes, and returns exactly two findings:

- Spec P2: if the user edits an additional field after conflict presentation, the old current-value action can replace the recomputed conflict set with the old one. Recompute and display any new conflicts before an explicit resolution; preserve the draft and CAS guard. Add actual DOM coverage for edits made after conflict presentation, including another edit between the next two actions.
- Standards P3: Habit detail coverage supports backend `unavailable` but lacks its fixed bilingual label. Add the paired shared catalog entry and mapping; source labels stay raw.

PDEX-19/25 are in progress for this return; other ticket handoff results remain. One implementer continues on the retained review-fixes branch from the latest integration claim. No full/native evaluation, installation, main or remote action is authorized by this return.

## Final bounded implementation handoff

Second product merge: `4ec21fc4457841e87ebd4ab986db17c3f02b6588`, ordinary `--no-ff` merge on the same integration branch. Retained worker tip `485c9c8e97cd1ec5aaf08c390ad0c346283f2678`; source commits `e8ec4bfebe9b38e551036a3ea51034976a32a56b` (renewed confirmation for newly introduced conflicts) and `bf2a0dbe886f2de6f4cc692dbaf7cdabd9e585d7` (unavailable coverage copy). Worker merge `1ab5f5d26e52d260cc34fef1647588ad4bbf7491` retains integration claim `9494f1a`; no squash/rebase/amend occurred.

Both additional findings are implemented. Worker checks and one root post-merge check passed: build, additional-conflict DOM 2/2, unavailable coverage browser 1/1, diff check. Editing Name and then Priority between successive comparison actions each redisplays the added conflict and requires a subsequent explicit confirmation; retained local tag and exact observed CAS remain. Coverage switches zh/en/zh while user/source labels remain raw. The earlier matrix/application results are retained, not rerun for this bounded return.

No known implementation finding from either review return remains reported. Independent final recheck and delegated native acceptance remain pending; the parent and PDEX-26 stay open. PDEX-19/25 return to implementation-complete/acceptance-pending. No normal installation, main/remote action, full evaluation or native acceptance occurred.

The recreated worker was clean and reachable before removal; all nine ticket/review branch tips and base `918e7e0` were checked reachable from this merge. Branches/history, prior generated-schema archive, canonical dependencies, unrelated prototype checkout and private fixtures remain. [Second cleanup receipt](evidence/refinement-review-second-return-cleanup-2026-10-13.json). [Installed Management helper source readback](evidence/management-review-repair-implementation-handoff-2026-10-13.json) confirms the existing local source; no summary/focus/lifecycle change or acceptance assertion is made.

## Independent review closure — 2026-10-13

Review workflow `01a13776-4d52-7961-bd34-bf9e6a73271a` confirms final product `4ec21fc4457841e87ebd4ab986db17c3f02b6588` passed two independent source reviews: **Standards 0 remaining findings; Spec 0 remaining findings**. Handoff HEAD `fc7386530da7964eb459b980c60ac8c1f0d1633f` differs from that product only in local tracking records. All reported findings are closed, including renewed acknowledgement of newly introduced conflicts and the unavailable coverage translation. This closure supersedes the earlier pending-independent-recheck statements; their history is retained.

The independent reviewer ran `npm run build` successfully in the canonical integration directory and reported the following targeted results. The implementation agent read the four existing logs below to confirm their recorded counts; no checks were rerun for this documentation closeout.

| Independent check | Result | Existing local log |
| --- | --- | --- |
| Production recovery DOM, 13 scenarios at 2 widths | 26/26 passed | `/private/tmp/pdex-root-review-recovery.log` |
| Production locale DOM | 2/2 passed | `/private/tmp/pdex-root-review-locale.log` |
| Habit browser behavior | 7/7 passed | `/private/tmp/pdex-root-review-habit-browser.log` |
| HabitSettingsDraft and Task presentation units | 24/24 passed | `/private/tmp/pdex-root-review-units.log` |
| Total targeted checks | **59/59 passed** | logs above |

The three Calendar WebKit relationship/retry/readback scenarios also passed independent checks in the preceding review round. These results close the reported implementation/review findings. Formal native/PDEX-26 combined acceptance and the parent acceptance gate remain pending; this does not assert full-suite success, native acceptance or installation. The earlier full-frontend baseline and all qualified implementation evidence remain unchanged. Product code, ticket acceptance states, user focus/lifecycle and unrelated summary recovery are unchanged by this append-only record.


## User-authorized local installation — 2026-10-13

The user explicitly requested replacing the local App and closing out local worktrees/commits after independent review. Installed **4.0.8** from source `2c974c6de424b5eb28cb07a1740dcae9a078cb2c` at `/Applications/Personal Dashboard.app`; the version-only release increment follows review closure `5d249ee`. Package identity is unchanged. arm64, strict code-signature verification, embedded source identity and installed/build binary hash equality passed. The installed App launched with its normal profile and selected Vault; Today, Calendar and Habits loaded through the actual native App. All 124 protected existing data/preferences files retained their byte hashes across replacement and these read-only views. Private previous-App/profile/business-data backups remain outside version control.

All additional Git worktrees are removed. The remaining prototype checkout was clean, contained no unique untracked/ignored files, and was backed up as a verified complete Git bundle before removal. Its independent branch/history remains retained; every other local branch tip is reachable from the integration branch. Old archive/test bundle paths were unregistered, and Launch Services now contains only the normal 4.0.8 installation for the Dashboard namespace. No source branches or unique history were deleted.

[Installation and cleanup receipt](evidence/local-release-4.0.8-2026-10-13.json) records metadata and private backup locations, without personal data or credentials. Local release records are committed separately from product source. No remote push or main merge occurred. A later single non-forced push can publish all retained feature refs:

```sh
git push origin 'refs/heads/codex/*:refs/heads/codex/*'
```

Protected `main` still requires a GitHub PR. Git push transfers Git history; it does not migrate local Markdown tickets to GitHub Issues. This installation/startup check does not close the pending PDEX-26 full native combined acceptance gate or imply a full-suite rerun.
