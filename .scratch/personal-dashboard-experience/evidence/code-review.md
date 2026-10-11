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
