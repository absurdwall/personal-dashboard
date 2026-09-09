# PROTOTYPE FRAME — Personal Dashboard 2.0

This is a throwaway visual frame for a new prototype. It deliberately stops at
layout and hierarchy. `D` and `E` are the next narrow Calendar slice: they test
the month grid and the location of the selected-day detail before the full
history-edit and habit interactions are added.

Three restrained layouts share one route:

- `A` — **Today baseline**: closest to the current production Today shell.
- `B` — **Agenda + context**: borrows the old daily-loop prototype's right-side context pane.
- `C` — **Date-led focus**: keeps the main reading surface single-column and moves date/context to a utility rail.
- `D` — **Calendar + side detail**: left sidebar, month grid, selected-day Today detail on the right.
- `E` — **Calendar + lower detail**: left sidebar, month grid, selected-day Today detail below.
- `F` — **Calendar + B top space**: D's calendar, with B's full-width topbar → FRAME buffer → lower split structure; the left rail uses a compact month context instead of Date Index.
- `G` — **Today + production parity**: mirrors the current production Today hierarchy: outer Today header, inner Daily Record header, phase tabs, timeline, and quiet collapsed plan basis.
- `H` — **Today + B top space**: keeps the open plan-basis rail from the H direction, while sharing F's B-style topbar → FRAME buffer → lower split structure; the left rail uses a compact day context instead of Date Index.
- `I` — **Today + phase rail**: moves Morning / Daytime / Evening into a local vertical rail beside the reading surface.
- `J` — **Daytime + now split**: a single time axis separated by a simulated current-time line; past/confirmed rows stay above it and the new plan stays below it.
- `K` — **Daytime + paired right rail**: keeps Morning's plan basis on the right, then replaces it with a compact update composer and timestamped records when switching to Daytime.
- `L` — **Daytime + inline update**: attaches a compact update entry point to the current-time line to test “record while replanning”.
- `M` — **Habits + weekly ledger**: one continuous habits list with a quiet right rail for today's known times and boundaries.
- `N` — **Habits + target groups**: separates weekly counts from daily target times so the two kinds of reading do not compete.
- `O` — **Habits + week index**: adds a small week index beside the habits list to test whether week context deserves its own local rail.
- `P` — **Habits + week summary**: makes the left column a short weekly summary and the right column a longer, day-focused reading surface.
- `Q` — **Exercise + full detail**: a secondary habit page with a larger completion dot grid, conservative counts, and several free-text records.
- `R` — **Exercise + compact detail**: a smaller activity strip with only the latest records and the few readings needed to decide whether the page is useful.
- `S` — **Habits + inline activity dots**: keeps each habit's weekday-by-week grid collapsed inside its row; expanding it reveals a flatter, compact matrix, and clicking a cell shows a minimal local record beside it without jumping the page.
- `T` — **Habits + compact dots**: keeps S's lower expansion but compresses the columns, cell gaps, and row height.
- `U` — **Habits + side dots**: keeps a tiny recent-7-day dot strip in the right side of every row; expanding replaces that strip with the 12-week grid in the same fixed column.
- `V` — **Habits + history rail**: keeps one fixed right-side history rail, initially showing Exercise, with small habit selectors and the same cell-level record reading.
- `W` — **Habits + bare dots**: removes the day numbers and leaves only seven quiet dots in the right-side strip.
- `X` — **Habits + connected dots**: uses the same seven dots with a faint connector line to test a more continuous reading.
- `Y` — **Habits + micro dots**: compresses the strip further and removes the repeated right-side status label.
- `Z` — **Habits + tight circles**: compresses the right-side column and groups seven tiny circles into a compact cluster with no repeated label.
- `AA` — **Habits + tight squares**: keeps the same compact geometry but uses tiny square marks for a denser status texture.
- `AB` — **Habits + weekend dots**: keeps X's wide right-side space, with a small natural pause before the weekend dots.
- `AC` — **Habits + soft dots**: keeps X's geometry, using lighter unknown dots and slightly stronger known dots for a quieter hierarchy.
- `AD` — **Habits + pill dots**: keeps X's geometry, gathering the seven marks into one small, low-contrast capsule.
- `AE` — **Habits + weekday labels**: keeps X's connected line and adds one-character weekday labels above the dots.
- `AF` — **Habits + weekday ticks**: makes the weekday labels act like a quiet coordinate axis over the line.
- `AG` — **Habits + today anchor**: gives today's weekday a small soft marker while leaving the other labels quiet.
- `FINAL` — **Personal Dashboard 2.0 final composite**: keeps the selected Calendar F shell, Today K behavior with the confirmed Morning/Daytime structure, and Habits AG. Its sidebar links stay on this composite instead of falling back to exploratory variants.

Run from `personal-dashboard/`:

```sh
npm run prototype:dashboard-2
```

Calendar: <http://127.0.0.1:4174/?variant=F&screen=calendar&month=2026-09&date=2026-09-08&phase=progress>.

Today: <http://127.0.0.1:4174/?variant=H&screen=today&date=2026-09-08&month=2026-09&phase=progress>.

Daytime variants: `J`, `K`, and `L` use the same H shell and synthetic 14:10 current-time scenario.

All content is synthetic and in memory. The frame does not call Dida365,
Obsidian, Tauri, or an automation. The bottom variant switcher is prototype-only.

Final composite entry points:

- Recommended share link: `?variant=FINAL&screen=today&date=2026-09-08&month=2026-09&phase=progress`
- Today: `?variant=FINAL&screen=today&date=2026-09-08&phase=progress`
- Calendar: `?variant=FINAL&screen=calendar&month=2026-09&date=2026-09-08&phase=progress`
- Habits: `?variant=FINAL&screen=habits&date=2026-09-08&phase=progress`

The task window and habit check-in controls are intentionally outside this 2.0
composite and remain 3.0 follow-up boundaries.

## Calendar slice review questions

1. Does the month grid feel like the right Calendar view inside the existing left-sidebar shell?
2. Is the selected-day summary plus `打开完整 Today` action enough on the right (`D`/`F`), with the B-style top space above it?
3. Does the separate year → month picker feel cleaner than one combined month menu?
4. Does the B-style top space belong above both Calendar (`F`) and Today (`H`), and what should eventually live there?

## Today slice review questions

1. Does `H` keep the clean production Today reading surface while giving the workspace enough breathing room above?
2. For Daytime, is the clearest structure `J` (one split timeline), `K` (timeline plus update rail), or `L` (inline update at the current line)?
3. Does the simulated current-time line separate “already known” from “new plan” clearly enough without implying a real sync?

## Habits slice review questions

1. Is `M`'s continuous ledger plus a small “今日已知” rail the calmest reading surface?
2. Does `N` make the difference between weekly counts and daily target times clearer?
3. Does `O` add useful week orientation, or does it feel like a second sidebar?
4. Does `P`'s short weekly summary plus longer today detail feel like the right asymmetry?
5. Is a secondary detail page like `Q` useful without making the main Habits page heavier?
6. Does `R` feel closer to the compact activity view you would actually revisit?
7. Does `S` make a separate Exercise page unnecessary while keeping the history discoverable?
8. Does `T` solve the dot-spacing problem while keeping the lower expansion readable?
9. Does `U` use the empty right side better by keeping the grid beside the habit row?
10. Does `V` feel calmer when one fixed history rail stays visible and the list no longer expands?
11. Does `W`, `X`, or `Y` remove the distracting date-number texture while preserving enough recent context?
12. Does `Z` or `AA` feel less scattered by shrinking both the marks and the reserved right-side space?
13. With X's right-side breathing room restored, does `AB`, `AC`, or `AD` make the seven-day strip feel less monotonous without adding distracting dates?
14. Does adding weekday context in `AE`, `AF`, or `AG` make X easier to read, or does it add too much visual instruction?

## FINAL contract-closure slice

FINAL now adds two in-memory note entry points: the selected day's Daytime rail and the Exercise date popover in Habits. Both share a dated note collection. “更正这条” retains before/after text and a modification timestamp; Evening shows later notes separately from the original review. Refresh resets all edits. No real file or check-in is written.

Try: open September 5 Daytime, correct the existing run, expand its modification trace, then visit Habits and click September 5 in Exercise. Add a second note there and return through Calendar to September 5 Evening. User acceptance of this small slice remains pending; FINAL layout is already accepted.

Fixture totals now use 3/15 (Exercise 1/3, nutrition 2/7, reset 0/5); activity marks mean a known record, not necessarily a completed check-in. Production data contracts live in the adjacent spec, not this throwaway implementation.
