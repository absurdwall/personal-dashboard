# 08: Restore FINAL shell and destination presentation

Type: task
Status: resolved
Blocked by: none (verify existing 01–07 implementation is present)

## What to build

Restore the selected FINAL product toolbar, sidebar relationship and Today / Calendar / Habits composition in the installed Mac app. Read ../repair-decisions.md, ../spec.md and ../prototype/README.md first. Scope is confirmed; execute when the user invokes implementation, not during this planning discussion.

## Acceptance criteria

- [ ] Before editing, run the frozen FINAL locally and directly compare it with the current Mac app using matched logical sizes, dates, phases, synthetic content and expansion states. Record deviations with paired images; neither old reports nor AX checks substitute for looking.
- [ ] Restore the full-width product toolbar and shared shell. Preserve its elastic space and extension positions even when unused. Settings provides existing Vault selection; refresh remains on relevant pages. The more-menu may remain a clearly indicated placeholder with no data-changing behavior, as explicitly accepted by the user. Do not substitute the native title bar or restore retired settings.
- [ ] Restore Today hierarchy, timeline, update rail, text scale and reading density; remove unapproved repeated headings and intrusive implementation explanations while preserving the baseline/current/fact distinctions.
- [ ] Restore Habits left padding, heading hierarchy, lightweight summary, recent-day marks and expanded history layout. No narrow squeezed history column, accidental heading wraps or large empty area beside vertically centered row content.
- [ ] Check Calendar structure and selected-day summary against FINAL; historical pages must accurately name the selected day rather than claim it is today.
- [ ] Inventory every intentional difference. Preserve explicitly agreed functional extensions, including both short-record entry points and correction traces, in FINAL's visual language. Unapproved design differences remain open; do not redesign FINAL or copy synthetic goals into real data.
- [ ] Verify all three Today phases, Calendar reviewed/unreviewed/empty dates, Habits collapsed/expanded/detail/edit states, long text and focus at 1180x820, 800x640 and 640x520 logical window sizes. Account for Retina/capture scale explicitly.
- [ ] Run appropriate existing behavior checks and packaged Mac checks; preserve data-writing safeguards and snapshot semantics. No changes to real records, producer skills, Dida365, automations or legacy cleanup.

## Handoff

Use the existing implementation workflow. Keep the frozen prototype unchanged. Record commit and bundle identity, paired evidence and outstanding differences. Do not claim overall 2.0 closure here; ticket 09 owns fresh final review.

## Answer

Implemented on 2026-09-11 from base commit `a38869073a0a389d7107fb79ab659c842459294e`.

### Implementation

- Restored the full-width product toolbar, elastic action space, Vault-selection Settings bridge, explicit unavailable More placeholder, and shared sidebar context for Today, Calendar, and Habits.
- Restored the selected FINAL composition for Today, including the baseline timeline, Daytime fact/current-plan/revision split, update rail, compact reading hierarchy, and Evening content before the bounded update form.
- Restored Calendar selected-day naming and summary context, plus the FINAL Habits summary, recent marks, and expanded-detail layout.
- When a Today phase is revealed, the active panel is re-attached after its hidden state changes. This is a narrow WebKit AX workaround: the packaged window showed the Evening content visually, but its dynamic AX subtree stopped at the tab heading until this change.
- Extended the dashboard-2 packaged driver contract to cover the new shell, phase states, active-surface scrolling, and all three required logical window sizes. The frozen prototype and real vault data were not changed.

### Evidence

- Direct pre-edit comparison used the frozen FINAL Today, Calendar, and Habits references at matched logical sizes and the packaged app's synthetic 2026-09-08 record. Post-edit inspection confirmed the product toolbar and the complete Evening review were visually present; native title-bar chrome and prototype-only notices remain intentionally outside the product surface.
- `npm run build` — passed.
- `npm run test:frontend` — 7 tests passed.
- `cargo test --manifest-path src-tauri/Cargo.toml` — 142 tests passed; doc-tests passed.
- `npm run build:mac` — produced Personal Dashboard 2.0.0. Packaged executable SHA-256: `ac19a7de661193fd74a33c6a374b1ff0b9c485dcc54405fbfc7f1f3445448c46`.
- `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=dashboard-2 PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO_TIMEOUT_SECONDS=300 scripts/acceptance/macos-ipc-workflow.sh` — passed. The isolated scenario preserved source and Habits snapshot hashes while checking Today, Calendar, and Habits at 1180x820, 800x640, and 640x520, including the Evening account, lower summary, selected-day state, expanded habit detail, and correction-entry surfaces.

Implementation commit: final delivery commit reported with the task result below.

Ticket 09 remains responsible for an independent fresh paired visual review and overall 2.0 closure. This ticket does not claim that closure.
