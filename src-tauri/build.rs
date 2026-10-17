fn main() {
    println!("cargo:rerun-if-changed=../release.json");
    println!("cargo:rerun-if-env-changed=PERSONAL_DASHBOARD_SOURCE_COMMIT");
    tauri_build::build();
}
