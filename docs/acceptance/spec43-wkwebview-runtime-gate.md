# Spec #43 packaged WKWebView runtime gate

Date: 2026-10-03 (America/New_York). Parent [Spec #43](https://github.com/absurdwall/personal-dashboard/issues/43); implementation gate [ticket #45](https://github.com/absurdwall/personal-dashboard/issues/45).

## Observed result

The earliest packaged capability gate passed on the actual Tauri WKWebView at `tauri://localhost/voice-runtime-gate.html`. The first check established microphone capture and local SDP offer generation. A later minimal packaged cloud route also obtained a remote answer, connected peer/data channel, and a nonempty microphone-origin user final carrying a stable server `turn.id`. This establishes technical connectivity; it does **not** establish intended-phrase accuracy, complete stop-tail delivery, all ticket #45 criteria, or human acceptance.

| Observation | Actual result |
| --- | --- |
| Product origin | `tauri://localhost` |
| Secure context | `true` |
| `navigator.mediaDevices` | available |
| `getUserMedia` | available |
| `RTCPeerConnection` | available |
| Microphone track after explicit click | `live` |
| `createOffer` and `setLocalDescription` | completed; SDP exists |
| Local cleanup | audio tracks stopped and peer closed in `finally` |
| Codex cloud connection | first capability check: not attempted; later packaged call: connected |
| Current login / credentials | later call reused existing Dashboard ChatGPT profile; no API key or credential copying |
| Personal Vault | not opened or changed |

The package was compiled from base `735aae8ec9ec8af8f29230133371cb442f39d17e` with a minimal diagnostic overlay. It used the same product identifier, macOS WKWebView, capabilities, entitlements and CSP; an explicit build-config window URL selected the diagnostic page. No Chromium, Python HTTP server or localhost wrapper was used.

## Package identity and isolation

- macOS: 27.0.1, build 26A434; architecture: arm64.
- Native executable SHA-256: `ac8a80e0a2b28f90a57dfef70998520d8027c852eb4a4370108962535b73390d`.
- Temporary package: `/tmp/pd-spec43-runtime.noindex/Personal Dashboard.app`.
- Isolated data directory: `/tmp/pd-spec43-runtime.noindex/profile`; nonexistent baseline override: `/tmp/pd-spec43-runtime.noindex/no-baseline.json`.
- Sanitized observed metadata: `/tmp/pd-spec43-runtime.noindex/result.json` (included below).
- Package launched with macOS `open -n`; native accessibility tree confirmed the page URL and result. The explicit microphone button was clicked, and the tree then confirmed `microphone:true` / `offer:true`.
- The candidate process was terminated after the check and its temporary bundle unregistered from Launch Services. `/Applications/Personal Dashboard.app` was not replaced. The build reused the existing Cargo cache, so its uninstalled build bundle is a diagnostic candidate rather than a normal product build.

```json
{
  "getUserMedia": true,
  "mediaDevices": true,
  "microphone": true,
  "offer": true,
  "origin": "tauri://localhost",
  "peerConnection": true,
  "secureContext": true
}
```

Only these capability booleans and the fixed origin were saved. No audio, SDP or transcript body was saved. The check did not attach remote audio or playback.

## Reproduction

The minimal diagnostic route is checked in as `frontend/voice-runtime-gate.html` / `.ts`; `scripts/acceptance/macos-codex-dictation-gate.sh` builds and relocates a real package into a temporary `.noindex` directory, with isolated app-owned data and an explicit reference to the existing Codex profile. It does not copy credentials or replace the installed app. Click the microphone button for the local offer check; the cloud button starts an authenticated v3/audio call. Stop capture explicitly before leaving. A configured synthetic fixture instead creates a Web Audio stream without using a live microphone or speaker playback.

```sh
scripts/acceptance/macos-codex-dictation-gate.sh
# Optional controlled synthetic input, existing fixture only:
PERSONAL_DASHBOARD_VOICE_GATE_FIXTURE=/absolute/path/to/synthetic.wav \
  scripts/acceptance/macos-codex-dictation-gate.sh
```

The diagnostic only saves allowlisted capability/status metadata, never raw audio, transcript bodies or SDP. Its product-composer button opens the regular UI using isolated application data; explicitly select a synthetic Vault to exercise drafts. The gate's existing-profile override is honored only while `PERSONAL_DASHBOARD_VOICE_GATE_RESULT` is explicitly enabled. The normal product uses its established profile location.

## Cloud protocol observation

A later package at `/tmp/pd-spec43-runtime.noindex/Fixture Gate.app` established a current-login v3/audio WebRTC call under the verified empty-environment, no-business-tool thread configuration. Metadata recorded remote answer, connection `connected`, open data channel and `input_transcript.added`. One live microphone user final was observed with `turn.id`; only character count/identity presence were retained as evidence. Its body is not included here and no intended utterance was provided, so this is not a recognition-quality result.

A controlled synthetic Mandarin/English source subsequently produced user `turn.done` finals carrying `turn.id`, including the ending English and Chinese portion. The early diagnostic displayed the latest final rather than aggregating every turn, so that observation alone does not establish full synthetic-sample coverage. The final guarded, corrected diagnostic at `/tmp/pd-spec43-runtime.noindex/Clocked Gate.app` attached a zero-valued source before SDP and started the fixture immediately when the data channel opened. This avoids a source-less synthetic call that can close before the sample is sent. Its isolated current-login call recorded 469 outbound audio packets, one user final with a stable turn ID (83 characters), and a user final after synthetic capture tracks had stopped. The aggregate marker check found the fixture's `personal dashboard`, `tomorrow`, and Chinese duration markers. This is a marker-coverage and positive tail-event observation, not exact transcript equality or human-quality acceptance. An earlier case-sensitive latest-turn comparison remained false and is not treated as full-match proof.

Final guarded candidate executable SHA-256: `b29d4a63ac15632473c0f4e1bac9fe20867694d092a12d9f7909a95d54b9bb8b`. Sanitized metadata is locally retained at `/tmp/pd-spec43-runtime.noindex/result-clocked.json`; no transcript body is retained as acceptance evidence. The call was explicitly stopped after the check; tracks/peer and temporary thread/client were released.

The product consumes raw WebRTC finals keyed by server `turn.id`. The CLI's normalized flat transcript events omit identity; optional normalized timeline events are not used as authoritative finals, because their availability/correction behavior differs in ephemeral threads. Raw `input_transcript.added` item IDs are provisional preview identities and are not assumed to equal final turn IDs.

## Remaining gate

The implemented transport checks effective config before MCP discovery and rejects configured external servers. It also requires an empty effective MCP catalog before starting a temporary thread. The final corrected technical package passed these guards before exchanging SDP. Startup feature overrides apply only to the dedicated dictation client; the shared profile and formal Collaboration configuration are preserved. The previous empty read-only thread and transcription prompt do not themselves prove absence of tools or service-side delegation. The basic vertical implementation now routes user finals into the existing original-target draft handler and write queue. Broader aggregation, navigation/failure behavior and real product acceptance remain separate checks.

Human Mandarin, English and mixed speech, a continuous segment longer than two minutes, last-sentence retention, cancellation/failure/navigation, and persisted original-target drafts remain unverified. No issue is closed by this evidence.

## Automated validation at the basic vertical checkpoint

- Frontend build passed; full frontend suite: 203 tests passed.
- Dictation transport/isolation: 3 tests passed, including rejection of configured MCP before discovery/initialization and isolation from formal/business requests.
- Existing formal Collaboration workflow: 15 tests passed.
- Basic streaming controller tests verify user-only final text into the editable original-target draft on manual stop, cancellation with late final, and failure for missing authoritative final identity. Original per-session/date draft persistence and shared write queue remain the existing services.

This checkpoint provides the basic mic-to-draft implementation foundation. Ticket #46 expands aggregation/correction/concurrent-edit behavior; #47 expands lifecycle/navigation/failure coverage; #48 retires the unused Apple artifacts; #49 owns the final packaged/human sweep. Intended short human Mandarin/English samples, long speech and final product acceptance remain pending.

The final candidate also opened its regular `tauri://localhost/index.html` UI against the isolated synthetic Vault. A synthetic saved Collaboration session exposed the enabled microphone next to the editable original-date draft, with online-processing copy and no language selector. No speech was captured from that product composer and no message was sent; live mic-to-original-draft product acceptance remains pending.
