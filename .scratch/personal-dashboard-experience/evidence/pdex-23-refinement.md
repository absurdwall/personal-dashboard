# PDEX-23 — local implementation and validation · 2026-10-13

Status: implementation complete; integration review and native acceptance pending.

Spec: [PDEX-SPEC-02](../refinement-spec-2026-10-11.md), sections 8/9, stories 51–60 and shared preservation boundary.
Ticket: [PDEX-23](../issues/23-collaboration-context-input.md).
Working branch: `codex/pdex-23-refinement`.
Integration branch: `codex/dashboard-experience-refinement-integration`.
Authorized starting commit: `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
Actual worker starting tip: `1906b875ccded5a77deeff8fcbecc10454733677` (verified merge base with integration before edits).
Implementation commit: `fef0bdd5f80944028334a30634f03d94906e006b`.

## Scoped behavior

Context is disclosed over the chat area and independently scrolls. Its measured maximum height ends above the composer; its sticky heading contains Collapse. Disclosure does not change the chat width/height, composer geometry or outer page scroll height. Existing Sessions disclosure/resizing and saved preference identities remain. The context resizer is hidden because the panel no longer consumes a column.

Chat height uses the actual available workspace and space occupied by input/notices. Messages scroll independently. The approved textarea sizing and text scale remain, while long transcript previews and open input help have bounded internal scroll routes. A 680×560 short window permits page scrolling to reach the complete action row rather than shrinking the retained input. No shell, navigation, theme, model/effort, execution, persistence, authorization or queue behavior is changed.

The slash controller already had the correct selection arithmetic. Its default command supply remains `/retro`; a supplied documented-command list makes the multi-candidate contract executable in tests. Three test commands verify selection wrapping, selected completion, retained Chinese arguments/caret, composition and ordinary-arrow behavior. Completion does not execute or send. The existing selected-option colors are restored at sufficient selector specificity, where a later transparent button rule previously suppressed the intended highlight.

## Red → green evidence

1. Multi-candidate DOM test first failed: after Up/Down it still returned six `/retro` selections, rather than `/retro`, `/record`, `/retro`, `/review`, `/record`, `/retro`. Adding the supply seam passed without replacing the already-correct selection algorithm.
2. Context/transcript/draft DOM test first failed at 1280×720: context had static position, disclosure narrowed the chat, composer bottom exceeded 1400px and stop/send could not be hit. Anchoring the overlay, fitting chat space and bounding the preview passed the same behavior assertions.
3. Narrow tests exposed the retained middle-mode context top margin crossing into the composer. The overlay-specific margin override removed it. Short-window checks use real outer scrolling to reveal the action row and retain the original large input; this is recorded explicitly rather than claiming every short-window state fits on one screen.

## Validation on the implementation source

- `npm run build`: passed, using the existing canonical `node_modules` through an ignored symlink. No dependency was added or installed.
- `node --test tests/frontend/collaboration-layout.test.ts tests/frontend/collaboration-context-overlay.test.ts`: 16/16 passed. Production HTML, CSS cascade and panel controller execute in macOS WebKit; real DOM geometry, scrolling, focus and hit targets are checked. Fixtures are synthetic and do not call a model or read a personal Vault.
- `PDEX23_LAYOUT_EVIDENCE=.scratch/personal-dashboard-experience/evidence/pdex-23-geometry node --test tests/frontend/collaboration-context-overlay.test.ts`: 5/5 passed; the returned geometry is retained below.
- `node --test tests/frontend/collaboration-command-completion.test.ts tests/frontend/collaboration-panels.test.ts tests/frontend/collaboration-dictation.test.ts tests/frontend/collaboration-voice.test.ts tests/frontend/collaboration-draft-refresh.test.ts tests/frontend/collaboration-conversation-regressions.test.ts tests/frontend/collaboration-queue-control.test.ts tests/frontend/collaboration-work-history.test.ts tests/frontend/collaboration-action-results.test.ts tests/frontend/collaboration-memory.test.ts`: 188/188 passed, including real application controllers with external microphone/WebRTC/native transport boundaries controlled by the tests. Preview/stop/draft/send ownership, cancellation, errors, failed saves, queue ordering, retained history and independent outcomes remain covered.
- An additional run including `collaboration-native-file-refresh.test.ts` yielded 205/206 passing. Its unchanged “opening Tasks during a Collaboration turn” extraction fixture fails because `compactScheduleTransactions` is absent from its VM context. This is a baseline fixture failure, not an accepted substitute for native acceptance; root baseline verification also observed pre-change Collaboration test failures.
- `git diff --check`: passed before implementation commit.

The older layout suite was updated for the specified overlay rather than asserting that context lives below chat. Existing stale fixture expectations were corrected: Collaboration introduction line height remains its prior 1.55 (not Today's 1.5); hidden status elements are excluded from containment checks; compact status overflow behavior is retained; narrow Sessions is explicitly disclosed before checking its buttons; the same input-help details node cannot be both opened and closed. No product style was changed to satisfy those stale expectations.

## Retained DOM geometry

- [1280×720, long draft + long transcript + long context](pdex-23-geometry/1280x720-transcript-long-draft.json)
- [1280×800, short draft + empty preview + long context](pdex-23-geometry/1280x800-empty-short-draft.json)
- [830×758, long draft + long transcript + long context](pdex-23-geometry/830x758-transcript-long-draft.json)
- [680×560, long draft + long transcript + long context](pdex-23-geometry/680x560-transcript-long-draft.json)
- [680×560, short draft + empty preview + long context](pdex-23-geometry/680x560-empty-short-draft.json)

These are production-DOM fixture results, not screenshots or normal-install acceptance. They retain initial/collapsed geometry, expanded overlay geometry, page height, scroll results, input/stop/send/close hit results and preserved draft length.

## Pending acceptance

- Integration code review, full combined checks and source-bound packaged synthetic-profile checks.
- Actual Tauri draft save/readback after restart and context preference reopening on the candidate.
- Real microphone and macOS Chinese IME checks; dispatched composition/keyboard events do not establish these environmental results.
- Baseline comparison of untouched installed-app regions and any required human acceptance.

No normal App installation, main merge, remote operation, ticket closure or spec closure was performed. Full history remains on the ticket and integration branches.
