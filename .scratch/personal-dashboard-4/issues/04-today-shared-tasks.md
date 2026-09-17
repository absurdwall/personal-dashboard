# 04: 今日自动视图与 Today 任务栏

**What to build:** Tasks 的今日视图与 Today 常驻栏共享任务，按正确日期和清单展示及操作。

**Blocked by:** 02 任务状态与可恢复历史, 03 清单分类、归档与恢复

**Status:** resolved

Type: task

- [x] Tasks 中今日为按当前 lived date 跨未归档清单汇总的自动视图，不是任务可归属的清单；Inbox 不等同今日或所有无日期任务。
- [x] Today 保留左阅读／时间轴、右侧任务及其下方 Daily note；显示当天任务并单独呈现未归档的逾期待办，已放弃／删除不进入日常待办。无日期不自动塞入今天。
- [x] 从 Tasks 今日／当前 Today 新建默认今天和 Inbox；历史／未来所选日新建默认该日和 Inbox。允许保存前修改日期／清单，不因别处选择日期而把今日变成历史视图。
- [x] Today 与 Tasks 使用相同身份和操作，编辑／完成／放弃／恢复／改期即时反映；按日期及时刻判断逾期，计数匹配筛选；切日、跨日和切 Vault 不串结果。
- [x] 保留旧 Day task 文件并提供明确标注的只读历史入口，不自动迁移或解释为新截止日期；停止正常 4.0 页面对旧 producer 的竞争写入，不删除历史输入或真实数据。
- [x] 应用操作及必要前端异步回归覆盖跨页更新、入口默认、日界线、归档／逾期、旧数据读取与并发失败；实际 UI 核对布局与双语，不改复盘或无关 Markdown。

## 执行上下文

先读本 effort 的父规格、map、原型核对、项目领域词汇及适用 ADR；父规格保持不变。使用已包含全部前置实现的 checkout；仅有 resolved 状态不足以证明代码依赖已集成。认可原型是设计来源，不是可直接提升的生产代码。

沿用用户确认的应用操作测试边界及必要前端异步检查，每票保留自己的可演示结果；新增固定文案同步覆盖中英文。使用合成隔离资料，保留真实个人数据、旧文件及其他未提交工作。不新增依赖／外部服务，不复活 Exercise runtime。

本票已按用户明确的实现请求完成；以下证据仅覆盖合成 Vault、受控时钟、前端 seam/static 检查与编译检查。它不构成 packaged macOS、真实个人 Vault、Google Drive 云同步或 Dida365 验收，也未运行真实个人流程、写入滴答或改变自动化时间。

## Answer

- Today 现在从同一份 Vault Tasks 正本派生：Tasks 提供 `All`、`Today`、`Inbox`、用户清单和 `Archived` 范围；Today 按后端 lived date 聚合未归档的有日期任务，待办逾期项单列，未安排／放弃／删除／归档任务不进入日常栏。
- Today 右栏保留原有左侧阅读与时间轴，并在任务下方保留 Daily note；Today 与 Tasks 的新建、编辑、完成、放弃、恢复、删除、改期和完成记录修正复用同一 task id、target binding、revision 及 Tauri 命令。Today 新建按当前选中日期和 Inbox 初始化，保存前可修改日期、时刻和清单。
- Task view 返回后端控制时钟的 `currentDate` 与 `overdue`，按日期／时刻判定边界；切页、切日、切 Vault 或较新的 revision 会使旧响应失效，失败时保留可恢复草稿。旧 `day-tasks` 文件只读展示并明确标注，不接受旧 planning input、不迁移、不删除；正常 4.0 Today 读取不再触发旧 producer 写入。
- 新增 `today_shared_tasks_workflow` 合成 Rust 工作流，覆盖共享身份、归档／状态／逾期、日期时刻边界、旧文件字节保持和旧计划输入不写入；前端 seam/static 测试覆盖 Today 分组、历史日期、Today 范围、入口结构、布局顺序和中英文文案。
- 验证：`npm run check` 通过；完整前端套件 77 项通过；完整 Rust 套件 224 项通过；新增共享 Today Rust 工作流 2 项通过；目标 Rust 文件 scoped rustfmt 与 `git diff --check` 通过。
