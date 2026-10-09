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


## Legacy sessions without execution evidence

Native PDCR-11 observed a saved legacy user/reply pair without WorkHistory or
usage. Original messages remained readable, but the production renderer
silently omitted the missing process evidence. This supplement fixes that
renderer gap; it does not replace the native reassessment recorded in
[PDCR-11 evidence](11-native-acceptance.md).

The existing DOM-only WorkHistory helper now accepts an absent history and
renders a localized unavailable paragraph. The production saved-reply path
calls that fallback even without an execution identifier. Completed, failed,
stopped, interrupted and stop-unconfirmed requests without a reply also retain
their original input and show the fallback. Queued, not-started, paused and
in-progress requests without history remain pending rather than being labeled
as missing historical execution.

The Chinese and English copy explicitly qualifies missing process, usage and
change evidence. It preserves original messages and any saved outcome cards;
missing evidence is not reconstructed as zero tokens, process items or a new
execution. No stored messages, receipts or history are changed. No Rust or
native Dida safety policy was changed.

### Supplemental red/green evidence

- The actual production `renderCollaborationMessages` and label function, with
  the real DOM WorkHistory/Markdown helper, first failed three new assertions:
  missing fallback for legacy Chinese/English replies and a terminated request
  without a reply. Existing and pending-request tests passed. Log:
  `/tmp/pdcr-legacy-history-red.log`.
- After the minimum renderer/helper/copy change, that suite passed 11 tests.
  Log: `/tmp/pdcr-legacy-history-green.log`. The harness checks original text,
  preserved Markdown and saved outcome, unchanged serialized session, absence
  of fabricated work items, and fails if rendering invokes a backend request.
- Existing conversation/outcome renderer harnesses now include the real helper
  and actual label function. The three related suites passed 32 tests:
  `/tmp/pdcr-legacy-targeted-green.log`.
- Full frontend suite: 378 passed, zero failed:
  `/tmp/pdcr-legacy-all-frontend.log`. Existing-dependency build passed:
  `/tmp/pdcr-legacy-build.log`. No dependencies were installed. Rust was not
  rerun because this supplement changes only frontend rendering and tests.

The complete-candidate native legacy-session reassessment remains PDCR-11's
acceptance gate. These production renderer tests establish the narrow fix,
not a fresh packaged-app observation or any live Dida/voice result.


## Independent review round 2 implementation

### Habit destination continuation

The real production destination handler now captures the selected Vault
generation and selected Habit cell before refreshing Habits. After that
refresh resolves it starts a selected-date read only if the generation,
selection object and active destination still match and no Vault selection is
in progress. A newer selection with equal values is still a new owner.
No receipt or canonical write is replayed.

Three production-handler regressions failed before the fix (changed Vault,
newer selection, and leaving Habits):
`/tmp/pdcr-review-round2-destination-red.log`. The same suite, including a
current-selection positive case, passes 18 tests:
`/tmp/pdcr-review-round2-destination-green.log`.

### Work-history interface language

The paired language catalog now includes work statuses, file-change operations
and an exact app-grammar diagnostic/gap formatter. The WorkHistory DOM helper
uses these labels for tagged status/operation values and application-generated
gaps, including the actual diagnosticGap rather than just a generic fallback.
Dashboard dynamic-tool diagnostics use the existing narrow backend formatter;
external/runtime-owned diagnostic text remains verbatim. Names, paths, IDs,
revision strings, runtime text and diff bytes are unchanged.

The real helper plus production labels failed the Chinese/English fixed-grammar
regressions before source changes:
`/tmp/pdcr-review-round2-language-red.log`. The related real renderer/helper
suites pass 34 tests, including an external runtime diagnostic whose literal
text matches host grammar and must remain untranslated:
`/tmp/pdcr-review-round2-language-green.log`.
