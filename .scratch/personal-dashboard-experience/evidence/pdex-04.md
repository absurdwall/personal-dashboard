# PDEX-04 implementation evidence

Date: 2026-10-10
Branch: `codex/pdex-04`
Initial integration claim: `530902b`, atop `a77603e`.
Implementation increments: `9a55b41` (persisted application regression and synthetic view fixture), `cd707ea` (production plan pointer adapter, resize and recovery).
Integration history retained: `8199be6` includes the complete PDEX-07 seam at `9618219`; `2503003` includes integration `393d7ea` with PDEX-08.
State: code-ready; public application/persistence and real production Chrome pointer seams verified. Packaged Tauri IPC and user acceptance remain pending PDEX-11.

## Behavior

The existing shared pointer owner resolves only safely bound Current arrangement plans. It captures the displayed date, Vault binding, revision and plan source ID; the release invokes `edit_plan_time` against that captured source. An exact range move preserves its original duration, including non-quarter end times. An exact point remains a point. Broad/approximate plans save approximate points. Only exact ranges expose a separate end handle; its click opens the existing non-drag editor. Short-card minimum reading height does not become a saved duration or the end-handle position.

The shared owner supplies fifteen-minute snapping, real inner-axis edge scrolling, movement threshold, cancellation and invalid-bound refusal. Production previews show the proposed time and precision before any write. The official card changes only after a returned readback. Failed/unconfirmed results restore the saved card and open the existing editor with disabled, retained attempted values plus explicit reread. A known successful write with failed readback says the document was saved, rather than claiming an unconfirmed write. Reread does not automatically replay the mutation.

Plan and Task source guards are independent: a damaged Task source cannot block a writable plan or allow a blank Task selection. Facts never acquire plan gesture IDs or resize handles. No plan operation invokes Morning, Task state, or Task schedule writes.

## Red-green and verification

- The initial real production plan pointer test could not acquire a preview because the shared resolver still rejected plans. After the adapter, a real mouse moves `08:07–10:11` to `18:00–20:04`, scrolls along the inner axis edge, retains 124 minutes, shows the same preview as the saved arguments, and presents the returned source view.
- An actual-browser damaged-Task-source case initially could not acquire a plan preview because shared begin was Task-only. Independent source guards fixed that failure; blank selection remains unavailable in the damaged Task context.
- A saved/readback-failure case initially rendered “Result unconfirmed” beside the axis despite the successful-write response. It now renders “Document saved”, retains `18:00/20:04`, and rereads without a second mutation.
- Native public application regression verifies no write/snap on read of `08:07–10:11`, a 124-minute move, end-only resize, fuzzy and exact point writes, public readback and a new application instance. Original Morning bytes, confirmed facts and Tasks remain independent.
- Existing public application tests also cover stale revision, wrong Vault, unsafe source identity, atomic failure and the saved/readback-failure distinction. No new backend write mechanism was introduced.
- `npm run build`: passed after `2503003`.
- `npm run test:frontend`: 424 passed after `2503003`; zero failed, skipped or cancelled.
- Real Chrome pointer suites: 8 plan cases + 8 existing Task cases passed after the production increment, covering range/point/fuzzy movement, morning-to-evening edge scrolling, end resize and click alternative, conflict recovery, saved/readback failure, facts read-only, Escape cancellation, invalid end bounds, Task failure isolation, and preserved Task create/move/retry behavior. The same suites were rerun after `2503003`.
- Isolated Rust public application suites: `daily_plan_workflow` 16 passed and `today_workflow` 54 passed. Rechecked after integrating PDEX-08, using only the warmed isolated `/tmp/pdex-01/src-tauri/target` with two build jobs.
- `git diff --check`: passed.

Commands:

```sh
npm run build
npm run test:frontend
PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs node --test tests/browser/today-axis-plan-gestures.mjs tests/browser/today-axis-task-gestures.mjs
CARGO_TARGET_DIR=/tmp/pdex-01/src-tauri/target CARGO_BUILD_JOBS=2 cargo test --manifest-path src-tauri/Cargo.toml --test daily_plan_workflow --test today_workflow
```

## Evidence boundaries

`tests/browser/fixtures/plan-drag-views.json` contains only synthetic views exported by the real public application workflow. Chrome loads the full production `dist/index.html`, CSS, `main.js` and imported modules. Native mouse/keyboard interaction is real; Tauri IPC is the mocked system boundary. Separate Rust workflows write and reopen only synthetic temporary Vault files. These two agreed seams do not prove one packaged pointer-to-IPC-to-file execution or human acceptance.

No dependency, installation, release, personal Vault/profile mutation, or remote tracker operation was performed. Initial missing `dist` was build setup, not a behavioral red. The pointer harness uses current rendered plot coordinates after the last edge-scroll frame, matching the preview a user can adjust before release. PDEX-11 must retain direct packaged morning-to-evening movement, resize, fuzzy/point, conflict recovery and file readback/reopen evidence before closing the final acceptance item.
