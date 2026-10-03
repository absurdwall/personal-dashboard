# Spec #43: Codex dictation implementation and acceptance

Canonical specification: https://github.com/absurdwall/personal-dashboard/issues/43.
Implementation graph: #45 → #46 → #47; #45 → #48; #47 + #48 → #49.

The first gate is real packaged macOS WKWebView microphone capture, WebRTC SDP exchange, existing ChatGPT authentication and user transcription. A Chromium prototype does not satisfy it. If the gate fails, record the technical gap and keep dependent work incomplete.

Candidate bundles stay in temporary `.noindex` directories. This work does not replace the daily installation or authorize a PR merge. Automated checks, packaged connectivity, human speech quality and user acceptance are recorded separately. Tickets and Spec #43 stay open pending their required evidence.

## Current evidence

- Base: `55f2955` (current `origin/main` at implementation start).
- Baseline frontend suite: 200 tests passed before implementation.
- Initial packaged capability probe: `tauri://localhost` is a secure context; live microphone capture, `RTCPeerConnection`, `createOffer` and `setLocalDescription` passed. Capture and peer were released after the probe. This probe used isolated app data and did not access a Vault or account.
- Packaged cloud connectivity probe: current ChatGPT profile, WebRTC v3/audio, remote SDP answer, connected peer and open data channel passed. Raw user transcript events arrived; no assistant audio was attached for playback. This is connectivity evidence, not human dictation acceptance.
- Final-text identity/tail handling, draft behavior, restricted-thread integration, human speech quality and full acceptance remain pending. Connectivity success does not complete ticket #45.
- A restricted temporary thread must explicitly disable filesystem/execution environments, external apps/MCP/plugins, agents and web tools; prompt text is not an execution boundary. Harmless built-in utilities must remain isolated from formal Collaboration messages and operations.
