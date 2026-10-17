# 11: 真实 Codex 与 app 内完整交互验收

**What to build:** 对完整候选 app 进行可回看的本地/packaged 验收，证明真实 Codex 的
工作、保存、页面、reopen、两个 retro 与现有输入功能一致。

**Blocked by:** [PDCR-03: 排队、停止、纠正与未知结果恢复](03-queue-stop-recovery.md); [PDCR-07: 映射 Dida Habit 与 snapshot 的独立结果](07-mapped-dida-habit-results.md); [PDCR-09: 在 Codex 完成一次有证据的 workflow retro](09-workflow-retro.md); [PDCR-10: 在 Dashboard 完成 personal retro](10-personal-retro.md)

**Status:** wontfix

**ID:** PDCR-11
**Parent:** [PDCR-SPEC-01](../spec.md)
**Lifecycle:** closed
**Iteration scope:** closed-retired; remaining acceptance no longer required by user on 2026-10-17; [decision](../evidence/ticket-disposition-2026-10-17.md)
**Implementation:** code integrated; native acceptance partial
**Assignee:** unassigned; no current execution
**Date:** 2026-10-09
**Approval:** User approved the 12-ticket breakdown and blocking edges on 2026-10-09.

## Current answer — 2026-10-17

Closed and retired by the user because the remaining acceptance is no longer required; this ticket is not deferred.

[Disposition and GitHub migration contract](../evidence/ticket-disposition-2026-10-17.md).
Historical implementation and test evidence below retain their original source
qualification. Unchecked criteria are not new passes. Migrate as closed with
reason `not_planned`; previous blocked/open statements below are dated history.

## Acceptance criteria

- [ ] 在隔离 synthetic Vault 使用实际 app/runtime/model，跑白天记录、mixed intent、
  部分失败/恢复、queue/stop/readback 及 reopening，而不是只运行模拟 reducer。
- [ ] 核对 canonical 文件与可见页面、折叠/展开/Markdown/导航，保留原型壳的产品体验。
- [ ] 旧会话/未知结果/跨 04:00/日期与 Vault 隔离、Cmd+Enter/新编辑/听写回归可核查。
- [ ] 真实 runtime optional phase/summary/usage 的支持或降级如实记录；自动早间计划范围
  和 delayed-save 消费不回退。
- [ ] 验收候选 revision/runtime/build identities 与 evidence 一致，workflow retro 能
  消费至少一组该候选的实际执行，personal retro 不改写历史。
- [x] 标明本地与 external 验收区分；不因本票通过自动安装正式 app、合入 main、
  关闭父 spec 或声称 live Dida 已通过。

## Verification

使用完整候选 app、实际 Codex runtime/model 与 synthetic Vault；记录 candidate identity、原始私有 evidence 位置与可提交的脱敏结果。

## Evidence and closeout

2026-10-09 partial native acceptance is recorded in
[native evidence](../evidence/11-native-acceptance.md): actual complete candidates
`88315b9` and rebuilt `7b3dc8`, fresh immutable workflow-reader evidence, actual
three-domain personal retros, natural queue crossing 04:00, automatic initial
plan scope, source/navigation/reopen and controlled lost-terminal readback.
Human spoken transcript and PDCR-03 native unknown-scope decision remain unmet;
the ticket and parent spec are not closed. A bounded injected legacy fixture
confirmed native original-text compatibility. The missing-process marker was
absent on `7b3dc8`, then corrected and accepted through a fresh no-auth exact-PID
`c5be634` native check in English/Chinese, with unchanged messages/four canonical
hashes and no new execution/auth. Prior actual business evidence retains its
`7b3dc8` source qualification. Fixture/transport support and unobserved
natural long delay remain explicitly qualified.

按本地 tracker 记录 claim、工作分支、验证结果、具体 evidence 与 commit 回执。
只有本票验收满足后才更新 lifecycle；缺失的真实环境验收保持未完成，不能用 fixture 替代。
本票发布不启动实施，也不授权真实个人数据试写、正式安装、merge/push 或关闭父 spec。

## Execution

- 2026-10-09: Claimed after required blockers closed, for authorized implement-spec. Owner: Codex implementer PDCR-11; branch: `codex/pdcr-11`; integration: `codex/collaboration-redesign-integration`. Tests use spec-confirmed seams.

- 2026-10-09: Partial acceptance checkpoint after legacy reassessment `789f093`
  / integration `c1a9cb6`. Criteria checked above refer to the source-qualified
  actual native observations and affected-source reassessment, not an assertion
  that all business/model rounds were repeated on `c5be634`. Human actual
  spoken transcript/edit/cancel/send is still missing; PDCR-03's unknown Dida
  object-scope criterion also remains unmet. Lifecycle is blocked, triage
  ready-for-human; no closure, release, parent closeout or live Dida claim.
  All owned candidate processes/auth/registrations are removed; private
  immutable evidence and `.noindex` candidate copies retained.

- 2026-10-09: Round2 product `ac65cfa` changes native reconciliation, persisted
  optional evidence, source-read provenance and its UI/reader. The affected
  complete-candidate criteria1/2/4/5 above are unchecked for this new candidate;
  earlier successful native observations remain in the linked evidence under
  `7b3dc8` / `c5be634`, not erased or relabeled. Application/file/stdio/renderer
  checks and independent source review pass but are not packaged acceptance.
  Human spoken transcript and PDCR-03 remain unmet; lifecycle stays blocked.

- 2026-10-17: User-authorized local closure; see [current disposition](../evidence/ticket-disposition-2026-10-17.md). No product change or additional acceptance run.
