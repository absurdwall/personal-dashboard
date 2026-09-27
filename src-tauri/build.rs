use std::env;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

fn main() {
    build_voice_helper();
    tauri_build::build();
}

fn build_voice_helper() {
    println!("cargo:rerun-if-changed=macos/voice-helper.swift");
    println!("cargo:rerun-if-env-changed=MACOSX_DEPLOYMENT_TARGET");
    if env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("macos") {
        return;
    }

    let target = env::var("TARGET").expect("Cargo provides the target triple");
    let architecture = if target.starts_with("aarch64-") {
        "arm64"
    } else if target.starts_with("x86_64-") {
        "x86_64"
    } else {
        panic!("voice input does not support the macOS target {target}");
    };
    let deployment_target = env::var("MACOSX_DEPLOYMENT_TARGET").unwrap_or_else(|_| "12.0".into());
    let swift_target = format!("{architecture}-apple-macosx{deployment_target}");
    let manifest_dir =
        PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").expect("manifest directory"));
    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("build output directory"));
    let source = manifest_dir.join("macos/voice-helper.swift");
    let helper = out_dir.join("personal-dashboard-voice-helper");

    let output = Command::new("xcrun")
        .args([
            "swiftc",
            "-swift-version",
            "5",
            "-parse-as-library",
            "-target",
            &swift_target,
            "-O",
            "-framework",
            "Foundation",
            "-framework",
            "AVFAudio",
            "-framework",
            "Speech",
            "-o",
        ])
        .arg(&helper)
        .arg(&source)
        .output()
        .unwrap_or_else(|error| {
            panic!("could not start the macOS speech helper compiler: {error}")
        });
    if !output.status.success() {
        panic!(
            "could not build the macOS speech helper:\n{}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    // Tauri validates configured resource sources while compiling (including
    // `cargo test`), before its bundle hooks run. Keep the compiled canonical
    // executable in Cargo's OUT_DIR, then mirror it to this ignored target path
    // so Tauri can include it without writing generated files into source.
    let resource_directory = manifest_dir.join("target/voice-input-resources");
    fs::create_dir_all(&resource_directory)
        .expect("could not create the ignored voice helper resource directory");
    fs::copy(
        &helper,
        resource_directory.join("personal-dashboard-voice-helper"),
    )
    .expect("could not prepare the ignored voice helper bundle resource");

    println!(
        "cargo:rustc-env=PERSONAL_DASHBOARD_VOICE_HELPER_PATH={}",
        helper.display()
    );
}
