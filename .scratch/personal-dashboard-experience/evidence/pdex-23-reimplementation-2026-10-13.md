# PDEX-23 reimplementation integration evidence

Ticket: [PDEX-23](../issues/23-collaboration-context-input.md)

## Local history

- Working branch: `codex/pdex-23-refinement-reimplementation`.
- Authorized source baseline: `918e7e0d9c4b2c524c429bfd309482e328bc4c91`.
- The clean integration branch was at
  `53a7495dcade91e979ef0e3acb58202af7f8e5e3` before merge; the clean worker
  branch was at `00e518d7e2c2f4b92333b863f7a54fb364c98bd8`.
- Worker branch commits, in order:
  - `81c0c5dc25975564e403e71f3366442b341ed101` — scoped Collaboration source,
    command completion and production DOM/panel coverage.
  - `606ead3d6f92c6d75083204b8d2917f98e448b14` — ticket evidence, inherited
    failure proof and two synthetic viewport captures.
  - `41a2fd98cbafa5860641a9e587af292601a3ca6a` — worker branch no-fast-forward
    merge of the then-current integration tip `53a7495dcade91e979ef0e3acb58202af7f8e5e3`;
    its parents are `606ead3d6f92c6d75083204b8d2917f98e448b14` and
    `53a7495dcade91e979ef0e3acb58202af7f8e5e3`.
  - `00e518d7e2c2f4b92333b863f7a54fb364c98bd8` — worker integration checks.
- The primary integration branch merged the worker tip with `--no-ff` as
  `968746ad4a3b2ab9722befe7bc160bfee07c15a9`. Its parents are the previous
  integration tip `53a7495dcade91e979ef0e3acb58202af7f8e5e3` and worker tip
  `00e518d7e2c2f4b92333b863f7a54fb364c98bd8`. The merge completed without
  conflicts. No commits were rewritten, and no remote, `main`, or app
  installation operation was performed.

## Integrated checks

Run on the primary integration checkout after merge:

| Command | Result |
| --- | --- |
| `PATH=node_modules/.bin:$PATH npm run build` | Passed, exit 0, using the existing TypeScript compiler. |
| `node --test tests/frontend/collaboration-layout.test.ts` | Passed, 14/14. |
| `node --test tests/frontend/collaboration-panels.test.ts` | Passed, 6/6. |
| `node --test tests/frontend/collaboration-command-completion.test.ts` | 8/10 passed; the same two inherited failures below remain. |

The two command-completion failures are unchanged from the clean base proof
recorded in the ticket and worker evidence:

1. `long help opens on demand while draft, dictation preview and real status surfaces remain exposed` — `false !== true`.
2. `selected slash candidate retains readable foreground on its soft background` — selected candidate `rgb(35, 39, 36)` on `rgba(0, 0, 0, 0)`, contrast `1.39`.

No attempt was made to change these inherited failures without new evidence.

## Acceptance boundary

PDEX-23 remains claimed and `in-progress`. The checks use synthetic DOM/IPC
fixtures and do not establish real dictation-service or packaged-App
acceptance. Packaged save/readback and human acceptance remain with PDEX-26.
