# 25: Habit 详情、历史统计与停用恢复

**What to build:** 点左侧Habit才在右侧显示单项详情并可回到原今日列表，展示本月/累计达标天、当前/最高连续、历史记录和已有编辑入口；一起提供停用、查看停用与恢复，保留历史和目标，连续统计正确处理活动间隔与来源覆盖。

**Blocked by:** 24 — Habit 新增、编辑与目标设置

**Status:** claimed

**Triage:** ready-for-agent
**ID:** PDEX-25
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** open
**Implementation:** not started
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

## Reimplementation claim — 2026-10-13

The installed local Management helper confirmed native claim operation
`pdex-25-reimplementation-claim-2026-10-13` in
`source-personal-dashboard-experience`. Working branch:
`codex/pdex-25-refinement-reimplementation`. PDEX-24 is integrated; its
packaged acceptance remains under PDEX-26. The exact worktree start commit and
path are recorded in the shared [restart record](../refinement-reimplementation-2026-10-13.md)
after worktree creation.
