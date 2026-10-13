# PDEX-SPEC-02 — 本地执行与交接边界

Date: 2026-10-11
Stage: authorized implementation; PDEX-23 integrated, native acceptance pending; PDEX-19/24 in progress
Canonical tracker: [map](map.md)
Specification: [PDEX-SPEC-02](refinement-spec-2026-10-11.md)
Published ticket range: PDEX-19–26
Publication branch: codex/dashboard-experience-refinement-spec
Publication base: d91d636b395d8c42c0c516827db37ca2565260a4
Receipt: [ticket publication](refinement-ticket-publication-2026-10-11.md)

## Historical publication frontier — 2026-10-11

PDEX-19、PDEX-23、PDEX-24没有票间依赖。PDEX-20/21/22需要19，25需要24，
26需要20/21/22/23/25。所有票ready-for-agent/open，未分配、未claim或实施。
用户“同意”批准8张票的发布，开始实现仍需后续明确请求。

## 授权执行时的记录

1. 先读完整票体、父spec、当前map和直接blockers证据；固定实际产品/界面
   基线，不能从原型整体搬代码或样式。无关dirty work先清点并保留。
2. 在票及map记录owner、claim日期、实际工作branch、完整base commit和
   所用spec/ticket snapshot。此处publication branch不是实施claim分支。
3. 在codex/分支保留有意义的增量commits，可一票多commit。记录schema兼容、
   业务/UI结果及读回、测试/评审和未覆盖项，不只记“已完成”。必要小型抽取
   随完整功能切片完成，不擅自扩大为重构或换肤。
4. 整合时保留实现/修复/合并的完整哈希、来源branches和可达性。不要amend、
   squash或删除唯一设计/实现/验收历史。当前spec/prototype基线继续独立保留。
5. 使用业务测试、真实保存读回和合成数据打包候选，原型或source字符串不能
   代替实际App。检查未要求区域保留。各票完整行为有证据再关闭，PDEX-26
   验证组合，父spec接受/正常App安装各自记录授权，不从测试通过推断。
6. 状态、blocker、失败恢复与证据留在既有本地tracker；按项目规则用现有
   Management来源读回，不新建Registry，不把通用active分类当成已实现。

## GitHub 恢复后的交接

遵循[remote handoff](remote-handoff.md)：验证远程后按授权push保留branch，
通过PR整合protected main。Git push不发布Markdown为GitHub Issues；若另行
迁移tracker，完整保留IDs/body/依赖/状态/评论/验收和映射，明确一个canonical
目标。当前没有main merge、push、PR、安装或实现结果。

## Implementation authorization — 2026-10-13

User request: implement PDEX-SPEC-02 from `918e7e0` on `codex/dashboard-experience-refinement-integration`, local Git only, full per-ticket branch/commit history retained, explicit spec scope only. Clean initial inventory. PDEX-19/23/24 claimed; worker branch names and full base are in each ticket. No installation, main merge or remote publication authorized.

## Current frontier — 2026-10-13

PDEX-19 and PDEX-24 are in progress on their ticket branches. PDEX-23 implementation is integrated; independent integration review and native acceptance remain pending, so its ticket remains in-progress. PDEX-20/21/22/25/26 are not started and retain their recorded dependencies. The publication-only frontier above is historical.

## PDEX-23 integration — 2026-10-13

- Integration branch: `codex/dashboard-experience-refinement-integration`; authorized base `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- Source branch: `codex/pdex-23-refinement`; actual worker starting tip `1906b875ccded5a77deeff8fcbecc10454733677`.
- Implementation: `fef0bdd5f80944028334a30634f03d94906e006b`.
- Retained evidence: `7b46d1890396c0d38f80fb39d82c601da155b914`.
- Worker integration synchronization: `2aa96b4d3ea1ce6f7847a44a978ba8d53eee254b` (merges `76b5222` without rewriting).
- Integration tip before merge: `9a213c58a28c4d25978d961dd76bdaf742fd07f9`.
- Integration merge: `3cb070737e919c2d9495556a19541bdf3b93c553`; `git merge --no-ff` retained complete history with no conflicts.

The tracked/untracked inventory was clean before merge; ignored build assets remain local. The merge retains the later baseline evidence docs already on integration. [Ticket validation and DOM geometry](evidence/pdex-23-refinement.md) records scoped behavior, earlier red/green checks and remaining native acceptance.

Integration validation at the merge source: `npm run build` passed; `node --test tests/frontend/collaboration-layout.test.ts tests/frontend/collaboration-context-overlay.test.ts tests/frontend/collaboration-command-completion.test.ts tests/frontend/collaboration-panels.test.ts` passed 32/32; `git diff --check` passed. These actual DOM/controller checks use synthetic fixtures without model requests; they do not establish packaged persistence, microphone or OS IME acceptance. The pre-change full frontend baseline remains 451/490 passing, 39 failures, retained in [baseline receipt](evidence/refinement-baseline-tests-2026-10-13.json). Native acceptance and integration-wide review remain pending. No ticket closure, App installation, personal-data write, main merge or remote operation occurred.
