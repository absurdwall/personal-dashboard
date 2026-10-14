# 23: Collaboration 空间与输入体验

**What to build:** 一起改善消息、输入、背景和语音的空间配合：保留A/C认可的聊天空间，context采用限高独立滚动的浮层并可就地收起；语音在输入下方预览、停止后进可编辑草稿；slash只落实多候选上下选择，其他输入和真实执行语义保持。

**Blocked by:** None

**Status:** claimed

**Triage:** ready-for-agent
**ID:** PDEX-23
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** in-progress
**Implementation:** reimplementation started on `codex/pdex-23-restart`; packaged acceptance remains pending
**Date:** 2026-10-11
**Publication branch:** codex/dashboard-experience-refinement-spec
**Publication base:** d91d636b395d8c42c0c516827db37ca2565260a4
**Spec snapshot:** 0b0d727b23166ba1ccf9708656ab2bf00f6188ed
**Breakdown decision:** 用户在合并为8张票后明确回复“同意”，批准范围、粒度与直接依赖。

## Clean reimplementation tracking — 2026-10-14

- Integration branch: `codex/dashboard-experience-refinement-restart-20261014`, based directly on `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- Ticket branch: `codex/pdex-23-restart`; worker start commit and implementation commits will be recorded after integration.
- The earlier implementation remains on its previous branch with full history and is not this ticket's source baseline.

## Acceptance criteria

- [ ] 消息在消息区滚动，已认可的大输入和字体保留，输入/发送始终容易找到，外层不因长context被撑长。
- [ ] 按需context浮层在聊天区锚定，有独立限高/滚动、标题旁收起；短窗口限高依据输入区，不能遮输入、语音停止或发送。
- [ ] 背景收起时维持A/C认可的聊天空间，不因为选择浮层改全局侧栏、主题或消息视觉。
- [ ] 1280×720的背景＋转写组合中停止操作完整可见，窄窗口长context/草稿/消息仍可读可操作，不复制原型A的裁断。
- [ ] 语音流程为下方转写预览→停止→可编辑草稿→用户发送，停止不发送；预览空时不留大片空白，有内容可读或内部滚动。
- [ ] 使用真实dictation服务及其状态/错误和草稿持久化；取消/关闭预览不误发消息、不丢已有草稿，不把模拟按钮带进产品。
- [ ] 先验证既有上下键逻辑和真实候选供给，仅修多候选selection缺口，两个以上合法测试候选可上下循环选择。
- [ ] Enter/Tab只补全、Esc关闭，既有高亮/字号/菜单样式、光标和参数保留；补全不执行或自动发送。
- [ ] composition/中文输入法选字不被抢键，上下键仅在可见候选且非composition时处理，普通slash文本仍普通输入。
- [ ] 生产仅有retro时不新增虚构候选；Workflow retro不搬进Dashboard，不硬编码另一执行模型。
- [ ] 保留真实model/effort、会话/工作历史、队列/取消、结果和能力边界，不加语义审批层或自动规划权限。
- [ ] 用实际DOM和服务边界检查，保留不同消息/草稿/转写/背景组合的宽窄窗口证据；版式测试不调用真实模型花额度。

## Verification

PDEX-SPEC-02 stories 51–60；共同承担 1–3、88–91 的保存与保留边界。

使用既有application业务入口、真实持久写入/读回和实际DOM或指针检查外部行为；
保存后用新实例或重开验证，保留适用的宽窄窗口和打包来源证据。prototype只作
指定区域设计依据，源码字符串、mock、save toast或原型内存不代替真实验收。
未要求变化的区域按实际App基线保留；不增加依赖、外部服务或部署配置。

## Execution

- 2026-10-11：经用户批准发布本地完整票体，未分配assignee、未claim、未开始实现。
- 后续授权claim时记录实际owner、working branch、base commit、增量实现/评审/
  验收commits、结果和限制。每票可多次commit，完整验收前不关闭。
- 本票发布不授权安装正常App、main merge、remote push或关闭父规格。
