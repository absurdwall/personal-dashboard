# Local Exercise Habit Tracker v1

Status: ready-for-agent

## Problem Statement

The user wants to exercise regularly but currently expresses the goal only as “work out three times per week.” Because the user does not choose specific days and times, every possible workout day becomes a fresh negotiation. Work can run late, other commitments can intervene, and fatigue after work often wins. The main difficulty is not sustaining twenty minutes of exercise once the user reaches the gym; it is stopping work and leaving for the gym at a predetermined time.

Existing habit-tracking approaches would not solve this problem if they merely record completion, demand daily streaks, require typing, prescribe exercise routines before the user has stable preferences, or work only when the user remembers to open them. The first release needs to turn a vague weekly intention into a concrete, recoverable schedule; intervene at the departure moment; and keep interaction friction extremely low.

## Solution

Build a private, exercise-only habit tracker that runs locally on the user’s current Mac. It maintains a repeating schedule of three primary gym-departure slots—Monday, Wednesday, and Friday at 4:00 PM—and two ordered recovery slots—Saturday and Sunday at 4:00 PM.

At each departure time, the app actively asks the user to leave for the gym, move the workout to the next available fallback, or skip it with a preset reason. If the user does not respond, the app sends one follow-up fifteen minutes later and then stops. After the user confirms departure, the app prompts them ninety minutes later to record the workout through a four-tap, typing-free flow.

A week succeeds when the user records three workouts of at least twenty minutes, whether they occur in primary slots, fallback slots, or outside the schedule. The home screen emphasizes current-week progress, the next departure, and fallback availability. A simple history supports verification and correction. All records remain local and can be exported to and restored from a single backup file.

## User Stories

1. As the sole user, I want the app to focus only on exercise in version one, so that it solves one behavior well before becoming a generic habit tracker.
2. As the sole user, I want a goal of three qualifying workouts per week, so that “exercise regularly” has a concrete definition.
3. As the sole user, I want a workout of at least twenty minutes to qualify, so that the target represents meaningful exercise.
4. As the sole user, I want Monday through Sunday to form one workout week, so that primary and fallback slots belong to one predictable cycle.
5. As the sole user, I want Monday, Wednesday, and Friday at 4:00 PM to be my repeating primary departure schedule, so that I do not renegotiate workout days each week.
6. As the sole user, I want 4:00 PM to mean “stop work and leave for the gym,” so that the intervention targets the hardest part of the behavior.
7. As the sole user, I want Saturday at 4:00 PM to be the first fallback, so that one disrupted primary workout has a planned recovery path.
8. As the sole user, I want Sunday at 4:00 PM to be the second and last fallback, so that two disrupted primary workouts can still be recovered.
9. As the sole user, I want Saturday to be selected before Sunday when both fallbacks are free, so that rescheduling remains deterministic.
10. As the sole user, I want the default schedule to repeat automatically, so that I do not need a Sunday confirmation ritual.
11. As the sole user, I want silence to preserve the repeating schedule, so that failing to open the app does not unset future workouts.
12. As the sole user, I want to adjust both the day and departure time of an upcoming workout, so that I can accommodate a real schedule conflict.
13. As the sole user, I want a schedule edit to apply to the current week by default, so that an exception does not accidentally rewrite my routine.
14. As the sole user, I want unchanged slots to retain their defaults, so that editing one workout does not disturb the rest of the week.
15. As the sole user, I want permanent changes to the repeating routine to be a separate deliberate action, so that long-term settings cannot be changed accidentally.
16. As the sole user, I want an active local reminder at each planned departure time, so that I do not need to remember to open the dashboard.
17. As the sole user, I want reminders to work even when the dashboard is not open, so that the app can intervene at the moment it is needed.
18. As the sole user, I want the departure prompt to offer “Leaving for gym,” “Move to fallback,” and “Skip,” so that every response leads to an explicit state.
19. As the sole user, I want rescheduling to choose the next available fallback rather than reopening an open-ended calendar, so that recovery remains low-friction.
20. As the sole user, I want the dashboard to show fallback availability, so that I know whether recovery capacity remains.
21. As the sole user, I want to select a preset reason when I reschedule, so that the app preserves useful evidence without requiring writing.
22. As the sole user, I want to select a preset reason when I skip, so that a deliberate skip is distinguishable from silence.
23. As the sole user, I want “Work ran late,” “Too tired,” “Sick or injured,” “Another commitment,” and “Other” as the complete reason set, so that common causes are captured concisely.
24. As the sole user, I want “Other” to require no explanation, so that no flow introduces hidden typing.
25. As the sole user, I want one follow-up reminder at 4:15 PM when I ignore a 4:00 PM prompt, so that I get a second chance without repeated nagging.
26. As the sole user, I want the app to stop reminding me after that one follow-up, so that reminders remain respectful.
27. As the sole user, I want silence never to be recorded immediately as a deliberate skip, so that the app does not invent an intention.
28. As the sole user, I want an unanswered slot to remain unresolved during the week, so that I can still close it truthfully later.
29. As the sole user, I want any unresolved slot to close as “Missed — no response” when its week ends, so that historical state is complete without inventing a reason.
30. As the sole user, I want a single “Record workout” prompt ninety minutes after tapping “Leaving for gym,” so that I remember to close the loop without running an exercise timer.
31. As the sole user, I want workout completion to take exactly four quick taps—Done, activity, duration, and effort—so that tracking does not become another chore.
32. As the sole user, I want Elliptical, Weight training, and Other exercise as the complete activity list, so that the app supports my likely activities without a crowded menu.
33. As the sole user, I want Under 20, 20, 30, 45, and 60+ minutes as duration choices, so that I can record useful approximations without entering exact minutes.
34. As the sole user, I want the effort question to ask “How strenuous did this workout feel?”, so that the field has a consistent meaning.
35. As the sole user, I want Very easy, Easy, Moderate, Hard, and Very hard as effort choices, so that perceived exertion is recorded without ambiguous numbers.
36. As the sole user, I want effort to be descriptive rather than scored as good or bad, so that harder is not automatically treated as better.
37. As the sole user, I want a workout under twenty minutes to be retained as a short effort, so that genuine activity is not erased.
38. As the sole user, I want a short effort not to count toward the weekly target, so that the qualifying rule stays stable.
39. As the sole user, I want a qualifying fallback workout to count exactly like a primary-slot workout, so that successful recovery is not treated as lesser success.
40. As the sole user, I want to log an unscheduled workout through the same click-only flow, so that exercise outside the plan is recognized.
41. As the sole user, I want an unscheduled qualifying workout to count toward the weekly target, so that the app rewards actual behavior rather than schedule compliance alone.
42. As the sole user, I want the week to become successful as soon as three qualifying workouts are recorded, so that the outcome is unambiguous.
43. As the sole user, I want remaining workout reminders to stop after three qualifying workouts, so that extra exercise does not become an obligation.
44. As the sole user, I want to log optional additional workouts after reaching three, so that the app does not discard exercise I choose to do.
45. As the sole user, I want the home screen to lead with “N of 3 completed,” so that I can understand this week’s status immediately.
46. As the sole user, I want the home screen to show the next departure time, so that the next action is always visible.
47. As the sole user, I want the home screen to show available fallback slots, so that I can see the week’s remaining recovery capacity.
48. As the sole user, I want the home screen to avoid daily streaks, so that rest days do not appear to be failures.
49. As the sole user, I want a simple reverse-chronological history of workout records, so that I can verify what was saved.
50. As the sole user, I want history without charts, insights, or coaching in version one, so that the product stays focused on execution.
51. As the sole user, I want to correct a record’s activity, duration, and effort using the same preset controls, so that accidental taps do not corrupt my history.
52. As the sole user, I want deletion to require confirmation, so that correcting one mistake does not create another.
53. As the sole user, I want corrected or deleted records to update the corresponding week’s completion state, so that dashboard and history remain consistent.
54. As the sole user, I want the app to retain schedules, completions, reschedules, skips, reasons, activities, durations, and effort locally, so that evidence is available for later learning.
55. As the sole user, I want no required or optional free-text fields anywhere in version one, so that every interaction stays click-only.
56. As the sole user, I want to export all local app data into one backup file, so that my history is not disposable.
57. As the sole user, I want to restore all app data from that backup file, so that I can recover my schedule and history without a cloud account.
58. As the sole user, I want restoration to reproduce the backed-up user-visible state, so that a backup can be trusted.
59. As the sole user, I want all personal data to remain on my Mac unless I explicitly export a backup, so that version one remains private and local-first.
60. As the sole user, I want no account, cloud service, or sync requirement, so that the first release works independently on my current computer.

## Implementation Decisions

- Version one is an exercise-specific, single-user, single-Mac local application. It is not a generic habit framework.
- The exercise week runs Monday through Sunday.
- The weekly goal is three qualifying workouts. A qualifying workout has a recorded duration of twenty minutes or more.
- The repeating primary schedule is Monday, Wednesday, and Friday at 4:00 PM. These times represent gym departure, not workout start.
- The ordered fallback schedule is Saturday at 4:00 PM followed by Sunday at 4:00 PM.
- The repeating schedule persists automatically. There is no weekly confirmation prompt.
- Edits to an upcoming slot may change its day, departure time, or both. They affect the current week by default and leave other slots unchanged.
- Changing the repeating default is a separate deliberate settings operation.
- Moving a workout selects the next available fallback in order. The user interface must accurately show when no fallback remains.
- The departure prompt has exactly three outcomes: Leaving for gym, Move to fallback, and Skip.
- Move to fallback and Skip both collect one of five preset reasons: Work ran late, Too tired, Sick or injured, Another commitment, or Other.
- There are no text fields, including optional notes or explanations for Other.
- An unanswered departure prompt produces one follow-up after fifteen minutes. It does not continue nagging and does not infer a skip.
- An unresolved slot closes as Missed — no response at the end of its workout week.
- Leaving for gym schedules one Record workout prompt ninety minutes later. Version one does not include a workout timer.
- The completion flow consists of four selections in order: Done, activity, duration, and perceived effort.
- Activity values are Elliptical, Weight training, and Other exercise.
- Duration values are Under 20, 20, 30, 45, and 60+ minutes.
- Perceived-effort values answer “How strenuous did this workout feel?” with Very easy, Easy, Moderate, Hard, and Very hard.
- Perceived effort is descriptive. The product must not imply that a harder workout is inherently better.
- Under-20-minute records are stored as short efforts and do not increment weekly qualifying progress.
- Qualifying primary, fallback, and unscheduled workouts all increment the same weekly progress count.
- Reaching three qualifying workouts marks the week successful and suppresses remaining scheduled reminders for that week. Additional workouts may still be logged manually.
- The primary view is a current-week action dashboard showing qualifying progress, next departure, and fallback availability. It does not show a daily streak.
- The history view is a plain reverse-chronological list of workout records without charts or generated insights.
- History records may be corrected using the original preset values or deleted after confirmation. Derived weekly state must remain consistent with the corrected record set.
- The local data model must preserve scheduled slots, schedule changes, reminder responses, reschedules, skips, preset reasons, missed-no-response outcomes, workout records, and record corrections/deletions.
- Backup exports the complete local product state to one user-controlled file. Restore must reconstruct that state from the file. The exact serialization format is not part of the user-facing contract.
- Active reminders must be reliable on the target Mac even while the dashboard is closed. The technical mechanism, including startup behavior and packaging, is deliberately not selected by this spec.
- No technology stack, dependency, external service, or deployment configuration is authorized by this spec. Existing project rules requiring explicit approval for those choices remain in force.

## Testing Decisions

- Use one highest-level application-workflow seam. Tests should drive the product through user-visible actions with a controllable clock and assert user-visible state, emitted reminder behavior, and persisted/restored outcomes.
- Tests must verify external behavior rather than component structure, internal database representation, timer implementation, or notification-framework calls.
- The workflow seam must cover the default Monday/Wednesday/Friday schedule, ordered weekend fallbacks, current-week schedule exceptions, and deliberate permanent schedule changes.
- The workflow seam must cover the initial departure prompt, the single fifteen-minute follow-up, no repeated nagging, and end-of-week Missed — no response closure.
- The workflow seam must cover Leaving for gym followed by the single ninety-minute Record workout prompt.
- The workflow seam must cover all click-only option sets and prove that no version-one path requires text input.
- The workflow seam must distinguish qualifying workouts from short efforts and cover primary, fallback, and unscheduled completions.
- The workflow seam must prove that the third qualifying workout marks the week successful, suppresses remaining reminders, and still permits extra manual records.
- The workflow seam must cover rescheduling and skipping with each preset reason, including Other without free text.
- The workflow seam must cover dashboard progress, next-departure calculation, fallback availability, and the absence of daily-streak semantics.
- The workflow seam must cover chronological history, preset-based correction, confirmed deletion, and recomputation of derived weekly state.
- The workflow seam must cover backup followed by restore and assert that the restored user-visible schedule and history match the exported state.
- The same external application boundary must be used to validate real notification delivery on the target Mac. Platform-specific mechanics may be exercised through a platform acceptance mode without creating a second domain-testing seam.
- The project is greenfield and contains no prior application tests to imitate. The first implementation should establish this single workflow seam as the project’s testing prior art rather than scattering behavior across low-level unit tests.

## Out of Scope

- Tracking getting up early, reading, supplements, planning, or any habit other than exercise
- A generic habit-definition engine
- Choosing or prescribing a specific activity during weekly planning
- Detailed workout routines, exercise programming, or coaching
- A workout timer
- Charts, insights, trend analysis, recommendations, or a rolling four-week analytics view
- Daily streaks
- Planned pause mode for travel, illness, or recovery
- Required or optional free-text notes
- User accounts, authentication, or multi-user support
- Cloud storage, cloud backup, or synchronization
- Phone, tablet, Windows, or multi-device support
- Deployment or hosting
- Selection of the application framework, storage engine, packaging system, or macOS notification mechanism
- Automatic launch-at-login behavior as a product decision

## Further Notes

- The behavioral hypothesis is that concrete departure commitments plus bounded recovery options will reduce daily renegotiation and make exercise more consistent.
- The first-release validation period is four weeks. The release is considered useful if the user completes three qualifying workouts in at least three of those four weeks and finds the interaction flow easy enough to keep using.
- Elliptical is the expected initial default in practice, but the app does not preassign it to scheduled slots.
- Full local history is retained now so that later product work can evaluate sustainable activities and effort patterns. Version one intentionally does not interpret that data.
- Cloud storage or syncing may be considered later. Phone and tablet expansion comes only after any optional cloud/sync stage and is not implied by this spec.
