# Personal Dashboard 2.0 cutover evidence

## Reviewed candidate boundary

The 2.0 candidate is versioned as `2.0.0`. Normal startup registers only the
Today, Calendar, Habits, vault-selection, and bounded Daily Record mutation
commands. It does not initialize the former baseline migration, Profile,
Exercise, backup/move, or notification applications.

The destructive retirement path requires an explicit `preflight` or `execute`
mode plus separate reviewed commit and 64-character bundle SHA-256 values.
The preflight mode emits a JSON artifact containing those values, the selected
vault, exact owned and unknown inventories, old launchd state, and reconstructed
notification identifiers, then exits without mutation. Without a cutover mode,
startup does not inspect or mutate old state. The optional
`PERSONAL_DASHBOARD_DATA_DIR` and
`PERSONAL_DASHBOARD_LEGACY_EXERCISE_DIR` overrides exist so the exact workflow
can be rehearsed against isolated roots.

## Automated application seam

Run:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --test cutover_workflow
```

The seam uses generated valid Profile/Exercise documents and temporary roots.
It proves:

- an unknown app-data object or transaction child blocks before runtime calls
  or progress writes;
- malformed old state blocks notification reconstruction;
- notification identifiers include every stored departure's three historical
  forms plus both reconciliation arrays and Profile cancellation entries;
- cancellation failure leaves source state and a resumable progress journal;
- resume reparses source state and blocks if the notification inventory changed;
- resume re-stops a reloaded exact runner and re-cancels regenerated notifications;
- completion-marker re-entry rechecks launchd and notification state;
- success removes only the enumerated objects, preserves
  `today-workspace.json`, writes an atomic completion marker, and becomes a
  no-op on re-entry.

## Packaged macOS rehearsal

Build the bundle, then run:

```sh
npm run build:mac
npm run accept:cutover
```

The packaged rehearsal relocates and re-signs a copy with an acceptance-only
bundle identifier, then uses isolated app-data, Python-data, and vault roots.
It first inserts an unknown file and captures a read-only blocking inventory
with no progress record. After removing only that synthetic blocker, it captures
a complete read-only preflight artifact, then exercises the
native launchd-stop boundary, macOS notification cancellation and pending-list
verification, exact transaction/temp/file cleanup, completion marker, and a
normal relaunch. Accessibility checks observe Today, Calendar, and Habits and
the absence of This Week and Profile surfaces. Hash checks keep the selected
workspace and Daily Record unchanged.

This is packaged synthetic evidence, not a live cutover. Its notification IDs
are synthetic and were not pre-scheduled, so it proves the native cancellation
and verification path but not removal from the user's real pending list.

## Live cutover

The user subsequently authorized direct retirement of 1.0 and continued use of
2.0 at the same release-bundle path. The live producer was activated separately
in the parent vault at commit `2171410` and hardened at `61c33b3`:
`life-daily-loop` now preserves an independent morning baseline and validates
and atomically replaces the Habits v1 snapshot. The writer requires the caller
to declare the complete expected source and habit key sets and requires every
habit to cover the full snapshot date range. Its isolated dry run proved that
replanning and evening review preserve the baseline and that an empty-scope or
invalid candidate leaves the canonical snapshot bytes unchanged. The standard
skill validator could not start because its own Python
environment lacks `yaml`; equivalent YAML frontmatter validation, Python compile,
the dry run, and `git diff --check` passed without installing a dependency.

Dida365 was read only: one catalog read and one bounded check-in read for the
complete source scope declared in the private vault. The resulting snapshot
covers the full expected semantic catalog and bounded date window, retains
sourced observations, and leaves missing observations unknown rather than
implicit non-completion. Habit names, counts, and completion details remain in
the private vault and are intentionally omitted from this public evidence.

The live read-only preflight used reviewed candidate `00bd65f` and executable
SHA-256 `498c1d4252a8745e1ed1590d4e4a1bd302dd6e908d6d7d5a26562f168fec4a42`.
It reported the selected Tortilla Flat vault, `exercise.json` and `profile.json`
as the only owned paths, no unknown paths, an absent legacy Python directory,
an unloaded exact launchd job, and the complete reconstructed notification ID
set. It exited without a progress or completion record.

After stopping the old 1.0 process, the reviewed 2.0 executable performed the
live cutover. It removed only
`exercise.json` and `profile.json`, wrote the completed marker, preserved the
`today-workspace.json` and Habits snapshot hashes, and left no progress journal.
A second execute-mode launch successfully revalidated the completion marker,
launchd state, and pending notifications. A direct `launchctl print` for
`com.tortillaflat.exercise-habit-tracker.reminders` returned exit 113/not found.

A subsequent normal launch with no cutover variables runs version 2.0.0.
Accessibility observes only Today, Calendar, and
Habits and confirms This Week and Profile & data are absent. Habits loads the
live `Life Daily Loop · agent-derived` snapshot, and the visible refresh action
retains the same source coverage. The normal 2.0 process remains running. The
two deprecated Morning planning and Evening review Codex automations remain
PAUSED and were not replaced or modified.

An authorized live Morning generation then read Dida365 Today and one overdue
Task whose title remains only in the private Daily Record, and reused the already
successful relevant Habit/check-in reads. It created the canonical 2026-09-10 Daily Record
with matching independent baseline and current-plan sections; missing check-ins
remain unknown. After a normal 2.0 relaunch, Today rendered its five plan blocks
and initial basis, Calendar classified 2026-09-10 as a Daily Record without an
evening review, and Habits continued to refresh the same snapshot.

The same reviewed live 2.0 executable was also launched against disposable,
isolated app-data and vault roots for the write-path portion of post-cutover
acceptance. From Habits it created a clearly synthetic dated Exercise note for
2026-09-10, corrected v1 to v2, and retained one stable Markdown entry with an
append-only original/new-text trace. Calendar and Today read the correction;
after a process relaunch Habits still showed v2 and one correction, while the
snapshot SHA-256 remained unchanged. The disposable roots were then removed, so
no synthetic Exercise claim entered the real Daily Record. A final normal launch
restored the real selected vault and remains running.
