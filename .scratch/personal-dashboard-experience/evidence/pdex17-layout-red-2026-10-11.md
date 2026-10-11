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

