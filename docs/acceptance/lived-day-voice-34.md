# Issue #34: Mandarin / US English composer voice input

Status: implementation tested on Linux and Mac; Apple Speech compilation/capabilities checked on Mac; real speech acceptance outstanding.

## Behavior

The composer contains a microphone button (start / stop), a compact Mandarin / US English selector, and a cancel action while requesting permission, recording, or transcribing. Both target choices stay visible when a capability is missing; recording is disabled with an explicit explanation. Device-local selection is restored after reopening. Other English variants and Chinese regional variants are not substituted, and system language resources are not modified.

Mandarin maps only to the runtime-reported `zh-CN`, `zh-Hans-CN`, or `zh-Hans` identifier, allowing underscore aliases. US English maps only to `en-US`, allowing an underscore alias. The original capability identifier is passed to the existing recognizer. On macOS 26, capabilities come from SpeechTranscriber installed locales. Earlier macOS uses recognizers reporting on-device support and current availability; that probe alone cannot prove model installation or recognition quality. The existing request still requires on-device recognition and reports runtime failure instead of an empty success or another language.

Transcripts append to an editable draft for the captured session and target date and never send automatically. Selection changes cancel pending authorization or capture; transcription already underway retains its original destination and its status identifies that date. Cancel during transcription discards its eventual result. Failed permission, capture, recognition, or empty results leave existing drafts untouched. Failed draft persistence keeps the combined draft in memory for retry.

## Verification (2026-10-02)

- `npm run build`: passed, reusing the existing checkout's installed dependencies; no dependency additions.
- Voice module tests: 15 passed. Covers exact target mapping, unsupported regional variants, preference restoration and storage denial, permissions, empty audio/text, recognition failure, cancellation and late callbacks, session/date binding, editable draft handoff and serialized persistence.
- Existing collaboration surface tests plus voice module tests: 24 passed in the final targeted run.
- Full frontend suite before the final empty-result regression addition: 158 passed, one unavailable external-workspace test. `daily-flow-integration.test.ts` requires the Tortilla Flat `.agents/skills/life-daily-loop/SKILL.md` input, which this cloud workspace does not contain.
- `git diff --check`: passed.

## Outstanding real-device evidence

Local Mac follow-up on 2026-10-02: the complete helper and packaged app compiled on macOS 27.0.1 (`26A434`). The native `capabilities` command reported US English (`en-US`) installed but no installed Mandarin locale (`zh-CN`, `zh-Hans-CN`, or `zh-Hans`). A separate read-only SpeechTranscriber probe confirmed that the OS supports `zh-CN` but has only nine English locales installed (`/tmp/dashboard-resume-speech-capabilities.json`); this is a missing installed model, not absence of OS Mandarin support. Mandarin recording is therefore blocked on this machine without a model installation, which this repair did not perform. US English availability does not establish recognition quality. No microphone recording was performed, and #19 remains open. See the local repair evidence in [lived-day-28.md](lived-day-28.md).

The earlier Linux run could not run the packaged Mac app or compile/check Apple's Speech APIs. No real Mandarin or US English recording was performed in either run, and no simulated audio result is recognition-quality evidence. Issue #19 remains open; its previously observed English (Australia) failures have not been resolved by an acceptance claim.

On a Mac, use an isolated temporary Vault and the existing packaged acceptance workflow. Separately for Mandarin and US English, record live human speech through the microphone button, stop, compare the resulting editable text with the spoken words, correct it, and send manually. Record the OS version, actual capability identifier, transcript errors, and final session/date destination. Also check denial, missing target capability, cancel during permission/capture/transcription, empty result, failure preserving typed text, keyboard start/stop/cancel, restart preference restoration, and switching session/date during transcription (including across 04:00). Inspect saved draft/session facts. These checks must pass before marking the real-recording criteria accepted; this document closes neither #19 nor #34.


Local path diagnosis: manually launching the copied bundle via the `/tmp` symlink caused Tauri resource lookup to reject the executable path (`UnknownPath`), so the composer showed generic voice unavailability. Launching the same candidate through canonical `/private/tmp` resolved bundled resources and returned installed English capabilities through the native IPC, including the US-English composer choice. Resource security was retained; no product voice implementation or system resources were changed. Temporary diagnostic logs/source instrumentation were removed before the final build. This verifies capability plumbing, not recording, recognition quality or manual-send acceptance.
