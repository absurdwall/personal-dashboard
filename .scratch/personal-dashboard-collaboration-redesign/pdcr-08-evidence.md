# PDCR-08 document and background change evidence

Date: 2026-10-09. Implementation branch: `codex/pdcr-08`.
Baseline: `a1df0e2` on `codex/collaboration-redesign-integration`.
Product commits: `137e41c`, `1b8503a`. Integration merge: `4e71b91`, including
latest integration `d8ee283`.

## Delivered behavior

The existing work-history item now retains bounded change witnesses. Native
`fileChange.changes` supplies the actual diff; agent messages, summaries and
command output never become file audit evidence. Paths resolve against the
captured runtime cwd and selected Vault, normalize to allowed `life/` paths,
and reject source/settings/other Vaults, redirected paths, `Self.md` and managed
stores. The existing exact habit-display-name exception remains allowed.
Automatic rounds cannot publish ordinary write evidence.

After an authoritative completed event, one bounded independent read observes
the current source revision. Native `sourceObserved` means that current file
was read after the event. It does **not** claim the diff caused those bytes,
immediate post-patch state, or unobserved before bytes. Missing/oversized diffs,
missing/unreadable/oversized results and unavailable scope become explicit
gaps. Limits are 32 changes per item and 64 KiB per diff/readback. Deletions can
retain a real diff while absent result readback remains a gap.

Stable native identities use item + normalized path/operation/move target.
Later snapshots preserve the first observation, even when an independent edit
has since changed the file. A later redirected path adds a scope gap without
replacing the original observation or reading file contents again. Duplicate
sequences do not repeat the read. A
changed selected Vault prevents new source observation; existing evidence
remains historical evidence of its original scope.

Managed `Self.md` updates reuse the existing proposal, revision guard and
memory adapter. Their witness records the actual proposal source revision and
separate independent current-source readback. `verified` requires the complete
observed document to match the expected document fingerprint. A concurrent
later correction produces `unconfirmed`, retaining the original save outcome
separately. Source conflicts preserve the concurrent content. Recovery after
history failure reads the exact current document and attaches evidence to the
original receipt/work item without a second write. Background has no daily
`targetDate`; ordinary dated Daily Record paths use the actual path date.

Expanded activity details show the witness/revisions, inert plain-text diff
and gaps. Confirmed source observations refresh affected date projections and
context once while the turn continues. The latest integration's Task/list
refresh and background watch behavior remains intact.

## Shared contract for PDCR-09

`CollaborationWorkItem.changes[]` (default empty for legacy history):

| Field | Meaning |
| --- | --- |
| `id`, `source` | Stable identity; `nativeFileChange` or `managedMemory` |
| `objectId`, `path`, `operation`, `movePath` | Scoped object/normalized relative path and observed operation |
| `receiptId` | Existing managed receipt identity when applicable |
| `targetDate` | Captured request date or canonical Daily Record path date; null for background |
| `beforeRevision`, `afterRevision` | Actual observed source revisions only; native before is unavailable |
| `diff` | Bounded actual runtime file-change diff, never agent text |
| `verification` | `unobserved`, `sourceObserved`, `verified`, `unconfirmed`, or `scopeRejected` |
| `observedAtMs`, `gaps` | Observation time and explicit evidence limits |

Item `changeGap` records missing change evidence. The enclosing existing
session/WorkHistory binds Vault, execution, runtime thread, turn and item/call.
No parallel evidence store, watcher, backups or rollback exists.

## Verification

Spec-confirmed seams use synthetic real files/production adapters and the
actual JSONL event parser, CollaborationApplication, observer and file store.
The replaceable runtime emits real native schema; it is not live installed
Codex execution. No personal data, installs, dependencies, services or GitHub.

Observed red → green slices:

- Ordinary file patch: saved item initially lacked path/diff; now retains the
  actual diff and independently observed revision after real narrow file edit.
- Managed memory: runtime tool item initially lacked change witness; now links
  its receipt and actual before/after revisions from real managed persistence.
- Production watch: initially did not refresh evidence's target date during
  a running turn; now does so once without inventing Task changes.
- Production renderer: initially omitted path/diff/gap; now renders them as
  inert text, including literal `<script>` content.
- Later path redirection: initially replaced an existing observed revision
  with scope rejection; now retains its original diff/revision/observation time
  and records the later scope gap without source readback.
- History-failure recovery: the original work item had no change witness after
  recovery (red index-out-of-bounds); now retains verified independent readback
  with original save-response gap and exactly one adapter write.

Additional application/file checks cover later snapshots after a concurrent
edit, managed revision conflict, later managed correction, unrelated history
preservation, restart loading, scope exclusion and symlink rejection, habit
name exception, automatic exclusion, missing diff/source, cwd binding and
64 KiB source bound. Frontend production tests cover active refresh, stopped
and failed turns, inert rendering and preserved Task view refresh.

Final checks after latest integration merge:

- `npm run build`: passed.
- `npm run test:frontend`: 344 passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --lib --test
  collaboration_workflow --test collaboration_task_operations -- --nocapture`:
  88 library + 92 Task/operation + 19 Collaboration workflow tests passed;
  6 existing native/environment gates ignored.
- After the final retention fix: `cargo test --manifest-path
  src-tauri/Cargo.toml --lib collaboration:: -- --nocapture`: 56 passed,
  6 existing native/environment gates ignored. The dedicated scope suite
  passed 3/3, including redirection retention.
- `git diff --check`: passed. Temporary dependency/build symlinks removed.

All Rust checks use the existing shared canonical Cargo target directory.
Transient logs are `/tmp/pdcr-08-{merge-rust,merge-frontend,merge-build}.log`;
recovery red/green logs are `/tmp/pdcr-08-recovery-{red,green}.log`;
retention logs are `/tmp/pdcr-08-retention-{red,green}.log` and final narrow
regression log is `/tmp/pdcr-08-final-scope.log`.

## Limits retained

Native startup timing does not observe original bytes. Current readback is a
bounded observation, not an atomic transaction with the runtime write or a
claim that a later edit never occurred. Native missing/deleted/large result
files retain gaps rather than invented revisions. Before full background
bytes are not stored; the observed source revision is retained instead.
Live installed Codex/synthetic-Vault acceptance and packaged end-to-end gates
remain with PDCR-11; live Dida remains with PDCR-12. These application/schema tests do not replace either gate.
