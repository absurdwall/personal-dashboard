# 18 — Cut over to the Tauri-only Personal Dashboard

**What to build:** Complete the private Mac platform migration by proving full behavioral and data parity, delivering the installable Personal Dashboard bundle, and retiring Python and localhost from the active product without losing the recoverable baseline.

**Blocked by:** 17 — Automatically migrate the completed Mac profile.

**Status:** ready-for-agent

- [ ] Every completed baseline application-workflow scenario passes through the primary Tauri application seam at the same user-visible altitude.
- [ ] The packaged app launches and performs all ordinary product behavior without Python, localhost, a browser, Terminal, network access, an account, or synchronization.
- [ ] Baseline migration succeeds against representative completed state and retains its unchanged rollback source.
- [ ] Both mobile-path gate results remain satisfied for the recorded target iPad and Samsung phone.
- [ ] Real Mac acceptance verifies installation, launch, relaunch persistence, native file interactions, and notification delivery with the window closed.
- [ ] After-Quit notification behavior is documented accurately without being treated as a release gate.
- [ ] The private Apple Silicon Mac application bundle is the sole active product delivery; a DMG may be added but is not required.
- [ ] Python and localhost launch/reminder instructions and active runtime ownership are removed from the current product documentation and implementation.
- [ ] The completed Python version remains recoverable through its durable Git reference and is not maintained as a second edition.
- [ ] No signing, notarization, App Store release, automatic update service, telemetry, new feature area, or generic dashboard framework is introduced.
- [ ] The implementation map and migration documentation truthfully record the completed cutover and any deferred platform limitations.
