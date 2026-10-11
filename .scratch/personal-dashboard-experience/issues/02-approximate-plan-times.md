# 02: 将模糊计划定位并编辑时间精度

**What to build:** “午后”等宽泛计划在白天时间轴有明确的近似位置；用户可以编辑近似时间或显式切换为具体时点/区间，并保存原本或新选择的精度。

**Blocked by:** 01 — 在白天手动编辑具体计划并可靠保存

**Triage:** ready-for-agent

**Status:** resolved

**ID:** PDEX-02
**Parent:** [PDEX-SPEC-01](../spec.md)
**Lifecycle:** closed
**Implementation:** complete; component acceptance verified
**Owner:** implementer PDEX-02
**Assignee:** implementer PDEX-02
**Date:** 2026-10-10
**Acceptance:** component verified; full packaged/OS gates retained in PDEX-11
**Breakdown decision:** User approved the eleven-ticket breakdown and blocking edges on 2026-10-10.

## Acceptance criteria

- [x] 早晨/中午/午后/傍晚或晚间按已定参考规则定位，显示原词或“约”，卡片高度不成为时长。
- [x] 原始措辞、近似时点、精确时点和精确区间可区别读取；无法可靠定位的内容仍未定位。
- [x] 相对时间只在有可靠记录上下文时定位，不随刷新时刻移动。
- [x] 编辑近似时间仍落盘为近似时间；模糊与具体之间的转换只有在用户明确选择时发生。
- [x] Morning 文字保留其自身来源的措辞，白天精度编辑不修改早间部分或事实。
- [x] 真文档读回和重开保持精度，沿用第一票的身份、冲突与保存结果契约。

## Verification

stories 2, 14–18, 21–23, 26, 66.

按 Q4 使用现有 application/真实持久化与实际交互验证本票外部行为；保留合成数据、保存读回、重新启动和适用的打包 UI 证据。源码字符串与原型内存状态不替代验收。

## Execution

- 2026-10-10: Published locally with the approved scope and dependencies; unassigned, not claimed, not started. Record subsequent authorized claims, commits, checks and acceptance here. Publication does not close the parent specification.

- 2026-10-10: Authorized claim on codex/pdex-02, worktree /tmp/pdex-02; base integration 32b3678f6a5cbe443fabd4936c416b67bf603952. Dependency implementation/evidence inspected before start; packaged acceptance remains separately tracked.

- 2026-10-10: Implemented on `codex/pdex-02`: `8400b9f` precision/source persistence and `6740e5d` production editor with five actual WebKit interaction tests. Initial branch was confirmed at claim `b547bd9` above `32b3678`; retained integration merges include `d10cad6` and `2275bf1`.
- 2026-10-10: Build passed; 402 frontend tests passed before the latest PDEX-03 merge, then five production-modal tests passed again on that merge. Isolated public workflows passed 15 Daily Plan and 54 Today tests. See [PDEX-02 evidence](../evidence/pdex-02.md) for red-green observations and exact scope. First criterion remains unchecked for full broad-card visual/package acceptance; local lifecycle remains in-progress until that acceptance is recorded.

## Answer and local resolution

- 2026-10-10: All broad reference rules and distinguishable precisions passed the public source/persistence and rendered-card checks. Original native broad movement saved 约14:00 without an end, and the final frozen candidate reads the saved approximate value while preserving Morning wording. Actual editor tests cover explicit precision conversion, stable context and restart; the final candidate source/view agrees.
- Final integrated checks: build, 431 frontend, 23 browser and 519 Rust passed (six pre-existing native ignores); independent Standards and Spec reviews have no unresolved findings. [Final packaged observations and limits](../evidence/pdex-11.md) supplement this ticket’s retained original evidence. Status resolved/lifecycle closed applies to this component only; PDEX-09/PDEX-11 and parent PDEX-SPEC-01 remain open. Earlier pending statements above record historical checkpoints.
