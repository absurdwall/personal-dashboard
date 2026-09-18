# 4.0 原型认可与规格输入

日期：2026-09-17
用户在原型任务明确表示 “I can take this as our prototype for now”，随后在规划任务要求核对并向前推进。作为阶段性视觉／交互基线接受，不声称全部生产行为已验证。

## 固定来源

- 任务：Personal Dashboard 4.0 prototype iteration，01a0ad96-63cf-7bc3-85f7-fe1bb33cdc91。
- 本地捕获分支：`codex/personal-dashboard-4-prototype`；提交：`501e5f7`。未推送，未合入产品分支。
- 工作目录：`/Users/tingranwang/.codex/worktrees/05ab/personal-dashboard`。
- 原型相对目录：`.scratch/personal-dashboard-4/prototype/`，含 README、ITERATION、HTML/CSS/JS 和启动器；提交同时包含唯一的 prototype 启动脚本改动。
- 当前服务：`http://127.0.0.1:62008/`；重新运行 `npm run prototype:dashboard-4` 时端口可能改变。

## 用户迭代后的决定（优先于早期原型）

1. 原先另画 Dashboard 外壳被明确否决。现有生产 toolbar、sidebar、Today、Calendar、Habits 是基线；只增加 Tasks destination，不将原型的 Habits 简化实现搬入生产。
2. Tasks 内“今日”是自动汇总，不是清单；“收集箱”是没有归入其他清单时的默认归属，不能等同今日或无日期。
3. 从普通清单新建，默认当前清单；从今日／Today／全局入口新建默认收集箱。
4. 月格要显示任务文字摘要，通常两条加 +N；窄窗口可以省略文字，不能退化成纯状态点。右侧保留完整任务。

## 本轮直接核对

浏览器打开最终原型，观察 Calendar 与 Tasks 的实际截图和可访问结构；确认生产壳层、9 月 6 日两条摘要/+3/右侧五项、Tasks 今日自动视图、从今日新建默认收集箱。只打开并取消新建表单，没有写入任务。合成今天为 9 月 19 日，不是真实当前日期。

同时读取最终源码及迭代记录。+N 当前走日期选择和右侧列表，没有独立浮层；用户在本轮明确确认此行为，理由是 Dashboard 已有右侧栏。因此取消早期浮层要求，与原型一致。

其余原型简化点不能自动成为生产决定：
- Calendar 右侧任务是只读摘要；三入口编辑同一对象仍是正式交付要求。
- Tasks“今日”新建表单日期仍可为空；生产默认今天但可主动清除，避免保存后任务意外不在当前视图。
- Habit 示例显示两种名称和技术身份，并非完整语言切换实现；生产切换一个显示名，保持现有紧凑 Habits 和来源语义。
- 原型部分计数、英文标签和展示说明为示例；生产按实际筛选集合计算，固定文案双语，去掉调试文案。

未运行完整回归、未证明真实保存／重启／同步／Agent 接线，未进行 packaged Mac 验收。本轮不因这些原型简化重新开启大范围 UI 迭代；在规格和交付验收中补齐。
