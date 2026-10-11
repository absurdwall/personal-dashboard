# 01: 在白天手动编辑具体计划并可靠保存

**What to build:** 用户点击 Current arrangement 的具体时间项目，使用时间编辑改变时点、起止或结束时间；保存到对应 Daily Record 后界面读回一致，重开仍正确。普通修改只更新当前安排和白天修订。

**Blocked by:** None

**Status:** ready-for-agent

**ID:** PDEX-01
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** in-progress
**Implementation:** code ready; packaged/UI acceptance pending
**Owner:** implementer PDEX-01
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.
**Start:** Can start immediately once implementation is requested; not claimed.

## Acceptance criteria

- [ ] 精确时点和具体区间都有可操作的时间编辑；08:00–10:00 改为 10:00–12:00 后文件和重新读取的视图一致。
- [x] 修改绑定可靠的计划身份、Selected vault 与修订，不靠同名标题、渲染下标或全局时间文字替换定位。
- [x] 只改 Current arrangement 和白天修订，Morning baseline、事实、Task 和无关 Markdown 保持不变。
- [x] 明确早间纠正及事实纠正继续走各自既有来源流程，原始证据与纠正痕迹保留，不把普通时间编辑变成双写。
- [ ] 兼容可安全识别的旧文档；遇到无法安全定位、外部修订、损坏或 Vault 切换时说明结果，不猜目标覆盖。
- [ ] 写入与修订一致保存；失败恢复已保存状态，未确认结果可重新核对，页面刷新失败不冒充文档保存失败。
- [x] 合成 Vault、读回与新 application 实例验证上述行为；修改无需模型额度。

## Verification

stories 3–7, 20, 23, 25, 27, 63–67.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-01; isolated worktree /tmp/pdex-01; based on codex/dashboard-experience-integration from 8960c80. Q4 application/persistence and actual UI seams already confirmed.

- 2026-10-10: Implemented deterministic source/revision-bound plan time editing and the production Today editor. Isolated daily-plan workflow: 11 passed (3 new); frontend regressions: 388 passed; TypeScript build passed. See [PDEX-01 evidence](../evidence/pdex-01.md). Packaged IPC/UI acceptance remains pending; lifecycle stays in-progress.
