# Canonical life background repair

## Behavior

Collaboration reads and updates the existing `life/Self.md` under the selected
Tortilla Flat Vault. `memory.routineReference` reads
`.agents/skills/life-daily-loop/SKILL.md` as read-only process context. The
personal routine and habit semantics remain `life/Daily Plan.md` and
`life/Habits.md`; this repair does not add a new editing tool or claim those
files are attached to every message.

`SelectedVaultCollaborationMemoryService` supplies both the Memory panel and
`CollaborationApplication::workspace`. Each model turn rereads that service,
then includes its memory separately from current Daily Record, Task and Habit
facts. The collaboration skill is embedded with `include_str!`, so changing
that skill requires rebuilding the installed binary.

The source paths also apply to unavailable/error views and the memory tool
messages. Missing Self is explicitly unavailable: no legacy fallback, automatic
file creation or second maintained profile. Revision checks, selected-Vault
binding, temporary-file preparation and atomic replacement are retained.
Temporary/day-specific states still fail the durable-update authority checks.

## Personal migration boundary

The authorized local migration preserved the complete existing Self text and
complete legacy operating-principles text in Self, with a source/date note.
Legacy startup dates and phase priorities are preserved as originating context,
not reconfirmed current facts. The former page is now a redirect, and its active
index/overview/legacy-skill pointers target Self. A README note identifies the
same canonical background. The rest of everyday was not moved.

Recovery copies and exact before/after verification receipts remain privately
outside this repository. No personal text or personal data was committed,
published to GitHub, or used as a test fixture. The migration was applied to
the live Vault, not shipped as an automatic runtime migration. On another Vault,
inspect and merge both existing documents before retiring a legacy source;
missing destinations must be resolved explicitly, and a repeat must verify the
existing merge instead of appending it twice.

## Verification (2026-10-03)

- Memory service and authority/continuity tests: 12 passed. Synthetic tests
  cover canonical reads, legacy exclusion, missing Self, repeated reads and
  unchanged saves, stale revisions, and Vault switching.
- Collaboration workflow integration tests: 15 passed, including cross-session
  memory updates, stale editor bindings and external-edit conflicts.
- Frontend suite: 202 passed. TypeScript build and signed Mac app build passed.
- Actual local migration: byte preservation verified for both original texts;
  one merged source and one redirect remain.
- Installed `/Applications/Personal Dashboard.app` (4.0.4): the Memory panel
  displayed `Source: life/Self.md`, ready state, and original Self content.
  The current daily-flow skill appeared in the read-only reference panel.
- Actual installed editor: saved an exact migration-provenance comment to
  Self. Filesystem comparison confirmed precisely that addition, retained both
  original texts, and unchanged legacy redirect, Tasks, local Habit completion
  data and the selected day's Daily Record.
- Quit/relaunch: the installed Memory panel again displayed `life/Self.md`
  ready with no unsaved edit; the exact saved file and Vault selection persisted.

The installed repair is built from this branch before PR merge. The previous
bundle is retained privately under an unregistered `.noindex` archive; this
repair keeps the Applications path as its sole searchable installation and
retains the selected Vault root and application profile.

The standard skill validator was attempted but its existing environment lacks
PyYAML; no dependency was installed. Frontmatter was unchanged, and the embedded
skill was compiled into the tested application. Repository-wide rustfmt check
reports pre-existing formatting differences; the changed memory-service module
was formatted without reformatting unrelated files.

This evidence covers the bounded background migration. It does not validate
new collaboration permissions, arbitrary document editing, external task
connections, or morning-session capability upgrades.
