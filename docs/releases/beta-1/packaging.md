# Beta 1 packaging and installation candidate

This record supports #118. A candidate is prepared for review; no Release, tag,
Pages deployment or public download is created by the packaging commands.
Final acceptance and permission to publish remain in #120/#116.

## Release identity

[release.json](../../../release.json) is the release authority. The checked
package declarations agree with it:

| Field | Beta 1 |
| --- | --- |
| Product display | Personal Dashboard · 1.0.0 Beta 1 |
| Bundle numeric version | 1.0.0 |
| Bundle build | 5.0.1 |
| Intended release tag | v1.0.0-beta.1 |
| Stable application identity | com.tortillaflat.personal-dashboard |
| Architecture | arm64 / aarch64-apple-darwin |
| DMG asset | Personal-Dashboard_1.0.0-beta.1_arm64.dmg |
| Signature | Local ad-hoc; hardened runtime; not notarized |
| Minimum OS metadata | macOS 12.0; lower-system runtime acceptance not performed |

The public numbering starts at 1.0.0; the build advances from the previous
internal 4.0.7 to 5.0.1. Apple documents a numeric build with at most four digits
in its first component, then two digits in each remaining component. This
mapping preserves an increasing build without changing the application identity
or the existing default application-data directory. It does not establish an
automatic updater, prove Finder replacement behavior, or prove saved-data
continuity; those require actual replacement/relaunch readback.
[Apple bundle version reference](https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/CoreFoundationKeys.html#//apple_ref/doc/uid/TP40009249-SW1).

Settings displays the release display version and build obtained from native
`application_identity`. An exact source commit is compiled into the app and
included in `Contents/Resources/release-manifest.json` before signing.

## Build and verify

Use an Apple Silicon Mac with the existing repository build prerequisites and
locked dependencies installed. Commit source changes first. Choose a **new**
output directory under `.noindex`, and an external `.noindex` Cargo cache:

```sh
CARGO_TARGET_DIR=/absolute/cache.noindex/target npm run build:beta -- \
  --output /absolute/candidates.noindex/build-5.0.1 \
  --license-supplements /absolute/license-evidence.noindex/supplements
```

The wrapper refuses an existing output, an uncommitted source tree or a cache
outside `.noindex`. It generates a source-bound manifest, collects licenses,
remaps source/Cargo/Rust toolchain/cache paths, and uses Tauri's native App and
DMG bundlers with `--locked`. It copies the exact App/DMG into the candidate
output and verifies the resulting bytes. A changed redistributable candidate
must advance `release.json`'s build and synchronized bundle metadata; do not
silently replace an old candidate or reuse its hashes.

The license collector uses target-filtered Cargo metadata and follows only
normal runtime edges, excluding build-only, dev-only and proc-macro packages.
It preserves actual upstream copyright/license/NOTICE documents. Some published
crates omit full license bodies, so the checked build uses exact-version
supplements tied to their Cargo VCS commits and source hashes. The collector
fails for a missing obligation instead of inventing a license. The completed
App includes `THIRD_PARTY_LICENSES/ACKNOWLEDGMENTS.md`, its dependency/source
inventory and full license documents. These grants cover dependencies; this
work does not invent a license for the application source.

Production frontend staging is recreated before compilation, excludes the
voice diagnostic HTML/JS, and native diagnostic IPC requires the explicit
`diagnostic-voice-gate` feature. The existing diagnostic acceptance script opts
into both assets and feature. Ordinary product dictation remains available.

To repeat static verification:

```sh
node scripts/release/validate-beta.mjs --candidate /absolute/candidates.noindex/build-5.0.1
```

The verifier checks metadata, executable permissions, arm64, system-only dynamic
links, strict ad-hoc signature validity, source manifest, license-file hashes,
private-path/diagnostic/runtime/data absence and actual SHA-256. It mounts the
DMG read-only without browsing, confirms the Applications link and byte-identical
App inventory, then detaches. `SHA256SUMS` identifies the DMG; the separate App
inventory hash describes its files and modes, not a standard hash of a directory.
Build logs/config, package-validation JSON and the complete file inventory stay
with the external candidate. Do not substitute earlier-package hashes.

Temporary acceptance copies use `.noindex` directories and unregister their
exact bundles from Launch Services during cleanup. The existing installation
and personal data are not replaced by these commands.

## Installation text for the manual

After public release is approved, download the named version's DMG and
`SHA256SUMS` from that version's Release. Check the DMG hash, open it, drag
Personal Dashboard onto Applications, eject the DMG, then open the copied app
from Applications. Quit the previous app before replacing it; retain a backup
of your selected personal space and application data.

This Beta uses a local signature without Apple notarization or a verified
Developer ID. If macOS blocks it, first attempt to open the copied app. If you
trust its source and the warning allows an exception, open System Settings →
Privacy & Security → Open Anyway, then confirm Open. Managed-device policy may
prevent that action. For a damaged-app or malware warning, stop and report the
exact message and version; do not bypass it by disabling global Gatekeeper.
A SHA-256 match verifies the bytes, not developer identity or safety.
[Apple's current per-app opening instructions](https://support.apple.com/en-us/102445).

Local use requires neither Codex nor Node/Rust development tools, Dida or
Obsidian. Optional AI uses a separately installed compatible Codex and your own
Dashboard ChatGPT login; see [runtime evidence](codex-runtime.md). The checked
Codex 0.160.0 binary has minimum OS metadata 11.0, which is not a lower-OS or
all-account support guarantee for Dashboard/AI.

## Acceptance boundary

Static package checks do not establish a fresh user's Internet-quarantined
installation, Gatekeeper opening, replacement/data continuity, lower-macOS
support, real model access or microphone quality. The user accepted deferral
of a clean macOS-user environment and independent ChatGPT login in this run.
Keep every unexecuted item explicitly unexecuted in #120. No developer login,
temporary HOME or local ad-hoc launch replaces those tests.
