# Codex collaboration packaged Mac acceptance

Date: 2026-09-27

Status: **partial. The two review P1s are fixed. The latest arm64 package builds and passes isolated launch acceptance. A real packaged read-only turn and approved Task creation passed on the earlier 3.0.4 candidate and survived reopening in the latest build. A Daily Record note attempt failed to produce an approval card; tool guidance now makes review-first routing explicit, but the updated package still needs a real model turn. The browser is waiting for confirmation to authorize the ChatGPT Personal account for Codex.**

## Candidate and package

- PR: [#22](https://github.com/absurdwall/personal-dashboard/pull/22), kept open as a draft.
- Branch: `codex/personal-dashboard-codex-collaboration`.
- P1 fix revision: `bb19a35` (`fix: enforce collaboration intent and runtime permissions`).
- Bundle: `src-tauri/target/release/bundle/macos/Personal Dashboard.app`, version `3.0.4`, arm64.
- Latest executable SHA-256: `fce2d51fb0b2dd98e40225dfd8c829637c952eab85263e02063e6d4d49a1c67c`.
- `npm run build:mac`: passed. Tauri ad-hoc signed the bundle; notarization was skipped because Apple notarization credentials were not configured.
- `npm run accept:mac`: passed against the final bundle. Launch Services opened a relocated copy with isolated app data and no baseline source; the native arm64 process had no Python runtime or listening TCP socket.
- Manual UI probes used only the synthetic `synthetic-vault` under `/tmp/personal-dashboard-issue11-real.k5bQev`. The installed `/Applications/Personal Dashboard.app` and personal Vaults were not used or changed.

## Review P1 fixes

1. The runtime capability check now generates the App Server schema with `--experimental` and verifies named-profile plus explicit runtime-root fields for `thread/start`, `thread/resume`, and `turn/start`. The app-owned Codex config denies filesystem access at `:root`, allows only `:minimal` runtime reads and read access under the explicitly supplied empty collaboration runtime root, and disables network access for local commands. Requests select this profile and do not also send the legacy sandbox field.
2. Direct-write authorization now rejects future-operation wording when planning or future-time markers precede the operation. `future_task_intent_does_not_execute_a_task_immediately` failed before the fix because the task was applied, then passed after it. The existing positive test for a direct current instruction still passes.
3. A real packaged note request returned a text-only response and no approval card. The tool schema and runtime instructions now explicitly require `prepareProposal` for requests to review, see a proposal, or wait for approval before saving. `daily_record_note_request_creates_review_proposal_without_mutation` covers the exact request at the application seam, and the registered-tool contract asserts that the runtime sees this routing instruction. The original model call arguments were not captured, so a wrong `executionMode` remains a likely explanation rather than a proven cause.

The approved prototype A remains the UI constraint; this follow-up changed runtime permission selection and write authorization only.

## Runtime and packaged UI evidence

- Installed CLI: `codex-cli 0.158.0-alpha.2`, from the ChatGPT app bundle.
- The CLI's experimental schema advertises named `permissions` and `runtimeWorkspaceRoots` on all three required methods. The default schema export omits those fields, which caused the previous false negative.
- A real, unauthenticated App Server process loaded the Dashboard-owned scoped profile: `permissionProfile/list` returned `personal-dashboard-collaboration-read` as `allowed: true`; `thread/start` succeeded and returned that same `activePermissionProfile.id`.
- The app-owned `CODEX_HOME` lives in the standard Dashboard app-support directory, so Dashboard candidate and installed builds with this bundle identifier share it. It is separate from the user's general Codex configuration and MCP servers, but it is not isolated per candidate process; the manual business-data probe remained bound to the temporary synthetic Vault.
- Before the routing-guidance change, the packaged collaboration UI reported ChatGPT connected and the runtime's restricted read-only path verified. A real read-only question reported a missing Daily Record and an empty Tasks list without proposing a change.
- A real Task request produced an approval proposal. After approval, the Tasks service confirmed a canonical Task (`task-0cd8f1d751f47f23`, due 2026-10-01). Relaunching the latest package restored the conversation, proposal result, and Task in the same synthetic Vault. The Daily Record remained missing.
- A real request to add a Daily Record note returned text only: no approval card was created and no Daily Record was written. The app response said the Dashboard tool did not accept the operation. The updated approval-routing guidance is now in the package, but a new real model turn on this exact build is pending the user's confirmation on the ChatGPT workspace consent page. The latest build's composer remains disabled while its connection check is in progress.
- The browser flow has selected the existing Personal account and now presents a `Continue` consent step for Codex. The user was asked whether to authorize the local app's Codex runtime; no `Continue` action has been taken yet.
- The packaged voice helper reports installed offline locales, including `en-US`. No microphone permission prompt or audio capture has been accepted or performed.

## Verification

- `cargo test --manifest-path src-tauri/Cargo.toml`: passed across all targets.
- `cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_task_operations`: passed, 34 tests, including note proposal routing and future-intent authorization.
- `npm run check`: passed (frontend build and `cargo check`).
- `rustfmt --edition 2021 --check src-tauri/src/collaboration.rs src-tauri/tests/collaboration_task_operations.rs`: passed.
- `git diff --check`: passed.
- `npm run test:frontend`: one integration-contract failure remains in `tests/frontend/daily-flow-integration.test.ts`. The failing test expects `## Personal Dashboard Tasks` and `personal-dashboard --daily-flow-tasks` in the canonical user-local `life-daily-loop` skill at `/Users/tingranwang/Documents/Codex/projects/tortilla-flat/.agents/skills/life-daily-loop/SKILL.md`. That external skill currently contains neither item. The other two tests in that file pass. The skill is outside this PR, so neither it nor the contract test was changed; this is a real cross-repository contract gap, not a failure introduced by the collaboration changes.

## Remaining real acceptance

The updated package still needs a real model turn for the exact Daily Record note request and a full morning/day/evening conversation. Voice capture and editable transcript remain unverified and may require a separate microphone permission prompt. A real scheduled automatic trigger remains unverified because the app requires the existing external schedule handoff to be explicitly reviewed first. Restart recovery for the existing session and saved Task is verified; queue interruption recovery remains unverified.

PR #22 remains a draft for the user's independent code review. Do not merge it or mark Issue #11 accepted until the remaining packaged scenarios pass.
