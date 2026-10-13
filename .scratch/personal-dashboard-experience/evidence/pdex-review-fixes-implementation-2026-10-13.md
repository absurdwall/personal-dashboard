# Confirmed review P2 repairs — implementation evidence

Branch: `codex/dashboard-experience-refinement-review-fixes`.
Isolated worktree: `/private/tmp/pdex-review-fixes.noindex`.
Initial verified base: `16f5e2d256fddc1a773486051ae255035d0b9edd`.
Only the three authorized P2 repairs are in scope. Local Git/full history;
no remote/main/install/dependencies/native acceptance or broad suite repetition.
Root owns claim/ticket state and subsequent review-agent handoff.

## Calendar creation parent relationship

The actual production WebKit creation form selected `preview-0`, but the
`create_task` request omitted `parentId` (behavioral red: undefined versus the
selected identity). `createCalendarTask` now includes `draft.parentId` in its
frozen creation input. Existing creation result confirmation and original-ID
retry machinery therefore compare the relationship as well as other properties.

Three focused production WebKit scenarios pass: chosen parent is submitted and
read back; uncertain creation retains it across explicit reread/exact retry;
same-ID readback with a different parent keeps the dialog and disables retry,
without issuing a duplicate create. A real Task application/Calendar case creates
and reopens the child with the correct parent and its own selected date, retains
exact retry identity and rejects different-parent reuse atomically.

Commands:

```sh
node --test --test-concurrency=1 --test-name-pattern='Calendar create saves|uncertain Calendar creation|Calendar creation readback refuses' tests/frontend/compact-calendar.test.ts
npm run build
CARGO_TARGET_DIR=/Users/tingranwang/Documents/Codex/projects/tortilla-flat/personal-dashboard/src-tauri/target cargo test --manifest-path src-tauri/Cargo.toml --test today_shared_tasks_workflow calendar_context_creation_preserves_parent_and_refuses_conflicting_identity_retry -- --exact
```

Result: WebKit3/3; real application1/1; build passes. The initial Cargo invocation
failed because this fresh worktree had no generated dist; normal existing build
fixed the setup before the application test ran. A first new test caption asserted
English in a Chinese fixture; it was corrected to check the visible conflict and
public frozen/retry controls before claiming these results.

Logs: `/private/tmp/pdex-review-calendar-parent-red.log`,
`/private/tmp/pdex-review-calendar-parent-green.log`,
`/private/tmp/pdex-review-calendar-app.log`.

Locale and explicit safe draft recovery repairs continue. These focused checks
are regression evidence, not full PDEX-26/native acceptance.
