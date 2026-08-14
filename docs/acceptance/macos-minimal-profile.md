# Complete Mac profile backup and restore acceptance

This acceptance check proves the platform behavior that automated application
tests intentionally replace with injected persistence and exchange adapters.
Use the packaged application, not a development server.

1. Build and verify the bundle with `npm run build:mac` and
   `npm run accept:mac`.
2. Open `src-tauri/target/release/bundle/macos/Personal Dashboard.app`.
3. Change the profile label and choose **Save label**. Use **Log workout now**
   to save one qualifying workout, adjust one upcoming departure with **Adjust
   this week**, and change one future routine departure under **Change repeating
   routine**. Note the visible label, progress, schedule, and history.
4. Choose **Back up profile…**, select a destination in the native macOS save
   panel, and confirm that `personal-dashboard-backup.json` is created. Confirm
   that the app remains active and still accepts another workout action.
5. Change the label, routine, and visible history after the backup. Choose
   **Restore profile…** and select the backup in the native macOS open panel.
   Confirm that the changed active profile remains visible while the restore
   confirmation is shown.
6. Choose **Cancel** and confirm that the changed label, routine, history, and
   progress remain unchanged.
7. Choose **Restore profile…** again, select the same backup, then choose
   **Confirm restore**. Confirm that the backed-up label, current schedule,
   repeating routine, workout history, progress, and next departure return.
8. Choose **Restore profile…** again and select invalid JSON or a backup with an
   unsupported top-level `schema_version`. Confirm that the app displays an
   error and the restored active profile remains unchanged.

For isolated acceptance runs, launch the app with a temporary data directory:

```sh
open -n --env PERSONAL_DASHBOARD_DATA_DIR=/absolute/test/directory \
  "src-tauri/target/release/bundle/macos/Personal Dashboard.app"
```

The override exists for test isolation. Normal launches use Tauri's app data
directory and the bundle identifier, producing `profile.json` and
`exercise.json` under
`~/Library/Application Support/com.tortillaflat.personal-dashboard/` on macOS.

## Recorded partial result

On 2026-08-14, the arm64 packaged bundle passed `npm run accept:mac` and opened
without Python or a listening TCP socket. In an isolated data directory, the
packaged app saved a changed profile label and **Back up profile…** opened the
real macOS save panel.

The save was not completed and the native open/restore panel was not exercised:
the user's active full-screen application prevented safe visual control of the
modal panel. This is a partial observation only. Steps 4–8 remain the required
acceptance follow-up before issue 15 can be marked resolved.
