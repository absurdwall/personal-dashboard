# 24: Habit 新增、编辑与目标设置

**What to build:** 在原Habits汇总和今日列表上一起提供本地新增与编辑，共用名称/频率目标/开始日期/可选emoji和分组设置，创建后直接打卡。编辑保留身份与历史，目标以有生效日期的revision在下周期生效，真实保存和跨周期重开正确。

**Blocked by:** None

**Status:** claimed

**Triage:** ready-for-agent
**ID:** PDEX-24
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** in-progress
**Implementation:** reimplementation started on `codex/pdex-24-restart`; packaged acceptance remains pending
**Date:** 2026-10-11
**Publication branch:** codex/dashboard-experience-refinement-spec
**Publication base:** d91d636b395d8c42c0c516827db37ca2565260a4
**Spec snapshot:** 0b0d727b23166ba1ccf9708656ab2bf00f6188ed
**Breakdown decision:** 用户在合并为8张票后明确回复“同意”，批准范围、粒度与直接依赖。

## Clean reimplementation tracking — 2026-10-14

- Integration branch: `codex/dashboard-experience-refinement-restart-20261014`; ticket base is its exact tip `8275615a3f3cad2a783d74561472c78c4bbeb493`.
- Ticket branch/worktree: `codex/pdex-24-restart` at `/private/tmp/pdex-restart-20261014.noindex/pdex-24`; implementation commits, in order: `ae05611018bd7266c7dc1d1c13e343922e2bd7ee`, `c4bbc2bf1b12caa9af08d31cf71a2aa522f71228`.
- Verification on the ticket branch: `cargo test --manifest-path src-tauri/Cargo.toml --test habit_completion_workflow --test habit_snapshot_workflow --test habit_definition_workflow` (34 passed); `node --test tests/frontend/habit-completion.test.ts tests/frontend/habit-canonical-navigation.test.ts tests/frontend/habit-localized-names.test.ts tests/frontend/interface-language.test.ts` (29 passed); `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/31e32ef8478fbf80/node_modules/playwright/index.mjs node --test tests/browser/habit-definition-workflow.mjs` (1 passed); `npm run build` passed; `git diff --check` passed.
- The Rust workflow uses temporary Vault files through `TodayApplication`; the browser test uses a local IPC fixture and checks the real DOM flow. Packaged-app acceptance remains pending. Integration merge is waiting for the parent integration sequence; check and merge its latest tip before integration.
- The earlier implementation remains on its previous branch with full history and is not this ticket's source baseline.

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
