# 06 — Install the minimal shell on the target Samsung phone

**What to build:** Prove that the accepted Tauri foundation reaches the actual target Samsung phone by compiling, installing, and launching a minimal Personal Dashboard shell before the completed Python runtime can be retired.

**Blocked by:** 03 — Persist and exchange a minimal Mac profile; 04 — Deliver a notification with the Mac window closed.

**Status:** claimed

- [ ] The target Samsung model and current Android version are recorded before the gate runs.
- [x] The project initializes and builds the Android target without creating a second product implementation.
- [ ] A minimal Personal Dashboard shell installs and launches on the actual target Samsung phone.
- [ ] The shell identifies Personal Dashboard and renders through the shared interface foundation.
- [ ] The result proves toolchain and device reachability only and does not claim exercise-feature or notification parity.
- [x] Any platform limitation, developer-mode step, permission issue, or unresolved risk is recorded as a gate result.
- [x] Failure stops dependent migration work without modifying or bypassing the completed baseline.
- [x] No Play Store distribution, production mobile design, profile transfer, tablet support, or full mobile behavior is added.

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
