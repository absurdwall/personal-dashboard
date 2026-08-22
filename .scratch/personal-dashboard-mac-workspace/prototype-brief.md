# Personal Dashboard Mac workspace prototype brief

Status: ready-for-prototype

## Purpose

Prototype a product-quality, action-first Mac workspace for Personal Dashboard.
The prototype must answer whether the established exercise experience can fit
comfortably inside a typical Mac window without behaving like a vertically
scrolling webpage.

This brief authorizes a disposable frontend prototype only. It does not
authorize production implementation, dependency changes, ticket creation, or
changes to live Personal Dashboard data.

## Product baseline

The current Tauri application behavior remains the baseline. Preserve the
established exercise schedule, reminders, departure responses, fallback and
skip behavior, workout recording, progress, history correction and deletion,
routine adjustment, backup and restore, profile movement and authority, and
notification behavior.

In particular:

- Keep Tauri 2, the shared Rust core, plain TypeScript, semantic HTML, and CSS.
- Keep versioned, file-backed local JSON.
- Keep the product offline, without an account or synchronization.
- Keep exercise actions, choices, ordering, and outcomes unchanged.
- Require no typing during exercise workflows. Existing profile-label behavior
  remains part of the current application baseline.
- Do not introduce another feature area or a generic dashboard framework.

The current default window is `960x720`; this is the primary prototype
acceptance viewport. The existing `640x520` minimum must remain fully usable,
but it does not need to display all workspace regions simultaneously.

## Current-phase boundary

This is a Mac product-quality phase.

- iPad and Samsung implementation, builds, device checks, production layouts,
  and regression gates are deferred.
- Existing mobile capability evidence remains historical migration evidence.
- The prototype must not intentionally constrain a future mobile path, but
  future mobile reuse is not a current acceptance criterion.
- Signing, notarization, distribution, automatic updates, accounts, cloud
  storage, sync, dark mode, custom title-bar chrome, animation polish, and final
  iconography are outside this prototype.

The accepted Tauri architecture remains recorded in
`docs/adr/0001-use-tauri-for-the-cross-platform-app.md`. This prototype brief is
not a new ADR, and its navigation labels may change after evaluation.

## Post-migration findings

Treat the five unresolved review findings as two separate work tracks.

### Correctness hardening

Production presentation work is blocked until these four findings are resolved:

1. Make schedule adjustments transition persisted reminder intent and native
   reminders safely without losing or duplicating reminders.
2. Make profile restore and its reminder transition recoverable after failure
   or interruption.
3. Allow valid backup and profile-move data to cross time zones without being
   rejected because the destination has a different current offset.
4. Add bounded packaged acceptance coverage that crosses the real Tauri IPC and
   rendered UI boundary, while retaining the fast Rust application-workflow
   suites.

Prototype work may proceed before this hardening because the prototype is
isolated, uses fixtures, and exercises no real application boundary.

### Presentation architecture

Rust currently supplies user-facing labels, instructions, and formatted status
copy even though the accepted architecture assigns presentation to the
frontend. The prototype must express the intended boundary:

- Rust supplies semantic state, stable identifiers, domain values, timestamps,
  available actions, and validation outcomes.
- TypeScript supplies Mac-facing labels, hierarchy, guidance, date and time
  formatting, and status copy.
- Moving this production copy is part of the first presentation implementation
  ticket after prototype approval; it is not part of the disposable prototype.

## Prototype question

Can a three-region Mac workspace make current exercise state, the next required
action, and the surrounding weekly context understandable at `960x720`, while
keeping History and Settings efficient and avoiding whole-window scrolling?

The prototype should optimize for rapid comprehension and action, not for the
amount of explanatory prose visible at once.

## Information architecture

Use three current top-level destinations:

1. **This Week** — current progress, planned departures, fallback availability,
   reminders, and timely actions.
2. **History** — prior weeks and workout records, including correction and
   confirmed deletion.
3. **Settings** — repeating routine, profile and file operations, profile
   authority, and notifications.

These destinations are a prototype choice, not a permanent product taxonomy.
Do not add placeholder destinations for hypothetical future features.

At `960x720`, use three regions:

1. A narrow persistent navigation sidebar.
2. A compact information pane for the selected destination.
3. A contextual action or detail pane.

The window body must not scroll. The information and detail panes own their
vertical scrolling independently when their content exceeds the available
height.

## This Week workspace

The default workspace is action-first.

Keep the following visible without scrolling at `960x720`:

- Current week label and progress toward three qualifying workouts.
- Next departure or immediate required action.
- Compact truthful status for each primary departure.
- Fallback availability.
- Relevant exceptional warnings, such as an inactive profile or denied
  notification permission.

Represent the week as a compact chronological agenda:

- Put week progress and next departure at the top of the information pane.
- Show the three primary departures as selectable rows.
- Show the two fallback slots as a visually subordinate group.
- Show day, time, truthful status, and any associated recorded-workout indicator
  in each row.
- Put explanations, editors, and actions in the detail pane rather than inside
  expanding cards.

When no action is pending, the detail pane shows the next departure or the
selected row. When a departure response or workout action becomes due, open it
automatically in the detail pane. If the user inspects another row, retain a
prominent, keyboard-accessible **Needs attention** control that returns to the
pending action. Never hide or discard the action.

Run ordinary departure responses, preset reason selection, and staged workout
recording inside the detail pane. Keep the agenda visible and replace only the
detail-pane content between steps. After completion, return to the affected
slot and its updated status.

## History workspace

The information pane lists weeks in reverse chronological order with compact
progress and outcome summaries. The detail pane shows the selected week's
departures and workout records.

Selecting a workout exposes its preset correction controls in the detail pane.
Confirmed deletion uses a sheet. The week list and selected-week detail may
scroll independently; History must not become a long document containing every
week at once.

## Settings workspace

Use three subsections in the information pane:

1. **Routine** — the repeating exercise schedule.
2. **Profile & Data** — profile label, backup, restore, profile move, authority,
   and deliberate reactivation.
3. **Notifications** — permission, next scheduled reminder, and the capability
   check.

Show only the selected subsection's controls in the detail pane. Do not place
all settings in one vertically stacked page.

Routine editing and ordinary workout correction remain in-pane. Use a Mac-style
sheet or modal for actions with replacement or loss risk:

- Restoring a profile.
- Moving or reactivating a profile.
- Deleting a workout record.
- Abandoning an in-progress change when data would be lost.

Continue to use native file pickers in production; the prototype represents
their entry and return states without opening a real picker.

## Compact-window behavior

At `640x520`:

- Replace the persistent sidebar with a compact, labeled destination switcher.
- Show the information pane and detail pane one at a time.
- Provide a clear, keyboard-accessible Back control.
- Give a pending action precedence and keep it easy to recover while browsing.
- Allow the active surface to scroll locally.
- Do not fall back to whole-window document scrolling.

The compact treatment proves reachability and coherence, not simultaneous
visibility of all primary information.

## Visual direction

Pursue a calm, compact Mac utility rather than a decorative landing page:

- Use system-oriented typography and clear information hierarchy.
- Prefer selectable rows, thin separators, and restrained surfaces over large
  cards.
- Use color for state, warning, selection, and urgency rather than for dividing
  every section.
- Remove the marketing hero, duplicated feature headings, oversized editorial
  type, and explanatory sections from the primary workspace.

TickTick may be used extensively as a direct structural and interaction
reference. Learn from its pane proportions, density, navigation hierarchy,
selection relationships, row behavior, local scrolling, and other relevant
desktop patterns. Personal Dashboard must retain its own product name and must
not copy TickTick's logo, proprietary artwork, exact icons, or exact brand
expression.

## Comparison strategy

Build two bounded treatments of the normal `960x720` This Week state:

### A. Agenda-led

The chronological weekly agenda carries the strongest visual weight. Selection
drives a quieter contextual action and detail pane.

### B. Action-led

The current action and next departure carry the strongest visual weight. The
weekly agenda is denser and more subordinate.

Keep navigation, sample data, behavior, and the three-region architecture the
same so the comparison isolates emphasis and density. Do not implement the full
state matrix twice. Pause for user selection; then apply only the selected
treatment to the remaining representative states.

## Fixture data

Use static, synthetic fixture data only. It should be rich enough to show:

- A partially completed week.
- Different truthful primary-slot statuses.
- Available and unavailable fallback slots.
- A pending departure response and preset reason selection.
- A staged workout record.
- Several historical weeks and enough records to require local scrolling.
- A selected record being corrected and deleted.
- Active and inactive profile variants.
- Granted and denied notification variants.

The prototype must not invoke Tauri commands, read or write the live JSON
profile, schedule notifications, open real file dialogs, or import production
data.

## Representative states

After one comparison treatment is selected, demonstrate:

1. Normal current week at `960x720`.
2. Pending departure response, including preset reason selection.
3. Staged workout recording.
4. Long History with selected-record correction and deletion confirmation.
5. Settings with profile-file controls and a notification warning.
6. Compact `640x520` navigation and information-to-detail drill-in behavior.

Goal completion and inactive-profile warnings may be switchable variants rather
than additional full screens.

## Accessibility and keyboard contract

The prototype must include:

- Semantic navigation, main, list, detail, form, status, and dialog structures.
- Visible focus indication.
- A logical sidebar to information list to detail-pane tab order.
- Keyboard activation for every interactive control.
- Keyboard-accessible destination switching, selection, **Needs attention**,
  compact Back navigation, and confirmation dismissal.
- No color-only status distinctions.

The established typing-free exercise workflow means no typing is required; it
does not mean mouse-only interaction.

## Required evidence

Deliver the disposable prototype with:

- `960x720` screenshots for all six representative states.
- A `640x520` compact screenshot and short navigation walkthrough.
- An explicit statement of scroll ownership for every state.
- Evidence that the window body does not scroll.
- A keyboard and visible-focus walkthrough.
- A short list of unresolved visual questions for user review.

## Rejection conditions

Reject or revise the prototype if it:

- Requires whole-window vertical scrolling.
- Hides weekly progress or a pending action.
- Turns History or Settings into another long webpage.
- Changes established exercise choices, ordering, meanings, or outcomes.
- Requires typing for an exercise action.
- Requires a new frontend dependency.
- Invokes production Tauri behavior or touches real profile data.
- Copies TickTick's brand identifiers or proprietary visual assets rather than
  learning from its structure and interaction patterns.

Structural similarity to TickTick is not itself a rejection condition.

## Approval and handoff

The prototype is disposable and must never be treated as production
implementation. The user explicitly selects, rejects, or requests another
iteration of the comparison direction.

Only an explicitly approved direction may proceed through:

`/handoff -> /to-spec -> /to-tickets`

The four correctness-hardening findings remain a separate prerequisite track
before production presentation work. After ticket planning, implementation
returns to one bounded ticket per fresh context.
