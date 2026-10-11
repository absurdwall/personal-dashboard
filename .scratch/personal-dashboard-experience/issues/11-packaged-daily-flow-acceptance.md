# 11: 验证同一打包版本的完整日常流程

**What to build:** 在同一个打包 App 中完成计划阅读/调整、Task 时间分配与勾选、整月查看、命令补全和晚间复盘入口的一次可核对流程，保留落盘、重开与实际 UI 证据。

**Blocked by:** 03 — 保持早间文字与可读的统一白天时间轴; 04 — 拖动计划并调整结束时间; 05 — Tasks 使用清晰勾选列表与所选详情; 07 — 在白天时间轴选区创建与移动 Task; 08 — Calendar 完整紧凑月历与记录状态; 09 — Collaboration 减负与 slash 命令补全; 10 — Evening 一键进入带日期的复盘草稿

**Triage:** ready-for-agent

**Status:** in-progress

**ID:** PDEX-11
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** in-progress
**Implementation:** in progress
**Owner:** implementer PDEX-11
**Assignee:** implementer PDEX-11
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.

## Acceptance criteria

- [ ] 验收固定候选身份，使用隔离 Profile、合成 Vault 和受控时间，覆盖三个阶段与相关页面。
- [ ] 修改当前计划后文档/视图/重开一致，早间基准和事实独立；精确与模糊计划符合各自含义。
- [ ] Task 选区、移动、区间读回与完成状态一致，旧任务及旧对话/离线调用的保存兼容性保持。
- [ ] 五/六行月历、重叠条目、长拖动、清晰勾选和详情在常用及窄窗口可操作。
- [ ] slash 键盘/点击/中文输入法、草稿保留、目标日期与晚间入口验证通过，补全与入口均不自动发消息。
- [ ] 文档冲突、写入失败和未确认结果真实表达；正常模型额度耗尽不阻止确定性编辑。
- [ ] 各功能票自己的测试证据仍保留；汇总独立代码检查、自动测试和打包 UI 验收，不把未验证项目写成通过。
- [ ] 不修改个人真实数据，不从此票推断安装或远端发布已获授权，不关闭父 spec。

## Verification

story 68 and integrated regressions across stories 1–67.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-11, worktree /tmp/pdex-11; base integration a12e79f9b18771600d8008041cf59dcc4e0d8dd0. Dependency implementation/evidence inspected before start; packaged acceptance remains separately tracked.

- 2026-10-10: Same original packaged candidate exercised against isolated synthetic Profile/Vault/time; actual Calendar client-height and Morning-context defects reproduced. Two independent review findings and these native defects repaired with focused public seam regressions. User steering transferred all further native UI input to Computer Use Virtual Mouse. Final rebuilt-candidate acceptance remains in progress; [evidence](../evidence/pdex-11.md) distinguishes original observations, repairs, pending checks and unsupported fault injection.

- 2026-10-10: Final frozen candidate built from 256ecd01aab9e92ef6bf139d7d83ccc2ae671aee (binary SHA 32132f656be31fc6f8ecd3b1b2dc5aea20436ab3460f493d8933629321dd5845), with complete [identity manifest](../evidence/pdex-11-candidate.json). All bounded review/native-discovered repairs and automatic integrated checks passed. Final native acceptance is delegated to root Computer Use Virtual Mouse; lifecycle remains in progress and unchecked native criteria remain truthful. Installed App hash unchanged.
