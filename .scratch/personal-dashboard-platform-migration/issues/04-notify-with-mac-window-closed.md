# 04 — Deliver a notification with the Mac window closed

**What to build:** Prove that Personal Dashboard can schedule a native Mac notification that arrives while its window is closed, establishing the required notification and lifecycle boundary before exercise reminders are migrated.

**Blocked by:** 02 — Launch Personal Dashboard as a Mac app.

**Status:** resolved

- [x] The packaged app requests and reports macOS notification permission through a user-visible flow.
- [x] The user can schedule a bounded capability notification from the app.
- [x] A real native notification arrives at the requested time while the app window is closed.
- [x] Reopening the app after delivery shows a coherent capability result rather than duplicating the notification.
- [x] Notification scheduling is exposed to product behavior through an explicit platform boundary.
- [x] Deterministic tests use a notification adapter and controllable clock without displaying real notifications.
- [x] A packaged acceptance mode exercises real macOS delivery separately from normal automated tests.
- [x] Notification behavior after a normal Quit is observed and recorded, but failure of that desirable case does not fail this ticket.
- [x] No launch-at-login requirement, perpetual polling process, Python reminder runner, or localhost service is introduced.

## Answer

Added a visible Mac notification capability panel backed by a Rust application
service with explicit `NotificationPlatform` and `Clock` ports. The app reads
and requests the real macOS authorization state, schedules one ten-second
capability request through Apple UserNotifications, and shows the permission,
requested delivery time, and result without placing product rules in the
frontend.

The red window control now hides the window while keeping the app active; a
Dock reopen shows and focuses that same window. A normal application Quit
still exits. The application service retains the one scheduled timestamp, so a
reopen reports the existing capability result without scheduling a duplicate.
The packaged bundle is fully ad-hoc signed under
`com.tortillaflat.personal-dashboard`, which lets macOS associate authorization
and OS-owned delivery with the product identity without adding public signing
or notarization.

Deterministic application-seam tests inject an in-memory notification adapter
and fixed clock to prove permission reporting, the exact requested delivery,
and no reschedule on reopen. On 2026-08-12, packaged acceptance confirmed native
delivery at 1:33:06 PM with the only window closed. Reopening preserved that
timestamp. The desirable normal-Quit observation also succeeded: the process
exited and macOS delivered the OS-owned request at 1:34:02 PM. The reproducible
procedure and observations are recorded in
`docs/acceptance/macos-notification-capability.md`.

The arm64 bundle still passes packaged launch acceptance without Python or a
listening TCP socket, all 20 completed-baseline workflow tests pass, and the npm
dependency audit reports no known vulnerabilities. No login item, polling
process, Python runner, localhost service, or reminder policy was added.
