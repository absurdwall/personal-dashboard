# 08: Google Drive 同步目录兼容验收

**What to build:** 以隔离的客户端同步 Vault 证明本地完整使用及外部变化后的恢复行为，给出有证据的支持条件。

**Blocked by:** 01 设置、Vault 入口与预设颜色, 05 规划任务增量接收与重排保留, 07 Calendar 历史任务与习惯更正

**Status:** resolved

Type: task

- [x] 记录实际 Mac／Drive 客户端与目录可用方式，使用隔离合成 Vault；环境不足时记录缺口并保持未完成，不用普通临时目录冒充同步目录。
- [x] 通过应用选择并读取 Daily Record、任务、快照及本地完成，验证离线本地保存、重启重读；包含 05 生产者输入与 07 历史更正。
- [x] 验证外部客户端更新后的重读、并发／文件替换与冲突恢复，确认无静默覆盖、不同 Vault 不串数据；区分本地写入证据和实际云端变化证据。
- [x] 对隔离测试文件验证可用的 Drive 版本／回收站恢复路径，报告实际限制，不承诺整 Vault 时间点恢复；不删除或改动真实个人资料。
- [x] 产出可复核步骤、结果与支持模式；范围内兼容缺陷可定点修复并回归，架构扩展单列而不擅自加入 OAuth／自建同步。不得在关键验收缺失时标记 resolved。

## 执行上下文

先读同一 effort 的父规格与 map、项目领域术语和 ADR-0002／0003，核对前置票的完成证据及代码已在当前 checkout；仅有状态文字不够。原型入口及来源由 map 提供。若绝对路径打开的 ticket 来自主 checkout 而代码在 worktree，应将依赖成果带入所工作的 checkout，不能在缺前置的旧代码上继续。

按 implement 使用已约定的应用操作 seam 做行为测试，必要时沿用前端异步测试；各票保留自身可演示结果，不把基础验证推迟到整体验收。完成后按 code-review 审查、提交本票相关改动到当前分支，保留其他工作。认领／完成时更新本票与 map，附测试、提交、限制的 Answer；不关闭或修改父规格。

不新增外部服务／依赖，不复活退役 Exercise/Profile；不修改或运行日常 skill、Dida365、自动化。合成测试与 packaged 验收不得操作真实个人记录。

## Answer

状态为 `resolved`。2026-09-12 至 2026-09-14 在 macOS 26.5.1
（25F80）与 Google Drive for desktop 123.0.1.0 上，用实际
`~/Library/CloudStorage/GoogleDrive-…/My Drive/PD-Acceptance-08-*` 下的专用
标记合成 Vault 完成 packaged 本地／离线阶段；普通 `/tmp` Vault 只作为串库
反例，且安全门会拒绝它充当 Drive 验收目录。

通过证据：原生选库；Daily Record、Habits 快照与 05 生产者 action 读取；
suggestion 排除；Drive 客户端进程停止时的任务与本地习惯完成；07 历史任务与
习惯 complete／withdraw 更正；packaged 重启重读；原子外部替换后的刷新；陈旧 task revision 的可见失败、
草稿保留、显式刷新与重试；切换本地控制 Vault 后不串数据。合成历史复盘保持
逐字节不变。

2026-09-14 在 Drive 桌面客户端与网页端都确认使用同一预期账户后，新的
隔离 fixture 达到 `isUploaded = 1`、`isUploading = 0`。网页上传的远端版本在
1 秒内到达本地且 SHA-256 一致。冲突演练中先停止客户端，再分别写入本地离线版本
和网页远端版本；客户端恢复后，较晚提交的本地版本成为 current，网页远端版本仍
保留在版本历史中。Drive 没有生成 conflict copy，File Provider 也明确报告
`Provider supports upload with fail on conflict: no`；因此支持结论是“版本历史可恢复”，
不是“冲突副本或 fail-on-conflict 可用”。

Spec 审查要求的 Drive-to-app 闭环也已补齐：在独立 profile 的 packaged app 已读取
旧版合成 Daily Record 后，网页端把含唯一标记的新版本上传到同一个 canonical
`2026-09-08.md`。330-byte 文件在 2 秒内以预期 SHA-256 到达本地；仍打开的
packaged app 随后显示新标记，显式点击 Refresh 后新标记、旧外部替换标记和原复盘
内容仍同时可见。这个实证把真实 Drive 传输与应用重读连接在同一 canonical 文件上。

版本恢复路径已用同一 disposable 文件实证：从版本历史下载的 155-byte 远端版本与
原版本 SHA-256 `0f07e0803a561c7f58c66e3027a8a9752c67d979acd5e27c3b0bb5217b8ee6f4`
一致，重新上传为 current 后 1 秒内同步到本地，File Provider 报告 downloaded、
most-recent、uploaded 且无未解决冲突。回收站路径也已实证：网页端把该文件移入
Trash、在 Trash 中列出并成功 Restore，恢复后 Trash 为空，本地文件保持同一哈希。
限制是网页端 Trash 期间，本地 File Provider 路径在约 75 秒观察窗内没有消失，且
仍报告 `isTrashed = 0`；不能把 Drive 网页状态等同于本地立即可见的删除状态。
不承诺整个 Vault 的时间点恢复。

实现与复核入口：

- `scripts/acceptance/drive-vault-policy.mjs`
- `tests/frontend/drive-vault-policy.test.ts`
- `PERSONAL_DASHBOARD_ACCEPTANCE_SCENARIO=drive-compatibility scripts/acceptance/macos-ipc-workflow.sh`
- `docs/acceptance/personal-dashboard-3-drive-compatibility.md`

所有云端写入与恢复只作用于 `PD-Acceptance-08-20260912-cloud-r1` 内的 disposable
文件和合成 `2026-09-08.md`；未选择、删除或改动真实个人资料。完整步骤、证据分层
与支持限制见验收文档。
