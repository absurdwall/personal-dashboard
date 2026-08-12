# 05 — Complete the weekly goal with any qualifying workout

**What to build:** Make weekly success depend on actual qualifying exercise rather than strict schedule compliance, including manual unscheduled workouts and optional extra exercise.

**Blocked by:** 04 — Recover or skip a planned workout.

**Status:** resolved

- [x] The user can choose `Log workout now` without an associated planned slot and complete the same four-tap workout flow.
- [x] A qualifying unscheduled workout contributes to the current week’s `N of 3 completed` progress.
- [x] Qualifying primary, fallback, and unscheduled workouts are counted identically toward the weekly target.
- [x] Short efforts remain visible records but never count toward the target.
- [x] The third qualifying workout immediately marks the current week successful.
- [x] Reaching three qualifying workouts suppresses every remaining planned and fallback reminder for that week.
- [x] After reaching the target, the user can still log optional additional workouts without creating a new obligation.
- [x] The application-workflow test reaches the target through mixed primary, fallback, and unscheduled records and verifies reminder suppression, short-effort exclusion, and optional extra logging.

## Answer

Added a dashboard-level `Log workout now` action that starts the same click-only
activity, duration, and effort selections as a prompted workout. Workout records
now persist an explicit primary, fallback, or unscheduled source, including a
schema migration that safely resumes legacy in-progress records.

All qualifying workouts feed the same weekly count. The third qualifying record
immediately marks the week complete, removes the next departure obligation, and
suppresses primary, fallback, follow-up, and recording reminders for the rest of
the week. Manual optional workouts remain available after success, while short
efforts remain visible without incrementing progress.

Verification passed with nine application-workflow tests, syntax compilation,
whitespace validation, and clean Standards and Spec review axes.
