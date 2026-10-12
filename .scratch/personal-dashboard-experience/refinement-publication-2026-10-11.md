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
| 本轮规格发布 | codex/dashboard-experience-refinement-spec | use Git receipt below; exact hash recorded after commit |

当前基线保留完整旧实现 lineage；不从远程 main 重建。原型分支仍独立保留，
不要为整合规格而复制整个 throwaway 实现到生产或删除其设计证据。

## Commit receipt

规格正文首次发布的完整 commit 可通过本地 Git 对正文的 add 记录唯一取得：

```sh
git log --diff-filter=A --format='%H %s' -- .scratch/personal-dashboard-experience/refinement-spec-2026-10-11.md
```

发布 commit 完成后，在本记录补齐完整哈希；后续 receipt/Management 更新使用
第二个明确的 docs commit，避免在尚未生成的 commit 内写入自身哈希。
下次 tickets 和 implementation 各自保留基线、分支、完整哈希及证据链接。

## 后续远程交接

GitHub 恢复后的授权流程：验证远程和 then-current main，推送保留分支，再以
PR 整合 protected main。保留历史，不 force-push、reset 或 squash 掉本地记录。
Markdown tracker 如需迁移成 GitHub Issues，另行保留 local ID→Issue 映射和
完整状态/依赖/验收，不能把 git push 报告成 Issues 已发布。

## Management

复用已注册的 `product-personal-dashboard` /
`source-personal-dashboard-experience`。本地文件发布与 Management 读回分别
确认；最终来源 revision、PDEX-SPEC-02 状态及未覆盖来源在发布后的 receipt
中记录。不新建 Registry，不改用户 focus 或项目 lifecycle。
