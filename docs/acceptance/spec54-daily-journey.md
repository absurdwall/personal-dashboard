# Spec #54 daily collaboration evidence

This record supports [Spec #54](https://github.com/absurdwall/personal-dashboard/issues/54)
and [journey ticket #63](https://github.com/absurdwall/personal-dashboard/issues/63).
It separates application tests, installed Codex runtime probes, isolated packaged
candidates, and the actual installed Personal Dashboard. Text journeys do not prove
voice acceptance; the existing voice ADR and its acceptance boundaries remain intact.

## Source and application workflows

The highest existing `CollaborationApplication` entrypoint uses production Tasks,
Daily Record, local completion, snapshot publication, persisted conversation and
page readers. Scripted transports enumerate supplied natural-message effects; these
fixtures verify host orchestration and persistence rather than native model semantics.

- One evening request saves a review, a local Task commitment, a Short record and
  a mapped completion. Explicit local Task destination does not narrow another
  Habit's default dual scope. Tentative activity is rejected; unrelated nutrition
  and an earlier review-first Task remain untouched. External/query failures retain
  saved local effects and distinct unfinished source/publication/page outcomes.
- Concrete date-qualified reports for one Habit preserve only-local and only-Dida
  scopes independently. Stable source check-in stamp metadata carries the corresponding
  date scope; catalog availability remains independent from each effect's destination.
- Source-save/history-save failure retains the attempted original Task identity.
  Reopening and repeating the exact commitment first reads that effect. Confirmed
  saves are reused; a concurrent authored note leaves the earlier result unconfirmed
  and prevents duplicate creation or note replacement. Review-first records have no
  direct-write attempt marker and cannot be recovered as new approval.
- Repeated review/Short/Task effects reuse their original source receipts. Their
  checked results are associated with the new request while retaining original
  operation provenance. Saved conversation delivery remains separate from business results.
- A delivered refresh call retains its first result, including canonical source
  conflict. Duplicate delivery cannot publish later or change failure to success.
  A published snapshot followed by history failure leaves the call unknown across
  restart; a new intentional call uses fresh source queries. Query, generation,
  publication and page results stay attached to the originating request.
- Canonical Daily Record edit/delete/create races reject publication before or after
  activation, retain prior snapshot bytes and preserve authored source changes.
  Concurrent snapshot rollback retains displaced versions and reports recovery paths
  if bounded exchanges cannot verify restoration.
- Native-style planned header ranges remain visible despite unknown actual activity;
  canonical wake time remains a separate fact. Ordinary HTML metadata comments stay
  in the source and identity parsing while disappearing from diary reading context.
- A direct target-qualified long-term instruction accepts the selected-Vault phrase
  between 更新 and 长期背景, while negation and temporary-state guards remain. Its
  saved Self readback is independent from clauses preserving Tasks, Daily Records,
  Habits and Dida.
- Bilingual message results preserve independent saved, unknown and retained states
  after serialization/reopen; an older refresh cannot become a later request's result.
- The exact combined candidate request's explicit snapshot directive is independent
  of its ban on creating external objects and its limits preserving other sources.
  Application tests publish from current verified source reads, preserve the pending
  review and other source bytes, and reject tentative, declined or cancelled refreshes.
  Comma-separated limits remain independent. The current sentence surrounding the
  exact quote retains negation and future/discussion modifiers; a shortened verb/object
  quote cannot remove them. Future Task planning in another clause does not revoke
  an explicit current refresh.
- A confirmed configured native source startup failure permits one fresh transport
  and discovery probe before the current model turn, with the same scoped capabilities.
  Failed recovery still permits local work. Application fixtures preserve earlier
  saved receipts and pending review cards, send each current request once, and retain
  Dashboard identity and the rotated native identity after reopening. Authentication,
  missing discovery and unconfigured sources do not establish this failure condition.

Existing dependency workflows additionally cover Task lifecycle/list/history and
reported completion time, Daily Record morning baseline/replanning/review/Short
correction, cross-04:00 request capture, endpoint withdrawal/OR counting, native
source read cache invalidation and exact-time snapshot generation.

Run the focused Rust application suites with `--no-default-features --lib` plus
`collaboration_task_operations`, `collaboration_workflow`, `collaboration_evening_review`,
`habit_completion_workflow`, and `habit_snapshot_workflow`. Run `npm run test:frontend`
and `npm run build`. Native external/runtime gates are separate opt-in tests;
ignored gates are not counted as passing native evidence.

## Installed Codex runtime evidence

Codex CLI 0.160.0 was actually exercised using isolated native profiles and explicitly
owned synthetic source objects. No account credential, source ID, private rollout or
personal Vault path belongs in this repository.

- Immutable dynamic-tool schemas on resume require native thread rotation inside
  the same persisted Dashboard session. Historical context does not replay old authority.
- [Native file boundaries](spec54-native-files.md) cover selected `life/` writes,
  outside-life/structured/Self/reference denials and symlink attempts. Native file
  edits use patch context and exact readback; they do not gain Dashboard revision validation.
- Source-gated Dida probes verified source-assigned creation IDs, exact Task and
  Habit readback, historical check-in envelopes and fixture reset. Direct source-gate
  success alone does not prove native model approval behavior. After the phase C
  failure, a bounded per-tool approval fix passed a real native model historical
  write/readback and reset/readback gate using the owned fixture; candidate retry
  remains separate.

## Isolated packaged candidates

Candidates were copied into task-owned `.noindex` storage, launched with explicit
fixture profile/Vault and the real connected Codex runtime. The original saved
Dashboard conversation was retained across candidate restarts. These are candidate
results, not replacement of `/Applications/Personal Dashboard.app`.

| Candidate | Observed result | Boundary |
| --- | --- | --- |
| Phase A, `a2d88a5` | Late automatic first plan saved only remaining-day arrangement. Human continuation in the same session saved future local Task, reported current/historical completions with unknown minutes and an ordinary Short record. Native thread rotated while Dashboard session stayed identical. | No external business mutation requested; generic progress/timeline defects were recorded for #63. |
| Phase B, `b48dda0` | Real native source reads plus explicit mapping published a validated snapshot. Canonical wake 07:10 then traced correction to 07:50 rebuilt exactly one current 07:50 observation; prior trace and threshold-only sleep retained. Unmarked external evidence was not counted. | Initial natural mapping confirmation was rejected; exact mapping retry succeeded. #63 adds bounded natural confirmation. Pending review remained pending. |
| Phase C, `fc00484` | Natural evening request saved review, next-day local Task, daytime replan preserving morning baseline and local completion. Real source readback and publication completed independently. | The native call reported an approval-policy refusal under `never`; its original receipt lacks typed pre-execution provenance and remains unknown. Fresh exact source readback confirmed no new check-in. Local successes remain saved. The bounded native approval fix and final model retry are a separate frontier. |
| Phase D, `1afaae1` | Explicit long-term background retry preserved the original Self paragraph and saved one confirmed update. Planned header times appeared; correction metadata remained in the raw source and disappeared from reading context. After reconnect, the current authorized remaining external endpoint saved and fresh source reads generated a validated/published/ready snapshot; local plus external completion counted once. | First native source startup failed, so that turn made no external effect or refresh and retained local results. This candidate still used the old reply status/footer and diagnostic wording; subsequent source fixes do not prove candidate D UI acceptance. |
| Phase D next-day continuation, `1afaae1` | Reopening preserved the original chat and exactly one next-day pending Task, without fabricating a Daily Record. Yesterday's existing local completion and the future Task retained their identities. Local-only withdrawal saved locally; native reads confirmed the external end remained completed, so the refreshed OR count stayed one. Original-range withdrawal then confirmed external unmarked state and published a count of zero. | Repeated cached native startup failure prevented fresh source/refresh during the first cross-date request. A later policy-driven native thread rotation recovered discovery within the same running App Server; this is evidence for the recovery seam, not proof of automatic recovery under identical configuration. |
| Phase E, `90dffdc` | The original chat and pending review reopened. Chinese reply status/footer appeared once and remained truthful; host external diagnostics and source-ID suffix were localized while source and user text remained intact. Natural yesterday completion saved locally and through the mapped native Habit with source readback; time/duration stayed unknown. Ordinary month-plan read/edit/readback appended execution principles while preserving all previous paragraphs, references and the manual preservation section. | Native startup was healthy with unchanged native ID/fingerprint, so bounded failed-startup recovery did not run. A same-request snapshot refresh was rejected by the unrelated external-creation prohibition; previous snapshot retained. This combined-input failure requires the final narrow refresh-only native retry. |
| Phase E withdrawal, `90dffdc` | A separate natural original-range withdrawal confirmed both ends withdrawn/unmarked, queried the complete source range, and produced validated/published/ready display with zero known exercise completions. Exact wake 07:50, threshold-only sleep, mapping, other Task identities and pending review remained intact. | Sixteen local operations and one memory proposal remained; no effect replay or external object creation. The owned Habit name stayed unchanged and both tested source dates returned to unmarked state. |
| Phase F, `ee8dfc2` | The original chat retained sixteen local operations, one memory proposal and the pending kitchen review. An explicit current refresh with an unrelated external-creation ban in the same sentence issued only two native Habit source reads, then reported verified query, validated generation, published snapshot and ready display. Chinese stages and English reply/Habits display were correct, with zero of three known weekly completions. | Native ID and tool fingerprint stayed unchanged and startup was healthy; identical-configuration failed-startup recovery did not run. All eight checked source files retained their hashes, all Task identities/dates stayed unchanged, and no business write or external object creation occurred. |

The actual installed Dashboard bundle and personal profile/Vault remained unchanged.
Phase D finished with fourteen local operations and one memory proposal, without
replaying local effects or creating an external object. The owned Habit's two tested
dates returned to unmarked state and its name remained unchanged. Owned source
fixtures were reset to their documented baseline where supported; a
retained owned Habit has no verified teardown operation and remains outside repository data.

Phase F verified the final same-sentence refresh fix through the real native model.
The two source reads confirmed the owned Habit name and both tested source dates
remained unchanged and unmarked. Publication retained exactly one current wake
observation at 07:50, threshold-only sleep without an actual minute, and withdrawn
local/composite exercise completion. Ordinary month-plan text, the manual supplement
and appended execution principles remained intact. The review card stayed awaiting
approval without an execution attempt; prior saved effects were not replayed.

## Remaining acceptance

Phases D through F verified the remaining external endpoint, natural dual save/withdrawal,
ordinary month-plan preservation, corrected result/reply presentation, and the final
refresh-only retry under unrelated same-sentence preservation limits. Phase E's recorded
combined refresh failure remains part of the evidence; F verifies the bounded fix.
Same-configuration pre-turn native recovery remains application-tested rather than
observed in a failed-startup candidate: E and F started healthy, and D's observed recovery
changed the tool policy. Cross-date results retain their recorded source failure
boundary. Text probes do not establish live voice acceptance.
Any final installed-app replacement, main-branch merge, human daily-use acceptance,
issue closure or parent-spec completion requires its separately authorized workflow.
