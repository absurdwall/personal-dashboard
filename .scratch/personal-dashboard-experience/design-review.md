# Experience specification: design review

2026-10-10. The user accepted prototype R and requested only consequential questions before writing the specification. This record is an interview aid, not a published specification or an implementation queue.

## Settled

- Use the accepted R prototype and its README as the visual reference: B-style Tasks with list sidebar and details; compact equal-height Calendar cells; Morning text; one Daytime axis with temporary lanes only during overlap; slash discovery and the Evening review entry.
- Approximate and exact plan times coexist. Approximate placement remains approximate and does not establish activity evidence.
- Direct manipulation mechanically updates the corresponding source section in its Markdown document, without an LLM or another approval step. The user clarified that document/display consistency is mandatory: an edit to Morning arrangement changes Morning; a daytime plan update or factual correction changes the corresponding daytime record. Matching-looking entries do not by themselves require both sections to change. The prototype's shared-ID double update is a demonstration, not the final ownership contract.
- Task intervals persist as planned execution intervals. Moving a Task moves the entire interval; point-only old Tasks stay point-only. Planned length is not a deadline, observed duration or completion evidence. The user explicitly accepted this recommendation.
- Normal dragging on the Daytime axis updates Current arrangement, not Morning baseline. Morning planning or explicit baseline correction has its own write ownership. The user explicitly accepted this as Q3.
- Workflow Retro findings remain separate development work. Habits and normal account-quota exhaustion are not experience defects in this scope.
- Production field names, stable identities, compatibility, conflict handling, precise visual dimensions and input mechanics are delegated to the Agent.

## Numbered decisions

- **Q1 — source consistency**: answered. The user requires the display and the corresponding Markdown section to agree. Morning edits update Morning; daytime plan updates or factual corrections update the corresponding daytime record. The original suggested matching-plan synchronization was not accepted as a universal double-write rule.
- **Q2 — Task interval meaning**: answered yes to the recommendation. Persist a planned execution interval, distinct from deadlines and observed activity.
- **Q3 — default edit ownership**: answered yes to the recommendation. Normal daytime dragging changes Current arrangement; explicit Morning planning/correction changes Morning. The user noted that the previous question omitted its number; Q3 restores the sequence.
- **Q4 — testing boundary**: answered yes during the explicitly invoked to-spec workflow. Reuse existing application operations and real persistence with synthetic Vault/Profile data, then exercise the packaged App's UI. Prototype memory and source-string checks are not acceptance.

## Open frontier

None. The accepted prototype and Q1–Q4 provide the shared understanding recorded in the [to-spec specification](spec.md). The previous non-template draft was explicitly deleted and replaced. Remaining implementation details are delegated to the Agent; [publication](publication.md) is pending because GitHub is unavailable.

## Current source evidence

- `CONTEXT.md` defines Morning baseline and Current arrangement independently, and defines Task with a single optional date/time.
- `src-tauri/src/today.rs`: `DailyPlanBlockInput` has period/title/detail but no per-plan identity; existing current-arrangement and baseline-correction paths change the two arrangements independently.
- `src-tauri/src/tasks.rs`: Task view, create/update inputs and persisted record currently have date/time but no duration or end time.
- The R prototype uses synthetic shared plan IDs and in-memory Task durations; these are design demonstrations, not current persistence capabilities.

Document the answered semantics in the project context and specification before implementation. The proposed ownership follows the existing baseline/current boundary; a new ADR is not needed unless that boundary changes.
