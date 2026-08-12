# Minimal Mac profile acceptance

This acceptance check proves the platform behavior that automated application
tests intentionally replace with injected persistence and exchange adapters.
Use the packaged application, not a development server.

1. Build and verify the bundle with `npm run build:mac` and
   `npm run accept:mac`.
2. Open `src-tauri/target/release/bundle/macos/Personal Dashboard.app`.
3. Change the profile label, choose **Save label**, quit the app, and reopen it.
   Confirm that the changed label is still shown.
4. Choose **Export profile…**, select a destination in the native macOS save
   panel, and confirm that a JSON file is created.
5. Change and save the label again. Choose **Import profile…**, select the
   exported JSON in the native macOS open panel, and confirm that the exported
   label replaces the active label.
6. Choose **Import profile…** again and select invalid JSON or a profile with an
   unsupported `schema_version`. Confirm that the app displays an error and the
   active label remains unchanged.

For isolated acceptance runs, launch the app with a temporary data directory:

```sh
open -n --env PERSONAL_DASHBOARD_DATA_DIR=/absolute/test/directory \
  "src-tauri/target/release/bundle/macos/Personal Dashboard.app"
```

The override exists for test isolation. Normal launches use Tauri's app data
directory and the bundle identifier, producing
`~/Library/Application Support/com.tortillaflat.personal-dashboard/profile.json`
on macOS.
