# 22: Calendar 新增、详情与节日

**What to build:** 保留原月历、右侧日期回顾和下方当日任务，在顶部加号新建Task并带入所选日期，点Task浮窗编辑、背景不跳；同时用本地可关闭设置提供中国/美国节日轻量标注，不扩大月历占地或产生业务记录。

**Blocked by:** 19 — Task 编辑、属性与操作入口

**Status:** claimed

**Triage:** ready-for-agent
**ID:** PDEX-22
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** open
**Implementation:** not started
**Date:** 2026-10-11
**Publication branch:** codex/dashboard-experience-refinement-spec
**Publication base:** d91d636b395d8c42c0c516827db37ca2565260a4
**Spec snapshot:** 0b0d727b23166ba1ccf9708656ab2bf00f6188ed
**Breakdown decision:** 用户在合并为8张票后明确回复“同意”，批准范围、粒度与直接依赖。

## Acceptance criteria

- [ ] 单击日期仍选择当天并在右侧看计划/复盘，Open full Today可用；月历等高、月份导航、标记位置及预览密度保留。
- [ ] 选12日再点顶部加号，浮窗默认显示所选日期，允许修改，名称先获焦点；单一创建入口替代大型底部创建表单。
- [ ] 创建复用Task业务保存，读回Tasks/Today/Calendar同一身份；没有Daily Record也可创建，不补造每日记录。
- [ ] 月格或下方Task点击打开紧凑可编辑浮窗，不触发日期格额外导航，关闭/保存保留月份、所选日期和滚动位置。
- [ ] 原右侧日期回顾和下方当日任务/历史区保留，不添加周视图、日期格双击或右键创建，不复制原型的额外滚动和布局变化。
- [ ] 默认中美节日同时轻量显示，有总开关及按地区关闭；设置重开保留，关闭不影响Task或日期回顾。
- [ ] 任务优先占日期格，过长/过多节日省略并能查看完整名称，不增高格子、不压掉Task点击区。
- [ ] 本地随包数据/确定性规则有核验的官方来源、地区、日期及覆盖年份，至少覆盖当年和下一年，无运行时服务或新增依赖。
- [ ] 超出覆盖年份明确未提供，不复制前一年或原型样例；若用农历节日年度日期必须核验，不另加农历常驻/节气/调休展示。
- [ ] 节日只读提示不创建Task/记录、不触发提醒，也不冒充工作日判定。
- [ ] 保存冲突、失败、重试和换Vault的草稿/结果正确，旧Task属性不被创建或编辑窗口误清；实际读回和重开验证日期及设置。
- [ ] 宽窄窗口检查月历、日期回顾、任务区和浮窗，未要求区域对照实际App保留。

## Verification

PDEX-SPEC-02 stories 61–67；共同承担 1–3、88–91 的保存与保留边界。

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
`pdex-22-reimplementation-claim-2026-10-13` in
`source-personal-dashboard-experience`. Working branch:
`codex/pdex-22-refinement-reimplementation`. PDEX-19 is integrated; its
packaged acceptance remains under PDEX-26. The exact worktree start commit and
path are recorded in the shared [restart record](../refinement-reimplementation-2026-10-13.md)
after worktree creation.
