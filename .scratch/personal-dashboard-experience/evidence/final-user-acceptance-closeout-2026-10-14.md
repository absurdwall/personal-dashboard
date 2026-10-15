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
- The final `58f283c` installation/preservation pass reopened the user's
  existing Oct. 14 profile and Vault, showed five current plan blocks, and
  retained the latest Collaboration history. That final pass made no new Task,
  Habit, Daily Record, or Collaboration-message write. This describes that
  pass only; it does not erase the earlier packaged candidate evidence below.
- Independent Standards and Spec review reported zero remaining findings for
  the two Workflow repair commits. The review recorded daily-plan workflow
  checks at 17/17, Collaboration task-operation checks at 107/107, and the new
  regression checks passing. These validate the separate Workflow repair and
  do not replace the full PDEX package criteria.

## Earlier retained packaged candidate evidence

Two independent review reports record concrete packaged operations on the
preserved implementation line ancestral to `58f283c`. The frontend diff from
`886ceea` through `58f283c` is empty, so these source-bound results remain
relevant to the installed frontend while retaining their exact candidate
source identities.

- The review path `cb08a9f72ba5ec99c62f5c6e1325662af656dd5b` →
  `a5f8b044bb1be0151b19e25b1077074a06620223` records packaged Task Save with schema-4
  readback, Save followed by Cancel, More-open followed by Cancel, persisted
  Task content after quit/relaunch, and a `16:15–17:00` arrangement consistent
  between Morning and Daytime.
- The display follow-up source `30aa5b92fc6d6d344147c6ab83fd94283e4565da`
  (review base `a5f8b044bb1be0151b19e25b1077074a06620223`) records native sub-tree
  collapse/expand, tag interaction, Morning ordering, fact-popup phase
  switching, and Calendar-cell Cancel/layout behavior.
- The current Workflow/retro history also contains three real-account
  Collaboration rounds. That is positive Collaboration-service evidence. The
  final installation/preservation pass sent no additional message; it must not
  be used to claim that no real-account interaction occurred during the round.

These observations support the exact flows listed above for PDEX-19/20/21/22
and PDEX-26. They do not prove every ticket combination or a complete matrix
on one frozen current source. The residuals below are limited to those
uncovered combinations and independently recorded hard constraints.

Evidence receipts (outside the repository):

- Install: `/Users/tingranwang/Documents/Codex/Projectless task folder/2026-10-14/new-chat/outputs/pdex-workflow-install-2026-10-14.json` — SHA-256 `ad39cc5600b10ec556f5a3207c2de6a8de4606bc1d5f99ae6e711ae010606c3f`.
- Task/plan independent review: `/Users/tingranwang/Documents/Codex/Projectless task folder/2026-10-14/new-chat/outputs/personal-dashboard-independent-review-2026-10-14.json` — SHA-256 `4bb4f657abc09f6e43285be23d484d9e4270c93d36a853c86ab0a5af9b0a7289`.
- Display follow-up review: `/Users/tingranwang/Documents/Codex/Projectless task folder/2026-10-14/new-chat/outputs/pdex-display-followup-independent-review-2026-10-14.json` — SHA-256 `ef427001bb602979093aa516e345f521c9439553b56bc5a218a520b729c097b5`.
- Workflow/retro review: `/Users/tingranwang/Documents/Codex/Projectless task folder/2026-10-14/new-chat/outputs/pdex-workflow-retro-review-2026-10-14.json`. Its stable source snapshot SHA-256 is `889c20c5b9464aaa7fb4f300b7c3144676801114a70dd2e5995ef505745151c6`, with 94 references validated. The mutable receipt's whole-file hash is not pinned because review metadata was appended after the source snapshot was frozen; no private raw conversation is copied here.

## Ticket closeout decision

The local Management readback still shows PDEX-19–25 as `claimed` with active
lifecycle (`in-progress`); PDEX-26 is `ready-for-agent`/`open` and unclaimed;
PDEX-SPEC-02 remains `ready-for-agent`/`open`. The user acceptance is recorded,
but these tickets remain open because their contracts require evidence that
was not produced by this installation review.

| Ticket | Exact remaining hard criterion | Current evidence gap |
| --- | --- | --- |
| PDEX-19 | AC 14 and the remaining property/action/filter combinations. | The `a5f8b04` packaged review confirms Task Save/schema-4 readback, Save→Cancel, More-open→Cancel, and content persistence after quit/relaunch. The `30aa5b9` follow-up also confirms tag interaction. These are positive cases; the complete Task matrix on one frozen current source is not established. |
| PDEX-20 | AC 13 and the remaining parent/folder CRUD, persistence, and recovery combinations. | The `30aa5b9` native follow-up confirms sub-tree collapse/expand. It does not establish every parent link/unlink, folder move/delete/restore, and reopen combination. |
| PDEX-21 | AC 14 and the remaining time-axis pointer, drag, edge-scroll, and cancel combinations. | The `a5f8b04` review confirms a persisted `16:15–17:00` Morning/Daytime arrangement; the `30aa5b9` follow-up confirms Morning ordering and fact-popup phase switching. The full pointer matrix is not established. |
| PDEX-22 | AC 8: verified official holiday data for the current and next year; remaining shared-Task creation/save/readback combinations. | The `30aa5b9` review confirms Calendar-cell Cancel/layout behavior. The source audit still lacks official China 2027 holiday data, and the complete Calendar create/save/readback matrix is not established. |
| PDEX-23 | AC 6/9 hardware dictation and IME behavior; remaining context/input combinations. | Three real-account Collaboration rounds are present in the review history, so real-account service evidence exists. Hardware dictation capture and Chinese IME composition were not tested. |
| PDEX-24 | AC 16's full Habit creation/edit/goal-cycle/source-refresh readback matrix. | The final `58f283c` install pass made no new Habit write. Earlier PDEX-24 source and synthetic checks remain supporting evidence, but the full packaged current-source matrix is not established. |
| PDEX-25 | AC 4 and 15: sourced/provenance history beyond the 12-week projection and full/limited/gap history validation. | The current snapshot schema exposes only a rolling 12-week external-observation window; older sourced/provenance observations are absent. The full historical fixture matrix was not run. |
| PDEX-26 | AC 1–10's complete frozen-source integration matrix: packaged Tauri IPC, cross-surface operations, all pointer flows, history, input, window sizes, comparison, migration, and failure/retry. | Concrete packaged Task, plan, sub-tree, tag, Morning-ordering, fact-popup, and Calendar Cancel/layout cases are evidenced above. The full cross-ticket/current-source matrix and the listed migration/failure/retry combinations remain incomplete; hardware voice/IME and the China 2027 source remain open constraints. |

Therefore no PDEX ticket or parent lifecycle was changed to resolved. This is
not a rejection of the user's acceptance: it preserves both the accepted round
and the concrete passed cases while keeping untested combinations and hard
data/input limits visible. No new full validation cycle is authorized by this
closeout record.

## Retained implementation history

The PDEX integration and per-ticket branches/commit identities remain in
[`refinement-reimplementation-2026-10-13.md`](../refinement-reimplementation-2026-10-13.md).
The current primary checkout remains on
`codex/dashboard-experience-refinement-reimplementation`, based on `918e7e0`.
The separate Workflow branch and installation were not merged into it. No
remote operation, main merge, PR, or app replacement was performed by this
closeout pass.
