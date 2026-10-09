# Final combination checks at 7b3dc8

Date: 2026-10-09. Source integration:
`7b3dc8dc4fd99496c12e4338a886b2f240335bf2`; original baseline `9939c23`.
No source changed during these checks. These results do not close native voice,
unknown Dida object-scope, live-source or release gates.

- Full default-parallel `cargo test --manifest-path src-tauri/Cargo.toml`:
  **490 passed, zero failed, six explicit environment/native gates ignored**,
  26 test binaries/doc-test groups. Private log:
  `/tmp/pdcr-exploration/final-full-rust.log`.
- `npm run test:frontend`: **371 passed**, zero failed/skipped/cancelled.
  `/tmp/pdcr-exploration/final-full-frontend.log`.
- `npm run build`: passed; `/tmp/pdcr-exploration/final-build.log`.
- `python3 tests/developer/workflow_retro_reader_test.py`: **four passed**;
  `/tmp/pdcr-exploration/final-reader-corrected.log`. An earlier invocation
  pointed unittest discovery at a nonexistent skill-local tests directory and
  failed before running tests; retained separately in `final-reader.log`.
- One additional explicitly selected CLI 0.160.0 native permission gate:
  `installed_native_profiles_enforce_command_writes_and_symlink_escapes`
  **passed** with only synthetic files/authentication. It uses actual native
  sandbox commands, not a model turn or live Dida. Manual `life/` writes,
  managed Task/background protection, outside-Vault and symlink escapes,
  private-profile access, and automatic read-only scope were checked.
  `/tmp/pdcr-exploration/final-native-permission.log`. The five other ignored
  Dida environment/live gates were not run.
- Independent repair review resolved both frontend findings and both P3
  suggestions; [review](review.md) keeps Standards and Spec separate. Unknown
  native Dida object scope remains a Spec finding pending the documented
  [decision](unknown-dida-scope-decision.md).

The original atomic-test failure logs and test-only uniqueness repair remain
in [producer evidence](../pdcr-07-evidence.md); these green results do not
retroactively establish the original failure's cause.

## Pure frontend supplement at c5be634

Legacy unavailable presentation source `505fdb3`, integrated
`c5be634d75b8921a6244135593b3128588398150`, changes only three frontend source
files plus production-renderer tests/evidence. `src-tauri` and `.agents` trees
are identical to `7b3dc8`; the Rust/reader/native-permission results above remain
applicable to those unchanged sources and were not rerun.

- Production-renderer red: three new missing-label assertions failed. Green:
  32 related checks passed. [Red/green evidence](review-fixes.md).
- Complete frontend: **378 passed, zero failed/skipped/cancelled**, private log
  `/tmp/pdcr-legacy-all-frontend.log`; `npm run build` passed,
  `/tmp/pdcr-legacy-build.log`. Root reread the logs and checked source scope.
- Independent targeted Standards/Spec reviews found no new issue. Spec review
  separately passed seven new production-renderer checks without repeating the
  full suite. [Distinct review axes](review.md).
- Bounded no-auth native legacy reassessment is recorded separately with its
  build/source identity in [native evidence](11-native-acceptance.md). It does
  not create model, voice or live-Dida evidence.
