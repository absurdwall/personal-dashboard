# 02: 保存 Today 记录时保留已完成 Task 编辑器

Status: claimed
Type: task
Blocked by: None

## What to build

修复 PR #42 后续复审发现的 P2：Today 保存普通或运动记录时，已完成历史重新关闭、编辑器消失，导致跨日守卫不能识别尚未提交的完成记录更正。向历史渲染传递已打开 Task 身份，分页之外的活动编辑器也须恢复。

## Evidence

- 修复前两项真实生产函数 seam 测试均失败：保存普通／运动记录后历史未保持打开。
- `renderToday` 捕获编辑器身份，但 `renderTodayTasks` 未向历史 renderer 传递。

## Implementation and validation

- 保留历史展开状态及活动编辑器，将首批 30 项与页外活动 Task 合并并保持日期顺序。
- 继续分页复用同一编辑器；查看更多计数排除已恢复的页外 Task。
- 回归执行生产 note-save、Today render、draft capture 和 clock guard；65 项历史中编辑第 35 项，保存两种记录后保留日期更正，04:00 不替换正在编辑的日期。
- 全部 202 项前端测试、TypeScript 构建和 Mac release App 构建通过。
- 隔离原生候选包中，实际完成日期草稿 2026-10-01 在运动记录及普通记录保存后保持可见，历史和详情仍展开。未提交该 Task 更正，合成 Task 正本保持原完成证据；普通／运动记录写入合成 Daily Record。

修复 PR 待复审，保持未合并；日用安装仍为 PR #42。04:00 使用可控时钟回归验证，未进行实体睡眠／唤醒测试。
