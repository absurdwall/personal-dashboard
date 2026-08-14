# Mac completed-baseline migration acceptance

This check proves the packaged app's automatic migration boundary without
reading or changing a live exercise profile.

1. Build the packaged app with `npm run build:mac` and verify its isolated
   Launch Services path with `npm run accept:mac`.
2. Copy `tests/fixtures/completed-python-baseline-state.json` into a temporary
   baseline directory and record SHA-256 checksums for the repository fixture
   and copy.
3. Launch the packaged app through Launch Services with
   `PERSONAL_DASHBOARD_DATA_DIR` pointing to an empty temporary profile and
   `PERSONAL_DASHBOARD_BASELINE_FILE` pointing to the copied fixture.
4. Confirm the visible completion status, active authority, completed-baseline
   origin, schedule exception, progress, fallback assignments, departure
   outcomes, and five workout records across current and historical weeks.
5. Confirm that `profile.json` records source schema version 5 and that the
   paired app-owned exercise document uses the current schema.
6. Quit, relaunch the same profile with a deliberately invalid baseline path,
   and confirm the recorded profile loads unchanged instead of reconverting.
7. Launch a fresh temporary profile against the invalid input and confirm the
   app shows a controlled error, disables profile and exercise actions, and
   creates neither app-owned document.
8. Recheck the fixture checksums, quit the app, and remove all temporary
   profiles and fixture copies.

## Recorded result

On 2026-08-14, the packaged arm64 app migrated the synthetic schema-v5 fixture
automatically. The visible dashboard showed active authority, automatic
completed-history adoption, `1 of 3 completed`, the moved, skipped, and missed
departure outcomes, one available fallback, and all five records across the
two fixture weeks. `profile.json` recorded `source_schema_version: 5`, and the
paired exercise document used schema 8.

The source fixture and temporary copy both retained SHA-256
`cf65c2a3e1f085ee34145858f91b908928a90940e5ab90808fbc8166de8f8c36`.
Relaunch with invalid baseline content showed **Profile loaded from this
device** and retained the migrated outcomes, proving the completion record won
without reconversion. A fresh profile against the same invalid input showed a
disabled, controlled migration error and created no profile or exercise file.
All temporary acceptance data was removed after the run.
