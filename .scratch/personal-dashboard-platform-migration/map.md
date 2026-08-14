# Personal Dashboard platform migration implementation map

## Current frontier

- [01 — Preserve the completed baseline](issues/01-preserve-completed-baseline.md) — resolved
- [02 — Launch Personal Dashboard as a Mac app](issues/02-launch-personal-dashboard-mac-app.md) — resolved
- [03 — Persist and exchange a minimal Mac profile](issues/03-persist-exchange-minimal-mac-profile.md) — resolved
- [04 — Deliver a notification with the Mac window closed](issues/04-notify-with-mac-window-closed.md) — resolved
- [05 — Install the minimal shell on the target iPad](issues/05-install-minimal-ipad-shell.md) — resolved
- [06 — Install the minimal shell on the target Samsung phone](issues/06-install-minimal-samsung-shell.md) — resolved
- [07 — Show the persistent exercise week and first departure reminder](issues/07-show-exercise-week-first-reminder.md) — resolved
- [08 — Respond to departure or receive one follow-up](issues/08-respond-or-receive-follow-up.md) — resolved
- [09 — Record a workout through the established flow](issues/09-record-workout-established-flow.md) — resolved
- [10 — Recover or skip a planned workout](issues/10-recover-or-skip-workout.md) — resolved
- [11 — Complete the weekly goal with any qualifying workout](issues/11-complete-weekly-goal.md) — resolved
- [12 — Close the week and repeat the routine](issues/12-close-week-repeat-routine.md) — resolved
- [13 — Adjust this week or deliberately change the routine](issues/13-adjust-week-or-routine.md) — ready-for-agent
- [14 — Review, correct, and delete workout history](issues/14-review-correct-delete-history.md) — ready-for-agent

## Blocked tickets

- [15 — Back up and restore the complete profile](issues/15-back-up-restore-profile.md) — blocked by 12, 13, 14
- [16 — Move the authoritative profile safely](issues/16-move-authoritative-profile.md) — blocked by 15
- [17 — Automatically migrate the completed Mac profile](issues/17-migrate-completed-mac-profile.md) — blocked by 16
- [18 — Cut over to the Tauri-only Personal Dashboard](issues/18-cut-over-tauri-only.md) — blocked by 17

## Dependency notes

- Tickets 03 and 04 may proceed in parallel after 02.
- Tickets 05 and 06 may proceed in parallel after the Mac capability gate.
- Ticket 13 may proceed alongside the main behavior chain after 07.
- Ticket 14 may proceed alongside 12 after 11.
