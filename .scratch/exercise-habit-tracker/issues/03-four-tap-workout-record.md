# 03 — Record a workout in four taps

**What to build:** Close the loop after gym departure with a typing-free workout record that captures activity, approximate duration, and perceived effort, then reflects qualifying progress on the dashboard.

**Type:** task

**Blocked by:** 02 — Complete departure response and one follow-up.

**Status:** resolved

- [x] Ninety minutes after `Leaving for gym`, the user receives one `Record workout` prompt.
- [x] Completing a workout requires exactly four selections in order: Done, activity, duration, and perceived effort.
- [x] Activity choices are exactly Elliptical, Weight training, and Other exercise.
- [x] Duration choices are exactly Under 20, 20, 30, 45, and 60+ minutes.
- [x] The effort question is `How strenuous did this workout feel?` with choices Very easy, Easy, Moderate, Hard, and Very hard.
- [x] No completion step contains a required or optional text field.
- [x] A record of twenty minutes or more increases current-week progress; an Under 20 record is retained as a short effort without increasing progress.
- [x] Perceived effort is presented descriptively and does not imply that harder is better.
- [x] The saved record and updated dashboard survive closing and reopening the application.
- [x] The application-workflow test verifies every preset option set, the absence of typing, qualifying versus short-effort behavior, and persisted dashboard progress.

## Answer

Implemented a persisted four-selection workout-recording flow on the local
dashboard. After the existing one-time ninety-minute reminder, the dashboard
presents Done, then the exact activity, duration, and descriptive effort preset
sets in order. No completion step includes a text field.

Saved records remain visible after reopening. Durations of twenty minutes or
more increment current-week progress, while Under 20 remains visible as a short
effort without incrementing the count. The application-workflow test covers the
one-time prompt, every preset set, the four-step order, click-only interaction,
both qualification outcomes, and persistence.

Verification passed with the full application-workflow suite, syntax
compilation, whitespace validation, and the repository's Standards and Spec
review axes.
