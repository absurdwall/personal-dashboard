# 08 — Respond to departure or receive one follow-up

**What to build:** Preserve the complete departure-response boundary in Personal Dashboard so the user can confirm leaving and receive the correct next prompt, while silence produces exactly one respectful follow-up and remains truthful.

**Blocked by:** 07 — Show the persistent exercise week and first departure reminder.

**Status:** resolved

- [x] A due departure presents the established user-visible departure actions without adding or renaming outcomes.
- [x] Confirming departure persists the response and schedules exactly one record-workout reminder at the established time.
- [x] Silence produces exactly one follow-up after the established interval.
- [x] No additional follow-ups are scheduled or delivered for the same departure.
- [x] Silence remains unresolved during the week and is not immediately converted into a deliberate skip.
- [x] Reminder intent remains correct across window closure and app relaunch.
- [x] The shared Rust core owns response state and follow-up eligibility; native scheduling remains behind the notification boundary.
- [x] The primary application seam verifies visible actions, reminder intent, elapsed-time behavior, and persisted state with a controllable clock.

## Answer

Personal Dashboard now presents the established `Leaving for gym`, `Move to
fallback`, and `Skip` actions when a departure is due. Confirming `Leaving for
gym` persists a schema-version-2 response, cancels the still-pending follow-up,
and registers exactly one OS-owned `Record workout.` reminder 90 minutes after
the response. The visible confirmation reports the established reminder time.

An unanswered departure keeps exactly one scheduled 15-minute follow-up. Once
that time passes, the Rust-owned dashboard state remains visibly `Unresolved —
no response`; it is never rewritten as a skip. Follow-up, cancellation, and
record-reminder requests all remain behind the notification platform boundary,
including native macOS pending-request cancellation.

The controllable-clock application seam covers exact visible actions and
notification intents, elapsed-time behavior before and after 4:15 PM,
follow-up cancellation, duplicate prevention, unresolved truthfulness, and
state equality after relaunch. TypeScript/Rust builds, all Rust tests, Clippy,
all 20 preserved Python workflow tests, npm audit, formatting/diff checks, and
ARM64 iOS/Android Rust checks pass.
