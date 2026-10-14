# 24: Habit 新增、编辑与目标设置

**What to build:** 在原Habits汇总和今日列表上一起提供本地新增与编辑，共用名称/频率目标/开始日期/可选emoji和分组设置，创建后直接打卡。编辑保留身份与历史，目标以有生效日期的revision在下周期生效，真实保存和跨周期重开正确。

**Blocked by:** None

**Status:** claimed

**Triage:** ready-for-agent
**ID:** PDEX-24
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** in-progress
**Implementation:** claimed for reimplementation; source changes not yet started
**Date:** 2026-10-11
**Publication branch:** codex/dashboard-experience-refinement-spec
**Publication base:** d91d636b395d8c42c0c516827db37ca2565260a4
**Spec snapshot:** 0b0d727b23166ba1ccf9708656ab2bf00f6188ed
**Breakdown decision:** 用户在合并为8张票后明确回复“同意”，批准范围、粒度与直接依赖。

## Acceptance criteria

- [ ] 顶部加号创建本地Habit，开始日期默认当前lived date；每日完成、每周1–7不同达标天及现有时间阈值可用。
- [ ] 名称、可选emoji/扁平分组和频率/目标连贯设置；编辑入口可发现并支持右键，新增/编辑共用表单，已有值带入。
- [ ] 创建后立即在原今日列表打卡，新application及重开能读回定义/完成，不必先建TickTickHabit，不自动外部创建或同名映射。
- [ ] 本地定义/catalog与canonical completion有独立稳定key，derived snapshot不作可写主数据库，旧sourced Habit/语言配置/映射保留。
- [ ] 每天重复completion以及本地/映射外部同时完成只算一天；撤回本地不抹外部仍支持的完成，不伪造实际活动时刻。
- [ ] 每日阈值保留目标时刻及day relation，特别是次日入睡规则；未知/冲突沿用来源规则，不降成通用当天八点前。
- [ ] 改名、图标和分组可立即生效而不改身份/来源/历史；开始日期修改不删除旧事实或伪造早期完整覆盖。
- [ ] 周三周目标3天改5天后本周仍3、下周5；日目标当前日仍旧值、下个lived day生效，界面current/pending可辨认。
- [ ] 保存目标revision并保留历史目标段，真实跨04:00、周日到周一和重开都用正确目标，而非仅改UI标签。
- [ ] 编辑带入待生效目标；再次修改替换同一未来计划并留修订，改回当前目标可取消pending；历史达标不因新目标被重算。
- [ ] 频率切换以旧周期结束为界，不完整新周期明确显示且不计完整连续，不按比例降低目标，不混加天/周连续单位。
- [ ] 外部producer/snapshot刷新更新其evidence但不覆盖本地名字/目标revision/生命周期或移除新Habit；没有外部历史仍可本地创建和打卡。
- [ ] 旧数据升级/默认处理保留源证据，不覆盖损坏原文件；selected-vault绑定、revision、操作身份及保存读回保护定义和完成。
- [ ] 创建或编辑失败/冲突/重试不产生第二个对象、丢稿或显示假生效；跨来源结果独立，正常App不会因本票访问真实外部写入。
- [ ] Habits默认仍本周摘要＋今日列表，既有近期历史、actual time未知和source coverage保留，不默认进入新统计页。
- [ ] 真实业务写入/读回及新实例验证新增、已有Habit编辑、周期推进、来源刷新与去重；详情内编辑入口由PDEX-25接入。

## Verification

PDEX-SPEC-02 stories 68–72、75–79、83–85、87；共同承担 1–3、88–91 的保存与保留边界。

使用既有application业务入口、真实持久写入/读回和实际DOM或指针检查外部行为；
保存后用新实例或重开验证，保留适用的宽窄窗口和打包来源证据。prototype只作
指定区域设计依据，源码字符串、mock、save toast或原型内存不代替真实验收。
未要求变化的区域按实际App基线保留；不增加依赖、外部服务或部署配置。

## Execution

- 2026-10-11：经用户批准发布本地完整票体，未分配assignee、未claim、未开始实现。
- 后续授权claim时记录实际owner、working branch、base commit、增量实现/评审/
  验收commits、结果和限制。每票可多次commit，完整验收前不关闭。
- 本票发布不授权安装正常App、main merge、remote push或关闭父规格。

## Reimplementation claim — 2026-10-13

Owner: Codex implementer `/root/pdex24_reimplementation`. Working branch
`codex/pdex-24-refinement-reimplementation`; actual implementation base
`b7dcd71b50b42de4a706d460d635f99bf059770d` (the integration branch tip verified
before edits). The worktree was clean at claim time. Local Git only; no package
installation, main merge, or remote operation.

## Implementation evidence — 2026-10-13

Implementation commits on `codex/pdex-24-refinement-reimplementation`:

- `b7fc4f3e118f17fc47f34fdee3be16474108a2a9` — canonical local Habit catalog,
  selected-Vault persistence/readback, goal revisions, completion projection,
  and application workflow tests.
- `38214160d23b70f57b68c79363839816ad9758cb` — Habits summary create entry,
  shared create/edit form, compact row edit affordances, and UI contract tests.

Observed verification:

- `cargo test --manifest-path src-tauri/Cargo.toml --test habit_definition_workflow`:
  8 passed, 0 failed. Includes create → local check-in → fresh application
  readback without an external snapshot, weekly goal change/reopen at Monday,
  daily lived-day boundary, next-day time relation, operation retry/revision
  conflict, source refresh, damaged catalog, and the
  `editing_a_sourced_habit_without_a_recognized_goal_preserves_its_source_goal`
  case.
- `cargo test --manifest-path src-tauri/Cargo.toml`: exit 0; all non-ignored
  Rust unit, integration, and doc-test groups passed (6 ignored environment-
  gated tests).
- `node --test tests/frontend/habit-definition-ui.test.ts tests/frontend/habit-localized-names.test.ts`:
  7 passed, 0 failed.
- `node --experimental-strip-types --check frontend/main.ts` and the same check
  for `frontend/interface-language.ts`: passed.
- Local Chrome smoke used the synthetic IPC fixture identifiers
  `synthetic-habit-target` and `synthetic-completions`, with no Vault or external
  Habit writes. The existing weekly-summary/today-list layout remained the
  default; Add opened the shared form with the current lived date; choosing
  weekly goal exposed the 1–7 target. A synthetic stale-revision response kept
  the `Daily stretch` / `Health` draft, blocked blind replay, refreshed the same
  binding to `revision-2`, and then enabled a fresh save. Cancel closed an
  unsaved form without invoking a write.
- Before integration, `npm run build` in this isolated checkout could not find
  local `tsc` / `node_modules/.bin/tsc`. No dependency was installed. The
  frontend source was syntax-checked with the available Node runtime; after
  integration, the build passed by putting the primary checkout's existing
  `node_modules/.bin` on `PATH` (recorded below). Packaged save/readback
  acceptance remains PDEX-26.
- `npm run test:frontend` was attempted and exited nonzero. Its output includes
  child tests that cannot spawn the absent `node_modules/.bin/tsc`; several
  other checks outside this ticket also reported failures. The focused Habit
  frontend tests above pass independently.

The PDEX-24 implementation commits above preserve the PDEX-24-only scope.
Selected-Habit detail and lifecycle remain PDEX-25; packaged acceptance remains
PDEX-26.

## Post-integration merge and verification — 2026-10-14

- Merged the exact local integration tip
  `14bd7629f8961516eab7b534703d52f0e9622ae8` from
  `codex/dashboard-experience-refinement-reimplementation` into this ticket
  branch with merge commit
  `befded5be81bca8aabf698c80051da98dfe3b9f0`. Its first parent is the prior
  PDEX-24 tip `8ff52054948897b03f737bb7cc3ed36ae87049ba`; its second parent is
  the integration tip. No squash or rebase was used.
- The only textual merge conflict was the module list in `src-tauri/src/lib.rs`.
  Resolution retains `habit_catalog`, the shared `habit_producer` and `habits`
  modules once each, PDEX-24's `save_habit_definition` command registration,
  and PDEX-19's task-property command registrations. The merge retained both
  feature histories. A follow-up PDEX-24 integration fix is
  `6b6edd485a7c73021fc588198351b1ed3ab7f24e`
  (`fix: report Habit workflow outcomes to vault barrier`): it fills
  the new Habit fields in the error snapshot and makes save/refresh return the
  success result expected by the existing Vault-switch pending-write barrier.
- `cargo test --manifest-path src-tauri/Cargo.toml`: exit 0; 102 unit tests and
  434 integration tests passed, 6 environment-gated tests ignored, doc tests
  passed (0 defined). This run includes all eight
  `habit_definition_workflow` cases, including
  `a_new_local_habit_is_recordable_and_survives_a_fresh_application_without_a_snapshot`
  and
  `editing_a_sourced_habit_without_a_recognized_goal_preserves_its_source_goal`.
  The create/readback case saves a definition and first local completion to a
  synthetic selected Vault, creates a fresh application service, and verifies
  the definition and completion are read back without an external snapshot.
- `cargo test --manifest-path src-tauri/Cargo.toml --test
  habit_definition_workflow`: 8 passed, 0 failed.
- `node --test tests/frontend/habit-definition-ui.test.ts
  tests/frontend/habit-localized-names.test.ts`: 8 passed, 0 failed. The added
  case checks that Habit save and stale-conflict refresh report outcomes to
  the Vault-switch barrier.
- `node --experimental-strip-types --check frontend/main.ts` and
  `node --experimental-strip-types --check frontend/interface-language.ts`:
  both passed.
- `env PATH="/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/node_modules/.bin:$PATH" npm run build`:
  exit 0 using the primary checkout's installed tools; no dependency was
  installed in the ticket worktree.
- `git diff --check`: passed with no whitespace errors; the worktree was clean
  before this evidence update. The initial post-merge build found the missing
  Habit error-snapshot fields and `Promise<void>`/`Promise<boolean>` mismatch;
  the focused test was first observed failing, then passed after the narrow fix
  recorded above.
- Local Chrome synthetic IPC smoke remains the UI evidence described above;
  the fixture identifiers were `synthetic-habit-target` and
  `synthetic-completions`. It verified the current lived-date default, shared
  compact form, weekly 1–7 control, and draft retention/same-Vault refresh
  after a stale revision. It performed no Vault or external Habit writes.
- The broad `npm run test:frontend` attempt from the isolated pre-integration
  checkout remains nonzero because child checks cannot spawn its absent local
  `node_modules/.bin/tsc` and it reported additional checks outside this
  ticket. This was not rerun with the primary toolchain; the focused frontend
  tests and `npm run build` passed. No packaged save/readback acceptance is
  claimed; PDEX-26 owns that gate.
