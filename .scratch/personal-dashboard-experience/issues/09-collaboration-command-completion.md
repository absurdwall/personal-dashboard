# 09: Collaboration 减负与 slash 命令补全

**What to build:** 用户在更简洁的持续会话界面输入 slash，发现并补全真正可用的命令，编辑后自行发送；现有协作输入与执行能力保持。

**Blocked by:** None

**Triage:** ready-for-agent

**Status:** blocked

**ID:** PDEX-09
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** blocked
**Implementation:** code complete; native acceptance blocked
**Owner:** implementer PDEX-09
**Assignee:** implementer PDEX-09
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.
**Start:** Authorized and claimed on 2026-10-10; no direct blockers.

## Acceptance criteria

- [x] 删除重复标题，长背景说明按需显示，session 列表与主对话仍清楚。
- [x] slash 显示真实命令，至少有已有 /retro；继续输入筛选，上下键/点击选择，Tab/Enter 补全，Escape 关闭。
- [x] 候选开启时 Enter 不发送；选择命令仅插入可编辑草稿，不新增硬编码执行流程或虚构命令。
- [ ] 中文组合输入与普通含斜杠文本不误提交；Workflow Retro 不出现在 Dashboard 命令中。
- [x] 草稿、听写、停止、排队、会话历史和工作历史沿用现有能力，减负不隐藏真实失败/恢复结果。
- [x] 实际输入交互和已有会话/草稿行为验证，不以命令常量或 CSS 文本存在证明通过。

## Verification

stories 51–58.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-09; isolated worktree /tmp/pdex-09; based on codex/dashboard-experience-integration from 8960c80. Q4 application/persistence and actual UI seams already confirmed.

- 2026-10-10: Production completion and folded help implemented in `7ebe2c2`; merged integration `0fd4362` through `4e95520`, retaining history. `npm run build` and 396 frontend tests passed, including eight actual macOS WebKit DOM tests. [Evidence](../evidence/pdex-09.md) separates automatic checks, native persistence readback/restart, and pending packaged/real IME acceptance. Lifecycle remains in-progress until required acceptance evidence is available; parent spec is not closed.

## Remaining acceptance

- Synthetic composition-event/keycode-229 and ordinary-slash checks passed. Real Chinese operating-system IME and packaged Tauri UI acceptance remain unverified, so that combined criterion stays unchecked.
- Final native persistence invocation remains pending for the parent orchestrator's serialized canonical-target check after integration. The duplicate isolated dependency build was intentionally stopped on its instruction to reduce host resource use; shared-target success alone remains qualified because concurrent worktrees can replace binaries.

- 2026-10-10: Root serialized native confirmation on integration passed /retro draft restart and explicit-send test (1 passed). Evidence updated; no concurrent canonical-target producer. Packaged and native IME acceptance remain pending.

## Answer and acceptance blocker

- 2026-10-10: Real Sogou composition cannot be established through the current bound-app keyboard path: Shift-only is rejected before input and Control+Space still yields ASCII. Unicode paste and synthetic WebKit composition checks passed but do not close the native IME criterion.
- [Frozen candidate and complete final evidence](../evidence/pdex-11.md). Code and both reviews are complete; Status/lifecycle blocked records an environment/verification limitation, not an implementation defect or permission request. Triage remains ready-for-agent. Resume from the preserved candidate and synthetic fixture when the required native input/fault environment is available; parent specification stays open. Earlier pending statements are retained as historical checkpoints.


## Native continuation — 2026-10-11

Human-authorized root CUA pass at `bc99cf2` / binary `76f12c68…` establishes exact native reference windows and genuine typed post-save reload failure with authoritative recovery/no replay. Current native Task, ordinary slash/Tab/Enter, overlap, immediate move/end-resize, conflict/write failure, dated Evening/error/draft and restart evidence is retained in [the source-bound continuation](../evidence/native-acceptance-2026-10-11.md). Real Sogou composition, sustained native edge gesture/resize cancellation and authenticated quota exhaustion remain unverified; combined criteria stay unchecked. Restart uncovered dynamic axis startup localization, now assigned to the existing single repair worker. Any repair requires a newly frozen candidate; source A does not silently become newer-source acceptance. Status/Lifecycle remain blocked and parent open.


## Rebuilt native continuation B — 2026-10-11

Fresh frozen `ffa1b85` package verifies readable dark selected-command text, Tab insertion of editable `/retro ` without sending, and ordinary embedded slash/pasted Unicode preservation. [B source-bound report](../evidence/native-acceptance-2026-10-11-b.md) separates paste from real composition. The contrast repair and corrected actual-scroll startup regression pass the current built canonical 43/43 focused checks. Real Sogou composition remains unverified; its combined criterion remains unchecked. Status/Lifecycle remain blocked, final independent review pending, parent open.
