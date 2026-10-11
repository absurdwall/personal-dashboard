# PDEX-06 execution evidence

Synthetic data only; no personal Vault, installation, remote or main changes.
Worktree `/tmp/pdex-06`, branch `codex/pdex-06`, base integration `32b7ff7`
(from requested prototype `8960c80`). Full increments retained.

## TDD and confirmed seams

Q4 confirmed real application/shared Task, adapter/operation contracts and
persistence seams before this task. Used `tdd` SKILL.md, tests.md, mocking.md.

- Frontend public Task operation red: an end-only change reused the old retry
  identity; Node assertion failed. Green `b701562` adds the end to retry identity
  and requires saved end readback before confirming a write.
- Shared Task application red: creating a synthetic `23:30–00:30` overnight
  Task returned `executionEnd: null`. Green `fa7c059` persists explicit end
  dates, retains old-call omitted values and reads the same identity/end from
  a new TaskApplication and TodayApplication.
- First Rust attempts needed generated `dist`; no behavioral result was
  inferred from that setup failure.
- The first red/green Rust run used the canonical target. Concurrency later
  invalidated that shared target as suite evidence; isolated revalidation in
  `/tmp/pdex-06/src-tauri/target` is required and recorded below when complete.
- `npm run build` passed; full frontend suite at core increment: 389 passed.

## Contract

Existing `date`/`time` remain the Task start and calendar placement.
`executionEnd` is optional `{date, time}`. Update omission preserves, null
explicitly clears, object replaces. Invalid or incomplete intervals fail
without truncation, reversal or a write. End is planned allocation, separate
from completion, abandonment, deadline and actual activity.

The shared real Task editor includes end date, end time and an explicit clear
button. Reading/reopening editor values uses canonical Task end fields, with
both dates displayed for overnight intervals. Edited history retains ends.

## Validation and acceptance boundary

- Adapter red rejected `executionEnd` as an unknown Action field. Green
  `48fefa6` supports interval Action creation, interval rescheduling, explicit
  clear, same-identity replay and independently read end values through the
  real offline CLI process. Replays use the current revision as required by
  the existing adapter contract; stale batch guards remain intact.
- Collaboration service red rejected the field in `createTask`. Green extends
  creation/update, current references, proposal/result baselines, dynamic
  schemas and verified readback. Legacy omission preserves the end; explicit
  null clears it. Serialization skips absent fields so old operation
  fingerprints retain their original shape.
- Isolated final scoped Rust suites: 156 passed (Calendar 6, Collaboration
  operations 103, daily-flow integration 1, adapter 12, Task workflow 28,
  Today shared Tasks 6). Target: `/tmp/pdex-06/src-tauri/target`.
- Shared-task interval tests cover old undated/date-only/point modes (no
  invented end), rejection of a time without date, overnight endpoints,
  invalid ranges without writes, whole-interval moves, end-only edits,
  explicit clear, old content/list/state calls, completion/reopen, retained
  history and a new application instance reading the same identity.
- Final frontend suite: 389 passed. `npm run build` passed.
- Broader Task compilation exposed a malformed test helper from mechanically
  adding the legacy omitted field. Fixed in the next retained increment;
  full Task suite then passed. No history was squashed or amended.

Packaged UI input/reopen, cross-page and narrow-window acceptance remain
unverified here; PDEX-11 owns overall acceptance evidence. Implementation
checks do not assert installation, release acceptance or user acceptance.

## Integration checkpoint

- Implementation commit `62746b6` merged integration tip `1f8c907` with full
  history at `3bc83c4`; no merge conflicts.
- On the merged code: frontend build passed, full frontend suite 397 passed,
  and the three directly shared Rust suites passed (Collaboration operations
  103, adapter 12, Today shared Tasks 6; 121 total).
- Additional scoped suites above remain the pre-merge 156-test evidence;
  the merged checks are recorded separately rather than conflated.
- Worktree source clean after evidence commit; ignored `dist`, `node_modules`
  symlink and isolated cloned Cargo target are generated build material.
  No unique personal state lives in this worktree.
