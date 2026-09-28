# Manual acceptance feedback — 2026-09-27

Captured from the user's first hands-on run of the installed Personal Dashboard 4.0.0 collaboration workspace. These are observations for later triage; no implementation change is authorized by this note.

## User-reported flow

- The app completed local Codex App Server checks, confirmed the read-only runtime boundary, and connected to ChatGPT.
- A text message was sent and received a response. The user noticed the response took a while, but confirmed the flow worked.
- Reaching and clicking the message composer took repeated attempts; it was unclear whether a new session had to be created first.

## Observed in the follow-up check

- The app displayed `Microphone permission was denied; the existing draft was kept.` Clicking **Start recording** again did not open a macOS permission prompt or change the visible state. No audio was recorded during this follow-up check.
- Accessibility state showed ChatGPT connected and the prior text exchange in the selected session.
- The selected session's message field accepted an accessibility click and received focus, so the pointer-hit difficulty was not reproduced here. Source state disables the composer when there is no selected session (and while connection/Vault prerequisites are unmet); when starting without a session, use **New chat** first. The user-facing distinction should be clearer than a wait cursor.
- macOS 26.5.1 System Settings lists no Personal Dashboard entry under **Privacy & Security → Microphone** after that attempt. The installed app bundle does contain `NSMicrophoneUsageDescription`. No privacy setting was changed.
- **Speech Recognition** lists no app. On this macOS 26.5.1 build, the app's helper uses the on-device `SpeechTranscriber` path and bypasses the older Speech Recognition authorization prompt; do not enable the separate Speech Recognition permission for this test.
- The permission failure's root cause is still unconfirmed; the current evidence points to the microphone request not reaching a normal macOS permission prompt, despite the usage description being present.

## Cursor feedback

- The user sees a blue spinning wait cursor over **Send**, **Start recording**, and previously **Connect to ChatGPT**, and interprets it as “not clickable.” This report is not a claim that all three controls are always disabled.
- Source inspection confirms that the shared `button:disabled` CSS sets `cursor: wait`. **Send** is disabled when its draft is empty or its session/connection prerequisites are unmet. **Connect to ChatGPT** is disabled when no CLI executable has been discovered. **Start recording** is disabled while speech capability is loading, when no installed locale is selected, or during parts of the recording/transcription flow.
- The cursor therefore marks a disabled control in these cases, but its wait appearance does not explain *why* the control is disabled and can be confused with an in-progress operation. Permission denial itself is currently shown as status text and does not disable the recording button.

## Follow-up

- To test actual voice capture and transcription, the app needs macOS microphone access. Current status is denied, and the app did not reopen a permission prompt; leave the OS privacy setting unchanged until the user enables it.
- Triage the composer hit target, permission-recovery guidance, and disabled-control cursor/state distinction after the user finishes this acceptance pass.
