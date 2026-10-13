# PDEX-21 implementation evidence — 2026-10-13

Status: implementation complete locally; integration review and actual packaged acceptance pending.

Branch: `codex/pdex-21-refinement`. Worktree: `/private/tmp/pdex21-refinement.noindex`.
Authorized integration base: `0230a35b0933a0e092fa9175e70932c3c27a6054` (the full integration history descends from `918e7e0d9c4b2c524c429bfd309482e328bc4c91`). Before work, merged the claim/integration history as `df54d86e178a5dab2f03c463ed1b24ccf07763c9`. Local Git only; hooks enabled; canonical existing node_modules reused without installation.

Implementation commits:

- `c7390d810874456fcf86e65881498cd901670442`: available-height overview, fine zoom, full lived-day disclosures/counts, readable collision geometry, nearby shared Task editor, original broad expression, broad pointer moves, qualified recovery, bound arrangement cancellation and tests.
- `f65c8df7dfe4b91fa7dec089c49df5d760414e38`: full-history merge of integration through `ca266b390cadf47a021ff3e743a2113a5abaff7b`, including PDEX-20 relationships/folders, PDEX-25 details and the shared PDEX-19 editor fixes. No merge conflicts.
- `d2ef2a209b8307a212e4fe2b26c7fb5178445a6b`: keep a deliberate time retry distinct from an earlier failed cancellation; remove the unused precise-only helper.

## Scope and public boundaries

The default large-window axis fits 06:00–24:00 using the actual reading region's available height. Narrow windows and Fine zoom retain the readable scrollable hour scale. Existing early/late controls advertise counts and expand the same 04:00–next-day04:00 lived day. Zoom/disclosure/layout changes never invoke a write.

Task cards open a nearby HTML dialog containing the existing refined `taskEditor` and shared `updateTask` controller. It retains Content-first properties, tags, priority, menus and schedule semantics. The dialog captures the displayed Task revision; saves use authoritative returned Task data. Background outer/axis positions are restored on close; selected Task bottom detail duplicates are removed, while the ordinary Today task list, facts and unlocated reading areas remain.

Reliable broad/approximate plan cards use the existing revision-bound `edit_plan_time` application service and gesture controller. An untouched “下午” retains that exact expression despite its display anchor 13:00. A deliberate drag to16:00 sends an approximate point, with no end or manufactured duration. Exact range movement/end resize and Task range movement keep their respective duration contracts. Existing pointer threshold, blank range creation, edge scrolling and Escape are retained. Unsafe plan cards expose full original text and the existing qualification in a nearby readable dialog.

`cancel_plan_entry` is a direct manual application/IPC entry, using the same selected-Vault/revision, receipt and readback machinery. It removes only the complete uniquely bound Current arrangement source span, retaining its raw content in a cancellation audit. It does not match by title or position, touch Morning baseline, edit facts, or delete an independent Task. A saved-but-unread cancellation remains unconfirmed with a reread path.

No changes to Morning prose, Evening entry, fact correction, ordinary task placement, appearance theme, dependencies, external services, or installation.

## TDD and observed checks

Pre-agreed seams from the spec: real application persistence/readback/new instance and actual shipped production DOM/layout/controller behavior. IPC replacement is confined to the UI test boundary; UI fixtures are not evidence of actual Tauri persistence.

Observed red → green slices:

1. Production Chrome overview red: plot bottom2012 versus visible surface bottom945 at1280×720; broad labels showed “下午 · 约13:00”. Height adaptation/original-expression implementation made both1280×800 and720 cases green.
2. Broad card click/drag red: broad cards lacked an editable source marker. Enabling only reliably bound broad markers made the four-size real Chrome pointer matrix green. Narrow drags use real mouse-wheel scrolling while held; edge scrolling remains tested separately.
3. Nearby Task editor red: clicking selected Task did not open the nearby dialog, instead following the lower detail route. Reusing the shared compact editor made Content Save and unchanged background position green.
4. Application cancellation red: `cancel_plan_entry` did not exist. The bounded application operation made real document write/read and new-instance isolation/stale-revision checks green.
5. Cancellation UI red: no selected-source cancellation button. The qualified controller made selected planId/revision cancellation and authoritative readback green.
6. The old plan-editor DOM tests selected detached lower plan summaries. Their public selectors now follow the rendered card/unlocated entry. The untouched broad label expectations now preserve original expression rather than expecting anchor13 to become a time. The unchanged untimed-source retry behavior was restored using its existing explicit editor boundary.

Checks on the merged implementation source:

- `npm run build`: PASS.
- `node --test tests/frontend/today-refinement.test.ts tests/frontend/plan-time-editor.test.ts`: 29/29 PASS. New Today suite:18; adapted existing plan-time WebKit suite:11.
- Four requested sizes:1280×800,1280×720,830×758,680×560. Real installed-Chrome pointer tests cover broad click/no-write→drag16:00→approximate readback, with no extra detail popup. Native WKWebView production DOM checks cover bounded, selectable32px cards and no render writes at all four sizes. These WK checks use evaluated production DOM, not native desktop pointer injection.
- Additional real Chrome pointer scenarios: exact range movement preserving length, exact end-only resize, Task range movement through Task storage only with metadata retained,3px click versus drag, Escape restoration, blank range creation/no-write until Save, fine-scale edge scroll/Escape, and revision-failure original placement/proposed draft recovery.
- `cargo test --manifest-path src-tauri/Cargo.toml --test daily_plan_workflow --test today_workflow --test today_shared_tasks_workflow`, with canonical existing Cargo target:79/79 PASS (17+54+8). The new real application test reads “下午” and “约14:00” without changing bytes, moves afternoon to approx16:00, verifies a fresh application, cancels the bound item, verifies another fresh application and independent baseline/facts/Tasks, and rejects the old revision.
- `git diff --check`: PASS.

Local logs retained outside the repository: `/private/tmp/pdex21-handoff-frontend.log`, `/private/tmp/pdex21-final-rust.log`. Earlier red/output diagnostics are retained in this thread/tool history.

One untouched baseline source-string assertion in `today-time-axis.test.ts` still expects the unlocated shortcut to control the old inner region rather than the existing whole side region. The shortcut markup is unchanged from the branch base; the10 other checks in that file passed. This assertion is not used as layout acceptance, and no unrelated source-string harness repair is included.

## Remaining integration acceptance

Root owns real packaged Tauri pointer/resize/drag/save/document/readback/relaunch acceptance and the separate standards/spec review. The four-size WK/Chrome results above do not substitute for that acceptance or imply normal installed-App acceptance. Ticket stays acceptance-pending, with unchecked acceptance boxes available for final packaged evidence. This worktree/branch and complete commit ancestry must be retained through integration.
