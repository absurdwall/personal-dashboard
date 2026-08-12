# 04 — Deliver a notification with the Mac window closed

**What to build:** Prove that Personal Dashboard can schedule a native Mac notification that arrives while its window is closed, establishing the required notification and lifecycle boundary before exercise reminders are migrated.

**Blocked by:** 02 — Launch Personal Dashboard as a Mac app.

**Status:** ready-for-agent

- [ ] The packaged app requests and reports macOS notification permission through a user-visible flow.
- [ ] The user can schedule a bounded capability notification from the app.
- [ ] A real native notification arrives at the requested time while the app window is closed.
- [ ] Reopening the app after delivery shows a coherent capability result rather than duplicating the notification.
- [ ] Notification scheduling is exposed to product behavior through an explicit platform boundary.
- [ ] Deterministic tests use a notification adapter and controllable clock without displaying real notifications.
- [ ] A packaged acceptance mode exercises real macOS delivery separately from normal automated tests.
- [ ] Notification behavior after a normal Quit is observed and recorded, but failure of that desirable case does not fail this ticket.
- [ ] No launch-at-login requirement, perpetual polling process, Python reminder runner, or localhost service is introduced.
