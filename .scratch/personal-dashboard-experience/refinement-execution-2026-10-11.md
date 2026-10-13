# PDEX-SPEC-02 — 本地执行与交接边界

Date: 2026-10-11
Stage: authorized implementation; all PDEX-19–25 implementations integrated; PDEX-26 not claimed; remaining review/native acceptance pending
Canonical tracker: [map](map.md)
Specification: [PDEX-SPEC-02](refinement-spec-2026-10-11.md)
Published ticket range: PDEX-19–26
Publication branch: codex/dashboard-experience-refinement-spec
Publication base: d91d636b395d8c42c0c516827db37ca2565260a4
Receipt: [ticket publication](refinement-ticket-publication-2026-10-11.md)

## Historical publication frontier — 2026-10-11

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

## Implementation authorization — 2026-10-13

User request: implement PDEX-SPEC-02 from `918e7e0` on `codex/dashboard-experience-refinement-integration`, local Git only, full per-ticket branch/commit history retained, explicit spec scope only. Clean initial inventory. PDEX-19/23/24 claimed; worker branch names and full base are in each ticket. No installation, main merge or remote publication authorized.

## Current frontier — 2026-10-13

All PDEX-19–25 implementations are integrated; review and remaining native acceptance are recorded separately, so their tickets remain in-progress. PDEX-26 is not started or claimed; root may claim it only after the final combined prerequisite checks. Verified implementation prerequisites authorize dependent implementation without inferring ticket acceptance or closure. The publication-only frontier above is historical.

## PDEX-23 integration — 2026-10-13

- Integration branch: `codex/dashboard-experience-refinement-integration`; authorized base `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- Source branch: `codex/pdex-23-refinement`; actual worker starting tip `1906b875ccded5a77deeff8fcbecc10454733677`.
- Implementation: `fef0bdd5f80944028334a30634f03d94906e006b`.
- Retained evidence: `7b46d1890396c0d38f80fb39d82c601da155b914`.
- Worker integration synchronization: `2aa96b4d3ea1ce6f7847a44a978ba8d53eee254b` (merges `76b5222` without rewriting).
- Integration tip before merge: `9a213c58a28c4d25978d961dd76bdaf742fd07f9`.
- Integration merge: `3cb070737e919c2d9495556a19541bdf3b93c553`; `git merge --no-ff` retained complete history with no conflicts.

The tracked/untracked inventory was clean before merge; ignored build assets remain local. The merge retains the later baseline evidence docs already on integration. [Ticket validation and DOM geometry](evidence/pdex-23-refinement.md) records scoped behavior, earlier red/green checks and remaining native acceptance.

Integration validation at the merge source: `npm run build` passed; `node --test tests/frontend/collaboration-layout.test.ts tests/frontend/collaboration-context-overlay.test.ts tests/frontend/collaboration-command-completion.test.ts tests/frontend/collaboration-panels.test.ts` passed 32/32; `git diff --check` passed. These actual DOM/controller checks use synthetic fixtures without model requests; they do not establish packaged persistence, microphone or OS IME acceptance. The pre-change full frontend baseline remains 451/490 passing, 39 failures, retained in [baseline receipt](evidence/refinement-baseline-tests-2026-10-13.json). Native acceptance and integration-wide review remain pending. No ticket closure, App installation, personal-data write, main merge or remote operation occurred.

## PDEX-19 integration — 2026-10-13

- Integration branch: `codex/dashboard-experience-refinement-integration`; authorized base `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- Source branch: `codex/pdex-19-refinement`; actual worker starting tip `1906b875ccded5a77deeff8fcbecc10454733677`.
- Implementation: `cfd5a77388e14f0240ad2e47715a05d7a479ebf0`.
- Worker integration synchronization: `c1ae1829cddbedf3f4ffea976039c7e985b7d2f5` (retains `c3de40d` and both PDEX-19/PDEX-23 scoped CSS appends), then `741c54f0796afbf421ca2119a8ecaaada56726e5` (retains `71471a3`).
- Retained evidence: `7255dcace203d7bdc8df1c14d7f76c2b31e74fa4`.
- Integration tip before merge: `71471a341cbfd09d023c7855effac374fa5c6c0b`.
- Integration merge: `f8d33e0a4fa8df8db244e85c0bdf645592e979c9`; `git merge --no-ff` retained complete history without conflicts.

The tracked/untracked inventory was clean before merge. Both ticket-scoped CSS blocks remain. [Application/DOM evidence](evidence/pdex-19-refinement.md) and [WebKit results](evidence/pdex-19-webkit-dom.jsonl) retain implementation verification and limits.

Integration validation at the merge source: `npm run build` passed, including the changed frontend/IPC TypeScript contracts; `node --test tests/frontend/task-refinement.test.ts tests/frontend/task-presentation.test.ts tests/frontend/task-history-render.test.ts tests/frontend/task-history-editing.test.ts` passed 33/33; `node scripts/acceptance/task-refinement-dom.mjs` passed actual production WebKit checks at widths 1280 and 680; `git diff --check` passed. The worker evidence retains the independent real application readback tests. No broad baseline fixture fixes were made. PDEX-19 remains in-progress; root performs the source-bound native checks separately. No ticket/spec closure, normal App installation, personal-data write, main merge or remote operation occurred.

## PDEX-19 repair integration — 2026-10-13

- Source branch: `codex/pdex-19-refinement`.
- Worker synchronization: `01705298ca018f6bc888d5b4169e0703464ac14f` merges integration `b96b77d74a84309615ab57fdc28055c9ef54b9a3` before diagnosis.
- Repair/evidence commit: `7e96b0832fa65884dbf67665e81d4123081930bf`.
- Integration tip before merge: `e53775f99a732eedf9d6b6895259746d7c0d54cb` (retained original packaged Save-failure receipt).
- Integration merge: `157b8c4de8edf040471649201d88812b45493f26`; `git merge --no-ff`, no conflicts.

[Repair diagnosis and submission matrix](evidence/pdex-19-refinement.md) preserve the original native red finding rather than replacing it with a controller success. Optional date/time controls are reinitialized only on explicit clearing; normal validation remains enabled. Tag busy-state release and Cancel compact captions are repaired within the same editor. The root's original packaged cancellation workflow must be rerun on this source; native repair acceptance is pending.

## PDEX-24 integration — 2026-10-13

Source branch: `codex/pdex-24-refinement`; worker starting tip `1906b875ccded5a77deeff8fcbecc10454733677`; authorized base `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.

Full retained worker implementation lineage, in order:

1. `66d6046372b66eb2c10ee4ef0ef2bf819d8f274f` — local catalog and completion identity.
2. `2c28f6af45133518a78711a7b24af639446cca59` — next-cycle target revisions.
3. `9e3dc8d879d9d4d81962331dcac738d0847e3d63` — sourced goals and localized names.
4. `08075695b45b86bfc20f5e87b48015f6804d00eb` — partial-cycle frequency transitions.
5. `300ef11915a5d6cda0b365057846b48064d311be` — threshold provenance and attained days.
6. `b0ed495dd5346a074ae902c57c7a3b283c113451` — independent writes and uncertain retries.
7. `ff01224b275c38c72ab202243da564793510dad4` — shared create/edit draft controller.
8. `59198eb27b98ea47229f2a0ac1ff4d1e50ed11e5` — one lived-date capture per read.
9. `c2b7b5b1d0a0d337c73fc4106f66a2b7946b63aa` — settings UI, selected-Vault read authority and refresh preservation.
10. `63e045bd914fe824cbd6af6550540962425b0ec4` — worker synchronization with `b96b77d74a84309615ab57fdc28055c9ef54b9a3`, retaining scoped Task/Collaboration/Habit CSS.
11. `d5632592765a189dc69f02b607b9a05b6b5e2131` — unconfigured sourced weekly frequency/check-in preservation.

Integration merge: `71ebf5d2a8e59aa623115b1c15abae0da890e826`, following PDEX-19 repair merge `157b8c4de8edf040471649201d88812b45493f26`. `git merge --no-ff` completed without conflicts, including the shared `frontend/main.ts` changes. Both source branch tips are reachable; all three scoped CSS blocks remain. Initial tracked/untracked inventory was clean.

[PDEX-24 application/DOM evidence](evidence/pdex-24-refinement.md) records independent catalog/completion identities, cycle boundaries, sourced overlays, safe retries and PDEX-25's goal-history seam.

Combined integration validation at `71ebf5d2a8e59aa623115b1c15abae0da890e826`:

- `npm run build` passed.
- Eight focused Task/Habit frontend suites passed 50/50 (`task-refinement`, `task-presentation`, `task-history-render`, `task-history-editing`, `habit-settings`, `habit-completion`, `habit-localized-names`, `habit-canonical-navigation`).
- `node scripts/acceptance/task-tag-save-dom.mjs` passed all five actual-button submission cases at widths 1280/680, including tag creation + cancel time and end-only clearing. Production WebKit emitted submit and `update_task` with no invalid-control events; the synthetic IPC boundary does not establish file persistence.
- `tests/browser/habit-settings.mjs` passed 3/3 in installed Chrome using bundled Playwright (no added dependency): create/retry at widths 1200/560 and current/pending next-day threshold editing. These DOM checks retain the public UI controller and synthetic save boundary.
- `cargo test --manifest-path src-tauri/Cargo.toml --test habit_catalog_workflow --test habit_completion_workflow --test habit_snapshot_workflow` passed 39/39 (12 + 12 + 15), including real isolated file writes, fresh-application readback, producer publication, corrupt-file preservation, cycle transitions and selected-Vault consistency.
- `git diff --check` passed; no broad baseline fixes were attempted.

PDEX-24's implementation prerequisite is verified for root to claim PDEX-25; PDEX-24 remains in-progress pending review/native save/reopen acceptance. Root reruns repaired PDEX-19's original packaged case separately. No installation, remote Git, main merge, dependency addition, normal profile/Vault write or ticket closure occurred.

## PDEX-19 More release and PDEX-22 integration — 2026-10-13

Clean tracked/untracked inventory on integration `2e1c56c10e6b75bb2daaf1a5dbbd94411a549854` preceded both merges. Full history is retained without conflicts:

- PDEX-19 source branch `codex/pdex-19-refinement`, additional repair/evidence `162067f1169bfc6bfcf2a537eacc850f8ced275a`.
- PDEX-19 merge `0548e6eb4b6d1bb3dd204b74b9c328677d27c9ec` via `git merge --no-ff`; Schedule/Move controls become available again after Save without clearing applicability-based disabling.
- PDEX-22 source branch `codex/pdex-22-refinement`, actual worker start `b96b77d74a84309615ab57fdc28055c9ef54b9a3`; authorized snapshot `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- PDEX-22 implementation `c65106d9439d02383eefdca9149f5e02d6500315`.
- PDEX-22 synchronization `943151a72656187021313dd3814f19a763095c71`, merging integration `2e1c56c10e6b75bb2daaf1a5dbbd94411a549854` and retaining Task/Habit imports and boundaries.
- PDEX-22 additional uncovered-year DOM check `6dfafa6d18fdb4a4992cc038cc35f4b894a0a287`.
- PDEX-22 retained evidence `380d160a6cb6d80e5afd5294e318f53edb10636d`.
- PDEX-22 merge `dc4480eea91c699aaa2df2547becf160f7d4fcaa` via `git merge --no-ff`, following the More release merge.

[PDEX-22 implementation evidence](evidence/pdex-22-refinement.md) records the reused Task create/edit/recovery route and existing appearance preference storage. Officially sourced holiday data covers Gregorian 2026–2027 with actual/observed distinctions and explicit unavailable years. The shared Calendar changes preserve PDEX-19 repairs and PDEX-24 settings imports; all scoped style blocks remain. Root's repaired PDEX-19 native cancellation Save/disk readback on the earlier fixed source is separately observed, with restart still pending; this merger makes no additional native claim. PDEX-22 remains in-progress pending combined review and source-bound packaged acceptance. Validation is recorded below.

Validation at combined merge `dc4480eea91c699aaa2df2547becf160f7d4fcaa`: `npm run build` passed; Calendar/holidays/appearance frontend suites passed 41/41 including the uncovered-year production DOM check; `task-tag-save-dom.mjs` passed all five actual WebKit submission cases at widths 1280/680 with post-Save More availability; Calendar/Appearance real application workflow tests passed 20/20 (9 + 11); `git diff --check` passed. Branch tip reachability was verified. Fixtures used isolated data and no model calls. No broad baseline fixes, App installation, remote/main operation or ticket closure occurred.

## PDEX-25 claim — 2026-10-13

Branch `codex/pdex-25-refinement`, separate `/private/tmp/pdex25-refinement.noindex` checkout from integration `8bcf66f96ba021e5c7a5c5eac39ac3c8cb9557d0`. PDEX-24 shared application interface is verified; full upstream native acceptance is not inferred. Goal/lifecycle/history implementation follows the existing spec and retains every increment.

## PDEX-21 claim — 2026-10-13

Branch `codex/pdex-21-refinement`, separate `/private/tmp/pdex21-refinement.noindex` checkout from integration `0230a35b0933a0e092fa9175e70932c3c27a6054`. Verified shared Task editor/application and PDEX-22 nearby-dialog seams retained. Full source-bound native acceptance remains separate.

## PDEX-19/24 source-bound native partial checkpoint — 2026-10-13

Frozen source `2e1c56c10e6b75bb2daaf1a5dbbd94411a549854`; binary `5806c58cef9c046482eb4e858fa8942509e07a7149456c4ef5bf8b80f16045ec`. Real packaged Task cancellation recovery and Habit creation/check-in/current/pending goal-cycle writes and fresh-process UI readback pass in an isolated synthetic Vault/profile. [Receipt](evidence/pdex-19-24-native-partial-2026-10-13.json) retains exact inputs, disk results, launch sequence, source/data hashes and limitations. Owned candidate quit/unregistered; normal installation remains unchanged. Full acceptance remains pending.

## PDEX-20 integration — 2026-10-13

Clean tracked/untracked inventory on `67fb436f9f30c85ca424380ce2ab4b155b79fed6` preceded `git merge --no-ff codex/pdex-20-refinement`. No conflicts; root's latest claim reconciliations and source-bound native PDEX-19/24 receipt remain retained.

- Source branch: `codex/pdex-20-refinement`; actual starting ancestor `b96b77d74a84309615ab57fdc28055c9ef54b9a3`; authorized snapshot `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- Application increment: `4537ee27b0ee2038f91434624ca5f2c7b1f03846`.
- PDEX-19 submit-repair merge: `89ab14fb6f7e94b185ad53547b92c73d6ff82cea`, retaining `7e96b0832fa65884dbf67665e81d4123081930bf`.
- UI/tests/docs increment: `3540cfaf5c71f56c4c56c120d6d9c436ea3fabb6`.
- PDEX-19 More-repair merge: `387c92fb9bfcb2c94b21e30da02c76c148664cf6`, retaining `162067f1169bfc6bfcf2a537eacc850f8ced275a`.
- Integration synchronization: `127d92080c15821a994e8c541992ab003034a4c4`, retaining integration `490eddb91e14aa6ebc69b455ddbf1db931bac83d` and both appended scoped Task/Calendar CSS blocks.
- Latest lifecycle/native-receipt synchronization: `5388e354e776ac3e2c616806293c22ddc448918d`, retaining integration `92b9652c8a132cc56c1733710dcb300af48e5227`.
- Retained evidence: `51ba75ff3d0640cc7fa2036b6aaffa777caddcf8`.
- Integration merge: `267647bc1cf44e25a80341350720dd3687e8afcc`.

[PDEX-20 application/DOM evidence](evidence/pdex-20-refinement.md) and [worker source-bound checks](evidence/pdex-20-focused-checks-2026-10-13.json) preserve full behavior and limitations. Parent updates retain independent Task fields and lifecycle; one-level folder deletion unassigns lists without deleting Tasks. Shared schema 3 remains compatible with old fields and PDEX-19 properties. Integration validation is recorded below; native organization/combined Calendar acceptance and independent review remain pending. No installation, remote/main operation, dependency change, personal UI/data write or ticket/spec closure occurred.

Integration checks at `267647bc1cf44e25a80341350720dd3687e8afcc`: build passed; real application Task/Today/Calendar/adapter/Collaboration Task tests passed 176/176 (40 + 8 + 9 + 14 + 105), covering independent parent fields/state, cycles/foreign binding, folder scope/archive/delete/restore and safe legacy schema updates. Production WebKit organization and tag-save scripts passed at 1280/680; synthetic IPC boundaries are retained as UI evidence only.

The initial six-suite frontend run passed 66/67: `uncertain Calendar creation retains a frozen original draft until readback enables an exact retry` observed the correct original value/open dialog/retry identity but sampled disabled=false during its 40ms fixed wait. Immediate isolated rerun passed 1/1 without any source or test edit; the freeze implementation is unchanged by PDEX-20. This is recorded as an intermittent test result, not a confirmed product regression or an erased failure. A sequential focused rerun is recorded below. `git diff --check` and worker/root tip reachability checks passed; the full native/independent review remains pending.

Sequential rerun (`node --test --test-concurrency=1` on task-presentation/task-refinement/task-history-editing/task-history-render/task-organization/compact-calendar) passed 67/67 without edits. Log: `/private/tmp/pdex20-merger-frontend.log`. The earlier concurrent failure remains above; no full frontend baseline-green claim is made.

## PDEX-25 integration — 2026-10-13

Clean tracked/untracked inventory on `86980149b4478a685e03a58dbf213cd6a8bf5fc9` preceded `git merge --no-ff codex/pdex-25-refinement`. Integration merge `a9bbc53f8498d0ed0021fc23591a8782d1656be7` completed without conflicts and retains Task/Calendar contracts, PDEX-24 catalog boundaries and the root-owned native PDEX-19/24 receipt.

Source branch `codex/pdex-25-refinement`; starting tip `8bcf66f96ba021e5c7a5c5eac39ac3c8cb9557d0`; authorized snapshot `918e7e0d9c4b2c524c429bfd309482e328bc4c91`. Full retained lineage:

1. `fa1e13e2b12f57ed1c848234418ba09b0e1aa0d1` — synchronization with claim/prerequisites `2e1c56c10e6b75bb2daaf1a5dbbd94411a549854`.
2. `f49b2ce4914489285f9a56af85db309279c86262` — full canonical detail/history and qualified statistics.
3. `1bd63278cfd4e875102543efa8b6d13fb5093ee4` — inactive intervals and same-identity restoration.
4. `eeb68d9d78999a56c5e5fd37a4cb353ae1a41470` — achieved open-week peaks and scoped historical corrections.
5. `dc6feb6d8dd20870ee22543bbf773b33c4e35c5c` — retained validated source history and unknown target coverage.
6. `96fab30ae58d5785a809e21ab1010d40b773d1bb` — selected detail, history and inactive finder UI.
7. `c4a7f7c4fabbc053e14d3615d0b6636d37f9ef07` — qualified day/week units and revision-bound lifecycle retry.
8. `b9ae1948a88583fc8fd72b3b6a50945655bfe88f` — synchronization with integration `86980149b4478a685e03a58dbf213cd6a8bf5fc9`.
9. `0bfc4d837ead4dd1f0ffe027d7bdebc1184d9685` — same-lived-day activity transition evidence.
10. `58750c35d368aec93dbc1c13d48455026e49b8ad` — implementation evidence and pending acceptance.

[PDEX-25 implementation evidence](evidence/pdex-25-refinement.md) retains real application writes/fresh readback, qualified source/goal coverage and UI seams. Main Habit history remains bounded while detail pages authoritative retained history; inactive periods preserve old attainment without bridging current streaks or writing an external lifecycle. Shared settings reuse PDEX-24. Native packaged acceptance and independent integration review remain pending; no PDEX-26 claim or ticket/spec closure is inferred. Integration checks are recorded below. No normal App install, personal UI/data write, remote/main operation or dependency change occurred.

Validation at combined merge `a9bbc53f8498d0ed0021fc23591a8782d1656be7`: build passed; seven focused Habit/historical/interface-language frontend suites passed 33/33; actual Chrome create/settings/detail DOM tests passed 5/5 at 1200/560 using the bundled Playwright runtime without dependency changes. Real application catalog/completion/details/snapshot workflows passed 48/48 (12 + 12 + 9 + 15), including same-day pause/restore, unknown gaps, old-goal correction, qualified day/week peaks, retained source-history publication, uncertain retry and fresh-instance readback. `git diff --check` and branch-tip ancestry checks passed. Browser save/IPC fixtures remain UI evidence; native packaged write/restart verification is pending and is not inferred from these results.

## Final feature frontier integration — PDEX-25 guards and PDEX-21 — 2026-10-13

Canonical inventory at `ca266b390cadf47a021ff3e743a2113a5abaff7b` was clean. Both worker inventories were also clean and their committed handoff evidence confirmed final local implementation readiness. No uncommitted WIP was merged. Both merges retained full history with no conflicts, including the shared Today application:

- PDEX-25 branch `codex/pdex-25-refinement`, pre-repair synchronization `a72b308ece1fa2691b02d9a73e1e3693d0b7fe19` with integration `7e67ef4ff890dc84d724af3409d678044d7ac714`.
- PDEX-25 scoped repair `b545e3ed14315bea5923ef948b7e33815013a338` rejects mixed-lived-date or replaced-source transition evidence before catalog CAS, without changing the clock framework or detail reader.
- PDEX-25 final synchronization `739d0df901e1a58d5d7acc54dcf636fc325858cf` retains the root-owned native receipt precision at `ca266b390cadf47a021ff3e743a2113a5abaff7b`.
- PDEX-25 integration merge `ccffecb45de940e1c1ea140200c3930676e02e63` via `git merge --no-ff`.
- PDEX-21 branch `codex/pdex-21-refinement`; start `0230a35b0933a0e092fa9175e70932c3c27a6054`; claim synchronization `df54d86e178a5dab2f03c463ed1b24ccf07763c9` retains `490eddb91e14aa6ebc69b455ddbf1db931bac83d`.
- PDEX-21 implementation `c7390d810874456fcf86e65881498cd901670442`.
- PDEX-21 synchronization `f65c8df7dfe4b91fa7dec089c49df5d760414e38` retains integration `ca266b390cadf47a021ff3e743a2113a5abaff7b` and the combined Task/Calendar/Habit contracts.
- PDEX-21 bounded follow-up `d2ef2a209b8307a212e4fe2b26c7fb5178445a6b` preserves explicit time retry separately from failed arrangement cancellation.
- PDEX-21 evidence `51b55451451b8ca0ee88670eb17858bf0ae046b6`.
- PDEX-21 integration merge `ef8b47387199635ef70925ee823c574dd1c7a22f` via `git merge --no-ff`, following the PDEX-25 guard merge.

[PDEX-21 evidence](evidence/pdex-21-refinement.md) retains four-size production pointer/WK checks, original broad labels, shared nearby editor and source-bound Current arrangement cancellation. [PDEX-25 evidence](evidence/pdex-25-refinement.md) retains the real 04:00/source-replacement red/green findings and qualified statistics. Main and installed App remain unchanged. No intended normal-profile or normal-Vault business writes were performed; normal-profile byte identity is not claimed, consistent with the root's unintended normal-profile reopen qualification in the native receipt. Scoped native PDEX-19/24 results and their separate Save-action qualifications are retained, not broadened to acceptance of this newer source. PDEX-21/25 remain in-progress; independent review, PDEX-26 claim and combined packaged acceptance remain separately pending. Final combined checks are recorded below.

Root additionally required the worker to retain the latest guard integration. The clean PDEX-21 worker merged committed integration `ef8b47387199635ef70925ee823c574dd1c7a22f` via `git merge --no-ff` as `ce5f70424aa9a48a8a57e057db1ecd576b3f9ca7`; canonical integration retained that synchronization via `git merge --no-ff` as `a7c6269253e676bcce328d24c4b74e74ceb51991`. No source tree change or history rewrite occurred between `ef8b473` and `a7c6269`; original implementation/evidence hashes remain reachable.

Combined implementation checks on this source: build passed; Today refinement/plan-time production UI suites passed 29/29 with real Chrome pointer and macOS WK DOM; focused Habit/historical/language frontend passed 33/33; Habit create/settings/details Chrome DOM passed 5/5. Real Habit catalog/completion/details/snapshot tests passed 50/50 (12 + 12 + 11 + 15), including the 04:00 boundary and real source-replacement guards; daily-plan/Today/shared-Task application tests passed 79/79 (17 + 54 + 8). These are source/application evidence, not packaged native completion. Logs: `/private/tmp/pdex-final-merger-today-ui.log`, `/private/tmp/pdex-final-merger-habit-ui.log`, `/private/tmp/pdex-final-merger-habit-dom.log`, `/private/tmp/pdex-final-merger-rust.log`. No initial failures occurred in these final combined runs; the earlier PDEX-20 intermittent result remains separately retained above.

Shared Task relation/editor/history and Calendar frontend passed 67/67 sequentially; actual WebKit organization/tag-save workflows passed at 1280/680, including post-Save More availability and scope/parent controls. Real Task/Calendar application tests passed 49/49 (40 + 9). Logs: `/private/tmp/pdex-final-merger-shared-ui.log`, `/private/tmp/pdex-final-merger-organization-dom.log`, `/private/tmp/pdex-final-merger-tag-dom.log`, `/private/tmp/pdex-final-merger-shared-rust.log`. `git diff --check`, worker clean status and final branch ancestry checks passed. All feature implementation prerequisites are verified for root's subsequent PDEX-26 claim; no claim, closure, native combined acceptance or installation is performed by this merger.

## Final PDEX-25 documentation handoff — 2026-10-13

Clean integration `e046726007fa28ed47bf9078481cf1b7b82b70fb` retained source branch `codex/pdex-25-refinement` documentation commit `f645827632044c9df1dab64cce8d4c0905eef417` via `git merge --no-ff` as `83d14cd721ef5ea498e1e6c06e6c8449713b6202`. The diff contains only the ticket/evidence handoff, with zero product changes; no test rerun is warranted. Final feature validation remains bound to the same product source above. The native normal-profile reopen limitation is preserved rather than claiming byte identity.
