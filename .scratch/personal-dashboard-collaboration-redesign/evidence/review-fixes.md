# Final review fixes

Source commit: `8c643aa` on `codex/pdcr-review-fixes`.
Latest integration `921bc0d` merged at `058e622`; that merge contains tracker
and probe evidence only. This record covers the two demonstrated frontend
defects and the two P3 suggestions. It does not close the unresolved native
Dida scope criterion or any remaining native acceptance gate.

## Scoped source reads and observations

The production `refreshCanonicalDateProjections` handler captures the current
selected-Vault generation before its real source calls. It starts no reads
during a Vault switch and discards responses after a generation change or
while a switch is in progress. The check precedes presentation invalidation,
Today/Calendar/Habits rendering, Habit date/snapshot cache mutation, error
presentation and `collaboration_record_refresh` observations.

The production session polling callback also captures and checks the generation
before replacing its session view, rendering history, launching refreshes or
showing a late failure. Per-effect refresh deduplication is scoped to that
generation. After a cancelled picker, the unchanged selected Vault can reread
an effect whose earlier projection response was discarded; this repeats only
source reads, never a canonical mutation.

## Effect-owner provenance

Projection dates are grouped by each Task receipt's executionId, WorkHistory's
executionId, or message result's originating request executionId. Equal dates
from different owners retain separate observations. Task effects keep their
own execution while reading the currently visible Today/Calendar date.
First-seen historical effects are also read when the polling result is terminal.
An old receipt with missing ownership can refresh business state without
borrowing the active runId or inventing a history observation.

## Narrow maintainability changes

`NativeChangeObservationContext` names the captured selected Vault/cwd/date,
runtime item authority/status, automatic-round scope, prior witnesses and
observed time. Item/evidence identities remain explicit parameters. The same
production observation still supplies all values; no scope or authority was
changed.

A single source/destination redirect helper is shared by retained and new
witness paths. Retained observations still gain a qualified scope gap without
new readback; new unsafe witnesses still clear path/diff and remain rejected.
Real synthetic-file tests cover both source redirection and a later redirected
move destination, including immutable original revision/time retention.

## Red/green and verification

- Before source edits, the actual production-handler tests produced five
  failures: historical owners were replaced/collapsed into the active run,
  a late polling result replaced old session state, old success/error source
  responses polluted new Vault projections, and a switch still started reads.
  Log: `/tmp/pdcr-review-frontend-red.log` (10 passed, five failed).
- The cancelled-picker retry regression separately went red before the
  generation-scoped deduplication fix:
  `/tmp/pdcr-review-refresh-retry-red.log`.
- Final targeted public production-handler suite: 18 passed, zero failed;
  `/tmp/pdcr-review-frontend-green.log`.
- Complete frontend suite: 371 passed, zero failed;
  `/tmp/pdcr-review-all-frontend.log`. Build passed:
  `/tmp/pdcr-review-build.log`.
- Rust Collaboration suite, including file-backed application/store witness
  tests: 67 passed, six existing environment/native gates ignored;
  `/tmp/pdcr-review-rust.log`. An initial compile lacked the worktree's generated
  frontendDist; the normal existing-dependency frontend build resolved that
  prerequisite. It is not counted as a behavior regression.
- Both review probes were rerun against this worktree's actual production
  functions. The delayed-Vault probe rendered `[]`; historical-provenance probe
  returned the original `first-execution` owner for 2026-10-08.
  Private adapted probes:
  `/tmp/pdcr-exploration/fixed-spec-{refresh,provenance}-probe.mjs`.
- `git diff --check` passed. No dependencies/services, installs, GitHub calls,
  live Dida mutations, personal data or installed-profile changes were added.

## Native safety policy remains unresolved

No native safety policy was changed. The current broad mutation mask remains.
Read-only generated native schema and the independent actual model/MCP hook
probe show an exact object/date PreToolUse veto can work, but hook crashes,
malformed output and timeout can dispatch writes; bypassing hook trust also
enables other discovered hooks broadly. Parallel claim handling and unknown
create identity remain unproven. A hook by itself therefore does not justify
removing the existing protection or claiming deterministic per-object safety.

The concrete proposal and exact actual evidence are recorded in
[native hook probe](native-hook-probe.md) and
[unknown Dida scope decision](unknown-dida-scope-decision.md). Root owns the
scope/authority decision and tracker status; PDCR-03's relevant criterion stays
unmet. Native PDCR-11 must rebuild the complete candidate after these fixes;
the tests and older actual execution do not replace that acceptance.
