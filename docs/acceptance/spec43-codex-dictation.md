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
- Restricted packaged synthetic probe: 469 outbound packets, stable raw user `turn.id`, a final after fixture capture stopped, and aggregate fixture marker coverage passed. This is technical marker coverage, not exact transcript equality or human quality. Full details: [runtime gate record](spec43-wkwebview-runtime-gate.md).
- Basic composer foundation merged on the PR branch at `ec2c77c`: authoritative user finals append once through the original-target draft handler and existing queue. Frontend 203 tests, native dictation/isolation 3 tests and existing Collaboration workflow 15 tests passed; package build passed.
- #46 streaming refinement and #48 Apple retirement are implementing against this committed foundation. Broader lifecycle (#47), original-target packaged persistence, human speech and final acceptance (#49) remain pending. Tickets stay open.
- A restricted temporary thread must explicitly disable filesystem/execution environments, external apps/MCP/plugins, agents and web tools; prompt text is not an execution boundary. Harmless built-in utilities must remain isolated from formal Collaboration messages and operations.
