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

## Live status

The live installation, live app-owned state, Python launchd job, real pending
notifications, live daily-loop skill, Dida365, and automations were not changed
by this implementation. The exact installed bundle and the producer changes
still require the separate explicit authorizations described in the cutover
plan. Until those operations and their post-cutover checks complete, ticket 07
must remain incomplete.
