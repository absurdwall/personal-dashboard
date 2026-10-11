# PDEX-11 — packaged daily-flow acceptance

Status: final candidate checked; remaining native acceptance blocked by the limitations below. Original observations and repairs are retained as historical evidence. No parent-spec closure, installation or remote publication is inferred.

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

Follow-up Spec review identified the equivalent unchanged untimed/relative source in `unlocatedCurrentArrangement`. The production rendered-WebKit failure→reread regression initially retained 14:00 but kept controls disabled. The authoritative opaque-ID lookup now includes both current-arrangement arrays with the same safety checks; all 8 editor cases pass after rebuilding the frontend assets. The completed bb5b1e6 package was not launched and is superseded; one final package re-embeds this frontend repair.

## Final frozen candidate handoff

- Source: `256ecd01aab9e92ef6bf139d7d83ccc2ae671aee` (all fixes plus unsquashed integration history).
- Executable SHA-256: `32132f656be31fc6f8ecd3b1b2dc5aea20436ab3460f493d8933629321dd5845`; [complete bundle identity](pdex-11-candidate.json).
- Private `npm run build:mac` passed, release build 1m51s. Direct executable launch used only the isolated synthetic Profile/Vault/clock and candidate-only inspect-only transport PATH; no UI input commands or input-source changes were performed.
- Root reports final integrated verification after explicitly rebuilding assets: 431 frontend, 23 browser and 519 native tests passed, no failures, 6 pre-existing native ignores. Both independent review axes, including the untimed follow-up, are clear. Root integration `3a0935d` has identical product source; later review/check records are documentation only.
- Installed `/Applications/Personal Dashboard.app` executable SHA-256 remains `33941698a758314fc9c24d8095e02c65e10a77d1d2825503ab0fcb953ae0da55`, exactly matching the pre-run value.
- Root owns all final native Computer Use acceptance. Exact checklist/raw manifest and process identity are outside Git in the isolated run directory. The native acceptance checklist above remains pending; a successful package or automated suite does not close it.


## Final candidate: Computer Use and persisted readback

Date: 2026-10-10, America/New_York. All observations in this section use the frozen `256ecd01aab9e92ef6bf139d7d83ccc2ae671aee` candidate, executable SHA `32132f656be31fc6f8ecd3b1b2dc5aea20436ab3460f493d8933629321dd5845`. All live UI input after user steering used Computer Use Virtual Mouse and its bound-app keyboard API. Backend file checks did not synthesize UI input.

- Morning: Today and Collaboration both show the independent 08:00–10:00 baseline and original 午后 wording. Current arrangement differs. Native editing, failure recovery and point dragging did not change this baseline or synthetic confirmed fact.
- Real conflict: opening the range editor at 18:00–20:30, retaining requested 17:30–20:30, then externally appending a synthetic sentinel caused native Save to reject the stale revision. The file remained unchanged by rejection. Read Again retained values and re-enabled an explicit retry; Save then persisted 17:30–20:30 while retaining external bytes. No automatic replay occurred.
- Real write failure: the synthetic record parent alone was temporarily made unwritable, with independent file creation proving PermissionDenied. Native Save of 17:45–20:30 returned os error 13, retained the values and showed Unconfirmed. The original directory mode 0755 was immediately restored. Rejection left the source hash unchanged; Read Again followed by explicit Save persisted the requested result. No real Vault permissions changed.
- Point movement: actual virtual pointer movement saved Quiet Epsilon from 05:00 to 05:15, retaining point semantics without an end. Actual Markdown and reopened views agree.
- Task creation/movement: blank-axis selection 04:15–04:45 opened the real editable creation dialog and saved Virtual Mouse Range Task with ID `axis-task-84a0e97a-9ddd-416a-893a-26837aa28a31`. Pointer movement saved 05:15–05:45 with the same ID and pending lifecycle. Task details saved changed content, reassigned Synthetic List, and changed the end to 06:00. Explicit Clear End saved null without inventing duration. Clicking the name selected details without completing; the checkbox completed, and Reopen returned to pending. History retained rescheduled/edited/completed/reopened events. All Task mutations left the Daily Record byte hash unchanged. The pre-existing completed overnight Task still has its same ID and 23:30–next-day 00:45 interval.
- Calendar: native 960×720 and zoomed wide windows displayed all 35 September and 42 May cells, with equal-height rows, four previews and actual +4/+5 overflow before/after the additional Task. Date detail displayed all nine Tasks, including the shared ID and explicit overnight end date. Sep6 read error, Sep7 reviewed and Sep8 no review remain distinct; completion does not infer review.
- Slash: `/` offers only the real `/retro`; keyboard Down/Tab, `/re`/Enter and virtual candidate clicking inserted editable drafts. Enter with a candidate did not send. Escape retained `/`; ordinary body text containing `/retro` did not open completion or submit. No Workflow Retro command was offered.
- Evening: repeated current-date entry reused its existing dated session and preserved its exact draft. Sep7 Calendar entry used Review 2026-09-07 and the correct dated authority pointer. Chinese text pasted into that synthetic draft persisted, with no send or review marking. This proves Unicode draft persistence, not OS IME composition.
- Same-binary restart: candidate PID 54337 was quit through Computer Use and restarted as 68215 using the isolated launch helper. Task and Daily Record hashes, both dated drafts, IDs, end semantics and lifecycle were unchanged. The reopened Today range is 17:45–20:30; the point and new pending Task are 05:15. Morning remains independently 08:00–10:00. Past record hash also remained unchanged.
- Final stop/readback: PID 68215 was quit through Computer Use. Both sessions still have zero messages, work entries and runtime thread bindings. Inspect-only fixture logs contain no thread/turn request. Installed executable SHA remains `33941698a758314fc9c24d8095e02c65e10a77d1d2825503ab0fcb953ae0da55`.

Final saved-state SHA-256 values:

| Authority | SHA-256 |
| --- | --- |
| Sep8 Daily Record | `54f4b822c6abebdaa7f5ab46f4e69a8774560fc28a4d1604f89b61d3a987b8e6` |
| Shared Task store | `e0a7c7e82bfb6d45598dbe50865a2e521e20d7219013a3a0051a2906e7d6a932` |
| Sep7 Daily Record | `e71f7fd37065c1ad0b1e273e281c45f1057ac77ac5b982fa1a377fc45af6db5b` |

## Limits and blocked acceptance

- Real Sogou Chinese composition is **unverified**. The user identified Sogou, Shift and Control+Space. Computer Use rejected a modifier-only Shift before posting it (`keyPressIncludedNoNonModifierKeys`). Control+Space followed by real n/i/h/a/o/Space keys still produced ASCII `/nihao `. A second Control+Space paired the toggle, and the exact original draft was restored and reread. No input-source registration or system setting was changed. No Enter was pressed during an unconfirmed composition. System input-menu reads had timed out. Synthetic composition/keycode-229 production-WebKit tests passed separately; they do not substitute for this OS check. PDEX-09 remains blocked.
- Final native exact 1280×720 and 830×758 reference windows were not obtained through the Virtual Mouse resize API. Final production WebKit tests cover both reference frames and the actual chrome-adjusted clients 1280×688/830×726; native final evidence covers default 960×720 and zoomed wide. Original narrow native evidence is retained with its older candidate identity. Exact final native reference-frame acceptance is unverified.
- The final Computer Use API exposes immediate drag but no held trajectory/edge wait/cancel steps. Final browser real-pointer tests cover edge scrolling, resize and cancellation; earlier native held-edge evidence remains explicitly original-candidate evidence. Final native held long-drag acceptance is unverified.
- Native saved-but-readback-failed fault injection was not established safely. Production page tests cover the typed result and explicit authoritative confirmation, while real FileStore/application checks cover writes; neither is labeled as this packaged fault. Genuine native conflict and PermissionDenied recovery did pass.
- The candidate-only synthetic transport inspects config/account/model state and rejects submissions. It uses no real authentication or model. Deterministic edits succeeded without model execution; actual authenticated quota-exhaustion acceptance is unverified.

PDEX-11 therefore remains blocked with these explicit follow-up gates. Feature implementation and the separate Standards/Spec reviews are complete; parent specification remains open. No installation, main merge, push, GitHub ticket mutation or user acceptance is claimed. Raw captures are retained outside Git because global UI can contain unrelated personal content. The isolated candidate/data remain in `.noindex` directories; use `/tmp/pdex-final-launch.py` only, not an ordinary default-profile app launch.

## Later source repair boundary — 2026-10-11

[Independent review repairs](review-repairs-2026-10-11.md) add manual Task original-payload retry identity and Evening language-switch metadata after the frozen native candidate above. Current verified source is `4a0c272dea10f01e2ef99b16c25e1b341837d02b`, integrated via `51f7287`; its automatic checks passed. The previous package remains historical and has not been rebuilt for these fixes. All native limitations above remain blocked; do not label the older binary as current or infer new packaged acceptance.
