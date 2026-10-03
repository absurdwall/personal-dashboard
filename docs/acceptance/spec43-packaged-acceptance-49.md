# Spec #43 packaged candidate acceptance

[Ticket #49](https://github.com/absurdwall/personal-dashboard/issues/49), 2026-10-03, America/New_York. Product implementation is complete on the draft PR; packaged acceptance is incomplete. This record separates normal composer checks, diagnostic transport evidence and pending human speech acceptance. The issue and parent Spec remain open.

## Candidate and isolation

The normal `index.html` Collaboration composer runs in packaged WKWebView at `/tmp/pd-spec43-final.noindex/Personal Dashboard.app`, version 4.0.4, window title `Personal Dashboard Spec43 Candidate`. The final build uses source `027386d6abb0c0d9b8f1a1af27d670395b43e9c6`: production implementation `9e16eae04ac83e893707a25724e446a576871395` plus state-only, environment-gated diagnostics and a repeatable acceptance script. Executable SHA-256 is `acab37028666bcf0d2b7c748fb1eb331a6eb3768cae31c441a9e73d4a102ef77`. At handoff, PID 43570 is idle with an editable synthetic draft.

The unique bundle/build identifier is `com.tortillaflat.personal-dashboard.spec43candidate.78b1c3ee67404769a8bf0e040ddd1a09`. Native data, selected-Vault pointer, English preferences, synthetic Vault and runtime working directory reside inside the task's noindex directory. The final candidate uses the default persistent WKWebView store. Metadata confirmed newly created WebKit/cache directories for this exact unique identifier, independently of the daily installation. No personal store contents were inspected.

An explicit `dataStoreIdentifier` overlay failed Tauri code generation (`Vec<u8>` versus `[u8; 16]`). An initial incognito candidate and the final persistent configuration both stalled on microphone permission; the evidence does not establish incognito as the cause. No dependency, security or global privacy change was made.

Dictation and deliberate formal text submission reference the existing Dashboard-owned ChatGPT profile directly through the explicit acceptance hook. Credentials were not copied or logged; neither an API key nor the general Codex profile was selected. Its ordinary private-profile lifecycle may update app-owned configuration or refresh authentication. Only `codex_home_dir` routes to that existing auth profile; process working directories and schema probes remain in isolated app data.

The final package build and `codesign --verify --deep --strict` passed. Microphone usage description/audio-input entitlement are present; speech recognition permission and Apple speech-helper resources are absent. Exact test bundle paths were unregistered from Launch Services after checks; the normal candidate remains running. The daily `/Applications/Personal Dashboard.app` identifier/version/executable matched the before-check baseline (4.0.4, SHA-256 `27a48bbeb5b698ac8f0ed849706213a12e71678565458e26e6684f994cc8cc19`). Both synthetic Daily Record file hashes remained unchanged. No daily bundle replacement occurred.

## Actual final normal composer checks

| Check | Observed result | Limit |
| --- | --- | --- |
| Editable original-target draft | Chinese/English draft saved in session A/date October 3; independent October 2 and session B drafts retained. | Typed text supports persistence, not spoken transcription. |
| Failed save, navigation, retry | A bounded synthetic-directory barrier produced visible “Draft could not be saved”. After restoring the directory, newer unsaved memory survived A→B→A and October 3→2→3. A subsequent edit saved and cleared the error. | Barrier restored in `finally`; no restart occurred while it was present. |
| Relaunch | Cmd-Q exited the exact candidate; relaunch with the same isolated profile restored A/October 3, A/October 2 and B/October 3 drafts after opening Collaboration. | Startup destination/session selection is separate from native per-target draft persistence. |
| Deliberate manual text Send | Explicitly clicked Send once for a harmless synthetic request forbidding tools/record changes. One new user message (113 characters) and one assistant reply (8 characters) completed on A/October 3. A draft cleared normally after Send; other target drafts retained. | This is a real text-path completion, not the human spoken/edit/manual-send criterion. An earlier preliminary build separately completed one request. |
| Real microphone Start→bounded wait→Cancel | Final repeatable loop returned `permission-pending`, 16 seconds, `cancelled: true`; retained draft survived. No Recording state was reached. | No captured audio, transcript quality or physical microphone release can be asserted. |
| Pending request departure | Session switch stopped the permission-request state; each session's draft retained. Window close/reopen stopped that state and restored the original retained draft with idle Start action. | Pending-request UI/lifecycle evidence; active capture/peer cleanup remains unverified in this candidate. |
| Formal-message separation | Editing, failed saving and pending/cancelled dictation created no formal messages. Only the deliberate Send added the completed pair. | No successful final-candidate dictation append was available. |

The script is `scripts/acceptance/macos-codex-dictation-mic-loop.sh`; actual invocation was `bash scripts/acceptance/macos-codex-dictation-mic-loop.sh '/tmp/pd-spec43-final.noindex/Personal Dashboard.app' /tmp/pd-spec43-final.noindex/macos-ui-driver`. Its exit 1 correctly records a failed Recording gate, not a pass. It targets exactly one task-owned process, suppresses AX/body output, bounds the wait and cancels on exit.

Final build command: `CARGO_TARGET_DIR=/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/src-tauri/target npm run build:mac -- --config /tmp/pd-spec43-final.noindex/candidate-config.json`. Frontend 231 tests passed; native 380 tests passed on the final production source, and native check/build passed with the gated diagnostics. Source-review repairs and their targeted evidence are recorded in [review fixes](spec43-review-fixes.md); automated mocks and suites do not replace these packaged outcomes.

## Microphone and cloud diagnosis

Three hypotheses guided bounded checks: fresh bundle OS authorization, WKWebView capture and a composer-specific failure. Both AX activation and trusted keyboard activation stalled before microphone acquisition. A minimal `getUserMedia` probe under the same unique identifier also remained pending, weakening the composer-only hypothesis. No Allow/Deny dialog was visible in the candidate UI or inspected OS surface.

Read-only exact-identifier system-log metadata contained authorization/prompt markers, with no confirmed grant/denial outcome. Exact Launch Services metadata showed the temporary paths were registered during diagnosis. Using the already-loaded `AVCaptureDevice` class through existing dependencies, the gated native read reported `not-determined`. One controlled native audio permission request also remained pending after its 15-second bound, with authorization still `not-determined`. The diagnostic process was quit before final normal packaging. No red→green result established a product preflight fix; none was added. These signals describe an unresolved OS authorization/capture gate, not a proven cause.

In a fresh synthetic-only gate process with no prior pending microphone request, existing auth and isolated runtime cwd obtained a remote SDP answer. Fixture source was ready before offer, audio context was running, signaling was stable, but peer/ICE stayed `new`, outbound packet count was `0`, and no data channel or raw user frames arrived. Stop reported closed peer and stopped capture; the gate was then quit. Final candidate cloud transcription is therefore unverified. Earlier [ticket #45 packaged runtime evidence](spec43-wkwebview-runtime-gate.md) established transport and synthetic marker support in its own candidate; it does not substitute for this final candidate's failed gate.

The gated raw-field diagnostic records only bounded field names, count strings and cross-reference booleans. No transcript/audio/SDP/account/credential or raw ID values are written. Because this run received no user frames, live linkage metadata remains unobserved. Source inspection still finds preview-item and final-turn identifiers without a verified association. Preserved labeled unconfirmed previews may overlap final text, and the result remains incomplete. Full final-correction/no-duplicate acceptance remains an open protocol gate; there is no verified whole-input-flush acknowledgement.

## Remaining acceptance

- Resolve the final unique bundle's physical microphone acquisition and connected cloud transcription; rerun normal Start→Recording→Stop/Cancel and capture/peer cleanup checks.
- A human must speak Mandarin, English, mixed Chinese/English and proper names, edit the result and deliberately send a harmless request. Record actual recognition errors and stop-to-final/save latency.
- Speak continuously for at least two minutes with known beginning/middle/final markers. Confirm no duration cap and complete tail, retaining incomplete status where the protocol cannot confirm it. The finite four-second post-stop wait is not a recording timer.
- During intentional speech, exercise session/date/Today departure, 04:00 ownership, window close/Cmd-Q, service faults and controlled network interruption; verify physical capture cessation, original-target retention, no automatic retry and no duplicate/cross-target append.
- Establish authoritative preview/final linkage and complete-tail confirmation before claiming final correction or no duplicates.

Human availability was not confirmed. Synthetic fixtures, mock clocks, typed persistence/Send and old packaged transport evidence do not satisfy human speech acceptance. The candidate is available for inspection but is not ready for default installation or PR merge.
