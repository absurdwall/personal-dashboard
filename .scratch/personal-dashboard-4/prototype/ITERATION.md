# Personal Dashboard 4.0 prototype iteration notes

## 用户纠偏

反馈很明确：当前 Personal Dashboard 已经有左侧导航、Today、Calendar、Habits；需要的是在这套界面里再加一个 Tasks 入口，而不是重新设计 Dashboard。

## 本轮修正

- 删除原先自定义 `pd4-app` 外壳的使用方式。
- 直接复制当前 `frontend/index.html`、`frontend/styles.css` 作为可运行原型基线。
- 在现有左侧 workspace navigation 增加 `任务`，并在同一 destination 区域加入独立 Tasks 列表。
- Today 的当天任务、Calendar 的日期任务和 Tasks 列表引用同一份合成内存任务状态。
- 保留少量 4.0 需要验证的细节：无日期、逾期、未来任务、晚完成、归档、`+N` 和历史日期；它们作为内容叠加，不改变全局布局。
- Tasks 左侧新增 `今日` smart view，与 `收集箱` 分离；今日视图按 `Task date = today` 自动汇总，不创建一个名为“今日”的普通清单。
- 新建任务的默认清单按入口决定：普通清单沿用当前清单，Today／收集箱／全局入口回到收集箱。
- 窄窗口 Calendar 月格保留最多两条短任务摘要并用 `+N` 收束其余任务；极窄时单行省略，右侧选中日期仍提供完整任务名。

## 当前验证问题

1. 左侧新增的 Tasks 是否像现有 Today / Calendar / Habits 一样自然，而不是产生第二套产品壳？
2. 从 Today、Tasks、Calendar 进入同一条任务并更新状态时，位置和状态是否容易理解？
3. 任务日期、实际完成日期、归档和放弃历史是否足够清楚？

## 固定边界

- 合成数据只留在浏览器内存，刷新重置。
- 不连接真实 Vault、Dida365、MCP、Agent 或自动化。
- 不进入 production spec、issue tracker 或 packaged acceptance。

## 阶段性结论（2026-09-17）

- 用户确认：当前版本可以作为 Personal Dashboard 4.0 的原型；整体壳层、Tasks 入口、`今日` smart view／`收集箱` 默认归属，以及日历任务摘要均暂时符合预期。
- 该结论只收口原型方向，不代表生产实现、真实数据接入或 packaged acceptance 已开始或完成。
