# Mac authoritative profile move acceptance

This check proves the native file boundary and visible authority transition that
the isolated-device application tests replace with deterministic adapters.

1. Build the packaged app with `npm run build:mac` and verify it with
   `npm run accept:mac`.
2. Launch the packaged app with an isolated source data directory. Save a
   recognizable profile label and note its progress and next reminder.
3. Choose **Move profile…**. Confirm that the warning says the source will
   become inactive only after the move file is saved.
4. Choose **Save move and deactivate**. In the native macOS save panel, save
   `personal-dashboard-move.json`.
5. Confirm that the source shows **Authority: Inactive**, no planned reminder,
   disabled exercise actions, retained profile data, and the failed-transfer
   reactivation warning. Relaunch the isolated source and confirm it remains
   inactive.
6. Launch the packaged app with a separate isolated destination directory.
   Choose **Import moved profile…** and select the move file in the native macOS
   open panel.
7. Confirm that the destination remains unchanged while the non-merge
   replacement confirmation is visible. Choose **Cancel** once and verify the
   destination remains unchanged.
8. Select the move file again and choose **Replace and activate**. Confirm that
   the moved label, exercise state, and next reminder appear with
   **Authority: Active**.
9. Reopen the isolated source, choose **Reactivate this profile…**, and confirm
   that the conflict warning appears before **Reactivate here**. Complete the
   action only as acceptance data, then remove the exported move and both
   isolated profiles.

## Recorded result

On 2026-08-14, the packaged arm64 app passed launch acceptance without Python
or a listening TCP socket. The real macOS save panel created the distinct move
file, after which the isolated source became inactive, disabled exercise
actions, suppressed its planned reminder, retained its data, and stayed
inactive across relaunch.

The real macOS open panel selected that move on a separate isolated
destination. Cancellation preserved the destination. Confirmed import replaced
it without offering a merge, activated the moved `Native move source` profile,
and scheduled its next departure reminder. The source reactivation flow showed
the simultaneous-authority warning before returning the acceptance copy to an
active state. The exported file and both isolated profiles were removed after
the run.

After the reminder-retry review changes, the packaged build was accepted again
with fresh isolated profiles. The native panels moved `Final native move source`;
the source showed inactive authority, disabled exercise activity, and no planned
reminder, while the destination activated the moved profile and scheduled its
next departure reminder. Those temporary profiles and the move file were removed.
