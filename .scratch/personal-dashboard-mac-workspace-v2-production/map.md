# Personal Dashboard Mac workspace v2 — production map

This is the fresh production effort for the approved v2 design. The sole design reference is [the approved v2 spec](../personal-dashboard-mac-workspace-v2/spec.md), with [A — List + temporary sheet](../personal-dashboard-mac-workspace/prototype/ticket-08-week-flow/) as the visual/interaction reference.

The previous v2 effort remains useful historical evidence, but its tickets 08–13 were fixture/prototype work. They do not represent production delivery and should not be reopened or renumbered. This effort intentionally starts at ticket 01 so that implementation sessions have one clear namespace.

## Dependency graph

    01 production gap matrix
     ├──> 02 production shell and default This Week
     │     └──> 03 direct recording and state semantics
     │           ├──> 04 unscheduled workout and progress
     │           └──> 05 change-time, skip/undo, and moved occurrence
     └───────────────────────────────────────────────────────────────┐
                                                                     v
                         06 responsive sheet and accessibility ───> 07 persistence/history/settings
                                                                     |
                                                                     v
                                                        08 packaged parity gate

## Production tickets

| Ticket | Scope | Status | Depends on |
|---|---|---|---|
| [01 — Production gap matrix](issues/01-production-gap-matrix.md) | Freeze the real production gap and cutover contract | resolved | — |
| [02 — Production shell](issues/02-production-shell-and-this-week.md) | Make the real app visually and structurally match the v2 default workspace | resolved | 01 |
| [03 — Direct recording and state semantics](issues/03-direct-recording-and-state-semantics.md) | Close and prove the click-only direct-record path and occurrence state model | resolved | 01, 02 |
| [04 — Unscheduled workout and progress](issues/04-unscheduled-workout-and-progress.md) | Close and prove independent workout logging, draft behavior, progress, and history evidence | resolved | 01, 02, 03 |
| [05 — Change-time, skip/undo, and moved occurrence](issues/05-change-time-skip-and-moved-occurrence.md) | Close and prove exception semantics without corrupting the source occurrence | resolved | 01, 02, 03 |
| [06 — Responsive sheet and accessibility](issues/06-responsive-sheet-and-accessibility.md) | Match the temporary-sheet behavior across viewports and restore keyboard usability | ready-for-agent | 02, 03, 04, 05 |
| [07 — Persistence, history, settings, and boundaries](issues/07-persistence-history-settings-and-boundaries.md) | Prove relaunch persistence and that existing secondary surfaces remain reachable and coherent | ready-for-agent | 03, 04, 05, 06 |
| [08 — Packaged v2 parity gate](issues/08-packaged-v2-parity-gate.md) | Launch the packaged app and close the effort only after end-to-end parity evidence | ready-for-agent | 01–07 |

## Review-comment coverage

| Review comment | Production ticket that owns the fix/evidence |
|---|---|
| A moved original must not remain recordable or adjustable; the moved destination is the independent occurrence | 03 and 05 |
| Conflict detection must cover every occupied target slot and require explicit confirmation | 05 |
| Change-time choices must contain only future eligible slots | 05 |
| Exception/record actions must restore focus to the selected agenda row | 06 |
| Progress must be derived from real completion state rather than a fixed visual value | 02 and 04 |
| Verification must include the real packaged Mac app, not only fixtures or Rust tests | 07 and 08 |
| Historical ticket status and production delivery must not be conflated | This map, ticket 01, and the boundary note in the previous v2 map |

## Additional v2 contract coverage

| Contract requirement | Production ticket that owns the fix/evidence |
|---|---|
| Week-close keeps no-record rows unrecorded, distinguishes unresolved from qualifying completion, and retains readable status signals in This Week and History | 03, 07, and 08 |

## Final acceptance

Ticket 08 is the final product gate. The required conclusion is not “the six tickets were implemented”; it is: launch the real packaged app, exercise the approved v2 flows at the required viewport sizes, relaunch where specified, and confirm that the visible product and persisted behavior match the prototype contract. If the environment prevents the packaged run, record that as an explicit human/environment blocker instead of marking the product delivered.
