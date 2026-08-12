# 02 — Launch Personal Dashboard as a Mac app

**What to build:** Deliver the first packaged Personal Dashboard tracer bullet as a real Mac application that launches normally and proves the accepted Tauri, Rust, and plain-web-interface boundary without relying on the completed Python runtime.

**Blocked by:** 01 — Preserve the completed baseline.

**Status:** resolved

- [x] A release application bundle named Personal Dashboard is produced for the current Apple Silicon Mac.
- [x] The bundle can be copied into Applications and launched through normal macOS application launch surfaces.
- [x] Launch requires no Terminal command, separate browser window, localhost server, dynamic port, Python installation, or Python sidecar.
- [x] The visible app identifies Personal Dashboard as the product and exercise tracking as its current feature area.
- [x] The application uses a plain TypeScript, semantic HTML, and CSS presentation connected to a Rust application boundary.
- [x] No unapproved frontend framework, database, external service, account, network dependency, or deployment service is introduced.
- [x] A packaged-app acceptance check proves launch behavior on the current Mac rather than only proving a development build.
- [x] The completed Python baseline remains runnable and unchanged.

## Answer

Added a Tauri 2 application boundary backed by Rust and a framework-free plain
TypeScript, semantic HTML, and CSS interface. The Rust command
`application_identity` supplies the product name, current feature area, and
offline-native readiness status displayed by the packaged window.

The release build produces
`src-tauri/target/release/bundle/macos/Personal Dashboard.app` with an arm64
Mach-O executable. The packaged acceptance check copies the bundle to an
isolated location, launches that relocated copy through macOS Launch Services,
and verifies the bundle identity, arm64 architecture, absence of Python files
or linkage, and absence of a listening TCP socket or Python/localhost child.

Visual inspection of the packaged app confirmed the window exposes Personal
Dashboard, Exercise tracking, the local Rust readiness response, and the
private/offline/native boundaries through accessible semantic content. No
frontend framework, database, external service, account, network dependency,
deployment configuration, or Python sidecar was added. The preserved Python
tag and application source remain unchanged, and all 20 baseline workflow
tests continue to pass.
