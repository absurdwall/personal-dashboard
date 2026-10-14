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

PDEX-21/22/23 remain claimed/in progress. PDEX-26 and PDEX-SPEC-02 remain open; this candidate does not establish packaged save/readback, full pointer/drag/IME/voice acceptance, or user acceptance. No ticket or parent status was closed.
