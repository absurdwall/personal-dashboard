# PDEX-SPEC-02 — 本地规格发布与 Git 来源

Date: 2026-10-11
Specification: PDEX-SPEC-02
Canonical body: [complete specification](refinement-spec-2026-10-11.md)
Canonical tracker: [map](map.md)
Work Item index: [same-identity index](issues/00-spec-02.md)
Triage: ready-for-agent
Lifecycle: open
Implementation: not started; no new tickets or claim
Publication: complete locally, retained by Git commit

## 授权与内容

用户要求把整轮改善整理为详细 to-spec，明确规格、后续 tickets 和授权后的
implementation 使用本地 Git，不使用当前不可用的 GitHub。测试边界经用户
直接确认：既有业务操作测试＋打包 App 的真实保存、重开、拖动及保留区域检查。

正文包含模板的七个章节和91条 user stories，完整覆盖任务右栏/组织/属性、
Today 密度/浮窗/拖动/时间精度、Collaboration context/voice/slash、Calendar
新增/详情/节日、Habits 新增/编辑/统计/目标周期/停用恢复，以及明确的保留区。
界面细节不从网页原型默认推导，prototype 的存在不是整 App 换肤授权。

新记录不覆盖原 spec、不重开旧 tickets。只有一个完整正文和一个索引，均为
PDEX-SPEC-02。没有创建实施票、执行实现、打包安装或进行 GitHub 操作。

## 保留的分支与基线

| 角色 | 分支 / 身份 | commit |
| --- | --- | --- |
| 旧版产品比较基准 | retained history | `45dceaef9087c8aa224af328bef995d9f62d15dd` |
| 上轮已接受产品语义 | codex/dashboard-experience-integration | `d5183327fcf66d8c1aa44f6b14f9c4272e4c931c` |
| 本轮规格起点 | codex/dashboard-experience-integration docs-only HEAD | `8a0dba083c4cbcb2707e97661a0a23ff82c4f920` |
| 本轮原型及用户反馈修订 | codex/dashboard-experience-refinement | `e6bdb514c6733a98949012e1d42a9cda3b0e3eec` |
| 本轮规格首次发布 | codex/dashboard-experience-refinement-spec | `10cbdb72504aa277137e5417d03bba8d28eb2e4b` |

当前基线保留完整旧实现 lineage；不从远程 main 重建。原型分支仍独立保留，
不要为整合规格而复制整个 throwaway 实现到生产或删除其设计证据。

## Commit receipt

规格正文首次发布的完整 commit 可通过本地 Git 对正文的 add 记录唯一取得：

```sh
git log --diff-filter=A --format='%H %s' -- .scratch/personal-dashboard-experience/refinement-spec-2026-10-11.md
```

首次发布 commit 为 `10cbdb72504aa277137e5417d03bba8d28eb2e4b`，记录正文、
索引、map、完整讨论依据、领域词汇和本地 tracker 规则。发布后的回执与
Management 读回使用第二个 docs commit；同时去除正文标题信息的 Markdown
尾随空白，规格含义未变，不 amend 原提交。最终规格快照可从本文件与正文的
最后更新 commit 解析，下次 tickets / implementation 以该快照作为明确基线。

```sh
git log -1 --format='%H %s' -- .scratch/personal-dashboard-experience/refinement-spec-2026-10-11.md .scratch/personal-dashboard-experience/refinement-publication-2026-10-11.md
```

下次 tickets 和 implementation 各自保留基线、分支、完整哈希及证据链接。

## 后续远程交接

GitHub 恢复后的授权流程：验证远程和 then-current main，推送保留分支，再以
PR 整合 protected main。保留历史，不 force-push、reset 或 squash 掉本地记录。
Markdown tracker 如需迁移成 GitHub Issues，另行保留 local ID→Issue 映射和
完整状态/依赖/验收，不能把 git push 报告成 Issues 已发布。

## Management

复用已注册的 `product-personal-dashboard` /
`source-personal-dashboard-experience`，本地文件发布与 Management 读回均已
确认。[读回回执](evidence/management-spec-02-publication-2026-10-11.json)记录：

- 本来源 `current`，revision `9e0e6c1931add7a6`，无 malformed references。
- PDEX-SPEC-02 为 `ready-for-agent`，无 assignee 或 blocker；旧24条记录仍
  resolved。helper 的通用 lifecycle 分类为 active，不代表规格已开始实现，
  实际阶段仍是本地 ready spec / 无 tickets / 无 claim。
- Registry `11411e94710a79eb`、Project summary `72cf4708d3302d1e` 已读回。
  没有新 Registry，用户 focus/lifecycle 等字段未改变。
- 第一次 summary 请求把可用本地来源声明为未覆盖，遭 evidence 校验拒绝，
  Registry 没有变化。重新读取来源并提交其 revisions 后 v2 成功；原失败
  receipt 仍在 helper 的 pending-recovery 审计列表，保留该事实，不删除历史。
  当前 canonical summary 已确认，规格发布没有遗留业务 blocker。
- 既有 Collaboration Markdown 格式缺口和不可用 GitHub 来源继续明确未覆盖。
  helper 子进程 PATH 排除 GitHub CLI，未进行远程 tracker 查询。
- Registry 更新属于父 vault 仓库，未纳入此独立项目的 commit；不提交父仓库
  的其他变更。本项目只提交规格、记录和读回 receipt。
