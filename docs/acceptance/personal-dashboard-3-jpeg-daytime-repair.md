# 3.0 JPG import and Daytime rail repair — 2026-09-14

08 and 09 are resolved in the current tracker. Their completed Drive evidence is separate from these subsequent user-reported defects; this repair does not rerun or modify Drive acceptance.

## Findings and changes

- A valid JPEG followed by CR/LF reproduced the reported unsupported-format message through AppearanceApplication. The native ImageIO decoder accepted the same bytes. Format detection had incorrectly required EOI to be the last two bytes of the entire file. JPEG classification now recognizes its signature and leaves image validity to the existing native decoder. Size limits and decoding rejection remain in place. This proves and repairs one concrete cause of the user's reported message; the user's original image was not supplied and was not inspected.
- The shipped Daytime markup nested the notes rail inside the left reading column, while tasks occupied a separate right column. A failing semantic-containment test captured the mismatch. Notes now share the right rail below tasks, the timeline uses the full left column, and notes are visible only in Daytime. Existing event bindings and dated-write behavior remain intact.

## Verification

- Red before fixes: appearance_workflow JPEG-with-trailing-bytes test returned the unsupported-format error; daytime-rail-layout test failed the shared-right-column assertion.
- Green after fixes: frontend suite 61/61; Rust suite 209/209; npm run check; git diff --check.
- Native decoder regression accepts the valid JPEG with trailing bytes and rejects a truncated header.
- Built a packaged Mac app and launched a separately identified copy with an isolated profile and synthetic Vault, fixed at 2026-09-08. No personal records were edited.
- CUA screenshot at 960 × 720 confirmed left timeline and right tasks followed by Daily note; saving “Repair acceptance note” succeeded and appeared in that day's records. Morning after restart did not expose the Daytime rail.
- Native file chooser imported an uppercase .JPG fixture containing trailing bytes. Settings reported the background saved; quitting and relaunching the isolated app retained the saved background state.
- Final build incorporates the updated accessible rail label. The installed daily-use app has not been replaced. No dependencies, skill changes, Dida365 or automation runs were introduced.

The JPEG fixture is a synthetic 1-pixel image generated from the existing PNG test fixture. It is not a user photograph. The repaired source and candidate bundle are ready for user-image verification; do not generalize the synthetic fixture result to every image file carrying a .jpg extension.
