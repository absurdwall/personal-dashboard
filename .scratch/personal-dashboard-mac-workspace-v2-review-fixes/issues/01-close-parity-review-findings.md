# 01 — Close parity review findings

**Type:** task

**What to build:** Resolve the actionable findings from the review of the v2 parity implementation in one bounded pass. Restore the visual spacing that the user reported in History and Settings, make the packaged acceptance evidence capable of detecting that defect, make the acceptance harness bounded and fail-closed, and repair the local issue metadata. This is a review-fix ticket, not a new feature round.

**Blocked by:** None — can start immediately.

**Status:** resolved

## Scope

- [x] Restore the prototype-matching horizontal inset for History and Settings. Keep This Week's list-first surface separately zero-padded where required; do not apply a global zero-padding rule to every `.workspace-destination`.
- [x] Extend the existing packaged shell/navigation check with a lightweight geometry/inset assertion for both History and Settings at the supported desktop and compact viewport classes. The assertion must inspect the destination content boundary or equivalent Accessibility frame relationship, not merely search for visible text.
- [x] Make the packaged acceptance orchestration bounded and non-redundant. Remove unused outer setup before the `gate` dispatcher, avoid repeated coverage where one focused assertion is sufficient, and enforce an explicit per-scenario and overall suite budget so a window-server stall cannot consume hours.
- [x] Make interaction helpers fail closed. In particular, a picker helper must not treat matching text anywhere in the Accessibility tree as proof that the specific control changed, and action failures must not be silently swallowed. Do this structurally; do not execute any picker or time-selection scenario in this ticket.
- [x] Add `Type: task` to the four resolved parity-closure issue files under `.scratch/personal-dashboard-mac-workspace-v2-parity-closure/issues/` so the local issue tracker can classify them.

## Acceptance criteria

- [x] At 960×720, History and Settings visibly start with intentional left and right content spacing instead of touching the workspace divider; This Week remains visually unchanged.
- [x] At 640×520, History and Settings retain readable inset content while the active workspace surface remains the only scrolling region.
- [x] The focused packaged shell/navigation check proves the History and Settings inset relationship and fails when the content is flush with the divider.
- [x] The acceptance harness has a documented, enforceable time budget per scenario and for the suite; no recursive invocation can bypass that budget.
- [x] A failed Accessibility action or an unchanged control value produces a failure, never a success based only on unrelated rendered text.
- [x] `npm run check`, `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`, `bash -n scripts/acceptance/macos-ipc-workflow.sh`, and Swift driver compilation pass.
- [x] A fresh packaged app is built once, inspected at desktop and compact sizes, and the single non-picker shell/navigation acceptance passes.
- [x] No time-selection test, picker workflow test, `exceptions` scenario, or full recursive `gate` run is executed for this ticket.

## Out of scope

- New exercise workflows or visual redesign of This Week.
- Refactoring lower-priority duplicated row builders or schedule value representations.
- Reopening or rewriting the historical parity tickets beyond adding the required `Type: task` metadata.

## Answer

Implemented the bounded parity review fix. History and Settings now use the prototype-matching inset at desktop and compact sizes while This Week retains its separate list-first zero-padding. The packaged driver asserts the labeled content boundary against the active workspace surface through Accessibility frames, and the focused list-first scenario covers both destinations at 960×720 and 640×520 while checking that the document itself does not scroll.

The acceptance harness now has documented 240-second per-scenario and 1800-second suite budgets, delegates the gate before outer setup, and keeps this review pass focused. Picker helpers now compare the specific picker AXValue/selected state before and after the action and propagate Accessibility action failures instead of accepting unrelated tree text. The four historical parity issues also carry `Type: task`.

Verification completed: `npm run check` (TypeScript build plus `cargo check`, with no Rust tests); Rust format check; `bash -n scripts/acceptance/macos-ipc-workflow.sh`; Swift driver compilation; one fresh `npm run build:mac`; direct packaged desktop/compact inspection; and the final focused packaged list-first acceptance. No picker/time-selection workflow, `exceptions`, or recursive `gate` run was executed.
