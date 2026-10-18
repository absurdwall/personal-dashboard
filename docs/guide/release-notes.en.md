# 1.0.0 Beta 1 release notes

[Product](../index.html) · [Install and start](installation.html) · [Complete manual](manual.html) · [Privacy](privacy.html) · [Limitations](limitations.html)

## Current status

**Not publicly released. Downloads are closed.** This content is for a concrete candidate review. Website hosting, the release tag and downloadable assets require the maintainer's confirmation. The parent specification and final release ticket stay open until actual publication.

The release display is **1.0.0 Beta 1**, numeric version **1.0.0**, current declared build **5.0.2**, and intended tag `v1.0.0-beta.1`. The Apple Silicon / arm64 asset is `Personal-Dashboard_1.0.0-beta.1_arm64.dmg` with `SHA256SUMS`. Application identity remains `com.tortillaflat.personal-dashboard`; public numbering does not create another personal-data identity.

## Prepared in this round

- Empty personal-space creation and existing compatible Vault selection; independent local Tasks, Habits and minimal Daily Records.
- One Task identity across Tasks, Today and Calendar; a 04:00 lived-day boundary.
- Compatible external standalone Codex discovery and your own in-app ChatGPT connection. Dictation becomes an online editable draft. Automation defaults off and checks only while the app runs.
- Apple Silicon DMG with an Applications drag target, explicit version and SHA-256, local-signature and no-notarization disclosure.
- Bilingual website, installation guide, complete manual, privacy notes and real synthetic screenshots; existing optional integrations retained.

## Candidate mapping

The initial build 5.0.1 review package came from source `72a96980c081e5fb23010e6ef5ff128a16ed9185`. Screenshots on this site use that candidate with isolated synthetic data. It is not the final public asset. Build 5.0.2 is now declared for the repaired final candidate and awaits its source-bound build and acceptance after review. The initial bytes will not be relabeled or overwritten.

Initial review DMG SHA-256:

```text
097ad1a814c6a30ad954b8bd2c627cdf5383459983dac94450bc5e40603490e4
```

This hash identifies only that initial package, not a later rebuilt release. Once downloads open, verify the actual bytes against SHA256SUMS on the same explicit tag. There is no download link here yet. Detailed bytes, signature and resources are recorded in the [packaging evidence](../releases/beta-1/packaging.md).

## Final preparation

The final source repairs local-Habit fixed metadata, first-Habit guidance and persisted short-note category translation without translating user-authored notes. Package preparation supports a fresh external cache and adds Rust standard-library/runtime notices. These source repairs are not final-package acceptance. See the [final acceptance record](../releases/beta-1/acceptance.md) for actual results and every unperformed check.

## Scope and unperformed checks

The tested host is Apple Silicon macOS 27.0.1. Package metadata declares macOS 12.0, but lower systems have not been validated. No Intel, Windows or mobile package, automatic updater or Apple notarization is included.

[Known limitations](limitations.html) distinguishes real-model, microphone, clean-user, independent-account and final-public-download acceptance. Historical success, a protocol handshake or automated tests do not fill those gaps. Public numeric numbering restarts at 1.0.0 after internal 4.0.7, while the current declared build advances to 5.0.2 and identity/data locations remain stable. Check the relevant candidate's actual replacement/data-retention results; arbitrary downgrades are not guaranteed.
