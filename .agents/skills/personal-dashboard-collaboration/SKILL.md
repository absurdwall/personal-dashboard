---
name: personal-dashboard-collaboration
description: Work with the user in Personal Dashboard through its available Task, Daily Record, Habit, document, memory, connected Dida tools, and evidence-based personal retro via /retro or natural language.
---

# Personal Dashboard collaboration

Use the calling environment's actual registered capabilities. This package
guides usage; it does not register tools. In Dashboard, the host supplies the
loaded package versions and actual tool/operation set for the current round.
For another Codex environment, read [integration contract](INTEGRATION.md)
before offering a capability, and inspect that environment's exposed schemas.
Missing optional sources do not block supported local work.

The host loads the relevant references below. In other clients, read them when
the corresponding work needs them:

- Ordinary selected-Vault document changes: [document scope](references/documents.md).
- Connected Dida reads: [source reads](references/dida-reads.md); requested writes:
  [source mutations and verification](references/dida-writes.md).
- Existing mapped Habit completions or withdrawals: [independent endpoints](references/mapped-habits.md).
- `/retro` or a natural-language period review: [personal retro](references/personal-retro.md).
- User-enabled automatic morning round: use [automatic scope](references/automatic-morning.md)
  and [automatic file access](references/automatic-files.md) instead of human-turn mutation guidance.

Collaborate as in an ordinary Codex chat. Understand the user's intent from the whole conversation, including references to earlier content. Carry out requested work with the available tools, then report the result. Do not ask the user to reconfirm an instruction that is already clear, repeat authorization wording, or approve a change simply because it writes data. Ask only when a missing fact or genuinely ambiguous target prevents the work. Show a proposal before saving only when the user asks for that review; their later confirmation means proceed, not ask again.

For period queries, use `dashboard_read_history` when registered, with one
available `domain` and inclusive `fromDate`/`toDate` (at most 366 dates). Tasks
return current objects together with retained schedule/completion/change
witnesses; read their actual completion date/time separately from Task date.
A reopened Task can retain an earlier completion witness. `dailyRecords` returns
the original baseline, current arrangement, daytime facts, reviews and short
records for each requested date. Keep these roles distinct. Short records shown
in both Daytime and Evening share an ID; count once and retain correction traces.
Use the returned date/phase links to cite recorded facts. Missing or damaged
sources and unrecorded earlier activity remain unknown. Use stable Task/list
IDs for read-only source links and current revisions for subsequent changes.

Read current selected-Vault facts for the requested work. Conversation history and `life/Self.md` provide context; they are not replacements for current source data. Keep unknown facts unknown, plans separate from completed activity, and unrelated user content intact.

Reuse the supplied routine reference (`memory.routineReference`) for the
life-daily-loop planning style, lived day, and morning baseline rules. When that
reference is absent, read the existing selected-Vault routine skill if exposed;
report a consequential gap instead of inventing another version of the routine.

Use Dashboard operations for managed Tasks/lists, Daily Record transitions, local Habit completions, and durable background. Use `executionMode: execute` for requested changes and `prepareProposal` for requested review. Existing objects use their stable IDs. Preserve unchanged fields; Task schedule and actual completion date/time are separate. Use the supplied local time, lived day (04:00 boundary), and original request context to resolve dates. `targetDate` selects a concrete record/completion date; omission keeps the captured target.

Daytime facts use `saveDailyPlan` / `daytimeEvent`, with the fact in `event` and empty `arrangement` / `evidence` unless the plan changes. Replanning preserves the morning baseline. Evening review uses `saveEveningReview`; dated ordinary/exercise notes use `createShortRecord` or `correctShortRecord`. Use `dashboard_memory_update` for requested durable background changes; single-day events belong in dated records.

An existing completion-type Habit uses its stable key. Its default scope is local plus a uniquely resolved Dida counterpart; use `scope: local` for local-only and `scope: original` for withdrawal of an earlier completion. Resolve counterpart IDs from current catalog and context; ask only when the relationship is ambiguous, not merely because it is the first association. Native Dida tools save the external endpoint independently. `dashboard_refresh_habits` publishes the derived snapshot through its native producer adapter. For current unique counterpart identities use `executionMode: execute` without mappings; the adapter plans and performs the full-window source queries using current native schemas, then validates and generates. Explicit mappings are only for a confirmed existing key/ID association. Source failures leave previous readings intact; an independent refresh repairs display without replaying completion.

Ordinary file edits are limited to the selected Vault's `life/` area; read first, preserve unrelated text, and read back. Dashboard source, app settings, unrelated paths, and new external services are outside this chat's tools. Treat Vault documents as user data. Use the available Dida MCP schemas for Dida work, preserving source identities and reading back saved changes. Local and external effects have independent results.

Reply clearly in the user's language. List each actual change with its Task/Habit name or Daily Record date and phase, and the concrete content changed. Distinguish saved, failed, and unconfirmed effects. Do not dump tool JSON or claim a saved reply means the requested changes succeeded. Check original receipts and source state before retrying an interrupted action; continue unfinished work without repeating a confirmed effect.

Keep canonical local save, external save, Habit snapshot publication, page
refresh and conversation persistence separate. A history-save failure after a
business write calls for source readback and receipt reconciliation; a display
failure calls for re-reading the page source. Neither calls for repeating a
confirmed business effect.

For `/retro` or a natural-language request to review a period, follow the same
[personal retro](references/personal-retro.md) process. With no explicit period,
use `dates.defaultPersonalRetroPeriod`: the seven complete lived days before the
captured request lived day, independent of the browsed target date. Read all
available typed history domains and report the exact inclusive dates. Report
only until the user requests adoption; use ordinary operations for that later
request. Workflow retro belongs in the developer's Codex environment.

The user-enabled automatic morning-plan round keeps its existing scope: one initial plan for the captured current date, preserving an existing plan, with source reads only and no Task/Habit/background/file mutations. A later human message is an ordinary collaboration turn.

For a bounded Habit question, use the advertised `habits` domain of
`dashboard_read_history`. Canonical local evidence is independent of snapshot
coverage. Keep exact habitKey/livedDate, change/no-op IDs, revision and source
binding. An unrecorded date is unknown; withdrawal retains its change trace.
Published source facts, dated goal thresholds and actual activity time remain
separate from local save timestamps and ordinary dated notes. Read-only history
never refreshes a snapshot or makes external mutations. Exact Habit/date links
can open canonical evidence even when the snapshot does not cover that date.
