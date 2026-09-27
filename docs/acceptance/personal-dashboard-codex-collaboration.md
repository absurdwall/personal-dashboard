# Codex collaboration packaged Mac acceptance

Date: 2026-09-27

Status: **partial; the packaged launch passed, but full Issue #11 acceptance is blocked by the installed Codex App Server capability schema.**

## Candidate and package

- Branch: `codex/personal-dashboard-codex-collaboration`.
- Source commit for the candidate: `b645483` (`fix: enforce collaboration authorization boundaries`).
- Bundle: `src-tauri/target/release/bundle/macos/Personal Dashboard.app`, version `3.0.4`, arm64.
- Executable SHA-256: `9a3b664773ad898f3adcb111933635bb41216d910a09831f8c2f2b9ee82cc76e`.
- `caffeinate -is npm run build:mac`: passed. Tauri ad-hoc signed the bundle. Notarization was skipped because Apple notarization credentials were not configured.
- `npm run accept:mac`: passed. The acceptance script relocated the bundle, launched it through Launch Services with an isolated app profile and no baseline source, and verified the native arm64 process had no Python runtime or listening TCP socket.

## Isolated packaged UI check

The relocated package was opened with an app-owned temporary profile and a synthetic Vault. The Today screen identified the selected `vault` fixture and showed no Daily Record. The Codex settings view and explicit connection check returned promptly; the earlier App Server notification loop did not recur. A synthetic empty session was created and the UI reported it saved.

The live CLI is the ChatGPT-bundled `codex-cli 0.158.0-alpha.2`. Its generated `TurnStartParams` schema includes a `readOnly` sandbox and `networkAccess`, but does not include the `access.type=restricted`, `readableRoots`, and `includePlatformDefaults` fields required to confine reads to the isolated collaboration runtime. The packaged app therefore reports that text turns are blocked and sends no user message. The composer and voice controls remain disabled. No ChatGPT login, real model turn, tool write, voice transcription, morning/day/evening exchange, interruption recovery, or real automatic trigger was performed.

This is a deliberate security gate: accepting the CLI's broader read-only policy would not prove the selected-root boundary. Full Issue #11 packaged acceptance remains pending a Codex CLI/App Server that advertises the required restricted-read fields, followed by a rerun of the real login and interaction scenarios.

The UI check used only the synthetic Vault/profile. It did not change a personal Vault or record. The saved empty session was not verified across an app restart.

## Automated checks

- `npm run check`: passed (TypeScript build and `cargo check`).
- `cargo test --manifest-path src-tauri/Cargo.toml --lib`: passed, 52/52.
- `rustfmt --edition 2021 --check` on the changed Rust source and test files: passed.
- `git diff --check`: passed.
- `npm run test:frontend`: one existing environment contract failed in `tests/frontend/daily-flow-integration.test.ts`; it expects the user-local Life Daily Loop skill to contain `## Personal Dashboard Tasks` and `personal-dashboard --daily-flow-tasks`. That skill is an external user-local symlink and is not part of this Issue #11 branch. The repository test and the external skill were left unchanged.
- Repository-wide `cargo fmt --check` reports pre-existing formatting differences in unchanged `src-tauri/tests/appearance_workflow.rs` and `src-tauri/tests/daily_plan_workflow.rs`. Changed Rust files pass the focused formatter check above.

## Review and completion boundary

PR #22 remains a draft for independent code review. The package build and launch result do not close the real App Server, voice, persistence, or automation acceptance items listed in Issue #11. Do not mark Issue #11 accepted or resolved until those live scenarios pass.
