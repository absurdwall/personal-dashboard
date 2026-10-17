# PDEX-18 reviewed normal installation — 2026-10-11

Branch: `codex/dashboard-experience-integration`

Reviewed implementation: `37d71ded966027581abf8cfda32c5bc81960996f`

Final source/build commit: `dc12b10eaec844201aa9c13a62ba85dea39a5651`

Base `3c19010` is in the requested `8960c80` prototype ancestry; all commits remain unsquashed.

## Independent review and verification

Standards review found no documented-standard breach. Its only suggestion was to share duplicated Today/Tasks schedule assertions; the helper was added in `dc12b10` without production changes. The final `node --test tests/frontend/docked-sidebars.test.ts` run passed 19/19. The Spec reviewer found no scope creep or incorrect implementation and recorded the isolated native composer's disabled state as a disclosed evidence limitation. Both review axes are complete with no remaining actionable finding.

`npm run build` passed. The normal checked-in configuration build, `node_modules/.bin/tauri build --bundles app --ci`, passed from the final source commit. The installed app is version `4.0.7`, identifier `com.tortillaflat.personal-dashboard`; strict deep signature verification passed. It is ad-hoc signed and not notarized. Installed executable SHA-256: `28e0d7f9bfb40df1e3b0ebf94f941dfcf49a3505411f3c20d13b891704f920ad`. Installed bundle-tree SHA-256: `83085f2bdb621dcb370cdbbeaa358e7c2f0fb0314de90d788ce645acecea38c3`.

Focused WebKit tests passed: docked sidebars 19/19, Collaboration layout 10/10, compact Calendar 12/12. The candidate Tauri build and its strict signature check passed before the final test-only helper change; production files did not change after that build. The final normal-identifier package was then rebuilt from the final source commit.

## Protection and replacement

Before replacement, the installed app was closed with Computer Use. A fresh private copy was created at `~/Library/Application Support/Personal Dashboard Backups.noindex/dashboard-experience-pdex18-20261011/` and verified against the sources using `protection-manifest.sha256`:

- Previous `/Applications/Personal Dashboard.app`: 4 files, 17,451,790 bytes. Its recoverable copy and archived original match.
- Complete Dashboard app profile: 5,889 files, 259,480,945 bytes.
- Selected Vault `life/`: 267 files, 1,057,669 bytes.
- Selected Vault `.obsidian/`: 6 files, 9,770 bytes.

The selected Vault is an 85 GB multi-project workspace. Protection covers the Dashboard-owned `life/` data and Obsidian settings, rather than cloning unrelated repositories. The reviewed production bundle was staged in the same private `.noindex` directory, signature-checked, and its executable hash matched the installed app. The normal app now resides at `/Applications/Personal Dashboard.app` and was opened for visual inspection.

Computer Use's virtual input opened the installed Today and Collaboration screens. Today showed the aside toggle without visible count text; Collaboration showed the revised page frame, Sessions inset and composer area. No Task, session or message was created or sent. No Daily Record or Vault file was written by this inspection. `life/` and `.obsidian/` remain byte-identical to their protected copies. Profile `today-workspace.json`, appearance, language and cutover files remain byte-identical; `collaboration-v1.json` changed serialization bytes during launch but its parsed JSON tree is identical to the protected copy. This is not a claim that every runtime/cache/log file in the profile remained byte-identical.

## Native input and remaining acceptance

In the isolated native candidate, `Ctrl+Space` was sent but the field continued to receive Latin text. Computer Use rejected a modifier-only `Shift` keypress, and a Shift-modified click did not activate composition. The temporary text was cleared and no Task was saved. A Computer Use attempt to inspect the Sogou input app timed out. No input-source settings were changed, and successful Chinese IME composition is not claimed. The isolated candidate's composer was disabled because ChatGPT was not connected. In the installed app, the selected date has no session, so the composer is disabled there as well; enabled composer target/focus behavior passed in the synthetic production-WebKit test.

The installed normal App is left open on Collaboration for direct human inspection. PDEX-18 and its parent remain in-progress until the user supplies that acceptance. No GitHub issue, push, main merge, or external publication occurred.
