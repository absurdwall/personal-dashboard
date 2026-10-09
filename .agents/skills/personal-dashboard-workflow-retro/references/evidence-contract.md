# Local evidence contract

The standard-library reader opens one explicit absolute `--history` file.
Choose `--execution`, `--session`, or an inclusive `--from`/`--to` period;
optional `--vault` intersects these selectors. Period is the original request's
captured `messageDate`, the local lived date; neither current UI target date nor
host UTC changes it. `--help` is the authoritative argument reference.

The reader performs no app construction, directory creation, runtime login,
reconciliation or canonical readback. Its stdlib streaming selector makes three
bounded passes over one opened descriptor, hashing all source bytes on each pass.
It rejects changed bytes/metadata or a replaced source path rather than emitting
references to an inconsistent snapshot. Original array indices and RFC6901
pointers survive selection and reordered JSON fields. Copy a snapshot only to an explicitly chosen
private destination when durable citations were requested.

Each ref resolves through `references[ref]` to an original RFC6901 JSON Pointer
and full source hash. The source path/hash identifies the snapshot. A report
may cite these stable refs directly, or actual absolute line links in a private
bundle the developer explicitly saved. Reader references never imply a business
save merely because a runtime item completed.

Exported records reuse the existing request, WorkHistory, usage binding and
business receipts. Distinct item/call/receipt identities remain distinct. The
per-execution runtime thread binding can be explicit null for never-dispatched
requests; a session's newer thread is not substituted. Host source-read `diagnosticOrigin` is recorded from the actual application
validation or external RPC branch, never inferred from matching text. Absent
legacy origin remains unknown; source-owned diagnostics remain verbatim.
Legacy missing histories,
configuration, usage and refreshes remain gaps.

Runtime configuration separates captured requested values from observed
thread/start or resume response values. A turn override that differs from the
thread response is not independently confirmed by that response. Unavailable
values remain null/gaps. App version, optional embedded source revision and
resource/tool fingerprints describe the executed package; current settings do
not reconstruct them.

Native `sourceObserved` means bounded current file readback after the event,
not immediate patch state or proof of intended change. Actual native diff is a
separate witness; before bytes may be unavailable. Managed `verified` uses
independent complete expected-document readback. Later source edits and original
unknown save responses remain qualified. Current actual source observation
can reconcile an effect without proving the original response or repeating it.

Refresh observations distinguish source read completion/failure, returned source
state, and renderer application/cached/not-visible/failed state. Rendering a stale
projection does not make its source fresh. Missing observations do not prove
refresh failure or fresh display. Snapshot publication receipts remain separate.

`inputFingerprint` is an observed input signature for comparing attempts, not
proof of semantic equivalence or waste. Parameters are allowlisted subsets.
Hidden reasoning, raw response/tool output, settings/auth fields and unrelated
executions are excluded. Credential-like text is withheld with pointer-specific
omissions; selected ordinary request/reply/diff content can still be personal.

Native usage `total` retains the runtime thread aggregate, while `last` retains
the runtime-reported-last aggregate. Neither is allocated to the complete app
execution or individual tools unless the native source independently establishes
that scope. Counts can be individually unavailable. Time
and call counts are separate evidence; export has no per-tool token allocation,
prices or reconstructed money.

The archive has no whole-source byte cutoff. Traversal uses 64 KiB input/string
token buffers and an 8 MiB retained selection working budget; strings above the
token bound are omitted with their exact source pointer. Selected evidence that
exceeds the working budget returns `unavailable-selection-bound` with the full
source hash and explicit coverage. It does not silently drop selected failures,
terminal facts or receipts. Narrow the selection. The independent output byte
bound returns `unavailable-export-bound`; a larger output argument cannot expand
the fixed selection working budget. Empty match is a distinct empty snapshot;
malformed/unsupported or concurrently changed source exits with an error.

New WorkHistory optional text/summary/diff copies have prospective capacities:
64 KiB per item, 1 MiB per execution, 128 detailed items and 16 summary parts,
plus 8 MiB across all stored sessions. Existing optional payload counts against
new capacity but is never retroactively trimmed. Original messages, failed
attempts, terminal states, receipts and source-observation metadata are retained.
`payloadOmissions` records field, original/retained bytes, reasonCode and an input
fingerprint; this fingerprint is not SHA256. `retainedFromPriorObservation`
marks an earlier retained copy when current authoritative content is omitted;
it must not be reported as the current authoritative text. Existing copies,
unmatched items and immutable prior diffs consume capacity during recovery.
Native terminal recovery preserves
old source witnesses and available new diffs separately, without reconstructing
historical readback. Missing item completion remains unconfirmed with a gap.

These capacities bound optional evidence copies and reader working data. They
do not impose a count/window eviction policy on historical facts or cap total
archive disk size; the application still loads/saves its canonical state as one
file. Neither legacy messages nor outcomes are deleted to satisfy a budget.
