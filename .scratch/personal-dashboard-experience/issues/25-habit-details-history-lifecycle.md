# 25: Habit 详情、历史统计与停用恢复

**What to build:** 点左侧Habit才在右侧显示单项详情并可回到原今日列表，展示本月/累计达标天、当前/最高连续、历史记录和已有编辑入口；一起提供停用、查看停用与恢复，保留历史和目标，连续统计正确处理活动间隔与来源覆盖。

**Blocked by:** 24 — Habit 新增、编辑与目标设置

**Status:** in-progress

**Triage:** ready-for-agent
**ID:** PDEX-25
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** open
**Implementation:** in-progress
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
- 2026-10-14：授权在独立 `codex/pdex-25-restart` 分支实现本票，owner `/root/implement_pdex21`，claim base `206c98aa11371b8b8f044871baac3de0f9ecde87`，worktree `/private/tmp/pdex-restart-20261014.noindex/pdex-25`。该base已包含PDEX-24集成；parent spec及完整ticket均不修改。
- 2026-10-14：实现提交 `768c101d5373bcf0efd7426ee1c6a430a84ff4cc`，保留 claim `76652cd9e2765b2926b19496006581ada1d42c3b` 与原始 base 历史；定向统计、Rust持久层、浏览器、WKWebView HTML/CSS检查和构建通过。四种viewport截图及数据边界、限制见[实现证据](../evidence/pdex-25-implementation-2026-10-14.md)。本票仍为in-progress/open，尚未做安装App验收或整合。
- 2026-10-14：独立spec review后的纠正提交 `12ab7e1e784f7abefeae39ac37d467f2eccaf265` 将统计行为移入Rust application/domain边界；修正周 streak 的生命周期/周中启动断点、首次恢复前可证实来源完成、开始日期后移保留事实、日/周频率历史分段和 canonical read error 的未知语义，并在详情呈现历史目标段及按单位分开的历史最高连续。26项Rust workflow测试、cargo check、定向前端28项、浏览器2项、WKWebView 1项和构建通过。四尺寸截图与字段覆盖范围见[纠正证据](../evidence/pdex-25-implementation-2026-10-14.md#corrective-review-update)。本票仍为in-progress/open，不合入integration。
- 完整验收前不关闭本票；不安装正常App、不写入真实Vault、不合入integration或main、不push。
- 本票发布不授权安装正常App、main merge、remote push或关闭父规格。
