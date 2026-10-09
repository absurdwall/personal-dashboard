# Personal retro

Use this process for `/retro` and natural-language requests to review a period.
Examples: `/retro`, `/retro 2026-09-21..2026-09-27`, or
“复盘九月最后一周的计划和实际”。 These are messages for the same model to
understand, not a host command parser. It is ordinary Collaboration with the same
model, tools and session. Do not
create another Agent, store, external connection or scheduled workflow.

## Resolve a period and read evidence

1. Resolve an explicit inclusive calendar-date period from the user's request
   and supplied date facts. Without one, use `dates.defaultPersonalRetroPeriod`
   (seven complete lived days before `dates.requestLivedDate`). Start immediately
   and state the exact `fromDate`–`toDate`; the user may adjust them directly in
   the next message. The browsed `targetDate` is not the default anchor. In other
   environments lacking that fact, derive the same range from the actual local
   request timestamp using the existing daily-flow 04:00 rule; disclose a date
   gap if unavailable rather than guess. Split a requested range over 366 days
   into bounded non-overlapping reads and disclose any unread portion.
2. Use the actual registered `dashboard_read_history` domains, with the same
   explicit `fromDate`/`toDate`: `tasks`, `dailyRecords`, `habits`. Consume each
   returned result before drawing conclusions; the current chat/context is not
   period evidence. Only skip a domain if its adapter is not advertised or a
   read fails, and name that gap while continuing with usable local domains.
   A successful empty/missing result is coverage information, not a failed read.
3. Read optional sources only when needed and already available. Their absence
   does not require new login/connection and does not block local analysis. This
   report does not refresh the Habit snapshot or mutate local/external data.

## Interpret the three typed sources

- **Daily Records:** retain morning baseline and its basis separately from the
  latest current arrangement. Daytime observed facts, evening accounts and dated
  Short Records/corrections describe what was recorded, not all activity. The
  same stable Short Record may appear in two phases; count it once. Preserve
  source revisions, date/phase links, and each date's state/evidenceAvailability.
  Missing, damaged and unavailable records remain different evidence gaps.
- **Tasks:** preserve stable Task/list IDs, current canonical state, scheduled
  date/time, actual completedOn/completedTime, and retained change witnesses.
  A completion on another date does not reschedule the Task. Current state is
  not an as-of historical state; a reopened Task may have an earlier confirmed
  completion. A save/change timestamp is not work duration or activity time.
- **Habits:** canonical local completed/withdrawn changes and accepted no-op
  receipts retain habitKey/livedDate, revisions and source binding. Unrecorded
  local state is unknown. Projection is a separate published source: report its
  state/generatedAt, covered dates, source labels and dated goal context. A stale,
  missing, partial or out-of-range projection does not erase canonical facts.
  Local and mapped external observations do not create two completed days for
  the same Habit/date. Keep threshold-met and actual clock-time facts distinct;
  recordedCompletedAt/changedAt are save times. Dated notes alone are not Habit
  completion evidence. Unknown actual wake/sleep time remains unknown even if a
  threshold was met. Never interpret missing coverage as a failed habit.

## Report and subsequent adoption

Explain the original plans, recorded actuals and unrecorded/unknown portions,
then the supported Task/Habit patterns and useful suggestions. Adapt the report
length and structure to the user's question. State source/date coverage,
freshness/provenance and limitations near affected observations. Cite source
links using returned stable identities: `dashboard://record/DATE?phase=...`,
`dashboard://task/ID`, `dashboard://list/ID`, and
`dashboard://habit/KEY?date=DATE`. Links are read-only navigation. If a source is
missing, describe that date's gap without inventing an object or evidence link.

Separate observation from inference and suggestions. Without actual time data,
do not calculate wasted hours, inactivity, goal failure or productivity scores.
Sparse records can support limited observations, not a judgment about the whole
period. A partially unavailable source should narrow conclusions, not cancel the
report. Do not present a snapshot's generatedAt as live external verification.

Default output stays in the conversation. Do not save an evening review, rewrite
history/background, change a plan or Task, publish a snapshot, or execute a Habit
operation merely because the report suggests it. If the user subsequently asks
to adopt a specific suggestion, read the current target/revision and execute the
ordinary advertised operations within that request's dates and scope. Their
clear adoption request does not need a new approval layer.
