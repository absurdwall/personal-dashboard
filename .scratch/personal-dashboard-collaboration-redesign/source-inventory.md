# Collaboration redesign — source inventory

Date: 2026-10-09
Base revision: d9a12a3c2e8ec4bd4f5e950acff3175d7d1ab87e
Package source version: 4.0.7
Purpose: wayfinding snapshot, not test/release acceptance

## Reuse and change

| Area | Current source | Reuse / required change |
| --- | --- | --- |
| Domain language and decisions | CONTEXT.md; docs/adr/0005-let-codex-interpret-collaboration-write-intent.md; docs/adr/0006-use-skill-led-conversation-for-collaboration.md | Preserve intent/mechanical boundaries; record chat-led interaction and separate retro roles |
| Collaboration application/runtime/store | src-tauri/src/collaboration.rs | Reuse app facade, queue, selected-vault binding, receipts, dynamic tool dispatch and reconciliation; add typed observable work history/evidence |
| Current runtime result | RuntimeTurnResult; StoredCollaborationMessage; wait_for_turn_with_timeouts | Currently aggregates agentMessage deltas into text and separately collects selected external actions; no complete persisted commentary/summary/item history or token usage observed |
| Task/Today business persistence | src-tauri/src/tasks.rs; src-tauri/src/today.rs; collaboration adapters | Reuse canonical operations and revision checks; simplify collaboration outcome consumption rather than duplicate domain logic |
| External effects and mapped Habit | src-tauri/src/collaboration_dida_writes.rs; src-tauri/src/collaboration_habit_dual.rs | Reuse stable identity, independent external verification and original-source withdrawal scope |
| Habit projection | src-tauri/src/habit_producer.rs | Preserve source coverage and retain-old-snapshot behavior; keep deterministic assembly out of repeated model work where possible |
| Usage guidance | .agents/skills/personal-dashboard-collaboration/SKILL.md | Expand into cohesive package; consolidate scattered host/turn guidance; include personal retro |
| Existing external CLI | .agents/skills/personal-dashboard-daily-tasks/SKILL.md; src-tauri/src/main.rs | Local Tasks adapter exists; not a complete app-external Dashboard usage adapter; no Desktop-parity claim |
| UI and watch | frontend/main.ts; frontend/interface-language.ts; frontend/collaboration-voice.ts | Reuse session read/watch, input transactions and navigation; add incremental work history, rich readable reply and independent results |
| Prior timeout fix | .scratch/personal-dashboard-morning-timeout-repair/acceptance.md; d9a12a3 | Preserve separated JSON-RPC and turn lifetime budgets, delayed save consumption and bounded interrupt behavior |
| New developer retro | No full execution-evidence workflow retro found in reviewed interfaces | Add developer-side skill and evidence reading contract; do not add Dashboard app-development commands |

## Test entry points inspected

- src-tauri/tests/collaboration_workflow.rs: real CollaborationApplication with
  replaceable transport, fixed clock, file store and synthetic memory/vault.
- src-tauri/tests/collaboration_task_operations.rs: real Task/Today adapters,
  synthetic Vault, revision and operation effects.
- src-tauri/tests/collaboration_evening_review.rs; daily_plan_workflow.rs;
  habit_completion_workflow.rs; habit_snapshot_workflow.rs: related domain flows.
- App Server stdio/timeout tests within src-tauri/src/collaboration.rs.
- tests/frontend/collaboration-conversation-regressions.test.ts and
  collaboration-draft-refresh.test.ts: execution of production handlers/renderers
  with synthetic IPC, including JSON leakage and consumed-draft regressions.
- Related frontend action-results, habit-refresh and native-file-refresh suites.
- scripts/acceptance/macos-ipc-workflow.sh; macos-packaged-launch.sh and UI driver:
  existing native/packaged verification entrances, to adapt to this scope.

## Status limits

This inventory is read-only evidence of current source shape. No product tests,
builds, live Dida mutations, native installation or personal-data changes were
performed while publishing this spec. The accepted prototype is synthetic.
Prior acceptance documents retain their original dates and scope; they do not
establish acceptance for this redesign.

The installed tortilla-flat-management helper (skill 1.0.3) confirmed the
existing Tortilla Flat binding and project-personal-dashboard identity. The new
local redesign tracker is not among its registered sources. This publication
does not change the Registry or progress summary; connecting the new tracker is
a separate pending Management operation, not a blocker for local specification.
