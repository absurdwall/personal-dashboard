# PDEX-19–26 — 合并版本地 tickets 发布记录

Date: 2026-10-11
Parent: PDEX-SPEC-02
Canonical tracker: [local map](map.md)
Approved breakdown: [8张合并提案](refinement-ticket-breakdown-proposal-2026-10-11.md)
Publication: complete locally, retained by local Git
Triage: ready-for-agent
Lifecycle: open
Ownership/claim/implementation: unassigned / not claimed / not started
Working publication branch: codex/dashboard-experience-refinement-spec
Publication base: d91d636b395d8c42c0c516827db37ca2565260a4
Frozen specification snapshot: 0b0d727b23166ba1ccf9708656ab2bf00f6188ed

## 授权和范围

用户要求把17张过细的提案合并，随后对8张版本明确回复“同意”，批准粒度、
范围和直接依赖。现按原批准方案发布PDEX-19–26，每张一个独立完整Markdown
票体，109条未勾选验收条件，覆盖全部91条user stories。不是占位标题队列。

Tasks两张、Today/Calendar/Collaboration各一张、Habits两张、最终整合一张。
简单字段和同页细节合并，数据边界/历史/保存及未要求区域保留条件未删减。
父spec正文及其Work Item索引不修改、不关闭；旧24条resolved记录保持。

## 完整票体与依赖

| ID | 完整 body | Direct blockers |
| --- | --- | --- |
| PDEX-19 | [Task编辑、属性与操作](issues/19-task-editing-properties-actions.md) | none |
| PDEX-20 | [父子任务与文件夹](issues/20-task-parents-list-folders.md) | PDEX-19 |
| PDEX-21 | [Today时间轴与安排](issues/21-today-axis-arrangement-interaction.md) | PDEX-19 |
| PDEX-22 | [Calendar新增、详情、节日](issues/22-calendar-create-details-holidays.md) | PDEX-19 |
| PDEX-23 | [Collaboration输入体验](issues/23-collaboration-context-input.md) | none |
| PDEX-24 | [Habit新增编辑与目标](issues/24-habit-create-edit-goal-cycles.md) | none |
| PDEX-25 | [Habit历史与停用恢复](issues/25-habit-details-history-lifecycle.md) | PDEX-24 |
| PDEX-26 | [整合及真实App验收](issues/26-refinement-integration-packaged-acceptance.md) | PDEX-20、21、22、23、25 |

九条直接依赖，无循环、冗余传递边或不存在的引用。初始frontier为19、23、24；
有依赖的五张票仍是ready-for-agent/open，其执行资格由blockers完成情况决定。
frontier不表示本次已claim或开始实现。

## Local Git receipt

本批发布commit为 `52f30a24282b5acf8b8411ba3b0d797d14a10d19`，在上述base
之后保存八份完整票、map、批准记录、执行边界及本记录。第二个docs commit
补齐完整哈希和Management读回回执，保留历史而非amend；其完整identity可从
本记录的最后更新commit取得。

```sh
git log --diff-filter=A --format='%H %s' -- .scratch/personal-dashboard-experience/issues/19-task-editing-properties-actions.md
```

spec发布10cbdb72504aa277137e5417d03bba8d28eb2e4b、规格回执
0b0d727b23166ba1ccf9708656ab2bf00f6188ed、合并提案
d91d636b395d8c42c0c516827db37ca2565260a4保留为独立来源。后续实现按
[执行记录](refinement-execution-2026-10-11.md)记录实际branch/base/commits。

## 确认边界与 Management

本地文件/图/验收条件/标签状态和Git持久记录分别核对；publication不授权
实施、正常App安装、main merge、remote push或父spec关闭。不会查询GitHub。

复用已注册product-personal-dashboard/source-personal-dashboard-experience，
installed helper刷新和canonical读回均已confirmed，见
[回执](evidence/management-tickets-19-26-publication-2026-10-11.json)：

- 来源current，revision `ebb8d649803b131a`，共33条记录，无malformed references。
- 八张新票均ready-for-agent、assignee为空；3个初始ready/5个依赖gated，旧24条
  仍resolved，父spec仍ready且未关闭。没有不明依赖或新增claim。
- Registry `d47446b2e60e0f84`、summary `e40c3d838c9f72bf`已读回，准确反映
  tickets已发布但未实现；用户focus/lifecycle等字段未变。
- 原有Collaboration Markdown格式缺口及不可用GitHub仍明确未覆盖；helper
  子进程PATH排除GitHub CLI，没有远程tracker查询。前轮失败summary receipt
  的历史audit仍保留，本批summary写入没有新增失败。
- 规格正文/父索引和旧票逐字未改，产品源码差异为零；Registry属于父vault
  仓库，不纳入本项目commit，也不提交父仓库的其他变更。

该结果只确认本地发布和Management显示，不代表任何实现、安装或产品接受。
