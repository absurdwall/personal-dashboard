# 18 — Cut over to the Tauri-only Personal Dashboard

**What to build:** Complete the private Mac platform migration by proving full behavioral and data parity, delivering the installable Personal Dashboard bundle, and retiring Python and localhost from the active product without losing the recoverable baseline.

**Blocked by:** 17 — Automatically migrate the completed Mac profile.

**Status:** resolved

- [x] Every completed baseline application-workflow scenario passes through the primary Tauri application seam at the same user-visible altitude.
- [x] The packaged app launches and performs all ordinary product behavior without Python, localhost, a browser, Terminal, network access, an account, or synchronization.
- [x] Baseline migration succeeds against representative completed state and retains its unchanged rollback source.
- [x] Both mobile-path gate results remain satisfied for the recorded target iPad and Samsung phone.
- [x] Real Mac acceptance verifies installation, launch, relaunch persistence, native file interactions, and notification delivery with the window closed.
- [x] After-Quit notification behavior is documented accurately without being treated as a release gate.
- [x] The private Apple Silicon Mac application bundle is the sole active product delivery; a DMG may be added but is not required.
- [x] Python and localhost launch/reminder instructions and active runtime ownership are removed from the current product documentation and implementation.
- [x] The completed Python version remains recoverable through its durable Git reference and is not maintained as a second edition.
- [x] No signing, notarization, App Store release, automatic update service, telemetry, new feature area, or generic dashboard framework is introduced.
- [x] The implementation map and migration documentation truthfully record the completed cutover and any deferred platform limitations.

## Comments

The active source tree and product documentation now have one runtime: the
Tauri application and its shared Rust core. The completed Python product is
preserved at the annotated `python-exercise-tracker-complete` tag rather than
maintained as a parallel edition. The parity inventory and platform evidence,
including the deliberately limited mobile claims and non-gating after-Quit
observation, are recorded in `docs/acceptance/tauri-cutover.md`.

## Answer

Completed the Tauri-only cutover. All 20 completed-baseline scenarios map to
passing application-seam coverage, the full Rust suite passes 50 tests, and the
packaged Apple Silicon Mac app passes the no-Python/no-localhost acceptance
gate. The final source also compiles for ARM64 iOS and produces an unsigned iOS
archive and ARM64 Android debug APK; earlier physical-device installation gates
remain recorded without overstating final mobile parity. Active Python source,
tests, and launch instructions were removed only after the recoverable baseline
tag and migration path were verified.
