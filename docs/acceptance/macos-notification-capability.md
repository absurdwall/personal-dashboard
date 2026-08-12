# Mac notification capability acceptance

This acceptance check proves the native macOS behavior that deterministic
application tests replace with an injected notification adapter and clock. Use
the packaged application, not a development server. The application must have
a complete ad-hoc bundle signature so macOS associates authorization with
`com.tortillaflat.personal-dashboard`.

1. Build and verify the bundle with `npm run build:mac` and
   `npm run accept:mac`.
2. Open `src-tauri/target/release/bundle/macos/Personal Dashboard.app`.
3. Choose **Allow notifications** and respond to the macOS permission prompt.
   Confirm that the app reports **Granted**. If access was denied previously,
   enable Personal Dashboard in **System Settings → Notifications** and choose
   **Check notification access**.
4. Choose **Schedule for 10 seconds** and note the displayed delivery time.
5. Close the window with its red window control without choosing Quit. Confirm
   that the Personal Dashboard process remains active and that macOS delivers
   one notification at the displayed time.
6. Reopen the app from the Dock. Confirm that the same scheduled time remains
   visible, the delivery time is reported as passed, and reopening does not
   schedule another notification.
7. As a desirable, non-gating observation, schedule once more and immediately
   choose **Personal Dashboard → Quit Personal Dashboard**. Record whether the
   OS-owned request is delivered after the process exits.

## Recorded result

On 2026-08-12, the arm64 packaged app was exercised on macOS with notification
permission granted:

- Delivery at 1:33:06 PM succeeded with the app process active and its only
  window closed. Notification Center recorded one delivered request with the
  fixed identifier `personal-dashboard-capability`.
- Reopening displayed the original 1:33:06 PM scheduled time as passed and did
  not create another request.
- The normal-Quit observation also succeeded: the process exited before the
  requested time, and macOS delivered the OS-owned request at 1:34:02 PM.

These observations establish the capability boundary only. They do not add
launch-at-login behavior, perpetual polling, an exercise-reminder policy, or a
background service.
