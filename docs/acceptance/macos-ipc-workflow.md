# Packaged Mac UI and IPC acceptance

This check drives the shipped Personal Dashboard window through rendered
controls and observes the resulting accessible UI state. Scenarios that cover
persistence relaunch the same isolated app copy; the focused review-fix
`list-first` scenario is limited to shell and navigation evidence. The
`dashboard-4` scenario is the continuous FINAL candidate check for the current
4.0 task surface. It does not use
the browser prototype, a development server, or a direct Rust application
object.

1. Build the packaged app with `npm run build:mac`.
2. Run `scripts/acceptance/macos-ipc-workflow.sh` on the supported Mac. The script copies the
   bundle to a temporary location, uses temporary profile and baseline paths,
   supplies a fixed epoch and UTC offset through the acceptance-only clock
   environment variables, and launches the copied executable directly inside
   the scenario's isolated process group.
3. The focused list-first check verifies the persistent **This Week**, **History**,
   and **Settings** destinations, switches through each destination, and checks
   the rendered fixed-window/pane-overflow status before returning to **This Week**.
   For both secondary destinations it compares the Accessibility frame of the
   labeled content boundary with the active information surface at 960×720 and
   640×520; visible text alone is not sufficient. It also confirms the compact
   Settings surface scrolls without document scrolling, then checks the Monday,
   Wednesday, and Friday agenda rows, the fallback availability group, the
   Monday default selection, and a Wednesday row selection in the contextual pane.
4. The focused `list-first` scenario ends after the future and due detail
   sheets are opened and closed. It does not record a workout or relaunch the
   app; direct recording and persistence are covered by separate scenarios.

## Personal Dashboard 2.0 FINAL scenario

Run the composite candidate check with:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=dashboard-2 \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=300 \
scripts/acceptance/macos-ipc-workflow.sh
```

The scenario creates one isolated synthetic vault, one complete Daily Record,
and the checked-in complete Habits snapshot. The record contains a preserved
morning baseline, explicit event-only facts, a daytime replan, and a complete
evening account. The same date then crosses **Today**, **Calendar**, and
**Habits** at 1180×820, 800×640, and 640×520. The checks cover semantic
hierarchy, complete representative content, compact destination switching,
expanded habit evidence, primary actions, and fixed-document scrolling. Source
hashes must remain unchanged throughout this reading-only pass.

The recursive `gate` runs these scenarios in order:

```text
settings-vault-colors interface-language background-image
day-tasks planning-tasks local-habit-completion historical-corrections
dashboard-3
dashboard-4
```

The older 2.0 cutover and Exercise/Profile packaged scenarios remain
individually callable as historical acceptance seams, but ADR-0002 excludes
their old shell from the normal-startup 3.0 candidate gate. A current gate must
not require the retired runtime or its hybrid-language navigation to reappear.

## Personal Dashboard 3.0 Settings, Vault, and color scenario

Run the ticket-01 packaged check with:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=settings-vault-colors \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=360 \
scripts/acceptance/macos-ipc-workflow.sh
```

The scenario uses isolated app data and two synthetic Vaults. It opens the
Appearance and Data & Vault categories, checks the Drive desktop-client and
local-save wording, selects folders through the native picker, switches Vaults,
and exercises unavailable-folder recovery. It also selects an accent color,
relaunches the packaged app, confirms the preference survives the relaunch and
Vault switch, verifies the active preference from Today, Calendar, and Habits,
then restores the default while proving both Vault records remain byte-identical.
The driver samples the rendered theme chips and compares them with the selected
swatch, so this proves page-level color application rather than only serialized
preference state. Final whole-interface prototype parity remains a separate
acceptance concern.

## Personal Dashboard 3.0 interface-language scenario

Run the ticket-02 packaged check with:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=interface-language \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=360 \
scripts/acceptance/macos-ipc-workflow.sh
```

The scenario uses isolated app data and two synthetic Vaults. At 800×640 it
switches the top-toolbar control from Chinese to English, checks navigation,
Today phases, localized Calendar dates, empty Habits status, and the longest
Data & Vault guidance. It keeps an unsaved bilingual draft and selected phase
through the switch, saves the draft verbatim, and verifies existing bilingual
Markdown remains unchanged. The native Vault picker title is checked in both
languages; English must survive the Vault change and a packaged relaunch.
Finally, an invalid local language document must recover to the usable Chinese
default without changing either Vault.

After scrolling only the Settings content surface, the long-copy check requires
the full AX text frame to remain inside the app window and to wrap to multiple
lines; the document itself must remain fixed without page-level vertical
scrolling.

## Personal Dashboard 3.0 background-image scenario

Run the ticket-03 packaged check with:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=background-image \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=360 \
scripts/acceptance/macos-ipc-workflow.sh
```

The scenario generates synthetic light and complex PNGs in the isolated
acceptance directory and imports them through the real macOS file picker. It
checks the rendered preview pixels, accent colors, and an actual page-backdrop
pixel signature shared by Today, Calendar, and Habits at 1120x760 and 800x640.
The main-content signature must differ from the no-image state; Today and
Calendar must share the same translucent outer layer. A second rendered check
compares Calendar cell interiors with the adjacent page layer to reject stacked
opaque white cells. The light image must survive moving its source and restarting
the packaged app. Picker cancellation and a marker-only corrupt PNG must retain
the current preference; a damaged app-owned copy must expose a recoverable state
before a complex replacement is selected.

Removal and Restore default appearance must clear only the app-owned copy and
reference. The moved light source, complex source, interface-language file,
selected-Vault file, and synthetic Vault Markdown are hash-checked or checked
for continued existence. The scenario therefore covers local ownership and
packaged persistence without treating a browser object URL as evidence.
Deletion failures are persisted as pending cleanup, surfaced in Settings, and
retried at the next appearance load; Rust workflow tests exercise that recovery
path because an isolated packaged run cannot safely manufacture a filesystem
permission failure inside the app-owned directory.

The installed-cycle, Calendar, and Habits scenarios retain their own missing,
malformed, empty, write, correction, and relaunch checks. `dashboard-2` adds the
single-schedule integration proof; it does not replace those focused
regressions.

## Personal Dashboard 3.0 day-task scenario

Run the ticket-04 packaged check with:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=day-tasks \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=360 \
scripts/acceptance/macos-ipc-workflow.sh
```

The scenario uses two isolated synthetic Vaults and drives the always-visible
Today task rail through add, rename, complete, reopen, delete, refresh, conflict
retry, Vault switching, and packaged relaunch. It verifies a deletion tombstone,
independent per-Vault task documents, preserved rename text after a stale-revision
failure, all three Today phases at 1120x760, the responsive 800x640 layout, and
Chinese/English fixed copy without translating personal task text. Both
synthetic Daily Record files are hash-checked to remain byte-identical.

The packaged scenario manufactures a safe external-revision conflict. The Rust
application workflow tests separately inject create and replacement failures;
the acceptance run does not change directory permissions or risk unrelated
files to simulate a filesystem failure.

## Personal Dashboard 3.0 planning-task scenario

Run the ticket-05 packaged check with:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=planning-tasks \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=360 \
scripts/acceptance/macos-ipc-workflow.sh
```

The scenario starts the packaged app against an isolated synthetic Vault, then
atomically replaces only the synthetic planning input and uses the real Today
refresh entry to receive it. It proves that actions enter the task rail,
suggestions do not, daily-flow provenance is visible, and repeated source
identities remain unique. After a user rename and completion, a replan adds and
reorders unconfirmed work without replacing either state. A deletion remains a
tombstone across rereads; reusing its old source reference with a new task ID is
rejected, while a later action with both identities changed is accepted.
While that producer rejection remains active, a local rename stays writable and
the producer diagnostic remains visible; the local mutation does not implicitly
retry or receive the changed planning input. Only the next explicit refresh
does so.

The retained result is checked after packaged relaunch and in both interface
languages. The pre-existing synthetic evening review is hash-checked throughout.
Only synthetic files are used: the scenario does not invoke or modify any Agent,
skill, Dida365 data, MCP connection, or automation. Application workflow tests
separately cover whole-input validation, yesterday's reader context, and an
interleaved canonical write at the conditional replacement boundary.

## Personal Dashboard 3.0 continuous Today time-axis scenario

Run the ticket-02 packaged check after `npm run build:mac`:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=today-time-axis \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=420 \
scripts/acceptance/macos-ipc-workflow.sh
```

The scenario uses the packaged Tauri app, an isolated synthetic Vault, and
temporary app data. It checks the first Today view is centered near the local
clock, confirms planned and observed items occupy their named A lanes on the
shared 00:00–24:00 axis, and exercises explicit intervals, overlapping points,
short intervals, thresholds, coarse/unlocated content, and long copy. The real
system clock advances while the app is hidden; foreground recovery must update
the label without displacing the user's manual reading position. A previous
empty date retains its selection and time scale across a tick without creating
a Daily Record.

The overnight subcase uses a deterministic packaged clock at 23:59 and 00:01
to verify clipped cross-date plan segments, source-date/continuation labels,
and that a confirmed fact from the start date is not copied. The wide Chinese
and narrow English views use the packaged accessibility driver; Locate now is
activated by keyboard. Synthetic Daily Records are hash-checked and remain
byte-identical. This scenario does not modify the installed app or personal
Vault. Optional screenshots go into a new capture directory supplied through
`PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY`.

## Personal Dashboard 3.0 integrated candidate scenario

Run the ticket-09 packaged and screenshot check with a new capture directory:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=dashboard-3 \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=300 \
PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY="$PWD/output/playwright/personal-dashboard-3-candidate-YYYYMMDD" \
scripts/acceptance/macos-ipc-workflow.sh
```

The scenario uses one isolated synthetic Vault to capture the accepted B task
rail, all three Today phases, Calendar, expanded Habits, Appearance, and the
long English Data & Vault guidance at 1120x760, 800x640, and 640x520. It imports
a synthetic background through the real picker, moves the source, relaunches,
and verifies the app-owned copy plus color preference. The capture directory
must be new and remain under `output/playwright/`; exclusive creation prevents
the driver from replacing another writer's file. The recursive local gate runs
the focused behavior scenarios before this integrated reading/visual pass.

## Personal Dashboard 3.0 Drive compatibility scenario

The Drive scenario is intentionally outside the recursive gate because it needs
an actual Google Drive desktop-client File Provider root and a fresh, dedicated
synthetic Vault. A normal temporary directory is rejected. Prepare the synthetic
Daily Records, Habits snapshot, and planning input under a unique child of
`~/Library/CloudStorage/GoogleDrive-…/My Drive`, then add this exact marker file:

```text
.personal-dashboard-drive-acceptance
personal-dashboard-drive-compatibility-v1
```

Validate the fixture before stopping the Drive client:

```sh
node scripts/acceptance/drive-vault-policy.mjs "$PERSONAL_DASHBOARD_DRIVE_VAULT"
```

After the client has uploaded the seed fixture, stop the client explicitly and
run the packaged local/offline phase:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=drive-compatibility \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=360 \
PERSONAL_DASHBOARD_DRIVE_VAULT="$PERSONAL_DASHBOARD_DRIVE_VAULT" \
scripts/acceptance/macos-ipc-workflow.sh
```

The scenario selects the folder with the native picker, receives the structured
producer action while excluding its suggestion, saves a task and local habit
completion, records a historical correction, and proves offline relaunch. It
then atomically replaces a synthetic record, verifies explicit stale-write
failure and retry, and switches to a local-only Vault strictly as an isolation
control. Logs redact the Drive account portion of the selected path.

This packaged pass proves local app behavior in a materialized Drive File
Provider directory only. After restarting the Drive client, separately require
File Provider or remote-web evidence that the changed files are uploaded, then
perform remote update/download plus version/trash recovery on disposable files.
Do not call the ticket complete when the client stays in an uploading state or
when only local filesystem changes are available. See
`docs/acceptance/personal-dashboard-3-drive-compatibility.md` for the current
environment result and exact support boundary.

## Personal Dashboard 4.0 integrated packaged scenario

Run the current ticket-09 packaged check after rebuilding the Mac bundle. Pass
a new capture directory under `output/playwright/` when retaining visual
evidence:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=dashboard-4 \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=420 \
PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY="$PWD/output/playwright/personal-dashboard-4-candidate-YYYYMMDD" \
scripts/acceptance/macos-ipc-workflow.sh
```

The scenario uses two temporary synthetic Vaults and the real packaged Tauri
bundle. It verifies Inbox/no-date creation from Tasks, Today-date creation,
selected-Calendar-date creation, future and overdue placement, late completion
with explicit date/time correction, abandon and restore,
delete/restore tombstones, list archive/restore across relaunch, and one task
identity across Tasks, Today, Calendar, and the Calendar `+N` panel. It also
checks bilingual Habit names and invalid-config fallback, a Vault switch,
external task-file conflict recovery with a retained draft, and the unchanged
Daily Record, Habit names sidecar, and Habit snapshot bytes.

The visual matrix captures Chinese wide Tasks/Today/Calendar/Habits and English
640x520 Tasks/Calendar/Today/Habits. The Calendar overflow panel is opened by
an Accessibility focus plus Space key event, so the packaged proof includes a
keyboard interaction. The driver selects visible rendered controls and text
fields when hidden shared projections expose duplicate labels; date/time
correction handles WebKit's native AX date segments without adding a product
dependency. This scenario is synthetic packaged evidence only: it does not
run the personal daily loop, write Dida365, or change the user's installed
Vault or automation.

The Drive portion remains outside the local gate. Reuse the 3.0 Drive result
only for its already-bounded materialized-client and cloud/version/trash
evidence; a current 4.0 run still requires a fresh marker-owned fixture for
changed task/config writes. A missing fixture leaves ticket 09 pending human
acceptance rather than implying that local writes were uploaded.

The driver is compiled from the macOS system `ApplicationServices` and
`Foundation` frameworks into the temporary acceptance directory. It adds no
runtime or product dependency. A failed step names the user-visible boundary
that failed. The scenario child stops the app cooperatively when possible; the
outer supervisor owns timeout cleanup, verifies the isolated process group and
recorded app PID have exited, and removes only that run's temporary directory.
If termination cannot be proven, the directory is retained with an explicit
diagnostic.

## Acceptance budgets

Every non-gate scenario has an enforced 240-second monotonic budget by
default. The recursive `gate` dispatcher runs each child through the same
scenario budget and has an enforced 1,800-second suite budget. The outer gate
does not perform app setup before dispatching its children, starts each child
in an isolated process group, and re-checks the monotonic deadline after the
child exits. The packaged app executable inherits that group, so a stalled
window server cannot leave a driver, app, watchdog, or temporary profile alive
after the budget expires; cleanup retains the directory if termination cannot
be proven. Override the limits only when an explicitly longer packaged run is
required:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=gate \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=240 \
PERSONAL_DASHBOARD_ACCEPTANCE_SUITE_TIMEOUT_SECONDS=1800 \
scripts/acceptance/macos-ipc-workflow.sh
```

The review-fix pass may use the focused scenario closest to the change. It does
not substitute for the recursive `gate`, which is run once on the rebuilt FINAL
candidate after review findings are resolved.

## Review-fix evidence boundary

Focused runs record only their named behavior and direct visual observations.
They do not imply coverage from another scenario. Final candidate evidence must
name the rebuilt bundle, the scenarios actually run, and the separate visual
comparison; Accessibility semantics alone do not prove typography, palette,
spacing, or rendered hierarchy.
