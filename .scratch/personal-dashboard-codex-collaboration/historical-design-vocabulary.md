# Historical collaboration design vocabulary

Preserved from the earlier local design draft during Git closeout. This is historical design evidence; the canonical vocabulary remains in `CONTEXT.md`.

## In-app collaboration design vocabulary

These terms describe the proposed collaboration experience, not shipped behavior.

**Collaboration workspace**:
A dedicated Personal Dashboard destination for discussing personal arrangements, carrying out requested work, and inspecting its results in connection with the existing product destinations.
_Avoid_: Today section, separate task source

**Collaboration session**:
A continuing conversation and work history in the collaboration workspace. Multiple sessions may concern the same lived day, and a session may address more than one date; its history is distinct from the Tasks and Daily Records it changes.
_Avoid_: Task, Daily Record, one required conversation per day

**Long-term personal context**:
Maintained personal preferences, routines, and durable background that inform future collaboration. Explicit user changes may update it directly; inferred durable conclusions require user confirmation.
_Avoid_: Daily transcript, temporary mood, task completion state

**Recent continuity context**:
A maintained summary of recent circumstances and unresolved matters useful across collaboration sessions. It may be maintained automatically and does not replace original records or current operational state.
_Avoid_: Complete conversation archive, permanent personal trait, second task ledger
