# 21: Today 时间轴与安排交互

> Canonical tracker: [PDEX-21 · GitHub #110](https://github.com/absurdwall/personal-dashboard/issues/110). Migrated and verified 2026-10-17. This file retains historical supporting evidence; GitHub owns current state.


**What to build:** 在Today落实紧凑日间概览、精细放大、完整lived-day入口、就近Task浮窗和点击不跳；卡片适配及重叠可选。精确和可靠绑定的宽泛安排都可拖动，原“下午”不被默认anchor改写，主动拖动后保存近似时刻，当前安排编辑/取消保留早间基准。

**Blocked by:** 19 — Task 编辑、属性与操作入口

**Status:** resolved

**Triage:** ready-for-agent
**ID:** PDEX-21
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** closed
**Implementation:** complete under explicit user-authorized round acceptance; unrun checks remain documented
**Updated:** 2026-10-14
**Date:** 2026-10-11
**Publication branch:** codex/dashboard-experience-refinement-spec
**Publication base:** d91d636b395d8c42c0c516827db37ca2565260a4
**Spec snapshot:** 0b0d727b23166ba1ccf9708656ab2bf00f6188ed
**Breakdown decision:** 用户在合并为8张票后明确回复“同意”，批准范围、粒度与直接依赖。

## Acceptance criteria

- [ ] 1280×800及1280×720下默认概览能看全06:00–24:00主要日间范围；按可用高度适配，不只回退固定数值。
- [ ] 04:00–06:00及次日00:00–04:00有明确入口和已有项目提示，完整lived-day仍为04:00–次日04:00；概览不会让边界安排消失。
- [ ] 精细放大便于短区间操作，830×758和680×560优先可读/可点并允许合理滚动；放大、适配不修改时间。
- [ ] 点时间轴Task打开复用紧凑编辑的就近浮窗，不跳午夜下方或自动scrollIntoView；保存/关闭后保持背景位置并读回真实结果。
- [ ] 移除选中Task的底部重复详情，不删除普通当日任务、无时刻记录、事实或历史，不把当日任务列表照原型搬到右侧。
- [ ] 长标题可省略，卡片边界和点击区完整；重叠项目临时并排且都能选，不按来源常驻三列，近似卡片高度不冒充时长。
- [ ] 精确安排和Task区间移动保留长度，时间点仍是时间点；已有结束编辑、空白拖选、边缘滚动和取消恢复可用。
- [ ] 未操作“下午”即使anchor13仍显示“下午”，只是渲染不保存；明确约14点的原表达也保留。
- [ ] 主动拖动“下午”至16点后，当前安排读回为“约16:00”，仍是approximate point，不变精确区间，重开一致。
- [ ] Daytime编辑、拖动或取消只更新可靠绑定的Current arrangement及修订，Morning baseline、事实和独立Task保持；不做无条件双写。
- [ ] 表达冲突、无法安全绑定及不支持跨日时解释结果并保留原记录，不按同名、下标或全局替换猜写。
- [ ] 单击与拖动可区分，拖动结束不额外触发详情；取消/冲突/失败不保留假的已保存位置，时间经过不生成完成或事实。
- [ ] 现有Morning文字、Evening入口、实际事实纠正和无关界面不改变，Task取消时间沿用PDEX-19的保留日期语义。
- [ ] 使用真实业务写入/文档读回及实际指针交互核对上述例子，保存后的展示和新实例重开一致，不以原型拖动代替产品验证。

## Verification

PDEX-SPEC-02 stories 35–47、50；共同承担 1–3、88–91 的保存与保留边界。

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
`pdex-21-reimplementation-claim-2026-10-13` in
`source-personal-dashboard-experience`. Working branch:
`codex/pdex-21-refinement-reimplementation`. PDEX-19 is integrated; its
packaged acceptance remains under PDEX-26. The exact worktree start commit and
path are recorded in the shared [restart record](../refinement-reimplementation-2026-10-13.md)
after worktree creation.

## Window-scale clarification — 2026-10-14

After reviewing the integrated App, the user clarified that resizing the window
must not shrink the Today timeline's default hour scale or base track width.
The selected reference is the previously previewed large App window reached via
macOS Window → Zoom. Its screenshot is 3840 physical px wide; the default 960×720
window screenshot is 1920×1440 physical px, establishing a 2× Retina mapping.
The accepted zoomed reference is therefore about 1920 CSS px wide, not the
1280×800 test viewport. A 1914×1518 CSS WebKit viewport closely matches that
large window and measures a natural 578.47px plot track and 18px per hour.
Preserve that geometry at smaller sizes, allow horizontal/vertical scrolling,
and keep explicit zoom available. This supersedes only the height-adaptation
part of the first acceptance bullet above. It does not change the timeline
range, data, gestures, or other screens. Implementation evidence and the
bounded test result are recorded in the shared restart record. PDEX-21 remains
in progress pending its other criteria and PDEX-26 packaged acceptance.


## Answer and local resolution

- 2026-10-14: The user explicitly authorized resolving the complete
  PDEX-SPEC-02 round after accepting it. This ticket is resolved by that
  lifecycle decision. It does not represent unrun checks as passed; the
  original acceptance checkboxes remain unchanged.
- The preserved packaged evidence records a saved 16:15–17:00 arrangement
consistent between Morning and Daytime, Morning ordering, and fact-popup phase
switching. The complete pointer, drag, edge-scroll, and cancel matrix remains
unrun. See the PDEX-21 row in the final acceptance audit.
