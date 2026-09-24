# 02: 单列叠放卡片在重叠与窄窗口下保持可读

**What to build:** 按用户后续现场反馈，将安排和已确认事实合并到一条全天时间轴，以颜色和边框样式区分类型。重叠事项应轻微叠放并提供可点击的前翻入口；窄窗口同时显示两类卡片，不依赖横向查看另一栏。

**Blocked by:** 01 提供可读时间轴卡片的基础结构（本票不沿用旧双栏排布）。

**Status:** resolved
**Closed:** 2026-09-23T20:03:59-04:00

## 最新用户方向（覆盖此前双栏候选）

用户查看票 02 的真实 App 后指出事实栏在窗口中经常被截断，并明确要求改为一列；同一时刻的事项也不应横向铺成多列，应互相叠放，点击后把对应卡片显示到前面。原先 two-lane A 候选及其 packaged 证据仍是历史记录，但不再满足当前用户验收方向。用户于 2026-09-23 直接确认最新扇叠效果更舒服、方向正确；当前已安装包也已打开给用户查看，票据结案见文末 `Answer`。

- 单条全宽时间轴混排当前安排与已确认事实，暖色虚线计划卡和绿色实线事实卡明确区分。
- 同时刻及真实可见范围相交的卡片形成轻微扇叠；小型 `∨` 控件逐项切换到前层，选择卡片可展开原始记录详情。
- 640×520 窄窗口中安排卡和事实卡同时可见，无需横向滚动访问另一栏；中英文均成立。
- 以最新 packaged 原生窗口的合成记录检查叠放、点击／键盘可达性、事实可见性及无真实记录写入为依据。

当前方向验收：

- [x] 单列共同时间尺中安排与事实颜色可辨；窄窗口不必横向访问另一事实列。
- [x] 同刻卡片有轻微叠放和 `∨` 前翻控件；前翻可显示下一项，卡片可用鼠标与键盘打开详情。
- [x] 真实区间交叉也形成同列叠放；原始时间锚点与时长保持不变。
- [x] 原生 packaged App 的中英文宽／窄合成场景检查通过。
- [x] 用户直接确认最终观感。

### 2026-09-23 新方向 packaged 实施证据

本轮从 `9a78953` 继续，代码提交为 `4c6941a`；状态仍为 `claimed`。用户明确要求把安排和已确认事实放在同一时间轴，并将相交卡片叠放，因此此前同票的双栏候选记录仍保留为历史，不作为本方向的验收证据。

- 实现：移除安排／事实双列和横向事实栏入口；时间轴改为共用单列，以暖色虚线标记安排、绿色实线标记事实。叠放组初始显示最早的一项；`∨` 逐项前翻，并可通过卡片进入详情。保留真实区间锚点和时长，未新增依赖或外部服务。
- 候选：`CARGO_TARGET_DIR=/tmp/pd-timeline-a-ticket02-visual-final npm run build:mac`，App 位于 `/tmp/pd-timeline-a-ticket02-visual-final/release/bundle/macos/Personal Dashboard.app`。可执行文件 SHA-256 `21f88432d4f8030b88d74c9fffb4b3b37da55d864c28f54aa377ac8045baeba5`；未 notarize（本机没有 Apple 签名凭据），也未替换已安装 App 或发布。
- Packaged 回归：`today-time-axis-overlap` 在合成 Daily Record 下检查固定 13:00、13:01、13:59 的中文／英文和 1120×760／640×520。检查同刻与实际区间重叠叠放、点按 `∨` 切到下一卡片、鼠标／键盘打开不同详情、计划／事实在同一窄屏时间列中出现，以及未定时内容仍可访问。隔离记录 SHA-256 `7c77925b9c05a7905cc78babadc01972ab59f4ff47e5e06dffeb175e4149dbe4` 运行前后未变化。
- 首轮 r6 截图保留在 `/tmp/pd-timeline-a-evidence/single-lane-run-r6/`。实现者读图后，独立复核发现现在线穿过卡片标题等问题；这些已在下方 r8 章节修订并重新复核，r6 仅作历史证据。
- 自动检查：`node --test tests/frontend/today-time-axis.test.ts` 9/9，`npm run build`，验收 shell 语法及 Swift 驱动编译通过。完整 `npm run test:frontend` 仍有一个既有外部契约失败：`tests/frontend/daily-flow-integration.test.ts:79` 要求当前安装的 `life-daily-loop` skill 含 `## Personal Dashboard Tasks`；本票未修改该 skill 或无关测试。构建跳过 notarization。
- 用户预览边界：这仍是待审候选，不等于用户已认可。已通过 macOS 原生窗口控制打开并查看此确切候选的真实 Today 页面；未点击保存或更改个人记录，也不将 Daily Record 内容复制到 issue。该真实数据窗口只用于当前 app 可见性确认；叠放交互证据仍来自上述隔离合成记录截图。

### 2026-09-23 最终视觉修订与原生候选复核

上面的 r6 是第一轮单列候选，后续独立读图发现现在线穿过卡片标题、计划卡焦点描边易与事实绿色混淆、叠放入口说明不足。r8 对应下方最新 r3 候选，取代 r6 的视觉证据：现在线与卡片相交时隐藏横线但保留红色时间标记；叠放前层描边改为中性灰；`∨` 入口仍显示叠放数量，并带有本地化的 `显示下一项 / Show next item` 辅助标签。

- 最新代码包含后续视觉修订，代码提交 `7d9f464`；候选 executable SHA-256 `31a4b1f9c8578ff7bda0603af433b900e8414c2e58056a264638ab1b422e8781`，完整包位于 `/tmp/pd-timeline-a-ticket02-visual-final-r3/release/bundle/macos/Personal Dashboard.app`。未 notarize（缺少 Apple 签名凭据），未替换日常安装或发布。
- packaged 回归 r8 通过 13:00、13:01、13:59 的中英文宽／窄窗口矩阵；同刻与真实区间重叠扇叠、逐项前翻、鼠标／键盘打开不同详情、未定时入口可达均通过。隔离 Daily Record SHA-256 `7c77925b9c05a7905cc78babadc01972ab59f4ff47e5e06dffeb175e4149dbe4` 未变化。截图目录 `/tmp/pd-timeline-a-evidence/single-lane-run-r8/`。
- 独立视觉复核重新查看 r8 的中文窄屏、宽屏和未定时入口图，确认红线未穿过卡片文字、时间标记仍可见、中性色焦点描边、单列双类型及未定时内容均可辨；未发现实质视觉问题。复核者指出 `∨` 单独看仍略含糊，但计数、扇叠语境和可访问／提示文字共同说明其用途。复核不等于用户验收。
- 用户要求看到真实 app 后，已直接打开确切 packaged 候选，显示当前 Today 页面和本机 Vault 内容；未保存或修改个人记录。随后用户明确确认扇叠卡片效果更舒服且方向正确。2026-09-23 已从当前提交重新打包并安装同一可执行文件哈希的 3.0.1 App；当前安装与实际窗口检查结果记录于文末 `Answer`。

## Answer

用户于 2026-09-23 看过最新时间轴方向后明确认可轻微扇叠卡片与逐项前翻效果，称其“看着其实挺舒服”且“相对来讲就是对的了”。按用户要求关闭了此前运行的多份 Dashboard 实例，将旧版 `/Applications/Personal Dashboard.app` 保留在 `/Applications/Personal Dashboard.app.backup-20260923-accepted-timeline`，并把当前分支提交 `e0091de` 构建的版本安装到 `/Applications/Personal Dashboard.app`。安装包版本为 3.0.1，bundle id 为 `com.tortillaflat.personal-dashboard`，可执行文件 SHA-256 为 `31a4b1f9c8578ff7bda0603af433b900e8414c2e58056a264638ab1b422e8781`；`codesign --verify --deep --strict` 通过。该本地包未 notarize。已打开正式安装路径的 App，确认 Today 页面显示单列安排／事实时间轴和未定位内容；未修改或保存个人记录。

PR 已整理为本地草稿 `/tmp/personal-dashboard-timeline-pr-draft.md`，目标为 `main`，分支为 `codex/historical-habit-corrections`。按用户要求没有推送，因此尚无 GitHub PR。聚焦与 packaged 检查结果见本票以上记录；完整前端套件仍有记录过的外部 `life-daily-loop` skill 标题契约失败。票 01 继续保持 `claimed`，不把本票验收推断为对票 01 的单独确认。

Type: task

## 已确认基准

用户已批准本修复拆分。A 原型为确定基准，不重新选择设计。原型归档分支 `codex/prototype-today-time-axis`，确认提交 `f9551de8500ba8d32b3732626e561b29856fd258`，variant A。按本 effort 父规格核对来源与已知偏差；旧实现票 resolved 不代表本轮视觉修复通过。

## 历史执行基线：79fdcd3 双栏候选

当前已集成提交 `79fdcd394357936f17c2a5aca489a82e65ff6050`（`codex/historical-habit-corrections`）。执行本票应包含此提交，复用已有修复，只处理剩余缺口；不得从之前的纯时间标签版本重新实现。若处于其他 checkout，先核对提交已包含，再处理集成，保留无关未提交工作。

此提交已经加入直接显示任务名、计划／事实卡片样式、红色现在线、标签区间分轨和去除重复时间前缀。以上为代码核对事实，不等于 packaged 视觉验收完成。当前聚焦时间轴测试 6/6 通过，覆盖数值布局、文本及静态结构；尚不能证明可见文本不被裁切、卡片位置正确或实际点击区域无碰撞。

### 初版双栏范围的历史待办（已被后续单列方向覆盖）
以下列表记录 79fdcd3 双栏方向在本票启动时的待办；用户后续明确要求安排与事实共用一列，当前范围和结果以上方“最新用户方向”及 r8 证据为准。不要将这些历史待办当作当前未完成项。

- 复用新增 axisTrackPlacements 分轨逻辑，验证实际可见几何；不要仅重复加入两个 13:00 的数值分轨用例。
- 已执行复现：13:00–13:47 与 13:30–14:30 两项当前都返回 track 0 / tracks 1，实际区间却重叠 17 分钟。短事项分轨仅使用居中标签边界，忽略实际时长尾部；验收必须覆盖标签矩形与真实时间范围的联合冲突边界，避免真实时长指示与下一卡片相交。数值分轨失败已确认，实际遮挡仍需 rendered／packaged 验证。
- 新增现在为 13:00、13:01、13:59 的场景。现在线时刻标签仍处于小时刻度栏，尚无整点标签避让；应实际渲染确认并修正遮盖，不把它与事项分轨视为同一个问题。
- 验证三项及以上并行、相邻时刻和长标题在 640×520 下的卡片可读性。当前等分列宽且隐藏溢出、时间不换行；存在时间与正文被裁切风险。以完整可见矩形、可识别标题和独立点击目标为依据，不以轨道数量正确判定通过。
- 与 01 的卡片几何修复集成后再确认密集排布；01 对普通 45 分钟范围的修正可能改变相交区间。补齐真实 packaged 中英文宽／窄截图与独立读图证据。

## 旧双栏候选检查记录（已被上方新方向覆盖）

以下勾选项和独立复核描述只记载旧双栏候选当时的工程证据，不代表满足当前要求或用户认可。

- [x] 明确重现两个 13:00 事项，分别显示可读名称与时间，点击目标独立，不重叠遮挡；同时覆盖 13:00 与 13:05、区间部分重叠、长短事项混排与三项以上密集内容。
- [x] 基于完整可见卡片／标签矩形进行避让，不能只按完全相同分钟或固定小偏移。短事项的最小可读尺寸与真实时长锚点分开表达，不夸大活动时长。
- [x] 现在标签与事项、小时标签不互盖；长文本、中文／英文和键盘焦点均能阅读、进入详情并返回，不靠 hover 才能识别事项。
- [x] 宽窗口和 640×520 窄窗口均验证列标题、卡片名称、未知时间区、滚动与定位现在；可以有受控滚动，但不能把 A 的核心卡片信息隐藏。
- [x] 先建立针对真实渲染的失败证据，再修复；对可见文本、卡片边界和点击目标碰撞做有意义回归。仅 aria 属性、字符串快照或数值分轨测试不足以验收。
- [x] 每个代表场景都有 packaged App 截图与人工视觉检查记录；用相同数据／窗口说明结果，保留失败前截图。实现者自检后应完成独立视觉复核；对外报告候选待用户验收，不把自动化通过写成用户认可。

- [x] 实现者逐项自检后，由独立审查者核对实际 packaged App 与 A 的可见差异；审查应读图，记录结论及证据，不能只依据实现者的通过声明。
- [x] 在本票和 map 记录实现提交、候选构建身份、自动化证据、packaged 对照截图与独立复核结论；只勾选有证据的项。仍有关键视觉偏差或缺少直接 packaged 证据时不得 resolved。工程验收完成仍须明确“候选待用户验收”，不能声称用户认可。

### 2026-09-23 双栏候选历史（已被最新单列方向覆盖）

状态仍为 `claimed`。本轮在 `codex/historical-habit-corrections` 从基线 `79fdcd394357936f17c2a5aca489a82e65ff6050` 继续实施，复用票 01 已集成的双栏卡片和真实时间范围。用户在票 01 仍待验收时明确要求继续实现本票；本轮没有把票 01 标为验收通过。候选包通过本票 packaged 检查；实现 commit 为 `6166fcaa7d8d015e30f152ae0fbff5522d3cfdbe`。候选仍待用户验收，不是用户认可或 `resolved`。

- 改动：以卡片完整可见矩形和真实区间共同安排分轨；短事项的最小可读标签与真实时长锚点分开布局。避开“现在”标签与整点刻度。按实际 lane 类型生成事实／安排标签。窄屏改为横向滚动访问完整事实栏，并将未定时事项入口放入固定图例栏；激活入口后把内容滚到固定栏下方可见。无依赖或外部服务改动。
- 打包身份：`CARGO_TARGET_DIR=/tmp/pd-timeline-a-ticket02-final npm run build:mac`；app executable SHA-256 `ad32ff10db1901dcc872d60fc8cb29afb3a59a3e693ead53cf7b5b9f5cb48153`；`Contents` manifest SHA-256 `cf82702ddd7fb13adee336d3fcae16fc50a83436b42a596a27fce64fada33791`。候选位于 `/tmp/pd-timeline-a-ticket02-final/release/bundle/macos/Personal Dashboard.app`。构建未完成 Apple notarization（本机无签名凭据）；本记录仅证明本地 packaged 候选。
- 渲染回归：`today-time-axis-overlap` 使用隔离合成记录和固定 13:00、13:01、13:59 时间。候选覆盖中文／英文和 1120×760／640×520；验证卡片及 hit target 几何、真实区间、Now／小时刻度、鼠标和键盘打开详情、事实栏横向滚动，以及定位现在后窄屏入口仍可见并能打开完整未定时安排／事实区。未定时面板检查了精度说明，记录 SHA-256 `7c77925b9c05a7905cc78babadc01972ab59f4ff47e5e06dffeb175e4149dbe4` 在运行前后不变。候选截图：`/tmp/pd-timeline-a-evidence/ticket02-candidate-20/`。
- 配对失败证据范围：保留的同一隔离合成 fixture、同窗口和同固定时刻的基线图及候选配对为中文 1120×760、13:00（`ticket02-baseline-final/today-time-axis-overlap-zh-wide-13-00.png` 对 `ticket02-candidate-20/today-time-axis-overlap-zh-wide-13-00.png`），以及英文 640×520、13:01（`ticket02-baseline-final/today-time-axis-overlap-en-narrow-13-01.png` 对 `ticket02-candidate-20/today-time-axis-overlap-en-narrow-13-01.png`）。补充的英文宽屏和中文窄屏仅作为候选矩阵检查，不声称有相应的基线配对。候选 A 卡片参照截图 `/tmp/pd-timeline-a-evidence/prototype-A-1120x760-14-10.png` 为原型自身数据；用于读图核对 A 的双栏色彩、共同刻度、现在标记和侧栏层次，不冒充相同数据的对照包。
- 独立规范复核：审查者逐图检查候选 20 与冻结 A 参照，确认计划／事实层次、颜色、共同时间尺、现在标记、密集卡片、事实栏横向访问和两种窄屏未定时入口均可读，无实质 A 冲突。复核者又检查了上列 paired-evidence 范围，确认两组代表性同 fixture／窗口／时刻的配对满足本条，英文宽屏与中文窄屏明确是补充候选检查。本结论是独立候选视觉复核，不是用户验收。独立 Standards 复核未发现硬性标准问题；初始 lane 字符串 concern 已通过 `TodayAxisLaneId` 消除。
- 自动化：`node --test tests/frontend/today-time-axis.test.ts` 9/9；`npm run build`；`bash -n scripts/acceptance/macos-ipc-workflow.sh`；`swiftc scripts/acceptance/macos-ui-driver.swift -framework ApplicationServices -framework AppKit`；完整 `cargo test --manifest-path src-tauri/Cargo.toml` 均通过。`npm run test:frontend` 有一项外部契约失败：`tests/frontend/daily-flow-integration.test.ts:79` 仍要求安装在 canonical workspace 的 life-daily-loop skill 含 `## Personal Dashboard Tasks`，当前该外部 skill 结构不含该标题；定点重跑复现同一断言。本票未修改该 skill 或该无关测试。票 01 的 `today-time-axis-a-cards` 也在同一候选包通过，截图在 `/tmp/pd-timeline-a-evidence/ticket01-candidate-final/`。
- 人工视觉检查：实现者检查了基线两图、候选中文宽屏密集图、中文窄屏图、英文窄屏未定时区及 A 参照。独立审查者另行读取候选截图。Plan/fact 色彩、时间标签、重叠卡片与未定时项名称和精度尾注可见；窄屏图例／入口保持在固定位置，入口可把完整未定时区移入视口。宽屏候选时间图可视区约 10:00–18:00，原型约 11:00–16:00，二者小时间距相近；这是刻度展示范围差异，不是裁掉全天可达性。
- 用户验收边界：ticket 01 和 02 都保持 `claimed`；工程候选完成不代表用户接受。`map.md` 的候选及基线登记不会触发 Management 对账，因为未发布、未声明完成或堵塞。

## 执行边界

修复现有时间轴，不重建解析／存储，不重做已完成的历史习惯票，不新增服务或依赖，不操作真实个人数据。所有复现使用隔离合成 Vault；不得替换日常 App 或推送。宽／窄和中英文视觉证据须检查实际可见内容，不只是保存截图。

每票均包含自己的端到端检查；不另设末尾才补视觉验证的票。A 为最终参考，不重新发起设计选型。旧父票保持原记录，新票发布后通过新 map 明确视觉修复未完成。


执行前核对当前 checkout、构建身份及未提交改动，保留其他任务工作。修复应从有界的失败复现开始，不能直接覆盖正在进行的时间轴修改。若具体集成冲突阻碍执行，记录实际阻碍，不凭共享文件虚构功能依赖。
