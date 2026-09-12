# 01: 设置、Vault 入口与预设颜色

**What to build:** 用户在清晰的设置中选择自己的 Vault、了解 Drive 客户端用法，并选择重启后保留的预设颜色。

**Blocked by:** None (can start immediately)

**Status:** resolved

Type: task

- [x] 设置提供外观与数据／Vault 两类；日常更换入口归设置，未配置或不可用时保留直接选择；显示当前本地位置及加载状态，无账号登录。
- [x] 选择兼容本地 Vault 后读取对应真实格式的合成资料；取消选择保持原状态，错误可恢复；切换等待在途写入，失败不丢草稿，缓存与晚到响应不跨 Vault 污染。
- [x] Drive 引导要求桌面客户端先使整个 Vault 本地可用；普通本地 Vault 仍可用，不把任意笔记自动转换，不将本地保存称为云端同步成功。
- [x] 预设颜色即时影响既有三页并作为 Mac 偏好重启保留、跨 Vault 保持；恢复默认不清理个人数据。为后续背景偏好扩展沿用同一应用边界。
- [x] 通过应用操作／既有前端切换测试和打包 Mac 选择器、颜色、重启演示证明行为；不添加依赖或云服务。

## 执行上下文

先读同一 effort 的父规格与 map、项目领域术语和 ADR-0002／0003，核对前置票的完成证据及代码已在当前 checkout；仅有状态文字不够。原型入口及来源由 map 提供。若绝对路径打开的 ticket 来自主 checkout 而代码在 worktree，应将依赖成果带入所工作的 checkout，不能在缺前置的旧代码上继续。

按 implement 使用已约定的应用操作 seam 做行为测试，必要时沿用前端异步测试；各票保留自身可演示结果，不把基础验证推迟到整体验收。完成后按 code-review 审查、提交本票相关改动到当前分支，保留其他工作。认领／完成时更新本票与 map，附测试、提交、限制的 Answer；不关闭或修改父规格。

不新增外部服务／依赖，不复活退役 Exercise/Profile；不修改或运行日常 skill、Dida365、自动化。合成测试与 packaged 验收不得操作真实个人记录。

## Answer

实现了独立的“外观”与“数据与 Vault”设置页。Vault 选择继续使用原生文件夹选择器，并在提交选择前要求 `.obsidian` 与 `life/Journal/Daily` 两个兼容边界；任意文件夹会被拒绝且原选择不变。切换前会等待 Today、Evening 与 Habits 的所有已跟踪写入，失败时保留草稿并停止切换；既有请求世代隔离继续阻止晚到响应污染新 Vault。

新增四个预设主题颜色以及本机 `appearance.json` 应用偏好边界。颜色即时写入共享 CSS tokens，在 Today、Calendar、Habits 和设置中共用，重启与 Vault 切换后保留；恢复默认只改本机偏好。设置页说明了 Drive 桌面客户端先使整个 Vault 本地可用的步骤，并明确普通本地 Vault 可用、本地保存不等于云端同步、Dashboard 不管理账号或转换任意笔记。

验证通过：`npm run test:frontend`（27 项）、完整 `cargo test --manifest-path src-tauri/Cargo.toml`（158 项）、`npm run check`、Rust format check、shell syntax check、release `.app` 构建，以及隔离 app data／两份合成 Vault 的 `settings-vault-colors` packaged Mac 场景。该场景通过三次原生选择、跨 Vault 读取、不可用位置恢复、Today／Calendar／Habits 的直接主题像素对照、重启持久化与恢复默认，并确认两份合成 Daily Record 的 SHA-256 均未改变。

提交：`feat(dashboard): add Settings Vault and accent colors`。限制：这里证明的是本地文件与 packaged 应用行为，不代表真实 Google Drive 云端同步；真实 Drive 客户端兼容验收仍由 08 票负责，最终逐像素原型对照仍由 09 票负责。
