---
name: personal-dashboard-daily-tasks
description: Use when a daily workflow needs to read or change local Personal Dashboard Tasks while the app is closed, through the `--daily-flow-tasks` adapter.
---

# Personal Dashboard daily Tasks

## Route the work

This skill owns the closed-app adapter for local Personal Dashboard Tasks.
Before planning a phase or constructing an adapter request, read
[`daily-flow-integration-v1.md`](../../../docs/daily-flow-integration-v1.md)
and [`daily-flow-task-adapter-v1.md`](../../../docs/daily-flow-task-adapter-v1.md).

Keep the other workflow boundaries intact:

- Follow the existing `life-daily-loop` skill for lived dates and the canonical
  `life/` Daily Record.
- Use `personal-dashboard-collaboration` for Codex work inside the open
  Dashboard app.
- Use this skill when the daily workflow needs local Dashboard Tasks while the
  app may be closed.

## Read and apply Tasks

1. Get the absolute Vault path and already-resolved local lived date from the
   calling workflow. If either is unavailable, ask for it; never infer a Vault,
   follow the app's current selection, or convert the lived date to UTC.
2. Invoke the compiled `personal-dashboard --daily-flow-tasks` entry with one
   `schemaVersion: 1` JSON request on stdin. Use `operation: read` before
   planning. The adapter contract defines the exact fields and response tags.
3. Treat `ready` as a validated Task snapshot and `empty` as a successful empty
   result. Treat `damaged`, `failed`, a missing executable, or an unrecognized
   response as unavailable; do not replace it with an empty list or read the
   backing JSON file directly.
4. Keep Dashboard Tasks distinct from Dida365 Tasks and Habits. Preserve source
   labels and stable IDs. Same-name items are not the same item. Do not copy,
   fuzzy-merge, check off, or write back to Dida365 through this adapter.
5. Keep ideas as `suggestion` candidates. Use an `action` candidate only after
   the user explicitly chooses the new Task. Send status or schedule commands
   only for a unique Task and explicit user intent, with stable operation
   identities and the current `targetBinding` and `revision` from the latest
   read. A suggestion alone never creates a Task.
6. After every successful write, read again and verify the returned Task state
   and revision. On a stale binding, revision conflict, or uncertain result,
   refresh and reconcile before retrying; never replay a write using an old
   snapshot.

## Keep phase evidence honest

- **Morning:** use scheduled, overdue, and undated local Tasks as source-labelled
  planning context. A proposed action remains a suggestion until the user
  explicitly selects it. Do not recreate archived pending Tasks.
- **Daytime:** omission from a plan does not complete, abandon, or delete a
  Task. Change its status only from a unique, explicit user statement.
- **Evening:** use `completedOn` for the lived date, including late completion
  and explicit date corrections. A due date or plan does not prove completion.
- Keep Daily Record plans, events, and reviews in the canonical Daily Record
  workflow. This Task adapter never writes that record.

## Finish

Report the read state and source coverage. After an apply, report a change as
saved only when the follow-up read confirms it. Otherwise state the exact
unavailable or unresolved result and leave the Task state unclaimed.
