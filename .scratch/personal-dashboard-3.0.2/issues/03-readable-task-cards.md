# 03: 让任务卡片在窄区域可读可操作

**What to build:** Today 右侧卡片先呈现完整宽度的任务标题与元信息，再在下方呈现操作，让用户无需放大窗口或缩小字体即可阅读和处理任务。

**Blocked by:** None

**Status:** resolved
Closed: 2026-09-26T06:43:25.866075Z

Type: task

## Acceptance criteria

- [x] 标题占卡片正文可用宽度，元信息位于其下，详情/完成/放弃/删除等操作位于正文下方；按钮可换行但不能反向挤压正文。
- [x] 短中文、长中文及长英文合成任务标题正常阅读；日期和来源不被挤成竖列，不隐藏名称、不依赖悬停、不缩小现有正文字号补救。
- [x] 960×720、800×640、640×520 下无卡片内容遮挡或横向溢出；最窄尺寸沿用现有响应式布局，动作可滚动到达。无时刻任务仍属于右侧 Today 任务区域，不新增时间轴区域。
- [x] 使用真实动作验证展开详情、完成/撤回及现有状态操作仍可用，键盘顺序与可访问名称保留；共享卡片在 Tasks 和 Calendar 的呈现不退化。
- [x] 正式 Mac App 留下三种尺寸的卡片对照证据；已有相关行为测试通过，CSS 静态断言不代替视觉结果。

## 执行约束

先阅读本 effort 的父规格和 map；本票不改变父规格状态。

- 复用现有 Tauri 与共享 Task 正本、身份、日期/时区和 Vault 绑定；不新增依赖、服务、轮询或另一套任务存储。
- 行为修复先获取能失败的回归证据；优先应用工作流/公开操作入口，必要时补前端竞态用例，不以实现文本断言替代行为验证。布局修复先记录现状，再做真实窗口对照，不为简单样式写镜像实现测试。
- 使用合成隔离资料。真实 App 操作和视觉验收与自动测试分开报告，记录包身份、窗口尺寸、输入与结果。浏览器或 prototype 不算正式 Mac App 验收；实际安装/发布仍受所属实施任务授权边界约束。
- 新固定文案中英文齐全；不自动翻译用户输入。保持焦点、可访问名称和既有编辑操作。
- 不重做已接受时间轴，不改 AI/早间规划、旧 Tasks effort 或 cleanup；不自动修改真实个人资料。
- 各票关闭时必须有各自完成证据；环境/权限阻碍不能算通过。全部票集成后，最后执行的票负责在最终代码上复核组合路径与四页截图矩阵，并将结果记录到 map；若有回归，修复或重新打开所属票，不用早期分支截图宣称最终验收。

## Answer

已完成票 03。Today 共享任务卡正文（标题与元信息）现占用完整可用宽度，操作组放在正文下方并可换行；仅改变 Today 卡片，Tasks 与 Calendar 样式保持原样。无时刻任务仍在原 Today 共享任务区。

正式 Mac App 对照包身份：`Personal Dashboard.app`（`com.tortillaflat.personal-dashboard`，版本 `3.0.1`），候选包位于 `src-tauri/target/release/bundle/macos/Personal Dashboard.app`；验收使用其隔离副本运行实际 Tauri 窗口。改前包 SHA-256 `6f064a8e70a6141dd3f03841dc3be6c51964b2e4a6c1218e651ebfac64c6298d`，截图保留在本机，未加入 PR；960×720 与 800×640 中长中文标题曾被压成逐字竖排，来源和日期也被挤成窄列。改后包 SHA-256 `dd5a1803cd317eb4f442cbe731f5609bdc58ad8813fcc28696670ad64f237614`，截图保留在本机，未加入 PR，包含 960×720、800×640、640×520 三图；均已逐张核对。改后标题自然换行、元信息横排、操作位于正文下方，640×520 沿用堆叠与滚动，无横向溢出或卡片遮挡。输入包含短中文、长中文及长英文合成任务标题。

隔离合成 Vault 的打包应用操作通过：打开详情、Tab 从标题移至详情操作、完成/重开、放弃后在 Tasks 恢复、删除后在 Tasks 撤销删除；同一任务仍在 Tasks 与 Calendar 可见，Daily Record 哈希未变。

验证：`npm run build` 通过；`tests/frontend/task-surface.test.ts` 11/11 通过；`npm run build:mac` 通过；新增 packaged `readable-task-cards` 场景通过。双轴代码审查无代码问题。完整前端套件有一个既有外部契约失败：`daily-flow-integration.test.ts` 要求外部 `life-daily-loop` 技能包含 `## Personal Dashboard Tasks`，该外部技能未修改。完整 Cargo 套件有一个既有 fixture 失败：`daily_flow_integration_workflow` 的 `morning-laundry` 任务因修改历史顺序倒置而被识别为损坏；该 fixture 未修改。

实现提交：`af7c3e7 fix: make Today task cards readable at narrow widths`。
