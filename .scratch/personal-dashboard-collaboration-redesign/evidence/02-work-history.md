# PDCR-02 — Observable Collaboration work history

Date: 2026-10-09. Implementation: `77a1951` on `codex/pdcr-02`.
Integration base: `562a8b9` (`codex/collaboration-redesign-integration`).
This is code/behavior verification; native packaged acceptance and live external
source acceptance remain separate PDCR-11/12 gates. No GitHub, installation or
personal-Vault/Dida mutation was performed.

## Implemented boundary

- `collaboration_history.rs` projects actual JSONL notifications and dynamic
  callbacks at the existing StdioJsonlClient boundary. One optional observer
  connects that projection to the existing CollaborationApplication/store;
  session queries and the production watch/render path carry the same data.
- Defaulted `workHistory` is additive under storage schema 1, with evidence
  version 1 per turn. The application binds execution/session/Vault/thread,
  records runtime turn identity before actions, and accepts monotonic snapshots.
  Wrong thread/turn notifications are excluded. Old sessions without this field
  remain readable and retain unavailable process evidence.
- Items retain first/last host sequence, observed times, available runtime
  lifecycle/envelope times, item/call identities and phase. Actual commentary,
  public reasoning summary parts, tool activity, failure/retry attempts and turn
  terminal status are separate. Hidden reasoning content/deltas are excluded.
  Optional token totals/last-turn counts are preserved exactly at their reported
  thread/turn scopes, with absent fields unavailable and no per-tool cost.
- Completion snapshots replace the matching item's accumulated text; late
  deltas cannot append after completion. Explicit final_answer items supply the
  final reply, and their arrival does not end the turn. Older unknown-phase
  streams use the last unknown message as a compatibility reply while retaining
  unknown phase; known commentary is never folded into the final reply.
- Delta snapshots are batched at 250 ms / 4096 bytes, including a quiet receive
  tick. Item lifecycle, tools, error, stop, usage and terminal results flush
  immediately. Failure attempts remain after later recovery. Commands with
  nonzero observed exit codes are failed activity even when lifecycle status is
  completed.
- Tool completion remains transport activity. Typed business receipts remain
  the independent saved outcomes and enrich object names/dates. Allowlisted
  parameters and bounded filtered diagnostics are available in Details;
  credentials/serialized payloads and arbitrary raw command/tool outputs are
  withheld with an explicit diagnostic gap. A history save failure after a
  canonical effect preserves its applied receipt, sends the actual tool RPC
  reply first, marks history unavailable and leaves the request interrupted for
  saved-result reconciliation. Native runtime requests a bounded interrupt and
  drops its client after such a consumer failure; it does not replay the turn.
- Confirmed typed effects trigger targeted canonical re-reads during an active
  turn, keyed by stable receipt/revision. Unknown results do not trigger success
  invalidation. Terminal native-file refresh remains the fallback. Read/display
  failure retains the prior valid projections through the existing refresh
  implementation; canonical-save and conversation-save outcomes stay separate.

## Production UI and navigation contract

The app shell/session/composer remain the existing production surface. Active
work history opens by default; terminal work folds unless the user has manually
expanded it. Polls preserve reader scroll and manual Details state. Tool rows
show localized domain action/object/date and actual transport status, while
saved outcomes retain their own source statuses. Public summaries are shown only
when actually supplied. Final replies support paragraphs, lists, checklist,
strong/code text and validated internal links using DOM creation, with inert
HTML and other URL schemes.

The shared read-only URI contract is documented in the usage package's
`INTEGRATION.md`: `dashboard://task/<id>`, `dashboard://list/<id>`,
`dashboard://record/YYYY-MM-DD` (optional phase=morning/daytime/evening), and
`dashboard://habit/<key>?date=YYYY-MM-DD`. Actual facts and receipts supply IDs
and dates; read-only retro source links use the same views. Navigation validates
identity/date/query shape, performs the existing source read/lookup, and never
selects a Vault or invokes a mutation.

## Verification receipts

- Red transport tracer: the prior implementation returned
  `Saved Saved Late duplicate` instead of the completed item's literal
  `Saved correctly.`. The same test is now green and verifies a later real tool
  callback still runs after final text arrives.
- Actual stdio/application/file-store seam:
  `actual_stdio_history_and_receipts_survive_application_reopen_without_hidden_content`
  injects interleaved commentary, public/hidden reasoning, failed action,
  recoverable runtime error, real TaskApplication save, duplicate final deltas,
  authoritative completion, command exit failure and optional usage. It observes
  actual tool RPC replies, applied receipts, canonical Task readback and session
  reopen. Hidden/raw content and foreign-thread activity are absent. Deleting
  workHistory from the synthetic legacy JSON file yields empty unavailable
  history, without regeneration.
- `history_failure_after_canonical_save_keeps_receipt_and_returns_tool_reply`
  injects a file-store failure at completed action-history save. The canonical
  Task exists once, the applied receipt remains, both RPC replies are observed,
  and history is marked history-save-failed while request recovery stays paused.
- `streaming_work_is_batched_but_completed_items_and_terminal_are_flushed`
  injects 2000 deltas through the actual stdio consumer. Fewer than 20 observer
  snapshots are delivered, completed content is saved before terminal, a full
  terminal snapshot supplies the final reply, and an absent summary remains
  absent.
- Production frontend behavior tests verify checklist/link safety, retained
  failed attempt/recovery, human-readable action/object/date, missing summary,
  collapsed history, manual expansion/reader scroll, and canonical readback once
  during active work using the captured receipt date. Existing conversation,
  action-result, draft, dictation, refresh and queue tests remain green.
- `npm run build`: passed. `npm run test:frontend`: **335 passed, 0 failed**.
- Full `cargo test --manifest-path src-tauri/Cargo.toml`: **452 passed, 0 failed,
  6 explicitly ignored native/live gates**. After final filtering/phase-preserve
  adjustments, the two actual stdio/application history tests passed again;
  build and all 335 frontend tests passed again. `git diff --check`: passed.
- Private diagnostic logs: `/tmp/pdcr-02-rust-all.log`,
  `/tmp/pdcr-02-history-final.log`, `/tmp/pdcr-02-frontend-final.log`.

## Evidence limits

The injected schema matches the locally generated Codex 0.160.0 protocol;
`/tmp/pdcr-exploration/history.md` holds its version/schema pointers and
`native.md` records connection discovery. Synthetic event injection and source
readback are not a live model/packaged-app acceptance claim. The six native/live
checks remain ignored; isolated Dida objects are not prepared.

Raw deltas provide no replay ID/offset. Equal strings arriving before an
item's authoritative completion cannot safely be treated as duplicates without
also deleting legitimate repeated text. Host snapshot delivery is monotonic and
idempotent, completion snapshots restore exact item text, and post-completion
deltas are ignored. Earlier runtimes without item identity/phase/timestamps
retain explicit compatibility identities/unknown metadata instead of invented
boundaries or summaries. Native file activity alone is not a confirmed save;
its business readback remains the existing terminal fallback.
