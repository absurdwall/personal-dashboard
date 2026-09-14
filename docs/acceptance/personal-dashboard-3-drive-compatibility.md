# Personal Dashboard 3.0 Drive compatibility result

Date: 2026-09-12 to 2026-09-14

Status: **passed with documented Drive limitations — local/offline packaged behavior, actual cloud synchronization, version recovery, and web trash recovery were exercised in an isolated fixture.**

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

## Actual cloud and recovery evidence

On 2026-09-14 Drive for desktop and Drive web were confirmed on the same intended
account without recording its address in version control. A fresh disposable file inside
`PD-Acceptance-08-20260912-cloud-r1` reached `isUploaded = 1` and
`isUploading = 0` before cloud mutation began.

- A version uploaded in Drive web arrived at the local File Provider path in
  one second with the exact expected SHA-256. This is the remote-to-local proof;
  it is distinct from the earlier packaged local/offline evidence.
- To connect that transport proof to the application seam, an isolated-profile
  packaged app first opened the fixture's synthetic canonical
  `life/Journal/Daily/2026/2026-09/2026-09-08.md` and confirmed that a unique
  web-update marker was absent. Drive web then uploaded a 330-byte new version
  of that same file. It reached the local path in two seconds with SHA-256
  `692ed027060bf2e7886c1bedf7d197e484ecd442b269491f0d633e6683dc444d`.
  The still-open packaged app displayed the marker before an explicit Refresh;
  after Refresh it still displayed the new marker, the prior external-replace
  marker, and the original review line together. This is the actual
  Drive-to-packaged-app reread proof rather than an inference from two separate
  tests.
- For the conflict exercise, Drive for desktop was stopped, the local file was
  changed to an offline revision, and a different remote revision was uploaded
  in Drive web. After the client restarted, the later local revision became the
  current Drive version while the remote revision remained recoverable as
  version 4 in Drive's version history. No separate conflict copy was created.
- The provider reports `Provider supports upload with fail on conflict: no`.
  Therefore the supported recovery mechanism demonstrated here is retained
  version history, not conflict-copy creation or an atomic fail-on-conflict
  guarantee.
- The user downloaded Drive version 4 from Manage versions. Its 155-byte
  contents matched the source SHA-256
  `0f07e0803a561c7f58c66e3027a8a9752c67d979acd5e27c3b0bb5217b8ee6f4`.
  Uploading that file back as a new current version synchronized it locally in
  one second. `fileproviderctl evaluate` then reported downloaded, most recent,
  uploaded, not uploading, and no unresolved conflicts.
- Drive web moved only that disposable file to Trash, listed it there at
  155 bytes, and restored it successfully; Trash was empty afterward. The local
  file after restore retained the same SHA-256 and healthy provider flags.

One observable limitation remains: while the disposable item was visibly in Drive web
Trash, the local File Provider path did not disappear during approximately 75
seconds of bounded observation and continued to report `isTrashed = 0`. The web
trash/restore path is proven, but immediate propagation of the trashed state to
the mounted local path is not. No personal file or existing Vault was touched.

## Current support statement

Confirmed in this environment: Personal Dashboard can use a materialized,
marker-owned Vault inside the Drive desktop-client directory for local reads and
writes, including while the client process is stopped; Drive web changes can
arrive locally and be reread by the packaged app from a canonical synthetic
record; an offline/remote conflict retains both revisions in Drive version
history; and a disposable file can be recovered through version history or
Drive web Trash.

No whole-Vault point-in-time recovery is promised. Conflict-copy creation,
fail-on-conflict uploads, and immediate local disappearance for web-trashed files
are not supported claims. Google Drive remains the sync/version/trash owner, and
Personal Dashboard does not add OAuth, accounts, upload code, or its own sync
engine. A future rerun must again use a fresh marker-owned fixture, first require
stable uploaded provider flags, and restrict cloud mutation to disposable files.
