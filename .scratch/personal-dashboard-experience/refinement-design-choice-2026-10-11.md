# 本轮原型选择 · 2026-10-11

## 用户反馈

用户原话：“这里面A好。”

反馈时浏览器位于 `refinement-prototype.html?page=today&variant=A`。

## 记录的选择

A（一屏概览）作为本轮首选设计方向，后续 Lenspec 以本轮 A 原型为主要视觉与交互依据。用户未提出逐页混选；本记录保留整体首选，不将简短反馈扩大为各页面每项细节的逐项验收。

A 的候选呈现：

- Today：较大窗口紧凑日轴概览，按需精细放大；任务使用就近浮窗，保留背景滚动位置。
- Tasks：保持紧凑清单和详情右栏；紧凑属性在 Content 上方，打开详情聚焦 Content。
- Collaboration：消息独立滚动，展开背景位于消息与输入之间且自己限高滚动；语音转写在输入下方，停止后进入可编辑草稿，再由用户发送。
- Calendar：等高紧凑月历，右侧同时呈现当天计划和复盘；任务详情与顶部新增使用浮窗。
- Habits：左侧列表与详情，统计位于详情上方。

四项已确认语义继续有效：取消 Task 时间保留日期；宽泛安排主动拖动后成为近似时刻；每周 Habit 统计不同达标天；目标修改下周期生效。完整要求仍以本轮 brief、clarifications 和 CONTEXT 为准。

## 设计依据

- 分支：`codex/dashboard-experience-refinement`
- 候选快照提交：`a9f2fc4`
- 原型入口：`prototype/refinement-prototype.html?variant=A`
- 操作与比较指南：`prototype/REFINEMENT-README.md`
- 直接浏览器检查：`prototype/REFINEMENT-CHECKS.md`
- 保留的旧基准：`prototype/revised.html?variant=R`

这是原型方向选择记录。没有在本次反馈中编写或发布 Lenspec、tickets 或 PR，也没有自动实现、打包、安装候选。
