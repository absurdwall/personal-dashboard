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
