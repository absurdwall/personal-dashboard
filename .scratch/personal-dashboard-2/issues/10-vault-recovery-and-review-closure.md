# 10: Recover Vault selection failures and reconcile transitions

Type: task
Status: resolved
Blocked by: none; require reviewed tip ee0467d or its descendants

## Scope

Follow-up to the independent Luna/max review of a388690...ee0467d. The user has accepted the current visual experience. Preserve frozen FINAL and the accepted UI; this is behavior/recovery and evidence completion, not a redesign. Read ../repair-decisions.md and ../final-review-follow-up.md.

## Acceptance criteria

- [x] Reproduce malformed/unsupported app-owned workspace settings preventing the native Vault picker from opening. Allow explicit selection to recover without requiring manual file deletion. Do not treat arbitrary permission/I/O failures as empty settings or overwrite them silently.
- [x] Define and test selection commit/failure semantics: if reading a chosen Vault fails, preserve the previous selection/UI or reconcile to the committed selection with a visible recoverable error. Never silently retain A content while persistence selects B.
- [x] Reproduce a superseded selection result and an in-flight Habits save during selection with controlled deferred responses. A dropped presentation response must not drop global Vault reconciliation; drafts and pending saves need explicit safe outcomes, without cross-Vault writes. Existing stale-binding write rejection remains intact.
- [x] Preserve cancel and same-Vault no-op behavior for drafts, correction state, selected date and phase. Do not regress the recently fixed paths.
- [x] Surface initial Calendar/read/switch failures in the active destination, ending the loading state; do not route errors only to hidden Today status or leave rejected promises unhandled.
- [x] Add executable behavioral tests for the failures/races above, plus isolated packaged picker/active-page checks. Source regex tests may remain smoke checks but are not behavior or visual evidence. Scope relevant AX checks to the visible active destination so hidden stale content cannot satisfy them.
- [x] Reconcile the required 08/09 state/size evidence matrix: identify genuinely missing combinations and check them, including Calendar empty/unreviewed and Habits edit/correction at the required sizes. Do not blindly rerun passing scenarios or mark missing evidence complete.
- [x] Run appropriate regression checks and independent Standards/Spec code review. Record exact commit/bundle identity and verification limits. Reconcile ticket 08's unchecked checklist with evidence; do not tick unverified items. Ensure repair-decisions.md is included in the bounded planning handoff so fresh worktrees have it.

## Closure

Ticket 09 depends on this result. Existing user visual acceptance is recorded and does not need to be asked again unless visible behavior/design changes. Do not close 09 while required behavior or evidence gaps remain. No real-data writes, live producer/skill edits, Dida365, automations, repeat cutover, dependencies or broad CSS refactor are authorized. Reproduce with disposable synthetic data. Optional CSS consolidation is not a closure blocker.

## Answer

Implemented and verified in two scoped commits:

- `0799c34` — `fix(dashboard): reconcile Vault selection failures`
- `5e4ddf4` — `test(dashboard): expand final state matrix evidence`

The backend now classifies the app-owned workspace setting as missing,
recoverable malformed/unsupported JSON, or a hard I/O error. An explicit native
Vault choice can repair the recoverable cases. The chosen Vault is read before
the setting is committed, and both read and commit failures preserve the prior
committed selection. The frontend now keeps Vault-selection freshness separate
from Today presentation freshness, reconciles a real switch even when an older
Today response was superseded, waits for an in-flight Habits save before
opening the picker, and reports Calendar read/switch failures in the visible
active destination with loading ended.

The behavior tests execute these paths: Rust covers malformed recovery, hard
workspace I/O, unreadable-new-Vault, failed commit, cancel, same-Vault, and
cross-Vault isolation; frontend tests execute deferred superseded-result and
pending-Habits-save paths; the existing stale target-binding rejection remains
passing. The packaged `vault-recovery`, `vault-selection`, and
`final-state-matrix` scenarios passed against disposable profiles. The matrix
checked Calendar reviewed/unreviewed/empty summaries, Habits edit/correction
states, long Today text, and Daytime focus at 1180x820, 800x640, and 640x520,
using visible active-destination AX checks.

Verification:

- `npm run test:frontend` — 19 passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` — 152 Rust tests passed;
  doc-tests passed.
- `npm run build` — passed; `npm run build:mac` — passed.
- `bash -n scripts/acceptance/macos-ipc-workflow.sh`, Swift parse, Rust
  formatting check, and `git diff --check` — passed.
- Packaged executable SHA-256:
  `d93c586aaaf5fbd0a23b66215b2e6a05094cef7618c830e87b91506ba14e9e0c`.

Independent Standards and Spec review of `ee0467d..5e4ddf4` found no blocking
issue. `repair-decisions.md` and the final review handoff are included with
the bounded scratch handoff. No prototype, real data, producer skill, Dida365,
TickTick, automation, dependency, or cutover state was changed.

Ticket 09 is no longer blocked by this issue, but remains `ready-for-human`:
the user retains final product acceptance and closure.
