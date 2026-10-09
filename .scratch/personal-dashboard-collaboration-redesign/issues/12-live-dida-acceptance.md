# 12: 同一候选版本的 live Dida 核验

**What to build:** 对已完成本地 native 验收的同一候选版本，在现有连接与获授权的隔离
目标上，核验真正的 Dida 写入、读回与 snapshot/source coverage。

**Blocked by:** [PDCR-11: 真实 Codex 与 app 内完整交互验收](11-native-codex-acceptance.md)

**Status:** ready-for-agent

**ID:** PDCR-12
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** open
**Implementation:** not-started
**Assignee:** unassigned
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [ ] 只使用已授权测试对象和范围；记录环境与对象准备不足，不通过真实个人数据
  的试写来绕过验收前提。
- [ ] local-only 没有 external mutation；映射双端写入/核验、原来源撤回与 snapshot
  coverage 使用真实连接，各端与 projection/page 的结果独立。
- [ ] 保存实际身份、结果、读回及候选版本的证据；fixture 与模拟失败不是 live 成功。
- [ ] 若连接或隔离目标无法取得，明确记录未验收/阻挡条件并保留本地成功；
  不关闭本票或把完整规格宣称为已交付。
- [ ] 本票不是 release 授权；正式安装、merge/push、父 spec closeout 仍按后续范围处理。

## Verification

对 PDCR-11 的同一候选版本使用已授权隔离对象和真实连接，核对外部 stable identity、实际 mutation/readback 与 source coverage。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。

## Acceptance prerequisite

- 2026-10-09: User confirmed no isolated Dida test objects have been prepared. Live mutation/readback is not authorized against personal objects. PDCR-12 remains open/unclaimed behind PDCR-11; this is an unmet live acceptance prerequisite, not a fixture success.
