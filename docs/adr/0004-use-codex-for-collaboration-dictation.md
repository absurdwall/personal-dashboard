---
status: accepted
---

# Use Codex for Collaboration dictation

For the next voice-input iteration, Collaboration dictation uses Codex WebRTC with the user's existing ChatGPT login, replacing the Apple offline path and manual recognition-language selection. The product has one voice-input provider, so it does not add provider-selection settings or an offline fallback; installed macOS shared speech resources remain managed by the operating system. The user explicitly prefers this route to requiring API keys or a separately billed transcription API, and an isolated short Chinese/English synthetic sample has succeeded with the current account.

Dictation supplies editable draft text that the user sends separately. User transcript events are distinct from assistant speech or replies produced by the underlying realtime service. A conversational voice experience is outside this iteration: the user considers it a separate feature requiring substantial interaction and quality work. The app does not retain the old 60-second automatic-stop policy; dictation stops when the user chooses to stop, with actual service failures handled visibly and received text preserved. Audio handling copy must describe online processing.

Changing the Collaboration session or target date, or leaving Collaboration, stops capture and finalizes received user text into the original session/date draft. Explicit cancellation discards the current dictation input. The user would personally prefer recording to continue after navigation, but accepted stopping for this iteration; background capture is a possible future design, not an unmet requirement of this one.

This is an accepted design direction, not a shipped-product or real-microphone acceptance claim. It supersedes the voice-provider and single-language restrictions in `.scratch/personal-dashboard-lived-day-usability/spec.md`; existing session/target-date ownership and business-write approval boundaries remain applicable. The confirmed development design is recorded in `.scratch/personal-dashboard-codex-voice/spec.md`.
