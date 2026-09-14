# Personal Dashboard 3.0 — ticket map

用户已批准九票拆分及依赖；所有票已发布并完成。08 已在隔离的真实 Google Drive fixture 上补齐云端更新、packaged app 对 canonical 文件的重读、冲突后的版本保留、版本恢复与网页回收站恢复；09 的 packaged、原型对照及 Drive 前置均已完成。

父规格：[spec](spec.md)。设计／认可原型：[原型说明](../../../.scratch/personal-dashboard-3/prototype/README.md)、[设计收敛稿](../../../.scratch/personal-dashboard-3/design-summary.md)。

按 01–09 顺序逐票执行可满足所有依赖；01／02／04／06 无前置，但共享文件仍须协调。每次新任务都应使用包含前置成果的 checkout。若单独 worktree，先集成前置提交；不要让下一票从未包含前置的默认分支开始。

| Ticket | Blocked by | Status |
| --- | --- | --- |
| [01 设置、Vault 入口与预设颜色](issues/01-settings-vault-colors.md) | None | resolved |
| [02 固定界面中英切换](issues/02-interface-language.md) | None | resolved |
| [03 本地背景图片与页面分层](issues/03-background-image.md) | 01 | resolved |
| [04 Today 右侧当天任务](issues/04-day-tasks.md) | None | resolved |
| [05 规划任务增量接收与重排保留](issues/05-planning-task-merge.md) | 04 | resolved |
| [06 Habits 本地打勾与来源合并](issues/06-local-habit-completion.md) | None | resolved |
| [07 Calendar 历史任务与习惯更正](issues/07-historical-corrections.md) | 04, 06 | resolved |
| [08 Google Drive 同步目录兼容验收](issues/08-drive-compatibility.md) | 01, 05, 07 | resolved |
| [09 Packaged Mac 整体验收与原型对照](issues/09-packaged-acceptance.md) | 02, 03, 08 | resolved |

08 的实际客户端环境及 09 的 packaged 证据均已记录；05 仅覆盖兼容契约和合成 producer，真实日常工作流接入仍为后续范围。发布不启动实现或替换安装。Drive 的实际限制包括不生成 conflict copy、File Provider 不支持 upload fail-on-conflict，以及网页 Trash 期间本地路径可能不会立即消失；不承诺整 Vault 时间点恢复。

## 3.0.0 release

用户选择轻量收尾检查；最终 JPG／Daytime 反馈修复和版本更新见 [release record](../../docs/acceptance/personal-dashboard-3-release.md)。九票 resolved 状态保持，真实 producer skill 接线继续留后。
