# Historical — Mac workspace prototype review

Status: Historical reference only; superseded by the v2 A fixture

> This document records the earlier persistent three-region fixture. It is
> retained as historical evidence and is not the current Mac workspace design.
> The current design reference is
> `.scratch/personal-dashboard-mac-workspace-v2/spec.md`, implemented as the
> `prototype/ticket-08-week-flow/` fixture.

Question: Can a three-region Mac workspace keep current exercise state, the
next action, and weekly context understandable at 960x720 without whole-window
scrolling?

Verdict so far: the user selected **A — Agenda-led** after reviewing the bounded
A/B comparison. The six representative states below apply only that treatment.
The original comparison remains available as primary-source evidence.

## Ticket 07 layout follow-up — 2026-08-16

Status: **A — Agenda first approved**

This follow-up uses the resolved ticket 07 production baseline and the current
exercise schedule shape: Monday, Wednesday, and Friday primary departures;
Saturday and Sunday fallback availability; and the established
`Unresolved — no response` response state.

The minimum default **This Week** content is:

- current week label and progress toward three qualifying workouts;
- the next departure or immediate required action;
- every primary row with day, time, and truthful status;
- fallback availability summary, with the fallback rows remaining subordinate;
- relevant exceptional warnings only when they exist.

Explanations, reminder detail, editors, departure actions, preset reasons, and
workout-recording steps remain selection- or state-revealed. A pending ticket 07
response still opens automatically in detail, and `Needs attention` remains the
return path if another row is inspected.

The approved responsive transition is:

- `960x720`: persistent destination navigation, agenda information pane, and
  contextual detail pane;
- intermediate narrow windows: a compact icon navigation rail while the two
  panes remain side by side, with no redundant Back control;
- `640x520`: labeled top destination switcher, one active surface at a time,
  local scrolling only, and a keyboard-accessible Back control from detail.

The bounded follow-up prototype is isolated at
`prototype/ticket-07-layout/`. Its rendered evidence is under
`output/playwright/personal-dashboard-ticket-07-layout/`. This is a captured
visual decision only; the production frontend, spec, and ticket map remain
unchanged.

This is a disposable, fixture-only prototype. It does not call Tauri, open file
pickers, read a profile, write data, or schedule notifications.

## Historical fixture access

Start the fixture server from the repository root, then use the explicitly
historical path below. The default server URL opens the current v2 fixture.

```sh
npm run prototype:mac-workspace
```

Use Left and Right Arrow or the bottom prototype navigator to move through:

1. [Historical normal week](http://127.0.0.1:4173/historical/?variant=A&state=normal)
2. [Historical pending response](http://127.0.0.1:4173/historical/?variant=A&state=pending)
3. [Historical workout recording](http://127.0.0.1:4173/historical/?variant=A&state=recording)
4. [Historical History](http://127.0.0.1:4173/historical/?variant=A&state=history)
5. [Historical Settings](http://127.0.0.1:4173/historical/?variant=A&state=settings)
6. [Historical compact navigation fixture](http://127.0.0.1:4173/historical/?variant=A&state=compact)

The archived comparison is at
[historical comparison.html?variant=A](http://127.0.0.1:4173/historical/comparison.html?variant=A)
and `?variant=B`.

## Representative behavior

- Normal week keeps progress, next departure, all primary statuses, and
  fallback availability visible at 960x720.
- Pending response opens the due action automatically. Moving or skipping
  replaces the detail pane with the complete preset-reason list. Inspecting a
  different row leaves **Needs attention** available.
- Workout recording keeps the agenda visible while the detail pane shows the
  established activity, duration, and effort stages. The representative screen
  starts at effort; one click completes the record and returns the affected row
  to its updated status.
- History separates a reverse-chronological, locally scrolling week list from a
  locally scrolling selected-week detail. Correction uses established presets;
  deletion uses a Mac-style sheet.
- Settings separates Routine, Profile & Data, and Notifications. Profile file
  entries represent native-picker entry and return states without opening a
  picker. Restore uses a sheet. Active/inactive profile and granted/denied
  notification fixture variants remain switchable.
- Compact mode replaces the sidebar with a labeled destination select and shows
  either information or detail. A pending response remains recoverable while a
  different slot is inspected.

## Scroll ownership evidence

In every measurement, `body` and `documentElement` matched the viewport and
remained at `scrollTop 0`.

| Representative state | Window | Information pane | Detail pane |
| --- | --- | --- | --- |
| Normal week | 960x720, locked | Owns overflow; 720px content in 720px surface | Owns overflow; 720px in 720px |
| Pending response + reasons | 960x720, locked | Owns overflow; 720px in 720px | Owns overflow; 720px in 720px |
| Staged workout recording | 960x720, locked | Owns overflow; 720px in 720px | Owns overflow; 720px in 720px |
| Long History + delete sheet | 960x720, locked | Locally scrolls; 916px in 720px | Locally scrolls; 829px in 720px |
| Settings + warning | 960x720, locked | Owns overflow; 720px in 720px | Owns overflow; 720px in 720px |
| Compact fixture baseline | 960x720, locked | Owns overflow; 720px in 720px | Owns overflow; 720px in 720px |
| Compact agenda | 640x520, locked | Active and locally scrolls; 641px in 469px | Not rendered |
| Compact inspected detail | 640x520, locked | Not rendered | Active and locally scrolls; 549px in 469px |

Screenshots are under
`output/playwright/personal-dashboard-mac-workspace/selected-a/`.

## Compact navigation walkthrough

1. Open the compact fixture and resize to 640x520. The sidebar becomes the
   labeled destination switcher.
2. Activate Saturday while Thursday is pending. The agenda is replaced by
   Saturday detail; **Needs attention** remains first in the content.
3. Activate **Needs attention** to recover Thursday immediately, or activate
   **Back to week** to return to the agenda.
4. Enter on **Back to week** restores the agenda and focus returns to the
   Saturday row. Only the active surface scrolls.

## Keyboard, focus, and dialog evidence

- Tab order runs from primary navigation to information rows, detail controls,
  and the prototype navigator. Buttons and selects expose a measured 3px
  high-contrast focus outline with 2px offset.
- Left and Right Arrow cycle representative states unless an input, textarea,
  select, or editable element has focus. Command-1/2/3 switch destinations.
- Departure responses, reasons, workout stages, correction presets,
  **Needs attention**, destination switching, and compact Back are keyboard
  operable. Exercise actions require no typing.
- Delete and restore sheets expose `role="dialog"` and `aria-modal="true"`.
  Initial focus moves to Cancel; Escape dismisses and returns focus to the
  triggering control.
- Statuses pair text with distinct symbols and shapes; color is not the only
  signal.
- Browser console verification finished with zero errors and zero warnings.

## Unresolved visual questions

1. Does the quiet detail pane in the normal state need one additional compact
   action, or is its restraint useful?
2. In History, should record correction remain after the record list or become
   a more persistent editor when a record is selected?
3. Is the notification warning in Profile & Data appropriately prominent, or
   does it compete too much with profile authority?
4. In compact mode, is showing **Needs attention** before the inspected slot the
   right precedence?
5. Are the current information-pane widths still comfortable with real-world
   localized labels?

The user approved handoff after reviewing the expanded prototype. This historical
fixture remains preserved for comparison evidence; the current v2 route is owned
by ticket 08 and its v2 spec.
