# 03 — Persist and exchange a minimal Mac profile

**What to build:** Let the packaged Mac app create, retain, export, and import a minimal local profile so the chosen versioned-JSON and native-file boundaries are proven before exercise behavior is migrated.

**Blocked by:** 02 — Launch Personal Dashboard as a Mac app.

**Status:** resolved

- [x] The app creates an app-owned, versioned JSON profile without using browser storage or a database.
- [x] A visible change made through the app survives closing and relaunching the packaged application.
- [x] The user can export the minimal profile through a native macOS save interaction.
- [x] The user can select and import a valid exported profile through a native macOS open interaction.
- [x] Import validates the complete selected document before replacing active state.
- [x] Invalid or unsupported input produces a controlled visible failure and leaves valid active state unchanged.
- [x] Persistence and file operations pass through explicit platform boundaries rather than leaking platform mechanics into product behavior.
- [x] Automated tests exercise persistence and exchange through the highest available application seam; real dialogs are reserved for acceptance mode.
- [x] The packaged app remains fully local and offline.

## Answer

Added a schema-version-1 minimal profile owned by the Rust application service.
Normal Mac launches store `profile.json` in Tauri's bundle-specific app data
directory. The application behavior depends only on explicit persistence and
exchange ports; a file-backed persistence adapter and a native-dialog exchange
adapter contain the macOS filesystem and panel mechanics.

The packaged interface now exposes a visible profile label, schema version,
save action, and native export/import actions. Import decodes the entire JSON
document, rejects unknown fields, unsupported schema versions, empty labels,
and labels over 80 characters, and only then atomically replaces the active
app-owned document. Failures are displayed in the profile status region while
the previously valid profile remains active.

Application-seam tests with injected adapters prove relaunch persistence,
export/change/import replacement, and unchanged state after malformed or
unsupported imports. Packaged acceptance on the current Apple Silicon Mac
confirmed a saved visible label survives a true quit and Launch Services
relaunch using a synthetic isolated profile, and confirmed that export and
import open the native macOS save and open panel service. The reproducible
panel procedure is recorded in `docs/acceptance/macos-minimal-profile.md`.

The arm64 bundle still passes packaged launch acceptance without Python or a
listening TCP socket, all 20 completed-baseline workflow tests pass, and the
dependency audit reports no known vulnerabilities.
