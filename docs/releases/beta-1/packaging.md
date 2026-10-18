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
| Bundle build | 5.0.4 |
| Intended release tag | v1.0.0-beta.1 |
| Stable application identity | com.tortillaflat.personal-dashboard |
| Architecture | arm64 / aarch64-apple-darwin |
| DMG asset | Personal-Dashboard_1.0.0-beta.1_arm64.dmg |
| Signature | Local ad-hoc; hardened runtime; not notarized |
| Minimum OS metadata | macOS 12.0; lower-system runtime acceptance not performed |

The public numbering starts at 1.0.0; the build advances from the previous
internal 4.0.7 through review candidates 5.0.1 and 5.0.2 to current declared 5.0.4. Apple documents a numeric build with at most four digits
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
locked dependencies installed. The checked Rust toolchain is 1.97.1, source
commit `8bab26f4f68e0e26f0bb7960be334d5b520ea452`; exact-commit compiler-builtins
notices are retained for that toolchain. Commit source changes first. Choose a **new**
output directory under `.noindex`, and an external `.noindex` Cargo cache:

```sh
CARGO_TARGET_DIR=/absolute/cache.noindex/target npm run build:beta -- \
  --output /absolute/candidates.noindex/build-5.0.4
```

The wrapper refuses an existing output, an uncommitted source tree or a cache
outside `.noindex`. A fresh external cache is created before the candidate output
is consumed; an unusable cache fails without occupying that output. It generates a source-bound manifest, collects licenses,
remaps source/Cargo/Rust toolchain/cache paths, and uses Tauri's native App and
DMG bundlers with `--locked`. It copies the exact App/DMG into the candidate
output and verifies the resulting bytes. A changed redistributable candidate
must advance `release.json`'s build and synchronized bundle metadata; do not
silently replace an old candidate or reuse its hashes.

The license collector uses target-filtered Cargo metadata and follows only
normal runtime edges, excluding build-only, dev-only and proc-macro packages.
It preserves actual upstream copyright/license/NOTICE documents. Some published
crates omit full license bodies, so the checked build uses exact-version
supplements tied to their Cargo VCS commits and source hashes, retained in
`release/license-supplements/` and selected by default. The collector
fails for a missing obligation instead of inventing a license. The completed
App includes `THIRD_PARTY_LICENSES/ACKNOWLEDGMENTS.md`, its dependency/source
inventory and full license documents. These grants cover dependencies; this
work does not invent a license for the application source.

Rust's precompiled standard library is separate from that Cargo closure. The
wrapper also preserves the installed toolchain's `COPYRIGHT-library.html` and
full MIT/Apache/Unicode/BSD/LLVM terms, plus the exact Rust source revision's
compiler-builtins 0.1.160 license. Its manifest records compiler commit/target
and every document hash; the signed source manifest binds both legal inventories.
The upstream standard-library corpus includes other-target/build notices and
is not represented as an exact Darwin-only package census. The 15 MB compiler
copyright corpus is not bundled. A missing or mismatched runtime notice fails
the build preparation; no license document is silently invented or downloaded.

Production frontend staging is recreated before compilation, excludes the
voice diagnostic HTML/JS, and native diagnostic IPC requires the explicit
`diagnostic-voice-gate` feature. The existing diagnostic acceptance script opts
into both assets and feature. Ordinary product dictation remains available.

To repeat static verification:

```sh
node scripts/release/validate-beta.mjs --candidate /absolute/candidates.noindex/build-5.0.4
```

The verifier checks metadata, executable permissions, arm64, system-only dynamic
links, strict ad-hoc signature validity, source manifest, license-file hashes,
private-path/diagnostic/runtime/data absence, both Cargo and Rust-runtime license
inventories, and actual SHA-256. It mounts the
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

## Current preparation: build 5.0.4

Build 5.0.4 is declared for a user-requested Settings-only sizing/wrap repair.
It has not been built. Build 5.0.3 completed actual functional, restart, isolated
4.0.7 upgrade and manual backup/recovery checks; its bytes and native receipt
remain the baseline. The requested repair retains behavior and requires a new
source-bound package plus a desktop/narrow visual confirmation, not a full
repeat of the business suites. [Current acceptance](acceptance.md).

## Preserved accepted functional baseline: build 5.0.3

The 5.0.3 candidate was built from clean committed source
`e8ddeb8aab2d6d7bfc74d805839b633c9065af45`, tree
`63da1b0196bc8b6d9cc071919801dff04a22e8d3`, on macOS 27.0.1 arm64.
All ten actual static checks passed. The source manifest is embedded before
signing and the executable contains that exact commit. Later evidence-only
documentation and screenshot commits do not change the candidate or imply it
contains a later repository head.

| Actual identity | Value |
| --- | --- |
| DMG bytes | 5,508,256 |
| DMG SHA-256 | `d1471e872db7cec648da9564b543c8aca9b545abe3b3557a7530849c35473190` |
| Executable SHA-256 | `512c4b71af8be6f7e6b9bacda63d8acd34e1eaf271070e825ec4b1a69228b06d` |
| 387-file App inventory SHA-256 | `1ac68e1c81df323559d64fb69fa199cf820aa07343cf613bb1c1775958147bcf` |
| Cargo inventory SHA-256 | `403aa737609cbfa7f41b07965aeb7f5d5e7502fda5850a050e25b3f3b3808942` |
| Rust runtime inventory SHA-256 | `8adba1633961a1ef3e3f37bbc8d9be10c06cd0ec9249890afc093cee96278874` |

The signed App includes 196 Cargo runtime crates / 372 license documents and
7 Rust standard-library/compiler-builtins documents from exact toolchain commit
`8bab26f4f68e0e26f0bb7960be334d5b520ea452` (Rust 1.97.1). Metadata,
executable/architecture, system dynamic dependencies, strict ad-hoc hardened
signature, source/resource identity, no private paths/diagnostic/runtime/data
residuals, both legal inventories, read-only DMG and matching mounted App all
passed. The [actual package receipt](candidate-5.0.3.json) records the results.
Its [native receipt](native-5.0.3.json) records actual first use, conflicts,
restart, upgrade and recovery. The [acceptance record](acceptance.md) retains
unperformed checks separately. Initial 5.0.1 and 5.0.2 bytes are preserved unchanged below.

## Preserved build 5.0.2 review candidate

Build 5.0.2 was actually built from clean source
`7eac9b7eb7c475616115889f7e84f4cd2862fd58` and passed all ten static
package checks on macOS 27.0.1 arm64. The DMG is **5,508,466 bytes**, SHA-256
`cb9f719725e26e50ad53c7fa7d34082dd5f66a9c40b9c506e64f85fdb210d523`.
Its 387-file App includes 196 Cargo runtime crates / 372 license documents and
7 Rust standard-library/compiler-builtins documents. The exact toolchain,
App/executable/legal hashes and actual static report are retained in
[candidate-5.0.2.json](candidate-5.0.2.json).

Native first-use QA found that the writable empty Habits header still said it
was waiting for an external bounded snapshot despite the repaired local-first
body. The source correction advances the next candidate to build 5.0.3. Both
older candidates remain unchanged; static validation is not final native or
publication acceptance. Root-owned functional checks on 5.0.2 remain separate.

## Acceptance boundary

Static package checks do not establish a fresh user's Internet-quarantined
installation, Gatekeeper opening, replacement/data continuity, lower-macOS
support, real model access or microphone quality. The user accepted deferral
of a clean macOS-user environment and independent ChatGPT login in this run.
Keep every unexecuted item explicitly unexecuted in #120. No developer login,
temporary HOME or local ad-hoc launch replaces those tests.

## Initial #118 candidate results — 2026-10-17

The initial local candidate is **1.0.0 Beta 1, build 5.0.1**, built from clean
source `72a96980c081e5fb23010e6ef5ff128a16ed9185` on Apple Silicon macOS
27.0.1 (26A434), using Tauri 2.11.4, the locked Cargo graph and native App/DMG
bundlers. It is a review candidate, not an approved public download. Later
commits add the repository's default license supplement corpus, stronger static
verification and this receipt; the candidate's embedded source remains the
commit above. Final #120 preparation will advance the build and rebuild from the
complete integrated source, rather than relabel or overwrite these bytes.

| Actual check | Result |
| --- | --- |
| Release metadata; preserved identifier; executable arm64 and executable permission | Passed |
| Compiled source identity and signed resource manifest agree | Passed |
| Dynamic dependencies | Passed: Apple system frameworks and `/usr/lib` only |
| Strict deep code-signature verification | Passed: ad-hoc, hardened runtime |
| Private paths in App/DMG metadata, UTF-8 and UTF-16 | No matches in checked files |
| Codex sidecar, private data filenames, voice diagnostic routes and IPC | Absent in checked App |
| Runtime dependency documents | 196 crates, 372 documents, hashes verified |
| DMG integrity and read-only mount | Passed |
| DMG Applications link | `/Applications`, present |
| Mounted App matches the separate candidate | Passed: identical 379-file inventory |
| DMG content outside App | Only Applications, `.DS_Store` and volume icon |
| Rust library suite | 110 passed, 6 explicitly gated tests ignored |
| Diagnostic native feature check | Passed |
| Version/artifact/license tests plus rendered Settings display | 9 passed |
| Opt-in diagnostic frontend, then clean production frontend | Passed: gate assets included only in diagnostic build |
| New-user, independent login, real model/microphone, lower-system and Gatekeeper installation | Not executed by #118 |

Hashes of actual candidate bytes:

```text
DMG bytes: 5489979
DMG SHA-256: 097ad1a814c6a30ad954b8bd2c627cdf5383459983dac94450bc5e40603490e4
Main executable SHA-256: dff1dd4b840c6ffd538864a2dde3b0d62cfb8b914322ecad1d0fffd9b2db5c5a
App inventory SHA-256: bfbf477b9ea770af8740426a5bd04a099bb329c3b226601ec25765b848fc3abe
Included license inventory SHA-256: c6ce93fad57b59b133d0e2cf8f9e50cfee33a5952cc60a277e1203d2eb6efe82
```

The original external supplement inputs are identified by that included license
inventory's per-document URL/commit/hash provenance. The repository default
corpus now narrows the selectors source document to its verbatim license notice,
recording the extraction and original source hash; its successfully recollected
inventory is
`403aa737609cbfa7f41b07965aeb7f5d5e7502fda5850a050e25b3f3b3808942`.
Both inventories cover the same 196 runtime crates. This provenance/document
change belongs to the next candidate, not the already signed initial image.

The shared external build cache grew from approximately 3.4 GiB at #118 handoff
(3.8 GiB after native checks) to 5.3 GiB after the remapped release build. The
external candidate/evidence directory occupies approximately 28 MiB. These
owned outputs remain available for final acceptance and reuse; no personal
Vault, profile, installed App or unrelated cache was removed. Real local restart
and synthetic upgrade results belong to their separate #120 execution records.
