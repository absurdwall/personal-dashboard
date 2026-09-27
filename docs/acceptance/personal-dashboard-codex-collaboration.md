# Codex collaboration packaged Mac acceptance

Date: 2026-09-27

Status: **partial. Both review P1s are fixed, the bundled App Server now accepts the scoped read-only profile, and the final arm64 package launches. The real signed-in collaboration flow remains pending OAuth completion in the isolated acceptance app.**

## Candidate and package

- PR: [#22](https://github.com/absurdwall/personal-dashboard/pull/22), kept open as a draft.
- Branch: `codex/personal-dashboard-codex-collaboration`.
- P1 fix revision: `bb19a35` (`fix: enforce collaboration intent and runtime permissions`).
- Bundle: `src-tauri/target/release/bundle/macos/Personal Dashboard.app`, version `3.0.4`, arm64.
- Executable SHA-256: `dde20876dc8ab3c081bad2e5ed26e5ce444420a606bfdd05228729b9ef3af07e`.
- `npm run build:mac`: passed. Tauri ad-hoc signed the bundle; notarization was skipped because Apple notarization credentials were not configured.
- `npm run accept:mac`: passed against the final bundle. Launch Services opened a relocated copy with isolated app data and no baseline source; the native arm64 process had no Python runtime or listening TCP socket.
- Manual UI probe used only `/tmp/personal-dashboard-issue11-real.k5bQev/synthetic-vault` and an app data directory under that same temporary root. The installed `/Applications/Personal Dashboard.app` and personal Vaults were not used or changed.

## Review P1 fixes

1. The runtime capability check now generates the App Server schema with `--experimental` and verifies named-profile plus explicit runtime-root fields for `thread/start`, `thread/resume`, and `turn/start`. The app-owned Codex config denies filesystem access at `:root`, allows only `:minimal` runtime reads and read access under the explicitly supplied empty collaboration runtime root, and disables network access for local commands. Requests select this profile and do not also send the legacy sandbox field.
2. Direct-write authorization now rejects future-operation wording when planning or future-time markers precede the operation. `future_task_intent_does_not_execute_a_task_immediately` failed before the fix because the task was applied, then passed after it. The existing positive test for a direct current instruction still passes.

The approved prototype A remains the UI constraint; this follow-up changed runtime permission selection and write authorization only.

## Runtime and packaged UI evidence

- Installed CLI: `codex-cli 0.158.0-alpha.2`, from the ChatGPT app bundle.
- The CLI's experimental schema advertises named `permissions` and `runtimeWorkspaceRoots` on all three required methods. The default schema export omits those fields, which caused the previous false negative.
- A real, unauthenticated App Server process loaded the isolated profile: `permissionProfile/list` returned `personal-dashboard-collaboration-read` as `allowed: true`; `thread/start` succeeded and returned that same `activePermissionProfile.id`.
- In the isolated packaged UI, Settings reported that the current runtime had confirmed the restricted read-only path and text collaboration was available. The selected Vault was the synthetic fixture and its current Tasks view was empty.
- The app opened the ChatGPT sign-in flow in the browser. OAuth was not completed, so no user message or model turn was sent and no Vault operation was attempted. The app remains isolated under the temporary profile above, ready to continue after sign-in.
- The packaged voice helper reports installed offline locales, including `en-US`. No locale was selected and no microphone capture was performed; those checks remain gated on the signed-in composer and the user's microphone permission.

## Verification

- `cargo test --manifest-path src-tauri/Cargo.toml`: passed across all targets.
- `npm run check`: passed (frontend build and `cargo check`).
- `rustfmt --edition 2021 --check src-tauri/src/collaboration.rs src-tauri/tests/collaboration_task_operations.rs`: passed.
- `git diff --check`: passed.
- `npm run test:frontend`: one integration-contract failure remains in `tests/frontend/daily-flow-integration.test.ts`. The failing test expects `## Personal Dashboard Tasks` and `personal-dashboard --daily-flow-tasks` in the canonical user-local `life-daily-loop` skill at `/Users/tingranwang/Documents/Codex/projects/tortilla-flat/.agents/skills/life-daily-loop/SKILL.md`. That external skill currently contains neither item. The other two tests in that file pass. The skill is outside this PR, so neither it nor the contract test was changed; this is a real cross-repository contract gap, not a failure introduced by the collaboration changes.

## Remaining real acceptance

Still unverified because the isolated OAuth login was not completed: authenticated model turns; task and Daily Record writes with existing-page linkage; the full morning/day/evening conversation; voice capture and editable transcript; interruption/restart recovery; and a real scheduled automatic trigger. The package and runtime protocol smoke tests do not substitute for those user-visible scenarios.

PR #22 remains a draft for the user's independent code review. Do not merge it or mark Issue #11 accepted until the remaining packaged scenarios pass.
