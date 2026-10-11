# 02: 将模糊计划定位并编辑时间精度

**What to build:** “午后”等宽泛计划在白天时间轴有明确的近似位置；用户可以编辑近似时间或显式切换为具体时点/区间，并保存原本或新选择的精度。

**Blocked by:** 01 — 在白天手动编辑具体计划并可靠保存

**Triage:** ready-for-agent

**Status:** in-progress

**ID:** PDEX-02
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** in-progress
**Implementation:** in progress
**Owner:** implementer PDEX-02
**Assignee:** implementer PDEX-02
**Date:** 2026-10-10
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.

## Acceptance criteria

- [ ] 早晨/中午/午后/傍晚或晚间按已定参考规则定位，显示原词或“约”，卡片高度不成为时长。
- [ ] 原始措辞、近似时点、精确时点和精确区间可区别读取；无法可靠定位的内容仍未定位。
- [ ] 相对时间只在有可靠记录上下文时定位，不随刷新时刻移动。
- [ ] 编辑近似时间仍落盘为近似时间；模糊与具体之间的转换只有在用户明确选择时发生。
- [ ] Morning 文字保留其自身来源的措辞，白天精度编辑不修改早间部分或事实。
- [ ] 真文档读回和重开保持精度，沿用第一票的身份、冲突与保存结果契约。

## Verification

stories 2, 14–18, 21–23, 26, 66.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-02, worktree /tmp/pdex-02; base integration 32b3678f6a5cbe443fabd4936c416b67bf603952. Dependency implementation/evidence inspected before start; packaged acceptance remains separately tracked.
