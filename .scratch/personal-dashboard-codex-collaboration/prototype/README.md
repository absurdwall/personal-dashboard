# Personal Dashboard Codex Collaboration UI Prototype

This is an additive Collaboration destination inside the current Personal Dashboard shell. It keeps the app toolbar, date/phase context, existing Today / Tasks / Calendar / Habits navigation, workspace title and content region. Only the new collaboration page changes across the three layouts.

- `?variant=A`: date-filtered sessions, conversation, and current business object in adjacent columns.
- `?variant=B`: a selected session's conversation and saved changes in a date-first activity stream, with the current object beside it.
- `?variant=C`: the current Daily Record or Task as the main surface, with the selected session's conversation beside it.

All behavior uses synthetic data held in JavaScript memory. Reloading resets the demo. No Codex connection, microphone, real task write, or personal Vault access is used. The voice control inserts a clearly labelled example transcript only. The bottom switcher and `←` / `→` keys change the `variant` query parameter. The four existing destination buttons remain present; clicking one explains that the current app page is outside this collaboration-only prototype.

## Run

From the repository root:

```sh
npm run prototype:codex-collaboration
```

Then open `http://127.0.0.1:4176/?variant=A`. The local server serves `frontend/styles.css` read-only so this prototype uses the current app's actual shell styling. The prototype is not imported by the product build and does not edit any production file.

## Interaction map

- Select a date to find sessions active on that date. A session continued across days appears on each day where it has activity, with its original start date shown in the row.
- Create a second same-day session, continue a cross-day session, or start one with Today/Task context.
- Use “演示状态” to inspect working, waiting for input, queued, partially completed, interrupted, and saved states.
- Send a message from another session while work is active to see it retained in that session and queued; inspect the running session or stop, switch, and resume after checking.
- Generate a sample plan, start an evening review, and edit/complete a sample Task. These demonstrations are scoped to in-memory data and illustrate how saved results return to the existing Daily Record and Task destinations.
- Open Memory to inspect and correct long-term or recent context. Open Settings to inspect the simulated Codex connection/model preference and automatic morning-plan schedule.

## Source and boundary

Primary source: `/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/.scratch/personal-dashboard-codex-collaboration/spec.md` and `map.md`.

Visual shell and Task semantics were read from the formal Personal Dashboard checkout's `frontend/index.html`, `styles.css`, `main.ts`, and `task-presentation.ts` (read-only). Domain vocabulary comes from `CONTEXT.md`; morning/daytime/evening distinctions follow `life-daily-loop` and the Daily-flow integration references. No formal-checkout files were changed.

This is design evidence only. Existing Today / Tasks / Calendar / Habits screens and implementation remain outside the prototype. No product implementation, acceptance claim, winning-variant selection, or update to the published spec is implied. Review the layouts first; after feedback, revise the spec before any implementation decision.
