# Codex-only candidate: Apple retirement (#48)

Date: 2026-10-03. Canonical specification: [#43](https://github.com/absurdwall/personal-dashboard/issues/43); retirement ticket: [#48](https://github.com/absurdwall/personal-dashboard/issues/48).

## Implemented boundary

The app-owned Apple recognition helper, Swift build step, temporary encoded audio/transcription module, Speech capability/authorization commands and both IPC registrations are removed. The Mac resource map no longer packages the helper. The microphone entitlement remains; Speech authorization is no longer requested. Its permission explanation now states that explicitly started dictation processes audio online through Codex and produces editable text for manual sending.

The old MediaRecorder controller, 60-second timer, installed-language matching, and recognition-language preference use are removed. No stored user preference or system language resources are deleted. Shared target/draft routing and the per-session/date write queue remain. The interface contains no language/engine selector or missing-model guidance; online processing and review copy remain in Chinese and English, with the privacy explanation linked to the microphone for accessibility. Historical Apple acceptance records are unchanged.

## Verified on the retirement branch

- `npm run build` passed.
- `npm run test:frontend` passed: 192 tests. The old Apple-only expectations were removed; draft identity, shared manual-send queue, concurrent draft merge and save-failure recovery remain covered. Streaming controller behavior is covered by the Codex controller tests and the separate #46 acceptance work.
- `cargo test --manifest-path src-tauri/Cargo.toml` passed: 375 tests across 26 result groups, including empty binary/doc-test groups.
- `npm run build:mac` passed for an Apple Silicon app, using the existing dependencies and the existing noindex Cargo target. A final build also removes the now-unused `AppHandle` import.
- Static source scan found no Apple helper path, helper compilation, Apple recognition commands, language preference use or Speech permission key in the current frontend/native route.
- Candidate copied to `/tmp/pd-spec43-ticket48-retirement.noindex/Personal Dashboard.app`. Recursive bundle scan found no Apple voice helper or Speech resource. Its plist has the online Codex microphone explanation and no `NSSpeechRecognitionUsageDescription`; signed entitlements retain `com.apple.security.device.audio-input=true`. The executable has no Speech/AVFAudio framework dependency. Ad-hoc signature verification passed.

Launch Services unregister was requested for this copy and the task build copy; the tool reported a Spotlight scan warning (`-10814`) for the noindex paths. A subsequent `lsregister -dump` contained neither exact bundle path. No candidate was launched or substituted for `/Applications/Personal Dashboard.app`; no personal Vault/profile, credential or shared macOS language data was changed.

## Pending product acceptance

Bundle/source checks establish retirement, not microphone-to-cloud delivery. The final integrated candidate still requires the #49 gate for actual microphone input, Mandarin/English/mixed-language quality, two-minute continuous dictation, trailing words, navigation/cancellation/failure/close behavior, persisted draft recovery, and ordinary Collaboration/business-review/interface-language regression. #48 remains open while that human/product evidence is pending; no cloud probe or recognition-quality claim is added here.
