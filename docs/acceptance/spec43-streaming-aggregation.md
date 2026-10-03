# Spec #43 streaming aggregation checkpoint

Date: 2026-10-03 (America/New_York). Scope: [ticket #46](https://github.com/absurdwall/personal-dashboard/issues/46). This is implementation and automated evidence; the ticket remains open for human acceptance.

## Current continuation

The original unresolved association below is superseded by live numeric audio-interval evidence and commits `0134ef7` / `c1da89d`. Previews retain their own identities; a nonempty user final replaces a preview only when the preview's entire positive interval is contained by exactly one nonconflicting final interval. Corrections recompute coverage and can reveal previews again. Missing or conflicting intervals remain preserved and incomplete. Distinct final identities retain equal words; content equality and arrival order are not association rules.

Stop now releases the microphone immediately, substitutes generated zero audio on the existing sender and requests the live-observed v3 `session.close` after one second. Receivers remain within a ten-second total Stop deadline. Completion requires an expected raw terminal, a distinct post-stop final and resolved received-preview coverage. The latest package, review repairs and human acceptance limits are recorded in [ticket #49](spec43-packaged-acceptance-49.md).

## Historical implemented behavior

The public dictation controller aggregates raw user finals by the server `turn.id`. A duplicate final replaces its own text instead of appending again; identical words in distinct turn IDs survive. Raw preview fragments are keyed separately by `input_transcript.added.item.id`, so repeated delivery does not repeat their text. Raw previews have no verified association with final turn IDs. They remain available independently of finals and are recovered in a clearly labeled, unconfirmed section of the same persisted editable draft. Arrival order and text equality are never used to seal or discard them. Assistant events and expired input callbacks never enter the draft.

Permission request, connecting, recording and post-stop finalization have distinct visible states. The preview explicitly says its text has not entered the draft. Manual stop ends microphone capture, retains the connection for the existing four-second finalization bound, and emits one aggregate into the original session/date draft. The controller takes the latest draft at delivery; pending saves share the existing queue. A stale autosave response cannot replace newer local edits, and an older debounced draft snapshot is cleared before the aggregate save.

Only a previously unseen user final after stop can satisfy the runtime's tail-event check. Replayed pre-stop finals cannot acknowledge a newer unfinished preview or an entirely unseen ending. Missing new final, any received unpaired preview or service failure ends incomplete while preserving received user text. No recording-duration timer was added.

## Earlier automated checkpoint (superseded by review fixes)

- `npm run build`: passed.
- `npm run test:frontend`: 212 passed at this checkpoint.
- Twelve public controller/runtime tests cover identified repeated/corrected finals, repeated preview fragments, assistant exclusion, final correction and late preview rejection, concurrent edits during recording/finalization, one aggregate save in the shared queue, cancellation/expired events, missing identity, incomplete preservation, and connection-wait cleanup.
- A fake browser clock advances production capture through 121 seconds without stopping. Manual stop then drains the synthetic ending within the post-stop bound; tracks/peer/native stop are released. This is control-flow evidence, not a real two-minute microphone test.
- Two startup regressions cover channel failure during connection and disposal before the connection wait begins. Both settle immediately and release the open listener/timer rather than waiting for a missed abort event.

## Remaining acceptance and protocol limits

Raw preview IDs and final turn IDs are different namespaces. The protocol supplies no verified relation joining them. The reviewed implementation no longer assumes ordered, non-overlapping user turns. Every preview-bearing input can finish incomplete, with a labeled recovered-preview section that may overlap the authoritative finals. The user must review and remove any overlap before sending. This preserves received text but does **not** satisfy Spec #43's complete preview-to-final correction/no-repeat acceptance. Server turn IDs remain authoritative for final text and deduplication independently of that unresolved association.

The inspected v3 protocol supplies no whole-input flush acknowledgement or a verified audio commit message. A new final after local stop is positive tail-event evidence, not proof that every last spoken clause has drained. The finite wait and explicit incomplete outcomes prevent indefinite hanging and avoid treating an old final as new tail evidence. The final packaged acceptance must inspect the opening, middle, final sentence and last few characters, as well as observed wait time.

See [review fixes](spec43-review-fixes.md) for current adversarial ordering, cancellation, cleanup and submit-race evidence.

Human Mandarin, English, mixed speech with proper names, continuous speech beyond two minutes, real last-word retention and persisted original-target drafts remain pending. No human-quality or packaged product acceptance is claimed here; the earlier [WKWebView runtime gate](spec43-wkwebview-runtime-gate.md) remains supporting connectivity evidence.
