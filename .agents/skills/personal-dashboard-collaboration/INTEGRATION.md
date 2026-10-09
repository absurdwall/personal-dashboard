# Usage package integration contract

Contract 1 embeds this package at application build time; selected-Vault or
installed skill edits do not silently change a running candidate. The host loads
SKILL.md and the document/Dida/mapped-Habit references for a human turn, or the
automatic-morning/files and Dida-read references for an automatic turn. Hosts
outside Dashboard should read the referenced files on the matching branch of
work and supply actual executable capabilities; the package registers none.

The manifest versions identify guidance and tool-set semantics. Keep tool
parameter schemas and business adapters in the host; their descriptions come
from tool-descriptions.json. Change skillVersion for guidance changes and
toolSetVersion for schema/adapter contract changes. A fingerprint of every
embedded behavioral resource detects changed content even if a version was
accidentally retained. Version and content changes rotate the runtime thread
through existing conversation restoration, preserving operation receipts.

Before sending each turn, persist a usageBindings entry keyed by executionId:
versions, package fingerprint, actual registered tools and schema operation
names, external capability fingerprint and automatic scope. Old sessions without
bindings remain readable and retain unknown historical package identity. A
failed binding save prevents the turn from being sent. Only actual registered
schemas advertise capabilities; documentation cannot make a tool available.
Native file/MCP schemas and permissions stay enforced by their existing runtime.

Use supplied memory.routineReference for existing life-daily-loop rules; if
missing, report the context gap when it matters. This package does not maintain
a second copy of that routine. Business source receipts, conversation
persistence, Habit snapshot publication and page freshness remain independent.

## Read-only reply links

The production Markdown renderer accepts these internal navigation targets:

- `dashboard://task/<stable-task-id>`
- `dashboard://list/<stable-list-id>`
- `dashboard://record/YYYY-MM-DD` with optional `?phase=morning|daytime|evening`
- `dashboard://habit/<stable-habit-key>?date=YYYY-MM-DD`

Use the actual ID/key and date read from current facts or a typed receipt. Links
may refer to read-only retro sources as well as saved changes. Percent-encode
identity components when needed. The renderer validates calendar dates, allowed
query keys, and bounded identity characters; it opens the app's existing source
read/lookup views. A missing object remains absent. Links cannot select a Vault,
resolve an arbitrary file path, or execute a write; other URL schemes render as
inert labels. This is a host navigation contract, not a registered model tool.

## Bounded read-only history

Human rounds advertise `dashboard_read_history` only when a domain's actual
adapter is available: `tasks` and `dailyRecords` use the existing Task and Today adapters. Input is exactly domain, fromDate and
toDate, inclusive ordered valid dates with at most 366 dates. Selected Vault
is supplied by the host's captured request, never a model path or binding.
The response retains domain/range, source state/error, targetBinding, revision,
current canonical Task/list objects and relevant retained changes/completions.
The coverage statement distinguishes current state from dated change witnesses
and unknown older activity. Reads do not create records or change selected date.
Daily Record responses include one dated entry per requested day, with source
availability/revision/binding, morning baseline, current arrangement/basis,
daytime facts and short records, evening review/correction fields and time axis.
Missing or damaged records retain unknown evidence; no records are created.
Each entry exposes existing date/phase links. Short records retain stable IDs
and correction traces; their appearance in Daytime and Evening refers to the
same objects, counted once. Other dated domains extend this same dispatcher
through their existing adapters. Automatic tool registration remains unchanged.
