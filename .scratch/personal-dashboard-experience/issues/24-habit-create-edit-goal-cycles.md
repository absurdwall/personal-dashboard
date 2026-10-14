# 24: Habit 新增、编辑与目标设置

**What to build:** 在原Habits汇总和今日列表上一起提供本地新增与编辑，共用名称/频率目标/开始日期/可选emoji和分组设置，创建后直接打卡。编辑保留身份与历史，目标以有生效日期的revision在下周期生效，真实保存和跨周期重开正确。

**Blocked by:** None

**Status:** claimed

**Triage:** ready-for-agent
**ID:** PDEX-24
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** in-progress
**Implementation:** committed on `codex/pdex-24-restart`; independent review and packaged acceptance remain pending
**Date:** 2026-10-11
**Publication branch:** codex/dashboard-experience-refinement-spec
**Publication base:** d91d636b395d8c42c0c516827db37ca2565260a4
**Spec snapshot:** 0b0d727b23166ba1ccf9708656ab2bf00f6188ed
**Breakdown decision:** 用户在合并为8张票后明确回复“同意”，批准范围、粒度与直接依赖。

## Clean reimplementation tracking — 2026-10-14

- Integration branch: `codex/dashboard-experience-refinement-restart-20261014`; ticket base is its exact tip `8275615a3f3cad2a783d74561472c78c4bbeb493`.
- Ticket branch/worktree: `codex/pdex-24-restart` at `/private/tmp/pdex-restart-20261014.noindex/pdex-24`; commits in order: `ae05611018bd7266c7dc1d1c13e343922e2bd7ee`, `c4bbc2bf1b12caa9af08d31cf71a2aa522f71228`, `784dfcdd3d685cddf82ce93cbec8ae64e1ec6721`, `c47623979034c001122f7234839e2c9ebb7893ac`, `df33dd9a9a52cc4236d9a1fc35e784e7c031ef1c`, `a38a3dfd7f5a198f945ee5e1b85c24621de1df47`, `5cce43bb2da2ee19e64340b309f4479cf74acde5` (localized-name code/tests), `ab3d0d4390c672979ee8fc5f5dd99fbd38282807` (catalog contract docs), `7e5239cf8b3ca94d57ad561cd51292608f3ed316` (ticket evidence), `d2c345b0fe26a1f9e3e25f34cf7acfb42a90f0d1` (commit-hash correction), `454bb31c6d3fefb36b72bd539b1a89ae18428ecf` (final-review fixes), `614170234ad76b0bdebb96cbc5550e5641875aa6` (review verification), and `b630bcfcc448b8ecef874c0a42938d2cda2bc450` (historical threshold regression). A final verification record follows these.
- Verification recorded at the initial clean reimplementation checkpoint: `cargo test --manifest-path src-tauri/Cargo.toml --test habit_completion_workflow --test habit_snapshot_workflow --test habit_definition_workflow` (37 passed); `node --test tests/frontend/habit-completion.test.ts tests/frontend/habit-canonical-navigation.test.ts tests/frontend/habit-localized-names.test.ts tests/frontend/interface-language.test.ts` (29 passed); `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/index.mjs node --test tests/browser/habit-definition-workflow.mjs` (3 passed); `npm run build` passed; `git diff --check` passed.
- The Rust workflow uses temporary Vault files through `TodayApplication`; the browser test uses a local IPC fixture and checks the real DOM flow. Packaged-app acceptance remains pending. Integration merge is waiting for the parent integration sequence; check and merge its latest tip before integration.
- The earlier implementation remains on its previous branch with full history and is not this ticket's source baseline.

## Independent Spec-review follow-up — 2026-10-14

- Follow-up implementation commit: `c476239` (`Fix Habit partial-cycle and local-name behavior`). A daily-to-weekly revision now starts counting at the later of the current Monday, its effective lived date, and a later Habit `startDate`; it preserves the full weekly goal. The first partial week is identified in the row, excluded from the comparable full-week summary, and counted in an explicit summary note. A weekly period beginning on Monday remains a full week. Historic goal contexts remain tied to their original cycle.
- Local source-Habit overlays now display and prefill the saved local name ahead of source `localizedNames`. The source snapshot remains byte-for-byte unchanged during the local edit; the Vault-backed readback keeps both configured translations and refreshed source evidence.
- Red-to-green evidence: before the repair, the temporary-Vault `daily_count_goal_revision_takes_effect_on_the_next_lived_day_and_survives_reopen` check observed `completed_count: Some(1)` instead of `Some(0)`; the browser regression also observed the raw source name in edit prefill and no partial-cycle label. Both regressions pass after `c476239`.
- Final targeted verification after the follow-up: `cargo test --manifest-path src-tauri/Cargo.toml --test habit_completion_workflow --test habit_snapshot_workflow --test habit_definition_workflow` — 36 passed; `node --test tests/frontend/habit-completion.test.ts tests/frontend/habit-canonical-navigation.test.ts tests/frontend/habit-localized-names.test.ts tests/frontend/interface-language.test.ts` — 29 passed; `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/index.mjs node --test tests/browser/habit-definition-workflow.mjs` — 3 passed; `npm run build` — passed; `git diff --check` — passed.
- The prior blanket statement that all added Rust code matched rustfmt output was too broad. `rustfmt --edition 2024 --check src-tauri/src/habits.rs src-tauri/src/today.rs` still reports formatting differences in pre-existing ranges; those ranges also differ when formatting the exact integration-base files and were left untouched. The PDEX-24-owned Rust source additions/edits were compared with formatter output and formatted. The new workflow test file is formatter-clean: `rustfmt --edition 2024 --check src-tauri/tests/habit_definition_workflow.rs` passes.
- Exact follow-up commit: `c47623979034c001122f7234839e2c9ebb7893ac`. Integration remains at `8275615a3f3cad2a783d74561472c78c4bbeb493`; this follow-up does not merge it. Packaged-app acceptance remains pending.

## Weekly target revision edge follow-up — 2026-10-14

- Review found that checking only the latest active revision could lose the first partial-week boundary: if daily-to-weekly takes effect Tuesday and a later weekly-to-weekly target revision is effective Thursday, Friday's projection could incorrectly restart the count on Monday. `local_weekly_period_start` now scans the scheduled revisions effective by the current lived date and preserves the latest in-week transition from a non-weekly goal to a weekly goal, still bounded by the Habit `startDate`. A weekly-to-weekly revision alone does not reset that partial period.
- Red-to-green evidence: `cargo test --manifest-path src-tauri/Cargo.toml --test habit_definition_workflow weekly_target_revision_keeps_the_partial_week_start_from_frequency_transition -- --exact` failed before the fix with actual period start `2026-09-07` versus expected `2026-09-08`; the same command passed after the fix. The regression creates and revises a local Habit through the public workflow in a temporary Vault, persists the later target revision as Thursday-effective, then reopens Friday through `app.habits()` and checks target 5, Tuesday partial-period start, one completion counted, Monday completion excluded from the active count but retained in history, and exclusion from comparable full-week summary totals.
- The current save workflow schedules weekly-to-weekly revisions for the next cycle, so the fixture adjusts only that persisted revision's effective date to exercise the required midweek revision chain. All create/edit/completion operations and the final readback use the real temporary-Vault workflow; no external service is called.
- Final targeted verification after this follow-up: Rust workflow command above — 37 passed (12 completion, 10 definition, 15 snapshot); frontend command above — 29 passed; browser command above — 3 passed; `npm run build` — passed; `git diff --check` — passed.
- Exact implementation commit: `df33dd9a9a52cc4236d9a1fc35e784e7c031ef1c` (`Keep partial weekly start across target revisions`). Base remains `8275615a3f3cad2a783d74561472c78c4bbeb493`; integration was not merged. Packaged-app acceptance remains pending.

## Localized-name persistence and catalog contract follow-up — 2026-10-14

- `5cce43b` records the PDEX-24 name behavior fix and regressions; `ab3d0d4` adds [the v1 catalog contract](../../../docs/habit-definitions-v1.md). A source-Habit edit compares the submitted field with the name actually prefilled for the current locale. An unchanged field keeps the source's canonical name and `localizedNames`; only an explicit rename stores `nameOverride: true` and takes precedence in every locale. Existing v1 catalogs without this optional marker read it as `false`. Source snapshot bytes and source evidence remain separately owned, and unmarked overlays continue to follow a refreshed source name.
- Red evidence before the fix: `cargo test --manifest-path src-tauri/Cargo.toml --test habit_definition_workflow source_habit_non_name_edit_keeps_canonical_name_and_localized_names_across_refresh -- --exact` failed because readback was `锻炼` where canonical `name` was expected to remain `Exercise`. The browser regression `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/index.mjs node --test --test-name-pattern='source-Habit non-name edit' tests/browser/habit-definition-workflow.mjs` showed the Chinese prefill replacing English display after switching locale.
- The Vault-backed red/green test uses the public save/read workflow, verifies the persisted catalog has the canonical name and no override marker after a group-only edit, checks unchanged snapshot bytes and bilingual configuration, refreshes the source snapshot, and reads again through a new application instance. The existing explicit-rename Vault test now verifies the marker, preserved translations/evidence and post-refresh readback. Browser coverage verifies Chinese non-name edit → English display → Chinese display, plus explicit rename precedence in both languages.
- Latest combined verification at `ab3d0d4390c672979ee8fc5f5dd99fbd38282807`: `cargo test --manifest-path src-tauri/Cargo.toml --test habit_completion_workflow --test habit_snapshot_workflow --test habit_definition_workflow` — 38 passed (12 completion, 11 definition, 15 snapshot); `node --test tests/frontend/habit-completion.test.ts tests/frontend/habit-canonical-navigation.test.ts tests/frontend/habit-localized-names.test.ts tests/frontend/interface-language.test.ts` — 29 passed; `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/index.mjs node --test tests/browser/habit-definition-workflow.mjs` — 4 passed; `npm run build` — passed. The new workflow test file passes `rustfmt --edition 2024 --check`; full source-file rustfmt checks retain only the verified baseline differences noted above.
- `docs/habit-definitions-v1.md` records the catalog path/shape, optional name-override compatibility, goal revision and operation receipt retention, strict unknown-field/version behavior, and explicit safe-upgrade boundary. Integration remains at `8275615a3f3cad2a783d74561472c78c4bbeb493`; this follow-up does not merge integration. Packaged-app acceptance and independent review remain pending.

## Final independent-review follow-up — 2026-10-14

- Exact implementation commit: `454bb31c6d3fefb36b72bd539b1a89ae18428ecf` (`Fix local Habit correction review findings`), on `codex/pdex-24-restart` based on integration tip `8275615a3f3cad2a783d74561472c78c4bbeb493`.
- Historical correction projection now merges local definitions by stable key. Local created Habits are absent before `startDate`, use their local goal and persisted completion for the selected day, and use revised goals only from their effective date. Existing source Habits project a scheduled goal revision at its effective date while retaining the source snapshot's earlier goal context. The added `createdLocally`/source-key collision validation runs before either source or correction merging, so invalid local records cannot overwrite source identity.
- Habit definition storage now uses its own typed storage-document kind. Static message templates can be localized while dynamic OS error text and file paths pass through unchanged. A regression path intentionally contains both old completion-document labels and verifies those path bytes remain intact.
- Catalog diagnostics have narrow Chinese/English translations for malformed schema-v1 JSON, unsupported versions, duplicate keys/IDs and created-local/source-key collisions. Version numbers, stable keys, IDs and parser details remain dynamic values in both languages.
- Red evidence: before the projection fix, the new Vault workflow regression did not return the locally created Habit in the historical correction. Before the collision guard, the injected source-key collision returned `Ready` rather than `Error`. Before the catalog diagnostic translations, the language regression returned the Chinese unsupported-version message in English mode. The dynamic-path regression passes with the typed storage kind; no prior failing test result is claimed for it.
- Final verification on the implementation commit: `cargo test --manifest-path src-tauri/Cargo.toml --test habit_definition_workflow --test historical_correction_workflow` — 22 passed (14 + 8); `cargo test --manifest-path src-tauri/Cargo.toml --lib habit_definition_storage_labels_do_not_rewrite_dynamic_paths` — 1 passed; `node --test tests/frontend/habit-completion.test.ts tests/frontend/habit-canonical-navigation.test.ts tests/frontend/habit-localized-names.test.ts tests/frontend/interface-language.test.ts` — 30 passed; `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/index.mjs node --test tests/browser/habit-definition-workflow.mjs` — 4 passed; `cargo check --manifest-path src-tauri/Cargo.toml` — passed; `npm run build` — passed; `rustfmt --edition 2024 --check src-tauri/tests/habit_definition_workflow.rs` — passed; `git diff --check` — passed.
- `rustfmt --edition 2024 --check src-tauri/src/habits.rs src-tauri/src/today.rs` still reports pre-existing formatting differences also present when formatting the exact integration-base files. Those unrelated ranges remain untouched; changed code was formatted and the added Rust workflow test file is formatter-clean. This ticket branch remains unmerged; packaged-app acceptance is pending.

## Historical correction time-threshold review follow-up — 2026-10-14

- The independent review described a possible gap where a source Habit's historical correction row might retain the snapshot's weekly goal and completion permission after a local weekly-to-time-threshold revision. I traced the actual historical-view path: `TodayApplication::read_date` calls `view_date`, which calls `habit_corrections_for`; the source-backed path calls `project_habit_corrections_with_recording_limit` and then `merge_local_habit_corrections` before returning `TodayView.habit_corrections`. That merge joins catalog definitions by stable Habit key, applies an explicit local name override, and selects scheduled goal revisions whose `effective_on` is on or before the selected lived date, updating both the goal label and `can_record_completion`. The uncatalogued path also invokes the same merge. Historical checkbox writes separately consult the current merged `habits()` view and reject a time-threshold target.
- The added Vault-backed regression `source_habit_weekly_to_time_threshold_revision_updates_historical_correction` uses that same `read_date`/`TodayView.habit_corrections` path. It explicitly renames the source Habit to `Local Exercise`, changes weekly 3 to a next-day 22:30 time threshold effective Monday, then verifies Sunday still shows the prior weekly goal and its correction row remains completion-enabled. On the effective Monday it verifies the correction row shows `Local Exercise` and `每日 次日 22:30`, disables completion, and rejects a historical checkbox write with the threshold-specific diagnostic without creating the canonical completion file.
- No production change was justified: this behavior already passed on the inspected implementation commit `614170234ad76b0bdebb96cbc5550e5641875aa6`; this follow-up adds regression coverage for the precise historical correction projection and retains the review concern for independent re-review. The test commit is `b630bcfcc448b8ecef874c0a42938d2cda2bc450` (`Test historical Habit threshold corrections`).
- Targeted verification: `cargo test --manifest-path src-tauri/Cargo.toml --test habit_definition_workflow --test historical_correction_workflow` — 23 passed (15 + 8); `rustfmt --edition 2024 --check src-tauri/tests/habit_definition_workflow.rs` — passed; `git diff --check` — passed. Integration base remains `8275615a3f3cad2a783d74561472c78c4bbeb493`; this follow-up is unmerged and packaged-app acceptance remains pending.

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
