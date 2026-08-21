# 02 — Day-first change-time picker

**What to build:** When the user changes a due workout's time, the user first chooses the weekday or date and then chooses a time available on that day. The final choice remains previewable and conflict-confirmable, while the existing moved-source, independent-destination, persistence, and reminder semantics remain intact.

**Blocked by:** None — can start immediately.

**Status:** resolved

- [x] The change-time editor presents a separate weekday/date control followed by a separate time control; it does not present one flat list of combined weekday-and-time options.
- [x] The weekday/date choices contain only eligible future days, show the relevant calendar date, and retain the prototype's suggested recovery-day behavior.
- [x] The time choices update for the selected day, remain click-only, and show the final selected weekday/date and time before saving.
- [x] An occupied target still shows a visible conflict warning and requires explicit confirmation; a non-conflicting target saves directly through the existing exception semantics.
- [x] After saving, the original occurrence remains moved and non-recordable, the destination remains an independent occurrence, and relaunch preserves the result.

## Answer

Implemented the day/date-first change-time flow across the Rust application view and the Mac workspace editor. Eligible future dates now carry calendar labels and nested day-specific time choices; Saturday and Sunday retain the suggested recovery-time behavior. Preview, conflict confirmation, moved-source/destination semantics, reminder reconciliation, and relaunch persistence continue to use the existing application commands.

Verification: `npm run build`, `cargo fmt --manifest-path src-tauri/Cargo.toml -- --check`, full `cargo test --manifest-path src-tauri/Cargo.toml` (73 tests), `git diff --check`, release app build, and Accessibility-driver compilation passed. The packaged exception scenario reached and exposed the new date-first controls, but native WebKit popup selection remained flaky in this desktop session; the final packaged proof remains owned by ticket 04.
