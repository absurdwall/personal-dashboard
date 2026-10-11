# Integrated two-axis review

Date: 2026-10-10. Fixed point: `8960c80`; reviewed feature head: `7672698`.

Independent read-only reviewers inspected the same pinned diff. The Standards and Spec axes remain separate. Fix verification is pending, assigned to the single PDEX-11 implementer.

## Standards

Pinned range: `8960c80bc81ae35a7dcd871dd104f4b3d04497de...7672698628a85a760e678ca05cce7b2859e4cc16`.

Reviewed AGENTS.md and parent agreements, CONTEXT.md, domain/tracker/triage guidance, all six ADRs, Task and offline-adapter contracts, changed production code and relevant tests. No additional scoped instruction files were found. Local-only tracking overrides the default GitHub workflow.

### Documented contract breach

**[P2] Preserve the reschedule end patch in successful-operation history — `src-tauri/src/tasks.rs:2024–2029` (also mutation history construction at 1714–1722).** The new matcher uses `execution_end.as_ref().is_none_or(|end| &change.new_execution_end == end)`. Non-noop reschedules retain only the resulting end, with `operation: None`; this erases the distinction between omitted, explicitly cleared and explicitly set ends. `docs/tasks-v1.md:49–53` requires matching payloads and rejects conflicting operation-id reuse; `docs/daily-flow-task-adapter-v1.md:155–162` defines omission as preservation and null as clearing.

Reproduced with the existing compiled offline adapter and an isolated synthetic Vault: create a point Task at 10:00; reschedule to 11:00 with ID `old-preserve` and omitted end; add a 12:00 end using another ID; reuse `old-preserve` with `executionEnd:null`. The adapter accepts the conflicting request, returns `changed:false`, and leaves the 12:00 end in place. It should reject this ID collision, while a genuine omitted-end retry should remain idempotent. Retain/compare the original tri-state patch for changed reschedules as the noop branch already does; preserve compatibility for old history. Cover omitted/null/object collisions after subsequent edits.

### Baseline smell judgment calls

No additional actionable smell findings. The shared pointer owner and native validation/persistence seams avoid introducing parallel stores or duplicated mutation paths. Existing large `main.ts` is inherited architecture; a broad split is outside this bounded change. Formatting/type/lint checks were not treated as review findings.

No source files edited; no Cargo, GitHub, real profile, or real Vault operations performed. Native reproduction used an ephemeral synthetic Vault and removed it automatically. Packaged acceptance and subsequent candidate fixes are outside this pinned review.

## Spec

Base: `8960c80bc81ae35a7dcd871dd104f4b3d04497de`
Head: `7672698628a85a760e678ca05cce7b2859e4cc16`
Read-only review; no GitHub access, source edits, builds, or personal-data mutations.

### Findings

#### [P2] Plan reread never restores an explicit retry with retained values

Location: `frontend/main.ts:5434` (reread handler), related `5436–5446`, `5461–5486`.

Spec `spec.md:111`: “失败恢复已保存状态并保留可重试的编辑值，未确认结果通过重新读取核对，不自动重放。”

After a rejected or uncertain manual time save, `submitted` remains true and Save/precision/time controls remain disabled. A failed plan drag creates the same disabled recovery editor immediately. “Read record again” only calls `refreshToday(loaded.date)`; it does not compare the returned authoritative entry, close a confirmed-save recovery, refresh source/revision bindings, or unlock an explicit retry when reread establishes that the desired edit did not save. Thus even a transient write failure, followed by a successful reread of the unchanged record, leaves the retained requested values permanently unusable. Canceling and reopening loses them. Task movement recovery already has an explicit reread/retry flow.

Fix: reconcile reread against the captured Vault/source and desired values. Confirm a matching saved result without replay; when the entry is still safely identifiable and the edit was not saved, retain the proposed precision and times, rebind the current revision, and enable a user-triggered retry. If identity is no longer safe, show the explicit source-edit path without title-based guessing. Do not replay automatically.

Existing evidence confirms the frozen behavior: `tests/frontend/plan-time-editor.test.ts:108–117` asserts disabled values after an uncertain save, and `tests/browser/today-axis-plan-gestures.mjs:152–188` clicks reread but never tests a later explicit retry. Extend those actual UI scenarios to cover failed save → successful reread → explicit retry and saved-but-readback-failed → confirmed reread → no extra mutation.

### Other scope/acceptance observations

No additional concrete missing requirements, unrequested behavior, or wrong behavior found in the reviewed production changes. Plan source/revision binding, precision, Morning/fact separation, Task optional-end preservation/clear/retry identity, shared axis movement, Calendar source statuses, slash draft-only behavior and dated Evening session entry were traced across their main seams. PDEX-11 packaged/OS/IME acceptance is still active and explicitly pending; this is not reported as falsely delivered or as a code defect. Parent spec remains open.

Review summary: Standards one P2; Spec one P2. Additional actual native QA found Calendar last-row clipping at a 1280x720 outer window / 1280x688 client viewport. This separate packaged finding is also assigned to PDEX-11. Original reports remain retained here; later fix verification will be appended.

## Fix verification

Four bounded repair commits: Calendar `88d9225`, original Task Reschedule patch `7d8dcdc`, immutable Morning context `5874ddb`, and plan reread/explicit retry `9cbd96e`. A follow-up Spec review found that unlocated plans needed the same opaque-ID recovery lookup; `07119c9` adds that path and an actual rendered-WebKit regression. Every repair remains in retained history, merged via `b7b0ba0` and `3a0935d`.

### Standards follow-up

# Standards follow-up review

Frozen head: `b7b0ba05576fc2d873c9828b8921390abac0b0eb`.
Supplemental range: `7672698...b7b0ba0`; original base remains `8960c80bc81ae35a7dcd871dd104f4b3d04497de`.

**Original P2 resolved.** Changed daily-flow reschedules now retain `TaskChangeOperation::Reschedule` with the original tri-state `execution_end` patch. Retry matching compares recorded date, time and patch exactly before using the legacy result-based fallback. Consequently omitted/null/object collisions are rejected, while an authentic omitted retry cannot erase a subsequently added end and an authentic object retry cannot reapply an end after later clearing. The validator admits this retained payload only for a daily-flow `Rescheduled` change whose recorded values agree with the saved result. Existing history without the new operation remains readable with its former compatibility behavior. The added adapter regression exercises the originally reproduced collision, omitted/object/null substitutions, genuine retries and intervening end changes.

**Supplemental source changes inspected:** Morning context now reads `view.baseline.timeline`, aligning ADR/domain distinctions with the existing separate Current arrangement projection; its regression uses visibly different morning/current endpoints. Calendar adjustments reduce native-client vertical overhead and strengthen selector specificity; geometry coverage now includes 688/726 client heights. Plan recovery rereads the original date/binding, preserves proposed values, unlocks retry only when the opaque source ID still identifies unchanged editable bytes, and requires a deliberate submit with a fresh revision and operation ID. Confirmed saved revisions close after readback without replay; changed sources remain blocked rather than being matched by title or position.

**Remaining actionable Standards findings: none.** No additional material Fowler-smell findings in the bounded fixes. Legacy tri-state history cannot retroactively gain missing original-payload information; the explicit compatibility fallback is appropriate to preserving retained records.

Read-only source/test inspection only: no Cargo, GitHub, UI, personal data, or source edits. Test pass claims and final packaged acceptance are independently recorded by the implementer/root and are not inferred from this review.


### Spec follow-up and final

# Spec follow-up review

Frozen head: `b7b0ba05576fc2d873c9828b8921390abac0b0eb`; supplemental diff `7672698...b7b0ba0` (original base `8960c80` retained). Read only: no builds, source edits, UI actions, GitHub access or subagents.

The original P2 recovery issue is resolved for located plans. Reread validates date/Vault/current-request identity, confirms a known saved whole-document revision without replay, or rebinds an unchanged opaque source ID to the fresh revision and enables deliberate retry while retaining precision/times. Changed source IDs remain blocked rather than matched by title/position. Tests now cover actual WebKit failed-save/reread/explicit-retry, unsafe rebinding refusal, Chrome drag retry, and saved/readback-failure confirmation without a second mutation.

**Remaining [P2] Include safely editable unlocated plans in the recovery identity lookup — `frontend/main.ts:5459`.** Spec `spec.md:111`: “失败恢复已保存状态并保留可重试的编辑值”. The native binding explicitly assigns safe IDs/editability to both located and unlocated current arrangements (`today.rs:6243–6279`), and the editor is exposed for `arrangement-unlocated` (`main.ts:5341–5351`). However reread searches only `fresh.timeAxis.currentArrangement`. A safe no-time/relative entry (for example `- **稍后：** Synthetic plan`) can be explicitly timed; after a transient failed save, unchanged authoritative reread finds no candidate, falsely reports source changed, and leaves its retained values permanently disabled. Search both current-arrangement arrays by the same opaque ID, preserving every existing safety gate, and cover that production editor failure/retry path. No automatic replay is needed.

Supplemental changes introduce no other concrete Spec findings: immutable baseline now supplies Morning context, Calendar tightening addresses the observed native client height without changing source semantics, and new Task reschedule histories retain/compare the original omitted/null/object patch while preserving old-history compatibility. Final packaged/OS acceptance remains pending and is not inferred from automated checks.

Summary: original P2 resolved for located entries; one remaining P2 recovery edge for safe unlocated entries.


# Final Spec fix verification

Reviewed frozen worker tip `256ecd01aab9e92ef6bf139d7d83ccc2ae671aee`, supplemental diff `b7b0ba0...256ecd0`; original review base `8960c80` retained. Read-only source/test inspection, without builds, UI actions, GitHub access, native data mutations or subagents.

**Remaining P2 resolved.** `openPlanTimeEditor` now searches both `currentArrangement` and `unlocatedCurrentArrangement` for the captured opaque source ID. It retains the previously verified same-Vault/date/request/revision gates, refuses changed or unsafe identities, enables only deliberate retries with retained precision/times, and confirms known saved revisions without replay. The new production WebKit scenario exercises a safe untimed entry through failed save → authoritative reread → preserved 14:00 approximate-point values → explicit retry using the same source ID. It asserts one mutation before retry and two only after explicit submission.

No remaining concrete Spec findings in the reviewed fix ranges. Both recovery findings are resolved; the reviewed Calendar, immutable Morning-context and Task retry-identity fixes retain their documented contracts. The earlier combined UI run with stale built assets is excluded from verification; rebuilt-assets checks and final packaged/OS acceptance remain independently owned by the root/QA workflow. This review does not infer packaged acceptance, installation, publication or parent-spec closure.

Spec axis summary: zero unresolved findings.


Final independent review summary: zero unresolved Standards findings; zero unresolved Spec findings. Original findings and their follow-up remain retained separately. Actual packaged acceptance remains independently pending.


## Independent review of final checkpoint — 2026-10-11

Review chat: `01a128ff-8865-7493-9698-cc48c19d7939`. Pinned range: `8960c80bc81ae35a7dcd871dd104f4b3d04497de...c63c805c0e91971a0129d8093109e587a3d87ac3`. Earlier zero-finding conclusions above apply to their recorded ranges; this new review exposed two bounded findings.

### Standards

- **[P2] Retain the original execution-end patch identity for manual Task updates.** `TaskApplication::update` resolves an omitted end against the current Task before testing duplicate change ID. An interval Task renamed with an omitted end accepts an explicit same-end object under that ID; a point Task similarly accepts explicit null. The matching-payload contract and omitted/null/object semantics in `docs/tasks-v1.md` require rejecting conflicting reuse. Retain the original update payload for successful edits, compare it before resolving current values, and retain legacy history compatibility. Public persistence regressions must include all tri-state substitutions and genuine retries after subsequent end edits.
- **[P2] Track Evening dynamic label, status and error copy.** The controller overwrites `button.textContent` while the HTML still carries `data-i18n=today.startReview`. A language refresh changes a past-date label from `复盘 2026-10-09` to `Review today`, although clicking still targets October 9. Status/error text also bypasses the shared retained localization metadata required by `docs/interface-language.md`. Use shared copy/error setters and actual language-switch checks.

### Spec

- **[P2] Keep current/past Evening wording aligned with the captured target after language refresh.** This is the same date-label defect above; PDEX-10 requires accurate entry wording and authority context. The target must remain unchanged while label and retained status/error wrappers switch language; user drafts and source text must remain untouched.

### Repair assignment

Both findings are assigned to the single PDEX-11 implementer on `codex/pdex-review-repairs`; root records integration and notifies the review chat after verification. No additional native acceptance, installation, remote publication or parent closure is inferred. PDEX-09/PDEX-11 remain blocked as previously documented.
