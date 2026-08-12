# 08 — Respond to departure or receive one follow-up

**What to build:** Preserve the complete departure-response boundary in Personal Dashboard so the user can confirm leaving and receive the correct next prompt, while silence produces exactly one respectful follow-up and remains truthful.

**Blocked by:** 07 — Show the persistent exercise week and first departure reminder.

**Status:** ready-for-agent

- [ ] A due departure presents the established user-visible departure actions without adding or renaming outcomes.
- [ ] Confirming departure persists the response and schedules exactly one record-workout reminder at the established time.
- [ ] Silence produces exactly one follow-up after the established interval.
- [ ] No additional follow-ups are scheduled or delivered for the same departure.
- [ ] Silence remains unresolved during the week and is not immediately converted into a deliberate skip.
- [ ] Reminder intent remains correct across window closure and app relaunch.
- [ ] The shared Rust core owns response state and follow-up eligibility; native scheduling remains behind the notification boundary.
- [ ] The primary application seam verifies visible actions, reminder intent, elapsed-time behavior, and persisted state with a controllable clock.
