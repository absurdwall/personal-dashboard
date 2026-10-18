# Approved Beta 1 publication preparation

On 2026-10-17 (America/New_York), the user explicitly authorized publishing the
reviewed build 5.0.4 and website/manual, merging PR #121, and replacing the local
formal App. This records the conversation's approval; it does not certify an
unperformed deployment or public download.

Approved package: source `eb49860e634bb5af4c25a21bd901ed9613abf84a`, build 5.0.4,
DMG SHA-256 `0f06f139365a1465fbf2b13d21d59513a262f7a058f2642bac621db73207b041`.
The candidate bytes remain unchanged. Later publication configuration and evidence
commits do not change the embedded App source.

## Manual publication boundary

The owner confirms anonymous Release asset bytes before dispatching
`Publish reviewed public website` on **main**. No push/PR/scheduled event deploys.
The expected project URL is https://absurdwall.github.io/personal-dashboard/.
Repository Pages uses workflow deployment; configuration is distinct from a
successful site deployment. Public anonymous asset access, quarantine/Gatekeeper,
site readback and final tracker closure still require actual results.

The workflow gives the staging job only `contents: read`; only the deployment
job receives `pages: write` and `id-token: write`. Checkout credentials are not
persisted. The static artifact is a 22-file allowlist: six HTML pages, ten
Chinese/English guide Markdown sources, CSS/JS and four referenced site assets.
It excludes internal agent/ADR/release/evidence documents, unrelated assets and
all other repository files. Engineering references use explicit GitHub blob
links; local links must close inside the staged subset. No app build, package
installation, dependency download or site generation happens in CI.

Official action tag/commit identities were read through GitHub's API before
pinning on this date:

- `actions/checkout` v7.0.1: `3d3c42e5aac5ba805825da76410c181273ba90b1`.
- `actions/upload-pages-artifact` v5.0.0: `fc324d3547104276b827a68afc52ff2a11cc49c9`.
- `actions/deploy-pages` v5.0.1: `368f82528645a54fb793d4d04e342629a3f51346`.

The existing site checker first rejected the old pending download entry. After
activation, source and staged-subset checks pass for six bilingual pages and
173 actual local links/assets, exact versioned DMG/checksum URLs and the approved
DMG hash. No broad application suite or App rebuild was run for this config/site
change. Deployment, GitHub release/merge and formal installation remain owned by
the root workflow; record their actual receipts separately.
