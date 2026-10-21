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

The full Rust suite on integration `f1205cc` passed 574 checks with 8 ignored opt-in/native cases (root execution log `/tmp/pd-124-context/final-rust.log`). The first broad frontend run had 556 passes and 14 extracted-harness dependency failures. After those fixtures were repaired, 568/570 passed; two real narrow-column geometry failures are assigned to the #128 follow-up and its 23 focused checks passed. A clean broad frontend rerun remains pending.

The real Task first-call probe passed once each for create/update/delete using `gpt-6-luna` at medium effort, one stable Task ID and exact saved values. The isolated native Task path passed canonical replacement/clear, Tasks/Today/Calendar consistency and an actual process reopen. Those results do not establish final combined #131 acceptance.

## Integrated candidate acceptance

**Partial core checkpoint passed; full acceptance pending.** On October 21 the packaged candidate with SHA256 `a0fffc4c111fb13e7d8174644881f882f4d4a62c3d634f142743ecf1216c973d` passed manual original-wording sleep entry, a real Collaboration correction/supplement preserving the night identity, one real dated Inbox Task, and a generated first-reply title visible in the heading and session list. Tasks detail, Today and Calendar agreed with exact canonical saved values. Habits retained its existing baseline and showed the two seven-day sleep curves; the detail returned onset mean 00:00, get-up mean 07:45 and duration mean 7h 45m, switched to 30 days and retained the June history entry. The one candidate and synthetic Vault were unchanged throughout this checkpoint.

Evidence: `/tmp/pd-124-context/131-core-focused-native.log`, six screenshots and canonical synthetic JSON in `/tmp/pd-124-native.noindex/131-core-focused-captures`. That run deliberately returned exit 2 before voice or process reopen. Earlier direct-launch attempts exposed a missing modal accessibility subtree while the owned window was inactive; the guarded LaunchServices route verified actual foreground/main/focused-window ownership and the modal path passed. All profiles were task-owned and the stopped profile's copied auth was removed.

`scripts/acceptance/scenarios/experience-124.sh` now supports an explicit core-only mode that skips voice, enters a keyboard draft and continues through actual App stop/reopen. It still returns exit 2 and reports voice unmet. This extension has not yet run; the review follow-up fixes require a new candidate build and rerun. The full mode additionally requires real unsent dictation and editable draft preservation. Both modes preserve canonical source snapshots and native captures separately from credentials.

The native script must run on the final diagnostic candidate with an explicitly supplied existing Codex auth path and task-owned synthetic WAV. No production Vault or `/Applications/Personal Dashboard.app` is used. The real voice probes failed before Recording after service/WebSocket/SDP setup; the final bounded native statistics probe found no candidate pair. The cause remains unresolved. Neither a controlled viewport pass nor connection setup counts as real dictation acceptance. No voice or full #131 pass is claimed.

The implementation is on an integration branch; final review fixes, independent Standards/Spec review and final native acceptance remain separate from merge/publication. No installation, notarization, public release or formal App replacement is authorized by these checks. Final evidence will be recorded only after those steps actually finish.
