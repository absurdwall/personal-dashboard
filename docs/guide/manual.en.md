# Complete user manual

Personal Dashboard **1.0.0 Beta 1**, build **5.0.4**, for Apple Silicon Mac. [Install and start](installation.html) · [Privacy and files](privacy.html) · [Known limitations](limitations.html) · [Release notes](release-notes.html)

## Meet Personal Dashboard

Personal Dashboard brings Tasks, daily plans, Calendar, Habits and AI collaboration into one Mac app. Start with local features and connect Codex when you need it. No Dashboard account, Obsidian, Dida or developer tools are required for local use. AI uses your own ChatGPT sign-in and available account limits.

The first beta is **1.0.0 Beta 1**, for Apple Silicon Macs. It is locally signed and has not been notarized by Apple. Intel Macs, Windows and mobile devices are outside this beta. Check the release record for the exact package, tested operating systems and limitations. A configured minimum macOS version is not evidence that it has been tested there.

## Install and open

1. Download the DMG from the version-specific release entry and verify its filename, version and SHA-256 against that release.
2. Open the DMG and drag **Personal Dashboard** into **Applications**.
3. Wait for the copy to finish, eject the DMG, then launch the copy in Applications.
4. If macOS blocks it, attempt to open it once, then follow the per-app **Open Anyway** instructions under **System Settings → Privacy & Security** and complete the system confirmation. Names vary by macOS version; follow [Apple’s instructions](https://support.apple.com/en-us/102445).

Keep Gatekeeper enabled. On a managed Mac, contact your administrator. If macOS reports damage, a signature problem or no override, stop repeating the override, check the download and checksum, and report the problem. Allowing an app to open does not establish that it passed a security review.

## Create your personal space

From the empty Today screen or **Settings → Data & Vault**, select **Create personal space…**. Choose a writable location and a new folder name in the system panel, then save. Dashboard creates an empty folder structure and selects it. It does not install sample data or another person’s records. “Vault” in the interface refers to this user-owned data folder.

To reuse compatible data, select **Choose existing compatible Vault…**. The folder needs the `.obsidian` format marker and `life/Journal/Daily`; Obsidian itself is unnecessary. Dashboard does not silently convert ordinary folders. If creation or selection fails, read the message and choose a new name or the correct folder. The previous selection is retained.

## Try three small actions

- In **Tasks**, choose **New task**, enter “Buy fruit”, and add it to **Inbox**. A date is optional.
- In **Habits**, choose **Add habit**, enter “Walk”, choose **Complete each day**, check its start date, then **Save habit**. Record one local completion using its completion control.
- In **Today**, open **DAYTIME · TIMELINE**, enter “Started trying Dashboard” under the short-note field, and select **Save note**. This explicit action creates a minimal Daily Record if none exists for the selected date.

Check the saved results, quit and reopen the app, and confirm that they remain. Browsing a date does not create a diary. Tasks and Habits do not require an existing Daily Record.

## Tasks, Today and Calendar

These views share the same Task identity. Renaming, scheduling or completing a Task changes the record the other views read; there is no need to create copies. Inbox is the default list. Today is a date-based view across lists.

Tasks have a name and optional content, date and time. Details offer lists, parent/subtask relationships, priorities and tags; folders group lists. Parent and child Tasks keep independent dates and completion states. A planned execution interval is intended time allocation, not measured activity. When crossing midnight, enter the actual end date.

Use **Clear time and execution interval** to retain a date without a timed position, or **Clear date and time** to remove scheduling. Overdue Tasks do not automatically fail, complete or move to today. Complete, reopen, abandon or delete a Task as appropriate. Deleted Tasks can be restored from **Deleted**. Abandonment remains distinct from completion. Archiving a list retains its history without completing or abandoning its Tasks.

Calendar opens with a month. Select a date to read its record or create a Task for that date. Future Tasks are valid plans; future activity cannot be recorded as something that already happened.

## Daily Records, plans and review

Morning, Daytime and Evening belong to the same dated Daily Record. The current arrangement can change while the initial morning baseline and revisions retain its history. Elapsed time does not turn a plan into an observed fact. Untimed content remains in its untimed section.

Short notes may be ordinary or exercise notes. An exercise note does not complete a Habit or write to Dida. Corrections retain a trace. To generate or revise a plan, tell Collaboration the target date and what you want saved. **Review today** prepares an editable chat draft; inspect it and send it yourself. Skipping a review creates no obligation to reconstruct the day later.

A lived day runs from local **04:00 until just before 04:00 the next morning**. Saturday at 02:00 still belongs to Friday’s lived day; actual timestamps remain unchanged. Around midnight, check the selected date and conversation target date.

## Habits and statistics

Create local Habits and maintain their names, start dates, groups and goals. A Habit can be deactivated and restored. Goals include daily completion, attained days per week and daily time thresholds. Weekly goals count distinct attained days from Monday through Sunday; repeated completions on one day count once.

An edited goal has an effective date: daily goals change next lived day, and weekly goals next week. Past and current-cycle attainment keep the applicable goal. Open Habit details to inspect dates, goals and evidence.

Local completion and available external evidence retain their sources but count once per Habit and lived day. Withdrawing local completion can leave the result checked when external evidence still confirms it. A threshold check-in declares that the threshold was met, not the actual event time. Unknown or uncovered dates are not automatically failures. “At least” and “known” statistics do not establish complete history.

You do not need Dida or an external snapshot to begin. This beta does not provide new-user Dida setup or automatic imports of all external tasks and Habits.

## Connect Codex and use Collaboration

Follow [Codex installation and connection](installation.html#codex) for the checked external runtime. The DMG does not bundle, download or install Codex. In **Settings → Codex**, choose **Check connection**, then **Connect ChatGPT** when prompted. Complete browser sign-in with your own account and return to check the connection. Dashboard keeps independent connection data; being signed in elsewhere does not sign you into Dashboard.

Use the models and reasoning efforts offered by the current connection. Experimental protocols, account eligibility and limits affect availability. A successful compatibility check does not establish support for every model, account or dictation service. Consult the release’s validation record.

In **Collaboration**, type a message, check the target date and press **Send**. Sending can create a new chat. Ask to discuss a proposal when you want to review it first, or clearly request a saved change—for example, “Add a local Task for today: Buy fruit.” Check individual action results, then refresh the relevant Task, Daily Record or Habit view. A model reply, a saved conversation and a saved business record are separate results. If an outcome is uncertain, read the actual source before repeating it.

Work history retains progress and recovery, rather than replacing your records. Long-term background and continuity are context, not the current Task state. Missing optional background or workflow references in a new space do not require copying the maintainer’s setup. AI needs an online service; consider the content you send and the source material it reads before submitting. Keep account information and conversation content out of public bug reports.

## Dictation

Select **Start dictation** beside the composer, allow microphone access when asked, and wait for **Recording · You can speak**. Select **Stop dictation**, wait for transcription, then review and edit the draft before pressing **Send** yourself. Dictation never submits the message automatically.

Audio is processed online through Codex. This is neither offline recognition nor a live voice conversation. Network, account or service failures can produce incomplete text; unconfirmed previews may overlap final text. Remove duplicates before sending. Explicit Cancel discards this dictation input and keeps the draft that existed before recording. Leaving Collaboration, switching chats or changing the target date stops capture and finalizes received text into the original chat/date draft. On a save failure, preserve or copy important text before leaving; visible unsaved text is not proof of persistence.

## Automatic morning plan

**Settings → Codex → Automatic morning plan** is off by default. To enable it, choose a local trigger time, enable the schedule, and save. No handoff is needed if you have no previous schedule. If you already use another automatic morning schedule, select that option, review or pause it outside Dashboard, then confirm the handoff. Dashboard does not inspect or disable outside schedules for you.

While the app process is running and dependencies are available, it can attempt a first plan for today after the trigger time. Opening it later that day checks again for a missing plan. An existing valid plan is preserved. Closing the window generally hides it; quitting stops the scheduler. Sleep, network, authentication, account limits or read errors can prevent execution. Dashboard does not wake the Mac or promise delivery at a precise time. Inspect **View automatic run** and the Daily Record. Automatic planning does not automatically complete Tasks, record observed activity or synchronize external data.

## Offline use, files and sync

Local Task, Habit and Daily Record operations do not depend on AI. They remain available offline, without Codex or before sign-in, provided the selected files are available on the Mac. AI, dictation and external sources need their respective connections.

Your personal space contains Daily Records under `life/Journal/Daily/` and Tasks, Habit definitions, local completions and related data under hidden `life/.personal-dashboard/`. Include hidden folders when copying it. Mac-specific settings, conversation history, drafts, automation preferences and independent Codex connection data are in `~/Library/Application Support/com.tortillaflat.personal-dashboard/`. Connection files can contain sensitive authentication data.

For Google Drive, first use its desktop client to keep the entire personal space locally available, then select that folder in Dashboard. Dashboard does not manage Google sign-in, uploads or cloud conflicts. “Saved locally” does not mean “synced to the cloud.” Confirm sync has finished before editing on another computer and avoid concurrent edits. This beta does not promise live synchronization of app settings or chats.

## Back up, recover and handle conflicts

Quit Dashboard and close other editors, then periodically copy the entire personal space—including hidden folders—to a separate backup location. To retain local chats, drafts and preferences, back up the application-data directory too. Protect backups containing authentication data and never attach them to public issues. There is no promise of one-click whole-space recovery. Historical Exercise/Profile backup code is not a backup facility for your current personal space.

For recovery, preserve a copy of the current files first. With the app and editors closed, copy the chosen backup to a new recovery folder and open it using **Choose existing compatible Vault…**. Check records, Tasks and Habits, then quit and reopen. To restore Mac-specific app data, preserve the current directory before replacing it while the app is closed. Reselect a moved personal space and reconnect ChatGPT if needed. Do not overwrite active files or assume an older app can read newer data.

If a file changed or a save is uncertain, retain the draft, inspect the source and refresh before retrying. Protected replacement saves preserve recovery material under `life/.personal-dashboard/recovery/today/`. The app does not automatically merge, replay or decide which version is correct. These files are not a complete backup and may reflect subsequent external edits. Close all relevant editors, compare the content and restore manually only after understanding the differences. Seek help when unsure. Do not delete recovery files simply to clear an error.

## Upgrade, uninstall and report a problem

Back up before upgrading, quit the old app and replace the same app in Applications following the new release instructions. Keep the existing identity and personal space. Reopen and check records and version. Consult the release record for the internal 4.0.7 to public 1.0.0 display/build mapping; arbitrary downgrades are not guaranteed.

To uninstall, quit and move `/Applications/Personal Dashboard.app` to Trash. Your selected personal space and Mac app data remain. Back up and explicitly identify each folder before choosing to delete personal data. Removing the app does not erase chats or authentication files. The separately installed Codex runtime remains independent.

Report problems through this repository’s GitHub Issues with version/build, macOS, chip, reproduction steps, expected and observed results, and whether local features, AI or dictation were involved. Prefer synthetic screenshots. Redact names, paths, records, conversations, email addresses and tokens. Retain original evidence privately; do not publish your entire personal space, app-data directory or auth files. Release evidence distinguishes passed, failed and unperformed checks. Fresh-macOS-user and alternate-own-account tests were deferred; they have not passed.

