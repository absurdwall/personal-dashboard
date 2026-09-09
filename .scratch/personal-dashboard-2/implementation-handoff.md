# Personal Dashboard 2.0 implementation handoff

用户已批准七张票的划分，并认可字体修正后的 FINAL 为唯一基准。不要再修改原型以适配实现。父 spec 未在 to-tickets 中改写；其早期 needs-info／待原型反馈状态已由后续用户认可更新，实际尚未授权的运行操作以各 ticket 为准。

## Workspace and provenance

- Dashboard 独立仓库：`/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard`。
- 私有 planning vault 独立仓库：`/Users/tingranwang/Documents/Codex/projects/tortilla-flat`。
- 先读适用 AGENTS.md、本目录 spec、目标 ticket 和原型 README，按需读取 spec 的来源链接。
- 本次 tickets/spec/prototype 目前是本地工作成果，不能假定 fresh worktree 默认分支包含它们。务必先读上述绝对路径的原件，比对当前副本；不要覆盖新内容或把父 vault 的个人数据带入 public Dashboard 仓库。
- 建议七票顺序跑并复用同一开发分支及工作目录。使用新任务时选择该目录本地运行；若用独立 worktree，先确保规划基线和所需前置提交已进入其 checkout。禁止在缺少依赖提交时重新实现依赖、宣称依赖完成或直接写 main 解决同步问题。
- 发布 tickets 不等于已 commit/push。本任务只创建交接文件；实现任务提交本票代码时不要顺手提交所有不相关未跟踪内容。规划基线需独立审查、scope staging；若为捕获原型创建分支，使用 codex/ 前缀，不把真实个人数据加入提交。

## Execution contract

- 用 $implement；在已确认的 TodayApplication 工作流边界尽可能 TDD：临时合成 vault、固定时钟、可控存储；配合 packaged Mac IPC/AX 验证。不修改 frozen FINAL 的布局、字号、字体、间距或内容来掩盖实现偏差。
- 独立 code-review 按技能执行；先看相关仓库标准、领域术语与 ADR。类型检查与聚焦测试随实现进行，结束运行适用完整套件一次；review 引发修复后重跑相关验证。测试、原型和已安装 app evidence 分别报告。
- 只实现本票，不加依赖、服务、部署或长期功能。不得提前删除旧真实数据或替换在用 1.0；真实切换仅属于最后一票。
- 当前禁止 live skill 修改、Dida365 调用和自动化操作。基准与快照生成协议可用文档／纯合成验证完成；真实生产端激活若必须越过边界，在最后切换任务具体说明并取得授权。不可用“整体实现”隐式扩展权限。
- 完成后更新目标票的验收证据和真实状态，不修改父 spec 来消除失败。提交本票到当前开发分支，报告 SHA、两个仓库各自状态和下一票需要的基线；不自动 push 或 merge。
- 无法完成验收或真实切换时，报告明确阻塞和已完成范围，不能勾选未验证的标准。

## Run order

按 01 → 02 → 03 → 04 → 05 → 06 → 07 顺序最简单。04 在 01 完成后即可独立推进，但需隔离分支并在 05 前整合；不建议并行写同一工作区。

## Copyable prompts

### 01 — 保留早间基准，展示当前安排

```text
使用 $implement 实施下面指定的一张 Personal Dashboard 2.0 ticket；不要自动开始下一张。

先读取 /Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/implementation-handoff.md，遵循其中的代码基线、依赖核验、冻结原型与权限边界。

目标 ticket：
/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/issues/01-preserve-baseline-and-current-plan.md

先核验 Blocked by 中所有前置结果和提交已进入当前分支，再实施、验收、review 并 commit 本票。
```
### 02 — 通过 Calendar 回看某一天

```text
使用 $implement 实施下面指定的一张 Personal Dashboard 2.0 ticket；不要自动开始下一张。

先读取 /Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/implementation-handoff.md，遵循其中的代码基线、依赖核验、冻结原型与权限边界。

目标 ticket：
/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/issues/02-calendar-date-reading.md

先核验 Blocked by 中所有前置结果和提交已进入当前分支，再实施、验收、review 并 commit 本票。
```

### 03 — 在当天或历史日期补记与更正

```text
使用 $implement 实施下面指定的一张 Personal Dashboard 2.0 ticket；不要自动开始下一张。

先读取 /Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/implementation-handoff.md，遵循其中的代码基线、依赖核验、冻结原型与权限边界。

目标 ticket：
/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/issues/03-dated-notes-and-corrections.md

先核验 Blocked by 中所有前置结果和提交已进入当前分支，再实施、验收、review 并 commit 本票。
```

### 04 — 通过按需快照展示 Habits

```text
使用 $implement 实施下面指定的一张 Personal Dashboard 2.0 ticket；不要自动开始下一张。

先读取 /Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/implementation-handoff.md，遵循其中的代码基线、依赖核验、冻结原型与权限边界。

目标 ticket：
/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/issues/04-habits-snapshot-view.md

先核验 Blocked by 中所有前置结果和提交已进入当前分支，再实施、验收、review 并 commit 本票。
```

### 05 — 从 Habits 记录健身短句

```text
使用 $implement 实施下面指定的一张 Personal Dashboard 2.0 ticket；不要自动开始下一张。

先读取 /Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/implementation-handoff.md，遵循其中的代码基线、依赖核验、冻结原型与权限边界。

目标 ticket：
/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/issues/05-exercise-note-entry.md

先核验 Blocked by 中所有前置结果和提交已进入当前分支，再实施、验收、review 并 commit 本票。
```

### 06 — 完成 FINAL 的整体验收

```text
使用 $implement 实施下面指定的一张 Personal Dashboard 2.0 ticket；不要自动开始下一张。

先读取 /Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/implementation-handoff.md，遵循其中的代码基线、依赖核验、冻结原型与权限边界。

目标 ticket：
/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/issues/06-final-packaged-acceptance.md

先核验 Blocked by 中所有前置结果和提交已进入当前分支，再实施、验收、review 并 commit 本票。
```

### 07 — 切换 2.0，退役旧 Exercise 功能与数据

```text
使用 $implement 实施下面指定的一张 Personal Dashboard 2.0 ticket；不要自动开始下一张。

先读取 /Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/implementation-handoff.md，遵循其中的代码基线、依赖核验、冻结原型与权限边界。

目标 ticket：
/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-2/issues/07-cutover-and-retire-exercise.md

先核验 Blocked by 中所有前置结果和提交已进入当前分支，再实施、验收、review 并 commit 本票。
```
