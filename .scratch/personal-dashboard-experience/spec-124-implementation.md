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

The reviewed final source is `7bd6d57`. Its full frontend suite passed 580/580 (`/tmp/pd-124-context/permission-bootstrap-full-frontend.log`), and focused bootstrap/runtime checks passed 13 matrix and 88 runtime cases. Rust code is unchanged from the reviewed 576-pass, zero-failure, 8-ignored suite (`/tmp/pd-124-context/final-reviewed-rust.log`). These replace the earlier integration counts of frontend 578/578 and Rust 574/8 ignored.

### Standards

P1 resolved: sleep storage now uses the existing recoverable document writer. The fix is included in `bc7a0b5`; no additional Standards findings were reported for the subsequent #131 harness, diagnostic hook or permission-bootstrap delta.

### Spec

P2 resolved: delayed clock results crossing a date selection can no longer replace the selected calendar summary. The fix is included in `bc7a0b5`; no additional code findings were reported for the subsequent delta. Integrated native core, real synthetic dictation and actual process-reopen checks have now passed using the same candidate bytes and retained synthetic Vault.

The real Task first-call probe passed once each for create/update/delete using `gpt-6-luna` at medium effort, one stable Task ID and exact saved values. The isolated native Task path passed canonical replacement/clear, Tasks/Today/Calendar consistency and an actual process reopen. Those results do not establish final combined #131 acceptance.

## Integrated candidate acceptance

**Native acceptance passed through a retained-state continuation on October 21.** The final candidate built from `7bd6d57` passed manual original-wording sleep entry, a real Collaboration correction/supplement preserving the night identity, one real dated Inbox Task, and a generated first-reply title visible in both the heading and session list. Tasks detail, Today and Calendar agreed with exact canonical saved values. Habits retained its existing baseline and showed both seven-day sleep curves; detail means were onset 00:00, get-up 07:45 and duration 7h 45m. The 30-day view and June history remained available.

The full core run stopped at permission setup. Its same synthetic Vault/profile and identical candidate bytes were then retained for a minimal voice continuation, without another model/core request. Public LaunchServices registration of an exact task-owned, non-temporary `.noindex` App location succeeded; `NSWorkspace` resolved the acceptance identity to that exact location. Private activation tooling accepted only that complete path, the unique acceptance identity and the verified hash/PID. No product source or candidate bytes changed for the registration correction.

After the user's explicit authorization, the one completed local preflight returned and stopped its physical microphone tracks before the synthetic source was attached to the peer. Safe phase flags confirmed `nativeMicrophoneAuthorization=authorized`, `localMicrophonePreflightRequested=true`, `localMicrophonePreflightStopped=true`, `syntheticOnly=true`, `cloudMicrophone=false` and `microphone=false`. Authorization was already reported as authorized when observed; no Cua Allow click or permission prompt was observed in this continuation. No physical audio was saved, played or attached to the cloud path.

The real composer reached Recording, showed the synthetic preview, stopped and finalized into the existing keyboard draft. The data channel and ICE connected; diagnostics reported `productionFinalizeReturned=true`, `productionIncomplete=false` and `peerClosed=true`. The final transcript containing “personal dashboard” remained editable and unsent, with stale finishing/ready/incomplete status absent. Canonical checks confirmed exactly two saved messages, so dictation did not auto-send.

The draft was edited to `Editable integrated synthetic transcript. 中文 English.`. The same App binary was actually stopped and reopened from the registered location with the local-preflight gate off and no second Start action. Exact Task content, onset 23:50/get-up 07:20 UTC-04:00 with 450-minute duration, Habits get-up mean, title `Correct sleep record and add Inbox task`, session-list title and edited draft all remained visible and canonically saved. One Task and three nights were retained, including the same corrected-night identity and old history. Daily Record and Habit snapshot hashes were unchanged across the continuation and their final bytes matched the original seeded Daily Record and Habit fixture; no automatic Habit completion was created.

Build binary SHA256: `0be93b290d905c96623f75f41ab954c4b9c7813e17a9f4451672a260fb167402`. The isolated acceptance-identity/ad-hoc-signed candidate SHA256 was `e0c71a06addcc4c3dbc44adfe762a90fdf143d050bd7eead0edf5b37301decc4`, identical at both the earlier temporary path and the successful non-temporary location. The final source and isolated hashes were rechecked after cleanup.

Core evidence: `/tmp/pd-124-context/131-bootstrap-retry-full-native.log` and captures 01–06 in `/tmp/pd-124-native.noindex/131-bootstrap-retry-full-captures`. Successful continuation evidence: `/tmp/pd-124-native.noindex/131-registration-continuation/run.log`, captures 07/08, reopened accessibility text, canonical sleep/Task/Collaboration JSON, and safe voice flags in its `captures` directory. The private continuation command and exact-path ownership helpers are preserved beside that log. The continuation exited 0. The App was stopped, its copied auth removed, the test location unregistered, and a fresh public `NSWorkspace` lookup confirmed the acceptance identity no longer resolved.

Reproduction staging requires the same reviewed acceptance bytes and explicitly selected synthetic profile in an approved non-temporary `.noindex` folder: call public `LSRegisterURL(..., true)`, verify `NSWorkspace.urlForApplication` resolves the exact acceptance path, then use `open -n` with the isolated profile, fixed clock, synthetic fixture/result and explicitly authorized preflight gate. Afterward unregister that path and verify identity lookup returns nil. The stock harness still stages under `/tmp`; this successful continuation used a private driver with one exact approved-path whitelist. That helper is a preserved test artifact, not a generalized harness or product change.

Earlier failure evidence remains distinct: core-only runs returned 2 with voice deliberately unmet; the first local-preflight attempt stalled before Recording, and the bootstrap attempt failed closed before getUserMedia. The temporary App's LaunchServices record was later observed as launch-disabled/in-temp-dir, with TCC reporting an application lookup failure. Those failures were not converted to passes. The successful run used explicit public registration at the non-temporary location and completed the pending voice step on retained state. No cause beyond the observed registration failure and subsequent successful setup is inferred.

Implementation, automated suites, independent review and full native acceptance evidence are recorded on the integration branch. PR #132 is published; review readiness and issue closure are tracked on GitHub. No main merge, installation, notarization, public release or formal App replacement occurred. No production Vault or `/Applications/Personal Dashboard.app` was used for acceptance.
