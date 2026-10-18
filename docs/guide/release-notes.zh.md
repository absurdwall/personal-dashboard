# 1.0.0 Beta 1 发行说明

[产品介绍](../index.html) · [安装与首用](installation.html) · [完整手册](manual.html) · [隐私](privacy.html) · [限制](limitations.html)

## 当前状态

**尚未公开发布，下载未开放。** 当前内容供具体候选评审；只有维护者确认后才会启用网页、发行 tag 与 Release 资产。未完成实际发布前，规格和最终发行票保持未关闭。

发行显示名为 **1.0.0 Beta 1**，数值版本 **1.0.0**，当前声明 build **5.0.4**，计划 tag 为 `v1.0.0-beta.1`。只有 Apple Silicon / arm64 的 `Personal-Dashboard_1.0.0-beta.1_arm64.dmg`，配套 `SHA256SUMS`。应用身份保持 `com.tortillaflat.personal-dashboard`，不因公开版本重新建立个人资料。

## 本轮准备

- 空白个人空间创建与已有兼容 Vault 选择；任务、习惯与最小日记录独立保存。
- Tasks、Today、Calendar 共享 Task；生活日按 04:00 边界归属。
- 外部独立 Codex 兼容发现，App 内自己的 ChatGPT 连接；听写为在线可编辑草稿，自动安排默认关闭且仅在 App 运行期间检查。
- Apple Silicon DMG、拖入 Applications、明确版本与 SHA-256、本地签名/未公证声明。
- 双语网页、安装指南、完整手册、隐私说明与真实合成截图；保留现有可选集成。

## 候选对应关系

build **5.0.3** 已从干净源码 `e8ddeb8aab2d6d7bfc74d805839b633c9065af45` 实际构建，十项静态包检查全部通过。DMG 为 **5,508,256 字节**，SHA-256：

```text
d1471e872db7cec648da9564b543c8aca9b545abe3b3557a7530849c35473190
```

[真实包记录](../releases/beta-1/candidate-5.0.3.json)绑定源码、工具链、签名资源与实际哈希。App 内编译源码仍是上述提交；后续验收证据、截图和文档不会静默改变包身份。当前三张网页图片为真实 build 5.0.3 原生截图，已目视检查并绑定源码、可执行文件与[哈希记录](../releases/beta-1/screenshots.json)。5.0.3 的同用户业务、重启、隔离 4.0.7 替换及手动恢复检查已完成，见[原生记录](../releases/beta-1/native-5.0.3.json)。随后用户要求缩小 Settings 分类/动作按钮，并修正 Vault 动作换行间距。build 5.0.4 为此视觉小修准备，实际包及桌面/窄窗确认待执行；未变的业务页图片仍如实标为 5.0.3，本次小修不重复全套业务测试。

初始 build 5.0.1 来自 `72a96980c081e5fb23010e6ef5ff128a16ed9185`。build 5.0.2 来自 `7eac9b7eb7c475616115889f7e84f4cd2862fd58`；其静态包检查及同用户的 Task/Habit/记录/冲突/重启检查已执行，但原生 QA 发现空白 Habits 页头副标题仍需修正。[包记录](../releases/beta-1/candidate-5.0.2.json)与[原生观察](../releases/beta-1/native-5.0.2.json)按历史保留，缺陷已为 5.0.3 修复。两个旧包不覆盖、不重标；初始图片哈希仍保留在[历史记录](../releases/beta-1/screenshots-5.0.1.json)，当前图片实际重新捕获自 5.0.3。

下载仍未开放。获得授权并开放后，应从同一明确 tag 的 SHA256SUMS 核对实际字节。本页没有下载链接。签名、资源和历史哈希见[打包证据](../releases/beta-1/packaging.md)。

## 最终准备

最终源码修复本地 Habit 固定说明、首个习惯指引与重启后的短记录类别翻译，不翻译用户正文。打包准备支持全新外部缓存，并补充 Rust 标准库及运行时许可证。源码修复不等于最终包验收；实际结果和未执行项以[最终验收记录](../releases/beta-1/acceptance.md)为准。

## 支持范围与未运行验收

实际测试主机为 Apple Silicon macOS 27.0.1；包内最低元数据为 macOS 12.0，较低系统尚未验证。本轮没有 Intel、Windows 或移动包，没有自动更新，也未 Apple 公证。

真实模型、麦克风质量、全新 macOS 用户、独立账号及最终公开下载链的状态分别列在[已知限制](limitations.html)。历史通过、协议握手或自动测试不能补齐这些空白。内部 4.0.7 到公开 1.0.0 的数值显示重新起始，当前声明 build 从旧版递增为 5.0.4，应用身份及资料位置保留；实际替换安装的数据保留应核对相应候选验收，不保证任意降级。
