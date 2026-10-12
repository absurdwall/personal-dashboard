# 用户反馈修订检查 · 2026-10-11

修订触发：用户明确 Today A、Tasks B；Habits 保留现有主界面，左侧选中后才看更细详情；Calendar 不选无关布局变体。

直接浏览器体验，无原型测试、产品 build、打包、安装或真实数据变更。

## 已核对

- 根据用户 Appshot 和当前 App 的只读布局，以及 `frontend/index.html` 的宿主结构，保留 Habits 左侧摘要、右侧每日锚点/今日列表；Calendar 保留月历、右侧日期回顾和下方当天任务。实际 App 的个人数据和截图未保存到原型。
- 默认进入 Habits：存在今日列表，单项详情数量为 0。点左侧活动身体：右侧才出现详细统计，左侧摘要保留；返回后恢复今日列表。
- 既有行内“展开”保留近期历史入口；详细统计与编辑/创建/打卡/停用恢复仍复用前一轮的内存模型。
- Tasks 导航自动到 `variant=B`；任务编辑为标题、Content、下方属性。Today 自动 A，跨页面 Task 浮窗复用 B 的 Content 优先编辑。
- Calendar 无变体切换，URL 为 `variant=current`。选 12 日，顶部 ＋ 的创建浮窗读回 2026-10-12；点击该格 Task，打开可编辑详情浮窗并关闭。当天 Task 保持在月历下方，右侧没有改成 Task 列表。
- 协作仍标记“待选”，切换可用。Today 选择不再推导全页 A。
- 1280×800、680×560 核对：Habits 默认/选中详情和 Calendar 结构。窄窗口仍保留左侧摘要与右侧内容，近期七日行重新排布；无水平溢出。Calendar 在工作区内部滚动，日期格等高、右侧回顾独立滚动。

截图：`refinement-checks/correction/habits-overview-<size>.jpg`、`habits-selected-<size>.jpg`、`calendar-current-<size>.jpg`，共六张，均是合成数据。

## 当前状态

Today A、Tasks B 已由用户明确选择。Habits/Calendar 的宿主结构已按明确纠正修订；右侧详情具体形式仍供用户过目。Collaboration 未选择。没有 Lenspec 或产品验收结论。
