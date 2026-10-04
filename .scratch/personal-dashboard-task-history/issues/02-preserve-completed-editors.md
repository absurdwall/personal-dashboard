# 02: 保存 Today 记录时保留已完成 Task 编辑器

Status: resolved
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

修复 PR 已通过独立复审并完成合并／日用安装。04:00 使用可控时钟回归验证，未进行实体睡眠／唤醒测试。

## Answer

修复与独立复审完成：[PR #44](https://github.com/absurdwall/personal-dashboard/pull/44)，审核提交 `fb8785369b21d14a177282dfea86f62c9a0241a4`。复审聊天“Review voice input options changes”在 2026-10-03 确认 Standards／Spec 均通过，独立重跑 10 项回归检查且无剩余可执行问题。

修复／复审最初完成后，用户在审核聊天明确授权合并和交付；实际合并与安装证据如下。

## Delivery

2026-10-03 用户在审核聊天授权合并／交付。PR #44 合并为 `a79b9ab5ca269158a79d0237ee4443b4667f7d67`，合并树与复审提交一致。由合并提交重新构建并安装 `/Applications/Personal Dashboard.app`，版本保持 4.0.4；程序 SHA-256：`a79d7f2da9f0ca23f975fcd5aa78227009a9c6acd9863d65a70ad8ce001efb43`。

重启后只读确认当前真实 Vault 加载、3 待办／6 默认折叠历史。5,948 个受检文件中 5,947 哈希一致；70 个 Vault 文件（含 29 个 Daily Record）、4 个顶层设置文件以及嵌入 Codex profile 均一致。仅协作状态文件被既有启动逻辑重新序列化；29 个保存会话仍可读取，未宣称该文件字节不变，未发起协作操作或真实 Task／记录写入。

旧程序保存于 `Documents/Codex/backups/personal-dashboard-before-editor-fix-2026-10-03.zip`，压缩包及还原后的全部 5 个程序包文件均验证。Spotlight／Launch Services 仅保留 `/Applications/Personal Dashboard.app` 为可搜索安装。修复 worktree 已归档，修复分支已清理；其他聊天的活跃分支与语音工作保持。实体睡眠／唤醒仍未测试。
