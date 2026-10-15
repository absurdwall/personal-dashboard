# PDEX-SPEC-02 scoped display follow-up

Date: 2026-10-14

## Starting point and scope

The local integration branch is `codex/pdex-visual-acceptance-repairs-20261014`. Its selected base is `927dad645753701b4ce395861b6f25e9039e2d0a`, a descendant of the requested checkpoint `918e7e0d9c4b2c524c429bfd309482e328bc4c91`. The selected base retains the PDEX-22 Calendar preview repair `a5f8b044bb1be0151b19e25b1077074a06620223` and its checkpoint record.

The implementation is limited to the approved PDEX-SPEC-02 display details:

1. Today displays the continuous 04:00–next-day 04:00 lived-day axis at its fixed hour scale, retaining scroll, drag, and cross-midnight behavior.
2. Confirmed facts open a read-only, workspace-anchored popover with complete text, date/time/source, independent scrolling, Close/Escape, and focus return. Facts do not become editable Tasks.
3. Task parent subtrees collapse recursively in active and completed/abandoned history views. Collapse state is view-only and Vault-bound; selected/open descendants, filters, pagination, keyboard operation, focus return, and narrow wrapping remain supported.
4. Task and Calendar schedule controls remain compact, with space after the list label and no change to Content width, schedule semantics, or Save alignment.
5. Task label chips resolve stable tag IDs to current label names.
6. Morning arrangements sort all located entries by their existing display anchor, including broad periods, exact times, and approximate times. Equal anchors remain stable; unlocated entries retain their source order at the end. The original wording, precision, Notes, and source data remain unchanged.

No Habits, Collaboration, schema/data authority, install, normal application, or unrelated presentation changes are included.

## Branches and commit history

| Ticket | Follow-up branch | Ticket-specific commits | Integration commits |
| --- | --- | --- | --- |
| PDEX-19 | `codex/pdex19-row-refinement-followup-20261014` | `9da8545baa96a44d20b94d0925c612b34e98539b` compact schedule controls; `8b166b4bf2f4421f3525e98fda7782985b3a24cd` label readability | `f20f61dbf8bd96a23034405de6134e5b2a1f62cf` |
| PDEX-20 | `codex/pdex20-tree-collapse-followup-20261014` | `f3a7715a44787e2b90b33946a7888766f12568b5` active subtree folding; `c3c5c93ed99d06f09e283e22ac3de7eed8c15ac7` history subtree folding; `f2b0e27a0b9a4cb750e5c8752efa45f235a9dc41` focus scoping | `d063fe925b185b91ff95c94c6ed4bbd88a2c7656`, `7305dc2d587cc073b89a799479512e602d911c82`; current focus completion `708e74de609641c8de56258efbf54ddd1b86ce1a` |
| PDEX-21 | `codex/pdex21-review-followup-20261014` | `68acb966481c19261e7b6dbf582d8065df6a61ec` Today display; `598e64cb4d31caccbc3f6a392e8472a9b29263ed` duplicate-label time association; `ccbacefff5b11cbe321a19eb1311e41f62c08ad7` broad-period Morning sort; `30aa5b92fc6d6d344147c6ab83fd94283e4565da` close the fact popup when leaving Daytime | `58d9dec9b975b731c132de718210a904e4e1f6ce`, `364c35c51f51d6bd82f67449666e1e6665fc2b7c`; follow-ups are direct integration commits |
| PDEX-22 | No new follow-up branch in this round | Inherited Calendar source repair `a5f8b044bb1be0151b19e25b1077074a06620223` | Included in base checkpoint `927dad645753701b4ce395861b6f25e9039e2d0a` |

The PDEX-20 worker branch also contains merge commit `a3abde757e2056ce40138745a3eafabe05156965`, bringing the then-current integration source into that branch. The integration branch preserves the complete feature and merge graph without rebasing or rewriting. Product source for the candidate is commit `30aa5b92fc6d6d344147c6ab83fd94283e4565da`; the evidence/map commit that follows changes records only.

## Verification and reviews

- Task tree, Task surface, and Task presentation checks: 52/52 passed.
- Compact Task/Calendar controls, tag labels, and Calendar preview editor checks: 3/3 passed.
- Unified Today axis checks: 14/14 passed, including broad-anchor Morning ordering and closing the fact popup on a Daytime-to-Morning phase change without restoring focus to its hidden opener.
- Lived-day axis and fact popover source checks: 2/2 passed.
- Lived-day rendering checks: 5/5 passed.
- Chinese/English fact popover copy check: 1/1 passed.
- `npm run build` passed; `git diff --check` passed.
- `npm run build` and `git diff --check` passed after the final source changes. The isolated Tauri app was rebuilt from the final product-source commit below. Independent Standards and Spec reviews confirmed the broad-period sort and phase-switch popup fixes; their remaining check is the native phase-switch and Calendar compact-layout pass on this candidate.

Earlier broad runs in this work session also exposed unrelated test-harness limitations: three lived-day note-refresh checks use a fake form object without `querySelector`, and one existing `today-time-axis.test.ts` assertion expects `aria-controls="today-unlocated-time-region"` while the current unchanged markup uses `today-side-region`. The directly scoped lived-day, full-axis, focus, and popover checks listed above pass.

## Isolated review candidate

- App: `/Users/tingranwang/Documents/Codex/Projectless task folder/2026-10-14/new-chat/outputs/Personal Dashboard Follow-up.noindex/Personal Dashboard PDEX Follow-up Candidate.app`
- Bundle identifier: `com.tortillaflat.personal-dashboard.review.pdex02followup20261014`
- Source commit: `30aa5b92fc6d6d344147c6ab83fd94283e4565da`
- Executable SHA-256: `047f6007e54ce0e89fb98b400aa0f81e3e8d3935ce23206188f81cbca852efda`
- Ad-hoc signature verification: valid on disk; designated requirement satisfied.
- `LSEnvironment` uses the isolated profile at `/private/tmp/pdex-display-followup-20261014.noindex/runtime/Profile`, synthetic Vault at `/private/tmp/pdex-display-followup-20261014.noindex/runtime/Synthetic Vault`, no-baseline file under that profile, fixed review clock `1788891000000`, and UTC offset `-240` minutes.
- The only profile content copied for this candidate was `appearance.json` with the lilac accent; source and destination SHA-256 are both `2a2e50567d8aea3946bf1c53cc6031c4648dbb45ff3231c3a5896ebb0c90bc84`. Independent review confirmed the synthetic Tasks and Notes bytes remained unchanged; Task JSON SHA-256 is `9ab1fd8628e7e5944f67df638ee04cb7e98c9e65710dbed8219e2f00b983a037` and the dated Notes Markdown SHA-256 is `01d486cda0794cb33138ee8c2b71e714cb20ece227a32713a32da5307dc23977`.
- This durable candidate has not been launched. After unregistering the previous temporary path, the Launch Services dump resolves this bundle identifier to the durable output path; the previous temporary path no longer appears. Human visual and packaged save/readback acceptance remain open under PDEX-26.

No issue lifecycle states were changed: PDEX-19–22 remain in-progress; PDEX-SPEC-02 and PDEX-26 remain open. No remote Git operation, PR, main merge, normal app install, real Vault/profile edit, or candidate launch occurred.
