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

## Slice 6 — failure and frequency boundaries

Real application cases verify a daily3-day peak and a weekly1-week peak remain separate after a midweek frequency transition, and the first partial weekly period is excluded even after attaining3 days. An interrupted return after an actual durable lifecycle save reopens inactive, retries the original operation without duplicate activity, and refuses stale restoration while retaining that result. Source coverage-start dates are not presented as an invented original Habit start. Source failure/freshness messages remain readable in detail provenance.

Eight real detail/lifecycle cases pass, together with all39 pre-existing Habit catalog/completion/snapshot cases (47 total). Build and cargo check pass. Five actual DOM cases across Habit create/edit and detail at1200/560 pass, including rejection of a delayed old-Vault detail response and preservation of the mounted default history. Native packaged acceptance remains pending.

## Slice 7 — same-lived-day activity transition

Red: deactivating after today's attained fact reduced the old daily peak, and immediate same-day restoration would count the existing fact in the new segment. Green: each canonical activity transition captures whether its lived day was already attained plus the existing local change count. The old attained day stays in the old segment; restoring retains the fact but does not turn it into an automatic new-segment check-in. A fresh application reads total2/old peak2/current0 after both same-day transitions. A changed completion revision refuses mixed transition evidence before catalog mutation; source changes during detail reads require reread.

Nine detail/lifecycle cases now pass; all39 existing Habit catalog/completion/snapshot cases remain required below. The broad frontend sweep completed473/500 with27 failures in inherited Today/Collaboration/Task layout, extracted-function and WebKit editor probes; no Habits failure. Focused Habit/presentation/historical/language tests pass33/33. That broad sweep is qualified and is not a release or native acceptance claim.

## Final implementation verification

Latest code tip `0bfc4d837ead4dd1f0ffe027d7bdebc1184d9685`; integration ancestor `86980149b4478a685e03a58dbf213cd6a8bf5fc9` merged via `b9ae1948a88583fc8fd72b3b6a50945655bfe88f`. Final real application suites pass48/48: catalog12, completion12, details9, snapshot15. Cargo check passes after the transition-evidence fix. After integration merge, build and all5 Habit DOM cases pass; focused frontend33/33 also passes. Complete source/history/lifecycle commits are recorded in ticket25. Status is implementation-complete/acceptance-pending; native packaged acceptance remains outstanding.

Owned command logs outside Git: `/private/tmp/pdex25-final-core.log`, `/private/tmp/pdex25-final-check.log`, `/private/tmp/pdex25-merged-build.log`, `/private/tmp/pdex25-merged-dom.log`, `/private/tmp/pdex25-focused-frontend.log`, `/private/tmp/pdex25-frontend-all.log`. Synthetic captures remain `/private/tmp/pdex25-ui.noindex/`. No dependency changes, external lifecycle writes, main/remote operations, normal-App install or destructive cleanup occurred. Worktree and full local history are retained for the merger and native acceptance.

## Bounded lifecycle repair — mixed date and source evidence

Integration `7e67ef4` was merged before this repair. Real TodayApplication red regressions confirmed two successful writes that should have been refused: a clock advancing from03:59 to04:00 moved the previous lived day's attained marker onto the next day; a real synthetic published source file replaced complete evidence with unknown during projection while the catalog still saved the old attained marker. Existing lifecycle guards covered catalog/completion revisions, not the source bytes or snapshot/timestamp lived-date agreement.

The lifecycle write now captures its lived date before projection, verifies the selected Habit today date and validated save timestamp agree, and rechecks the lived date before CAS. Sourced identities capture the source bytes through the same canonical/legacy loader and verify them before writing. Existing completion/Vault/catalog guards and exact already-persisted receipt retries remain in place; the clock framework and detail reader are unchanged. Both regressions now refuse writes, preserve catalog/completion revisions and active state, and allow the same operation identity to save after stable reread without duplicate activity. The successful next-day retry stores `attainedOnTransition=false`, preserving the old completion fact in its original lived day.

Red log `/private/tmp/pdex25-lifecycle-races-red.log` (two failures because both mutations unexpectedly succeeded); green log `/private/tmp/pdex25-lifecycle-races-green.log` (2/2 pass). Synthetic Vaults use the real stores/readback; the clock and source-store replacement are only authorized external-boundary controls. Native packaged acceptance remains pending.
