---
status: accepted
---

# Delegate Vault cloud synchronization to the desktop client in 3.0

Personal Dashboard 3.0 will open a local, user-selected Vault, including an entire Obsidian Vault synchronized by Google Drive for desktop. Settings will provide a clear Google Drive usage path and local Vault selection; in-app Google account authorization and app-managed cloud synchronization are deferred because they would require managing a shared local copy, uploads, offline changes, and conflicts for the whole Vault.

This is an accepted design boundary, not a claim of shipped support. Compatibility with synchronized folders still requires validation; successful local saving must not be presented as confirmed cloud synchronization. Initial recovery guidance can use Drive's existing version and trash facilities without promising whole-Vault point-in-time restoration.
