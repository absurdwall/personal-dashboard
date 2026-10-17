# Collaboration prototype — decision evidence

ID: PDCR-PROTOTYPE-01
Date: 2026-10-09
Status: accepted as sufficient for specification
Implementation/native acceptance: not established

## Question and verdict

The prototype asks whether the user can understand ongoing work, independent
results, recovery and stop/queue interactions inside the actual Personal
Dashboard app shell. The user described it in the design chat as sufficient,
although not completely satisfying visually, and in the prototype chat said:
“嗯，行，差不多，我们这个prototype可以视为通过。”

The accepted baseline is the updated app-shell version, not the initial isolated
chat page. No further visual redesign is required before specification. This is
interaction acceptance only; synthetic events, hardcoded example summaries and
in-memory results are not runtime/source/persistence acceptance.

## Primary source

- Prototype chat: “Collaboration 交互状态 prototype”,
  01a121a8-1921-7ba1-b4be-8b49563add74.
- Accepted turn: 01a121b5-5b9f-7b00-a651-a7ebf70f4c47.
- Throwaway branch: codex/collaboration-execution-prototype.
- File on that branch: .scratch/collaboration-execution-prototype.html.
- Open the file directly after recovering it from that branch; it is a
  self-contained HTML/CSS/JS demo. Do not merge the demo shell into product code.
- The original two-variant conversation illustration selected “折叠工作过程”.
  The accepted prototype subsequently reuses the existing Dashboard app shell.

## Decisions carried forward

1. Normal execution shows progress, actual work history and final outcome;
   completed work history defaults to collapsed and remains inspectable.
2. Earlier failed attempts remain visible after recovery. Local success,
   external failure and page/snapshot refresh failure can coexist.
3. Ordinary messages queue. Stop pauses queued work; a correction starts a new
   turn before explicitly continuing the paused queue. Removing an unexecuted
   queued message does not undo completed work.
4. Confirmed changes survive stop. An in-flight operation remains unconfirmed;
   read-only reconciliation can establish that it actually completed without
   repeating the write.
5. The final report and navigation are in the existing app environment, with
   actual source outcomes distinct from reply text.

## Simulation details not carried forward as product behavior

- Demo buttons, step navigation, reset and state inspector are evaluation tools,
  not product UI.
- The scripted read/save/refresh sequence does not prescribe an Agent pipeline.
- Example “思考摘要” and progress sentences are hardcoded demo content. Product
  uses actual generated commentary and available runtime summaries; missing
  summaries remain absent. Tool labels can map actual tool events into readable
  UI text. No hidden reasoning is reconstructed.
- The demo's broad block on starting work whenever any prior fact is unknown is
  not a product-wide restriction. Reconciliation gates only a potentially
  duplicated effect; unrelated work remains available.
