# 02: 显示并保存真实工作过程与最终回复

**What to build:** 同一条记录执行时能看到实际过程说明、可用思考摘要和工具活动；
完成后工作过程折叠，最终回复可读，重新打开仍能回看。

**Blocked by:** [PDCR-01: 用统一 usage skill 完成并核验一条白天记录](01-skill-daytime-record.md)

**Status:** ready-for-agent

**ID:** PDCR-02
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** open
**Implementation:** not-started
**Assignee:** unassigned
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [ ] 从实际 runtime 事件接入 commentary、summary、tool、receipt、final 与终态；
  保留 item/call 身份、顺序和时间。没有摘要时不补写，系统状态与生成内容区分。
- [ ] 完成快照权威合并，重复 item/delta 不重复显示；final 文本不提前结束 turn。
- [ ] 实际失败/重试可展开，普通界面无原始 JSON，Markdown 列表和可信内部导航可用。
- [ ] 相应 canonical 保存后能更新页面，保存、刷新与聊天落盘结果分开。
- [ ] 批量保存增量但可靠保留关键结果；旧会话兼容，reopen 无虚构历史。
- [ ] 现有 watch/session 入口贯穿后端与 renderer；不为每类工具另造 UI 通道。

## Verification

用真实形状 stdio 事件驱动实际 session/store/renderer，覆盖交错、重复、缺少摘要、失败后恢复和 reopen。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。
