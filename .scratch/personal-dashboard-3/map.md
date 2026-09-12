# Personal Dashboard 3.0 — ticket map

用户已批准九票拆分及依赖；所有票已发布，01 已完成，其余尚未执行。

父规格：[spec](spec.md)。设计／认可原型：[原型说明](../../../.scratch/personal-dashboard-3/prototype/README.md)、[设计收敛稿](../../../.scratch/personal-dashboard-3/design-summary.md)。

按 01–09 顺序逐票执行可满足所有依赖；01／02／04／06 无前置，但共享文件仍须协调。每次新任务都应使用包含前置成果的 checkout。若单独 worktree，先集成前置提交；不要让下一票从未包含前置的默认分支开始。

| Ticket | Blocked by | Status |
| --- | --- | --- |
| [01 设置、Vault 入口与预设颜色](issues/01-settings-vault-colors.md) | None | resolved |
| [02 固定界面中英切换](issues/02-interface-language.md) | None | ready-for-agent |
| [03 本地背景图片与页面分层](issues/03-background-image.md) | 01 | ready-for-agent |
| [04 Today 右侧当天任务](issues/04-day-tasks.md) | None | ready-for-agent |
| [05 规划任务增量接收与重排保留](issues/05-planning-task-merge.md) | 04 | ready-for-agent |
| [06 Habits 本地打勾与来源合并](issues/06-local-habit-completion.md) | None | ready-for-agent |
| [07 Calendar 历史任务与习惯更正](issues/07-historical-corrections.md) | 04, 06 | ready-for-agent |
| [08 Google Drive 同步目录兼容验收](issues/08-drive-compatibility.md) | 01, 05, 07 | ready-for-agent |
| [09 Packaged Mac 整体验收与原型对照](issues/09-packaged-acceptance.md) | 02, 03, 08 | ready-for-agent |

08 的实际客户端环境及 09 的 packaged 证据是验收要求，缺失时保持未完成；05 仅覆盖兼容契约和合成 producer，真实日常工作流接入仍为后续范围。发布不启动实现或替换安装。
