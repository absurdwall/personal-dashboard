# 4.0.8 rejected; exact 4.0.7 restored — 2026-10-13

The user rejected the refinement release and requested App rollback first, then
actual acceptance against the confirmed prototype. The normal installation is
now the exact App saved before the 4.0.8 replacement. Current personal data was
preserved; no before-install profile or Vault backup was restored over it.

- Installation: `/Applications/Personal Dashboard.app`, version **4.0.7**.
- Binary SHA-256: `4865fc2c4aad16ee82dd30a23a5bc82720b0f8250264e564c7403d996eb33682`.
- Strict/deep signature verification passed; Computer Use observed a fresh
  normal launch with the original selected Vault and Today data.
- Current Task schema was still 2, compatible with this App. All 121 protected
  canonical Daily Record / Dashboard business files remained byte-identical
  across rollback and read-only relaunch. Current profile/business snapshots and
  the rejected 4.0.8 App are preserved privately in
  `/Users/tingranwang/.codex/app-archives.noindex/personal-dashboard/2026-10-13-rollback-ow0gpuky`.
- Product source, commits, branches and prototype history were preserved. No
  source reset, personal-data rollback, main merge or remote push occurred.

## Evidence identity and boundary

Approved prototype: `codex/dashboard-experience-refinement` at
`e6bdb514c6733a98949012e1d42a9cda3b0e3eec`, extracted through Git archive.
Requirements: PDEX-SPEC-02 plus `prototype-review-and-scope-2026-10-11.md`.
Today A, Tasks B, retained Habits/Calendar hosts; Collaboration context overlay
is the specification's implementation choice, not a claim of a separate user
C selection. Prototype shell/colors and its two-row quick-add are not approved
production changes.

Candidate rebuilt from `b566629be63ff4910982a24d023afa757855e142` (product merge
`4ec21fc4457841e87ebd4ab986db17c3f02b6588`), with only private bundle identity,
window title and 1280×800 window configuration overridden. Genuine packaged
Tauri UI, native WebKit, an isolated synthetic profile/Vault, controlled
2026-09-08 17:05 -0400 clock. No user authentication or personal-record copy.
This audit did not install that candidate over the restored App.

Private source/build/fixture manifests and screenshots are under
`/Users/tingranwang/.codex/tmp/prototype-acceptance-vgt8ymtq.noindex`.
[Machine rollback/capture receipt](refinement-rollback-audit-2026-10-13.json)
records installed binary identity, protected-file checks and screenshot hashes.
Native screenshots are 2560×1600 Retina pixels for a 1280×800 point window.
Prototype screenshots use a 1280×800 browser viewport. Scenario/data differences
are explicit: the prototype uses its October 10 samples, the candidate uses the
retained September 8 synthetic fixture; these are local hierarchy/interaction
comparisons, not a pixel-perfect whole-App baseline comparison.

## Spec findings confirmed in the actual candidate

1. **[P2] Compact Task properties outweigh title and Content.** Native Tasks and
   Today/Calendar Task dialogs show larger property text than the title/content;
   long tag values occupy an entire row. The new property summary inherits the
   body font while title/content retain the existing smaller form font
   (`frontend/styles.css:10467`, existing input rules around 7111). Tasks B
   prioritizes title/content and compact property values. A plain Task fits its
   actions at the bottom of 1280×800; a Task with long tags puts them below the
   initial viewport. This is a defect in the new local controls, not authority
   to change the global shell or font.
2. **[P2] Recovery is a permanent primary action in ordinary editing.** Without
   a conflict or failure, “重新读取并保留草稿” is still a large primary button
   before Save. It competes with the main save action in Tasks and both floating
   editors. `frontend/main.ts:9815` appends it before checking recovery state.
   Recovery capability must remain; the normal-state presentation does not
   match the chosen B hierarchy.
3. **[P2] Today long titles are hard-clipped without an ellipsis.** A synthetic
   Task title of 49 Chinese characters was added to this isolated fixture,
   reread by the real App, and visibly cut at the card's right edge at 15:00.
   Clicking it opens its retained full title/content in the real Task dialog;
   the card presentation itself fails §6's long-text ellipsis requirement.
   The grid's first `max-content` column (`frontend/styles.css:6518`), with
   both title/time in that column, prevents the later ellipsis rule from
   constraining text to the card. Independent WebKit geometry reproduced a
   200px card with a 293.59px title and zero title overflow; outer overflow then
   clips it. Fixture preparation was an external synthetic-data edit, not a
   claim of UI save/persistence verification.

Actual native evidence:

![Tasks, long tag values and oversized compact properties](/Users/tingranwang/.codex/tmp/prototype-acceptance-vgt8ymtq.noindex/native-tasks-1280x800.png)

![Confirmed Tasks B prototype](/Users/tingranwang/.codex/tmp/prototype-acceptance-vgt8ymtq.noindex/prototype-tasks-1280x800.png)

![Ordinary Task, permanent recovery action before Save](/Users/tingranwang/.codex/tmp/prototype-acceptance-vgt8ymtq.noindex/native-tasks-simple-1280x800.png)

![Today long title is clipped at the card edge](/Users/tingranwang/.codex/tmp/prototype-acceptance-vgt8ymtq.noindex/native-today-long-title-1280x800.png)

## Other actual observations; no pass inferred

- **Today:** default compact scale showed 06:00–24:00 at 1280×800; clicking a
  Task opened an overlay, Escape returned to the timeline. Broad Gamma retained
  “下午”. Card clipping above prevents acceptance. Other required sizes,
  combined pointer operations and saved/relaunch results were not completed
  by this rejection audit.
- **Calendar:** month grid, right date review and lower Task region remained
  present. A lower Task opened an editable overlay. AX activation of an
  offscreen lower row scrolled it into view before opening; this is recorded as
  a driver action, not evidence of a production background-scroll defect.
  New selected-date creation and all cross-page saves remain full-acceptance
  obligations; no unrelated month re-layout was confirmed.
- **Habits:** default summary/today anchors/list remained; selecting a left
  Habit displayed details on the right while keeping the summary. Default rows
  now have permanent Edit buttons, an unrequested density-change candidate
  needing same-fixture/same-window 4.0.7 comparison before hard classification.
- **Collaboration:** creating an empty synthetic session and opening long
  context showed a bounded overlay above the composer, with Collapse visible.
  It did not prove long-conversation/long-draft/real-voice combined acceptance.
  The fresh profile is unauthenticated; no message or microphone action was
  attempted.

## Standards / verification finding

**[P2] Required same-window/same-scenario actual baseline comparisons were
missing from the earlier release evidence.** Source review and targeted tests
did not establish that the approved visual hierarchy was delivered or that
retained areas were preserved. Existing PDEX-26 checklists already remained
unchecked; installing a source-reviewed candidate was not a full product pass.
The accepting workflow should have made that distinction central to delivery.

This audit is sufficient to reject the candidate, not to close the complete
PDEX-26 native matrix. Acceptance remains **failed / changes requested**;
PDEX-SPEC-02 remains open. Three Spec findings and one Standards evidence gap.
The implementation chat was notified to hold further changes, installs, pushes
and closure. No further repair is authorized by this record.

The installed Management helper 1.0.3 confirmed the existing workspace/project
binding and refreshed/read the existing experience source as current. Native
ticket header above is authoritative; the generic Management projection reports
its custom status as unknown. Reconciliation inspection retains the existing
Project-summary gap, unrelated Collaboration malformed source and unavailable
GitHub source. No summary, focus, lifecycle or unrelated source was rewritten.

The temporary native candidate was quit, prototype tab/viewport cleaned up, and
all temporary/archive Dashboard copies unregistered. Launch Services has exactly
one registered Dashboard installation: the normal 4.0.7 App. The normal Today
window with the original selected Vault was raised again after the audit.
