# 08 — 将默认 prototype 入口指向 v2 A 方案

**Review comment:** #2 — `npm run prototype:mac-workspace` 当前启动了历史的 persistent three-region prototype，而不是批准的 v2 `ticket-08-week-flow`。

**What to build:** 让默认 prototype 命令和说明只打开 v2 的 A — List + temporary sheet fixture；历史 prototype 保留为历史证据，但不能继续作为默认设计参考。

**Blocked by:** None

**Type:** task

**Status:** resolved

- [x] `npm run prototype:mac-workspace` 默认打开批准的 `ticket-08-week-flow` A 方案，而不是历史 root `index.html`。
- [x] 默认入口在 `960x720`、中等窄窗口和 `640x520` 都呈现 v2 的 list-first、无自动详情和 temporary-sheet/drill-in 方向。
- [x] 历史 three-region fixture 不被删除或重写；如保留显式入口，入口名称必须明确标记为 historical，且不出现在默认说明中。
- [x] package script、prototype server 输出和相关文档不会把历史 fixture 描述为当前 Mac workspace 设计。
- [x] 只修改 fixture/入口路由，不把 disposable prototype 代码升格为生产实现，不新增依赖或服务。

## Answer

已将默认 prototype server route 指向 v2 A `ticket-08-week-flow` fixture。`/`、
`/index.html` 和 `/ticket-08-week-flow/` 现在返回同一个 list-first 入口；旧的
three-region fixture 只通过明确的 `/historical/` 路径读取，旧 comparison 也有
对应的 historical route。历史 review 文档已标明其仅为历史证据，默认 server
输出只介绍 v2 当前入口。

没有改动历史 fixture 的 HTML、JavaScript 或 CSS，也没有把 disposable fixture
代码接入生产 Tauri/Rust 实现、添加依赖或添加服务。

## Verification

- `npm run prototype:mac-workspace` 启动后，默认页面标题、主表面和截图均对应 v2 A 方案；已在 `960x720`、`800x720` 和 `640x520` 检查。
- 直接请求默认 URL 与显式 `ticket-08-week-flow` URL 得到同一当前设计入口。
- 历史 fixture 仍可由明确的 `/historical/` 路径读取，但不再被默认命令或 v2 文档引用为设计目标。
- `npm run check`、`cargo test --manifest-path src-tauri/Cargo.toml` 和 `python3 -m unittest discover -s tests -v` 通过。
