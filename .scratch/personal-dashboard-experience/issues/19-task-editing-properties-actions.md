# 19: Task 编辑、属性与操作入口

**What to build:** 保留紧凑列表和右栏，完成单一可编辑标题、默认 Content 聚焦、更大内容区、紧凑清单与排期、同行 Save/Cancel 及单行快速添加；一起加入优先级、标签、排序/筛选和普通右键/More。取消时间安排保留日期，与删除明确区分。新建/详情编辑可复用于后续 Today 和 Calendar 浮窗。

**Blocked by:** None

**Status:** claimed

**Triage:** ready-for-agent
**ID:** PDEX-19
**Parent:** [PDEX-SPEC-02](../refinement-spec-2026-10-11.md)
**Lifecycle:** in-progress
**Implementation:** reimplementation started on `codex/pdex-19-restart`; packaged acceptance remains under PDEX-26
**Date:** 2026-10-11
**Publication branch:** codex/dashboard-experience-refinement-spec
**Publication base:** d91d636b395d8c42c0c516827db37ca2565260a4
**Spec snapshot:** 0b0d727b23166ba1ccf9708656ab2bf00f6188ed
**Breakdown decision:** 用户在合并为8张票后明确回复“同意”，批准范围、粒度与直接依赖。

## Clean reimplementation tracking — 2026-10-14

- Integration branch: `codex/dashboard-experience-refinement-restart-20261014`; exact ticket start tip `8275615a3f3cad2a783d74561472c78c4bbeb493`, whose parent is the requested clean baseline `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- Ticket branch: `codex/pdex-19-restart`; worktree `/tmp/pdex-restart-20261014.noindex/pdex-19`; start commit `8275615a3f3cad2a783d74561472c78c4bbeb493`.
- Implementation commits: `f0a95909d249535d300ed735a17a603fcd0bcb6b` (persist priority/tags); `d04330c518be1d5dc34e5b689cb126a95bbcc40c` (Task detail/property UI and focused browser/unit coverage); `689b383df3ca235fb0dcdcee3ae4d881b4aa963d` (Today Task test-double compatibility for the property-aware draft reader); `f6a47765e91bde430de651b0c8510a8d286ffa3e` (Cancel restores saved priority/tags; regression coverage).
- [Implementation/test evidence](../evidence/pdex-19-implementation-2026-10-14.md) records exact commands, results, full-suite failures and their scope. PDEX-19 code implementation is complete; lifecycle remains in-progress until its own acceptance is satisfied. Packaged App acceptance is assigned to PDEX-26.
- Local non-fast-forward integration commit on `codex/dashboard-experience-refinement-restart-20261014`: `dd472702dc6ff4762e84c6877b4d052d1b5229e4`. The full ticket branch and all source commits remain reachable.
- The earlier rejected implementation remains on its previous branch with full history and is not this ticket's source baseline.

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
- 2026-10-14 reimplementation: implementation commits and focused verification are
  recorded in the clean reimplementation section above. Automated PDEX-19 behavior
  checks are green; lifecycle stays in-progress pending packaged acceptance under PDEX-26.
- 本票发布不授权安装正常App、main merge、remote push或关闭父规格。
