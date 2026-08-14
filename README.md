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

## Exercise week and departure reminder

The packaged app opens on the current exercise week. A fresh profile uses the
established Monday, Wednesday, and Friday 4:00 PM primary departures, followed
by Saturday and Sunday 4:00 PM fallback availability, with a weekly goal of
three qualifying workouts. The dashboard shows current progress and the next
planned departure before profile capability controls.

The repeating routine, generated weeks, and native-reminder scheduling state
are stored as versioned JSON at:

```text
~/Library/Application Support/com.tortillaflat.personal-dashboard/exercise.json
```

When notification permission is granted, the Rust application core emits the
next departure reminder through the native platform adapter. macOS owns an
already scheduled reminder, so closing the Personal Dashboard window does not
cancel it. Exercise state and reminder eligibility do not depend on Python, a
localhost server, a browser, an account, or network access.

Run the new application-workflow seam with:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --test application_workflow
```

## Complete profile backup and restore

The packaged app keeps the profile label and exercise state as versioned,
app-owned JSON at:

```text
~/Library/Application Support/com.tortillaflat.personal-dashboard/profile.json
~/Library/Application Support/com.tortillaflat.personal-dashboard/exercise.json
```

Use **Back up profile…** to create one user-selected recovery file containing
the label, routine, current and prior weeks, schedule exceptions, departure
outcomes, decisions, workout history changes, and derived progress. The source
profile remains active. **Restore profile…** opens a native file panel, fully
validates the selected backup, and then requires **Confirm restore** before it
atomically replaces both active documents. An interrupted replacement is
rolled back from a local recovery journal on the next launch. Cancelling,
selecting an invalid or unsupported file, or encountering a replacement error
leaves the active profile unchanged. Backup writes also replace a selected
destination atomically. These operations are fully offline and do not require
an account, cloud store, or synchronization.

Run the deterministic application seam with:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --test profile_backup_workflow
```

The packaged acceptance procedure for native save/open interactions is recorded
in
[`docs/acceptance/macos-minimal-profile.md`](docs/acceptance/macos-minimal-profile.md).

## Automatic completed-profile migration

On its first launch, Personal Dashboard looks for the completed Python
exercise profile at its established Mac location:

```text
~/Library/Application Support/Exercise Habit Tracker/state.json
```

When a valid schema-v5 profile exists, the Rust application core converts its
routine, weeks, progress, fallback assignments, departure outcomes, reminder
delivery markers, in-progress choice, workout draft, and history into one
app-owned profile. The paired profile and exercise documents are activated
atomically, and the profile records its completed-baseline origin so later
launches do not reconvert or duplicate data. Existing pre-migration Tauri data
is replaced only during this one adoption; a profile already marked as
migrated wins without rereading the baseline.

The Python `state.json` is read-only migration input and remains byte-for-byte
unchanged for rollback. Invalid, unsupported, unreadable, incomplete, or
interrupted input blocks use of a partial result and shows a controlled status
in the packaged app. There is no dual-write path back to the Python profile.

Run the deterministic migration seam with:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --test baseline_migration_workflow
```

The isolated packaged migration procedure is recorded in
[`docs/acceptance/macos-baseline-migration.md`](docs/acceptance/macos-baseline-migration.md).

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
