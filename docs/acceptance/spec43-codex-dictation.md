# Spec #43: Codex dictation implementation and acceptance

Canonical specification: https://github.com/absurdwall/personal-dashboard/issues/43.
Implementation graph: #45 → #46 → #47; #45 → #48; #47 + #48 → #49.

The first gate is real packaged macOS WKWebView microphone capture, WebRTC SDP exchange, existing ChatGPT authentication and user transcription. A Chromium prototype does not satisfy it. If the gate fails, record the technical gap and keep dependent work incomplete.

Candidate bundles stay in temporary `.noindex` directories. This work does not replace the daily installation or authorize a PR merge. Automated checks, packaged connectivity, human speech quality and user acceptance are recorded separately. Tickets and Spec #43 stay open pending their required evidence.

## Current evidence

Implementation started; packaged runtime gate and all acceptance criteria pending.
