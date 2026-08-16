# 03 — Preserve profile meaning across time zones

**Type:** task

**What to build:** Preserve the intended meaning of portable profile data when a backup or moved profile is opened under a different current time-zone offset.

**Blocked by:** 01 — Reconcile schedule reminders after interruption.

**Status:** resolved

- [x] A structurally valid backup or moved-profile document remains valid when imported under a different current offset.
- [x] Historical workout timestamps retain their absolute instant and recorded offset across export, import, and relaunch.
- [x] Repeating-routine and planned-departure day/time values retain local wall-clock meaning on the authoritative Mac.
- [x] Future reminder times are recalculated in the authoritative Mac's current time zone rather than trusting imported derived epochs.
- [x] Cross-zone import reconciles native reminders to the recalculated desired set without stale or duplicate reminders.
- [x] Invalid, inconsistent, unknown-version, or malformed profile data is still rejected without changing the active profile or reminders.
- [x] Controlled tests cover materially different offsets and verify both historical preservation and future schedule reinterpretation.

## Answer

Implemented source-offset-aware profile portability across backup restore and moved-profile import. Historical records now retain their absolute instant and recorded UTC offset, planned departure epochs are validated against their local wall-clock semantics, legacy documents infer the saved offset, and launch/import rebases derived departure epochs to the authoritative Mac's current offset before durable reminder reconciliation.

Added controlled UTC−04 to UTC+09 backup and move tests covering historical preservation, local schedule meaning, recalculated reminder delivery, duplicate-free relaunch, and invalid offset rejection. Baseline migration now preserves timestamp offsets as well.
