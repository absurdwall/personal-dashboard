# Personal Dashboard 3.0 packaged candidate result

Date: 2026-09-12

Status: **incomplete — the local packaged candidate and visual comparison
passed, while ticket 08's actual Drive cloud/version/trash evidence remains
blocked.**

## Candidate identity

- Product-code candidate: `135e660e03ed744f38e4f7ee7505bb1097956da6`
  (`test(vault): verify Drive compatibility boundary`). Ticket 09 adds only
  acceptance automation, evidence documentation, and tracker updates on top of
  that product checkout.
- Build command: `npm run build:mac`.
- Bundle: `Personal Dashboard.app`, identifier
  `com.tortillaflat.personal-dashboard`, short/build version `2.0.0`.
  The 3.0 effort name has not silently changed the package metadata.
- Packaged executable SHA-256:
  `3913a8e2bbc6f0396047c7cb1851c58b788f4d952c0708cad69877f37bb8374e`.
- Environment: macOS 26.5.1 (25F80), ad-hoc signed local release build. The
  build was not notarized and did not replace the user's installed app.

## Evidence layers

The layers below are deliberately separate:

1. Frontend/Rust regression tests verify parsing, persistence contracts,
   localization, stale revisions, late responses, and error states without
   claiming that a Mac window was exercised.
2. `scripts/acceptance/macos-ipc-workflow.sh` launches a copied release bundle
   with an isolated application profile and synthetic Vault. Accessibility
   actions cross the real Tauri boundary. Ticket 09 adds `dashboard-3` to the
   local candidate gate after the focused settings, language, background,
   tasks, habit-merge, history, error, and late-response scenarios.
3. The accepted B browser prototype is only the visual reference. Playwright
   captured it at the same CSS viewport widths; browser interactions are not
   counted as packaged or persistence evidence.
4. Ticket 08 is the only actual Drive-client evidence. Its incomplete cloud
   phase is not replaced by an ordinary temporary Vault or by this local gate.

## Focused packaged result

The new scenario was first run before dispatch existed and failed with
`unknown acceptance scenario: dashboard-3`. After implementation, two bounded
runs exposed acceptance-expectation defects: Calendar presents the review's
“what happened” field rather than the optional simple summary, and the legacy
`settings` scroll helper belongs to the retired Exercise/Profile settings
surface. Both assertions were corrected without changing product code. The
next run passed:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=dashboard-3 \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=300 \
PERSONAL_DASHBOARD_ACCEPTANCE_CAPTURE_DIRECTORY="$PWD/output/playwright/personal-dashboard-3-candidate-20260912-r4" \
scripts/acceptance/macos-ipc-workflow.sh
```

The passing scenario proved, in one synthetic packaged profile:

- a structured planning action appeared in the B task rail while a suggestion
  did not become a task;
- Mist blue and an imported app-owned background survived restart after the
  original synthetic image was moved;
- the task rail remained present across all three Today phases at the wide
  viewport;
- a reviewed historical Calendar day and expanded 12-week Exercise history
  were readable;
- fixed interface copy switched to English while source-owned Chinese record
  text stayed unchanged;
- `Day tasks`, `Unchecked means unconfirmed`, the long Data & Vault Drive
  boundary, and the corresponding Chinese surfaces fit the exercised windows;
- visual reading left both Daily Records and the external Habits snapshot
  byte-identical.

The capture command accepts only a new directory under `output/playwright/` and
the Swift driver writes each image with an exclusive create. A deterministic
regression creates a competing sentinel after the initial availability check
and proves that the capture cannot replace it. The passing real-app matrix in
`output/playwright/personal-dashboard-3-candidate-20260912-r4/` contains 14
PNGs at 1120×760, 800×640, and 640×520. Earlier partial capture directories
remain as failed-attempt evidence rather than being reused.

## Integrated local gate and behavior tests

The first recursive gate attempt still included the retired 2.0
Exercise/Profile and installed-cutover scenarios, and failed on the absent
`Log workout now` control. ADR-0002 makes that absence the required 3.0 normal
startup behavior, so the candidate gate now composes tickets 01–07 plus the
integrated `dashboard-3` scenario; the old scenarios remain individually
invocable historical seams.

The current gate then exposed stale Settings labels and an Accessibility race:
`AXPress` could report success on a temporarily disabled Vault button while no
native picker opened. The 3.0 assertions now use current bilingual controls,
and the driver waits for an enabled control. Picker readiness has one bounded
close-and-retry recovery. The complete current gate passed:

```sh
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=gate \
PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=300 \
PERSONAL_DASHBOARD_ACCEPTANCE_SUITE_TIMEOUT_SECONDS=1800 \
scripts/acceptance/macos-ipc-workflow.sh
```

This green local gate does not include or imply the ticket 08 cloud phase.
Supporting checks also passed:

- `npm run test:frontend`: 60 passed, 0 failed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 207 passed, 0 failed.
- `npm run check`: TypeScript build and Rust check passed.
- `bash -n scripts/acceptance/macos-ipc-workflow.sh` and Swift driver
  type-check passed.

## Accepted-B prototype comparison

Playwright captured 16 browser-reference PNGs under
`output/playwright/personal-dashboard-3-prototype-reference-20260912/`, using
variant B, Chinese and English, Forest and Mist blue, no-image and synthetic
image states, plus 1120×760, 800×640, and 640×520 viewports. The browser console
reported zero errors.

Direct visual inspection found the same interaction structure in the packaged
candidate:

- Today keeps the three phase tabs and the wide right-side task rail without
  taking over the primary reading column.
- Calendar keeps a light page layer, transparent calendar interiors, and a
  separate selected-day summary.
- Habits remains the flatter compact surface: left weekly summary, right daily
  anchors/weekly rows, inline completion, and inline 12-week history. It was not
  wrapped to imitate Today or Calendar.
- Appearance and Data & Vault remain separate Settings sections. The selected
  color and one shared low-opacity background underlay reach Today, Calendar,
  Habits, and Settings.
- The product omits the prototype-only synthetic-data notice and A/B/C layout
  controls, as expected.

This is automated and agent-observed evidence, not user approval. The user
still needs to review the stronger/larger packaged typography, the background's
comfort at Retina scale, and the narrow-window reading order/scroll position.
The `2.0.0` package version is also recorded for an explicit release decision;
it was not changed as an undocumented acceptance side effect.

## Remaining blocker and support boundary

Ticket 08 remains `claimed`. Google Drive for desktop 123.0.1.0 stayed in its
account-loading state and the representative File Provider files remained
`isUploaded = 0`, `isUploading = 1` during its bounded attempt. Remote-to-local
change, conflict-copy behavior, actual version restore, and trash restore are
therefore still unproved. The local candidate does not add OAuth, uploads, a
sync engine, or a whole-Vault recovery promise.

Do not rerun that narrow cloud phase until the client leaves account-loading.
Then use a fresh marker-owned disposable Drive fixture and first require a
stable uploaded seed before remote update/version/trash checks. Until that
happens, ticket 09 must remain incomplete even when the local packaged gate is
green.
