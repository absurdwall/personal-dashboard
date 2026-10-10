# Personal Dashboard 体验原型

问题：宽泛的计划与精确 Task 能否放在同一日程里更好地阅读？协作页如何减少重复标题和说明，并让 `/retro` 入口可发现？

2026-10-10 用户授权原型探索。**待用户过目，尚未选定方案或批准产品实现。** Personal Retro 的现有功能得到用户认可，本轮不改其内容流程。

## 运行与选择

```sh
npm run prototype:experience
```

服务器只监听本机，终端会打印空闲端口的 URL。一个页面通过 `?page=today|tasks|calendar|collaboration&variant=A|B|C` 切换。底部按钮或不在输入框内的左右方向键改变方案；URL 保留选择。全部数据是虚构示例，无网络账户、Vault、模型、麦克风、Tauri 或持久写入。

| 方案 | Today | Tasks | Collaboration | Calendar |
| --- | --- | --- | --- | --- |
| A 现有结构减负 | 延续已接受的计划／事实双栏，加入宽泛时段 | 保留任务说明 | 集中对话，会话与背景按需打开 | 月历与日期摘要 |
| B Agenda 优先 | 上午／午后／晚间先读，精确时间轴按需展开 | 简洁列表与独立详情 | 会话列表与对话两栏 | 月历充分利用宽度，摘要在下方 |
| C 时间轴工作台 | 可拖动 Task、从待安排区拖入、空白选区创建 | 按日期分组的卡片对照 | 宽窗口三栏，窄窗口背景换行或收起 | 月历选择器与日期 Agenda |

这是现有页面的替代渲染原型，沿用仓库 `.scratch/.../prototype` 静态入口惯例；外壳 DOM 和 `/__app/styles.css` 来源于当前产品 `frontend`。服务器只读产品 CSS，所有行为在原型适配器中。它不进入生产构建，底部切换器也不会出现在安装版。

## 可以亲手试的动作

- 在 Today 的时间轴拖动精确 Task；上午／午后／晚间计划只能改宽泛时段。已记录事实不接受拖动，早间基准独立保留。
- 在时间轴右半栏空白位置拖出至少 15 分钟，填写 Task 名称并添加。此处为 08:00–20:00 的示意窗口，不替换正式 04:00–次日04:00 lived-day 契约。
- 在 Tasks 快速添加，完成／重新打开，或打开详情修改日期与时间；同一内存 Task 在其他页面反映变化。
- 在 Calendar 比较两行／四行预览，内容超出时显示剩余项数；点日期打开详情。
- 在协作输入 `/` 或 `/r`，用 Tab、Enter 或点击补全 `/retro `。只插入消息，**不自动发送**；Escape 关闭；普通句子里的斜杠不触发。当前确认可用的 slash 入口只有 `/retro`，没有虚构其他命令。
- 命令补全是可发现的消息入口；正式 Personal Retro 仍由现有 usage skill 和同一模型理解，不增加独立 Agent、硬编码业务路由或开发命令。
- Evening 的“开始今晚复盘”带日期与可编辑草稿进入协作，等待用户发送。
- “演示状态”查看当前方案、任务、安排、基准、事实、草稿和注册命令；“还原”恢复内存示例。

## 尚待决定的语义

现有 Task 只有一个可选日期与时间，尚无持久时长字段。原型中的区域长度是合成体验窗口，用于检验 Outlook 式选区是否值得做；不能当作现有数据契约或真实工作时长。接受交互后再明确 duration 或 time-window 的业务归属与保存方式。

Morning baseline、current arrangement 和 confirmed facts 延续 [CONTEXT](../../../CONTEXT.md) 的独立身份。不要把宽泛时段自动解释成精确起止，也不要以时间经过推断完成。

## 来源、复核与状态

- 基线：`45dceaef`，安装／实际 Retro 执行产品 `cb3d09f5`；相关产品源码相同。此前已接受的双栏时间轴仍是 A 的基础，新探索未覆盖旧验收结论。
- 相关设计记录：[Collaboration spec](../../personal-dashboard-collaboration-redesign/spec.md)、[ADR 0006](../../../docs/adr/0006-use-skill-led-conversation-for-collaboration.md)。本轮不新建实现票；后续实现票应链接本原型分支。
- 原型保存分支：`codex/dashboard-experience-prototype`。方案 verdict：**等待用户审阅**。没有产品修复、安装、GitHub/main 合并或发布。
- 用当前浏览器实际验证了 Task 10:00→11:00 拖动、10:00–10:30 选区新增、基准回看、Evening 带草稿；`/retro` 补全不发送，Escape／普通斜杠／未知命令关闭匹配。
- 900px 的 4 页面×3 方案均无文档横向溢出；另检查 640px 主要布局。截图及 DOM 测量是原型显示证据，不是 packaged app 验收，临时文件在 `/tmp/pd-experience-preview.noindex/`。
- 当前 Workflow Retro 的明确修复候选：历史读取参数遗漏 `domain/fromDate/toDate`；reader 的 `sk-` 子串过滤误伤普通 Task 链接；报告标题未被 Markdown renderer 识别。重复读取仍是候选，单次数字表述错误作为内容质量观察。此次只核查，不实施。
