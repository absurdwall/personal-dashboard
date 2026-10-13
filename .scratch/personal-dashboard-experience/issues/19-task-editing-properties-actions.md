# 19: Task 编辑、属性与操作入口

**What to build:** 保留紧凑列表和右栏，完成单一可编辑标题、默认 Content 聚焦、更大内容区、紧凑清单与排期、同行 Save/Cancel 及单行快速添加；一起加入优先级、标签、排序/筛选和普通右键/More。取消时间安排保留日期，与删除明确区分。新建/详情编辑可复用于后续 Today 和 Calendar 浮窗。

**Blocked by:** None

**Status:** implementation-complete/acceptance-pending

**Triage:** ready-for-agent
**ID:** PDEX-19
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** in-progress
**Implementation:** implemented; focused application/DOM checks passed; packaged acceptance pending
**Date:** 2026-10-11
**Publication branch:** codex/dashboard-experience-refinement-spec
**Publication base:** d91d636b395d8c42c0c516827db37ca2565260a4
**Spec snapshot:** 0b0d727b23166ba1ccf9708656ab2bf00f6188ed
**Breakdown decision:** 用户在合并为8张票后明确回复“同意”，批准范围、粒度与直接依赖。

## Acceptance criteria

- [ ] 已有 Task 打开右栏时 Content 获得焦点；顶部粗体标题可直接编辑，只有一个名称输入，内容区比基线更大且靠上。
- [ ] 清单、日期及时间平时显示紧凑值，点开再编辑；开始/结束在同一排期区域，未设结束时间不常驻清除按钮，跨午夜结束日期清楚。
- [ ] Save/Cancel 同行并有主次；收起属性不自动保存，Cancel 不提交；保存后重新读取及重开仍是修改后的 Task。
- [ ] 快速添加仍是一行，创建前可选日期和目标清单，默认值沿用入口上下文，不复制原型两行添加布局。
- [ ] 优先级高/中/低/无可保存、读回、排序与单档筛选；旧 Task 默认无，默认排序和同档稳定顺序保留，不引入四象限。
- [ ] 标签可创建、复用、多选及移除；空名无效，同名不重复；改名保留关联，删除标签只解除关联，不删 Task。
- [ ] 单标签与优先级筛选能组合，跨清单用同一标签身份；筛选不改清单/状态，完成和放弃历史仍可发现。
- [ ] 行右键和详情 More 共享排期、移动清单、完成/恢复、放弃、删除和与 Codex 讨论动作，按状态启用；父子动作由 PDEX-20 增加，不留假入口。
- [ ] 取消18:00–18:45 Task的时间安排后，time和整个execution interval清除，date仍在，Today列表及Calendar保留同一Task，定时轴不再呈现；重开一致。
- [ ] 仅清结束时间保留开始日期/时间；删除 Task 仍沿用现有删除/恢复历史语义，不等同取消排期，不删除 Daily Record。
- [ ] 旧 Task、旧创建/更新入口和 Collaboration 保存仍有效；新增属性区分未修改与显式清除，更新标题不误清优先级、标签或执行区间。
- [ ] 保存冲突、失败、换 Vault 和读取异常不伪报成功，编辑草稿与已保存状态区分，重试不产生重复 Task 或标签。
- [ ] Tasks清单主体、勾选和紧凑行密度、全局字体/配色/导航及已有分页历史编辑保持，窄窗口属性和保存取消仍可操作。
- [ ] 以真实Task业务写入/读回、新application实例和实际DOM交互验证；保留可复用的创建/详情行为，不提前迁移Today/Calendar入口。

## Verification

PDEX-SPEC-02 stories 4–14、30–34、48–49；共同承担 1–3、88–91 的保存与保留边界。

使用既有application业务入口、真实持久写入/读回和实际DOM或指针检查外部行为；
保存后用新实例或重开验证，保留适用的宽窄窗口和打包来源证据。prototype只作
指定区域设计依据，源码字符串、mock、save toast或原型内存不代替真实验收。
未要求变化的区域按实际App基线保留；不增加依赖、外部服务或部署配置。

## Execution

- 2026-10-11：经用户批准发布本地完整票体，未分配assignee、未claim、未开始实现。
- 后续授权claim时记录实际owner、working branch、base commit、增量实现/评审/
  验收commits、结果和限制。每票可多次commit，完整验收前不关闭。
- 本票发布不授权安装正常App、main merge、remote push或关闭父规格。

## Authorized implementation — 2026-10-13

Owner: Codex implementer PDEX-19
Working branch: codex/pdex-19-refinement
Integration: codex/dashboard-experience-refinement-integration
Implementation base: 918e7e0d9c4b2c524c429bfd309482e328bc4c91
Spec/ticket snapshot: 918e7e0d9c4b2c524c429bfd309482e328bc4c91
The user invoked implement-spec for PDEX-SPEC-02. Tests use the already confirmed application and DOM/WebKit seams in the specification. Native acceptance remains separately pending.

## Implementation verification — 2026-10-13

Branch: `codex/pdex-19-refinement`. [Evidence](../evidence/pdex-19-refinement.md).
Task priority/tag application contracts, compact editor, creation choices,
combined filters and shared menus are implemented with real application
readback and production WebKit DOM checks. Packaged/native acceptance and
integration review remain pending; lifecycle stays in-progress.

Implementation commit: `cfd5a77`; worker integration merges: `c1ae182`, `741c54f`.
Latest integrated ancestor: `71471a3`. Both implementation and integration
histories are retained locally. No packaged acceptance claim or ticket closure.

## Native submit-chain repair — 2026-10-13

Packaged acceptance exposed a time-cancellation Save failure. Production WebKit
submit-event regression reproduced it and the scoped native-control reset now
passes actual Save-click sequences with/without tag creation and clear-end-only.
Tag management busy-state release and Cancel compact-caption consistency were
also repaired. See the appended diagnosis in [evidence](../evidence/pdex-19-refinement.md).
Packaged rerun remains pending; this record does not claim native closure.

The actual submit regression also identified and now verifies Schedule/Move
availability from More after a Save. Their busy-release repair is retained on
the original PDEX-19 worker branch; native combined acceptance remains pending.
