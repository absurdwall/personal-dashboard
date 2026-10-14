# PDEX-21 implementation and integration sync — 2026-10-14

## Scope and lineage

- Implemented only the PDEX-21 Today timeline and arrangement interactions on
  `codex/pdex-21-restart`, in
  `/private/tmp/pdex-restart-20261014.noindex/pdex-21`.
- Authorized unimplemented base: `2ef5d0e0fef34f8a6a4ebbb383eb886a7a1699b6`.
- Claim record: `eaec4605883f16158be4945fa8f20874027bc39`.
- Product and focused regression implementation: `2562f4337850216c9c6a0836612b3e84f5684f25`.
- Narrow-viewport pointer-scroll regression setup:
  `4f764147070e320691cece16982deca8d1837ec9`.
- Latest integration tip `c34ca821cfceb7cdf6262129209cb1f2c3702922` was merged
  non-fast-forward as `fbdf8d2c1835244ea9454624c9997710f5876c30`. The merge
  parents are the P21 implementation commit and exact integration tip. It
  retains the incoming PDEX-20, PDEX-22 and PDEX-24 history. The complete ticket
  branch was later merged back into integration as recorded below.

## Verification

- `npm run build` — passed after the integration sync.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs PDEX21_SCREENSHOT_DIR=/tmp/pdex21-postmerge node --test tests/browser/today-axis-task-gestures.mjs` — 10/10 passed, including the nearby Task editor's save/readback and scroll-preservation behavior, close/Escape behavior, pointer selection, Task movement, and 680×560 held-pointer edge scrolling.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node --test tests/browser/today-axis-plan-gestures.mjs` — 8/8 passed, including range duration/precision, end-boundary editing, cancellation and detail-mode edge scrolling at 1280×800.
- `node --test tests/frontend/today-time-axis.test.ts tests/frontend/unified-today-axis.test.ts tests/frontend/startup-interface-language.test.ts` — 24/24 passed. This includes the static WKWebView timeline probe; it is not packaged-App acceptance.
- `cargo test --manifest-path src-tauri/Cargo.toml --test today_shared_tasks_workflow` — 7/7 passed. These application-workflow tests use isolated temporary data and exercise persisted Task schedule readback/reopen semantics. They are separate from the synthetic-IPC browser tests.
- `git diff --check` — passed.

## Merged-tree verification — 2026-10-14

The clean ticket branch `codex/pdex-21-restart` at
`d733c4a71cb8648e43bf0bf25dc58452f1c7ad9a` contains the exact integration tip
`c34ca821cfceb7cdf6262129209cb1f2c3702922`. The complete branch was merged
without conflicts into `codex/dashboard-experience-refinement-restart-20261014`
using non-fast-forward merge `42ca01f42e05e5d9fe81fe08a42e6ff387be9872`.

- `npm run build` — passed.
- `node --test tests/frontend/today-time-axis.test.ts tests/frontend/unified-today-axis.test.ts tests/frontend/startup-interface-language.test.ts` — **24/24 passed**.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs PDEX21_SCREENSHOT_DIR=/tmp/pdex21-postmerge node --test tests/browser/today-axis-task-gestures.mjs` — **10/10 passed**.
- `PLAYWRIGHT_MODULE_PATH=/Users/tingranwang/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs node --test tests/browser/today-axis-plan-gestures.mjs` — **8/8 passed**.
- `cargo test --manifest-path src-tauri/Cargo.toml --test today_shared_tasks_workflow` — **7/7 passed**, covering persisted Task schedule readback and reopen semantics.
- `git diff --check` — passed after the merge and before this tracking update.

The browser suite uses synthetic IPC and does not establish packaged-App
acceptance. No App installation, normal Vault write, `main`, or remote operation
was performed. PDEX-21 remains `in-progress`; PDEX-26 owns packaged acceptance.

## Rendered checks and pointer evidence

The built production `dist` page was rendered in Chromium with the existing
Dashboard shell and a synthetic fixture. Screenshots are at
`/tmp/pdex21-postmerge/`:

| Viewport | Observed Today/time-axis result |
| --- | --- |
| 1280×800 | The default 06:00–24:00 plot, both boundary-entry controls, Task state, and surrounding Dashboard shell fit together. |
| 1280×720 | The same daytime overview fits the available axis height; the lower Tasks/record area continues with ordinary page scrolling. |
| 830×758 | The current shell and Tasks rail remain intact; the main timeline and hour labels stay visible without card overlap. |
| 680×560 | The compact overview remains scrollable with marker text and Task state intact; the zoom control remains a 36×36 control consistent with nearby axis actions. |
| 680×560 detail | Zoom retains the established 80px/hour scale; scrolling to 09:00 exposes a readable Task card with a 60px+ click target. |

I compared only the Today axis region with the selected R prototype at
`prototype/revised.html?page=today&variant=R` and the surrounding production
Dashboard. A prototype render is at `/tmp/pdex21-prototype-today.png`. The
shared lane and expandable lived-day boundaries follow the selected direction.
Production retains the existing Dashboard typography, colors, shell and
restrained control sizing; the prototype's right-side Today task board and
other demo layout are not copied into the App.

At 1280×800 the responsive overview has no vertical overflow inside the axis
surface, so an old plan-gesture assertion expecting `scrollTop > 0` in overview
mode no longer described the intended fit behavior. A pointer trace at that
ticket viewport confirmed edge-scroll in the explicit detail scale; the plan
browser test now zooms first and still asserts positive inner-axis scrolling
while preserving the dragged interval. At 680×560, a held pointer at the inner
bottom edge moved axis `scrollTop` from 343px to 384px (+41px); pressing Escape
removed the selection preview and performed no write.

## Limits

The Playwright page uses synthetic Tauri IPC, and the persistence check exercises
the real Rust application workflow separately. This does not establish
end-to-end persistence through a packaged App window or human installed-App
acceptance. No dependencies were installed, no App was installed, no normal
Vault was written, and no remote or `main` operation was performed. PDEX-21
stays `in-progress`; packaged acceptance remains with PDEX-26.
