# 10: Prototype 视觉对齐返工

**What to build:** 按已认可的 Dashboard 4.0 prototype 重新整理生产 Tasks 的视觉结构与默认交互呈现；保留 01–09 已实现的任务身份、状态、清单、Today、Calendar、Habit 与外部流程语义，不重写这些行为票。

**Blocked by:** 01–09 的现有实现已在当前 checkout 中；本票是其后的视觉返工。

**Status:** resolved

Type: task

## 目标

当前 Tasks 把清单管理、范围 pill、状态 pill 和完整编辑器全部平铺在首屏，已经偏离认可 prototype。prototype 的视觉基线是：现有 Dashboard 壳层不变；Tasks 内部为左侧清单导航、右侧任务内容；任务默认以紧凑行呈现，详情和编辑按需展开；右侧内容使用一个轻量筛选控件。

## 验收标准

- [ ] Tasks 保留现有生产 toolbar/sidebar，并使用 prototype 的标题层级、间距和文案方向：`任务 · 独立清单`、`任务`、共享 Tasks/Today/Calendar 的说明。
- [ ] Tasks 主体恢复为左侧清单导航 + 右侧任务内容的两栏结构；左侧显示 All、Today、Inbox、用户清单与归档入口及数量，当前入口有清晰选中态。
- [ ] 新建清单、改名、归档、恢复仍可用，但默认首屏不再显示大块清单管理卡片；通过清单侧栏的轻量入口打开管理操作。
- [ ] 右侧任务工具栏只保留一个紧凑筛选入口，并继续覆盖现有状态筛选（包含已删除恢复视图）；移除默认可见的两排范围／状态 pill。
- [ ] 任务默认以 prototype 风格的紧凑行呈现：完成控件、标题、状态／日期摘要和轻量操作可扫描；完整名称、内容、清单、日期、历史和完成更正编辑按需展开，不改变任务身份或保存语义。
- [ ] `新建任务` 入口与新建表单按需出现，不在空白首屏堆叠完整编辑字段；从当前清单、Today、全局入口的既有默认清单／日期行为保持不变。
- [ ] Today 与 Calendar 的共享任务面板继续保留并复用同一编辑能力；本票只收回其视觉层级，不另造浮窗或第二份任务记录。
- [ ] 宽屏、窄屏和中英文均保持清晰：窄屏将 Tasks 两栏堆叠，不能横向挤压或退化为不可读的任务表单。
- [ ] 补充针对新结构的前端静态／行为检查，并产生一组当前生产 Tasks、Today、Calendar 的视觉截图；不把截图当作 persistence 或 packaged acceptance 证据。

## 执行边界

直接以 `/Users/tingranwang/.codex/worktrees/05ab/personal-dashboard/.scratch/personal-dashboard-4/prototype/` 的最终源码和 `prototype-review.md` 为视觉参照。不要把 prototype 的简化 Habits、演示数据或 fixture 逻辑提升到生产；不要修改真实 Vault、Daily Record、Dida365 或自动化时间；不新增依赖或外部服务。

## Answer

已完成 prototype 视觉对齐返工：

- Tasks 恢复为左侧清单导航 + 右侧任务内容的两栏结构，默认显示紧凑任务行与单一状态筛选；清单管理、新建任务和完整详情均按需出现。
- Today 与 Calendar 继续复用同一任务正本和共享任务面板；详情编辑在各自面板内展开，不新增跨页面浮层。
- 保留 01–09 的状态、完成记录修正、清单归档/恢复、Today/Calendar 默认日期、Habit 本地化与冲突草稿语义。
- 补充中英文、窄屏静态检查和 packaged acceptance；最终界面截图保存在 `output/playwright/personal-dashboard-4-final-20260918/`（8 张 PNG）。

验证：

- `npm run test:frontend`：95/95 通过
- `npm run check`：通过
- `npm run build:mac`：通过
- `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=dashboard-4 ... scripts/acceptance/macos-ipc-workflow.sh`：通过
