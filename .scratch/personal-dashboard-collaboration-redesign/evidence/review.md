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

- All findings assigned to one implementer on `codex/pdcr-review-fixes`.
- PDCR-03 reopened for unknown external effect scope; independent native checks continue without closing the dependency.
- PDCR-12 has no authorized isolated Dida objects and remains unaccepted.
