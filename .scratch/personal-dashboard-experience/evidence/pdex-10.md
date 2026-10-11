# PDEX-10 — Evening review entry

Date: 2026-10-10
Implementation branch: `codex/pdex-10`, worktree `/tmp/pdex-10`.
Verified starting integration: `80f9ea8` (includes the retained local claim record).
Production change: `a99bbd9`. Latest integration `6bd91ad` merged without conflicts in `8a5770c`.

## Delivered behavior

- Evening exposes “开始复盘今天” / “Review today” for the selected lived day and a dated review label for historical selection.
- Entry captures the date at click time and opens Collaboration on that target date. A new editable `/retro` request contains `dashboard://record/<date>?phase=evening`, referring to the authoritative Daily Record in the selected Vault. It contains guidance to distinguish arrangements, facts, Tasks and Habit evidence, not copied record content.
- `CollaborationApplication::prepare_evening_review` atomically reuses an idle session with the same selected-Vault identity and target date. Waiting/completed/stopped sessions are eligible; active/queued/recovery states are not retargeted. A matching nonempty draft is kept byte-for-byte, with other dated drafts retained. Otherwise the request is saved using the existing session/draft persistence format.
- Current unsaved composer edits pass through the existing protected draft cache and serialized save queue before entry. Save failure preserves the visible text and target, shows the real error, and prevents preparation/navigation; retry flushes the retained draft before opening.
- The existing composer remains editable. A session/date-scoped notice explains either “edit and send when ready” or “existing draft retained; add the review request and send.” The notice is hidden after the draft is submitted/cleared or the target/session changes.
- A pending-click guard and atomic native session selection make repeated/concurrent preparation idempotent. Entry invokes no runtime turn, creates no message, saves no Evening record, creates no fact/Task, and never marks a date reviewed. Actual sending and eventual review persistence retain the existing skill/business-operation path; there is no new Retro execution pipeline.

## Confirmed seams and RED → GREEN

Q4 authorizes existing application operations with real persistence and the production DOM input/navigation seam.

1. Native tracer: selected current/past-date entry, repeat, restart and readback. RED: missing `prepare_evening_review` operation. GREEN: real `FileCollaborationStore`, application operations, saved session/draft and restart readback; no runtime request.
2. DOM tracer: shipped Evening button and draft textarea. RED: missing production entry controller. GREEN: actual button events and editable draft behavior in macOS WebKit.
3. The full compiled production `main.ts` and all imported production modules then execute against shipped HTML/CSS in macOS WebKit. Only unrelated application bootstrap is isolated; native IPC is the substituted system boundary. Real event handlers, draft caching/serialization, navigation, context/date controls, composer rendering and debounce are retained. The Evening panel is revealed through its production phase handler and the test verifies the button has visible geometry.
4. The save-failure fixture initially set its fault before application construction, which consumed the one-shot fault during initial state setup. Moving fault injection to the actual entry save makes the intended disk-failure case meaningful; failure leaves no saved session and retry creates exactly one.
5. An existing extracted Today-note renderer fixture needed its new optional entry-controller binding (`null`); its completed-task editing/04:00 rollover tests remain green. These old fixtures are supporting regressions, not entry acceptance evidence.

## Verification

After merging integration `6bd91ad`:

- `npm run build`: passed.
- `npm run test:frontend`: **416 passed, 0 failed, 0 skipped**.
- `node --test tests/frontend/evening-review-entry.test.ts`: **5 passed**, including strengthened visible Evening geometry. Four cases execute the full compiled production application/modules; one targets the actual button/controller interaction and pending-date capture.
- Exclusive, serialized native build/test:
  `CARGO_TARGET_DIR=/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/src-tauri/target CARGO_BUILD_JOBS=2 cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_workflow --test collaboration_task_operations`
  **33 workflow + 105 task-operation tests passed; 0 failed/ignored**.

The six new native cases cover:

- Current/past selected targets, canonical record pointer in the retained draft, repeated preparation and application restart; no messages or runtime request.
- Suitable-session reuse, preserving a saved historical draft, other dated drafts, and the separate current-day session/draft without retargeting it.
- Four concurrent entry requests yielding one session; future lived dates rejected without saved sessions.
- Active same-date work continues in its original session; entry uses a separate idle draft session, repeats reuse it, and no extra runtime request is dispatched.
- Real synthetic Vault readback through `TodayApplication::calendar_month`: reviewed/unreviewed/missing remain distinct and unchanged. Existing Daily Records remain byte-for-byte intact; missing Daily Records and Tasks are not created.
- Real session save failure produces no saved session; retry and repeat produce one saved session.

The production DOM cases cover selected historical date/pointer and navigation, new current-day editable text, existing historical draft continuation, current unsaved draft preservation when entering another date, repeat/double-click/no-send, and native draft-save failure/retry.

Native cache lease was exclusively held for these commands and explicitly released to root after the final integrated tests finished. No `/tmp/pdex-09` cloned cache was used. No owned Cargo/rustc/linker remains; subsequent canonical-cache builds belong to the parent’s serialized verification.

## Acceptance boundary

Implementation and automated seams pass. This is macOS WebKit + production code/HTML/CSS with a synthetic IPC boundary, and native application tests with isolated synthetic Vault/Profile persistence. It is not an installed/packaged Tauri UI acceptance run or a real Codex/OS interaction. PDEX-11 retains packaged and human acceptance; PDEX-10 lifecycle remains open/in-progress until that separate acceptance is recorded. No App installation, user Vault mutation, dependency/remote/main change occurred.
