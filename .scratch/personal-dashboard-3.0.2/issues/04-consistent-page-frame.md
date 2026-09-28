# 04: 统一四页框架、标题与留白

**What to build:** 今天、任务、日历、习惯共享一致的页面外框与层级，顶部日期/说明有合理留白，减少重复大标题和嵌套框，同时保持各页功能。

**Blocked by:** None

**Status:** resolved
Reopened: 2026-09-26

Type: task

## Acceptance criteria

- [x] 先记录正式安装 3.0.2 App 的四页现状，以日历结构和今天/任务字号方向建立统一框架；不将未经查看的 CSS 推断当作验收事实。
- [x] 四页顶部与左侧边距一致，日期/页面说明不贴边；同级标题使用同一尺度，每页只保留有意义的页面标识与区域标题，不重复无用页面主标题。
- [x] 同层内容容器一致，去除无功能的大白框套圆角内容框；不无差别删除不同功能区域，不丢失页面与区域可访问名称。
- [x] 在 960×720、800×640、640×520 每个相同尺寸下截取正式打包 App 四页完整对照，检查内边距、字号层级、滚动与窄窗口可达性；不能用不同尺寸截图证明一致。
- [x] Today 阅读/刷新、Tasks 编辑、Calendar 日期导航、Habits 查看与既有入口保持可用；不改变习惯行为或已接受时间轴逻辑。
- [x] 布局调整不得重新挤压任务卡片，同时复核其标题/按钮纵排和任务操作。
- [x] 自动化回归与正式 App 四页视觉验收分别记录；在最终集成代码上补齐全部规格组合路径和四页截图矩阵，未通过项回到所属票处理，不以本票关闭替代其他票完成。
- [x] Today「时间未明确的内容」区域在合成 Vault 的长内容场景下不遮挡时间轴或相邻内容；对 960×720、800×640、640×520 增加基于可观察界面几何的回归断言，并逐张检查窗口截图。
- [x] 按 Calendar 的页面结构统一 Today、Tasks、Habits，保留必要语义和功能，只移除重复装饰性页面标题/容器；直接核对重复文案清单和各页可访问名称。
- [x] 增加左上角和页头留白；使用相同窗口尺寸直接比较四页相对 Calendar 的页头位置与内容起点。

## 执行约束

先阅读本 effort 的父规格和 map；本票不改变父规格状态。

- 复用现有 Tauri 与共享 Task 正本、身份、日期/时区和 Vault 绑定；不新增依赖、服务、轮询或另一套任务存储。
- 行为修复先获取能失败的回归证据；优先应用工作流/公开操作入口，必要时补前端竞态用例，不以实现文本断言替代行为验证。布局修复先记录现状，再做真实窗口对照，不为简单样式写镜像实现测试。
- 使用合成隔离资料。真实 App 操作和视觉验收与自动测试分开报告，记录包身份、窗口尺寸、输入与结果。浏览器或 prototype 不算正式 Mac App 验收；实际安装/发布仍受所属实施任务授权边界约束。
- 新固定文案中英文齐全；不自动翻译用户输入。保持焦点、可访问名称和既有编辑操作。
- 不重做已接受时间轴，不改 AI/早间规划、旧 Tasks effort 或 cleanup；不自动修改真实个人资料。
- 各票关闭时必须有各自完成证据；环境/权限阻碍不能算通过。全部票集成后，最后执行的票负责在最终代码上复核组合路径与四页截图矩阵，并将结果记录到 map；若有回归，修复或重新打开所属票，不用早期分支截图宣称最终验收。

## Comments

- 2026-09-26：根据用户实机反馈重新打开并领取本票。已安装的 3.0.2 仍出现 Today/Tasks/Habits 相对 Calendar 重复标题和容器、左上角拥挤，以及 Today「时间未明确的内容」区域遮挡邻近时间轴内容。旧 3.0.1 矩阵仅作历史记录，不代表已安装 3.0.2 的通过证据。只用合成 Vault 重现与验收；所有正式打包尺寸的交互、长标题、任务操作、四页结构和遮挡均需在最终包重验。票 01–03 不因本反馈重开。
- 2026-09-26，早期改动前记录使用的是 3.0.1 候选包（SHA-256 `dd5a1803cd317eb4f442cbe731f5609bdc58ad8813fcc28696670ad64f237614`），并非当时正式安装的 3.0.2；该矩阵保留为历史参考。已另行从已安装的 3.0.2 正式包建立实际基线，详情见本票最终 Answer。
- 基线所见：Calendar 使用内容区标题，其他页使用共享工作区主标题；Tasks 又在内容区重复“任务”。四页内容区左右内缩与局部标题字号不一，Calendar 的大标题与 Habits 的局部标题尺度不同；Today 未定位任务区域中，创建表单圆角边框位于已有功能区域边框内。后续只消除重复/装饰层级，保留区域标题、表单和读取/滚动操作。

## Previous Answer — 2026-09-26 (3.0.1 candidate)

已完成票 04。统一 Today、Tasks、Calendar、Habits 的内容区宽度/左右边距与页面标题层级；Calendar 与 Habits 的局部标题留白已对齐。Tasks 保留可访问的页面名称但隐藏重复的大标题。Today 创建区域保留功能面板，只去掉重复嵌套的装饰框。Habits 在 901–1000px 的摘要布局收紧，修复 960px 横向溢出；未更改习惯行为、共享任务时间轴或卡片内容/操作。

正式 Mac App 改前基线：com.tortillaflat.personal-dashboard，版本 3.0.1，SHA-256 dd5a1803cd317eb4f442cbe731f5609bdc58ad8813fcc28696670ad64f237614；同一隔离合成 Vault 的 12 张四页基线截图在 /private/tmp/personal-dashboard-ipc.ticket04baseline20260926/page-frame-matrix-captures/。基线记录了 Tasks 重复标题、各页左右缩进/标题尺度不一、Today 创建表单的嵌套圆角框，以及 Habits 960px 横向溢出。

最终候选包仍为 com.tortillaflat.personal-dashboard 3.0.1，可执行文件 SHA-256 5e3555ffb48f802f0e6b172eb9f38221ffbcc96e6613d72b0946ee4dcbf88c98。最终 packaged readable-task-cards 组合验收退出码为 0，使用同一隔离合成资料完成任务详情、焦点顺序、完成/重开、删除/恢复、放弃/恢复以及 Tasks/Calendar 可见性，并验证 Daily Record SHA-256 未变化。最终四页矩阵目录为 /private/tmp/personal-dashboard-ipc.ticket04matrixfinal-20260926/page-frame-matrix-captures/：960×720、800×640、640×520 每个尺寸均包含 Today、Tasks、Calendar、Habits 四页，共 12 张。每个尺寸都操作 Today/Tasks 刷新、Calendar 上/下月与日期选择、Habits 刷新；正式窗口检查通过，页面文档级横/纵向滚动条断言通过。640×520 的 Tasks 截图曾因前台窗口竞态捕获错误应用，已移入 rejected-captures 并从同一打包应用重新生成正确截图；替换后的完整 12 张矩阵均已逐张目视检查。卡片动作图在 /private/tmp/personal-dashboard-ipc.ticket04matrixfinal-20260926/task-card-captures/。

最终集成路径也复核了前三票行为：today-refresh 场景在 /private/tmp/personal-dashboard-ipc.ticket04refreshfinal20260926/ 通过；today-shared-task-axis 场景在 /private/tmp/personal-dashboard-ipc.ticket04axisfinal20260926/ 通过；readable-task-cards 组合场景在最终候选包上通过。合成任务在刷新与生命周期操作后保留身份，未写入 Daily Record。仅用隔离合成 Vault 与复制出的正式打包应用；未操作真实个人数据、未安装或发布应用。

验证：npm run build、npm run build:mac 通过；tests/frontend/task-presentation.test.ts 19/19 通过；acceptance shell 语法检查、Swift UI driver 编译与 git diff --check 通过。完整 npm run test:frontend 与 cargo test 各有一项已知外部失败：前者要求外部 life-daily-loop skill 含有 ## Personal Dashboard Tasks，后者的 daily-flow fixture 因 morning-laundry 历史顺序倒置而失败；未改动外部 skill 或 fixture。

代码审查：Spec 轴无发现。Standards 轴无硬性违规；两项轻微维护性判断为响应式 CSS 在不同断点重复列出四页选择器，以及水平滚动条助手与既有垂直滚动条助手结构相似，均未发现行为问题。

实现提交：f8a890e Align Personal Dashboard page frames；最终验收加固：43700d8 test: strengthen final page frame acceptance。父 spec 状态保持 ready-for-agent；票 01 仍需用户提供可复现资料，票 02/03/04 已完成。本轮在票 04 结束。

## Final Answer — 2026-09-26 (3.0.3)

已完成本票并发布 3.0.3。Today、Tasks、Calendar、Habits 的页头尺度、内容边距与标题层级已统一；Calendar 使用与其他页面相同的 `clamp(2rem, 4vw, 3rem)` 标题尺度。视觉隐藏的 Tasks 重复主标题仍保留其可访问页面名称。Today 未定位内容区与邻近更新区的遮挡断言使用可观察界面几何，并在三种窗口尺寸逐一通过。父规格状态未更改；票 01–03 未重开，也未开始下一票。

**实际安装的 3.0.2 基线：** `/Applications/Personal Dashboard.app` 的版本为 3.0.2，Bundle ID `com.tortillaflat.personal-dashboard`，主程序 SHA-256 `d55bdadc2778566e019282295a61c85fe64a1cbb4cb97973d55b025102a8aa99`，签名有效。以该已安装 bundle 为隔离验收来源，在合成 Vault/隔离 App 数据下完成四页入口、刷新/日历导航/习惯快照和任务操作，并生成 960×720、800×640、640×520 各含 Today/Tasks/Calendar/Habits 的 12 张改前基线图：`/private/tmp/pd-ticket04-installed-302-baseline-20260926/page-frame-matrix-captures/`；任务卡片图在相邻 `task-card-captures/`。该 3.0.2 证据纠正并补充前面注明的 3.0.1 历史候选矩阵。

**最终 3.0.3 打包验收：** Bundle ID `com.tortillaflat.personal-dashboard`，版本 3.0.3，主程序 SHA-256 `91f53ba8e7a2e918622f5c9e00c981abdf51f5d854a2275be8f73e27d3b81471`，签名验证通过。`today-refresh`、`today-shared-task-axis`、`readable-task-cards` 和 `today-unlocated-panel-layout` 均在该同一包上通过。共享时间轴覆盖创建、手动刷新、完成/重开、改期、同名时间点重叠、Tasks-only Vault 和跨午夜重启；Task 身份保持不变，Daily Record 未被任务操作改写。任务卡片路径覆盖详情、键盘焦点顺序、完成/恢复、放弃/恢复、删除/恢复及 Tasks/Calendar 可见性。

最终四页截图矩阵目录：`/private/tmp/pd-ticket04-303-final-candidate-20260926/page-frame-matrix-captures/`；三尺寸各四页共 12 张。相同窗口矩阵操作了 Today/Tasks 刷新、Calendar 上下月与日期选择、Habits 快照刷新；窗口尺寸断言和文档级横/纵向滚动断言通过。12 张候选图已逐张视觉检查。长内容遮挡截图在该目录的 `unlocated-panel/`，对应区域 bounds 在 960×720、800×640、640×520 均不相交。正式安装后的启动进程来自 `/Applications/Personal Dashboard.app`。

安装前保留了有效签名、哈希为 `d55bdadc2778566e019282295a61c85fe64a1cbb4cb97973d55b025102a8aa99` 的 3.0.2 recovery 副本：`.scratch/personal-dashboard-3.0.2/recovery/Personal Dashboard 3.0.2.app`。安装启动前后 Application Support 目录的 5 个文件哈希一致；清单为 `/private/tmp/pd-ticket04-303-config-pre-install.json` 和 `/private/tmp/pd-ticket04-303-config-post-startup.json`。只使用合成 Vault 验收，没有编辑真实 Vault 或 Daily Record。Tauri bundle 签名有效；由于本机没有 Apple notarization credentials，构建未公证。Finder/全局 Spotlight overlay 的独立手动验收仍按既有 Management 记录待用户确认，本票不把它外推为通过。

**代码审查：** Spec 轴无剩余产品或验收发现。Standards 轴无文档硬性违规；Task 路径单独运行造成的少量流程重复有截图失败隔离的明确用途，没有可操作的维护问题。

**验证记录：** `npm run build:mac`、acceptance shell `bash -n`、Swift UI driver `swiftc -typecheck`、`git diff --check` 通过。之前运行的完整 `npm run test:frontend` 为 126/127；唯一失败仍是仓库外 `life-daily-loop` skill 缺少 `## Personal Dashboard Tasks` 契约，未修改外部 skill，也未为重复计数再次运行。具体正式 App 验收与截图均使用上述两个精确包身份及隔离资料。

**发布：** PR [#7](https://github.com/absurdwall/personal-dashboard/pull/7) 已合并，merge commit `95f4cfa6653c0def5c14cb42b36bde389bb21675`。安装后的 3.0.3 可执行文件哈希与最终验收包一致。
