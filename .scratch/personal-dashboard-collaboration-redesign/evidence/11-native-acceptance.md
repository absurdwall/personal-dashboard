# PDCR-11 native acceptance — partial, gates retained

2026-10-09. This record does not close PDCR-11, its blockers, or the parent spec.
Actual native evidence and deterministic fixture evidence remain separate.
No installation, main merge/push, GitHub call, dependency or external Dida
mutation was performed.

## Candidate identity

- Initial complete candidate: `88315b9b85093f93bca33c4bed49e7dde76f0ee3`.
  Its actual daytime/mixed/queue/keyboard/retro observations are historical
  observations, not proof that the later review fixes were exercised.
- Rebuilt complete candidate: `7b3dc8dc4fd99496c12e4338a886b2f240335bf2`;
  app `4.0.7`, installed runtime `codex-cli 0.160.0`, actual effective model
  `gpt-6.1-sol`, requested model/effort defaults. Effective reasoning effort
  was unavailable and remains an explicit configuration gap.
- Build: existing dependencies, normal `npm run tauri -- build --bundles app`,
  `PERSONAL_DASHBOARD_BUILD_REVISION` pinned to the full candidate SHA.
  Private build log and 60 frontend/dist/usage source hashes are in
  `19-fixed-build-manifest.json`.
- Original built executable SHA256:
  `383944b324375e9db2d62c283c2890882ad0c38c10b036f7c070d6ff8409ee49`.
  Owned signed executable SHA256:
  `51277b7a73f1746f71b924cc12b7e6046117fb9c7bf39d508b6c20aeaa4627b0`.
  The copy uses acceptance bundle ID/name `PDCR11 Acceptance` and was ad-hoc
  re-signed. Normalizing only signature size/header fields yields matching
  pre-signature bytes, SHA256
  `002b534fdf637e67b6706e6ebfefc7dc512886ea3755216df66369a53ee2ee65`.
- Work branch merged docs-only integration `397cc31`; its `frontend`,
  `src-tauri` and `.agents` trees equal the rebuilt `7b3dc8` product trees.
- Private evidence: `/tmp/pdcr-11.0W2AXj.noindex/evidence/`.
  Synthetic Vaults A/B/C, selected workspace/profile, clock/offset, PIDs,
  executable paths, configuration provenance and source hashes are recorded
  there. No raw account identity, credentials or personal screenshots are
  committed here. Temporary bundles remain outside Spotlight indexing.

## Actual observations

| Scenario | Observed result | Private evidence |
|---|---|---|
| Daytime, `88315b9` | Actual saved fact, original baseline/facts/arrangement retained; unsent newer draft survived refresh; source link opened visible Daytime | `02-daytime-checks.json`, `history-02-daytime.json`, source-page AX/PNG |
| Mixed intent, `88315b9` | Five applied list/Task/fact/completion effects; future Task schedule Oct10 14:30 remains separate from unscheduled Task's actual completion Oct8 15:20 | `history-03-mixed.json`, canonical tasks readback, native Tasks/linked Markdown list |
| Partial calls, `88315b9` | Six malformed calls rejected before mutation, later valid calls saved; failed calls are not business writes | `09-workflow-mixed-export.json` |
| Queue/Stop/correction, `88315b9` | Waiting-for-stop preceded confirmed stopped; two queued messages paused; fresh correction saved first; one request removed with text retained; explicit Continue saved the other once | `history-04-stop.json`, `history-04-correction-resume.json` |
| Cmd+Enter, `88315b9` | Actual CUA keyboard action dispatched a read-only query into the isolated profile and cleared consumed draft; earlier CGEvent attempts did not dispatch and are injection-only failures | saved request `run-18dcf5a64ac2e288-a5`, before/after AX and canonical/profile identity |
| Reopen/upgrade | Actual sessions/messages/item identities/statuses and canonical sources retained; no duplicate effects; fixed candidate's exact PID AX showed the persisted unsent draft | `07-*-projection.json`, `10-fixed-reopened.ax.txt` |
| Fresh `7b3dc8` save | Actual local Task plus Oct9 daytime fact applied in A; native sources/readback retained earlier content; captured configuration contains exact `7b3dc8` | `history-11-fixed-save.json`, `13-fixed-workflow-export.json` |
| Vault isolation, `7b3dc8` | Native picker selected B; B page showed only B's marker, no A baseline/new fact; A read remained bound to A | `12-vault-b-selected.ax.txt/png`, `history-12-vault-switch.json` |
| Controlled delayed Stop, `7b3dc8` | After actual B Task save, unique owned AppServer event delivery paused 10s; product Stop showed pending then confirmed after guarded resume; applied receipt retained | `14-controlled-stop.json`, pending AX/history |
| Lost terminal/readback, `7b3dc8` | Exact owned AppServer termination after canonical save yielded interrupted/EOF. Unrelated read completed. Old native readback then checked original request without replay, retained exact two original work items and configuration, kept newer execution owner, and left exactly one saved Task | `15-controlled-unknown.json`, `15-readback-checks.json`, immutable histories |
| Across 04:00, `7b3dc8` | Actual queued fact created 03:59 executed 04:00:39–48 and wrote captured Oct9. Original baseline/current arrangement retained. Initial read naturally ran 03:59:59–04:00:39; proposed pause correctly refused after boundary, so no crossing fault was applied | `16-clock-identity.json`, `16-boundary-actual-checks.json`, `history-16-cross04-completed.json` |
| Automatic initial plan, `7b3dc8` | Actual scheduled 04:02 round saved one Oct10 InitialPlan. Oct9 existing plan preserved. Only new canonical file was Oct10 Daily; all existing hashes unchanged, no Task/Habit/background/ordinary-document writes | `history-17-automatic.json`, `17-auto-canonical-{before,after}.json` |

The advancing-clock scenario changed only a process UTC offset (`+07:21`),
not Mac time/timezone. Own settings fixture enabled 04:02 with handoff true;
the original disabled settings are pinned in `16-automation-settings-before.json`.
No external scheduler/job was changed. Civil activity date Oct10 and captured
Daily target Oct9 before 04:00 are distinct. The post-boundary Task retained
that conversation's captured target; no claim that every browsed date resets.

The native generation race was not deliberately forced. Visible A/B isolation
supplements the actual production-handler delayed-success/error, cancelled
picker retry and historical-owner regressions documented in
[review fixes](review-fixes.md). These supporting tests establish the guards;
the ordinary native switch alone would not prove a raced response was discarded.

## Two retros and renderer

Actual `/retro` and natural-language period review consumed all three typed
history domains. Runtime call code explicitly invoked `tasks`, `dailyRecords`
and `habits`; each call returned actual adapter sources. On `88315b9`, the report
separated Task completion Oct8 from Oct9 recording and local Habit completion
from snapshot coverage. The initially invalid manually seeded snapshot was
reported unavailable; it was a fixture setup gap, then separately corrected.
The exact Habit/date link opened canonical local witness and source observations.

On `7b3dc8`, new `/retro` reported Oct3–9 from current lived date Oct10, while
the browsed conversation target remained Oct9. Natural language explicitly
selected Oct9–10, separated original baseline, queued actual fact and automatic
InitialPlan, and qualified missing Task/Habit/activity history. Three canonical
source hashes remained unchanged after each report; no automatic adoption or
background write occurred. Immutable snapshots: `history-18-fixed-retro.json`
and `history-18-fixed-retro-explicit.json`.

Native paragraphs, lists, completed Work-history folding/expansion and trusted
Task/record/Habit links were observed. Model-generated tables displayed literal
Markdown pipes with navigable links; spec section6 promises paragraphs/lists/
checklist/internal links, not table rendering. Checklist has supporting production renderer regressions. A separate injected
legacy fixture was subsequently loaded through the actual native store/renderer
(see below); live spoken transcript remains unobserved.

The developer workflow skill consumed a NEW actual `7b3dc8` execution
`run-18dcf6794ca982e0-9` through the public reader. Its immutable source copy
`history-11-fixed-save.json` has SHA256
`bbc4d06413017f754bc61cbb6832c2de65ca7182cf6e8e1efcd7c2cd20bb6728`.
All 21 exported JSON pointers/source hashes resolved against those exact bytes.
Review and validation: `13-fixed-workflow-retro.md`,
`13-fixed-reference-validation.json`. It identified one rejected missing-content
call before two applied effects; improvement guidance is explicitly an inference
from the actual call and required-field validator, not a semantic classifier.

Readable `commentary`/`final_answer` phases and runtime token usage were present;
no readable reasoning summary item was observed. Fresh save's total101613 and
last26042 tokens are respectively thread aggregate and runtime-reported-last
aggregate; neither is per-tool cost or a complete execution allocation.

## Native legacy fixture — readable, missing-process label absent

After the main cleanup, one bounded no-auth check launched the exact signed
`7b3dc8` candidate into a separate owned synthetic legacy profile. The injected
session omitted `workHistory` and `usageBindings` and retained one original user
message and assistant reply. Exact-PID AX confirmed both original texts and the
reply's Markdown list were readable. It showed “Codex CLI found · ChatGPT is not
connected”; no model request, new execution or credential copy was made. All
four existing Vault C file hashes were unchanged, and message bytes remained
unchanged. This is injected legacy fixture evidence through the real native
store/renderer, not real personal history or a model execution.

**The missing-process unavailable label was not displayed.** Production
`frontend/main.ts` appends work history only when a matching history exists;
absence was silently omitted. Thus old text compatibility was observed, but the
explicit missing-process marker required by spec section5 and its history/restart
failure row was a presentation gap on `7b3dc8`. The actual bounded `c5be634`
reassessment below resolves this marker gap; supporting fallback tests alone
were not treated as its native pass. The initial synthetic fixture incorrectly used
an array for `continuityNotes`; correcting it to the existing map schema resolved
its load error. That setup error is not a product failure.

Private witnesses: `21-legacy-fixture.json`, `21-legacy-launch.json`,
`21-legacy-work.ax.txt`, `21-legacy-native.png`, `21-legacy-checks.json`, and
canonical before/after hashes. Final exact owned PID8039 and its WebKit descendants
were stopped and the bundle unregistered again. All owned auth files remain
absent; installed PID72704/executable remains unchanged. The subsequent correction
is reassessed below with a fresh, bounded no-auth native run.

## Legacy marker correction — fresh `c5be634` native reassessment

The narrow correction was rebuilt from exact source
`c5be634d75b8921a6244135593b3128588398150`, app4.0.7. Product diff from `7b3dc8`
is exactly three frontend source files: missing-history rendering, its production
caller and the translation. `src-tauri` and `.agents` are unchanged. Existing
Work-history rendering with present evidence is unchanged. Root's 378 frontend
checks/build and independent targeted Standards/Spec review are recorded in
[final combination checks](final-combination-checks.md) and
[review](review.md). Docs-only integration `cd67ec2` was merged afterward and
has identical product trees; the bundle remains pinned to `c5be634`.

Build used the same existing-dependency Tauri command with the full source SHA
in `PERSONAL_DASHBOARD_BUILD_REVISION`; build succeeded and the full revision
is embedded in the original binary. Original built executable SHA256:
`33ba9aa2c6fba01fa83c2b2082830b984bc28c7ecfd37791af9a0a4fb9b37db4`.
Owned signed executable SHA256:
`4325390f1f8ddf6ab9379b04ccf34c6f65ae471255808179fec423810550167a`.
Acceptance bundle ID `com.tortillaflat.personal-dashboard.acceptance.pdcr11.legacy`,
name/display `PDCR11 Legacy Acceptance`, ad-hoc re-sign verified. The original
built bundle is archived unchanged outside Spotlight; hashes/signature details,
source hashes and bundle file hashes are in `22-legacy-build-manifest.json`.
The hash difference is recorded as acceptance metadata/signing, not inferred
source equivalence from a display name. No model was invoked for this check;
there is no new effective-model claim. Prior `7b3dc8` model provenance is retained.

The same immutable21 legacy fixture/profile was loaded through the actual native
store and production renderer on exact owned PID13784, with isolated profile,
HOME/CODEX_HOME/XDG paths and disabled automation. English AX displayed:
“Work history unavailable. Missing usage and change evidence remain unavailable;
original messages and saved outcomes are preserved.” After the native language
switch, Chinese AX and a scrolled visible-window screenshot displayed:
“过程记录不可用；缺失的 usage 和变更证据不可用。原文与已保存结果保留。”
Both original user/reply texts and the Markdown bullet remained readable.
No CUA/rebind, login, Send, model request or microphone action was used.

Persisted original messages were exactly equal. No new execution/runtime thread,
work-history item or usage was generated. All four canonical Vault C hashes
matched the immutable21 before/after hashes, and owned auth count stayed zero.
Private witnesses: `22-legacy-{en,zh}.ax.txt`, `22-legacy-zh-visible.png`,
`22-legacy-checks.json`, `22-legacy-history-after.json`, `22-legacy-build.log`.
Exact PID13784 and its owned WebKit descendants were stopped; the new bundle
and generated build path were unregistered/archived into `.noindex`. Candidate
process count and owned registrations are zero. Installed PID72704/executable
was preserved; temporary `node_modules` link removed.

This fresh run accepts the corrected legacy marker and retained text/list only.
It does not relabel previous actual business executions as `c5be634` executions.
The code diff leaves prior `7b3dc8` save/readback, execution ownership, Vault/date,
natural cross04 queue, automatic initial-plan-only, personal retro and immutable
workflow-export behavior unaffected; their evidence retains exact prior-source
qualification. Human spoken transcript, native unknown-scope policy and the
separately qualified natural long-delay observation remain as below.

## Limits and unresolved gates

- A known applied Task plus missing runtime terminal is not an unknown business
  effect. Readback preserves old evidence without another write. This does not
  prove a universal native Dida per-object pre-dispatch safeguard. PDCR-03's
  native unknown-scope decision remains open.
- Actual automatic model completion was observed, but not a natural model
  delayed-save past the timeout. Existing JSONL transport cases service active
  delayed saves, interrupt silent turns without replay, ignore other-turn
  activity and retain a total limit. Their scaled fixture timing is supporting
  regression evidence, not a long actual delay. Root final combination checks:
  491 Rust passes including selected CLI permission gate, 371 frontend passes,
  four reader passes at `7b3dc8`; the pure UI supplement at `c5be634` passed
  378 frontend checks and build. [Combination evidence](final-combination-checks.md).
- Human spoken transcript/permission evidence is still missing. No ambient
  recording was started to substitute. Connection/permission/SDP or a fixture
  is not transcription acceptance. Future attempt needs an explicitly isolated
  authenticated profile and actual human benign speech/edit/cancel/send evidence.
- After a quit/rebind, CUA exact-path selection returned a default-profile window
  and an additional temporary bundle process. No UI action was sent after the
  mismatch was detected. Only validated owned processes were terminated;
  installed PID/application was preserved. Bounded metadata showed no new
  autonomous business execution; default history mtime was changed and preimage
  unavailable, so passive profile/history writes cannot be excluded. Subsequent
  acceptance used unique bundle naming and exact-PID AX actions only.
- External Dida was not mutated or accepted. PDCR-12 has no isolated objects.
  These observations do not install the candidate or close any parent gate.

Owned process/bundle/credential cleanup is recorded privately. Necessary
immutable evidence and the isolated future candidate bundle are retained;
auth-only test copies are removed. No personal profile/Vault cleanup is performed.
