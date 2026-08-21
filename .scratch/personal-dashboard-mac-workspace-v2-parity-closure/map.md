# Personal Dashboard Mac workspace v2 — parity closure map

This round intentionally uses a new namespace. The earlier production effort at `personal-dashboard-mac-workspace-v2-production` remains unchanged and historical.

## Dependency graph

    01 visual parity ───────────────┐
                                    ├──> 03 integrated responsive/accessibility parity ───> 04 final packaged gate
    02 day-first change-time picker ┘

## Tickets

| Ticket | Scope | Status | Depends on |
|---|---|---|---|
| [01 — V2 A visual parity and default workspace](issues/01-v2-a-visual-parity-and-default-workspace.md) | Make the launch surface match the sole visual reference | resolved | — |
| [02 — Day-first change-time picker](issues/02-day-first-change-time-picker.md) | Make exception scheduling a weekday/date-first, time-second flow | ready-for-agent | — |
| [03 — Integrated responsive and accessibility parity](issues/03-integrated-responsive-and-accessibility-parity.md) | Prove the complete interaction surface across sizes and input modes | ready-for-agent | 01, 02 |
| [04 — Final packaged v2 parity gate](issues/04-final-packaged-v2-parity-gate.md) | Close the round only with direct packaged-app evidence | ready-for-agent | 01, 02, 03 |

Ticket 04 is the only delivery gate for this round. No ticket is resolved from a fixture or unit-test result alone.
