# 01: 用统一 usage skill 完成并核验一条白天记录

**What to build:** 用户自然描述白天发生的事实，Agent 从统一 skill 获得实际可用能力，
使用既有业务操作保存到正确 Daily Record，并如实报告结果。

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**ID:** PDCR-01
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** open
**Implementation:** not-started
**Assignee:** unassigned
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [ ] 建立 usage 包的装载与版本契约，集中协作指导/工具描述，不丢失既有
  Task、Daily Record、Habit、memory 等能力；只有实际注册的工具可被广告。
- [ ] 明确请求直接保存；讨论与请求 proposal 分开；不新增第二个语义授权器。
- [ ] 隔离记录可读回，日期正确；只记录事实不重新编造 arrangement，baseline
  与无关内容保持。保存历史失败时不重复写入业务数据。
- [ ] 无关的可选连接缺失不影响本地保存；自动早间计划能力范围不扩大。
- [ ] 通过现有 Collaboration application 与真实 file-backed adapter 验证。

## Verification

通过现有 Collaboration application、隔离 Vault 与真实业务 adapter 验证保存和 readback；记录 skill/capability 版本及旧能力回归。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。
