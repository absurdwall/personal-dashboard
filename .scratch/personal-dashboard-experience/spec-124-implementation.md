# Spec #124 implementation and candidate acceptance

Canonical specification: [#124](https://github.com/absurdwall/personal-dashboard/issues/124), children #125–#131. Integration branch: `codex/experience-grill-20261021`, original base `b0e33f1`. The accepted `CONTEXT.md`, ADR 0007 and sleep/wake prototype were preserved in `0cb490e`; the production App supplies the visual baseline.

## Implementation

- #125: independent selected-Vault sleep record at `life/.personal-dashboard/sleep/v1/sessions.json`, shared Today/manual and Collaboration operations. The get-up calendar date indexes the night; actual endpoint dates/offsets, precision and unknown/unrecorded distinction remain explicit. No Daily Record or Habit-completion copies are created.
- #126: directly visible seven-day onset/get-up curves, gap handling, shared 7/30-day detail and paged lifetime history. Comparable points alone contribute to circular clock means; complete point pairs alone contribute canonical offset-aware duration.
- #127: runtime Task contracts expose required nullable fields, real Task/List identities and supported date/time values. Strict failures, real saved readback and duplicate receipts remain in force.
- #128: canonical reload/navigation discards stale Task editor state. Native acceptance additionally exposed a docked Task panel incorrectly marked modal; the panel now retains labelled nonmodal semantics. The driver uses exact Save matching rather than title substrings.
- #129: fixed control-column width and successful dictation status cleanup, while retaining editable text and incomplete/error warnings. Explicitly feature/env-gated synthetic audio can exercise the real composer and Codex connection without a microphone.
- #130: persistent temporary title and one async first-reply naming attempt, protected by Vault/session/execution identity and naming state. A separate Codex client bounds title latency without locking conversation execution; legacy/manual names remain intact.

## Verification boundaries

The full suites on reviewed integration `bc7a0b5` passed: Rust 576 checks, no failures and 8 ignored opt-in/native cases (`/tmp/pd-124-context/final-reviewed-rust.log`); frontend 578/578 (`/tmp/pd-124-context/final-reviewed-frontend.log`). These replace the earlier integration counts of Rust 574/8 ignored and frontend 571/571.

### Standards

P1 resolved: sleep storage now uses the existing recoverable document writer. The fix is included in `bc7a0b5`; no additional Standards findings were reported for the subsequent #131 harness and diagnostic-hook delta.

### Spec

P2 resolved: delayed clock results crossing a date selection can no longer replace the selected calendar summary. The fix is included in `bc7a0b5`; no additional code findings were reported for the subsequent delta. Final native core/reopen checks passed, while the runtime voice gate remains pending.

The real Task first-call probe passed once each for create/update/delete using `gpt-6-luna` at medium effort, one stable Task ID and exact saved values. The isolated native Task path passed canonical replacement/clear, Tasks/Today/Calendar consistency and an actual process reopen. Those results do not establish final combined #131 acceptance.

## Integrated candidate acceptance

**Final native core and process-reopen checks passed; full acceptance pending real voice.** On October 21 the diagnostic candidate built from reviewed integration `bc7a0b5` passed manual original-wording sleep entry, a real Collaboration correction/supplement preserving the night identity, one real dated Inbox Task, and a generated first-reply title visible in the heading and session list. Tasks detail, Today and Calendar agreed with exact canonical saved values. Habits retained its existing baseline and showed the two seven-day sleep curves; the detail returned onset mean 00:00, get-up mean 07:45 and duration mean 7h 45m, switched to 30 days and retained the June history entry.

One fresh synthetic Vault and the same isolated candidate then retained exact Task content, onset 23:50/get-up 07:20 UTC-04:00 with 450-minute duration, generated title `Correct Sleep Record and Add Inbox Task`, and an editable unsent keyboard draft after actual App stop/reopen. The reopened title appeared in both the session list and heading. Canonical checks confirmed one Task, three nights, unchanged old history, unchanged Daily Record and Habit snapshot hashes, and no automatic Habit-completion document. No second Collaboration message was sent.

Build binary SHA256: `84271b77ee85979e272a84060b2918f6699a8eb45fbf4641803c7d0a91c57b74`. The copied candidate received the guarded acceptance identity and ad-hoc signature, producing SHA256 `6827d0a179adea32d032a1febd45cd4756b3b3a06afddca6d4526b935c2e4244`; that hash stayed unchanged across the whole native run and reopen. Both hashes were rechecked after cleanup.

Evidence: `/tmp/pd-124-context/131-final-core-reopen-native.log`; seven screenshots, reopened accessibility text and canonical synthetic JSON in `/tmp/pd-124-native.noindex/131-final-core-reopen-captures`. The guarded LaunchServices route verified actual foreground/main/focused-window ownership at both launches. The App was stopped and unregistered, and its copied auth removed. The earlier checkpoint in `/tmp/pd-124-native.noindex/131-core-focused-captures` remains supporting evidence, but did not include reopen.

`scripts/acceptance/scenarios/experience-124.sh` ran with explicit core-only mode, skipped dictation, entered a keyboard draft and returned exit 2 after all core/reopen checks passed. Its output states voice remains unmet. The full mode additionally requires real unsent dictation and editable draft preservation; it has not passed.

The native script used explicitly supplied existing Codex auth and a task-owned synthetic WAV gate. No production Vault or `/Applications/Personal Dashboard.app` was used. Earlier real voice probes failed before Recording after service/WebSocket/SDP setup; the final bounded native statistics probe found no candidate pair. The cause remains unresolved. Neither the keyboard draft checks nor connection setup counts as real dictation acceptance. No voice or full #131 pass is claimed.

A local microphone permission preflight diagnostic is prepared behind an additional default-off environment gate. It has not been executed: no microphone request or permission/security change is authorized. The final core-only run explicitly set `PERSONAL_DASHBOARD_VOICE_GATE_LOCAL_MIC_PREFLIGHT=0` and skipped dictation entirely.

Implementation, automated suites, independent review and final core/reopen evidence are recorded on an integration branch. Real voice acceptance remains unmet, so #131 is not complete. Draft PR #132 is published; it remains draft. No main merge, installation, notarization, public release or formal App replacement occurred.
