# Known limitations and validation

[Product](../index.html) · [Installation](installation.html) · [Complete manual](manual.html) · [Release notes](release-notes.html)

This is an invited beta with the limitations below. An invitation is not access control: public pages, source and downloads are accessible to others.

## Checked in this run

On Apple Silicon macOS 27.0.1, isolated synthetic checks covered local business saves/readback, actual quit/relaunch of the previous version, persistent Tasks/Habits/minimal Daily Records and preferences; the new candidate's empty-space creation and local first use; discovery of standalone Codex 0.160.0 with an independent signed-out profile; automation off by default, enabling without a nonexistent old schedule, and a visible signed-out failure. Automated coverage also checks conflicts, drafts, deduplication, runtime compatibility, versioning and package structure.

See the [packaging evidence](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/packaging.md) for signature, architecture, DMG contents and hashes. These checks do not stand in for unperformed real-user or service acceptance.

Build 5.0.4 source `eb49860e634bb5af4c25a21bd901ed9613abf84a` passed all ten static package checks and one actual Settings desktop/narrow visual round. The full same-user business/restart/upgrade/recovery baseline remains build 5.0.3; it was not relabeled as repeated on 5.0.4.

The public versioned DMG and checksum returned anonymous HTTP 200 and matched the approved bytes. A signed-out browser download carried real quarantine; Finder copied the matching App, the DMG was ejected, and macOS initially blocked this unnotarized App. The user completed per-App Open Anyway and password confirmation; the exact copy displayed a native window and normally quit. No quarantine removal or global Gatekeeper change was used. This was the existing macOS user and existing profile after Gatekeeper relaunched without the requested isolation overrides; no business edits/model calls were requested. It is not clean-user/another-machine acceptance. The formal local 4.0.7 installation was separately backed up and updated to exact 5.0.4, with selected-Vault settings unchanged. [Actual publication receipt](https://github.com/absurdwall/personal-dashboard/issues/120#issuecomment-6243939512).

## Not yet performed

- Clean macOS-user/other-machine installation and independent ChatGPT-account login: deferred with the maintainer's agreement in this run; not passed.
- Real model changes with independent readback, real Chinese/English/mixed microphone quality, and the complete live-AI automatic morning-plan flow in this run.
- Physical network-disconnection testing has not been run. Signed-out local saves are separate evidence. A genuinely absent-runtime native test was not run because an installed ChatGPT fallback remained available; empty PATH does not prove its absence.
- Systems below tested macOS 27.0.1. The 12.0 package minimum metadata is not validated support.

## Candidate and image identity

Current images are three real native captures of build 5.0.3 with isolated synthetic data. Build 5.0.3 was built from exact source `e8ddeb8aab2d6d7bfc74d805839b633c9065af45` and passed all ten static package checks. Its [native receipt](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/native-5.0.3.json) records first use, restart, isolated upgrade and recovery. Current declaration 5.0.4 is a Settings-only visual correction; its ten static package checks and one desktop/narrow Settings visual confirmation passed. Full native business/upgrade/recovery suites were not repeated for this visual-only delta; their actual 5.0.3 baseline remains separate. Their actual source/executable/image hashes were verified against [provenance](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/screenshots.json); historical 5.0.1 image identity remains separately recorded. No image was silently relabeled. Local Habits do not require an external snapshot. The [final acceptance record](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/acceptance.md) keeps package and native results separate from these historical illustrations.

## Boundaries

- Apple Silicon Mac only. No Intel, Universal, Windows or mobile release.
- Local signature, no notarization and no automatic update system.
- External Codex installation; account, model, quota and online-service availability are conditional. Not every ChatGPT account or arbitrary Codex version is guaranteed to work.
- Dictation is online draft input. Explicit Cancel discards that input. It is not live voice conversation.
- Automation checks only while the app process runs. Sleep, quit or failures may prevent it; no wake-up or precise-time delivery guarantee.
- No new-user Dida onboarding or app-managed cloud sync. Verify local, external and cloud results independently.
- Recovery material is not a complete backup. Conflicts are not automatically merged and arbitrary downgrades are not guaranteed format-compatible.

Redact [feedback](privacy.html) and include the exact version/build, macOS, chip and reproduction steps.
