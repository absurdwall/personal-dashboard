# 05: 计划、晚间复盘与历史记录协作

**What to build:** 早间计划、白天重排、晚间复盘、short record 和历史纠正均通过对话
落到原 Daily Record，并可由回复打开指定日期/phase。

**Blocked by:** [PDCR-02: 显示并保存真实工作过程与最终回复](02-observable-work-history.md)

**Status:** ready-for-agent

**ID:** PDCR-05
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** open
**Implementation:** not-started
**Assignee:** unassigned
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [ ] 重排保留 morning baseline；dated fact、current arrangement 与 review 分开。
- [ ] 历史纠正保留原文/纠正痕迹和无关内容；short record 不变成 Habit evidence。
- [ ] 指定期间读取能返回日期、baseline/current arrangement、事实与 reviews，
  无记录保持 unknown，而非为 retro 补写历史。
- [ ] 结果和页面使用既有正本；明确请求直接执行，requested proposal 不提前保存。
- [ ] 自动早间计划仍为 initial-plan-only、不覆盖已有计划、不增加其他写入能力。

## Verification

用既有 Daily Plan、evening review、short record 与 Collaboration 入口，核对 canonical 记录、历史查询与日期/phase 导航。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。
