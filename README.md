# Personal Dashboard

Personal Dashboard is a private, offline, local-first application. Exercise
tracking is its current feature area.

## Build and install the Mac application

The active application uses Tauri 2, Rust, plain TypeScript, semantic HTML, and
CSS. Install the JavaScript and Rust build prerequisites, then run:

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

Verify the complete Tauri-only release boundary rather than a development
process:

```sh
npm run accept:cutover
```

The acceptance check verifies that the active source and README expose only the
Tauri product, confirms the recoverable baseline tag, relocates a bundle copy,
launches it through macOS Launch Services, verifies the arm64 application
identity, and confirms that the app uses neither Python nor a listening TCP
socket. The private release targets the current Apple Silicon Mac and macOS
environment. It is ad-hoc signed but is not Developer ID signed or notarized.

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

Run the application-workflow seam with:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --test application_workflow
```

## Today Daily Record recovery

Today reads and performs bounded updates directly against the selected Tortilla
Flat vault's canonical Daily Record. It prepares the recovery directory before
activation. Immediately after the atomic exchange, while the exact inode
displaced from the canonical path is still linked at the temporary path, the
app creates and syncs a same-volume hard-link recovery entry under:

```text
<selected-vault>/.personal-dashboard-recovery/today/
```

The recovery entry is recovery material, not a second life record: Today never
reads it as application state or presents it as canonical content. Keeping that
exact displaced inode linked means an editor that retained its file descriptor
cannot later write into an unlinked, unrecoverable file. Byte equality is not
used as a substitute for file identity. The temporary link is removed only
after the durable recovery link exists. If recovery-directory preparation
fails, no activation is attempted. If linking the displaced inode fails after
activation, the app returns an error and attempts an atomic rollback; it never
unlinks the displaced inode. A successful rollback restores that inode at the
canonical path and leaves the rejected candidate at its temporary path. If
rollback also fails, the displaced inode remains linked at the reported
temporary path for manual recovery.

Snapshots have no automatic expiry. They remain until the user explicitly
deletes them, which avoids inventing an unsafe time after which a retained
external descriptor must have closed. Close Dashboard and external editors and
inspect any needed recovery content before manually removing old snapshots.
The vault `.gitignore` excludes this runtime-only directory from version
control.

This is preservation, not cross-application locking or merging. An external
editor can still supersede the canonical path, and Today may report a conflict
that requires manual reconciliation. Recovery links also reflect later writes
made through a retained descriptor; that is intentional. The guarantee relies
on macOS same-volume atomic exchange and hard links, and does not claim tested
power-loss durability within the exchange/link interval.

The compatible 2.0 representation for an independently retained morning
baseline, the still-current arrangement, explicit writer transitions, and old
record behavior is documented in
[`docs/daily-record-baseline.md`](docs/daily-record-baseline.md). Reader support
does not by itself activate or prove the future production writer.

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
Already scheduled notifications were observed after both window close and a
normal Quit. After-Quit delivery remains desirable rather than a guaranteed
release gate; no background runner or launch-at-login service is required.

## Cutover evidence and limitations

The completed 20-scenario baseline inventory is mapped to the active Tauri
application suites, and the Mac and physical-device gate evidence is collected
in [`docs/acceptance/tauri-cutover.md`](docs/acceptance/tauri-cutover.md).
The iPad and Samsung results prove shared-foundation compilation, installation,
launch, and offline rendering only. Full standalone mobile behavior,
notifications, profile transfer, and production layouts remain future work.

## Recoverable completed baseline

Personal Dashboard is now the sole active product implementation. Normal use,
testing, backup, restore, reminders, and profile moves run through the packaged
Tauri application; the current checkout contains no Python dashboard,
localhost server, or separate reminder runner.

The completed pre-Tauri application remains immutable and recoverable through
the annotated Git tag `python-exercise-tracker-complete`. Its behavior, data
contract, synthetic migration fixture, and detached-worktree recovery procedure
are recorded in
[`docs/migration/completed-python-baseline.md`](docs/migration/completed-python-baseline.md).
