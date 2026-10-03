# Spec #43 streaming aggregation checkpoint

Date: 2026-10-03 (America/New_York). Scope: [ticket #46](https://github.com/absurdwall/personal-dashboard/issues/46). This is implementation and automated evidence; the ticket remains open for human acceptance.

## Implemented behavior

The public dictation controller aggregates raw user finals by the server `turn.id`. A duplicate final replaces its own text instead of appending again; identical words in distinct turn IDs survive. Raw preview fragments are keyed separately by `input_transcript.added.item.id`, so repeated delivery does not repeat their text. A newly completed turn replaces the current provisional preview batch with its authoritative final text. An old duplicate/corrected final does not erase the next batch; preview IDs already sealed by a final cannot return as late previews. Assistant events and expired input callbacks never enter the draft.

Permission request, connecting, recording and post-stop finalization have distinct visible states. The preview explicitly says its text has not entered the draft. Manual stop ends microphone capture, retains the connection for the existing four-second finalization bound, and emits one aggregate into the original session/date draft. The controller takes the latest draft at delivery; pending saves share the existing queue. A stale autosave response cannot replace newer local edits, and an older debounced draft snapshot is cleared before the aggregate save.

Only a previously unseen user final after stop can satisfy the runtime's tail-event check. Replayed pre-stop finals cannot acknowledge a newer unfinished preview or an entirely unseen ending. Missing new final, pending preview or service failure ends incomplete while preserving received user text. No recording-duration timer was added.

## Automated validation

- `npm run build`: passed.
- `npm run test:frontend`: 212 passed at this checkpoint.
- Twelve public controller/runtime tests cover identified repeated/corrected finals, repeated preview fragments, assistant exclusion, final correction and late preview rejection, concurrent edits during recording/finalization, one aggregate save in the shared queue, cancellation/expired events, missing identity, incomplete preservation, and connection-wait cleanup.
- A fake browser clock advances production capture through 121 seconds without stopping. Manual stop then drains the synthetic ending within the post-stop bound; tracks/peer/native stop are released. This is control-flow evidence, not a real two-minute microphone test.
- Two startup regressions cover channel failure during connection and disposal before the connection wait begins. Both settle immediately and release the open listener/timer rather than waiting for a missed abort event.

## Remaining acceptance and protocol limits

Raw preview IDs and final turn IDs are different namespaces. The protocol supplies no verified relation joining them. Preview replacement therefore assumes ordered, non-overlapping user turns on the data channel; synthetic tests exercise that contract but do not establish the service's future ordering. Server turn IDs remain authoritative for final text and deduplication independently of the preview association.

The inspected v3 protocol supplies no whole-input flush acknowledgement or a verified audio commit message. A new final after local stop is positive tail-event evidence, not proof that every last spoken clause has drained. The finite wait and explicit incomplete outcomes prevent indefinite hanging and avoid treating an old final as new tail evidence. The final packaged acceptance must inspect the opening, middle, final sentence and last few characters, as well as observed wait time.

Human Mandarin, English, mixed speech with proper names, continuous speech beyond two minutes, real last-word retention and persisted original-target drafts remain pending. No human-quality or packaged product acceptance is claimed here; the earlier [WKWebView runtime gate](spec43-wkwebview-runtime-gate.md) remains supporting connectivity evidence.
