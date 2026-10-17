# Issue #66 frontend regression repair — 2026-10-17

Canonical work item: [GitHub #66](https://github.com/absurdwall/personal-dashboard/issues/66).
Implementation is complete locally; product publication/integration remains with the owning chat.

## Source and scope

- Clean start: `1bbdd1f2d726abeeb5252d237418f3c6248b17cd`, on the retained InitialPlan repair lineage. No reset to remote main.
- Branch: `codex/frontend-regression-66-20261017`.
- Implementation: `a2a09b9f18c3623dc22a7947bc1e2ec94455e39e`.
- Additional long-date regression: `047f877a8a1c3d02c8ea8b980c592286dc1fc3c8`.
- Validated source: **`047f877a8a1c3d02c8ea8b980c592286dc1fc3c8`**. The later report commit adds evidence only. Exact frontend/test/build-input Git object identities and validation-log hashes are in [the disposition record](issue-66-dispositions.json).

Production changes are limited to CSS for the three confirmed layout defects. No new dependency, service, configuration, interaction feature or backend change. The original 46-record migration manifest and PDEX/PDCR identities remain untouched; PDCR-03/12 stay closed-deferred and PDCR-11 closed-retired.

## All 40 original failures

[The machine-readable disposition record](issue-66-dispositions.json) maps **each original name/file** to its current passing test and specific repair. No test was deleted, skipped or marked todo to achieve green.

| Original category | Count | Disposition |
| --- | ---: | --- |
| Incomplete harness | 19 | Supply missing VM state, presentation boundaries and realistic DOM behavior; preserve business assertions. |
| Obsolete UI path | 12 | Ten plan cases use current marker/modal; startup-language uses the live marker/modal; the untimed case checks the current read-only summary and separately preserves legacy controller recovery. |
| Invalid/outdated assertion | 6 | Current help containment, required class tokens, heading/composer clearance, actual rail/control containment, and composited text contrast. |
| Layout scenario | 3 | Reproduced on complete current page/controller and repaired narrowly, with before/after evidence. |

The corrected Vault error boundary throws unexpected errors. This exposed more incomplete reset dependencies beneath the initial six failures, including dialog references and draft/attempt maps. Task history likewise exposed filter/tree/quick-create dependencies and row dataset/style requirements; note rendering exposed the current timeline presentation boundary. These were fixture omissions, not additional product defects. Subsequent behavior assertions now execute and pass, including late responses across Vault generations, failed draft persistence, note-save preservation, history pagination, writable-state changes and rollover protection.

The plan suite retains precise/approximate conversion, required range end, no fabricated duration, actual edit command arguments, saved readback, fresh-page reopen, uncertain-save duplicate suppression, explicit reread/retry with fresh revision/operation identity, source conflict rejection and diagnostic language/field preservation. Broad-period labels now explicitly reject invented `Around 13:00` text. Current untimed summaries deliberately offer no editor button; the legacy untimed editor-recovery check uses a bridge appended only to a temporary test copy of the complete module. It is controller evidence, not a claim of an untimed click interaction.

## Confirmed layout repairs

[Complete before/after geometry](issue-66-layout-evidence.json) uses synthetic IPC responses and the actual current page, controller and CSS.

- **Collaboration, 640×756:** a horizontal `21rem` flex basis became a vertical header height when the header switched to a column. Reset only the Collaboration intro basis at that breakpoint. The composer changed from **y=719.19–874.61** (outside a 756px viewport) to **y=590.78–746.20**. Textarea, microphone and Send all pass pointer hit tests. Expanded five-session history remains above the composer, scrolls internally and has 190px client height; message scrolling does not move the composer.
- **Today, 640px restored sidebar:** the task-name field was **14px** wide. Allow its compact row to wrap, reserve a **120px minimum flex basis**, and reduce column gap enough to retain date/submit alignment. The name now measures **167px**; schedule and submit share the following row. The obsolete requirement that all three controls always share one row is replaced with stronger readable-width, non-overlap and action-alignment checks.
- **Tasks, 640px:** the old ID rule capped the label and overrode the general schedule-button sizing. Give that existing button 126–184px and remove its label cap. Wait for actual controller readiness/clock rather than manually unhiding/enabling a synthetic form. Today scheduling measures 126px with 76/76px label client/scroll width. Long future date `Thu, Aug 13 · 09:30` measures **143.69px**, with **108/108px** label client/scroll width and **136.55px** remaining task-name width. No horizontal overflow; complete date/time also remain in matching title/aria text.

## Validation

- Initial targeted red: **90 tests, 71 pass / 19 fail / 0 skip**, reproducing all 19 harness failures on the clean base.
- Native targeted red: original help/contrast/Collaboration/two quick-schedule cases and obsolete plan bootstrap fail before repair. Complete-controller layout probes independently reproduce all three product defects before CSS changes.
- Focused repair checks pass, including all eleven plan scenarios, startup language, help/contrast, note/editor/history and three layouts. The additional future-date assertion passes.
- **`npm run build`: pass** on the validated commit.
- **Full `npm run test:frontend`: 537 pass / 0 fail / 0 skip / 0 cancelled / 0 todo** on the validated commit. Original suite count was 536; the extra test is the complete-controller Collaboration layout regression. Original 40 names are individually matched to passing output in the disposition record.
- Node v24.12.0; Apple Swift 6.3.3. WebKit commands alone set `SDKROOT=/Applications/Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk`. Global toolchain settings were not changed. Existing non-macOS WebKit skip guards remain intact; this macOS run skipped none.
- Frontend/CSS is the only production seam changed; adjacent frontend layout, task-tree, gesture, responsive-header and semantic tests are included in the full suite. No Rust behavior changed or Rust-suite claim made.

Exact final logs: `/private/tmp/pd-66-047f877-build.log` and `/private/tmp/pd-66-047f877-frontend.log`; their hashes, counts, source objects and all-40 mapping are durable in the JSON records. Earlier diagnostic logs are supporting red/green evidence, not the final source identity.

## Standards

Independent Standards agent reviewed `git diff 1bbdd1f2...a2a09b9` across all 17 changed files against parent/project AGENTS, CONTEXT, domain/tracker/triage guidance, ADRs 0001–0006 and the code-review smell baseline. **0 documented-standard violations; 0 actionable heuristic findings.** Its addendum for `a2a09b9..047f877` found **0 new findings**.

## Spec

Independent Spec agent fetched the complete current #66 body/state/comments/labels and reviewed `1bbdd1f2...047f877`. **0 findings.** It confirmed retained save/readback/precision/retry/conflict/binding protection, bounded CSS changes and current-page coverage. Its suggested long future-date coverage was added and passed. Its remaining evidence gates—exact-source final suite, all-40 mapping and this source-bound report—are supplied here.

## Handoff and limitations

This removes #66's frontend verification blocker and permits the owning chat to resume preparation/review of its existing **three-PR publication plan**, with these commits and records included. It does not itself establish PR merge readiness beyond this ticket; the owning chat still performs publication-base, history, remote and normal PR checks.

No product push, PR creation/merge, branch deletion, App build/replacement/installation, personal Vault/profile mutation, Dida test, microphone capture or retired acceptance-matrix run occurred. WebKit tests use synthetic data and substituted native IPC; these results are not new installed-App or backend persistence acceptance.

The installed `tortilla-flat-management` helper v1.0.3 confirmed the bound canonical Project `product-personal-dashboard` and existing GitHub source. Reconcile inspection was read-only (`action: null`). It reported pre-existing `summary-needs-reconciliation` and `source-source-personal-dashboard-codex-collaboration-malformed` gaps; neither is a frontend blocker or repaired in this ticket. The Registry/source structure was not changed, and no summary update is claimed.
