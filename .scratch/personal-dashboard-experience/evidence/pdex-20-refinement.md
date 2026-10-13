# PDEX-20 implementation evidence — 2026-10-13

Owner: Codex implementer PDEX-20
Branch: `codex/pdex-20-refinement`
Initial integration ancestor: `b96b77d` (verified before edits)
Authorized prerequisites: `dc5b09c` / specification snapshot `918e7e0`
Local Git only. No dependencies, main merge, installation or remote access.

## Application/controller increment (UI still in progress)

Schema 3 is extended compatibly; no competing version bump. Ordinary Task
parent identity has omission-preserving/null-clearing updates, exact operation
receipts and retained before/after relation history. Back-end validation rejects
self/cycles/missing/foreign parents before persistence; deleted parent identities
can remain for historical explanation, but cannot be newly associated.
Deleting/restoring the parent does not mutate descendants; reparenting or detach
performed while it is deleted is retained after restoration. State/date/list and
PDEX-19 priority/tags/end remain independent.

One-level folders have stable identities, CRUD receipts and list move receipts.
Inbox cannot be grouped. Deleting a folder only unassigns its lists (including
archived lists); restoring a list keeps an available grouping or remains top
level after the folder was removed. Reads validate graph/folder structure before
any writes and old documents default to no relationships/folders.

Confirmed real application seam uses synthetic Vaults and new application
instances/readback. Parent and folder tracers each ran red on the missing
contracts, then green. Deleted-parent swap/detach/restore, legacy field update,
self/missing/cross-Vault refusal and exact retries pass. Full `task_workflow`
passes 38 tests. Public controller projection and parent-aware confirmation
tracers ran red, then both pass.

Production WebKit UI tracer `scripts/acceptance/task-organization-dom.mjs` is
currently red on the absent hierarchy/relationship/grouping UI; UI work continues.
This increment does not claim full implementation or acceptance.

## Separate PDEX-19 diagnosis interruption

PDEX-20 dirty work was preserved in this worktree while the original PDEX-19
branch received the native Save-chain repair `7e96b08`. That repair will be
merged here before final UI checks; it is not mixed into this increment.
