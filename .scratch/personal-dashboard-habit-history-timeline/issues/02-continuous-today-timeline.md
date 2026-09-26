# 02: 按 A 原型实现连续时间轴

**What to build:** Today 的当日情况读取实际 Daily Record，以已确认的 A 双栏连续时间轴展示左侧当前安排和右侧已确认事实；用户能直接读出事项在几点、现在处于一天何处，并定位当前时刻。

**Blocked by:** None (can start immediately).

**Status:** resolved

Type: task

## 已确认设计

依据本 effort 的父规格及原始反馈 02。原型分支 `codex/prototype-today-time-axis` 已退役；variant A 以归档 tag `archive/today-time-axis-variant-a-2026-09-25`（确认提交 `f9551de8500ba8d32b3732626e561b29856fd258`）保留，并收录于本机 `personal-dashboard-prototypes.bundle`。它是视觉／交互基准，不直接合并原型代码。用户明确要求停止 prototype 迭代；不实现 B／C、方案切换器、模拟时间滑块或演示数据。

左侧为 Current arrangement，右侧为明确已发生／已确认事实，两栏共享纵向连续时间尺。只有时段或没有明确时间的内容独立展示。保持现有 Today 导航、晨间基准与当日修订语义，不改成新日历产品或新增时间编辑器。

## Acceptance criteria

- [x] 先用合成 Daily Record 建立有具体时间、仅时段、无时间、计划与明确事实混合的回归场景，再将现有读取／解析、应用视图与 UI 接到 A 布局；不能以写死原型数据代替真实读取链路。
- [x] 左栏读取最新明确安排，不用 Morning baseline 或修订历史冒充当前安排；右栏只展示明确事实。保留原有依据、原始意图、变更原因、修订方向和 Short record 的阅读／更正入口，不丢失原文信息。
- [x] 明确起止时间按同一比例定位并表达持续时长；只有一个时刻的内容使用时点语义，不臆造结束时间。记录创建／修改时间不冒充发生时间，时间阈值达标不冒充实际活动时刻。
- [x] 解析仅采用明确且可验证的时间表达。仅上午／中午／下午／晚上、模糊时间、缺失或无法可靠解析的内容放入独立区，保留原文及时间精度；旧版或部分 Daily Record 仍可阅读，不强制迁移或补造数据。
- [x] 全天 00:00–24:00 均可到达，深夜内容不得被演示范围 06:00–23:00 截掉；以小时为主要刻度、分钟决定位置。当天初次打开与“定位现在”显示当前时刻附近，主动浏览其他时间后不被定时更新抢回。
- [x] “现在”线由与应用日期一致的本地时间驱动，至少每分钟更新；应用恢复前台时刷新。跨午夜后 Today 的日期与时间线一致；历史日期视图不叠加今天的“现在”线，也不因时钟变化切走用户选择的历史日期。
- [x] 同时段重叠事项、短事项、长文本和密集内容仍能辨识、查看完整信息；避让或最小点击高度不改变真实时间锚点，也不夸大事实持续时长。无记录时仍提供清楚时间参照和空状态。
- [x] 跨日时间范围保留原始日期语义与来源，当前日期仅展示对应片段并清楚标注延续，不复制完成事实；日期或夏令时歧义不得静默伪造成确定时刻。覆盖相关边界的针对性验证。
- [x] 宽／窄窗口保持 A 的计划／事实区分与共享时间尺，可读且可操作；中英文文案、键盘操作和内容读取均可用。不能仅靠颜色区分计划和事实。
- [x] 时间经过不会自动完成计划、推断事实或写回 Daily Record。保留晨间基准、用户正文与现有有边界更新操作；快照／文件重读后时间轴与新内容一致，切日及切 Vault 的晚到结果不得污染当前视图。
- [x] 完成时间映射、来源语义、时钟更新、切日及必要布局回归和相关项目检查；以隔离合成 Vault 在 packaged Mac App 验证真实读取到界面的链路、前后台恢复、跨午夜、历史日期、窄窗口及 A 对照，分别记录自动化和 packaged 证据。
- [x] 在本票与 map 记录实现、候选构建身份、验收证据及限制。原型交互检查不替代正式 App 验收；仅完成全部范围后标记 resolved。

## Answer

Today 现在将真实 Daily Record 的最新当前安排与明确观察事实投影到共享 00:00–24:00 A 时间轴。点、范围、重叠、跨日片段、粗略时段和无时刻原文均按其可证明精度呈现；读取保持只读，保留既有 Morning baseline、修订、短记录和更正入口。时钟 tick 只更新现在标记，不重建可展开事项。

**候选构建：** Personal Dashboard `3.0.1`，bundle id `com.tortillaflat.personal-dashboard`，arm64，ad-hoc 签名；executable SHA-256 `226ad202aaaa182e7f535460caf2d54d38c43a46f7eebb8a76207681d96fb446`。此候选未替换日常安装。

**自动化证据：** `npm run check`、`cargo test --manifest-path src-tauri/Cargo.toml`、聚焦前端时间轴测试（5 项）、`rustfmt --check`（改动的 Rust 文件）、`git diff --check` 与 packaged 脚本语法检查通过。`npm run test:frontend` 有 1 项既有外部契约失败：`tests/frontend/daily-flow-integration.test.ts` 期望工作区 `.agents/skills/life-daily-loop/SKILL.md` 含 `## Personal Dashboard Tasks`，该外部技能当前没有该标题；本票未修改它。

**Packaged 证据：** `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=today-time-axis PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=420 PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY=/tmp/pd-today-time-axis-acceptance-final-20260923-05 scripts/acceptance/macos-ipc-workflow.sh` 通过。真实系统时钟分钟变化与恢复前台、首次打开的居中定位、长文本可见、历史空日期无现在标记且不写文件、固定本地偏移下 23:59／00:01 跨日片段、中英文宽／窄布局和键盘定位均由隔离合成 Vault 检查；记录哈希保持不变。五张截图保存在上述 capture directory。

ISO 本地墙上时间的 `T`／`t` 日期分隔符会保留其来源日期；带 `Z` 的 UTC 时间戳因不能作为本地墙上时间直接定位，留在未定位区域。跨日两端 offset 不同、DST 缺失或重复时刻也不会伪造成确定时间。日常安装接受、推送与发布不在本票范围内。

## Comments

2026-09-23：已按 writing-plans workflow 保存实现计划 `docs/superpowers/plans/2026-09-23-continuous-today-timeline.md`，等待用户审阅后再改动产品代码。当前 main 为 `f6286db`，比 `origin/main` 的已集成功能落后 34 个提交；计划先安全 fast-forward 到 `189fe15`，并原样保留独立 scratch 工作。

2026-09-23：用户明确要求执行两张已准备票，并授权选择较新的集成分支。复核后继续使用包含 Ticket 01 的 `codex/historical-habit-corrections`；其基线已是最新已获取 `origin/main` `e654461`，无需切分支或同步。实现、自动化与 packaged 证据见 Answer。

## 执行边界

遵守父规格共同约束；原型为参考，按正式工程约定重新实现，不合并 throwaway 页面。保留现有 Daily Record 格式及数据所有权，不为展示方便改写真实记录，不修改日常 producer、Dida365 或自动化，不新增依赖或服务。不替换日常安装、不推送、不关闭或修改源反馈票及父级问题。
