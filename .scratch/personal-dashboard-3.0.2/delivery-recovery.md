# Personal Dashboard 3.0.2 release and installed delivery

Status: complete
Completed: 2026-09-26

## Authorization and source

After Tickets 01–04 were resolved, the user explicitly authorized the bounded release-version PR, 3.0.2 build/acceptance, installation to `/Applications/Personal Dashboard.app`, preservation of a 3.0.1 recovery copy, reversible duplicate-launch-entry cleanup, and final local/Management synchronization. This later authorization superseded the specification's original no-install boundary for this delivery only. No later ticket was started.

- PR #5 was verified merged at `1d53e1e7b9b6ba8306a511abd3f9e358202e51a0`.
- Release PR [#6](https://github.com/absurdwall/personal-dashboard/pull/6) was merged to `main` at `efa5847ac81e463ba499f2a01ba81a5a6a979940`; version-only head commit `a66235fa056995f094721cdfb37c6e1f5ff03166` synchronizes package, lockfile, Tauri, Cargo, and version-test declarations to 3.0.2. The bundle id remains `com.tortillaflat.personal-dashboard`.
- Two-axis release review completed with no findings.

## Validation

- `npm run check`: passed.
- Full Rust test suite: passed once. No duplicate run was made for counts.
- `node --test tests/frontend/package-version.test.ts`: passed.
- Full frontend suite: 125/126 passed; the sole failure is the existing out-of-repository `life-daily-loop` skill contract expecting `## Personal Dashboard Tasks`. That external file was not changed.
- macOS acceptance-script `bash -n` and Swift UI-driver `swiftc -typecheck`: passed; `git diff --check`: passed.
- 3.0.2 packaged candidate passed codesign verification and the isolated packaged `interface-language` acceptance at `/private/tmp/personal-dashboard-ipc.302-release-language-20260926/`. It exercised language changes and preserved draft/phase state with synthetic application data and Vaults only; no real Vault contents were used by that acceptance.
- The final integrated 3.0.2 feature combination and four-page 12-screenshot matrix had already passed on the 3.0.1 integrated candidate under Ticket 04. The release diff only changes version metadata, so this record does not relabel those 3.0.1 screenshots as a new 3.0.2 matrix. Evidence: `/private/tmp/personal-dashboard-ipc.ticket04matrixfinal-20260926/page-frame-matrix-captures/` and adjacent `task-card-captures/`; tested 960×720, 800×640, and 640×520 across Today, Tasks, Calendar, and Habits.

## Installed app and data preservation

- Installed path: `/Applications/Personal Dashboard.app`.
- Installed version / bundle id: `3.0.2` / `com.tortillaflat.personal-dashboard`.
- Installed main executable SHA-256: `d55bdadc2778566e019282295a61c85fe64a1cbb4cb97973d55b025102a8aa99`.
- Installed bundle signature verification passed; the real installed app was launched and displayed the existing workspace successfully. Its running process executable was `/Applications/Personal Dashboard.app/Contents/MacOS/personal-dashboard`.
- A pre-install and post-startup hash snapshot of the five files under `~/Library/Application Support/com.tortillaflat.personal-dashboard` matched exactly; zero files changed. The selected Vault setting remained configured, and no user Vault file was edited. Snapshot manifests remain outside the repository at `/private/tmp/personal-dashboard-3.0.2-installed-config-pre-install.json` and `...-post-startup.json`.
- Two intact 3.0.1 recovery copies remain at `.scratch/personal-dashboard-3.0.2/recovery/Personal Dashboard 3.0.1.app` and `.scratch/personal-dashboard-3.0.2/recovery/Personal Dashboard 3.0.1.app-original`. Both pass codesign verification and retain executable SHA-256 `31a4b1f9c8578ff7bda0603af433b900e8414c2e58056a264638ab1b422e8781`.

## Launch entry and Spotlight

- Before remediation, Spotlight returned the installed app and the generated build app. LaunchServices had 82 app records: 64 extant test-copy paths, 16 already-missing paths, and the build/installed paths.
- The 64 extant synthetic test app registrations and build app registration were unregistered by exact path; all test bundles, synthetic acceptance files, screenshots, and logs were retained. The 16 non-existent stale LaunchServices records were left alone. Final inspection shows one extant LaunchServices path: `/Applications/Personal Dashboard.app`.
- The build output directories `src-tauri/target/release/bundle/macos` and `macos.noindex` are specifically excluded from Spotlight in System Settings and carry reversible `.metadata_never_index` markers. `/Applications` was not excluded and no volume-wide index reset was run.
- The signed, regenerable candidate executable remains intact under `src-tauri/target/release/bundle/macos.noindex/Personal Dashboard 3.0.2 build candidate.stashed`; its contents and SHA-256 match the release bundle. Its directory no longer has an `.app` suffix, and it is not registered as an application.
- After the targeted metadata refresh completed and indexing returned to stable, both `mdfind 'kMDItemCFBundleIdentifier == "com.tortillaflat.personal-dashboard"'` and `mdfind 'kMDItemFSName == "Personal Dashboard.app"'` returned exactly `/Applications/Personal Dashboard.app`.

## Search-entry follow-up — 2026-09-26

The user reported that Spotlight did not find the installed app. In Finder's native search UI scoped to the physical `/Applications` directory, `Personal Dashboard` returned 0 while `Personal Dashboard.app` returned one result. Spotlight's Apps result category was enabled, `/Applications` was not excluded, the index was enabled, and the installed bundle metadata and LaunchServices identity were correct. A read-only LaunchServices dump exposed 16 stale 3.0.1 registrations with the same bundle ID, all pointing to missing `/private/tmp/personal-dashboard-ipc.*` bundles.

Unregistered only those 16 exact missing paths. The installed `/Applications/Personal Dashboard.app` registration and all files were preserved. Finder search for `Personal Dashboard` then returned the single installed app, and opening that search result brought up the 3.0.2 Dashboard. The running executable path, bundle ID, version, SHA-256, and signature matched the official install. The five Application Support file hashes still matched the prior post-startup manifest; no Vault or Task/record controls were touched. Search Privacy and the global Spotlight index were not changed or reset. This closes the Finder search-entry follow-up without a new product ticket; it does not establish a pass for the separate global Spotlight overlay.

Management summary `dashboard-302-summary-search-entry-20260926T232747Z` was confirmed with digest `82c5ceadf8ffbd29`. The post-summary inspect confirmed Registry revision `adf26e534dda826b`, summary revision `53d7566cee58243e`, complete source coverage, `needsReconciliation=false`, and all Tickets 01–04 still resolved. The receipt readback was an idempotent no-op after confirmation. Request, receipt, and post-summary inspect are preserved at `management/summary-request-search-entry-20260926T232747Z.json`, `management/summary-reconcile-search-entry.json`, and `management/inspect-search-entry-postsummary.json`. The two historical conflict/partial recovery operations remain preserved and were not retried.

## Global Spotlight UI follow-up — 2026-09-26

The global Spotlight overlay could not be verified through this CUA runtime. Using its documented Finder app binding, sent `super+space`; the latest accessibility tree remained on Finder's `Searching “Applications”` window and exposed no Spotlight overlay. Binding `com.apple.systemuiserver` and `/System/Library/CoreServices/Spotlight.app` each failed with `-10005: timeoutReached`. The macOS runtime also has no `cua.computer.launch_app` function (`is not a function`); documented keyboard injection is app-bound and this runtime exposes no system-global key target. Therefore no global Spotlight result was observed or selected. Finder's scoped search result remains valid evidence only for Finder. The targeted LaunchServices repair, installed app, Spotlight privacy settings, and global index were left unchanged.

## Management

Local spec and map are marked resolved with this addendum. The `tortilla-flat-management` ready gate `connect` was confirmed, and `discover` resolved the canonical project as `product-personal-dashboard` at this checkout. The release-handoff summary request `dashboard-302-release-handoff-20260926T184737Z` (digest `e78718866310f801`) was confirmed. Post-summary canonical inspect confirmed Registry revision `380d8748c018bb45`, summary revision `c1e9c5edd2e48164`, complete coverage, `needsReconciliation=false`, and no uncovered sources.

Current source revisions: `source-personal-dashboard-3` `73f67af62ff88683`; `source-personal-dashboard-timeline-a-repair` `6f66259df3b780a1`; `source-personal-dashboard-3-0-2` `a7ec3dd2ebd538f0`; `source-personal-dashboard-codex-collaboration` `16f6bcfe7538bf9c`. Canonical inspect still confirms tickets 01–04 resolved at revisions `991f6fc2cffb30b8`, `97a00e28fdbe1602`, `4c448d262746e9aa`, and `eb5eccfaac31092c`. The two older pending recovery operations remain the known summary conflict `management-summary-e0091de-e6155d2f-cc6d-44ad-bf14-b1ec7e4c2e9a` and partial `dashboard-302-summary-ticket02-20260926T0624Z`; neither was retried. Request, receipt, and final inspect are preserved under `management/summary-request-release-handoff-20260926T184737Z.json`, `management/summary-reconcile-release-handoff.json`, and `management/inspect-release-handoff-postsummary.json`.

## Search-entry summary follow-up — 2026-09-26

After the CUA runtime could not access the global Spotlight overlay, the canonical Management summary was updated to keep the delivery search acceptance blocked pending direct user confirmation. The confirmed operation is `dashboard-302-summary-spotlight-manual-20260926T233711Z` (digest `5e1ed8c5be107456`); Registry revision `720ceee668aa6907`, summary revision `898c66d6d6a765d0`, source coverage complete, and `needsReconciliation=false`. It preserves all four implementation tickets as resolved while recording one blocker and the manual `⌘Space` search/open next step. The same-operation receipt readback was an idempotent no-op. Request, receipt, and post-summary inspect are saved as `management/summary-request-spotlight-manual-acceptance-20260926T233711Z.json`, `management/summary-reconcile-spotlight-manual-acceptance.json`, and `management/inspect-search-entry-postsummary-manual-acceptance.json`.

The earlier summary request `dashboard-302-summary-spotlight-manual-20260926T233356Z` used a non-canonical reference, was rejected without changing the Registry, and remains in helper `pendingRecovery`; it was superseded by the confirmed corrected request above. The two pre-existing conflict/partial recovery operations remain preserved. No ticket state, app code, installed file, Spotlight privacy setting, or global index was changed during this follow-up.
