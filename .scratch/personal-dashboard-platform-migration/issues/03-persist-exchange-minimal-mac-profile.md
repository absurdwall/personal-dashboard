# 03 — Persist and exchange a minimal Mac profile

**What to build:** Let the packaged Mac app create, retain, export, and import a minimal local profile so the chosen versioned-JSON and native-file boundaries are proven before exercise behavior is migrated.

**Blocked by:** 02 — Launch Personal Dashboard as a Mac app.

**Status:** ready-for-agent

- [ ] The app creates an app-owned, versioned JSON profile without using browser storage or a database.
- [ ] A visible change made through the app survives closing and relaunching the packaged application.
- [ ] The user can export the minimal profile through a native macOS save interaction.
- [ ] The user can select and import a valid exported profile through a native macOS open interaction.
- [ ] Import validates the complete selected document before replacing active state.
- [ ] Invalid or unsupported input produces a controlled visible failure and leaves valid active state unchanged.
- [ ] Persistence and file operations pass through explicit platform boundaries rather than leaking platform mechanics into product behavior.
- [ ] Automated tests exercise persistence and exchange through the highest available application seam; real dialogs are reserved for acceptance mode.
- [ ] The packaged app remains fully local and offline.
