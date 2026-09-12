# 09: Packaged Mac 整体验收与原型对照

**What to build:** 整合已完成切片，在真实 Mac 包验证日常全流程及原型一致性，交付可复核的 3.0 候选验收结果。

**Blocked by:** 02 固定界面中英切换, 03 本地背景图片与页面分层, 08 Google Drive 同步目录兼容验收

**Status:** claimed

Type: task

- [x] 确认所有传递依赖成果在当前 checkout，记录候选提交与构建身份；运行约定行为测试及 packaged Mac 验收，区分浏览器／Rust／真实应用证据。
- [ ] 完整覆盖语言／颜色／背景重启、图片原图移动、Vault 选择及隔离、任务重排、习惯 OR 与历史更正、错误及晚到响应；与 08 同步证据关联。除 08 的真实 Drive 云端／版本／废纸篓阶段外，本地覆盖已完成。
- [x] 对照认可 B 原型检查 Today 三阶段、Calendar、Habits 展开历史、设置、双语长文案、不同颜色／图片与窗口宽度；新增界面固定文案双语覆盖。
- [x] 保留紧凑 Habits，不强行统一容器；三页背景底色一致，Today／Calendar 轻分层。记录实际截图及用户仍需查看的事项，不能把自动检查说成用户批准。
- [x] 定位并定点修复范围内整合缺陷后回归；未通过的 packaged 或同步验收明确保留，不假 resolved。交付候选不自动替换用户正在使用的安装、不运行真实每日流程。

## 执行上下文

先读同一 effort 的父规格与 map、项目领域术语和 ADR-0002／0003，核对前置票的完成证据及代码已在当前 checkout；仅有状态文字不够。原型入口及来源由 map 提供。若绝对路径打开的 ticket 来自主 checkout 而代码在 worktree，应将依赖成果带入所工作的 checkout，不能在缺前置的旧代码上继续。

按 implement 使用已约定的应用操作 seam 做行为测试，必要时沿用前端异步测试；各票保留自身可演示结果，不把基础验证推迟到整体验收。完成后按 code-review 审查、提交本票相关改动到当前分支，保留其他工作。认领／完成时更新本票与 map，附测试、提交、限制的 Answer；不关闭或修改父规格。

不新增外部服务／依赖，不复活退役 Exercise/Profile；不修改或运行日常 skill、Dida365、自动化。合成测试与 packaged 验收不得操作真实个人记录。

## Answer

本地 3.0 候选验收已经完成，但本票保持 `claimed`：08 的真实 Google
Drive 云端更新、冲突副本、版本恢复和废纸篓恢复仍受客户端
account-loading／File Provider 未完成上传状态阻塞，不能由普通本地 Vault
或合成测试代替。详细证据见
[`docs/acceptance/personal-dashboard-3-packaged-candidate.md`](../../../docs/acceptance/personal-dashboard-3-packaged-candidate.md)。

- Candidate：产品代码基点 `135e660e03ed744f38e4f7ee7505bb1097956da6`；
  本票验收实现提交 `f72001b0ad71e8bd9dd65953364f13f98f7be267`。本地构建仍明确为 bundle
  `2.0.0`，没有静默改版本或替换用户安装。
- Packaged：当前八场景 3.0 gate 全绿；独立 `dashboard-3` 真实应用矩阵
  14 张截图，目录为
  `output/playwright/personal-dashboard-3-candidate-20260912-r4/`。
- Prototype：认可 B 原型的 16 张浏览器参考图位于
  `output/playwright/personal-dashboard-3-prototype-reference-20260912/`；结构与
  响应式对照通过，但这不是用户批准。用户仍需查看 Retina 背景舒适度、
  较强／较大字号，以及窄窗阅读顺序与滚动位置。
- Tests：`npm run test:frontend` 60/60；`cargo test --manifest-path
  src-tauri/Cargo.toml` 207/207；`npm run check`、shell 语法、Swift type-check
  通过。
- Scope：只操作隔离 profile、合成 Vault 与合成图片；未运行真实每日流程、
  skill、Dida365、MCP 或自动化，未改个人记录，未新增依赖或外部服务。
