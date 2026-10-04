# Personal Dashboard — Codex WebRTC 听写输入

> 历史记录：本页队列、标签及 frontier 保留发布时快照；Spec #43 与 #45–#49 后来已关闭，PR #50 已合并。 参见[文档索引](../README.md)。

设计及测试边界已由用户确认；正式规格为 [GitHub Spec #43](https://github.com/absurdwall/personal-dashboard/issues/43)。用户批准五张纵向实施票后，已发布 GitHub #45–#49，并回读确认 ready-for-agent 标签和原生阻塞关系。尚未认领或开始实现；父规格保持不变。

| Tracker item | Kind | Blocked by | Status |
| --- | --- | --- | --- |
| [GitHub Spec #43](https://github.com/absurdwall/personal-dashboard/issues/43) | spec | None | ready-for-agent |
| [误建本地规格项](issues/01-codex-webrtc-dictation-spec.md) | superseded | None | wontfix |

本地辅助副本：[开发规格](spec.md)。依据：[设计访谈](design-discussion.md)、[调研](../personal-dashboard-usage-feedback/2026-10-03-voice-options-research.md)、[ADR-0004](../../docs/adr/0004-use-codex-for-collaboration-dictation.md)。

本规格替代旧语音范围中的 Apple 手动单语言路径；不据规格发布关闭旧票的真人验收。

## GitHub implementation queue

| Ticket | Blocked by (native GitHub dependencies) | Label |
| --- | --- | --- |
| [#45 打通打包 Mac 的 Codex WebRTC 听写到草稿](https://github.com/absurdwall/personal-dashboard/issues/45) | None | ready-for-agent |
| [#46 完成流式预览、连续口述与尾段合并](https://github.com/absurdwall/personal-dashboard/issues/46) | #45 | ready-for-agent |
| [#47 保护取消、断线与跨会话听写结果](https://github.com/absurdwall/personal-dashboard/issues/47) | #46 | ready-for-agent |
| [#48 退役 Apple 离线依赖并形成 Codex-only 候选包](https://github.com/absurdwall/personal-dashboard/issues/48) | #45 | ready-for-agent |
| [#49 完成 Codex 听写候选的真人与故障验收](https://github.com/absurdwall/personal-dashboard/issues/49) | #47, #48 | ready-for-agent |

当前 frontier 为 #45；完成后 #46 与 #48 可并行。状态与依赖以 GitHub 回读为准。本表只是辅助索引，不建立本地执行队列。发布回执见 ticket-publication.json。
