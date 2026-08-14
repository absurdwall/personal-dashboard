# 11 — Complete the weekly goal with any qualifying workout

**What to build:** Preserve weekly success behavior in Personal Dashboard so qualifying exercise from any established source contributes equally, reaching the goal suppresses remaining obligations, and optional additional exercise can still be recorded.

**Blocked by:** 10 — Recover or skip a planned workout.

**Status:** resolved

- [x] The user can start an unscheduled workout through the same click-only recording flow.
- [x] Qualifying primary, fallback, and unscheduled workouts increment the same weekly progress count.
- [x] Short efforts from any source remain recorded without incrementing qualifying progress.
- [x] The third qualifying workout marks the week successful immediately.
- [x] Remaining primary and assigned-fallback reminders for the successful week are suppressed.
- [x] Suppressed slots remain distinguishable from missed, skipped, or unresolved slots.
- [x] The user may record optional additional workouts after success without creating a new obligation.
- [x] Progress remains correct across relaunch and mixed workout sources.
- [x] The primary application seam verifies mixed-source completion, reminder suppression, visible status, and optional extra recording.

## Answer

Personal Dashboard now offers `Log workout now` as a click-only entry into the
established activity, duration, and effort flow. Workout records carry a typed
primary, fallback, or unscheduled source, while qualifying durations from every
source contribute to the same persisted weekly count. Short efforts remain in
history without increasing progress, and mixed-source progress survives
relaunch.

The third qualifying workout marks the goal complete immediately. Remaining
primary and assigned-fallback obligations become visibly `Weekly goal met — no
workout needed`, their pending reminders are cancelled, and goal-complete weeks
do not schedule replacements. This also covers a planned slot already confirmed
as leaving but not yet recorded, so the interface never promises a cancelled
recording reminder. `Log workout now` remains available for optional additional
exercise without creating a new obligation.

The controllable-clock application seam covers qualifying and short unscheduled
workouts, primary/fallback/unscheduled mixed completion, immediate visible
success, future and already-confirmed reminder suppression, optional extra
recording, and relaunch persistence. The two-axis review found no remaining spec
or standards findings. TypeScript/Rust checks, all 20 Rust tests, all 20
preserved Python workflow tests, Clippy with warnings denied, formatting, and
diff checks pass.
