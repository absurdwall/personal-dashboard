# Local evidence contract

The standard-library reader opens one explicit absolute `--history` file.
Choose `--execution`, `--session`, or an inclusive `--from`/`--to` period;
optional `--vault` intersects these selectors. Period is the original request's
captured `messageDate`, the local lived date; neither current UI target date nor
host UTC changes it. `--help` is the authoritative argument reference.

The reader performs no app construction, directory creation, runtime login,
reconciliation or canonical readback. It reads an opened file descriptor once,
records SHA256 of those exact bytes and projects approved fields. App atomic
rename permits a stable opened snapshot. A later file replacement can change
the current source hash; cite the original hashed snapshot instead of assuming
that current bytes are unchanged. Copy a snapshot only to an explicitly chosen
private destination when durable citations were requested.

Each ref resolves through `references[ref]` to an original RFC6901 JSON Pointer
and full source hash. The source path/hash identifies the snapshot. A report
may cite these stable refs directly, or actual absolute line links in a private
bundle the developer explicitly saved. Reader references never imply a business
save merely because a runtime item completed.

Exported records reuse the existing request, WorkHistory, usage binding and
business receipts. Distinct item/call/receipt identities remain distinct. The
per-execution runtime thread binding can be explicit null for never-dispatched
requests; a session's newer thread is not substituted. Legacy missing histories,
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

Source reads are bounded to 32 MiB; text fields above 64 KiB are omitted with a
specific pointer. An export exceeding its explicit byte bound returns
`unavailable-export-bound`, preserving selection/source metadata and explaining
that no selected failure/receipt/terminal facts were silently dropped. Narrow
the selection or explicitly raise the output bound. Empty match is an empty
selected snapshot; malformed/unsupported schema exits with an error.
