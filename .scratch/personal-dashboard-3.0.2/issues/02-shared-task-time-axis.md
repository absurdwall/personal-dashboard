# 02: 在 Today 时间轴显示共享 Task 及其状态

**What to build:** 当天有时刻的 Task 在现有时间轴中直接显示名称、时刻、来源和状态，用户无需多填时间类型；与右侧和其他入口保持同一任务身份。

**Blocked by:** None

**Status:** resolved

Type: task

## Acceptance criteria

- [x] 当天有时刻 Task 出现在相应位置，直接可读“17:00 · 任务名”，不生成结束时刻或耗时，不新增开始/截止选择。
- [x] 无时刻今日任务仅留右侧，无日期不进入今天，未来日期不进入今天，过去日期未完成任务单列且不投到今天时间轴。即使当天 Daily Record 缺失，任务仍可显示且不创建日记。
- [x] 当天已过设定时刻仍未完成，显示“已过设定时间”，留在当天组；恰好该时刻不算已过。过去日期单列与共享入口的计数/分组一致，不沿用当日过点即逾期的旧规则。
- [x] 完成后在原设定时刻保留完成标记，撤回后恢复未完成；不把设定时刻当作实际完成时间，不自动写入 Daily Record 的事实或耗时。
- [x] 改名、改时刻、改日期及状态变更反映到同一身份投影，旧位置不残留。放弃、删除、归档及恢复沿用共享任务可见性；不产生副本。
- [x] Task 与同名同时刻的日记安排各保留一条，来源显示“任务”与“日记安排”；复用既有重叠展开、单列卡片、当前时间标记及计划/事实区分，不新建任务泳道。
- [x] 新 Task 投影加入手动刷新和现有任务修改后的呈现链路，右侧与时间轴一致；不依靠重新启动 App 才更新。
- [x] 用隔离 Vault 与受控时钟从创建/变更 Task 到读取 Today 的应用工作流覆盖上述边界，并检查旧响应及跨日不改变任务语义。
- [x] 正式 Mac App 验证创建今日有时刻 Task → Today 刷新、完成/撤回、改期和同名重叠；在 960×720、800×640、640×520 下任务名和时刻可读、重叠可操作。新增固定文案中英文齐全。

## 执行约束

先阅读本 effort 的父规格和 map；本票不改变父规格状态。

- 复用现有 Tauri 与共享 Task 正本、身份、日期/时区和 Vault 绑定；不新增依赖、服务、轮询或另一套任务存储。
- 行为修复先获取能失败的回归证据；优先应用工作流/公开操作入口，必要时补前端竞态用例，不以实现文本断言替代行为验证。布局修复先记录现状，再做真实窗口对照，不为简单样式写镜像实现测试。
- 使用合成隔离资料。真实 App 操作和视觉验收与自动测试分开报告，记录包身份、窗口尺寸、输入与结果。浏览器或 prototype 不算正式 Mac App 验收；实际安装/发布仍受所属实施任务授权边界约束。
- 新固定文案中英文齐全；不自动翻译用户输入。保持焦点、可访问名称和既有编辑操作。
- 不重做已接受时间轴，不改 AI/早间规划、旧 Tasks effort 或 cleanup；不自动修改真实个人资料。
- 各票关闭时必须有各自完成证据；环境/权限阻碍不能算通过。全部票集成后，最后执行的票负责在最终代码上复核组合路径与四页截图矩阵，并将结果记录到 map；若有回归，修复或重新打开所属票，不用早期分支截图宣称最终验收。

## Answer

在既有 Today 单列时间轴接入共享 Task：只把当天有设定时刻的有效 Task 投影为同身份时间点；保留日期、状态、重叠及当前时间语义，不写入 Daily Record。Task 与 Diary arrangement 有独立来源/状态标记。共享点卡在原 48 分钟几何内采用双行布局，来源与状态在中英文窄屏均可见。

验收证据：

- `npm run build` 通过；定向前端用例 28/28 通过；`cargo test --manifest-path src-tauri/Cargo.toml --test today_shared_tasks_workflow` 3/3 通过。
- `npm run build:mac` 通过，生成 ad-hoc 签名的 `Personal Dashboard.app`。
- 打包 Mac 验收 `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=today-shared-task-axis` 通过。合成时钟从 2026-09-26 17:05 推进到 2026-09-27 00:05；覆盖创建、刷新、完成/重开、改期、同名重叠、Tasks-only Vault 和重启跨午夜。Task ID 始终一致，Daily Record SHA-256 保持 `6aab45c754f68055835ef07e5f1a50036916591dd637d96d07b667e8b39d4a86`。截图位于 `/tmp/personal-dashboard-ipc.ticket02final4/today-shared-task-axis-captures/`，包括 960×720、800×640、640×520 和英文 640×520。
- 打包候选主程序 SHA-256：`6f064a8e70a6141dd3f03841dc3be6c51964b2e4a6c1218e651ebfac64c6298d`。`bash -n scripts/acceptance/macos-ipc-workflow.sh`、`swiftc -typecheck scripts/acceptance/macos-ui-driver.swift` 及 `git diff --check` 均通过。
- `code-review` 的规格与 standards 两路复核均未发现剩余实质问题。

完整前端套件有 1 项仓库外共享契约失败：`tests/frontend/daily-flow-integration.test.ts` 要求安装于仓库外的 `life-daily-loop` 技能含 `## Personal Dashboard Tasks`。完整 Cargo 套件此前在无关的 `daily_flow_integration_workflow::real_daily_loop_rehearsal_uses_dashboard_for_local_actions_and_keeps_dida_reference_only` 失败，fixture 报“任务正本的修改记录时间顺序倒置”。两项均未修改外部技能或无关 fixture；本票定向用例与打包验收通过。

父 spec、票 01 状态未改；本轮只关闭票 02。

## Comments

- 2026-09-26：完成票内验收和规格/standards 复核；Management 状态与摘要同步见本 effort 的 map 及 `management/summary-reconcile-ticket02.json`。本轮停止于票 02，未领取票 03。
