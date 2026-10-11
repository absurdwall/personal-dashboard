# PDEX-11 — packaged daily-flow acceptance

Status: in progress. Native checks below belong to the original candidate; four bounded repairs require one rebuilt final candidate and Computer Use revalidation. No parent-spec closure, installation or publication is inferred.

## Original candidate and isolation

- Source: `9561954c9a14ba2ae72d82bd14fa3289c0c6fe3c`.
- Executable SHA-256: `0129145c2985a0b36d5f6d1b0b9676228870c8357c56f276e4cca9f69d01d30a`.
- Temporary bundle: `/tmp/pdex-package-build.noindex/release/bundle/macos/Personal Dashboard.app`; private Cargo target and jobs=2, immutable release-cache clone only. `npm run build:mac` succeeded.
- Isolated synthetic Profile/Vault and fixed NY time: 2026-09-08 17:05 −04:00. Raw manifests, screenshots, AX captures and synthetic persisted sources remain outside Git under `/tmp/pdex-11-run.noindex`.
- No real Vault/profile, credentials, installed App, dependencies, global configuration or remote records changed. The unavailable private Codex runtime did not prevent deterministic edits; this is not proof of real model quota exhaustion.

## Actual original-candidate observations

- Morning displayed the independent 08:00–10:00 immutable baseline and broad 午后 text. Current-plan range movement preserved two hours, edge-held movement reached beyond the initial visible time, explicit editor and resize changed the result to 18:00–20:30. Broad drag became 约14:00 with no end; exact 10:07 remained unchanged on cancellation and became a point at 10:45 after explicit movement. Each successful mutation was read from real Markdown, including operation receipts. An excessive edge hold visibly rejected the out-of-range result without writing.
- Blank-axis selection created a real synthetic Task at 06:00–07:15; subsequent movement preserved its 75-minute duration at 07:00–08:15. Task detail editing produced an overnight 23:30–next-day 00:45 interval. Actual completion changed lifecycle/history while retaining this interval. Narrow 830×758 detail remained reachable below the list. List reassignment has not passed native acceptance.
- Calendar at 830×758 showed all 35 September cells and all 42 May cells with equal heights. Real date detail displayed eight Tasks after creation and the actual next-day endpoint. Read-error, reviewed and unreviewed markers remained distinct; Task completion did not change the review marker.
- Calendar at native 1280×720 FAILED: 32px chrome leaves a 688px client area; six-week rows extended beyond the window. Root independently confirmed the screenshot. This observation led to the repair below, and is not a native final-candidate pass.
- A new synthetic Collaboration session persisted without messages/executions. Slash/IME were not exercised because the isolated runtime was unauthenticated. Root will use an explicitly labeled inspect-only synthetic transport for composer/OS UI evidence; it refuses submissions and is not real authentication/model execution.
- Computer Use navigation independently confirmed Today Morning remains immutable while Collaboration incorrectly called the changed arrangement Morning. The real Markdown baseline remained unchanged.
- After user steering to Computer Use Virtual Mouse, all native physical-pointer/keyboard driver actions stopped. Earlier driver extensions/captures remain outside Git; no new physical-pointer commands are added. No input-source change or pending restoration occurred.

## Bounded red/green repairs

1. Calendar: production rendered-WebKit regression includes 1280×688 and 830×726 client areas in addition to 1280×720 and 830×758. Before repair, the six-week grid exceeded 688px (bottom 713.406); the header's inherited margin/48px font defeated compact layout. Scoped header margin and selector specificity repair passed all 12 Calendar cases. Actual rebuilt-native geometry remains pending.
2. Task adapter retry identity: public isolated offline adapter regression reproduced omitted-end operation-ID reuse accepted as explicit null after another edit added an end. Successful reschedules now retain the original omitted/null/object patch, reject collisions, and preserve genuine retry and legacy history compatibility. Adapter and Task workflow suites passed: 13 + 28 tests.
3. Morning authority: public DashboardContextReader regression uses divergent baseline 08:00–10:00 and current arrangement 18:00–20:30. Before repair, Morning context reported the latter. Reading `baseline.timeline` passed all 33 Collaboration workflow tests and source-file immutability assertions.
4. Plan recovery: real production page at existing IPC seam initially failed rejected-drag explicit retry and saved-but-refresh-failed confirmation (6/8 passed). Reread now checks the captured date/Vault and exact opaque raw-source/span identity; unchanged source retains values and permits only explicit retry against the fresh revision, while changed source requires reselecting. Known successful write closes only when its saved whole-document revision is confirmed. There is no automatic replay or title/index rebinding. Manual retry uses a new operation ID because its revision/payload may change. Seven rendered-WebKit editor tests cover retained precision/time, fresh revision, changed same-title identity refusal and saved views. Final browser plan-gesture rerun after the operation-ID refinement passed 8/8.

Combined focused rendered-WebKit check: 19/19 passed (12 Calendar + 7 plan editor). Frontend build and whitespace check passed. Original integrated evidence from feature tickets remains intact; root reruns the combined suites after merging these fixes.

## Remaining final-candidate acceptance

Rebuild once after the four fixes, freeze source and binary IDs, then root owns Computer Use actions. Required remaining checks include both Calendar dimensions/months, plan failure→reread→explicit retry with saved-source integrity, Task list reassignment and reopen, final source/view/restart consistency, native slash keyboard/click/Escape/ordinary slash and real OS Chinese composition using existing sources, Evening today/past-date/draft preservation and no sends, corrected Morning context, and genuine conflict/write failure. Saved-but-readback-failed native injection is not established; do not count mocked IPC or timing races as a packaged pass. Verify no automatic replay and record the limitation if it cannot be induced safely. Recheck installed App hash and unregister only owned temporary bundles from Launch Services at completion.
