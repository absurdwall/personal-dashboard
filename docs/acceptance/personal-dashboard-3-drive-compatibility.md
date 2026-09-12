# Personal Dashboard 3.0 Drive compatibility result

Date: 2026-09-12

Status: **incomplete — local/offline packaged behavior passed; cloud and recovery evidence is blocked by the current Drive client state.**

## Environment and isolation

- macOS 26.5.1 (25F80), Apple silicon.
- Google Drive for desktop 123.0.1.0 with a mounted File Provider `My Drive`
  directory under `~/Library/CloudStorage/GoogleDrive-…/`.
- Every test Vault used a unique `PD-Acceptance-08-*` child directory, an
  `.obsidian/` directory, and the exact
  `.personal-dashboard-drive-acceptance` marker. No existing personal Vault or
  personal record was selected or changed.
- `scripts/acceptance/drive-vault-policy.mjs` rejects non-macOS hosts, paths
  outside that File Provider layout, the `My Drive` root itself, and folders
  without the exact marker. The packaged log redacts the account segment.

## Passed local/offline evidence

The packaged bundle was rebuilt, the Drive desktop process was stopped, and the
dedicated scenario passed against a locally materialized synthetic Vault:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=drive-compatibility \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=360 \
PERSONAL_DASHBOARD_DRIVE_VAULT="$PERSONAL_DASHBOARD_DRIVE_VAULT" \
scripts/acceptance/macos-ipc-workflow.sh
```

Observed results:

- The native picker selected the Drive fixture and the packaged app read the
  current Daily Record and complete Habits snapshot.
- The planning action entered Today with daily-flow provenance; the suggestion
  stayed out. Re-reading did not create a second visible task.
- A local task completion, a local habit completion, and historical task plus
  habit complete/withdraw corrections were saved while the Drive desktop
  process was stopped and were present after packaged relaunch.
- Both synthetic Daily Record reviews stayed byte-identical until the later,
  intentional external replacement step; the historical review stayed
  byte-identical throughout.
- An atomic replacement of the current synthetic record appeared after Refresh.
  A concurrent task-file change caused a visible stale-write failure. The draft
  remained available and saved only after explicit refresh and retry, so there
  was no silent overwrite in this case.
- Switching to a separate temporary Vault hid the Drive task; switching back
  restored it. That temporary Vault is only a negative isolation control and is
  not Drive-sync evidence.

## Blocked cloud and recovery evidence

After restarting Google Drive, `fileproviderctl evaluate` identified the four
representative synthetic files as downloaded and not excluded from sync, but
after a bounded two-minute wait all four still reported `isUploaded = 0` and
`isUploading = 1`. The client window continued to show its account-loading
state and did not enable its pause control. The available browser session was
not signed in to the matching Drive account; no credentials were requested or
entered.

The File Provider domain advertises file-revision support and the Drive client
exposes web-managed revisions, but this run did not prove a version restore. It
also reported that provider uploads do not support a fail-on-conflict operation;
the app's demonstrated local stale-revision guard therefore must not be treated
as proof that every later remote upload race is conflict-safe.
Because the seed and changed files never reached a confirmed uploaded state,
remote-to-local replacement, trash deletion/restore, and conflict-file recovery
were not performed. Performing those operations now would test only local or
pending state and would overstate cloud compatibility.

## Current support statement

Confirmed in this environment: Personal Dashboard can use an already
materialized, marker-owned Vault inside the Drive desktop-client directory for
local reads and writes, including while the client process is stopped, and it
recovers explicitly from the exercised local replacement conflict.

Not yet confirmed: successful upload, a change made by another Drive client or
the Drive web UI arriving locally, Drive conflict-copy behavior, file-version
restore, or trash restore. No whole-Vault point-in-time recovery is promised;
Google Drive remains the sync/version/trash owner, and Personal Dashboard does
not add OAuth, accounts, upload code, or its own sync engine.

The next valid rerun starts only after the Drive client leaves its account-loading
state. Create a fresh marker-owned fixture, confirm its seed files reach
`isUploaded = 1` and `isUploading = 0`, repeat the packaged offline phase, then
use only disposable files in that fixture for remote update and recovery checks.
