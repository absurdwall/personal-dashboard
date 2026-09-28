# 05: 精简 Calendar 页头并统一 Habits 分隔线

**What to build:** 移除 Calendar 主标题上方重复的“历史回看”说明，并确保 Habits 页头与下方内容之间复用四页共享分隔线。

**Blocked by:** None

**Status:** resolved

Type: task

## Acceptance criteria

- [x] Calendar 不再显示“日历 · 历史回看”eyebrow，且删除对应的英文显示；Calendar 可访问名称与主标题仍保留。
- [x] Habits 页头底部使用与 Today、Tasks、Calendar 相同的共享分隔线规则；不重复绘制边框，也不改变其他 Habits 区域分隔线。
- [x] 用真实打包 Mac App 在 960×720、800×640、640×520 核对 Calendar 与 Habits 页头；最终页面矩阵同时检查 Today、Tasks 无回归。
- [x] 构建、聚焦验证、最终打包签名、安装与启动均记录；只使用合成验收资料，不写入真实 Vault 或 Daily Record。

## Constraints

- 只处理上述两个视觉细节；不重设计页面、不改业务逻辑、不添加依赖或外部服务。
- 保留现有用户数据、Application Support、无关 `CONTEXT.md`、协作规划文档及外部 skills。
- 全局 Spotlight overlay 搜索不作为本票通过证据。

## Comments

- 2026-09-27：根据用户明确授权创建本 follow-up。已安装 3.0.3 的合成 Vault 四页矩阵显示 Calendar eyebrow 存在；Habits 分隔线在三种尺寸下实际可见，但 CSS 同时在 `.habits-header` 和共享 `.destination-page-header` 声明了同一条底边。实施时移除重复声明，保留共享规则，并在最终打包包复核实际渲染。

## Answer

已完成本票。Calendar 删除中英文 eyebrow 文案 `calendar.historyRecall`；保留 `calendar-heading` 主标题和可访问名称。Habits 删除 `.habits-header` 的重复 `border-bottom`，由共享 `.destination-page-header` 规则绘制页头与内容之间的分隔线，其他 Habits 区域分隔线未改。

**正式打包验收：** 3.0.4，Bundle ID `com.tortillaflat.personal-dashboard`，主程序 SHA-256 `87a820473acf61e12d6b86544c343c156645ae2438f42f0b7c328385da4e2476`；`codesign --verify --deep --strict` 通过。`readable-task-cards` 和 `interface-language` 合成场景均通过，并分别断言中文与英文 eyebrow 不存在。最终包的 Today、Tasks、Calendar、Habits 四页矩阵在 960×720、800×640、640×520 共 12 张截图逐张目视检查；截图保留在本机，未加入 PR。Calendar 三尺寸均直接显示主标题；Habits 仅显示共享分隔线；Today/Tasks 无矩阵回归，文档无横纵向滚动。测试资料未写入真实 Vault 或 Daily Record。

**构建、安装与保留：** `npm run check`、聚焦版本断言、`npm run build:mac` 通过；候选签名有效。本机没有 Apple notarization credentials，因此该包未公证。`/Applications/Personal Dashboard.app` 已更新并正常启动为 3.0.4，安装包主程序哈希与候选相同。更新前的有效签名 3.0.3 副本保存在 `.scratch/personal-dashboard-3.0.2/recovery/Personal Dashboard 3.0.3.app`。启动前后 Application Support 的五个文件哈希完全一致，清单保留在本机，未加入 PR。未修改真实 Vault 或 Daily Record。

**验证与审查：** 完整前端套件有一项既有仓库外契约失败：`life-daily-loop` skill 缺少 `## Personal Dashboard Tasks`；其余本轮目标断言通过，未改动该外部 skill。Spec 审查没有实现缺陷或范围外改动；Standards 审查未发现文档规范违规。PR [#8](https://github.com/absurdwall/personal-dashboard/pull/8) 已合并，merge commit `8246fa9eb186e8f2dfdd8e4f46109b5e262e0a5f`。全局 Spotlight overlay 仍按既有记录待用户手动确认，不计入本票。
