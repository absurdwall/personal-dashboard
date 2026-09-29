# Personal Dashboard 3.0.2 — 任务地图

阶段：Ticket 01–06 均 resolved。Ticket 06 已由 PR #10 修正为背景图 ready 时覆盖 Habits 整个目的页的单个面板；PR #9 的 header-only 交付保留为 superseded 历史记录。四页最终组合路径与三尺寸截图矩阵已在最终候选上验收。Finder 搜索入口仍有原生 Finder 搜索证据；全局 Spotlight 弹窗仍待用户手动确认。票 01 的原始刷新报告仍未复现。

[规格](spec.md) · [拆分确认记录](ticket-breakdown.draft.md)

## 票据

| 编号 | 标题 | Status | Blocked by |
| --- | --- | --- | --- |
| [01](issues/01-refresh-consistency.md) | 修复 Today 手动刷新的一致性 | resolved | None |
| [02](issues/02-shared-task-time-axis.md) | 在 Today 时间轴显示共享 Task 及其状态 | resolved | None |
| [03](issues/03-readable-task-cards.md) | 让任务卡片在窄区域可读可操作 | resolved | None |
| [04](issues/04-consistent-page-frame.md) | 统一四页框架、标题与留白 | resolved | None |
| [05](issues/05-calendar-habits-header-detail.md) | 精简 Calendar 页头并统一 Habits 分隔线 | resolved | None |
| [06](issues/06-habits-weekly-header-panel.md) | 统一 Habits 整页的背景图面板 | resolved | None |

## 执行顺序与 frontier

票 01–06 均已 resolved；Ticket 06 的 PR #10 整页修正已合并，PR #9 header-only 结论已取代。当前没有本 effort 的下一张 ready 票。原推荐顺序 01 → 02 → 03 → 04 是降低共享呈现代码冲突的建议，不构成依赖。票 01 关闭的是约定验证工作，原始故障仍未证实；若之后获得精确复现资料，可重新打开调查。

02 不以尚未定位的刷新故障已解决为前提；接入后必须遵守整页刷新契约。03 卡片内部排列与 04 页面框架可独立交付。若实施发现真实前置阻碍，记录证据后修订阻塞关系，不将建议顺序冒充硬依赖。

## 验收与关闭

各票自行完成行为和正式 Mac App 验收，不把所有验证推迟到末尾。全部集成后，最后执行的票在最终代码上复核规格组合路径以及 960×720、800×640、640×520 的四页截图矩阵，并在本地图记录结果。未通过项返回所属票处理；不得以早期分支证据宣称最终通过。

01 的最终候选包 `com.tortillaflat.personal-dashboard` 3.0.1 SHA-256 `b2f5f31cbfb563ba62c455a04a7d927244dddce11b6ce15f8716b2eb67218486` 通过 `today-refresh`、`vault-selection`、`today-time-axis` 与 `today-shared-task-axis` 打包场景；异步旧响应、Task 写入后返回、日期/Vault 与午夜重启路径均有隔离验证。聚焦前端用例 38/38 通过；完整前端套件 124/125，唯一失败是仓库外 `life-daily-loop` skill 缺少 `## Personal Dashboard Tasks` 契约。用户原始刷新故障没有复现；状态以“原报告未复现；约定验证通过”关闭，不宣称已证明修复。详细证据与审查边界见票 01 Answer / Comments。02 的代码审查与正式打包验收已通过：同一 Task 在创建、刷新、完成/重开、改期、跨午夜重启后保留身份；无 Daily Record 写入；中英文共享轴点来源/状态在 960×720、800×640、640×520 验证通过。候选包 SHA-256 `6f064a8e70a6141dd3f03841dc3be6c51964b2e4a6c1218e651ebfac64c6298d`，截图在 `/tmp/personal-dashboard-ipc.ticket02final4/today-shared-task-axis-captures/`。03 的改前/改后正式 Mac App 验收和双轴代码审查已通过：改前 960×720、800×640 中短标题与元信息被挤成窄列；改后 Today 卡片正文完整占宽、操作在下方，640×520 保持响应式堆叠。三尺寸改后截图及完整动作/共享页结果见 03 Answer。完整前端与 Cargo 套件各有一项外部契约/fixture 失败，边界见 03 Answer。

历史记录：下一段描述的是早期 3.0.1 最终集成候选。其截图仅作为历史证据；本次 installed 3.0.2 改前基线与 3.0.3 最终候选矩阵见本文末尾，不能由早期截图替代。

04 最终候选打包应用在最终集成代码上通过组合路径：Today refresh、共享 Task 时间轴、可读卡片与其完成/恢复/删除操作、Tasks/Calendar 可见性，以及 Calendar 月份/日期与 Habits 刷新入口。四页矩阵在同一合成 Vault 和同一包上覆盖 960×720、800×640、640×520，每个尺寸各截 Today、Tasks、Calendar、Habits；正式窗口与可访问滚动断言通过，12 张截图逐张目视检查。候选包身份为 `com.tortillaflat.personal-dashboard` 3.0.1，二进制 SHA-256 `5e3555ffb48f802f0e6b172eb9f38221ffbcc96e6613d72b0946ee4dcbf88c98`；矩阵与卡片动作截图均保留在本机，未加入 PR。一张前台窗口误捕获已隔离并重拍，未纳入通过证据。800×640 Habits 摘要中的 Exercise/2/3 仍显拥挤，与基线相同且非本票引入。完整前端与 Cargo 套件各有一项已知外部契约/fixture 失败，见票 04 Answer。（04 票关闭时尚未安装或发布 App，父规格当时保持 ready-for-agent；后续明确授权的 3.0.2 发布与安装见下节。）

票 01 完成后的最新组合复核使用候选包 `com.tortillaflat.personal-dashboard` 3.0.1，主程序 SHA-256 `b2f5f31cbfb563ba62c455a04a7d927244dddce11b6ce15f8716b2eb67218486`。`readable-task-cards` 的四页操作、滚动断言、Task 详情与生命周期路径通过；当前包的 12 张矩阵截图和三张 Today 卡片图均已逐张目视检查，保留在本机且未加入 PR。窗口截图驱动按 Personal Dashboard 窗口 ID 捕获，排除了先前覆盖截图的其他应用窗口；隔离 Daily Record SHA-256 `d37fbaf33f1d1669655bc64e2fdf00df57b69547c3017858973ebe3a3033de27` 未变。刷新原始报告仍未复现，不作为已证明修复记录。聚焦前端用例 38/38；完整前端套件 124/125，唯一失败仍为仓库外 `life-daily-loop` skill 契约缺失。Ticket 01 与本轮组合证据见其 Answer / Comments。

## 3.0.2 发布与安装交付

- 后续用户授权只执行 release version、正式 macOS 安装、启动入口去重及交付同步。PR #6（`https://github.com/absurdwall/personal-dashboard/pull/6`）已合并：版本提交 `a66235fa056995f094721cdfb37c6e1f5ff03166`，merge commit `efa5847ac81e463ba499f2a01ba81a5a6a979940`。版本声明、锁文件和版本断言改为 3.0.2；bundle id 保持 `com.tortillaflat.personal-dashboard`。
- 3.0.2 release bundle 在隔离测试资料上通过 packaged `interface-language` acceptance，签名有效；主程序 SHA-256 `d55bdadc2778566e019282295a61c85fe64a1cbb4cb97973d55b025102a8aa99`。Cargo 完整套件在本轮一次运行通过，`npm run check` 和版本断言测试通过；完整前端套件 125/126，唯一失败为仓库外 `life-daily-loop` skill 契约，未修改外部 skill。没有为获取重复计数而重跑完整套件。
- 四票最终组合路径与四页 12 图矩阵已按上节在最终集成 3.0.1 包上完成。本次 3.0.2 代码差异仅为版本元数据，因此不把 3.0.1 矩阵改称 3.0.2 矩阵。
- `/Applications/Personal Dashboard.app` 当前为 3.0.2，bundle id `com.tortillaflat.personal-dashboard`，主程序 SHA-256 与候选一致：`d55bdadc2778566e019282295a61c85fe64a1cbb4cb97973d55b025102a8aa99`；签名验证通过，按正式路径启动成功。旧 3.0.1 包保存在 `.scratch/personal-dashboard-3.0.2/recovery/`，两个副本主程序哈希均为 `31a4b1f9c8578ff7bda0603af433b900e8414c2e58056a264638ab1b422e8781` 且签名有效。
- 应用支持目录安装前后均为 5 个配置文件、0 个哈希变化。只做正常启动读取，未编辑真实 Vault 内容。启动后 Dashboard 进程来自 `/Applications/Personal Dashboard.app`。
- 重复入口收尾：原先 64 个仍存在的本机测试包与构建副本均保留文件/截图，测试包注册被定点注销；原先不存在的 16 条旧注册记录未尝试清除。最终现存 LaunchServices 路径仅 `/Applications/Personal Dashboard.app`；索引切换稳定后，Spotlight 的 bundle id 与 `Personal Dashboard.app` 名称查询各只返回该路径。只排除了生成 build 输出目录，不全局重置索引，也没有把 `/Applications` 加入排除。
- Spotlight 会自动把重复候选重新发现，因此签名有效的可再生成候选包保存在 `src-tauri/target/release/bundle/macos.noindex/Personal Dashboard 3.0.2 build candidate.stashed`（目录名不再以 `.app` 结尾）；包内容未改，签名仍有效，二进制哈希仍为 `d55bdadc2778566e019282295a61c85fe64a1cbb4cb97973d55b025102a8aa99`。原始 `macos` 输出目录及 `macos.noindex` 均有可逆 Spotlight 排除/标记，Tauri 将来重建到原输出目录时也继续受排除规则保护。
- 本地详细记录与 Management 回执见 [`delivery-recovery.md`](delivery-recovery.md)。本地工作结束后未自动启动下一票。

## 2026-09-26 搜索入口复验

用户报告 Spotlight 搜索找不到已安装应用后，使用 Finder 原生搜索界面在 `/Applications` 范围复现：`Personal Dashboard` 返回 0，完整文件名 `Personal Dashboard.app` 返回 1。只读核对发现 Spotlight 已启用、结果类别 Apps 已启用、`/Applications` 不在隐私排除中、正式 bundle 的显示名与 Bundle ID 正确；但 LaunchServices 仍保存 16 条 3.0.1 的同 Bundle ID 记录，全部指向已不存在的临时测试包路径。

按精确旧路径定点注销这 16 条失效登记，未删除文件或改动正式安装。清理后 LaunchServices 对 `com.tortillaflat.personal-dashboard` 仅剩 `/Applications/Personal Dashboard.app`；Finder 原生搜索 `Personal Dashboard` 现在返回这一个应用条目，并从该结果成功打开。进程路径为 `/Applications/Personal Dashboard.app/Contents/MacOS/personal-dashboard`；安装版本 3.0.2、可执行文件 SHA-256 `d55bdadc2778566e019282295a61c85fe64a1cbb4cb97973d55b025102a8aa99`，签名有效。Spotlight 隐私设置与全盘索引未改动；五个 Application Support 文件相对既有 post-startup 快照的 SHA-256 均未变化。Finder 搜索入口验收完成；全局 Spotlight 弹窗尚未验证，详见下方补充。

Management 搜索入口修复摘要 `dashboard-302-summary-search-entry-20260926T232747Z` confirmed。本次因全局 Spotlight 弹窗验收待用户手动确认，更新摘要 `dashboard-302-summary-spotlight-manual-20260926T233711Z` 也已 confirmed：Registry revision `720ceee668aa6907`、summary revision `898c66d6d6a765d0`、source coverage complete、`needsReconciliation=false`；summary 明确保留一个 blocker 与一项用户手动确认 next work。01–04 仍全部 resolved。先前使用非规范 blocker reference 的提交被 helper 拒绝、未写入；它与两条历史 conflict/partial recovery 一并保存在 pendingRecovery，没有重试。

### 全局 Spotlight 弹窗验收补充 — 2026-09-26

更正验收边界：已证明的是 Finder 原生搜索（`/Applications` 范围）能按 `Personal Dashboard` 找到并打开唯一正式应用；没有证明全局 Spotlight 弹窗能搜索或启动。按 CUA 文档通过 Finder app binding 发送 `super+space` 后，最新 UI 树仍显示 Finder 的 `Searching “Applications”` 窗口，没有全局弹窗。绑定 `com.apple.systemuiserver` 及 `/System/Library/CoreServices/Spotlight.app` 的可访问 UI 均以 `-10005: timeoutReached` 失败；此 macOS CUA runtime 没有 `computer.launch_app`（调用返回 `is not a function`），且其键盘入口绑定到单个 app，没有可用的系统级全局按键目标。因此本次无法读取全局 Spotlight 结果或选择其中条目。Finder 结果通过不外推为全局 Spotlight 验收通过；正式安装与定点 LaunchServices 修复保持不变。

## Management 发布记录

票 01 本地 Markdown 已于 `2026-09-26T08:51:21Z` 关闭为 resolved；最新 canonical inspect 确认 01–04 全部 resolved（票 01 revision `991f6fc2cffb30b8`，02 `97a00e28fdbe1602`，03 `4c448d262746e9aa`，04 `eb5eccfaac31092c`）。票 01 的冗余 helper close 请求返回 unavailable，因为当前 canonical Work Item 不支持 helper `Close`；当时已是原生 resolved，后续 inspect 再次确认，没有待恢复的关闭操作。最终摘要 `dashboard-302-summary-ticket01-final-20260926T091101Z` confirmed；Management Registry revision `b9477e3514e019ce`，summary revision `0bcc9f40be8c7069`，覆盖四个来源的 current revision（3.0 `73f67af62ff88683`、时间轴修复 `6f66259df3b780a1`、3.0.2 `a7ec3dd2ebd538f0`、Codex 协作 `16f6bcfe7538bf9c`），`needsReconciliation` 为 false、无 uncovered source。原有 summary conflict 与 Ticket 02 partial recovery 记录继续保留且未重试；不启动其他票。

[登记回执](management/register-reconcile.json) · [票 01 关闭请求](management/close-request-ticket01-20260926T085121Z.json) · [票 01 关闭回执](management/close-reconcile-ticket01.json) · [票 01 最终摘要请求](management/summary-request-ticket01-final-20260926T091101Z.json) · [票 01 最终摘要回执](management/summary-reconcile-ticket01-final.json) · [票 01 摘要后核对](management/inspect-ticket01-final-postsummary.json) · [票 03 关闭请求](management/close-request-ticket03-20260926T0700Z.json) · [票 03 关闭回执](management/close-reconcile-ticket03.json) · [票 04 关闭请求](management/close-request-ticket04-20260926.json) · [票 04 关闭回执](management/close-reconcile-ticket04.json) · [票 04 旧摘要请求](management/summary-request-ticket04-final.json) · [票 04 旧摘要回执](management/summary-reconcile-ticket04-final.json)。回执仅保留本项目记录，省略其他项目及历史视图。

Pending recovery 中保留两条历史/失败操作：既有 summary conflict `management-summary-e0091de-e6155d2f-cc6d-44ad-bf14-b1ec7e4c2e9a`，以及首次提交时漏列协作来源的 partial `dashboard-302-summary-ticket02-20260926T0624Z`。两者均未重试；补齐四个来源证据的更新摘要请求 `dashboard-302-summary-ticket02-final-20260926T062602Z` confirmed，规范摘要现为 complete。

2026-09-26 后续 release/install handoff 已按 `tortilla-flat-management` 连接流程同步。`connect` confirmed；`discover` 确认 canonical project 为 `product-personal-dashboard`。摘要请求 `dashboard-302-release-handoff-20260926T184737Z`（digest `e78718866310f801`）confirmed；post-summary inspect confirmed Registry revision `380d8748c018bb45`、summary revision `c1e9c5edd2e48164`，`needsReconciliation=false`、coverage complete、无 uncovered source。最新来源 revision：Personal Dashboard 3.0 `73f67af62ff88683`；时间轴修复 `6f66259df3b780a1`；3.0.2 `a7ec3dd2ebd538f0`；Codex 协作 `16f6bcfe7538bf9c`。Canonical inspect 仍确认票 01–04 全部 resolved（revision 分别 `991f6fc2cffb30b8`、`97a00e28fdbe1602`、`4c448d262746e9aa`、`eb5eccfaac31092c`）。两条既有 conflict/partial pending recovery 仍保留且未重试；本次无 blocker、无 next-work，不启动下一票。请求、回执和摘要后 inspect 见 `management/summary-request-release-handoff-20260926T184737Z.json`、`management/summary-reconcile-release-handoff.json`、`management/inspect-release-handoff-postsummary.json`。


## 3.0.3 Ticket 04 最终复验与安装

- 改前基线使用正式安装的 `/Applications/Personal Dashboard.app`，版本 3.0.2、Bundle ID `com.tortillaflat.personal-dashboard`、主程序 SHA-256 `d55bdadc2778566e019282295a61c85fe64a1cbb4cb97973d55b025102a8aa99`；`codesign --verify --deep --strict` 通过。用该安装 bundle 的隔离副本和合成 Vault 运行入口、页面刷新/导航、卡片操作并生成 960×720、800×640、640×520 各四页的 12 张基线截图；三尺寸任务卡片截图也保留在本机，均未加入 PR。
- 最终打包候选身份为 `com.tortillaflat.personal-dashboard` 3.0.3，主程序 SHA-256 `91f53ba8e7a2e918622f5c9e00c981abdf51f5d854a2275be8f73e27d3b81471`；签名验证通过。`today-refresh`、`today-shared-task-axis`、`readable-task-cards`、`today-unlocated-panel-layout` 在同一候选包上通过；合成记录与任务操作边界见票 04 Final Answer。共享时间轴回归在窄窗口以实际“重开”操作作为滚动锚点，完整复验通过。
- 最终四页矩阵为本机保留的 12 张截图；使用同一 3.0.3 包、同一合成 Vault，三个窗口尺寸均含 Today/Tasks/Calendar/Habits，共 12 张。每个尺寸的页面入口与刷新/导航动作和文档横纵滚动断言均通过，12 张截图逐张由 Agent 目视检查。未定位内容几何与更新区在 960×720、800×640、640×520 均断言不相交，截图位于相邻 `unlocated-panel/`。这不是用户逐张视觉批准。
- Spec 轴无剩余产品或验收发现。Standards 轴无文档硬性违规；保留独立 Today→Tasks 路径场景的少量重复是为了将路由验收与截图矩阵故障隔离。
- `npm run build:mac`、acceptance shell `bash -n`、Swift UI driver `swiftc -typecheck`、`git diff --check` 通过。此前完整前端套件 126/127；唯一失败是仓库外 `life-daily-loop` skill 缺少 `## Personal Dashboard Tasks` 契约，未改外部文件。签名有效，但构建因本机无 Apple notarization credentials 而未公证。
- PR [#7](https://github.com/absurdwall/personal-dashboard/pull/7) 已合并，merge commit `95f4cfa6653c0def5c14cb42b36bde389bb21675`。`/Applications/Personal Dashboard.app` 已替换并正常启动为 3.0.3；安装后主程序 SHA-256 与验收候选相同。替换前保存了有效签名的 3.0.2 recovery 副本 `.scratch/personal-dashboard-3.0.2/recovery/Personal Dashboard 3.0.2.app`。Application Support 五个文件在安装前与启动后哈希全同；清单保留在本机，未加入 PR。只用合成 Vault，未写入真实 Vault 或 Daily Record。全局 Spotlight overlay 仍是既有待用户手动确认项。
- 本票已结束；不启动下一票。父 spec 状态保持不变。

### Ticket 04 Management 同步 — 2026-09-27

最终摘要请求 `dashboard-303-summary-ticket04-final-20260927T014616Z` 已 confirmed，摘要后 inspect 也 confirmed：Registry revision `1d8b6c8025230fbb`、Project summary revision `faad34c76008d588`，`coverage=complete`、`needsReconciliation=false`、无 uncovered source。canonical Ticket 04 保持 `resolved`（revision `fbcd7b8b4ac21a1d`）。摘要保留全局 Spotlight overlay 待用户手动确认这一 blocker/next work；pendingRecovery 中三条既有 conflict/partial 记录保持原样，均未重试。请求、回执与摘要后检查见 `management/summary-request-ticket04-303-final-20260927T014616Z.json`、`management/summary-reconcile-ticket04-303-final.json`、`management/inspect-ticket04-303-postsummary.json`。不启动下一票。

## 2026-09-27 Calendar/Habits 页头 follow-up

用户明确授权 Ticket 05 两处细节并已完成。最终 3.0.4 打包矩阵截图保留在本机，未加入 PR；四页分别覆盖 960×720、800×640、640×520，共 12 张；目标页与 Today/Tasks 无回归，逐张目视检查。包 SHA-256 `87a820473acf61e12d6b86544c343c156645ae2438f42f0b7c328385da4e2476`，签名有效；已安装并启动，Application Support 五文件更新前后哈希一致。PR #8 merge commit `8246fa9eb186e8f2dfdd8e4f46109b5e262e0a5f`。详细验收、审查及完整前端套件外部契约失败见 Ticket 05 Answer；全局 Spotlight overlay 仍待用户手动确认。

### Ticket 05 Management 同步 — 2026-09-27

最终摘要请求 `dashboard-304-summary-ticket05-final-20260927T023927Z` 与摘要后 inspect 均 confirmed。Registry revision `7e499d16be1866a4`，Project summary revision `4f4315c4d5b48947`，`coverage=complete`、`needsReconciliation=false`、无 uncovered source。canonical Ticket 05 为 `resolved`（revision `f49e23ef6d5eeef4`）；来源 revision：3.0 `73f67af62ff88683`、时间轴修复 `6f66259df3b780a1`、3.0.2 `32b2af433d0b0f57`、Codex 协作 `16f6bcfe7538bf9c`。摘要保留全局 Spotlight overlay 待用户手动确认这一 blocker/next work；原有三条 conflict/partial pending recovery 保持原样且未重试。请求、回执、摘要前 inspect 与摘要后 inspect 见 `management/summary-request-ticket05-final-20260927T023927Z.json`、`management/summary-reconcile-ticket05-final.json`、`management/inspect-ticket05-final-before-summary.json`、`management/inspect-ticket05-final-postsummary.json`。本票完成，不启动下一票。

## 2026-09-27 Habits 背景图页头 follow-up（已由整页修正取代）

这是 PR #9 的 header-only 历史交付记录；其验收与关闭结论已被用户拒绝并由下方 PR #10 整页修正取代。PR #9 merge commit `5d0aee6658d00a756671e1cc738df1b07ff39b62`、当时的矩阵、交互限制和收据仅保留为历史，不代表当前票内验收。

### Ticket 06 PR #9 历史 Management 关闭记录 — 2026-09-27

canonical close 请求 `dashboard-302-ticket06-close-20260927T034744Z` confirmed：Ticket 06 与 tracker-map 均 resolved；最终 ticket revision `fb79c56c8a6258b0`，source revision `c5e3854a935e3616`。最终摘要请求 `dashboard-304-summary-ticket06-final-20260927T035106Z` 与摘要后 inspect 均 confirmed：Registry revision `051ca7d958572e44`、summary revision `7d0ed5ba9b90f8b7`、coverage complete、`needsReconciliation=false`、无 uncovered source；保留 1 个 Spotlight 手动确认 blocker 与 1 项既有 next work。关闭请求/回执和摘要请求/回执、摘要前后 inspect 分别记录于 `management/close-request-ticket06-20260927T034744Z.json`、`management/close-reconcile-ticket06.json`、`management/summary-request-ticket06-final-20260927T035106Z.json`、`management/summary-reconcile-ticket06-final.json`、`management/inspect-ticket06-final-before-summary.json`、`management/inspect-ticket06-final-postsummary.json`。三个既有 pendingRecovery conflict/partial 项原样保留，未重试；Spotlight 手动确认项保留。

## Ticket 06 整页修正与最终组合验收 — 2026-09-27

PR [#10](https://github.com/absurdwall/personal-dashboard/pull/10) 已按 merge commit `c793e9f8f20e0b9015cea8a8d1818e80f4cd5184` 合并。修正只将 Habits 目的页容器加入现有 ready-background 共享面板规则；标题分隔线保留，面板跨越周摘要、每日锚点、习惯列表和展开历史，无图状态没有面板，未改业务逻辑。

最终候选为 3.0.4，App 可执行文件 SHA-256 `4b90971849b84f9fea436d5dbcf48c4424415959a405b96a9aa54d6cc6d40110`，签名验证通过。`npm run check`、`npm run build:mac`、`git diff --check`、验收 shell 语法检查及 Swift driver 类型检查通过。Habits 带图/无图的三尺寸顶部、中段和展开历史截图，以及 Today/Tasks/Calendar/Habits 四页 12 张矩阵均保留在本机，未加入 PR。收尾核对发现 `ready-captures3` 中三张命名为 `bottom` 的截图没有证明滚动到页面末尾：960×720、800×640 与中段图相同，640×520 仍在页面中段；已撤回底部已验的说法。按用户要求不继续扩张截图检查，也不重跑此前通过的组合路径和四页矩阵。旧 Calendar 800×640 控件超时和 Today-card 640×520 标签缺失在基线及最终交互验收中均未复现，不把捕图成功当成交互通过。

Standards 与 Spec 双轴代码审查均为零项发现。最终 App 已安装并启动，候选与安装二进制哈希相同，Application Support 五项配置哈希不变；旧 3.0.4 App 已备份。只使用隔离合成 Vault，未写入真实 Vault 或 Daily Record。全局 Spotlight overlay 仍待用户手动确认，不由本票代验。本票结束，不启动下一票。

收尾纠正与清理：旧 `ready-captures3/*bottom.png` 不作为真实页面底部证据；用户要求不继续扩展截图检查，Ticket 06 已按顶部/中段/展开历史及带/无图对照收敛记录。临时验收进程已停止，正式安装 PID `80594` 保持运行。20 个 Ticket 06 临时 App bundle 注册及该票 worktree build bundle 注册已定点注销，bundle 与截图保留；其他历史临时注册未触碰。Ticket 06 worktree 干净；主工作区已有的 `CONTEXT.md` 修改及 scratch 目录保留。

### Ticket 06 整页修正 Management 同步 — 2026-09-27

修正后的 native close 请求 `dashboard-302-ticket06-close-full-page-20260927T0450Z` 已 confirmed，Ticket 06 与 tracker-map 均 resolved。摘要保留一个全局 Spotlight 手动确认 blocker 与既有 next work；三个历史 pendingRecovery conflict/partial 项原样保留且未重试。关闭请求及摘要请求/回执、摘要后 inspect 将存于 `management/close-request-ticket06-full-page-20260927T0450Z.json`、`management/inspect-ticket06-corrected-after-close.json`、`management/summary-request-ticket06-corrected-final-20260927T0500Z.json`、`management/summary-reconcile-ticket06-corrected-final.json`、`management/inspect-ticket06-corrected-final-postsummary.json`。
