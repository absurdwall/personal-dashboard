# 05 — Install the minimal shell on the target iPad

**What to build:** Prove that the accepted Tauri foundation reaches the actual target iPad by compiling, installing, and launching a minimal Personal Dashboard shell before the completed Python runtime can be retired.

**Blocked by:** 03 — Persist and exchange a minimal Mac profile; 04 — Deliver a notification with the Mac window closed.

**Status:** resolved

- [x] The target iPad model and current iPadOS version are recorded before the gate runs.
- [x] The project initializes and builds the iOS/iPadOS target without creating a second product implementation.
- [x] A minimal Personal Dashboard shell installs and launches on the actual target iPad.
- [x] The shell identifies Personal Dashboard and renders through the shared interface foundation.
- [x] The result proves toolchain and device reachability only and does not claim exercise-feature or notification parity.
- [x] Any platform limitation, manual provisioning step, or unresolved risk is recorded as a gate result.
- [x] Failure stops dependent migration work without modifying or bypassing the completed baseline.
- [x] No App Store distribution, production mobile design, profile transfer, or full mobile behavior is added.

## Answer

The accepted Tauri foundation reaches the actual target iPad. Personal
Dashboard 0.1.0 was signed through the user's Xcode Personal Team, installed,
launched, and observed running on an iPad (A16), product type `iPad15,7`, with
iPadOS 26.5.2. Xcode's device view reports the installed bundle as
`com.tortillaflat.personal-dashboard`, and a physical-device screenshot shows
the shared Personal Dashboard exercise shell rendering offline.

This result proves only iOS toolchain, signing, installation, launch, and shared
interface reachability. It does not claim exercise behavior, profile exchange,
notification parity, or production iPad presentation. The shared capability
copy still includes Mac-specific phrases such as “Native Mac foundation” and
“This Mac”; later mobile presentation work must make that copy platform-aware.

## Comments

### 2026-08-12 — Device gate paused for Apple prerequisites

Tauri iOS initialization succeeded from the existing product configuration and
generated `src-tauri/gen/apple/personal-dashboard.xcodeproj` with product name
`Personal Dashboard` and bundle identifier
`com.tortillaflat.personal-dashboard`. The generated project remains under the
repository's existing ignored `src-tauri/gen/` build-output boundary; no second
interface implementation was added.

The three iOS Rust targets are installed. Tauri's required local build tools
were installed through Homebrew: XcodeGen 2.46.0, libimobiledevice 1.4.0, and
CocoaPods 1.17.0.

The physical gate is paused, not passed:

- Full Xcode and the `iphoneos` SDK are not installed; only Command Line Tools
  are active. An `aarch64-apple-ios` core check stops when `xcrun` cannot locate
  the `iphoneos` SDK.
- No Apple code-signing identity or development team is available.
- `idevice_id` reports zero connected iOS/iPadOS devices, so the target model
  and iPadOS version cannot yet be recorded.
- The Mac currently has about 15 GiB free, so additional working space should
  be made available before installing full Xcode and its iOS components.

The completed baseline is unchanged and dependent migration work remains
blocked. Resume after full Xcode with iOS platform support is installed, an
Apple Account/Personal Team is configured in Xcode, and the unlocked target
iPad is connected, trusted, and placed in Developer Mode.

### 2026-08-12 — Compilation-only gate resumed

Disk cleanup increased available space to about 67 GiB. Per user direction,
the next pass will prove iOS/iPadOS compilation without requiring the target
iPad to be connected; device model, iPadOS version, install, launch, and visual
device acceptance remain explicitly deferred and the ticket will not be marked
resolved without them.

The official Xcode installation was started from the Mac App Store and is
currently paused at the Apple Account password prompt. Credential entry is a
user-only action. After authentication and installation complete, resume with
the iPhoneOS SDK build and record the resulting compile gate.

### 2026-08-12 — Compilation-only gate passed

Xcode 26.6 (build 17F113) and the iOS 26.5 platform are installed. The shared
Rust core passes `cargo check` for `aarch64-apple-ios`, and the complete Tauri
pipeline produced an unsigned ARM64 device archive at
`src-tauri/gen/apple/build/personal-dashboard_iOS.xcarchive`. The archive
contains `Personal Dashboard.app`, bundle identifier
`com.tortillaflat.personal-dashboard`, device families iPhone and iPad, and a
minimum iOS version of 14.0.

The generated Xcode project still derives `PRODUCT_NAME` from the existing
`Personal Dashboard` configuration and builds the existing `../dist` frontend.
No second interface or product implementation was added. Swift Package
Manager's workspace-local SQLite build database repeatedly returned a disk I/O
error even though its integrity check passed and sufficient disk space was
available. Pointing `CARGO_TARGET_DIR` at
`~/Library/Caches/personal-dashboard/tauri-target` allowed the same unsigned
archive to complete without changing the repository; the underlying filesystem
cause remains unresolved.

Per user direction, no iPad is connected for this pass. Device model, iPadOS
version, signing/development-team provisioning, physical install and launch,
and visual confirmation of the shared shell remain deferred. The ticket stays
claimed, the completed baseline remains unchanged, and ticket 07 remains
blocked until the physical-device acceptance criteria are completed.

### 2026-08-12 — Physical iPad gate passed

The target iPad was connected by USB, paired, and trusted. Device inspection
recorded iPad (A16), product type `iPad15,7`, iPadOS 26.5.2, ARM64 support, and
enabled Developer Mode. Xcode automatic provisioning created an Apple
Development certificate and a Personal Team provisioning profile after the
user authorized that credential creation and trusted the developer profile on
the iPad.

The signed ARM64 archive passed `codesign --verify --deep --strict`. Xcode
installed Personal Dashboard 0.1.0 on the physical device, `devicectl` launched
bundle `com.tortillaflat.personal-dashboard`, and the running process was
observed at the installed application path. Xcode's device screenshot saved on
the Desktop visibly confirms the shared offline exercise shell renders on the
target iPad. The gate is resolved; no App Store distribution or mobile
feature-parity claim was added.
