# 01: 历史习惯补记与跨午夜更正

**What to build:** 用户在午夜后仍能从可发现的习惯入口选择昨天或更早日期，补记或撤回该日的本地习惯完成；日期明确、保存可靠，日与周视图一致，不误改今天。

**Blocked by:** None (can start immediately).

**Status:** resolved

Type: task

## 上下文与范围

依据本 effort 的父规格及原始反馈 01。既有 Calendar 历史本地习惯更正已记录为实现过；先核对当前安装构建与代码，再重现用户路径，确定是入口、限制还是回归。不能凭旧票 resolved 判断本次反馈已解决，也不能直接重建已有存储机制。

本票改进完整使用路径，包括可达的过去日期选择入口；优先复用现有历史更正界面与本地完成操作。仅限现有可补记的习惯类型，不新增目标编辑、实际起床时刻记录或外部写回。

## Acceptance criteria

- [x] 在隔离合成 Vault 中，以“周二凌晨补记周一”为回归场景，先形成能揭示当前缺口的行为证据，再修复；记录核对的构建身份、入口和实际原因。
- [x] 从 Habits 可清楚发现并进入过去日期补记，可复用 Calendar 导航；目标日期始终可见。昨天、同周更早日期及上周日期可选择；未来日期不得写入已发生完成。
- [x] 可补记、撤回并再次补记所选日期的本地完成。提交绑定显式 lived date；跨午夜、快速切日或切换 Vault、晚到响应不能把结果应用到另一日期或 Vault。
- [x] 日与周展示采用同一合并结果，每个 habit/date 至多计一次；重启和快照刷新不丢本地记录。过去周目标未知、覆盖范围外外部状态未知时如实显示，不回填或臆造。
- [x] 撤回仅改变 Dashboard 本地完成。外部证据仍完成时保留合并结果，并解释来源；保留现有稳定身份、catalog 校验、修改痕迹、幂等和并发保护，不把 Short record 当作完成证据。
- [x] 只浏览空日期不创建记录；显式操作只写既有本地完成正本，保留 Daily Record 正文、复盘、外部快照及今天其他记录。写入失败或冲突时显示可理解的恢复路径，不显示虚假保存成功。
- [x] 新入口、日期提示、来源解释和错误状态覆盖中英文及宽／窄窗口。
- [x] 完成针对日期绑定、合并、持久化和失败路径的必要回归验证及相关项目检查；在隔离合成 Vault 的 packaged Mac App 中演示午夜后补记昨天、撤回、跨周、重启和 Today 不受污染。
- [x] 在本票与 map 记录改动、验证证据、候选构建身份及限制。只有真实完成的项才勾选；自动化、packaged 证据与用户日常安装接受度分别报告。

## Answer

Habits 的过去日期详情现在提供双语“查看并补记”入口。它只对可记录完成的习惯及严格合法、早于今天的日期出现；操作进入既有历史 Today 更正界面，继续使用原有本地完成正本、目标绑定、撤回和冲突处理。

基线复现确认缺口是 Habits 历史详情没有通往所选日期 Today 的更正入口；安装构建为 Personal Dashboard `3.0.1`（bundle id `com.tortillaflat.personal-dashboard`，arm64，SHA-256 `1c3ddac60d177f3d42bfe9a8ded71bf573df36458b07bef5feaf10f208d66027`）。修复后的 packaged 候选为 `3.0.1`，SHA-256 `067e4f2a66589e6765417e6ba2ea2a2d15c8fa23e886bc1424b11cec4b880e7a`，ad-hoc 签名；此候选未替换日常安装。

**验证：** `npm run check`、`cargo test --manifest-path src-tauri/Cargo.toml`、历史更正 packaged IPC 场景与本地／外部完成合并 packaged 场景通过。隔离周二 `2026-09-08 00:30 -04:00` 场景验证昨日与上周入口、今天入口缺席、680px 窄窗口、补记／撤回／再次补记均绑定 `2026-09-07`、周计数、Daily Record 与外部快照字节不变、空日期不建记录、重启及中英文。Rust 历史更正工作流 8 项及习惯完成工作流 10 项均通过。

`npm run test:frontend` 有 1 项仓库外部契约失败：`tests/frontend/daily-flow-integration.test.ts` 期望工作区 `.agents/skills/life-daily-loop/SKILL.md` 含 `## Personal Dashboard Tasks`；该外部技能当前不含该标题。新增日期与双语用例均通过。未更改该工作区技能或无关 Daily Flow 契约。

## 执行边界

遵守父规格共同约束，保留无关工作；不改外部源、真实个人数据、目标、producer 或自动化，不新增依赖。不把安装／替换日常 App 或推送当作本票隐含步骤。不得关闭或修改源反馈票及其他父级问题。

## Comments

2026-09-23：按用户指示开始执行第一个 ticket。已将 `main` 快进到最新 `origin/main` 的 `e654461`，并在其上创建 `codex/historical-habit-corrections`。初步代码核对发现 Habits 的历史日期格只展开状态详情；本地完成更正入口仅在通过 Calendar 打开的历史 Today 中显示。尚未改动产品代码；隔离合成 Vault 的 packaged 复现和实现计划审阅仍待完成。

安装构建核对：`/Applications/Personal Dashboard.app`，bundle id `com.tortillaflat.personal-dashboard`，`CFBundleShortVersionString`／`CFBundleVersion` 均为 `3.0.1`，arm64 executable SHA-256 `1c3ddac60d177f3d42bfe9a8ded71bf573df36458b07bef5feaf10f208d66027`（ad-hoc signature）；当前安装二进制没有可验证的 Git commit 标记。当前源码路径证据：`habitCellButton` 使历史日期格可选，`renderSelectedHabitCell` 展示状态详情并只为 Exercise 提供短记录编辑；它没有前往本地完成更正的动作。已有 `renderHistoricalHabitCorrections` 和 `setHistoricalHabitCompletion` 可复用，需从过去日期的 Habits 详情进入所选日期 Today。这个根因仍待隔离合成 Vault 的 packaged 复现确认。

2026-09-23：基线 packaged 复现已完成。`PERSONAL_DASHBOARD_APP_BUNDLE="/Applications/Personal Dashboard.app" PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=historical-corrections scripts/acceptance/macos-ipc-workflow.sh` 使用监管副本、临时 profile 和合成 Vault；固定时间为周二 2026-09-08 00:30（UTC-04:00）。UI 成功进入 Habits、展开 Exercise 历史并选中 2026-09-07，随后在等待“查看并补记 2026-09-07 的本地习惯完成”时超时；App 未写入本地完成正本。此结果确认缺口是 Habits→所选历史 Today 的可达入口，非既有 Calendar 历史写入路径。本机安装 App 和真实数据未更改。

2026-09-23：在 `origin/main` 最新基线 `e654461` 上完成实现。Candidate `3.0.1` packaged IPC 历史更正场景通过，并以 `local-habit-completion` packaged 场景确认撤回本地状态后外部 Dida365 完成仍合并为已完成；隔离 Vault、profile 与真实 Daily Record 均未被改写。`npm run check` 与 Cargo 全套测试通过；全量前端测试仅有 Answer 所述外部 Life Companion 标题契约失败。完整证据和构建身份见 Answer。

Tortilla Flat Management helper `1.0.0` 的 `connect` 与 Project `discover` 已确认；当前 Personal Dashboard 注册源仍是 `.scratch/personal-dashboard-3/issues`（source revision `73f67af62ff88683`），不包含本 effort 的新本地票据。只读 `reconcile` 显示现有 Project 缺少 summary。未将本 effort 发布／注册到另一个 source，也未提交无有效源 revision 支撑的 Project summary；保留在本地 `.scratch` issue workflow。
