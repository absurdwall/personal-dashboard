# 06 — Install the minimal shell on the target Samsung phone

**What to build:** Prove that the accepted Tauri foundation reaches the actual target Samsung phone by compiling, installing, and launching a minimal Personal Dashboard shell before the completed Python runtime can be retired.

**Blocked by:** 03 — Persist and exchange a minimal Mac profile; 04 — Deliver a notification with the Mac window closed.

**Status:** resolved

- [x] The target Samsung model and current Android version are recorded before the gate runs.
- [x] The project initializes and builds the Android target without creating a second product implementation.
- [x] A minimal Personal Dashboard shell installs and launches on the actual target Samsung phone.
- [x] The shell identifies Personal Dashboard and renders through the shared interface foundation.
- [x] The result proves toolchain and device reachability only and does not claim exercise-feature or notification parity.
- [x] Any platform limitation, developer-mode step, permission issue, or unresolved risk is recorded as a gate result.
- [x] Failure stops dependent migration work without modifying or bypassing the completed baseline.
- [x] No Play Store distribution, production mobile design, profile transfer, tablet support, or full mobile behavior is added.

## Answer

The accepted Tauri foundation reaches the actual target Samsung phone.
Personal Dashboard 0.1.0 was installed from the existing ARM64 debug APK,
cold-launched, and observed running in the foreground on a Samsung Galaxy S24
(`SM-S921U`) with Android 16, API level 36, One UI 8.0, and the `arm64-v8a`
ABI. A physical-device screenshot shows the shared Personal Dashboard exercise
shell rendering offline, and the launch produced no Android runtime crash
signal.

The device initially enumerated in macOS but did not expose an ADB interface.
Enabling Developer mode and USB debugging, then authorizing the Mac's debugging
key, changed the device from absent to `unauthorized` and finally to an
authorized ADB device. Samsung Auto Blocker did not need to be changed.

This result proves only Android toolchain, installation, launch, and shared
interface reachability. It does not claim exercise behavior, profile exchange,
notification parity, or production mobile presentation. The shared capability
copy still includes Mac-specific phrases such as “Native Mac foundation” and
“This Mac”; later mobile presentation work must make that copy platform-aware.

## Comments

### 2026-08-12 — Device gate paused at Android SDK agreement

Android Studio 2026.1.3.8 is installed from the official Homebrew cask. Its
bundled OpenJDK 25.0.2 runtime is available, and the four Android Rust targets
(`aarch64-linux-android`, `armv7-linux-androideabi`,
`i686-linux-android`, and `x86_64-linux-android`) are installed.

Tauri Android initialization currently stops before project generation because
`ANDROID_HOME` and `NDK_HOME` do not yet exist. Android Studio's custom setup
wizard is open at the legally binding Android SDK License Agreement. No license
has been accepted and no SDK, build tools, platform tools, or NDK has been
installed without user confirmation.

No Samsung device is visible over USB, so the target model and Android version
cannot yet be recorded. The physical gate remains paused, not passed. The
completed baseline is unchanged and dependent migration work remains blocked.

Resume after the Android SDK agreement is explicitly accepted, the required
SDK/NDK components are installed, and the unlocked target Samsung phone is
connected with Developer options and USB debugging enabled.

### 2026-08-12 — Compilation-only gate passed

The Android SDK license is accepted and the required stable toolchain is now
installed: Android SDK Platform 36, Build Tools 35.0.0, Platform Tools 37.0.1,
OpenJDK 21.0.12, and NDK 29.0.14206865. Tauri Android initialization succeeded
from the existing product configuration without adding a second interface.

The shared Rust core compiled for `aarch64-linux-android`, and the full Tauri
pipeline produced an ARM64 debug APK at
`src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk`.
Package inspection reports application label `Personal Dashboard`, package
`com.tortillaflat.personal_dashboard`, launch activity `MainActivity`, version
0.1.0, target SDK 36, and native ABI `arm64-v8a`. The generated Android project
remains within the existing ignored `src-tauri/gen/` boundary and uses the
shared `../dist` frontend.

Android Studio's bundled Java 25 is newer than the generated Gradle/Groovy
toolchain supports and failed with `Unsupported class file major version 69`.
Using Homebrew OpenJDK 21 through `JAVA_HOME` completed the same build. As with
the iOS build, `CARGO_TARGET_DIR=~/Library/Caches/personal-dashboard/tauri-target`
keeps cross-platform build outputs outside the synced workspace.

No Android device was detected by `adb` during this pass. The physical gate
still requires the unlocked target Samsung phone with Developer options and USB
debugging enabled, approval of the Mac's debugging key, recording the model and
Android version, installing and launching the APK, and visually confirming the
shared shell. The ticket stays claimed and ticket 07 remains blocked until
those criteria are completed.

### 2026-08-12 — Physical Samsung gate passed

The target Samsung Galaxy S24 (`SM-S921U`) was connected by USB. Device
inspection recorded Android 16, API level 36, One UI 8.0, the `e1q` device
family, and the `arm64-v8a` ABI before installation. macOS initially enumerated
the phone while ADB reported no device. After Developer mode and USB debugging
were enabled, ADB reported `unauthorized`; approving the Mac's debugging key on
the unlocked phone completed authorization. Auto Blocker did not need to be
changed.

ADB installed Personal Dashboard 0.1.0 from the compiled universal debug APK
and cold-launched `com.tortillaflat.personal_dashboard/.MainActivity`. The app
process remained running, Android reported that activity as the focused window,
and no app runtime crash signal was present. A physical-device screenshot
visibly confirms the shared offline exercise shell renders on the target
phone. The gate is resolved; no Play Store distribution, production mobile
design, profile transfer, notification behavior, or exercise-feature parity was
added or claimed.
