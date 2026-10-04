# Management skill 检查与规格发布纠正

> 历史记录：本页保留 2026-10-03 的检查与纠正经过；后续 Management 触发约定以现行根 AGENTS.md 为准。 参见[文档索引](../README.md)。

Date: 2026-10-03
Scope: 用户要求检查 skill，并纠正规格发布目标；未修改或删除全局 skill。

## 结论

正式规格必须是 `absurdwall/personal-dashboard` 的 GitHub Issue。本次被误作为正式发布的本地 Markdown 项与后续 Management 登记，不能代替 GitHub 发布。现已补发 [Spec #43](https://github.com/absurdwall/personal-dashboard/issues/43)，标签 ready-for-agent。

## 查到的具体来源

1. 项目 AGENTS 原第 20 行明确把 Issues/specs 指向 `.scratch/`，tracker 文档原第 15 行把“publish”定义为创建本地 Markdown。它们与用户当前认可的 GitHub 工作流不符。
2. 项目 AGENTS 原第 36–41 行要求发布、认领、完成/阻塞后运行 Management skill。它把本应独立的 Portfolio 同步变成发布后的自动动作。
3. Management skill 第 9–12 行称自己不是 publication skill 的替代，第 36 行要求保留项目既有工作流；它本身没有要求把 GitHub spec 搬到本地。第 39–42 行仍将每次阶段发布后的 registerSource/publishPhase 设为流程步骤，结合项目自动触发规则会引入用户未期望的副作用。

这次执行也有错误：此前项目规格已经通过 GitHub 发布，执行时仍仅依据旧本地说明认定发布目标，没有核对用户实际工作流；不应把完成本地登记当成用户要的规格发布。

## 已纠正

- 正式 GitHub Issue 已创建，并核实完整正文、OPEN 状态和 ready-for-agent 标签。
- 项目 tracker 文档改为 GitHub；本地文档作为辅助记录。
- 项目 AGENTS 改为 Management opt-in，仅用户明确要求登记或 reconcile 时运行。
- 误建本地待办标为 wontfix/superseded，并指向 GitHub #43；不关闭或认领 GitHub 工作。
- 全局 skill 文件保持原样：用户本轮要求检查，本次修正限制在项目流程与误发布产物。

## 保留的副作用

此前 `source-personal-dashboard-codex-dictation` 的 Management Registry 登记仍存在。本轮未再次运行 Management helper、撤销登记或改写项目 summary；本地对应待办已废弃。原 publication.json 保留为历史执行回执，publication-correction.json 记录正式 GitHub 发布与这项残留，不能把旧回执当成当前发布入口。

删除全局 skill 不能单独修复项目的旧 tracker 指针与自动调用条款；这两处已修正。全局 skill 的共享消费者和 helper 安装未作清理。
