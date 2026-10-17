# PDEX-SPEC-02 reimplementation checkpoint — 2026-10-14

## Starting state and local history

The implementation branch is `codex/dashboard-experience-refinement-reimplementation`, whose merge base with `918e7e0d9c4b2c524c429bfd309482e328bc4c91` is that exact commit. Reading the spec and all eight ticket files at `918e7e0` confirms the parent was `ready-for-agent`/`open`, and PDEX-19–26 were each `ready-for-agent`, `open`, and `not started`. This is the pre-implementation state requested for the restart.

Earlier per-ticket branches, feature commits, evidence commits, refreshes, and no-fast-forward integration merges remain recorded in [`refinement-reimplementation-2026-10-13.md`](../refinement-reimplementation-2026-10-13.md). No branch was rewritten. This scoped follow-up is integration commit `e3b7cced4ba58e61bda69f12f520666259ade8f7`, parent `fcb5ab0`; it covers PDEX-21, PDEX-22, and PDEX-23 because those bounded interface changes share `frontend/main.ts` and `frontend/styles.css`.

## Scoped changes

- **PDEX-21:** Morning and Daytime now present the same current arrangement. A Daily Record with no current-arrangement section may display its saved baseline as the current-plan fallback, without gaining edit bindings. An explicitly empty current-arrangement section stays empty, so canceled baseline items do not reappear. Collaboration's Daily Record context no longer presents a second baseline panel. The next-day live clock label is concise and hour ticks no longer repeat a date.
- **PDEX-22:** Calendar Task details open compactly on Content, focus that field, and keep the selected date and scroll position. Tasks Content focus spacing is readable, and Add subtask remains available next to the collapsed parent relationship.
- **PDEX-23:** Context overlay positioning uses local CSS bounds, leaves the composer/voice controls above it, and shows the first context card body when opened. Long capability notes and empty operations no longer consume the message/history area. At 969×723 with lilac accent, the compact composer keeps editable draft, voice preview, help and send controls reachable.

The changes preserve existing shell typography, navigation, accent system, task data and source document. No dependency, service, deployment setting, main merge, remote operation, or app installation was added.

## Verification

| Command | Result |
| --- | --- |
| `npm run build` | Passed. |
| `node --test tests/frontend/collaboration-layout.test.ts` | 15/15 passed, including the requested 969×723 lilac/long-history/long-draft/context cases. |
| `node --test tests/frontend/compact-calendar.test.ts` | 22/22 passed. |
| `node --test tests/frontend/task-surface.test.ts` | 13/13 passed. |
| `node --test tests/frontend/unified-today-axis.test.ts` | 7/11 passed. Four older synthetic-axis checks still fail: source entries without plan bindings are rendered read-only; the early/late-fold fixture lacks a time that opens those windows; the after-midnight fixture does not open the late window. The preceding integrated checkpoint records the same four fixture limitations; these were not changed outside this scope. |
| `cargo test --manifest-path src-tauri/Cargo.toml --test today_workflow` | 56/56 passed. |
| `cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_workflow` | 36/36 passed. |
| `git diff --check` | Passed. |

At 969×723, production WebKit layout checks retain about 172px of message history against a 127px composer with the capability note closed; with the note expanded and Context open, history retains about 136px. The expanded note is 48px high and scrolls its 85px content. Context is about 336px tall, shows about 27px of the first card body, scrolls independently, and its close control preserves the draft and transcript. The 64px textarea scrolls long input internally; send, microphone and help controls remain pointer-reachable.

## Source-bound macOS candidate

- Source commit: `e3b7cced4ba58e61bda69f12f520666259ade8f7`.
- Candidate: `/tmp/pdex-review-20261014.noindex/reimplementation-candidate-final/release/bundle/macos/Personal Dashboard.app`.
- Bundle identifier: `com.tortillaflat.personal-dashboard`.
- Executable: `Contents/MacOS/personal-dashboard`; SHA-256 `2df16f287e30963b408b8e8c86d2c37a32a144aa6349647e52c72fe4fc7a2f40`.
- The executable contains the full source revision. `codesign --verify --deep --strict` passed; Tauri skipped notarization because notarization credentials were not configured.
- Built with the checked-in production config and an isolated Cargo target. No profile, Vault or fixed-clock override was passed. The candidate was not installed or launched. The existing review profile and Synthetic Vault were left in place for the independent reviewer.

PDEX-21/22/23 remain claimed/in progress. PDEX-26 remains `ready-for-agent` / `open` and unclaimed; this source-bound review candidate does not start or satisfy its packaged acceptance gate. PDEX-SPEC-02 remains `ready-for-agent` / `open`, with its stage updated to local implementation in progress. Packaged save/readback, full pointer/drag/IME/voice acceptance, and user acceptance remain outstanding. No ticket or parent status was closed.

## Follow-up after independent review — 2026-10-14

The reviewer reported two bounded regressions in the preceding candidate. Calendar's compact editor updated its saved draft but left collapsed list/schedule summaries and clear controls stale until another action. The recording layout fixture also omitted the production-visible Cancel control, which occupied an extra grid row and reduced history and Context body space.

- Integration fix commit: `20349aec369609ef02a9a1e7947417bc8036f6ac`, parent `2b9ea3f9ec638e13cd580c6ea8a7a900db43719c`, on `codex/dashboard-experience-refinement-reimplementation`.
- Calendar `input`/`change` now use the compact-surface draft path, which refreshes collapsed summaries and clear actions before Save. The behavioral regression edits list/date/start/end, checks updates on `input`, exercises both clear actions, cancels, and confirms no task write or source mutation.
- Collaboration places the visible recording Cancel control on the microphone/Send action row. The 969×723 lilac WebKit regression uses a long draft, live preview, stop state, visible Cancel, expanded capability notes, and open Context; it checks that Cancel is pointer-reachable and aligned with the other controls, message history is at least as tall as the composer, and the first Context body has at least 20px of visible, pointer-reachable area.
- `npm run build` passed. `node --test tests/frontend/collaboration-layout.test.ts` passed 15/15; `node --test tests/frontend/compact-calendar.test.ts` passed 23/23; `git diff --check` passed.

### New source-bound macOS candidate

- Built with `PERSONAL_DASHBOARD_BUILD_REVISION=20349aec369609ef02a9a1e7947417bc8036f6ac` and isolated `CARGO_TARGET_DIR=/tmp/pdex-review-20261014.noindex/reimplementation-20261014-calendar-voice-candidate`. No profile, Vault, or clock override was supplied.
- Candidate: `/tmp/pdex-review-20261014.noindex/reimplementation-20261014-calendar-voice-candidate/release/bundle/macos/Personal Dashboard.app`. Bundle identifier: `com.tortillaflat.personal-dashboard`; executable: `Contents/MacOS/personal-dashboard`; SHA-256: `e29fd8670b5bd16e21bbf303ecd84366f2ea3c7c63a61b79a43e1ac075573116`.
- The executable contains the full source revision. `codesign --verify --deep --strict` passed; the bundle has an ad-hoc signature. Tauri skipped notarization because notarization credentials were not configured.
- This candidate has not been installed or launched. It awaits the reviewer's check of the Calendar and recording-layout fixes. The installed App and user profile remain untouched.

The reviewer separately reported a synthetic native save/readback on a `.noindex` copy of the older `e3b7cc` source: a synthetic Current plan changed from 15:00–16:00 to 16:15–17:00 and remained after reopening Morning and Daytime; their reported record SHA-256 was `a88c7594d5026d4223fe7962db9bd99aee057d8ee53e0596ea4517c6d5086929`. They reported changing only that synthetic fixture, with no real Vault/profile mutation. This evidence does not cover commit `20349ae` or either newly repaired issue.

Ticket and parent statuses were not changed. PDEX-21/22/23 remain claimed/in progress; PDEX-26 remains open and dependency-blocked; PDEX-SPEC-02 remains open. The new candidate is not installed-App acceptance or a ticket closeout.

## Context entry icon cleanup — 2026-10-14

The reviewer found that the text-labeled Context floating entry still carried the old split-pane SVG. Source commit `0b08e5de018f2273a67e94e6fa9bf7c10c5c82dc` (parent `46d2c2948042b724067536ace56d3cca2948a2ea`) removes only that SVG and its now-unused local size rule. The Sessions sidebar icon remains. Button text, state behavior, and sizing rules are unchanged.

- `git diff --check` passed. `npm run build:mac` passed, including its frontend build step; tests were not run for this HTML/CSS-only cleanup.
- The new candidate at `/tmp/pdex-review-20261014.noindex/reimplementation-20261014-calendar-voice-candidate/release/bundle/macos/Personal Dashboard.app` contains the full `0b08e5de018f2273a67e94e6fa9bf7c10c5c82dc` source revision. Bundle identifier: `com.tortillaflat.personal-dashboard`; executable SHA-256: `8e43beff6cffa2dde5a664eb4ba0182181d81e7746d8eb3c96846f43c87a0ba2`; `codesign --verify --deep --strict` passed. Tauri skipped notarization because notarization credentials were not configured.
- Before rebuilding, the prior `20349ae` candidate was copied to `/tmp/pdex-review-20261014.noindex/candidate-versions/20349aec-calendar-voice/Personal Dashboard.app` and verified intact: SHA-256 `e29fd8670b5bd16e21bbf303ecd84366f2ea3c7c63a61b79a43e1ac075573116`, embedded source revision `20349aec369609ef02a9a1e7947417bc8036f6ac`, and strict signature verification passed.
- The new candidate was not installed or launched. Ticket and parent statuses remain unchanged; the new icon cleanup does not establish installed-App acceptance or close PDEX-SPEC-02.

## Final installed-source checkpoint — 2026-10-14

**Source:** the user's sanitized [installation receipt](</Users/tingranwang/Documents/Codex/Projectless task folder/2026-10-14/new-chat/outputs/personal-dashboard-review-install-2026-10-14.json>) and the reviewer's final handoff. These are reviewer-reported observations, not a fresh independent inspection by this workspace.

- The receipt records atomic replacement and launch of `/Applications/Personal Dashboard.app` from source `0b08e5de018f2273a67e94e6fa9bf7c10c5c82dc`, installed executable SHA-256 `8e43beff6cffa2dde5a664eb4ba0182181d81e7746d8eb3c96846f43c87a0ba2`, production bundle identifier `com.tortillaflat.personal-dashboard`, verified backup, and strict signature verification. The older `20349ae` bundle remains preserved in the version directory recorded above. The reviewer confirms no test environment in the installed app.
- The reviewer reports the normal profile and Tortilla Flat Vault were used with the existing purple theme and date `2026-10-14`. Morning showed the same time-qualified arrangement as Daytime without a duplicate list. They report byte-for-byte unchanged content across 91 Dashboard files, 40 Daily Records, and 6 `.obsidian` files; Vault selection, appearance, language, and full Collaboration v1 JSON semantics were preserved. The receipt confirms its `authorityPreserved` and `preferencesAndCollaborationPreserved` checks.
- For source `20349ae`, the reviewer reports native Calendar long-Content/focus spacing and draft date `2026-09-08` → `2026-09-09` updating the summary immediately and while collapsed; Cancel left canonical date `2026-09-08`. The receipt marks these Calendar checks complete. The earlier source `e3b7cc` synthetic Current-plan save/readback, Morning/Daytime consistency, baseline preservation, and relaunch check is prior-source evidence only; it is not presented as a fresh persistence test on source `0b08e5d`.
- On source `0b08e5d`, the reviewer reports Context displays text only and Sessions keeps its icon, long Collaboration and retro drafts remain, ChatGPT is connected, and Send/dictation controls are enabled. No real message was sent and no hardware recording was started; hardware-voice acceptance and IME remain unverified.
- The receipt records zero remaining Spec findings after the two repairs and zero findings for the final text-only Context change on both Standards and Spec review axes. It explicitly leaves `humanAcceptance` pending and `broadSpecAcceptance` open. The installed app remains in Collaboration in the foreground for the user's visual review.

No local ticket or parent lifecycle/claim was changed. PDEX-21/22/23 remain in progress; PDEX-26 and PDEX-SPEC-02 remain open. Full PDEX-26 criteria, including hardware voice and IME, are not inferred complete from this checkpoint.

## Management summary synchronization — 2026-10-14

The local `tortilla-flat-management` helper confirmed operation `pdex02-installed-visual-pending-20261014-01` (`submitSummary`). The canonical Registry now has revision `5d255f2456df4d89`; a subsequent `inspect` confirmed the new progress summary, its source evidence revisions, and the pending user visual acceptance boundary. Coverage is recorded as partial: the collaboration source remains excluded because of three malformed historical references, and GitHub Issues could not be read because authentication was unavailable. No ticket or parent status was changed. The older partial recovery operation `pdex-spec-02-local-publication-summary-20261011` remains present and untouched.
