# Beta 1 independent integration review

The two independent, read-only reviews cover pinned base `9e8132b96a6669259d34981fcb602c48774efaf8` through
review head `3d94af1094b65375de0f5cd717861f3162934a39`. Both reviewers read the complete 18-commit range below.
The reports retain their original findings and limits; the resolution follows.

## Standards report

Standards review: `9e8132b96a6669259d34981fcb602c48774efaf8...3d94af1094b65375de0f5cd717861f3162934a39` (complete 18-commit list read).

One actionable finding:

- **[P2] Reject source ancestors before deleting an explicit frontend output.** `scripts/prepare-frontend.mjs:9-11` accepts arbitrary `--output`, but rejects only the exact repository, frontend and filesystem-root directories. From this checkout, `node scripts/prepare-frontend.mjs --output ..` resolves to the parent Tortilla Flat vault, passes the guard, and reaches recursive deletion at line 16. This removes this checkout and sibling personal projects before staging starts. Resolve/canonicalize and validate the destination before deletion; restrict it to known generated output or a clearly owned disposable directory, including protection against source ancestors. Add a non-destructive rejection regression. This conflicts with the source-preservation intent of the supplied Global Working Agreements and parent `../AGENTS.md:9` (preserve `raw/` content). The destructive command was not executed.

Baseline smell judgments (advisory, separate from documented rules):

- **Duplicated Code**, `scripts/release/build-beta.mjs:14,23` / `candidate-paths.mjs:11`: `output.split('/').some(part=>part.endsWith('.noindex'))` repeats the helper's path policy. The helper also validates canonical paths, so the duplication is currently harmless boundary validation; no actionable finding.
- **Primitive Obsession**, `frontend/main.ts:8298,16703-16704`: `selectTodayVault(createSpace = false)` / `selectTodayVault(true)` encodes the operation in a boolean. Its two bounded call sites reuse the existing vault-switch lifecycle correctly; no abstraction or rename required for this review.
- No supported actionable instance of the remaining baseline smells or other documented-standard violations was established.

Reviewed relevant product/build/acceptance/test hunks, new release/site scripts and standards/context/ADRs; excluded generated HTML and verbatim license/text-only noise. Read-only inspection only; no build, test suite, GitHub or GUI actions. Pending final DMG/hash/native checks, withheld publication approval and open #116/#120 are explicitly retained, not code violations. Original untracked `.scratch/public-beta` was untouched.

## Spec report

No actionable Spec findings in the reviewed source preparation.

Reviewed `git diff 9e8132b96a6669259d34981fcb602c48774efaf8...3d94af1094b65375de0f5cd717861f3162934a39` against canonical #116 and children #117–120, including #116's accepted clean-user/independent-login deferral. Read the supplied full commit list, relevant domain/issue-tracker rules, implementation call flows, packaging helpers, generated-site source and both-language guides.

The changes implement the requested empty-space path, preserve existing-folder content and optional integrations, retain ordinary Task/Habit/Daily Record operations without optional background, allow fresh automation settings without an inapplicable old-schedule handoff, and preserve the legacy-settings guard. External-runtime discovery now checks schema and actual initialization before accepting an initial candidate. Packaging retains application identity, declares release/build/assets centrally, separates diagnostic voice fixtures, verifies actual package bytes and supplies runtime notices. The bilingual material describes local/online boundaries, installation, data, backup/recovery and unperformed checks without opening downloads.

No unrequested platform, service, dependency, deployment activation or semantic authorization layer was identified. The explicit publication gate matches #120: “发布前呈现具体最终包、网页/手册、限制、实际验收结果与未执行项，并取得针对这些结果的公开发布授权.”

This is a read-only review of source preparation, not final release acceptance. The null final hashes, pending native upgrade/recovery/quit checks and old screenshot identities are explicitly marked as pending and intentionally followed by the owner's final-build/native phase; they are not reported as source defects. Real-model, microphone, physical-offline, lower-macOS and public-quarantine checks remain separate unperformed evidence. No build, GUI, private profile, GitHub write or repository edit was performed.

## Finding resolution and verification

The Standards P2 is fixed by removing arbitrary `--output` support. The staging
script owns only its repository's generated `dist` directory. It rejects all
unknown arguments before any cleanup; `--diagnostic-voice-gate` remains the only
opt-in. No new path-ownership abstraction or user-data operation is introduced.

The regression executes the actual copied staging script inside an owned temporary
fixture repository. It rejects sibling, ancestor and source destinations, and an
unknown flag, while verifying source, ancestor, sibling and existing output
sentinels remain byte-identical. No destructive command was run against a real
checkout, vault or filesystem root. The regression first failed because the old
script accepted the fixture sibling destination; it passes after the repair.

Affected frontend artifact tests: **2 passed**, zero failures/skips. The production
fixture test removes stale diagnostic HTML and JavaScript and verifies explicit
diagnostic staging. Actual `npm run build:voice-gate` then `npm run build` both
passed: diagnostic HTML/JavaScript appeared only in the opt-in build and were
absent from the following production output. The earlier full frontend suite
remains **557 passed**; it was not repeated for this bounded repair.

The Spec review reported zero actionable findings. The advisory smell observations
do not require additional changes. Final build 5.0.2, signed-resource/hash checks,
final native acceptance and screenshot refresh have **not run** at this source
review stage. Source review does not grant publication approval. The final
candidate must still be built from committed clean source, verified and presented
to the user. #116 and #120 remain open until actual authorized publication.

## Reviewed commits

```text
69dc5e5 fix: verify compatible external Codex candidates for beta (#117)
c6e180c Support empty personal spaces and independent first-use automation
9bcf218 Merge compatible external Codex runtime checks for beta first use
1f93490 Localize beta setup recovery and optional context states
41a53cb Record beta first-use boundaries and honest local acceptance
5ff8052 Merge first-use beta checks and fixes (#117)
4942a0b Collect verified runtime dependency licenses for beta packages
dd70ec2 merge: include target runtime license collector for beta (#118)
72a9698 feat: prepare source-bound Apple Silicon beta distribution (#118)
b0bd976 build: retain verified upstream license supplements for reproducibility (#118)
7c74928 docs: retain only upstream license notice from selectors source (#118)
2c17198 build: enforce ad-hoc-only environment for beta candidates (#118)
bc267b9 test: verify and record actual beta DMG candidate bytes (#118)
522d6bd Merge identified Beta DMG packaging (#118)
361f43a Prepare bilingual beta website, user guides and synthetic native screenshots
093635e Merge bilingual beta website and manual (#119)
faf05cb feat: prepare reviewed final beta candidate and bounded repairs (#120)
3d94af1 Merge final beta acceptance preparation (#120)
```

## Subsequent native-QA delta

After the review finding was independently confirmed resolved, build 5.0.2
actually passed all ten package checks from clean source `7eac9b7`. Its actual
[receipt](candidate-5.0.2.json) is preserved. Native first-use QA then found that
the writable empty Habits header subtitle still waited for an external bounded
snapshot. The bounded source repair uses the existing local-empty capability
condition and retains explicit coverage, error and unconfigured behavior.
The existing rendered first-use test failed on the old English subtitle, then
passed in both languages after the correction; the error cases also passed
(**2 tests**). Build 5.0.3 is now declared but has not been built. The new delta
awaits review and the complete native-QA batch before build authorization.
