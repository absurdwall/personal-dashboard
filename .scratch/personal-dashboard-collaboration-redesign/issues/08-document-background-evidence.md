# 08: 许可文档与背景更新保留可核验的修改

**What to build:** 已有固定操作不足时，Agent 可在许可 Vault 范围窄改普通文档，或
通过既有 managed 操作更新用户背景；回复、读回和 evidence 能说明实际改了什么。

**Blocked by:** [PDCR-02: 显示并保存真实工作过程与最终回复](02-observable-work-history.md)

**Status:** ready-for-agent

**ID:** PDCR-08
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** closed
**Implementation:** complete
**Assignee:** Codex implementer PDCR-08
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [x] 先读、窄改、读回，selected Vault 与 revision 绑定；保留无关文字和历史。
- [x] 普通文件不绕过受管数据约束，app source/settings/其他路径不进入能力范围。
- [x] 按该次请求/目标保存实际 before/after、revision 或受限 diff；相关页面按证据重读。
- [x] 可核验受管变更使用共用 effect 契约；native file-change 的实际 diff 可关联，
  无法获取的证据显式 gap，Agent 文本不作为文件审计。
- [x] 背景与单日事件分开，文档/背景与其他效果独立；不增加全 Vault watcher、
  自动备份、自动 rollback 或新的后台写入权限。

## Verification

用真实许可文件/managed persistence 和 event/effect 链路核对 before/after、冲突、读回、无关内容、证据缺口与刷新。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。

## Execution

- 2026-10-09: Claimed after required blockers closed, for authorized implement-spec. Owner: Codex implementer PDCR-08; branch: `codex/pdcr-08`; integration: `codex/collaboration-redesign-integration`. Tests use spec-confirmed seams.

## Completion receipt

- 2026-10-09: 本票已通过 spec 约定的真实合成文件、managed persistence、
  实际 JSONL/application/store 链路与生产前端 seams 验收。
  [Evidence](../pdcr-08-evidence.md) 记录共用 change 契约、实际读回、
  来源冲突、并发修改、历史保存失败恢复、范围拒绝和证据缺口。
- Product commits: `137e41c`, `1b8503a`; integration merge: `4e71b91`
  (latest integration `d8ee283`). Frontend build、344 frontend tests、
  199 Rust library/operation/workflow tests 通过；最终保留性修复后再跑
  56 Collaboration library tests 通过，6 个既有 native 环境门保持 ignored。
- native `sourceObserved` 是事件后的独立当前读回，无法证明即时 patch
  状态、原始 before bytes 或 Agent 意图；不足处留显式 gap。历史恢复
  保留原回执的不确定性，不重复来源写入。
- 本票 closeout 不关闭父 spec，不代表安装、发布或真实个人数据试写。
  live installed native/package 验收保留在 PDCR-12；map/execution 与
  shared management reconciliation 由 integration owner 完成。
