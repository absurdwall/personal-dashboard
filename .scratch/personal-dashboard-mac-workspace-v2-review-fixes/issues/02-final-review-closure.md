# 02 — Final review closure

**Type:** task

**What to build:** Close the remaining review findings from ticket 01 in one final bounded pass. This ticket covers acceptance-harness correctness, packaged-artifact evidence, compact secondary-destination parity, and tracker/documentation cleanup. It must not introduce a new product feature round.

**Blocked by:** 01 — Close parity review findings (resolved)

**Status:** resolved

## Scope

- [x] Rebuild and relaunch the current packaged app from this source revision. Confirm the actual running app—not only source CSS—shows intentional History and Settings horizontal inset at `960x720` and `640x520`, while This Week remains unchanged.
- [x] Make scenario timeouts terminate the complete scenario process tree. A stalled `swiftc`, driver, app, or window-server interaction must not leave descendants, the watchdog, or the temporary profile alive after the shell is terminated.
- [x] Close the scenario/suite deadline race. Use a monotonic or otherwise reliable deadline and re-check elapsed time after the child exits before accepting a successful result.
- [x] Make Accessibility fallback behavior fail closed. A failed scroll/action attempt must not become a passing assertion merely because a later mouse event moved an anchor; distinguish supported fallback methods from failed actions.
- [x] Keep the prototype's compact vertical inset for History and Settings. Do not let the short-height override reduce the intended `22px` top inset to `14px` at `640x520`.
- [x] Reconcile the hardened picker helper with existing gate scenario definitions that select `4:00 PM` after the selected day already preserves `4:00 PM`. Update the scenario expectation or fixture so a legitimate no-op is explicit, while preserving a separate unchanged-value failure check. Do this structurally only; do not execute picker or time-selection workflows.
- [x] Correct acceptance documentation: the budget example must explicitly invoke `gate` when describing suite budgets, and the focused `list-first` description must not claim recording or relaunch coverage that the scenario does not perform.
- [x] Replace the full `cargo test --manifest-path src-tauri/Cargo.toml` verification claim with checks that do not execute `change_time_*` or other time-selection tests. Do not run picker/time-selection tests, the `exceptions` scenario, or the recursive `gate` for this ticket.
- [x] Commit the review-fix `spec.md` with a resolved/consistent status and update its reviewed range so a fresh session has one durable source of truth.

## Acceptance criteria

- [x] The packaged app actually running from the fresh build visibly has the expected History/Settings inset at both supported review sizes; source inspection alone is insufficient.
- [x] This Week's spacing and list-first behavior remain unchanged.
- [x] A stalled scenario cannot outlive its budget through surviving child processes, and a child that exits near a deadline cannot be accepted after the deadline.
- [x] Accessibility action failures produce a failure; fallback input is used only when the preceding method is explicitly unsupported rather than failed.
- [x] Existing scenario definitions no longer treat a same-value time selection as a successful state change; no-op behavior is explicit.
- [x] Documentation matches the commands and coverage actually implemented.
- [x] Verification evidence contains no full Rust test run, picker/time-selection workflow, `exceptions` scenario, or recursive `gate` run.
- [x] The issue, map, and spec agree on closure status and the spec is tracked in the effort directory.

## Verification boundary

Allowed: `git diff --check`, shell syntax/static inspection, Swift compilation or parse checks, selective non-time checks, a fresh packaged build, and direct visual inspection/navigation of History and Settings at `960x720` and `640x520`.

Forbidden for this ticket: picker tests, time-selection tests, the `exceptions` scenario, and the full recursive acceptance gate.

## Out of scope

- New exercise behavior, new destinations, or another visual redesign round.
- Reopening the historical parity tickets 01–04 beyond evidence and metadata consistency.

## Answer

Implemented the final bounded review closure. Packaged scenario children now run
in isolated process groups with monotonic per-scenario and suite deadlines;
deadline handling re-checks elapsed time after `wait`, terminates the app's
exact process tree, and allows cleanup to remove the temporary profile. The
Accessibility scroll fallback now proceeds only after an explicitly unsupported
method; failed actions or unchanged anchors fail closed. The picker driver keeps
strict unchanged-value failures while gate definitions use an explicit
`select-contains-allow-unchanged` command for legitimate same-value selections.

The compact History and Settings top inset remains `22px`, and acceptance
documentation now matches the focused `list-first` coverage and explicitly
invokes `gate` in the suite-budget example. The review-fix spec is tracked with
resolved status and the four historical parity issues retain their task
metadata.

Verification passed: `npm run check` (TypeScript build plus `cargo check`),
Rust format check, `bash -n scripts/acceptance/macos-ipc-workflow.sh`, Swift
driver compilation, `git diff --check`, one fresh `npm run build:mac`, the
focused packaged `list-first` shell/navigation scenario, and direct visual
inspection of a fresh packaged copy at `960x720` and `640x520`. No Rust test
suite, picker/time-selection workflow, `exceptions` scenario, or recursive
`gate` was run.
