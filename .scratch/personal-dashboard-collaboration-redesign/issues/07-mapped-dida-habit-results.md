# 07: 映射 Dida Habit 与 snapshot 的独立结果

**What to build:** 现有映射 Habit 可按既有默认 scope 分别处理本地与 Dida completion；
一端失败、未知或刷新失败时，另一端成功仍清楚成立。

**Blocked by:** [PDCR-06: 本地 Habit 补记、撤回与历史查询](06-local-habit-history.md)

**Status:** ready-for-agent

**ID:** PDCR-07
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** closed
**Implementation:** complete
**Assignee:** Codex implementer PDCR-07
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [x] 使用当前已配置 native MCP 与唯一 counterpart identity；含糊关联澄清，不靠名称猜。
- [x] 读回验证 external effect；撤回按原来源范围；local-only 回归无外部 mutation。
- [x] 失败、unavailable、未确认与已确认分别保存；不因外部问题重复本地写入。
- [x] producer 负责确定性的 coverage/mapping/生成，简单补记不要求模型重复组装全量证据；
  coverage 不足保留旧 snapshot，不降低校验来制造刷新成功。
- [x] 独立刷新可恢复页面/projection，历史失败保留；本票 deterministic 验证不冒充 live Dida。

## Verification

用实际动态/native-tool 事件形状、外部核验和 producer adapter 覆盖 partial/unknown/coverage；live 验收留给 PDCR-12。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。

## Execution

- 2026-10-09: Claimed after required blockers closed, for authorized implement-spec. Owner: Codex implementer PDCR-07; branch: `codex/pdcr-07`; integration: `codex/collaboration-redesign-integration`. Tests use spec-confirmed seams.

- 2026-10-09: Completed at confirmed actual Collaboration/Today/file and native JSONL/RPC-shaped adapters. Implementation `3e75957`; integrated personal retro `ea88a9e` in `1d1ba87` and shared developer evidence `d2170ba` in `1aec5cb`; test-only parallel fixture identity fix `a7aac3c`. See [PDCR-07 evidence](../pdcr-07-evidence.md). All five deterministic child criteria are met: minimal producer-owned native reads/coverage, byte-preserving failure, duplicate delivery without rereading, explicit capacity gaps, independent refresh with retained failure and existing exact dual/local-only/original-scope regressions. Final 99 library / 102 Collaboration / 27 completion-snapshot / 362 frontend / 4 reader checks passed. Original failed runs and cause qualification are retained. Native/package and live Dida gates remain PDCR-11/12; the parent specification stays open.
