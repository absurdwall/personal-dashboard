# PDEX-12 — lightweight Task creation

Date: 2026-10-11
Status: implementation complete; independent review, isolated packaged candidate, normal installation and installed human acceptance remain pending. Ticket stays in-progress.
Base: `0f7820eecb11c3eedcc33b2c69a216e1e69523ba` (follow-up source baseline `d4f23999e6b82fcadc4533b04004da1113ee8f71`).
Product commit: `bab54bb73bdbe6676ccc2c5016497e9e2b44e5b3`.
Worker: `codex/pdex-12-quick-task-create`, managed checkout `/Users/tingranwang/.codex/worktrees/pdex-task-creation/personal-dashboard`. Current integration records merged without squash before handoff. Original PDEX-01–11 acceptance is retained.

## Behavior and boundary

A name-only input sits above the Tasks list. Add/Enter uses the same production `create_task` command as the full modal. Only authoritative same-target saved fields confirmation clears the submitted entry; focus returns for continuous input. Actual active list defaults to that list; aggregates use Inbox. Tasks Today supplies `TasksView.currentDate` without an inferred time. Name whitespace and composition-confirmation Enter do not submit.

New Task uses a native HTML modal dialog in the current viewport, focused on name, with optional content/list/date/time/execution end. Cancel/Escape before submission creates nothing and restores New Task focus. Pending saves disable edits/double submissions and prevent modal cancellation. Existing Task details, lifecycle, list management and Today axis selection creation retain their commands and storage boundary; Calendar/nav have no changes.

A shared Vault-bound attempt retains its original raw draft, stable task id and normalized submitted payload. Failure or unconfirmed response freezes that original attempt. Explicit readback can confirm an already saved matching task without replay, reject a conflicting existing identity, or confirm absence and enable explicit retry of the original fields/id with only the freshly read expected revision. No automatic retry/new store was added. Closing an uncertain modal retains its original attempt for reopening.

## Verification

Approved seam: production document/input plus Tauri public command responses using the existing independent synthetic browser harness. Engine: installed Google Chrome through Playwright Chromium channel; **this is not macOS WebKit or OS Sogou composition evidence**. Composition events here exercise the frontend guard only. Native packaged WebKit and real synthetic-Vault persistence are separate root/reviewer checks.

- `npm run build` — final isolated worker build passed; worker owns its `dist`, canonical `dist` untouched. Existing canonical `node_modules` linked; no installation/dependency change.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs node --test tests/browser/task-quick-create.mjs tests/browser/task-list-details.mjs tests/browser/today-axis-task-gestures.mjs` — **23 passed, 0 failed** (8 creation, 7 selected-detail, 8 existing Today gesture).
- `node --test tests/frontend/task-surface.test.ts tests/frontend/task-state-history.test.ts tests/frontend/task-history*.test.ts` — **21 passed, 0 failed**. Existing synthetic renderer supplies inert creation controls; substantive creation assertions are the production browser tests. Obsolete source-regex coupling to the prior creation-id implementation was replaced by the public behavior regressions.
- `npm run test:frontend` — broad exploratory run retained with **1 preexisting Today serializer failure** in `lived-day-rendering-regressions.test.ts`: legacy fake DOM serializer receives a string child and calls `undefined.replaceAll`. Isolated rerun reproduces it. PDEX-13 owns the already agreed minimal fixture correction; this Tasks branch does not duplicate that edit. Do not present this broad run as green.
- Existing Rust Task source (`src-tauri/src/tasks.rs`) remains unchanged: stable-id idempotency precedes revision validation for genuine matching retries, protected write checks binding/revision, and `create` returns real readback. Root will serialize targeted existing real synthetic storage/revision/idempotency checks; no worker Rust success is claimed.

## Red-to-green slices

1. Name-only quick create: red missing `#task-quick-name`; green saved two Tasks with optional fields null and continuous focus.
2. Viewport-local modal: red missing dialog; green long-list focus, actual viewport bounds, cancellation no create, full optional fields.
3. Composition/defaults: red composition event submitted; guard added. An intermediate green log failed only a mistaken accessible-name locator (`Details · name`, not bare name); corrected locator waits for the actual visible Task row. Corrected run 3/3 green.
4. Frozen original retry: red failed input remained editable; green preserved original draft/id/payload, read before explicit retry, one Task.
5. Modal overnight optional end/recovery: red missing end input; green all original fields retained over close/reopen, newly read revision only changes, one overnight Task. Additional retained behavioral probes cover lost-response no replay, held pending double-submit locks, failed read and conflicting identity no duplicate.

## Immutable worker logs

No real personal profile/Vault/App writes, native installation, remote query/publication or main operation performed. Log bytes are outside Git; retained SHA-256 values below. Root may copy them to the frozen candidate evidence directory before worker closeout.

| Artifact | SHA-256 |
|---|---|
| `/tmp/pdex12-build-baseline.log` | `02597e17085915d315b2cdc1503bd623f85bbea205b4cae594c1a372a6e091f7` |
| `/tmp/pdex12-slice1-red.log` | `e0eaa338be59bd7e87aa3a5a221d7d993ee95eaad66ac8af837d543077992adc` |
| `/tmp/pdex12-slice1-green.log` | `8e1f5e666ea3357ef7bd464f1badf531364d08842c84cdd4832f5217ee894d99` |
| `/tmp/pdex12-slice2-red.log` | `d68fa91ca1283201b018759024d2bb0d68ac30735b32b78e5d6cb3d460f168a6` |
| `/tmp/pdex12-slice2-green.log` | `d09ce6e16194d69ed69eb2df6d0b82047982aab1179f5a81af302fe96772e74f` |
| `/tmp/pdex12-slice3-red.log` | `92ca3ab231b82c2e27ff2d0ffd1f31aff0602c520bbb4ec772eea858b4cc9bed` |
| `/tmp/pdex12-slice3-green.log` | `4a2821b9d6029f68ef0ff6db1b97464206e5e03887193f7fbe2cffc4203719b1` |
| `/tmp/pdex12-slice3-green-corrected.log` | `7e73c0ca4bcad6de4743f7d7de524ee57f9b728aae3521025a3c3ffd17b6d84e` |
| `/tmp/pdex12-slice4-red.log` | `753ab73bf3c9177f99055cdc774e9cc065b19cbef10b3c8ee6847210329000df` |
| `/tmp/pdex12-slice4-green.log` | `04d48f052bc20ec051a07b3841318f2aa2d9867583d643d27793cb12248be23d` |
| `/tmp/pdex12-slice5-red.log` | `b5c09ca13f6f00a1fad166fbe338eb5186d37dc65c042cd1a154897a2aa7d3fd` |
| `/tmp/pdex12-slice5-green.log` | `eb03e93e345e4ecaec4e4537ce9edc1269db458aa6d332ef2668617cfe2d5cc9` |
| `/tmp/pdex12-final-build.log` | `02597e17085915d315b2cdc1503bd623f85bbea205b4cae594c1a372a6e091f7` |
| `/tmp/pdex12-browser-final.log` | `0ef4264379e2cc162a35fc6ca2358cf0f803f5da18ec6332f2d7698eda6fb05a` |
| `/tmp/pdex12-frontend-focused-final.log` | `8cf82277861c2a8f25995afc085bd785486edaa742cf8bad9e849ef449de64d4` |
| `/tmp/pdex12-frontend-full.log` | `a621be0af63b98da2548437470a1f091fec45f46e79dc81ec3924db0462dc4ac` |
| `/tmp/pdex12-lived-day-isolated.log` | `b2ce28e0d47820927bc04e4dece94285bed8058a0bfdbb28fc430d9270c3e233` |
| `/tmp/pdex12-browser-compatibility-initial.log` | `20b4f08b88cb14e7d88000baff9f11237711502e2b659e5da28b522509103dce` |


## Independent review repair — 2026-10-11

The review at `f0e4a4d90ec59fd1ca0ac0b38491f55cc25e3e81` found two P2 issues: an invalid original list or an externally changed same-id task left creation permanently locked; new creation catches also said “Task not saved” although a response could have been lost after saving. The original implementation, test failures and f0 native evidence remain historical; this section supersedes their creation recovery outcome only. PDEX-13, Calendar, left navigation, Rust storage and other Task mutation surfaces are unchanged by this repair.

Repair product commit: `ee96dafa8ff9715705d0a24005666aa5791d9c3f`. Current integration through `2093bb58b50f411523d00531c27e88e166d4eac7` is merged unsquashed. The ticket remains **in-progress** pending independent review of this repair, a newly frozen packaged candidate, reviewed normal installation and installed human acceptance. No installation/acceptance completion is inferred from these automated checks.

Creation-only failures now say “Save result unconfirmed. Draft retained; read back to check” plus the actual diagnostic (Chinese and English copies). Failed readback stays unconfirmed. Positive same-target readback still independently distinguishes matching saved task, currently absent original identity, and an existing identity with different values. No global `tasks.notSaved` wording, Calendar or other Task flow was changed.

An explicit **End original submission** control is disabled while pending/unverified and enabled only after successful readback establishes absence or conflict. Ending makes no command call or business-data edit. It retains the full original normalized submitted input/id/revision and raw draft in a transient review entry, clears the active attempt, and lets the next explicit creation allocate a new id and use current valid list defaults. The retained original fields remain readable; an observed existing identity offers **View existing task** through the existing selected details/focus path. There is no new persistent Task store, automatic replay, payload-changing reuse of the old id, or extra approval layer.

Verification uses the same production Chrome/Tauri public boundary fixture; **it is not real Rust persistence, native WebKit or OS IME observation**. Root owns subsequent serialized real synthetic storage and packaged WebKit checks.

- Red → green recovery slice 1 covers both externally archived and removed original lists: old refusal initially reported “Task not saved”; new unknown wording plus guarded end/readback allows a fresh valid Inbox task under a new id. The absent old id is never created/replayed; original input remains reviewable.
- Red → green slice 2 covers a real fixture save followed by lost response and external rename/context edit. Failed recheck retains unknown wording and disables End; a successful recheck proves same-id conflict. The initial red lacked View existing task; green permits explicit end and viewing the unchanged existing task, then one new Task with another id. No update/delete/state command or duplicate is emitted.
- An additional modal probe was green on first execution after the shared repair: guarded End, readable action geometry at 830-wide, full original context retained, focus returned, blank new modal and new id. This probe was not a red-first slice and is not claimed as one.
- `npm run build` — final worker build passed.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs node --test tests/browser/task-quick-create.mjs tests/browser/task-list-details.mjs tests/browser/today-axis-task-gestures.mjs tests/browser/today-axis-plan-gestures.mjs` — **34 passed, 0 failed** (11 creation, 7 selected detail, 8 Task gesture, 8 plan gesture). Current integration's retained date-label assertion repair is included without changing that product flow.
- `node --test tests/frontend/task-surface.test.ts tests/frontend/task-state-history.test.ts tests/frontend/task-history*.test.ts` — **21 passed, 0 failed** after final repair product commit.

Repair logs below are immutable outside Git; `/tmp/pdex12-repair-validation-artifacts.json` repeats this inventory for candidate freezing. The earlier broad frontend failure remains in the original record; PDEX-13's fixture correction is now merged. This worker has not rerun/claimed a full-suite or Rust result for the repair.

| Repair artifact | SHA-256 |
|---|---|
| `/tmp/pdex12-repair-baseline-build.log` | `02597e17085915d315b2cdc1503bd623f85bbea205b4cae594c1a372a6e091f7` |
| `/tmp/pdex12-repair-slice1-red.log` | `a83e4ebf5fce117857b5014c735a8955b1619ca1df68993c7ffa4bba173d05a6` |
| `/tmp/pdex12-repair-slice1-build.log` | `02597e17085915d315b2cdc1503bd623f85bbea205b4cae594c1a372a6e091f7` |
| `/tmp/pdex12-repair-slice1-green.log` | `281f64b4c9c4c7e66394d2cc7e3b8582ab256b5b6ccc62283fe86f6cad361c86` |
| `/tmp/pdex12-repair-slice2-red.log` | `f95df74b0dbed583968ccb63ae4af609433647eef952957852a22db88bb4f460` |
| `/tmp/pdex12-repair-slice2-build.log` | `02597e17085915d315b2cdc1503bd623f85bbea205b4cae594c1a372a6e091f7` |
| `/tmp/pdex12-repair-creation-final.log` | `b22d4dc163497376dd10d6bd76aa3b5c62e01e19c2481c9b11d829dea3dea45f` |
| `/tmp/pdex12-repair-modal-confirmation.log` | `e6bb7b7f8a7443229be482a78a487bc657b3c5cf419e91becc3a124eafd15ef8` |
| `/tmp/pdex12-repair-final-build.log` | `02597e17085915d315b2cdc1503bd623f85bbea205b4cae594c1a372a6e091f7` |
| `/tmp/pdex12-repair-browser-final.log` | `f7b66c79b66af0795a8b29fa29d69595e35f06313e4a9425d696bdeb97755062` |
| `/tmp/pdex12-repair-frontend-focused-final.log` | `b59fefd1d2f90e22469677ca6f9b722e717fe45779a599558e4790d05f4ce09d` |


## Independent Standards P3 language repair — 2026-10-11

Review at `f127cc910bf78e94ce10d849c2f43e548edabc0c` accepted the core P2 recovery behavior and found that ended-submission review cached the translated system Inbox label at submission. This violated `docs/interface-language.md` when the interface changed later. Historical f127 native P2 acceptance remains bound to that prior package; this language-only product increment requires a new package identity before installation.

Product commit: `cec0b0a0c7c7fa6c97bb744fc1e9d6a8d5e5f7be`. f127 was merged before the fix; the current docs-only integration record `75eda22` was merged unsquashed before handoff. One production render line now derives the reserved `inbox` identity's display from the **current** language catalog. The original submitted input/id/revision remain intact, and original user-created list names remain verbatim. No new state/store, mutation boundary, PDEX-13/Calendar/navigation change or installation was made. Ticket remains in-progress pending new candidate/review/normal installation/human acceptance.

The production Chrome browser test creates a failed English Inbox submission and a failed custom Home submission, explicitly rereads and ends both, then switches the real toolbar to Chinese. It verifies the ended system label is `收集箱`, the source-owned custom name is still `Home`, and switching never replays the two submissions.

The first probe incorrectly awaited document language `zh` rather than the app's `zh-CN` and timed out; it is retained as a test-probe error, **not** product evidence. With that guard corrected, the red reproduced the actual cached Inbox defect (no `收集箱`); the one-line production fix then passed. Browser evidence remains Chrome/synthetic public Tauri responses, not native WebKit, OS IME or new real-storage evidence.

- `npm run build` — passed.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs node --test tests/browser/task-quick-create.mjs` — **12 passed, 0 failed**, including both reviewed recovery flows and language switching.
- `node --test tests/frontend/task-surface.test.ts tests/frontend/interface-language.test.ts` — **25 passed, 0 failed**.

| P3 artifact | SHA-256 |
|---|---|
| `/tmp/pdex12-inbox-language-baseline-build.log` | `02597e17085915d315b2cdc1503bd623f85bbea205b4cae594c1a372a6e091f7` |
| `/tmp/pdex12-inbox-language-red.log` | `6233353a4fc6710e71f39ddffa2d9aa3f0692dadafeb072fb471d229aae2997c` |
| `/tmp/pdex12-inbox-language-red-corrected.log` | `135aec4db06cd67c0414e2eb05a6c8c52b41596b92288a759e059d95eee6a22d` |
| `/tmp/pdex12-inbox-language-final-build.log` | `02597e17085915d315b2cdc1503bd623f85bbea205b4cae594c1a372a6e091f7` |
| `/tmp/pdex12-inbox-language-creation-green.log` | `c803be3d0e97abce96bf169d9502a4c5744014eceb4d744b1c0e6fffa3eae53c` |
| `/tmp/pdex12-inbox-language-frontend-green.log` | `7aac60d41057249b8d792bffb0c161fe3831e771d7709284157c3df7b4e1a4ea` |
