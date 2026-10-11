# PDEX-18 isolated native candidate — 2026-10-11

Branch: `codex/dashboard-experience-integration`  
Source base before this follow-up: `3c19010`  
Candidate: `/tmp/pdex18-cua-20261011.noindex/Personal Dashboard.app`  
Bundle ID/version: `com.tortillaflat.personal-dashboard.pdex18candidate20261011` / `4.0.7`  
Synthetic data directory: `/tmp/pdex18-cua-20261011.noindex/profile`  
Synthetic Vault: `/tmp/pdex18-cua-20261011.noindex/vault`

The candidate was built from the working tree with `node_modules/.bin/tauri build --bundles app --config /tmp/pdex18-cua-20261011.noindex/candidate-config.json --ci`, copied into the `.noindex` directory, and launched with `PERSONAL_DASHBOARD_DATA_DIR` and `PERSONAL_DASHBOARD_BASELINE_FILE` pointed at that directory. `codesign --verify --deep --strict --verbose=2` reported a valid bundle. The build was ad-hoc signed and not notarized. The normal `/Applications/Personal Dashboard.app` was not opened or changed during this candidate check.

Computer Use used the macOS app's virtual input through `cua_repl`; no Chrome page was opened. At the 640-point candidate window:

- Tasks showed the localized quick schedule date (`10月11日 周日` in accessibility and `今天` in the control). Its row stayed one line in the production WebKit geometry test.
- Calendar showed the month at left, full summary at right, and summary toggle at the right end of its toolbar. Virtual clicks collapsed and restored the summary while selection remained `10月11日 周日`.
- Today showed one aside toggle beside `时间轴 + 记录`. The toggle itself had no visible count; its accessible label preserved `0 项未定位条目`. The separate timeline total remains `0 项`. Virtual clicks expanded and collapsed the docked aside.
- The navigation toggle collapsed and restored the main navigation through virtual clicks.
- Collaboration expanded session history, created one synthetic session, and selected it. The session was saved only in the isolated profile at `profile/collaboration/collaboration-v1.json`; no file was created in the synthetic Vault. No message was entered or sent. The app reported that Codex CLI was discovered but ChatGPT was not connected, so the native composer and Send control remained disabled. Enabled composer pointer/focus checks are covered by the synthetic production-WebKit regression test instead of connecting an account or sending a model turn.

Focused verification:

- `npm run build` — passed.
- `node --test tests/frontend/docked-sidebars.test.ts` — 19/19 passed, including 640px toolbar non-overlap bounds and Tasks/Today schedule-label checks.
- `node --test tests/frontend/collaboration-layout.test.ts` — 10/10 passed, including enabled synthetic composer/session pointer hits, keyboard focus, and independent page/message scrolling.
- `node --test tests/frontend/compact-calendar.test.ts` — 12/12 passed.
- Tauri macOS bundle build and ad-hoc code-signature verification — passed.

This is implementation evidence only. Independent Standards/Spec review, fresh protection copies before normal-App replacement, and direct human acceptance remain separate checkpoints. The synthetic session is disposable test data; no personal Vault or normal profile write was made.
