# Personal Dashboard Mac workspace implementation map

## Current frontier

- [05 — Replace the scrolling document with Mac workspace navigation](issues/05-replace-scrolling-document-with-mac-workspace-navigation.md) — ready-for-agent

## Blocked tickets

- [06 — Present This Week as a chronological agenda](issues/06-present-this-week-as-chronological-agenda.md) — blocked by 05
- [07 — Respond to a pending departure without losing context](issues/07-respond-to-pending-departure-without-losing-context.md) — blocked by 06
- [08 — Record any workout in the contextual pane](issues/08-record-any-workout-in-contextual-pane.md) — blocked by 06
- [09 — Review and correct historical weeks](issues/09-review-and-correct-historical-weeks.md) — blocked by 05
- [10 — Adjust this week or the repeating routine in context](issues/10-adjust-this-week-or-repeating-routine-in-context.md) — blocked by 05
- [11 — Manage profile and authority under Profile & Data](issues/11-manage-profile-and-authority-under-profile-data.md) — blocked by 05
- [12 — Inspect reminder readiness under Notifications](issues/12-inspect-reminder-readiness-under-notifications.md) — blocked by 05
- [13 — Preserve every workflow in the compact window](issues/13-preserve-every-workflow-in-compact-window.md) — blocked by 07, 08, 09, 10, 11, 12
- [14 — Prove the accessible production Mac workspace](issues/14-prove-accessible-production-mac-workspace.md) — blocked by 13

## Dependency notes

- Tickets 01 and 04 are the initial frontier and may proceed independently.
- Tickets 02 and 03 both reuse the schedule-reminder reconciliation established by 01.
- Production presentation begins only after all four correctness prerequisites, 01 through 04, are resolved.
- Tickets 07 and 08 may proceed independently after the This Week agenda is established by 06.
- Tickets 09 through 12 may proceed independently after the workspace navigation is established by 05.
- Ticket 13 integrates every completed destination and action flow into the compact-window contract.
- Ticket 14 is the final Mac production acceptance gate; mobile work remains outside this effort.
