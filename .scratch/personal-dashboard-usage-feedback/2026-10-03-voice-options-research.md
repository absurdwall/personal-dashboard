# 中文语音输入方案调查

> 历史记录：本页为 2026-10-03 调研快照。后续确认的 Codex-only 方向替代了文中的 Apple 备用建议；实现与验收见 Spec #43、ADR-0004 和验收记录。 参见[文档索引](../README.md)。

日期：2026-10-03（America/New_York）

这是探索及隔离可行性验证笔记，不是实施规格、已发布票或真人识别质量验收。用户要求复用当前 Codex / ChatGPT 登录，不采用 API key 或单独计费的转写 API；联网可接受。以下补充实测已调用云端语音，输入仅为无个人数据的合成音频，并按用户要求安装了 Apple 普通话资源。未加入 Whisper、第三方依赖或修改 Dashboard 产品代码。

## 建议

**Codex App Server WebRTC v3 作为默认接入方向，现有 Apple 离线引擎作为备用。** 隔离验证已经用 Dashboard 当前 ChatGPT 登录完成建连，并取得完整中英混合用户转写；没有 API key。默认 WebSocket 音频路径仍要求 API key，应排除。当前账号成功不等于所有订阅与客户端都保证可用，具体语音额度尚未确认。

按用户最新取舍，暂不加入 Whisper、MLX 或 macOS 系统听写入口。只有 WebRTC 或现有 Apple 引擎在实际口述中不满足需要，再评估新的本地引擎。

## 后续隔离实测：通过的范围

- 使用本机 Codex CLI 0.160.0 和 Dashboard 既有独立 profile，`account/read` 确认为 ChatGPT 登录；探测进程排除了 `OPENAI_API_KEY`，没有读取、复制或输出凭据。
- WebRTC `version: v3`、`outputModality: audio` 成功收到 SDP answer，ICE 与 peer connection 均 connected。v1 被当前服务端要求 `quicksilver=v2` 拒绝；`outputModality: text` 被本机协议要求 realtime v2 拒绝，而 WebRTC 只允许 v1/v3。因此不能照搬“WebRTC + text 输出”组合。
- 浏览器 Web Audio 发送约 9.2 秒合成中英音频，没有开启麦克风。音频发送统计为 462 packets / 36,709 bytes，AudioContext running。完整用户事件为 `thread/realtime/transcript/done`，role=user：

  > 今天下午整理 personal dashboard 的计划, tomorrow morning I will review the tasks. 然后晚上散步三十分钟。

- 本次三段语言切换保留原语言及英文专名；这只是合成短样本，不能替代真人、噪声、长段和更多语言的验收。
- 另有 role=assistant 的语音回复转写，说明它仍是实时对话接口。正式接入必须只消费 role=user 的转写，不能把助手回复拼到草稿；不能以提示词承诺完全消除助手回复。
- 使用 ephemeral 临时线程、空工作目录、现有只读权限、无 Dashboard 动态业务工具、无个人背景。未观察到 backing `turn/started` 或 `turn/completed`；这只证明本次样本没有触发 backing 回合，不能代替后续边界测试。录音与业务协作线程应隔离。
- 验证后已调用 realtime stop 与 thread unsubscribe，临时线程卸载；没有创建 Tasks、Daily Record、Habit 或正式协作消息。
- Apple `AssetInventory.assetInstallationRequest` / `downloadAndInstall` 已补齐普通话资源；系统同时报告 zh-CN / zh-TW 可用。安装版 helper 的 capabilities 已包含 zh-CN 和原有 en-US；安装版 helper 对合成普通话录音已返回正确中文文字。资源安装修复已验证，但尚未做真人麦克风验收。
- Mac 在检查实际 Dashboard 中文按钮时锁屏，无法完成该 UI 检查。界面进入 Collaboration 会重新读取 capabilities；用户解锁后切换到其他页面再回 Collaboration 可刷新资源状态。既有用户草稿未修改。

以上原型位于系统临时 `.noindex` 目录，不是安装版产品交付；Dashboard 默认语音仍未切换到 WebRTC。

## 多语言与 Whisper 的判断

“支持多种语言”与“同一段录音中频繁切换语言”是两个要求。Whisper 的多语言模型支持中文和英语，但原版及 whisper.cpp 自动检测流程先选一种语言；维护者也说明过 code-switching 的局限。较新模型应实测，不能据此断言完全不支持，也不能承诺比 Apple 更准。[Whisper 当前转写实现](https://github.com/openai/whisper/blob/main/whisper/transcribe.py)、[维护者关于混合语言的回答](https://github.com/openai/whisper/discussions/1160)

本机 Dashboard 在 macOS 26+ 已使用新的 Apple SpeechTranscriber，并不是旧系统听写引擎。其公开初始化器仍选单一 locale，官方资料不足以保证中英同段混合效果。Whisper 与 Apple 没有使用同一批真人录音比较，因此当前没有准确率胜负结论。[Apple SpeechTranscriber](https://developer.apple.com/documentation/speech/speechtranscriber)、[Apple 新旧引擎说明](https://developer.apple.com/videos/play/wwdc2025/277/)

当前 Codex 合成短样本已经直接证明一种中英混合输入可工作，因此先接入它比先加入另一个本地引擎更符合用户目标。

## Codex：已经确认的事实

- 本机随 ChatGPT App 安装的 Codex CLI 为 **0.160.0**。用该二进制生成 `--experimental` JSON schema，确认存在 `thread/realtime/start`、`thread/realtime/appendAudio`、WebRTC SDP 交换及 `thread/realtime/transcript/delta` / `thread/realtime/transcript/done` 事件。相关请求和事件明确标记为 experimental。官方文档说明，生成的 schema 与运行它的 CLI 版本一致。[App Server 文档](https://developers.openai.com/codex/app-server)
- Codex 官方区分 ChatGPT 登录的订阅访问与 API key 的按用量访问。这个通用认证说明本身不能证明所有实时语音接口都在订阅内开放。[认证文档](https://developers.openai.com/codex/auth)
- 核对与本机版本对应的 `rust-v0.160.0` 源码，`prepare_realtime_start` 默认使用 WebSocket；该分支调用 `realtime_api_key`。没有 API key 时返回 `realtime conversation requires API key auth`。因此不能把 `appendAudio` 接上就承诺订阅复用。[实时启动与认证源码](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/realtime_conversation.rs)
- WebRTC 分支跳过上面的 API-key-only 获取函数，使用 `ModelClient.create_realtime_call_with_headers`；后者通过 `current_client_setup(ConfiguredProvider)` 获取当前 provider 和认证，再创建 call，并给 sideband 控制连接保留匹配的认证。代码还包含可选的客户端 attestation 处理。[客户端源码](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/client.rs)
- provider 代码为 ChatGPT auth 提供 `https://chatgpt.com/backend-api/codex` 路由；call 客户端测试覆盖该后端的 `realtime/calls` URL。以上构成“存在订阅登录接入路径”的源码证据，不是当前账号服务端授权、费用政策或中文效果的实测证据。[provider 源码](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/model-provider-info/src/lib.rs)、[call 客户端与测试](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/codex-api/src/endpoint/realtime_call.rs)
- 这是线程级实时对话接口。`outputModality: text` 表示输出形式，不等同于“只转写且不执行”。`clientManagedHandoffs` 的 schema 说明针对 Codex **回复**的转交控制，不能据此断言它会阻止输入触发 backing Codex。若未来验证，应使用隔离空工作目录、无 Dashboard 写工具的独立临时线程，把用户转写作为可编辑草稿，核对不会触发正式协作或数据更新。[实时源码](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/core/src/realtime_conversation.rs)、[协议定义](https://github.com/openai/codex/blob/rust-v0.160.0/codex-rs/app-server-protocol/src/protocol/v2/realtime.rs)
- 当前 Dashboard 的 `collaboration.rs` 发送的是文字 `turn/start`；录音经 `voice_input.rs` 交给 Swift Apple helper。它没有接入上述实时语音路径。当前登录与写入权限边界不应在语音研究中改动。

## 还不能承诺的事项

1. 其他账号、订阅与 CLI 版本是否有相同 WebRTC 权限；当前账号已实测成功，不能推广成普遍承诺。
2. 语音使用的具体订阅额度和上限。不要承诺“免费无限”或“与文本共用固定同一额度”；官方通用认证说明不足以回答语音细项。
3. 普通话、中文夹英文专名、停顿和长段口述的真实识别质量及延迟。
4. 实时对话能否可靠提供完整最终转写、取消和尾段处理，并保持先编辑后手动发送。

另外检查了普通文字回合直接附音频的路线：本机 schema 有 `audio` / `localAudio` 输入，但现有本机模型缓存只列出 text/image 输入能力。缓存不是实时账号能力，因此不能证明绝对不支持；也不能把 schema 接受音频当成当前模型可听音频。此路线暂不列入推荐。

## 无单独 API 账单的备选

| 方案 | 优点 | 接入代价及限制 | 建议用途 |
| --- | --- | --- | --- |
| Codex WebRTC 实时语音 | 已用当前 ChatGPT 登录取得完整中英合成转写；不需下载本地识别模型 | 云端处理录音；实验接口；其他账号权限、订阅语音额度及正式草稿行为待验收 | 默认接入方向 |
| Apple SpeechTranscriber | 现有产品已使用；转写在本机；没有转写 API 账单 | 首次下载 Apple 官方语言资源；效果需真人验证 | 最小范围的离线修复 |
| whisper.cpp 多语言模型 | 本机运行；开源；无转写服务账单；支持 Mac/Metal 和 C API | 新增引擎、模型下载/存储/管理与打包维护；不能使用英语专用 `.en` 模型 | 需要独立于系统语言资源时的长期备用 |
| macOS 系统听写 | 可在普通文本框使用系统快捷键；无单独 API 账单 | 需要系统语言配置；是否本机处理应看 Keyboard 设置；不会修复应用录音按钮 | 临时输入入口 |

Apple 官方说明其 SpeechTranscriber 在设备上转写，模型由系统管理。`AssetInventory` 提供显式下载、安装和进度接口。本次前序只读探测复现普通话资源缺失；后续按用户授权安装后，安装版 helper 已验证普通话能力，详见实测部分。[Apple 官方介绍](https://developer.apple.com/videos/play/wwdc2025/277/)、[SpeechTranscriber](https://developer.apple.com/documentation/speech/speechtranscriber)、[AssetInventory](https://developer.apple.com/documentation/speech/assetinventory)

whisper.cpp 提供 C API 和 macOS/Metal 支持；代码与 Whisper 模型采用 MIT 许可。官方列出的非量化 small / medium / large 模型约为 466 MiB / 1.5 GiB / 2.9 GiB。它与 Apple 哪个更适合用户的实际口述还没有对比，不承诺 Whisper 效果更好。[whisper.cpp 官方项目](https://github.com/ggml-org/whisper.cpp)、[Whisper 多语言模型说明](https://github.com/openai/whisper)

MLX Whisper 也支持本机运行和本地模型路径，但官方示例采用 Python 包及 ffmpeg。我推断其对现有 Rust/Tauri 产品的正式打包负担高于 whisper.cpp，因此只建议作为后续效果实验候选。[MLX 官方示例](https://github.com/ml-explore/mlx-examples/tree/main/whisper)

macOS 听写支持在应用文本框输入文字。Apple 要求在 Keyboard 设置查看当前设备与语言是否本地处理；不能仅因 Apple Silicon 就宣称用户当前配置的所有语言都离线。[Apple 听写说明](https://support.apple.com/en-gb/guide/mac-help/mh40584/mac)、[macOS 语言可用性](https://www.apple.com/macos/feature-availability/)

## 后续验证应回答的四个问题

- 仅用现有 ChatGPT 登录、没有 API key，能否建立 WebRTC 语音 call？若服务端拒绝，保留明确错误，不能改用 API key 或复制桌面产品的私有凭据绕过。
- 能否拿到中文最终转写，并在停止、取消或断线时正确处理尾段？
- 能否完全保持“草稿可编辑，用户手动发送”，录音本身不触发 Dashboard 业务动作？
- 当前账号语音额度与实际质量是否能满足日常长段口述？

本轮完成来源调查、无个人数据的云端合成样本验证，以及 Apple 普通话资源安装与合成样本验证。尚未做真人录音、长段尾音、取消/断线及产品接入验收。没有据此关闭现有语音票 #19 / #34，也没有发布新实施票或 Management 阶段。
