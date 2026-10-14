# 20: Task 父子关系与清单文件夹

**What to build:** 在已可用的 Task 编辑、快速添加和统一菜单上，补齐父子关联/解除/换父、嵌套子任务及直属子任务展示；同时提供一层清单文件夹、展开收起、按原清单分组的汇总及明确的添加目标。组织关系保存重开正确，不改变任务身份或状态。

**Blocked by:** 19 — Task 编辑、属性与操作入口

**Status:** claimed

**Triage:** ready-for-agent
**ID:** PDEX-20
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** in-progress
**Implementation:** in progress on the reimplementation branch
**Date:** 2026-10-11
**Publication branch:** codex/dashboard-experience-refinement-spec
**Publication base:** d91d636b395d8c42c0c516827db37ca2565260a4
**Spec snapshot:** 0b0d727b23166ba1ccf9708656ab2bf00f6188ed
**Breakdown decision:** 用户在合并为8张票后明确回复“同意”，批准范围、粒度与直接依赖。

## Acceptance criteria

- [ ] 普通Task最多一个parent，可继续嵌套，父详情列直属子任务并可打开、添加、关联及解除；右键/More与详情使用同一动作。
- [ ] 子任务保留自己的内容、日期、时间、清单、优先级、标签和状态，可与父在不同清单，按自己的日期出现在Today/Calendar。
- [ ] 完成、恢复或放弃父/子只改变当前Task；所有子完成不自动完成父，父完成后未完成子仍可操作。
- [ ] 后端拒绝自引用、循环、无效或跨Vault的parent，原数据没有部分改变；关联/解除不复制Task，不强制继承其他属性。
- [ ] 删除父不级联删子，历史关系可解释；父恢复重新显示适用关系，但子已换父或解除时不覆盖新关联。
- [ ] 文件夹可创建、改名，清单可移入/移出；只有一层，一个清单最多属于一个文件夹，允许顶层清单。
- [ ] 箭头只展开收起，点文件夹名称打开按原清单分组的聚合视图，任务仍属于原清单，没有副本。
- [ ] 文件夹汇总的单行添加清楚显示并允许选择目标清单；空文件夹提示先建清单，不隐式创建清单或丢进不确定目标。
- [ ] All/Today视图与系统Inbox保持独立，Inbox不能归组或删除；归档清单不因展开文件夹重新进入日常待办。
- [ ] 删除文件夹仅解除分组，清单回顶层且Task保留；清单恢复保留可用分组，原文件夹不存在时回顶层。
- [ ] 关系、文件夹和列表属性保存/重开一致；旧无关系的数据缺省正确，更新关系不清PDEX-19的标签、优先级或排期。
- [ ] 冲突、失败、换源和重试保留完整旧结果，不出现孤立清单、丢失Task或重复对象。
- [ ] 多层缩进在窄窗口不造成横向裁断，维持既有紧凑列表/右栏；用业务读回和实际操作证明父子、分组和恢复流程。

## Verification

PDEX-SPEC-02 stories 15–29；共同承担 1–3、88–91 的保存与保留边界。

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
`pdex-20-reimplementation-claim-2026-10-13` in
`source-personal-dashboard-experience`. Working branch:
`codex/pdex-20-refinement-reimplementation`. PDEX-19 is integrated; its
packaged acceptance remains under PDEX-26. The exact worktree start commit and
path are recorded in the shared [restart record](../refinement-reimplementation-2026-10-13.md)
after worktree creation.
