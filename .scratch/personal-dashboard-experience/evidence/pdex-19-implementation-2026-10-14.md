# PDEX-19 implementation and verification — 2026-10-14

**Status:** code implementation committed; ticket lifecycle remains `in-progress` pending packaged acceptance under PDEX-26.

## Git lineage

- Clean source history: requested baseline `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- Integration branch: `codex/dashboard-experience-refinement-restart-20261014`.
- Ticket branch: `codex/pdex-19-restart`.
- Ticket worktree: `/tmp/pdex-restart-20261014.noindex/pdex-19`.
- Exact worker start: `8275615a3f3cad2a783d74561472c78c4bbeb493`; this is the integration tip directly above the requested baseline.
- Implementation history, kept unsquashed:
  - `f0a95909d249535d300ed735a17a603fcd0bcb6b` — persist priority and tags on the existing Task identity and verify save/readback.
  - `d04330c518be1d5dc34e5b689cb126a95bbcc40c` — compact Task detail/property controls, list property filtering/sorting, More/context actions, and focused behavior tests.
  - `689b383df3ca235fb0dcdcee3ae4d881b4aa963d` — extend the Today Task test double with the DOM API required by property-aware draft reading.
  - `d7ac03a0807dcba0cea8c1b2ffe23e78d98634b8` — record initial restart implementation evidence.
  - `95b1a164f5009e541885d72b8815349a6a2a39ae` — document the schema-contract review.
  - `f6a47765e91bde430de651b0c8510a8d286ffa3e` — reset priority/tag controls and summaries to saved Task values when Cancel closes the editor; add a regression for reopening and saving a separate edit.
  - `0520e16ee28118f3636ad6c85c7d3377bfdf3570` — document schema-2 priority/tag fields and the schema-1 default-and-upgrade boundary in `docs/tasks-v1.md`.
- No source was copied from or merged with the rejected post-`918e7e0` implementation branch.

## Verification

- `npm run build` — passed.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node --test tests/browser/task-list-details.mjs` — 19/19 passed after the follow-up Cancel regression was added. Covers Content focus and size, one title field, compact property disclosures, priority/tag save/readback, tag lifecycle, stable sort and composed view-only filters, More/right-click action parity, one-row quick add, schedule, Save/Cancel, retry, lifecycle, history and Today Task deep link identity.
- `node --test tests/frontend/task-presentation.test.ts tests/frontend/task-history-render.test.ts tests/frontend/task-history-editing.test.ts` — 32/32 passed.
- `node --test --test-name-pattern='saving a note keeps the open|note refresh keeps an untouched open editor' tests/frontend/lived-day-rendering-regressions.test.ts` — 3/3 passed after adding `querySelectorAll: () => []` to the test-only Today editor form. Before that fixture change, the three full-suite failures raised `TypeError: form.querySelectorAll is not a function`; the real DOM API exists, and Today inline forms contain no tag inputs.
- `cargo test --manifest-path src-tauri/Cargo.toml --test task_workflow task_priority_and_tags_save_read_back_and_keep_task_identity -- --exact` — 1/1 passed; same Task identity returned with persisted priority/tags.
- `git diff --check` — passed. Ticket worktree is clean after the implementation and evidence commits.

## Follow-up review fix — Cancelled Task properties

An independent PDEX-19 Spec review found that the Tasks editor reused its DOM
controls after Cancel: the saved draft was removed, but priority and tag
checkboxes still held their canceled values. A later unrelated Save could then
persist those values. The fix resets both controls and their compact summary
text from the saved Task in the same close path used by Cancel, Escape, and
backdrop close.

The added browser case was run red first with:

`PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node --test --test-name-pattern='Cancel restores saved priority and tags' tests/browser/task-list-details.mjs`

Before the fix it failed because priority remained `high` instead of returning
to `none`. After the fix, that focused test passed; the complete
`tests/browser/task-list-details.mjs` suite passed 19/19, `npm run build` passed,
and `git diff --check` passed. The full frontend suite was not rerun because
this follow-up was scoped to the Task Cancel property controls; the historical
full-suite result and its baseline limitations above are unchanged.

## Full frontend run and failure classification

The final full run before the test-only fixture correction was `npm run test:frontend`: **449 passed, 42 failed out of 491**. Its captured log was `/tmp/pdex19-frontend-final.log`. The three Today editor failures described above are fixed and pass their focused rerun; the full suite was not rerun after that test-only adjustment. Thus this log is evidence for the state before commit `689b383`, not a claim that the current branch has 42 failing behaviors.

**Confirmed clean-baseline failure (1):** the current source CSS at both `918e7e0` and `8275615` uses `gap: 9px`, while this static assertion expects `gap: 7px`. The integration owner independently reproduced this on the clean `918e7e0` checkout. PDEX-19 did not change the row gap.

- `tests/frontend/task-surface.test.ts:31` — “Tasks keeps the accepted prototype hierarchy and defers heavy controls”.

**Test-double compatibility failures fixed after the full run (3):**

- `tests/frontend/lived-day-rendering-regressions.test.ts:422` — “saving a note keeps the open pending Today Task editor and its actual field values”.
- `tests/frontend/lived-day-rendering-regressions.test.ts:422` — “saving a note keeps the open completed Today Task editor and its actual field values”.
- `tests/frontend/lived-day-rendering-regressions.test.ts:430` — “note refresh keeps an untouched open editor without creating a false dirty draft; new Vault binding stays closed”.

The error in each was the test double’s missing `querySelectorAll` method after `readTaskDraft` began reading selected tags. Adding an empty result to the Today-only mock matches the actual UI (Today has no tag property controls); the three tests now pass. No product behavior change was needed.

**Other non-PDEX-19 failures (38):** all are outside this ticket’s implementation scope. The worker did not compare each of these against `918e7e0`; baseline status is intentionally left unclaimed for the integration owner’s comparison. Their exact titles and originating files follow.

### Collaboration (15)

- `tests/frontend/collaboration-command-completion.test.ts:101` — “long help opens on demand while draft, dictation preview and real status surfaces remain exposed”.
- `tests/frontend/collaboration-command-completion.test.ts:139` — “selected slash candidate retains readable foreground on its soft background”.
- `tests/frontend/collaboration-layout.test.ts:238` — “empty Collaboration keeps its composer visible with shared headings at 795×720”.
- `tests/frontend/collaboration-layout.test.ts:254` — “selected long Collaboration keeps a readable scrolling history and reachable composer at 795×720”.
- `tests/frontend/collaboration-layout.test.ts:238` — same empty-composer test at 874×756.
- `tests/frontend/collaboration-layout.test.ts:254` — same selected-long test at 874×756.
- `tests/frontend/collaboration-layout.test.ts:238` — same empty-composer test at 1280×720.
- `tests/frontend/collaboration-layout.test.ts:254` — same selected-long test at 1280×720.
- `tests/frontend/collaboration-layout.test.ts:238` — same empty-composer test at 1280×756.
- `tests/frontend/collaboration-layout.test.ts:254` — same selected-long test at 1280×756.
- `tests/frontend/collaboration-layout.test.ts:281` — “long retained notices keep the conversation and composer usable across Collaboration sizes”.
- `tests/frontend/collaboration-layout.test.ts:335` — “expanded input and saving details do not clip the retained composer controls at 795×720”.
- `tests/frontend/collaboration-layout.test.ts:345` — “single-column Collaboration keeps the composer visible when five-session history is expanded at 640×756”.
- `tests/frontend/collaboration-native-file-refresh.test.ts:111` — “opening Tasks during a Collaboration turn keeps the source watch and request target”.
- `tests/frontend/collaboration-short-record.test.ts:59` — “a delayed canonical read preserves the explicitly selected record phase”.

### Today and lived-day layout (6)

- `tests/frontend/daytime-rail-layout.test.ts:21` — “Daytime keeps the shared time axis in the reading column and notes below tasks in the rail”.
- `tests/frontend/docked-sidebars.test.ts:228` — “Today quick schedule shows its current date and time within the existing row”.
- `tests/frontend/lived-day-rendering-regressions.test.ts:76` — “folded 06:00 and 06:50 point cards share reveal controls and retain source labels/anchors”.
- `tests/frontend/lived-day-rendering-regressions.test.ts:92` — “folded end and clipped short ranges expose collisions without relabeling their times”.
- `tests/frontend/lived-day-rendering-regressions.test.ts:106` — “expanding quiet hours recomputes stacks and exposes next-day entries”.
- `tests/frontend/lived-day-rendering-regressions.test.ts:250` — “shipped WebKit timeline keeps endpoint placement, reading anchors, reveal and detail state”.

### Plan-time editor (11)

All failures came from the Swift/WebKit production-page probe timing out; these tests are outside PDEX-19.

- `tests/frontend/plan-time-editor.test.ts:57` — “clicking an editable Today marker opens the time editor without scrolling to the detail form”.
- `tests/frontend/plan-time-editor.test.ts:73` — “production fuzzy editor retains approximation and renders the saved readback”.
- `tests/frontend/plan-time-editor.test.ts:90` — “production precision choices explicitly convert approximate, exact range and exact point without fabricated durations”.
- `tests/frontend/plan-time-editor.test.ts:112` — “production inherited-heading editor uses the captured source and revision while confirmed facts stay unchanged”.
- `tests/frontend/plan-time-editor.test.ts:126` — “production uncertain-save editor retains values, disables repeated submission and offers reread”.
- `tests/frontend/plan-time-editor.test.ts:137` — “production exact-point conversion sends no former range end and survives a fresh page”.
- `tests/frontend/plan-time-editor.test.ts:152` — “production failed manual save rereads unchanged source and requires explicit retry with retained values and fresh revision”.
- `tests/frontend/plan-time-editor.test.ts:171` — “production failed manual save cannot rebind changed source by matching title or position”.
- `tests/frontend/plan-time-editor.test.ts:187` — “production unchanged untimed plan reread enables explicit timing retry after a failed save”.
- `tests/frontend/plan-time-editor.test.ts:211` — “production point editors hide unused End geometry and retain controls through language refresh”.
- `tests/frontend/plan-time-editor.test.ts:225` — “production saved readback diagnostic follows English-Chinese-English without replay or losing edit values”.

### Startup and shared time-axis layout (6)

- `tests/frontend/startup-interface-language.test.ts:10` — “persisted English startup refreshes existing axis controls and derived times without replacing interaction state”.
- `tests/frontend/today-time-axis.test.ts:206` — “time axis markup uses one full-width lane for arrangement and fact cards”.
- `tests/frontend/unified-today-axis.test.ts:50` — “plans, point Tasks and facts share a scale with separate clickable collision columns and full-width solitary cards”.
- `tests/frontend/unified-today-axis.test.ts:83` — “the Daytime axis scrolls independently and quiet-hour expansion preserves its reading position”.
- `tests/frontend/unified-today-axis.test.ts:101` — “existing quiet-hour entries are initially visible and a deliberate fold advertises their count and next-day date”.
- `tests/frontend/unified-today-axis.test.ts:165` — “after-midnight cards keep their date, title and source readable within their own collision target”.

## Acceptance boundary

PDEX-19 remains `in-progress`: code-level implementation and focused verification are recorded, but no standard App installation, real personal-data use, parent-ticket closure, integration merge or remote operation is claimed. Packaged acceptance remains in PDEX-26.
