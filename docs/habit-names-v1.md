# Habit display names v1

Personal Dashboard reads optional bilingual Habit display names from the
selected Vault at:

```text
life/.personal-dashboard/habit-names/v1/names.json
```

This is a Vault-owned configuration sidecar for bilingual names on sourced
Habits without a local [definition](habit-definitions-v1.md) override. The
rebuildable external `habits-v1.json` snapshot remains the source of current
external goals and observations; a snapshot refresh never replaces this
sidecar. The sidecar is keyed only by stable Habit `key`, never by a display-name
comparison. A local definition's language-specific name override takes
precedence for that same sourced Habit.

## Schema

The document is strict schema-v1 JSON:

```json
{
  "schemaVersion": 1,
  "habits": {
    "exercise": { "zh": "锻炼", "en": "Exercise" },
    "nutrition": { "zh": "营养药" }
  }
}
```

Each entry must use a stable lowercase semantic key and provide at least one
non-blank name. `zh` and `en` are optional independently; a missing language
falls back to the snapshot's existing source name. Entries for a key that is
not present in the current snapshot are retained as configuration but do not
create a Habit.

This sidecar remains readable for existing Vaults. Habit creation and local
name/goal editing use the separate versioned definition catalog; editing does
not rewrite this legacy sidecar. A missing sidecar is compatible with older
Vaults. A damaged, unsupported, or unreadable sidecar is reported as an invalid
name configuration and ignored for projection; the UI falls back to source
names unless a local definition has an explicit override.

Language selection is the Mac-local interface preference. It changes only the
rendered display name. Habit identity, goals, completion history, source
labels, Daily Record Markdown, task text, and other user-owned content remain
unchanged.
