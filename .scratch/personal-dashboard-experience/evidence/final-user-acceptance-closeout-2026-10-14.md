# PDEX-SPEC-02 final user acceptance and closeout audit — 2026-10-14

## User decision and separate Workflow repair

The user reviewed the complete round and said it had no remaining concerns, was
basically accepted, and could move to closeout. This is recorded as whole-round
human acceptance, not only visual approval. It does not convert unrun checks
into test results.

The Collaboration Workflow repair is a separate product change, not a PDEX UI
review finding. Its local branch is
`codex/pdex-collaboration-workflow-repair-20261014`, with commits
`5192cf41887f2da93e45c703e4e95a8a3a5340c1` and
`58f283cac763a0f4f833f1b60bab70fd3dc969ff`. The second commit is the source of
the installed build. It remains outside and is not merged into
`codex/dashboard-experience-refinement-reimplementation`; the integration
branch is still based on `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.

## Installed evidence

- `/Applications/Personal Dashboard.app` was atomically replaced with source
  `58f283cac763a0f4f833f1b60bab70fd3dc969ff`, bundle identifier
  `com.tortillaflat.personal-dashboard`, executable SHA-256
  `422cd4562a46851928de93be197820030b006d01bcabcc2eefbd64564ba293c4`.
  Strict code-signature checks passed before and after the replacement, and
  the previous App bundle was retained.
- The reviewer compared 6,037 profile/Vault files. The Vault had no changed
  files. `collaboration-v1.json` had a byte-level serialization change but its
  parsed JSON was equal. The profile's SQLite WAL/SHM and model-cache files
  changed during normal launch; authentication, appearance, language, and
  pointer settings remained byte-identical.
- The installed App reopened the user's existing Oct. 14 profile and Vault,
  showed five current plan blocks, and retained the latest Collaboration
  history. No Task, Habit, Daily Record, or real Collaboration message was
  written during this review. This confirms installation and preservation; it
  does not establish packaged business save/readback acceptance.
- Independent Standards and Spec review reported zero remaining findings for
  the two Workflow repair commits. The review recorded daily-plan workflow
  checks at 17/17, Collaboration task-operation checks at 107/107, and the new
  regression checks passing. These validate the separate Workflow repair and
  do not replace the PDEX package criteria.

Evidence receipts (outside the repository):

- Install: `/Users/tingranwang/Documents/Codex/Projectless task folder/2026-10-14/new-chat/outputs/pdex-workflow-install-2026-10-14.json` — SHA-256 `ad39cc5600b10ec556f5a3207c2de6a8de4606bc1d5f99ae6e711ae010606c3f`.
- Independent review: `/Users/tingranwang/Documents/Codex/Projectless task folder/2026-10-14/new-chat/outputs/pdex-workflow-retro-review-2026-10-14.json` — SHA-256 `353eac1a0ddd7cf83407777820171fd6383a5359c4811312d4f590fecce1f5cf`.

## Ticket closeout decision

The local Management readback still shows PDEX-19–25 as `claimed` with active
lifecycle (`in-progress`); PDEX-26 is `ready-for-agent`/`open` and unclaimed;
PDEX-SPEC-02 remains `ready-for-agent`/`open`. The user acceptance is recorded,
but these tickets remain open because their contracts require evidence that
was not produced by this installation review.

| Ticket | Exact remaining hard criterion | Current evidence gap |
| --- | --- | --- |
| PDEX-19 | AC 14: real Task business write/readback, new App instance, and actual DOM interaction. | The installed review made no business write. Installation and preservation do not verify Task property, filter, action, and reopen behavior. |
| PDEX-20 | AC 13: real business readback and actual parent/folder/grouping/recovery operations. | No packaged parent-child or folder operation and reopen/readback was performed. |
| PDEX-21 | AC 14: real business write/readback and actual pointer interaction, including the time-axis cases. | The Workflow regression checks are not packaged Task pointer, drag, edge-scroll, cancel, or current-plan/Morning-baseline evidence. |
| PDEX-22 | AC 8: verified official holiday data for the current and next year; AC 3 and 11: shared Task save/readback and reopen. | The recorded source audit says official China 2027 holiday data is unavailable. The final install review did not perform Calendar business writes/readback. |
| PDEX-23 | AC 6, 9, and 12: real dictation-service capture/draft behavior, Chinese IME composition behavior, and app-level DOM/service-boundary evidence. | No hardware recording or IME check was run. Overall user acceptance and the separate Workflow repair are recorded; neither is represented as those checks. |
| PDEX-24 | AC 16: real Habit writes/readback in a new App instance across creation, edits, goal cycles, and source refresh. | No Habit business write or goal-cycle readback was performed in the installed review. |
| PDEX-25 | AC 4 and 15: sourced/provenance history beyond the 12-week projection and full/limited/gap history validation. | The current snapshot schema exposes only a rolling 12-week external-observation window; older sourced/provenance observations are absent. The full historical fixture matrix was not run. |
| PDEX-26 | AC 1–10: each blocking ticket's result plus packaged Tauri IPC/save/readback/restart, cross-surface interactions, actual pointer flows, history, real input, window sizes, comparison, migration and failure/retry behavior. | The install source, executable, signature, restart, current profile preservation, and human acceptance are established. The review did not perform business writes, the synthetic-profile acceptance matrix, the listed failure/retry scenarios, or hardware voice/IME checks. |

Therefore no PDEX ticket or parent lifecycle was changed to resolved. This is
not a rejection of the user's acceptance: it preserves the explicit distinction
between that decision and the unrun technical criteria. No new full validation
cycle is authorized by this closeout record.

## Retained implementation history

The PDEX integration and per-ticket branches/commit identities remain in
[`refinement-reimplementation-2026-10-13.md`](../refinement-reimplementation-2026-10-13.md).
The current primary checkout remains on
`codex/dashboard-experience-refinement-reimplementation`, based on `918e7e0`.
The separate Workflow branch and installation were not merged into it. No
remote operation, main merge, PR, or app replacement was performed by this
closeout pass.
