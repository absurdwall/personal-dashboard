# Experience refinement: confirmed requirement clarifications

Date: 2026-10-11

Status: all four key questions confirmed by the user. This is a supporting
requirements record for the new refinement discussion, not a published Lenspec,
implementation ticket, prototype, or implementation result. It supplements the
full discussion summary in this chat and does not reopen the previous iteration's
closed tracker items.

The user invoked `grill-with-docs` to resolve only consequential ambiguities.
Routine implementation choices and visual details remain for subsequent design
and prototype work. The user accepted the recommendations for questions 1–4.

## 1. Cancelling a Task's time arrangement retains its date

For a Task dated today with a planned interval of 18:00–18:45, “cancel time
arrangement” removes the start time and execution interval, including its end.
It preserves today's date, Task identity, content, list and completion state.

The Task leaves the timed timeline but remains in the Today task view and on its
Calendar date. Clearing or changing the Task date is a separate action. Deleting
the Task is also a separate action and affects the same shared Task across views.

This rule concerns Tasks. Changes to a Daily Record's current arrangement retain
the independent morning baseline, as already agreed in the discussion.

## 2. An explicit drag selects an approximate clock time

An untouched arrangement stated as “afternoon” continues to display “afternoon”,
even if its default display position is 13:00. The display anchor does not change
the user's stated time precision.

If the user explicitly drags that arrangement to 16:00, its current arrangement
becomes and displays “about 16:00”. It remains approximate; dragging does not
silently create an exact interval, an observed activity or completion evidence.
The morning baseline remains independently retained.

The important distinction is default placement versus an explicit user choice.
Card appearance, drag feedback and snapping details remain for the prototype.

## 3. Weekly Habit goals count attained days

A weekly goal described during discussion as “three times per week” means three
distinct attained days. Completing the same Habit Monday morning and Monday
evening counts as one attained day, not two.

The UI should express this as “three days per week” to avoid suggesting a session
counter. Repeating a local completion or combining local and mapped external
completion evidence does not increase the count for the same Habit and lived
day. Existing time-threshold goals remain distinct goal types.

This requirement does not introduce multiple occurrences per day, quantity
tracking or exercise-session tracking. Those would require a separate model and
are not needed to satisfy the confirmed weekly day target.

## 4. Habit goal changes take effect next cycle

A weekly goal edited on Wednesday from three attained days to five takes effect
next week. The current week continues to use the previous three-day goal.

A daily goal edited during the current lived day takes effect on the next lived
day. The current day continues to use its existing goal.

Earlier periods retain their applicable goals and attainment results. Changing
today's settings must not make a previously attained period become unattained,
or reinterpret its old records using the new target. Before a future goal becomes
effective, the settings should distinguish the currently applicable goal from the
pending next-cycle goal; the precise presentation is a prototype decision.

## Documentation and next-step boundary

The canonical terms are recorded in `CONTEXT.md`, under “Experience refinement
vocabulary · 2026-10-11”. They describe agreed future behavior rather than
claiming that the installed application already supports it.

These answers resolve the four consequential ambiguities identified in this
interview. No additional key questions are pending from this round. Visual
comparison can next address timeline density, detail presentation and compact
editing controls; a later Lenspec should carry these four rules forward as
behavioral requirements. Neither prototype construction nor implementation has
been started by this clarification record.
