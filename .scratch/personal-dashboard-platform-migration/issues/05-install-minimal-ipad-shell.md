# 05 — Install the minimal shell on the target iPad

**What to build:** Prove that the accepted Tauri foundation reaches the actual target iPad by compiling, installing, and launching a minimal Personal Dashboard shell before the completed Python runtime can be retired.

**Blocked by:** 03 — Persist and exchange a minimal Mac profile; 04 — Deliver a notification with the Mac window closed.

**Status:** ready-for-agent

- [ ] The target iPad model and current iPadOS version are recorded before the gate runs.
- [ ] The project initializes and builds the iOS/iPadOS target without creating a second product implementation.
- [ ] A minimal Personal Dashboard shell installs and launches on the actual target iPad.
- [ ] The shell identifies Personal Dashboard and renders through the shared interface foundation.
- [ ] The result proves toolchain and device reachability only and does not claim exercise-feature or notification parity.
- [ ] Any platform limitation, manual provisioning step, or unresolved risk is recorded as a gate result.
- [ ] Failure stops dependent migration work without modifying or bypassing the completed baseline.
- [ ] No App Store distribution, production mobile design, profile transfer, or full mobile behavior is added.
