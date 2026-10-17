# Collaboration intent and conversation repair — 2026-10-05

Status: implemented locally, packaged and installed as 4.0.6. GitHub publication/PR merge remains pending while the account is suspended. Main remains untouched; work is on `codex/fix-daytime-write-authority`. This supersedes the 4.0.5 phrase-rule repair.

## Agreed behavior

Codex interprets write versus discussion/review from the whole conversation. The application no longer classifies authorization phrases, requires quotes or adjacent-message confirmations, or demands first-mapping approval words. Explicit review requests still prepare changes; conversational confirmation can execute the exact saved proposal with its original revision and identity. Automatic morning planning retains its prior capability scope. Allowed operation shapes, selected Vault, stable identities, revisions, native source verification and duplicate delivery remain mechanical constraints.

The Collaboration skill was shortened, and stale authorization wording was removed from tool schemas and descriptions. A daytime event needs only the event, transition and execution mode; unused arrangement/evidence arrays default empty and optional replan/calibration fields can be omitted.

## Reproduced failures and fixes

- Production history retained the actual user text correctly. The renderer incorrectly attached action results and MCP envelopes under the user message. A real-renderer VM regression failed before the fix and passes after it. Results now appear on the assistant side with concrete names, dates, content, status and internal navigation. Successful source reads stay in collapsed activity; raw input/output JSON is hidden, including legacy history. The host no longer appends an engineering Dida outcomes dump to assistant prose.
- An accepted keyboard send could be followed by a stale workspace snapshot restoring the consumed draft. The real composer regression failed before the fix and passes after it. Accepted submissions clear the draft; older snapshots cannot restore it, while newer edits and failed submissions remain protected. IME composition does not submit prematurely.
- Saved-result checks waited synchronously on the runtime mutex. A held-runtime integration regression exceeded its bounded response deadline before the fix and passes after it. Reconciliation runs in a native blocking worker, returns promptly when the runtime is busy, and disables repeated UI submissions while a check is pending.
- Send is immediately right of the microphone inside the input controls. A temporary sticky-composer experiment obscured conversation controls during native acceptance and was removed before delivery.

## Verification

- 331 frontend tests passed; `npm run check` passed.
- Full Rust suite: 442 passed, 6 ignored native/environment gates, no failures. Obsolete host language-classifier tests were retired; structural/source tests were retained. Updated transport fixtures represent Codex decisions explicitly rather than relying on removed host denial rules.
- Targeted confirmation/revision and collaboration tests passed after the final tool-description and active-run binding changes.
- Final `npm run build:mac`, packaged Launch Services acceptance and strict deep signature verification passed.
- Real Codex through the signed Mac candidate, with an isolated synthetic Vault: an ordinary instruction saved a daytime event and completed nutrition/psyllium locally without asking for another confirmation. Source readback and UI confirmed all three effects, and brushing remained planned. Cmd+Enter left the composer empty. The result link opened the correct Daily Record/daytime phase.
- Final candidate: a request to preview prose without saving left the source unchanged; the next message was only “都确认”. It saved the exact original event once, without a further authorization question. The minimized daytime payload succeeded.
- Native legacy-history UI fixture: a 200 KB raw tool-result payload remained hidden, the user bubble contained only “都确认”, activity expanded to a compact source/tool/status row, and Check saved results returned promptly and restored the composer. This UI fixture does not claim to reproduce a live external network stall; the busy-runtime regression verifies the locking boundary separately.
- External Dida mutations were not performed in these native UI acceptance turns. External verifiers, mappings, scope history, independent endpoint failures and recovery remain covered by controlled transport/source tests. No live Dida synchronization acceptance is claimed.

## Installation and preservation

Installed: `/Applications/Personal Dashboard.app`, 4.0.6. Binary SHA-256: `3b2320220ad8de3f21ebf27fae2bcd7527cee2420de801f9b049d88d76054e7b`, byte-identical to the final built binary. The original profile and Vault reopened. All 42 inventoried production Markdown/managed JSON files remained byte-identical across installation. Software acceptance did not replay old user business requests.

Previous installation is archived at `~/.codex/backups/personal-dashboard/20261005-conversation-repair.noindex/Personal Dashboard-before-4.0.6.app`. Candidate and final built bundle are retained under `~/.codex/artifacts/personal-dashboard-conversation-20261005.noindex/`; temporary copied authentication was removed. Test/build/backup bundles were unregistered from Launch Services; the installed App remains the searchable release.

The installed Management helper confirmed the existing workspace/project binding. Reconciliation is inspection only; unavailable GitHub evidence cannot establish issue completion or a new verified Management summary. No alternate Registry or tracker was created.
