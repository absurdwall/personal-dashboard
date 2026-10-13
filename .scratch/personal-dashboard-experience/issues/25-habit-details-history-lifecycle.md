# 25: Habit 详情、历史统计与停用恢复

**What to build:** 点左侧Habit才在右侧显示单项详情并可回到原今日列表，展示本月/累计达标天、当前/最高连续、历史记录和已有编辑入口；一起提供停用、查看停用与恢复，保留历史和目标，连续统计正确处理活动间隔与来源覆盖。

**Blocked by:** 24 — Habit 新增、编辑与目标设置

**Status:** in-progress

**Triage:** ready-for-agent
**ID:** PDEX-25
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** in-progress
**Implementation:** implemented; native acceptance pending
**Date:** 2026-10-11
**Publication branch:** codex/dashboard-experience-refinement-spec
**Publication base:** d91d636b395d8c42c0c516827db37ca2565260a4
**Spec snapshot:** 0b0d727b23166ba1ccf9708656ab2bf00f6188ed
**Breakdown decision:** 用户在合并为8张票后明确回复“同意”，批准范围、粒度与直接依赖。

## Acceptance criteria

- [ ] 默认仍汇总和今日列表，点左侧一个Habit才显示详情，左侧汇总保留，有清楚返回入口；原行内近期历史展开不暗改整页切换。
- [ ] 详情有名称/目标/开始日期、记录、编辑、打卡及生命周期入口，编辑复用PDEX-24同一表单/身份，右键入口可用。
- [ ] 本月和累计按lived date的不同达标天去重，不按点击次数；累计保留停用前及开始日期变更前的已有完成事实。
- [ ] 详细读取使用canonical completion及有provenance历史，可读取超过主面板12周；主面板有界投影保留，不把短期最大值说成全历史最高。
- [ ] 每日按连续达标天、每周按达到当时目标的连续周；开放当前周期未达标不提前判失败，已达标可计入。
- [ ] 旧周期用当时目标，历史完成纠正只按适用旧目标重算受影响统计，目标设置修改不改写事实。
- [ ] 无evidence且无完整coverage时是未知，不判失败/成功/零，不声称跨未知缺口连续。
- [ ] 完整覆盖显示精确统计；部分显示已知至少/可确认连续或全历史未知，注明覆盖区间，最高已知与已确认历史最高区分。
- [ ] 详情current/pending目标、历史目标段、来源freshness和覆盖可辨认；按需/分页读历史不要求常驻渲染全部卡片。
- [ ] 停用从日常摘要/待打卡区收起，不删除定义、完成、目标revision和统计；查看停用能找到并恢复同一身份。
- [ ] 停用期不要求打卡，不填成失败或完成，连续不穿过停用段；恢复开启新的活动连续段，旧最高保留。
- [ ] 停用期间pending目标及跨周期语义保留，恢复不自动补打，不外部写生命周期；保留既有授权历史纠正。
- [ ] 跨刷新、换源、冲突/失败、重试及重开行为一致，完整/有限历史缺口可解释，不以snapshot新鲜度取代真实结果。
- [ ] 宽窄窗口可查看统计/记录/编辑/返回/停用恢复，不更换Habits主体或全局外壳。
- [ ] 真实读回、完整/有限/缺口合成历史及周期推进验证累计/连续/停用恢复，不用近期fixture冒充全历史产品证据。

## Verification

PDEX-SPEC-02 stories 73–74、80–82、86–87；共同承担 1–3、88–91 的保存与保留边界。

使用既有application业务入口、真实持久写入/读回和实际DOM或指针检查外部行为；
保存后用新实例或重开验证，保留适用的宽窄窗口和打包来源证据。prototype只作
指定区域设计依据，源码字符串、mock、save toast或原型内存不代替真实验收。
未要求变化的区域按实际App基线保留；不增加依赖、外部服务或部署配置。

## Execution

- 2026-10-11：经用户批准发布本地完整票体，未分配assignee、未claim、未开始实现。
- 后续授权claim时记录实际owner、working branch、base commit、增量实现/评审/
  验收commits、结果和限制。每票可多次commit，完整验收前不关闭。
- 本票发布不授权安装正常App、main merge、remote push或关闭父规格。

## Authorized claim — 2026-10-13

Owner: Codex implementer `/root/pdex24` (new PDEX-25 worktree). Working branch `codex/pdex-25-refinement`; starting integration tip `8bcf66f96ba021e5c7a5c5eac39ac3c8cb9557d0`, authorized base `918e7e0d9c4b2c524c429bfd309482e328bc4c91`. PDEX-24 implementation is integrated and its real catalog/completion/snapshot interface tests pass 39/39; native acceptance remains separately pending. Reuse the verified PDEX-24 boundary; no inferred ticket closure. Full spec/ticket unchanged. Local Git only, full history, no installation/main/remote operations.

## Implementation handoff — 2026-10-13

Full PDEX-25 implementation is on `codex/pdex-25-refinement`, local Git only. Full canonical and retained sourced history uses the existing application/store/projection boundary; lifecycle persists dated transitions and readback receipts under the same catalog, without external lifecycle writes. Default Habits keeps its summary/today list; explicit left selection shows right detail, preserves the mounted row history on return, and exposes shared editing, current check-in, provenance, paged historical corrections and inactive same-key restoration. Complete/partial/unknown coverage and historical goal/frequency/activity boundaries are qualified in statistics.

Implementation commits (full history retained):

- `f49b2ce4914489285f9a56af85db309279c86262` — full canonical detail history and qualified statistics.
- `1bd63278cfd4e875102543efa8b6d13fb5093ee4` — canonical inactive/restored activity intervals.
- `eeb68d9d78999a56c5e5fd37a4cb353ae1a41470` — achieved open-week peaks and historical correction.
- `dc6feb6d8dd20870ee22543bbf773b33c4e35c5c` — immutable source retention, goal knowledge and coverage qualification.
- `96fab30ae58d5785a809e21ab1010d40b773d1bb` — selected-detail/inactive finder UI and native commands.
- `c4a7f7c4fabbc053e14d3615d0b6636d37f9ef07` — revision-bound retries, separate day/week peaks and delayed-response guards.
- `b9ae1948a88583fc8fd72b3b6a50945655bfe88f` — merge latest integration `86980149b4478a685e03a58dbf213cd6a8bf5fc9`, preserving Calendar/Task/Habit imports and scoped CSS.

- `0bfc4d837ead4dd1f0ffe027d7bdebc1184d9685` — same-lived-day transition evidence preserves old attained peak without automatic restoration check-in.

Verification: build and cargo check pass;9 real detail/lifecycle application cases plus39 prior Habit catalog/completion/snapshot cases pass48/48;33 focused frontend language/presentation/historical cases pass;5 actual DOM create/edit/detail cases pass at1200/560, including failed-save same-operation retry and delayed old-Vault rejection. A broad frontend sweep completed473/500 with27 inherited Today/Collaboration/Task probe failures, so it is not a clean full-suite result. Evidence: [PDEX-25 refinement](../evidence/pdex-25-refinement.md).

Native packaged acceptance is separately pending and remains with the integration task. This handoff does not close the ticket, merge main, install the normal App, push remote history or claim end-to-end native acceptance.

## Bounded lifecycle guard repair — 2026-10-13

- `a72b308ece1fa2691b02d9a73e1e3693d0b7fe19` — merge current `7e67ef4` before the bounded repair.
- `b545e3ed14315bea5923ef948b7e33815013a338` — reject mixed lived-date/source evidence before activity CAS, preserving exact retry/readback contracts.
- `739d0df901e1a58d5d7acc54dcf636fc325858cf` — sync current `ca266b390cadf47a021ff3e743a2113a5abaff7b` native-receipt precision.

Two real application red cases confirmed that the previous code wrote a stale attained marker across04:00 or after source evidence was replaced with unknown. Both now refuse without changing catalog/completion revisions or active state; rereading allows the same operation identity to save once with current evidence. Final Habit suites pass50/50 (catalog12, completion12, detail/lifecycle11, snapshot15); cargo check passes. Scope is lifecycle evidence/date/revision validation only; native packaged acceptance remains pending. The synchronized native checkpoint describes separate Save actions and does not establish a single-submit combined edit acceptance.

### Confirmed P2 review repair — 2026-10-13

[Three-finding repair record](../refinement-review-fixes-2026-10-13.md) records the bounded review return. Existing feature/acceptance evidence remains retained; the relevant fixed-copy, Calendar relation or Task draft recovery correction is now in progress. Native acceptance stays delegated/open.

### Review repair implementation handoff — 2026-10-13

Relevant corrections from the three-finding review return and its follow-ups are integrated at `50b9ebd`; [repair record](../refinement-review-fixes-2026-10-13.md) and [exact implementation evidence](../evidence/pdex-review-fixes-implementation-2026-10-13.md) retain branches, commits and targeted checks. Implementation is complete locally; independent recheck and delegated native acceptance remain pending. Earlier evidence and lifecycle are unchanged.

### Second independent review return — 2026-10-13

A bounded follow-up is in progress after recheck: newly edited conflict acknowledgement (PDEX-19) or unavailable coverage copy (PDEX-25). [Current repair record](../refinement-review-fixes-2026-10-13.md). Earlier repairs were independently confirmed; parent/native acceptance remain open.
