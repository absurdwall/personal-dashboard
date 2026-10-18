# Final Beta 1 candidate acceptance (#120)

Status: **preparation; no final build or publication yet**. The current release
authority declares **1.0.0 Beta 1 · numeric 1.0.0 · build 5.0.2**, arm64,
`com.tortillaflat.personal-dashboard`, intended tag `v1.0.0-beta.1`.
The exact source commit, App/DMG bytes and native results will be added after
independent review and the source-bound build. They are not inferred here.

[Machine-readable status](acceptance.json) · [Release authority](../../../release.json)
· [Packaging and initial candidate history](packaging.md) · [Publication runbook](publication.md)
· [External runtime](codex-runtime.md) · [Image identity](screenshots.json)
· [Independent integration review](review.md)

## Evidence already observed on the initial candidate

These are same-account, isolated synthetic observations on initial build 5.0.1,
source `72a96980c081e5fb23010e6ef5ff128a16ed9185`, Apple Silicon macOS 27.0.1.
They are retained historical evidence, not final-build certification or a clean
macOS-user installation.

| Initial-candidate observation | Observed result |
| --- | --- |
| Native create-space panel | Four compatibility directories, zero files before the first save |
| Task created/edited | Same saved object and ID read across Today, Tasks and Calendar |
| Local Habit without external snapshot | Created, completed, withdrawn and re-completed |
| First minimal Daily Record | Saved; browsing another date did not manufacture a record |
| Real external-file conflict | Stale save refused; draft retained; refresh/retry retained original, external and new content |
| Normal Quit/relaunch | Task, checked Habit and notes read back; nine Vault file byte hashes unchanged |
| Standalone Codex 0.160.0 | Detected by the actual App in an isolated signed-out profile; no model or sign-in pass |
| Morning automation | Default off; enable required no fictitious old schedule; missing-login failure stayed visibly failed |

Initial App/DMG signatures, content and actual hashes are recorded in
[packaging.md](packaging.md). The known copy defects observed there are repaired
in the final source; delayed-English startup and both empty-Habit/error states
are regression-tested. Final native verification remains pending.

## Final source and package binding

- Source commit: **not assigned to a built final candidate yet**.
- App / DMG / SHA-256 / signed manifest: **not built yet**.
- Independent integration review: **completed** at `3d94af1`; Standards P2
  arbitrary frontend-output deletion fixed and affected checks passed. Parent
  verification of the repair remains pending before final build.
- Candidate screenshots: initial 5.0.1 images retained; affected final captures
  and their actual source/build/hash receipt are **pending**.
- External runtime baseline: official standalone 0.160.0 install, protocol
  declaration and real initialize handshake already observed separately.
- Final toolchain: Rust 1.97.1, source commit
  `8bab26f4f68e0e26f0bb7960be334d5b520ea452`; the source retains the exact
  compiler-builtins notice and packages the selected toolchain's official
  standard-library notice corpus. Final signed-resource hashes are pending.

## Source preparation checks actually run

- Full frontend suite: **557 passed**, no failures or skips. After the final
  missing-source-read guard was tightened, its affected rendered Habits tests
  were repeated: **2 passed**. This does not certify an unbuilt App.
- Rust library suite: **110 passed, 6 explicitly gated tests ignored**. No ignored
  live-service check is treated as a pass.
- Production frontend build and release/helper JavaScript syntax checks: passed.
  After review, frontend artifact boundary tests: **2 passed**; actual diagnostic
  build followed by production build passed with no diagnostic assets retained.
- Package preparation/localization helper boundary checks: **22 passed** (also
  included in the full frontend suite). Fresh-cache tests create only empty
  temporary fixture directories, not a second Rust build cache.
- Actual selected-toolchain runtime notice preparation: **7 documents** collected
  with exact Rust source commit and verified compiler-builtins supplement. Final
  signed-resource/DMG verification has not run.
- Static site regeneration/check: **6 bilingual pages, 183 actual local links
  and assets**, declared build 5.0.2 and download gate still closed. Final browser
  layout and affected image refresh remain separate pending checks.

## Final native and installation matrix

| Check | Final-build status |
| --- | --- |
| Read-only mount; exact App copy into an owned non-indexed installation location; eject; verify running copied bytes | Not run |
| Empty personal-space creation; local Tasks/Habits/record; independent source readback | Not run |
| Local first use with a genuinely absent runtime | Not run; empty PATH alone does not prove absence of installed fallbacks |
| Local first use with an unauthenticated runtime | Not run |
| Repaired English startup metadata and bilingual local-Habit guidance | Not run |
| Real conflict, retained draft and external/original content | Not run |
| Normal Quit/relaunch persistence | Not run |
| Isolated internal 4.0.7 replacement; stable identity and saved preferences/data | Not run |
| Closed-app backup to a new recovery folder; select/reopen/read back | Not run |
| Clean macOS-user / another test machine installation | Not run; user accepted deferral for this run |
| Independent own ChatGPT account sign-in | Not run; user accepted deferral for this run |
| Real model modification and independent business readback | Not run |
| Real Chinese, English and mixed microphone recognition | Not run |
| Full live-AI automatic morning-plan save/readback | Not run |
| Physical network disconnection | Not run; no-runtime/no-login saves are different evidence |
| Lower macOS versions | Not run; 12.0 is deployment metadata, current host is 27.0.1 |
| Public browser asset download, Internet quarantine, Gatekeeper opening and anonymous readback | Not run; requires approved actual publication |

The root workflow owns actual final native execution and will replace individual
rows only with source/package-bound evidence. A model reply is not business-save
proof. A local launch or temporary HOME is not a clean-user or quarantined-download
pass. Accepted deferrals remain unperformed, not passed.

## Publication boundary

The user has not authorized public release of this specific final candidate and
content. Pages, the release tag, prerelease and public asset/download activation
remain unperformed. The website download control stays disabled. Review the exact
candidate, website/manual, restrictions, acceptance and remaining gaps first.
The parent specification and final release issue stay open until actual approved
publication and verification. No invitation is sent by this workflow.
