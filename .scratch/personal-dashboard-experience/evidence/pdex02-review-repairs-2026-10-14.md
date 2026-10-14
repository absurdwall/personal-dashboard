# PDEX-SPEC-02 scoped review repairs — 2026-10-14

## State and lineage

The published specification and original ticket bodies are unchanged. At the
verified publication checkpoint `918e7e0d9c4b2c524c429bfd309482e328bc4c91`,
PDEX-SPEC-02 was open and PDEX-19–26 were open/not started. Subsequent local
implementation advanced PDEX-19–25 to in-progress; PDEX-26 remains open and
blocked on its declared dependencies. This record does not change any claim,
lifecycle, blocker, or acceptance state.

The scoped repair branch is `codex/pdex-visual-acceptance-repairs-20261014`,
starting from `9bb8e14953b52034a02c29ad9b04aabe5b346333`, which retains
`918e7e0` in its ancestry. It supplements, and does not rewrite, the original
per-ticket feature branches and integration history recorded in
[`refinement-reimplementation-2026-10-13.md`](../refinement-reimplementation-2026-10-13.md).

| Ticket | Existing feature branch | Supplemental repair commit | Scope |
| --- | --- | --- | --- |
| PDEX-19 | `codex/pdex-19-refinement-reimplementation` | `28a29cebe99ed3541fa7c7a926c6671bd2ff33c3` | Keep the Task More menu anchored to its trigger; include focused browser coverage. |
| PDEX-21 | `codex/pdex-21-refinement-reimplementation` | `cb08a9f72ba5ec99c62f5c6e1325662af656dd5b` | Permit Task/Plan timing gestures on axis marker buttons; retain ordinary click-to-edit and resize behavior. |
| PDEX-26 | `codex/pdex-visual-acceptance-repairs-20261014` | Candidate built from `cb08a9f72ba5ec99c62f5c6e1325662af656dd5b` | Isolated review package only; it does not complete packaged acceptance. |

## Verification and remaining boundary

- The macOS candidate build and TypeScript `beforeBuildCommand` passed.
- Focused Task pointer-move and card-click checks passed 2/2; Plan axis gesture checks passed 8/8.
- The full Task gesture file passed 7/8; the remaining blank-axis inner-scroll fixture is unrelated to marker-button handling and also failed before this repair.
- A broader source batch passed 33/36; the three `unified-today-axis` failures also reproduce on baseline `7aef728`.
- The native Cancel/More helper could not compile because installed Swift 6.3.3 does not match the macOS SDK's Swift 6.4. Native CUA review remains separate and pending.
- No ticket, parent spec, or Management lifecycle was closed. PDEX-19/21 remain in progress; PDEX-26 and PDEX-SPEC-02 remain open.

The isolated candidate receipt is at
[`Personal Dashboard Candidate build receipt`](</Users/tingranwang/Documents/Codex/Projectless task folder/2026-10-14/new-chat/outputs/Personal Dashboard Candidate.noindex/receipt.md>).
It records the unique bundle ID, synthetic profile/Vault, fixed synthetic clock,
executable hash and package verification. The installed app, restart worktree,
real Vault, and real profile were not modified by this repair branch.

## Runtime location correction — 2026-10-14

The reviewer reported a read-only sample of the first candidate launch (PID
14512): the main thread stopped at
`FileTodayWorkspacePersistence::inspect_document → std::fs::read → open`, and a
scheduler thread also stopped in `open`. A first-run Documents TCC access issue
for the unique bundle ID is a hypothesis only; it was not confirmed, and no
permission was requested or granted.

After the reviewer confirmed PID 14512 had exited, the candidate-only runtime
copy was moved to
`/private/tmp/pdex-visual-repairs-20261014.noindex/preview-runtime/`. The seeded
`Profile/` and `Synthetic Vault/` under the output directory remain intact. The
runtime copy's `today-workspace.json` and the candidate bundle's
`LSEnvironment` now point to the `/private/tmp` copies. Product source remains
`cb08a9f72ba5ec99c62f5c6e1325662af656dd5b`; no rebuild was needed. The
candidate was re-signed, strict signature verification passed, and
`lsregister -f` completed. Its post-resign executable SHA-256 is
`a5dd98567afe87d294b1e7898e53b36cc5871b5e31f76c78c26fbf4ec7c901ee`.

The reviewer had not launched the relocated candidate at this record's
creation. This packaging change does not establish native acceptance or change
any ticket lifecycle.

## Calendar cell-preview footer alignment — 2026-10-14

A reviewer reported that clicking a Task preview in a Calendar date cell opens
an editor whose Cancel button sits 6 CSS pixels below Save, despite equal button
heights. The regression now drives this exact preview path in
`Calendar task previews open a compact editor` and checks both footer-button
rect tops and bottoms. With the reset removed, it failed at top `613.09375` /
bottom `643.484375` for Cancel versus top `607.09375` / bottom `637.484375`
for Save. The cause is the inline editor's `margin-top: 12px` on
`.task-editor-close`, which shifts the button 6 CSS pixels in a centered row.

PDEX-22 repair commit `a5f8b044bb1be0151b19e25b1077074a06620223` resets that
margin only inside `#calendar-task-editor-dialog-root`, retaining the existing
primary and secondary button styles. The same focused command then passed:

`node --test --test-name-pattern='Calendar task previews open a compact editor' tests/frontend/compact-calendar.test.ts`

The production macOS candidate was rebuilt incrementally with the existing
isolated Cargo target. Its existing output bundle path and unique bundle ID were
retained. `LSEnvironment` still selects the isolated
`/private/tmp/pdex-visual-repairs-20261014.noindex/preview-runtime/Profile/`,
that profile still selects the runtime Synthetic Vault, and the fixed
2026-09-08 14:10 (UTC−4) clock remains configured. The candidate was re-signed,
strict signature verification passed, and `lsregister -f` completed. The new
executable SHA-256 is
`72e835a41f1b8a956d7c9d98b9c9e31bab3c1ddf8bf47dd09cc7f9b69dd32297`.
The candidate has not been launched after this update; native retest remains
with the reviewer. Ticket and parent lifecycle states did not change.
