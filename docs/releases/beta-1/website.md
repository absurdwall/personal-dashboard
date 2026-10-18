# Beta 1 website and guide preview (#119)

Canonical ticket: [#119](https://github.com/absurdwall/personal-dashboard/issues/119).
Prepared from integration 522d6bddd4062d9742bc3fde3c64c8c0c32d29ef.
This is a local review deliverable. No Pages configuration, deployment workflow,
release tag or downloadable Release was enabled.

## Review locally

From the repository root:

~~~sh
node scripts/site/build.mjs
node scripts/site/check.mjs
python3 -m http.server 8769 --bind 127.0.0.1 --directory docs
~~~

Open http://127.0.0.1:8769/ or add ?lang=en. The server binds loopback.
The landing page, local CSS/JS, actual PNG screenshots and five generated
guide pages are checked in; visitors need no build service or dependency.
Chinese/English Markdown guide sources are under docs/guide/. The small
trusted-subset renderer regenerates their HTML and reads release.json for
marked landing-page identity fields. It does not change the closed download
gate. Later release acceptance must update factual candidate receipts and
recapture affected screenshots rather than silently relabel these images.

## Candidate and screenshot mapping

The preview describes **1.0.0 Beta 1**, current declared build **5.0.3**, intended
tag v1.0.0-beta.1. The actual screenshot candidate was built from
72a96980c081e5fb23010e6ef5ff128a16ed9185; its signed manifest was read directly.
The initial DMG's exact bytes and SHA-256 remain in [packaging.md](packaging.md).

All three product images are direct window captures from that native App,
using a separate synthetic profile and Sample Space. Only synthetic Task,
Habit, plan and note examples were present. No account/settings/private path
panel, menu history, personal Vault or personal login appears in the images.
The captured PNGs retain native alpha/shadow margins and were not regenerated
or retouched. [screenshots.json](screenshots.json) records source, build,
dimensions, actual hashes and inspected bytes. These are candidate illustrations,
not installed sample data, AI output acceptance or final-package certification.

The English Habits image retains the initial 5.0.1 screenshot identity. The
bounded copy repairs are implemented for declared final build 5.0.3; its actual
build/native checks and refreshed captures are still pending. Historical images
are not relabeled as the repaired candidate.
No live AI/microphone result was invented to fill a screenshot.

## Documentation reconciliation

The manual draft was audited against merged behavior, with these corrections:

- New users without an old morning schedule can enable automation without a
  fictitious handoff; existing schedules retain their confirmation boundary.
- Explicit dictation Cancel discards this input and keeps the earlier draft.
  Stop/navigation finalizes received text to its original chat/date draft.
- The documented default standalone version check uses the exact
  "$HOME/.local/bin/codex" executable with --version, independently of PATH.
- Lower-macOS metadata is not a support claim. Clean-user/independent-login,
  real-model, microphone and public-download checks retain their unperformed
  status; actual developer-machine native results are separately described.
- The README adds the current user entry and links while preserving every
  original engineering/history section from its former Build heading onward.

Installation and privacy guides cover per-app macOS opening, owned local data,
online content/audio processing, independent ChatGPT connection data, optional
Dida, desktop-client sync boundaries, backup/recovery, upgrades, uninstall
retention and redacted feedback. OpenAI's standalone installer documentation and
Apple's current opening page were re-read; the pinned CLI invocation is backed
by the separately recorded actual 0.160.0 installation, not inferred from a
generic latest installer.

## Checks actually performed

- Local publication checker initially failed for absent pages/assets, then
  passed with **6 bilingual pages and 179 real local links/assets**. It checks
  existence/anchors, local assets, closed download control, explicit release
  identity, no latest/download URL and no maintainer-private path in the pages.
- Browser HTTP response: 200. Real Chrome desktop and 390 × 844 narrow layouts
  visually inspected. Desktop width 1497 / document width 1482; narrow width
  390 / document width 375. No horizontal overflow in the inspected pages.
- The actual Chinese/English switch and language-preserving navigation were
  exercised. A discovered hidden-language Codex anchor was fixed; it now lands
  approximately 105 px below the sticky header in either language.
- All three native images were independently viewed and checked for synthetic
  content. The existing exact-PID exporter verified the expected candidate and
  synthetic Vault before capture. The owned candidate was normally quit through
  its own App menu and its process exit verified.
- README historical tail byte comparison and git diff whitespace check: passed.
- No tests were added merely to assert editorial wording. The meaningful
  publication/link boundary and actual rendered/browser interactions were used.

Desktop/narrow proof images and machine-specific raw logs stay outside the
repository. The local preview server is retained for the integration review.
Final anonymous asset access, public download, Gatekeeper, live AI/microphone
and user-accepted clean-environment deferrals remain with #120; this ticket
does not establish public release or authorize closing #116/#120.
