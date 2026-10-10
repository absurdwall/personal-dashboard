# Calendar selected-date Task readability — in progress

2026-10-10, baseline `46fdaec2f3008d500274f5082a2fd5a909635ae2` on
`codex/collaboration-redesign-integration`. The previously reviewed typography
product `499cdc1` is installed and accepted; parent closure by human acceptance
and explicit deferral remains valid.

The user added a narrow follow-up before ending this run: Calendar's
"Tasks for this day" shows task names/content in an extremely thin tall column
with large unused space next to it. User message
`01a126bf-f846-7451-ac32-b44eb2e608d9` in review chat
`01a1229c-6bc2-7472-9dc9-16f3daccb6d3` provides the native screenshot and
authorizes choosing the appropriate layout fix. Review remains read-only;
the original implementation chat owns the change, local update and commits.

One isolated implementer measures the actual Calendar frame/summary/Task card,
main body and controls before changing scoped layout. Validate production
rendering with synthetic Chinese/English long titles/content, pending/completed
states and controls at wide/narrow windows. Personal screenshot contents are
source feedback only and are not copied into fixtures or repository records.
Task body needs readable width; controls must not consume the body column.
Preserve forms/events/date targeting/drafts and other Task/Today surfaces.

Return a fixed candidate, diff, before/after computed values/screenshots and
appropriate existing checks/build for independent review. After acceptance,
repeat private App/profile backup, signed local replacement and verification.
Update source/handoff and normal local commits, then clean owned resources.
No workflow/schema/business-data change, GitHub/main merge/push, new dependency,
or change to the accepted parent/deferred criteria is included.
