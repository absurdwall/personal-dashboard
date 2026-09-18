# Daily-flow integration v1

Ticket 08 connects the existing daily loop to the Ticket 07 task adapter. The
connection is a workflow boundary, not a second task backend and not an Agent
embedded in the Dashboard UI.

## Real entry

The canonical `life-daily-loop` skill and the `everyday` Life Companion entry
both use the compiled executable while the app may be closed:

```sh
personal-dashboard --daily-flow-tasks
```

The caller sends one `schemaVersion: 1` JSON request through stdin and reads
one tagged JSON response from stdout. It must provide the absolute selected
`vaultPath` and the already-resolved local `livedDate`. A read happens before
planning and after every write. A write reuses the read response's
`targetBinding` and `revision`; a missing executable, `damaged` source, or
`failed` source is reported as unavailable rather than treated as an empty
task list. The complete request and response contract is in
[`daily-flow-task-adapter-v1.md`](daily-flow-task-adapter-v1.md).

The frontend contract test reads the canonical `life-daily-loop` skill and the
`everyday` Life Companion boundary files as external integration inputs. It
discovers the Tortilla Flat root from Git's common directory when running in a
managed worktree; other checkout layouts may set
`PERSONAL_DASHBOARD_WORKSPACE_ROOT`. Missing inputs fail the test loudly rather
than being treated as an empty contract.

## Authority and phase boundaries

| Concern | Authority | Daily-flow behavior |
| --- | --- | --- |
| Local action state | Dashboard Tasks at `life/.personal-dashboard/tasks/v1/tasks.json` | Read and, after explicit user intent, write through the adapter only |
| External task and habit state | Dida365 | Read as source-labelled context; no copy, fuzzy merge, local check, or write-back in this bridge |
| Lived-day record | `life/Journal/Daily/YYYY/YYYY-MM/YYYY-MM-DD.md` | Write the bounded plan/update/review sections while preserving the morning baseline and unrelated Markdown |
| Optional ideas | Daily-flow response suggestions | Keep as suggestions; never submit them as Dashboard actions |

### Morning

1. Resolve the local date, timezone, and explicit Vault path, then read
   Dashboard tasks through the adapter.
2. Read the Dida365 today/overdue and relevant habit context through the
   existing bounded source workflow. Record missing or partial coverage as
   unknown; a failed read is not an empty source.
3. Use Dashboard `scheduledForLivedDate`, `overdue`, and
   `undatedCandidate` entries as local action context. Do not reintroduce
   pending work from archived lists. Keep Dida365 titles visibly source-marked
   and separate from Dashboard tasks.
4. Put newly proposed work in the response as a suggestion until the user
   confirms it. After confirmation, send a stable `action` candidate with a
   stable `taskId` and `sourceReference`; then reread the adapter response.
5. A date improvement is a suggestion by default. Send `reschedule` only when
   the user agrees, or when the user has stated one unique task and target date
   clearly enough to authorize the change. Repeated morning input reuses the
   same identities and cannot overwrite a user edit or terminal state.

### Daytime

Keep the existing Daily Record baseline and update boundary. A material
replan changes the current arrangement and appends one explicit update; an
event-only entry leaves the plan representations unchanged. A task omission
does not delete or abandon it. Complete, abandon, or reopen only from a
unique, explicit user statement; do not infer a result from elapsed time,
overdue state, plan prose, or an unchecked task.

### Evening

1. Read the target lived date through the adapter and use completion records
   whose `completedOn` is that date, including late completions and explicit
   date corrections.
2. Combine that Dashboard evidence with the existing Dida365 execution and
   Habit reads. Keep unsupported activity `unknown` and preserve source
   coverage in the run report.
3. Send `complete`, `abandon`, or `correctCompletion` only for a unique,
   explicit user intent. A date-only correction preserves unknown minute
   precision. The adapter updates task state only; the evening review remains
   a bounded Daily Record write.

## Synthetic rehearsal evidence

The bounded rehearsal uses a temporary synthetic Vault, a simulated Dida365
source, and the real CLI process entry. It covers initial and repeated morning
planning, suggestion versus confirmed rescheduling, user-edit preservation,
explicit completion and abandonment, late completion, date correction, actual
completion-date evening reading, source unavailability, damaged input, and a
stale revision conflict. It asserts that the simulated Dida365 source receives
no writes.

The rehearsal is not a personal daily run. It does not read or write a real
Daily Record, Dida365 account, active installation, or automation schedule.
Packaged macOS acceptance and real-environment evidence remain separate gates.
