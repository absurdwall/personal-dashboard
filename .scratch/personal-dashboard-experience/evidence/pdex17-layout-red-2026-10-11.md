# PDEX-17 Collaboration layout diagnosis — 2026-10-11

## Scope and setup

The production `frontend/index.html`, `frontend/styles.css` and `frontend/collaboration-panels.ts` were rendered in macOS WebKit and Chromium using synthetic content only. The panel controller was initialized from production source. The view uses a synthetic background, synthetic selected session, synthetic retained-failure status, 34 synthetic messages and synthetic Current-work cards. No App Server, model, selected Vault, user profile, or real message was accessed. Private PNGs and scripts are under `/tmp/pdex-collaboration-layout-diagnosis-20261011.noindex` and `/tmp/pdex-reviewer-shell-red.noindex`; neither directory is tracked.

The reproducible initial red command was `node /tmp/pdex-reviewer-shell-red.noindex/probe.mjs` (expected exit 1 when the composer is outside the viewport). It loaded checked-in production HTML/CSS and the current Collaboration panel initializer and sampled 795×756, 874×756, 1280×720 and 1280×756. All four showed the composer below the initial viewport. The probe's first long-form fixture was expanded separately in WK to exercise empty and selected-long states.

## Production WK baseline at 874×756

| Synthetic state | Chat pane | Message list | Composer | Page/message scroll |
| --- | ---: | ---: | ---: | --- |
| Empty session | y=401.7, h=640 | y=462.1–807.9, h=345.8 | y=807.9–1039.3 | information scrolls; message list has no content overflow |
| Selected long session + retained failure | y=401.7–1136.8, h=735.2 | client h=423, scroll h=3817 | y=903.0–1134.4 | information scroll h=1725/client h=589 and message-list scroll h=3817/client h=423 |

At scrollTop 80, the activity-date button moves from y=214.1 to y=134.1 while the information scrollport begins at y=167.5. Only 1.8px of its 35.2px height remains inside that scrollport. The global workspace header is `position: static`, outside the scroll region, and stays at y=67.2–167.5. This is a separate scroll-boundary/clipping issue, not a sticky-position rule.

The Collaboration chat pane computes `background: rgba(0, 0, 0, 0)` and `border: 0 none` with the background image marked ready. A one-variable WK overlay of only a white chat-pane background changes the computed surface and screenshot boundary without moving the pane, message list or composer.

## Single-variable diagnosis

- Setting only `.collaboration-chat-pane { min-height: 0 }` moves the empty-session composer start from y=807.9 to y=686.1, but its bottom remains at y=917.5. For the selected long session, this declaration changes neither the 735.2px natural chat height nor the composer position; the message content sets that height. This constraint predates 9cafeca and is not the sole cause.
- Moving the global workspace header into the same information scroll flow, without changing its style, makes the activity-date control remain fully inside the scrollport after the same 80px scroll. Merely hiding the global header shifts content by about 100px but does not make the long-session composer fit.
- Restoring only the chat background changes its computed color from transparent to `rgba(255, 255, 255, 0.92)`; the measured geometry is unchanged. The screenshot shows the missing panel surface was a distinct visual defect.
- WK computed page-heading styles at 874×756: Today, Tasks and Habits are 34.96px Georgia/34.26px line-height; Calendar is 20px Georgia/19.6px; Collaboration is 26px system sans/25.48px. Align the shared destination heading rules rather than adjusting only one page.

These observations identify separate structure, available-height, surface and typography concerns. They do not establish that every issue originated in 9cafeca. PDEX-17 acceptance tests must cover empty and selected-long scenes after the integrated fix.

## Regression checkpoint

The retained red test is `node --test tests/frontend/collaboration-layout.test.ts`. It loads the production page/CSS into the repository's macOS `WKWebView` helper, compiles and calls the actual `initializeCollaborationPanels()`, expands Current work through its real button handler, and supplies synthetic retained-failure/long-message data. Its first run fails only at the user-visible composer reachability assertion: in 874×756 the composer is y=903.0–1134.4 while the viewport ends at 756; the message list scrolls independently (3817px content/423px client) and the page also has reachable context content. This is the active red baseline.

An early scratch draft that manually reconstructed controller geometry or did not await its initializer is excluded from this evidence. Its temporary files remain private and are not used by the regression or diagnosis above.

## Expanded narrow-history follow-up and verification

The independent Spec review found an additional state omitted by the original matrix: at 640×756, five-session history expanded in single-column mode, the chat grid row was only 14.78px high, its message-list viewport was 11px high, and the composer fell outside the chat pane. The original 0fr/auto row allocation let the history row consume the fixed-height primary pane. Raising only the chat row minimum to 24rem retained the composer but pushed its bottom below the initial viewport and collapsed the history row; changing only the primary flex size made long message content expand the chat to over 4,100px. Both one-variable probes were discarded.

The production fix gives the narrow chat a 24rem grid track and sizes the primary grid to its content, so the history pane follows the chat in the existing workspace scroll flow. At narrow viewport widths the status bar wraps horizontally, which releases enough height for the chat and composer. The regression now expands history through the production button, inserts five synthetic session rows, and asserts that the status and composer stay inside the chat, the message list remains independently scrollable with at least 80px of viewport, and the history remains reachable below it. At 640×756 the test passes.

The same pass aligned Collaboration's intro paragraph with the existing shared `.workspace-description` typography and extended production-WK checks to compare that scale with Today. No new type values were introduced.

Verification on this source: production WK Collaboration layout 10/10; panel preferences and focus 6/6; Today docked sidebar/aside/nav 18/18; compact Calendar 12/12; `npm run build` and isolated native app bundling passed. The candidate at `/tmp/pdex17-cua-narrow-final-20261011.noindex/release/bundle/macos/Personal Dashboard.app` passed `codesign --verify --deep --strict` (executable SHA-256 `198688b7a261869303285b51fdcafeec73442c1e33c5cfcada656079e39bef04`). Computer Use opened Collaboration in the 640×756 candidate, expanded the empty history panel, and confirmed visually that the disabled empty composer remains within its pane while Sessions flows below it and is reachable by page scrolling. No Vault was selected and no session or message was created.

The full frontend run reports 451/465 passed and the same 14 fixture failures as the prior baseline (including missing harness globals `compactScheduleTransactions` and `todaySideRegion`, plus raw-markup assumptions in Today axis tests). All 10 Collaboration layout cases, including the added narrow-history case, passed in that run. The failures are recorded separately; this does not claim a clean full-suite run.

Independent review of the follow-up source is pending. A read-only finalization check found the executable at `/Applications/Personal Dashboard.app` has SHA-256 `eacb89dcefbc8f7d566dcec8c20664ab33d901a6be3aba8d70f8afd46c6ef112`, modification time 2026-10-11 05:26 EDT, and a running process (PID 89474). This task did not open or modify that process; its source and protection provenance were not verified here. The native visual result above came only from the isolated candidate.

