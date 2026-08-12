# Personal Dashboard

Personal Dashboard is a private, offline, local-first application. Exercise
tracking is its current feature area.

## Build the Mac application

The current tracer bullet uses Tauri 2, Rust, plain TypeScript, semantic HTML,
and CSS. Install the JavaScript and Rust build prerequisites, then run:

```sh
npm install
. "$HOME/.cargo/env"
npm run check
npm run build:mac
```

The release application bundle is produced at:

```text
src-tauri/target/release/bundle/macos/Personal Dashboard.app
```

It can be copied into Applications or opened directly through macOS Launch
Services:

```sh
open "src-tauri/target/release/bundle/macos/Personal Dashboard.app"
```

Verify the packaged bundle rather than a development process:

```sh
npm run accept:mac
```

The acceptance check relocates a copy, launches it through macOS Launch
Services, verifies the arm64 application identity, and confirms that the app
uses neither Python nor a listening TCP socket.

## Minimal Mac profile

The packaged app keeps its current minimal profile as versioned JSON at:

```text
~/Library/Application Support/com.tortillaflat.personal-dashboard/profile.json
```

Use **Save label** to persist a visible profile change. **Export profile…** and
**Import profile…** use the native macOS file panels; a selected import is
fully decoded and validated before it can replace the active profile. These
operations are local and do not require an account or network connection.

The packaged acceptance procedure for persistence and file exchange is
recorded in
[`docs/acceptance/macos-minimal-profile.md`](docs/acceptance/macos-minimal-profile.md).

## Mac notification capability

The packaged app can request macOS notification permission and schedule one
bounded capability notification for ten seconds later. Closing the red window
control hides the window without quitting, so macOS can deliver the scheduled
notification; choosing **Personal Dashboard → Quit Personal Dashboard** still
performs a normal Quit.

The packaged acceptance procedure and the observed closed-window and
normal-Quit results are recorded in
[`docs/acceptance/macos-notification-capability.md`](docs/acceptance/macos-notification-capability.md).

## Completed Python baseline

The completed Python exercise tracker remains available as migration evidence
while behavior is moved incrementally. It uses only Python's standard library
and built-in macOS facilities; there is no account, network service, cloud
sync, deployment, or third-party dependency.

### Run the baseline dashboard

From this directory:

```sh
PYTHONPATH=src python3 -m exercise_tracker serve
```

Open <http://127.0.0.1:8765/>. Stop the dashboard with `Control-C`. Its local
state remains at:

```text
~/Library/Application Support/Exercise Habit Tracker/state.json
```

### Run baseline reminders while the dashboard is closed

Start the reminder runner once per logged-in Mac session:

```sh
PYTHONPATH=src python3 -m exercise_tracker start-reminders
```

The runner is registered only for the current login session. It is independent
of the dashboard, checks once per minute, and uses macOS Notification Center at
a scheduled departure. This foundation deliberately does not configure
automatic launch at login.

To stop it:

```sh
PYTHONPATH=src python3 -m exercise_tracker stop-reminders
```

### Back up and restore baseline data

Export the complete local exercise plan and history to a file you choose:

```sh
PYTHONPATH=src python3 -m exercise_tracker export-backup --backup-file ~/Documents/exercise-tracker-backup.json
```

Restore a previously exported file into the local app:

```sh
PYTHONPATH=src python3 -m exercise_tracker restore-backup --backup-file ~/Documents/exercise-tracker-backup.json
```

Both operations stay on this Mac and require no account, network connection,
cloud service, or synchronization. Restore replaces the app's complete local
state with the selected backup.

### Verify baseline behavior

```sh
python3 -m unittest discover -s tests -v
```

To exercise the same workflow through the real macOS Notification Center
adapter (this displays one acceptance notification):

```sh
EXERCISE_TRACKER_MACOS_ACCEPTANCE=1 python3 -m unittest discover -s tests -v
```

The completed pre-Tauri application is preserved by the annotated Git tag
`python-exercise-tracker-complete`. Its behavior, data contract, synthetic
migration fixture, and recovery procedure are recorded in
[`docs/migration/completed-python-baseline.md`](docs/migration/completed-python-baseline.md).
