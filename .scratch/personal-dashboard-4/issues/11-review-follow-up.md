# 11: Close Dashboard 4.0 review findings

Type: task

**Status:** ready-for-agent

**Blocked by:** 01–08 and 10 implementation (available at `41289ff`); 09 human/Drive acceptance remains independent.

## What to build

Fix the confirmed functional and localization findings from the full-range review of `6c4854c...41289ff`, preserving the accepted prototype structure and existing task semantics. User approved this follow-up on 2026-09-18 and requested implementation in the existing Luna Max review task using `/Users/tingranwang/.agents/skills/implement/SKILL.md`.

Review evidence: `/Users/tingranwang/.codex/worktrees/e99a/personal-dashboard/review-dashboard-4-full-range.md`. Canonical spec and prototype decisions are in this effort's `spec.md` and `prototype-review.md`; these planning files may exist only in the source checkout and must be read there.

## Acceptance criteria

- [ ] F-01: Calendar month visibly distinguishes a damaged or unsupported-version Tasks source from a healthy empty task set. Add behavioral regression tests for corrupt and unknown-version JSON at the Calendar application boundary; retain usable independent calendar/review information where possible and never overwrite the invalid source.
- [ ] F-02: Fix operation identity lifecycle so an edit committed before a late response, followed by navigation/return or reload and a different intentional edit, succeeds without reusing a conflicting change ID. Preserve idempotency for retrying the same uncertain operation, draft recovery, stale-response protection, and Vault isolation. Add behavioral regressions for both late committed response/new edit and same-operation retry, using the frontend request/operation seam and backend contract where needed; static source-pattern assertions alone are insufficient.
- [ ] F-03/F-04: Localize fixed All/Today/Inbox labels and the reviewed fixed backend diagnostics in Chinese/English, including reschedule-missing-task, abandoned completion, invalid completion date, no state change, duplicate source reference, and adapter target mismatch. Do not translate user task/list content. Verify actual expected output for representative messages rather than merely the presence of zh/en keys.
- [ ] F-05: Scope/list counts use the same active state-filter semantics as visible rows, including pending/completed/abandoned/deleted and archived lists. Add behavioral coverage across relevant scopes without changing Today/Inbox membership semantics.
- [ ] F-06: Reject relative and empty adapter vaultPath values before any read/write against a candidate Vault; preserve valid absolute paths. Add adapter boundary regressions proving rejected requests do not mutate data.
- [ ] V-01: Remove the contract test's implicit parent-folder layout dependency. Support source checkout and managed worktree with an explicit, documented approach to external integration inputs. Do not hardcode this user's path or silently skip/empty the assertions when prerequisites are absent. Keep synthetic tests hermetic where possible, with external integration checks clearly identified.
- [ ] Correct F-07's evidence: the source checkout's uncommitted CONTEXT.md already defines Task, lists, Inbox, Today view, abandoned/archive/date and Habit display name. Reuse and reconcile those definitions in the implementation worktree, update the future-design qualification to accurately reflect implemented behavior, and include the bounded documentation change in delivery. Preserve the source checkout's original uncommitted content; do not invent a second domain model.
- [ ] Run targeted regression tests while implementing, typecheck regularly, then the full relevant frontend/Rust suite once at the end. Use the implement skill's code-review step on the repair diff and address substantive findings. Commit the bounded implementation, tests, ticket/map updates and domain documentation on the implementation branch.
- [ ] Build and perform the affected isolated packaged Mac checks; capture unobstructed Chinese UI evidence and compare changed areas with accepted structure. Record exact tested commit/environment and distinguish automated, UI and packaged evidence. If permissions/session prevent a check, report that specific limitation instead of claiming acceptance.

## Scope and delivery boundaries

- No visual redesign, speculative refactor, new dependencies/services, 4.1 Habit management, real Vault/diary/Dida/automation writes, replacement of the daily app, push or merge.
- Actual 4.0 Drive fixture verification remains ticket 09's pending human acceptance; this ticket does not authorize using personal data or declaring 09 resolved. Reconcile stale packaged status text against newer evidence without treating it as Drive proof.
- Work in the existing review worktree, based on `41289ff` or a verified descendant. If detached, create a `codex/` repair branch there before committing. Preserve the review report and unrelated dirty files. Copy this ticket/map entry into the worktree as necessary and update its status there; do not implement product changes in the canonical source checkout.
- Final answer must identify fixes, tests, remaining acceptance limits, branch and commit, and the implementation ticket location. Leave the result ready for integration; do not imply worktree commits have reached the user's daily checkout.

## Comments

- 2026-09-18: Approved follow-up covering confirmed review findings. Domain vocabulary finding narrowed after source-checkout verification. Cosmetic tweaks deferred. Local management helper was not found in the user skill directories at publication; setup required, no Registry created or synchronization claimed.
