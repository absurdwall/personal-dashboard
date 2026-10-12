# 本轮原型选择与范围纠正 · 2026-10-11

## 用户反馈及纠正

先前用户说“这里面A好”，当时只看了 Today。Agent 在提交 `a8bf50e` 中误将它记为整体 A 首选；这一解释已被用户明确纠正。本记录替代那一范围判断，Git 历史保留原记录。

最新明确反馈：

- “Today 的话 A 好，Tasks 的话 B 好”。
- Habits 按当前 Personal Dashboard 的 Habits 主界面继续；点击左侧某个 Habit 后，才显示更细致的详情。原型默认进入单项详情并更换主结构，与用户想法不同。
- Calendar 不选布局变体；保持现有正常结构。初稿的日期回顾标签/折叠差异，与本轮想改的内容无关。

## 当前设计依据

| 页面 | 已确认方向 | 本轮边界 |
| --- | --- | --- |
| Today | A：紧凑概览＋就近浮窗 | 保留日视图、按需放大、拖动和独立早间基准 |
| Tasks | B：Content 优先，紧凑属性在下方 | 保留清单＋详情右栏；其他页面 Task 浮窗复用此编辑结构 |
| Habits | 保留当前“左侧本周摘要＋右侧每日锚点/今日习惯列表” | 新增、编辑、停用恢复等既定要求保留；左侧选中后才展现详细统计。修订版暂在右侧切换详情并提供返回入口，具体细节仍待用户过目 |
| Calendar | 保留当前“月历＋右侧日期回顾＋下方当天任务” | 不再比较 A/B/C；只在原结构上展示已确认的顶部新增、所选日期预填、任务详情浮窗和轻量节日标注 |
| Collaboration | 尚未选定 | A/B/C 仍可比较；不能从 Today 选择推导协作选择 |

四项已确认语义继续有效：取消 Task 时间保留日期；宽泛安排主动拖动后成为近似时刻；每周 Habit 统计不同达标天；目标修改下周期生效。完整要求仍以本轮 brief、clarifications 和 CONTEXT 为准。

## 修订实现与来源

- 分支：`codex/dashboard-experience-refinement`
- 初稿候选快照：`a9f2fc4`；错误的整体首选记录：`a8bf50e`。
- 当前入口：`prototype/refinement-prototype.html`。Today 固定 A，Tasks 固定 B，Habits/Calendar 用 `variant=current`；浮动条明确各页状态。
- 修订覆盖层：`prototype/correction-prototype.js/css`，保留初稿代码和合成状态复用。
- 初稿对照入口：`prototype/comparison-prototype.html?variant=A|B|C`；旧 R：`prototype/revised.html?variant=R`。
- 用户提供的 Appshot、当前 App 的只读结构核对，以及 `frontend/index.html` 的 Habits/Calendar 宿主结构用于布局依据；没有把真实 App 数据或截图存入原型。
- 操作指南：`prototype/REFINEMENT-README.md`；修订检查：`prototype/CORRECTION-CHECKS.md`。

这是逐页选择及原型修订依据，尚未编写或发布 Lenspec、tickets、PR，也没有自动实现、打包或安装候选。
