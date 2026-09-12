# Personal Dashboard 2.0 implementation map

## Current frontier

- [01 — 保留早间基准，展示当前安排](issues/01-preserve-baseline-and-current-plan.md) — resolved
- [02 — 通过 Calendar 回看某一天](issues/02-calendar-date-reading.md) — resolved
- [03 — 在当天或历史日期补记与更正](issues/03-dated-notes-and-corrections.md) — resolved
- [04 — 通过按需快照展示 Habits](issues/04-habits-snapshot-view.md) — resolved
- [05 — 从 Habits 记录健身短句](issues/05-exercise-note-entry.md) — resolved
- [06 — 完成 FINAL 的整体验收](issues/06-final-packaged-acceptance.md) — resolved
- [07 — 切换 2.0，退役旧 Exercise 功能与数据](issues/07-cutover-and-retire-exercise.md) — resolved

## 2.0 presentation repair frontier (2026-09-11)

- [Repair decisions and evidence limits](repair-decisions.md)
- [08 — Restore FINAL shell and destination presentation](issues/08-restore-final-presentation.md) — resolved
- [09 — Independently verify FINAL parity and close 2.0](issues/09-review-final-parity-and-close.md) — resolved; behavior/evidence follow-up complete; user visual acceptance received
- [10 — Recover Vault selection failures and reconcile transitions](issues/10-vault-recovery-and-review-closure.md) — resolved
- [Final independent review follow-up](final-review-follow-up.md)

Prior resolved tickets record earlier delivery work; ticket 09's repair
follow-up is complete, including the unchanged-Vault state boundary and the
failed pending-save Calendar error surface. User visual acceptance has been
received and remains valid; ticket 10's independent-review behavior and
evidence findings are resolved. Final product sign-off remains user-owned,
but there is no implementation or evidence blocker left in this frontier.

## Original dependency notes

- Ticket 05 depends on 03 and 04.
- Ticket 06 depends on 02, 03, and 05.
- Ticket 07 depends on 06 and owns live producer activation plus legacy Exercise retirement.
