---
status: accepted
---

# Project reported sleep endpoints by their own lived days

Issue #124's 2026-10-22 redesign and #125 separate three identities: a stable
reported night, each endpoint's actual calendar date/time/offset, and the 04:00
lived day used by existing Habit and Today views. Backend implementation was
separately authorized; the revised visual reference was approved before
production UI implementation, while final human acceptance of the native
experience remains separately pending.

Keep the selected-Vault sleep record independent of Daily Records, completions
and snapshots. Reuse the protected compare-and-swap writer and explicit revision,
selected-Vault binding, duplicate receipt and saved-readback checks. The previous
`life/.personal-dashboard/sleep/v1/sessions.json` format remains readable; additive
optional endpoint contexts preserve legacy values without migration or deletion.
The retained `wakeDate` is an explicit internal night index, never a point's
presentation date. Record identity persists through endpoint corrections.

Expose endpoint facts as read-only projections. A Thursday 02:00 onset projects
to Wednesday's sleep Habit, while Thursday 07:30 get-up projects to Thursday's
wake Habit. Unknown/text without explicit context and ranges crossing 04:00 stay
unlocated. Elapsed duration uses two actual points and their actual offsets;
reported ranges and missing endpoints never become fabricated exact samples.

The lightweight Habit/date application workflow resolves a unique existing
endpoint or the explicitly selected night/morning context and preserves the
other endpoint. Conflicting identities require clarification. Manual IPC and
controlled Collaboration call the same workflow; neither evaluates goals,
completes Habits, copies Daily Records, or writes external sources. This decision
implements the approved data boundary and does not reinstate withdrawn ADR 0007
or its rejected UI.
