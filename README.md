# Personal Dashboard

把任务、每日安排、日历和习惯放在一个本地优先的 Mac 工作台里。可以先使用自己的本地资料，需要时再连接 Codex 进行在线 AI 协作。无需 Obsidian 或滴答，本地功能不要求 AI 账号。

A local-first Mac workspace for Tasks, daily plans, Calendar and Habits, with optional online AI through a separately installed Codex. Local use needs no AI account, Obsidian or Dida.

## 1.0.0 Beta 1 · 候选预览 / Candidate preview

**尚未公开发布，下载尚未开放。Not publicly released; downloads are closed.**
首轮为 Apple Silicon / arm64。实际测试主机 macOS 27.0.1；包内 12.0 是最低元数据，较低系统尚未验证。本地 ad-hoc 签名，未 Apple 公证。计划 tag 为 v1.0.0-beta.1；具体候选、build 和校验和见发行说明，公开发布须另行确认。

The first beta targets Apple Silicon Macs. Tested on macOS 27.0.1; lower systems are unvalidated despite the 12.0 package metadata. Locally ad-hoc signed, not notarized. The intended tag is v1.0.0-beta.1. Exact candidate/build/checksum details are in the release notes; publication requires separate approval.

- [网页预览 / Website source](docs/index.html) · [中文安装指南](docs/guide/installation.zh.md) · [English installation](docs/guide/installation.en.md)
- [中文完整手册](docs/guide/manual.zh.md) · [English manual](docs/guide/manual.en.md)
- [隐私与资料](docs/guide/privacy.zh.md) · [Privacy and files](docs/guide/privacy.en.md)
- [已知限制](docs/guide/limitations.zh.md) · [Known limitations](docs/guide/limitations.en.md)
- [发行说明](docs/guide/release-notes.zh.md) · [Release notes](docs/guide/release-notes.en.md) · [候选打包证据 / Package evidence](docs/releases/beta-1/packaging.md)

## 快速开始 / Quick start

下载开放后：核对明确版本的 DMG 与 SHA256SUMS，拖入“应用程序”，推出 DMG 再打开。首次系统放行按安装指南操作。选择“新建个人空间…”，选位置并命名新文件夹；创建一个任务、一个习惯，再保存一句记录。退出后重开并逐项读回。只浏览日期不会创建日记。

After downloads open: verify the versioned DMG and SHA256SUMS, drag into Applications, eject the DMG and launch the installed copy. Follow the installation guide for the system opening flow. Create a personal space by choosing a location and new folder name. Add one Task, one Habit and a short note, then quit/reopen and read them back. Browsing dates does not create records.

可选 AI：自行安装已核对的独立 Codex CLI 0.160.0，再从 Dashboard 设置中登录自己的 ChatGPT。App 使用独立连接资料，不保证继承其他客户端登录。听写在线处理，先成为可编辑草稿，由你发送；自动早间安排默认关闭，仅 App 运行期间工作。真实模型/麦克风、独立账号及全新 macOS 用户的未执行项见限制，不把协议检查当作完整 AI 验收。

For optional AI, install the checked standalone Codex CLI 0.160.0, then sign in to your own ChatGPT from Dashboard Settings. Dashboard uses independent connection data. Dictation is online editable draft input; automatic morning planning defaults off and runs only while the app is running. See limitations for unperformed real-model, microphone, independent-account and clean-user checks.

## 本地网页评审 / Local website review

无需新增依赖或构建网站服务。静态页面已提交；开发者修改指南 Markdown 后可以重新生成并检查链接：

The static pages are checked in. No additional dependencies or website service are needed. After editing guide Markdown, rebuild and check the local publication boundary:

~~~sh
node scripts/site/build.mjs
node scripts/site/check.mjs
python3 -m http.server 8769 --bind 127.0.0.1 --directory docs
~~~

打开 http://127.0.0.1:8769/；中英文切换、截图、手册和待确认下载状态均可本地评审。这里没有启用 Pages、部署工作流或公开下载。

Open http://127.0.0.1:8769/ to review both languages, real synthetic screenshots, guides and the closed download gate. Pages, deployment workflows and public downloads are not enabled.

## 开发者与历史工程记录 / Developer and historical records

以下保留原有 2.0 工程、恢复与 cutover 记录，作为历史来源。它们不是当前用户安装手册；当前功能与发行状态以上述 Beta 手册和具体候选证据为准。

The following original 2.0 engineering, recovery and cutover sections are retained as historical records. They are not the current user installation guide. Current behavior and release status are described in the Beta guides and candidate evidence above.

## Build and install the Mac application

The active application uses Tauri 2, Rust, plain TypeScript, semantic HTML, and
CSS. Install the JavaScript and Rust build prerequisites, then run:

```sh
npm install
. "$HOME/.cargo/env"
npm run check
npm run build:mac
```

The release application bundle is produced at:

```text
src-tauri/target/release/bundle/macos/Personal Dashboard.app
```

It can be copied into Applications or opened directly through macOS Launch
Services:

```sh
open "src-tauri/target/release/bundle/macos/Personal Dashboard.app"
```

Verify the complete Tauri-only release boundary rather than a development
process:

```sh
npm run accept:cutover
```

The acceptance check verifies that the active source and README expose only the
Tauri product, confirms the recoverable baseline tag, relocates a bundle copy,
launches it through macOS Launch Services, verifies the arm64 application
identity, and confirms that the app uses neither Python nor a listening TCP
socket. The private release targets the current Apple Silicon Mac and macOS
environment. It is ad-hoc signed but is not Developer ID signed or notarized.

## 2.0 workspace

The packaged app opens on Today and exposes exactly three primary destinations:
Today, Calendar, and Habits. Today and Calendar read the selected Tortilla Flat
vault's Daily Records; Habits reads the validated, on-demand projection at
`<selected-vault>/life/.personal-dashboard/derived/habits-v1.json`. The app does not
call Dida365 or run a producer itself.

The retired This Week, History, Settings/Profile, and exercise-reminder
surfaces are not registered by the 2.0 application runtime. Historical modules
remain in source only to validate and enumerate old state during the bounded
cutover and to preserve prior regression evidence.

## Vault write recovery

Today reads and performs bounded updates directly against the selected Tortilla
Flat vault's canonical Daily Record. It prepares the recovery directory before
activation. Immediately after the atomic exchange, while the exact inode
displaced from the canonical path is still linked at the temporary path, the
app creates and syncs a same-volume hard-link recovery entry under:

```text
<selected-vault>/life/.personal-dashboard/recovery/today/
```

The recovery entry is recovery material, not a second life record: Today never
reads it as application state or presents it as canonical content. Keeping that
exact displaced inode linked means an editor that retained its file descriptor
cannot later write into an unlinked, unrecoverable file. Byte equality is not
used as a substitute for file identity. The temporary link is removed only
after the durable recovery link exists. If recovery-directory preparation
fails, no activation is attempted. If linking the displaced inode fails after
activation, the app returns an error and attempts an atomic rollback; it never
unlinks the displaced inode. A successful rollback restores that inode at the
canonical path and leaves the rejected candidate at its temporary path. If
rollback also fails, the displaced inode remains linked at the reported
temporary path for manual recovery.

The same recovery directory protects writes to persistent Tasks, date-scoped
tasks, and local Habit completions. The app does not scan or replay recovery
entries; restore one only after manually inspecting it.

Snapshots have no automatic expiry. They remain until the user explicitly
deletes them, which avoids inventing an unsafe time after which a retained
external descriptor must have closed. Close Dashboard and external editors and
inspect any needed recovery content before manually removing old snapshots.
The vault `.gitignore` excludes this runtime-only directory from version
control.

This is preservation, not cross-application locking or merging. An external
editor can still supersede the canonical path, and Today may report a conflict
that requires manual reconciliation. Recovery links also reflect later writes
made through a retained descriptor; that is intentional. The guarantee relies
on macOS same-volume atomic exchange and hard links, and does not claim tested
power-loss durability within the exchange/link interval.

The compatible 2.0 representation for an independently retained morning
baseline, the still-current arrangement, explicit writer transitions, and old
record behavior is documented in
[`docs/daily-record-baseline.md`](docs/daily-record-baseline.md). Reader support
does not by itself activate or prove the future production writer.

## Retiring the old Exercise runtime

Normal 2.0 startup never reads, creates, imports, or schedules from the retired
Profile/Exercise state. A separately gated cutover path is available only when
`PERSONAL_DASHBOARD_2_CUTOVER_CANDIDATE` names the exact reviewed candidate.
It validates the old state, stops only the exact historical Python launchd job,
cancels and verifies the complete derived notification set, deletes only the
approved app-owned objects, and writes an atomic completion marker. Unknown
files stop the operation without mutation. Set
`PERSONAL_DASHBOARD_DATA_DIR` and
`PERSONAL_DASHBOARD_LEGACY_EXERCISE_DIR` for an isolated rehearsal.

The complete owned-state inventory, authorization boundary, ordered procedure,
and failure semantics are documented in
[`docs/acceptance/personal-dashboard-2-cutover-plan.md`](docs/acceptance/personal-dashboard-2-cutover-plan.md).
The deterministic application seam is:

```sh
cargo test --manifest-path src-tauri/Cargo.toml --test cutover_workflow
```

A live cutover additionally requires explicit approval for the exact installed
bundle and for any live daily-loop skill, Dida365, or automation change. Building
or running the isolated seam does not grant that approval.

## Cutover evidence and limitations

The completed 20-scenario baseline inventory is mapped to the active Tauri
application suites, and the Mac and physical-device gate evidence is collected
in [`docs/acceptance/tauri-cutover.md`](docs/acceptance/tauri-cutover.md).
The iPad and Samsung results prove shared-foundation compilation, installation,
launch, and offline rendering only. Full standalone mobile behavior,
notifications, profile transfer, and production layouts remain future work.

## Recoverable completed baseline

Personal Dashboard 2.0 is the sole active product implementation in this
checkout. Normal use runs through the packaged Tauri application; the current
checkout contains no Python dashboard, localhost server, or separate reminder
runner. Old Exercise/Profile behavior remains covered as historical validation
code, but is not registered by normal 2.0 startup.

The completed pre-Tauri application remains immutable and recoverable through
the annotated Git tag `python-exercise-tracker-complete`. Its behavior, data
contract, synthetic migration fixture, and detached-worktree recovery procedure
are recorded in
[`docs/migration/completed-python-baseline.md`](docs/migration/completed-python-baseline.md).
