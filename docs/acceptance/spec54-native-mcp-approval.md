# Spec54 native MCP write approval

Packaged phase C exposed a runtime gap: an actual model attempted the selected
Dida check-in write, but Codex refused it with `approvalPolicy=never` because the
MCP tool required approval. A successful host `mcpServer/tool/call` probe had
bypassed that model-facing approval path and could not establish actor authority.

The installed Codex CLI 0.160.0 generated configuration schema accepts per-tool
`approval_mode = "approve"`. The [official configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
documents `mcp_servers.<id>.tools.<tool>.approval_mode`.

The Dashboard now sets that override only for currently enabled, manual Dida
mutation schemas: `create_task`, `update_task`, `complete_task`, `delete_task`,
`move_task`, `create_habit`, `update_habit`, and `upsert_habit_checkins`. Existing
connection allow/deny settings still restrict the selected set. It sets no
server-wide default approval mode, does not inherit other MCPs/plugins, and does
not modify user configuration or authentication. Startup, automatic morning and
review-first catalogs retain only reads. An explicitly all-local Habit round
also removes the three Habit mutation schemas and their approval overrides,
while preserving separately authorized Task capability. Named filesystem
profiles, selected-Vault roots and `approvalPolicy=never` remain unchanged.

The host approval-contract revision is included with enabled tools in the
external capability fingerprint. This composes into the stored native tool
schema fingerprint, so an existing usable manual chat rotates its native thread
when this approval contract changes. The saved Dashboard session and receipts
remain; prior effects are not replayed.

## Evidence

The explicit real-model gate uses `CollaborationApplication` with
`CodexAppServerRuntime` and production native item/action verification. It
requires the already logged-in, isolated acceptance profile and the retained,
explicitly owned test Habit fixture. It creates no source object. In one new
Dashboard session the actual model read/reset the owned historical state,
performed the exact historical status-2 write, and reset status 0. Production
source readback recorded all three mutations as saved. The final reset was
confirmed before releasing the source lease. The adjacent source envelope also
covered the second requested cleanup date, which was already unmarked and did
not require a write. No source name, genuine personal object, business file or
local completion was changed.

A separate genuine native catalog gate confirmed that automatic/review mode
exposes reads without any mutation schema, and only-local Habit mode exposes
reads and separately authorized Task schemas without Habit mutations. Unit
checks cover disabled source tools, exact per-tool overrides, absent server-wide
trust and approval-contract fingerprint changes.

Private actor/source evidence and fixture identities stay outside version
control. The actor evidence is at
`/tmp/pd-spec54/native-approval59-model-evidence.json`; the fixture identity is
`/tmp/pd-spec54/dida59-owned-habit.json`. The test reads the existing isolated
login in place and does not copy credentials. Catalog probe profiles use the
host-managed OS keyring and are removed after the test.

Historical phase-C denial stays conservative unknown: the captured error is an
MCP-shaped `isError`/text result without a distinct typed pre-execution failure
field. Generic receipt failure does not prove absence of a source effect. It is
not replayed; current source readback and a newly authorized remaining request
are required. Packaged verification of retrying only the external endpoint in
the original Dashboard chat remains part of final Spec54 acceptance.

## Reproduction

Normal regression: library Dida policy tests and Collaboration application
operation/workflow suites. Opt-in gates require explicit owned-fixture authority:

```sh
PD_SPEC54_NATIVE_APPROVAL_PROFILE=/tmp/pd-spec54-acceptance.noindex/profile \
  cargo test --manifest-path src-tauri/Cargo.toml --lib \
  real_model_native_habit_write_is_approved_and_verified_through_dashboard_runtime \
  -- --ignored --nocapture
cargo test --manifest-path src-tauri/Cargo.toml --lib \
  native_catalog_keeps_automatic_review_and_only_local_habit_boundaries_after_manual_approval_change \
  -- --ignored --nocapture
```

Fixture/native runtime evidence supports the fix; it does not replace the final
packaged old-chat, morning, dictation and multi-effect journeys.
