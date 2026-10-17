# PDEX-18 final review and protected normal installation — 2026-10-11

Current production source: `d4e2b54e30ae4643a355c66e0cd472c6000b1626`. Normal 4.0.7 App installed at `/Applications/Personal Dashboard.app` on `2026-10-11T11:53:09.990692+00:00`. **Direct human acceptance remains pending.** [Sanitized receipt](pdex18-final-review-install-2026-10-11.json) records package, source, preservation and observation facts; full private receipts remain outside Git.

## Findings repaired before this checkpoint

The human-rejected historical releases remain in history. The corrected source includes readable Task date controls, Today’s icon-only aside toggle, a Calendar summary that stays on the right, shared page heading/frame spacing, Sessions inset, and editable local text before a session exists. Explicit creation, stable creation identity, retained drafts and application lived-date lookup remain preserved.

Independent native inspection found two further defects after source checks passed. `723ef47` still had a 640px global toolbar collision; `eb0f497` corrected the toolbar track but the normal App’s existing long session then exposed clipped Send/microphone/help controls. `d4e2b54` preserves a useful scrollable conversation area, bounds complete status/tool notices into keyboard-reachable scroll areas, reserves composer space, and provides scrolling for expanded input content. Neither intermediate checkpoint is treated as final acceptance.

## Review and checks

Standards: zero documented breaches and zero actionable heuristic findings. Spec: zero unresolved findings. The independent reviews covered the frozen `723ef47`, `eb0f497` and `d4e2b54` deltas. Focused frontend checks include the prior 90-case run, 21 docked-sidebar cases including individual toolbar controls at 640/681/700px, and the final 11-case Collaboration layout suite, independently rerun. Frontend and normal macOS builds pass; diff checks are clean. Four voice-controller checks and three persisted creation-identity Rust checks remain supporting evidence for unchanged code. The older full frontend result (450/464, fourteen pre-existing fixture/binding failures) is retained as historical supporting evidence, not claimed as a green final full-suite run.

The new layout stress matrix covers 960×720 English, 830×758 Chinese with help/input expansion, 640×720 English, and 640×520 Chinese with help/input expansion. It uses translated production form labels and checks pointer hits, keyboard focus, retained notice text, scrolling and useful message height. This is a four-case matrix, not a claim about every combination.

## Actual native inspection

The isolated native `eb0f497` copy reproduced the same populated-session clipping as the normal App. The final normal build was copied, assigned an isolated identifier and re-signed, then used with that exact persisted synthetic fixture. English/Chinese notices, saved messages and retained Unicode draft remain intact; Message, Send, microphone and expanded help are reachable without permanent pane clipping. Smaller native windows or expanded details may require the existing pane or workspace scroll. No model turn, audio request or personal data write was used for this fixture.

Earlier native checks verified the five/six-week Calendar, right-hand summary and collapse/restore at 640px, and seven-task lower panel/add-form reachability. The final Collaboration delta leaves Calendar and toolbar code unchanged. The earlier real native controlled 01:30 clock verifies the 04:00 lived-date contract; it is a controlled clock, not a naturally observed overnight run. IME/quota waivers remain accepted.

After final installation, the reviewer opened the normal App, read the existing session, confirmed visible Send/microphone controls and clicked Message to confirm focus. Personal backdrop/theme, history and all existing saved messages/drafts/operations/tool contracts remain preserved. No normal model message was sent and no microphone was started.

## Protected installation

A fresh verified private backup contains the then-current normal App, full normal profile, and selected Vault `life/` and `.obsidian/` authority. It is a scoped backup, not a whole-Vault backup. The normal production configuration has no overrides; the full source revision is embedded in the signed binary. Binary SHA-256: `f5c1631e6d05b77fe1e2a2ba305b59fa368b60897ae410965682be5dbfe41897`.

Atomic replacement and readback confirm the installed bundle matches the verified package, strict signing succeeds, and profile/authority bytes were unchanged before launch. After normal launch, every authority byte remains unchanged and all existing Collaboration content is unchanged. App runtime logs/cache/SQLite housekeeping may update the profile; it is not claimed byte-identical after launch. Retired App copies and test bundles stay in private `.noindex` directories, and the owned isolated candidate was quit/unregistered. The normal App is left open on Collaboration for human acceptance. No GitHub/main operation, new dependency or service was introduced.

## Management confirmation

The installed `tortilla-flat-management` helper connected/discovered the existing bound `product-personal-dashboard`, submitted the progress checkpoint through its typed operation, and reread the canonical target. Registry `b32d5adf2a69787f`, summary `6199eb5763b06fb2`: confirmed. User-owned lifecycle/focus/review/source identity fields remain unchanged. Coverage is explicitly partial: five current registered sources are evidence, while the unavailable GitHub source and partially malformed legacy Collaboration/experience Markdown sources remain uncovered. No new Registry or remote query was created. Human acceptance remains pending.
