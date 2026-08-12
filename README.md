# Exercise Habit Tracker

A private, single-user exercise dashboard for macOS. It uses only Python's
standard library and built-in macOS facilities; there is no account, network
service, cloud sync, deployment, or third-party dependency.

## Run the dashboard

From this directory:

```sh
PYTHONPATH=src python3 -m exercise_tracker serve
```

Open <http://127.0.0.1:8765/>. Stop the dashboard with `Control-C`. Its local
state remains at:

```text
~/Library/Application Support/Exercise Habit Tracker/state.json
```

## Run reminders while the dashboard is closed

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

## Back up and restore

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

## Verify

```sh
python3 -m unittest discover -s tests -v
```

To exercise the same workflow through the real macOS Notification Center
adapter (this displays one acceptance notification):

```sh
EXERCISE_TRACKER_MACOS_ACCEPTANCE=1 python3 -m unittest discover -s tests -v
```
