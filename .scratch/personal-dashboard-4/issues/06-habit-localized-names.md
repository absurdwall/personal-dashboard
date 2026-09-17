# 06: Habit 名称中英切换

**What to build:** 习惯在现有紧凑页面按界面语言显示名称，历史和来源身份保持同一份。

**Blocked by:** None (can start immediately)

**Status:** resolved

Type: task

- [x] 以稳定 Habit 身份配置中文／英文显示名，存于 Vault 的配置且不作为可被外部观察快照覆盖的数据；不以名称模糊匹配身份。
- [x] 语言切换展示一个对应名称，缺少译名回退现有／原始名称；不复制习惯或完成历史，不翻译任务正文、日记及用户记录。
- [x] 保持现有 Habits 紧凑布局、目标展示、完成合并、来源解释及历史更正；不要直接采用原型简化的 Habits 行或技术身份文案。
- [x] 从已有 catalog／配置提供名称，不新增 Habit 创建、目标编辑或在线翻译服务；创建与目标管理仍属 4.1。
- [x] 验证双语切换、缺译名、快照替换、重新加载／重启、Vault 隔离、损坏配置与旧 Vault 兼容；变更不丢既有名称／本地完成，界面可直接演示。

## 执行上下文

先读本 effort 的父规格、map、原型核对、项目领域词汇及适用 ADR；父规格保持不变。使用已包含全部前置实现的 checkout；仅有 resolved 状态不足以证明代码依赖已集成。认可原型是设计来源，不是可直接提升的生产代码。

沿用用户确认的应用操作测试边界及必要前端异步检查，每票保留自己的可演示结果；新增固定文案同步覆盖中英文。使用合成隔离资料，保留真实个人数据、旧文件及其他未提交工作。不新增依赖／外部服务，不复活 Exercise runtime。

本票已按用户明确的实现请求完成；以下证据仅覆盖合成 Vault、受控时钟、前端 seam/static 检查与编译检查。它不构成 packaged macOS、真实个人 Vault、Google Drive 云同步或 Dida365 验收，也未运行真实个人流程、写入滴答或改变自动化时间。仅 08 的范围允许定点修改实际 daily-loop 指引和接线。

## Answer

已完成 Habit 双语显示名称的生产接线。Vault 可选地保存
`life/.personal-dashboard/habit-names/v1/names.json`（schema v1），按稳定
Habit `key` 提供 `zh`／`en` 名称；外部 `habits-v1.json` 的 `name` 仍保留为
原始来源名称，快照刷新不会覆盖该配置，也不会通过名称模糊匹配身份。Rust
的 Habit 主视图与历史更正视图同时返回映射及配置状态。

前端在现有紧凑 Habits 列表、汇总、日期格无障碍标签、完成控件、展开详情和
历史更正中统一按当前 Mac 界面语言选名；缺少译名、旧 Vault 没有配置，或配置
损坏／不可读时回退原始快照名称。损坏配置只报告固定双语警告并忽略映射，不
隐藏有效快照、来源证据或本地完成。语言切换只重绘显示名称，不复制 Habit、
完成历史、目标、来源标签、Daily Record Markdown、任务正文或用户记录；本票
未增加 Habit 创建、目标编辑或在线翻译服务。

验证证据：

- `npm run check` 通过；完整前端套件 `npm run test:frontend` 84 项通过。
- `cargo test --manifest-path src-tauri/Cargo.toml` 完整 Rust 套件 241 项通过；其中 `habit_snapshot_workflow` 14 项覆盖稳定 key、缺译名、快照换名、重启、本地完成、历史更正、Vault 隔离、损坏配置与旧 Vault 兼容。
- `node --test tests/frontend/habit-localized-names.test.ts` 3 项通过；覆盖语言选择、回退和紧凑／历史渲染 seam；scoped `rustfmt --edition 2021 --check` 与 `git diff --check` 通过。

范围限制：本票未运行 packaged macOS Accessibility、真实个人 Vault、Google Drive、Dida365 或真实 daily-loop；宽窄窗口、键盘和双语的最终生产演示仍由 ticket 09 验收。没有写入真实 Daily Record、滴答或改变自动化时间。`tortilla-flat-management` 的本地 skill/helper 仍未安装，发布后的管理面板 reconcile 为 setup required，未创建 Registry 或推断工作区绑定。
