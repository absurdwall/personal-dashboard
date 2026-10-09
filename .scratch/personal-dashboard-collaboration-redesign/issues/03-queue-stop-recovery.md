# 03: 排队、停止、纠正与未知结果恢复

**What to build:** 执行中普通消息排队；用户停止后队列暂停，发送纠正成为新轮；
之后可以继续队列并核对未知结果，不重复已经保存的修改。

**Blocked by:** [PDCR-02: 显示并保存真实工作过程与最终回复](02-observable-work-history.md)

**Status:** ready-for-agent

**ID:** PDCR-03
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** in-progress
**Implementation:** in-progress
**Assignee:** Codex implementer PDCR-03
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [ ] 按提交时的 Vault/target/lived-day 上下文处理，执行时读取新事实；跨 04:00
  或切换页面/日期不重定向原请求，不使用 steer。
- [ ] pending stop 与已停止区分；阻止尚未开始的动作，已确认效果保留，在途结果未知。
- [ ] 纠正先于暂停队列处理；继续/移除待执行消息显式可控，不撤销既有修改。
- [ ] receipt/readback 核对只更新对应结果；恢复不整轮重放，未知不阻塞无关工作。
- [ ] 超时、transport 失败、历史落盘失败和重启都保留可核对状态；保持 delayed-save
  timeout 修复、draft/Cmd+Enter/听写与 Vault 切换边界。

## Verification

用 application queue/interrupt/readback 和实际 composer handlers 覆盖停止时机、跨日/切 Vault、晚到结果、历史落盘失败及草稿回归。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。

## Execution

- 2026-10-09: Claimed after required blockers closed, for authorized implement-spec. Owner: Codex implementer PDCR-03; branch: `codex/pdcr-03`; integration: `codex/collaboration-redesign-integration`. Tests use spec-confirmed seams.
