# Completed Python baseline

This document preserves the completed Python exercise tracker as migration
evidence. It is a behavioral and data oracle for the Personal Dashboard
platform migration, not a separately maintained product edition.

## Durable reference and verification

The annotated Git tag `python-exercise-tracker-complete` identifies commit
`7856f5019f69a62fbb168e38a03f328c8d0cb983`. That commit is the complete Python
application before any Tauri implementation or preservation artifact was
introduced. The annotated tag is published to `origin`; its remote peeled
target was verified as the same commit.

The working tree was clean when the tag was created. On 2026-08-12, the
high-level application workflow suite passed at that commit:

```text
python3 -m unittest discover -s tests -v
Ran 20 tests
OK
```

The tag points to the original commit rather than a copied source tree. Later
changes therefore cannot silently alter the oracle, and preserving it does not
rewrite repository history.

## Product behavior inventory

The baseline provides these user-visible behaviors through the dashboard,
independent reminder runner, and backup commands:

- A weekly goal of three qualifying workouts, with primary departures on
  Monday, Wednesday, and Friday and ordered Saturday/Sunday fallbacks.
- Idempotent departure reminders, a single 15-minute follow-up after silence,
  and a workout-recording reminder 90 minutes after `Leaving for gym`.
- Click-only departure decisions to leave, move to a fallback, or skip, with
  preset reasons and deterministic fallback eligibility.
- Workout recording through exactly four selections: `Done`, activity,
  duration, and perceived effort. Durations of 20 minutes or more qualify;
  shorter activity remains recorded without advancing the weekly goal.
- Goal-based reminder suppression while still permitting extra unscheduled
  workouts.
- Week rollover that preserves completed, short, moved, skipped, missed, and
  reminder-suppressed outcomes and repeats the routine.
- One-week schedule exceptions, deliberate future routine changes, workout
  history correction and confirmed deletion, and complete local backup and
  validated restore.

At the annotated tag, the authoritative observable scenarios are in
`tests/test_application_workflow.py`. Their observable outcomes—not their
Python, HTTP, or subprocess mechanics—are mapped to the active Tauri suites in
`docs/acceptance/tauri-cutover.md`.

## Data contract

- Schema version: `5`.
- Format: versioned JSON containing the repeating routine, generated weeks,
  slots and reminder outcomes, workout records, and any in-progress decision
  or workout draft.
- Default live location:
  `~/Library/Application Support/Exercise Habit Tracker/state.json`.
- Backup format: the same validated complete-state JSON, written through
  `export-backup` and accepted through `restore-backup`.

The synthetic fixture at
`tests/fixtures/completed-python-baseline-state.json` is the retained
representative schema-v5 profile for active migration and parity checks. It
contains only
fixed example dates and product option values: no personal names, notes,
credentials, or copied live state. It covers two weeks, a routine change, a
one-week exception, a successful three-workout week, a qualifying corrected
record, a short record, a moved slot, a skipped slot, and a missed reminder.

Validate the fixture through the immutable tag without touching live state or
restoring Python to the active checkout:

```sh
repository_root="$PWD"
baseline_worktree="$(mktemp -d)/python-baseline"
fixture_state="$(mktemp -d)/state.json"
git worktree add --detach "$baseline_worktree" python-exercise-tracker-complete
PYTHONPATH="$baseline_worktree/src" python3 -m exercise_tracker restore-backup \
  --state-file "$fixture_state" \
  --backup-file "$repository_root/tests/fixtures/completed-python-baseline-state.json"
PYTHONPATH="$baseline_worktree/src" python3 -m exercise_tracker check-reminders \
  --state-file "$fixture_state" \
  --notifier stdout \
  --at 2026-08-25T15:30:00-04:00
git worktree remove "$baseline_worktree"
```

The restore must succeed, and the reminder check must generate the following
week and report the adjusted Tuesday departure at 3:30 PM.

## Historical launch and reminder mechanics

The dashboard starts with `PYTHONPATH=src python3 -m exercise_tracker serve`,
binds only to `127.0.0.1:8765`, and is opened in a separately managed browser.
Normal dashboard launch required both the Python process and a browser. These
mechanics are historical evidence and are not part of the active product.

`start-reminders` writes
`~/Library/Application Support/Exercise Habit Tracker/com.tortillaflat.exercise-habit-tracker.reminders.plist`
and registers it with `launchctl` in the current user's GUI login session. The
runner invokes `check-reminders` once per minute and sends due notifications
through macOS Notification Center while the dashboard is closed. It is not
configured to launch automatically at login. `stop-reminders` removes the
current-session registration with `launchctl bootout`.

## Recover or inspect the baseline

Inspect the immutable source without changing the current checkout:

```sh
git show --stat python-exercise-tracker-complete
git ls-tree -r --name-only python-exercise-tracker-complete
```

To run it, create a temporary detached worktree from the tag:

```sh
git worktree add --detach /tmp/personal-dashboard-python-baseline \
  python-exercise-tracker-complete
cd /tmp/personal-dashboard-python-baseline
python3 -m unittest discover -s tests -v
PYTHONPATH=src python3 -m exercise_tracker serve \
  --state-file /tmp/personal-dashboard-python-baseline-state.json
```

This starts with isolated data and cannot modify the live profile. Stop the
server with `Control-C`, return to the active repository, and remove the
temporary checkout:

```sh
git worktree remove /tmp/personal-dashboard-python-baseline
```

Do not develop from or publish the detached worktree. Product development
continues on the main history; the tagged worktree exists only for inspection,
behavior comparison, data migration checks, and emergency recovery.
