# PDEX-SPEC-02 — 本地执行与交接边界

Date: 2026-10-11
Stage: eight tickets published; implementation not started
Canonical tracker: [map](map.md)
Specification: [PDEX-SPEC-02](refinement-spec-2026-10-11.md)
Published ticket range: PDEX-19–26
Publication branch: codex/dashboard-experience-refinement-spec
Publication base: d91d636b395d8c42c0c516827db37ca2565260a4
Receipt: [ticket publication](refinement-ticket-publication-2026-10-11.md)

## Current frontier

PDEX-19、PDEX-23、PDEX-24没有票间依赖。PDEX-20/21/22需要19，25需要24，
26需要20/21/22/23/25。所有票ready-for-agent/open，未分配、未claim或实施。
用户“同意”批准8张票的发布，开始实现仍需后续明确请求。

## 授权执行时的记录

1. 先读完整票体、父spec、当前map和直接blockers证据；固定实际产品/界面
   基线，不能从原型整体搬代码或样式。无关dirty work先清点并保留。
2. 在票及map记录owner、claim日期、实际工作branch、完整base commit和
   所用spec/ticket snapshot。此处publication branch不是实施claim分支。
3. 在codex/分支保留有意义的增量commits，可一票多commit。记录schema兼容、
   业务/UI结果及读回、测试/评审和未覆盖项，不只记“已完成”。必要小型抽取
   随完整功能切片完成，不擅自扩大为重构或换肤。
4. 整合时保留实现/修复/合并的完整哈希、来源branches和可达性。不要amend、
   squash或删除唯一设计/实现/验收历史。当前spec/prototype基线继续独立保留。
5. 使用业务测试、真实保存读回和合成数据打包候选，原型或source字符串不能
   代替实际App。检查未要求区域保留。各票完整行为有证据再关闭，PDEX-26
   验证组合，父spec接受/正常App安装各自记录授权，不从测试通过推断。
6. 状态、blocker、失败恢复与证据留在既有本地tracker；按项目规则用现有
   Management来源读回，不新建Registry，不把通用active分类当成已实现。

## GitHub 恢复后的交接

遵循[remote handoff](remote-handoff.md)：验证远程后按授权push保留branch，
通过PR整合protected main。Git push不发布Markdown为GitHub Issues；若另行
迁移tracker，完整保留IDs/body/依赖/状态/评论/验收和映射，明确一个canonical
目标。当前没有main merge、push、PR、安装或实现结果。


## Reimplementation checkpoint — 2026-10-14

The user authorized restarting PDEX-SPEC-02 implementation from the clean
unimplemented checkpoint `918e7e0d9c4b2c524c429bfd309482e328bc4c91`, preserving
full local Git history and changing only ticket-specified behavior. PDEX-19 was
implemented on `codex/pdex-19-restart` in worktree
`/tmp/pdex-restart-20261014.noindex/pdex-19`, starting at integration tip
`8275615a3f3cad2a783d74561472c78c4bbeb493` (the integration branch tip whose
parent is the requested `918e7e0`). Its code/test commits are
`f0a95909d249535d300ed735a17a603fcd0bcb6b`,
`d04330c518be1d5dc34e5b689cb126a95bbcc40c`, and
`689b383df3ca235fb0dcdcee3ae4d881b4aa963d`, plus follow-up fix
`f6a47765e91bde430de651b0c8510a8d286ffa3e`. Supporting schema/review/evidence
commits are `0520e16ee28118f3636ad6c85c7d3377bfdf3570`,
`d7ac03a0807dcba0cea8c1b2ffe23e78d98634b8`, and
`95b1a164f5009e541885d72b8815349a6a2a39ae`. The rejected implementation
branch was not used as a source.

PDEX-19 code implementation is committed and its branch worktree is clean. The
backend priority/tag fields read back under the same Task identity; filters and
sort remain view state. Build, focused browser/frontend tests, and the Rust
persistence test pass. Three pre-fix full-suite failures were test-double API
errors (`form.querySelectorAll` absent) in Today editor preservation cases; the
mock was corrected in the third commit, and all three targeted cases now pass.
The full suite was not rerun after this test-only correction. The recorded
full-suite run before that correction was 449/491 pass, 42 fail; only the
`task-surface.test.ts` 7px-vs-9px assertion has been confirmed against the
clean baseline. Other non-PDEX-19 failures are itemized, with baseline status
left to the integration owner, in [PDEX-19 implementation evidence](evidence/pdex-19-implementation-2026-10-14.md).

An independent Spec review then found that Cancel did not reset the reused
priority select or tag checkboxes. A browser regression failed first (`high`
remained after Cancel), then passed after the saved properties and summaries
were restored by the close path. The current complete Task-detail browser suite
passes 19/19 and `npm run build` passes; the full frontend suite was not rerun.

PDEX-19 remains `in-progress` because packaged application acceptance is
separate and belongs to PDEX-26. At the initial ticket-branch completion point,
no integration merge, install, remote operation or main change was recorded.

## Local integration checkpoint — 2026-10-14

- PDEX-19 was integrated with a non-fast-forward merge on
  `codex/dashboard-experience-refinement-restart-20261014`:
  `dd472702dc6ff4762e84c6877b4d052d1b5229e4`. The complete ticket branch
  `codex/pdex-19-restart` and its implementation, regression, schema, review,
  and evidence commits remain reachable.
- Final independent Spec review found no remaining PDEX-19 issues. The focused
  Task-detail browser suite is 19/19 and `npm run build` passes; the full
  frontend suite was not rerun after the last Cancel repair. See the linked
  evidence file for the earlier full-suite result and qualified baseline checks.
- PDEX-23 and PDEX-24 remain on their separate local ticket branches pending
  final review and integration. PDEX-23's final review is now closed and its
  complete branch was non-fast-forward integrated as
  `224b42e4052f12f1ea9211a0843f6fa3dc100a0c`; PDEX-24's final Spec and Standards
  reviews are pending. PDEX-20 began from integration tip
  `e1b28504e62d28ecbb05c5fa3f499204d7abefe1`; PDEX-21/22 remain unstarted and
  depend on PDEX-19. PDEX-25 depends on PDEX-24; PDEX-26 remains the packaged
  combination acceptance ticket.
- No remote Git operation, protected-main change, app installation, or normal
  user-data write was performed.

## PDEX-20 local ticket execution — 2026-10-14

- Claimed after PDEX-19 reached integration tip
  `e1b28504e62d28ecbb05c5fa3f499204d7abefe1`, on the dedicated branch
  `codex/pdex-20-restart` in `/private/tmp/pdex-restart-20261014.noindex/pdex-20`.
  This tip descends from the user-requested clean restart at `918e7e0`; no
  rejected post-baseline implementation was used as source.
- Commits retained on the ticket branch: backend/schema/docs and persistence
  tests `d7ecfda0c1b4590405dbb29da52a8bd7fc9abe0c`; compact parent/folder UI
  and behavior tests `c0b7aa969196208acc6f73d37d15c8ee09c06c4b`; current
  lifecycle schema-note update `f1f9c5c7ee6067c67bbe12efb6fbc0d070402ec0`. See the
  [PDEX-20 implementation record](evidence/pdex-20-implementation-2026-10-14.md)
  for exact commands, results and remaining acceptance limits.
- PDEX-20 remains `in-progress`; its ticket branch is not pushed.
  Packaged App acceptance remains with PDEX-26. PDEX-21/22 and PDEX-25 retain
  their existing dependency states.

### PDEX-22 claim — 2026-10-14

- Owner: `/root`; branch `codex/pdex-22-restart`; claim base
  `2ef5d0e0fef34f8a6a4ebbb383eb886a7a1699b6`, after non-ff integration of
  PDEX-19 and PDEX-23. The PDEX-22 publication snapshot and acceptance criteria
  remain unchanged.
- Initial source review confirmed the Calendar month shell, selected-date
  summary, below-month Task panel, and dedicated create form. PDEX-22 kept those
  regions, replaced only the ticketed create entry, and added the holiday labels,
  settings, and Task click editor behavior.
- PDEX-22 implementation commits `135add3c` and `41031c5` were non-fast-forward
  integrated as `071202fb61781436b834bcbdeaac2bce88cbd69c`. Its focused evidence
  and packaged-acceptance boundary are in
  [PDEX-22 implementation evidence](evidence/pdex-22-implementation-2026-10-14.md).
  No install, push, or normal Vault write was part of that branch work.

### PDEX-20 integration and verification — 2026-10-14

- PDEX-20's ticket branch `codex/pdex-20-restart` first merged integration tip
  `ebd4354e2e179ab695450a4e1eaf196dc4730062` non-fast-forward as
  `86e0c4cf2855db6afadf647ef7f872e8a66a26ae`, retaining shared Task/Calendar
  creation behavior and PDEX-20's folder target and parent-aware child creation.
- It then merged latest integration tip
  `2a233c3e4a21d9eaff06b62f1770c86e7671d082` non-fast-forward as
  `89ab2ca6ae319e9feefcb76fd72da1625d3ba4be`. The integration follow-ups
  `13c9bc2c45fdbd67f340d982a660a39d2e3120d9` and `2a233c3...` remain reachable.
- The complete ticket branch was subsequently integrated into
  `codex/dashboard-experience-refinement-restart-20261014` without conflicts by
  non-fast-forward merge `2c0fe5e21bc1fbe7b5f7667e35dd589ab7ccdd16`.
  Both PDEX-20 implementation commits and the intermediate integration merges
  remain reachable in the merge history.
- Merged-tree verification: `npm run build` passed; selected interface-language
  and Task presentation frontend tests passed 37/37; PDEX-20 Playwright
  `task-list-details.mjs` passed 23/23; Calendar-focused frontend tests passed
  16/16; Rust `task_workflow` passed 36/36; Calendar preferences passed 2/2;
  app-local holiday save/read passed 1/1; `git diff --check` passed. Exact
  commands and the browser cache path are in the
  [PDEX-20 implementation record](evidence/pdex-20-implementation-2026-10-14.md).
- No remote Git operation, main change, app installation, or packaged App
  acceptance was performed. Independent review and PDEX-26 acceptance remain
  open.

## PDEX-24 local integration and verification — 2026-10-14

- Verified that `codex/pdex-24-restart` at
  `25c973169aa13d51593ac88887ca5f9dcb29f51d` contains the exact integration
  tip `13d3ac5feda6efe9f8dc764fff4207203a95888b` as an ancestor. The ticket
  branch and integration worktree were clean before merge.
- Integrated the complete ticket branch into
  `codex/dashboard-experience-refinement-restart-20261014` without conflicts
  using non-fast-forward merge `59b9d65563ed47b6b930b1e3d8d698609a7a80e1`.
- Merged-tree verification passed: build; PDEX-24 frontend 30/30 and browser
  4/4; Habit definition plus historical-correction Rust workflows 23/23 and
  `cargo check`; Tasks frontend 38/38, browser 23/23 and Rust workflow 36/36;
  Calendar frontend 16/16, preferences 2/2 and local-file readback 1/1;
  Collaboration frontend 32/32; `git diff --check`. Exact commands are in the
  [PDEX-24 integration evidence](evidence/pdex-24-integration-sync-2026-10-14.md).
- No remote, `main`, installed App, or normal Vault was touched. PDEX-24 remains
  `in-progress` pending independent review and PDEX-26 packaged acceptance.

## PDEX-21 local ticket execution and integration sync — 2026-10-14

- Owner `/root/implement_pdex21`; branch `codex/pdex-21-restart`; isolated
  worktree `/private/tmp/pdex-restart-20261014.noindex/pdex-21`; authorized
  base `2ef5d0e0fef34f8a6a4ebbb383eb886a7a1699b6` and claim record
  `eaec4605883f16158be4945fa8f20874027bc39`.
- Ticket-scoped product and test changes are in `2562f4337850216c9c6a0836612b3e84f5684f25`; the explicit
  680×560 held-pointer scroll regression setup is in `4f764147070e320691cece16982deca8d1837ec9`.
- Latest integration tip `c34ca821cfceb7cdf6262129209cb1f2c3702922` was merged non-fast-forward into the ticket branch as `fbdf8d2c1835244ea9454624c9997710f5876c30`.
  The merge preserved the full incoming PDEX-20, PDEX-22, and PDEX-24 records
  and history.
- The clean ticket tip `d733c4a71cb8648e43bf0bf25dc58452f1c7ad9a` contains the
  exact integration tip above and was subsequently merged back into integration
  without conflicts as non-fast-forward merge
  `42ca01f42e05e5d9fe81fe08a42e6ff387be9872`.
- Merged-tree verification: `npm run build`; Today frontend 24/24; Today Task
  browser 10/10; plan gesture browser 8/8; Rust `today_shared_tasks_workflow`
  7/7; `git diff --check`. The screenshot matrix, prototype comparison, exact
  pointer scroll result, and qualifications are recorded in
  [PDEX-21 implementation evidence](evidence/pdex-21-implementation-2026-10-14.md).
- PDEX-21 remains `in-progress`; no package installation, packaged-App test,
  normal Vault write, remote operation or `main` operation occurred. PDEX-26
  still owns installed-App acceptance.


## PDEX-25 local ticket claim — 2026-10-14

- Owner `/root/implement_pdex21`; branch `codex/pdex-25-restart`; isolated
  worktree `/private/tmp/pdex-restart-20261014.noindex/pdex-25`; exact claim/base
  commit `206c98aa11371b8b8f044871baac3de0f9ecde87`. This base is the current
  PDEX-24-integrated restart integration tip.
- PDEX-25 is limited to Habit selected-detail/history/lifecycle behavior. The
  parent PDEX-SPEC-02 and published PDEX-25 body are unchanged. The worker branch
  was separate at this claim checkpoint; no integration merge had yet been
  performed. The later integration is recorded below.

## PDEX-25 integration and review — 2026-10-14

- Complete ticket branch `codex/pdex-25-restart` ended at
  `69fe84fc6681bd8fbd1b08e55526a1859a42abce`; it was non-fast-forward merged
  into `codex/dashboard-experience-refinement-restart-20261014` as
  `fe14333c8e1269c4c5b14faf89f2d802dd351487`. Its claim, implementation,
  Rust-boundary correction, same-day lifecycle correction, evidence, and review
  commits remain reachable. PDEX-25 remains open/in-progress under the shared
  PDEX-26 packaged-acceptance boundary.
- The ticket branch passed its focused Rust, frontend, browser, viewport and
  build checks; the merged integration tree repeated the build, 30 Rust
  workflow tests, 28 focused frontend tests and 2 browser tests. The source
  diff review found no remaining spec gap or scope creep. See
  [PDEX-25 implementation evidence](evidence/pdex-25-implementation-2026-10-14.md).
- A tracker correction was required because the canonical map still described
  PDEX-25 as isolated after the merge. The map and PDEX-SPEC-02 index now record
  the integration commit while leaving the ticket open for packaged acceptance.

## PDEX-26 local claim and candidate build — 2026-10-14

- Owner `/root`; branch `codex/pdex-26-restart`; worktree
  `/private/tmp/pdex-restart-20261014.noindex/pdex-26`; exact base
  `fe14333c8e1269c4c5b14faf89f2d802dd351487`; claim commit
  `147750868d2030f1a604d3d1e0ee7e6278fbad5c`. PDEX-26 remains open and
  in-progress.
- Built the macOS candidate with
  `PATH=/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/node_modules/.bin:$PATH npm run build:mac`.
  The static bundle is at
  `/private/tmp/pdex-restart-20261014.noindex/candidate/pdex-spec-02-2026-10-14/Personal Dashboard.app`;
  it is version 4.0.7, arm64, 17 MB, ad-hoc signed, and has executable SHA-256
  `fe9dbbc6933a7778ab90712f6b90623efa172387397c37e54efed9a893d0a30c`.
  `codesign --verify --deep --strict` passed.
- At this build checkpoint the candidate had not been launched. An isolated
  launcher and empty data directory were supplied; later bounded packaged
  attempts are recorded below. The installed app remains unchanged at
  executable SHA-256
  `8e43beff6cffa2dde5a664eb4ba0182181d81e7746d8eb3c96846f43c87a0ba2`.
- PDEX-26 packaged IPC, persisted save/readback, relaunch, migration,
  pointer/cross-feature and human acceptance remain incomplete. The build is a
  reviewable candidate, not completion or release acceptance. See
  [candidate build evidence](evidence/pdex-26-candidate-build-2026-10-14.md).

## PDEX-26 packaged acceptance attempt — 2026-10-14

- `codex/pdex-26-restart` was synchronized with integration at
  `359537f9d51bb213c19df37cebed539beaa49afb`; the packaged-attempt tracker and
  evidence update is commit `bfa0f3f` on that ticket branch. Product source
  remains the reviewed PDEX-25 integration at `fe14333`.
- The `gate` attempt launched a relocated package with synthetic app
  data/Vaults and selected the synthetic Vault. The settings scenario passed
  Today and Calendar accent checks, then failed on an old Habit refresh-control
  pixel assertion (`#ffffff` versus `#597897`). Baseline `918e7e0` and current
  source both style `#refresh-habits` with `var(--parity-surface)`; the assertion
  conflicts with the existing style. The run ended before persistence relaunch
  and Vault-switch assertions.
- A separate `dashboard-4` attempt opened with its synthetic 2026-09-08 Vault
  at 14:10 EDT, but the test waited for a Morning-only string before selecting
  the Morning tab. Accessibility inspection confirmed the Day tab was selected
  and the app had loaded the independent Morning baseline. Selecting Morning
  exposed the expected synthetic record. The remaining scenario was not run.
- Manual Accessibility inspection of the isolated packaged copy covered the
  current Today Day/Morning distinction, Tasks fixture, Habit summary and
  Habit history detail. A relocated copy using synthetic data remains open at
  `/private/tmp/personal-dashboard-ipc.pdex26-dashboard4-20261014/` for review.
  This is not a successful packaged gate. The installed app SHA remained
  `8e43beff6cffa2dde5a664eb4ba0182181d81e7746d8eb3c96846f43c87a0ba2`.
- PDEX-26 remains open/in-progress. Full packaged persistence/relaunch,
  migration, conflict and recovery, pointer/cross-feature checks, real
  IME/microphone and human acceptance remain pending. No product code, test
  harness, normal installation or remote Git state was changed.

## PDEX-25 ticket-state correction integration — 2026-10-14

- After full spec review found stale “不合入integration” text in the PDEX-25
  ticket, the ticket branch was fast-forwarded to integration `a9f6b739`, and a
  dated correction was committed on `codex/pdex-25-restart` as
  `0fe551921464b1229b8610be195e347997bc9bdf`. The earlier notes remain as
  historical checkpoints and are explicitly superseded by the later
  `fe14333...` implementation merge.
- The correction-only ticket branch was non-fast-forward merged into
  `codex/dashboard-experience-refinement-restart-20261014` as
  `368571be59092657c55bcef66f12be997e8f0519`, with parents `a9f6b739` and
  `0fe5519`. This merge changed only the PDEX-25 ticket record; PDEX-25 remains
  open/in-progress and PDEX-26 still owns packaged acceptance.

## PDEX-24 ticket-state correction integration — 2026-10-14

- After full spec review found the PDEX-24 ticket still saying it had not been
  merged, the branch was fast-forwarded to integration `02dde3f5`; its dated
  correction was committed on `codex/pdex-24-restart` as
  `01cf3192a99b231b924877c979a8db88cc40df15`. Earlier statements are now
  explicitly identified as pre-merge checkpoints, superseded by `59b9d655`.
- The correction-only branch was non-fast-forward merged into integration as
  `17ded48d865c39a81a946f88418b7129f58513aa`, with parents `02dde3f5` and
  `01cf3192`. PDEX-24 remains open/in-progress; independent review and PDEX-26
  packaged acceptance remain pending.

## PDEX-25 evidence-state clarification integration — 2026-10-14

- Standards review found that the linked PDEX-25 implementation evidence still
  described the worker branch as unmerged. Added a dated clarification to the
  evidence and scoped the claim log's “separate” wording to its claim-time
  checkpoint in commit `b254d0b7f47ad34c83514d816692e14775ae75c9` on
  `codex/pdex-25-restart`.
- This tracker/evidence-only branch update was non-fast-forward merged into
  integration as `fff3c31fb8aab91dfdbd92a0043cde68d7760c30`, with parents
  `17ded48d` and `b254d0b7`. PDEX-25 remains open/in-progress; PDEX-26 owns the
  remaining packaged acceptance.
