# Packaged Mac UI and IPC acceptance

This check drives the shipped Personal Dashboard window through rendered
controls and observes the resulting accessible UI state. Scenarios that cover
persistence relaunch the same isolated app copy; the focused review-fix
`list-first` scenario is limited to shell and navigation evidence. The
`dashboard-2` scenario is the continuous FINAL candidate check. It does not use
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
list-first direct state-semantics progress workouts exceptions responsive
compact keyboard week-close installed-cycle calendar habits vault-selection
vault-recovery final-state-matrix dashboard-2 settings-vault-colors
interface-language background-image
day-tasks
```

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
