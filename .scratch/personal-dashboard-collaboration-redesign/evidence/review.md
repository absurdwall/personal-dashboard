# Independent final review

Pinned base `9939c23f4f14d0b87dc9949c0ce3850e24e994a2`; reviewed target `88315b9b85093f93bca33c4bed49e7dde76f0ee3`. Initial findings remain below; repair verification will be appended against the repaired revision.

## Standards

Compared `9939c23f4f14d0b87dc9949c0ce3850e24e994a2...88315b9b85093f93bca33c4bed49e7dde76f0ee3`; read the supplied commit list. Read-only review; no tests rerun.

## Documented standards

No concrete documented-standard violation found. Sources: project and parent `AGENTS.md`, `docs/agents/domain.md`, `CONTEXT.md`, ADRs 0001–0006, `README.md`, `docs/agents/issue-tracker.md`, and the redesign execution record. The initiative's explicit local-tracker exception governs local claims/commits. The diff adds no dependencies, external services, or deployment configuration; the checked-in hooks are configured. The examined evidence describes isolated synthetic data, and the changed runtime preserves selected-Vault/business-operation boundaries. The superseded and historical 2.0 README scope does not override ADR-0006. Native and live-Dida acceptance remain separate outstanding gates.

## Baseline smells — judgment calls, nonblocking

- **[P3] Duplicated Code**, `src-tauri/src/collaboration_changes.rs:252–258,269–275`. Both retained-witness and new-witness branches repeat `check_redirects(vault, Path::new(&relative)).and_then(...)` followed by checking `evidence.move_path`. This duplicates the same source/destination path-safety policy. Extract one small helper that checks both paths, while preserving each caller's different handling: retained observations gain a gap; new observations are rejected. A later path-policy change should have one implementation.

- **[P3] Data Clumps**, `src-tauri/src/collaboration_changes.rs:176–186`, called by `src-tauri/src/collaboration.rs:7503–7505`. The new `observe_native` signature carries ten positional arguments, including `vault`, `cwd`, `target_date`, `authoritative`, `status`, `automatic`, `previous`, and `now`; the production caller passes the whole observation context together. Several same-typed booleans and strings make the scope/authority contract hard to inspect and easy to miswire. Introduce a narrow named `NativeChangeObservationContext` for the captured source and runtime observation fields; keep item/evidence identities explicit. This is local to the new helper and does not require a broader runtime refactor.

These are maintainability suggestions, not demonstrated correctness failures or release blockers.

## Spec

Reviewed pinned `9939c23...88315b9` against the local spec and all twelve tickets. No scope creep found.

- **[P1] Delayed source refresh can render another Vault’s data.** Spec114: “晚到的事件不能进入其他 session 或新 selected vault。” The new watch launches projection refreshes without awaiting them (`frontend/main.ts:4857–4860`). `refreshCanonicalDateProjections` awaits reads without capturing/checking the Vault revision (`3259–3270`), then renders their results (`3281–3285`, `3349–3351`). A production-function probe started reads in Vault A, switched the context to Vault B, then released A’s responses: both Today and Habits rendered A. The helper weakness existed before this diff; the redesign retains and expands this asynchronous path. Bind refresh responses to their captured Vault generation.

- **[P2] Refresh evidence is attributed to the wrong execution.** Spec155: “每轮记录原请求及捕获目标…刷新状态及最终回复。” The watch scans all historical receipts/work histories (`frontend/main.ts:4815–4845`) but passes the current `updated.runId` for every refresh (`4858`). A production-watch probe with an applied receipt from execution1 and active execution2 recorded execution1’s date refresh under execution2. Preserve each effect’s execution identity when grouping refresh observations.

- **[P2] Unknown external effects still block unrelated external objects.** Spec127: “未知 effect 不阻塞无关读取或其他对象，但不得盲目重试同一可能已完成的修改。” `src-tauri/src/collaboration.rs:7281–7305` collects every prior selected-Vault external action and disables all Dida Task/Habit mutation capabilities if any Dida write remains unresolved; `collaboration_dida.rs:186–190` removes every Dida write tool. Local work/reads remain possible, but an unknown Task A blocks Task B and mapped Habit writes. This retained native-capability limitation is a partial requirement, not a new regression; the current native integration exposes per-tool masking and post-dispatch notifications, without a mechanical per-object interception point. This does not satisfy the quoted criterion.

Acceptance gaps are correctly disclosed: spec203/205 require complete-candidate actual runtime/native UI evidence; PDCR-11 remains in progress. Spec204 says “在尚未得到授权隔离对象或连接不可用时记未验收”; PDCR-12 remains unmet without authorized isolated Dida objects. The actual headless PDCR-09 save does not close those gates.

Read-only probes: `/tmp/pdcr-exploration/spec-refresh-probe.mjs`, `/tmp/pdcr-exploration/spec-provenance-probe.mjs`. No repository/data changes.

Standards: 0 documented-standard violations, 2 judgment suggestions, worst P3. Spec: 3 findings, worst P1.

## Repair state

- One implementer fixed the two frontend defects and both P3 suggestions; source `8c643aa`, integrated `7b3dc8`. [Red/green evidence](review-fixes.md).
- PDCR-03 reopened for unknown external effect scope; independent native checks continue without closing the dependency.
- PDCR-12 has no authorized isolated Dida objects and remains unaccepted.

# Repair review at 7b3dc8

## Standards

# Targeted Standards re-review

Reviewed pinned repair diff `88315b9b85093f93bca33c4bed49e7dde76f0ee3...7b3dc8dc4fd99496c12e4338a886b2f240335bf2`, retaining the documented sources and smell baseline from the initial Standards review. This is a targeted read-only re-review; no tests rerun, GitHub operations, repository edits or personal-data changes.

## Documented standards

No new documented-standard violation found. The repair uses the existing frontend presentation/state and Rust evidence seams, adds no dependencies/services/deployment configuration, and does not introduce a conversational authorization judge. Vault generation guards precede applying source responses and recording refresh observations. Effect ownership remains tied to receipt/history/request identity; ownerless legacy evidence does not borrow the active execution.

The new probe and decision records distinguish synthetic runtime evidence from product acceptance. They retain the existing native mutation restriction and explicitly leave PDCR-03 scope, PDCR-11 native acceptance, and PDCR-12 live-Dida acceptance unresolved. No probe-only hook or trust bypass was added to product code.

## Initial baseline smells

Both prior P3 suggestions are resolved:

- **Duplicated Code:** `src-tauri/src/collaboration_changes.rs` now defines one `check_change_redirects` helper for source/destination checks. Both retained and new witnesses call it while preserving their different consequences: add a gap to retained evidence, reject a new unsafe witness.
- **Data Clumps:** `NativeChangeObservationContext` replaces the positional scope/authority/time fields. The production call in `src-tauri/src/collaboration.rs` supplies named fields and keeps item/evidence identities explicit.

## New baseline smells — judgment calls

No additional actionable baseline smell found in the repair hunks. The generation and owner grouping changes are narrow fixes to existing projection behavior, not speculative abstractions or unrelated restructuring.

## Spec

Targeted Spec re-review: initial `88315b9`, repaired `7b3dc8dc4fd99496c12e4338a886b2f240335bf2`, original specification baseline `9939c23`. Reviewed repair source `8c643aa`, its tests and `evidence/review-fixes.md`; no full-review repetition.

- **Resolved: late refresh crossing Vaults.** Spec114: “晚到的事件不能进入其他 session 或新 selected vault。” `frontend/main.ts:3260–3273` now captures/checks Vault generation before any cache, rendering, error or observation mutation; session polling independently rejects late responses at `4803–4817` and `4900`. Original production-function probe now returns `[]` after the Vault switch. New tests cover successful/failed delayed reads, switching before read dispatch, and late session polling. Generation-scoped deduplication also allows rereading after a cancelled picker.

- **Resolved: wrong refresh execution owner.** Spec155: “每轮记录原请求及捕获目标…刷新状态及最终回复。” `frontend/main.ts:4821–4879` groups refresh dates by Task receipt, WorkHistory or originating request executionId. The original provenance probe now records `first-execution`, not the active second execution. Tests verify distinct historical/native/external owners, multiple Task owners viewing the same date, and legacy missing ownership without invented attribution. Confirmed effects first observed at terminal are refreshed too.

- **Still unmet: unknown Dida effect scope.** Spec127: “未知 effect 不阻塞无关读取或其他对象，但不得盲目重试同一可能已完成的修改。” The retained `src-tauri/src/collaboration.rs:7281–7305` mask disables all Dida Task/Habit mutation families when any selected-Vault Dida write remains unresolved; unrelated local work and reads continue. Actual native hook probes establish exact object/date veto but crashes/malformed output/timeouts fail open, so no replacement enforcement guarantee is justified. This remains pending the explicit scope/policy decision; repair evidence correctly keeps the criterion unmet.

No new actionable Spec regression or scope creep found in the changed source. Native observation context/refactored redirect checks preserve their previous authority, readback and original-witness semantics.

Verification performed here: both isolated production probes plus 18 targeted production-handler tests passed. Root owns full-suite verification. Complete-candidate native acceptance and live Dida acceptance remain separate outstanding gates.

Repair review: Standards 0 findings; Spec 1 remaining finding, worst P2 (unknown native Dida object scope).

# Native legacy finding and repair at c5be634

A bounded native fixture at `7b3dc8` retained old text but omitted the explicit
missing-process label required by spec section5 and the history/restart failure
row. This presentation defect was discovered after the initial review, then
fixed by the same single review-fix implementer in `505fdb3`, integrated
`c5be634d75b8921a6244135593b3128588398150`. Native reassessment remains separately
recorded in [PDCR-11 evidence](11-native-acceptance.md).

## Standards

# Targeted Standards re-review — legacy execution evidence

Read-only comparison: `464058bc8ca3f0a531131018036664652ebab73e...c5be634d75b8921a6244135593b3128588398150`, including source commit `505fdb3` and its integration merges. Retained the documented sources and complete smell baseline from the initial Standards review. No tests rerun or GitHub operations.

## Documented standards

No new documented-standard violation found.

- `frontend/main.ts`: the change remains presentation behavior. Saved assistant work and terminated requests without replies expose absent evidence; pending requests remain distinct. Original messages and saved outcomes continue through existing renderers.
- `frontend/collaboration-work-history.ts`: the nullable branch creates an explicit unavailable paragraph without fabricating runtime work, usage, receipts or execution identities. It uses the existing DOM-only rendering boundary.
- `frontend/interface-language.ts`: the new copy is present in both supported interface languages. It preserves the domain distinction between conversation text, process evidence and observed outcomes.
- The test changes exercise actual production renderer/helpers, preservation of original text and outcomes, absence of fabricated items, unchanged session data, and no backend invocation during rendering. The evidence append qualifies those checks separately from native acceptance.

No dependencies, external services, deployment configuration, persistence change or authorization layer was added. These changes are consistent with ADR-0006's requirement to leave unavailable evidence unknown.

## Baseline smells — judgment calls

No additional actionable smell found in these narrow hunks. The nullable helper centralizes the unavailable presentation used by both saved-reply and terminated-request paths; its optional localized label follows the existing label contract. The terminal-state condition is a bounded rendering distinction, not grounds for a broader state-model refactor in this fix.

The initial two P3 suggestions remain resolved. This review does not establish whole-spec completion: unknown native Dida scope, human voice acceptance and isolated live-Dida objects remain unmet as previously recorded.

## Spec

Targeted Spec re-review: `464058bc8ca3f0a531131018036664652ebab73e...c5be634d75b8921a6244135593b3128588398150`, source `505fdb3`, integration `5067ba9`/`c5be634`. Read-only; no full-suite repeat.

**Legacy presentation gap resolved at the production-renderer seam.** Spec129: “旧会话仍可读，原文与已保存 receipt 保留；没有的过程、usage 和变更证据标记不可用，不重新生成历史。” `frontend/main.ts:2533–2536` now passes absent WorkHistory to the nullable renderer. `frontend/collaboration-work-history.ts:125–131` appends only an unavailable paragraph; it creates no work items, usage or change evidence. `frontend/interface-language.ts:490` provides explicit Chinese/English missing-process, usage and change-evidence text while retaining original messages and outcomes.

**Failure/restart presentation is covered without replay.** Spec193: “已保存业务效果不重复，旧会话可读，缺失过程明确 unavailable。” `frontend/main.ts:2584–2592` also labels a terminated historical request with no reply. Rendering leaves source/session data unchanged and invokes no backend mutation. Existing receipt rendering remains in place.

**Pending/live requests retain their distinction.** Spec125: “普通消息在当前执行后按现有队列顺序处理，不调用 steer。” The historical-state predicate excludes queued, not-started, paused and in-progress requests. Those states do not acquire a missing-history label merely because execution evidence has not arrived. No queue, runtime, persistence or authorization behavior changed.

No new actionable Spec defect or scope creep found in this narrow diff. All seven new production-renderer checks passed independently, including both languages, historical no-reply, four pending/live states, preserved text/receipt and no fabricated/replayed execution.

This resolves the source-level gap observed by the earlier injected native fixture; the rebuilt candidate's no-auth native reassessment remains pending with the root. Unknown-Dida object scope, live spoken dictation and live Dida acceptance remain unresolved; no overall spec/native acceptance claimed.

Legacy repair review: Standards 0 findings; Spec 0 new findings. Overall Spec
still retains the P2 unknown native Dida object-scope finding and the separate
human/live acceptance gates; this is not parent-spec closeout.
