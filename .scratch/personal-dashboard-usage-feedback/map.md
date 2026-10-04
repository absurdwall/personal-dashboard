# Personal Dashboard — 使用反馈收集

## 2026-09-26 当前收尾状态

01、02 均已由后续实现与修复票交付，补记 resolved。3.0.2／未来 AI 记录仍是新阶段草案，不是未完成的旧 ticket。下方原型阶段说明仅为历史。

收集日期：2026-09-22。来源：用户实际使用反馈。

这是一份历史需求来源。01、02 已经完成分诊、实现与后续修复，当前均已关闭；下面保留当时的原型和设计确认过程。

| Ticket | Blocked by | Status |
| --- | --- | --- |
| [01 历史习惯记录与跨午夜补记](issues/01-historical-habit-records.md) | None（已交付） | resolved |
| [02 当日时间刻度与现在记录边界](issues/02-today-time-axis.md) | None（已交付） | resolved |

后续反馈可继续追加；下轮再核查当前安装版本的真实行为、确定方案与验收细节。

## 2026-09-23 设计确认

02 已由用户选定 A「计划／实际双栏，共享连续时间刻度」；停止原型迭代。后续以 A 为实现参考，细化两项可执行 tickets。原始分支 `codex/prototype-today-time-axis` 已退役；归档 tag 为 `archive/today-time-axis-variant-a-2026-09-25`，本机 bundle 为 `personal-dashboard-prototypes.bundle`；详见 02 的确认记录。

## 2026-09-24 下一阶段反馈

[Tasks 与 Today 联动、App 内 AI 规划入口](2026-09-24-next-iteration.md)：前者为 3.0.2 候选，后者为后续 AI 阶段（用户暂称 4.0／最终形态）。当前仅收集需求，不开始实现、不发布可执行票；不覆盖已有 4.0 Tasks 规划。

## 2026-09-30 使用反馈（仅记录）

[下一轮使用反馈](2026-09-30-next-iteration.md)：跨午夜日期归属、已有习惯补记的可发现性、协作三栏宽度、中英混合语音、麦克风入口与英语选项精简、Today 活跃时段聚焦。保留用户确认“补记已存在”的修正；方案与换日时刻尚未决定。未开始新 iteration、未发布实现票。

## 2026-10-02 规格发布

经 grill 确认，已发布 [Spec #28：凌晨 4 点生活日与日常使用体验](https://github.com/absurdwall/personal-dashboard/issues/28)，保留[本地规格副本](../personal-dashboard-lived-day-usability/spec.md)。混合／自动语音识别延后，本轮采用中文／美式英语手动选择。用户明确仅发布 spec，暂不拆实施票或开始实现。

## 六张实施票已发布

用户随后确认拆分并授权 publish，已发布 [#29–#34 实施队列](../personal-dashboard-lived-day-usability/map.md)。#30、#31 原生阻塞于 #29；其余无前置。本轮止于发布，未认领或实现。

## PR 35 合并后的界面验收修复规格

用户实际使用确认协作两栏过渡、Today 长内容排版、时间轴展开控件三项不通过，已发布 [修复 Spec #36](https://github.com/absurdwall/personal-dashboard/issues/36)，见[本地规格](../personal-dashboard-post-merge-ui-repair/spec.md)。验收入口已获确认；候选版须先由用户实际验收，再明确同意 merge。本轮只发布规格，尚未拆票或实现。

随后用户确认拆分，已发布 [#37–#39 修复队列](../personal-dashboard-post-merge-ui-repair/map.md)，三票均无前置阻塞；每票含回归和真实候选版验收。本轮未认领或实现。
