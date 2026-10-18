# 1.0.0 Beta 1 release notes

[Product](../index.html) · [Install and start](installation.html) · [Complete manual](manual.html) · [Privacy](privacy.html) · [Limitations](limitations.html)

## Current status

**1.0.0 Beta 1 · build 5.0.4 · Apple Silicon.** [Download DMG](https://github.com/absurdwall/personal-dashboard/releases/download/v1.0.0-beta.1/Personal-Dashboard_1.0.0-beta.1_arm64.dmg) · [SHA256SUMS](https://github.com/absurdwall/personal-dashboard/releases/download/v1.0.0-beta.1/SHA256SUMS) · [Versioned prerelease](https://github.com/absurdwall/personal-dashboard/releases/tag/v1.0.0-beta.1). Read the known limitations before installing.

The release display is **1.0.0 Beta 1**, numeric version **1.0.0**, current declared build **5.0.4**, and intended tag `v1.0.0-beta.1`. The Apple Silicon / arm64 asset is `Personal-Dashboard_1.0.0-beta.1_arm64.dmg` with `SHA256SUMS`. Application identity remains `com.tortillaflat.personal-dashboard`; public numbering does not create another personal-data identity.

## Prepared in this round

- Empty personal-space creation and existing compatible Vault selection; independent local Tasks, Habits and minimal Daily Records.
- One Task identity across Tasks, Today and Calendar; a 04:00 lived-day boundary.
- Compatible external standalone Codex discovery and your own in-app ChatGPT connection. Dictation becomes an online editable draft. Automation defaults off and checks only while the app runs.
- Apple Silicon DMG with an Applications drag target, explicit version and SHA-256, local-signature and no-notarization disclosure.
- Bilingual website, installation guide, complete manual, privacy notes and real synthetic screenshots; existing optional integrations retained.

## Exact current candidate

Build **5.0.4** was built from clean source `eb49860e634bb5af4c25a21bd901ed9613abf84a` and passed all ten static package checks. DMG: **5,508,881 bytes**, SHA-256:

```text
0f06f139365a1465fbf2b13d21d59513a262f7a058f2642bac621db73207b041
```

The [actual package receipt](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/candidate-5.0.4.json) and [Settings visual receipt](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/settings-5.0.4.json) bind these bytes and the one desktop/narrow confirmation. Smaller Settings categories/actions and separated wrapped Vault buttons were visually confirmed; the App normally quit. Later evidence-only commits do not alter its compiled source. Full business suites were not repeated for this user-requested visual-only repair; their exact 5.0.3 baseline follows.

## Candidate mapping

Build **5.0.3** was actually built from clean source `e8ddeb8aab2d6d7bfc74d805839b633c9065af45` and passed all ten static package checks. Its DMG is **5,508,256 bytes** with SHA-256:

```text
d1471e872db7cec648da9564b543c8aca9b545abe3b3557a7530849c35473190
```

The [actual package receipt](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/candidate-5.0.3.json) binds source, toolchain, signed resources and actual hashes. The App's compiled source remains the commit above; later evidence, screenshots and documentation do not silently change the package identity. The three current website images are actual build 5.0.3 native captures, visually inspected and bound to source/executable/hash [provenance](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/screenshots.json). Same-user functional, restart, isolated 4.0.7 upgrade and manual recovery checks passed on 5.0.3; see the [native receipt](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/native-5.0.3.json). The user then requested compact Settings category/action buttons and spacing when Vault actions wrap. Build 5.0.4 completes this visual-only repair with actual package and desktop/narrow checks recorded above. The unchanged business-page images stay honestly labeled 5.0.3. Full functional suites are not repeated for the small Settings-only change.

Initial build 5.0.1 came from `72a96980c081e5fb23010e6ef5ff128a16ed9185`. Build 5.0.2 came from `7eac9b7eb7c475616115889f7e84f4cd2862fd58`; it passed package checks and actual same-user Task/Habit/note/conflict/restart checks, but native QA found a remaining empty-Habits header subtitle. [Its package receipt](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/candidate-5.0.2.json) and [native observations](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/native-5.0.2.json) remain historical; the defect was repaired for 5.0.3. Neither earlier package is overwritten or relabeled. Initial image hashes remain in the [historical receipt](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/screenshots-5.0.1.json); current images were actually recaptured from 5.0.3.

Compare downloaded bytes with SHA256SUMS from the same explicit tag. Signature, resources and historical hashes are in the [packaging evidence](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/packaging.md).

## Final preparation

The final source repairs local-Habit fixed metadata, first-Habit guidance and persisted short-note category translation without translating user-authored notes. Package preparation supports a fresh external cache and adds Rust standard-library/runtime notices. These source repairs are not final-package acceptance. See the [final acceptance record](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/acceptance.md) for actual results and every unperformed check.

## Scope and unperformed checks

The tested host is Apple Silicon macOS 27.0.1. Package metadata declares macOS 12.0, but lower systems have not been validated. No Intel, Windows or mobile package, automatic updater or Apple notarization is included.

[Known limitations](limitations.html) distinguishes real-model, microphone, clean-user, independent-account and final-public-download acceptance. Historical success, a protocol handshake or automated tests do not fill those gaps. Public numeric numbering restarts at 1.0.0 after internal 4.0.7, while the current declared build advances to 5.0.4 and identity/data locations remain stable. Check the relevant candidate's actual replacement/data-retention results; arbitrary downgrades are not guaranteed.
