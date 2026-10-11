# 11: 验证同一打包版本的完整日常流程

**What to build:** 在同一个打包 App 中完成计划阅读/调整、Task 时间分配与勾选、整月查看、命令补全和晚间复盘入口的一次可核对流程，保留落盘、重开与实际 UI 证据。

**Blocked by:** 03 — 保持早间文字与可读的统一白天时间轴; 04 — 拖动计划并调整结束时间; 05 — Tasks 使用清晰勾选列表与所选详情; 07 — 在白天时间轴选区创建与移动 Task; 08 — Calendar 完整紧凑月历与记录状态; 09 — Collaboration 减负与 slash 命令补全; 10 — Evening 一键进入带日期的复盘草稿

**Triage:** ready-for-agent

**Status:** blocked

**ID:** PDEX-11
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** blocked
**Implementation:** code complete; native acceptance blocked
**Owner:** implementer PDEX-11
**Assignee:** implementer PDEX-11
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.

## Acceptance criteria

- [x] 验收固定候选身份，使用隔离 Profile、合成 Vault 和受控时间，覆盖三个阶段与相关页面。
- [x] 修改当前计划后文档/视图/重开一致，早间基准和事实独立；精确与模糊计划符合各自含义。
- [x] Task 选区、移动、区间读回与完成状态一致，旧任务及旧对话/离线调用的保存兼容性保持。
- [ ] 五/六行月历、重叠条目、长拖动、清晰勾选和详情在常用及窄窗口可操作。
- [x] slash 键盘/点击/中文输入法、草稿保留、目标日期与晚间入口验证通过，补全与入口均不自动发消息（真实 IME 子项由用户接受现有证据并豁免专门补测）。
- [x] 文档冲突、写入失败和未确认结果真实表达；正常模型额度耗尽不阻止确定性编辑（额度子项由用户接受现有证据并豁免真实耗尽补测，未实际观察额度耗尽）。
- [x] 各功能票自己的测试证据仍保留；汇总独立代码检查、自动测试和打包 UI 验收，不把未验证项目写成通过。
- [x] 不修改个人真实数据，不从此票推断安装或远端发布已获授权，不关闭父 spec。


## Verification

story 68 and integrated regressions across stories 1–67.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-11, worktree /tmp/pdex-11; base integration a12e79f9b18771600d8008041cf59dcc4e0d8dd0. Dependency implementation/evidence inspected before start; packaged acceptance remains separately tracked.

- 2026-10-10: Same original packaged candidate exercised against isolated synthetic Profile/Vault/time; actual Calendar client-height and Morning-context defects reproduced. Two independent review findings and these native defects repaired with focused public seam regressions. User steering transferred all further native UI input to Computer Use Virtual Mouse. Final rebuilt-candidate acceptance remains in progress; [evidence](../evidence/pdex-11.md) distinguishes original observations, repairs, pending checks and unsupported fault injection.

- 2026-10-10: Final frozen candidate built from 256ecd01aab9e92ef6bf139d7d83ccc2ae671aee (binary SHA 32132f656be31fc6f8ecd3b1b2dc5aea20436ab3460f493d8933629321dd5845), with complete [identity manifest](../evidence/pdex-11-candidate.json). All bounded review/native-discovered repairs and automatic integrated checks passed. Final native acceptance is delegated to root Computer Use Virtual Mouse; lifecycle remains in progress and unchecked native criteria remain truthful. Installed App hash unchanged.

## Answer and acceptance blocker

- 2026-10-10: Final isolated candidate passed native source/view/restart, Task, Calendar, slash and Evening flows plus genuine conflict/PermissionDenied recovery. Remaining gates are real Sogou IME, exact final native reference windows/held long drag, safely established saved-but-readback-failed fault and actual authenticated quota exhaustion. No unsupported check is marked passed.
- [Frozen candidate and complete final evidence](../evidence/pdex-11.md). Code and both reviews are complete; Status/lifecycle blocked records an environment/verification limitation, not an implementation defect or permission request. Triage remains ready-for-agent. Resume from the preserved candidate and synthetic fixture when the required native input/fault environment is available; parent specification stays open. Earlier pending statements are retained as historical checkpoints.


## Native continuation — 2026-10-11

Human-authorized root CUA pass at `bc99cf2` / binary `76f12c68…` establishes exact native reference windows and genuine typed post-save reload failure with authoritative recovery/no replay. Current native Task, ordinary slash/Tab/Enter, overlap, immediate move/end-resize, conflict/write failure, dated Evening/error/draft and restart evidence is retained in [the source-bound continuation](../evidence/native-acceptance-2026-10-11.md). Real Sogou composition, sustained native edge gesture/resize cancellation and authenticated quota exhaustion remain unverified; combined criteria stay unchecked. Restart uncovered dynamic axis startup localization, now assigned to the existing single repair worker. Any repair requires a newly frozen candidate; source A does not silently become newer-source acceptance. Status/Lifecycle remain blocked and parent open.


## Rebuilt native continuation B — 2026-10-11

A fresh isolated package frozen at `ffa1b85`, binary `f76ad9b2460bda459a3c7b68aac6f2e3bdeed71da8aa032944a7df9841523bab`, verifies the bounded frontend repairs with native input: persisted-English axis startup/restart, hidden exact/approximate point End, real Save followed by localized readback failure and authoritative no-replay recovery, readable selected slash, wide five/six-row Calendar, dated unsent Evening entries and retained ordinary draft. [B report and raw hashes](../evidence/native-acceptance-2026-10-11-b.md) preserve actual observations and unsuccessful resize attempts. Canonical build and five focused files pass 43/43. Source-A Task/conflict/write-failure/narrow-window observations remain qualified historical support, not new B actions.

B did not establish fresh narrow-window acceptance; real Sogou composition, sustained native edge dragging/active resize cancellation and authenticated quota exhaustion remain unverified. Combined criteria stay unchecked, Status/Lifecycle blocked and parent open. Both B processes were quit through CUA and its exact bundle unregistered; installed App hashes are unchanged. Final independent review remains pending.


## Normal installed continuation — 2026-10-11

Human-authorized daily App replacement is complete on reviewed product source `6af1198` / installed executable `a6a277f68b25002f88c4958ed56a93c19b7497dc36eb49fa571a2f7b85b3d833`, normal production identifier/configuration with real profile/clock/connection. [Installation and recovery evidence](../evidence/local-install-2026-10-11.md) confirms existing data/drafts retained and no test submission. [Current unblock steps](../manual-acceptance.md) distinguish human native input/gesture/window checks from naturally exhausted account environment. Status/Lifecycle remain blocked, combined criteria unchecked, parent open. Installation does not convert missing acceptance into a pass.


## Human quota acceptance decision — 2026-10-11

The human explicitly accepted the quota-exhaustion criterion and waived further actual exhaustion testing in review chat `01a128ff-8865-7493-9698-cc48c19d7939` (direct user reply `01a12969-8b59-76a3-a544-d67411f4656f`). The quota subgate is **accepted by human waiver on existing evidence**, not an observed exhaustion result. No controlled injection, new model request or artificial quota spending is required or performed. Historical statements that actual exhaustion was not established remain true observations; their pending-test/blocker status is superseded by this explicit decision.

PDEX-11's conflict/write-failure/unconfirmed-result combined criterion is now checked: existing qualified source/persistence/production native evidence supports those constituents, and the quota constituent is explicitly accepted by the human. Remaining required gates are real Sogou composition, sustained native edge/active resize cancellation and fresh final-installed 830×758 narrow-window behavior. PDEX-09/PDEX-11 remain blocked, parent open, and nine other tickets resolved. [Current manual checks](../manual-acceptance.md) no longer asks for quota exhaustion. Installation remains confirmed and does not by itself close the remaining gates.


## Human IME acceptance and PDEX-09 resolution — 2026-10-11

The direct human message `01a1296a-888d-7193-9c10-77ca83962f5f` in review chat explicitly accepts the real Chinese IME criterion on existing evidence and waives dedicated native composition testing; normal daily Chinese use will supply future issue feedback. This is **human acceptance/test waiver**, not an observed OS composition result. Existing keyboard/completion/ordinary-slash/draft checks and independent review are complete, so PDEX-09 is now locally resolved/closed with all acceptance criteria accounted for. The same shared IME subgate is accepted for PDEX-11. No additional test message, input-source change or model request is required.

Current tracker: ten resolved, one blocked (PDEX-11), parent open. PDEX-11's slash/draft/date/Evening combined criterion is checked using existing qualified behavior evidence plus the explicit IME waiver; its quota/conflict/failure criterion is already accepted as recorded above. Only sustained native edge dragging/active gesture cancellation and resize, plus fresh final-installed 830×758 narrow-window behavior remain required. [Current two manual check categories](../manual-acceptance.md) supersede earlier pending-IME/quota lists without erasing historical observations. Installation is confirmed; full native acceptance and parent closure remain pending these two categories.
