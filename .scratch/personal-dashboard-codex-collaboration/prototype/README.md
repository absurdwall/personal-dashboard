# Personal Dashboard Codex Collaboration UI Prototype

Three structurally different layouts answer: how can continuing sessions, Agent work, and actual plans/tasks/reviews live together in a separate workspace that connects naturally to Today, Tasks, Calendar, and Habits?

- `?variant=A`: session workbench, with a date-filtered conversation list, conversation, and active work object.
- `?variant=B`: date-first activity stream, with conversation and saved changes interleaved in the lived-day flow.
- `?variant=C`: artifact-first focus room, with the current Daily Record or Task as the main surface and conversation beside it.

All behavior uses synthetic data held in JavaScript memory. Reloading resets the demo. No Codex connection, microphone, real task write, or personal Vault access is used. The voice control inserts a clearly labelled example transcript only. The bottom switcher and `←` / `→` keys change the `variant` query parameter.

## Run

From the repository root:

```sh
npm run prototype:codex-collaboration
```

Then open `http://127.0.0.1:4176/?variant=A`. The standalone page is not imported by the product build.

## Interaction map

- Select a date to find sessions active on that date. A session continued across days appears on each day where it has activity, with its original start date shown in the row.
- Create a second same-day session, continue a cross-day session, or start one with Today/Task context.
- Use “演示状态” to inspect working, waiting for input, queued, partially completed, interrupted, and saved states.
- Send a message from another session while work is active to see it retained in that session and queued; inspect the running session or stop, switch, and resume after checking.
- Generate or adjust a sample morning plan, start an evening review, and edit/complete a sample Task. A linked Today/Tasks peek reads the same in-memory Task object.
- Open Memory to inspect and correct long-term or recent context. Open Settings to inspect the simulated Codex connection/model preference and automatic morning-plan schedule.

## Source and boundary

Primary source: `/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-codex-collaboration/spec.md` and `map.md`.

Visual shell and Task semantics were read from the formal Personal Dashboard checkout's `frontend/index.html`, `styles.css`, `main.ts`, and `task-presentation.ts` (read-only). Domain vocabulary comes from `CONTEXT.md`; morning/daytime/evening distinctions follow `life-daily-loop` and the Daily-flow integration references. No formal-checkout files were changed.

This is design evidence only. No product implementation, acceptance claim, winning-variant selection, or update to the published spec is implied. Review the variants first; after feedback, revise the spec before any implementation decision.
