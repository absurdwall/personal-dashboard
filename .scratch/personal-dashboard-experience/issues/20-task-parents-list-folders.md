# 20: Task 父子关系与清单文件夹

**What to build:** 在已可用的 Task 编辑、快速添加和统一菜单上，补齐父子关联/解除/换父、嵌套子任务及直属子任务展示；同时提供一层清单文件夹、展开收起、按原清单分组的汇总及明确的添加目标。组织关系保存重开正确，不改变任务身份或状态。

**Blocked by:** 19 — Task 编辑、属性与操作入口

**Status:** claimed

**Triage:** ready-for-agent
**ID:** PDEX-20
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** in-progress
**Implementation:** code implementation committed on `codex/pdex-20-restart`; latest integration is merged into the ticket branch, but the ticket branch remains unmerged back into integration; packaged acceptance remains separate
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
- 2026-10-14：在父级授权后从干净 integration tip `e1b28504e62d28ecbb05c5fa3f499204d7abefe1` claim；ticket branch `codex/pdex-20-restart`，worktree `/private/tmp/pdex-restart-20261014.noindex/pdex-20`。从用户指定的 `918e7e0d9c4b2c524c429bfd309482e328bc4c91` 重新实现链继续；没有复制或合并此前被拒绝分支的实现。
- 实现 commits：`d7ecfda0c1b4590405dbb29da52a8bd7fc9abe0c`（schema 3、父子/文件夹原子持久化、迁移及 workflow tests、schema docs）；`c0b7aa969196208acc6f73d37d15c8ee09c06c4b`（紧凑 Tasks UI、直接子任务/文件夹视图、浏览器与单测）；`f1f9c5c7ee6067c67bbe12efb6fbc0d070402ec0`（同步状态历史文档的当前 schema 说明）。[完整实现与验证记录](../evidence/pdex-20-implementation-2026-10-14.md)。
- 为保留持续更新的 integration 历史，ticket branch 后续以 non-fast-forward merge 引入 `ebd4354e2e179ab695450a4e1eaf196dc4730062`（merge commit `86e0c4cf2855db6afadf647ef7f872e8a66a26ae`），再引入最新 tip `2a233c3e4a21d9eaff06b62f1770c86e7671d082`（merge commit `89ab2ca6ae319e9feefcb76fd72da1625d3ba4be`）。完整父提交历史均保留；没有把 PDEX-20 分支合回 integration。
- 合并后 `npm run build` 通过；Tasks presentation 23/23、Tasks browser 23/23、Calendar 定向前端 16/16、Today create 5/5、interface-language 14/14、Rust `task_workflow` 36/36、Calendar preferences 2/2 与 app-local holiday readback 1/1 通过；rustfmt 和 `git diff --check` 通过。精确命令及边界见[实现与验证记录](../evidence/pdex-20-implementation-2026-10-14.md)。
- Ticket 分支尚未合回 integration、未推送；PDEX-26 的 packaged application 验收仍未完成。完整验收前不关闭。
- 本票发布不授权安装正常App、main merge、remote push或关闭父规格。
