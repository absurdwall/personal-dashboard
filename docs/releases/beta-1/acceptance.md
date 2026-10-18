# Beta 1 candidate acceptance (#120)

Status: **build 5.0.4 prepared; awaiting publication approval; not published**.
The release authority declares **1.0.0 Beta 1 · numeric 1.0.0 · build 5.0.4**,
arm64, `com.tortillaflat.personal-dashboard`, intended tag `v1.0.0-beta.1`.
The emitted build 5.0.3 is the actual functional acceptance baseline. Its App was
compiled from `e8ddeb8aab2d6d7bfc74d805839b633c9065af45`; later evidence and
image commits do not make that App contain a later repository head.

[Machine-readable status](acceptance.json) · [Release authority](../../../release.json)
· [Packaging/history](packaging.md) · [Publication runbook](publication.md)
· [External runtime](codex-runtime.md) · [Image identity](screenshots.json)
· [Independent integration review](review.md)

## Current bounded Settings repair

The user found oversized Settings category labels and action buttons, plus the
Data & Vault buttons touching after wrapping. The repair changes only Settings
navigation/button sizing and spacing, reuses the existing wrapping action group,
and makes existing-Vault selection a secondary action. IDs, behavior, focus,
disabled states, other pages and accent swatches remain intact. The private
before screenshot was inspected and is not published because it contains a
private path. Production frontend build passed. No new tests or full
frontend/Rust/native-business rerun was added, as the user explicitly requested
a simple visual fix without excessive checks. Build 5.0.4 passed all ten actual
static package checks. One actual native Settings round passed at 960 × 720 and
820 × 720: smaller category/action text and padding, separated wrapped Vault
actions, compact Save schedule; normal Quit verified. The
[public-safe after image](../../assets/settings.png) and [visual receipt](settings-5.0.4.json)
contain no selected personal Vault, account or home path.

## Exact build 5.0.4 candidate

- Compiled clean source `eb49860e634bb5af4c25a21bd901ed9613abf84a`;
  tree `f433bfbb86a4881bc739cd829e78181af6d6c00f`.
- DMG: **5,508,881 bytes**, SHA-256
  `0f06f139365a1465fbf2b13d21d59513a262f7a058f2642bac621db73207b041`.
- Executable SHA-256
  `b3d80a76ec5bd47cbfe6c01fd13243f7e254e351f95d4b447e939c9b70dac956`.
- 387-file App inventory SHA-256
  `bbfbfefc1d7f8e8ea80ae27316fa2c224fb592413923eff1ef152d5d73a25477`.
- [Actual package receipt](candidate-5.0.4.json): metadata/arm64/system dynamic
  links, strict ad-hoc hardened-runtime signature, source/resource identity,
  private-path/diagnostic/runtime scan, both legal inventories, read-only DMG,
  Applications link and matching App all passed. Same 196 crates / 372 Cargo
  license documents and 7 std/builtins documents, all hashes verified.

The App contains the exact compiled source above. Subsequent evidence, image
and documentation commits do not make it contain a later repository head.
The complete functional acceptance below remains honestly bound to build 5.0.3;
it was not repeated or relabeled as 5.0.4 behavior testing.

## Actual build 5.0.3 package baseline

- Compiled source `e8ddeb8aab2d6d7bfc74d805839b633c9065af45`;
  tree `63da1b0196bc8b6d9cc071919801dff04a22e8d3`; tracked source clean at build.
- DMG `Personal-Dashboard_1.0.0-beta.1_arm64.dmg`: **5,508,256 bytes**;
  SHA-256 `d1471e872db7cec648da9564b543c8aca9b545abe3b3557a7530849c35473190`.
- App inventory SHA-256 `1ac68e1c81df323559d64fb69fa199cf820aa07343cf613bb1c1775958147bcf`;
  executable SHA-256 `512c4b71af8be6f7e6b9bacda63d8acd34e1eaf271070e825ec4b1a69228b06d`.
- [Package receipt](candidate-5.0.3.json): all **10 static checks passed**,
  including strict ad-hoc hardened-runtime signature, arm64/system-only dynamic
  links, signed source/legal manifests, no private paths/diagnostic fixtures or
  bundled Codex, read-only DMG integrity, Applications link and identical mounted
  App. Local signature remains unnotarized.
- Rust 1.97.1 exact commit `8bab26f4f68e0e26f0bb7960be334d5b520ea452`,
  Tauri CLI 2.11.4. The 387-file App has 196 Cargo runtime crates / 372 license
  documents plus 7 standard-library/compiler-builtins documents; signed legal
  inventories and all document hashes passed.
- Independent Standards review: the single P2 was fixed and independently
  confirmed resolved (**0 remaining**). Original Spec and native-subtitle delta:
  **0 actionable findings**. Full reports remain in [review.md](review.md).

## Actual build 5.0.3 native acceptance

These checks used isolated synthetic data on the same macOS user, Apple Silicon
macOS 27.0.1. They do not represent a new macOS account or public download.
The [actual native receipt](native-5.0.3.json) binds the build/source/hash.

| Executed check | Observed result on build 5.0.3 |
| --- | --- |
| Read-only DMG; copied App; eject before launch | Copied inventories matched all 387 files; launched copied bytes |
| Empty personal space | Four directories, zero files before saving |
| Empty Habits and English note category | Correct local-first subtitle/help in both languages; English category retained after restart; user Chinese prose preserved |
| Task create/edit | Same Task shared across Today, Tasks and Calendar |
| Local Habit | Created, completed, withdrawn and re-completed; completion survived restart |
| Daily Record/conflict | Saved note; actual stale external-file save rejected; draft/original/external/new text retained after retry; browsing tomorrow created no record |
| Standalone Codex 0.160.0 | Detected in signed-out profile, zero auth files; local use worked |
| Automatic plan | Default off; enabled without fictitious old handoff; actual missing-login failure remained visibly failed and did not change Daily Record; left off |
| Normal Quit/relaunch | Eight Vault file hashes unchanged |
| Internal 4.0.7 replacement | Same isolated copied App location; stable identity; Task/Habit/note and English/Lilac preferences retained; seven of eight baseline files byte-identical |
| Expected settings migration | Only legacy `externalSchedulePresent=true` added; remaining collaboration JSON exactly equal |
| Backup/recovery | Closed App/process exit verified; whole space including hidden files and App data copied/restored; native folder picker selected new recovery folder; Task/Habit/record visible, Lilac retained; recovered bytes unchanged after another restart |

The formal Applications installation was not replaced. This functional baseline
is retained for the subsequent Settings-only visual repair; those full business
flows are not claimed as repeated on build 5.0.4.

## Images and earlier candidate history

The three current business-page images are actual **5.0.3** captures with an
isolated synthetic Sample Space. Source/executable/signed-manifest identity,
actual PNG hashes, bytes and dimensions were checked, and all were visually
inspected. They remain labeled 5.0.3; the Settings-only change does not relabel
them as new 5.0.4 captures. [Current provenance](screenshots.json) and
[original #119 image receipt](screenshots-5.0.1.json) keep the identities separate.

Initial build 5.0.1 source `72a96980c081e5fb23010e6ef5ff128a16ed9185` and its
original package/native evidence remain historical in [packaging.md](packaging.md).
Build 5.0.2 source `7eac9b7eb7c475616115889f7e84f4cd2862fd58` passed ten static
checks and real Task/Habit/note/conflict/restart checks, but retained the misleading
empty-Habits subtitle. Its [package](candidate-5.0.2.json) and
[native receipt](native-5.0.2.json) record that failure rather than passing it.
All four emitted candidates remain preserved unchanged.

## Source checks actually run before the visual-only repair

- Full frontend suite: **557 passed**, zero failures/skips. Affected rendered
  Habits tests repeated after the guard and subtitle repairs: **2 passed**,
  including observed red-to-green subtitle failure and retained error/coverage.
- Rust library: **110 passed, 6 gated tests ignored**. Ignored live checks are
  not passed. These suites were not repeated for the Settings-only repair.
- Artifact ownership regression: **2 passed**. Actual diagnostic then production
  build passed; production retained no voice-gate assets.
- Package preparation/localization boundaries: **22 passed**. Fresh-cache checks
  used empty disposable fixtures, not a second Rust cache.
- Official standalone Codex 0.160.0 installation, schema declaration and actual
  initialize handshake passed separately; no model/login/microphone implication.
- Current site static check and image provenance checks passed, with the download
  gate closed. Final visual/browser evidence remains separate.

## Unperformed and deferred checks

| Check | Status |
| --- | --- |
| Genuinely absent-runtime native use | Not run: installed ChatGPT fallback exists; empty PATH does not establish absence |
| Physical network disconnection | Not run; signed-out saves are different evidence |
| Clean macOS-user / another machine | Not run; user accepted deferral |
| Independent own ChatGPT account login | Not run; user accepted deferral |
| Real model modification with independent saved-source readback | Not run |
| Real Chinese, English and mixed microphone recognition | Not run |
| Live AI automatic morning-plan save/readback | Not run; only actual signed-out failure exercised |
| Lower macOS | Not run; 12.0 is metadata, tested host 27.0.1 |
| Public download/quarantine/Gatekeeper/anonymous readback | Not run; requires approval and actual publication |

## Retained work and publication boundary

Two shared #117 worktrees remain retained: supported archive attempts returned
to active attachments without a concrete error. Tracked trees are clean, heads
reachable from integration, and no unique user work was found. No archive guard
or metadata was bypassed. The #120 checkout awaits supported archive after its
final integration handoff.

[Actual cleanup receipt](cleanup.json): all owned Apps quit; exact-path
unregistration processed 11 owned temporary bundles (including canonical aliases
where applicable), and inspection found **zero owned App registration entries**
and **zero active owned disk images**. Four non-App disk-image history records
remain in Launch Services. No global registry purge was performed and no claim
of a globally empty registry is made. The formal Applications bundle was neither
replaced nor unregistered. The owned rebuildable cache was removed: approximately
**5.46 GiB freed**, target absent / **0 bytes** afterward. All four candidate
bytes/manifests/validations/logs, native/visual evidence, synthetic backup/recovery
and standalone runtime remain retained. The original nine untracked
`.scratch/public-beta/` support records remain preserved.

The user has not authorized public release of the specific final candidate.
Pages, tag, prerelease and download activation remain unperformed; the website
download control stays disabled. Present the exact final bytes, webpage/manual,
actual results and remaining gaps for confirmation. #116 and #120 remain open
until actual approved publication and verification. No invitations are sent.
