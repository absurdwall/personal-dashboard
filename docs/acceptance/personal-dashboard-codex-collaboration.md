# Codex collaboration packaged Mac acceptance

Date: 2026-09-27

Status: **partial.** The review P1s and real-model routing defects found during acceptance have regression coverage and fixes. The current arm64 package connects to the real Codex runtime and has passed real Task, plan, daytime-event, evening-note, and read-only context turns using an isolated synthetic Vault. One synthetic voice recording completed local transcription, but the recognizer returned the wrong words; after transcript correction, the read-only turn passed. Voice-recognition accuracy, queue-interruption recovery, and a scheduled automatic trigger remain unverified. One frontend contract test depends on an external user-local skill that is missing the expected contract. PR #22 remains open and in draft; do not merge or mark Issue #11 accepted yet.

## Candidate and safety scope

- PR: [#22](https://github.com/absurdwall/personal-dashboard/pull/22).
- Branch: `codex/personal-dashboard-codex-collaboration`.
- Source changes are based on `632e63b` and include the acceptance-driven fixes described below.
- Bundle: `src-tauri/target/release/bundle/macos/Personal Dashboard.app`, version `3.0.4`, arm64.
- Packaged executable SHA-256: `fa1e7c8e047b2c3823e274cb5da798eae01bc0885beb1d677c146640f66fc9b7`.
- The running candidate was launched with `PERSONAL_DASHBOARD_DATA_DIR`, `PERSONAL_DASHBOARD_BASELINE_FILE`, and `PERSONAL_DASHBOARD_LEGACY_EXERCISE_DIR` pointed at `/tmp/personal-dashboard-issue11-real.k5bQev`. The UI confirmed `Vault: synthetic-vault` throughout the manual business-data probes.
- The installed `/Applications/Personal Dashboard.app` and personal Vaults were not used or changed. The Dashboard-owned Codex app-support profile is shared by builds with the same bundle identifier; it is separate from the user's general Codex config and MCP servers, but is not isolated per candidate process.

## Packaged Mac checks

- `npm run build:mac`: passed for v3.0.4. The bundle is ad-hoc signed; notarization was skipped because Apple notarization credentials are not configured.
- `npm run accept:mac`: passed. The relocated bundle opened through Launch Services with isolated app data and no baseline source. The native process was arm64, with no Python runtime or listening TCP socket.
- `codesign --verify --deep --strict --verbose=2`: passed.
- The approval-first prototype A layout was preserved; these follow-up changes affect runtime instructions, authorization checks, context data, and tests rather than the accepted layout.

## Review and acceptance fixes

1. **Review P1 — text and voice collaboration unavailable in the tested runtime.** The runtime capability check now reads the App Server schema with `--experimental` and verifies named permission-profile plus explicit runtime-root fields for `thread/start`, `thread/resume`, and `turn/start`. Requests select the Dashboard-owned restricted profile and do not also send the legacy sandbox field. The packaged app now connects to the real runtime and completes real text turns. The separate voice-recognition result is recorded below.
2. **Review P1 — future Task intent could pass direct-write authorization.** Direct-write authorization now rejects future-operation wording when planning or future-time markers precede the operation. `future_task_intent_does_not_execute_a_task_immediately` failed before the authorization fix because the future-intent wording executed a Task, then passed after the fix; the direct-current-instruction case remains green.
3. A real model initially attempted unsupported `appendDailyRecord` / `addShortRecord` operations for a new note. The registered schema and runtime instructions now route evening additions through `saveEveningReview` with `mode=addition` and exact `content`, and reject those invented operation names with the canonical mapping. Regression coverage checks the schema guidance and confirms the unsupported operation does not write.
4. A real model then routed an explicit daytime event into the evening review. The updated `saveDailyPlan` schema and runtime instructions direct factual daytime updates to `transition=daytimeEvent`, preserve the current arrangement and morning baseline, and place the exact fact under `## 白天更新`. The real packaged daytime proposal below now follows that route.
5. The current context previously omitted saved evening additions from the Daily Record pane sent to the model. `daily_record_pane` now includes them, and its service-level fixture asserts those notes are visible. A final real read-only model turn enumerated the exact daytime event and both existing evening additions from the supplied synthetic Vault context without changing data.

## Real Codex runtime and collaboration flow

- Installed CLI observed: `codex-cli 0.158.0-alpha.2`, from the ChatGPT app bundle. The experimental schema exposes named permissions and runtime roots; the default schema export omits those fields. A real App Server process loaded `personal-dashboard-collaboration-read` as allowed, and `thread/start` returned that same `activePermissionProfile.id`.
- The packaged UI connected to the authenticated ChatGPT/Codex runtime. Initial startup can take about two minutes while connection checks finish; the composer became available after the connection completed.
- A real read-only turn reported the selected synthetic context without proposing a write.
- A real Task request produced an approval proposal. After approval, the canonical Tasks service saved Task `task-0cd8f1d751f47f23` due 2026-10-01. The session and saved Task were restored after relaunch in the synthetic Vault.
- A real 2026-09-28 morning-plan request correctly reported that saved preference sources were missing. After the user supplied synthetic-only planning instructions, the model proposed three broad untimed blocks; approval saved the plan and basis (`4e750afb6871c5ba`).
- A future-dated request claiming that a daytime event had already occurred produced a proposal but was rejected at approval with `不能在未来日期记录已经发生的事实。请选择今天或过去日期。`; no write occurred.
- On the rebuilt package, a real 2026-09-27 daytime-event request produced an exact `白天更新` approval card. Approval saved it to the synthetic Daily Record (revision `561e96376c4c9815`), and the current context displayed the exact fact under the daytime event route.
- A follow-up read-only real model turn returned the exact daytime event plus these two already-saved evening additions, with no change: `Completed the synthetic collaboration acceptance task.` and `Synthetic acceptance checkpoint: the daytime update flow is verified.`
- The first misrouted daytime test artifact remains in the disposable synthetic 2026-09-27 evening review and is explicitly treated as a failed first attempt, not as successful daytime evidence. It did not touch personal data.
- On the rebuilt package, a real evening-addition request using the corrected mapping produced the exact `saveEveningReview` approval card. After approval, the canonical Daily Record service confirmed `Synthetic acceptance checkpoint: evening addition routing passed in the rebuilt package.` was saved for 2026-09-27 as revision `2f2d2434db03565e`, and the selected-vault context showed it under evening additions.
- After explicit user approval, one synthetic phrase (`Synthetic acceptance voice flow passed.`) was played while the isolated package recorded. The app completed local transcription and discarded the recording, but English (Australia) recognition returned `Today you`, not the spoken phrase. The editable transcript was changed to `Using only the selected synthetic-vault, state the exact 2026-09-27 daytime event and latest evening addition. Do not make changes.` The connected runtime returned the exact event and latest evening addition, with no changes. No second recording was made. This validates capture, transcript editing, and handoff, but not transcript accuracy.

## Automated verification

- `cargo test --manifest-path src-tauri/Cargo.toml`: passed across all targets after the latest Rust changes.
- `cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_task_operations`: 36 passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_workflow`: 17 passed.
- `npm run check`: passed (frontend build and `cargo check`).
- `rustfmt --edition 2021 --check src-tauri/src/collaboration.rs src-tauri/tests/collaboration_task_operations.rs src-tauri/tests/collaboration_workflow.rs`: passed.
- `git diff --check`: passed before this document refresh; it will be rerun before commit.
- `npm run test:frontend`: all but one test passed. `tests/frontend/daily-flow-integration.test.ts` expects `## Personal Dashboard Tasks` and `personal-dashboard --daily-flow-tasks` in the canonical user-local skill at `/Users/tingranwang/Documents/Codex/projects/tortilla-flat/.agents/skills/life-daily-loop/SKILL.md`; that external file contains neither. The skill and contract test are outside this PR and were not changed. Treat this as an unresolved cross-repository contract gap, not as a pass.

## Remaining acceptance

- Voice capture and transcript editing were exercised after explicit user approval; the local recognizer returned inaccurate text (`Today you`) from the single synthetic phrase. The transcript was manually corrected and the read-only model turn passed, but recognition accuracy remains incomplete. The app discarded the audio after local transcription; no second recording was made.
- Queue interruption and recovery after cancelling/interruption remain unverified. Automated queue/cancel/restart coverage passes, and normal session/Task restore after relaunch passed; these do not prove real interruption recovery.
- A real scheduled automatic trigger remains unverified because the existing external schedule handoff has not been reviewed or authorized. It was not modified or triggered.
- Apple notarization is unavailable without configured Apple credentials.
- The single external-skill frontend contract failure described above remains open.

PR #22 remains open as a draft for independent review. Do not merge it or mark Issue #11 accepted until the remaining packaged acceptance items are resolved or explicitly waived.
