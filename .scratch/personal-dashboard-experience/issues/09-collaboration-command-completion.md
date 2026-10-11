# 09: Collaboration 减负与 slash 命令补全

**What to build:** 用户在更简洁的持续会话界面输入 slash，发现并补全真正可用的命令，编辑后自行发送；现有协作输入与执行能力保持。

**Blocked by:** None

**Status:** ready-for-agent

**ID:** PDEX-09
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** in-progress
**Implementation:** in progress
**Owner:** implementer PDEX-09
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.
**Start:** Can start immediately once implementation is requested; not claimed.

## Acceptance criteria

- [ ] 删除重复标题，长背景说明按需显示，session 列表与主对话仍清楚。
- [ ] slash 显示真实命令，至少有已有 /retro；继续输入筛选，上下键/点击选择，Tab/Enter 补全，Escape 关闭。
- [ ] 候选开启时 Enter 不发送；选择命令仅插入可编辑草稿，不新增硬编码执行流程或虚构命令。
- [ ] 中文组合输入与普通含斜杠文本不误提交；Workflow Retro 不出现在 Dashboard 命令中。
- [ ] 草稿、听写、停止、排队、会话历史和工作历史沿用现有能力，减负不隐藏真实失败/恢复结果。
- [ ] 实际输入交互和已有会话/草稿行为验证，不以命令常量或 CSS 文本存在证明通过。

## Verification

stories 51–58.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-09; isolated worktree /tmp/pdex-09; based on codex/dashboard-experience-integration from 8960c80. Q4 application/persistence and actual UI seams already confirmed.
