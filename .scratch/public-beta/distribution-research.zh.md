# Personal Dashboard 首次公开 beta：分发研究

研究日期：2026-10-17（America/New_York）。状态：只读调查与方案准备；未发布网页、Release、标签、Issues，未修改 Bridge 项目、依赖、服务或部署配置，未读取个人 Vault 或凭证。

## 当前事实先纠正

交接将 Personal Dashboard 称为私有仓库；本轮匿名 GitHub API 与主线程的 `gh repo view` 都确认 `absurdwall/personal-dashboard` 当前为 **public**。API 同时显示 `has_pages=false`，Releases 列表为空。因此“必须另建公开下载仓库”不是当前技术前提。本轮没有改变仓库可见性。来源：[仓库公开元数据](https://api.github.com/repos/absurdwall/personal-dashboard)、[Releases 列表](https://api.github.com/repos/absurdwall/personal-dashboard/releases)。

本库 `src-tauri/tauri.conf.json` 当前为版本 `4.0.7`，只配置 `app` 打包，macOS 最低版本字段为 `12.0`，`signingIdentity` 为 `-`；`package.json` 的 `build:mac` 也只生成 App。本配置没有 `resources` 或 `externalBin` 声明。它们是源码状态，不是 macOS 12 或全部架构已完成验收的证据。来源：[tauri.conf.json](../../src-tauri/tauri.conf.json)、[package.json](../../package.json)。ADR-0001 曾明确延后签名、公证及公开发布；本次方案将打开该先前延期的工作范围，不能当成旧验收已覆盖。来源：[ADR-0001](../../docs/adr/0001-use-tauri-for-the-cross-platform-app.md)。

## Bridge 实际如何做

重新获取了[实际中文页](https://absurdwall.github.io/bridge-coup/)（网页工具无法读取，改用匿名 HTTPS curl）。页面有中英切换、功能与截图、使用要求、特定 beta DMG 与 Release 链接、三步首次安装、反馈入口。它明确告知临时签名/未公证、自己登录 ChatGPT，以及早期 beta 的干净用户安装和升级测试仍在进行。因此可以借鉴内容结构，不能把 Bridge 的公开上线当作其所有验收已经通过。

Bridge **没有**把下载资产分离到另一个仓库：源码仓库 `absurdwall/bridge-coup` 本身公开，`docs/` 通过 `.github/workflows/deploy-pages.yml` 部署 Pages，DMG 挂在同仓库的 GitHub prerelease。匿名 API 确认 tag 为 `v1.0.0-beta.1`、`prerelease=true`，DMG 为 `Bridge-Coup-v1.0.0-beta.1-arm64.dmg`，110,293,727 bytes，公开 API digest 为 `sha256:f5cdc53ff39da52fe6fac6e3baaa5009da6e267494447b93b8e6a0e5dbbd6272`。本研究没有下载或运行该 DMG。来源：[仓库 API](https://api.github.com/repos/absurdwall/bridge-coup)、[Release API](https://api.github.com/repos/absurdwall/bridge-coup/releases/tags/v1.0.0-beta.1)、本地 `../bridge-coup/docs/README.md` 和 `../bridge-coup/.github/workflows/deploy-pages.yml`。

Bridge 的 `Release/release.env` 集中声明 numeric app version、beta label/channel/tag、递增 build、资产名；App 内嵌这些字段，网站和说明保持一致。DMG 脚本先构建 App，在 staging 中放 App 与 `/Applications` 符号链接，再用系统 `hdiutil` 生成 UDZO，随后只读挂载校验。验证覆盖身份字段、最低系统/arm64、可执行权限、资源/许可证、所有 Mach-O 与外层签名、内附 Codex 握手等。来源：本地 `../bridge-coup/Release/README.md`、`Release/release.env`、`Scripts/build-macos-dmg.sh`、`Scripts/verify-macos-dmg.sh`。这些具体架构、系统和 Codex 打包声明只属于 Bridge，不能复制成 Personal Dashboard 的事实。

值得复用的是发布证据链：最终源码 → 最终候选 DMG/哈希 → 干净 macOS 用户安装 → 浏览器实际下载带隔离标记的公开资产 → 复制到 Applications → 推出 DMG → 运行复制品 → 首次使用/升级 → 启用网页下载入口。Bridge 的文档明确说临时 HOME、同账号隔离测试及脚本校验均不能替代干净用户实测。来源：本地 `../bridge-coup/Release/README.md`、`Release/first-use-2026-10-02.md`、`docs/README.md`。

## Apple：签名、公证与首次打开

- Developer ID 是 App Store 外分发时供 Gatekeeper 识别开发者的身份；公证是自动恶意软件及代码签名检查，不是 App Review。正常直接分发建议 Developer ID 签名后公证，并把 ticket staple 到分发包；未 staple 时离线用户可能被 Gatekeeper 阻止。来源：[Developer ID](https://developer.apple.com/developer-id/)、[Apple 公证说明](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)、[分发包说明](https://developer.apple.com/documentation/xcode/packaging-mac-software-for-distribution)。
- ad-hoc 是本地签名，不等于 Apple 验证的 Developer ID，也不等于公证。Tauri 官方直接支持 `signingIdentity: "-"`，并说明这种签名仍可能要求用户在隐私与安全中放行。来源：[Tauri macOS signing](https://v2.tauri.app/distribute/sign/macos/)。
- 未公证/开发者不能验证的应用，Apple 当前公开用户文档的路径是：先尝试打开；进入 **系统设置 → 隐私与安全 → 安全性 → 仍要打开**；按系统要求输入登录密码或认证，再确认打开。该例外之后被保存。按钮约在尝试打开后的一小时内可用；不同系统的具体菜单文案可能略有差别。来源：[Apple 安全打开 App](https://support.apple.com/en-us/102445)、[Mac 使用手册](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unknown-developer-mh40616/mac)。
- 安装手册应写“如 macOS 提供此选项”，不能保证所有机器都能放行。受公司/学校管理的 Mac 可能不提供对应设置。若系统提示恶意软件、会损坏电脑或 App 已损坏，应停止并重新核对包/反馈，不把所有警告归为普通 beta 提示。不要教用户关闭整个 Gatekeeper 或批量移除 quarantine。来源：[Apple 安全打开 App](https://support.apple.com/en-us/102445)。

推荐面向用户的安装文案草案（仅适用于最终包确实为 ad-hoc/未公证的情况）：

> 下载适合你 Mac 的 DMG，打开后把 Personal Dashboard 拖入“应用程序”。复制完成后推出 DMG，再从“应用程序”打开 Personal Dashboard。此 beta 采用临时签名，尚未通过 Apple 公证；如果 macOS 因无法验证开发者或未公证而阻止打开，请先尝试启动，再在“系统设置 → 隐私与安全”中找到 Personal Dashboard 的“仍要打开”，按提示确认。若没有该选项、设备受管理，或提示 App 损坏/恶意软件，请停下并查看故障说明或联系维护者。

## Tauri 2：DMG、架构、最低系统

Tauri 2 自带 DMG 打包，`tauri build --bundles dmg` 可生成 App 加 Applications 拖放界面；也支持先构建后 `tauri bundle --bundles app,dmg`。因此应先尝试现有锁定 CLI 的原生能力，而不增加打包依赖。来源：[Tauri DMG](https://v2.tauri.app/distribute/dmg/)、[Tauri distribution](https://v2.tauri.app/distribute/)。

架构选择是明确的构建/支持决策：`aarch64-apple-darwin`（Apple Silicon）、`x86_64-apple-darwin`（Intel）、`universal-apple-darwin`（两者；需装两个 Rust target）。内附 sidecar 也必须匹配支持的架构，不能只有主程序 universal 就宣称全部依赖支持 Intel。来源：[Tauri CLI](https://v2.tauri.app/reference/cli/)、[官方 GitHub 构建矩阵](https://v2.tauri.app/distribute/pipelines/github/)、[外部二进制](https://v2.tauri.app/develop/sidecar/)。

`minimumSystemVersion` 会写进 App 元数据；不能只用框架默认值决定产品支持范围。最终最低要求应取 App、内附二进制、实际所用系统 API 的最高要求，并在拟支持最低系统上验证。GUI App 不继承 shell dotfiles 中的 PATH，因此开发机能找到 CLI 不是陌生用户运行依赖已解决。来源：[Tauri macOS bundle](https://v2.tauri.app/distribute/macos-application-bundle/)；产品所需依赖由主线程另查。

## GitHub 公开范围与推荐拓扑

GitHub Release 的读取跟随仓库读取权限；私有仓库的 Release 不能靠把 URL 贴到公开页面变成匿名下载。Release 会自动附带该 tag 的源码 zip/tar 链接，因此若将源码仓库设为公开，不应只审查 DMG，也应确认源码/文档/历史的公开范围。来源：[GitHub releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)。

GitHub Free 可在公开仓库启用 Pages；私有仓库的 Pages 需要相应付费计划。网站是否公开与源码仓库是否私有是独立问题；企业私有 Pages 访问控制另有 Enterprise Cloud 条件。来源：[GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)、[Pages 访问控制](https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site)。

**推荐 A（基于当前 public 事实）**：继续使用 `absurdwall/personal-dashboard`，审阅后由同仓库 Pages 承载小型静态介绍/安装/手册，GitHub prerelease 挂版本明确的 DMG、SHA256SUMS、版本说明及许可/致谢。页面显式指向 tag 对应下载，避免 beta 使用会指向 stable 的 latest 链接。README 做简短产品入口及快速开始，与网页和完整手册互链。优点是不用新增服务/仓库，发布身份与维护路径统一；代价是仓库内容继续保持公开，须确认这符合用户意图。特定 tag URL 规范见 [GitHub linking releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases)，latest API 排除 prerelease 见 [GitHub Releases API](https://docs.github.com/en/rest/releases/releases#get-the-latest-release)，Bridge 已实际使用 tag URL。

**备选 B（若用户明确希望源码私有）**：保留/恢复私有工程仓库，另建只含审查过的静态站、公开手册、发行记录和 Release 资产的公开分发仓库。它的自动源码压缩包仅含分发资料。工程与分发 commit 用本地受控 manifest 对应。缺点是双仓版本对齐与额外发布权限；目前没有必要先做它。

**不推荐作为默认**：私有仓库 Pages 配公开网页、DMG 仍放私有 Release——网页能访问不代表资产能匿名下载；也不建议把 DMG 提交入 Pages 源码目录。

## 需要讨论的选择与发布门槛

1. 确认是否继续公开现有仓库（当前已公开；本研究不改变它）。这决定 A/B，而不是先创建仓库。
2. 首 beta 是否暂限 Apple Silicon；Intel/Universal 只有在 sidecar、最低系统及实机证据齐全后再承诺。
3. 签名路线：熟人小范围早期 beta 可讨论临时签名+真实首次打开验证；面向陌生用户的推荐路线为 Developer ID + 公证+staple。未调查用户 Apple Developer 账户/证书，不把它当作现成能力。
4. 版本策略先定：不要直接将工程 `4.0.7` 改成 `1.0.0`。可讨论“首个公开 Beta 1 / 工程 4.0.8-beta.1”等保持单调的版本，或用户明确批准另起对外系列并单独保留内部 build。App 数值字段、展示名、tag、DMG、文档、哈希必须有单一发行声明，任何重新分发的变化增 build。
5. 最终包必须检查没有开发者个人 Vault、绝对个人路径、登录 token、私人聊天记录、测试残留。许可证和内附二进制许可要审查；SHA-256 只能校验传输一致，不代替签名和来源信任。
6. 在干净 macOS 用户上，实测浏览器下载、DMG挂载/复制/推出/运行、Gatekeeper文案、空数据初始化、无需开发工具时的本地功能、用户自己登录 AI、失败恢复、退出重启持久化、备份恢复和旧 beta 替换升级。只能把实际观察到的结果写成通过。主线程负责具体产品和依赖范围。
7. 最后才创建 Release / 开启 Pages / 开放下载；这批外部写入仍需用户在具体方案清楚后授权，并按本项目规则走 PR 和发布流程。
