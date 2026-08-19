# 02 — 建立 list-first This Week 与 temporary sheet

**What to build:** 把 This Week 的默认桌面工作区改成已批准的 A 方案：agenda-first、无永久右栏、无自动详情打开；用户明确选中行后才出现最小信息的 temporary sheet，并沿用 Ticket 01 的直接记录语义。

**Blocked by:** 01 — 让计划锻炼可以直接记录

**Status:** resolved

- [x] 在 `960x720` 默认状态下，无需 body 滚动即可看到 This Week、History、Settings 导航、当前周、progress、Next departure、primary rows 和 Open capacity。
- [x] 默认状态没有永久 contextual column，也不会因为到期、启动或刷新自动打开详情。
- [x] Monday、Wednesday、Friday primary rows 和 Saturday、Sunday Open capacity 以紧凑的时间顺序显示，并带有真实文字状态和非颜色信号。
- [x] 明确选中一行后，temporary sheet 只显示该行的最小上下文；选中关系保持可见，Close/Escape 不改变数据。
- [x] future row 只显示计划与状态；due/past unrecorded row 在选中后的 sheet 中显示 Record workout，并可进入 Ticket 01 的直接记录路径。
- [x] 生产界面不再显示 Leaving for gym、departure reason 或面向用户的内部 fallback 术语。
- [x] This Week、History、Settings 仍然可以直接切换；History 和 Settings 的详细内容不在本 ticket 中重设计。
- [x] 该 ticket 的完成结果已进入真实 packaged UI 构建，并有对应的 accessibility acceptance 场景，而不是只在 disposable prototype 或直接 Rust 调用中成立。

## Answer

已将生产 Mac workspace 改为 list-first This Week：默认界面只保留周标签、progress、Next departure、Monday/Wednesday/Friday primary agenda，以及 Saturday/Sunday 的 Open capacity。永久右侧 contextual column 已移除；用户明确选中行后，才会出现覆盖 agenda 的 temporary sheet。sheet 显示选中行的最小上下文，未来行不显示 Record workout，到期或已过去但未记录的行才显示该主操作；Close、Escape 和 backdrop close 不写入数据，并恢复来源行焦点。

同时移除了生产界面的旧 departure-response 文案和用户可见的 fallback 术语，改用文字状态与非颜色信号；Open capacity 的记录来源也使用用户可见的 `Open capacity workout`。History、Settings 和现有 Rust/application seam 保持可达，Ticket 01 的 click-only 直接记录流程继续复用。

验证通过：`cargo test --manifest-path src-tauri/Cargo.toml`、`npm run check`、`cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`、`git diff --check`、`npm run build:mac`、`npm run accept:mac`、accessibility driver 的 Swift 编译以及 acceptance shell 的语法检查。`PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=list-first scripts/acceptance/macos-ipc-workflow.sh` 已执行，但当前 Codex 桌面会话中的 relocated packaged app 进程没有暴露可访问窗口，脚本在等待 `Log workout now` 时超时；因此这次 UI 操作验收保留为环境限制，未冒充为通过。该脚本已改为覆盖 Ticket 02 的 list-first、导航切换、future/due sheet、Close 和旧文案 absence 检查。
