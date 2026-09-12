# 02: 固定界面中英切换

**What to build:** 用户通过设置旁的顶部按钮切换固定界面中英，个人记录和编辑状态不变，重启保持选择。

**Blocked by:** None (can start immediately)

**Status:** resolved

Type: task

- [x] 现有导航、日期标签、按钮、状态、设置及固定错误提示有中英对应；入口在右上角设置旁，不移入设置。
- [x] 切换不翻译或改写 Markdown、任务文本、习惯名称、来源内容，不改变 producer 输出语言；日期、阶段、草稿与操作状态保留。
- [x] 语言是独立的 Mac 本地偏好，重启保留，切换 Vault 不变；无效偏好能恢复可用默认，不修改 Vault。
- [x] 提供后续切片可沿用的固定文案入口及约定；若 01 尚未合入，本票覆盖当前界面，后续新增文案随所属功能提供双语，09 统一验收。
- [x] 用既有行为 seam 验证状态保留，并在 packaged Mac 检查两种语言和较长文案，避免文字截断／布局挤压。

## 执行上下文

先读同一 effort 的父规格与 map、项目领域术语和 ADR-0002／0003，核对前置票的完成证据及代码已在当前 checkout；仅有状态文字不够。原型入口及来源由 map 提供。若绝对路径打开的 ticket 来自主 checkout 而代码在 worktree，应将依赖成果带入所工作的 checkout，不能在缺前置的旧代码上继续。

按 implement 使用已约定的应用操作 seam 做行为测试，必要时沿用前端异步测试；各票保留自身可演示结果，不把基础验证推迟到整体验收。完成后按 code-review 审查、提交本票相关改动到当前分支，保留其他工作。认领／完成时更新本票与 map，附测试、提交、限制的 Answer；不关闭或修改父规格。

不新增外部服务／依赖，不复活退役 Exercise/Profile；不修改或运行日常 skill、Dida365、自动化。合成测试与 packaged 验收不得操作真实个人记录。

## Answer

在右上角设置按钮旁新增了独立的“中 / EN”语言入口，并以一个有类型的双语文案目录统一固定界面文案、动态日期、常见应用状态及系统生成的习惯目标／覆盖标签。切换会同步更新可见文案、辅助功能名称和 `html lang`，同时保留当前页面、Today 阶段、Calendar 日期、Habits 展开状态、草稿和操作状态；Markdown、任务／习惯名称、来源标签及 producer 内容始终按原文呈现。

新增本机 `interface-language.json` 偏好边界，默认中文，只接受 `zh`／`en`；选择在应用重启和 Vault 切换后保持，缺失、损坏、未知语言或未知 schema 会回到可用中文默认值。该边界与 Vault 持久化完全分开。后续固定界面文案须通过 `frontend/interface-language.ts` 的共享目录与 `data-i18n`／动态 setter 接入，具体约定记录于 `docs/interface-language.md`。

验证通过：`npm run test:frontend`（34 项）、完整 `cargo test --manifest-path src-tauri/Cargo.toml`（152 项）、`npm run check`、Rust format check、shell／Swift driver syntax check、release `.app` 构建，以及隔离 app data／两份合成 Vault 的 `interface-language` packaged Mac 场景。打包场景在 800×640 下检查中英文导航、Today／Calendar／Habits／Settings、双语原生 Vault 选择器标题、较长 Drive 文案的多行框体与窗口边界、未保存草稿、日期与阶段、Vault 切换、重启持久化及无效偏好恢复，并以 SHA-256 确认语言操作没有改写两份合成 Daily Record。

提交：`feat(dashboard): add bilingual interface preference`。限制：个人内容与 producer 输出按要求不会自动翻译；真实 Drive 客户端兼容和整体验收仍分别属于 08、09 票。
