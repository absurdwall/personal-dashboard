# PDEX-SPEC-02 — 本地执行与交接边界

Date: 2026-10-11
Stage: eight tickets published; implementation not started
Canonical tracker: [map](map.md)
Specification: [PDEX-SPEC-02](refinement-spec-2026-10-11.md)
Published ticket range: PDEX-19–26
Publication branch: codex/dashboard-experience-refinement-spec
Publication base: d91d636b395d8c42c0c516827db37ca2565260a4
Receipt: [ticket publication](refinement-ticket-publication-2026-10-11.md)

## Current frontier

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


## Reimplementation checkpoint — 2026-10-14

The user authorized restarting PDEX-SPEC-02 implementation from the clean
unimplemented checkpoint `918e7e0d9c4b2c524c429bfd309482e328bc4c91`, preserving
full local Git history and changing only ticket-specified behavior. PDEX-19 was
implemented on `codex/pdex-19-restart` in worktree
`/tmp/pdex-restart-20261014.noindex/pdex-19`, starting at integration tip
`8275615a3f3cad2a783d74561472c78c4bbeb493` (the integration branch tip whose
parent is the requested `918e7e0`). Its three implementation/test commits are
`f0a95909d249535d300ed735a17a603fcd0bcb6b`,
`d04330c518be1d5dc34e5b689cb126a95bbcc40c`, and
`689b383df3ca235fb0dcdcee3ae4d881b4aa963d`. The rejected implementation branch
was not used as a source.

PDEX-19 code implementation is committed and its branch worktree is clean. The
backend priority/tag fields read back under the same Task identity; filters and
sort remain view state. Build, focused browser/frontend tests, and the Rust
persistence test pass. Three pre-fix full-suite failures were test-double API
errors (`form.querySelectorAll` absent) in Today editor preservation cases; the
mock was corrected in the third commit, and all three targeted cases now pass.
The full suite was not rerun after this test-only correction. The recorded
full-suite run before that correction was 449/491 pass, 42 fail; only the
`task-surface.test.ts` 7px-vs-9px assertion has been confirmed against the
clean baseline. Other non-PDEX-19 failures are itemized, with baseline status
left to the integration owner, in [PDEX-19 implementation evidence](evidence/pdex-19-implementation-2026-10-14.md).

PDEX-19 remains `in-progress` because packaged application acceptance is
separate and belongs to PDEX-26. No branch merge, install, remote operation or
main change is recorded here.
