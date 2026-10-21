---
status: accepted
---

# Store sleep records separately from Habit completions

This accepted design is not yet shipped: keep one canonical sleep record in the selected Vault at `life/.personal-dashboard/sleep/v1/sessions.json`, read by Today and Habits, without copying it into Daily Records or Habit-completion evidence.

Index each night by its get-up local calendar date while retaining each reported endpoint's actual date and leaving the 04:00 lived-day rule unchanged; a Daily Record is the wrong owner because at 03:00 that calendar date's lived day has not begun and separate Today/Habits views would otherwise require duplication or special cross-day lookup. See [CONTEXT.md](../../CONTEXT.md), “Agreed sleep and wake design vocabulary.”

Keep existing prose and Habit evidence intact without deletion or automatic migration; do not automatically complete Habits from sleep times, and defer possible goal-attainment linking until an explicit applicable wake-time goal is in scope, without assuming whether other Vaults contain one.
