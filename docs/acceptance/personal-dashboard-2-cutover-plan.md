# Personal Dashboard 2.0 cutover plan

This is the execution plan for ticket 07. Ticket 06 prepares and reviews it but
does **not** perform a live cutover, modify the live daily-loop skill, call
Dida365, change an automation, delete live data, cancel live notifications, or
replace an installed application.

## Exact owned-state inventory

The cutover implementation must resolve the active macOS application-data
directory for bundle identifier `com.tortillaflat.personal-dashboard` before
changing anything. Its normal location is:

```text
~/Library/Application Support/com.tortillaflat.personal-dashboard/
```

Only these current-app objects are old Exercise/Profile state eligible for
retirement:

- `profile.json`
- `exercise.json`
- `.profile-restore-transaction/`, limited to `profile.previous.json`,
  `exercise.previous.json`, and `prepared`
- `.baseline-migration-transaction/`, limited to `profile.migrated.json`,
  `exercise.migrated.json`, and `prepared`
- orphaned same-directory atomic-save temporaries whose exact canonical stem is
  `profile.json.tmp-<pid>` or `exercise.json.tmp-<pid>`

`today-workspace.json` is 2.0 workspace configuration and must remain. Do not
remove the app-data directory as a whole. Unknown files in that directory must
stop the cleanup with an inventory diagnostic rather than be inferred to be
old state.

The historical Python 1.0 objects are:

```text
~/Library/Application Support/Exercise Habit Tracker/state.json
~/Library/Application Support/Exercise Habit Tracker/
  com.tortillaflat.exercise-habit-tracker.reminders.plist
```

The directory itself is not an authorized recursive-delete target. Any other
file under it is unknown and must be preserved and reported.

Never delete or rewrite:

- the selected Tortilla Flat vault, `.obsidian/`, or any Daily Record;
- `<vault>/.personal-dashboard/derived/habits-v1.json`;
- user-selected exports, backups, or moved profiles outside the exact paths
  above;
- Dida365, Strava, or other source data;
- recovery snapshots or unrecognized files.

## Notification inventory and cancellation

Before removing `exercise.json`, parse and validate it through the existing
profile/exercise boundary and derive every old Tauri identifier for every
stored departure:

```text
exercise-departure-<departure.id>
exercise-follow-up-<departure.id>
exercise-record-workout-<departure.id>
```

Include identifiers already present in `pending_notification_cancellations`.
Deduplicate the complete set, pass each identifier through the existing native
notification cancellation adapter, and persist/retry failures before deleting
the state that makes reconstruction possible. On macOS that adapter calls
`UNUserNotificationCenter.removePendingNotificationRequestsWithIdentifiers`.
The cutover cannot report success while any cancellation remains pending.

For the Python 1.0 runner, first use its established `stop-reminders` behavior
or the equivalent current-user GUI-session `launchctl bootout` for the exact
plist label/path above. Verify that the exact job is absent before removing the
plist. Do not unload or delete any other launchd job. Stopping the runner is
what prevents new Python notifications; deleting `state.json` alone is not
sufficient.

## Ordered, idempotent cutover

1. Obtain explicit authorization for the live skill/Dida365/automation changes
   and separately confirm the exact installed 1.0 bundle to replace. If either
   boundary is unapproved, stop before mutation and leave ticket 07 incomplete.
2. Record a read-only preflight: candidate commit and bundle hash, selected
   vault, owned-state inventory, unknown files, old launchd job state, and the
   notification identifiers derived from valid old state. A malformed old state
   is a blocking diagnostic because notification identifiers cannot be safely
   reconstructed by guessing.
3. Quit only the confirmed Personal Dashboard process and stop the exact Python
   reminder job. Do not kill unrelated Python or app processes.
4. Cancel and verify the complete old Tauri notification set. Persist a
   recoverable phase record after notification shutdown and before deletion.
5. Remove only the enumerated Profile/Exercise files and exact transaction or
   temporary children. Verify that `today-workspace.json`, the vault, Daily
   Records, the Habits snapshot, exports, and every unknown file are unchanged.
6. Write an app-owned cutover completion marker atomically only after reminder
   shutdown, notification cancellation, and scoped cleanup all succeed. The
   marker must include a schema version, completion phase, timestamp, and
   candidate identity. Re-entry reads the marker plus actual state: completed
   steps become no-ops, while an incomplete phase resumes safely without
   re-importing or guessing.
7. Install/activate the reviewed 2.0 candidate, launch it normally, and prove
   that no cleanup path recreates or imports the retired Exercise/Profile data.
8. With the authorization from step 1, update the live daily-loop writer to
   follow `docs/daily-record-baseline.md`: initial generation/calibration write
   baseline and current plan together; event-only and daytime transitions
   preserve the baseline exactly; corrections leave an explicit trace.
9. In the same authorized producer flow, build the complete 12-week candidate
   described by `docs/habit-snapshot-v1.md` from already-read sources, validate
   it fully, write a same-directory temporary, flush it, atomically rename over
   `habits-v1.json`, and flush the parent directory. Source failure or partial
   data must leave the last valid snapshot untouched.
10. Run one authorized live generation, then verify the installed app's Today,
    Calendar, and Habits views, manual refresh, dated Exercise add/correction,
    relaunch persistence, old-data absence, stopped Python job, and absence of
    old pending notification identifiers.

## Failure and rollback boundary

- Before step 3, no live state changes.
- After the reminder job is stopped but before cleanup completes, leave it
  stopped; do not restore a source capable of scheduling old notifications.
- Before deletion, a failure keeps old state in place and records the incomplete
  phase. After deletion, rollback means reinstalling the reviewed prior bundle
  only if explicitly requested; deleted old Exercise/Profile state is not
  reconstructed because the user approved retirement without migration.
- Never mark completion from the existence of a marker alone. Verify the
  marker, actual file inventory, launchd state, notification state, producer
  output, and installed UI together.
