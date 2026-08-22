# Personal Dashboard Mac workspace

Status: ready-for-agent
Approval: explicitly approved by the user on 2026-08-14

## Problem Statement

Personal Dashboard is now a complete Tauri application, but its presentation
still behaves like a long webpage placed inside a Mac window. The opening view
spends substantial space on a marketing-style header and then stacks the
exercise week, history, profile operations, notification controls, and
explanatory copy in one vertical document. Important weekly state and timely
actions therefore require page travel even in the default Mac window.

The user wants to focus the current product-quality phase entirely on the Mac.
The established exercise behavior is already the product baseline and must not
be redesigned. The application should instead become a compact, action-first
Mac workspace in which primary information and actions fit together at the
default window size, with scrolling owned by local panes rather than the whole
window.

Four post-migration correctness findings also prevent production presentation
work from beginning safely: schedule changes can desynchronize reminder intent,
restore can be interrupted between profile replacement and reminder changes,
valid profiles can be rejected after a time-zone change, and current tests do
not cross the real Tauri IPC and rendered-UI boundary. These findings must be
resolved as a separate prerequisite track rather than hidden inside layout
work.

## Solution

Replace the single scrolling document with the approved **Agenda-led Mac
workspace**. At the default `960x720` window, Personal Dashboard will use a
persistent destination sidebar, a compact destination information pane, and a
contextual action or detail pane. **This Week** leads with the chronological
exercise agenda; **History** separates the week list from selected-week detail;
and **Settings** separates subsection selection from its controls. The window
body remains fixed while information and detail panes scroll locally when
needed.

Timely exercise actions open in the detail pane without removing weekly
context. A pending action remains visibly recoverable while the user inspects
other information. At the existing `640x520` minimum, the sidebar becomes a
labeled destination switcher and information/detail surfaces become a
keyboard-accessible drill-in flow.

The implementation will preserve Tauri 2, the shared Rust core, plain
TypeScript, semantic HTML and CSS, native platform adapters, and versioned
file-backed JSON. Rust will expose semantic state and available domain actions;
the frontend will own Mac-facing labels, hierarchy, formatting, guidance, and
temporary presentation state. The approved fixture prototype is design
evidence, not production code to promote directly.

Before production presentation tickets may run, a separate correctness track
will make reminder transitions recoverable and idempotent, define correct
cross-time-zone profile semantics, and establish bounded packaged acceptance
through the real Tauri UI boundary.

## User Stories

### Mac workspace and navigation

1. As the sole user, I want Personal Dashboard to open as a Mac workspace, so that it feels like an application rather than a webpage in a window.
2. As the sole user, I want the primary workspace to fit within the default `960x720` window, so that I can understand the week without scrolling the whole window.
3. As the sole user, I want the window body to remain fixed, so that navigation and context do not disappear during ordinary use.
4. As the sole user, I want long content to scroll only inside the pane that owns it, so that the rest of the workspace remains stable.
5. As the sole user, I want persistent destinations for This Week, History, and Settings, so that I can move between current work, records, and administration directly.
6. As the sole user, I want the current destination to be visibly selected, so that I always know where I am.
7. As the sole user, I want navigation labels to use current product language, so that the interface does not introduce a speculative generic dashboard taxonomy.
8. As the sole user, I want navigation to exclude placeholder future features, so that the application remains focused on exercise tracking.
9. As the sole user, I want application identity to remain visible without a large marketing hero, so that the workspace spends its space on useful state.
10. As the sole user, I want private and offline operation communicated quietly, so that reassurance does not compete with the next action.

### This Week agenda

11. As the sole user, I want This Week to be the opening destination, so that current exercise state is immediately available.
12. As the sole user, I want the current week label visible without scrolling, so that schedule context is unambiguous.
13. As the sole user, I want progress toward three qualifying workouts visible without scrolling, so that I can assess the week at a glance.
14. As the sole user, I want the next departure or immediate required action visible without scrolling, so that I know what matters now.
15. As the sole user, I want all primary departures visible as compact chronological rows, so that I can scan the week quickly.
16. As the sole user, I want each primary row to show day, time, and truthful status, so that I do not need to open every departure.
17. As the sole user, I want a recorded-workout indicator associated with its departure, so that schedule and completion evidence remain connected.
18. As the sole user, I want fallback slots visible as a subordinate group, so that recovery capacity is available without competing with primary plans.
19. As the sole user, I want fallback availability summarized without scrolling, so that I can tell whether moving a workout is possible.
20. As the sole user, I want unavailable fallbacks distinguished truthfully from available ones, so that the workspace never implies a choice that cannot be taken.
21. As the sole user, I want to select a departure row, so that its details and applicable controls appear in the contextual pane.
22. As the sole user, I want the selected row to remain visibly selected, so that the relationship between the agenda and detail is clear.
23. As the sole user, I want the detail pane to default to the next departure when no action is pending, so that the quiet state remains useful.
24. As the sole user, I want exceptional warnings to appear only when relevant, so that inactive-profile or notification problems are visible without permanent diagnostic clutter.
25. As the sole user, I want schema numbers, long privacy explanations, file operations, and capability diagnostics removed from This Week, so that primary exercise state retains priority.

### Pending departure actions

26. As the sole user, I want a due departure response to open automatically in the detail pane, so that the timely action is difficult to miss.
27. As the sole user, I want the weekly agenda to remain visible while responding, so that the action retains its schedule context.
28. As the sole user, I want the exact established actions Leaving for gym, Move to fallback, and Skip, so that presentation work does not change behavior.
29. As the sole user, I want Move to fallback and Skip to use the complete established preset-reason choices, so that the click-only contract remains intact.
30. As the sole user, I want no typing required for a departure response or reason, so that the established fast interaction remains intact.
31. As the sole user, I want a pending action to remain visibly recoverable if I inspect another departure, so that browsing cannot hide unfinished work.
32. As the sole user, I want a Needs attention control to return me directly to the pending action, so that recovery takes one clear interaction.
33. As the sole user, I want the pending action preserved while browsing, so that selection changes cannot silently discard domain state.
34. As the sole user, I want a completed response to return me to the affected row and updated status, so that the result is immediately visible.
35. As the sole user, I want ordinary departure actions to remain inside the detail pane rather than opening a modal, so that weekly context is not obscured.

### Workout recording

36. As the sole user, I want a due workout record to open in the detail pane, so that I can finish recording without leaving This Week.
37. As the sole user, I want the agenda to remain visible throughout workout recording, so that the source departure remains clear.
38. As the sole user, I want the established staged activity, duration, and effort flow, so that the presentation preserves the existing behavior.
39. As the sole user, I want exactly Elliptical, Weight training, and Other exercise as activity choices, so that no new outcome is introduced.
40. As the sole user, I want the established duration presets including Under 20 and 60+ minutes, so that qualification behavior remains unchanged.
41. As the sole user, I want the established five perceived-effort choices and neutral guidance, so that the app does not imply that harder is better.
42. As the sole user, I want no typing required during workout recording, so that the established quick-selection flow remains intact.
43. As the sole user, I want Under 20 retained without incrementing qualifying progress, so that presentation does not change domain meaning.
44. As the sole user, I want completion to update the affected departure and weekly progress immediately, so that the workspace reflects the saved result.
45. As the sole user, I want an unscheduled workout entry point reachable from This Week, so that optional extra exercise remains supported.

### History

46. As the sole user, I want History to list weeks in reverse chronological order, so that recent records are easiest to reach.
47. As the sole user, I want each week row to summarize progress and notable outcomes, so that I can scan history without opening every week.
48. As the sole user, I want to select one historical week, so that its departures and records appear in the detail pane.
49. As the sole user, I want the week list and selected-week detail to scroll independently, so that a long history does not become one document.
50. As the sole user, I want historical departure outcomes preserved and distinguishable, so that completed, short, moved, skipped, missed, and not-needed states remain truthful.
51. As the sole user, I want workout records shown within their selected week, so that record ownership is clear.
52. As the sole user, I want to select a workout record, so that its correction controls appear in context.
53. As the sole user, I want corrections restricted to the established presets, so that history editing remains click-only and valid.
54. As the sole user, I want a saved correction to recompute the owning week's progress, so that historical totals remain correct.
55. As the sole user, I want deletion to require a clear confirmation sheet, so that a destructive action cannot happen accidentally.
56. As the sole user, I want confirmed deletion to recompute the owning week's progress, so that the result remains consistent.
57. As the sole user, I want cancelling deletion to return focus to its trigger without changing data, so that the interaction is safe and predictable.

### Settings

58. As the sole user, I want Settings divided into Routine, Profile & Data, and Notifications, so that administration does not become another long webpage.
59. As the sole user, I want the selected settings subsection visibly identified, so that the information and control panes remain related.
60. As the sole user, I want only one settings subsection's controls shown at a time, so that unrelated controls do not compete for attention.
61. As the sole user, I want to adjust the repeating routine through established day and time presets, so that future weeks can change without free-form input.
62. As the sole user, I want routine changes distinguished from one-week schedule adjustments, so that current and future plans are not confused.
63. As the sole user, I want the local profile label and authority state available under Profile & Data, so that device ownership remains understandable.
64. As the sole user, I want backup, restore, profile move, and deliberate reactivation available under Profile & Data, so that established file and authority behavior remains reachable.
65. As the sole user, I want native file pickers to remain the production file-selection mechanism, so that file operations behave like Mac application actions.
66. As the sole user, I want profile restore to show validated replacement details before confirmation, so that I know what will replace the active profile.
67. As the sole user, I want profile move and reactivation to require explicit confirmation, so that authoritative-device changes remain deliberate.
68. As the sole user, I want inactive-profile state to disable exercise mutations and reminders, so that two unsynchronized authoritative copies are not created silently.
69. As the sole user, I want notification permission and the next scheduled reminder visible under Notifications, so that reminder capability is inspectable.
70. As the sole user, I want denied notification permission presented as a relevant warning, so that missing reminders are not mysterious.
71. As the sole user, I want the notification capability check available without occupying the primary workspace, so that diagnostics remain reachable but subordinate.

### Compact window and resizing

72. As the sole user, I want every established capability reachable at `640x520`, so that the existing minimum window remains supported.
73. As the sole user, I want the persistent sidebar replaced by a compact labeled destination switcher at the minimum size, so that navigation remains understandable without consuming excessive width.
74. As the sole user, I want information and detail shown one at a time at the minimum size, so that each surface remains readable.
75. As the sole user, I want a clear Back control from detail to information, so that the compact drill-in flow is reversible.
76. As the sole user, I want Back to restore focus to the originating row, so that keyboard context is preserved.
77. As the sole user, I want a pending action prioritized and recoverable in compact mode, so that inspection cannot hide timely work.
78. As the sole user, I want only the active compact surface to scroll, so that the application does not fall back to document scrolling.
79. As the sole user, I want resizing between compact and desktop layouts to preserve the selected destination and relevant selection, so that changing window size does not reset my work.

### Accessibility and visual communication

80. As a keyboard user, I want to reach navigation, information rows, detail controls, and dialogs in a logical order, so that the whole application is operable without a mouse.
81. As a keyboard user, I want every interactive control to show visible focus, so that my current position is always clear.
82. As a keyboard user, I want destination switching, row selection, Needs attention, compact Back, and confirmations to support keyboard activation, so that primary workflows remain accessible.
83. As a keyboard user, I want modal focus contained and restored on dismissal, so that consequential confirmations do not lose context.
84. As a screen-reader user, I want semantic navigation, main, list, detail, form, status, and dialog structures, so that the workspace relationships are conveyed programmatically.
85. As a user who cannot rely on color alone, I want state communicated with text and additional symbols or shapes, so that statuses remain distinguishable.
86. As the sole user, I want restrained typography, separators, and surfaces, so that information density feels calm rather than decorative.
87. As the sole user, I want color reserved for selection, status, warning, and urgency, so that visual emphasis has meaning.
88. As the sole user, I want TickTick's useful desktop structural patterns adapted without copying its identity or proprietary assets, so that Personal Dashboard benefits from proven information architecture while remaining its own product.

### Correctness prerequisites and delivery confidence

89. As the sole user, I want schedule adjustments to leave persisted reminder intent and native reminders consistent, so that changing a plan cannot lose or duplicate reminders.
90. As the sole user, I want an interrupted schedule-reminder transition reconciled after relaunch, so that partial platform failure does not corrupt future behavior.
91. As the sole user, I want profile restore and its reminder transition to recover after failure or interruption, so that restored state and delivered reminders cannot disagree indefinitely.
92. As the sole user, I want invalid or incomplete restore input to leave the active profile and reminders unchanged, so that failed recovery is safe.
93. As the sole user, I want valid backup and moved-profile files accepted after travelling or moving them to a different time zone, so that current offset does not make portable data invalid.
94. As the sole user, I want historical workout instants preserved across time zones, so that past records do not change meaning.
95. As the sole user, I want future routine and departure wall-clock times interpreted in the authoritative Mac's current time zone, so that reminders follow the local schedule where the profile is active.
96. As the sole user, I want imported derived reminder timestamps recalculated rather than trusted as permanent truth, so that a different current offset schedules future reminders correctly.
97. As the sole user, I want release acceptance to drive the packaged Tauri UI through real IPC, so that passing core tests cannot conceal a broken delivered interface.
98. As the sole user, I want packaged acceptance to verify the default and minimum window contracts, so that the shipping app retains the approved workspace behavior.
99. As the sole user, I want the existing exercise application-workflow coverage retained, so that presentation changes do not weaken behavior protection.
100. As the sole user, I want the production Mac workspace completed before mobile implementation resumes, so that current acceptance is focused on one excellent Mac product.

## Implementation Decisions

- The approved production direction is the Agenda-led prototype treatment. The
  chronological week agenda receives the strongest visual weight; the detail
  pane remains quieter until an action or selection requires emphasis.
- The three current destinations are This Week, History, and Settings. They are
  presentation navigation, not new domain contexts and not a permanent promise
  about future feature taxonomy.
- At desktop width, the application surface is a full-window, three-column
  workspace: destination navigation, destination information, and contextual
  action/detail. The shell is constrained to the webview height; the body does
  not own ordinary vertical scrolling.
- Information and detail panes are the only ordinary vertical scroll owners.
  Opening long History or Settings content must not move the destination
  navigation or the other pane.
- The default design target is exactly `960x720`. The existing `640x520`
  minimum switches to labeled compact navigation and a one-surface-at-a-time
  drill-in model. Intermediate resizing preserves destination, selection, and
  pending-action state.
- This Week uses a compact chronological agenda with primary and subordinate
  fallback groups. The frontend maintains selection state; domain state remains
  owned by the application core.
- A domain action that is currently required has priority over the default
  quiet detail. The frontend may allow inspection of another row, but it must
  retain an explicit semantic reference to the pending action and provide a
  Needs attention return control.
- Ordinary departure and workout flows render within the detail pane. Sheets
  are reserved for replacement, authority, deletion, or abandon-with-loss
  confirmations. Production file selection continues through native Mac file
  dialogs.
- History uses a reverse-chronological week list and selected-week detail.
  Record correction uses established presets; confirmed deletion remains a
  domain command and recalculates historical progress.
- Settings exposes Routine, Profile & Data, and Notifications as subsections.
  The app shows only the selected subsection controls rather than rendering all
  administration in one document.
- The Rust-to-frontend contract becomes semantic. Rust exposes stable IDs,
  enum-like domain values, timestamps, validation results, eligibility, and
  available actions. It must not require the frontend to parse user-facing
  prose to determine state or capability.
- The frontend owns application labels, instructions, hierarchy, local date and
  time presentation, neutral exercise guidance, status copy, and temporary UI
  state. Moving display copy must preserve exact action meanings, option sets,
  ordering, and outcomes.
- Existing view contracts may be evolved compatibly or atomically with the
  frontend. Production must never ship a state in which the frontend expects
  semantic values while the running command surface still supplies only
  display prose.
- Schedule and reminder transitions use a recoverable, idempotent reconciliation
  model. Persisted semantic exercise state determines the desired reminder set;
  native cancellation and scheduling are effects that can be retried safely.
  A durable transition marker records incomplete reconciliation, and normal
  launch or refresh repairs it before claiming reminder readiness.
- Profile restore first validates the complete incoming profile without
  mutation. Confirmed replacement atomically commits the profile plus the
  desired reminder state and a reconciliation marker. Native reminder effects
  are then applied idempotently; interruption leaves enough durable state for a
  later launch to finish or safely report the incomplete transition.
- Routine and planned departure day/time values are local wall-clock schedule
  semantics on the authoritative Mac. Historical record timestamps preserve
  their absolute instant and recorded offset. Derived native reminder epochs
  are not portable invariants and are recomputed from semantic schedule state
  when the active time zone changes or a profile is imported.
- Cross-time-zone validation checks the meaning and internal consistency of
  semantic profile data, not equality with an epoch derived from the
  destination's current offset.
- The packaged Mac application is the highest delivery seam for the workspace.
  Bounded acceptance must launch an isolated packaged app, cross real Tauri IPC,
  and inspect rendered and interactive UI state at user-visible altitude.
- Existing Rust application-workflow suites remain the fast behavior seam for
  exercise rules, persistence, controlled time, reminder eligibility, history,
  and file operations. Lower tests are added only where failure injection or a
  semantic contract cannot be exercised reliably through the packaged UI.
- The selected prototype is primary design evidence only. Production markup,
  styling, state handling, and accessibility behavior must be implemented
  deliberately rather than copying disposable fixture code.
- No new frontend framework or dependency is approved. Use the existing Tauri,
  TypeScript, semantic HTML, and CSS stack.
- This phase does not modify profile schema solely for presentation. A schema
  change is permitted only if correctness hardening proves that a durable
  transition or semantic time representation cannot be expressed safely in the
  current version; any such change must be versioned and migrated.
- Existing physical mobile evidence remains historical. New iPad or Samsung
  builds, installs, layout checks, and release gates are not part of this spec.
- The four correctness-hardening deliverables are separate prerequisites for
  production presentation implementation. Tickets must not mix their failure
  recovery logic into layout work merely to reduce ticket count.
- The prototype's five unresolved visual questions are not additional approved
  changes. Production starts from the selected Agenda-led behavior and records
  any later user-requested refinement separately.

## Testing Decisions

- Good tests assert observable product behavior and delivered accessibility,
  not CSS class names, internal rendering functions, private Rust types, or the
  disposable prototype structure.
- The primary new seam is one bounded packaged-Mac acceptance layer. It launches
  the real app with isolated profile paths and controlled time, invokes actions
  through the rendered controls, crosses real Tauri IPC, and observes visible
  state after relaunch where persistence matters.
- Packaged acceptance verifies, at minimum, This Week navigation, agenda row
  selection, automatic pending-action presentation, Needs attention recovery,
  one complete click-only workout record, History selection, correction and
  deletion confirmation, Settings subsection selection, and one consequential
  confirmation flow.
- Packaged acceptance measures the webview at exactly `960x720` and verifies
  that week progress, the next departure or required action, all primary rows,
  and fallback availability are visible without body scrolling.
- Packaged acceptance measures `640x520` and verifies labeled compact
  navigation, information-to-detail drill-in, keyboard-accessible Back, pending
  action recovery, and scroll ownership by only the active surface.
- Viewport tests assert that the document and body remain locked to the webview
  and at scroll position zero while long History and detail content scrolls in
  its owning pane. Pixel screenshots support human review but are not the sole
  pass/fail oracle.
- Accessibility acceptance verifies semantic landmarks, accessible names,
  selected/current states, live status announcements, visible focus, logical
  tab order, keyboard activation, dialog semantics, Escape dismissal, focus
  containment, and focus restoration.
- Status tests verify meaningful text plus a non-color signal for complete,
  upcoming, unresolved, unavailable, inactive, denied, and warning states.
- Existing public Rust application-workflow suites remain authoritative for the
  established exercise choices, ordering, outcomes, weekly qualification,
  reminder eligibility, rollover, history recomputation, and no-typing domain
  behavior.
- Existing profile backup, move, migration, and packaged Mac acceptance suites
  remain in force. Presentation work must not replace them with DOM-only tests.
- Schedule-adjustment correctness tests inject failure before, during, and after
  native reminder cancellation, scheduling, and state persistence. Each case
  asserts that relaunch reconciles to exactly the desired reminder set without
  stale or duplicate reminders.
- Restore correctness tests inject interruption after validation, after profile
  commit, during native reminder effects, and before reconciliation completion.
  Each case asserts unchanged valid state before confirmation or recoverable
  confirmed state afterward.
- Reminder reconciliation tests are idempotent: repeating reconciliation after
  success produces no additional reminders and leaves the durable transition
  complete.
- Time-zone tests use controlled clocks with different offsets. They verify that
  historical record instants remain unchanged, future wall-clock departures are
  reinterpreted in the active zone, derived reminder epochs are rebuilt, and a
  valid backup or moved profile is accepted.
- Invalid, internally inconsistent, or unsupported profile data must still be
  rejected without replacing the active profile or reminders; cross-zone
  portability must not weaken structural validation.
- Frontend semantic-contract tests, if needed, operate on public semantic view
  data and visible rendered outcomes. They do not snapshot entire markup or
  duplicate the packaged acceptance matrix.
- Production verification includes TypeScript build/type checking, Rust checks,
  all focused and full workflow suites, packaged Mac acceptance, source-boundary
  acceptance, and whitespace validation.
- Mobile compilation and device acceptance are deliberately excluded from the
  verification commands for this phase.

## Out of Scope

- Changing the established exercise goal, schedule rules, fallback ordering,
  reminder timing, workout choices, qualification rules, history semantics, or
  backup/profile-authority behavior.
- Adding early-rising, reading, supplements, planning, or another Personal
  Dashboard feature area.
- Creating a generic habit engine or speculative navigation for future
  features.
- iPad or Samsung implementation, mobile layouts, mobile notifications, mobile
  file flows, physical-device tests, or current mobile acceptance gates.
- Accounts, authentication, cloud storage, synchronization, history merging, or
  simultaneous authoritative devices.
- Replacing versioned JSON with SQLite or another persistence system.
- Adding React, Svelte, another frontend framework, or any unapproved
  dependency.
- Developer ID signing, notarization, a DMG requirement, App Store distribution,
  public deployment, automatic updates, analytics, or telemetry.
- Dark mode, custom traffic-light or title-bar chrome, animation polish, and
  final iconography.
- Promoting the disposable prototype implementation directly into production.
- Copying TickTick's name, logo, proprietary artwork, exact icons, or exact
  brand expression. Structural and interaction learning from TickTick is
  allowed.
- Treating screenshot similarity as a substitute for semantic, interactive,
  accessibility, and persistence acceptance.
- Resolving the prototype review's remaining visual questions without a later
  explicit user decision.

## Further Notes

- The approved prototype brief is
  `.scratch/personal-dashboard-mac-workspace/prototype-brief.md`.
- The selected Agenda-led verdict, state URLs, scroll measurements, keyboard
  evidence, and unresolved visual questions are recorded in
  `.scratch/personal-dashboard-mac-workspace/prototype/REVIEW.md`.
- The runnable prototype under
  `.scratch/personal-dashboard-mac-workspace/prototype/` is fixture-only primary
  design evidence and remains disposable.
- Rendered prototype evidence is under
  `output/playwright/personal-dashboard-mac-workspace/selected-a/`.
- The accepted Tauri boundary remains in
  `docs/adr/0001-use-tauri-for-the-cross-platform-app.md`; this spec does not
  supersede the platform choice.
- The four correctness findings are prerequisites, not optional follow-up
  polish. Ticket planning must represent them as explicit blockers before the
  first production presentation ticket.
- The user must explicitly approve this spec before `/to-tickets`. Do not create
  or implement tickets from `ready-for-agent` status alone.
