# Dashboard experience follow-up — Tasks creation and Today unlocated panel

ID: PDEX-FOLLOWUP-01
Type: spec
Triage: ready-for-agent
Status: open
Lifecycle: in-progress
Date: 2026-10-11
Base: d4f23999e6b82fcadc4533b04004da1113ee8f71
Working branch: codex/dashboard-experience-integration
Canonical tracker: [local map](map.md)
Authorization: direct user message 01a12986-5de8-7f91-a3b5-a9bca292f4fe in review chat 01a128ff-8865-7493-9698-cc48c19d7939.

Previous PDEX-01–11 and PDEX-SPEC-01 acceptance remains complete. This is an independent approved follow-up, not a reopened earlier acceptance. Reuse accepted prototype R `quickAdd`/`openTaskDialog`, current production application and Task source; do not use prototype memory as persistence evidence.

## Tasks creation — PDEX-12

Tasks has a task-name quick input at the top of its visible list. Enter or Add creates through real `create_task`; only name is required. Successful authoritative confirmation clears it and returns focus for the next name. Current actual list is the default; aggregate scopes fall back to Inbox. Tasks Today scope supplies the current lived date so the new item is visible; no inferred time. Existing Task date/list semantics apply elsewhere.

New Task opens a viewport-local modal with automatic name focus, optional content/list/date/time and current Task model capabilities, without scrolling to a bottom form. Cancel/close/Escape create nothing and restore focus. Name whitespace is rejected, composition-confirmation Enter does not submit. Quick input and modal share real targetBinding/revision/stable-id create/readback/recovery semantics; failure or unknown response retains the original draft/payload/id for explicit verification/retry and does not duplicate a Task. Keep details, completion, list archive/delete and Today axis selection entry behavior intact. No new store/dependency.

## Today unlocated panel — PDEX-13

Add an explicit toolbar show/hide control with count/discoverability for Items without a precise time. Wide auto layout shows the existing content beside the axis. At a medium/narrow width, this panel collapses before existing left navigation does, releasing timeline/records width. Narrow manual expansion uses a drawer/overlay rather than squeezing the axis again; close/Escape return focus. Keep full original content, precision/source labels and controls; hiding does not delete data.

Simple transient state: automatic wide-visible/narrow-collapsed default, manual show/hide override adapted to the available presentation. Resize/navigation must not write business data or disrupt timeline save/selection. Limit CSS/DOM to Today; Calendar, left navigation and global layout are unchanged. Choose a local breakpoint based on measured actual medium-width geometry, not a source-text CSS assertion or an extremely narrow window hiding all sidebars.

## Agreed verification and release boundaries

Reuse the approved Q4 seams: production macOS WebKit DOM/input and Tauri public command responses; existing real Rust synthetic-Vault Task storage/create/retry/revision tests for persistence. Test one vertical behavior slice red → green at a time, preserving focused logs/source identities. Exercise name-only creation, list/Today defaults, composition, modal focus/cancel, failure/readback/duplicate recovery and existing entry compatibility. For Today verify actual axis/panel/navigation geometry at wide and medium narrow sizes, manual drawer/close/focus, count/source retention, resize with no create/edit command.

Create an isolated .noindex packaged candidate with frozen source/archive/executable/bundle/config/profile/Vault/clock identities. Only synthetic writes. Notify the authorized independent review chat with fixed base/head/diff/logs/candidate hashes and repair any findings. Installation is already authorized **after explicit reviewer satisfaction**, with fresh current real-profile/Vault protection and recoverable old App backup; do not replace the daily installation before review release. Human installed-App acceptance remains a later separate outcome. No GitHub query/publication, main merge, additional dependencies or Calendar/navigation changes.


## Current follow-up installation checkpoint — 2026-10-11

PDEX-12/13 final product `2c6b8aa` is independently reviewed with zero unresolved Standards/Spec findings, expressly released and installed with normal production config. [Installation and preservation](evidence/followup-local-install-2026-10-11.md) and [final isolated native receipt](evidence/followup-native-final-2026-10-11.json) retain source/package identity, qualified checks and fresh recovery backups. Full history and unrelated changes are preserved. Follow-up spec remains open and PDEX-12/13 in-progress pending direct human acceptance; original eleven tickets and original parent remain resolved. No GitHub/main operation.
