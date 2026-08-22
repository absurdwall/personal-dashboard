# Packaged Mac UI and IPC acceptance

This check drives the shipped Personal Dashboard window through rendered
controls and observes the resulting accessible UI state. Scenarios that cover
persistence relaunch the same isolated app copy; the focused review-fix
`list-first` scenario is limited to shell and navigation evidence. It does not
use the browser prototype, a development server, or a direct Rust application
object.

1. Build the packaged app with `npm run build:mac`.
2. Run `scripts/acceptance/macos-ipc-workflow.sh` on the supported Mac. The script copies the
   bundle to a temporary location, uses temporary profile and baseline paths,
   and supplies a fixed epoch and UTC offset through the acceptance-only clock
   environment variables.
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

The driver is compiled from the macOS system `ApplicationServices` and
`Foundation` frameworks into the temporary acceptance directory. It adds no
runtime or product dependency. A failed step names the user-visible boundary
that failed, and the exit trap terminates the isolated app and removes only
the temporary directory created by this run.

## Acceptance budgets

Every non-gate scenario has an enforced 240-second monotonic budget by
default. The recursive `gate` dispatcher runs each child through the same
scenario budget and has an enforced 1,800-second suite budget. The outer gate
does not perform app setup before dispatching its children, starts each child
in an isolated process group, and re-checks the monotonic deadline after the
child exits. A stalled window server therefore cannot leave a driver, app,
watchdog, or temporary profile alive after the budget expires. Override the
limits only when an explicitly longer packaged run is required:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=gate \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=240 \
PERSONAL_DASHBOARD_ACCEPTANCE_SUITE_TIMEOUT_SECONDS=1800 \
scripts/acceptance/macos-ipc-workflow.sh
```

The review-fix pass uses the focused `list-first` scenario only. It does not
run picker or time-selection workflows, the `exceptions` scenario, or the
recursive `gate`.

## Review-fix evidence boundary

The review-fix pass records only the fresh packaged shell/navigation result and
direct visual inspection of History and Settings at 960×720 and 640×520. It
does not claim workout recording, relaunch persistence, picker, `exceptions`,
or recursive `gate` coverage; those remain separate scenario boundaries.
