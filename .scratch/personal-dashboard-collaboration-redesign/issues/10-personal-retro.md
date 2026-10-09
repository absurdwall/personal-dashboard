# 10: 在 Dashboard 完成 personal retro

**What to build:** 用户输入 /retro 或自然语言后，得到指定期间的计划/实际、Task 和 Habit
分析、资料缺口、来源链接与可采用的建议。

**Blocked by:** [PDCR-04: Task 与清单协作反映到真实对象和页面](04-task-list-collaboration.md); [PDCR-05: 计划、晚间复盘与历史记录协作](05-daily-record-collaboration.md); [PDCR-06: 本地 Habit 补记、撤回与历史查询](06-local-habit-history.md)

**Status:** ready-for-agent

**ID:** PDCR-10
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** open
**Implementation:** not-started
**Assignee:** unassigned
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [ ] 使用同一个 usage skill；默认最近七个完整 lived days，并明确起止，可直接调整。
- [ ] 实际消费前三个领域的历史读取结果，不只依据聊天；计划、实际与未记录分开。
- [ ] Sparse history、陈旧 projection、无实际时间数据时，unknown 不变成失败或时间浪费。
- [ ] 可选来源不可用不阻塞本地分析，明确 coverage/provenance；不强制新连接。
- [ ] 默认只在对话报告，不自动改计划/背景/历史；用户随后要求采用某建议可正常执行。
- [ ] 无新增独立 Agent 或 keyword classifier；渲染用现有真实输出与内部导航。

## Verification

在隔离历史事实上通过 /retro 与自然语言跑实际读取和 renderer；覆盖 sparse/unknown/freshness、指定期间和无自动写入。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。
