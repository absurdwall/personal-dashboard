# 安装与首次使用

[产品介绍](../index.html) · [完整手册](manual.html) · [已知限制](limitations.html) · [发行说明](release-notes.html)

安装 **1.0.0 Beta 1**，build **5.0.4**：[Apple Silicon DMG](https://github.com/absurdwall/personal-dashboard/releases/download/v1.0.0-beta.1/Personal-Dashboard_1.0.0-beta.1_arm64.dmg) · [SHA256SUMS](https://github.com/absurdwall/personal-dashboard/releases/download/v1.0.0-beta.1/SHA256SUMS)。

## 先确认条件

- 首轮仅 Apple Silicon（M 系列）Mac；Intel、Windows 和移动端不在本轮交付范围。
- 实际验证环境为 macOS 27.0.1。包内最低系统元数据为 12.0，但尚未验证较低系统，不能据此承诺兼容 macOS 12。
- 本地任务、习惯和日记录无需 Codex、ChatGPT 登录、Obsidian、滴答、Node 或 Rust。
- AI、听写与自动早间安排需要另行安装兼容的外部 Codex、自己的可用 ChatGPT 账号及网络；额度与服务条件会影响结果。

## 安装 DMG

1. 在明确的 `v1.0.0-beta.1` 发行中取得 `Personal-Dashboard_1.0.0-beta.1_arm64.dmg` 与 `SHA256SUMS`；不要使用 latest 代替指定 Beta。
2. 在下载目录中执行 `shasum -a 256 Personal-Dashboard_1.0.0-beta.1_arm64.dmg`，将结果与同一发行的 SHA256SUMS 核对。校验和验证字节一致性，不证明开发者身份或安全性。
3. 打开 DMG，把 **Personal Dashboard** 拖到 **Applications / 应用程序**，等待复制完成。
4. 推出 DMG，再从“应用程序”打开 App。不要一直运行挂载盘里的副本。

本轮采用本地 ad-hoc 签名，未使用 Apple 验证的 Developer ID，未公证。首次启动可能被 macOS 拦截。如果你确认来源可信且文件未被篡改，先尝试打开一次，再进入 **系统设置 → 隐私与安全性 → 仍要打开**，按系统提示确认。具体选项随系统版本变化，参阅 [Apple 官方说明](https://support.apple.com/zh-cn/102445)。

受管理设备可能禁止例外，请联系设备管理员。遇到损坏、恶意软件、签名异常或没有允许选项时，保留完整提示，核对下载和版本并反馈；不要关闭全局 Gatekeeper 或反复绕过警告。本轮尚未完成真实公开下载资产的隔离/Gatekeeper 链验收，见[限制](limitations.html)。

## 创建个人空间

在 Today 空白页或 **设置 → 数据与 Vault** 选择 **新建个人空间…**，选择可写位置，为新文件夹命名，再保存。只创建必要目录，不带演示记录、个人背景、技能或账号。文件夹里 `.obsidian` 是兼容格式标记，使用 Dashboard 无需安装 Obsidian。

已有资料时，选择 **选择已有兼容 Vault…**；目录需要 `.obsidian` 与 `life/Journal/Daily`。普通非空文件夹不会被自动转换。取消或失败会保留原选择，按提示换新名称/位置即可。

## 做三个小操作

1. 在“任务”新建“买水果”，加入收集箱。日期可留空；想在 Today/Calendar 看它，可安排到今天。
2. 在“习惯”添加“散步”，选每日完成并保存，完成一次后再撤回，核对勾选结果。
3. 在“今天”的“写一句”保存“今天开始试用”。明确保存才建立首条最小 Daily Record；浏览日期不会造记录。
4. 使用菜单退出 App，再重新打开并逐项核对。关闭窗口可能只是隐藏，不能代替真正退出。

## 安装 Codex 并连接自己的 ChatGPT {#codex}

需要 AI 时，自行在 Terminal 执行已核对的官方独立安装路径：

```sh
curl -fsSL https://chatgpt.com/codex/install.sh | sh -s -- --release 0.160.0
"$HOME/.local/bin/codex" --version
```

预期版本输出为 `codex-cli 0.160.0`。独立安装默认位于 `~/.local/bin`，Dashboard 从 Finder 启动也会查找这里，因此核对版本不依赖 Terminal 的 PATH。保持完整安装结构，不要只复制其中一个可执行文件。安装脚本及发行可用性可能变化；如果固定版本无法取得，先查看[已知限制](limitations.html)并反馈。

进入 **设置 → Codex → 检查连接 → 连接 ChatGPT**，在浏览器中登录自己的账号，回到 App 再检查。Dashboard 使用独立连接资料；其他 Codex/ChatGPT 客户端已经登录，不代表 Dashboard 已登录。不要复制其他客户端的凭证文件。仅使用当前连接列出的模型和推理强度。

先请求一个合成修改，例如“请为今天添加本地任务：阅读一页”。检查独立操作结果，再到任务页面和资料中读回。回复、会话保存和业务保存是三个不同结果；结果不确定时先核对，避免重复创建。

Dashboard 不内附、自动下载或代装 Codex。安装任意 ChatGPT/Codex App 不等于安装了这里检查过的 CLI；运行时还需要通过 Dashboard 的协议与启动检查。独立安装、schema 与启动握手已本地核实；新账号登录、真实模型写入及中英麦克风质量仍未完成本轮验收，不保证所有账号可用。

来源：[OpenAI 官方 Codex CLI 文档](https://learn.chatgpt.com/docs/codex/cli)。固定 `--release` 参数已在本轮隔离安装中实际核对，详见[工程运行时记录](https://github.com/absurdwall/personal-dashboard/blob/main/docs/releases/beta-1/codex-runtime.md)。继续阅读[协作与听写手册](manual.html)。
