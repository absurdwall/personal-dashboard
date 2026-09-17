# Daily-flow task adapter v1

Ticket 07 提供一个可以在 Personal Dashboard App 关闭时调用的窄入口。它
读写的仍是 `life/.personal-dashboard/tasks/v1/tasks.json`，并通过
`TaskApplication` 的目标校验、版本条件和受保护保存边界完成写入；没有第二份
daily-flow JSON 后端。

## Entry

已编译的 `personal-dashboard` 可执行文件支持：

```text
personal-dashboard --daily-flow-tasks
```

调用方通过 stdin 传入一个 JSON 请求，stdout 返回一个 JSON 响应。这个分支在
启动 Tauri 窗口前处理请求，因此不要求 App 已打开。请求必须显式带上
`vaultPath`；adapter 不会猜测或改变 Dashboard 当前选中的 Vault。请求中的
`livedDate` 是调用方已经按本地时区确定的生活日期，adapter 不把日期转换成
UTC。返回的 `currentTimestamp` 和 `timezoneOffset` 保留当前本地时间的 offset，
供早晚流程记录实际操作上下文。

入口版本固定为 `schemaVersion: 1`。响应使用相邻标签格式：`operation` 是
`read` 或 `apply`，结果放在 `result` 中。

## Read request and response

最小读取请求：

```json
{
  "operation": "read",
  "schemaVersion": 1,
  "vaultPath": "/path/to/vault",
  "livedDate": "2026-09-17"
}
```

读取结果的 `state` 有四种含义：

- `empty`：任务正本不存在或存在但没有任务；这是成功的空集，不会创建文件。
- `ready`：已读取并验证 canonical task document。
- `damaged`：文件可读但 JSON、schema、身份、清单、安排或历史校验失败；不会
  把损坏文件当作空集。
- `failed`：Vault 不兼容、文件不可读或当前时间上下文不可用；也不会写入替代
  数据。

`read` 结果总是携带 `livedDate`、当前时间、`revision`、`targetBinding` 和
  `vaultPath`（能确定时）。`ready` 任务按以下原因筛选：

- `scheduledForLivedDate`：任务安排在 lived date；
- `overdue`：当前时间已经超过待办任务的安排；
- `undatedCandidate`：未安排日期的待办候选；
- `completedOnLivedDate`：完成记录的实际日期是 lived date，即使任务原安排
  在其他日期。

归档清单中的 pending 任务不会作为日常义务返回，数量放在
`excludedArchivedPending`。终态、删除标记、来源、完整完成记录、历史
`changes`、清单归属和 `planningEligible` 仍以结构化字段返回；终态或删除任务
不会因为被读取而重新变成可规划任务。

## Apply request

Apply 将“可考虑的建议”和“明确授权的写入”分开：

```json
{
  "operation": "apply",
  "schemaVersion": 1,
  "vaultPath": "/path/to/vault",
  "livedDate": "2026-09-17",
  "targetBinding": "task-target-...",
  "expectedRevision": "...",
  "candidates": [
    {
      "kind": "suggestion",
      "sourceReference": "suggestion-1",
      "name": "只供考虑的安排",
      "content": null,
      "date": "2026-09-17",
      "time": "15:00"
    },
    {
      "kind": "action",
      "taskId": "daily-flow-task-1",
      "sourceReference": "morning-plan-1",
      "name": "明确安排的任务",
      "content": null,
      "date": "2026-09-17",
      "time": null,
      "listId": null
    }
  ],
  "commands": []
}
```

`action` 的 `taskId` 和 `sourceReference` 都是稳定、受校验的本地标识；省略
日期时默认使用 lived date，省略清单时使用 Inbox。`suggestion` 只会在响应中
原样结构化返回，不创建任务、不改变 revision。

`commands` 中的每个 `operationId` 都是稳定的幂等操作身份：

- `reschedule`：使用 `date` / `time` 明确安排或清除安排；时间必须绑定日期；
- `complete`：以当前本地 timestamp 完成任务，保存带精度的完成时间，完成来源
  为 `daily-flow`；
- `abandon`：明确放弃任务并清除当前完成记录；
- `correctCompletion`：只更正已经完成的任务，保留完成日期和可选的
  `HH:MM` 精度，完成记录来源为 `date-correction`，历史操作来源仍为
  `daily-flow`。

带有 action 或 command 的 Apply 必须提供当前的 `targetBinding` 和已读取的
`expectedRevision`。目标不匹配、revision 过期、任务或清单不存在、删除任务被
旧命令重新激活、状态转换不允许、未来完成时间或其他输入不合法时，整个请求
失败，canonical bytes 不被覆盖。一个 Apply 最多执行一次条件保存。

## Idempotency and preservation

同一 `taskId + sourceReference` 的 action 是同一个外部任务对象。重复接收会
返回 `preserved`，不覆盖用户改名、改期、移动、完成、放弃或删除；删除的对象
仍是删除状态。相同 source reference 换用另一个 task id，或相同 task id 换用
另一个 source reference，都会被拒绝。要再次安排，必须使用新的稳定身份和
明确 action。

同一 `operationId` 只接受与原历史结果相同的重试，并返回 `idempotent`。省略
某个已有任务不会删除它；只有 action 和 commands 能产生写入。建议列表本身
从不产生任务。若明确 command 本来就不会改变任务，adapter 仍会写入一个带完整
操作 payload 的 `noop` 历史项：首次接收返回 `applied`，之后的相同
`operationId` 返回 `idempotent`，因此旧命令不会在用户后来修改任务后再次生效。

响应里的固定状态与错误诊断以中文 source diagnostic 返回；Dashboard 前端通过
`frontend/interface-language.ts` 的同一条双语 catalog 显示英文，动态路径、任务
名称和其他用户内容保持原样，不进入翻译。

## Scope for ticket 08

Ticket 08 可以把早间/晚间流程接到 `read` 和 `apply`：早间读取 lived-date、
逾期、未安排候选，经过用户确认后发送 action；晚间读取完成上下文，必要时发送
明确的 completion、abandon 或 correction command。Dida365、Agent、自动化和
真实个人流程不属于本票；本票也不执行任何 Dida 读取或写回。实际 skill 接线、
真实个人资料和 packaged macOS acceptance 分别留给后续范围。
