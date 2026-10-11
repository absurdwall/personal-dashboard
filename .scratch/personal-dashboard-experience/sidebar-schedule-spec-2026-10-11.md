# Sidebar docking and compact Task schedule — revised human requirement

ID: PDEX-FOLLOWUP-02
Type: spec
Status: open
Lifecycle: in-progress
Triage: ready-for-agent
Date: 2026-10-11
Base: fc4c8185a9b7e029a945662754a2131b21bfb3d8
Working branch: codex/dashboard-experience-integration
Authorization: direct user message 01a129b1-8fa7-7033-a532-52fc86d1056b, review chat 01a128ff-8865-7493-9698-cc48c19d7939.

The human corrected the previous right-sidebar interpretation. Original PDEX-01–11/PDEX-SPEC-01 remain accepted. PDEX-12/13/followup01 implementation, source-qualified tests, review and installation remain historical; a drawer/modal sidebar does not satisfy this revised requirement. New requirements are tracked below without erasing prior evidence.

## PDEX-14 — existing sidebars toggle in their layout position

Today daytime untimed items use an discoverable compact sidebar icon control with tooltip, accessible name, truthful expanded state and visible count. Medium/narrow auto collapses before main navigation, manual show restores its original docked layout position at every width; never turn it into a floating/modal drawer. Hiding retains original source/content/detail controls and reading/expanded-detail state; showing participates in page geometry. Keep trigger reachable, focus sensible and no business writes on toggles/resize/navigation. Automatic presentation uses current scoped1100 breakpoint unless measured geometry justifies adjustment; manual intent remains stable during resizing of the same selected date/phase and resets only on context change.

Global Today/Tasks/Calendar/Habits/Collaboration primary navigation receives a compact Toggle Sidebar icon, reachable while collapsed and across all destinations. Collapsing releases its grid column; restoring returns original destination links on the side. Do not migrate navigation to a top strip. At minimum supported640px the restored navigation must remain a side column and content remain usable, with no accidental page overflow. Maintain navigation state across destination switches in this app session; no durable business preference/store needed.

Calendar archaeology: existing #calendar-summary contains dated record summary, related Tasks and current controls. At <=1000px current calendar-frame becomes one column and summary is moved rather than hidden. Add an accessible dock/collapse control only to this existing summary; expanded remains in normal flow (side-by-side where viable, below at narrow width), never overlay. Preserve selected date/content/forms/drafts and do not change month/day/overlap/time-edit/storage behavior. Tasks list sidebar is not a third sidebar redesign.

## PDEX-15 — one-line name + compact schedule + Add

Tasks top quick entry and Today Tasks creation have one visible row containing name, small schedule icon/button and Add. Schedule opens a temporary picker for today/tomorrow/specific date and optional time; date/time fields are not permanently spread across a large form. Schedule popover is allowed; full optional content/list/detail capabilities use existing New Task/details interface. Only name required. Today defaults to currently selected lived day, without inferred time. Tasks currently defaults to no date except existing Today scope; optional human preference pending in reviewer chat may change default before final release.

Use actual selected list/current scope and stable Task create/revision/binding/id/readback/recovery. Preserve continuous focus on confirmed save, composition/blank/pending protection, exact raw draft/payload/id on unknown result, guarded readback/retry and explicit ended-attempt records. Picker cancel/Escape must not save or erase drafts, and changes must be reflected in authoritative saved date/time values. Keep Today axis selection creation and Tasks full modal/detail working; do not remove optional detail capability.

## Verification and release

Reuse previously approved Q4 seams: actual production DOM/public input, WebKit actual geometry/focus, existing real synthetic Task create/revision/readback persistence. TDD red/green at those seams; no source-string or prototype-memory pass substitutes. Evidence covers640/830/1000/1280 layout, restored dock vs collapsed width, all destination main-navigation controls, no sidebar dialogs, keyboard/focus/content/detail/scroll retention, and compact-row schedule date/time public payload plus actual synthetic native saved-file readback. Historical tests/source receipts remain qualified rather than inferred current.

No new dependency/service or GitHub/main operation. Independent two-axis review and explicit reviewer satisfaction precede a fresh frozen package and user-authorized normal App replacement. Fresh App/profile/life authority protection before replacement; original user data unchanged by tests. Native GUI root exclusively uses Computer Use Virtual Mouse. Final human acceptance remains separate and pending.
