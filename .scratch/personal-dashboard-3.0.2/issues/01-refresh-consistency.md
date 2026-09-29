# 01: 修复 Today 手动刷新的一致性

**What to build:** 用户在 App 内或外部修改数据后，点击 Today 刷新即可得到当前 Vault 和日期的最新页面内容；失败明确可见，过期响应不能覆盖新状态。

**Blocked by:** none

**Status:** resolved

Closed: 2026-09-26T08:51:21Z

Type: task

## Acceptance criteria

- [x] 先复现用户路径，记录刷新前后任务身份、日期、读取及实际呈现；源码已经包含共享 Tasks 读取，不能将根因预设成漏接按钮。建立修复前失败、修复后通过的行为回归；无法复现则保留未证实状态，不盲改并关闭为已修复。
- [x] 外部有效修改 Task 与 Daily Record 后，点一次刷新，右侧任务和现有日记时间轴等相关区域都反映新数据。01 不负责提前实现 02 的新 Task 时间轴投影；02 接入时必须继承相同刷新契约。
- [x] 在 Tasks 中创建/编辑后进入 Today，保持既有跨入口一致性；保留已有切页和获焦读取，不新增定时轮询。
- [x] 读取失败明确反馈，可重试恢复；不能右侧任务仍陈旧却宣称整页刷新成功，也不引入跨正本数据库事务。
- [x] 连续刷新、较慢旧响应、任务写入后返回、切日及切 Vault 不串结果；跨午夜后刷新和重启后按正确日期读取。
- [x] 优先复用应用工作流和已有异步请求测试入口；必要时最小化增加页面操作层注入边界，不做无关架构改造。
- [x] 正式 Mac App 实际点按钮验证外部修改、失败恢复与 App 内修改路径，报告真实结果；自动化后端重读成功不能代替按钮验收。

## Comments

- 2026-09-26：以当前 checkout 构建 `Personal Dashboard.app`（bundle id `com.tortillaflat.personal-dashboard`，版本 3.0.1），在 960×720 窗口、隔离 Vault 和隔离应用数据中运行 `today-refresh`。Today 保持打开时外部改写 Task 标题和 Daily Record 当前安排；刷新前仍显示旧值，点击“刷新”后两处都显示新值。把 Tasks 正本替换为损坏 JSON 后点击刷新，界面显示“无法读取 Tasks：”且移除陈旧任务；恢复有效文件后重试，两处最新值恢复。
- 同一场景从 Tasks 页面改名原 Task，再进入 Today，显示新标题且 task id 仍为 `today-refresh-task`；Daily Record 字节哈希未变。专用场景位于 `scripts/acceptance/macos-ipc-workflow.sh` 的 `today-refresh`。
- 这复现了用户描述的操作形状，但没有复现“点击刷新后仍不同步”的失败；当前后端按所选 Vault 重读 Tasks，前端将返回视图更新到两个区域。没有产品刷新逻辑改动，也没有把本票关闭为已修复。确切故障仍需可复现的 Vault 内容、Task 日期/身份、外部写入步骤及刷新前后差异。
- 验证：`npm run check` 通过。`npm run test:frontend` 为 115/116；唯一失败是 `tests/frontend/daily-flow-integration.test.ts` 对共享 `.agents/skills/life-daily-loop/SKILL.md` 中 `## Personal Dashboard Tasks` 的契约断言。`cargo test --manifest-path src-tauri/Cargo.toml` 在 `daily_flow_integration_workflow` 失败，Task 读取报告“任务正本的修改记录时间顺序倒置”。这些失败未由本票改动触及。
- 补充边界验收：现有 `vault-selection` 打包场景在中文 UI 下先因旧的 `Vault: vault-a` / `Daytime` 标记未匹配而中断；临时按当前可见文本继续后，场景又在旧 `Short record text` 输入标记处超时。临时改动已撤回，故该场景没有证明 Vault 切换边界。现有 `today-time-axis` 场景通过当前日页面检查，但在历史空白日等待旧提示文案时超时，未执行其中午夜/重启段。相关场景的证据不足，连续/慢响应、切日/Vault 及午夜/重启条件仍未验收，不标记通过。

- 2026-09-26 收尾：新增协调器回归并先验证失败，再接入 `PendingWriteBarrier`，覆盖在 Tasks 写入尚未落盘时返回 Today 的可达竞态；Today 读取失败后任务操作仍保持禁用，成功重读后才恢复。原报告中的刷新不同步仍未复现；这些回归证明的是已演示的竞态与错误状态保护，不证明它就是用户原始故障。
- 最新正式打包候选为 `com.tortillaflat.personal-dashboard` 3.0.1，主程序 SHA-256 `b2f5f31cbfb563ba62c455a04a7d927244dddce11b6ce15f8716b2eb67218486`。在隔离合成 Vault / 应用资料中，Mac UI 驱动的 `today-refresh` 通过：外部 Task 与 Daily Record 修改后点一次 Refresh，两处均显示新值；损坏 Tasks 显示读取错误且不冒充成功，修复源文件后可重试恢复；从 Tasks 改名后进入 Today 保留 Task ID 并显示新标题。
- 其余最新打包路径也通过：`vault-selection` 验证取消/重选保留草稿、切换 Vault 清除旧页面状态，Daily Record 哈希不变；`today-time-axis` 验证当前与历史日期行为和跨午夜重启；`today-shared-task-axis` 在午夜重启后外部改名并手动 Refresh，保持 Task ID、原日期和状态，移除旧时间轴点且不改写 Daily Record。相关验收证据保留在本机，未加入 PR。
- 异步协调器用例延迟旧读取，再触发日期切换或 Vault 选择，断言过期视图不会覆盖新结果；PendingWriteBarrier 用例验证返回 Today 等待写入完成。聚焦前端测试 38/38 通过；`npm run build`、`npm run build:mac`、验收 shell 语法、Swift UI driver 类型检查和 `git diff --check` 通过。完整 `npm run test:frontend` 为 124/125，唯一失败仍是仓库外 `life-daily-loop` skill 缺少 `## Personal Dashboard Tasks` 契约；没有修改该外部文件。无 Rust 代码改动，未运行 Cargo 套件。
- Spec / Standards 代码审查：Spec 确认没有已证实的错误实现，但原始报告必须保持未证实，并指出日期/旧响应测试在异步协调器边界而非完整 UI 级延迟注入；日期、Vault 和午夜 UI 路径另由最新打包场景覆盖。Standards 未发现硬性规范违规；仅记录 `refreshTodayPresentation` 泛型回调略显通用的维护性判断，未发现其他 Fowler 异味。本票 acceptance harness 的中英标签和历史空状态更新用于让既有隔离验收路径匹配当前界面；不改变产品行为。
- 最终组合复核：在 Ticket 01 当前候选包上重跑 `readable-task-cards`，窗口尺寸 960×720、800×640、640×520 下分别操作 Today、Tasks、Calendar、Habits，并断言页面无文档级横/纵滚动；任务详情、键盘焦点顺序、完成/重开、删除/恢复、放弃/恢复及 Tasks/Calendar 共视均通过。隔离 Daily Record SHA-256 保持 `d37fbaf33f1d1669655bc64e2fdf00df57b69547c3017858973ebe3a3033de27`。12 张窗口级截图逐张目视检查；截图与卡片图保留在本机，未加入 PR。截图驱动现按目标 PID、Accessibility 窗口边界匹配 CGWindow 并用窗口 ID 捕获，未再录入覆盖窗口的其他应用弹窗。当前候选包主程序 SHA-256 仍为 `b2f5f31cbfb563ba62c455a04a7d927244dddce11b6ce15f8716b2eb67218486`。对窗口级截图改动的 Spec 与 Standards 增量审查均无阻断发现。
- 结论：按用户认可的范围以“原报告未复现；约定验证通过”关闭，不声称修复了原始报告。若之后提供确切 Vault、Task 身份/日期、外部写入步骤及刷新前后差异，可据此重新打开调查。仅运行隔离合成资料，未安装或发布 App。

## Answer

Today 刷新现在等待未完成的共享 Task 写入后再读取，并丢弃已过期的日期/Vault 页面响应；错误读取会明确显示，且不会让陈旧任务可写。应用工作流与最新打包 UI 路径验证了外部 Task/Daily Record 修改、损坏数据重试、Tasks 到 Today、Vault 切换、慢旧响应、写入后返回及跨午夜重启。原报告中的“刷新后仍不同步”未复现，因此本票结论为“原报告未复现；约定验证通过”，不是已证明修复了原始故障。

当前候选包还通过四页组合路径和 960×720、800×640、640×520 的 12 张窗口截图矩阵；截图逐张检查时未见外部窗口遮挡，合成 Daily Record 未变化。矩阵及三张 Today 任务卡截图保留在本机，未加入 PR。

聚焦测试 38/38、构建与最新四条打包场景通过；完整前端套件仍有一项仓库外 `life-daily-loop` skill 契约失败。Spec 与 Standards 复核没有阻断项。父 spec 未改；未安装或发布 App。

## 执行约束

先阅读本 effort 的父规格和 map；本票不改变父规格状态。

- 复用现有 Tauri 与共享 Task 正本、身份、日期/时区和 Vault 绑定；不新增依赖、服务、轮询或另一套任务存储。
- 行为修复先获取能失败的回归证据；优先应用工作流/公开操作入口，必要时补前端竞态用例，不以实现文本断言替代行为验证。布局修复先记录现状，再做真实窗口对照，不为简单样式写镜像实现测试。
- 使用合成隔离资料。真实 App 操作和视觉验收与自动测试分开报告，记录包身份、窗口尺寸、输入与结果。浏览器或 prototype 不算正式 Mac App 验收；实际安装/发布仍受所属实施任务授权边界约束。
- 新固定文案中英文齐全；不自动翻译用户输入。保持焦点、可访问名称和既有编辑操作。
- 不重做已接受时间轴，不改 AI/早间规划、旧 Tasks effort 或 cleanup；不自动修改真实个人资料。
- 各票关闭时必须有各自完成证据；环境/权限阻碍不能算通过。全部票集成后，最后执行的票负责在最终代码上复核组合路径与四页截图矩阵，并将结果记录到 map；若有回归，修复或重新打开所属票，不用早期分支截图宣称最终验收。
