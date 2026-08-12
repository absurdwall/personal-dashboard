# 01 — Establish the local dashboard and reminder tracer bullet

**What to build:** A minimal but real local Mac application path that initializes the default exercise plan, preserves it locally, shows the current-week dashboard, and proves that a departure reminder can reach the user while the dashboard is closed.

**Type:** task

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] The application runs locally on the user’s current Mac for one user and requires no account, cloud service, sync service, or deployment.
- [x] A fresh local state initializes a Monday-through-Sunday exercise week with primary departure slots on Monday, Wednesday, and Friday at 4:00 PM.
- [x] A fresh local state initializes ordered fallback slots on Saturday and Sunday at 4:00 PM.
- [x] The dashboard shows `0 of 3 completed`, the next departure, and which fallback slots are available; it does not show a daily streak.
- [x] Closing and reopening the dashboard preserves the initialized plan and current-week state locally.
- [x] A scheduled departure produces a real local notification on the target Mac while the dashboard itself is closed.
- [x] One highest-level application-workflow test uses a controllable clock to verify the same initialized schedule, dashboard state, persistence, and reminder output through user-visible behavior.
- [x] Before introducing any dependency, framework, packaging system, or external service, the implementer obtains the explicit approval required by the project working agreements.

## Answer

Implemented a dependency-free Python application under `src/exercise_tracker/`.
It serves the current-week dashboard on localhost, atomically persists private
state under macOS Application Support, emits idempotent departure reminders,
and can register a current-session `launchd` runner that remains active when the
dashboard is closed. No dependency, framework, packaging system, external
service, or deployment configuration was introduced.

Verification completed on the target Mac:

- the controlled-clock application workflow passes in normal stdout mode;
- the same workflow passes in opt-in real macOS Notification Center mode;
- the `launchd` runner was observed active with no dashboard process running;
- syntax compilation, CLI smoke testing, the full test suite, and both required
  code-review axes pass.
