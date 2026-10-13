# PDEX-25 implementation evidence

Branch `codex/pdex-25-refinement`, base `8bcf66f`; claim/prerequisite tip `2e1c56c` merged before implementation. Authorized seams: real TodayApplication with isolated synthetic selected Vault, saved readback/reopening, and actual DOM/controller interaction. Local Git only; no dependencies, external writes, normal App installation or main merge.

## Slice 1 — full canonical history

Red: the application had no Habit detail/history boundary. Green: a local Habit with January, May and September completions reads all four distinct attained lived days in September, despite repeat same-day completion and the main panel retaining exactly84 cells. Detail reopens through a new application. Missing dates keep total/maximum qualified; known current streak2 remains distinct from an exact all-history result. Paging is over observed records; the entire card history is not rendered.

Native packaged acceptance remains pending and is owned by the integration task.

## Slice 2 — canonical lifecycle

Red: lifecycle mutations and retained activity intervals were absent. Green: deactivate/restore writes through the same catalog CAS/readback boundary, retains initial activity plus dated transitions and idempotent receipts, reopens the same key, and preserves previous known maxima and completion facts. Inactive dates are exempt from demand; restore starts a new continuous segment. A January-to-September missing-history case and a complete local active/paused/reactivated case pass.

## Slice 3 — achieved open weeks and authorized historical correction

Red: pausing after attaining an open week's target erased its contribution to the old known maximum. Green: the period is evaluated up to its pause boundary and retains an already attained result in its original activity segment; current streaks cannot bridge into a restored segment. Historical local withdrawal while inactive remains authorized and recalculates the affected old week against3, while a pending5 still activates next Monday. No completion fact or goal segment is rewritten by lifecycle edits.

## Slice 4 — retained source history and qualified coverage

Red: the new source window replacement discarded an older June22 fact, and reading only the current daily-time target would backdate it onto earlier actual-time evidence. Green: an authorized real producer refresh retains the prior validated source bytes in an immutable hash-addressed local history before replacing the published snapshot; a fresh application reads its original dated provenance beyond the panel's12 weeks. Complete newer coverage can supersede old external state; missing unknown dates keep earlier verified facts. Canonical goal segments retain precedence over later source refreshes. Lifetime source start remains unknown, so source totals/maxima stay qualified. Daily target knowledge is limited to the generation day unless supplied historical revisions establish more.

The real application confidence cases cover complete local history, explicit withdrawal, unknown gaps/current open day, start-date change without erasing earlier completion, unresolved historical source target, inactive intervals and saved/reopened same identity. Detail reads reject mixed Vault/date/revision state and remain read-only. Historical corrections use full applicable goal history while normal current-day capability remains unchanged.

## Slice 5 — selected detail and lifecycle UI

Red: no on-demand right-side detail/controller existed; a real browser could not select a Habit, inspect qualified full history or restore an inactive item. Green: left selection opens the right detail while retaining the summary, and an explicit return restores the mounted default today list and its original expanded history. Active daily/weekly rows remain the default body; inactive items move to the explicit left-side finder. Current/pending goals, original start date, monthly/total distinct attained days, confirmed-versus-known maxima, separate day/week units, coverage gaps, provenance, goal/activity segments and paged record corrections are available in both interface languages. Editing/context menu reuse PDEX-24; today check-in uses its existing command. Revision-bound inactive/restore and historical correction writes keep operation IDs through failure/reread and defer display until durable command readback.

Actual Chrome DOM/controller cases at1200 and560 exercise selection/return, partial coverage language, old history paging, shared edit callback, failed save/reread/retry with the same operation ID, inactive finder/same-key restore and local withdrawal. Horizontal overflow is checked. Captures are synthetic and retained outside Git at `/private/tmp/pdex25-ui.noindex/habit-details-1200.png` and `habit-details-560.png`. These verify the owned browser/controller surface, not packaged native acceptance.
