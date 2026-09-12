# 04: Today 右侧当天任务

**What to build:** 用户在 Today 右侧常驻任务区手动增删改、打勾或取消，操作保存到对应 Vault 和日期并可重读。

**Blocked by:** None (can start immediately)

**Status:** resolved

Type: task

- [x] 采用 B 布局，左侧保留完整阅读空间；任务区不默认折叠，适配 Today 三阶段。支持新增、改名、删除、完成与取消。
- [x] 版本化正本保存到 Selected vault，身份不由文本决定；归属 lived date、来源、完成与修改信息明确。删除标记足以支持后续 producer 幂等合并，记录接口说明。
- [x] 旧 Vault 无任务显示空态，读取不制造空日记；损坏／不支持版本明确错误，不能按空数据覆盖；不自动顺延，未勾选为未确认。
- [x] 写入绑定 Vault、日期、对象与版本；并发冲突不静默覆盖、失败保留可恢复操作。跨日／换页／切换 Vault 的旧响应不写错或展示错日期。
- [x] 通过应用操作测试临时双 Vault 的增删改→重读→重启及失败／冲突，验证无关 Markdown 保留；提供真实 UI 演示并为新增固定文案提供双语。

## 执行上下文

先读同一 effort 的父规格与 map、项目领域术语和 ADR-0002／0003，核对前置票的完成证据及代码已在当前 checkout；仅有状态文字不够。原型入口及来源由 map 提供。若绝对路径打开的 ticket 来自主 checkout 而代码在 worktree，应将依赖成果带入所工作的 checkout，不能在缺前置的旧代码上继续。

按 implement 使用已约定的应用操作 seam 做行为测试，必要时沿用前端异步测试；各票保留自身可演示结果，不把基础验证推迟到整体验收。完成后按 code-review 审查、提交本票相关改动到当前分支，保留其他工作。认领／完成时更新本票与 map，附测试、提交、限制的 Answer；不关闭或修改父规格。

不新增外部服务／依赖，不复活退役 Exercise/Profile；不修改或运行日常 skill、Dida365、自动化。合成测试与 packaged 验收不得操作真实个人记录。

## Answer

Today 已采用认可的 B 布局：右侧“当天任务”在早间基准、当日进展和晚间复盘三阶段始终可见，并支持新增、改名、删除、完成和取消完成。个人任务文字保持原文；空态、边界、操作状态及存储诊断均有中英文固定文案。未保存新增草稿按 Vault binding 与 lived date 隔离；换日不会带入任务或草稿，切换 Vault 会清除旧 Vault 草稿，异步旧响应也不能覆盖当前页面。

正本使用 schema v1，保存于 Selected Vault 的 `life/.personal-dashboard/day-tasks/v1/YYYY/YYYY-MM-DD.json`。任务和修改记录使用稳定标识，明确记录 lived date、manual／daily-flow 来源、时间戳、完成状态和删除 tombstone；producer reference 的唯一性与幂等契约记录在 `docs/day-tasks-v1.md`，为 05 票的规划任务合并保留边界。读取旧 Vault 不创建文件或 Daily Record；损坏 JSON、不支持 schema、错误日期、重复身份、无效时间戳或不一致历史均 fail closed，不能被当作空数据覆盖。写入绑定 canonical Vault、日期、对象、operation ID 与 revision，重复请求幂等；外部版本冲突不覆盖，失败保留可重试操作，并沿用共享原子替换与恢复副本边界。

验证通过：`npm run test:frontend`（37 项）、完整 `cargo test --manifest-path src-tauri/Cargo.toml`（181 项）、`npm run check`、Rust format、shell 语法及 diff whitespace 检查、release `.app` 构建，以及隔离 app data／合成双 Vault 的 `day-tasks` packaged Mac 场景。真实 UI 场景覆盖增删改、完成／取消、刷新、外部冲突后重试、日期草稿隔离、Vault 草稿隔离、重启恢复、1120×760 与 800×640、三阶段常驻和中英切换；任务正本彼此隔离，错误日期不生成文件，无关 Markdown 保持逐字节不变。一次原生文件夹选择器的辅助功能路径框未及时出现，隔离重跑完整通过，未发现产品断言失败。

提交：`feat(dashboard): add Vault-backed day tasks`。限制：本票仅交付 manual 任务与 daily-flow producer 契约，真实规划 producer 接入属于 05；跨设备客户端兼容和完整原型对照仍分别属于 08／09。共享写入恢复机制可保留交错内容和 recovery snapshot，但不能宣称消除所有外部文件系统参与者的竞态。
