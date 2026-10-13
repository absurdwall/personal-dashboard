# PDEX-25 implementation evidence

Branch `codex/pdex-25-refinement`, base `8bcf66f`; claim/prerequisite tip `2e1c56c` merged before implementation. Authorized seams: real TodayApplication with isolated synthetic selected Vault, saved readback/reopening, and actual DOM/controller interaction. Local Git only; no dependencies, external writes, normal App installation or main merge.

## Slice 1 — full canonical history

Red: the application had no Habit detail/history boundary. Green: a local Habit with January, May and September completions reads all four distinct attained lived days in September, despite repeat same-day completion and the main panel retaining exactly84 cells. Detail reopens through a new application. Missing dates keep total/maximum qualified; known current streak2 remains distinct from an exact all-history result. Paging is over observed records; the entire card history is not rendered.

Native packaged acceptance remains pending and is owned by the integration task.

## Slice 2 — canonical lifecycle

Red: lifecycle mutations and retained activity intervals were absent. Green: deactivate/restore writes through the same catalog CAS/readback boundary, retains initial activity plus dated transitions and idempotent receipts, reopens the same key, and preserves previous known maxima and completion facts. Inactive dates are exempt from demand; restore starts a new continuous segment. A January-to-September missing-history case and a complete local active/paused/reactivated case pass.

## Slice 3 — achieved open weeks and authorized historical correction

Red: pausing after attaining an open week's target erased its contribution to the old known maximum. Green: the period is evaluated up to its pause boundary and retains an already attained result in its original activity segment; current streaks cannot bridge into a restored segment. Historical local withdrawal while inactive remains authorized and recalculates the affected old week against3, while a pending5 still activates next Monday. No completion fact or goal segment is rewritten by lifecycle edits.
