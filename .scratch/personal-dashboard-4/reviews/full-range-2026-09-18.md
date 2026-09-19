# Personal Dashboard 4.0 full-range review

Review date: 2026-09-18  
Repository: `/Users/tingranwang/.codex/worktrees/e99a/personal-dashboard`  
Review range: `6c4854ccd93e14c6ae21f643ea039b8a0f394b16..41289ff981fa78e9056ad8ec9a5dfcac711b011a`

This is a review artifact. No product source, tests, or documentation were
changed while performing the review.

## Scope and evidence

The range was pinned and verified at the requested base and head. It contains
12 commits, 49 changed files, and `16,220` added / `407` deleted lines:

```text
c355325 feat(tasks): add persistent task inbox
6bed9ee feat(tasks): add task state history
83d5e66 feat(tasks): add task lists and archive
f39992d feat(today): share tasks with Today
9f9f236 feat(calendar): share tasks in selected date panel
97aab69 feat(habits): add Vault-localized display names
821e98e feat(tasks): add daily-flow task adapter
1c8ef19 docs(tasks): resolve daily-flow adapter ticket
2230a6b feat(tasks): wire daily-flow integration rehearsal
5341d25 docs(tasks): resolve daily-flow integration ticket
724614f test(tasks): add packaged 4.0 acceptance gate
41289ff fix(tasks): realign dashboard 4 tasks with prototype
```

I read the checked-in working agreements, parent-vault instructions, domain
rules, ADRs, interface-language contract, task contracts, issues 01–10, map,
and the uncommitted 4.0 planning/spec documents in the source checkout. The
Standards and Spec axes were reviewed in parallel by delegated reviewers, then
integrated with the local review.

Direct visual evidence was also collected rather than inferring parity from
tests: the accepted prototype in
`/Users/tingranwang/.codex/worktrees/05ab/personal-dashboard/.scratch/personal-dashboard-4/prototype/`
was run and inspected, and the current production app was opened through Mac
Accessibility. The reported final PNGs are in
`/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/output/playwright/personal-dashboard-4-final-20260918/`.

## Findings summary

| ID | Axis | Severity | Location | Summary |
| --- | --- | --- | --- | --- |
| F-01 | Spec | P1 | `src-tauri/src/today.rs:918`, `2571` | Calendar month hides a damaged or unknown-version Tasks source as an empty set. |
| F-02 | Spec | P1 | `frontend/main.ts:5476-5529` | A committed-but-late edit can poison the next intentional edit of the same task. |
| F-03 | Standards / Spec | P2 | `frontend/interface-language.ts:265-268`, `316` | Chinese Tasks fixed labels are still English in the live UI. |
| F-04 | Standards | P2 | `src-tauri/src/tasks.rs:1525-2149`, `src-tauri/src/task_adapter.rs:302-306` | New fixed backend diagnostics are not covered by the English error catalog. |
| F-05 | Spec | P2 | `frontend/main.ts:4042-4057` | Sidebar counts ignore the selected pending/completed/abandoned/deleted filter. |
| F-06 | Spec | P2 | `src-tauri/src/task_adapter.rs:739-743` | The adapter accepts relative `vaultPath` values although the integration contract requires absolute paths. |
| F-07 | Standards | P2 | `CONTEXT.md:63-67`, `docs/tasks-v1.md:26-37` | Persistent Task/list/state vocabulary is not added to the domain model or recorded as a gap. |
| V-01 | Verification | P2 if managed worktrees are supported | `tests/frontend/daily-flow-integration.test.ts:6-28` | The new contract test assumes the source checkout's parent layout and fails from this managed worktree. |

The two P1 findings are the release-significant issues. F-03 through F-07 are
smaller but concrete contract or user-facing defects. V-01 is a test
reproducibility issue, not a claim that the daily-flow implementation itself is
wrong.

## Standards

### Delegated Standards assessment

The parallel Standards review found:

- **Incomplete backend diagnostic localization.** `src-tauri/src/tasks.rs`
  adds fixed diagnostics not matched by `englishTaskDiagnostic` in
  `frontend/interface-language.ts`, including the missing-task reschedule,
  invalid completion date, and no-state-change messages. The adapter target
  mismatch at `src-tauri/src/task_adapter.rs:302-306` is also unmatched. This
  violates `docs/interface-language.md:19-21`.
- **Missing domain-model vocabulary.** The persistent `Task`/task-list/state
  concepts introduced in `src-tauri/src/tasks.rs` and `docs/tasks-v1.md` have no
  corresponding `CONTEXT.md` entry, while the current `Day task` definition
  explicitly excludes backlog-style items. This violates
  `docs/agents/domain.md:23-25`.

The delegated reviewer also noted code smells without treating them as
standards failures by themselves: repeated create/confirm/render/error
lifecycles in `frontend/main.ts`, repeated mutation input clumps in
`src-tauri/src/tasks.rs`, and repeated `TaskSurface` switches in the frontend.

### F-03 — Chinese Tasks fixed copy is not localized (P2)

`tasks.scopeAll`, `tasks.scopeToday`, `tasks.scopeInbox`, and `tasks.inbox`
have English values for both `zh` and `en` in
`frontend/interface-language.ts:265-268,316`. Direct inspection of the
production Tasks destination with the interface set to Chinese showed the
left scopes as `All`, `Today`, and `Inbox`, so this is not just a catalog
review concern.

The existing static test in `tests/frontend/task-surface.test.ts:57-85` only
checks that both `zh:` and `en:` fields exist; it permits the two values to be
identical and therefore missed the defect. This violates the paired-copy rule
in `docs/interface-language.md:3-5` and the bilingual acceptance requirement.

### F-04 — New backend diagnostics fall through untranslated in English (P2)

`localizeApplicationError` calls `englishTaskDiagnostic` and otherwise returns
the original diagnostic. The catalog covers several task messages but not the
new fixed strings emitted at these locations:

- `src-tauri/src/tasks.rs:1525`: missing task for reschedule;
- `src-tauri/src/tasks.rs:1608`: abandoned task cannot be completed by an old
  daily-flow operation;
- `src-tauri/src/tasks.rs:1768`, `1814-1820`: invalid completion date;
- `src-tauri/src/tasks.rs:1981`: no state change to save;
- `src-tauri/src/tasks.rs:2149`: duplicate daily-flow source reference;
- `src-tauri/src/task_adapter.rs:302-306`: the current Vault/file target
  changed.

In English mode these error paths display Chinese fixed grammar instead of the
paired English diagnostic required by `docs/interface-language.md:19-21`.

### F-07 — Persistent Task vocabulary is missing from the domain model (P2)

The range introduces a persistent `TaskView`, `TasksView`, `TaskApplication`,
task lists, and task states in `src-tauri/src/tasks.rs:163-194,381-411`, and
defines their durable meaning in `docs/tasks-v1.md:26-37`. `CONTEXT.md:65-67`
still only defines the old lived-day `Day task` and explicitly says to avoid a
backlog item. The domain rule says a missing concept must be reconsidered or
recorded as a gap (`docs/agents/domain.md:23-25`); neither happened.

This is documentation/modeling debt rather than a runtime failure, but it
leaves the relationship between legacy day tasks and the new persistent Tasks
unclear for future work.

### V-01 — Frontend integration contract test is checkout-layout dependent

Running `npm run test:frontend` from this review worktree produced 92 passing
tests and one failing test file. The failure occurs before test execution:

```text
ENOENT: .../.codex/worktrees/e99a/.agents/skills/life-daily-loop/SKILL.md
```

`tests/frontend/daily-flow-integration.test.ts:6-28` derives `workspaceRoot`
as the parent of the project directory and expects `.agents/` plus `everyday/`
to be siblings. That is true in the source checkout
(`/Users/tingranwang/Documents/Codex/projects/tortilla-flat`), where the same
file passes 3/3, but not in the managed worktree layout. The claimed suite is
therefore not reproducible from the review checkout without an external path
assumption.

## Spec

### Delegated Spec assessment

The parallel Spec review found:

- **P1 missing/partial:** `calendar_month` passes an error `TasksView` into
  task-summary generation, which only iterates `view.tasks`; a damaged or
  unknown-version source is therefore rendered as empty in the month grid.
- **P1 implementation error:** `updateTask` keys its change ID only by task
  identity and clears it only after current confirmation. A backend commit whose
  response arrives after navigation can leave that ID cached; a later edit
  reuses it and is rejected as a conflicting operation.
- **P2 implementation error:** sidebar counts do not include the selected state
  filter.
- **P2 implementation error:** the adapter accepts relative `vaultPath` values.
- No confirmed out-of-scope behavior was found.
- Packaged/Drive proof remains unverified rather than being called a code
  failure.

### F-01 — Calendar hides damaged or unknown Tasks data (P1)

`TodayApplication::shared_tasks_for` converts a task read error into
`TasksView::error(...)` with an empty `tasks` vector at
`src-tauri/src/today.rs:1527-1532`. `calendar_month` obtains that view at
`src-tauri/src/today.rs:2565-2571`, then calls
`calendar_task_summaries` for each date. That helper only iterates
`view.tasks` (`src-tauri/src/today.rs:918-936`) and does not inspect
`view.state` or carry the error into `CalendarMonthView`.

As a result, corrupt JSON or an unknown task schema can make the Calendar month
look like it has no Tasks, while the required contract says damaged/unknown
data must fail closed and never be presented as empty
(`docs/tasks-v1.md:44-47`; ticket 01, item 15). The selected-date panel may
later expose a read error, but the month overview has already hidden the task
summaries and gives no task-source error.

The regression needed here is a Calendar-month read with damaged and unknown
task JSON, asserting an explicit error/diagnostic rather than zero summaries.

### F-02 — Late committed edit reuses a conflicting change ID (P1)

`updateTask` uses
`JSON.stringify([binding, "update", taskId])` as its operation key and obtains
the change ID from that key at `frontend/main.ts:5476-5477`. The ID is deleted
only inside the `confirmed` branch at `frontend/main.ts:5523-5531`, where the
response must still be current.

If the Rust write commits but the user leaves Tasks, switches surface, or
otherwise invalidates the request before the response is presented, the
frontend deliberately refuses to confirm the late response but keeps the
operation ID. After returning, the user can see the committed edit and make a
new intentional edit. The same ID is then sent again; the task contract rejects
reuse with a different payload (`docs/tasks-v1.md:49-57`). This violates the
recoverable-edit requirement in the 4.0 spec at user story 31 and can block
further edits to that task for the rest of the session.

The existing test assertion that retry identity is retained covers response
loss safety, but not the follow-up sequence “commit late → observe committed
state → make a different edit”. That sequence needs a regression test.

### F-05 — Sidebar counts ignore the active state filter (P2)

`renderTasks` filters visible rows with `taskStateScope` at
`frontend/main.ts:4622-4632`. However, `renderTaskListScopeButtons` calls
`taskScopeCount`, whose implementation at `frontend/main.ts:4042-4057` only
filters deletion and list membership. Selecting Completed, Abandoned, Pending,
or Deleted changes the displayed rows but leaves the All/Inbox/user-list counts
unchanged. This contradicts the explicit requirement that counts match the
displayed filter scope (`spec.md:69`).

### F-06 — Adapter does not enforce the absolute-path contract (P2)

The integration contract requires an absolute `vaultPath`
(`docs/daily-flow-integration-v1.md:16-21`). `validate_vault_path` only rejects
an empty path at `src-tauri/src/task_adapter.rs:739-743`; it does not require
`Path::is_absolute()`. A relative path is therefore resolved against the
adapter process's working directory and can bind the request to an unintended
or environment-dependent Vault. The adapter tests cover valid absolute paths
but do not cover rejection of relative paths.

## Visual comparison with the accepted prototype

The production implementation is materially closer to the accepted prototype
than the pre-41289ff layout:

- the existing Dashboard shell and navigation remain in place;
- Tasks is between Today and Calendar;
- Tasks uses a compact left list rail and right content area;
- the default view shows compact task rows and one light state filter;
- list management, new-task fields, and full task details are on demand;
- Calendar cells retain text previews and `+N`, and selecting a date opens the
  existing right-side panel rather than a separate overflow popup;
- narrow Calendar captures retain readable task text.

The direct comparison did not establish a fully clean acceptance:

1. The current Chinese production view visibly renders the three fixed scope
   labels in English (F-03).
2. The four Chinese wide final PNGs are covered in the center by a macOS
   privacy prompt (`"ChatGPT.app" would like to access data from other apps`).
   This is an external capture/environment overlay, not a confirmed product
   defect, but it means those artifacts cannot prove unobstructed Chinese
   visual parity. The English narrow captures are not affected by that prompt.
3. The production Tasks rail glyph differs from the prototype glyph. This is a
   minor visual difference and was not treated as a contract failure because
   the accepted requirements constrain the destination and structure, not the
   specific glyph.

The issue 10 instruction correctly says screenshots are not persistence or
packaged-acceptance evidence. The direct UI comparison supports the structural
parity claims; it does not close the missing Drive or persistence evidence.

## Ticket 01–10 coverage and evidence boundary

| Ticket | Review result | Evidence boundary |
| --- | --- | --- |
| 01 Persistent Inbox | Implemented broadly; F-01 is a Calendar read-path exception to fail-closed behavior. | Rust/frontend tests and synthetic workflows exist; no fresh Drive fixture. |
| 02 State/history | No additional confirmed defect in this review. | Synthetic lifecycle/history evidence; not real-personal-data acceptance. |
| 03 Lists/archive | No additional confirmed defect in this review. | Synthetic list/archive and relaunch evidence. |
| 04 Today shared tasks | No additional confirmed defect in this review. | Synthetic shared identity and packaged-candidate claims; no independent packaged rerun here. |
| 05 Calendar panel | Structure and +N/right-panel behavior align; F-01 remains. | Direct visual inspection plus synthetic tests; damaged-source month behavior lacks coverage. |
| 06 Habit localized names | No additional confirmed defect in this review. | Synthetic snapshot/name fallback evidence. |
| 07 External adapter | F-04 and F-06 remain. | Adapter contract and synthetic tests; no real Dida write or personal flow. |
| 08 Daily-flow integration | No scope creep confirmed; V-01 affects test portability. | Synthetic Vault/mock-Dida rehearsal only; no real automation or personal daily flow. |
| 09 Packaged acceptance | Must remain `ready-for-human`. | The ticket itself records the missing 4.0-specific Drive fixture and blocked follow-up; local save is not cloud proof. |
| 10 Prototype parity | Structural alignment is substantially present; F-03 and obstructed Chinese captures prevent a clean evidence claim. | Direct prototype/current UI inspection; screenshots are supplementary only. |

The checked-in ticket 09 answer explicitly preserves the missing Drive fixture
and human-acceptance boundary at
`/Users/tingranwang/.codex/worktrees/e99a/personal-dashboard/.scratch/personal-dashboard-4/issues/09-packaged-acceptance.md:29-37`.
The issue 10 answer reports a final packaged command and eight PNGs, but that
does not supersede ticket 09's `ready-for-human` status or provide the absent
Drive evidence.

## Verification performed

- `git diff --check` across the full range: passed.
- `npm run test:frontend` from this managed worktree: 92 tests passed; the
  `daily-flow-integration.test.ts` file failed at module setup because of V-01.
- The same daily-flow integration test from the source checkout: 3/3 passed;
  this isolates the failure to checkout-layout portability.
- Direct prototype run and current production Mac Accessibility inspection:
  structural parity and F-03 were observed.
- No product fix was applied and no claim is made here that a fresh packaged
  acceptance run, personal Vault flow, real Dida365 write, automation run, or
  Drive upload was performed.

## Verdict

Do not mark the full range clean yet. Resolve or explicitly accept the two P1
data/operation failures first, then close the bilingual/catalog and adapter
contract issues, add regressions for the damaged Calendar source and late
committed edit, make the contract test runnable from the intended checkout
layout, and obtain the fresh Drive fixture plus unobstructed Chinese packaged
captures required by ticket 09.

