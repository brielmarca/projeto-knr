fn main() {
    // Listing app commands opts them into Tauri's capability enforcement.
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(&["collect_system_snapshot"])),
    )
    .expect("failed to build Tauri application context");
}
