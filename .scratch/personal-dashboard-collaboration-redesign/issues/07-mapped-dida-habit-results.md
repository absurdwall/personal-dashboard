# 07: 映射 Dida Habit 与 snapshot 的独立结果

**What to build:** 现有映射 Habit 可按既有默认 scope 分别处理本地与 Dida completion；
一端失败、未知或刷新失败时，另一端成功仍清楚成立。

**Blocked by:** [PDCR-06: 本地 Habit 补记、撤回与历史查询](06-local-habit-history.md)

**Status:** ready-for-agent

**ID:** PDCR-07
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** open
**Implementation:** not-started
**Assignee:** unassigned
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Acceptance criteria

- [ ] 使用当前已配置 native MCP 与唯一 counterpart identity；含糊关联澄清，不靠名称猜。
- [ ] 读回验证 external effect；撤回按原来源范围；local-only 回归无外部 mutation。
- [ ] 失败、unavailable、未确认与已确认分别保存；不因外部问题重复本地写入。
- [ ] producer 负责确定性的 coverage/mapping/生成，简单补记不要求模型重复组装全量证据；
  coverage 不足保留旧 snapshot，不降低校验来制造刷新成功。
- [ ] 独立刷新可恢复页面/projection，历史失败保留；本票 deterministic 验证不冒充 live Dida。

## Verification

用实际动态/native-tool 事件形状、外部核验和 producer adapter 覆盖 partial/unknown/coverage；live 验收留给 PDCR-12。

## Evidence and closeout

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。
