# External Codex runtime — Beta 1 candidate

Status: local runtime compatibility evidence for #117, recorded 2026-10-17.
This is not a completed fresh-user, login, model, microphone or DMG acceptance.
The source baseline is `9e8132b`; the accompanying discovery fix belongs to the
Beta 1 integration PR. The final candidate record must identify its source and
App/DMG hashes separately.

## Reproducible user installation

The checked standalone version is **Codex CLI 0.160.0 for Apple Silicon macOS**.
Install it yourself using the official standalone installer in Terminal:

```sh
curl -fsSL https://chatgpt.com/codex/install.sh | sh -s -- --release 0.160.0
```

Then open a new Terminal and check:

```sh
"$HOME/.local/bin/codex" --version
```

The expected version is `codex-cli 0.160.0`. The official installer puts `codex`
in `~/.local/bin` by default. Dashboard also checks this location when Finder
starts it with a minimal PATH. A custom installation must be in Dashboard's PATH
or another searched location. Keep the complete official installation together;
copying one executable out of its installation is not the supported setup.

Open Dashboard's Settings, refresh the Codex connection, then choose the ChatGPT
sign-in action. Sign in with **your own account**. Dashboard uses its own Codex
profile: a login in Terminal or another ChatGPT/Codex app is not proof that
Dashboard is signed in. Access to models, online transcription, quota and network
services depends on the account and current service conditions. No API key is
required for the documented ChatGPT login route.

Dashboard does not bundle, download, update or install Codex. Installing the
ChatGPT desktop app is not the same as installing this checked standalone CLI;
other discovered versions must pass Dashboard's compatibility checks. Local
Tasks, Habits and Daily Records remain usable when Codex is unavailable.

Source: [official CLI installation](https://learn.chatgpt.com/docs/codex/cli).
The downloaded official installer exposes `--release VERSION`; this pinned
invocation was actually executed in an isolated temporary home. The installer
and its release availability can change, so update this evidence before changing
the documented runtime version.

## What was checked

The official installer ran with an empty temporary HOME/CODEX_HOME and
`PATH=/usr/bin:/bin:/usr/sbin:/sbin`, outside the app bundle. It resolved and
installed 0.160.0 successfully. The CLI was then run with a separate empty
working directory and Dashboard's scoped-permission configuration. No existing
user Codex configuration or login credentials were copied or inspected.

| Check | Result |
| --- | --- |
| Official standalone install, version command | Passed: 0.160.0 |
| Experimental JSON schema generation | Passed |
| Named `permissions` string/null and `runtimeWorkspaceRoots` path list in thread/start, thread/resume and turn/start | Passed: protocol declaration only |
| Start ordinary CLI `app-server`; send `initialize` with Dashboard metadata and experimental capability | Passed: real JSONL response with runtime platform metadata |
| Send `initialized` notification | Sent successfully; no acknowledgement is defined by the protocol |
| Dashboard status fallback and app-owned profile isolation | Covered by accompanying synthetic transport regression tests; final candidate evidence remains separate |
| Settings login using a fresh user's own account | Not executed |
| Real AI Task modification with independent readback | Not executed |
| Real Chinese, English and mixed microphone recognition | Not executed |
| Finder launch of final installed candidate | Not executed here |
| Minimum macOS supported on another machine | Not executed |

The host was Apple Silicon, macOS 27.0.1 (26A434). The standalone main executable's
Mach-O minimum OS metadata was 11.0; that metadata alone does not establish the
minimum supported system for Dashboard, its helper processes or its AI features.

The main CLI SHA-256 was
`112fae7a5a1223e673c8a1791d32338f37df8b527ff1159bb8adac6c4dbf1b4b`.
The downloaded installer SHA-256 was
`150e3cf675682efeaac115aa3747add3f27887896d04ce6d0b56478d8b428bf6`.
These identify the checked bytes; they are not Dashboard download checksums or
proof of account/service access. Machine-local logs and generated schemas were
kept outside the repository.

The official app-server protocol requires `initialize`, then `initialized`,
before other methods. Generated schemas describe that CLI's own version;
a version string or a file alone does not prove a usable server.
Source: [official app-server protocol and initialization](https://learn.chatgpt.com/docs/app-server).
