# Packaged Mac UI and IPC acceptance

This check drives the shipped Personal Dashboard window through rendered
controls, observes the resulting accessible UI state, and relaunches the same
isolated app copy before checking persistence. It does not use the browser
prototype, a development server, or a direct Rust application object.

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
4. The driver then presses **Log workout now**, **Elliptical**, **30**, and
   **Moderate**, and checks the visible `1 of 3 completed`, `Elliptical`, and
   `Counts toward weekly progress` state.
5. The script terminates and relaunches the copied packaged app, then checks
   the same visible result through the rendered accessibility tree.

The driver is compiled from the macOS system `ApplicationServices` and
`Foundation` frameworks into the temporary acceptance directory. It adds no
runtime or product dependency. A failed step names the user-visible boundary
that failed, and the exit trap terminates the isolated app and removes only
the temporary directory created by this run.

## Acceptance budgets

Every non-gate scenario has an enforced 240-second wall-clock budget by
default. The recursive `gate` dispatcher runs each child through the same
scenario budget and has an enforced 1,800-second suite budget. The outer gate
does not perform app setup before dispatching its children, so a stalled window
server cannot consume an unbounded setup or recursive run. Override the limits
only when an explicitly longer packaged run is required:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=240 \
PERSONAL_DASHBOARD_ACCEPTANCE_SUITE_TIMEOUT_SECONDS=1800 \
scripts/acceptance/macos-ipc-workflow.sh
```

The review-fix pass uses the focused `list-first` scenario only. It does not
run picker or time-selection workflows, the `exceptions` scenario, or the
recursive `gate`.

## Recorded result

On 2026-08-16, the arm64 packaged app switched through all three destinations,
reported `Window fixed · pane-owned overflow`, selected Monday by default,
selected Wednesday through its rendered agenda row, and completed the
unscheduled workout through the rendered controls and real Tauri IPC. The
visible state reached `1 of 3 completed`, showed the `Elliptical` record and its
qualifying outcome, and the same state was visible after a true packaged-app
termination and relaunch. The run used an isolated temporary profile with a
fixed epoch and UTC−04 offset; the temporary app copy and profile data were
removed afterward.
