# 06: 统一 Habits 整页的背景图面板

**What to build:** 用户启用自定义背景图时，为 Habits 的整个目的页内容容器增加与 Today、Tasks、Calendar 相同的单个浅色圆角外面板。该面板连续覆盖“本周习惯”页头、摘要、每日锚点、习惯列表与展开历史；保留标题底部分隔线，不给内部区块各自添加新卡片。

**Blocked by:** None

**Status:** resolved
Closed: 2026-09-27T04:52:09.922449Z

Type: task

## Acceptance criteria

- [x] 背景图 ready 时，Habits 的整个 `#workspace-destination-habits` 使用与 Today、Tasks、Calendar 相同的单个边框、圆角和半透明浅底，连续包住标题、摘要、每日锚点、习惯列表及展开历史。
- [x] 标题下分隔线保留；页面内部不新增分区卡片或重复外框。无背景图时不显示新增面板；其他页面与业务行为不变。
- [x] 使用正式打包 App 与隔离合成 Vault，在三种窗口尺寸检查 Habits 面板顶部、中段与展开历史状态，并与其他目的页作视觉对照；无背景状态亦逐尺寸检查。确认整页连续覆盖而非仅包标题。
- [x] 对既有 Calendar 800×640 控件等待超时和 Today-card 640×520 标签缺失做有结论的基线/最终归因；不得将截图捕获成功写成交互路径通过。
- [x] `npm run check`、相关聚焦验收、正式 macOS 构建与签名验证完成。安装并启动最终包后，Application Support 配置哈希不变；仅使用合成 Vault，不写入真实 Vault 或 Daily Record。
- [x] 代码审查完成，修正版 PR 合并，本票/地图与 Management 状态同步。

## Constraints

- 只调整 Habits 整页外面板的视觉边界；不为内部区块增加新卡片，不加标题，不改业务逻辑，不重设计其他页面，不添加依赖、外部服务或部署配置。
- 保留用户配置、个人数据、Application Support、`CONTEXT.md`、协作规划和外部 skills。
- 全局 Spotlight overlay 搜索不作为本票通过证据；沿用既有待用户手动确认状态。

## Comments

- 2026-09-27：已通过 Management native claim；canonical revision `ae3a742ad4b656f6`。

- 2026-09-27：根据用户授权创建本 follow-up。正式安装包使用已就绪的自定义背景图；该状态下 Today、Tasks、Calendar 由目的页容器绘制半透明浅色圆角面板，而 Habits CSS 明确让整页透明。验收先前在没有背景图的合成 profile 中观察时没有触发这一差异，因此基线已改用隔离 profile 和合成背景图重新捕获。实施应将面板仅画在 `.habits-header`，并保留下方透明区。

- 2026-09-27 收尾更正：用户要求避免继续扩张截图检查。经核对，`ready-captures3` 的三张 `bottom` 命名截图均不能作为页面滚动到底的证据；已撤回该项表述，不追加精确滚动截图。按用户收敛指示，三尺寸验收以顶部、中段、展开历史及带/无图对照为准；此前四页最终矩阵和组合路径结果保留为原记录，本轮不重复验证。

- 2026-09-27 收尾清理：临时验收进程已停止，正式安装进程 PID `80594` 保持运行；20 个 Ticket 06 临时 App 注册和整页修正 worktree 的 build App 注册已定点注销，App/截图文件均保留。Ticket 06 worktree 保持干净；其他历史临时注册和主工作区既有改动未触碰。

## Superseded delivery record — PR #9

PR #9 的 header-only 改动曾把面板限制在页头，并据此关闭本票。用户随后依据正式 App 截图拒绝该交付：统计、每日锚点和习惯内容仍直接暴露在背景图上，没有形成与其他目的页一致的整页容器。该完成结论已撤回；PR #9 仍是已合并的历史提交，但不满足下方修正后的验收范围。

原安装、矩阵、测试限制、PR #9 merge commit `5d0aee6658d00a756671e1cc738df1b07ff39b62` 与 Management 关闭/摘要收据留作历史记录。纠正范围不要求改业务逻辑；新的整页覆盖验收仍待完成。

### Corrected scope — 2026-09-27

用户明确要求整个 Habits 目的页在背景图 ready 时使用单个外层面板：包括标题、周摘要、每日锚点、习惯列表与展开历史；标题下分隔线保留，内部不增加独立卡片，无图时不显示面板。此前 header-only 验收结论不作为本次验收证据。另需复现 Calendar 800×640 与 Today-card 640×520 两个旧交互失败，并比较改前/改后证据以判断是否由本票引入。

## Answer

已完成 Ticket 06 的修正范围。PR [#10](https://github.com/absurdwall/personal-dashboard/pull/10) 已合并，merge commit 为 `c793e9f8f20e0b9015cea8a8d1818e80f4cd5184`；此前 PR #9 的 header-only 结果保留为 superseded 历史记录。代码仅在 `frontend/styles.css` 将 `#workspace-destination-habits` 加入现有背景图 ready 状态的共享整页面板规则，并移除 Habits 的透明覆盖及页头专属面板。标题分隔线保留；无图状态、内部区块、其他页面及业务逻辑不变。

验收：`npm run check`、`npm run build:mac`、`git diff --check`、acceptance shell 语法检查和 Swift UI driver 类型检查通过。正式候选为 `com.tortillaflat.personal-dashboard` 3.0.4，可执行文件 SHA-256 `4b90971849b84f9fea436d5dbcf48c4424415959a405b96a9aa54d6cc6d40110`；`codesign --verify --deep --strict` 通过。隔离合成配置下使用最终打包 App 检查了 Habits 背景 ready 与无图状态、三个窗口尺寸的顶部/中段/展开历史，以及最终四页截图矩阵。收尾时发现 `ready-captures3` 中名为 `bottom` 的截图并未证明滚动到页面末尾：960×720、800×640 与中段截图相同，640×520 仍位于页面中段。因此撤回“已验证页面底部”的说法。按用户要求收敛检查，不再追加精确滚动到底的截图或重跑矩阵；此次视觉验收范围记录为顶部、中段、展开历史和带/无图对照。此前记录的四页 12 张矩阵及组合路径 `today-refresh`、`today-shared-task-axis`、`today-unlocated-panel-layout`、`readable-task-cards` 保持为先前验收结果，本次没有重跑。截图及合成 fixture 保留在本机，没有加入 PR。

旧 Calendar 800×640 控件等待超时与 Today-card 640×520 标签缺失均未在原安装基线或最终交互验收复现；最终路径中的真实导航/卡片动作和滚动断言通过，结论不基于截图捕获本身。Standards 与 Spec 双轴代码审查各为零项发现。最终 App 已复制至 `/Applications/Personal Dashboard.app` 并启动；安装后主程序哈希与候选一致，Application Support 五项配置哈希与安装前清单一致，替换前的 3.0.4 App 已保存于 recovery。验收只使用隔离合成 Vault，未写入真实 Vault 或 Daily Record。未运行全局 Spotlight overlay；既有待用户手动确认状态继续有效。本票关闭后停止，不启动下一票。
