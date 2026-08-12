# 06 — Install the minimal shell on the target Samsung phone

**What to build:** Prove that the accepted Tauri foundation reaches the actual target Samsung phone by compiling, installing, and launching a minimal Personal Dashboard shell before the completed Python runtime can be retired.

**Blocked by:** 03 — Persist and exchange a minimal Mac profile; 04 — Deliver a notification with the Mac window closed.

**Status:** ready-for-agent

- [ ] The target Samsung model and current Android version are recorded before the gate runs.
- [ ] The project initializes and builds the Android target without creating a second product implementation.
- [ ] A minimal Personal Dashboard shell installs and launches on the actual target Samsung phone.
- [ ] The shell identifies Personal Dashboard and renders through the shared interface foundation.
- [ ] The result proves toolchain and device reachability only and does not claim exercise-feature or notification parity.
- [ ] Any platform limitation, developer-mode step, permission issue, or unresolved risk is recorded as a gate result.
- [ ] Failure stops dependent migration work without modifying or bypassing the completed baseline.
- [ ] No Play Store distribution, production mobile design, profile transfer, tablet support, or full mobile behavior is added.
