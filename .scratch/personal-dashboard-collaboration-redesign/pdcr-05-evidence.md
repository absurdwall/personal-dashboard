# PDCR-05 implementation evidence

Date: 2026-10-09. Branch: `codex/pdcr-05`; base integration `d8ee283`.
Implementation: `7994d87`. Only isolated synthetic Vaults and production code
seams were used; no app installation, personal-data trial, connected-source
mutation, GitHub operation, main merge or release occurred.

## Canonical operations and history query

Existing Daily Plan, evening review and short-record operations remain the
writers. They preserve the morning baseline through daytime replanning,
separate factual updates from arrangements, retain original review/short-record
corrections and unrelated user text, and keep requested review proposals from
saving early. This ticket adds no mutation wrapper or store.

The one `dashboard_read_history` capability now exposes `dailyRecords` when the
actual Today/Collaboration adapter is available, beside available `tasks`.
The request shares the existing inclusive valid-date bound of at most 366 dates;
public `CollaborationHistoryRequest::dates()` supplies one validated iteration
for later domains. Automatic registration remains initial-plan-only, with no
history or additional mutation tools.

`read_history` uses the real adapter's read-only `read_date` and returns one
entry per requested date, in order:

- date, source state/availability, evidence availability, message, canonical
  revision and stable target binding;
- original morning baseline, current arrangement/current basis, daytime facts,
  evening review/additions/corrections, short-record identities/change traces
  and the existing time-axis projection;
- existing read-only record date/phase links.

Missing/damaged/unavailable dates retain explicit unknown evidence and null
business fields. They do not drop unrelated valid dates or create records,
baselines or Habit completions. Source paths are checked against the captured
host-selected Vault when available, and Vault identity is checked during and
after the bounded read. Actual timestamps remain unchanged. Short records are
context rather than Habit/Task completion; their appearance in both Daytime and
Evening refers to the same stable objects and is explicitly counted once in
usage guidance.

## Production date/phase navigation

The saved operation-card button now selects morning for initial plans and
morning corrections, daytime for replanning/facts/short records, and evening
for review, on the original saved target date. Existing outcome and Markdown
links already request explicit phases.

A further production race was reproduced: a delayed new-date read selected its
source default phase after an explicit phase was chosen. The existing phase
selection now has a revision; `refreshToday` applies a default only when no
newer phase selection happened during that read. This protects links and user
tab choice through the existing request coordinator. Browsed date and phase do
not retarget an executing Collaboration request.

## Verification

- TDD red/green: bounded Daily Record application query initially rejected the
  unimplemented domain. Production operation-card tests initially opened only
  the date. A real production `refreshToday` plus existing coordinator and
  delayed source response reproduced default evening overwriting requested
  morning. Each now passes after its corresponding implementation slice.
- `cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_task_operations --test collaboration_evening_review`:
  **95 Collaboration tests and 4 evening-review tests passed**. New tests
  verify canonical phase fields with sparse dates and byte-preserving reads,
  direct short-record correction/original trace with a separately damaged
  date, and registered read-only query through Collaboration with no business
  receipt or write. Existing tests verify daytime-event versus replan,
  baseline preservation, review/short-record original/correction history,
  interleaved content and stale revision protection, requested proposal,
  historical target dates, and automatic existing-plan preservation/scope.
- `npm run build`: passed. `npm run test:frontend`: **348 passed**. Production
  renderer buttons select the saved date/phase; the production delayed-read
  test retains the explicit selected phase after canonical read completion.
- `git diff --check`: passed.

All five PDCR-05 criteria are supported at the spec-confirmed real application,
file-backed adapter and production frontend seams. This evidence does not
assert live model language quality, packaged/native acceptance or live Dida
success; those remain PDCR-11/12. Closing this child does not close the parent
specification or authorize installation, personal writes or release.
