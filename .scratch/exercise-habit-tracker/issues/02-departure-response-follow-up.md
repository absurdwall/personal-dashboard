# 02 — Complete departure response and one follow-up

**What to build:** Let the user act on the departure reminder by confirming that they are leaving for the gym, while treating an ignored reminder as unresolved and issuing exactly one respectful follow-up.

**Type:** task

**Blocked by:** 01 — Establish the local dashboard and reminder tracer bullet.

**Status:** resolved

- [x] At a planned departure time, the user can choose `Leaving for gym` from the departure prompt.
- [x] Choosing `Leaving for gym` records an explicit departure response and prevents the ignored-reminder follow-up for that slot.
- [x] Choosing `Leaving for gym` schedules one `Record workout` prompt for ninety minutes later.
- [x] If the departure prompt receives no response, the app sends one follow-up fifteen minutes after the planned departure time.
- [x] The app sends no additional departure reminders for that slot after the follow-up.
- [x] Silence leaves the slot unresolved during the current week and does not infer a deliberate skip.
- [x] The controlled-clock application-workflow test verifies the response, ninety-minute prompt scheduling, fifteen-minute follow-up, no repeated nagging, and unresolved state through observable behavior.

## Answer

Implemented the departure-response workflow in the dependency-free local Python
application. The dashboard now presents a `Leaving for gym` action for a due
slot, persists that explicit response, and shows the scheduled workout-record
prompt time. The independent reminder runner sends either one respectful
fifteen-minute follow-up for an unanswered slot or one workout-record prompt
ninety minutes after confirmation, with persisted idempotency fields preventing
repeat notifications. Existing version-one state files are migrated locally to
the new schema.

The controlled-clock application workflow covers both the confirmed and silent
paths through HTTP and notification output. The focused test, full test suite,
syntax compilation, whitespace check, and the Standards and Spec review axes
all pass; the review found no remaining blocking code or behavior issues.
