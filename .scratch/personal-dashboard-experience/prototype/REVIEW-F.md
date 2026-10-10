# Personal Dashboard 最终候选原型

问题：在保留现有 App 结构的前提下，混合时间精度的计划、清晰勾选、命令补全和晚间入口是否符合用户需要？

2026-10-10：用户认可 `/retro` 补全、Evening 入口和清晰勾选框；要求保留 Tasks 清单侧栏与 Calendar 右下角复盘标记，不把 Tasks 改成时间轴工作台。**本轮已按反馈收敛为一个最终候选，整体仍待过目，未批准产品实现。** Workflow Retro 不属于本原型；Personal Retro 的内容流程保持现状。

## 运行

```sh
npm run prototype:experience
```

终端会打印本机空闲端口的 URL，打开 `/finalized.html?page=today&variant=F`。通过左侧导航逐页查看 Today、Tasks、Calendar、Collaboration。底部可以检查状态或还原示例。

全部数据是虚构示例，仅在内存中，无账户、Vault、模型、麦克风、Tauri 或持久写入。外壳与 `/__app/styles.css` 取自现有产品，只读 CSS；所有交互都由原型适配器实现，不进入生产构建。习惯页只是保留导航位置，不在本轮交互范围。

## 最终候选可以试什么

- **Today**：早间计划同时有 `08:00–10:00` 这样的具体时间与“午后”这样的宽泛时段。具体计划可以在同一上午内拖动，底边可改变结束时间；点击也可输入时间。重叠计划并排显示。宽泛计划单列为“具体时间未定”，拖进时间轴会打开起止时间编辑，采用后成为具体计划；也可直接设定时间、改成晚间或恢复宽泛时段。
- 白天调整当前计划，早间基准独立保留，事实不接受拖动。这个关系沿用 [CONTEXT](../../../CONTEXT.md)，不以时间经过推断完成。
- Task 保留精确拖动；时间轴右侧空白拖出至少 15 分钟可以新增 Task。上下边缘支持自动滚动，也提供直接输入时间。可操作示例窗口为 08:00–22:00，其他 lived-day 时段保留折叠说明；正式 04:00–次日04:00 契约没有更改。
- **Tasks**：保留清单侧栏与任务列表，增强勾选框对比度；可以快速添加、打开详情、完成或重新打开。同一内存 Task 在 Today 和 Calendar 中同步反映变化。
- **Calendar**：保留月份、所选日期摘要和日期 Task 列表。每日默认四行预览，可切换两行；右下角“记”表示有记录但尚无晚间复盘，“复”表示已有晚间复盘，无记录留空。示例只提供 10 月 10 日的详细记录，其他日期仅用于检验状态与选择。
- **Collaboration**：保留对话与会话栏，背景按需打开。输入 `/` 或 `/r`，用 Tab、Enter 或点击补全 `/retro `；只插入，不自动发送。Escape 关闭。当前已确认的命令只有 `/retro`，没有虚构其他可运行命令。
- **Evening**：点击“开始今晚复盘”，带日期与可编辑草稿进入协作，等用户发送。

## 仍需后续明确的数据语义

现有 Task 只有可选日期与时间，尚无持久时长字段。原型选区长度是合成体验窗口，不能当作现有契约或真实工作时长；接受交互后再决定 duration 或 time-window 的归属与保存方式。命令补全是现有 skill 对话的可发现入口，不增加独立 Agent 或硬编码业务路由。

## 复核与状态

- 基线 `45dceaef`；安装版与实际 Retro 执行产品 `cb3d09f5`。早间计划的 `period` 本来支持具体时刻或时间范围，已由 `src-tauri/src/today.rs` 的 `project_time_axis` / `explicit_time_expression` 复核。
- 浏览器实际验证：计划 08:00–10:00 → 10:00–12:00，结束时间 → 11:30，重叠并排与早间基准保留；宽泛计划拖入后确认 18:00–19:00；Task 10:00 → 11:00；空白选区新增入口；完成 Task 后数量和历史更新；四行预览与“记／复”；`/retro` Tab 补全不发送；Evening 带草稿进入协作。
- 检查 1280px、900px、640px 主要布局，没有文档横向溢出；浏览器截图在 `/tmp/pd-experience-preview.noindex/`。这是原型证据，尚未进行正式安装版验收。
- 保存分支 `codex/dashboard-experience-prototype`。只保存原型，没有产品修复、安装、main 合并或发布。
- 相关记录：[Collaboration spec](../../personal-dashboard-collaboration-redesign/spec.md)、[ADR 0006](../../../docs/adr/0006-use-skill-led-conversation-for-collaboration.md)。接受后再写有边界的实现规格与票。

## 历史探索

`index.html?page=today|tasks|calendar|collaboration&variant=A|B|C` 保留第一轮三个方案，便于追溯，**不是本轮最终候选**。它们包括了只按上午／午后／晚间移动的旧计划示例、不同 Tasks 和 Calendar 布局；这些内容已按用户反馈在 `finalized.html` 中收敛，不应继续作为实现依据。
