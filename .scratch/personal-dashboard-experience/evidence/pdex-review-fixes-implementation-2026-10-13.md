# Confirmed review P2 repairs — implementation evidence

Branch: `codex/dashboard-experience-refinement-review-fixes`.
Isolated worktree: `/private/tmp/pdex-review-fixes.noindex`.
Initial verified base: `16f5e2d256fddc1a773486051ae255035d0b9edd`.
Only the three authorized P2 repairs are in scope. Local Git/full history;
no remote/main/install/dependencies/native acceptance or broad suite repetition.
Root owns claim/ticket state and subsequent review-agent handoff.

## Calendar creation parent relationship

The actual production WebKit creation form selected `preview-0`, but the
`create_task` request omitted `parentId` (behavioral red: undefined versus the
selected identity). `createCalendarTask` now includes `draft.parentId` in its
frozen creation input. Existing creation result confirmation and original-ID
retry machinery therefore compare the relationship as well as other properties.

Three focused production WebKit scenarios pass: chosen parent is submitted and
read back; uncertain creation retains it across explicit reread/exact retry;
same-ID readback with a different parent keeps the dialog and disables retry,
without issuing a duplicate create. A real Task application/Calendar case creates
and reopens the child with the correct parent and its own selected date, retains
exact retry identity and rejects different-parent reuse atomically.

Commands:

```sh
node --test --test-concurrency=1 --test-name-pattern='Calendar create saves|uncertain Calendar creation|Calendar creation readback refuses' tests/frontend/compact-calendar.test.ts
npm run build
CARGO_TARGET_DIR=/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/src-tauri/target cargo test --manifest-path src-tauri/Cargo.toml --test today_shared_tasks_workflow calendar_context_creation_preserves_parent_and_refuses_conflicting_identity_retry -- --exact
```

Result: WebKit3/3; real application1/1; build passes. The initial Cargo invocation
failed because this fresh worktree had no generated dist; normal existing build
fixed the setup before the application test ran. A first new test caption asserted
English in a Chinese fixture; it was corrected to check the visible conflict and
public frozen/retry controls before claiming these results.

Logs: `/private/tmp/pdex-review-calendar-parent-red.log`,
`/private/tmp/pdex-review-calendar-parent-green.log`,
`/private/tmp/pdex-review-calendar-app.log`.

Locale and explicit safe draft recovery repairs continue. These focused checks
are regression evidence, not full PDEX-26/native acceptance.

## Shared refinement locale repair

All Habit settings/detail fixed copy and Task tag/folder/priority/parent fixed labels now use the shared interface catalog. Standalone captions own localization metadata; fields and user/source values remain separate. Language changes capture Task drafts before translating, restore management text, and retain raw status/error descriptors. Known new backend diagnostics are translated as exact grammar, while the original diagnostic is retained in `data-i18n-error`/application-message metadata.

Red: the English Habit editor with 80 Chinese characters showed the Chinese Rust name-limit diagnostic. The production Task DOM loop also failed on the localized enclosing caption destroying its priority select, and (before management preservation) losing new-tag text. The bounded red replay temporarily restored precisely those old caption/preservation paths, then restored the implementation. Invalid early harness `setError` reference and Swift SDK/compiler mismatch are fixture/environment failures, not product evidence; the corrected production DOM checks use the existing bundled Chromium, with no installation/native app interaction.

Green commands:

- `npm run build` (TypeScript build passed).
- `PLAYWRIGHT_MODULE_PATH=<existing bundled module> node --test tests/browser/habit-settings.mjs tests/browser/habit-details.mjs`: 6 passed, 0 failed. Both dialog widths, lifecycle/detail behavior, open-dialog/detail language switching, raw user text and byte-limit error retention.
- `PLAYWRIGHT_MODULE_PATH=<existing bundled module> node scripts/acceptance/refinement-review-locale-dom.mjs`: 2/2 production DOM scenarios (1280×560, 680×560); three language switches retain content, priority, tag, parent, management text, and localized status with raw diagnostic.
- `CARGO_TARGET_DIR=<existing canonical target> cargo test --manifest-path src-tauri/Cargo.toml --test habit_catalog_workflow eighty_chinese_name_characters_exceed_byte_limit_without_writing_catalog -- --exact`: 1 passed; fresh application confirms no catalog revision/write after the 240-byte name is rejected.

Local logs: `/private/tmp/pdex-review-locale-red.log`, `/private/tmp/pdex-review-locale-task-red.log`, `/private/tmp/pdex-review-locale-browser-green.log`, `/private/tmp/pdex-review-locale-task-green.log`, `/private/tmp/pdex-review-locale-app.log`. No full suite or native acceptance was run. Task explicit re-read/three-way recovery remains the next repair, not covered by this locale commit.

## Explicit Task draft recovery and review follow-ups

The shared Task editor captures the opening persisted Task fields independently from the retained draft. Explicit Task Refresh or the editor's “Read again and keep draft” compares opening, local, and observed saved fields. Untouched remote scalar fields are merged; conflicting fields retain the draft and block Save. Parent/list/tag changes require explicit acknowledgement. The comparison exposes raw current and draft values and an action which adopts **only** the observed conflicting fields, preserving other edits. Scheduling is an atomic date/time/end group. A missing/deleted Task or changed Vault refuses recovery and retains the old binding's draft.

Successful recovery advances the baseline and expected revision only to the exact observed read. CAS still rejects another write after that read. No normal rerender, unrelated save, or general “latest revision” silently overrides the draft guard. The base survives Today's separate stash, completion reconciliation, and confirmed own catalog writes. Tag comparisons, update signatures/input, and saved confirmation use stable sorted set order; omitted legacy optional fields preserve values, while null/empty/none remain explicit clears. Saved-but-unread requests retain the original operation identity through exact retry.

A bounded adjacent bug was required to reach the authorized recovery path: Task Save could leave Refresh disabled while a Today read was active; Today's completion now releases the same button. The early production DOM loop exposed this directly. After adding the real synthetic Today view and proper independent Task snapshots/history kinds to the boundary fixture, the old refresh behavior was replayed and failed specifically at “A draft can save after B save and explicit Refresh”; the new comparison path passed. Early malformed boundary fixtures (missing Task change kind, shared mutable snapshot aliases, unsupported Today read) are not persistence evidence.

Review follow-ups repaired in this increment:

- Habit selection progress renders `1 / 3`, with a real left-side controller text assertion. The formatter's single corrupted nested interpolation was removed; other settings/detail template strings were inspected and retained. Multiline code remains readable.
- Native Node draft tests now transform the real settings and interface-language sources into an isolated temporary module fixture, following the existing repository fixture convention; production `.js` imports and project TypeScript configuration are unchanged. Before this repair the two original tests failed `ERR_MODULE_NOT_FOUND`; afterward both execute and pass.
- Habit snapshot daily completion status, pending goal, partial-cycle copy, and detail coverage enum labels use the shared catalog/metadata; source and user values remain raw.

Final focused checks (no full suite/native acceptance):

| Check | Result |
| --- | --- |
| `npm run build` | passed |
| `PLAYWRIGHT_MODULE_PATH=<existing bundled module> node scripts/acceptance/refinement-review-task-recovery-dom.mjs` | 12 scenarios × 2 widths (1280×560, 680×560), all passed |
| `PLAYWRIGHT_MODULE_PATH=<existing bundled module> node scripts/acceptance/refinement-review-locale-dom.mjs` | 2/2 passed |
| `PLAYWRIGHT_MODULE_PATH=<existing bundled module> node --test tests/browser/habit-settings.mjs tests/browser/habit-details.mjs` | 6 passed, 0 failed |
| `node --test --test-name-pattern='create draft defaults\|edit draft loads\|task update confirms set-like\|update request seam\|fixed error details\|Habits translates generated\|local habit completion labels' tests/frontend/habit-settings.test.ts tests/frontend/task-presentation.test.ts tests/frontend/interface-language.test.ts` | 8 passed, 0 failed |
| `CARGO_TARGET_DIR=<existing canonical target> cargo test --manifest-path src-tauri/Cargo.toml --test task_workflow task_identity_survives_edit_and_reschedule_is_explicit_and_idempotent -- --exact` | real application: 1 passed; edit/history/exact retry/fresh read |
| same command, filter `task_target_binding_conflict_and_corruption_never_overwrite_another_vault_or_file` | real application: 1 passed; stale revision/wrong Vault/corruption do not overwrite |
| same command, filter `manual_update_retry_rechecks_selected_vault_after_loading_its_receipt` | real application: 1 passed; receipt replay still rechecks Vault |
| `git diff --check` | passed |

The production DOM boundary supplies synthetic IPC results and proves the actual editor/Refresh/controller request chain, not filesystem persistence. The three Rust checks exercise actual application stores and preserve history/retry/CAS boundaries, separately from the DOM. The earlier locale byte-limit application test and Calendar parent application/DOM tests remain recorded above. No packaged/native acceptance is claimed. The original full-frontend baseline (540 total, 510 passed, 28 failed, 2 skipped) was not repeated or rewritten.

Recovery scenarios: A draft/B save/Refresh/A save; nonconflicting remote merge; divergent same-field current-only resolution; external parent/tag acknowledgement; atomic schedule conflict; saved-but-unread stable-ID retry with one history item and opposite catalog/persisted tag orders; CAS change after read; external deletion; Vault change; explicit clears; legacy omitted fields; opening base retained across own tag-definition write.

Local logs: `/private/tmp/pdex-review-recovery-red.log`, `/private/tmp/pdex-review-recovery-green.log`, `/private/tmp/pdex-review-recovery-tags-red.log`, `/private/tmp/pdex-review-recovery-tags-green.log`, `/private/tmp/pdex-review-recovery-app-receipt.log`, `/private/tmp/pdex-review-recovery-app-cas.log`, `/private/tmp/pdex-review-recovery-app-vault-receipt.log`, `/private/tmp/pdex-review-locale-node-red.log`, `/private/tmp/pdex-review-locale-node-green.log`, `/private/tmp/pdex-review-locale-final-browser.log`, `/private/tmp/pdex-review-locale-final-dom.log`, `/private/tmp/pdex-review-final-frontend-focused.log`.

## Local history handoff

Worker: `/private/tmp/pdex-review-fixes.noindex`, branch `codex/dashboard-experience-refinement-review-fixes`, based on `16f5e2d256fddc1a773486051ae255035d0b9edd`.

- `e77b79e8da9066713814ca5855cb88c698fbf3f7`: Calendar parent relationship / uncertain exact retry.
- `a37e41308b2f923cce7dc8080c5c99a8a45a85d1`: shared refinement locale and draft/status preservation.
- `5d98e035d608a2f3ae9f48c0e498de83c89cae9e`: explicit Task three-way recovery, stable tag request order, and review-reported locale/count/Node test follow-ups.
- `7ce8918c66b621301b297d61bdc7d933d36dce65`: ordinary merge of integration claim `858ca37e5feab3a8364a4a309b8d4c691474aa9a`; no squash/rebase/amend. Only root-owned tracking records arrived in this merge.

After the merge, `npm run build` passed again (`/private/tmp/pdex-review-post-merge-build.log`), the integration claim is an ancestor, and the worker was clean before this handoff note. All work stayed in local Git. No native acceptance, full frontend/Rust suite, remote operation, installation, dependency addition, or unrelated worktree cleanup was performed. Parent owns final ticket state and its single bounded integration readback; packaged acceptance remains with the separate accepting agent.

## Independent review return: two bounded follow-ups

Recreated worker retained `1466b18d043349b412ea5026de83def52d7f47d0`. Before edits, ordinary merge `1ab5f5d26e52d260cc34fef1647588ad4bbf7491` incorporated the renewed integration claim `9494f1ac54f366c7196b1c0c2f961a24af13fa04`; hooks and the existing dependency symlink were restored. No dependencies were installed.

### Spec P2: conflict fields edited after comparison

Exact production DOM red: opening Name/Content, local Content edit, external Name/Content changes, then explicit reread initially shows only Content as conflicting. Editing Name before “Use current values only for conflicting fields” previously cleared recovery using the old conflict set; the new Name draft could overwrite the external Name. The new regression failed at “A newly edited Name conflict is redisplayed and requires another explicit confirmation” at both widths.

The adoption handler now recomputes conflicts, retains previously displayed/association-validation conflicts, and redisplays the enlarged comparison when an additional conflicting field is found. It preserves the draft, opening base, exact observed revision and operation identities, and requires another explicit adoption. The regression additionally edits Priority before the next attempt, verifies another comparison/confirmation is required, and finally confirms only the displayed current Name/Content/Priority while retaining the nonconflicting local tag. No write occurs during comparison; Save submits the exact observed `r2` CAS guard.

Source commit: `e8ec4bfebe9b38e551036a3ea51034976a32a56b`.

Command: `TASK_RECOVERY_FOLLOWUP_ONLY=1 PLAYWRIGHT_MODULE_PATH=<existing bundled module> node scripts/acceptance/refinement-review-task-recovery-dom.mjs`.

Result: red 2/2; green 2/2 (1280×560 and 680×560). The focused switch runs only this follow-up scenario; the earlier matrix was not repeated. Logs: `/private/tmp/pdex-review-followup-conflict-red.log`, `/private/tmp/pdex-review-followup-conflict-green.log`.

### Standards P3: unavailable Habit coverage

The backend coverage enum includes `unavailable`. Its Chinese detail text previously displayed `覆盖：unavailable`; the targeted browser test failed against `覆盖：不可用`. Added paired shared catalog copy and the missing mapping. The actual Habit detail controller test switches zh→en→zh and checks `覆盖：不可用` / `Coverage: unavailable`, retaining the raw Habit name and source producer label.

Source commit: `bf2a0dbe886f2de6f4cc692dbaf7cdabd9e585d7`.

Command: `PLAYWRIGHT_MODULE_PATH=<existing bundled module> node --test --test-name-pattern='unavailable Habit coverage' tests/browser/habit-details.mjs`.

Result: red 1 failed; green 1 passed, 0 failed. Logs: `/private/tmp/pdex-review-followup-coverage-red.log`, `/private/tmp/pdex-review-followup-coverage-green.log`.

`npm run build` passed before the red checks and after the implementation (`/private/tmp/pdex-review-followup-red-build.log`, `/private/tmp/pdex-review-followup-green-build.log`); `git diff --check` passed. A final integration merge check reported “Already up to date”; `9494f1a` remains an ancestor. This return did not rerun earlier full/focused matrices, Rust tests, native/packaged acceptance, or external/remote operations. Boundary tests prove the production DOM/controller behavior with synthetic IPC and retain the earlier separate real-application evidence unchanged. Root owns final tracker state and independent handoff.
