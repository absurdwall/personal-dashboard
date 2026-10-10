## Summary

Collaboration now retains visible progress, available reasoning summaries and
failed attempts alongside the final reply and independently observed outcomes.
It reuses bounded Task, Daily Record, Habit and document capabilities through
one usage package, with personal retro in Dashboard and evidence-based workflow
retro in Codex.

```text
Collaboration session
  queued request -> bounded operations -> saved source receipts
  runtime events -> persisted work history -> final reply
  read-only recovery -> original execution's available saved evidence
  explicit-source reader -> verifiable workflow retro
```

Optional evidence copies have prospective item/execution/aggregate bounds with
explicit omissions; old records are not retroactively deleted. Streaming archive
selection preserves full source hashes and original evidence pointers. Chinese
and English conversation typography now follows the composer baseline.

## Evidence

- **Before:** delayed Habit navigation could restore an obsolete selection,
  available recovery items/diffs were lost, and a 33 MiB archive rejected even
  a small selected execution. Review records retain failing regressions.
  **After:** actual application/file/stdio/renderer/reader regressions pass;
  independent Standards and Spec repair reviews have no remaining findings.
- **Before:** Markdown lists, Results and Work history headings inherited16px
  while composer text was11.2px.
  **After:** real computed styles and Chinese/English expanded/collapsed visual
  checks align body/headings/lists with composer11.2px/17.36px;620px has no
  horizontal overflow. Independent typography review passed.
- Full checks:495 Rust passed with6 explicit native/live gates ignored;
  388 frontend passed;7 reader passed; build passed. Final CSS-only candidate
  `499cdc1` also passed full frontend/build, signed arm64 packaging and isolated
  native launch. Relevant Rust/reader sources did not change after those checks.
- The user accepted this iteration and requested local installation and parent
  closure with explicit deferred follow-ups. [Local tracker](https://github.com/absurdwall/personal-dashboard/blob/codex/collaboration-redesign-integration/.scratch/personal-dashboard-collaboration-redesign/map.md),
  [repair review](https://github.com/absurdwall/personal-dashboard/blob/codex/collaboration-redesign-integration/.scratch/personal-dashboard-collaboration-redesign/evidence/review-round-2.md),
  [typography/install closeout](https://github.com/absurdwall/personal-dashboard/blob/codex/collaboration-redesign-integration/.scratch/personal-dashboard-collaboration-redesign/evidence/typography-follow-up.md) and
  [deferred scope](https://github.com/absurdwall/personal-dashboard/blob/codex/collaboration-redesign-integration/.scratch/personal-dashboard-collaboration-redesign/deferred-follow-ups.md) distinguish tested, native-observed
  and unverified behavior. PDCR-03 scope, PDCR-11 voice/new native acceptance,
  PDCR-12 live Dida and automatic InitialPlan retry reliability are deferred.

## Merge Danger

**Door:** two-way

No automatic history eviction or destructive data migration. Keep the previous
App and verified profile backup for local rollback; validate persisted-history
compatibility before reverting to older application code.

**Blast Radius:** Collaboration

Conversation execution, persisted evidence, shared source navigation and bounded
operation guidance are affected. Deferred unknown-Dida policy and native/live
acceptance must not be represented as passed. Main remains protected; this PR
does not independently prove external acceptance or authorize personal writes.
