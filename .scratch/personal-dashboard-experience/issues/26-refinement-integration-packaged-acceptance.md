# 26: 整合与真实 App 验收

**What to build:** 把已验证功能整合为源码commit绑定的实际App候选，验证跨功能、保存重开、真实拖动、升级兼容与宽窄窗口；对照基线检查未要求区域保留，形成可审阅的自动/界面验收结果、限制和本地Git交接。安装与父spec关闭保持独立。

**Blocked by:** 20 — Task 父子关系与清单文件夹; 21 — Today 时间轴与安排交互; 22 — Calendar 新增、详情与节日; 23 — Collaboration 空间与输入体验; 25 — Habit 详情、历史统计与停用恢复

**Status:** resolved

**Triage:** ready-for-agent
**ID:** PDEX-26
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

- [ ] 所有直接阻塞票已有各自完整结果和证据，间接覆盖PDEX-19/24；不能靠本票替未完成功能填实现。
- [ ] 固定候选branch/base/完整commits、实际构建来源和可执行身份，用私有synthetic profile/Vault验证真实Tauri IPC、保存读回及重新启动。
- [ ] 父子关系、文件夹、优先级、标签及菜单组合不丢属性/身份，完成/删除/恢复语义和旧任务/归档/历史编辑仍正确。
- [ ] Today/Calendar/Tasks共同Task的创建、编辑、取消排期和删除都一致，Calendar创建不补造Daily Record。
- [ ] 真实指针验证宽泛/精确安排与Task点击、移动、结束编辑、拖选、边缘滚动/取消；current安排与Morning基准/事实保持独立。
- [ ] Habit新增/编辑/生效周期/停用/恢复/历史/外部snapshot刷新组合正确，完整/有限覆盖和源冲突不被自动转成假成功。
- [ ] Collaboration长消息/context/草稿/voice组合及slash键盘行为可用，真实服务与排队/模型选择保留，停止后编辑再发送。
- [ ] 1280×800、1280×720、830×758、680×560检查密度、卡片、浮窗、月份及输入操作，尤其背景＋voice停止按钮不裁断。
- [ ] 用相同窗口与情境对照原实际App：导航、外壳、设置、字体配色、Tasks列表/单行添加、Habits默认主体、Calendar回顾结构及Morning/Evening没有未解释变化。
- [ ] 旧格式数据升级/重开、stale revision、换Vault、写/读失败和重试提供可靠结果，草稿/原数据保留，不以save toast或mock代替持久读回。
- [ ] 自动检查、实际UI/打包、真实IME/麦克风等分别记录实测/未测/人工接受和源码身份；不把旧轮waiver自动当新缺口通过，不人为耗额度证明排版。
- [ ] 保留每票/整合/评审/验收commit、操作/检查命令、输入、预期/实际、失败恢复及已知限制；在本地tracker读回，供后续远程推送与ID映射。
- [ ] 本票交付候选及证据，不自动替换正常App、merge main、push、建PR或关闭PDEX-SPEC-02；最终用户接受按独立授权和真实结果记录。

## Verification

PDEX-SPEC-02 stories 1–3、88–91，以及全部功能票的组合验收。

使用既有application业务入口、真实持久写入/读回和实际DOM或指针检查外部行为；
保存后用新实例或重开验证，保留适用的宽窄窗口和打包来源证据。prototype只作
指定区域设计依据，源码字符串、mock、save toast或原型内存不代替真实验收。
未要求变化的区域按实际App基线保留；不增加依赖、外部服务或部署配置。

## Execution

- 2026-10-11：经用户批准发布本地完整票体，未分配assignee、未claim、未开始实现。
- 后续授权claim时记录实际owner、working branch、base commit、增量实现/评审/
  验收commits、结果和限制。每票可多次commit，完整验收前不关闭。
- 本票发布不授权安装正常App、main merge、remote push或关闭父规格。


## Answer and local resolution

- 2026-10-14: The user explicitly authorized resolving the complete
  PDEX-SPEC-02 round after accepting it. This ticket is resolved by that
  lifecycle decision. It does not represent unrun checks as passed; the
  original acceptance checkboxes remain unchanged.
- Concrete packaged Task, plan, sub-tree, tag, Morning-ordering, fact-popup,
and Calendar Cancel/layout cases are preserved in the audit. The complete
frozen-source cross-ticket matrix, migration/failure/retry combinations,
hardware voice/IME, and official China 2027 source remain unverified or
unavailable as specified in that audit. See the final acceptance audit.
