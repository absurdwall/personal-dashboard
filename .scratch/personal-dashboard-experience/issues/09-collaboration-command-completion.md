# 09: Collaboration 减负与 slash 命令补全

**What to build:** 用户在更简洁的持续会话界面输入 slash，发现并补全真正可用的命令，编辑后自行发送；现有协作输入与执行能力保持。

**Blocked by:** None

**Triage:** ready-for-agent

**Status:** in-progress

**ID:** PDEX-09
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** in-progress
**Implementation:** implemented; frontend checks passed; final native, packaged UI and real IME acceptance pending
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
