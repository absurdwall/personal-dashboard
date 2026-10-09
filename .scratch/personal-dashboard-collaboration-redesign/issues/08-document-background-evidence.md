# 08: 许可文档与背景更新保留可核验的修改

**What to build:** 已有固定操作不足时，Agent 可在许可 Vault 范围窄改普通文档，或
通过既有 managed 操作更新用户背景；回复、读回和 evidence 能说明实际改了什么。

**Blocked by:** [PDCR-02: 显示并保存真实工作过程与最终回复](02-observable-work-history.md)

**Status:** ready-for-agent

**ID:** PDCR-08
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** in-progress
**Implementation:** in-progress
**Assignee:** Codex implementer PDCR-08
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [ ] 先读、窄改、读回，selected Vault 与 revision 绑定；保留无关文字和历史。
- [ ] 普通文件不绕过受管数据约束，app source/settings/其他路径不进入能力范围。
- [ ] 按该次请求/目标保存实际 before/after、revision 或受限 diff；相关页面按证据重读。
- [ ] 可核验受管变更使用共用 effect 契约；native file-change 的实际 diff 可关联，
  无法获取的证据显式 gap，Agent 文本不作为文件审计。
- [ ] 背景与单日事件分开，文档/背景与其他效果独立；不增加全 Vault watcher、
  自动备份、自动 rollback 或新的后台写入权限。

## Verification

用真实许可文件/managed persistence 和 event/effect 链路核对 before/after、冲突、读回、无关内容、证据缺口与刷新。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。

## Execution

- 2026-10-09: Claimed after required blockers closed, for authorized implement-spec. Owner: Codex implementer PDCR-08; branch: `codex/pdcr-08`; integration: `codex/collaboration-redesign-integration`. Tests use spec-confirmed seams.
