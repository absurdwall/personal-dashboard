# 03 — Supervise packaged app cleanup on timeout

**Type:** task

**What to build:** Close the remaining P1 from the final review: a timed-out acceptance scenario must terminate the packaged app it launched, not only the scenario shell and driver process group. This is a bounded acceptance-harness fix; it does not change Personal Dashboard product behavior or visual design.

**Blocked by:** 02 — Final review closure (resolved)

**Status:** resolved

## Scope

- [x] Make the packaged app part of the timeout supervisor's ownership boundary. Prefer launching the app executable directly inside the already isolated process group, or implement an equally reliable app-PID handoff that the outer timeout path can use after the scenario shell is killed.
- [x] On scenario or suite timeout, terminate the driver, scenario shell, watchdog, packaged app, and any descendants; do not rely on the child shell's `EXIT` trap because the shell may be forcibly killed before cleanup runs.
- [x] Do not delete the temporary acceptance profile until the packaged app and its descendants have exited. If cleanup cannot prove process termination, fail clearly and retain the directory for diagnosis rather than deleting data still in use.
- [x] Preserve the existing monotonic per-scenario and suite deadlines, no-op picker command, compact inset fix, and documentation changes from ticket 02.
- [x] Keep this ticket structurally verified only. Do not run picker or time-selection workflows, the `exceptions` scenario, or the recursive `gate`.

## Acceptance criteria

- [x] A timeout can no longer leave the packaged app alive outside the supervised process group.
- [x] The timeout path cleans up the app, driver, watchdog, and temporary profile, or fails with an explicit retained-directory diagnostic.
- [x] Normal scenario cleanup still terminates the app and removes only its own temporary directory.
- [x] `bash -n` and Swift driver compilation or parse checks pass; no product behavior or frontend files change.
- [x] No picker/time-selection workflow, `exceptions` scenario, or recursive `gate` is run for this ticket.

## Verification boundary

Allowed: shell/static inspection, a bounded synthetic timeout/cleanup check that does not open the product's picker or time-selection UI, Bash syntax validation, and Swift compilation or parse checks.

Forbidden: picker tests, time-selection tests, the `exceptions` scenario, and the full recursive acceptance gate.

## Out of scope

- New product features, frontend layout changes, or changes to the v2 prototype parity contract.
- Reopening tickets 01 or 02.

## Answer

Implemented the packaged-app supervision boundary in
`scripts/acceptance/macos-ipc-workflow.sh`. The outer gate now creates one
temporary supervision directory per child scenario and passes it into the
child. The child launches the copied `personal-dashboard` executable directly
with the isolated profile environment, so the app, Accessibility driver,
watchdog, and scenario shell inherit the already isolated process group. The
child records the app PID and leaves the supervisor-owned directory for the
outer process to finalize.

Timeout cleanup terminates the process group, escalates to `KILL` when needed,
checks the recorded app PID and non-zombie process-group membership, and only
then removes that scenario's directory. A malformed or still-live ownership
record fails closed with an explicit retained-directory diagnostic. Normal
child cleanup still stops its app and the outer supervisor removes only its own
temporary directory. The acceptance documentation now describes direct
executable launch and the retained-directory behavior.

Verification passed: `bash -n scripts/acceptance/macos-ipc-workflow.sh`, Swift
driver compilation with `ApplicationServices` and `AppKit`, `git diff --check`,
static ownership assertions, and a bounded synthetic check using a fake app.
The synthetic check confirmed the app PID shared the child PGID, a forced
PGID kill stopped the app, and the supervisor-owned directory remained until
termination was verified and it was explicitly removed. No picker or
time-selection workflow, `exceptions` scenario, or recursive `gate` was run;
no frontend or product files changed.
