# PDEX-19 native Save failure — retained red checkpoint

Date: 2026-10-13. Source `b96b77d74a84309615ab57fdc28055c9ef54b9a3`.
Isolated packaged candidate binary SHA-256
`e6f76c701ce7d3c5d53c59dd91166ba78e725f48304e7be075bfe31db5586215`.
Private manifest, screenshots and synthetic fixture:
`/private/tmp/pdex-refinement-20261013.noindex/candidate-19/`.
This receipt records failure, not acceptance.

The legacy-schema-2 synthetic fixture was copied into a fresh selected Vault and
isolated profile. An added pending Task `synthetic-cancel-18` had date
2026-09-08, start 18:00 and end 18:45. The packaged app used the synthetic clock
2026-09-08 17:05 -04:00. No normal profile or personal Vault was used for the
workflow. The installed app binary remained separate.

Native Computer Use reproduced the following:

- Content-only Save persisted and reread `Minimal native content save.`.
- Creating/assigning `Synthetic Minimal`, then Save without cancellation,
  persisted `After new tag minimal save.` and its tag association.
- Cancel time arrangement, collapse the schedule disclosure, then click Save
  failed twice: the editor displayed date-only draft properties, but the selected
  Vault still contained date 2026-09-08, start 18:00 and end 18:45. No schedule
  change receipt was added. The combined content/priority/new-tag/cancel-time
  sequence also failed to save.
- A successful own write left tag-management controls disabled until Refresh.
  Cancel restored field values but could leave stale priority/tag captions.

`cancel-time-save-red.png` and `tag-controls-disabled-after-write.png` retain the
native observations. Production WebKit minimization subsequently showed invalid
events on explicitly cleared optional native date/time controls, preventing the
form submit event. The separate PDEX-19 repair retains normal validation and
resets the native control type only when explicitly clearing its value. Its DOM
regression is supporting evidence; a rebuilt native candidate must repeat the
original workflow and restart/readback before acceptance.

The isolated process was quit. Reading its AX state after Quit unexpectedly
reopened that temporary bundle without the launch environment; it showed an
unselected Vault, and no business action was taken. That process was immediately
quit without another UI read and its bundle unregistered from Launch Services.
The normal installed process remained running. This does not assert unchanged
normal-profile bytes, for which no preceding byte snapshot was taken.
