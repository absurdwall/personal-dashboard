# Spec 54: native personal-content file permissions

Ticket: [#57](https://github.com/absurdwall/personal-dashboard/issues/57).

The host resolves the Selected vault from the saved workspace and verifies its
binding immediately before sending a turn. A manual turn selects a native named
permission profile with the Vault readable and only `life/` writable. The
managed `.personal-dashboard` tree and `Self.md` are read-only; the existing
habit-display-name file is the specific write exception. Task, completion,
snapshot and memory operations retain their existing business entry points.
Automatic morning turns and explicit review-first requests use the read-only
profile. Redirected `life/` or display-name paths block the turn before granting
permissions. The empty application runtime directory remains the cwd, so Vault
content is context data rather than runtime configuration.

The installed macOS CLI (`codex-cli 0.160.0`) was tested against a synthetic Vault.
Its native command sandbox permits ordinary personal files and relevant
outside-life Vault reads. It rejects outside-life writes, symlink escapes,
managed-store writes, Self.md writes and renaming the protected managed tree.
The automatic profile rejects ordinary personal-file writes. The exact existing
display-name config remains editable.

The probe uncovered an implicit native `CODEX_HOME` permission: root denial by
itself still allowed reading and overwriting a synthetic profile/auth.json.
Specific absolute denial of the app-owned profile and application-data parent
prevents that escape while the host App Server continues managing its own state.
The installed runtime test includes read/write attempts against those synthetic
config/auth files and a separate fixture user HOME. These are rejected. No real
personal records or authentication files were edited.

A real App Server model turn used the same isolated-cwd thread followed by the
manual turn profile and Vault runtime roots. Native `apply_patch` created an
October document from an outside-life reference, and a native patch through a
life-to-project symlink failed. A second real App Server turn rejected a
native patch through a life-to-host-runtime symlink after the explicit
application-data denials were added; it required no approval request. The document was read back; outside-life,
structured-store and Self.md contents remained unchanged. This is installed
Codex runtime evidence, not packaged Personal Dashboard acceptance.

Reproduce the installed command check by setting
`PERSONAL_DASHBOARD_NATIVE_CODEX` to the installed CLI and running:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --lib \
  installed_native_profiles_enforce -- --ignored --nocapture
```

Ordinary document editing uses the native file tools and their patch context.
Guidance requires narrow edits, latest-file reads and post-save readback; it does
not claim that native command writes provide Dashboard revision validation.
Daily Record transitions, identities, operation traces and user-authored text
must be preserved. A native terminal turn re-reads canonical page projections,
Tasks and collaboration context, including stopped/error turns that may have
saved earlier. It retains the request's captured date and composer draft.

Remaining acceptance: the packaged Dashboard in an isolated Vault, including
same-session manual continuation, cross-date ordinary edits, concurrent user
changes, visible-page refresh and reopen persistence. This document does not
substitute for those checks or for MCP/voice acceptance.
