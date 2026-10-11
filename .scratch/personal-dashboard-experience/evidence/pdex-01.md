# PDEX-01 implementation evidence

Date: 2026-10-10 (America/New_York). Synthetic sources only.

## Public contract

`TodayApplication::edit_plan_time(PlanTimeEditInput)` and the production
`edit_plan_time` Tauri command deterministically patch the selected Current
arrangement's period. Input binds date, Selected vault (`targetBinding`), complete
Daily Record revision, source `planId`, and operation ID. Start/end minutes use
the lived-day axis, 240 through 1680 (start excludes 1680); omitted end is an
explicit point. Non-quarter-hour values remain valid. Endpoints after midnight
include their actual date in saved Markdown.

`TimeAxisEntryView.planId` is optional; `timeEditable` independently indicates a
complete exact period that can be edited without using clipped display values
or leaving a conflicting title/body time untouched. Compatible legacy bold-prefix list
blocks receive a token of their source byte span and raw block, constrained by
the document revision. It is not a rendering index or a title lookup. An
ambiguous duplicate, inherited heading, or unsupported source receives no edit
identity. A later re-read is required when the revision changes. Current-plan
source binding covers located and unlocated entries for later precision work;
this ticket's UI offers the editor for located entries.

Only period bytes are replaced. The same conditional atomic save adds a daytime
revision and operation receipt. Existing morning/fact correction APIs remain
separate. Receipts prevent replay of an applied operation and reject reused IDs
with different payloads. These direct operations require no model process or
quota.

`PlanTimeEditResult` returns `savedRevision`, an optional verified `view`, and an
optional `refreshError`. A completed save followed by failed/changed readback
returns saved-state evidence separately from presentation failure. The modal
retains entered values on unknown/error outcomes, disables replay, and offers
re-reading the record; closing and reopening permits a new edit against the
fresh source revision.

## Validation

- Red: the new public workflow initially failed compilation because
  `PlanTimeEditInput`, `planId`, and `edit_plan_time` did not exist. Observed with
  direct rustc against the baseline library and again with Cargo.
- First workflow run exposed a synthetic fixture insertion that assumed an
  Evening heading existed. The fixture now appends unrelated Markdown directly.
- Frontend TypeScript build passes (`npm run build`).
- Existing frontend regression suite: 388 passed, zero failed. This is
  supporting regression evidence; it does not exercise this modal in a real App.
- Isolated Cargo validation: `cargo test --manifest-path src-tauri/Cargo.toml
  --test daily_plan_workflow -- --nocapture`: 11 passed, zero failed, including
  three new direct-edit workflows. The first edits 08:00–10:00 to 10:00–12:00,
  preserves morning bytes, an existing 08:45 fact, unrelated Markdown, and
  absence of a Tasks file, verifies a fresh application, and rejects changed
  payload reuse. The second covers stale revision, wrong Vault, unsafe source,
  invalid end, and an exact 10:01 point. The third verifies saved/readback
  failure separation through the file-store system boundary.
- The canonical shared target was abandoned after concurrent builds proved it
  could substitute another worktree's binary. An incomplete APFS cache clone
  also produced inconsistent fingerprints (`serde_spanned` missing); preserved
  those fingerprints and reconstructed dependencies in the isolated target.
  The 11-test result above is from the isolated worktree, after reconstruction.

## Acceptance limits

Production Tauri registration and UI are implemented. A packaged App has not
been launched for this ticket. Actual clicking, keyboard operation, window
layout, and source readback through packaged IPC remain pending PDEX-11
acceptance. Compilation and application workflow checks do not claim UI or
user acceptance. No installation, remote operation, main change, real personal
record change, or model call was performed.
