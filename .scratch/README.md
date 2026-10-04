# 项目规格与工作记录

本目录保留 Personal Dashboard 的设计讨论、规格和票正文副本、发布回执及交付证据。正式规格、实施状态与依赖以 [GitHub Issues](https://github.com/absurdwall/personal-dashboard/issues) 为准，规则见 [issue-tracker.md](../docs/agents/issue-tracker.md)。

## 2026-10-04 文档收尾

本次将此前留在本地、尚未提交的 36 个文件纳入仓库：5 个已有文件的修改与 31 个新增文件。文件路径保持不变；另增本索引，便于从仓库定位它们。

| 路径 | 保留内容 | 本批文件数 |
| --- | --- | --- |
| [personal-dashboard-codex-voice/](personal-dashboard-codex-voice/) | Codex 听写设计、Spec #43 副本、发布及纠正记录 | 8 |
| [personal-dashboard-lived-day-usability/](personal-dashboard-lived-day-usability/) | Spec #28、#29–#34 正文、拆分讨论及发布回执 | 13 |
| [personal-dashboard-post-merge-ui-repair/](personal-dashboard-post-merge-ui-repair/) | Spec #36 的三票拆分及发布回执 | 4 |
| [personal-dashboard-task-history/](personal-dashboard-task-history/) | PR #42/#44 的状态、复审与交付证据 | 6 |
| [personal-dashboard-usage-feedback/](personal-dashboard-usage-feedback/) | 使用反馈、语音方案调查及反馈索引 | 3 |
| [AGENTS.md](../AGENTS.md) | 管理连接约定及收尾时未提交内容的处理规则 | 1 |
| [CONTEXT.md](../CONTEXT.md) | Lived day 与 Collaboration dictation 的领域定义 | 1 |

## 历史与当前状态

规格正文、拆分讨论和 JSON 回执记录的是各次发布或验收时的事实。原文中的 `OPEN`、`ready-for-agent`、frontier、`implementationStarted`、`installed` 等不能当成持续更新的当前状态；回执中的 revision/hash 对应原事件。本批仅将两个机器专属绝对路径改为可移植的仓库或备份相对路径，原始文件保留在本机收尾备份中。

2026-10-04 回读 GitHub 时：

- Spec #28 与 #29–#34 仍开放。[PR #35](https://github.com/absurdwall/personal-dashboard/pull/35) 已合并；代码合入不等于这些票的全部验收条件已完成。原单语言语音范围后来由 [Spec #43](https://github.com/absurdwall/personal-dashboard/issues/43) 和 [ADR-0004](../docs/adr/0004-use-codex-for-collaboration-dictation.md) 替代。
- Spec #36 与 #37–#39 已关闭，[PR #40](https://github.com/absurdwall/personal-dashboard/pull/40) 已合并。相关拆分与发布回执保留当时结果。
- Spec #43 与 #45–#49 已关闭，[PR #50](https://github.com/absurdwall/personal-dashboard/pull/50) 已合并。真人反馈及未报告的场景边界见 [Spec #43 打包验收记录](../docs/acceptance/spec43-packaged-acceptance-49.md)；关闭状态本身不能证明每个场景均已验证。
- [PR #42](https://github.com/absurdwall/personal-dashboard/pull/42) 和 [PR #44](https://github.com/absurdwall/personal-dashboard/pull/44) 已合并。Task 历史目录中的复审前和交付后回执对应不同阶段。
- [PR #64](https://github.com/absurdwall/personal-dashboard/pull/64) 已合并。本次文档收尾不改变该实现，也不关闭仍待验收的 #54–#63。

这些记录保留在 `.scratch/`，遵循仓库已有布局；其中的规格是可追溯副本，旧本地 tracker 项不是新的执行队列。语音调查中的 Apple 备用建议及 Management 检查中的 opt-in 约定是历史讨论，现行服务选择与工作约定分别以 ADR-0004 和根 AGENTS.md 为准。

文档收尾包括审阅、提交并通过 PR 合入需要保留的项目记录。工作目录是否干净与已合并工作分支是否删除，须分别核对。
