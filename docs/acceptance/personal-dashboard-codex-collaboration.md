# Codex collaboration packaged Mac acceptance

Date: 2026-09-27

Status: **partial.** The review P1s and real-model routing defects found during acceptance have regression coverage and fixes. The rebuilt arm64 package connects to the real Codex runtime and has passed real Task, plan, daytime-event, evening-note, and read-only context turns using an isolated synthetic Vault. Voice capture/recognition was explicitly deferred by the user until after release; it remains unaccepted, not passed. Real stop was confirmed. A live synthetic turn was interrupted after its runtime thread ID had persisted; after restart, App Server reconciliation confirmed the turn interrupted, did not replay it, and unpaused the Vault queue. An earlier interruption before any thread ID was saved exposed a recovery deadlock; the new package safely resolved that state because the code persists a thread ID before sending `turn/start`, so no model turn had been sent. The isolated in-process automatic-plan scheduler test passes without touching the existing external schedule. The frontend contract was repaired with a new project-owned Dashboard Tasks skill; `npm run test:frontend` now passes all 156 tests. PR #22 remains open and in draft; do not merge or mark Issue #11 accepted while voice remains deferred.

## Candidate and safety scope

- PR: [#22](https://github.com/absurdwall/personal-dashboard/pull/22).
- Branch: `codex/personal-dashboard-codex-collaboration`.
- The package was rebuilt from the current PR #22 worktree with the follow-up acceptance fixes described below.
- Bundle: `src-tauri/target/release/bundle/macos/Personal Dashboard.app`, version `3.0.4`, arm64.
- Rebuilt packaged executable SHA-256: `e482b4d1939f577dc475570dd9e943c02086e7152590a7e9716f75c958d0ece4`.
- The running candidate was launched with `PERSONAL_DASHBOARD_DATA_DIR`, `PERSONAL_DASHBOARD_BASELINE_FILE`, and `PERSONAL_DASHBOARD_LEGACY_EXERCISE_DIR` pointed at `/tmp/personal-dashboard-issue11-real.k5bQev`. The UI confirmed `Vault: synthetic-vault` throughout the manual business-data probes.
- All business-data probes used the isolated synthetic Vault. During an abrupt-restart UI probe, desktop automation rebound to another same-bundle-ID Dashboard window and captured one read-only accessibility snapshot of a non-synthetic workspace. No input or action was sent there and no data was changed; the UI recovery probe stopped when the candidate window could not be targeted reliably. The Dashboard-owned Codex app-support profile is shared by builds with the same bundle identifier; it is separate from the user's general Codex config and MCP servers, but is not isolated per candidate process.

## Packaged Mac checks

- `npm run build:mac`: passed for the rebuilt v3.0.4 arm64 candidate. The bundle is ad-hoc signed; notarization was skipped because Apple notarization credentials are not configured.
- `npm run build:mac`: passed for the rebuilt candidate. `codesign --verify --deep --strict --verbose=2` confirmed the bundle is valid on disk. The rebuilt candidate was launched against the isolated synthetic Vault for the runtime probes; `npm run accept:mac` was not rerun.
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
- The first misrouted daytime test artifact remains in the disposable synthetic 2026-09-27 evening review and is explicitly treated as a failed first attempt, not as successful daytime evidence.
- On the rebuilt package, a real evening-addition request using the corrected mapping produced the exact `saveEveningReview` approval card. After approval, the canonical Daily Record service confirmed `Synthetic acceptance checkpoint: evening addition routing passed in the rebuilt package.` was saved for 2026-09-27 as revision `2f2d2434db03565e`, and the selected-vault context showed it under evening additions.
- The earlier authorized voice probe played `Synthetic acceptance voice flow passed.` while the isolated package recorded; English (Australia) recognition returned `Today you`. In three later live UI attempts the package instead returned a generic local recognition failure. Separately, a generated synthetic TTS file was transcribed exactly by the installed local recognizer/helper, showing the locale and model are available. The editable-transcript handoff was verified in the earlier probe, but live speech recognition is not accepted. The user chose to defer further voice testing until after release and will check it personally; no additional recording is requested for this acceptance.
- A real active Codex turn was stopped from the packaged UI. The UI waited about 15 seconds, then confirmed Codex stopped; persisted state was `runState=stopped`, `deliveryState=stopped`, `resultChecked=true`. No write or model replay occurred.
- A synthetic request was interrupted during App Server `thread/start`, before the runtime thread ID was saved. The first check reproduced a deadlock: it reported no recorded thread but left `resultChecked=false` and the Vault queue paused. The queue worker persists a new thread ID before calling `turn/start`, so the request could not have reached the model. Recovery now marks this no-thread case reviewed locally, explains that no model turn was sent, and unpauses the Vault without replay. It only does this for a persisted `interrupted` run; a possibly-live `stop-unconfirmed` run stays paused. Backend regression coverage proves both boundaries, confirms the old request is not sent, and verifies a new explicit request can run.
- A long synthetic request was then interrupted from the real packaged app after the collaboration store showed `runState=thinking`, `deliveryState=in-progress`, and a persisted `runtimeThreadId`. After relaunch, the app restored it as interrupted with that ID. Clicking **Check saved result** queried the real App Server, which confirmed the turn interrupted; the UI showed “Nothing was replayed,” removed the recovery pause, and re-enabled the composer. The synthetic request did not change Dashboard data.
- An isolated integration regression starts the actual in-process scheduler with a manual clock at 06:59, advances it to 07:00, and verifies one automatic-plan session completes in a temporary Vault. It does not inspect, transfer, trigger, or modify any existing external schedule.

## Automated verification

- `cargo test --manifest-path src-tauri/Cargo.toml`: passed across all targets after the scheduler regression was added. After the interruption fix, `cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_workflow`: 18 passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_task_operations`: passed, including the new in-process scheduler trigger regression.
- `cargo test --manifest-path src-tauri/Cargo.toml --test collaboration_workflow`: 17 passed.
- `npm run build`: passed; `tests/frontend/collaboration-voice.test.ts`: 10 passed, including the asynchronous final-chunk/track-lifetime regression.
- `rustfmt --edition 2021 --check src-tauri/tests/collaboration_task_operations.rs` and `git diff --check`: passed after the follow-up changes and document refresh.
- `npm run test:frontend`: 156 passed, 0 failed. The previous test incorrectly required the Dashboard Tasks entry to be added to the external canonical `life-daily-loop` skill, and also conflated the separate Everyday Life Companion `Diary/` workflow with the `life/` Daily Record. The new `.agents/skills/personal-dashboard-daily-tasks/SKILL.md` owns the Dashboard Tasks adapter contract; the external skill and Everyday workflow remain unchanged. The integration test now checks the project-owned skill plus only the canonical `life/` Daily Record path.

## Remaining acceptance

- Voice capture/recognition remains unaccepted: the first authorized phrase was mistranscribed, and three later live captures returned generic recognition failure. Exact recognition of generated synthetic audio confirms the local recognizer can work, but does not replace a successful live microphone run. The user explicitly deferred this check until after release and will verify it personally; record no pass until then.
- Real runtime stop and post-restart reconciliation of an interrupted turn with a saved runtime thread ID are confirmed. An interruption before the thread ID is saved is also resolved safely without sending or replaying a turn. Neither path wrote synthetic Dashboard data.
- The isolated in-process automatic trigger passes. The existing external schedule was not inspected, handed off, changed, or triggered; no schedule decision is needed for this isolated test.
- Apple notarization is unavailable without configured Apple credentials.
- Voice capture/recognition is the remaining user-deferred acceptance item. The user will check it personally after release; record no pass until then.

PR #22 remains open as a draft for independent review. Do not merge it or mark Issue #11 accepted until the remaining packaged acceptance items are resolved or explicitly waived.
