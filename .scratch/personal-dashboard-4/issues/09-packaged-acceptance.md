# 09: Packaged Mac 整体验收与交付核对

**What to build:** 整合已完成切片，在真实打包 Mac 中证明约定的任务与日常操作，并核对认可原型。

**Blocked by:** 04 今日自动视图与 Today 任务栏, 05 Calendar 任务摘要与右侧操作, 06 Habit 名称中英切换, 08 真实早晚流程接线与权限边界

**Status:** ready-for-human

Type: task

- [x] 核对所有前置实现已进入当前 checkout，记录候选提交／构建身份；运行有针对性的现有及新增行为检查，不把浏览器或 Rust 测试替代 packaged Mac。
- [x] 用隔离合成 Vault 实际验证 Tasks／Today／Calendar 共享身份，今日与 Inbox、新建默认、无日期／未来／晚完成／补记、放弃／删除恢复、清单归档与历史，重启后数据保留。
- [x] 核对实际界面与认可原型：原生产壳层、Today 右栏、紧凑 Habits、月格文字与 +N 右侧展开，窄窗口、键盘、双语长名称、已有颜色／背景组合；不重开全局设计。
- [x] 验证 Habit 名称切换与回退、快照更新不丢配置或完成；覆盖 Vault 切换、晚到响应、外部更改、写入冲突和可恢复失败。
- [x] 关联 08 的真实适配器合成演练，检查 App 与外部入口共享同一数据且没有旧 producer 竞争状态。明确真实 personal daily run 与合成证明的区别。
- [ ] 对改变的任务／配置保存，在隔离实际 Drive 客户端 fixture 中做有边界的读写、重读／重启及外部变更兼容检查；复用 3.0 证据，不泛化为全面云同步调查，本地写入不等于已上传。
- [x] 定位并修复范围内整合缺陷后做必要回归；Drive fixture 缺失保留待验收，不标 resolved。交付报告含行为证据和视觉材料；不替换日常安装，不更改真实 Vault／滴答／自动化。

## 执行上下文

先读本 effort 的父规格、map、原型核对、项目领域词汇及适用 ADR；父规格保持不变。使用已包含全部前置实现的 checkout；仅有 resolved 状态不足以证明代码依赖已集成。认可原型是设计来源，不是可直接提升的生产代码。

沿用用户确认的应用操作测试边界及必要前端异步检查，每票保留自己的可演示结果；新增固定文案同步覆盖中英文。使用合成隔离资料，保留真实个人数据、旧文件及其他未提交工作。不新增依赖／外部服务，不复活 Exercise runtime。

本票已执行。证据与限制记录在下方；不因合成测试通过就声称真实个人流程验收完成。仅 08 的范围允许定点修改实际 daily-loop 指引和接线，所有票均不授权运行真实个人流程、写滴答或改变自动化时间。

## Answer

上一轮 local packaged candidate 已通过，但本票保持 `ready-for-human`：复核后新增的 packaged 断言在重跑时先遇到锁定的 macOS 会话，尚未取得这组 follow-up 的直接 packaged 证据；Drive 方面也仍缺少本票专用的新 fixture，因此 4.0 改动后的任务／Habit 配置写入尚未获得新的实际 Drive 客户端证据。

- 候选 checkout 为 `codex/management-daily-integration`，包含 01–08 的实现，基线提交为 `5341d25`；本票实现 patch fingerprint 为 `a7e8432202a43aa0cdb884f6b67c2328d1f9de4f56c54dc7d54e373bd8fd9b5f`，重建 bundle 内 executable fingerprint 为 `c1684d9299736042fd79a7c914294a5a55ae8715bc8f0018233731800dc9d02f`。通过 `caffeinate -is npm run build:mac` 重建了 `Personal Dashboard.app`。真实 packaged 命令为：
  `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=dashboard-4 PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=420 PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY="$PWD/output/playwright/personal-dashboard-4-candidate-20260917-final" scripts/acceptance/macos-ipc-workflow.sh`。
- 真实 packaged Tauri 窗口使用两个临时 synthetic Vault 通过了 Tasks／Today／Calendar 共享 identity、Inbox 与无日期默认、未来／逾期／晚完成及 `2026-09-07 18:30` 补记、放弃／恢复、删除 tombstone／恢复、清单归档／恢复、两次 relaunch、Calendar `+2`、双语 Habit 名称及 invalid schema fallback、Vault A/B 切换和外部任务文件冲突后的草稿保留与显式重试。
- 视觉矩阵产生 8 张未覆盖的 PNG；中文 wide Tasks／Today／Calendar／Habits 与英文 640×520 Tasks／Calendar／Today／Habits 保留生产壳层、现有颜色／背景、紧凑 Habits、Calendar 文本预览与右侧面板。Calendar `+2` 通过 Accessibility focus + Space 键盘事件打开。
- 08 的 adapter／daily-flow 合成边界沿用已解决票证证据：`src-tauri/tests/daily_flow_integration_workflow.rs` 及 `tests/frontend/daily-flow-integration.test.ts` 使用 synthetic Vault／模拟 Dida365，未运行 personal daily flow、未写滴答或自动化。
- 回归通过：`node --test tests/frontend/packaged-acceptance.test.ts` 7 项，`npm run test:frontend` 94 项，`npm run check`，以及 `cargo test --manifest-path src-tauri/Cargo.toml` 全量 Rust tests。
- 已只读检查 `~/Library/CloudStorage`，发现两个既有 `PD-Acceptance-08-*` marker-owned child；它们属于 3.0 historical fixture，未被本票选择、创建或改写。没有本票专用的新 fixture。已有 `docs/acceptance/personal-dashboard-3-drive-compatibility.md` 只作为 bounded historical evidence，不把 local save 推断为 upload。需要人准备新的专用 fixture、通过 `drive-vault-policy.mjs` 与 File Provider/cloud checks 后，才能把本票改为 `resolved`。
