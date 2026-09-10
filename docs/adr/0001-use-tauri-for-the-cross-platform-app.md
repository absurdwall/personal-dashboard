---
status: superseded by ADR-0002
---

# Use Tauri 2 for the cross-platform app

The Tauri foundation remains current. ADR-0002 supersedes this record's
Exercise-first scope and automatic Exercise/Profile migration decision.

Evolve Personal Dashboard in this repository into a Tauri 2 app. Exercise tracking is its current feature area, but the product name and application boundary allow later functions without requiring a speculative generic framework now. Tauri provides one credible application foundation for a launchable Mac app and later standalone iPad and Android apps while allowing a shared interface that need not imitate native controls. The shipping app will replace the Python localhost runtime rather than permanently wrap it; the completed web version remains recoverable through Git history, its behavioral contract, and automatic data migration.

## Considered Options

- Flutter offered one mature multi-platform UI implementation but would discard the current web presentation approach and introduce Dart as the product runtime.
- Separate SwiftUI and Android applications offered the strongest platform-specific interfaces but would duplicate application behavior and increase drift risk.
- Electron, a PWA, or a permanent Python sidecar could accelerate the Mac package but would not provide the chosen single-foundation path to iPad and Android.

## Consequences

- Tauri and its required build dependencies are approved for this direction; other dependencies still require explicit approval.
- A shared Rust core will own product behavior, state transitions, validation, migrations, and persistence orchestration. Plain TypeScript, semantic HTML, and CSS will own presentation and temporary UI state; no additional frontend framework is approved initially.
- The app will keep versioned, file-backed JSON and thin platform adapters for notifications, persistence, file access, clock and timezone behavior, and lifecycle.
- The first private Mac delivery is a real `.app` that can be copied into Applications; a DMG is optional, while signing, notarization, public distribution, and automatic updates are deferred.
- Native notifications after normal Quit are desirable but are not a release gate. Required behavior will be fixed by a capability check before the full migration begins.
- Future iPad and Samsung-phone editions must provide the complete standalone product and use deliberate profile moves while synchronization is absent.
- Migration uses a two-stage capability gate. First, a bounded Mac check must prove an app launch without Python or localhost, versioned JSON persistence, native file export and import, and a notification while the window is closed. Before the Python runtime is removed, minimal shells must also compile and install on the target iPad and Samsung phone; mobile feature and notification parity remain later work.
