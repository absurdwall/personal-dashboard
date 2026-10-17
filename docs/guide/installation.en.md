# Install and start

[Product](../index.html) · [Complete manual](manual.html) · [Known limitations](limitations.html) · [Release notes](release-notes.html)

The **1.0.0 Beta 1** candidate is awaiting publication approval. Downloads are not open. These instructions describe the reviewed path for use after release; this page is not an existing public download.

## Check the requirements

- This beta targets Apple Silicon (M-series) Macs. Intel, Windows and mobile packages are outside this release.
- The actual test host is macOS 27.0.1. The package declares a 12.0 minimum, but lower systems have not been validated; this is not a macOS 12 compatibility promise.
- Local Tasks, Habits and Daily Records need no Codex, ChatGPT sign-in, Obsidian, Dida, Node or Rust.
- AI, dictation and automatic morning planning require a separately installed compatible Codex, your own eligible ChatGPT account and network access. Account limits and service conditions apply.

## Install the DMG

1. Once downloads are approved, obtain `Personal-Dashboard_1.0.0-beta.1_arm64.dmg` and `SHA256SUMS` from the exact `v1.0.0-beta.1` release. Do not substitute a latest link for this prerelease.
2. In the download folder, run `shasum -a 256 Personal-Dashboard_1.0.0-beta.1_arm64.dmg` and compare with that release's SHA256SUMS. A checksum verifies matching bytes, not developer identity or safety.
3. Open the DMG, drag **Personal Dashboard** into **Applications**, and wait for copying to finish.
4. Eject the DMG, then open the copy in Applications. Do not keep running the mounted copy.

This beta is locally ad-hoc signed. It has no verified Developer ID and is not notarized. If macOS blocks it and you trust its source and intact bytes, first try opening it, then follow **System Settings → Privacy & Security → Open Anyway** and the system confirmation. Follow [Apple's current instructions](https://support.apple.com/en-us/102445) for the options on your system.

Managed devices may prohibit an exception; contact the administrator. For damaged-app, malware or signature warnings, or a missing override, retain the exact warning, check the download/version and report it. Keep Gatekeeper enabled. The real public-download/quarantine/Gatekeeper chain has not yet passed this run's acceptance; see [limitations](limitations.html).

## Create your personal space

From empty Today or **Settings → Data & Vault**, choose **Create personal space…**, select a writable location and name a new folder, then save. Only necessary directories are created, with no sample records, personal background, skills or accounts. The `.obsidian` directory is a format marker; the Obsidian app is not required.

For existing data, choose **Choose existing compatible Vault…**. It needs `.obsidian` and `life/Journal/Daily`. Ordinary nonempty folders are not silently converted. Cancellation or failure retains the previous selection; follow the message to choose another name or location.

## Try three small actions

1. In Tasks, create “Buy fruit” in Inbox. A date is optional; assign today to see the same Task in Today and Calendar.
2. In Habits, add “Walk”, choose daily completion, save, complete once and withdraw it to check the result.
3. In Today, save “Started trying Dashboard” as a short note. Only an explicit save creates the first minimal Daily Record; browsing dates does not create records.
4. Quit through the app menu, reopen and check all three. Closing the window may only hide it.

## Install Codex and connect your ChatGPT {#codex}

For optional AI, install the checked official standalone CLI yourself in Terminal:

```sh
curl -fsSL https://chatgpt.com/codex/install.sh | sh -s -- --release 0.160.0
"$HOME/.local/bin/codex" --version
```

The expected version is `codex-cli 0.160.0`. The default standalone installation is in `~/.local/bin`; Dashboard also searches there when launched from Finder. The explicit version-check path does not depend on Terminal PATH. Keep the complete installation together rather than copying out one executable. The installer and release availability may change; consult [limitations](limitations.html) and report an unavailable pinned release.

Open **Settings → Codex → Check connection → Connect ChatGPT**. Sign in with your own account in the browser, return and check again. Dashboard keeps independent connection data; another Codex or ChatGPT client being signed in does not sign Dashboard in. Do not copy another client's credentials. Use only models and reasoning efforts offered by the current connection.

Start with a synthetic change, such as “Add a local Task for today: Read one page.” Check the individual action result, then independently reread the Task page and saved source. A reply, a saved conversation and a saved business change are separate results. Check uncertain outcomes before retrying to avoid duplicates.

Dashboard does not bundle, download or install Codex. Installing an arbitrary ChatGPT/Codex app is not the same as this checked standalone CLI; Dashboard also checks protocol and startup compatibility. The independent install, schema and initialization handshake were checked locally. Fresh-account login, real model writes and multilingual microphone quality have not passed this run's acceptance; not every account is guaranteed to work.

Source: [official OpenAI Codex CLI documentation](https://learn.chatgpt.com/docs/codex/cli). The pinned `--release` argument was actually checked in an isolated install; see the [engineering runtime record](../releases/beta-1/codex-runtime.md). Continue with [Collaboration and dictation in the manual](manual.html).
